import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type EmployeeTitle = "Mr" | "Mrs" | "Ms";
export type EmployeeGender = "Male" | "Female" | "Other";
export type EmployeeStatus = "active" | "suspended";
export type EmployeeInvitationStatus = "pending" | "registered";

export class Employee extends Model<InferAttributes<Employee>, InferCreationAttributes<Employee>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare title: EmployeeTitle;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare countryCode: string;
  declare contactNumber: string;
  declare dob: string | null;
  declare gender: EmployeeGender;
  declare employeeCode: string | null;
  declare status: CreationOptional<EmployeeStatus>;
  declare invitationStatus: CreationOptional<EmployeeInvitationStatus>;
  declare userId: number | null;
  declare createdBy: number;
  declare updatedBy: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Employee.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    countryCode: { type: DataTypes.STRING, allowNull: false },
    contactNumber: { type: DataTypes.STRING, allowNull: false },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: false },
    employeeCode: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
    invitationStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    createdBy: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "employees",
    modelName: "Employee",
  }
);
