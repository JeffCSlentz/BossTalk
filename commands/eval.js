module.exports = {
    name: 'eval',
    description: 'This is not for you!',
    guildOnly: false,
    execute(message, args) {
      console.log(args.join(" "));
      console.log(message.client.guildTags.get("248890462746836993"))
    },
};
