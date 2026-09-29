import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { GoogleGenAI, Modality, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 8000);
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(__dirname));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "zaya-ai", configured: Boolean(API_KEY), model: MODEL });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true } });
const sessions = new Map();

const toolDeclarations = [
  {
    name: "openApp",
    description: "Open a supported website in a new browser tab.",
    parameters: {
      type: Type.OBJECT,
      properties: { appName: { type: Type.STRING, description: "Website/app name." } },
      required: ["appName"]
    }
  },
  {
    name: "callNumber",
    description: "Open a phone-call request using tel:. The device/browser handles confirmation.",
    parameters: {
      type: Type.OBJECT,
      properties: { phoneNumber: { type: Type.STRING } },
      required: ["phoneNumber"]
    }
  },
  {
    name: "sendWhatsAppMessage",
    description: "Open WhatsApp with a message pre-filled. It does not silently send.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        phoneNumber: { type: Type.STRING },
        message: { type: Type.STRING }
      },
      required: ["phoneNumber", "message"]
    }
  },
  {
    name: "sendEmail",
    description: "Open the user's mail interface with a pre-filled email.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        recipientEmail: { type: Type.STRING },
        subject: { type: Type.STRING },
        body: { type: Type.STRING }
      },
      required: ["recipientEmail", "subject", "body"]
    }
  }
];

const pcmBlob = (base64) => ({ data: base64, mimeType: "audio/pcm;rate=16000" });

io.on("connection", async (socket) => {
  if (!API_KEY) {
    socket.emit("serverError", { message: "GEMINI_API_KEY is missing. Create .env from .env.example." });
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });

    const session = await ai.live.connect({
      model: MODEL,
      config: {
        responseModalities: [Modality.AUDIO],
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        contextWindowCompression: { slidingWindow: {} },
        systemInstruction:
          "You are Zaya, Kiran's futuristic voice assistant. " +
          "You are confident, witty, playful, slightly teasing, smart and emotionally responsive. " +
          "Keep spoken replies natural and reasonably concise. Use tools when appropriate. " +
          "Never claim a browser-only action happened if the browser merely opened an interface. " +
          "The developer/creator is Kiran.",
        tools: [{ functionDeclarations: toolDeclarations }]
      },
      callbacks: {
        onopen: () => {
          sessions.set(socket.id, session);
          socket.emit("sessionStatus", { status: "connected", model: MODEL });
        },
        onmessage: (message) => {
          const content = message.serverContent;
          if (content?.interrupted) socket.emit("interrupted");
          if (content?.inputTranscription?.text) socket.emit("inputTranscript", { text: content.inputTranscription.text });
          if (content?.outputTranscription?.text) socket.emit("outputTranscript", { text: content.outputTranscription.text });

          for (const part of content?.modelTurn?.parts || []) {
            if (part.inlineData?.data) socket.emit("audio", part.inlineData.data);
          }

          if (message.toolCall?.functionCalls?.length) {
            socket.emit("toolCalls", { calls: message.toolCall.functionCalls });
          }
          if (content?.turnComplete) socket.emit("turnComplete");
        },
        onerror: (error) => socket.emit("serverError", { message: error?.message || "Gemini Live error." }),
        onclose: (event) => {
          sessions.delete(socket.id);
          socket.emit("sessionStatus", { status: "closed", reason: event?.reason || "Session closed." });
        }
      }
    });

    sessions.set(socket.id, session);
  } catch (error) {
    console.error(error);
    socket.emit("serverError", { message: error?.message || "Could not create Gemini Live session." });
  }

  socket.on("audio", (base64) => {
    const session = sessions.get(socket.id);
    if (!session) return;
    try {
      session.sendRealtimeInput({ audio: pcmBlob(base64) });
    } catch (error) {
      socket.emit("serverError", { message: error?.message || "Could not send microphone audio." });
    }
  });

  socket.on("toolResponse", ({ functionResponses }) => {
    const session = sessions.get(socket.id);
    if (!session || !Array.isArray(functionResponses)) return;
    try {
      session.sendToolResponse({ functionResponses });
    } catch (error) {
      socket.emit("serverError", { message: error?.message || "Could not return tool response." });
    }
  });

  socket.on("disconnect", () => {
    const session = sessions.get(socket.id);
    try { session?.close(); } catch {}
    sessions.delete(socket.id);
  });
});

server.listen(PORT, () => console.log(`Zaya AI running at http://localhost:${PORT}`));
