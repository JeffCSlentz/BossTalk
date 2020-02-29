const {token} = require('../config.json');
module.exports = {
    name: 'restart',
    description: 'Restart the bot.',
    execute(message, args) {
      // send channel a message that you're resetting bot [optional]
    message.channel.send('Restarting...')
    .then(msg => message.client.destroy())
    .then(() => message.client.login(token))
    .then(() => message.channel.send(`Ready!`));
    },
};
