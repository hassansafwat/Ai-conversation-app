export interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface GeminiLiveConfig {
  onOpen: () => void;
  onClose: () => void;
  onTranscript: (sender: 'user' | 'model', text: string) => void;
  onError: (error: Error) => void;
  onVolumeChange: (volume: number) => void;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}
