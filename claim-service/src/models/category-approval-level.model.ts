import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class CategoryApprovalLevel extends Model<
  InferAttributes<CategoryApprovalLevel>,
  InferCreationAttributes<CategoryApprovalLevel>
> {
  declare id: CreationOptional<number>;
  declare policyId: number;
  declare level: number | null;
  declare isDefaultFlow: CreationOptional<boolean>;
  declare autoApprove: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryApprovalLevel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    policyId: { type: DataTypes.INTEGER, allowNull: false },
    level: { type: DataTypes.INTEGER, allowNull: true },
    isDefaultFlow: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    autoApprove: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_approval_levels",
    modelName: "CategoryApprovalLevel",
  }
);
