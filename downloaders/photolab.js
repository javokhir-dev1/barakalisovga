import dotenv from 'dotenv';
dotenv.config();

export async function photolab(photoUrl, type) {
    try {
        let typeId = "24302596";

        if (type === "multik") {
            typeId = "23102965";
        } else {
            typeId = "27127455";
        }

        const params = new URLSearchParams({
            id: typeId,
            photo: photoUrl
        });

        const url = `https://saverapi.net/api/photolab-api?${params.toString()}`;

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
