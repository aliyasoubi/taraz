import { Component, ViewEncapsulation } from '@angular/core';

/**
 * The grid a form section lays its fields out on: as many ~230px columns as
 * fit, one on a phone. A field that needs the whole row — an address, notes,
 * a choice that shapes the rest of the form — takes the class
 * `tz-field-grid__full`.
 *
 * Unencapsulated on purpose: the full-row rule has to reach the projected
 * fields, which carry the page's style scope, not this one's. Every selector
 * starts at `tz-field-grid`, so nothing leaks beyond it.
 */
@Component({
  selector: 'tz-field-grid',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `<ng-content />`,
  styles: `
    tz-field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
      /* Row gap is small: each field reserves its own hint/error line. */
      gap: var(--tz-space-1) var(--tz-space-4);
    }

    tz-field-grid > .tz-field-grid__full {
      grid-column: 1 / -1;
    }
  `,
})
export class TzFieldGrid {}
