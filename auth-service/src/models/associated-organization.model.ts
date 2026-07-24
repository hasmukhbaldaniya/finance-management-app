import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type RegistrationType = "self_registered" | "invited";

export class AssociatedOrganization extends Model<
  InferAttributes<AssociatedOrganization>,
  InferCreationAttributes<AssociatedOrganization>
> {
  declare id: CreationOptional<number>;
  declare ownerOrganizationId: number;
  declare organizationId: number | null;
  declare contactName: string;
  declare contactEmail: string;
  declare contactPhone: string;
  declare registrationType: RegistrationType;
  declare isActive: CreationOptional<boolean>;
  declare invitedAt: Date | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

AssociatedOrganization.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    ownerOrganizationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    organizationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    contactName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contactEmail: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    contactPhone: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    registrationType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "associated_organizations",
    modelName: "AssociatedOrganization",
  }
);
