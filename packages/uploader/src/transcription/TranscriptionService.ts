export interface TranscriptResult {
  text: string;
  confidence: number;
}

export interface TranscriptionService {
  transcribe(audioPath: string): Promise<TranscriptResult>;
  isAvailable(): Promise<boolean>;
}
