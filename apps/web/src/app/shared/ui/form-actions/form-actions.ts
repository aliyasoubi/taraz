import { Component, booleanAttribute, input } from '@angular/core';

/**
 * The row of buttons that ends a form — cancel, then the primary action at
 * the trailing edge.
 *
 * By default it sticks to the bottom of the screen over a fade of the page
 * colour, so Save stays in reach on a long form without hiding the field
 * being typed into. A short form that fits on one screen passes
 * `[sticky]="false"`.
 */
@Component({
  selector: 'tz-form-actions',
  standalone: true,
  host: {
    '[class.tz-form-actions--sticky]': 'sticky()',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
      justify-content: flex-end;
      gap: var(--tz-space-3);
      /*
       * An explicit width: as a sticky flex item left to shrink-to-fit, some
       * engines sized it to zero once its children were tz-button wrappers
       * rather than plain <button>s, pinning the row off-screen at the start
       * edge instead of spanning the form.
       */
      width: 100%;
      padding-block-start: var(--tz-space-3);
    }

    :host(.tz-form-actions--sticky) {
      position: sticky;
      bottom: 0;
      z-index: 2;
      padding-block: var(--tz-space-4);
      background: linear-gradient(to top, var(--tz-canvas) 60%, transparent);
    }
  `,
})
export class TzFormActions {
  readonly sticky = input(true, { transform: booleanAttribute });
}
