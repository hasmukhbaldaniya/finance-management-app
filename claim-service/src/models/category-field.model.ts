import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export type CategoryFieldType =
  | "invoice"
  | "file_upload"
  | "amount"
  | "number"
  | "small_text"
  | "large_text"
  | "list"
  | "city_list"
  | "dropdown"
  | "radio_button"
  | "date"
  | "date_time"
  | "time"
  | "duration";

export type CategoryFieldRedFlagMode = "formula" | "ai";
export type CategoryFieldRedFlagAction = "highlight" | "block";

export type CategoryFieldConditionalVisibility = {
  dependsOnFieldId: number;
  equalsValue: string;
};

// Field-specific settings vary entirely by fieldType (14 distinct shapes) — a
// single JSONB blob avoids ~14 mostly-null columns; see
// backend/CLAUDE.md's Category Management section for the config shape per
// fieldType. Not narrowed to a discriminated union at the model layer since
// Sequelize has no way to enforce that anyway — the controller validates the
// actual shape per fieldType on write.
export type CategoryFieldConfig = Record<string, unknown>;

export class CategoryField extends Model<InferAttributes<CategoryField>, InferCreationAttributes<CategoryField>> {
  declare id: CreationOptional<number>;
  declare categoryId: number;
  declare fieldType: CategoryFieldType;
  declare fieldName: string;
  declare tooltip: string | null;
  declare isRequired: CreationOptional<boolean>;
  declare addToPolicyRules: CreationOptional<boolean>;
  declare position: CreationOptional<number>;
  declare config: CreationOptional<CategoryFieldConfig>;
  declare conditionalVisibility: CategoryFieldConditionalVisibility | null;
  declare redFlagMode: CategoryFieldRedFlagMode | null;
  declare redFlagValue: string | null;
  declare redFlagAction: CategoryFieldRedFlagAction | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryField.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    fieldType: { type: DataTypes.STRING, allowNull: false },
    fieldName: { type: DataTypes.STRING, allowNull: false },
    tooltip: { type: DataTypes.STRING, allowNull: true },
    isRequired: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    addToPolicyRules: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    conditionalVisibility: { type: DataTypes.JSONB, allowNull: true },
    redFlagMode: { type: DataTypes.STRING, allowNull: true },
    redFlagValue: { type: DataTypes.TEXT, allowNull: true },
    redFlagAction: { type: DataTypes.STRING, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_fields",
    modelName: "CategoryField",
  }
);
