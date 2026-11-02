/**
 * What an entry was for. The sheet's «شرح» column: dental treatment, an
 * implant, a deposit paid ahead of treatment, or one of the hygiene products
 * sold at the desk.
 *
 * A deposit carries no cost of its own — its payments leave the patient in
 * credit until the treatment is entered.
 */
export const CATEGORIES = [
  'treatment',
  'implant',
  'deposit',
  'toothbrush',
  'toothpaste',
  'floss',
  'waterjet',
] as const;

export type Category = (typeof CATEGORIES)[number];

export const PRODUCT_CATEGORIES: readonly Category[] = [
  'toothbrush',
  'toothpaste',
  'floss',
  'waterjet',
];

export function isProduct(category: Category): boolean {
  return PRODUCT_CATEGORIES.includes(category);
}
