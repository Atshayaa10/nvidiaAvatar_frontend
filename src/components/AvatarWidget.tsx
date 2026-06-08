'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, User, Bot, Ticket, Mic, Paperclip, LogOut, Video } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useTicketStore } from '../store/ticketStore';
import { useAuthStore } from '../store/authStore';
import dynamic from 'next/dynamic';
import DIDAvatar, { DIDAvatarRef } from './DIDAvatar';

// Dynamically import VRM Avatar to avoid Server-Side Rendering (SSR) issues with Three.js
const VRMAvatar = dynamic(() => import('./VRMAvatar'), { ssr: false });

export default function AvatarWidget() {
  const { messages, isOpen, setIsOpen, addMessage } = useChatStore();
  const { token, user, logout, fetchUser } = useAuthStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // References for voice recording and file attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Local Video Gen State
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState("Online & Ready");
  const [isGenerating, setIsGenerating] = useState(false);

  // Avatar Options State
  const [avatarMode, setAvatarMode] = useState<'video' | 'vrm' | 'vrm-instant' | 'did'>('did');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const didAvatarRef = useRef<DIDAvatarRef>(null);

  // Fetch logged-in user profile on mount/token change
  useEffect(() => {
    if (token && !user) {
      fetchUser();
    }
  }, [token, user, fetchUser]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up native speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Sync isSpeaking with videoUrl for standard audio playback in 'vrm' and 'video' modes
  useEffect(() => {
    if (videoUrl) {
      setIsSpeaking(true);
    } else {
      setIsSpeaking(false);
    }
  }, [videoUrl]);

  const speakTextLocal = async (text: string) => {
    try {
      setIsGenerating(true);
      setStreamStatus("Generating Video... (This takes a few seconds)");
      
      const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[Attached File:.*?\]/g, '');
      
      const res = await fetch("http://localhost:8000/api/generate-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText })
      });
      
      if (!res.ok) {
        throw new Error("Failed to generate video");
      }
      
      const data = await res.json();
      
      // video_url comes as relative path like /video_xyz.mp4. 
      // Next.js serves public folder at root, but since we are running a separate frontend/backend, 
      // the backend saved the file to frontend/public, so NextJS serves it directly!
      setVideoUrl(data.video_url);
      setStreamStatus("Playing Video");
      
    } catch (err) {
      console.error(err);
      setStreamStatus("Video Generation Error");
    } finally {
      setIsGenerating(false);
    }
  };

  const speakInstant = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn("Speech synthesis not supported in this browser.");
      return;
    }

    const cleanText = text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\[Attached File:.*?\]/g, '');

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Try to get a high-quality female English voice
    const voices = window.speechSynthesis.getVoices();
    const femaleVoice = voices.find(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('female') || 
       v.name.toLowerCase().includes('google us english') || 
       v.name.toLowerCase().includes('zira') || 
       v.name.toLowerCase().includes('microsoft') ||
       v.name.toLowerCase().includes('natural'))
    );
    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setStreamStatus("Speaking (Instant TTS)");
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setStreamStatus("Online & Ready");
    };

    utterance.onerror = (event) => {
      console.error("SpeechSynthesis error:", event);
      setIsSpeaking(false);
      setStreamStatus("Online & Ready");
    };

    window.speechSynthesis.speak(utterance);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const file = new File([audioBlob], 'voice.wav', { type: 'audio/wav' });
        const formData = new FormData();
        formData.append('file', file);

        setIsTyping(true);
        try {
          const res = await fetch('http://localhost:8000/api/voice', {
            method: 'POST',
            body: formData,
          });
          const data = await res.json();
          if (data.transcript) {
            setInputText(data.transcript);
          }
        } catch (err) {
          console.error("Transcription failed", err);
        } finally {
          setIsTyping(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied or error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFile(e.target.files[0]);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() && !attachedFile) return;

    let userText = inputText;
    const fileToSend = attachedFile;

    if (fileToSend) {
      userText += `\n\n[Attached File: ${fileToSend.name}]`;
    }

    const tempUserMessage = { id: 'temp', text: userText, sender: 'user', timestamp: Date.now() };

    addMessage({ text: userText, sender: 'user' });
    setInputText('');
    setAttachedFile(null);
    setIsTyping(true);
    
    // Stop any currently playing video/audio
    setVideoUrl(null);
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setStreamStatus("Online & Ready");

    const formData = new FormData();
    formData.append('query', userText);
    formData.append('transcript', JSON.stringify([...messages, tempUserMessage]));
    if (fileToSend) {
      formData.append('file', fileToSend);
    }

    const headers: any = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('http://localhost:8000/api/chat', {
      method: 'POST',
      headers: headers,
      body: formData
    })
    .then(res => res.json())
    .then(data => {
      setIsTyping(false);
      let responseText = data.response;
      
      if (data.type === 'ticket') {
        const ticket = data.ticket;
        responseText = `I have escalated your issue to the ${ticket.department} department. Your official Ticket ID is **${ticket.id}**. You can use this ID to track your status in the portal!`;
      } 
      
      addMessage({ text: responseText, sender: 'agent' });
      
      if (avatarMode === 'did') {
        didAvatarRef.current?.speak(responseText);
      } else if (avatarMode === 'vrm-instant') {
        speakInstant(responseText);
      } else {
        speakTextLocal(responseText);
      }
    })
    .catch(err => {
      setIsTyping(false);
      const errMsg = "I'm having trouble connecting to my servers right now.";
      addMessage({ text: errMsg, sender: 'agent' });
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 h-[680px] bg-[#0e0f16] rounded-2xl shadow-2xl flex flex-col border border-white/[0.08] overflow-hidden animate-slide-up" style={{ boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99, 102, 241, 0.08)' }}>
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex justify-between items-center text-white relative overflow-hidden shrink-0">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-white/30 ring-2 ring-white/10 ring-offset-2 ring-offset-indigo-600">
                <img src="/stella.png" alt="Stella" className="w-full h-full object-cover" />
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-tight flex items-center gap-2">
                  Agent Stella 
                  <span className={`w-2 h-2 rounded-full ${isGenerating ? 'bg-amber-400 animate-pulse' : streamStatus === 'Video Generation Error' ? 'bg-red-400' : 'bg-emerald-400'}`} title={streamStatus} />
                </h3>
                <p className="text-indigo-200 text-xs truncate max-w-[150px]">
                  {streamStatus}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 relative z-10">
              {user && (
                <button 
                  onClick={logout}
                  className="p-2 hover:bg-white/15 rounded-full transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              )}
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-white/15 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {!token || !user ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-[#0a0b0f]">
              <div className="w-20 h-20 mb-4 rounded-full overflow-hidden animate-bounce shadow-lg shadow-indigo-500/20 border-4 border-indigo-500/20 ring-4 ring-indigo-500/10">
                <img src="/stella.png" alt="Stella" className="w-full h-full object-cover" />
              </div>
              <h3 className="font-bold text-lg text-white mb-2">Hello, I am Stella</h3>
              <p className="text-sm text-zinc-500 mb-6 leading-relaxed">Please sign in or create an account to start talking with me and submit tickets.</p>
              <a 
                href="/login" 
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                Sign In / Register
              </a>
            </div>
          ) : (
            <>
              {/* Local AI Video Player / 3D Canvas Display */}
              <div className="h-64 shrink-0 border-b border-white/[0.08] relative bg-[#0e0f16] flex flex-col items-center justify-center overflow-hidden group">
                
                {avatarMode === 'video' ? (
                  videoUrl ? (
                    <video 
                      ref={videoRef}
                      key={videoUrl}
                      className="w-full h-full object-cover"
                      src={videoUrl}
                      autoPlay
                      playsInline
                      onEnded={() => {
                          setStreamStatus("Online & Ready");
                          setVideoUrl(null);
                      }}
                    />
                  ) : (
                    <img src="/stella.png" alt="Stella" className="w-full h-full object-cover opacity-80" />
                  )
                ) : avatarMode === 'did' ? (
                  <DIDAvatar ref={didAvatarRef} onStatusChange={(status) => setStreamStatus(status)} />
                ) : (
                  <VRMAvatar isSpeaking={isSpeaking} />
                )}

                {/* Hidden video player to process audio playback for 'vrm' mode */}
                {avatarMode === 'vrm' && videoUrl && (
                  <video 
                    key={`hidden-${videoUrl}`}
                    className="hidden"
                    src={videoUrl}
                    autoPlay
                    playsInline
                    onEnded={() => {
                        setStreamStatus("Online & Ready");
                        setVideoUrl(null);
                    }}
                  />
                )}
                
                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-20 bg-[#0e0f16]/90 backdrop-blur-sm">
                     <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                     <div className="text-center">
                        <p className="text-sm text-indigo-300 font-medium animate-pulse">GPU Generating Video...</p>
                        <p className="text-xs text-indigo-400/60 mt-1">This will take 5-15 seconds.</p>
                     </div>
                  </div>
                )}
                
                {streamStatus === 'Video Generation Error' && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center z-20 bg-[#0e0f16]">
                     <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 mb-3 border border-red-500/30">
                       <X size={24} />
                     </div>
                     <p className="text-sm text-red-400 font-medium mb-1">Video Generation Failed</p>
                     <p className="text-xs text-zinc-500">Check if Wav2Lip is installed via setup_ai.ps1</p>
                  </div>
                )}
                
              </div>

              {/* Avatar Mode Selector Dropdown Bar */}
              <div className="bg-[#12131a] px-4 py-2 border-b border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 shrink-0">
                <span className="font-semibold text-zinc-500">Avatar Mode:</span>
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => {
                      setAvatarMode('video');
                      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                      setVideoUrl(null);
                      setStreamStatus("Online & Ready");
                    }}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${avatarMode === 'video' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'hover:text-zinc-200'}`}
                  >
                    Wav2Lip Video
                  </button>
                  <button 
                    onClick={() => {
                      setAvatarMode('did');
                      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                      setVideoUrl(null);
                      setStreamStatus("Connecting D-ID...");
                    }}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${avatarMode === 'did' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'hover:text-zinc-200'}`}
                  >
                    D-ID V4
                  </button>
                  <button 
                    onClick={() => {
                      setAvatarMode('vrm');
                      if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
                      setVideoUrl(null);
                      setStreamStatus("Online & Ready");
                    }}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${avatarMode === 'vrm' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'hover:text-zinc-200'}`}
                  >
                    3D VRM
                  </button>
                  <button 
                    onClick={() => {
                      setAvatarMode('vrm-instant');
                      setVideoUrl(null);
                      setStreamStatus("Online & Ready");
                    }}
                    className={`px-2 py-0.5 rounded transition-all font-semibold ${avatarMode === 'vrm-instant' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'hover:text-zinc-200'}`}
                  >
                    3D Instant
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 bg-[#0a0b0f] flex flex-col gap-4">
                {messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'self-end flex-row-reverse' : 'self-start'}`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden ${msg.sender === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-indigo-500/15 ring-2 ring-indigo-500/20 ring-offset-1 ring-offset-[#0a0b0f]'}`}>
                      {msg.sender === 'user' ? <User size={16} /> : <img src="/stella.png" alt="Stella" className="w-full h-full object-cover" />}
                    </div>
                    <div className={`p-3 rounded-2xl text-sm whitespace-pre-line ${msg.sender === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white/[0.05] text-zinc-200 border border-white/[0.08] rounded-tl-none'}`}>
                      {msg.text.includes('**') ? (
                        <span dangerouslySetInnerHTML={{__html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-300">$1</strong>')}} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3 max-w-[85%] self-start items-center">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-indigo-500/20 ring-offset-1 ring-offset-[#0a0b0f]">
                      <img src="/stella.png" alt="Stella" className="w-full h-full object-cover" />
                    </div>
                    <div className="bg-white/[0.05] p-4 rounded-2xl rounded-tl-none border border-white/[0.08] flex gap-1">
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-4 bg-[#0e0f16] border-t border-white/[0.06] shrink-0">
                {attachedFile && (
                  <div className="mb-2 p-1.5 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 flex justify-between items-center animate-fade-in">
                    <span className="truncate max-w-[80%] flex items-center gap-1.5 font-medium">
                      <Paperclip size={12} /> {attachedFile.name}
                    </span>
                    <button 
                      onClick={() => setAttachedFile(null)}
                      className="hover:bg-indigo-500/20 p-0.5 rounded-full"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
                
                <form 
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                  className="flex gap-2 items-center bg-white/[0.04] rounded-full p-1 pl-4 border border-white/[0.08] focus-within:border-indigo-500/40 focus-within:ring-2 focus-within:ring-indigo-500/10 transition-all"
                >
                  <input 
                    type="text" 
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={isRecording ? "Listening..." : isGenerating ? "Generating voice..." : "Ask Stella a question..."}
                    disabled={isRecording || isGenerating || isTyping}
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-zinc-200 py-2 disabled:opacity-50 placeholder:text-zinc-600"
                  />
                  
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                  
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-zinc-600 hover:text-zinc-300 rounded-full transition-colors"
                    title="Attach file"
                  >
                    <Paperclip size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`p-2 rounded-full transition-all ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'text-zinc-600 hover:text-zinc-300'}`}
                    title={isRecording ? "Stop recording" : "Record voice"}
                  >
                    <Mic size={18} />
                  </button>

                  <button 
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile) || isTyping || isRecording || isGenerating}
                    className="bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-500/20"
                  >
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-indigo-500/30 overflow-hidden border-2 border-indigo-400/20 animate-pulse-glow"
      >
        {isOpen ? <X size={28} /> : <img src="/stella.png" alt="Stella" className="w-full h-full object-cover" />}
      </button>
    </div>
  );
}

