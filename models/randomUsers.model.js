import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const RandomUser = sequelize.define("RandomUser", {
    full_name: {
        type: DataTypes.STRING,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
})