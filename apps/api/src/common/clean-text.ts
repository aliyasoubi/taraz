import { Transform } from 'class-transformer';

import { normalizeForDisplay } from './persian-text';

/** Trims and repairs Persian keyboard artefacts; an empty string becomes null. */
export const CleanText = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? normalizeForDisplay(value) || null : value,
  );
