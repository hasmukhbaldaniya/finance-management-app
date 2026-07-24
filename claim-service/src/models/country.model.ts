import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

// Global, seeded-once catalog — no management UI, same shape as Airline.
export class Country extends Model<InferAttributes<Country>, InferCreationAttributes<Country>> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare code: string;
}

Country.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false, unique: true },
    code: { type: DataTypes.STRING, allowNull: false, unique: true },
  },
  {
    sequelize,
    tableName: "countries",
    modelName: "Country",
    timestamps: false,
  }
);
