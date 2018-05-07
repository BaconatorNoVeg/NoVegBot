# NoVegBot
![](https://img.shields.io/badge/Language-Javascript-green.svg) ![](https://img.shields.io/badge/API-Eris-blue.svg) ![](https://img.shields.io/badge/Status-WIP-00d832.svg) ![](https://img.shields.io/badge/Version-0.5.0-orange.svg)

An all-purpose Discord bot for my Discord server, but can be self-hosted and used on other Discord servers. The bot is written completely in Javascript and runs on Node.js. Other libraries are planned on being added in the future to facilitate in the addition of new features.

You may download this and customize the source code for use on your guilds, but do keep in mind that this bot is heavily customized to work on my servers. If that bothers you, then you may want to look somewhere else for a more vanilla discord bot. If you are looking for a recommendation, I'd point you [here](https://github.com/Cog-Creators/Red-DiscordBot).

## Working Features
- Gfycat searching
- YouTube music playing
- YouTube music queueing

## Features in Progress
- Upload and play mp3 files

## Upcoming Features
- Fun
- Karma

## Building Prerequisites
Make sure you have Node.js installed. The bot runs on it.

## Building the Bot
1. Clone the repository
`git clone https://github.com/BaconatorNoVeg/NoVegBot.git`
2. Navigate inside the cloned folder and install the Node.js dependencies
`cd NoVegBot` -> `npm install`
3. Rename the `options.json.example` file to `options.json`
4. Open the `options.json` file and paste your bot token into the "bot_token" field
5. (Optional, but required for Gfycat functionality) Get Gfycat API credentials and paste them into their respected fields in `options.json`
6. Run NoVegBot
`node bot.js`

If you have any questions, or you would like to contribute to this project somehow, please do not hesitate to use the issue tracker or contact me on Discord: **Baconator_NoVeg#8550**.
