import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ExpenseSplitType = "percentage" | "amount";

// 025's "Split Claim" — one row per "share this expense with colleagues"
// action. One request = one original Expense (not a bundle of several),
// a deliberate scope reduction from that story doc's own data model — see
// the creating migration's own comment.
export class ExpenseSplitRequest extends Model<InferAttributes<ExpenseSplitRequest>, InferCreationAttributes<ExpenseSplitRequest>> {
  declare id: CreationOptional<number>;
  declare expenseId: number;
  declare requestedByEmployeeId: number;
  declare splitType: ExpenseSplitType;
  declare createdAt: CreationOptional<Date>;
}

ExpenseSplitRequest.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    expenseId: { type: DataTypes.INTEGER, allowNull: false },
    requestedByEmployeeId: { type: DataTypes.INTEGER, allowNull: false },
    splitType: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    tableName: "expense_split_requests",
    modelName: "ExpenseSplitRequest",
    timestamps: false,
  }
);
