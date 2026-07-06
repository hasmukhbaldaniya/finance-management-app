import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare email: string;
  declare phone: string | null;
  declare passwordHash: string;
  declare firstName: string | null;
  declare lastName: string | null;
  declare emailVerifiedAt: Date | null;
  declare mobileVerifiedAt: Date | null;
  declare registrationCompletedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mobileVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    registrationCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "users",
    modelName: "User",
  }
);
