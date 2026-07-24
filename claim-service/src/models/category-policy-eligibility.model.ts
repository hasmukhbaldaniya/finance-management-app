import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryEligibilityType = "department" | "grade" | "project" | "employee";

export class CategoryPolicyEligibility extends Model<
  InferAttributes<CategoryPolicyEligibility>,
  InferCreationAttributes<CategoryPolicyEligibility>
> {
  declare id: CreationOptional<number>;
  declare policyId: number;
  declare eligibilityType: CategoryEligibilityType;
  declare entityId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryPolicyEligibility.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    policyId: { type: DataTypes.INTEGER, allowNull: false },
    eligibilityType: { type: DataTypes.STRING, allowNull: false },
    entityId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_policy_eligibilities",
    modelName: "CategoryPolicyEligibility",
  }
);
