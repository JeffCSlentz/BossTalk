import fs from 'fs';
import { TranscriptResult, TranscriptionService } from './TranscriptionService';

export class OpenAIWhisperService implements TranscriptionService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async transcribe(audioPath: string): Promise<TranscriptResult> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { default: OpenAI } = await (eval('import("openai")') as Promise<any>);
    const client = new OpenAI({ apiKey: this.apiKey });

    const response = await client.audio.transcriptions.create({
      file: fs.createReadStream(audioPath),
      model: 'whisper-1',
      response_format: 'verbose_json',
    });

    return {
      text: response.text ?? '',
      confidence: 1,
    };
  }
}
