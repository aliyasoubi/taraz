import { ValueTransformer } from 'typeorm';

/**
 * Amounts are integer rials in a `bigint` column, which `pg` hands back as a
 * string. Rial totals stay far below 2^53, so a JS number is exact.
 */
export const bigintToNumber: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
