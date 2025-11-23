import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const User = sequelize.define("User", {
    username: {
        type: DataTypes.STRING,
    },
    first_name: {
        type: DataTypes.STRING,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
})