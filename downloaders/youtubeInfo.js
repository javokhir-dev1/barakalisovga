import dotenv from 'dotenv';
dotenv.config();

export async function youtubeInfo(videourl) {
    try {
        const params = new URLSearchParams({
            url: videourl
        });

        const url = `https://saverapi.net/api/youtube-info?${params.toString()}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'x-api-key': process.env.API_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(JSON.stringify(errorData));
        }

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Xatolik yuz berdi:", error.message);
    }
}
