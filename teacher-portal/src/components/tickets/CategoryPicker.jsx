// src/components/tickets/CategoryPicker.jsx
// Category cards + a subcategory dropdown that updates with the category.
import React from 'react';
import { CircleAlert } from 'lucide-react';
import { getCategoryIcon } from '../../constants/categoryIcons';

export default function CategoryPicker({
  categories,
  categoryId,
  subcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  categoryError,
  subcategoryError,
  disabled,
}) {
  const selected = categories.find((c) => c.id === categoryId);
  const subs = selected?.subcategories || [];

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled}>
        <legend className="label">
          Issue category<span className="ml-0.5 text-red-700 dark:text-red-400" aria-hidden="true">*</span>
        </legend>
        <div role="radiogroup" aria-invalid={categoryError ? 'true' : undefined} className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => {
            const Icon = getCategoryIcon(cat.code);
            const isSelected = cat.id === categoryId;
            return (
              <label
                key={cat.id}
                className={`flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors focus-within:ring-2 focus-within:ring-primary ${
                  isSelected
                    ? 'border-primary bg-primary-50 font-semibold text-primary-800 dark:border-primary-300 dark:bg-primary-500/15 dark:text-primary-100'
                    : 'border-gray-200 bg-white text-gray-800 hover:border-primary-300 dark:border-dark-border dark:bg-dark-raised dark:text-gray-100'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={cat.id}
                  checked={isSelected}
                  onChange={() => onCategoryChange(cat.id)}
                  className="sr-only"
                />
                <Icon size={18} className="shrink-0" aria-hidden="true" />
                <span className="leading-tight">{cat.name}</span>
              </label>
            );
          })}
        </div>
        {categoryError && (
          <p className="field-error">
            <CircleAlert size={13} aria-hidden="true" /> {categoryError}
          </p>
        )}
      </fieldset>

      {subs.length > 0 && (
        <div>
          <label htmlFor="subcategory" className="label">
            Subcategory<span className="ml-0.5 text-red-700 dark:text-red-400" aria-hidden="true">*</span>
          </label>
          <select
            id="subcategory"
            value={subcategoryId}
            onChange={(e) => onSubcategoryChange(e.target.value)}
            disabled={disabled}
            aria-invalid={subcategoryError ? 'true' : undefined}
            aria-describedby={subcategoryError ? 'subcategory-error' : undefined}
            className={`input ${subcategoryError ? 'input-error' : ''}`}
          >
            <option value="">Choose what best describes it…</option>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {subcategoryError && (
            <p id="subcategory-error" className="field-error">
              <CircleAlert size={13} aria-hidden="true" /> {subcategoryError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
