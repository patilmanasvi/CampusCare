/**
 * CampusCare Issue Category Routes
 * Provides master categories and subcategories for ticket forms
 */
const express = require('express');
const router = express.Router();
const categoryRepository = require('../repositories/categoryRepository');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const categories = await categoryRepository.findAllCategoriesWithSubcategories();
    return res.status(200).json({
      success: true,
      items: categories,
      categories,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
