import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type AiExtractionLogStatus = "pending" | "completed" | "failed";

export type AiExtractionRedFlagEvaluation = {
  categoryFieldId: number;
  triggered: boolean;
  reason: string;
};

// The dedicated AI/ML audit table, per your explicit instruction — every
// call is logged here whether it succeeds, partially succeeds, or fails
// outright (023's own "The AI/ML Service" design section).
export class AiExtractionLog extends Model<InferAttributes<AiExtractionLog>, InferCreationAttributes<AiExtractionLog>> {
  declare id: CreationOptional<number>;
  declare claimInvoiceFileId: number;
  declare pageNumber: number | null;
  declare expenseId: number | null;
  declare requestedAt: Date;
  declare respondedAt: Date | null;
  declare rawRequestSummary: Record<string, unknown> | null;
  declare rawModelResponse: Record<string, unknown> | null;
  declare suggestedCategoryId: number | null;
  declare confidence: string | null;
  declare redFlagEvaluations: AiExtractionRedFlagEvaluation[] | null;
  declare status: CreationOptional<AiExtractionLogStatus>;
  declare errorMessage: string | null;
}

AiExtractionLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    claimInvoiceFileId: { type: DataTypes.INTEGER, allowNull: false },
    pageNumber: { type: DataTypes.INTEGER, allowNull: true },
    expenseId: { type: DataTypes.INTEGER, allowNull: true },
    requestedAt: { type: DataTypes.DATE, allowNull: false },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    rawRequestSummary: { type: DataTypes.JSONB, allowNull: true },
    rawModelResponse: { type: DataTypes.JSONB, allowNull: true },
    suggestedCategoryId: { type: DataTypes.INTEGER, allowNull: true },
    confidence: { type: DataTypes.DECIMAL(5, 4), allowNull: true },
    redFlagEvaluations: { type: DataTypes.JSONB, allowNull: true },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    errorMessage: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    sequelize,
    tableName: "ai_extraction_logs",
    modelName: "AiExtractionLog",
    timestamps: false,
  }
);
