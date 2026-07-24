import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class CategoryApprovalStage extends Model<
  InferAttributes<CategoryApprovalStage>,
  InferCreationAttributes<CategoryApprovalStage>
> {
  declare id: CreationOptional<number>;
  declare approvalLevelId: number;
  declare stageNumber: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryApprovalStage.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    approvalLevelId: { type: DataTypes.INTEGER, allowNull: false },
    stageNumber: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_approval_stages",
    modelName: "CategoryApprovalStage",
  }
);
