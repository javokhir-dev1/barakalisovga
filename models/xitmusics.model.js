import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const XitMusic = sequelize.define("XitMusic", {
    title: {
        type: DataTypes.STRING
    },
    file_id: {
        type: DataTypes.STRING
    }
})