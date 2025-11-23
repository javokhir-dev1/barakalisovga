import { bot } from "../bot.js"

import { Markup } from "telegraf"

import { session } from "../app.js"

import { Channel } from "../models/channel.model.js"

const admins = process.env.ADMINS.split(",")

bot.command("admin", async (ctx) => {
    try {
        const user_id = String(ctx.from.id)
        const username = ctx.from.username
        if (admins.includes(user_id) || admins.includes(username)) {
            ctx.replyWithHTML("<b>👋 Assalomu alaykum, Adminjon</b>",
                Markup.inlineKeyboard([
                    [Markup.button.callback("📢 Barcha kanallar", "get_channels")],
                    [Markup.button.callback("➕ Kanal qo'shish", "add_channel")],

                ])
            )
        }
    } catch (err) {
        console.log(err)
    }
})

bot.action("get_channels", async (ctx) => {
    try {
        const channels = await Channel.findAll()

        for (let i = 0; i < channels.length; i++) {
            ctx.reply(`${i + 1}-kanal: ${channels[i].channel}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback("❌ Kanalni o'chirish", `delete_channel_${channels[i].id}`)]
                ])
            )
        }
    } catch (err) {
        console.log(err)
    }
})

bot.action(/delete_channel_(\d+)/, async (ctx) => {
    try {
        const channel_id = ctx.match[1]

        await Channel.destroy({ where: { id: channel_id } })

        await ctx.answerCbQuery("Kanal muvaffaqiyatli o'chirildi ✅");
        try {
            await ctx.deleteMessage()
        } catch(err) {
            console.log(err)
        }


    } catch (err) {
        console.log(err)
    }
})

bot.action("add_channel", async (ctx) => {
    try {
        const message = await ctx.reply("Zo'r, Kanalning nomini kiriting! Misol (@testkanal)")
        if (!session[ctx.from.id]) session[ctx.from.id] = {}

        session[ctx.from.id]["state"] = "waiting_channel_name"
    } catch (err) {
        console.log(err)
    }
})

bot.on("message", async (ctx, next) => {
    try {
        if (!session[ctx.from.id]) session[ctx.from.id] = {}

        if (session[ctx.from.id]["state"] == "waiting_channel_name") {
            const channel = ctx.message.text
            await Channel.create({ channel })

            ctx.reply(`Yangi kanal qo'shildi!: ${channel}, Botni shu kanalda ADMIN qilishni unutmang!`)
            session[ctx.from.id]["state"] = ""
        } else {
            next()
        }

    } catch (err) {
        console.log(err)
    }
})