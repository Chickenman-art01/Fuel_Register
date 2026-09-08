import { integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dropdownCategoriesTable = pgTable(
  "dropdown_categories",
  {
    id: text("id").primaryKey(),
    description: text("description").notNull(),
    options: jsonb("options").$type<string[]>().notNull().default([]),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    descriptionUnique: uniqueIndex("dropdown_categories_description_unique").on(table.description),
  }),
);

export const insertDropdownCategorySchema = createInsertSchema(dropdownCategoriesTable).omit({
  createdAt: true,
  updatedAt: true,
});

export type InsertDropdownCategory = z.infer<typeof insertDropdownCategorySchema>;
export type DropdownCategory = typeof dropdownCategoriesTable.$inferSelect;
