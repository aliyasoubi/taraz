import fa from './fa.json';

/**
 * The Persian text the API itself writes: Excel export labels, the words the
 * importer recognises in the practice's sheet, and the seed data. Everything a
 * user reads in the app lives in the web app's locale file instead.
 */
export const text = fa;

/** `{name}` placeholders filled from `vars`. */
export function fill(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    String(vars[key] ?? ''),
  );
}
