import fs from 'fs';
import https from 'https';

export function fastDownload(url, outputPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(outputPath);

        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                return reject(new Error("HTTP error: " + res.statusCode));
            }

            res.pipe(file);

            file.on('finish', () => {
                file.close(() => resolve(outputPath));
            });

            file.on('error', reject);

        }).on('error', reject);
    });
}
