from huggingsound import SpeechRecognitionModel
from librosa import load

#waveform, sr = load("sounds\\creature\\abedneum\\hs_abedneum_activation.ogg", sr=16000)




model = SpeechRecognitionModel("jonatasgrosman/wav2vec2-large-xlsr-53-english")
audio_paths = ["sounds\\creature\\abedneum\\hs_abedneum_activation.ogg",
               "sounds\\creature\\abedneum\\hs_abedneum_eventend01.ogg",
               "sounds\\creature\\abedneum\\hs_abedneum_eventend02.ogg",
               "sounds\\creature\\abedneum\\hs_abedneum_eventstart.ogg",
               "sounds\\creature\\abedneum\\hs_abedneum_slay01.ogg",
               "sounds\\creature\\lichking\\ah_arthas_event01.ogg"
                ]
                

transcriptions = model.transcribe(audio_paths)

for t in transcriptions:
    print(t.get("transcription"))
    print()
