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

bot.on("message", async (ctx) => {
    try {
        const message = ctx.message.text

        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        if (session[ctx.from.id]["state"] == "waiting_photo") {
            if (!ctx.message.photo) return ctx.reply("Iltimos, rasm yuboring!")

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

            await downloadImage(download_url, `./photos/${photo_name}.jpg`)

            const photo_url = `${process.env.SERVER_IP}:${process.env.PORT || 3050}/photos/${photo_name}.jpg`

            const photolab_data = await photolab(photo_url, session[ctx.from.id]["photo_type"])

            console.log(photolab_data)
        
            return ctx.reply(session[ctx.from.id]["photo_type"])
        }

        const youtube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
        const instagram = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/;
        const tiktok = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/;
        const facebook = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:watch\/?\?v=|.+\/videos\/|reel\/)([0-9A-Za-z_-]+)/
        const twitter = /(?:https?:\/\/)?(?:www\.|mobile\.)?twitter\.com\/[A-Za-z0-9_]+\/status\/([0-9]+)/
        const other = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/;

        if (youtube.test(message)) {
            const hard_youtube = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})(?:[?&].*)?$/;
            if (hard_youtube.test(message)) {
                try {
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
                    try {
                        ctx.deleteMessage(loading1.message_id)
                    } catch (err) {
                        console.log(err)
                    }
                } catch (err) {
                    console.log(err)
                }
            } else {
                ctx.reply("Youtube video URL no'to'g'ri!, To'g'ri URL yuboring!")
            }
        } else if (instagram.test(message) || facebook.test(message) || twitter.test(message) || tiktok.test(message)) {
            const loading1 = await ctx.reply("🤔")

            const isVideoExists = await Video.findOne({ where: { url: message.trim() } })

            if (isVideoExists) {
                await ctx.replyWithVideo(isVideoExists.file_id, {
                    caption: isVideoExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi!"
                })
            } else {
                const data = await allApi(message)

                const checkResult = await checkVideoAvailability(data.download_url)

                if (checkResult.exists) {
                    try {
                        await ctx.deleteMessage(loading1.message_id)
                    } catch (err) {
                        console.log(err)
                    }
                    const loading2 = await ctx.reply("⏳ Yuklanmoqda...")
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
                        try {
                            await ctx.deleteMessage(loading2.message_id)
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
                } else {
                    await ctx.reply("Video topilmadi!, Qayta urinib ko'ring!")
                }
            }
            try {
                await ctx.deleteMessage(loading1.message_id)
            } catch (err) {
                console.log(err)
            }

        } else if (other.test(message)) {
            await ctx.reply(`🚀 Bot faqat quyidagi platformalardan videolarni yuklay oladi:

 1️⃣ YouTube  
 2️⃣ Instagram  
 3️⃣ TikTok  
 4️⃣ Facebook  
 5️⃣ Twitter`)
        } else {
            const loading = await ctx.reply("⏳ qidirilmoqda...");

            const musics = await music(message)

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

            try {
                await ctx.deleteMessage(loading.message_id)
            } catch (err) {
                console.log(err)
            }
        }
    } catch (err) {
        console.log(err)
    }
})

bot.action(/download_music_(.+)/, async (ctx) => {
    try {
        await ctx.answerCbQuery("📥 Musiqa yuklanmoqda...")
        const id = ctx.match[1]
        const url = `https://www.youtube.com/watch?v=${id}`;

        const isMusicExists = await Music.findOne({ where: { url: url.trim() } })

        if (isMusicExists) {
            await ctx.replyWithAudio(isMusicExists.file_id, {
                caption: "📥 @barakalisovgalarbot orqali yuklandi! ",
            });
        } else {
            const data = await youtubeApiMusic(url)

            const music_msg = await ctx.replyWithAudio(
                { url: data.url },
                { caption: "📥 @barakalisovgalarbot orqali yuklandi!" }
            )

            await Music.create({ url: url.trim(), file_id: music_msg.audio.file_id.trim() })
        }
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

bot.action(/youtube_video_(.+)/, async (ctx) => {
    try {
        const video_id = ctx.match[1]
        if (!session[ctx.chat.id]) session[ctx.chat.id] = {}
        const data = session[ctx.chat.id][video_id]

        try {
            await ctx.editMessageCaption(data.title + "\n\n⏳ Yuklanmoqda...");
        } catch (err) {
            console.log(err)
        }

        const isVideoExists = await Video.findOne({ where: { url: data.url.trim(), type: "video" } })

        if (isVideoExists) {
            await ctx.replyWithVideo(isVideoExists.file_id, {
                caption: isVideoExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
            });
        } else {
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

        try {
            await ctx.deleteMessage()
        } catch (err) {
            console.log(err)
        }
    } catch (err) {
        console.log(err)
    }
})

bot.action(/youtube_audio_(.+)/, async (ctx) => {
    try {
        const video_id = ctx.match[1]

        if (!session[ctx.chat.id]) session[ctx.chat.id] = {}
        const data = session[ctx.chat.id][video_id]

        try {
            await ctx.editMessageCaption(data.title + "\n\n⏳ Yuklanmoqda...");
        } catch (err) {
            console.log(err)
        }

        const isAudioExists = await Video.findOne({ where: { url: data.url.trim(), type: "audio" } })

        if (isAudioExists) {
            await ctx.replyWithAudio(isAudioExists.file_id, {
                caption: isAudioExists.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
            });
        } else {
            const video = await youtubeApiMusic(data.url)

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
        try {
            await ctx.deleteMessage()
        } catch (err) {
            console.log(err)
        }
    } catch (err) {
        console.log(err)
    }
})