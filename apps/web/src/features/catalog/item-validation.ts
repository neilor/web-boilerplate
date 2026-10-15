import type { ItemInput } from '@web-boilerplate/sdk-core';

export type FieldErrors = Partial<Record<'name' | 'category' | 'description' | 'tags', string>>;

export interface ItemFormValues {
  name: string;
  category: string;
  description: string;
  tags: string;
}

/**
 * Client-side checks mirror the contract limits so people get feedback before submitting.
 * The API validates again and has the final word; its field errors are shown the same way.
 */
export function validateItemForm(values: ItemFormValues): { input: ItemInput | null; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const name = values.name.trim();
  const tags = splitTags(values.tags);

  if (name.length < 2 || name.length > 80) errors.name = 'Use between 2 and 80 characters.';
  if (!values.category) errors.category = 'Pick a category.';
  if (values.description.length > 2000) errors.description = 'Use at most 2000 characters.';
  if (tags.length > 10) errors.tags = 'Use at most 10 tags.';
  else if (tags.some((tag) => tag.length > 30)) errors.tags = 'Each tag has at most 30 characters.';

  if (Object.keys(errors).length > 0) return { input: null, errors };
  return {
    input: {
      name,
      category: values.category,
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(tags.length ? { tags } : {}),
    },
    errors,
  };
}

export function splitTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** Maps API field errors (arrays per field) onto the form's single message per field. */
export function fromApiFieldErrors(fieldErrors: Readonly<Record<string, readonly string[]>>): FieldErrors {
  const errors: FieldErrors = {};
  for (const field of ['name', 'category', 'description', 'tags'] as const) {
    const message = fieldErrors[field]?.[0];
    if (message) errors[field] = message;
  }
  return errors;
}
