import https from "https";
import { PassThrough } from "stream";

export function streamAudioToTelegram(url, ctx, options = {}) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error("HTTP error: " + res.statusCode));
            }

            const pass = new PassThrough();

            // res → pass → telegram
            res.pipe(pass);

            ctx.replyWithAudio(
                { source: pass },
                options
            ).then(resolve).catch(reject);

        }).on("error", reject);
    });
}
