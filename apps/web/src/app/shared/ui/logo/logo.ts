import { Component, input } from '@angular/core';

/**
 * The app's mark: a balance beam over a tooth-shaped base — «تراز» means
 * "balance", and every screen is about one. Drawn in the theme's primary
 * colours so it follows light and dark.
 */
@Component({
  selector: 'tz-logo',
  standalone: true,
  template: `
    <svg
      viewBox="0 0 48 48"
      [attr.width]="size()"
      [attr.height]="size()"
      [attr.aria-label]="label() || null"
      [attr.aria-hidden]="label() ? null : 'true'"
      [attr.role]="label() ? 'img' : null"
    >
      <rect width="48" height="48" rx="14" class="tz-logo__tile" />
      <path
        class="tz-logo__mark"
        d="M24 11v4M12 17h24M16 17l-4 9h8zM32 17l-4 9h8z"
        fill="none"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        class="tz-logo__base"
        d="M17 31c0-2 2-3 4-3h6c2 0 4 1 4 3 0 3-1 4-2 7-.4 1.2-1.8 1.2-2.2 0l-1-3c-.3-.8-1.3-.8-1.6 0l-1 3c-.4 1.2-1.8 1.2-2.2 0-1-3-2-4-2-7z"
      />
      <circle cx="24" cy="13" r="2.4" class="tz-logo__base" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      flex: none;
    }
    .tz-logo__tile {
      fill: var(--mat-sys-primary);
    }
    .tz-logo__mark {
      stroke: var(--mat-sys-on-primary);
    }
    .tz-logo__base {
      fill: var(--mat-sys-on-primary);
    }
  `,
})
export class TzLogo {
  /** Rendered edge in px. */
  readonly size = input(32);
  /** Accessible name; empty when a visible title sits beside it. */
  readonly label = input('');
}
