import { DataTypes, Model, type CreationOptional, type InferAttributes, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../config/database";

// The full status value domain observed in user-stories/019-trip-listing.md's
// reference data — this codebase's own Trip Creation (018) only ever writes
// "new"; the other three are reserved for future Claims/Approval stories
// (018/019's Open Questions flags "draft" specifically as still unresolved —
// nothing here currently produces it, but the column supports it since it's
// real data the listing has to be able to display and filter by).
export type TripStatus = "draft" | "new" | "pending_for_approval" | "approved_for_reimbursement";

export class Trip extends Model<InferAttributes<Trip>, InferCreationAttributes<Trip>> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare employeeId: number;
  declare name: string;
  declare startAt: Date;
  declare endAt: Date;
  declare startCityId: number;
  declare endCityId: number;
  declare status: CreationOptional<TripStatus>;
  declare totalAmount: CreationOptional<string>;
  declare approvedAmount: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Trip.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    organizationId: { type: DataTypes.INTEGER, allowNull: false },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING, allowNull: false },
    startAt: { type: DataTypes.DATE, allowNull: false },
    endAt: { type: DataTypes.DATE, allowNull: false },
    startCityId: { type: DataTypes.INTEGER, allowNull: false },
    endCityId: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: "new" },
    totalAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    approvedAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "trips",
    modelName: "Trip",
  }
);
