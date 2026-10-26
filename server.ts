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

interface AnalyzedGeminiError {
  status: number;
  code: string;
  message: string;
  userExplanation: string;
  diagnosticDetail: string;
  retryAfterSeconds?: number;
}

function analyzeGeminiError(err: any): AnalyzedGeminiError {
  let status = err?.status || err?.statusCode || 500;
  let code = "";
  let rawMsg = String(err?.message || err || "");
  let reason = "";

  // Attempt to parse JSON error structure from Google API
  try {
    const jsonMatch = rawMsg.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error) {
        status = Number(parsed.error.code) || status;
        code = parsed.error.status || "";
        rawMsg = parsed.error.message || rawMsg;
        if (Array.isArray(parsed.error.details) && parsed.error.details[0]) {
          reason = parsed.error.details[0].reason || "";
        }
      }
    }
  } catch (_) {}

  const lowerMsg = rawMsg.toLowerCase();

  // 1. Quota / Rate limit (429 / RESOURCE_EXHAUSTED)
  if (
    status === 429 ||
    code === "RESOURCE_EXHAUSTED" ||
    lowerMsg.includes("quota exceeded") ||
    lowerMsg.includes("rate limit") ||
    reason === "RESOURCE_EXHAUSTED"
  ) {
    let retryAfterSeconds: number | undefined;
    const retryMatch = rawMsg.match(/retry(?: after| in)?\s+([0-9]+(?:\.[0-9]+)?)\s*s/i);
    if (retryMatch && retryMatch[1]) {
      retryAfterSeconds = Math.ceil(parseFloat(retryMatch[1]));
    }
    return {
      status: 429,
      code: "RESOURCE_EXHAUSTED",
      message: rawMsg,
      userExplanation: `Patrão, os servidores neurais atingiram temporariamente o limite de cota da API Gemini (Erro 429: limite de requisições excedido).${
        retryAfterSeconds
          ? ` Previsão de liberação em aproximadamente ${retryAfterSeconds} segundos.`
          : ' Sugiro aguardar cerca de um minuto antes de enviar uma nova pergunta.'
      } Os comandos locais do sistema permanecem operacionais.`,
      diagnosticDetail: `Erro 429: Limite de cota atingido.${retryAfterSeconds ? ` Tente novamente em ${retryAfterSeconds}s.` : ''}`,
      retryAfterSeconds,
    };
  }

  // 2. Authentication failure (401 / UNAUTHENTICATED / API key not valid)
  if (
    status === 401 ||
    code === "UNAUTHENTICATED" ||
    reason === "ACCESS_TOKEN_TYPE_UNSUPPORTED" ||
    reason === "API_KEY_INVALID" ||
    lowerMsg.includes("api key not valid") ||
    lowerMsg.includes("unauthenticated")
  ) {
    return {
      status: 401,
      code: "UNAUTHENTICATED",
      message: rawMsg,
      userExplanation: `Patrão, detectei uma falha de autenticação (Erro 401) com a chave de API do Gemini no servidor. A chave configurada não foi aceita pela API do Google (${
        reason || 'chave inválida ou não autorizada'
      }). Por favor, configure uma chave GEMINI_API_KEY válida no painel de Segredos (Settings > Secrets).`,
      diagnosticDetail: `Erro 401: Chave de API inválida ou não autorizada (${reason || 'UNAUTHENTICATED'}).`,
    };
  }

  // 3. Permission denied (403 / PERMISSION_DENIED)
  if (
    status === 403 ||
    code === "PERMISSION_DENIED" ||
    lowerMsg.includes("permission denied") ||
    lowerMsg.includes("api not enabled")
  ) {
    return {
      status: 403,
      code: "PERMISSION_DENIED",
      message: rawMsg,
      userExplanation: `Patrão, o acesso aos servidores neurais foi recusado (Erro 403: permissão negada). Por favor, verifique se a Generative Language API está habilitada no projeto Google Cloud vinculado à sua chave de API.`,
      diagnosticDetail: `Erro 403: Permissão negada no Google Cloud.`,
    };
  }

  // 4. Model not found (404 / NOT_FOUND)
  if (status === 404 || code === "NOT_FOUND" || lowerMsg.includes("not found")) {
    return {
      status: 404,
      code: "NOT_FOUND",
      message: rawMsg,
      userExplanation: `Patrão, o modelo neural solicitado não foi localizado no catálogo da API Gemini (Erro 404).`,
      diagnosticDetail: `Erro 404: Modelo neural não encontrado.`,
    };
  }

  // 5. Bad request / Invalid argument / Safety block (400 / INVALID_ARGUMENT)
  if (status === 400 || code === "INVALID_ARGUMENT") {
    return {
      status: 400,
      code: "INVALID_ARGUMENT",
      message: rawMsg,
      userExplanation: `Patrão, a solicitação foi recusada pelos filtros da API Gemini (Erro 400: parâmetros inválidos ou bloqueio de segurança).`,
      diagnosticDetail: `Erro 400: Parâmetros inválidos ou filtro de conteúdo.`,
    };
  }

  // 6. Network / Socket errors
  if (
    lowerMsg.includes("econnreset") ||
    lowerMsg.includes("etimedout") ||
    lowerMsg.includes("enotfound") ||
    lowerMsg.includes("fetch failed")
  ) {
    return {
      status: 503,
      code: "NETWORK_ERROR",
      message: rawMsg,
      userExplanation: `Patrão, ocorreu uma interrupção na conexão de rede com os servidores do Gemini (Erro 503). Por favor, verifique sua conexão com a internet e tente novamente.`,
      diagnosticDetail: `Erro 503: Conexão interrompida com servidores neurais.`,
    };
  }

  // 7. General / Server error
  return {
    status: status >= 400 && status < 600 ? status : 500,
    code: code || "COMMUNICATION_ERROR",
    message: rawMsg,
    userExplanation: `Patrão, ocorreu uma instabilidade na comunicação neural com o Gemini (Erro ${status}: ${rawMsg.slice(0, 100)}). Os protocolos locais continuam à sua disposição.`,
    diagnosticDetail: `Erro ${status}: ${rawMsg.slice(0, 80)}`,
  };
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "online",
    system: "J.A.R.V.I.S. Cyber Protocol",
    timestamp: new Date().toISOString(),
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Neural diagnostics endpoint to test Gemini connectivity and credentials
app.get("/api/neural-status", async (_req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({
      connected: false,
      status: 500,
      code: "MISSING_KEY",
      diagnostic: "Chave GEMINI_API_KEY ausente no servidor.",
      message: "Patrão, nenhuma chave GEMINI_API_KEY foi encontrada no ambiente do servidor.",
    });
  }

  try {
    const testRes = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "ping",
    });
    return res.json({
      connected: true,
      status: 200,
      model: "gemini-2.5-flash",
      reply: testRes?.text?.slice(0, 60) || "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    const analyzed = analyzeGeminiError(err);
    return res.status(analyzed.status).json({
      connected: false,
      status: analyzed.status,
      code: analyzed.code,
      diagnostic: analyzed.diagnosticDetail,
      message: analyzed.userExplanation,
    });
  }
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
        error: "Patrão, a chave GEMINI_API_KEY não está configurada no servidor. Por favor, verifique as variáveis de ambiente no painel de segredos.",
        diagnostic: "Chave GEMINI_API_KEY ausente no servidor (500)",
        code: "MISSING_KEY",
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

    // Valid candidate models prioritized by availability and responsiveness
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.8-flash",
    ];
    let response: any = null;
    let lastError: any = null;

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
        console.warn(`Tentativa com modelo ${model} falhou:`, errMsg);

        const analyzed = analyzeGeminiError(err);

        // If error is fatal for the API key (401 invalid key, 403 forbidden),
        // other models will suffer the exact same rejection. Break immediately.
        if (analyzed.status === 401 || analyzed.status === 403) {
          break;
        }

        // Brief pause before trying next fallback model to allow socket recovery on network glitches
        if (analyzed.status === 503 || analyzed.code === "NETWORK_ERROR") {
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
    const analyzed = analyzeGeminiError(lastError);

    return res.status(analyzed.status).json({
      error: analyzed.userExplanation,
      diagnostic: analyzed.diagnosticDetail,
      code: analyzed.code,
      status: analyzed.status,
      retryAfter: analyzed.retryAfterSeconds,
    });
  } catch (error: any) {
    console.error("Erro inesperado no endpoint /api/chat:", error);
    const analyzed = analyzeGeminiError(error);
    return res.status(analyzed.status).json({
      error: analyzed.userExplanation,
      diagnostic: analyzed.diagnosticDetail,
      code: analyzed.code,
      status: analyzed.status,
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
