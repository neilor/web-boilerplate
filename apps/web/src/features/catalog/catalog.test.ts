import { describe, expect, it } from 'vitest';
import { fromApiFieldErrors, splitTags, validateItemForm } from './item-validation';
import { parseListQuery, toSearchString } from './list-query';

describe('list query <-> URL', () => {
  it('keeps known filters and drops unknown or malformed ones', () => {
    expect(parseListQuery({ q: ' lamp ', category: 'home', status: 'nope', extra: 'x' })).toEqual({
      q: 'lamp',
      category: 'home',
    });
    expect(parseListQuery(new URLSearchParams('status=draft&cursor=abc'))).toEqual({ status: 'draft', cursor: 'abc' });
    expect(parseListQuery({ q: ['first', 'second'] })).toEqual({ q: 'first' });
  });

  it('round-trips through a stable search string', () => {
    const query = { status: 'published' as const, q: 'mug', category: 'kitchen' };
    const search = toSearchString(query);
    expect(search).toBe('?q=mug&category=kitchen&status=published');
    expect(parseListQuery(new URLSearchParams(search))).toEqual(query);
    expect(toSearchString({})).toBe('');
  });
});

describe('item form validation', () => {
  const valid = { name: 'Oak shelf', category: 'home', description: '', tags: 'Wood, wood , oak' };

  it('builds a typed input from valid values', () => {
    expect(validateItemForm(valid)).toEqual({
      input: { name: 'Oak shelf', category: 'home', tags: ['wood', 'oak'] },
      errors: {},
    });
  });

  it('reports each invalid field', () => {
    const { input, errors } = validateItemForm({
      name: 'x',
      category: '',
      description: 'y'.repeat(2001),
      tags: Array.from({ length: 11 }, (_, i) => `t${i}`).join(','),
    });
    expect(input).toBeNull();
    expect(Object.keys(errors).sort()).toEqual(['category', 'description', 'name', 'tags']);
  });

  it('dedupes and trims tags', () => {
    expect(splitTags(' A, b ,a,, ')).toEqual(['a', 'b']);
  });

  it('maps API field errors onto form fields', () => {
    expect(fromApiFieldErrors({ name: ['Already taken.', 'x'], unknown: ['?'] })).toEqual({ name: 'Already taken.' });
  });
});
