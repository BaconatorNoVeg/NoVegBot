// The imports
require('console-stamp')(console, 'HH:MM:ss')
const Eris = require("eris");
const ytdl = require("youtube-dl");
const fs = require("fs");
const getVidInfo = require("youtube-info");
const Gfycat = require('gfycat-sdk');
const options = require('./options.json');
const editJsonFile = require("edit-json-file");
let optionsFile = editJsonFile(`${__dirname}/options.json`);
var path = require('path');
var timeConvert = require('convert-seconds');
var YouTube = require('youtube-node');

var bot = new Eris(options.core.bot_token); // The birth of NoVegBot
var gfycat = new Gfycat({
    clientId: options.core.gfycat_id,
    clientSecret: options.core.gfycat_secret
});
var youTube = new YouTube();
var blacklistEnabled = options.server.wordBlacklist;
var whitelist = options.server.channelWhitelist;
var isDebug = options.core.isDebug; // Debug flag for possible debug functions
var conn = undefined;
var loop = false;
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
    "play": options.core.prefix + "play ",
    "loop": options.core.prefix + "loop",
    "stop": options.core.prefix + "stop",
    "skip": options.core.prefix + "skip",
    "ping": options.core.prefix + "ping",
    "pong": options.core.prefix + "pong",
    "playlist": options.core.prefix + "playlist",
    "gif": options.core.prefix + "gif "
}

// JSON of admin commands
var adminComs = {
    "set": options.core.prefix + "set",
    "shutdown": options.core.prefix + "shutdown",
    "whitelist": options.core.prefix + "whitelist"
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

var downloading = false;
// Download a YouTube video to play
var downloadToPlay = function (requested) {
    var url = requested.song.url;
    var videoID = requested.song.id;
    var requester = requested.requester;
    if (videoID == null) {
        console.log("The YouTube URL is not valid.");
    } else {
        fs.stat("./audio/cache/" + videoID + ".mp3", function (err, stat) {
            var audioFile = "./audio/cache/" + videoID + ".mp3";
            console.log("File: " + audioFile);
            if (err == null) {
                console.log("File already exists! Won't download again.");
                playSong(requested, audioFile);
            } else if (err.code == 'ENOENT') {
                console.log("File doesn't exist, downloading.");
                respond(requested.channel, "I'm downloading the video, please don't send me anymore commands until I add it to the queue. :)");
                ytdl.exec(url, ['-q', '-x', '--audio-format', 'mp3', '-o', './audio/cache/%(id)s.%(ext)s'], {}, function exec(err, output) {
                    if (err) {
                        console.error(err);
                    }
                    playSong(requested, audioFile);
                });
            } else {
                console.error("Something stupid happened. I don't know what, tho.");
            }
        });
    }

}

// Play audio file
var playSong = function (requested, name) {
    var voiceChannel = requested.requester.voiceState.channelID;
    var queueSize = audioQueue.length;
    console.log("Current queue size: " + queueSize);
    if (conn == undefined) {
        console.log("Connection was undefined.");
        console.log("Joining voice channel " + voiceChannel + ".");
        bot.joinVoiceChannel(voiceChannel).then((connection) => {
            conn = connection;
            conn.play(name, audioOptions);
            conn.setVolume(options.audio.audioVolume);
            const nowPlayingData = {
                "embed": {
                    "title": requested.song.title,
                    "url": requested.song.url,
                    "color": 16711680,
                    "footer": {
                        "icon_url": "https://cdn.discordapp.com/avatars/413768966578896906/df87608e430595b400782025a317c972.webp",
                        "text": "NoVegBot"
                    },
                    "image": {
                        "url": requested.song.thumbnail
                    },
                    "author": {
                        "name": "Playing video requested by " + requested.requester.user.username,
                        "icon_url": requested.requester.user.staticAvatarURL
                    },
                    "fields": [{
                            "name": "Uploader",
                            "value": requested.song.uploader,
                            "inline": true
                        },
                        {
                            "name": "Duration",
                            "value": requested.song.duration,
                            "inline": true
                        }
                    ]
                }
            };
            respond(requested.channel, nowPlayingData);
            conn.on("end", () => {
                if (loop) {
                    console.log("Loop is enabled. Replaying current song.");
                    conn.play(name, audioOptions);
                } else {
                    if (audioQueue.length == 0) {
                        console.log("Queue is empty. Leaving voice channel.");
                        bot.leaveVoiceChannel(voiceChannel);
                        conn = undefined;
                    } else {
                        console.log("Playing next song in queue.");
                        downloadToPlay(audioQueue.shift());
                    }
                }
            });
        });
    } else if (conn != undefined) {
        if (conn.playing) {
            audioQueue.push(requested);
            respond(requested.channel, "**" + requested.requester.user.username + "** added `" + requested.song.title + "` to the queue.");
        } else {
            if (options.core.isDebug) {
                console.log("Connection already exists.");
            }

            const nowPlayingData = {
                "embed": {
                    "title": requested.song.title,
                    "url": requested.song.url,
                    "color": 16711680,
                    "footer": {
                        "icon_url": "https://cdn.discordapp.com/avatars/413768966578896906/df87608e430595b400782025a317c972.webp",
                        "text": "NoVegBot"
                    },
                    "image": {
                        "url": requested.song.thumbnail
                    },
                    "author": {
                        "name": "Playing video requested by " + requested.requester.user.username,
                        "icon_url": requested.requester.user.staticAvatarURL
                    },
                    "fields": [{
                            "name": "Uploader",
                            "value": requested.song.uploader,
                            "inline": true
                        },
                        {
                            "name": "Duration",
                            "value": requested.song.duration,
                            "inline": true
                        }
                    ]
                }
            };
            respond(requested.channel, nowPlayingData);
            conn.play(name, audioOptions);
            conn.setVolume(options.audio.audioVolume);
        }
    }
}

// Convert ISO Time
function convert_time(duration) {
    var a = duration.match(/\d+/g);

    if (duration.indexOf('M') >= 0 && duration.indexOf('H') == -1 && duration.indexOf('S') == -1) {
        a = [0, a[0], 0];
    }

    if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1) {
        a = [a[0], 0, a[1]];
    }
    if (duration.indexOf('H') >= 0 && duration.indexOf('M') == -1 && duration.indexOf('S') == -1) {
        a = [a[0], 0, 0];
    }

    duration = 0;

    if (a.length == 3) {
        duration = duration + parseInt(a[0]) * 3600;
        duration = duration + parseInt(a[1]) * 60;
        duration = duration + parseInt(a[2]);
    }

    if (a.length == 2) {
        duration = duration + parseInt(a[0]) * 60;
        duration = duration + parseInt(a[1]);
    }

    if (a.length == 1) {
        duration = duration + parseInt(a[0]);
    }
    return duration
}

// Get song data
function getSongData(keywrdUrl, isSearch, cb) {
    if (options.core.isDebug) {
        console.log("Gathering video data");
    }
    if (isSearch) {
        youTube.search(keywrdUrl, 1, function (err, result) {
            if (err) {
                console.error("Error in search");
                console.error(error);
            } else {
                console.log("Using first search result.");
                var videoID = result.items[0].id.videoId;
                songUrl = "https://www.youtube.com/watch?v=" + videoID;
                youTube.getById(videoID, function (error, result) {
                    if (!error) {
                        var ISO2Seconds = convert_time(JSON.stringify(result.items[0].contentDetails.duration));
                        var videoDurationConvert = timeConvert(ISO2Seconds);
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
                        var song = {
                            url: songUrl,
                            id: videoID,
                            title: result.items[0].snippet.title,
                            duration: videoDuration,
                            uploader: result.items[0].snippet.channelTitle,
                            thumbnail: result.items[0].snippet.thumbnails.standard.url
                        }
                        cb(song);
                    } else {
                        console.error(error);
                    }

                });
            }
        });
    } else {
        var videoID = keywrdUrl.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
        youTube.getById(videoID[1], function (error, result) {
            if (error) {
                console.error(error);
            } else {
                var ISO2Seconds = convert_time(JSON.stringify(result.items[0].contentDetails.duration));
                var videoDurationConvert = timeConvert(ISO2Seconds);
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
                var song = {
                    url: keywrdUrl,
                    id: videoID[1],
                    title: result.items[0].snippet.title,
                    duration: videoDuration,
                    uploader: result.items[0].snippet.channelTitle,
                    thumbnail: result.items[0].snippet.thumbnails.standard.url
                }
                cb(song);
            }
        });
    }
}

// Get videos in playlist
function getPlaylistVideos(playlist, cb) {
    var list = {
        "playlist": []
    }
    for (obj in playlist.items) {
        var i = 1;

        function getListVidInfo(vidObj, cb) {
            var url = "https://www.youtube.com/watch?v=" + vidObj.snippet.resourceId.videoId;
            var listPos = vidObj.snippet.position;
            cb(url, listPos);
        }

        getListVidInfo(playlist.items[obj], function (url, listPos) {
            getSongData(url, false, function (song) {
                var listObj = {
                    "songDat": song,
                    "pos": listPos
                }
                list.playlist.push(listObj);
                if (i == playlist.items.length) {
                    var sortpasses = 1;
                    list.playlist.sort(function (a, b) {
                        if (options.core.isDebug) {
                            console.log("List sort pass " + sortpasses);
                        }
                        sortpasses++;
                        return parseFloat(a.pos) - parseFloat(b.pos);
                    });
                    cb(list);
                }
                i++;
            });
        });


    }
}

bot.on("ready", () => {
    youTube.setKey(options.core.youtube_key);
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
        bot.createMessage(msg.channel.id, "I hear " + msg.author.mention + " likes cute Asian boys.");
    }

    // Play Command
    else if (msg.content.startsWith(commands.play)) {
        if (!msg.channel.guild) {
            bot.createMessage(msg.channel.id, statements.noDM);
            return;
        } else if (!msg.member.voiceState.channelID) {
            bot.createMessage(msg.channel.id, "You are not in a voice channel.");
            return;
        } else if (msg.content.length <= commands.play.length) {
            respond(channelID, "```\nPlay a song.\n\n\t[p]play <YouTube Link>   | Plays a video from YouTube\n\t[p]play local            | Use as comment on an attached mp3 file\n\nThis command may only be run in #novegbot.```");
            return;
        } else if (!msg.content.includes("local")) {
            var ytLink = msg.content.substring(commands.play.length);
            var videoID = ytLink.match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/watch\?v=|\/)([^\s&]+)/);
            var songUrl = null;
            var requested = {};
            if (videoID == null) {
                getSongData(ytLink, true, function (song) {
                    requested = {
                        song: song,
                        requester: msg.member,
                        channel: channelID
                    }
                    downloadToPlay(requested);
                });
            } else {
                getSongData(ytLink, false, function (song) {
                    requested = {
                        song: song,
                        requester: msg.member,
                        channel: channelID
                    }
                    downloadToPlay(requested);
                });
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

    // Playlist command
    else if (msg.content.startsWith(commands.playlist)) {
        var fs = require('fs');
        if (msg.content.length <= commands.playlist.length) {
            respond(channelID, "```Playlist usage:\n\n/playlist create	| Creates an empty playlist\n/playlist add	    | Adds a song to an existing playlist\n/playlist import	| Imports a playlist from YouTube```");
        }
        var args = msg.content.substring(commands.playlist.length + 1).split(" ");

        // Create empty playlists
        if (args[0] == "create") {
            // Create playlists folder if it doesn't exist
            if (!fs.existsSync("./audio/playlists")) {
                fs.mkdirSync("./audio/playlists");
            }
            if (args.length == 1) {
                respond(channelID, "```Create an empty playlist:\n\n/playlist create <playlist name>\n```");
            } else {
                var playlistname = args[1];
                var playlistfile = playlistname + ".json";
                fs.stat("./audio/playlists/" + playlistfile, function (err, stat) {
                    if (err == null) {
                        respond(channelID, "Error: A playlist already exists with the name `" + playlistname + "`");
                    } else if (err.code == 'ENOENT') {
                        var emptyList = {
                            "playlist": []
                        }
                        fs.writeFile("./audio/playlists/" + playlistname + ".json", JSON.stringify(emptyList, null, " "));
                        respond(channelID, "Created empty playlist with the name `" + playlistname + "`");
                    } else {
                        console.error("Something stupid happened.");
                    }
                });
            }
        }

        // Add videos to playlists
        else if (args[0] == "add") {
            // Create playlists folder if it doesn't exist
            if (!fs.existsSync("./audio/playlists")) {
                fs.mkdirSync("./audio/playlists");
            }
            if (args.length == 1) {
                respond(channelID, "```Add a video to a new playlist, or an already existing one:\n\n/playlist add <playlist name> <video link>```");
            } else {
                var playlistname = args[1];
                var videolink = args[2];
                var songDat;
                getSongData(videolink, false, function (song) {
                    songDat = song;
                    const embedData = {
                        "embed": {
                            "title": songDat.title,
                            "url": songDat.url,
                            "color": 12345678,
                            "footer": {
                                "icon_url": "https://cdn.discordapp.com/avatars/433098342285836318/329b1b9c180152bdf8d2cf21c24ec4af.png",
                                "text": "NoVegBot"
                            },
                            "thumbnail": {
                                "url": songDat.thumbnail
                            },
                            "author": {
                                "name": "Baconator_NoVeg added a video to the '" + playlistname + "' playlist.",
                                "icon_url": msg.author.staticAvatarURL
                            },
                            "fields": [{
                                    "name": "Uploader",
                                    "value": songDat.uploader,
                                    "inline": true
                                },
                                {
                                    "name": "Duration",
                                    "value": songDat.duration,
                                    "inline": true
                                }
                            ]
                        }
                    }
                    var playlistfile = playlistname + ".json";
                    fs.stat("./audio/playlists/" + playlistfile, function (err, stat) {
                        if (err == null) {
                            fs.readFile("./audio/playlists/" + playlistfile, 'utf8', function (err, data) {
                                if (err) {
                                    console.error(err);
                                } else {
                                    var obj = JSON.parse(data);
                                    obj.playlist.push(songDat);
                                    fs.writeFile("./audio/playlists/" + playlistname + ".json", JSON.stringify(obj, null, " "), 'utf8');
                                }
                            });
                            respond(channelID, embedData);
                        } else if (err.code == 'ENOENT') {
                            var obj = {
                                "playlist": []
                            }
                            obj.playlist.push(songDat);
                            fs.writeFile("./audio/playlists/" + playlistname + ".json", JSON.stringify(obj, null, " "), 'utf8');
                            respond(channelID, embedData);
                        } else {
                            console.error("Something stupid happened.");
                        }
                    });
                });
            }
        }

        // Import a playlist from YouTube
        else if (args[0] == "import") {
            if (args.length == 1) {
                respond(channelID, "```Import a playlist from YouTube (playlist must be public or unlisted):\n\n/playlist import <playlist link> <name for imported playlist>```");
            } else {
                var playlistUrl = args[1];
                try {
                    var playlistID = args[1].match(/(?:https?:\/{2})?(?:w{3}\.)?youtu(?:be)?\.(?:com|be)(?:\/playlist\?list=|\/)([^\s&]+)/)[1];
                } catch (error) {}
                var playlistName = args[2];
                var playlistData;
                youTube.getPlayListsItemsById(playlistID, 50, function (error, result) {
                    if (error) {
                        console.error(error);
                        respond(channelID, "An error has occurred. Make sure the playlist is either public or unlisted and not private. See console for more details.");
                    } else {
                        playlistData = result;
                        fs.stat("./audio/playlists/" + playlistName + ".json", function (err, stat) {
                            if (err == null) {
                                respond(channelID, "Playlist already exists! Please choose a different name for the playlist you are importing.");
                            } else if (err.code == 'ENOENT') {
                                getPlaylistVideos(playlistData, function (list) {
                                    var playlistfile = playlistName + ".json";
                                    fs.writeFile("./audio/playlists/" + playlistName + ".json", JSON.stringify(list, null, " "), 'utf8');
                                    respond(channelID, "YouTube playlist successfully imported.");
                                });
                            }
                        });
                    }
                });
            }
        }

        // Play a playlist in order of added videos
        else if (args[0] == "play") {
            var playlist = args[1];
            fs.readFile("./audio/playlists/" + playlist + ".json", 'utf8', function (err, data) {
                if (err) {
                    console.error(err);
                    respond(channelID, "An error has occurred. That playlist may not exist. See the log for more info.");
                } else {
                    var playlistToQueue = JSON.parse(data);
                    for (obj in playlistToQueue.playlist) {
                        var requested = {
                            song: playlistToQueue.playlist[obj].songDat,
                            requester: msg.member,
                            channel: channelID
                        }
                        audioQueue.push(requested);
                    }
                    downloadToPlay(audioQueue.shift());
                }
            });
        }
    }

    // Loop Command
    else if (msg.content.startsWith(commands.loop)) {
        if (conn != undefined) {
            if (conn.playing) {
                if (!loop) {
                    loop = true;
                    respond(channelID, "Loop is enabled for the current song.")
                } else {
                    loop = false;
                    respond(channelID, "Loop has been disabled.")
                }
            } else {
                respond(channelID, "Nothing is playing right now!");
            }
        } else {
            respond(channelID, "Nothing is playing right now!");
        }
    }

    // Stop command
    else if (msg.content.startsWith(commands.stop)) {
        audioQueue = [];
        loop = false;
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
            bot.addMessageReaction(msg.channel.id, msg.id, "😄");
        }

        // Responds to every other user
        else {
            bot.addMessageReaction(msg.channel.id, msg.id, "😉");
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
            } else if (arg.includes("volume")) {
                if (msg.content.length == adminComs.set.length + " volume" + 1) {
                    respond(channelID, "```\nSet audio volume\n\n\t[p]set volume <percent>   | <percent> is a percentage between 1 and 100\n\nThis command may only be run by server managers.```")
                } else {
                    var setVolume = parseInt(arg.substring("volume".length + 1));
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
        } else if (blacklistEnabled) {
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
                    respond(channelID, "This channel was added to the whitelist.");
                    optionsFile.set("server.channelWhitelist", whitelist);
                }
            } else if (arg == "remove") {
                for (var i = 0; i < whitelist.length; i++) {
                    var channelExists = false;
                    if (msg.channel.id == whitelist[i]) {
                        whitelist.splice(i, 1);
                        channelExists = true;
                        respond(channelID, "This channel was removed from the whitelist.")
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

});

// Let there be life!
bot.connect();