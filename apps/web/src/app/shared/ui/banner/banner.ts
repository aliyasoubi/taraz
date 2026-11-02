import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export type BannerTone = 'neutral' | 'warning' | 'error';
export type BannerSize = 'default' | 'compact';

/**
 * The app's one callout: a tonal box with a leading icon that says "read
 * this first" — a patient's medical history, a failed load, a sign-in error,
 * a register number that belongs to someone else. Each screen used to draw
 * its own, with its own padding, radius and icon size; this is that box once.
 *
 * Tonal, never outlined: the container colour carries the meaning, and the
 * tones follow the same fixed-hue status tokens as `tz-status-chip`.
 * `compact` is for a callout inside a card or list row.
 *
 * The role belongs to the caller — `role="alert"` for something that just
 * happened (a failed sign-in), `role="note"` for standing information — and
 * goes on the `<tz-banner>` element itself. An element marked
 * `tzBannerAction` is placed at the trailing edge, e.g. a retry button.
 */
@Component({
  selector: 'tz-banner',
  standalone: true,
  imports: [MatIconModule],
  host: {
    '[attr.data-tone]': 'tone()',
    '[attr.data-size]': 'size()',
  },
  template: `
    @if (icon()) {
      <mat-icon class="tz-banner__icon" aria-hidden="true">{{ icon() }}</mat-icon>
    }
    <div class="tz-banner__body">
      @if (title()) {
        <strong class="tz-banner__title">{{ title() }}</strong>
      }
      <ng-content />
    </div>
    <div class="tz-banner__action"><ng-content select="[tzBannerAction]" /></div>
  `,
  styles: `
    :host {
      --_icon: var(--mat-sys-on-surface-variant);

      display: flex;
      align-items: flex-start;
      flex-wrap: wrap;
      gap: var(--tz-space-3);
      padding: var(--tz-space-3) var(--tz-space-4);
      border-radius: var(--mat-sys-corner-large);
      background: var(--mat-sys-surface-container-high);
      color: var(--mat-sys-on-surface);
      font: var(--mat-sys-body-medium);
      line-height: 1.8;
    }

    :host([data-tone='warning']) {
      --_icon: currentColor;
      background: var(--tz-warning-container);
      color: var(--tz-on-warning-container);
    }

    :host([data-tone='error']) {
      --_icon: var(--mat-sys-error);
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }

    :host([data-size='compact']) {
      gap: var(--tz-space-2);
      padding: var(--tz-space-2) var(--tz-space-3);
      border-radius: var(--mat-sys-corner-medium);
      font: var(--mat-sys-body-small);
      line-height: 1.7;
    }

    .tz-banner__icon {
      flex: 0 0 auto;
      font-size: var(--tz-icon-md);
      color: var(--_icon);
      /* Centre the glyph on the first line of text rather than the box. */
      margin-block-start: calc((1lh - 1em) / 2);
    }

    :host([data-size='compact']) .tz-banner__icon {
      font-size: var(--tz-icon-sm);
    }

    .tz-banner__body {
      flex: 1 1 16rem;
      min-width: 0;
    }

    .tz-banner__title {
      display: block;
      font-weight: 700;
    }

    .tz-banner__action {
      flex: 0 0 auto;
      align-self: center;
    }

    /* No action projected: take no room, and no gap beside it. */
    .tz-banner__action:empty {
      display: none;
    }
  `,
})
export class TzBanner {
  readonly tone = input<BannerTone>('neutral');
  readonly size = input<BannerSize>('default');
  readonly icon = input<string | null>(null);
  readonly title = input<string | null>(null);
}
