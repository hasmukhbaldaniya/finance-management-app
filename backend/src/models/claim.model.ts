import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ClaimType = "standalone" | "trip_linked";
export type ClaimCreationMethod = "manual" | "ai";
// This epic's own code only ever writes "draft"/"submitted" — the fuller
// display-only set mirrors Trip.status's own precedent (018), reserved for a
// future Approval story. See user-stories/022-claim-creation-manual.md's
// Overview.
export type ClaimStatus = "draft" | "submitted" | "pending_for_approval" | "ready_for_submission" | "approved_for_reimbursement";

export class Claim extends Model<InferAttributes<Claim>, InferCreationAttributes<Claim>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare employeeId: number;
  declare name: string | null;
  declare claimType: ClaimType;
  declare tripId: number | null;
  declare creationMethod: CreationOptional<ClaimCreationMethod>;
  declare status: CreationOptional<ClaimStatus>;
  declare totalAmount: CreationOptional<string>;
  declare splitFromClaimId: number | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Claim.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: true },
    claimType: { type: DataTypes.STRING, allowNull: false },
    tripId: { type: DataTypes.INTEGER, allowNull: true },
    creationMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: "manual" },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "draft" },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    splitFromClaimId: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "claims",
    modelName: "Claim",
  }
);
