'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Mic, 
  MicOff, 
  PhoneOff, 
  Sparkles, 
  Loader2,
} from 'lucide-react';
import DIDAvatar, { DIDAvatarRef } from '../../components/DIDAvatar';

type Message = {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  ticketId?: string;
};

export default function StellaLivePortal() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentStatus, setAgentStatus] = useState('Connecting to D-ID...');
  
  const didAvatarRef = useRef<DIDAvatarRef>(null);

  // Audio recording state
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    const el = document.getElementById('transcript-scroll');
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const startSession = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        await processAudio(audioBlob);
      };

      setSessionActive(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is required to talk to Stella.");
    }
  };

  const endSession = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setSessionActive(false);
    setMessages([]);
  };

  const startRecording = async () => {
    if (isProcessing) return;
    
    if (!mediaRecorderRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          await processAudio(audioBlob);
        };
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone access is required to talk to Stella.");
        return;
      }
    }

    if (mediaRecorderRef.current) {
      audioChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setAgentStatus('Listening...');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAgentStatus('Thinking...');
      setIsProcessing(true);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    try {
      // 1. Transcribe audio
      const voiceFormData = new FormData();
      voiceFormData.append('file', audioBlob, 'recording.webm');
      
      const voiceRes = await fetch('http://localhost:8000/api/voice', {
        method: 'POST',
        body: voiceFormData,
      });
      if (!voiceRes.ok) throw new Error("Transcription failed");
      const voiceData = await voiceRes.json();
      const transcript = voiceData.transcript;

      // Filter out Whisper silence hallucinations and empty text
      const cleanedTranscript = (transcript || "").trim().toLowerCase().replace(/[^a-z0-9\s]/g, '');
      const hallucinations = [
        'im sorry', 'thank you', 'bye', 'you', 'okay', 'yeah', 'am i', 'hello', 
        'thanks', 'thanks for watching', 'subscribe', 'please subscribe'
      ];
      
      if (!transcript || transcript.trim() === "" || hallucinations.includes(cleanedTranscript) || cleanedTranscript.length < 2) {
        setAgentStatus('Stella is ready. Press and hold mic to speak!');
        setIsProcessing(false);
        return;
      }

      setMessages(prev => [...prev, { id: Math.random().toString(), sender: 'user', text: transcript }]);
      setAgentStatus('Generating video response...');

      // 2. Get chat response and video
      const chatFormData = new FormData();
      chatFormData.append('query', transcript);
      chatFormData.append('transcript', transcript);
      
      const chatRes = await fetch('http://localhost:8000/api/chat', {
        method: 'POST',
        body: chatFormData,
      });
      if (!chatRes.ok) throw new Error("Chat failed");
      const chatData = await chatRes.json();

      const ticketId = chatData.type === 'ticket' ? chatData.ticket.id : undefined;
      
      if (chatData.response) {
        if (chatData.audio) {
          try {
            const audio = new Audio('data:audio/mp3;base64,' + chatData.audio);
            audio.play().catch(e => console.error("Native Audio Play Error:", e));
          } catch (e) {
            console.error("Audio generation failed:", e);
          }
        }
        await didAvatarRef.current?.speak(chatData.response);
      } else {
        setAgentStatus('Stella is ready. Press and hold mic to speak!');
      }

      setMessages(prev => [...prev, { 
        id: Math.random().toString(), 
        sender: 'agent', 
        text: chatData.response,
        ticketId
      }]);

    } catch (err) {
      console.error(err);
      setAgentStatus('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderMessage = (text: string) => {
    const ticketRegex = /(TKT-[A-Z0-9]{6})/g;
    const parts = text.split(ticketRegex);
    return parts.map((part, i) =>
      ticketRegex.test(part) ? (
        <span
          key={i}
          className="inline-flex items-center gap-1 mx-0.5 px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono font-bold text-[10px] tracking-wider"
        >
          🎫 {part}
        </span>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <main className="flex-1 bg-[#0a0b0f] flex flex-col relative overflow-hidden min-h-screen">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-radial from-indigo-500/5 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      <header className="w-full glass sticky top-0 z-10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/" 
            className="p-2.5 rounded-xl hover:bg-zinc-800/80 text-zinc-400 hover:text-white transition-all border border-transparent hover:border-zinc-700/50"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg">S</div>
            <div>
              <span className="font-bold text-lg text-white block leading-tight">Live Portal</span>
              <span className="text-zinc-500 text-xs">Asynchronous Video Chat</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col justify-center">
        {sessionActive ? (
          <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full gap-6 p-6 overflow-hidden h-[calc(100vh-80px)]">
            {/* Left Column: Avatar & Controls */}
            <div className="flex-1 flex flex-col justify-between gap-6 min-w-0">
              <div className="w-full flex items-center justify-between glass-light px-6 py-4 rounded-2xl animate-fade-in">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3.5 w-3.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                  </div>
                  <span className="font-semibold text-sm tracking-wide text-zinc-300">
                    {agentStatus}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold px-3 py-1 bg-zinc-800/50 border border-zinc-700/30 rounded-lg">
                  <Sparkles size={13} className="text-indigo-400 animate-pulse" />
                  GPU Video Engine
                </div>
              </div>

              <div className="flex-1 relative bg-zinc-950/80 border border-zinc-800/80 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl">
                <div className="w-full h-full relative rounded-3xl overflow-hidden bg-zinc-950 flex items-center justify-center">
                  <DIDAvatar ref={didAvatarRef} onStatusChange={(status) => setAgentStatus(status)} />
                  <div className="absolute top-4 left-4 bg-zinc-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 text-[11px] text-zinc-400 font-medium z-10 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                    D-ID Live Stream
                  </div>
                </div>
              </div>

              <div className="w-full flex justify-center gap-4 animate-slide-up">
                <button
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={startRecording}
                  onTouchEnd={stopRecording}
                  disabled={isProcessing}
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                    isProcessing ? 'bg-zinc-800 text-zinc-500 opacity-50 cursor-not-allowed' :
                    isRecording 
                      ? 'bg-red-500 border border-red-400 text-white shadow-lg shadow-red-500/20 scale-105' 
                      : 'bg-indigo-600 border border-indigo-500 text-white hover:bg-indigo-500 shadow-lg'
                  }`}
                  title="Hold to Speak"
                >
                  {isProcessing ? <Loader2 className="animate-spin" size={22} /> : (isRecording ? <Mic size={22} /> : <MicOff size={22} />)}
                </button>

                <button
                  onClick={endSession}
                  className="w-14 h-14 bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-2xl flex items-center justify-center transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                  title="End Session"
                >
                  <PhoneOff size={22} />
                </button>
              </div>
              <p className="text-center text-xs text-zinc-500 -mt-2">Press and hold the microphone button to speak.</p>
            </div>

            {/* Right Column: Live Chat History */}
            <div className="w-full md:w-80 flex flex-col glass border border-zinc-800/80 rounded-3xl overflow-hidden p-5 gap-4 h-[350px] md:h-auto">
              <h3 className="font-bold text-zinc-200 text-sm flex items-center gap-2 pb-2 border-b border-zinc-800/80">
                <Sparkles size={16} className="text-indigo-400" />
                Live Chat History
              </h3>
              <div 
                id="transcript-scroll"
                className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scroll-smooth"
              >
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center px-4">
                    <p className="text-zinc-500 text-xs italic">
                      Chat history will appear here.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isAgent = msg.sender === 'agent';
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-2xl text-xs leading-relaxed max-w-[85%] transition-all ${
                          isAgent
                            ? 'bg-zinc-800/80 border border-zinc-700/50 text-zinc-200 mr-auto'
                            : 'bg-indigo-600/10 border border-indigo-500/20 text-indigo-300 ml-auto'
                        } ${msg.ticketId ? 'ring-1 ring-emerald-500/30' : ''}`}
                      >
                        <div className={`font-semibold text-[9px] mb-1 ${
                          isAgent ? 'text-indigo-400' : 'text-zinc-500'
                        }`}>
                          {isAgent ? '✦ Stella' : 'You'}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1">
                          {renderMessage(msg.text)}
                        </div>
                        {msg.ticketId && (
                          <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[9px] text-emerald-400 font-semibold flex items-center gap-1">
                            <span>📋</span> Track your ticket: {msg.ticketId}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto w-full px-6 py-12 text-center flex flex-col items-center gap-8 animate-fade-in">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/10">
              <Sparkles size={40} className="animate-pulse" />
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-white mb-3">Talk to Stella (GPU Sync)</h1>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Experience perfectly lip-synced realistic video responses powered by your local GPU.
              </p>
            </div>

            <button
              onClick={startSession}
              className="w-full flex items-center justify-center gap-2 text-white font-semibold py-4 px-6 rounded-2xl transition-all shadow-lg hover:scale-[1.01] bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25"
            >
              Start GPU Video Session
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
