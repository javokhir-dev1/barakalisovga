import { bot } from "./bot.js"
import { handleSubscriptionCheck } from "./handlers/subscription.js"

import { User } from "./models/users.model.js"
import { Video } from "./models/videos.model.js"
import { Music } from "./models/music.model.js"

import { allVideoDownloaderFunc, createThumbnail, downloadImage } from "./functions/all.js"

import { youtubeApi } from "./downloaders/youtube.js"
import { youtubeInfo } from "./downloaders/youtubeInfo.js"

import { music } from "./downloaders/music.js"
import "./handlers/admin.js"
import "./functions/all.js"

import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"

dotenv.config()

export const session = {}

import fs from "fs";
import fsp from "fs/promises";
import { Markup } from "telegraf"
import { youtubeApiMusic } from "./downloaders/youtubemusic.js"
import { photolab } from "./downloaders/photolab.js"
import { RandomUser } from "./models/randomUsers.model.js"
import { UserLog } from "./models/userLogs.js"
import { botStartMessage } from "./functions/start.js"
import { generatePhotoFunc } from "./functions/generatePhoto.js"
import { fastDownload } from "./functions/fastDownload.js"
import { checkOrCreateFolder, isLeftTimeGreater, removeHashtags } from "./functions/functions.js"
import { XitMusic } from "./models/xitmusics.model.js"

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

async function XitMusics(ctx) {
    const xitmusics = await XitMusic.findAll()

    const buttons = []

    for (let i = 0; i < xitmusics.length; i++) {
        buttons.push([Markup.button.callback(xitmusics[i].title, `xit_music_${xitmusics[i].id}`)])
    }

    await ctx.reply("Xit musiqalar ro'yxati",
        Markup.inlineKeyboard(buttons)
    )
}

bot.hears("🎧 XIT Musiqalar", async (ctx) => {
    XitMusics(ctx)
        .catch((err) => console.log(err))
})

async function sendXitMusic(ctx, music_id) {
    const audio = await XitMusic.findByPk(music_id)
    await ctx.replyWithAudio(audio.file_id)
}

bot.action(/xit_music_(.+)/, async (ctx) => {
    try {
        const music_id = ctx.match[1]
        sendXitMusic(ctx, music_id)
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

async function addUserToDatabase(ctx) {
    try {
        const user_id = String(ctx.from.id)
        const first_name = (ctx.from.first_name || "").trim()
        const last_name = (ctx.from.last_name || "").trim()
        const full_name = `${first_name} ${last_name}`.trim()

        const [user, randomUser] = await Promise.all([
            User.findOne({ where: { user_id } }),
            RandomUser.findOne({ where: { user_id } })
        ])

        if (!user) {
            await User.create({ full_name, user_id, is_blocked: "false" })
        } else if (user.is_blocked === "true") {
            await user.update({ is_blocked: "false" })
        }

        if (!randomUser) {
            await RandomUser.create({ full_name, user_id })
        }

        await UserLog.create({ user_id })
    } catch (err) {
        console.error('addUserToDatabase error:', err)
    }
}

bot.on("message", async (ctx) => {
    try {
        const message = ctx.message.text

        if (message == "/start") {
            return botStartMessage(ctx)
        }

        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        if (session[ctx.from.id].state === "waiting_photo") {
            generatePhotoFunc(ctx, session)
                .catch(err => console.log(err));

            addUserToDatabase(ctx)
                .catch(err => console.log(err));

            return;
        }
        const youtube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//;
        const instagram = /^(https?:\/\/)?(www\.)?instagram\.com\/.+/;
        const tiktok = /^(https?:\/\/)?(www\.)?tiktok\.com\/.+/;
        const facebook = /^(https?:\/\/)?(www\.|m\.)?(facebook\.com|fb\.watch)\//;
        const twitter = /^(https?:\/\/)?(www\.|mobile\.)?(twitter\.com|x\.com)\//;
        const other = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/
        const reels = /^https?:\/\/(www\.)?instagram\.com\/reel\/[A-Za-z0-9_-]+\/?(\?.*)?$/
        if (instagram.test(message)) {
            if (!reels.test(message)) {
                return ctx.reply("Instagramdan yuklashda Reels url yuboring")
            }
        }
        if (youtube.test(message)) {
            youtubeInfoFunc(ctx, message)
                .then(() => {
                    addUserToDatabase(ctx)
                        .catch((err) => console.log(err))
                })
                .catch((err) => console.log(err))

        } else if (instagram.test(message) || facebook.test(message) || twitter.test(message) || tiktok.test(message)) {
            const loading = await ctx.reply("🤔")

            Video.findOne({ where: { url: message.trim() } })
                .then(async (isVideoExists) => {
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
                    await addUserToDatabase(ctx)
                        .catch((err) => console.log(err))

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
                    const data = musics.videos

                    let text = `${message}\n\n`
                    const buttons = []

                    let count = 0

                    for (let i = 0; i < data.length; i++) {
                        if (buttons.length == 10) {
                            break
                        }
                        if (!isLeftTimeGreater(data[i].timestamp, "0:30") || isLeftTimeGreater(data[i].timestamp, "15:00")) {
                            continue
                        }
                        const title = await removeHashtags(data[i].title)
                        text += `<b>${count + 1}.</b><i>${data[i].author.name} - ${title}</i> <b>${data[i].timestamp}</b>\n`
                        buttons.push(Markup.button.callback(count + 1, `download_music_${data[i].videoId}`))
                        count++
                    }


                    await ctx.replyWithHTML(text, Markup.inlineKeyboard(chunk(buttons, 5)))
                    await addUserToDatabase(ctx)
                        .catch((err) => console.log(err))

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

    const file_path = `audios/${uuidv4()}.mp3`

    await checkOrCreateFolder("audios")

    await fastDownload(data.url, file_path)

    const music_msg = await ctx.replyWithAudio(
        { source: file_path },
        {
            caption: "📥 @barakalisovgalarbot orqali yuklandi!"
        }
    )

    await Music.create({ url: url.trim(), file_id: music_msg.audio.file_id.trim() })

    await fsp.unlink(file_path)
        .catch((err) => console.log(err))
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

async function youtubeVideoDownloaderFunc(ctx, data) {
    const video = await youtubeApi(data.url)

    const photo_name = uuidv4()
    try {
        await checkOrCreateFolder("photos")
            .catch((err) => console.log(err))
        await downloadImage(data.thumbnail, `photos/${photo_name}.jpg`)
            .catch((err) => console.log(err))
        await createThumbnail(`photos/${photo_name}.jpg`, `photos/${photo_name}2.jpg`)
            .catch((err) => console.log(err))
        await checkOrCreateFolder("videos")
            .catch((err) => console.log(err))

        const video_path = `videos/${uuidv4()}.mp4`

        await fastDownload(video.url, video_path)

        const title = removeHashtags(data.title)

        const video_msg = await ctx.replyWithVideo(
            {
                source: video_path,
            },
            {
                caption: title + "\n\n📥 @barakalisovgalarbot orqali yuklandi!",
                thumbnail: {
                    source: `photos/${photo_name}2.jpg`,
                }
            }
        )
        fsp.unlink(video_path)
            .catch((err) => console.log(err))
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
    await musicDownloaderFunc(ctx, data.url)
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