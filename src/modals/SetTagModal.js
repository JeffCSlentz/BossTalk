const {Modal, TextInput} = require('discordjs-modal')

class SetTagModal extends Modal{
    constructor(command,subcommand, filePath){
        super();
        this.setCustomId(JSON.stringify({command:command, subcommand: subcommand}));
        this.setTitle("Tagging a Sound (●'◡'●)");
        this.addComponents(new TextInput()
            .setLabel(`Enter a tag for this sound`)
            .setStyle("SHORT")
            .setPlaceholder(`tag`)
            .setCustomId(filePath)
            .setRequired(true)
            .setMaxLength(24)
        );
    }
}

module.exports = SetTagModal;