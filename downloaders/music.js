// import axios from 'axios'

// import dotenv from 'dotenv';
// dotenv.config()

// export async function music(text) {
//     try {
//         const params = {
//             "query": text,
//             "limit": "10"
//         }
//         const url = 'https://saverapi.net/api/music-search'
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

// import ytSearch from 'yt-search';

// export async function music(query) {
//     const result = await ytSearch(query + "music");

//     if (!result.videos.length) return null;

//     return result.videos
// }

import ytSearch from 'yt-search'

export async function music(text) {
    const result = await ytSearch(text + " music");

    return result
}