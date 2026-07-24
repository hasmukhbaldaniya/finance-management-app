import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class Airline extends Model<InferAttributes<Airline>, InferCreationAttributes<Airline>> {
  declare id: CreationOptional<number>;
  declare name: string;
}

Airline.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    sequelize,
    tableName: "airlines",
    modelName: "Airline",
    timestamps: false,
  }
);
