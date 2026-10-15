'use client';

import type { Category, ItemInput } from '@web-boilerplate/sdk-core';
import { useId, useState, type ChangeEvent } from 'react';
import { validateItemForm, type FieldErrors, type ItemFormValues } from './item-validation';

/**
 * Controlled form for an item. Validates locally, then hands a typed input to `onSubmit`.
 * Server field errors come back through `serverErrors` and appear next to the same fields.
 */
export function ItemForm({
  initial,
  categories,
  submitLabel,
  submitting,
  serverErrors,
  lockCategory = false,
  onSubmit,
}: {
  initial: ItemFormValues;
  categories: readonly Category[];
  submitLabel: string;
  submitting: boolean;
  serverErrors?: FieldErrors | undefined;
  lockCategory?: boolean;
  onSubmit: (input: ItemInput) => void;
}) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const [localErrors, setLocalErrors] = useState<FieldErrors>({});
  const errors: FieldErrors = { ...serverErrors, ...stripEmpty(localErrors) };

  const field = (name: keyof ItemFormValues) => ({
    id: `${id}-${name}`,
    name,
    value: values[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `${id}-${name}-error` : undefined,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      setLocalErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const message = (name: keyof ItemFormValues) =>
    errors[name] ? (
      <p id={`${id}-${name}-error`} className="field-error">
        {errors[name]}
      </p>
    ) : null;

  return (
    <form
      className="form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const { input, errors: found } = validateItemForm(values);
        setLocalErrors(found);
        if (input) onSubmit(input);
      }}
    >
      <div className="field">
        <label htmlFor={`${id}-name`}>Name</label>
        <input type="text" required maxLength={80} {...field('name')} />
        {message('name')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-category`}>Category</label>
        <select required disabled={lockCategory} {...field('category')}>
          <option value="">Choose…</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        {message('category')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-description`}>Description</label>
        <textarea rows={4} maxLength={2000} {...field('description')} />
        {message('description')}
      </div>
      <div className="field">
        <label htmlFor={`${id}-tags`}>Tags (comma separated)</label>
        <input type="text" {...field('tags')} />
        {message('tags')}
      </div>
      <button type="submit" className="button" disabled={submitting}>
        {submitting ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function stripEmpty(errors: FieldErrors): FieldErrors {
  return Object.fromEntries(Object.entries(errors).filter(([, value]) => Boolean(value))) as FieldErrors;
}
