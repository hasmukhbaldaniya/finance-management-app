import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

// Global, seeded-once catalog — no management UI, same shape as Airline.
// A curated "major cities per country" seed, not a full world-cities import
// — see user-stories/018-trip-creation.md's Open Questions.
export class City extends Model<InferAttributes<City>, InferCreationAttributes<City>> {
  declare id: CreationOptional<number>;
  declare countryId: number;
  declare name: string;
}

City.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    countryId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
  },
  {
    sequelize,
    tableName: "cities",
    modelName: "City",
    timestamps: false,
  }
);
