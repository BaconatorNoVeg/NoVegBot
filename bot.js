const Eris = require("eris");
const ytdl = require("youtube-dl");
const FS = require("fs");
var options = require('./options.json');
var bot = new Eris(options.bot_token);
var ffmpeg = require('ffmpeg');
var path = require('path');
var audioVolume = 0.075;
var respond = function(msg, message) {
    bot.createMessage(msg.channel.id, message);
}
var defaultStatus = {
    name: "/help",
    type: 0
}
var commands = {
    "help": options.prefix + "help",
    "play": options.prefix + "play",
    "stop": options.prefix + "stop",
    "ping": options.prefix + "ping",
    "pong": options.prefix + "pong",
    "disconnect": options.prefix + "disconnect"
}
var statements = {
    "noDM": "This command cannot be run in direct messages."
}
var audioOptions = {
    inlineVolume: true
}

bot.on("ready", () => {
    console.log("NoVegBot is ready!");
    bot.editStatus("online", defaultStatus);
});

bot.on("messageCreate", (msg) => {
    if (msg.content === commands.help) {
        respond(msg, "Help not available yet.");
    }
    else if (msg.content === commands.ping) {
        bot.createMessage(msg.channel.id, "Pong!");

    } else if (msg.content === commands.pong) {
        bot.createMessage(msg.channel.id, "I hear " + msg.author.mention + " likes cute Asian boys.");
    } else if (msg.content.startsWith(commands.play)) {
        if (!msg.channel.guild) {
            bot.createMessage(msg.channel.id, statements.noDM);
            return;
        }
        else if (!msg.member.voiceState.channelID) {
            bot.createMessage(msg.channel.id, "You are not in a voice channel.");
            return;
        }
        else if (msg.content.length <= commands.play.length + 1) {
            respond(msg, "```\nPlay a song.\n\n\t[p]play <YouTube Link>   | Plays a video from YouTube\n\t[p]play local            | Use as comment on an attached mp3 file\n\nThis command may only be run in #novegbot.```");
            return;
        }
        else if (!msg.content.includes("local")) {
            console.log("Valid link");
            var ytLink = msg.content.substring(commands.play.length + 1);
            console.log(ytLink);
            bot.joinVoiceChannel(msg.member.voiceState.channelID).then((connection) => {
                if (connection.playing) {
                    bot.createMessage(msg.channel.id, "A song is already playing.");
                }
                var videoid = ytLink.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
                if (videoid != null) {
                    console.log("video id = ", videoid[1]);
                } else {
                    console.log("The youtube url is not valid.");
                }
                FS.stat("./audio/cache/" + videoid[1] + ".mp3", function (err, stat) {
                    if (err == null) {
                        console.log("File already exists! Won't download again.");
                        connection.play("./audio/cache/" + videoid[1] + ".mp3", audioOptions);
                        connection.setVolume(audioVolume);
                    } else if (err.code == 'ENOENT') {
                        console.log("File doesn't exist, downloading.");
                        ytdl.exec(ytLink, ['-x', '--audio-format', 'mp3', '-o', './audio/cache/%(id)s.%(ext)s'], {}, function exec(err, output) {
                            'use strict';
                            if (err) {
                                throw err;
                            }
                            console.log(output.join('\n'));
                            // Play Args: source, [options.format, options.voiceDataTimeout, options.inlineVolume, options.inputArgs, options.encoderArgs, options.samplingRate, options.frameDuration, options.frameSize, options.pcmSize]
                            connection.play("./audio/cache/" + videoid[1] + ".mp3", audioOptions);
                            connection.setVolume(audioVolume);
                        });
                    } else {
                        console.log("Something stupid happened. I don't know what, tho.");
                    }
                });
            });
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
                                respond(msg, "Now playing `" + attachment.filename + "` as requested by `" + msg.author.username + "`");
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

    } else if (msg.content.startsWith(commands.stop)) {
        
    }
    else if (msg.content === commands.disconnect) {
        bot.leaveVoiceChannel(msg.member.voiceState.channelID);
    } else if (msg.content.includes(bot.user.mention)) {
        bot.createMessage(msg.channel.id, "Hi, I'm NoVegBot!");
    }

});
bot.connect();