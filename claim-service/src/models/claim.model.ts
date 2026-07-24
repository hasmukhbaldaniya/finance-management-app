import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ClaimType = "standalone" | "trip_linked";
// "split" — created by accepting a colleague's Split Claim request (025),
// carrying just the accepting employee's own share of someone else's bill.
// Purely informational like the other two values, doesn't change behavior.
export type ClaimCreationMethod = "manual" | "ai" | "split";
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
  // True once saveExpenses has run at least once (draft or final save), or
  // immediately for a claim created via Split Claim (already assembled from
  // previously-saved expenses). An AI-Powered claim exists in this table as
  // soon as Step 1 uploads files — necessary so the AI service has
  // something to attach them to — but stays `false` here until the
  // employee actually saves Step 2; listClaims filters on this so an
  // abandoned review never shows up as a real claim.
  declare hasBeenSaved: CreationOptional<boolean>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // Backs `paranoid: true` below — deleteClaim's `claim.destroy()` sets
  // this instead of removing the row. Every default Sequelize query
  // (findAll/findOne/findByPk/etc.) automatically excludes a row with this
  // set; pass `{ paranoid: false }` to a query to see through it.
  declare deletedAt: CreationOptional<Date | null>;
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
    hasBeenSaved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    tableName: "claims",
    modelName: "Claim",
    paranoid: true,
  }
);
