import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class BulkUploadError extends Model<InferAttributes<BulkUploadError>, InferCreationAttributes<BulkUploadError>> {
  declare id: CreationOptional<number>;
  declare uploadId: number;
  declare rowNumber: number;
  declare employeeEmail: string | null;
  declare employeeName: string | null;
  declare errorMessage: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

BulkUploadError.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    uploadId: { type: DataTypes.INTEGER, allowNull: false },
    rowNumber: { type: DataTypes.INTEGER, allowNull: false },
    employeeEmail: { type: DataTypes.STRING, allowNull: true },
    employeeName: { type: DataTypes.STRING, allowNull: true },
    errorMessage: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "bulk_upload_errors",
    modelName: "BulkUploadError",
  }
);
