import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ClaimInvoiceFileType = "pdf" | "jpg" | "jpeg" | "png";

export class ClaimInvoiceFile extends Model<InferAttributes<ClaimInvoiceFile>, InferCreationAttributes<ClaimInvoiceFile>> {
  declare id: CreationOptional<number>;
  declare claimId: number;
  declare originalFileName: string;
  declare storedPath: string;
  declare fileType: ClaimInvoiceFileType;
  declare fileSizeBytes: number;
  declare pageCount: number | null;
  declare uploadedAt: CreationOptional<Date>;
}

ClaimInvoiceFile.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    claimId: { type: DataTypes.INTEGER, allowNull: false },
    originalFileName: { type: DataTypes.STRING, allowNull: false },
    storedPath: { type: DataTypes.STRING, allowNull: false },
    fileType: { type: DataTypes.STRING, allowNull: false },
    fileSizeBytes: { type: DataTypes.INTEGER, allowNull: false },
    pageCount: { type: DataTypes.INTEGER, allowNull: true },
    uploadedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: "claim_invoice_files",
    modelName: "ClaimInvoiceFile",
    timestamps: false,
  }
);
