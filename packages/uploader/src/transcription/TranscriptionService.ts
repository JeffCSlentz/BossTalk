export interface TranscriptResult {
  text: string;
  confidence: number;
}

export interface TranscriptionService {
  transcribe(audioPath: string): Promise<TranscriptResult>;
  isAvailable(): Promise<boolean>;
  // Release any held resources (e.g. a persistent worker process) at the end
  // of a sync run. Optional — most implementations have nothing to clean up.
  close?(): void;
}
