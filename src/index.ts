import { Client, Message, MessageEmbed, TextChannel, WebhookClient, Util, Collection } from "discord.js";
import { config } from "dotenv";
import { join } from "path";

config({ 
    path: join(__dirname, "..", ".env") 
});

const botConfig: botConfigType = {
    TOKEN: process.env.DISCORD_TOKEN!,
    DEST_WEBHOOK_TOKEN: process.env.DEST_WEBHOOK_TOKEN!,
    DEST_WEBHOOK_ID: process.env.DEST_WEBHOOK_ID!,
    LOG_CHANNEL: process.env.LOG_CHANNEL!,
    GUILD_ID: process.env.GUILD_ID!,
    PREFIX: process.env.PREFIX ?? "-"
};

const logo = "https://images.squarespace-cdn.com/content/v1/56187011e4b07ac6acec2e0f/1611239681794-6AWJ14QLBJ57Y7F2WZCA/ke17ZwdGBToddI8pDm48kLWJgaDeSIVQBD3-y6Q5vUx7gQa3H78H3Y0txjaiv_0fDoOvxcdMmMKkDsyUqMSsMWxHk725yiiHCCLfrh8O1z5QPOohDIaIeljMHgDF5CVlOqpeNLcJ80NK65_fV7S1URux9p4byymcKZfjDnRE95kZZCx7kufJulGp5iTTRj7hbSexTd1-frD7527z4SM9QQ/27+Ventures.png";
const context = {
    currentlyExecutingCommand: new Set<string>(),
    alreadyAgreed: new Set<string>()
}

const client = new Client({
    "messageCacheLifetime": 60,
    "messageCacheMaxSize": 1,
    "messageEditHistoryMaxSize": 1,
    "messageSweepInterval": 3.6e+6,
    "disableMentions": "everyone",
    "ws": {
        "intents": ["DIRECT_MESSAGES", "GUILDS", "GUILD_MESSAGES", "GUILD_WEBHOOKS"]
    }
});

const dest = new WebhookClient(botConfig.DEST_WEBHOOK_ID, botConfig.DEST_WEBHOOK_TOKEN);

client.on("ready", () => {
    if(!client.guilds.cache.has(botConfig.GUILD_ID)) throw new Error("Bot is not in this guild!");
    if(!client.guilds.cache.get(botConfig.GUILD_ID)?.channels.cache.has(botConfig.LOG_CHANNEL)) throw new Error("Guild does not have this log channel!");
    console.log(`Logged in as ${client.user!.tag}`);
});

client.on("message", async (msg: Message) => {
    if(msg.channel.type !== "dm" || msg.author.bot || !msg.content.startsWith(botConfig.prefix)) return;

	const [commandName, ...args] = msg.content.slice(botConfig.prefix.length).trim().split(/ +/);

    switch(commandName) {
        case "anon": case "anonymous": {
            if(context.currentlyExecutingCommand.has(msg.author.id)) return msg.channel.send("Please finish the command you are already doing first!");
            if(!args.length) return msg.channel.send(`Please add a message after \`${botConfig.prefix}anonymous\``)
            
            const content = args.join(" ");
            const log = getLogChannel();
            if(!log || !dest) return;

            context.currentlyExecutingCommand.add(msg.author.id);
            if(!context.alreadyAgreed.has(msg.author.id) && !await promptYesOrNo(`**Please do not abuse or use this system for inappropriate or dangerous reasons. Your username is logged only for moderation purposes and is not revealed to anyone besides the staff. Please indicate whether you agree to these terms by saying either YES or NO**.`, { message: msg })) {
                return context.currentlyExecutingCommand.delete(msg.author.id);
            }

            context.alreadyAgreed.add(msg.author.id);

            await log.send(`New Anonymous post`, new MessageEmbed().addFields([
                {
                    "name": "Author (sensitive info)",
                    "value": msg.author,
                    inline: true
                },
                {
                    "name": "Content",
                    "value": `\`\`\`${Util.escapeMarkdown(content)}\`\`\``,
                    inline: false
                }
            ]));

            try {
                await dest.send(`**New Anonymous post:** \`${Util.escapeMarkdown(content)}\``, { "avatarURL": logo, "username": "27 Ventures Anonymous Posts" });    
            } catch(e) {
                console.log(e);
                return msg.reply("Sorry, but an error occurred!");
            } finally {
                context.currentlyExecutingCommand.delete(msg.author.id);
            }
            return msg.channel.send(`Successfully sent your message!`);
        }
    }
});

function getLogChannel() {
    return client.guilds.cache.get(botConfig.GUILD_ID)?.channels.cache.get(botConfig.LOG_CHANNEL) as TextChannel | undefined;
}

interface botConfigType extends Record<string, any> {
    TOKEN: string, 
    DEST_WEBHOOK_TOKEN: string,
    DEST_WEBHOOK_ID: string, 
    LOG_CHANNEL: string,
    GUILD_ID: string,
    PREFIX: string
}

async function promptYesOrNo (
    question: string | typeof MessageEmbed,
    { message }: { message: Message }) {
    await message.channel.send(question instanceof MessageEmbed ? question : `${question}`);

    const responses = await message.channel.awaitMessages((msg: Message) => msg.author.id === message.author.id, {
        max: 1,
        time: 60000,
    });

    if (responses.size !== 1) {
        void message.channel.send("You ran out of time to respond! Please try again.");
        return false;
    }
    const response = responses.first();

    if (!/^y(?:e(?:a|s)?)?$/i.test(response?.content ?? "")) {
        void message.channel.send("Cancelled command.");
        return false;
    }

    return true;
};

;(() => {
    for(const prop in botConfig) {
        if(!botConfig[prop]) throw new Error(`Missing env var for ${prop}`)
    }
    void client.login(process.env.DISCORD_TOKEN);
})();