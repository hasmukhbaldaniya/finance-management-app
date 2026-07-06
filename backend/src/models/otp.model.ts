import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type OtpPurpose = "password_reset" | "email_verification" | "mobile_verification";

export class Otp extends Model<InferAttributes<Otp>, InferCreationAttributes<Otp>> {
  declare id: CreationOptional<number>;
  declare purpose: OtpPurpose;
  declare identifier: string;
  declare otpHash: string;
  declare expiresAt: Date;
  declare verifiedAt: Date | null;
  declare consumedAt: Date | null;
  declare attempts: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Otp.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    purpose: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otpHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    consumedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "otps",
    modelName: "Otp",
  }
);
