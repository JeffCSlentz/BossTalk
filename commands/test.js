module.exports = {
    name: 'test',
    description: 'Testing commands baka!',
    execute(message, args) {
      message.channel.send('test acknowledged.');
      let fileName = "sounds/test/test31.ogg";

      console.log(`Played ${fileName} after ${Date.now() - message.client.tempTime} ms.`);
      const connection = message.client.voiceConnections.get(message.guild.id);
      console.log(`Paused Time: ${connection.player.streamingData.pausedTime}`);


      const dispatcher = connection.playFile(fileName);
      dispatcher.setVolume(message.client.volume); // Set the volume to client.volume
      dispatcher.on(`start`, () => {
         connection.player.streamingData.pausedTime = 0;
      });
      console.log(`Played sound ${fileName}`);
    },
};
