import { Telegraf } from "telegraf";
import { sequelize } from "./config/db.js"
import dotenv from "dotenv"
dotenv.config()

import express from 'express';
import path from 'path';

const app = express();

const BOT_FOLDER = path.resolve('./')
const PHOTOS_FOLDER = path.join(BOT_FOLDER, 'photos');

app.get("/", (req, res) => {
    try {
        res.send({message: "Server started successfully"})
    } catch(err) {
        console.log(err)
    }
})

app.use('/photos', express.static(PHOTOS_FOLDER));

process.on('unhandledRejection', (reason, promise) => {
    console.error('Tutilmagan Promis Rad Etildi (unhandledRejection):', reason);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('Tutilmagan xato (uncaughtException):', err);
    process.exit(1);
});

export const bot = new Telegraf(process.env.BOT_TOKEN, {
    telegram: {
        apiRoot: process.env.BOT_API_ROOT,
        client: {
            timeout: 300000
        }
    }
})


const PORT = process.env.PORT || 3050

async function startbot() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true })
        app.listen(process.env.PORT, () => {
            console.log(`Server started on ${process.env.SERVER_IP}:${PORT}`)
        })
        console.log("connected to database");
        console.log("bot started successfully")
        bot.launch();
    } catch (err) {
        console.log(err)
    }
}

startbot()