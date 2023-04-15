echo "Stopping BossTalk"
sudo pm2 stop index

echo "Jumping to BossTalk folder"
cd ~/BossTalk

echo "Updating BossTalk from Git"
git pull

echo "Installing BossTalk dependencies"
sudo rm -rf node_modules package-lock.json
sudo npm install

echo "Running BossTalk with pm2. SSH in and monitor with `pm2 log`"
pm2 start ./index.js