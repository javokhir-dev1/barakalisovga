import { Markup } from "telegraf"

export async function botStartMessage(ctx) {
    try {
        await ctx.replyWithHTML(`<b>Siz ushbu bot orqali har kuni turli sovg‘alarni yutib olish imkoniga egasiz!
G‘oliblar doimiy ravishda <b>@Barakali_sovga</b> kanalida e’lon qilinadi.</b>

Botdan kerakli vaqtingizda foydalanib, quyidagi xizmatlardan bemalol foydalaning:

<b>🎵 Musiqa izlash va yuklab olish</b>
<b>🔥 Eng so‘nggi xit taronalar</b>
<b>🎥 Videolar yuklab olish</b>
<b>🎨 Multik uslubidagi rasmlar yaratish</b>

Bularning barchasi — birgina botning ichida!

<b>Qanday foydalaniladi?</b>

<b>• Musiqa topish uchun: qo‘shiq nomi yoki ijrochi ismini yuboring</b>

<b>• Video yuklab olish uchun: havolani (linkni) yuboring</b>

<b>• Yoki pastdagi menyudan sizga kerakli bo‘limni tanlang</b>`,
            Markup.keyboard([["🎧 XIT Musiqalar", "🖼 Multik Rasm"]]).resize()
        )
    } catch (err) {
        console.log(err)
    }
}