echo "Kill all the running PM2 actions"
sudo pm2 kill

echo "Jump to app folder"
cd ~/BossTalk

echo "Update app from Git"
git pull

echo "Install app dependencies"
sudo rm -rf node_modules package-lock.json
sudo npm install

echo "Run BossTalk with pm2. SSH in and monitor with `pm2 log`"
sudo pm2 start ./index.js