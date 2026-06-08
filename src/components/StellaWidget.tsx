'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Sparkles, MessageCircle, PhoneOff } from 'lucide-react';
import DIDAvatar, { DIDAvatarRef } from './DIDAvatar';

export default function StellaWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [agentStatus, setAgentStatus] = useState('Idle');
  const [threadId, setThreadId] = useState<string | null>(null);

  const didAvatarRef = useRef<DIDAvatarRef>(null);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          }
        }
        if (final) {
          handleSendMessage(final);
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) {
            try { recognition.start(); } catch(e) {}
        }
      };
      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [threadId]); // depend on threadId to keep closure fresh, or use ref

  const toggleWidget = () => {
    if (!isOpen) {
      setIsOpen(true);
      setAgentStatus('Connecting to Avatar...');
    } else {
      setIsOpen(false);
      if (isRecording) toggleRecording();
      didAvatarRef.current?.stop();
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      setIsRecording(false);
      recognitionRef.current.stop();
      setAgentStatus('Ready');
    } else {
      setIsRecording(true);
      setAgentStatus('Listening to you...');
      try {
        recognitionRef.current.start();
      } catch (e) {}
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    setAgentStatus('Thinking...');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, threadId }),
      });

      if (!response.ok) throw new Error('API Error');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let currentAssistantMessage = '';
      let buffer = '';

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex;
          
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            
            if (line && !line.startsWith('data: [DONE]')) {
              let payloadString = line.startsWith('data: ') ? line.slice(6) : line;
              try {
                const parsed = JSON.parse(payloadString);
                const eventType = parsed.event || parsed.object;
                const data = parsed.data || parsed;

                if (eventType === 'thread.info' && data.thread_id) {
                  setThreadId(data.thread_id);
                }

                if ((eventType === 'thread.message.delta' || data.object === 'thread.message.delta') && data.delta?.content?.[0]?.text) {
                  const textDelta = data.delta.content[0].text.value;
                  currentAssistantMessage += textDelta;
                }
              } catch (e) {}
            }
          }
        }
      }

      // Stream is done, send full message to Avatar to speak
      if (currentAssistantMessage) {
        setAgentStatus('Stella is speaking...');
        // Only speak, do not display in UI!
        await didAvatarRef.current?.speak(currentAssistantMessage);
        setAgentStatus('Ready');
      }

    } catch (error) {
      console.error(error);
      setAgentStatus('Error connecting to backend');
    }
  };

  return (
    <div className="fixed bottom-6 right-2 z-50 flex flex-col items-end font-sans">
      
      {/* Maximized Chatbot Overlay */}
      <div 
        className={`mb-4 overflow-hidden flex flex-col bg-[#0f111a] border border-zinc-800 rounded-2xl shadow-2xl transition-all duration-300 origin-bottom-right ${
          isOpen ? 'w-[380px] h-[600px] opacity-100 scale-100' : 'w-0 h-0 opacity-0 scale-0'
        }`}
      >
        {/* Header with Exit Button */}
        <div className="relative p-4 border-b border-zinc-800/50 flex items-center justify-between shrink-0 bg-zinc-900/30">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#008b8b] animate-pulse" />
            <span className="text-xs font-semibold text-zinc-300">Live Voice Agent</span>
          </div>
          <button 
            onClick={toggleWidget}
            className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
          
        {/* Avatar View (No Chat History!) */}
        <div className="flex-1 relative bg-black flex flex-col items-center">
            
            <div className="absolute inset-0 z-0">
               {/* Pass a handler if you want to update status from DIDAvatar */}
               <DIDAvatar ref={didAvatarRef} onStatusChange={(s) => setAgentStatus(s)} />
            </div>

            {/* Status Overlay */}
            <div className="absolute top-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full z-10 border border-white/10">
                <p className={`text-xs font-semibold tracking-wide text-white`}>
                    {agentStatus}
                </p>
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-6 z-10 flex gap-4">
                <button
                    onClick={toggleRecording}
                    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isRecording 
                        ? 'bg-red-500/90 hover:bg-red-500 scale-110 shadow-[0_0_30px_rgba(239,68,68,0.4)]' 
                        : 'bg-zinc-800/80 hover:bg-zinc-700 backdrop-blur-md border border-zinc-600/50 text-white'
                    }`}
                >
                    {isRecording ? <MicOff size={24} className="text-white animate-pulse" /> : <Mic size={24} />}
                </button>
            </div>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-zinc-900/40 border-t border-zinc-800/80 text-center shrink-0">
          <span className="text-[9px] text-zinc-500 font-medium tracking-wider uppercase">
            Powered by OpenAI & D-ID {threadId && `| Thread: ${threadId}`}
          </span>
        </div>
      </div>

      {/* Minimized Floating Button */}
      <div 
        className={`relative flex items-center transition-all duration-300 ${isOpen ? 'opacity-0 pointer-events-none scale-0' : 'opacity-100 scale-100'}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className={`absolute right-full mr-4 w-64 bg-white rounded-2xl p-4 shadow-2xl border border-zinc-200 transition-all duration-300 origin-right ${
          isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
        }`}>
          <div className="absolute top-1/2 -right-2 -translate-y-1/2 w-4 h-4 bg-white border-r border-t border-zinc-200 rotate-45" />
          <button onClick={() => setIsHovered(false)} className="absolute top-2 right-2 text-zinc-400 hover:text-zinc-600">
            <X size={12} />
          </button>
          <p className="text-zinc-800 text-sm leading-relaxed relative z-10">
            👋 Hi, I'm your <strong className="text-[#008b8b]">Stella Virtual Assistant</strong>. 
            Click to start a fully live, hands-free conversation with me now!
          </p>
        </div>

        <button 
          onClick={toggleWidget}
          className="w-16 h-16 rounded-full bg-[#008b8b] p-1 shadow-[0_10px_40px_rgba(0,139,139,0.4)] hover:scale-110 hover:shadow-[0_10px_50px_rgba(0,139,139,0.6)] transition-all duration-300 flex items-center justify-center group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('/stella.png')] bg-cover bg-center opacity-80 group-hover:opacity-100 transition-opacity rounded-full mix-blend-overlay" />
          <MessageCircle size={28} className="text-white relative z-10 group-hover:scale-110 transition-transform" />
        </button>
      </div>

    </div>
  );
}
