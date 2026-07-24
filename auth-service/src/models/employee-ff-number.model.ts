import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class EmployeeFfNumber extends Model<InferAttributes<EmployeeFfNumber>, InferCreationAttributes<EmployeeFfNumber>> {
  declare id: CreationOptional<number>;
  declare employeeId: number;
  declare airlineId: number;
  declare ffNumber: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

EmployeeFfNumber.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    employeeId: { type: DataTypes.INTEGER, allowNull: false },
    airlineId: { type: DataTypes.INTEGER, allowNull: false },
    ffNumber: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "employee_ff_numbers",
    modelName: "EmployeeFfNumber",
  }
);
