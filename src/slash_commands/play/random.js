//Creates a sound card which displays a random sound with reroll options.
const { playFile, getFilePathFromFileName } = require("../../utility");
const RandomMessagePayload = require("../../message_payloads/RandomMessagePayload.js");
const JoinChannelMessagePayload = require('../../message_payloads/JoinChannelMessagePayload');
const { getVoiceConnection, VoiceConnectionStatus } = require('@discordjs/voice');

module.exports = {
    data: {name: "random"},
	async execute(interaction) {
        const sound = playRandomSound(interaction);
        return await interaction.reply(new RandomMessagePayload(interaction, sound));
    },
    async button(interaction){
        const creatureName = interaction.message.embeds[0].fields.find(f => f.name == "Name").value;
        const soundFile = interaction.message.embeds[0].fields.find(f => f.name == "Sound").value;
        let voiceConnection = null;
        switch (JSON.parse(interaction.customId).button){
            case "reroll":
                const sound = playRandomSound(interaction);
                return await interaction.update(new RandomMessagePayload(interaction, sound));
            case "play":
                voiceConnection = getVoiceConnection(interaction.guildId)
                if(!voiceConnection || voiceConnection.state?.status === VoiceConnectionStatus.Disconnected){
                    return await interaction.reply(new JoinChannelMessagePayload(interaction));
                }
                else{
                    playFile(interaction, getFilePathFromFileName(creatureName, soundFile))
                    return await interaction.deferUpdate();
                }
            case "creature":
                return await interaction.reply(`/play creature named ${creatureName}`);
        }
    }
}

function playRandomSound(interaction){
    const sounds = interaction.client.bosstalk.sounds;
    const index = Math.floor(Math.random() * sounds.length)
    const sound = sounds[index];
    playFile(interaction, sound.filePath);
    return sound;
}