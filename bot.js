// The imports
const Eris = require("eris");
const ytdl = require("youtube-dl");
const fs = require("fs");
const getVidInfo = require("youtube-info");
const Gfycat = require('gfycat-sdk');
const options = require('./options.json');
const papa = require("papaparse");
const editJsonFile = require("edit-json-file");
let optionsFile = editJsonFile(`${__dirname}/options.json`);
var path = require('path');
var timeConvert = require('convert-seconds');

var bot = new Eris(options.core.bot_token); // The birth of NoVegBot
var gfycat = new Gfycat({
    clientId: options.core.gfycat_id,
    clientSecret: options.core.gfycat_secret
});
var blacklistEnabled = options.server.wordBlacklist;
var whitelist = options.server.channelWhitelist;  
var isDebug = options.core.isDebug; // Debug flag for possible debug functions
var conn = undefined;
// Create message function because I'm lazy
var respond = function (id, message) {
    bot.createMessage(id, message);
}

// The bot's default playing status
var defaultStatus = {
    name: "/help",
    type: 0
}

// JSON of commands, obviously
var commands = {
    "help": options.core.prefix + "help",
    "play": options.core.prefix + "play",
    "stop": options.core.prefix + "stop",
    "skip": options.core.prefix + "skip",
    "ping": options.core.prefix + "ping",
    "pong": options.core.prefix + "pong",
    "gif": options.core.prefix + "gif"
}

// JSON of admin commands
var adminComs = {
    "set": options.core.prefix + "set",
    "shutdown": options.core.prefix + "shutdown"
}

// Pre-programmed statements for the bot
var statements = {
    "noDM": "This command cannot be run in direct messages.",
    "notAdmin": "Only the server managers can run this command."
}

// Default audio options
var audioOptions = {
    inlineVolume: true
}

var audioQueue = []

// Download a YouTube video to play
var downloadThenPlay = function (song, voiceChannel, guildID) {
    var url = song.url;
    var requester = song.requester;
    var videoID = url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
    if (videoID == null) {
        console.log("The YouTube URL is not valid.");
    } else {
        getVidInfo(videoID[1]).then(function (videoInfo) {
            console.log(song.channel, "Playing `" + videoInfo.title + "` as requested by `" + requester.username + "`.");
            var videoDurationConvert = timeConvert(videoInfo.duration);
            var videoDuration;
            if (videoDurationConvert.hours == 0) {
                if (videoDurationConvert.minutes < 10) {
                    if (videoDurationConvert.seconds < 10) {
                        videoDuration = "0" + videoDurationConvert.minutes + ":0" + videoDurationConvert.seconds;
                    } else {
                        videoDuration = "0" + videoDurationConvert.minutes + ":" + videoDurationConvert.seconds;
                    }
                } else {
                    if (videoDurationConvert.seconds < 10) {
                        videoDuration = videoDurationConvert.minutes + ":0" + videoDurationConvert.seconds;
                    } else {
                        videoDuration = videoDurationConvert.minutes + ":" + videoDurationConvert.seconds;
                    }
                }
            } else {
                if (videoDurationConvert.minutes < 10) {
                    if (videoDurationConvert.seconds < 10) {
                        videoDuration = videoDurationConvert.hours + ":0" + videoDurationConvert.minutes + ":0" + videoDurationConvert.seconds;
                    } else {
                        videoDuration = videoDurationConvert.hours + ":0" + videoDurationConvert.minutes + ":" + videoDurationConvert.seconds;
                    }
                } else {
                    if (videoDurationConvert.seconds < 10) {
                        videoDuration = videoDurationConvert.hours + ":" + videoDurationConvert.minutes + ":0" + videoDurationConvert.seconds;
                    } else {
                        videoDuration = videoDurationConvert.hours + ":" + videoDurationConvert.minutes + ":" + videoDurationConvert.seconds;
                    }
                }
            }
            console.log(videoDuration);
            const data = {
                "embed": {
                    "title": videoInfo.title,
                    "url": videoInfo.url,
                    "color": 16711680,
                    "footer": {
                        "icon_url": "https://cdn.discordapp.com/avatars/413768966578896906/df87608e430595b400782025a317c972.webp",
                        "text": "NoVegBot"
                    },
                    "image": {
                        "url": videoInfo.thumbnailUrl
                    },
                    "author": {
                        "name": "Playing video requested by " + song.requester.username,
                        "icon_url": song.requester.staticAvatarURL
                    },
                    "fields": [{
                            "name": "Uploader",
                            "value": videoInfo.owner,
                            "inline": true
                        },
                        {
                            "name": "Duration",
                            "value": videoDuration,
                            "inline": true
                        }
                    ]
                }
            };
            bot.createMessage(song.channel, data);
        })
        fs.stat("./audio/cache/" + videoID[1] + ".mp3", function (err, stat) {
            var audioFile = "./audio/cache/" + videoID[1] + ".mp3";
            console.log("File: " + audioFile);
            if (err == null) {
                console.log("File already exists! Won't download again.");
                playSong(voiceChannel, audioFile, guildID);
            } else if (err.code == 'ENOENT') {
                console.log("File doesn't exist, downloading.");
                ytdl.exec(url, ['-x', '--audio-format', 'mp3', '-o', './audio/cache/%(id)s.%(ext)s'], {}, function exec(err, output) {
                    'use strict';
                    if (err) {
                        throw err;
                    }
                    console.log(output.join('\n'));
                    playSong(voiceChannel, audioFile, guildID);
                });
            } else {
                console.log("Something stupid happened. I don't know what, tho.");
            }
        });
    }

}

// Play audio file
var playSong = function (voiceChannel, name, guildID) {
    console.log("Joining voice channel " + voiceChannel + ".")
    var queueSize = audioQueue.length;
    console.log("Current queue size: " + queueSize);
    if (conn == undefined) {
        console.log("Connection was undefined.")
        bot.joinVoiceChannel(voiceChannel).then((connection) => {
            conn = connection;
            conn.play(name, audioOptions);
            conn.setVolume(options.audio.audioVolume);
            conn.on("end", () => {
                if (audioQueue.length == 0) {
                    console.log("Queue is empty. Leaving voice channel.");
                    bot.leaveVoiceChannel(voiceChannel);
                    conn = undefined;
                } else {
                    console.log("Playing next song in queue.");
                    var nextSong = audioQueue.shift();
                    console.log(nextSong);
                    downloadThenPlay(nextSong, voiceChannel, guildID);
                }
            });
        });
    } else if (conn != undefined) {
        console.log("Connection already exists.")
        conn.play(name, audioOptions);
        conn.setVolume(options.audio.audioVolume);
    }
}

bot.on("ready", () => {
    console.log("NoVegBot is ready!");
    bot.editStatus("online", defaultStatus);
});

// Respond to messages
bot.on("messageCreate", (msg) => {
    var author = msg.author;
    var channelID = msg.channel.id;

    // Help Command
    if (msg.content === commands.help) {
        respond(channelID, "Help not available yet.");
    }

    // Ping Command
    else if (msg.content === commands.ping) {
        bot.createMessage(msg.channel.id, "Pong!");
    }

    // Pong Command
    else if (msg.content === commands.pong) {
        bot.createMessage(msg.channel.id, "I hear " + msg.author.mention + " likes Anime, and that's gay.");
    }

    // Play Command
    else if (msg.content.startsWith(commands.play)) {
        if (!msg.channel.guild) {
            bot.createMessage(msg.channel.id, statements.noDM);
            return;
        } else if (!msg.member.voiceState.channelID) {
            bot.createMessage(msg.channel.id, "You are not in a voice channel.");
            return;
        } else if (msg.content.length <= commands.play.length + 1) {
            respond(channelID, "```\nPlay a song.\n\n\t[p]play <YouTube Link>   | Plays a video from YouTube\n\t[p]play local            | Use as comment on an attached mp3 file\n\nThis command may only be run in #novegbot.```");
            return;
        } else if (!msg.content.includes("local")) {
            var ytLink = msg.content.substring(commands.play.length + 1);
            var song = {
                url: ytLink,
                requester: author,
                channel: channelID
            }
            console.log(song);
            var voiceChannelID = msg.member.voiceState.channelID;
            if (conn != undefined) {
                if (conn.playing) {
                    audioQueue.push(song);
                    console.log(audioQueue.length);
                    var url = song.url;
                    var videoID = url.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
                    if (videoID != null) {
                        console.log("Video ID = ", videoID[1]);
                    } else {
                        console.log("The YouTube URL is not valid.");
                    }
                    getVidInfo(videoID[1]).then(function (videoInfo) {
                        respond(channelID, "`" + author.username + "` added `" + videoInfo.title + "` to the queue.");
                    });
                    console.log(ytLink + " added to queue.");
                    console.log("Current audio queue: " + audioQueue);
                } else {
                    downloadThenPlay(song, voiceChannelID, msg.channel.guild.id, msg.author);
                }
            } else {
                downloadThenPlay(song, voiceChannelID, msg.channel.guild.id, msg.author);
            }
        } else {
            var attachment = msg.attachments[0];
            if (attachment == undefined) {
                bot.createMessage(msg.channel.id, "Attach a file, you dip!");
            } else {
                console.log(attachment.filename);
                console.log(attachment.url);
                var http = require('https');
                var fs = require('fs');

                var download = function (url, dest, cb) {
                    var file = fs.createWriteStream(dest);
                    var request = http.get(url, function (response) {
                        response.pipe(file);
                        file.on('finish', function () {
                            file.close(cb);
                            bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
                                if (connection.playing) {
                                    bot.createMessage(msg.channel.id, "A song is already playing.");
                                }
                                respond(channelID, "Now playing `" + attachment.filename + "` as requested by `" + msg.author.username + "`");
                                connection.play("./audio/local/" + attachment.filename, audioOptions);
                                connection.setVolume(audioVolume);
                                var nowPlaying = {
                                    name: attachment.filename,
                                    type: 0
                                }
                                bot.editStatus("online", nowPlaying);
                                connection.on("end", () => {
                                    bot.editStatus("online", defaultStatus);
                                })
                            });
                        });
                    });
                }
                download(attachment.url, "./audio/local/" + attachment.filename, null);
            }
        }

    }

    // Stop command
    else if (msg.content.startsWith(commands.stop)) {
        audioQueue = [];
        conn.stopPlaying();
    }

    // Skip command
    else if (msg.content.startsWith(commands.skip)) {
        if (audioQueue.length == 0) {
            respond(channelID, "The queue is empty!");
        } else {
            conn.stopPlaying();
        }
    }
    
    // Gif command
    else if (msg.content.startsWith(commands.gif)) {
        gfycat.authenticate().then(res => {
            assert.equal(res.access_token, gfycat.token);
            console.log('token', gfycat.token);
        });
        if (msg.content.length < commands.gif + 1) {
            respond(channelID, "```Search for a gif on Gfycat\n\n\t[p]gif <gif search term>```");
        } else {
            var gifSearch = msg.content.substring(commands.gif.length + 1);
            let options = {
                search_text: gifSearch,
                count: 1,
                first: 1
            };
            gfycat.search(options).then(data => {
                console.log('gfycats', data.gfycats[0].gifUrl);
                respond(channelID, data.gfycats[0].gifUrl);
            });
        }
    }

    // Respond to user mentions
    else if (msg.content.includes(bot.user.mention)) {
        // Responds to Baconator_NoVeg#8550. Please do not change the below if statement.
        if (msg.author.id == 205407549426499594) {
            bot.addMessageReaction(msg.channel.id, msg.id, "❤️");
        }

        // Responds to every other user
        else {
            bot.addMessageReaction(msg.channel.id, msg.id, "😄");
        }
    }

    // Admin Commands
    else if (msg.content.startsWith(adminComs.set)) {
        if (!msg.member.permission.json.manageGuild) {
            respond(channelID, statements.notAdmin);
        } else if (msg.content.length == adminComs.set.length) {
            respond(channelID, "```\nSet bot options.\n\n\t[p]set blacklist   | Enables/disables word blacklist\n\nThese commands may only be run by server managers.```")
        } else {
            var arg = msg.content.substring(adminComs.set.length + 1);
            if (arg == "blacklist") {
                if (blacklistEnabled) {
                    blacklistEnabled = false;
                    optionsFile.set("server.wordBlacklist", false);
                    respond(channelID, "Word blacklist disabled.");
                } else {
                    blacklistEnabled = true;
                    optionsFile.set("server.wordBlacklist", true);
                    respond(channelID, "Word blacklist enabled.");
                }
            }
            else if (arg.includes("volume")) {
                if (msg.content.length == adminComs.set.length + " volume" + 1) {
                    respond(channelID, "```\nSet audio volume\n\n\t[p]set volume <percent>   | <percent> is a percentage between 1 and 100\n\nThis command may only be run by server managers.```")
                } else {
                    var setVolume = parseInt(arg.substring("volume".length + 1));
                    console.log(setVolume);
                    setVolume *= 0.01;
                    optionsFile.set("audio.audioVolume", setVolume);
                }
            }
        }
    } else if (msg.content.startsWith(adminComs.shutdown)) {
        if (!msg.member.permission.json.manageGuild) {
            respond(channelID, statements.notAdmin);
        } else {
            console.log("NoVegBot is shutting down.");
            optionsFile.save();
            console.log("Options saved.");
            console.log("Disconnecting...");
            bot.disconnect();
            console.log("NoVegBot has shut down.");
        }
    } else if (msg.content.startsWith(adminComs.whitelist)) {
        if (!msg.member.permission.json.manageGuild) {
            respond(channelID, statements.notAdmin);
        } else if (options.server.wordBlacklist) {
            var arg = msg.content.substring(adminComs.whitelist.length + 1);
            if (arg == "add") {
                for (var i = 0; i < whitelist.length; i++) {
                    var channelExists = false;
                    if (msg.channel.id == whitelist[i]) {
                        respond(channelID, "This channel is already on the whitelist.");
                        channelExists = true;
                        return;
                    }
                }
                if (!channelExists) {
                    whitelist.push(msg.channel.id);
                    optionsFile.set("server.channelWhitelist", whitelist);
                }
            } else if (arg == "remove") {
                for (var i = 0; i < whitelist.length; i++) {
                    var channelExists = false;
                    if (msg.channel.id == whitelist[i]) {
                        whitelist.splice(i, 1);
                        channelExists = true;
                        optionsFile.set("server.channelWhitelist", whitelist);
                        return;
                    }
                }
                if (!channelExists) {
                    respond(channelID, "This channel is not on the whitelist.");
                }
            }
        } else {
            respond(channelID, "Word blacklist is disabled.")
        }
    }

    // Delete messages containing commands
    if (msg.content.startsWith(options.core.prefix)) {
        bot.deleteMessage(msg.channel.id, msg.id);
    }

    // For server word blacklist
    if (options.server.wordBlacklist) {
        // Delete messages that contain words in the specified word blacklist file
    }

});

// Let there be life!
bot.connect();