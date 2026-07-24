import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ExpensePaidBy = "company" | "self";

export class Expense extends Model<InferAttributes<Expense>, InferCreationAttributes<Expense>> {
  declare id: CreationOptional<number>;
  declare claimId: number;
  declare organizationId: number;
  declare categoryId: number | null;
  declare position: CreationOptional<number>;
  declare paidBy: ExpensePaidBy;
  declare fieldValues: CreationOptional<Record<string, unknown>>;
  declare amount: CreationOptional<string>;
  declare expenseDate: string | null;
  declare invoiceNumber: string | null;
  declare splitFromExpenseId: number | null;
  // 023 (AI-Powered) additions — null for every manually-created expense.
  declare sourceInvoiceFileId: number | null;
  declare sourcePageNumber: number | null;
  declare mergedFromExpenseIds: number[] | null;
  declare isRedFlagged: CreationOptional<boolean>;
  declare redFlagReason: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Expense.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    claimId: { type: DataTypes.INTEGER, allowNull: false },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    categoryId: { type: DataTypes.INTEGER, allowNull: true },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    paidBy: { type: DataTypes.STRING, allowNull: false },
    fieldValues: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    expenseDate: { type: DataTypes.DATEONLY, allowNull: true },
    invoiceNumber: { type: DataTypes.STRING, allowNull: true },
    splitFromExpenseId: { type: DataTypes.INTEGER, allowNull: true },
    sourceInvoiceFileId: { type: DataTypes.INTEGER, allowNull: true },
    sourcePageNumber: { type: DataTypes.INTEGER, allowNull: true },
    mergedFromExpenseIds: { type: DataTypes.JSONB, allowNull: true },
    isRedFlagged: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    redFlagReason: { type: DataTypes.TEXT, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "expenses",
    modelName: "Expense",
  }
);
