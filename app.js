import { bot } from "./bot.js"
import { handleSubscriptionCheck } from "./handlers/subscription.js"
import { User } from "./models/users.model.js"
import { botStartMessage } from "./handlers/functions.js"
import { youtubeApi } from "./downloaders/youtube.js"
import { youtubeInfo } from "./downloaders/youtubeInfo.js"
import { allApi } from "./downloaders/all.js"
import { music } from "./downloaders/music.js"
import "./handlers/admin.js"

import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv"

import https from 'https'
import sharp from 'sharp'

dotenv.config()

export const session = {}

import fs from "fs";
import { Markup } from "telegraf"

async function downloadVideo(url, output) {
    const res = await fetch(url);

    if (!res.ok) throw new Error("Download failed: " + res.status);

    const fileStream = fs.createWriteStream(output);

    await new Promise((resolve, reject) => {
        res.body.pipeTo(
            new WritableStream({
                write(chunk) {
                    fileStream.write(chunk);
                },
                close() {
                    fileStream.end();
                    resolve();
                },
                abort(err) {
                    reject(err);
                }
            })
        );
    });

    console.log("Download finished:", output);
}

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

bot.on("message", async (ctx) => {
    try {
        const message = ctx.message.text

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
                    const data = await youtubeInfo(message)

                    console.log(data)

                    const video_id = uuidv4()

                    if (!session[ctx.chat.id]) session[ctx.from.id] = {}

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
                } catch (err) {
                    console.log(err)
                }
            } else {
                ctx.reply("Youtube video URL no'to'g'ri!, To'g'ri URL yuboring!")
            }
        } else if (instagram.test(message) || facebook.test(message) || twitter.test(message) || tiktok.test(message)) {
            const loading = await ctx.reply("⏳")
            const data = await allApi(message)

            const checkResult = await checkVideoAvailability(data.download_url)

            if (checkResult.exists) {
                try {

                    await ctx.replyWithVideo(
                        { url: data.download_url },
                        { caption: data.caption.split("\n")[0] + "\n\n📥 @barakalisovgalarbot orqali yuklandi! " }
                    );

                    await ctx.deleteMessage(loading.message_id)
                } catch (err) {
                    console.log(err)
                }
            } else {
                await ctx.reply("Video topilmadi!, Qayta urinib ko'ring!")
                ctx.deleteMessage(loading.message_id)
            }
        } else if (other.test(message)) {
            await ctx.reply(`🚀 Bot faqat quyidagi platformalardan videolarni yuklay oladi:

 1️⃣ YouTube  
 2️⃣ Instagram  
 3️⃣ TikTok  
 4️⃣ Facebook  
 5️⃣ Twitter`)
        } else {
            const loading = await ctx.reply("⏳ qidirlmoqda...");

            const data = await music(message)

            const musics = data.results

            console.log(musics)

            // let text = ""

            // for (let i = 0; i < musics.length; i++) {
            //     if (i == 10) {
            //         break
            //     }
            //     text += `<b>${i + 1})${musics[i].title}</b>\n`
            // }

            // console.log(text)
            // // await ctx.replyWithVideo(data.download_url, {
            // //     caption,
            // // })

            await ctx.deleteMessage(loading.message_id)
        }
    } catch (err) {
        console.log(err)
    }
})

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

        console.log(data)

        await ctx.editMessageCaption(data.title + "\n\n⏳ Yuklanmoqda...");

        const video = await youtubeApi(data.url)

        const checkResult = await checkVideoAvailability(video.url)

        console.log(checkResult)

        if (checkResult.exists) {
            const photo_name = uuidv4()
            try {
                await downloadImage(data.thumbnail, `photos/${photo_name}.jpg`)
                await createThumbnail(`photos/${photo_name}.jpg`,`photos/${photo_name}2.jpg` );
                await ctx.replyWithVideo(
                    {
                        url: video.url,
                    },
                    {
                        caption: data.title + "\n\n📥 @barakalisovgalarbot orqali yuklandi! ",
                        thumbnail: {
                            source: `photos/${photo_name}2.jpg`,
                        }
                    }
                );
                await ctx.deleteMessage()
            } catch (err) {
                console.log(err)
            } finally {
                fs.unlinkSync(`photos/${photo_name}.jpg`);
                fs.unlinkSync(`photos/${photo_name}2.jpg`); 
            }
        } else {
            await ctx.reply("Video yuklab bo'lmadi! Qayta urinib ko'ring!")
        }
    } catch (err) {
        console.log(err)
    }
})