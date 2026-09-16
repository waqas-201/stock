import { processStockChat } from '../../src/lib/geminiLogic';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      endpoint: '/api/gemini/stock-chat',
      method: 'POST required',
      environment: 'vercel-serverless',
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(400).json({
        error: 'GEMINI_API_KEY is not configured in Vercel environment variables.',
      });
    }

    const { message, history = [], stockItems = [], languageMode } = req.body || {};
    const result = await processStockChat({
      apiKey,
      message,
      history,
      stockItems,
      languageMode,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    console.error('Vercel stock-chat error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to process stock conversation on serverless backend.',
    });
  }
}
