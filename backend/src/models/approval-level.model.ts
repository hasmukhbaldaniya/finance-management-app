import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class ApprovalLevel extends Model<InferAttributes<ApprovalLevel>, InferCreationAttributes<ApprovalLevel>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare module: string;
  declare level: number;
  declare approverEmployeeId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

ApprovalLevel.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    module: { type: DataTypes.STRING, allowNull: false },
    level: { type: DataTypes.INTEGER, allowNull: false },
    approverEmployeeId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "approval_levels",
    modelName: "ApprovalLevel",
  }
);
