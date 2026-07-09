import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

// approvers sharing the same logicGroup within a stage are OR'd together
// (any one suffices); different logicGroup values within the same stage are
// AND'd together (every group must have at least one approver approve) — see
// backend/CLAUDE.md's Category Management section for how "+OR"/"+AND" map
// onto this.
export class CategoryApprovalStageApprover extends Model<
  InferAttributes<CategoryApprovalStageApprover>,
  InferCreationAttributes<CategoryApprovalStageApprover>
> {
  declare id: CreationOptional<number>;
  declare stageId: number;
  declare employeeId: number;
  declare logicGroup: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryApprovalStageApprover.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    stageId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    logicGroup: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_approval_stage_approvers",
    modelName: "CategoryApprovalStageApprover",
  }
);
