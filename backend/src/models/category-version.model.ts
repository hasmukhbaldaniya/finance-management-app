import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryWizardStep = "basicDetails" | "expenseForm" | "policiesAndApprovals" | "projectPolicies";

// A full, immutable copy of the category's configuration at this version —
// deliberately not a diff against the previous version, so viewing any past
// version never depends on replaying history (see
// user-stories/016-category-version-history.md's Data Model).
export type CategoryVersionSnapshot = Record<string, unknown>;

export class CategoryVersion extends Model<InferAttributes<CategoryVersion>, InferCreationAttributes<CategoryVersion>> {
  declare id: CreationOptional<number>;
  declare categoryId: number;
  declare majorVersion: number;
  declare minorVersion: number;
  declare isMajor: boolean;
  declare snapshot: CategoryVersionSnapshot;
  declare modifiedSteps: CreationOptional<CategoryWizardStep[]>;
  declare createdBy: number | null;
  declare createdAt: CreationOptional<Date>;
}

CategoryVersion.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    majorVersion: { type: DataTypes.INTEGER, allowNull: false },
    minorVersion: { type: DataTypes.INTEGER, allowNull: false },
    isMajor: { type: DataTypes.BOOLEAN, allowNull: false },
    snapshot: { type: DataTypes.JSONB, allowNull: false },
    modifiedSteps: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    createdBy: { type: DataTypes.INTEGER, allowNull: true },
    createdAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_versions",
    modelName: "CategoryVersion",
    updatedAt: false,
  }
);
