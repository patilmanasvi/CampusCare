// src/services/categoryService.js
import api from './api';
import { ENDPOINTS } from './endpoints';
import { USE_MOCK_API } from '../config/env';
import { mockCategoryService } from '../mock/categoryService';

// Expected: [{ id, code, name, subcategories: [{ id, name }] }]
const realCategoryService = {
  async getCategories() {
    const { data } = await api.get(ENDPOINTS.categories);
    return data?.items ?? data;
  },
};

export const categoryService = USE_MOCK_API ? mockCategoryService : realCategoryService;
