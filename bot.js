import { Telegraf } from "telegraf";
import { sequelize } from "./config/db.js"
import dotenv from "dotenv"

dotenv.config()

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

async function startbot() {
    try {
        await sequelize.authenticate();
        await sequelize.sync({ alter: true })
        console.log("connected to database");
        console.log("bot started successfully")
        bot.launch();
    } catch (err) {
        console.log(err)
    }
}

startbot()