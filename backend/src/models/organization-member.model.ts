import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class OrganizationMember extends Model<
  InferAttributes<OrganizationMember>,
  InferCreationAttributes<OrganizationMember>
> {
  declare id: CreationOptional<number>;
  declare organizationId: number;
  declare userId: number;
  declare role: CreationOptional<string>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

OrganizationMember.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "owner",
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "organization_members",
    modelName: "OrganizationMember",
  }
);
