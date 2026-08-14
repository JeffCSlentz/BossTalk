#!/usr/bin/env python3
"""
Transcribes audio using faster-whisper (large-v3, CUDA).
Usage: python whisper_transcribe.py <audio_path>   — one-shot, for manual testing
       python whisper_transcribe.py --check         — exit 0 if faster-whisper importable
       python whisper_transcribe.py --worker         — long-lived: loads the model once,
                                                        then reads one audio path per line
                                                        from stdin and writes one JSON
                                                        result per line to stdout. Used by
                                                        LocalWhisperService so the ~3GB
                                                        model is loaded into VRAM a single
                                                        time per sync run instead of once
                                                        per file.
Output: JSON {"text": "...", "confidence": 0.95}
"""
import os
import sys
import json

# On Windows, ctranslate2 (used by faster-whisper) loads cuBLAS/cuDNN as native
# DLLs. The pip-installed nvidia-cublas-cu12/nvidia-cudnn-cu12 packages put those
# DLLs under site-packages, which isn't on the default DLL search path, so they
# must be added explicitly before faster_whisper is imported.
if os.name == 'nt':
    for _pkg, _subdir in (('nvidia.cublas', 'bin'), ('nvidia.cudnn', 'bin')):
        try:
            _mod = __import__(_pkg, fromlist=['_'])
            for _path in _mod.__path__:
                _dll_dir = os.path.join(_path, _subdir)
                if os.path.isdir(_dll_dir):
                    os.add_dll_directory(_dll_dir)
        except ImportError:
            pass

def check_available():
    try:
        from faster_whisper import WhisperModel
        return True
    except ImportError:
        return False

def transcribe_with_model(model, audio_path: str) -> dict:
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

def transcribe(audio_path: str) -> dict:
    from faster_whisper import WhisperModel

    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    return transcribe_with_model(model, audio_path)

def run_worker():
    from faster_whisper import WhisperModel

    model = WhisperModel("large-v3", device="cuda", compute_type="float16")
    print(json.dumps({"ready": True}), flush=True)

    for line in sys.stdin:
        audio_path = line.strip()
        if not audio_path:
            continue
        try:
            result = transcribe_with_model(model, audio_path)
            print(json.dumps(result), flush=True)
        except Exception as e:
            print(json.dumps({"error": str(e)}), flush=True)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No audio path provided"}))
        sys.exit(1)

    if sys.argv[1] == "--check":
        sys.exit(0 if check_available() else 1)

    if sys.argv[1] == "--worker":
        run_worker()
        sys.exit(0)

    result = transcribe(sys.argv[1])
    print(json.dumps(result))
