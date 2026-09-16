import { GoogleGenAI } from '@google/genai';

export interface InventoryItemForAI {
  id?: string;
  itemName: string;
  quantity: number;
  unit?: string;
  lowStockThreshold?: number;
  productionDate?: string;
  tags?: string[];
  notes?: string;
}

export interface StockChatParams {
  apiKey: string;
  message: string;
  history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
  stockItems?: InventoryItemForAI[];
  languageMode?: 'auto' | 'ur' | 'roman_ur' | 'en';
}

export interface StockChatResponse {
  reply: string;
  actions: any[];
  suggestions: string[];
}

export async function processStockChat(params: StockChatParams): Promise<StockChatResponse> {
  const { apiKey, message, history = [], stockItems = [], languageMode = 'auto' } = params;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required.');
  }
  if (!message || typeof message !== 'string') {
    throw new Error('A user message is required.');
  }

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

  const inventorySnapshot = itemsList.map((item) => ({
    id: item.id,
    name: item.itemName,
    quantity: item.quantity,
    unit: item.unit,
    alertThreshold: item.lowStockThreshold ?? 5,
    status: item.quantity <= 0 ? 'Out of Stock' : item.quantity <= (item.lowStockThreshold ?? 5) ? 'Low Stock' : 'In Stock',
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
2. Roman Urdu / Urdish: e.g., "Stock kitna bacha hai?", "Widget A mein 10 add kardo / shamil karo / daal do", "Milk ke 5 dabbe sale ho gaye / nikal do / bech diye", "Cheeni ka stock 20 kardo", "Konsi cheezein khatam hone wali hain?", "Kam stock wali cheezein dikhao", "Naya item banao: Green Tea, quantity 30, alert 5", "Out of stock items search karo", "Stock ki poori report do", "Yeh item delete kardo"
3. English: Standard English commands and queries.
4. Code-switching / Bilingual mix: e.g., "Widget A ka stock update kardo with 10 units", "5 pieces sale ho gaye".

PAKISTANI STORE & INVENTORY VOCABULARY:
- Inbound / Additions / Restock: "shamil karo", "add kardo", "jama karo", "daal do", "restock karo", "naya maal aya", "barha do" -> execute {"type": "update_stock", "itemName": "...", "delta": positive_number, "reason": "Stock increased / Maal shamil hua"}
- Outbound / Deductions / Sales: "bech diya", "sale ho gaya", "nikal do", "kam kardo", "minus karo", "ghata do", "kharch hua" -> execute {"type": "update_stock", "itemName": "...", "delta": negative_number, "reason": "Stock deducted / Sale"}
- Direct Count / Set Quantity: "itna kardo", "set karo", "ginti ki hai ab X hain", "total X kardo" -> execute {"type": "update_stock", "itemName": "...", "newQuantity": number, "reason": "Stock set to verified count"}
- Stock Inquiries: "kitna bacha hai", "kitna maal hai", "kya hisaab hai", "check karo", "kitne piece hain", "stock batao" -> answer directly with counts
- Low Stock / Alerts: "kam stock", "khatam hone wala", "short hai", "alert", "khatray mein" -> filter or highlight low stock items
- Out of Stock: "khatam ho gaya", "muk gaya", "zero ho gaya", "kuch nahi bacha", "khatam shuda" -> filter or highlight out of stock items
- Common Pakistani Units: "dabba / dabbe / dabbo" (box/carton), "dana / daane / adad / piece / pieces" (pcs), "kilo / kg", "litre / ltr", "darjan" (dozen), "bori" (sack/bag), "packet / pack", "botal / bottle", "gatta" (carton), "meter / m"
- Flexible Item Matching: If the user names an item in Urdu or Roman Urdu (e.g. "Cheeni" -> "Sugar", "Doodh" -> "Milk", "Chawal" -> "Rice", "Tel" -> "Oil"), match it flexibly to the corresponding item in the catalog.

RESPONSE RULES:
- If the user uses Urdu script, reply in clear, polite Pakistani Urdu (اردو) with correct inventory figures.
- If the user uses Roman Urdu, reply in friendly, conversational Roman Urdu.
- If the user uses English, reply in English.
${langPreferenceDirective}

Current Inventory Overview:
- Total Unique Items: ${totalItems}
- Total Quantity Volume: ${totalQuantity} units
- In Stock: ${inStockItems.length}
- Low Stock Alerts: ${lowStockItems.length} (${lowStockItems.map((i) => `${i.itemName}: ${i.quantity} ${i.unit}`).join(', ') || 'None'})
- Out of Stock: ${outOfStockItems.length} (${outOfStockItems.map((i) => i.itemName).join(', ') || 'None'})

Current Inventory Catalog:
${JSON.stringify(inventorySnapshot, null, 2)}

CRITICAL VOICE & CONVERSATION RULES:
- Listen and speak calmly, naturally, and concisely, like a top-tier voice assistant.
- NEVER parrot or repeat what the user just said.
- State the outcome directly and smoothly in 1 single, friendly sentence (e.g., "Added 10 units to Widget A; total stock is now 45." or "5 boxes deducted from Milk. Remaining: 12.").
- If asked an informational question, provide a calm, direct, clear answer in 1-2 sentences. Output an empty array for [ACTIONS].

STRICT OUTPUT FORMAT:
You must strictly format your entire response using the following three sections:

[REPLY]
Your natural, calm, concise reply to the user in their language (English, Urdu, or Roman Urdu). Keep it to 1-2 direct sentences.

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
- For stock changes: {"type": "update_stock", "itemName": "Exact Name", "delta": 15, "reason": "..."}
- For direct set: {"type": "update_stock", "itemName": "Exact Name", "newQuantity": 50, "reason": "..."}
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

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(history)) {
    for (const turn of history.slice(-6)) {
      if (turn && (turn.role === 'user' || turn.role === 'model') && Array.isArray(turn.parts)) {
        contents.push({
          role: turn.role,
          parts: turn.parts.map((p) => ({ text: String(p.text || '') })),
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  let rawText = '';

  try {
    const response: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    rawText = response.text || '';
  } catch (sdkError: any) {
    console.warn('gemini-2.5-flash notice, trying gemini-3.1-flash-lite fallback:', sdkError?.message);
    const fallbackRes: any = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });
    rawText = fallbackRes.text || '';
  }

  let parsedReply = rawText;
  let parsedActions: any[] = [];
  let parsedSuggestions: string[] = [];

  try {
    const actionsMatch = rawText.match(/\[ACTIONS\]([\s\S]*?)(?:\[SUGGESTIONS\]|$)/i);
    if (actionsMatch && actionsMatch[1]) {
      const jsonStr = actionsMatch[1].trim();
      if (jsonStr.startsWith('[') && jsonStr.endsWith(']')) {
        parsedActions = JSON.parse(jsonStr);
      }
    }

    const suggestionsMatch = rawText.match(/\[SUGGESTIONS\]([\s\S]*?)$/i);
    if (suggestionsMatch && suggestionsMatch[1]) {
      parsedSuggestions = suggestionsMatch[1]
        .split('\n')
        .map((s) => s.replace(/^[-*•\d.]\s*/, '').trim())
        .filter((s) => s.length > 0)
        .slice(0, 4);
    }

    const replyMatch = rawText.match(/\[REPLY\]([\s\S]*?)(?:\[ACTIONS\]|$)/i);
    if (replyMatch && replyMatch[1]) {
      parsedReply = replyMatch[1].trim();
    } else {
      parsedReply = rawText
        .replace(/\[ACTIONS\][\s\S]*?(?:\[SUGGESTIONS\]|$)/gi, '')
        .replace(/\[SUGGESTIONS\][\s\S]*?$/gi, '')
        .replace(/\[REPLY\]/gi, '')
        .trim();
    }
  } catch (parseErr) {
    console.warn('Could not parse structured actions from Gemini output:', parseErr);
    parsedReply = rawText;
  }

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

  return {
    reply: parsedReply,
    actions: enrichedActions,
    suggestions: parsedSuggestions,
  };
}

export async function processAudioTranscription(params: {
  apiKey: string;
  audioBase64: string;
  mimeType?: string;
}): Promise<{ transcript: string }> {
  const { apiKey, audioBase64, mimeType = 'audio/webm' } = params;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is required.');
  }
  if (!audioBase64) {
    throw new Error('Audio data is missing or empty.');
  }

  const cleanMimeType = (mimeType || 'audio/webm').split(';')[0].trim();
  const promptInstruction =
    'Listen to this spoken audio carefully. The speaker may be speaking Pakistani Urdu (اردو), Roman Urdu, English, or a natural bilingual mix of Urdu and English as commonly spoken in stores, shops, and businesses (e.g., "Widget A mein 10 add kardo", "Doodh ke 5 dabbe sale ho gaye", "Stock kitna bacha hai?", "Kam stock wali cheezein dikhao", "نیا آئٹم شامل کرو", "What items are running low?"). Transcribe verbatim, accurately, and cleanly what the speaker said. Do NOT repeat words or stutter. Return ONLY the transcribed text. Do not add quotes, timestamps, or conversational commentary. If silence or no speech is heard, return empty string.';

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    const response: any = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: promptInstruction,
            },
          ],
        },
      ],
    });

    const transcript =
      response?.text?.trim() ||
      response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '';

    return { transcript };
  } catch (err: any) {
    console.warn('gemini-2.5-flash transcription notice, trying gemini-3.1-flash-lite fallback:', err?.message);

    const fallbackRes: any = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: cleanMimeType || 'audio/webm',
                data: audioBase64,
              },
            },
            {
              text: promptInstruction,
            },
          ],
        },
      ],
    });

    const transcript =
      fallbackRes?.text?.trim() ||
      fallbackRes?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      '';

    return { transcript };
  }
}
