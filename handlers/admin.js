import { bot } from "../bot.js"

import { Markup } from "telegraf"

import { session } from "../app.js"

import { Channel } from "../models/channel.model.js"
import { User } from "../models/users.model.js"

import pLimit from "p-limit"

const limit = pLimit(50);

import dotenv from "dotenv"
import { RandomUser } from "../models/randomUsers.model.js"
import { UserLog } from "../models/userLogs.js"

import { v4 as uuidv4 } from "uuid"

dotenv.config()

const admins = process.env.ADMINS.split(",")

import XLSX from "xlsx"
import fs from "fs"

bot.command("admin", async (ctx) => {
    try {
        const user_id = String(ctx.from.id)
        const username = ctx.from.username
        if (admins.includes(user_id) || admins.includes(username)) {
            ctx.replyWithHTML("<b>👋 Assalomu alaykum, Adminjon</b>",
                Markup.inlineKeyboard([
                    [Markup.button.callback("📢 Barcha kanallar", "get_channels")],
                    [Markup.button.callback("➕ Kanal qo'shish", "add_channel")],
                    [Markup.button.callback("📊 Statistics", "show_statistics")],
                    // [Markup.button.callback("📩 Habar yuborish", "send_message")],
                    [Markup.button.callback("📋 Userlar royxati", "random_users")],
                ])
            )
        }
    } catch (err) {
        console.log(err)
    }
})

function saveArrayToExcel(array, filePath) {
    const rows = array.map(item => [item]);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    XLSX.writeFile(workbook, filePath);
}

bot.action("random_users", async (ctx) => {
    try {
        const loading = await ctx.reply("Biroz kuting...")
        const randomUsers = await RandomUser.findAll()

        const file_name = `./document/${uuidv4()}.xlsx`

        const result = []

        for (let i = 0; i < randomUsers.length; i++) {
            const user_id = randomUsers[i].user_id
            const full_name = randomUsers[i].full_name
            const userLogs = await UserLog.findAll({ where: { user_id } })

            result.push(`${user_id} ${full_name} ${userLogs.length}`)
        }

        try {
            saveArrayToExcel(result, file_name)
            await ctx.sendDocument({ source: file_name })
        } catch (err) {
            console.log(err)
        } finally {
            await ctx.deleteMessage(loading.message_id)
            fs.unlink(file_name, (err) => {
                if (err) {
                    console.log(err)
                    return
                }
            })
        }
    } catch (err) {
        console.log(err)
    }
})

// ==================================================

const blockedUserIds = [];
const activeUserIds = []

async function blocked(telegramId) {
    blockedUserIds.push(String(telegramId))
}

async function active(telegramId) {
    activeUserIds.push(String(telegramId))
}

let count = 0

async function sendToUser(user) {
    try {
        await bot.telegram.sendMessage(user.user_id, "Salom, bu test xabari!")
        await active(user.user_id)
    } catch (err) {

        if (err.response && err.response.error_code === 429) {
            const wait = err.response.parameters.retry_after || 60;
            console.log(`Too Many Requests, ${wait}`);
            await new Promise(r => setTimeout(r, wait * 1000))
            return sendToUser(user);
        } else {
            console.log("Xatolik:", err.message);
            await blocked(user.user_id);
        }
    }

    count++
    console.log(count)

    if (blockedUserIds.length > 100) {
        await User.update(
            { is_blocked: true },
            { where: { user_id: blockedUserIds } }
        );
        blockedUserIds.length = 0
    }

    if (activeUserIds.length > 100) {
        await User.update(
            { is_blocked: false },
            { where: { user_id: activeUserIds } }
        );
        activeUserIds.length = 0
    }
}

async function sendToAll(users) {
    const jobs = users.map(user =>
        limit(() => sendToUser(user))
    );

    await Promise.all(jobs);
}

async function sendMessage(ctx) {
    const users = await User.findAll({
        attributes: ["user_id"],
    });

    const loading = await ctx.reply("Biroz kuting...");

    await sendToAll(users)

    await ctx.deleteMessage(loading.message_id)

    await ctx.reply("tugadi")
}

bot.action("send_message", async (ctx) => {
    try {
        await ctx.reply("Zo'r menga har qanday bitta habar yuboring, video, audio, rasm yoki text!")
        if (!session[ctx.from.id]) session[ctx.from.id] = {}
        session[ctx.from.id]["state"] = "waiting_message_to_send"

    } catch (err) {
        console.log(err)
    }
})

// ==================================================

async function show_statistics(ctx) {
    const loading = await ctx.reply("Biroz kuting...");

    const [allUsers, activeUsers] = await Promise.all([
        User.count(),
        User.count({ where: { is_blocked: "false" } })
    ]);

    await ctx.deleteMessage(loading.message_id)
        .catch(err => console.log(err));

    await ctx.replyWithHTML(
        `<b>All users: ${allUsers} ta\nActive users: ${activeUsers} ta</b>`
    );
}

bot.action("show_statistics", async (ctx) => {
    try {
        show_statistics(ctx)
    } catch (err) {
        console.log(err)
    }
})

// ==================================================

bot.action("get_channels", async (ctx) => {
    try {
        const channels = await Channel.findAll()

        if (channels.length == 0) {
            await ctx.reply("Hozircha majburiy kanallar mavjud emas!")
        }

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
        } catch (err) {
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
        }

        else if (session[ctx.from.id]["state"] == "waiting_message_to_send") {
            const msg = ctx.message;

            if (msg.text) {
                session[ctx.from.id]["message_info"] = {
                    type: "text",
                    file_id: "none",
                    caption: msg.text
                }
            }
            else if (msg.photo) {
                session[ctx.from.id]["message_info"] = {
                    type: "photo",
                    file_id: msg.photo[msg.photo.length - 1].file_id,
                    caption: msg.text
                }
            }
            else if (msg.video) {
                session[ctx.from.id]["message_info"] = {
                    type: "text",
                    file_id: "none",
                    caption: msg.video.file_id
                }
            }
        } else {
            next()
        }

    } catch (err) {
        console.log(err)
    }
})