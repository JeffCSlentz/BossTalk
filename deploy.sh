echo "Stopping BossTalk"
pm2 stop index

echo "Jumping to BossTalk folder"
cd ~/BossTalk

echo "Updating BossTalk from Git"
git pull

echo "Installing BossTalk dependencies"
npm install

echo "Updating Commands"
node ./src/deploy_commands.js

echo "Running BossTalk with pm2. SSH in and monitor with pm2 log"
pm2 start ./index.js
