import { bot } from "./bot.js"

import "./handlers/admin.js"

import { handleSubscriptionCheck } from "./handlers/subscription.js"

export const session = {}

import { User } from "./models/users.model.js"

import { botStartMessage } from "./handlers/functions.js"

import { youtubeApi } from "./downloaders/youtube.js"
import { allApi } from "./downloaders/all.js"

import axios from "axios"
import { music } from "./downloaders/music.js"

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
                const loading = await ctx.reply("⏳ yuklanmoqda...");

                const data = await youtubeApi(message)

                console.log(data)

                setTimeout(async () => {
                    await ctx.replyWithVideo(
                        { url: data.url },
                        {
                            caption: data.title + "\n\n@barakalisovgalartestbot Orqali yuklab olindi!"
                        }
                    );
                }, 2000)

                try {
                    await ctx.deleteMessage(loading.message_id)
                } catch (err) {
                    console.log(err)
                }

            } else {
                ctx.reply("Invalid url")
            }
        } else if (instagram.test(message) || facebook.test(message) || twitter.test(message) || tiktok.test(message)) {
            const loading = await ctx.reply("⏳ yuklanmoqda...");

            const data = await allApi(message)

            let caption = ""

            if (data.caption) {
                caption = data.caption.split("\n")[0]
            }

            await ctx.replyWithVideo(data.download_url, {
                caption,
            })

            await ctx.deleteMessage(loading.message_id)
        } else if (other.test(message)) {
            await ctx.reply("Bot faqat ushbu platformalardan yuklay oladi: \n1)Youtube\n2)Instagram\n3)Tiktok\n4)Facebook\n5)Twitter")
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