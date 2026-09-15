import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable CORS and preflight handling
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Check Gemini configuration status
  app.get('/api/gemini/status', (req, res) => {
    const isConfigured = Boolean(process.env.GEMINI_API_KEY);
    res.json({ configured: isConfigured });
  });

  // Gemini AI Stock Conversation Endpoint
  app.post('/api/gemini/stock-chat', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY environment variable is not configured. Please set it in Settings > Secrets.',
        });
      }

      const { message, history = [], stockItems = [], languageMode } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A user message is required.' });
      }

      // Prepare structured summary of current inventory
      const itemsList = Array.isArray(stockItems) ? stockItems : [];
      const totalItems = itemsList.length;
      const totalQuantity = itemsList.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

      const outOfStockItems = itemsList.filter((item) => (Number(item.quantity) || 0) <= 0);
      const lowStockItems = itemsList.filter((item) => {
        const q = Number(item.quantity) || 0;
        const thresh = Number(item.lowStockThreshold) ?? 5;
        return q > 0 && q <= thresh;
      });
      const inStockItems = itemsList.filter((item) => {
        const q = Number(item.quantity) || 0;
        const thresh = Number(item.lowStockThreshold) ?? 5;
        return q > thresh;
      });

      // Format inventory items for model context (compact JSON)
      const inventorySnapshot = itemsList.map((item) => ({
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

      const langPreferenceDirective =
        languageMode === 'ur'
          ? '\n\nUSER LANGUAGE PREFERENCE: The user has selected Pakistani Urdu (اردو). Respond in polite, natural Urdu script (اردو) and provide Urdu suggestions.'
          : languageMode === 'roman_ur'
          ? '\n\nUSER LANGUAGE PREFERENCE: The user has selected Roman Urdu. Respond in natural Pakistani Roman Urdu and provide Roman Urdu suggestions.'
          : languageMode === 'en'
          ? '\n\nUSER LANGUAGE PREFERENCE: The user has selected English. Respond in English.'
          : '\n\nUSER LANGUAGE PREFERENCE: Auto-detect. If the user writes or speaks in Urdu script (اردو), reply in fluent Pakistani Urdu (اردو). If the user writes or speaks in Roman Urdu (e.g., "Kitna stock bacha hai?", "Widget A mein 10 add kardo"), reply in natural Roman Urdu. If in English, reply in English.';

      const systemInstruction = `You are the Active AI Inventory Agent for this warehouse and store inventory system.
You do NOT just chat—you have DIRECT OPERATIONAL CONTROL to modify inventory records, adjust stock quantities, create new items, update alerts, and filter the UI on behalf of the user.

PAKISTANI URDU LANGUAGE & MULTILINGUAL CAPABILITIES:
You are fully fluent in Pakistani Urdu and understand:
1. Urdu Script (اردو): e.g., "سٹاک میں 10 دودھ کے ڈبے شامل کرو", "کتنا مال پڑا ہے؟", "کم اسٹاک والی چیزیں دکھاؤ", "چینی کی مقدار 25 کر دو", "کیا چیزیں ختم ہو چکی ہیں؟", "نیا آئٹم شامل کرو: چائے کی پتی، 50 پیکٹ، الرٹ 10"
2. Roman Urdu / Urdish (Urdu written in English/Latin alphabet as widely used in Pakistan): e.g., "Stock kitna bacha hai?", "Widget A mein 10 add kardo / shamil karo / daal do", "Milk ke 5 dabbe sale ho gaye / nikal do / bech diye", "Cheeni ka stock 20 kardo", "Konsi cheezein khatam hone wali hain?", "Kam stock wali cheezein dikhao", "Naya item banao: Green Tea, quantity 30, alert 5", "Out of stock items search karo", "Stock ki poori report do", "Yeh item delete kardo"
3. English: Standard English commands and queries.
4. Code-switching / Bilingual mix: e.g., "Widget A ka stock update kardo with 10 units", "5 pieces sale ho gaye".

PAKISTANI STORE & INVENTORY VOCABULARY:
- Inbound / Additions / Restock: "shamil karo", "add kardo", "jama karo", "daal do", "restock karo", "naya maal aya", "barha do", "dakhil karo" -> execute {"type": "update_stock", "itemName": "...", "delta": positive_number, "reason": "Stock increased / Maal shamil hua"}
- Outbound / Deductions / Sales: "bech diya", "sale ho gaya", "nikal do", "kam kardo", "minus karo", "ghata do", "kharch hua", "zaya ho gaya", "kharab ho gaya" -> execute {"type": "update_stock", "itemName": "...", "delta": negative_number, "reason": "Stock deducted / Sale / Nikala gaya"}
- Direct Count / Set Quantity: "itna kardo", "set karo", "ginti ki hai ab X hain", "total X kardo" -> execute {"type": "update_stock", "itemName": "...", "newQuantity": number, "reason": "Stock set to verified count"}
- Stock Inquiries: "kitna bacha hai", "kitna maal hai", "kya hisaab hai", "check karo", "kitne piece hain", "stock batao" -> answer directly with counts
- Low Stock / Alerts: "kam stock", "khatam hone wala", "short hai", "alert", "khatray mein" -> filter or highlight low stock items
- Out of Stock: "khatam ho gaya", "muk gaya", "zero ho gaya", "kuch nahi bacha", "khatam shuda" -> filter or highlight out of stock items
- Common Pakistani Units: "dabba / dabbe / dabbo" (box/carton), "dana / daane / adad / piece / pieces" (pcs), "kilo / kg", "litre / ltr", "darjan" (dozen), "bori" (sack/bag), "packet / pack", "botal / bottle", "gatta" (carton), "meter / m"
- Flexible Item Matching: If the user names an item in Urdu or Roman Urdu (e.g. "Cheeni" -> "Sugar", "Doodh" -> "Milk", "Chawal" -> "Rice", "Tel" -> "Oil", "A4 Kaghaz" -> "A4 Paper", "Qalam" -> "Pen", or transliterations like "ویجٹ اے" -> "Widget A"), match it flexibly to the corresponding item in the catalog.

RESPONSE RULES:
- If the user uses Urdu script, reply in clear, polite Pakistani Urdu (اردو) with correct inventory figures.
- If the user uses Roman Urdu, reply in friendly, conversational Roman Urdu.
- If the user uses English, reply in English.
${langPreferenceDirective}

Current Inventory Overview:
- Total Unique Items: ${totalItems}
- Total Quantity Volume: ${totalQuantity} units
- In Stock: ${inStockItems.length}
- Low Stock Alerts: ${lowStockItems.length} (${lowStockItems.map(i => `${i.itemName}: ${i.quantity} ${i.unit}`).join(', ') || 'None'})
- Out of Stock: ${outOfStockItems.length} (${outOfStockItems.map(i => i.itemName).join(', ') || 'None'})

Current Inventory Catalog:
${JSON.stringify(inventorySnapshot, null, 2)}

OPERATIONAL AGENT CAPABILITIES:
When the user speaks or commands stock operations (in English, Urdu script, or Roman Urdu), like:
- "Hey, this item increased this much today" / "Widget A mein 10 shamil kardo" / "ویجٹ اے میں 10 شامل کرو"
- "We sold 4 laptops" / "5 dabbe sale ho gaye" / "5 ڈبے فروخت ہو گئے"
- "Set stock of Widget B to 40" / "Widget B ka stock 40 kardo"
- "Add a new item called Toner with 30 units and alert 5" / "Naya item add karo Toner"
- "Show low stock items" / "Kam stock wali cheezein dikhao" / "کم اسٹاک والی اشیاء دکھاؤ"
- "Search for printer" / "Printer dhoondo" / "پرنٹر تلاش کرو"

You MUST execute the action(s) in your [ACTIONS] block and write a polite, confirmation message in your [REPLY] block.

If the user asks an informational question (e.g., "What is low in stock?", "Kitna stock bacha hai?", "اسٹاک کی کیا صورتحال ہے؟"), provide a direct answer and output an empty array for [ACTIONS].

STRICT OUTPUT FORMAT:
You must strictly format your entire response using the following three sections:

[REPLY]
Your natural conversational reply to the user in their language (English, Urdu, or Roman Urdu). If an action was taken, clearly confirm what was changed with exact numbers.

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
          const errData = await restResponse.json().catch(() => ({}));
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
              (i) =>
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
      console.error('Error in /api/gemini/stock-chat:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to generate response from Gemini AI.',
      });
    }
  });

  // Gemini AI Audio Transcription Endpoint (Universal microphone fallback)
  app.post('/api/gemini/transcribe-audio', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({
          error: 'GEMINI_API_KEY is not configured.',
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
            text: 'Listen to this spoken audio carefully. The speaker may be speaking Pakistani Urdu (اردو), Roman Urdu, English, or a natural bilingual mix of Urdu and English as commonly spoken in Pakistani stores, shops, and warehouses (e.g., "Widget A mein 10 add kardo", "Doodh ke 5 dabbe sale ho gaye", "Stock kitna bacha hai?", "Kam stock wali cheezein dikhao", "نیا آئٹم شامل کرو", "What items are running low?"). Transcribe verbatim and accurately what the speaker said. If the speaker spoke in Urdu, transcribe accurately in Urdu script (اردو) or Roman Urdu matching the clearest phonetic representation. Return ONLY the transcribed text. Do not add conversational commentary, quotation marks, or explanations. If no speech is detected, return an empty string.',
          },
        ],
      });

      const transcript = response.text ? response.text.trim() : '';
      return res.json({ transcript });
    } catch (error: any) {
      console.error('Error in /api/gemini/transcribe-audio:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to transcribe audio.',
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Inventory server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
