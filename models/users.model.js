import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const User = sequelize.define("User", {
    full_name: {
        type: DataTypes.STRING,
    },
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    is_blocked: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    timestamps: false  
})