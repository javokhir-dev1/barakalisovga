import axios from 'axios'

import dotenv from 'dotenv';
dotenv.config()

export async function allApi(videourl) {
    try {
        const params = {
            "url": videourl
        }
        const url = 'https://saverapi.net/api/all-in-one-downloader-api'
        const headers = {
            'x-api-key': process.env.API_TOKEN,
            'Content-Type': 'application/json'
        }
        const response = await axios.get(url, { params, headers })
        return response.data

    } catch (error) {
        console.error("Xatolik yuz berdi:", error.response ? error.response.data : error.message);
    }
}