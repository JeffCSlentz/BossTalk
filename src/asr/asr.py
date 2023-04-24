from huggingsound import SpeechRecognitionModel
import os
import json

missingSound = []

# Define a function to process a batch of items
def process_batch(batch):
    file_paths_to_process = []
    
    for f in batch:
        if f['text'] != '':
            break
        if not os.path.isfile(f['filePath']):
            missingSound.append(f['filePath'])
            break
        file_paths_to_process.append(f['filePath'])
    #file_paths_to_process = [f['filePath'] for f in batch if f['text'] == '']
    
    if(len(file_paths_to_process) == 0):
        print('Skipping ' + creatureName(batch) + ' to ' + creatureName(batch,-1))
        return
    
    print('Beginning batch of', len(file_paths_to_process), 'sounds.') 
    transcriptions = model.transcribe(file_paths_to_process)
    for i, batched_sound in enumerate(batch):
        if len(transcriptions) == 0: break
        if batched_sound['filePath'] in file_paths_to_process:
            if(transcriptions[0].get('transcription') == ''):
                print(creatureName(batch,i) + ": " + "<no text>")
                batch[i]['hasSpeech'] = False
            else:
                print(creatureName(batch,i) + ": " + transcriptions[0].get('transcription'))
           
            batch[i]['text'] = transcriptions.pop(0).get('transcription')

    data[i:i+batch_size] = batch # Write batch back to data
    print('Batch Complete. Writing File.\n')
    with open('data/newSounds.json', 'w') as f:
        json.dump(data, f)
    with open('data/missingSound.json', 'w') as f:
        json.dump(missingSound, f)

    
model = SpeechRecognitionModel("jonatasgrosman/wav2vec2-large-xlsr-53-english")
with open('data/newSounds.json', 'r') as f:
    data = json.load(f)

def creatureName(batch, i=0):
    return batch[i]['filePath'].split('/')[-2] + '/' + batch[i]['filePath'].split('/')[-1]

# Iterate through the list in batches of 100
batch_size = 100
for i in range(0, len(data), batch_size):
    print("Batch: ", i)
    batch = data[i:i+batch_size]  # Get the current batch
    process_batch(batch)  # Process the batch in place
    