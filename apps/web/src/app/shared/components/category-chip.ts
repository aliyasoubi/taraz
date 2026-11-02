import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';

import type { Category } from '../../core/models/api.model';
import { categoryInfo } from '../labels';

/** What an entry was for, as a small tinted label. */
@Component({
  selector: 'tz-category-chip',
  standalone: true,
  imports: [MatIconModule, TranslatePipe],
  template: `
    <mat-icon aria-hidden="true">{{ info().icon }}</mat-icon>
    <span>{{ info().label | translate }}</span>
  `,
  host: {
    '[style.--chip-bg]': "'var(--tz-cat-' + info().tint + '-bg)'",
    '[style.--chip-fg]': "'var(--tz-cat-' + info().tint + '-fg)'",
  },
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 10px 2px 8px;
      border-radius: var(--mat-sys-corner-full);
      background: var(--chip-bg);
      color: var(--chip-fg);
      font: var(--mat-sys-label-medium);
      white-space: nowrap;
      line-height: 22px;
    }
    mat-icon {
      font-size: var(--tz-icon-xs);
    }
  `,
})
export class CategoryChip {
  readonly category = input.required<Category>();
  protected readonly info = computed(() => categoryInfo(this.category()));
}
