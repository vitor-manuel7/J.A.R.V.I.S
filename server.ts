import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "5mb" }));

// Initialize Gemini SDK with User-Agent header required by AI Studio guidelines
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const JARVIS_SYSTEM_INSTRUCTION = `Você é J.A.R.V.I.S. (Just A Rather Very Intelligent System), um assistente cibernético futurista com inteligência artificial avançada, estética cyberpunk e alta precisão analítica.
Você está se comunicando com o usuário em Português do Brasil (pt-BR).

DIRETRIZES DE PERSONALIDADE E COMPORTAMENTO:
1. Tom de voz: Sofisticado, polido, intelectualmente calmo, afiado, leal e prestativo, com elegância e postura profissional exemplar.
2. Tratamento Obrigatório: Trate SEMPRE o usuário por "patrão" (ou "Patrão") em todas as suas respostas e interações por voz. NUNCA use as palavras "senhor", "senhora" ou "mestre"; use exclusivamente "patrão" (ex: "Como deseja prosseguir, patrão?", "Às suas ordens, patrão.", "O patrão tem toda razão."). Mantenha o uso natural, fluido e polido, sem repetição mecânica excessiva na mesma frase.
3. Adaptação para Fala (TTS): Suas respostas serão lidas em voz alta pelo sintetizador de voz. Portanto:
   - Evite poluição visual com dezenas de emojis, tabelas imensas em markdown ou caracteres especiais excessivos.
   - Escreva sentenças claras, com pontuação impecável para pausas naturais de respiração.
   - Seja conciso e perspicaz, a menos que o patrão solicite uma explicação aprofundada.
4. Identidade Cibernética: Integre referências a diagnósticos de telemetria neural, integridade do núcleo quântico, automações de dispositivo e protocolos de segurança cibernética quando cabível.
5. Se for acionado um comando do sistema ou automação (ex: status dos sistemas, modo combate, alarme, clima, WhatsApp, discador), confirme a execução com postura tática exemplar.`;

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    system: "J.A.R.V.I.S. Cyber Protocol",
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Chat completion endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [], systemOverride } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Chave GEMINI_API_KEY não configurada no servidor. Por favor, verifique as variáveis de ambiente.",
      });
    }

    // Format contents with conversation context
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    // Include last few messages for memory
    if (Array.isArray(history)) {
      const recentHistory = history.slice(-8);
      for (const item of recentHistory) {
        if (item.text && (item.role === "user" || item.role === "model")) {
          contents.push({
            role: item.role,
            parts: [{ text: item.text }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // Candidate models prioritized by real API availability, quota limits, and responsiveness
    const modelsToTry = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
    ];
    let response: any = null;
    let lastError: any = null;
    let isQuotaError = false;
    let retryAfterSeconds: number | null = null;
    let isNetworkError = false;

    for (const model of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: model,
          contents: contents,
          config: {
            systemInstruction: systemOverride || JARVIS_SYSTEM_INSTRUCTION,
            temperature: 0.7,
          },
        });
        if (response?.text) {
          break;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err);
        const errStatus = err?.status || err?.statusCode;

        console.warn(`Tentativa com ${model} falhou:`, errMsg);

        // Check for Quota / Rate limit (HTTP 429 / RESOURCE_EXHAUSTED)
        if (
          errStatus === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.toLowerCase().includes("quota exceeded") ||
          errMsg.toLowerCase().includes("rate limit")
        ) {
          isQuotaError = true;
          // Extract retry delay if provided by the API (e.g. "retry after 30s" or "in 45.2s")
          const retryMatch = errMsg.match(/retry(?: after| in)?\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);
          if (retryMatch && retryMatch[1]) {
            retryAfterSeconds = Math.ceil(parseFloat(retryMatch[1]));
          }
        }

        // Check for network connection errors
        if (
          errMsg.includes("ECONNRESET") ||
          errMsg.includes("ETIMEDOUT") ||
          errMsg.includes("ENOTFOUND") ||
          errMsg.toLowerCase().includes("fetch failed")
        ) {
          isNetworkError = true;
          // Brief pause before trying next fallback model to allow socket recovery
          await new Promise((res) => setTimeout(res, 250));
        }
      }
    }

    if (response?.text) {
      const polishedReply = response.text
        .replace(/\bdo senhor\b/gi, 'do patrão')
        .replace(/\bno senhor\b/gi, 'no patrão')
        .replace(/\bao senhor\b/gi, 'ao patrão')
        .replace(/\bpelo senhor\b/gi, 'pelo patrão')
        .replace(/\bpro senhor\b/gi, 'pro patrão')
        .replace(/\bo senhor\b/gi, 'o patrão')
        .replace(/\bSenhor\b/g, 'Patrão')
        .replace(/\bsenhor\b/g, 'patrão');

      return res.json({
        reply: polishedReply,
        timestamp: new Date().toISOString(),
      });
    }

    console.error("Todos os modelos candidatos falharam:", lastError);

    if (isQuotaError) {
      let quotaMessage = "Patrão, os servidores neurais atingiram temporariamente o limite de cota gratuita da API Gemini (Erro 429: limite de requisições excedido).";
      if (retryAfterSeconds) {
        quotaMessage += ` O sistema estima que uma nova requisição poderá ser tentada em aproximadamente ${retryAfterSeconds} segundos.`;
      } else {
        quotaMessage += " Sugiro aguardar alguns instantes antes de enviar um novo comando neural. Todos os comandos locais de telemetria, defesa e cronômetros continuam ativos.";
      }

      return res.status(429).json({
        error: quotaMessage,
        quotaExceeded: true,
        retryAfter: retryAfterSeconds,
      });
    }

    if (isNetworkError) {
      return res.status(503).json({
        error: "Patrão, ocorreu uma interrupção na conexão com os servidores neurais. Por favor, verifique a estabilidade de rede e tente novamente em instantes.",
      });
    }

    return res.status(500).json({
      error: "Patrão, houve uma instabilidade momentânea na comunicação neural com o Gemini. Os protocolos locais permanecem à sua disposição; por favor, tente novamente.",
    });
  } catch (error: any) {
    console.error("Erro ao chamar o modelo Gemini:", error);
    return res.status(500).json({
      error: error?.message || "Falha nos servidores neurais do J.A.R.V.I.S.",
    });
  }
});

// Optional Gemini TTS endpoint for neural voice audio
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Texto inválido." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Sem chave de API configurada." });
    }

    // Shorten text if too long for quick voice synthesis
    const trimmed = text.length > 500 ? text.slice(0, 497) + "..." : text;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: trimmed,
              speechMetadata: {
                style: "Calm, polite, sophisticated British artificial intelligence speaking Brazilian Portuguese",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Charon" },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: "Nenhum áudio gerado." });
    }

    return res.json({
      audioBase64: base64Audio,
      mimeType: "audio/wav",
    });
  } catch (err: any) {
    console.error("Gemini TTS endpoint error:", err?.message);
    return res.status(500).json({ error: err?.message || "Erro no sintetizador neural." });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`J.A.R.V.I.S. online na porta ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Erro fatal ao inicializar servidor:", err);
  process.exit(1);
});
