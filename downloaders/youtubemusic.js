// import axios from 'axios'

import dotenv from 'dotenv';
dotenv.config()

export async function youtubeApiMusic(videourl) {
    try {
        const params = new URLSearchParams({
            url: videourl,
            farmat: 'mp3'
        });

        const url = `https://saverapi.net/api/youtube-api?${params.toString()}`;

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "x-api-key": process.env.API_TOKEN,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json();
        return data;

    } catch (error) {
        console.error("Xatolik:", error);
    }
}

// export async function youtubeApiMusic(videourl) {
//     try {
//         const params = {
//             "url": videourl,
//             "farmat": "mp3"
//         }
//         const url = 'https://saverapi.net/api/youtube-api'
//         const headers = {
//             'x-api-key': process.env.API_TOKEN,
//             'Content-Type': 'application/json'
//         }
//         const response = await axios.get(url, { params, headers })
//         return response.data

//     } catch (error) {
//         console.error("Xatolik yuz berdi:", error.response ? error.response.data : error.message);
//     }
// }