import { Telegraf } from "telegraf";
import { sequelize } from "./config/db.js"
import dotenv from "dotenv"

dotenv.config()

export const bot = new Telegraf(process.env.BOT_TOKEN)

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