import { TranscriptResult, TranscriptionService } from './TranscriptionService';

export class AssemblyAIService implements TranscriptionService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async transcribe(audioPath: string): Promise<TranscriptResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { AssemblyAI } = await (eval('import("assemblyai")') as Promise<any>);
    const client = new AssemblyAI({ apiKey: this.apiKey });

    const transcript = await client.transcripts.transcribeFile(audioPath, {
      language_detection: true,
    });

    if (transcript.status === 'error') {
      throw new Error(`AssemblyAI error: ${transcript.error}`);
    }

    return {
      text: transcript.text ?? '',
      confidence: transcript.confidence ?? 1,
    };
  }
}
