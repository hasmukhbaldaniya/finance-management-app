import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type EmployeeTitle = "Mr" | "Mrs" | "Ms";
export type EmployeeGender = "Male" | "Female" | "Other";
export type EmployeeStatus = "active" | "suspended";
export type EmployeeInvitationStatus = "pending" | "registered";

// Employee is the login/session entity (see backend/CLAUDE.md's Employee vs.
// User note — that gap is now closed, there is no separate User table).
// title/gender/countryCode/contactNumber/createdBy/updatedBy are nullable
// because self-registration (registration.controller.ts) collects far less
// than the admin-invite wizard does — there's no title/gender/contact number
// upfront, and no inviting admin to record. The invite wizard's own
// application-level validation still requires those fields for admin-created
// rows; only the DB constraint relaxed.
export class Employee extends Model<InferAttributes<Employee>, InferCreationAttributes<Employee>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare title: EmployeeTitle | null;
  declare firstName: string;
  declare lastName: string;
  declare email: string;
  declare countryCode: string | null;
  declare contactNumber: string | null;
  declare dob: string | null;
  declare gender: EmployeeGender | null;
  declare employeeCode: string | null;
  declare status: CreationOptional<EmployeeStatus>;
  declare invitationStatus: CreationOptional<EmployeeInvitationStatus>;
  declare passwordHash: string | null;
  declare emailVerifiedAt: Date | null;
  declare mobileVerifiedAt: Date | null;
  declare isOwner: CreationOptional<boolean>;
  declare createdBy: number | null;
  declare updatedBy: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Employee.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: true },
    firstName: { type: DataTypes.STRING, allowNull: false },
    lastName: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    countryCode: { type: DataTypes.STRING, allowNull: true },
    contactNumber: { type: DataTypes.STRING, allowNull: true },
    dob: { type: DataTypes.DATEONLY, allowNull: true },
    gender: { type: DataTypes.STRING, allowNull: true },
    employeeCode: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "active" },
    invitationStatus: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    passwordHash: { type: DataTypes.STRING, allowNull: true },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    mobileVerifiedAt: { type: DataTypes.DATE, allowNull: true },
    isOwner: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "employees",
    modelName: "Employee",
  }
);
