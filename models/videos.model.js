import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const Video = sequelize.define("Video", {
    file_id: {
        type: DataTypes.STRING,
        unique: true
    },
    url: {
        type: DataTypes.STRING,
    },
    title: {
        type: DataTypes.STRING,
    },
    type: {
        type: DataTypes.STRING
    }
}, {
    indexes: [
        {
            unique: true,
            fields: ["url", "type"]
        }
    ]
})