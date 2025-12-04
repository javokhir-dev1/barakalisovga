import { bot } from "./bot.js"
import { handleSubscriptionCheck } from "./handlers/subscription.js"

import { User } from "./models/users.model.js"
import { Video } from "./models/videos.model.js"
import { Music } from "./models/music.model.js"

import { botStartMessage } from "./handlers/functions.js"
import { youtubeApi } from "./downloaders/youtube.js"
import { youtubeInfo } from "./downloaders/youtubeInfo.js"
import { allApi } from "./downloaders/all.js"
import { music } from "./downloaders/music.js"
import "./handlers/admin.js"

import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"

import https from 'https'
import http from "http"
import sharp from 'sharp'

import pTimeout from 'p-timeout';

import ffmpeg from 'fluent-ffmpeg'
import path from 'path'

dotenv.config()

export const session = {}

import fs from "fs";
import { Markup } from "telegraf"
import { youtubeApiMusic } from "./downloaders/youtubemusic.js"
import { where } from "sequelize"
import c from "config"
import { photolab } from "./downloaders/photolab.js"

async function checkVideoAvailability(url) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const res = await fetch(url, {
            method: 'GET',
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (res.ok) {
            const contentLength = res.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength, 10) : null;

            res.body.cancel();

            return {
                exists: true,
                size: size
            };
        } else {
            return { exists: false, size: null };
        }
    } catch (error) {
        if (error.name === 'AbortError') {
            return { exists: true, size: null };
        }
        return { exists: false, size: null };
    }
}

function downloadImage(url, path) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            const file = fs.createWriteStream(path);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(path);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

bot.on("message", async (ctx, next) => {
    try {
        const isSubscribed = await handleSubscriptionCheck(ctx, bot)
        if (!isSubscribed) return

        if (ctx.message.text == "/start") {
            return await botStartMessage(ctx)
        }

        const username = ctx.from.username || "unnamed"
        const first_name = ctx.from.first_name
        const user_id = String(ctx.from.id)

        const isUserExists = await User.findOne({ where: { user_id } })

        if (!isUserExists) {
            await User.create({ username, first_name, user_id })
        }
        next()
    } catch (err) {
        console.log(err)
    }
})

bot.hears("🖼 Multik Rasm", async (ctx) => {
    try {
        await ctx.replyWithMediaGroup([
            {
                type: 'photo',
                media: "AgACAgIAAxUHaSwfrhLumIg9xPPiwVWnFO_kxyEAArIPaxseJ2FJ0vfxdqPwnqQBAAMCAAN5AAM2BA",
            },
            {
                type: 'photo',
                media: "AgACAgIAAxUHaSwfrlRyYtCrBJf4PhT6flGBa4UAArMPaxseJ2FJNpKOFO-8_qoBAAMCAAN5AAM2BA",
            }
        ])
        await ctx.reply(
            "Quyidagilardan birini tanlang:",
            Markup.inlineKeyboard(
                [
                    Markup.button.callback("Disney", "disney_photo"),
                    Markup.button.callback("Multik", "multik_photo")
                ]
            )
        );

    } catch (err) {
        console.log(err)
    }
})

bot.action("disney_photo", async (ctx) => {
    try {
        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        session[ctx.from.id]["state"] = "waiting_photo"
        session[ctx.from.id]["photo_type"] = "disney"

        await ctx.reply("Zo'r menga rasm yuboring!")
    } catch (err) {
        console.log(err)
    }
})

bot.action("multik_photo", async (ctx) => {
    try {
        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        session[ctx.from.id]["state"] = "waiting_photo"
        session[ctx.from.id]["photo_type"] = "multik"


        await ctx.reply("Zo'r menga rasm yuboring!")
    } catch (err) {
        console.log(err)
    }
})

function chunk(arr, size) {
    const res = [];
    for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
    }
    return res;
}

async function youtubeInfoFunc(ctx, message) {
    const loading1 = await ctx.reply("🤔")
    const data = await youtubeInfo(message)

    console.log(data)

    const video_id = uuidv4()

    if (!session[ctx.chat.id]) session[ctx.chat.id] = {}

    session[ctx.chat.id][video_id] = {
        title: data.title,
        thumbnail: data.thumbnail_url,
        url: message
    }

    await ctx.replyWithPhoto(
        {
            url: data.thumbnail_url
        },
        {
            caption: data.title,
            reply_markup: Markup.inlineKeyboard([
                [Markup.button.callback("🎬 Video", `youtube_video_${video_id}`)],
                [Markup.button.callback("🎶 Audio", `youtube_audio_${video_id}`)],
            ]).reply_markup
        }
    )
    ctx.deleteMessage(loading1.message_id)
        .catch((err) => console.log(err))
}

async function allVideoDownloaderFunc(ctx, message, loading) {
    const data = await allApi(message)

    const checkResult = await checkVideoAvailability(data.download_url)

    if (checkResult.exists) {
        await ctx.telegram.editMessageText(loading.chat.id, loading.message_id, null, "⏳ Yuklanmoqda...")
        const photo_name = uuidv4()
        try {
            if (!fs.existsSync('photos')) fs.mkdirSync('photos');
            await downloadImage(data.thumb, `photos/${photo_name}.jpg`)
            await createThumbnail(`photos/${photo_name}.jpg`, `photos/${photo_name}2.jpg`);
            const video_msg = await ctx.replyWithVideo(
                { url: data.download_url },
                {
                    caption: data.caption.split("\n")[0] + "\n\n📥 @barakalisovgalarbot orqali yuklandi!",
                    thumbnail: {
                        source: `photos/${photo_name}2.jpg`
                    }
                }
            )
            await Video.create({ file_id: video_msg.video.file_id.trim(), title: data.caption.split("\n")[0].trim(), url: message.trim(), type: "video" })
        } catch (err) {
            console.log(err)
        } finally {
            fs.unlink(`photos/${photo_name}.jpg`, (err) => {
                if (err) console.error(err);
            });
            fs.unlink(`photos/${photo_name}2.jpg`, (err) => {
                if (err) console.error(err);
            });
        }
    } else {
        await ctx.reply("Video topilmadi!, Qayta urinib ko'ring!")
    }
}

async function generatePhotoFunc(ctx) {
    if (!ctx.message.photo) {
        ctx.reply("Rasm yaratish bekor qilindi!")
        session[ctx.from.id]["state"] = ""
        return
    }
    const loading = await ctx.reply("🤔")

    const photos = ctx.message.photo;

    const fileId = photos[photos.length - 1].file_id;

    const data = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`)
    const dataJson = await data.json()

    const file_path = dataJson.result.file_path

    if (!file_path) {
        return ctx.reply("Rasm yuklab olib bo'lmadi qayta urinib koring")
    }

    const download_url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file_path}`

    const photo_name = uuidv4()

    try {
        await ctx.deleteMessage(loading.message_id)
    } catch (err) {
        console.log(err)
    }

    const loading2 = await ctx.reply("⌛️ Yaratilmoqda...")

    await downloadImage(download_url, `./photos/${photo_name}.jpg`)

    const photo_url = `${process.env.SERVER_IP}:${process.env.PORT || 3050}/photos/${photo_name}.jpg`

    const photolab_data = await photolab(photo_url, session[ctx.from.id]["photo_type"])

    await ctx.replyWithPhoto(
        {
            url: photolab_data.download_url
        },
        {
            caption: "@barakalisovgalarbot orqali yaratildi"
        }
    ).finally(() => {
        fs.unlink(`./uploads/${photo_name}.jpg`, (err) => {
            if (err) {
                console.log(err)
                return
            }
        });
    })

    try {
        await ctx.deleteMessage(loading2.message_id)
    } catch (err) {
        console.log(err)
    }

    session[ctx.from.id]["state"] = ""
}

bot.on("message", async (ctx) => {
    try {
        const message = ctx.message.text

        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        if (session[ctx.from.id]["state"] == "waiting_photo") {
            generatePhotoFunc(ctx)
                .catch((err) => console.log(err)) 
            return
        }

        const youtube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
        const instagram = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/;
        const tiktok = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/;
        const facebook = /^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch)\//;
        const twitter = /^(https?:\/\/)?(www\.|mobile\.)?(twitter\.com|x\.com)\//;
        const other = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/;

        if (youtube.test(message)) {
            youtubeInfoFunc(ctx, message)
                .catch((err) => console.log(err))

        } else if (instagram.test(message) || facebook.test(message) || twitter.test(message) || tiktok.test(message)) {
            const loading = await ctx.reply("🤔")

            Video.findOne({ where: { url: message.trim() } })
                .then((isVideoExists) => {
                    if (isVideoExists) {
                        ctx.replyWithVideo(isVideoExists.file_id, {
                            caption: isVideoExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi!"
                        })
                            .then(() => {
                                ctx.deleteMessage(loading.message_id)
                                    .catch((err) => console.log(err))
                            })
                            .catch((err) => {
                                allVideoDownloaderFunc(ctx, message, loading)
                                    .catch((err) => console.log(err))
                                    .finally(() => {
                                        ctx.deleteMessage(loading.message_id)
                                            .catch((err) => console.log(err))
                                    })
                            })
                    } else {
                        allVideoDownloaderFunc(ctx, message, loading)
                            .catch((err) => console.log(err))
                            .finally(() => {
                                ctx.deleteMessage(loading.message_id)
                                    .catch((err) => console.log(err))
                            })
                    }

                })
        } else if (other.test(message)) {
            await ctx.reply(`🚀 Bot faqat quyidagi platformalardan videolarni yuklay oladi:

 1️⃣ YouTube  
 2️⃣ Instagram  
 3️⃣ TikTok  
 4️⃣ Facebook  
 5️⃣ Twitter`)
        } else {
            const loading = await ctx.reply("⏳ qidirilmoqda...");

            music(message)
                .then(async (musics) => {
                    const data = musics.results

                    let text = `${message}\n\n`
                    const buttons = []

                    for (let i = 0; i < data.length; i++) {
                        if (i == 10) {
                            break
                        }
                        text += `<b>${i + 1}.</b><i>${data[i].artist} - ${data[i].title}</i> <b>${data[i].duration}</b>\n`
                        buttons.push(Markup.button.callback(i + 1, `download_music_${data[i].id}`))
                    }


                    await ctx.replyWithHTML(text, Markup.inlineKeyboard(chunk(buttons, 5)))


                })
                .catch((err) => console.log(err))
                .finally(() => {
                    ctx.deleteMessage(loading.message_id)
                        .catch((err) => console.log(err))
                })
        }
    } catch (err) {
        console.log(err)
    }
})

async function musicDownloaderFunc(ctx, url) {
    const data = await youtubeApiMusic(url)

    const music_msg = await ctx.replyWithAudio(
        { url: data.url },
        { caption: "📥 @barakalisovgalarbot orqali yuklandi!" }
    )

    await Music.create({ url: url.trim(), file_id: music_msg.audio.file_id.trim() })
}

bot.action(/download_music_(.+)/, async (ctx) => {
    try {
        const loading = await ctx.reply("📥 Musiqa yuklanmoqda...")
        const id = ctx.match[1]
        const url = `https://www.youtube.com/watch?v=${id}`;

        Music.findOne({ where: { url: url.trim() } })
            .then(async (isMusicExists) => {
                if (isMusicExists) {
                    ctx.replyWithAudio(isMusicExists.file_id, {
                        caption: "📥 @barakalisovgalarbot orqali yuklandi! ",
                    })
                        .catch((err) => {
                            console.log(err)
                            musicDownloaderFunc(ctx, url)
                                .catch((err) => console.log(err))
                                .finally(() => {
                                    ctx.deleteMessage(loading.message_id)
                                        .catch((err) => console.log(err))
                                })
                        })
                        .finally(() => {
                            ctx.deleteMessage(loading.message_id)
                                .catch((err) => console.log(err))
                        })
                } else {
                    musicDownloaderFunc(ctx, url)
                        .catch((err) => console.log(err))
                        .finally(() => {
                            ctx.deleteMessage(loading.message_id)
                                .catch((err) => console.log(err))
                        })
                }
            })
            .catch((err) => {
                console.log(err)
                ctx.deleteMessage(loading.message_id)
                    .catch((err) => console.log(err))
            })
    } catch (err) {
        console.log(err)
    }
})

async function createThumbnail(inputPath, outputPath) {
    await sharp(inputPath)
        .resize({
            width: 320,
            height: 320,
            fit: 'cover'
        })
        .toFile(outputPath);
}

async function youtubeVideoDownloaderFunc(ctx, data) {
    const video = await youtubeApi(data.url)

    const checkResult = await checkVideoAvailability(video.url)

    console.log(checkResult)

    if (checkResult.exists) {
        const photo_name = uuidv4()
        try {
            if (!fs.existsSync('photos')) fs.mkdirSync('photos');
            await downloadImage(data.thumbnail, `photos/${photo_name}.jpg`)
            await createThumbnail(`photos/${photo_name}.jpg`, `photos/${photo_name}2.jpg`);
            const video_msg = await ctx.replyWithVideo(
                {
                    url: video.url,
                },
                {
                    caption: data.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
                    thumbnail: {
                        source: `photos/${photo_name}2.jpg`,
                    }
                }
            )
            try {
                await Video.create({ file_id: video_msg.video.file_id.trim(), url: data.url.trim(), title: data.title, type: "video" })
            } catch (err) {
                console.log(err)
            }
        } catch (err) {
            console.log(err)
        } finally {
            fs.unlink(`photos/${photo_name}.jpg`, (err) => {
                if (err) console.error(err);
            });
            fs.unlink(`photos/${photo_name}2.jpg`, (err) => {
                if (err) console.error(err);
            });
        }
    }
    else {
        await ctx.reply("Video yuklab bo'lmadi! Qayta urinib ko'ring!")
    }
}

bot.action(/youtube_video_(.+)/, async (ctx) => {
    try {
        const video_id = ctx.match[1]
        if (!session[ctx.chat.id]) session[ctx.chat.id] = {}
        const data = session[ctx.chat.id][video_id]

        await ctx.editMessageCaption(data.title + "\n\n⏳ Yuklanmoqda...")
            .catch((err) => console.log(err))

        Video.findOne({ where: { url: data.url.trim(), type: "video" } })
            .then((isVideoExists) => {
                if (isVideoExists) {
                    ctx.replyWithVideo(isVideoExists.file_id, {
                        caption: isVideoExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
                    })
                        .catch((err) => {
                            youtubeVideoDownloaderFunc(ctx, data)
                                .catch((err) => console.log(err))
                        })
                        .finally(() => {
                            ctx.deleteMessage()
                                .catch((err) => console.log(err))
                        })
                } else {
                    youtubeVideoDownloaderFunc(ctx, data)
                        .catch((err) => console.log(err))
                        .finally(() => {
                            ctx.deleteMessage()
                                .catch((err) => console.log(err))
                        })
                }
            })
            .catch((err) => {
                console.log(err)
                ctx.deleteMessage()
                    .catch((err) => console.log(err))
            })
    } catch (err) {
        console.log(err)
    }
})

async function youtubeAudioDownloaderFunc(ctx, data) {
    const video = await youtubeApiMusic(data.url)

    console.log(video)

    const checkResult = await checkVideoAvailability(video.url)
    if (checkResult) {
        try {
            const audio_msg = await ctx.replyWithAudio(
                { url: video.url },
                { caption: "📥 @barakalisovgalarbot orqali yuklandi!" }
            )
            await Video.create({ file_id: audio_msg.audio.file_id.trim(), url: data.url.trim(), title: data.title || "", type: "audio" })
        } catch (err) {
            console.log(err)
        }
    } else {
        await ctx.reply("Audio topilmadi!, Qayta urinib ko'ring!")
    }
}

bot.action(/youtube_audio_(.+)/, async (ctx) => {
    try {
        const video_id = ctx.match[1]

        if (!session[ctx.chat.id]) session[ctx.chat.id] = {}
        const data = session[ctx.chat.id][video_id]

        await ctx.editMessageCaption(data.title + "\n\n⏳ Yuklanmoqda...")
            .catch((err) => console.log(err))

        Video.findOne({ where: { url: data.url.trim(), type: "audio" } })
            .then((isAudioExists) => {
                if (isAudioExists) {
                    ctx.replyWithAudio(isAudioExists.file_id, {
                        caption: isAudioExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
                    }).catch((err) => {
                        console.log(err)
                        youtubeAudioDownloaderFunc(ctx, data)
                            .catch((err) => console.log(err))
                            .finally(() => {
                                ctx.deleteMessage()
                                    .catch((err) => console.log(err))
                            })
                    })
                } else {
                    youtubeAudioDownloaderFunc(ctx, data)
                        .catch((err) => console.log(err))
                        .finally(() => {
                            ctx.deleteMessage()
                                .catch((err) => console.log(err))
                        })
                }
            })
            .catch((err) => {
                console.log(err)
                ctx.deleteMessage()
                    .catch((err) => console.log(err))
            })
    } catch (err) {
        console.log(err)
    }
})