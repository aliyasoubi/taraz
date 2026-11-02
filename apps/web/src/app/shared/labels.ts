import type { AccountKind, Category } from '../core/models/api.model';

export interface CategoryInfo {
  value: Category;
  label: string;
  icon: string;
  /** A `--tz-cat-*` tint: the label carries the meaning, the colour only groups. */
  tint: 'sky' | 'teal' | 'violet' | 'sand' | 'green' | 'plum' | 'indigo';
  group: 'treatment' | 'deposit' | 'products';
}

/** What an entry can be for, in the order the form offers them. */
export const CATEGORIES: readonly CategoryInfo[] = [
  {
    value: 'treatment',
    label: 'category.treatment',
    icon: 'dentistry',
    tint: 'sky',
    group: 'treatment',
  },
  {
    value: 'implant',
    label: 'category.implant',
    icon: 'hardware',
    tint: 'indigo',
    group: 'treatment',
  },
  { value: 'deposit', label: 'category.deposit', icon: 'savings', tint: 'sand', group: 'deposit' },
  {
    value: 'toothbrush',
    label: 'category.toothbrush',
    icon: 'brush',
    tint: 'teal',
    group: 'products',
  },
  {
    value: 'toothpaste',
    label: 'category.toothpaste',
    icon: 'sanitizer',
    tint: 'green',
    group: 'products',
  },
  { value: 'floss', label: 'category.floss', icon: 'gesture', tint: 'violet', group: 'products' },
  {
    value: 'waterjet',
    label: 'category.waterjet',
    icon: 'water_drop',
    tint: 'plum',
    group: 'products',
  },
];

export const CATEGORY_GROUPS = [
  { value: 'treatment', label: 'category.groupTreatment' },
  { value: 'deposit', label: 'category.groupDeposit' },
  { value: 'products', label: 'category.groupProducts' },
] as const;

const BY_VALUE = new Map(CATEGORIES.map((c) => [c.value, c]));

export function categoryInfo(category: Category): CategoryInfo {
  return BY_VALUE.get(category) ?? CATEGORIES[0];
}

export const ACCOUNT_KINDS: readonly { value: AccountKind; label: string; icon: string }[] = [
  { value: 'bank', label: 'accountKind.bank', icon: 'account_balance' },
  { value: 'pos', label: 'accountKind.pos', icon: 'point_of_sale' },
  { value: 'cash', label: 'accountKind.cash', icon: 'payments' },
  { value: 'person', label: 'accountKind.person', icon: 'person' },
];

export function accountKindIcon(kind: AccountKind | null): string {
  return ACCOUNT_KINDS.find((k) => k.value === kind)?.icon ?? 'help';
}

/** How a balance reads: owes, in credit, or settled. */
export type BalanceTone = 'debt' | 'credit' | 'settled';

export function balanceTone(balance: number): BalanceTone {
  return balance > 0 ? 'debt' : balance < 0 ? 'credit' : 'settled';
}

export function balanceLabel(balance: number): string {
  return balance > 0 ? 'balance.owes' : balance < 0 ? 'balance.credit' : 'balance.settled';
}
