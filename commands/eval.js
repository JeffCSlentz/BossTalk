module.exports = {
    name: 'eval',
    description: 'This is not for you!',
    guildOnly: false,
    authorOnly: true,
    execute(message, args) {
      console.log(args.join(" "));
      console.log(message.client.browniePoints)
    }
};
