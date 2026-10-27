const { Client, GatewayIntentBits } = require('discord.js');
const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');
const express = require('express');

// Express server setup
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(7860, () => console.log('[WEB] Web server active on port 7860'));

// Verbose check for environment variables
console.log('[DEBUG] Checking environment variables...');
console.log(`[DEBUG] DISCORD_TOKEN is ${process.env.DISCORD_TOKEN ? 'Present (masked)' : 'MISSING'}`);
console.log(`[DEBUG] GUILD_ID: ${process.env.GUILD_ID || 'MISSING'}`);
console.log(`[DEBUG] CHANNEL_ID: ${process.env.CHANNEL_ID || 'MISSING'}`);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates
    ]
});

// Verbose Discord.js internal debugging events
client.on('debug', (info) => console.log(`[DEBUG/Discord.js] ${info}`));
client.on('warn', (warning) => console.warn(`[WARN/Discord.js] ${warning}`));
client.on('error', (error) => console.error(`[ERROR/Discord.js]`, error));

const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;

client.once('ready', async () => {
    console.log(`[DEBUG] Bot is ready! Logged in as ${client.user.tag} (ID: ${client.user.id})`);

    try {
        console.log(`[DEBUG] Attempting to fetch guild with ID: ${GUILD_ID}`);
        const guild = await client.guilds.fetch(GUILD_ID);
        console.log(`[DEBUG] Successfully fetched guild: ${guild.name}`);

        console.log(`[DEBUG] Attempting to fetch voice channel with ID: ${CHANNEL_ID}`);
        const channel = await guild.channels.fetch(CHANNEL_ID);
        
        if (!channel) {
            throw new Error(`Channel with ID ${CHANNEL_ID} could not be found or fetched.`);
        }
        
        if (!channel.isVoiceBased()) {
            throw new Error(`Channel ${channel.name} (${channel.id}) is not a voice-based channel!`);
        }

        console.log(`[DEBUG] Successfully fetched voice channel: ${channel.name}. Initializing voice connection...`);
        
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true,
            selfMute: true
        });

        // Verbose voice connection debugging
        connection.on('stateChange', (oldState, newState) => {
            console.log(`[DEBUG/Voice] Connection state changed from ${oldState.status} to ${newState.status}`);
        });

        connection.on(VoiceConnectionStatus.Connecting, () => {
            console.log('[DEBUG/Voice] Connecting to the voice channel...');
        });

        connection.on(VoiceConnectionStatus.Ready, () => {
            console.log(`[SUCCESS/Voice] Successfully connected and ready in voice channel: ${channel.name}`);
        });

        connection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            console.warn('[WARN/Voice] Disconnected from voice channel. Attempting to reconnect...');
            try {
                await entersState(connection, VoiceConnectionStatus.Signalling, 5_000);
                console.log('[DEBUG/Voice] Reconnecting / Signalling...');
            } catch (error) {
                console.error('[ERROR/Voice] Failed to reconnect, destroying connection.', error);
                connection.destroy();
            }
        });

    } catch (error) {
        console.error("[ERROR] Failed during guild/channel fetch or voice connection setup:", error);
    }
});

console.log('[DEBUG] Attempting to log in to Discord...');
client.login(process.env.DISCORD_TOKEN);
