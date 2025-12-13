import { DataTypes } from "sequelize"
import { sequelize } from "../config/db.js"

export const UserLog = sequelize.define("UserLogs", {
    user_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
})