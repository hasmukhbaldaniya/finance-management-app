import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class EmployeeProject extends Model<InferAttributes<EmployeeProject>, InferCreationAttributes<EmployeeProject>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare projectId: number;
  declare createdAt: CreationOptional<Date>;
}

EmployeeProject.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    projectId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "employee_projects",
    modelName: "EmployeeProject",
    updatedAt: false,
  }
);
