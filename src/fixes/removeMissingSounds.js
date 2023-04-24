const fs = require('fs');
const path = require('path');

const filePath = 'data/sounds.json';

// Load the JSON file
let data = fs.readFileSync(filePath, 'utf8');
let soundList = JSON.parse(data);

// Iterate through the list of sounds
for (let i = 0; i < soundList.length; i++) {
  if (!fs.existsSync(soundList[i].filePath)) {
    if(i%1000 == 0){
        console.log(i);
    }
    // Remove the sound from the list
    console.log('Removed: ' + soundList[i].filePath);
    soundList.splice(i, 1);
    i--; // Adjust the index since we removed an element
  }
}

// Save the modified list of sounds
let newData = JSON.stringify(soundList, null, 2);
fs.writeFileSync(filePath, newData, 'utf8');

console.log('Done');
