'use client';

import { useState, useEffect, useRef } from 'react';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import '@livekit/components-styles';

import A2FAvatar from '../../components/A2FAvatar';

export default function WebGLAvatarPortal() {
  const [token, setToken] = useState('');
  const [wsUrl, setWsUrl] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectToLiveKit = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:8000/api/livekit/token?room=stella-room&identity=User', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) throw new Error('Failed to fetch token');
      const data = await res.json();
      setToken(data.token);
      setWsUrl(data.ws_url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      {/* WebGL Avatar Container */}
      <div className="absolute inset-0 z-0 w-full h-full">
        <A2FAvatar />
      </div>

      {/* LiveKit Voice Overlay UI */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-12">
        {!token ? (
          <div className="bg-zinc-950/80 backdrop-blur-md p-8 rounded-2xl border border-zinc-800/50 pointer-events-auto shadow-2xl flex flex-col items-center">
            <h1 className="text-2xl font-bold mb-2 text-white">WebGL 3D Avatar</h1>
            <p className="text-zinc-400 mb-6 max-w-sm text-center text-sm">
              The 3D model is rendered directly in your browser. Connect your mic to talk.
            </p>
            <button 
              onClick={connectToLiveKit}
              disabled={isConnecting}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-medium transition-colors cursor-pointer w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect Microphone'}
            </button>
            {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
          </div>
        ) : (
          <LiveKitRoom
            token={token}
            serverUrl={wsUrl}
            connect={true}
            audio={true}
            video={false}
            className="pointer-events-auto flex flex-col items-center gap-3"
          >
            <RoomAudioRenderer />
            
            <VoiceAssistantControlBar />
            
            <div className="flex items-center gap-3 mt-2">
              <div className="text-emerald-400 font-medium text-xs flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Voice Connected
              </div>
              
              <button 
                onClick={() => setToken('')}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-full text-xs font-medium text-white transition-colors cursor-pointer shadow-lg"
              >
                Disconnect
              </button>
            </div>
          </LiveKitRoom>
        )}
      </div>
    </div>
  );
}
