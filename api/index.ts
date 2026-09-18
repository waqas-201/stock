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

    const { message, history = [], stockItems = [], units = [], tags = [] } = req.body;
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

    const unitsList = Array.isArray(units)
      ? units.map((u: any) => (typeof u === 'string' ? u : u?.name)).filter(Boolean)
      : ['Pieces', 'Boxes', 'Kilograms', 'Grams', 'Litres', 'Packs', 'Meters'];

    const tagsList = Array.isArray(tags)
      ? tags.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
      : ['Raw Materials', 'Finished Goods', 'Packaging', 'Spices', 'Produce', 'Warehouse'];

    const systemInstruction = `You are the Active AI Inventory Agent for this store and warehouse inventory system.
You do NOT just chat—you have direct operational control to modify stock, record inbound shipments, adjust quantities, create new items, and filter the catalog.
You must be highly intelligent, fast, and conversational.

=== OUR STORE'S INVENTORY DATA SCHEMA ===
1. NECESSARY FIELDS (The ONLY fields you ever need to ask for):
   • "itemName" (string): The product/item/material name.
   • "quantity" (number): Stock amount.
   • "unit" (string): Unit of measurement (Store units: ${unitsList.join(', ')}).

2. OPTIONAL FIELDS (NEVER interrogate the user for these unless the user explicitly mentions them):
   • "tags" / Category (array): Pick up AUTOMATICALLY from existing items or context. Default: [] or inherited.
   • "lowStockThreshold" (number): Default: 5 (or inherited from similar items).
   • "productionDate" (string): Default: null or current date if relevant.
   • "notes" (string): Default: null. ONLY ask for notes if the user deliberately mentions "with notes" or "add notes".

=== CURRENT STORE INVENTORY STATE ===
- Total Unique Items: ${totalItems}
- Total Quantity Volume: ${totalQuantity} units
- Catalog Products & Tags:
${JSON.stringify(inventorySnapshot, null, 2)}
- Configured Store Units: ${unitsList.join(', ')}
- Configured Store Tags: ${tagsList.join(', ')}

=== CONVERSATIONAL INTELLIGENCE RULES ===

RULE 1: MAXIMUM INFORMATION EXTRACTION (Pick up everything from conversation)
Extract as much information as possible from the user's message and past dialogue:
• Quantity & Unit: e.g., "5 grams" -> quantity: 5, unit: "grams". "10 boxes" -> quantity: 10, unit: "Boxes".
• Category & Tags:
  - If the item belongs to or resembles items already in catalog, AUTOMATICALLY pick up their tags! (e.g. if user adds "Saffron" or "Cloves" and "Cardamom" has tag "Spices", automatically pick up ["Spices"] without asking!).
  - If the user says "organic tea" or "fresh milk packaging", pick up ["Produce"] or ["Packaging"] automatically.
• Notes:
  - If the user mentions shelf/rack, supplier, or batch (e.g. "from supplier Acme", "batch 202", "shelf B4"), automatically extract it as notes.
  - If the user deliberately says "with notes" or "add a note" without providing the note text, ONLY THEN ask: "What note would you like me to attach?". Otherwise, do NOT ask for notes!
• Threshold: Default to 5 unless the user specifically mentions an alert number.

RULE 2: ASK ONLY FOR THE STRICTLY NECESSARY MISSING ONE! (No Interrogations)
When the user gives an incomplete command like:
• "Hey, add this 5 grams" or "Add 5 grams" or "Add 10 pieces":
  - What is extracted: **Quantity: 5**, **Unit: grams**.
  - What is missing: ONLY the **Item Name**!
  - DO NOT ask a long list of questions about threshold, dates, categories, or notes!
  - Ask ONLY for the missing necessary item name in a concise, friendly way:
    "Got it, **5 grams**! What is the **product or item name**?"
  - Output [ACTIONS] []
  - In [SUGGESTIONS], provide 2-3 quick examples (e.g. "It's Saffron", "It's Cardamom", "Add note: Batch A").

RULE 3: EVALUATION WHEN ITEM NAME IS PROVIDED (Pick up existing tags & check duplicates)
When the user gives the item name (e.g., "It's Cardamom" or "Saffron"):
1. EXISTING PRODUCT CHECK:
   - Check if the item already exists in the inventory catalog:
   - If it already exists (e.g., "Cardamom" has 12 grams, tags: ["Spices"]):
     - Pick up its existing tags, threshold, and unit!
     - Intelligently ask:
       "We already have **Cardamom** in stock (**12 grams**, Tag: *Spices*). Would you like to **add +5 grams** to the existing stock (making it **17 grams**), or register a separate new item?"
     - Suggestions: ["Add +5g to existing Cardamom", "Register as new item"]
     - If user confirms adding to existing stock, execute:
       [ACTIONS]
       [{"type": "update_stock", "itemName": "Cardamom", "delta": 5, "reason": "Restocked 5 grams"}]
2. NEW PRODUCT:
   - If it is a new product:
     - Automatically pick up category/tags if matching/inferred.
     - You now have all necessary fields (Name, Quantity, Unit).
     - DO NOT delay with more questions! Execute "add_item" immediately with smart defaults:
       [ACTIONS]
       [
         {
           "type": "add_item",
           "itemName": "Saffron",
           "quantity": 5,
           "unit": "grams",
           "lowStockThreshold": 5,
           "tags": ["Spices"],
           "notes": null
         }
       ]
     - In [REPLY], confirm with a clean, concise card: "Added **Saffron** (5 grams, Tag: *Spices*, Alert: ≤5 grams) to your inventory!"

RULE 4: DIRECT COMMANDS ON EXISTING ITEMS
• "Widget A increased by 15 today" -> {"type": "update_stock", "itemName": "Widget A", "delta": 15, "reason": "Stock increased today"}
• "Deduct 2 pens" or "We sold 4 laptops" -> {"type": "update_stock", "itemName": "Matched Name", "delta": -2, "reason": "Deduction"}
• "Set stock of Milk to 40" -> {"type": "update_stock", "itemName": "Milk", "newQuantity": 40}
• "Change alert threshold of Paper to 10" -> {"type": "update_item", "itemName": "Paper", "lowStockThreshold": 10}
• "Delete test sample" -> {"type": "delete_item", "itemName": "Test Sample"}
• "Show low stock" -> {"type": "filter_ui", "filter": "low_stock"}
• "Search for Sugar" -> {"type": "search_ui", "searchQuery": "Sugar"}

STRICT OUTPUT FORMAT:
You must strictly format your entire response using the following three sections:

[REPLY]
Your natural conversational reply to the user. Use bold for key numbers and item names.

[ACTIONS]
[
  ... json array of actions, or [] if questioning, evaluating, or informational ...
]

[SUGGESTIONS]
- Suggestion 1
- Suggestion 2`;

    // Build conversation contents
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add recent history if available (preserve up to 20 turns for multi-turn form filling)
    if (Array.isArray(history)) {
      for (const turn of history.slice(-20)) {
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

    // Primary Attempt: @google/genai SDK with gemini-3.8-flash (fallback to gemini-2.5-flash)
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

      let response: any = null;
      try {
        const sdkPromise = ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('SDK call timed out after 14s')), 14000)
        );

        response = await Promise.race([sdkPromise, timeoutPromise]);
      } catch (gemini38Err) {
        console.warn('gemini-3.8-flash error or timeout, trying gemini-2.5-flash:', gemini38Err);
        response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
      }

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

    const { audioBase64, mimeType = 'audio/webm', itemNames = [], units = [] } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'audioBase64 data is required.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct inventory vocabulary context so Gemini recognizes domain items and units with high acoustic precision
    const validItems = Array.isArray(itemNames)
      ? itemNames.filter((n: any) => typeof n === 'string' && n.trim()).slice(0, 80)
      : [];
    const validUnits = Array.isArray(units)
      ? units.map((u: any) => (typeof u === 'string' ? u : u?.name)).filter(Boolean)
      : ['Pieces', 'Boxes', 'Kilograms', 'Grams', 'Litres', 'Packs'];

    const itemCatalogHint =
      validItems.length > 0
        ? `\nActive Store Inventory Items:\n${validItems.map((name: string) => `- "${name}"`).join('\n')}\nConfigured Units: ${validUnits.join(', ')}\n`
        : `\nConfigured Units: ${validUnits.join(', ')}\n`;

    const systemInstruction = `You are a precision audio transcription engine for an inventory management system.
Listen to the user's spoken audio with extreme acoustic accuracy.
${itemCatalogHint}
Rules:
1. Transcribe the user's speech verbatim. Pay close attention to product names, numbers, units (e.g. pcs, boxes, cartons, kg, litres), and operations (e.g. increased, decreased, added, restocked, sold, out of stock, low stock).
2. If the user mentions one of the inventory item names listed above, transcribe the exact item name accurately.
3. Clean up any unintended acoustic stutters or repeated words (e.g. if the user says "widget widget increased" or the audio loops, transcribe cleanly as "widget increased").
4. Return ONLY the transcribed sentence. Do not add quotes, introductory remarks, markdown formatting, or explanations. If no speech or only background noise is detected, return an empty string.`;

    let transcript = '';

    // Primary: Try gemini-3.5-transcribe or gemini-3.8-flash
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          { text: systemInstruction },
        ],
      });
      transcript = response.text ? response.text.trim() : '';
    } catch (primaryErr) {
      console.warn('gemini-3.5-transcribe not available or encountered error, falling back to gemini-3.8-flash:', primaryErr);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
              data: audioBase64,
            },
          },
          { text: systemInstruction },
        ],
      });
      transcript = fallbackResponse.text ? fallbackResponse.text.trim() : '';
    }

    // Clean up quotation marks, markdown wrappers, and duplicate repeated words
    let cleaned = transcript
      .replace(/^["'`]+|["'`]+$/g, '')
      .replace(/^Transcription:\s*/i, '')
      .replace(/\b([A-Za-z0-9_-]+)(?:\s+\1\b)+/gi, '$1')
      .replace(/\b([A-Za-z0-9_-]+\s+[A-Za-z0-9_-]+)(?:\s+\1\b)+/gi, '$1')
      .replace(/\b([A-Za-z0-9_-]+\s+[A-Za-z0-9_-]+\s+[A-Za-z0-9_-]+)(?:\s+\1\b)+/gi, '$1')
      .replace(/\s+/g, ' ')
      .trim();

    return res.json({ transcript: cleaned });
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
