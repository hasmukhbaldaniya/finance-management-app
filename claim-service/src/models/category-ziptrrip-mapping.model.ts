import { DataTypes, Model, type InferAttributes, type InferCreationAttributes, type CreationOptional } from "sequelize";
import { sequelize } from "../config/database";

export class CategoryZiptrripMapping extends Model<
  InferAttributes<CategoryZiptrripMapping>,
  InferCreationAttributes<CategoryZiptrripMapping>
> {
  declare id: CreationOptional<number>;
  declare categoryId: number;
  declare ziptrripCategoryKey: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

CategoryZiptrripMapping.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: false },
    ziptrripCategoryKey: { type: DataTypes.STRING, allowNull: false },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: "category_ziptrrip_mappings",
    modelName: "CategoryZiptrripMapping",
  }
);
