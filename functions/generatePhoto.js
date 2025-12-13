import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { downloadImage } from "./all.js";
import { photolab } from "../downloaders/photolab.js"; 
import fetch from "node-fetch";

export async function generatePhotoFunc(ctx, session) {
    if (!ctx.message.photo) {
        session[ctx.from.id].state = "";
        return ctx.reply("Rasm yaratish bekor qilindi!");
    }

    let loadingMsg;
    try {
        loadingMsg = await ctx.reply("🤔 Rasm yuklanmoqda...");
    } catch (_) { }

    try {
        const photos = ctx.message.photo;
        const fileId = photos[photos.length - 1].file_id;

        console.log(fileId)

        const tgRes = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/getFile?file_id=${fileId}`);
        const tgJson = await tgRes.json();
        console.log(tgJson)

        const file_path = tgJson?.result?.file_path;
        if (!file_path) {
            throw new Error("Rasmni olish imkonsiz");
        }

        const download_url = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file_path}`;

        console.log(download_url)
        const photoName = uuidv4();
        const localPath = `./photos/${photoName}.jpg`;

        await downloadImage(download_url, localPath);

        const photoUrl = `${process.env.SERVER_IP}:${process.env.PORT}/photos/${photoName}.jpg`;

        console.log(photoUrl)

        const photoResult = await photolab(photoUrl, session[ctx.from.id].photo_type);

        console.log(photoResult)

        await ctx.replyWithPhoto(
            { url: photoResult.download_url },
            { caption: "@barakalisovgalarbot orqali yaratildi" }
        );

        fs.unlink(localPath, () => { });

    } catch (err) {
        console.log("ERROR:", err.message);
        await ctx.reply("Xatolik yuz berdi. Iltimos, qayta urinib ko‘ring.");
    }

    try {
        await ctx.deleteMessage(loadingMsg.message_id);
    } catch (_) { }

    session[ctx.from.id].state = "";
}