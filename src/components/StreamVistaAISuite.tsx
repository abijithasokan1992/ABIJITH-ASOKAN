import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Bot, Globe, MapPin, Image as ImageIcon, Video, Music, 
  Mic, MicOff, Send, Play, Pause, Download, RefreshCw, Loader2, 
  Search, ExternalLink, Check, AlertCircle, FileText, Film, Volume2,
  Radio, ShieldCheck, ChevronRight, Layers, Sliders, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserRole } from '../types';

interface StreamVistaAISuiteProps {
  userEmail?: string;
  userName?: string;
  userRole?: UserRole;
  onAuditLog?: (action: any, details: string, metadata?: any) => void;
}

type AIToolTab = 'copilot' | 'market_intel' | 'distribution_maps' | 'poster_art' | 'veo_trailer' | 'lyria_soundtrack' | 'meeting_transcriber' | 'live_voice';

export const StreamVistaAISuite: React.FC<StreamVistaAISuiteProps> = ({
  userEmail,
  userName,
  userRole = 'BUYER',
  onAuditLog
}) => {
  const [activeSubTab, setActiveSubTab] = useState<AIToolTab>('copilot');

  // --- 1. Copilot State ---
  const [chatMessages, setChatMessages] = useState<Array<{ role: 'user' | 'model'; text: string; timestamp: number }>>([
    {
      role: 'model',
      text: `Hello ${userName || 'Partner'}, I am **STREAMVISTA Copilot**. How can I assist with your film catalogue rights, territorial windows, minimum guarantee (MG) structuring, or distribution covenants today?`,
      timestamp: Date.now()
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatModel, setChatModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // --- 2. Market Search Grounding State ---
  const [searchPrompt, setSearchPrompt] = useState('Latest Cannes Film Festival distribution acquisitions and SVOD territorial pricing benchmarks');
  const [searchResultText, setSearchResultText] = useState('');
  const [searchGroundingChunks, setSearchGroundingChunks] = useState<any[]>([]);
  const [isSearchLoading, setIsSearchLoading] = useState(false);

  // --- 3. Maps Grounding State ---
  const [mapsPrompt, setMapsPrompt] = useState('Top independent film distribution companies and buyer headquarters in Los Angeles and London');
  const [mapsResultText, setMapsResultText] = useState('');
  const [mapsGroundingChunks, setMapsGroundingChunks] = useState<any[]>([]);
  const [isMapsLoading, setIsMapsLoading] = useState(false);

  // --- 4. Poster / Key Art State ---
  const [posterPrompt, setPosterPrompt] = useState('Cyberpunk neo-noir thriller poster, glowing volumetric neon lighting, lone detective in rain, 35mm film grain, 8k cinematic framing');
  const [posterAspectRatio, setPosterAspectRatio] = useState<'3:4' | '16:9' | '1:1' | '9:16'>('3:4');
  const [generatedPosterUrl, setGeneratedPosterUrl] = useState<string | null>(null);
  const [posterNotes, setPosterNotes] = useState('');
  const [isPosterLoading, setIsPosterLoading] = useState(false);

  // --- 5. Veo Video Trailer State ---
  const [veoPrompt, setVeoPrompt] = useState('Cinematic aerial flyover of neon lit skyscraper city at midnight, cinematic drone shot, anamorphic lens flare, photorealistic 4k');
  const [veoAspectRatio, setVeoAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [veoVideoUrl, setVeoVideoUrl] = useState<string | null>(null);
  const [veoStatusText, setVeoStatusText] = useState('');
  const [isVeoLoading, setIsVeoLoading] = useState(false);

  // --- 6. Lyria Soundtrack State ---
  const [musicPrompt, setMusicPrompt] = useState('Epic orchestral cinematic film trailer score with haunting female vocals, deep brass braams, building to explosive climax');
  const [musicModel, setMusicModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyricsText, setLyricsText] = useState('');
  const [isMusicLoading, setIsMusicLoading] = useState(false);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // --- 7. Transcriber State ---
  const [isRecording, setIsRecording] = useState(false);
  const [transcriptionResult, setTranscriptionResult] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // --- 8. Live Voice State ---
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveStatus, setLiveStatus] = useState('Disconnected');
  const liveWsRef = useRef<WebSocket | null>(null);
  const audioContextInputRef = useRef<AudioContext | null>(null);
  const audioContextOutputRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatLoading]);

  // Handle Copilot Chat Submission
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    const userMsg = { role: 'user' as const, text: chatInput.trim(), timestamp: Date.now() };
    const updatedMessages = [...chatMessages, userMsg];
    setChatMessages(updatedMessages);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          model: chatModel
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setChatMessages(prev => [
        ...prev,
        { role: 'model', text: data.text || 'No response', timestamp: Date.now() }
      ]);

      if (onAuditLog) {
        onAuditLog('copilot_query', `StreamVista AI Copilot consulted with model ${chatModel}`, { model: chatModel, query: userMsg.text });
      }
    } catch (err: any) {
      setChatMessages(prev => [
        ...prev,
        { role: 'model', text: `⚠️ Error communicating with StreamVista AI: ${err.message}`, timestamp: Date.now() }
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Handle Search Grounding
  const handleExecuteSearchGrounding = async () => {
    if (!searchPrompt.trim() || isSearchLoading) return;
    setIsSearchLoading(true);
    setSearchResultText('');
    setSearchGroundingChunks([]);

    try {
      const res = await fetch('/api/ai/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: searchPrompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSearchResultText(data.text || '');
      setSearchGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      setSearchResultText(`Search grounding error: ${err.message}`);
    } finally {
      setIsSearchLoading(false);
    }
  };

  // Handle Maps Grounding
  const handleExecuteMapsGrounding = async () => {
    if (!mapsPrompt.trim() || isMapsLoading) return;
    setIsMapsLoading(true);
    setMapsResultText('');
    setMapsGroundingChunks([]);

    try {
      const res = await fetch('/api/ai/maps-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: mapsPrompt })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMapsResultText(data.text || '');
      setMapsGroundingChunks(data.groundingChunks || []);
    } catch (err: any) {
      setMapsResultText(`Maps grounding error: ${err.message}`);
    } finally {
      setIsMapsLoading(false);
    }
  };

  // Handle Poster Generation
  const handleGeneratePoster = async () => {
    if (!posterPrompt.trim() || isPosterLoading) return;
    setIsPosterLoading(true);
    setGeneratedPosterUrl(null);
    setPosterNotes('');

    try {
      const res = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: posterPrompt,
          aspectRatio: posterAspectRatio,
          imageSize: '1K'
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setGeneratedPosterUrl(data.imageUrl);
      setPosterNotes(data.notes || '');
    } catch (err: any) {
      alert(`Image Generation Error: ${err.message}`);
    } finally {
      setIsPosterLoading(false);
    }
  };

  // Handle Veo Video Generation (Start -> Poll -> Stream)
  const handleGenerateVeoVideo = async () => {
    if (!veoPrompt.trim() || isVeoLoading) return;
    setIsVeoLoading(true);
    setVeoVideoUrl(null);
    setVeoStatusText('Initiating Veo 3 video render server-side...');

    try {
      // Step 1: Start
      const startRes = await fetch('/api/ai/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: veoPrompt,
          aspectRatio: veoAspectRatio,
          resolution: '720p',
          imageBase64: generatedPosterUrl // Animate generated poster if available
        })
      });
      const startData = await startRes.json();
      if (startData.error) throw new Error(startData.error);

      const opName = startData.operationName;
      setVeoStatusText('Veo 3 neural model synthesizing frames (estimated 30-90s)...');

      // Step 2: Poll
      let isDone = false;
      let attempts = 0;
      while (!isDone && attempts < 40) {
        await new Promise(r => setTimeout(r, 4000));
        attempts++;
        setVeoStatusText(`Synthesizing cinematic frames... (Cycle ${attempts})`);

        const pollRes = await fetch('/api/ai/video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operationName: opName })
        });
        const pollData = await pollRes.json();
        if (pollData.error) throw new Error(pollData.error?.message || 'Video generation failed');
        if (pollData.done) {
          isDone = true;
          break;
        }
      }

      if (!isDone) throw new Error('Video generation timed out. Please try a simpler prompt.');

      // Step 3: Stream download
      setVeoStatusText('Finalizing video stream and encoding container...');
      const dlRes = await fetch('/api/ai/video-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operationName: opName })
      });
      if (!dlRes.ok) throw new Error('Failed to download completed video');

      const blob = await dlRes.blob();
      const vUrl = URL.createObjectURL(blob);
      setVeoVideoUrl(vUrl);
      setVeoStatusText('Veo 3 Sizzle Reel Ready!');
    } catch (err: any) {
      setVeoStatusText(`Video Error: ${err.message}`);
    } finally {
      setIsVeoLoading(false);
    }
  };

  // Handle Lyria Soundtrack Generation
  const handleGenerateMusic = async () => {
    if (!musicPrompt.trim() || isMusicLoading) return;
    setIsMusicLoading(true);
    setAudioUrl(null);
    setLyricsText('');
    setIsPlayingMusic(false);

    try {
      const res = await fetch('/api/ai/generate-music', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: musicPrompt,
          model: musicModel,
          imageBase64: generatedPosterUrl
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setAudioUrl(data.audioDataUrl);
      setLyricsText(data.lyrics || '');
    } catch (err: any) {
      alert(`Music Generation Error: ${err.message}`);
    } finally {
      setIsMusicLoading(false);
    }
  };

  // Handle Audio Transcription with MediaRecorder
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          setIsTranscribing(true);
          setTranscriptionResult('Transcribing meeting audio and parsing rights covenants...');

          try {
            const res = await fetch('/api/ai/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ audioBase64: base64Data, mimeType: 'audio/webm' })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            setTranscriptionResult(data.transcript || 'No transcription generated');
          } catch (err: any) {
            setTranscriptionResult(`Transcription Error: ${err.message}`);
          } finally {
            setIsTranscribing(false);
          }
        };

        // Stop all tracks
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err: any) {
      alert(`Microphone Access Error: ${err.message}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Handle Live Voice API Connection
  const toggleLiveVoice = async () => {
    if (isLiveConnected) {
      // Disconnect
      if (liveWsRef.current) liveWsRef.current.close();
      if (audioContextInputRef.current) audioContextInputRef.current.close();
      if (audioContextOutputRef.current) audioContextOutputRef.current.close();
      setIsLiveConnected(false);
      setLiveStatus('Disconnected');
      return;
    }

    try {
      setLiveStatus('Connecting to StreamVista Voice Gateway...');
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      liveWsRef.current = ws;

      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      audioContextInputRef.current = inputCtx;
      audioContextOutputRef.current = outputCtx;

      ws.onopen = async () => {
        setIsLiveConnected(true);
        setLiveStatus('Connected (Listening & Speaking)');

        // Capture mic audio
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32Array to 16-bit PCM little-endian
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            const base64 = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
            ws.send(JSON.stringify({ audio: base64 }));
          }
        };
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.audio) {
            // Playback 24kHz PCM audio
            const binary = atob(msg.audio);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
            const pcm16 = new Int16Array(bytes.buffer);
            const float32 = new Float32Array(pcm16.length);
            for (let i = 0; i < pcm16.length; i++) {
              float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7FFF);
            }

            const buffer = outputCtx.createBuffer(1, float32.length, 24000);
            buffer.getChannelData(0).set(float32);
            const source = outputCtx.createBufferSource();
            source.buffer = buffer;
            source.connect(outputCtx.destination);
            source.start();
          }
        } catch (e) {
          console.warn('Live audio render warning:', e);
        }
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        setLiveStatus('Disconnected');
      };

      ws.onerror = (err) => {
        console.error('Live WS error:', err);
        setLiveStatus('Connection error');
      };
    } catch (err: any) {
      alert(`Live Voice Error: ${err.message}`);
      setLiveStatus('Failed to connect');
    }
  };

  const navItems = [
    { id: 'copilot', label: 'Licensing Copilot', icon: Bot, desc: 'Multi-turn AI advisor & deal memo architect' },
    { id: 'market_intel', label: 'Market Search', icon: Globe, desc: 'Real-time box office & festival grounding' },
    { id: 'distribution_maps', label: 'Distribution Maps', icon: MapPin, desc: 'Global buyer HQs & theatrical hubs' },
    { id: 'poster_art', label: 'Key Art & Posters', icon: ImageIcon, desc: 'Cinematic promotional artwork generator' },
    { id: 'veo_trailer', label: 'Veo 3 Sizzle Reels', icon: Video, desc: 'Neural teaser trailers & scene animator' },
    { id: 'lyria_soundtrack', label: 'Soundtrack Studio', icon: Music, desc: 'Lyria orchestral & electronic themes' },
    { id: 'meeting_transcriber', label: 'Deal Transcriber', icon: Mic, desc: 'Speech-to-text deal covenants & memo' },
    { id: 'live_voice', label: 'Live Voice Session', icon: Radio, desc: 'Real-time conversational voice agent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-3xl shadow-xl border border-blue-900/40">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <Sparkles size={18} />
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">STREAMVISTA AI Innovation Cloud</h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
              Enterprise Suite
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl">
            Unified film distribution &amp; licensing intelligence. Harness Gemini 3 Pro reasoning, Google Search &amp; Maps Grounding, Veo 3 Video Synthesis, and Lyria Soundtracks directly inside your rights exchange.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-300 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Operator: {userName || userEmail || 'Licensed Executive'}</span>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {navItems.map((item) => {
          const isActive = activeSubTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSubTab(item.id as AIToolTab)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 ring-2 ring-blue-500/30'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <item.icon size={16} className={isActive ? 'text-white' : 'text-blue-600'} />
                {isActive && <Check size={12} className="text-blue-200" />}
              </div>
              <div>
                <p className="text-xs font-bold leading-tight">{item.label}</p>
                <p className={`text-[10px] mt-0.5 line-clamp-1 ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xs overflow-hidden min-h-[520px]">
        {/* --- 1. COPILOT (Multi-Turn Chat) --- */}
        {activeSubTab === 'copilot' && (
          <div className="flex flex-col h-[560px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Bot className="text-blue-600" size={18} />
                <div>
                  <h3 className="text-xs font-bold text-slate-900">STREAMVISTA AI Rights &amp; Legal Copilot</h3>
                  <p className="text-[11px] text-slate-500">Multi-turn structured negotiation advisory &amp; covenant architect</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold text-slate-500">Reasoning Engine:</span>
                <select
                  value={chatModel}
                  onChange={(e) => setChatModel(e.target.value as any)}
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Balanced &amp; Fast)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep Legal Reasoning)</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite (Ultra-Low Latency)</option>
                </select>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/30">
              {chatMessages.map((msg, i) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                    }`}>
                      <div className="flex items-center space-x-1.5 mb-1.5 opacity-80 text-[10px] font-bold uppercase tracking-wider">
                        <span>{isUser ? (userName || 'You') : 'StreamVista AI'}</span>
                      </div>
                      <div className="whitespace-pre-wrap font-sans">{msg.text}</div>
                    </div>
                  </div>
                );
              })}
              {isChatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center space-x-2 text-xs text-slate-500 shadow-2xs">
                    <Loader2 size={14} className="animate-spin text-blue-600" />
                    <span>Analyzing catalogue covenants with {chatModel}...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendChat(); }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  placeholder="Ask about territorial holdbacks, minimum guarantees (MG), SVOD windows, or contract structuring..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim() || isChatLoading}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <span>Send</span>
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- 2. SEARCH GROUNDING (Market Intel) --- */}
        {activeSubTab === 'market_intel' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Global Film Market &amp; Festival Search</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Powered by Gemini 3.5 Flash with Google Search Grounding to pull up-to-the-minute box office numbers, trade sales reports, and festival deals.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(e) => setSearchPrompt(e.target.value)}
                  placeholder="Search live film sales, market comps, or festival acquisition benchmarks..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <button
                onClick={handleExecuteSearchGrounding}
                disabled={isSearchLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSearchLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                <span>Fetch Grounded Intel</span>
              </button>
            </div>

            {searchResultText && (
              <div className="space-y-4 pt-2">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {searchResultText}
                </div>

                {searchGroundingChunks.length > 0 && (
                  <div className="p-4 bg-blue-50/60 border border-blue-200/60 rounded-2xl space-y-2">
                    <p className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">Verified Web Grounding Sources</p>
                    <div className="flex flex-wrap gap-2">
                      {searchGroundingChunks.map((chunk, i) => {
                        const web = chunk.web;
                        if (!web) return null;
                        return (
                          <a
                            key={i}
                            href={web.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-blue-200 rounded-lg text-[11px] text-blue-700 font-medium hover:bg-blue-50 transition-colors"
                          >
                            <ExternalLink size={11} />
                            <span className="max-w-xs truncate">{web.title || web.uri}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 3. MAPS GROUNDING (Theatrical & Distribution Hubs) --- */}
        {activeSubTab === 'distribution_maps' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Global Theatrical &amp; Buyer Distribution Hub Locator</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Grounded with Google Maps to locate film distribution headquarters, regional theatrical circuits, and market screening venues.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <MapPin size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={mapsPrompt}
                  onChange={(e) => setMapsPrompt(e.target.value)}
                  placeholder="Enter territory location or buyer hub to search..."
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
              <button
                onClick={handleExecuteMapsGrounding}
                disabled={isMapsLoading}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isMapsLoading ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                <span>Locate Hubs via Maps</span>
              </button>
            </div>

            {mapsResultText && (
              <div className="space-y-4 pt-2">
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {mapsResultText}
                </div>

                {mapsGroundingChunks.length > 0 && (
                  <div className="p-4 bg-emerald-50/60 border border-emerald-200/60 rounded-2xl space-y-2">
                    <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">Grounded Place Links</p>
                    <div className="flex flex-wrap gap-2">
                      {mapsGroundingChunks.map((chunk, i) => {
                        const maps = chunk.maps;
                        if (!maps) return null;
                        return (
                          <a
                            key={i}
                            href={maps.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-lg text-[11px] text-emerald-700 font-medium hover:bg-emerald-50 transition-colors"
                          >
                            <ExternalLink size={11} />
                            <span>{maps.title || maps.uri}</span>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- 4. KEY ART & POSTER GENERATOR (Gemini Image) --- */}
        {activeSubTab === 'poster_art' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">StreamVista Key Art &amp; Poster Studio</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate high-resolution cinematic promotional key art and theatrical marketing posters with Gemini Image.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Art Direction &amp; Film Premise Prompt</label>
                  <textarea
                    rows={4}
                    value={posterPrompt}
                    onChange={(e) => setPosterPrompt(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Poster Aspect Ratio</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: '3:4', label: '3:4 Theatrical' },
                      { id: '16:9', label: '16:9 Banner' },
                      { id: '1:1', label: '1:1 Square' },
                      { id: '9:16', label: '9:16 Mobile' },
                    ].map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => setPosterAspectRatio(ratio.id as any)}
                        className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                          posterAspectRatio === ratio.id 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleGeneratePoster}
                  disabled={isPosterLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isPosterLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  <span>Generate Key Art Poster</span>
                </button>
              </div>

              {/* Preview Window */}
              <div className="bg-slate-900 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[320px] text-white border border-slate-800 overflow-hidden">
                {isPosterLoading ? (
                  <div className="text-center space-y-3">
                    <Loader2 size={28} className="animate-spin text-blue-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-300">Rendering cinematic composition...</p>
                  </div>
                ) : generatedPosterUrl ? (
                  <div className="space-y-3 w-full text-center">
                    <img 
                      src={generatedPosterUrl} 
                      alt="Generated Key Art" 
                      className="max-h-[300px] object-contain rounded-xl mx-auto shadow-2xl border border-slate-700" 
                    />
                    <div className="flex items-center justify-center space-x-3 pt-2">
                      <a
                        href={generatedPosterUrl}
                        download="streamvista_key_art.png"
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700"
                      >
                        <Download size={13} />
                        <span>Download Poster</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 text-slate-500">
                    <ImageIcon size={36} className="mx-auto text-slate-600" />
                    <p className="text-xs">Generated poster preview will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 5. VEO 3 VIDEO TRAILERS & SIZZLE REEL --- */}
        {activeSubTab === 'veo_trailer' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Veo 3 Sizzle Reel &amp; Trailer Generator</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate dynamic film teaser clips and animate key art into cinematic video sequences using Veo 3.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Cinematic Scene &amp; Motion Direction</label>
                  <textarea
                    rows={4}
                    value={veoPrompt}
                    onChange={(e) => setVeoPrompt(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Video Aspect Ratio</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setVeoAspectRatio('16:9')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        veoAspectRatio === '16:9' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      16:9 Cinematic Landscape
                    </button>
                    <button
                      onClick={() => setVeoAspectRatio('9:16')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        veoAspectRatio === '9:16' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      9:16 Mobile Vertical
                    </button>
                  </div>
                </div>

                {generatedPosterUrl && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center space-x-2">
                    <Film size={15} className="text-blue-600 shrink-0" />
                    <span>Poster Key Art loaded: Veo will animate this image into motion!</span>
                  </div>
                )}

                <button
                  onClick={handleGenerateVeoVideo}
                  disabled={isVeoLoading}
                  className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isVeoLoading ? <Loader2 size={15} className="animate-spin" /> : <Video size={15} />}
                  <span>Generate Veo 3 Video Teaser</span>
                </button>
              </div>

              {/* Video Player Display */}
              <div className="bg-slate-950 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[320px] text-white border border-slate-800 overflow-hidden">
                {isVeoLoading ? (
                  <div className="text-center space-y-3 max-w-sm px-4">
                    <Loader2 size={32} className="animate-spin text-purple-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">{veoStatusText}</p>
                    <p className="text-[11px] text-slate-400">Veo is constructing temporal frames and depth maps.</p>
                  </div>
                ) : veoVideoUrl ? (
                  <div className="space-y-3 w-full text-center">
                    <video 
                      src={veoVideoUrl} 
                      controls 
                      autoPlay 
                      loop 
                      className="max-h-[300px] rounded-xl mx-auto shadow-2xl border border-slate-800" 
                    />
                    <div className="pt-2">
                      <a
                        href={veoVideoUrl}
                        download="streamvista_veo_trailer.mp4"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-semibold hover:bg-purple-700 shadow-md"
                      >
                        <Download size={13} />
                        <span>Download Veo MP4</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 text-slate-500">
                    <Video size={36} className="mx-auto text-slate-600" />
                    <p className="text-xs">Veo video teaser output will render here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 6. SOUNDTRACK STUDIO (Lyria) --- */}
        {activeSubTab === 'lyria_soundtrack' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Lyria Soundtrack &amp; Film Score Studio</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Generate original orchestral themes, cinematic soundscapes, and trailer cues using Lyria Clip and Pro.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Musical Style &amp; Mood Description</label>
                  <textarea
                    rows={4}
                    value={musicPrompt}
                    onChange={(e) => setMusicPrompt(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lyria Model Track Length</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMusicModel('lyria-3-clip-preview')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        musicModel === 'lyria-3-clip-preview' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Lyria 3 Clip (30s Trailer Cue)
                    </button>
                    <button
                      onClick={() => setMusicModel('lyria-3-pro-preview')}
                      className={`py-2 text-xs font-bold rounded-xl border text-center transition-all cursor-pointer ${
                        musicModel === 'lyria-3-pro-preview' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      Lyria 3 Pro (Full Score)
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleGenerateMusic}
                  disabled={isMusicLoading}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {isMusicLoading ? <Loader2 size={15} className="animate-spin" /> : <Music size={15} />}
                  <span>Generate Film Soundtrack</span>
                </button>
              </div>

              {/* Music Player Display */}
              <div className="bg-slate-900 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[320px] text-white border border-slate-800 space-y-4">
                {isMusicLoading ? (
                  <div className="text-center space-y-3">
                    <Loader2 size={32} className="animate-spin text-amber-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-200">Synthesizing audio stems with {musicModel}...</p>
                  </div>
                ) : audioUrl ? (
                  <div className="w-full space-y-4 text-center">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto text-amber-400">
                      <Volume2 size={30} />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-white">StreamVista Score Master</h4>
                      <p className="text-xs text-slate-400">Generated with {musicModel}</p>
                    </div>

                    <audio 
                      ref={audioPlayerRef}
                      src={audioUrl} 
                      controls 
                      className="w-full pt-2"
                    />

                    {lyricsText && (
                      <div className="p-3 bg-slate-800 rounded-xl text-[11px] text-slate-300 text-left max-h-24 overflow-y-auto">
                        <span className="font-bold text-amber-400">Theme Notes: </span>{lyricsText}
                      </div>
                    )}

                    <div className="pt-2">
                      <a
                        href={audioUrl}
                        download="streamvista_soundtrack.wav"
                        className="inline-flex items-center space-x-1.5 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700"
                      >
                        <Download size={13} />
                        <span>Download Score WAV</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-2 text-slate-500">
                    <Music size={36} className="mx-auto text-slate-600" />
                    <p className="text-xs">Generated soundtrack audio player will appear here</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- 7. MEETING TRANSCRIBER & DEAL EXTRACTOR --- */}
        {activeSubTab === 'meeting_transcriber' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Licensing Meeting &amp; Deal Terms Transcriber</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record live negotiations or verbal deal notes from your microphone. Gemini 3.5 Flash transcribes and parses key covenants automatically.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                  isRecording 
                    ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-200' 
                    : 'bg-blue-600 text-white hover:bg-blue-700 ring-4 ring-blue-100'
                }`}
              >
                {isRecording ? <MicOff size={32} /> : <Mic size={32} />}
              </button>

              <div className="text-center">
                <p className="text-xs font-bold text-slate-800">
                  {isRecording ? 'Recording active verbal deal memo... Click to finish.' : 'Click microphone to record negotiation memo'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">Uses Gemini 3.5 Flash Multimodal Audio Transcriber</p>
              </div>
            </div>

            {isTranscribing && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center space-x-2 text-xs text-blue-800">
                <Loader2 size={15} className="animate-spin text-blue-600" />
                <span>Processing audio and extracting territorial deal covenants...</span>
              </div>
            )}

            {transcriptionResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Executive Transcription &amp; Deal Analysis</h4>
                  <button 
                    onClick={() => navigator.clipboard.writeText(transcriptionResult)}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Copy Text
                  </button>
                </div>
                <div className="p-5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-800 leading-relaxed whitespace-pre-wrap shadow-2xs font-sans">
                  {transcriptionResult}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- 8. LIVE VOICE SESSION (Live API) --- */}
        {activeSubTab === 'live_voice' && (
          <div className="p-6 space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Conversational Voice Licensing Agent</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time, ultra-low latency bidirectional audio conversations with Gemini 3.1 Flash Live. Talk directly to your StreamVista advisory agent.
              </p>
            </div>

            <div className="flex flex-col items-center justify-center p-12 bg-slate-950 text-white rounded-3xl space-y-6 border border-slate-800">
              <div className="relative">
                <button
                  onClick={toggleLiveVoice}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xl ${
                    isLiveConnected 
                      ? 'bg-emerald-600 text-white ring-8 ring-emerald-500/30 animate-pulse' 
                      : 'bg-blue-600 text-white hover:bg-blue-500 ring-8 ring-blue-500/20'
                  }`}
                >
                  <Radio size={36} />
                </button>
              </div>

              <div className="text-center space-y-1">
                <div className="flex items-center justify-center space-x-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${isLiveConnected ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'}`} />
                  <p className="text-sm font-bold tracking-wide">{liveStatus}</p>
                </div>
                <p className="text-xs text-slate-400">
                  {isLiveConnected 
                    ? 'Speak naturally into your microphone to consult on distribution strategies.' 
                    : 'Click button to launch bidirectional 16kHz audio session with Gemini 3.1 Flash Live.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
