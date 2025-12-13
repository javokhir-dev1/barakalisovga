import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const Channel = sequelize.define("Channel", {
    channel: {
        type: DataTypes.STRING,
    },
})