import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionState, TranscriptItem } from './types';
import { GeminiLiveService } from './services/geminiLiveService';
import Visualizer from './components/Visualizer';
import TranscriptView from './components/TranscriptView';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const serviceRef = useRef<GeminiLiveService | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Handle session cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  const handleTranscript = useCallback((sender: 'user' | 'model', text: string) => {
    setTranscripts(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        sender,
        text,
        timestamp: new Date(),
      }
    ]);
  }, []);

  const toggleConnection = async () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      setConnectionState(ConnectionState.DISCONNECTED);
      if (serviceRef.current) {
        await serviceRef.current.disconnect();
        serviceRef.current = null;
      }
      setVolume(0);
    } else {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);
      setTranscripts([]); // Clear previous conversation
      
      const service = new GeminiLiveService({
        onOpen: () => {
          setConnectionState(ConnectionState.CONNECTED);
        },
        onClose: () => {
          setConnectionState(ConnectionState.DISCONNECTED);
          serviceRef.current = null;
        },
        onError: (err) => {
          console.error(err);
          setConnectionState(ConnectionState.ERROR);
          setErrorMsg(err.message || "An error occurred");
          serviceRef.current = null;
        },
        onTranscript: handleTranscript,
        onVolumeChange: (vol) => {
          setVolume(vol);
        }
      });

      serviceRef.current = service;
      // Connect handles permissions internally
      await service.connect();
    }
  };

  const visualizerState = connectionState === ConnectionState.CONNECTED ? 'listening' : 'idle';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 md:p-6">
      <div className="w-full max-w-5xl h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row ring-1 ring-gray-100">
        
        {/* Left Panel: Interactive Avatar & Controls */}
        <div className="md:w-5/12 bg-gradient-to-br from-slate-50 to-white border-r border-gray-100 flex flex-col relative p-6 md:p-8">
          
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600 text-white mb-3 shadow-lg shadow-blue-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">LingoLoop</h1>
            <p className="text-sm text-gray-500 mt-1">AI English Tutor</p>
          </div>

          {/* Main Visualizer Area */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <Visualizer 
              volume={volume} 
              isActive={connectionState === ConnectionState.CONNECTED}
              state={visualizerState}
            />
            
            {errorMsg && (
              <div className="mt-4 p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100 w-full max-w-xs text-center shadow-sm">
                <p className="font-semibold mb-1">Connection Failed</p>
                <p className="mb-2 break-words">{errorMsg}</p>
                {(errorMsg.toLowerCase().includes("permission") || errorMsg.toLowerCase().includes("denied")) ? (
                   <div className="bg-white p-2 rounded-lg border border-red-100 mt-2">
                     <p className="text-xs text-gray-600 font-medium">Microphone access denied.</p>
                     <p className="text-xs text-gray-500 mt-1">Please click the lock icon in your browser address bar and switch Microphone to "Allow".</p>
                   </div>
                ) : (
                    <div className="bg-white p-2 rounded-lg border border-red-100 mt-2">
                     <p className="text-xs text-gray-500 mt-1">Check your network connection. If using a corporate VPN or AdBlocker, try disabling it.</p>
                   </div>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="mt-8 flex flex-col items-center">
             <button
              onClick={toggleConnection}
              disabled={connectionState === ConnectionState.CONNECTING}
              className={`
                relative w-full max-w-[240px] py-4 px-6 rounded-2xl font-semibold shadow-xl transition-all duration-200 flex items-center justify-center gap-3
                ${connectionState === ConnectionState.CONNECTED 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 shadow-red-100' 
                  : 'bg-gray-900 text-white hover:bg-gray-800 shadow-gray-200 hover:shadow-gray-300'
                }
                ${connectionState === ConnectionState.CONNECTING ? 'opacity-80 cursor-wait' : ''}
              `}
            >
              {connectionState === ConnectionState.CONNECTING ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white/50" />
                  <span>Connecting...</span>
                </>
              ) : connectionState === ConnectionState.CONNECTED ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>End Lesson</span>
                </>
              ) : (
                <>
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>Start Lesson</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-400 mt-4 text-center px-4">
              {connectionState === ConnectionState.CONNECTED 
                ? "Speak naturally. Lingo will gently correct you." 
                : "Interactive conversation practice to boost your confidence."}
            </p>
          </div>
        </div>

        {/* Right Panel: Transcript */}
        <div className="flex-1 bg-white flex flex-col h-[50vh] md:h-auto">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Conversation Log</h2>
            <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connectionState === ConnectionState.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                <span className="text-xs text-gray-400">
                    {connectionState === ConnectionState.CONNECTED ? 'Live' : 'Offline'}
                </span>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative">
             <TranscriptView items={transcripts} />
             {/* Fade effect at top */}
             <div className="absolute top-0 left-0 right-0 h-6 bg-gradient-to-b from-white to-transparent pointer-events-none" />
          </div>
        </div>

      </div>
    </div>
  );
}