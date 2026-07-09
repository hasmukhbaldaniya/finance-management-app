import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryPolicyType = "claim" | "exception" | "project";

export class CategoryPolicy extends Model<InferAttributes<CategoryPolicy>, InferCreationAttributes<CategoryPolicy>> {
  declare id: CreationOptional<number>;
  declare categoryId: number;
  declare policyType: CategoryPolicyType;
  declare name: string;
  declare position: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryPolicy.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    policyType: { type: DataTypes.STRING, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_policies",
    modelName: "CategoryPolicy",
  }
);
