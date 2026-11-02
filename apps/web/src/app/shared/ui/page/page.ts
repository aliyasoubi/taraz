import { Component, input } from '@angular/core';

export type PageWidth = 'wide' | 'content' | 'form' | 'narrow';

/**
 * The column every routed screen sits in: a centred, width-capped stack with
 * the app's page padding and the gap between its sections. Each screen used
 * to set these itself, and they had drifted — 16px or 20px at the top, 12px,
 * 14px or 16px on a phone, 14px or 16px between sections.
 *
 * Only the host is styled and the content is projected as-is, so a page's own
 * stylesheet still reaches its sections as direct children (`.list > *`) and
 * can add to the host through a class, e.g. the patient list fitting itself
 * to the screen height.
 *
 * Widths: `wide` for registers and the dashboard, `content` for record and
 * list pages, `form` for edit forms and settings, `narrow` for single-column
 * account forms.
 */
@Component({
  selector: 'tz-page',
  standalone: true,
  host: {
    '[attr.data-width]': 'width()',
  },
  template: `<ng-content />`,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--tz-page-gap);
      max-width: var(--tz-page-content);
      margin-inline: auto;
      padding: var(--tz-page-block-start) var(--tz-page-inline) var(--tz-page-block-end);
      /* Every screen eases in rather than snapping; keyframes in styles.scss. */
      animation: tz-enter 220ms var(--tz-ease-emphasized) backwards;

      @media (max-width: 700px) {
        padding: var(--tz-page-block-start-compact) var(--tz-page-inline-compact)
          var(--tz-page-block-end-compact);
      }
    }

    :host([data-width='wide']) {
      max-width: var(--tz-page-wide);
    }

    :host([data-width='form']) {
      max-width: var(--tz-page-form);
    }

    :host([data-width='narrow']) {
      max-width: var(--tz-page-narrow);
    }
  `,
})
export class TzPage {
  readonly width = input<PageWidth>('content');
}
