import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class EmployeeCompanyAccess extends Model<
  InferAttributes<EmployeeCompanyAccess>,
  InferCreationAttributes<EmployeeCompanyAccess>
> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare organizationId: number;
  declare roleId: number;
  declare departmentId: number;
  declare gradeId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

EmployeeCompanyAccess.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    departmentId: { type: DataTypes.INTEGER, allowNull: false },
    gradeId: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "employee_company_access",
    modelName: "EmployeeCompanyAccess",
  }
);
