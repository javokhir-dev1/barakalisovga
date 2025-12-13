import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const Music = sequelize.define("Music", {
    url: {
        type: DataTypes.STRING,
    },
    file_id: {
        type: DataTypes.STRING,
    },
})