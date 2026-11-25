/**
 * CampusCare Issue Category Repository
 * Queries master categories and subcategories from PostgreSQL
 */
const db = require('../config/db');

/**
 * Fetch all active categories and their subcategories in hierarchical format
 */
const findAllCategoriesWithSubcategories = async () => {
  const query = `
    SELECT 
      c.id,
      c.parent_id,
      c.code,
      c.name,
      c.description
    FROM ticket_categories c
    WHERE c.is_active = true
    ORDER BY c.parent_id NULLS FIRST, c.name ASC
  `;
  const result = await db.query(query);
  const rows = result.rows;

  const topCategories = rows.filter((r) => !r.parent_id);
  const subCategories = rows.filter((r) => r.parent_id);

  return topCategories.map((cat) => ({
    id: cat.id,
    code: cat.code,
    name: cat.name,
    description: cat.description,
    subcategories: subCategories
      .filter((sub) => sub.parent_id === cat.id)
      .map((sub) => ({
        id: sub.id,
        name: sub.name,
        code: sub.code,
        description: sub.description,
      })),
  }));
};

/**
 * Find single category or subcategory by ID
 * @param {string} id
 */
const findCategoryById = async (id) => {
  const query = `
    SELECT id, parent_id, code, name, description, is_active
    FROM ticket_categories
    WHERE id = $1 AND is_active = true
    LIMIT 1
  `;
  const result = await db.query(query, [id]);
  return result.rows[0] || null;
};

module.exports = {
  findAllCategoriesWithSubcategories,
  findCategoryById,
};
