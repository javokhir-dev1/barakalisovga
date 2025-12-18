import { allApi } from "../downloaders/all.js"
import { v4 as uuidv4 } from "uuid"
import https from 'https'
import fs from "fs";
import sharp from 'sharp'
import { Video } from "../models/videos.model.js";
import { checkOrCreateFolder } from "./functions.js";
import { fastDownload } from "./fastDownload.js";

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
        .catch((err) => console.log(err))
    const photo_name = uuidv4()
    try {
        console.log(data)
        await checkOrCreateFolder("photos")
            .catch((err) => console.log(err))
        await downloadImage(data.thumb, `photos/${photo_name}.jpg`)
            .catch((err) => console.log(err))
        await createThumbnail(`photos/${photo_name}.jpg`, `photos/${photo_name}2.jpg`)
            .catch((err) => console.log(err))

        await checkOrCreateFolder("videos")
            .catch((err) => console.log(err))
            
        const video_path = `videos/${uuidv4()}.mp4`
        await fastDownload(data.download_url, video_path)
            .then(async () => {
                const video_msg = await ctx.replyWithVideo(
                    { source: video_path },
                    {
                        caption: "📥 @barakalisovgalarbot orqali yuklandi!",
                        thumbnail: {
                            source: `photos/${photo_name}2.jpg`
                        }
                    }
                )
                await Video.create({ file_id: video_msg.video.file_id.trim(), title: data.caption.split("\n")[0].trim(), url: message.trim(), type: "video" })
            })
            .catch((err) => console.log(err))
            .finally(() => {
                fs.unlink(video_path, (err) => {
                    if (err) console.error(err)
                });
            }) 
            
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
