import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

// A minimal send-log, not a full invite/token model — see
// user-stories/008-employee-invitation.md's Open Questions. Used by this story's
// send-invite action and 009's Resend Invitation to enforce rate limits.
export class EmployeeInvite extends Model<InferAttributes<EmployeeInvite>, InferCreationAttributes<EmployeeInvite>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare sentAt: Date;
  declare sentBy: number;
}

EmployeeInvite.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    sentAt: { type: DataTypes.DATE, allowNull: false },
    sentBy: { type: DataTypes.INTEGER, allowNull: false },
  },
  {
    sequelize,
    tableName: "employee_invites",
    modelName: "EmployeeInvite",
    timestamps: false,
  }
);
