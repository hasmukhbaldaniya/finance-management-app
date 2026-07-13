import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

export type ExpenseSplitRequestMemberStatus = "pending" | "accepted" | "rejected";

export class ExpenseSplitRequestMember extends Model<InferAttributes<ExpenseSplitRequestMember>, InferCreationAttributes<ExpenseSplitRequestMember>> {
  declare id: CreationOptional<number>;
  declare splitRequestId: number;
  declare employeeId: number;
  declare percentage: string;
  declare amount: string;
  declare isRequester: CreationOptional<boolean>;
  declare status: CreationOptional<ExpenseSplitRequestMemberStatus>;
  declare respondedAt: Date | null;
  declare resultingExpenseId: number | null;
}

ExpenseSplitRequestMember.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    splitRequestId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    percentage: { type: DataTypes.DECIMAL(5, 2), allowNull: false },
    amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    isRequester: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "pending" },
    respondedAt: { type: DataTypes.DATE, allowNull: true },
    resultingExpenseId: { type: DataTypes.INTEGER, allowNull: true },
  },
  {
    sequelize,
    tableName: "expense_split_request_members",
    modelName: "ExpenseSplitRequestMember",
    timestamps: false,
  }
);
