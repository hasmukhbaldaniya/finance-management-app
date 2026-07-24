import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type BulkUploadStatus = "validated" | "imported" | "failed";

// Story's schema used a UUID id; kept as INTEGER autoincrement instead to
// match every other table in this codebase (no UUID primary key exists
// anywhere else) — see user-stories/010-bulk-invite-employees.md's Open
// Questions. newRows/updatedRows aren't in that doc's literal column list
// either, added so /upload's response (created/updated counts) doesn't need
// a separate query against the row-level detail to reconstruct them.
export class BulkUpload extends Model<InferAttributes<BulkUpload>, InferCreationAttributes<BulkUpload>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare uploadedBy: number | null;
  declare fileName: string;
  declare status: BulkUploadStatus;
  declare totalRows: CreationOptional<number>;
  declare successRows: CreationOptional<number>;
  declare failedRows: CreationOptional<number>;
  declare newRows: CreationOptional<number>;
  declare updatedRows: CreationOptional<number>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

BulkUpload.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: true },
    fileName: { type: DataTypes.STRING, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false },
    totalRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    successRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    failedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    newRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    updatedRows: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "bulk_uploads",
    modelName: "BulkUpload",
  }
);
