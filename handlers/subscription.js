import { bot } from "../bot.js";
import { Markup } from "telegraf";
import { Channel } from "../models/channel.model.js";
import { botStartMessage } from "../functions/start.js";

async function checkSubscription(bot, userId) {
    try {
        const results = [];
        const channels = await Channel.findAll()

        for (let i = 0; i < channels.length; i++) {
            try {
                const member = await bot.telegram.getChatMember(channels[i].channel, userId);
                if (["member", "administrator", "creator"].includes(member.status)) {
                    results.push({ channel: channels[i], channelNumber: i + 1, subscribed: true });
                } else {
                    results.push({ channel: channels[i], channelNumber: i + 1, subscribed: false });
                }
            } catch (err) {
                console.error(`⚠️ Xatolik kanal (${channels[i].channel}) uchun:`, err.message);
                results.push({ channel: channels[i], subscribed: null });
            }
        }

        return results;
    } catch (err) {
        console.error(err);
        return [];
    }
}

export async function handleSubscriptionCheck(ctx, bot) {
    try {
        const userId = ctx.from.id;
        const results = await checkSubscription(bot, userId);

        let subscribed = true;
        for (let i = 0; i < results.length; i++) {
            if (!results[i].subscribed) subscribed = false;
        }

        if (subscribed) return true;

        const buttons = [];
        for (let i = 0; i < results.length; i++) {
            if (!results[i].subscribed) {
                let inviteLink;
                try {
                    inviteLink = await ctx.telegram.exportChatInviteLink(results[i].channel.channel);
                } catch (err) {
                    inviteLink = `https://t.me/${results[i].channel.channel.replace("-100", "")}`;
                }
                buttons.push([Markup.button.url(`${results[i].channelNumber}-kanal`, inviteLink)]);
            }
        }

        buttons.push([Markup.button.callback("✅ Tekshirish", "check_subs")]);

        await ctx.reply(
            `👋 Assalomu Alaykum!
Botni ishga tushirish uchun quyidagi kanallarga obuna bo'ling!`,
            Markup.inlineKeyboard(buttons)
        );

        return false;
    } catch (err) {
        console.error(err);
        return false;
    }
}

bot.action("check_subs", async (ctx) => {
    try {
        await ctx.answerCbQuery();
        const isSubscribed = await handleSubscriptionCheck(ctx, bot);
        if (!isSubscribed) return

        await botStartMessage(ctx)
    } catch (err) {
        console.error(err);
    }
});