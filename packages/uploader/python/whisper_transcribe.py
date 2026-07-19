#!/usr/bin/env python3
"""
Transcribes a single audio file using faster-whisper (large-v3, CUDA).
Usage: python whisper_transcribe.py <audio_path>
       python whisper_transcribe.py --check
Output: JSON {"text": "...", "confidence": 0.95}
"""
import sys
import json

def check_available():
    try:
        from faster_whisper import WhisperModel
        return True
    except ImportError:
        return False

def transcribe(audio_path: str) -> dict:
    from faster_whisper import WhisperModel

    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    segments, info = model.transcribe(audio_path, beam_size=5, language="en")

    text_parts = []
    confidences = []
    for segment in segments:
        text_parts.append(segment.text.strip())
        # avg_logprob is log probability; convert to rough confidence
        confidences.append(min(1.0, max(0.0, (segment.avg_logprob + 1.0))))

    text = " ".join(text_parts).strip()
    confidence = sum(confidences) / len(confidences) if confidences else 0.0

    return {"text": text, "confidence": round(confidence, 3)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio path provided"}))
        sys.exit(1)

    if sys.argv[1] == "--check":
        sys.exit(0 if check_available() else 1)

    result = transcribe(sys.argv[1])
    print(json.dumps(result))
