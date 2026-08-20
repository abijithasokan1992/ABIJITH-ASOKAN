import express from "express";
import http from "http";
import path from "path";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, GenerateVideosOperation, Modality } from "@google/genai";

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set. Please set it in Settings > Secrets.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // Increase payload limit for base64 audio and video reference images
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      brand: "STREAMVISTA Rights Cloud", 
      hasApiKey: !!process.env.GEMINI_API_KEY, 
      timestamp: new Date().toISOString() 
    });
  });

  // 1. Multi-turn AI Chat Endpoint (StreamVista Licensing Copilot)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, model = "gemini-3.5-flash", systemInstruction } = req.body;
      const ai = getAIClient();

      const defaultSystem = `You are STREAMVISTA AI, the authoritative B2B Film & Television Licensing, Rights Management, and Global Media Distribution Copilot.
You assist buyers (streaming platforms, broadcasters, aggregators), content owners (studios, producers, sales agents), and legal counsels.
You specialize in:
1. Territory windows (Theatrical, SVOD, AVOD, TVOD, Pay TV, Inflight, Linear).
2. Deal structuring, minimum guarantees (MG), revenue shares, holdbacks, and clearance.
3. Rights valuation, box office benchmarks, and film catalogue optimization.
4. Drafting clear licensing deal memos and screening access terms under StreamVista.
Provide structured, professional, and actionable industry advice.`;

      const contents = (messages || []).map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text || m.content || "" }]
      }));

      if (contents.length === 0) {
        return res.status(400).json({ error: "No messages provided" });
      }

      // Valid model fallback
      let selectedModel = model;
      if (selectedModel === "gemini-3.1-pro" || selectedModel === "gemini-pro") selectedModel = "gemini-3.1-pro-preview";
      if (selectedModel === "gemini-flash" || !selectedModel) selectedModel = "gemini-3.5-flash";
      if (selectedModel === "gemini-lite" || selectedModel === "gemini-flash-lite") selectedModel = "gemini-3.1-flash-lite";

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents,
        config: {
          systemInstruction: systemInstruction || defaultSystem,
          temperature: 0.7,
        },
      });

      res.json({
        text: response.text || "No response generated.",
        modelUsed: selectedModel
      });
    } catch (err: any) {
      console.error("AI Chat Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate AI response" });
    }
  });

  // 2. Google Search Grounding for Live Industry & Box Office Intelligence
  app.post("/api/ai/search-grounding", async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are STREAMVISTA Market Intelligence. Provide real-time data, box office numbers, film festival sales (Cannes, AFM, EFM, Sundance), streaming acquisitions, and distribution comps. Always leverage Google Search grounding for up-to-date facts.`,
          tools: [{ googleSearch: {} }],
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
      const searchSuggestions = response.candidates?.[0]?.groundingMetadata?.webSearchQueries || [];

      res.json({
        text: response.text || "",
        groundingChunks,
        searchSuggestions
      });
    } catch (err: any) {
      console.error("Search Grounding Error:", err);
      res.status(500).json({ error: err.message || "Failed to execute search grounding" });
    }
  });

  // 3. Google Maps Grounding for Global Film Markets & Distribution Hubs
  app.post("/api/ai/maps-grounding", async (req, res) => {
    try {
      const { prompt, latitude, longitude } = req.body;
      if (!prompt) return res.status(400).json({ error: "Prompt is required" });

      const ai = getAIClient();
      const toolConfig = latitude && longitude ? {
        retrievalConfig: {
          latLng: {
            latitude: Number(latitude),
            longitude: Number(longitude)
          }
        }
      } : undefined;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: `You are STREAMVISTA Global Theatrical & Venue Locator. Locate film distribution companies, major buyer HQs, festival screening venues, and entertainment complexes worldwide.`,
          tools: [{ googleMaps: {} }],
          ...(toolConfig ? { toolConfig } : {})
        },
      });

      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

      res.json({
        text: response.text || "",
        groundingChunks
      });
    } catch (err: any) {
      console.error("Maps Grounding Error:", err);
      res.status(500).json({ error: err.message || "Failed to execute maps grounding" });
    }
  });

  // 4. Poster & Key Art Generation & Editing (Gemini Image)
  app.post("/api/ai/generate-image", async (req, res) => {
    try {
      const { prompt, aspectRatio = "3:4", imageSize = "1K", baseImageBase64, mimeType = "image/png" } = req.body;
      if (!prompt && !baseImageBase64) return res.status(400).json({ error: "Prompt or base image is required" });

      const ai = getAIClient();

      const parts: any[] = [];
      if (baseImageBase64) {
        // Strip data prefix if present
        const cleanBase64 = baseImageBase64.replace(/^data:image\/\w+;base64,/, '');
        parts.push({
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType
          }
        });
      }
      if (prompt) {
        parts.push({
          text: `Create professional cinematic key art poster for STREAMVISTA catalogue. Style: high-end theatrical promotional poster, striking composition, 8k render details. Description: ${prompt}`
        });
      }

      // Use gemini-3.1-flash-image-preview or gemini-3.1-flash-lite-image
      const model = "gemini-3.1-flash-image-preview";
      const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: imageSize as any
          }
        }
      });

      let generatedImageUrl = null;
      let textResponse = "";

      const candidateParts = response.candidates?.[0]?.content?.parts || [];
      for (const part of candidateParts) {
        if (part.inlineData?.data) {
          const mType = part.inlineData.mimeType || "image/png";
          generatedImageUrl = `data:${mType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          textResponse += part.text;
        }
      }

      if (!generatedImageUrl) {
        return res.status(500).json({ error: "No image was returned from the model", details: textResponse });
      }

      res.json({
        imageUrl: generatedImageUrl,
        notes: textResponse
      });
    } catch (err: any) {
      console.error("Image Gen Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate image" });
    }
  });

  // 5. Soundtrack & Cinematic Theme Music Generation (Lyria)
  app.post("/api/ai/generate-music", async (req, res) => {
    try {
      const { prompt, model = "lyria-3-clip-preview", imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!prompt) return res.status(400).json({ error: "Music prompt is required" });

      const ai = getAIClient();
      const selectedModel = model === "lyria-3-pro-preview" ? "lyria-3-pro-preview" : "lyria-3-clip-preview";

      let contentsPayload: any = `STREAMVISTA Film Score: ${prompt}`;
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        contentsPayload = {
          parts: [
            { text: `STREAMVISTA Film Score inspired by this cinematic poster: ${prompt}` },
            { inlineData: { data: cleanBase64, mimeType } }
          ]
        };
      }

      const response = await ai.models.generateContentStream({
        model: selectedModel,
        contents: contentsPayload,
      });

      let audioBase64 = "";
      let lyrics = "";
      let audioMimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              audioMimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !lyrics) {
            lyrics = part.text;
          }
        }
      }

      if (!audioBase64) {
        return res.status(500).json({ error: "Music generation did not return audio data" });
      }

      res.json({
        audioBase64,
        mimeType: audioMimeType,
        lyrics,
        audioDataUrl: `data:${audioMimeType};base64,${audioBase64}`,
        modelUsed: selectedModel
      });
    } catch (err: any) {
      console.error("Music Gen Error:", err);
      res.status(500).json({ error: err.message || "Failed to generate soundtrack" });
    }
  });

  // 6. Audio Transcription for Verbal Deal Notes & Pitch Meetings (Gemini 3.5 Flash)
  app.post("/api/ai/transcribe", async (req, res) => {
    try {
      const { audioBase64, mimeType = "audio/webm" } = req.body;
      if (!audioBase64) return res.status(400).json({ error: "Audio data is required" });

      const ai = getAIClient();
      const cleanBase64 = audioBase64.replace(/^data:audio\/\w+;base64,/, '');

      const audioPart = {
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      };

      const promptPart = {
        text: `You are the STREAMVISTA Executive Meeting & Deal Transcriber.
Transcribe this spoken audio accurately.
Then provide:
1. **Full Verbatim Transcript**
2. **Key Deal Terms & Rights Identified** (Territories, MG, Holdbacks, Term length, Platform types if mentioned)
3. **Action Items & Next Steps for StreamVista Team**`
      };

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: { parts: [audioPart, promptPart] }
      });

      res.json({
        transcript: response.text || "No transcription generated."
      });
    } catch (err: any) {
      console.error("Transcription Error:", err);
      res.status(500).json({ error: err.message || "Failed to transcribe audio" });
    }
  });

  // 7. Veo 3 Video Generation (Text to Video & Image to Video Teasers)
  // Step 1: Start video generation
  app.post("/api/ai/generate-video", async (req, res) => {
    try {
      const { prompt, aspectRatio = "16:9", resolution = "720p", imageBase64, mimeType = "image/png" } = req.body;
      if (!prompt && !imageBase64) return res.status(400).json({ error: "Prompt or image is required" });

      const ai = getAIClient();
      const model = "veo-3.1-fast-generate-preview";

      const config: any = {
        numberOfVideos: 1,
        resolution: resolution === "1080p" ? "1080p" : "720p",
        aspectRatio: aspectRatio === "9:16" ? "9:16" : "16:9"
      };

      let operation;
      if (imageBase64) {
        const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
        operation = await ai.models.generateVideos({
          model,
          prompt: prompt ? `STREAMVISTA Film Teaser: ${prompt}` : undefined,
          image: {
            imageBytes: cleanBase64,
            mimeType: mimeType
          },
          config
        });
      } else {
        operation = await ai.models.generateVideos({
          model,
          prompt: `STREAMVISTA Cinematic Trailer Teaser: ${prompt}`,
          config
        });
      }

      res.json({ operationName: operation.name });
    } catch (err: any) {
      console.error("Veo Generate Video Error:", err);
      res.status(500).json({ error: err.message || "Failed to start video generation" });
    }
  });

  // Step 2: Poll video status
  app.post("/api/ai/video-status", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: "operationName is required" });

      const ai = getAIClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });

      res.json({ 
        done: !!updated.done,
        error: updated.error || null
      });
    } catch (err: any) {
      console.error("Veo Status Error:", err);
      res.status(500).json({ error: err.message || "Failed to check video status" });
    }
  });

  // Step 3: Stream/download completed video
  app.post("/api/ai/video-download", async (req, res) => {
    try {
      const { operationName } = req.body;
      if (!operationName) return res.status(400).json({ error: "operationName is required" });

      const ai = getAIClient();
      const op = new GenerateVideosOperation();
      op.name = operationName;
      const updated = await ai.operations.getVideosOperation({ operation: op });

      const uri = updated.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) {
        return res.status(404).json({ error: "Video URI not available in operation" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      const videoRes = await fetch(uri, {
        headers: { 'x-goog-api-key': apiKey || '' }
      });

      if (!videoRes.ok) {
        return res.status(videoRes.status).json({ error: "Failed to download video from Google storage" });
      }

      res.setHeader('Content-Type', 'video/mp4');
      const arrayBuffer = await videoRes.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (err: any) {
      console.error("Veo Download Error:", err);
      res.status(500).json({ error: err.message || "Failed to download video" });
    }
  });

  // 8. WebSocket Server for Live Voice Licensing Conversations
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : "";
    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Live Voice Client Connected to StreamVista");
    try {
      const ai = getAIClient();
      const session = await ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: `You are STREAMVISTA Live Voice Licensing Agent.
You are on an active audio consultation with a film distribution executive or studio head.
Speak clearly, with professional media executive confidence. Discuss territorial rights, revenue splits, festival launches, and contractual terms. Keep responses conversational, concise, and natural.`,
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audio && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          },
        },
      });

      clientWs.on("message", (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: "audio/pcm;rate=16000" },
            });
          }
        } catch (e) {
          console.warn("Live audio message parse warning:", e);
        }
      });

      clientWs.on("close", () => {
        console.log("Live voice client disconnected");
        session.close();
      });
    } catch (err) {
      console.error("Live voice connection error:", err);
      clientWs.close();
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`STREAMVISTA Platform running on http://localhost:${PORT}`);
  });
}

startServer();

