import type { components, operations } from '../../generated/catalog';

type Schemas = components['schemas'];

// Public names for the generated schema types. Features import these, never the generated file.
export type Item = Schemas['Item'];
export type ItemSummary = Schemas['ItemSummary'];
export type ItemPage = Schemas['ItemPage'];
export type ItemInput = Schemas['ItemInput'];
export type ItemPatch = Schemas['ItemPatch'];
export type ItemStatus = Schemas['ItemStatus'];
export type Category = Schemas['Category'];
export type ListItemsQuery = NonNullable<operations['listItems']['parameters']['query']>;
