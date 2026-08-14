import fs from 'fs';
import OpenAI from 'openai';
import { TranscriptResult, TranscriptionService } from './TranscriptionService';
import { convertToWav, cleanupConverted } from './audioConvert';

export class OpenAIWhisperService implements TranscriptionService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    return !!this.apiKey;
  }

  async transcribe(audioPath: string): Promise<TranscriptResult> {
    const client = new OpenAI({ apiKey: this.apiKey });
    const wavPath = await convertToWav(audioPath);

    try {
      const response = await client.audio.transcriptions.create({
        file: fs.createReadStream(wavPath),
        model: 'whisper-1',
        response_format: 'verbose_json',
      });

      return {
        text: response.text ?? '',
        confidence: 1,
      };
    } finally {
      cleanupConverted(wavPath);
    }
  }
}
