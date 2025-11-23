import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { GeminiLiveConfig } from '../types';
import { createPcmBlob, decode, decodeAudioData } from '../utils/audioUtils';

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private config: GeminiLiveConfig;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputNode: GainNode | null = null;
  private outputNode: GainNode | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private currentInputTranscription = '';
  private currentOutputTranscription = '';

  constructor(config: GeminiLiveConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  public async connect() {
    try {
      // 1. Get Microphone Access
      // We request a low sample rate if possible to match our needs, but use 'ideal' to avoid OverconstrainedError
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          autoGainControl: true,
          noiseSuppression: true,
          channelCount: 1,
          sampleRate: { ideal: 16000 }
        } 
      });

      // 2. Initialize Audio Contexts
      // 'interactive' latencyHint tells the browser to prioritize low latency processing
      const audioContextOptions: AudioContextOptions = { sampleRate: 16000, latencyHint: 'interactive' };
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)(audioContextOptions);
      
      // Ensure context is running (browsers sometimes start them suspended)
      if (this.inputAudioContext.state === 'suspended') {
        await this.inputAudioContext.resume();
      }

      const outputContextOptions: AudioContextOptions = { sampleRate: 24000, latencyHint: 'interactive' };
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)(outputContextOptions);
      
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }

      this.inputNode = this.inputAudioContext.createGain();
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // 3. Connect to Gemini Live
      this.sessionPromise = this.ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
          onopen: () => {
            this.handleOnOpen();
            this.config.onOpen();
          },
          onmessage: this.handleOnMessage.bind(this),
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            let errorMessage = "Connection error occurred.";
            if (e instanceof Error) {
                errorMessage = e.message;
            } else if ((e as any)?.message) {
                errorMessage = (e as any).message;
            }
            this.config.onError(new Error(errorMessage));
          },
          onclose: (e) => {
            console.log("Gemini Live Closed", e);
            this.config.onClose();
          },
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are Lingo, a quick and friendly English language tutor. 
          Your goal is to help the user improve their English fluency through natural conversation.
          
          Guidelines:
          1. Engage the user in a casual conversation.
          2. Listen carefully to their grammar and vocabulary.
          3. If the user makes a mistake, gently correct them briefly.
          4. Keep your responses VERY concise (under 20 words) to ensure a fast-paced conversation.
          5. Be encouraging.
          `,
        },
      });

      // Wait for the session to actually start to catch immediate network errors
      await this.sessionPromise;

    } catch (error) {
      console.error("Failed to connect", error);
      this.disconnect(); // Cleanup any partial resources
      this.config.onError(error instanceof Error ? error : new Error("Failed to start session"));
    }
  }

  private handleOnOpen() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    const source = this.inputAudioContext.createMediaStreamSource(this.stream);
    
    // Increased buffer size to 2048 (approx 128ms) for better connection stability
    // while maintaining reasonable latency.
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);
    
    this.scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
      const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
      
      // Simple volume calculation for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.config.onVolumeChange(rms * 100); 

      const pcmBlob = createPcmBlob(inputData);
      
      this.sessionPromise?.then((session) => {
        try {
            session.sendRealtimeInput({ media: pcmBlob });
        } catch (e) {
            console.error("Error sending input", e);
        }
      });
    };

    source.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private async handleOnMessage(message: LiveServerMessage) {
    // Handle Transcriptions
    if (message.serverContent?.outputTranscription) {
      this.currentOutputTranscription += message.serverContent.outputTranscription.text;
    } else if (message.serverContent?.inputTranscription) {
      this.currentInputTranscription += message.serverContent.inputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      if (this.currentInputTranscription.trim()) {
        this.config.onTranscript('user', this.currentInputTranscription);
      }
      if (this.currentOutputTranscription.trim()) {
        this.config.onTranscript('model', this.currentOutputTranscription);
      }
      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
    }

    // Handle Audio Output
    const base64EncodedAudioString = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64EncodedAudioString && this.outputAudioContext && this.outputNode) {
      // Ensure smooth playback by tracking strict time
      this.nextStartTime = Math.max(
        this.nextStartTime,
        this.outputAudioContext.currentTime
      );

      const audioBuffer = await decodeAudioData(
        decode(base64EncodedAudioString),
        this.outputAudioContext,
        24000,
        1
      );

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode);
      
      source.addEventListener('ended', () => {
        this.sources.delete(source);
      });

      source.start(this.nextStartTime);
      this.nextStartTime = this.nextStartTime + audioBuffer.duration;
      this.sources.add(source);
    }

    // Handle Interruption
    const interrupted = message.serverContent?.interrupted;
    if (interrupted) {
      console.log("Model interrupted");
      for (const source of this.sources.values()) {
        source.stop();
        this.sources.delete(source);
      }
      this.nextStartTime = 0;
      this.currentOutputTranscription = '';
    }
  }

  public async disconnect() {
    // Stop all sources
    for (const source of this.sources.values()) {
        try { source.stop(); } catch (e) {}
    }
    this.sources.clear();

    // Close input stream
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    // Disconnect script processor
    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    // Close contexts
    if (this.inputAudioContext) {
      try { await this.inputAudioContext.close(); } catch (e) {}
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      try { await this.outputAudioContext.close(); } catch (e) {}
      this.outputAudioContext = null;
    }

    // Attempt to clear session
    this.sessionPromise = null;
    this.config.onClose();
  }
}