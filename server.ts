import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI server-side with required User-Agent header
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

// Chat completion endpoint using gemini-3.8-flash
app.post('/api/chat', async (req: Request, res: Response) => {
  try {
    const { message, history = [], systemInstruction } = req.body;

    if (!message || typeof message !== 'string') {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    if (!apiKey) {
      res.status(500).json({
        error: 'GEMINI_API_KEY is not configured. Please ensure your API key is set in environment secrets.',
      });
      return;
    }

    // Default bilingual and supportive system instruction
    const defaultInstruction =
      'You are an intelligent, friendly, and helpful AI assistant fluent in Bengali (বাংলা) and English. ' +
      'Answer clearly, politely, and insightfully. Use nicely formatted Markdown when helpful (lists, bold text, code blocks). ' +
      'If the user speaks in Bengali, reply primarily in fluent, natural Bengali. If they speak in English, reply in English. ' +
      'You can also suggest ideas for image prompts if the user seems interested in visual generation.';

    // Format chat history
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    if (Array.isArray(history) && history.length > 0) {
      for (const item of history.slice(-10)) {
        if (item.text && (item.role === 'user' || item.role === 'model')) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    // Try gemini-3.8-flash first as prescribed, fallback smoothly to gemini-3.5-flash or gemini-3.6-flash if high-demand spikes occur
    let responseText = '';
    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash'];

    let lastError: any = null;
    for (const modelName of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: contents,
          config: {
            systemInstruction: systemInstruction || defaultInstruction,
            temperature: 0.7,
          },
        });
        if (response.text) {
          responseText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed or busy:`, err?.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('All models were unavailable');
    }

    res.json({ reply: responseText });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    let errMsg = error?.message || 'Failed to generate response from Gemini API';
    try {
      const parsed = JSON.parse(errMsg);
      if (parsed?.error?.message) {
        errMsg = parsed.error.message;
      }
    } catch (_) {}
    res.status(500).json({ error: errMsg });
  }
});

// Helper style enricher
const STYLE_PROMPTS: Record<string, string> = {
  photorealistic: 'hyperrealistic, 8k resolution, cinematic lighting, ultra-detailed photograph, 35mm lens, sharp focus',
  anime: 'vibrant anime aesthetic, Studio Ghibli inspired, high quality manga art, detailed line work, cel shaded',
  'digital-art': 'stunning modern digital concept art, trending on ArtStation, dynamic lighting, vivid colors, masterpiece',
  cyberpunk: 'futuristic cyberpunk neon glow, dark rainy streets, high tech holograms, volumetric lighting, synthwave',
  '3d-render': 'Pixar/Disney 3D animation style, Unreal Engine 5 render, soft global illumination, octane render, smooth textures',
  'oil-painting': 'classic rich oil painting, visible palette knife strokes, textured canvas, fine art museum masterpiece',
  'rickshaw-art': 'vibrant Bangladeshi traditional rickshaw art style, hand-painted folk aesthetic, bold floral motifs, saturated joyful colors',
  fantasy: 'epic ethereal fantasy illustration, mystical atmosphere, magical particles, dreamlike scenic background, 8k',
  default: 'high aesthetic quality, detailed, visually appealing composition',
};

// Image generation endpoint
app.post('/api/generate-image', async (req: Request, res: Response) => {
  try {
    const { prompt, aspectRatio = '1:1', style = 'default' } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    const styleAddition = STYLE_PROMPTS[style] || STYLE_PROMPTS.default;
    const finalPrompt = `${prompt}, ${styleAddition}`;

    // Normalize aspect ratio for Gemini: "1:1", "3:4", "4:3", "9:16", "16:9"
    const validRatios = ['1:1', '3:4', '4:3', '9:16', '16:9'];
    const geminiRatio = validRatios.includes(aspectRatio) ? (aspectRatio as any) : '1:1';

    let imageUrl: string | null = null;
    let provider = 'gemini';

    // Attempt Gemini Image Generation first if API key is present
    if (apiKey) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-image',
          contents: {
            parts: [{ text: finalPrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: geminiRatio,
              imageSize: '1K',
            },
          },
        });

        const candidates = response.candidates;
        if (candidates && candidates.length > 0) {
          const parts = candidates[0].content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.data) {
              const mime = part.inlineData.mimeType || 'image/png';
              imageUrl = `data:${mime};base64,${part.inlineData.data}`;
              break;
            }
          }
        }
      } catch (geminiError: any) {
        console.warn('Gemini image generation warning, falling back gracefully:', geminiError?.message || geminiError);
      }
    }

    // Fallback: If Gemini image wasn't generated or key missing/unsupported, use high-resolution Pollinations AI
    if (!imageUrl) {
      provider = 'pollinations';
      // Dimensions mapping based on aspect ratio
      const dimensionMap: Record<string, { w: number; h: number }> = {
        '1:1': { w: 1024, h: 1024 },
        '16:9': { w: 1280, h: 720 },
        '9:16': { w: 720, h: 1280 },
        '4:3': { w: 1024, h: 768 },
        '3:4': { w: 768, h: 1024 },
      };
      const dims = dimensionMap[aspectRatio] || { w: 1024, h: 1024 };
      const seed = Math.floor(Math.random() * 10000000);
      imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(finalPrompt)}?width=${dims.w}&height=${dims.h}&seed=${seed}&nologo=true&model=flux`;
    }

    res.json({
      imageUrl,
      provider,
      prompt: finalPrompt,
      originalPrompt: prompt,
      aspectRatio,
      style,
    });
  } catch (error: any) {
    console.error('Error in /api/generate-image:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate image',
    });
  }
});

// Prompt enhancement helper using gemini-3.8-flash
app.post('/api/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, language = 'en' } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Prompt is required' });
      return;
    }

    if (!apiKey) {
      res.json({ enhancedPrompt: prompt });
      return;
    }

    const systemPrompt =
      'You are an expert AI art prompt engineer. Given a short image idea (which could be in Bengali or English), ' +
      'expand it into a vivid, descriptive prompt in English that yields incredible AI images. ' +
      'Describe lighting, environment, textures, colors, mood, and composition. Keep it to 2-3 sentences. ' +
      'Output ONLY the enhanced prompt without markdown or quotes.';

    const modelsToTry = ['gemini-3.8-flash', 'gemini-3.5-flash', 'gemini-3.6-flash'];
    let enhanced = '';
    for (const m of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: `Enhance this image idea for AI generation: "${prompt}"`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
          },
        });
        if (response.text) {
          enhanced = response.text.trim();
          break;
        }
      } catch (e) {
        // Continue to next model
      }
    }

    res.json({ enhancedPrompt: enhanced || prompt });
  } catch (error: any) {
    console.error('Error enhancing prompt:', error);
    res.json({ enhancedPrompt: req.body.prompt });
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(process.cwd(), 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
