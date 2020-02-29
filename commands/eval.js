module.exports = {
    name: 'eval',
    description: 'This is not for you!',
    guildOnly: false,
    execute(message, args) {
      console.log(args.join(" "));
    },
};
