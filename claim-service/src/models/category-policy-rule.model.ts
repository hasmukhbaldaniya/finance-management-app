import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryRuleType = "field_specific" | "combination";

export class CategoryPolicyRule extends Model<InferAttributes<CategoryPolicyRule>, InferCreationAttributes<CategoryPolicyRule>> {
  declare id: CreationOptional<number>;
  declare policyId: number;
  declare level: number;
  declare ruleType: CategoryRuleType;
  declare fieldId: number | null;
  declare operator: string | null;
  declare value: string | null;
  declare comparisonFieldId: number | null;
  declare comparisonValue: string | null;
  declare amountFieldId: number | null;
  declare amountOperator: string | null;
  declare amountValue: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryPolicyRule.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    policyId: { type: DataTypes.INTEGER, allowNull: false },
    level: { type: DataTypes.INTEGER, allowNull: false },
    ruleType: { type: DataTypes.STRING, allowNull: false },
    fieldId: { type: DataTypes.INTEGER, allowNull: true },
    operator: { type: DataTypes.STRING, allowNull: true },
    value: { type: DataTypes.STRING, allowNull: true },
    comparisonFieldId: { type: DataTypes.INTEGER, allowNull: true },
    comparisonValue: { type: DataTypes.STRING, allowNull: true },
    amountFieldId: { type: DataTypes.INTEGER, allowNull: true },
    amountOperator: { type: DataTypes.STRING, allowNull: true },
    amountValue: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_policy_rules",
    modelName: "CategoryPolicyRule",
  }
);
