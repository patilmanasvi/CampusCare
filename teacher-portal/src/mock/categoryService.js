// src/mock/categoryService.js
// Mock issue categories (from the project spec). In real mode these come from
// the backend so new categories can be added without a frontend release.
import { delay, clone } from './db';

export const MOCK_CATEGORIES = [
  {
    id: 'cat-power',
    code: 'POWER',
    name: 'Power Issues',
    subcategories: [
      { id: 'sub-not-starting', name: 'PC not starting' },
      { id: 'sub-sudden-shutdown', name: 'Sudden shutdown' },
      { id: 'sub-power-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-display',
    code: 'DISPLAY',
    name: 'Display / Monitor',
    subcategories: [
      { id: 'sub-no-display', name: 'No display' },
      { id: 'sub-flickering', name: 'Flickering' },
      { id: 'sub-distorted', name: 'Distorted screen' },
      { id: 'sub-display-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-input',
    code: 'INPUT',
    name: 'Keyboard / Mouse',
    subcategories: [
      { id: 'sub-keyboard', name: 'Keyboard not working' },
      { id: 'sub-mouse', name: 'Mouse not responding' },
      { id: 'sub-input-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-network',
    code: 'NETWORK',
    name: 'Network / Internet',
    subcategories: [
      { id: 'sub-no-internet', name: 'No internet' },
      { id: 'sub-lan', name: 'LAN disconnected' },
      { id: 'sub-network-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-software',
    code: 'SOFTWARE',
    name: 'Software Issues',
    subcategories: [
      { id: 'sub-app-not-opening', name: 'Application not opening' },
      { id: 'sub-software-error', name: 'Software error' },
      { id: 'sub-software-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-peripheral',
    code: 'PERIPHERAL',
    name: 'Peripheral Issues',
    subcategories: [
      { id: 'sub-printer', name: 'Printer' },
      { id: 'sub-speakers', name: 'Speakers' },
      { id: 'sub-usb', name: 'USB ports' },
      { id: 'sub-peripheral-other', name: 'Other' },
    ],
  },
  {
    id: 'cat-other',
    code: 'OTHER',
    name: 'Other',
    subcategories: [], // teacher describes the issue in the description
  },
];

export function findCategory(categoryId) {
  return MOCK_CATEGORIES.find((c) => c.id === categoryId) || null;
}

export function findSubcategory(category, subcategoryId) {
  return category?.subcategories.find((s) => s.id === subcategoryId) || null;
}

export const mockCategoryService = {
  async getCategories() {
    await delay(250);
    return clone(MOCK_CATEGORIES);
  },
};
