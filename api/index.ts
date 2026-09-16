import express, { Request, Response, NextFunction } from 'express';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const apiRouter = express.Router();

// Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    environment: process.env.VERCEL ? 'vercel' : 'container',
    timestamp: new Date().toISOString(),
  });
});

// Check Gemini configuration status
apiRouter.get('/gemini/status', (_req: Request, res: Response) => {
  const isConfigured = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    configured: isConfigured,
    platform: process.env.VERCEL ? 'vercel' : 'cloud-run',
  });
});

// Gemini AI Stock Conversation Endpoint
apiRouter.post('/gemini/stock-chat', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: process.env.VERCEL
          ? 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.'
          : 'GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.',
      });
    }

    const { message, history = [], stockItems = [] } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'A user message is required.' });
    }

    // Prepare structured summary of current inventory
    const itemsList = Array.isArray(stockItems) ? stockItems : [];
    const totalItems = itemsList.length;
    const totalQuantity = itemsList.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);

    const outOfStockItems = itemsList.filter((item: any) => (Number(item.quantity) || 0) <= 0);
    const lowStockItems = itemsList.filter((item: any) => {
      const q = Number(item.quantity) || 0;
      const thresh = Number(item.lowStockThreshold) ?? 5;
      return q > 0 && q <= thresh;
    });
    const inStockItems = itemsList.filter((item: any) => {
      const q = Number(item.quantity) || 0;
      const thresh = Number(item.lowStockThreshold) ?? 5;
      return q > thresh;
    });

    // Format inventory items for model context (compact JSON)
    const inventorySnapshot = itemsList.map((item: any) => ({
      id: item.id,
      name: item.itemName,
      quantity: item.quantity,
      unit: item.unit,
      alertThreshold: item.lowStockThreshold ?? 5,
      status: (item.quantity <= 0) ? 'Out of Stock' : (item.quantity <= (item.lowStockThreshold ?? 5)) ? 'Low Stock' : 'In Stock',
      productionDate: item.productionDate || null,
      tags: item.tags || [],
      notes: item.notes || null,
    }));

    const systemInstruction = `You are the Active AI Inventory Agent for this warehouse and store inventory system.
You do NOT just chat—you have DIRECT OPERATIONAL CONTROL to modify inventory records, adjust stock quantities, create new items, update alerts, and filter the UI on behalf of the user.

Current Inventory Overview:
- Total Unique Items: ${totalItems}
- Total Quantity Volume: ${totalQuantity} units
- In Stock: ${inStockItems.length}
- Low Stock Alerts: ${lowStockItems.length} (${lowStockItems.map((i: any) => `${i.itemName}: ${i.quantity} ${i.unit}`).join(', ') || 'None'})
- Out of Stock: ${outOfStockItems.length} (${outOfStockItems.map((i: any) => i.itemName).join(', ') || 'None'})

Current Inventory Catalog:
${JSON.stringify(inventorySnapshot, null, 2)}

OPERATIONAL AGENT CAPABILITIES:
When the user speaks or commands stock operations, like:
- "Hey, this item increased this much today" (e.g., "Widget A increased by 15 today", "We received 20 boxes of Milk", "Add 5 to A4 Paper", "Restock 50 Pens")
- "We sold 4 laptops" or "Deduct 2 pens" or "Reduced by 3"
- "Set stock of Widget B to 40"
- "Add a new item called Toner with 30 units and alert 5"
- "Change low stock threshold of Paper to 10"
- "Delete old sample item"
- "Show low stock items" or "Filter to out of stock"
- "Search for printer"

You MUST execute the action(s) in your [ACTIONS] block and write a polite, confirmation message in your [REPLY] block.

If the user asks an informational question (e.g., "What is low in stock?", "How much Milk do we have?"), provide a direct answer and output an empty array for [ACTIONS].

STRICT OUTPUT FORMAT:
You must strictly format your entire response using the following three sections:

[REPLY]
Your natural conversational reply to the user. If an action was taken, clearly state what was updated (e.g. "I've updated the inventory! Added 15 pcs to **Widget A**. The verified stock is now **65 pcs**.").

[ACTIONS]
[
  {
    "type": "update_stock",
    "itemName": "Matched Item Name from Catalog",
    "delta": 15,
    "reason": "Stock increased today"
  }
]

Note on [ACTIONS] schema:
- For stock changes: {"type": "update_stock", "itemName": "Exact Name", "delta": 15, "reason": "..."} (Use positive delta for additions/inbound, negative delta for sales/deductions; or "newQuantity": 50 for direct set)
- For creating items: {"type": "add_item", "itemName": "Name", "unit": "pcs", "quantity": 10, "lowStockThreshold": 5, "notes": "...", "tags": ["..."]}
- For editing metadata: {"type": "update_item", "itemName": "Name", "lowStockThreshold": 10, "notes": "..."}
- For deleting items: {"type": "delete_item", "itemName": "Name", "reason": "..."}
- For UI filter: {"type": "filter_ui", "filter": "all" | "low_stock" | "out_of_stock" | "in_stock"}
- For UI search: {"type": "search_ui", "query": "..."}
If no action is performed, output:
[ACTIONS]
[]

[SUGGESTIONS]
- Suggestion 1
- Suggestion 2`;

    // Build conversation contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add recent history if available
    if (Array.isArray(history)) {
      for (const turn of history.slice(-6)) {
        if (turn && (turn.role === 'user' || turn.role === 'model') && Array.isArray(turn.parts)) {
          contents.push({
            role: turn.role,
            parts: turn.parts.map((p: { text?: string }) => ({ text: String(p.text || '') })),
          });
        }
      }
    }

    // Add current message
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Primary Attempt: @google/genai SDK with gemini-2.5-flash and a 12s timeout
    let replyText: string | null = null;

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const sdkPromise = ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('SDK call timed out after 12s')), 12000)
      );

      const response: any = await Promise.race([sdkPromise, timeoutPromise]);
      replyText = response.text || null;
    } catch (sdkError) {
      console.warn('Primary SDK call encountered issue, attempting REST fallback:', sdkError);

      // Fallback Attempt: Direct Google GenAI REST API
      const restUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const restResponse = await fetch(restUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents,
          generationConfig: { temperature: 0.7 },
        }),
      });

      if (!restResponse.ok) {
        const errData: any = await restResponse.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `Gemini REST returned ${restResponse.status}`);
      }

      const restData: any = await restResponse.json();
      replyText = restData?.candidates?.[0]?.content?.parts?.[0]?.text || null;
    }

    const rawText = replyText || "I've reviewed your inventory. Let me know what specific stock details you'd like to explore!";

    // Parse structured sections: [REPLY], [ACTIONS], [SUGGESTIONS]
    let parsedReply = rawText;
    let parsedActions: any[] = [];
    let parsedSuggestions: string[] = [];

    try {
      if (rawText.includes('[ACTIONS]')) {
        const parts = rawText.split('[ACTIONS]');
        let replyPart = parts[0] || '';
        replyPart = replyPart.replace(/\[REPLY\]/i, '').trim();

        const rest = parts[1] || '';
        let actionsJsonStr = '';
        let suggestionsPart = '';

        if (rest.includes('[SUGGESTIONS]')) {
          const afterActions = rest.split('[SUGGESTIONS]');
          actionsJsonStr = afterActions[0]?.trim() || '';
          suggestionsPart = afterActions[1]?.trim() || '';
        } else {
          actionsJsonStr = rest.trim();
        }

        // Strip markdown code fences if model wrapped the JSON
        actionsJsonStr = actionsJsonStr.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

        if (actionsJsonStr.startsWith('[') && actionsJsonStr.endsWith(']')) {
          parsedActions = JSON.parse(actionsJsonStr);
        }

        if (suggestionsPart) {
          parsedSuggestions = suggestionsPart
            .split('\n')
            .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
            .filter((line) => line.length > 0);
        }

        parsedReply = replyPart || 'Action processed successfully.';
      } else if (rawText.includes('[SUGGESTIONS]')) {
        const parts = rawText.split('[SUGGESTIONS]');
        parsedReply = parts[0]?.replace(/\[REPLY\]/i, '').trim() || rawText;
        const suggestionsPart = parts[1]?.trim() || '';
        if (suggestionsPart) {
          parsedSuggestions = suggestionsPart
            .split('\n')
            .map((line) => line.replace(/^[-*•\d.]+\s*/, '').trim())
            .filter((line) => line.length > 0);
        }
      } else {
        parsedReply = rawText.replace(/\[REPLY\]/i, '').trim();
      }
    } catch (parseErr) {
      console.warn('Could not parse structured actions from Gemini output:', parseErr);
      parsedReply = rawText;
    }

    // Enrich actions with exact item IDs and unit details from the current inventory
    const enrichedActions = Array.isArray(parsedActions)
      ? parsedActions.map((act) => {
          if (!act || typeof act !== 'object') return act;
          const targetName = (act.itemName || '').toLowerCase().trim();
          const matched = itemsList.find(
            (i: any) =>
              (i.itemName && i.itemName.toLowerCase().trim() === targetName) ||
              (i.id && act.itemId && i.id === act.itemId)
          );
          if (matched) {
            return {
              ...act,
              itemId: matched.id,
              itemName: matched.itemName,
              unit: matched.unit,
              previousQuantity: matched.quantity,
            };
          }
          return act;
        })
      : [];

    return res.json({
      reply: parsedReply,
      actions: enrichedActions,
      suggestions: parsedSuggestions,
    });
  } catch (error: any) {
    console.error('Error in stock-chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response from Gemini AI.',
    });
  }
});

// Gemini AI Audio Transcription Endpoint
apiRouter.post('/gemini/transcribe-audio', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: process.env.VERCEL
          ? 'GEMINI_API_KEY is not configured in Vercel Environment Variables. Please add GEMINI_API_KEY in your Vercel Project Settings > Environment Variables.'
          : 'GEMINI_API_KEY is not configured.',
      });
    }

    const { audioBase64, mimeType = 'audio/webm' } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 data is required.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType || 'audio/webm',
            data: audioBase64,
          },
        },
        {
          text: 'Listen to this spoken audio carefully. Transcribe exactly what the user said verbatim for an inventory management query or command (for example: "Hey, Widget A increased by 10 today", "Add 5 to stock", "What items are low on stock?", etc.). Return ONLY the transcribed text. Do not add conversational commentary, quotation marks, or explanations. If no speech is detected, return an empty string.',
        },
      ],
    });

    const transcript = response.text ? response.text.trim() : '';
    return res.json({ transcript });
  } catch (error: any) {
    console.error('Error in transcribe-audio:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to transcribe audio.',
    });
  }
});

// Create Express application instance configured for Vercel and local server
const app = express();

// Enable CORS and preflight handling
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));

// Mount router on both '/api' and '/' to seamlessly support Vercel serverless rewrites and direct calls
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Export Express app as default for Vercel Serverless Functions
export default app;
