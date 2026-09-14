import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

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

      const { message, history = [], stockItems = [] } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'A user message is required.' });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

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
        name: item.itemName,
        quantity: item.quantity,
        unit: item.unit,
        alertThreshold: item.lowStockThreshold,
        status: (item.quantity <= 0) ? 'Out of Stock' : (item.quantity <= (item.lowStockThreshold ?? 5)) ? 'Low Stock' : 'In Stock',
        productionDate: item.productionDate || null,
        tags: item.tags || [],
        notes: item.notes || null,
      }));

      const systemInstruction = `You are the Gemini Stock AI Assistant for this inventory management app.
You talk with users directly about their warehouse and store stock inventory in real time.

Current Inventory Statistics:
- Total Unique Items (SKUs): ${totalItems}
- Total Inventory Volume: ${totalQuantity} units across all items
- Items in Good Standing: ${inStockItems.length}
- Low Stock Alerts (at or below item threshold): ${lowStockItems.length} (${lowStockItems.map(i => `${i.itemName}: ${i.quantity} ${i.unit}`).join(', ') || 'None'})
- Out of Stock Items: ${outOfStockItems.length} (${outOfStockItems.map(i => i.itemName).join(', ') || 'None'})

Full Current Inventory Data:
${JSON.stringify(inventorySnapshot, null, 2)}

Instructions:
1. Answer the user's questions about stock accurately using the inventory data above.
2. Provide specific numbers, units, and clear recommendations (e.g. reordering items below threshold).
3. If the user asks about an item that isn't in stock or in the catalog, let them know clearly.
4. Keep answers friendly, professional, and well-structured with Markdown (bullet points, bold key numbers).
5. Keep conversational responses concise so they are pleasant to read and listen to when spoken via Text-to-Speech.
6. When helpful, suggest 2-3 quick follow-up questions at the very end formatted as:
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

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "I've reviewed your inventory. Let me know what specific stock details you'd like to explore!";
      return res.json({ reply: replyText });
    } catch (error: any) {
      console.error('Error in /api/gemini/stock-chat:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to generate response from Gemini AI.',
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
