import { allApi } from "../downloaders/all.js"
import { v4 as uuidv4 } from "uuid"
import https from 'https'
import fs from "fs";
import sharp from 'sharp'
import { Video } from "../models/videos.model.js";

export function downloadImage(url, path) {
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

export async function createThumbnail(inputPath, outputPath) {
    await sharp(inputPath)
        .resize({
            width: 320,
            height: 320,
            fit: 'cover'
        })
        .toFile(outputPath);
}

export async function allVideoDownloaderFunc(ctx, message, loading) {
    const data = await allApi(message)
    await ctx.telegram.editMessageText(loading.chat.id, loading.message_id, null, "⏳ Yuklanmoqda...")
    const photo_name = uuidv4()
    try {
        if (!fs.existsSync('photos')) fs.mkdirSync('photos');
        await downloadImage(data.thumb, `photos/${photo_name}.jpg`)
        await createThumbnail(`photos/${photo_name}.jpg`, `photos/${photo_name}2.jpg`);
        const video_msg = await ctx.replyWithVideo(
            { url: data.download_url },
            {
                caption: "📥 @barakalisovgalarbot orqali yuklandi!",
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
}


// async function checkVideoAvailability(url) {
//     try {
//         const controller = new AbortController();
//         const timeout = setTimeout(() => controller.abort(), 5000);

//         const res = await fetch(url, {
//             method: 'GET',
//             signal: controller.signal
//         });

//         clearTimeout(timeout);

//         if (res.ok) {
//             const contentLength = res.headers.get('content-length');
//             const size = contentLength ? parseInt(contentLength, 10) : null;

//             res.body.cancel();

//             return {
//                 exists: true,
//                 size: size
//             };
//         } else {
//             return { exists: false, size: null };
//         }
//     } catch (error) {
//         if (error.name === 'AbortError') {
//             return { exists: true, size: null };
//         }
//         return { exists: false, size: null };
//     }
// }
