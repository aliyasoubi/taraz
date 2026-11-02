import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import type { PatientSummary } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { Amount } from '../../shared/components/amount';
import { EmptyState } from '../../shared/components/empty-state';
import { LoadError } from '../../shared/components/load-error';
import { MoneyTile } from '../../shared/components/money-tile';
import { JalaliDayPipe, MoneyPipe } from '../../shared/pipes/money.pipe';
import { TzPage, TzPageHeader } from '../../shared/ui';

/** Everyone who owes today, largest debt first — the list to call through. */
@Component({
  selector: 'tz-debtors-page',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    Amount,
    EmptyState,
    LoadError,
    MoneyTile,
    JalaliDayPipe,
    MoneyPipe,
    TzPage,
    TzPageHeader,
  ],
  template: `
    <tz-page>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <tz-page-header
        [title]="'debtors.title' | translate"
        [subtitle]="'debtors.subtitle' | translate"
      />

      @if (failed()) {
        <tz-load-error [message]="'common.loadError' | translate" (retry)="load()" />
      } @else if (debtors(); as list) {
        <section class="tiles">
          <tz-money-tile
            icon="trending_down"
            tone="warn"
            [value]="total()"
            [label]="'debtors.total' | translate"
          />
          <tz-money-tile
            icon="person_alert"
            tone="warn"
            [count]="true"
            [value]="list.length"
            [label]="'monthPage.debtors' | translate"
          />
        </section>

        @if (!list.length) {
          <tz-empty-state
            icon="task_alt"
            [title]="'debtors.emptyTitle' | translate"
            [hint]="'debtors.emptyHint' | translate"
          />
        } @else {
          <ul class="people">
            @for (p of list; track p.id; let i = $index) {
              <li>
                <a class="person" [routerLink]="['/patients', p.id]">
                  <span class="person__rank">{{ i + 1 | money }}</span>
                  <span class="person__name">
                    <strong>{{ p.name }}</strong>
                    <small class="muted">
                      @if (p.phone) {
                        <a
                          class="ltr-nums phone"
                          [href]="'tel:' + p.phone"
                          (click)="$event.stopPropagation()"
                          >{{ p.phone }}</a
                        >
                        ·
                      }
                      {{ 'patients.lastActivity' | translate: { date: (p.lastActivity | jday) } }}
                    </small>
                  </span>
                  <tz-amount tone="balance" [value]="p.balance" />
                </a>
              </li>
            }
          </ul>
        }
      }
    </tz-page>
  `,
  styles: `
    .tiles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--tz-space-3);
    }
    .phone {
      color: var(--mat-sys-primary);
      text-decoration: none;
    }
  `,
})
export class DebtorsPage {
  private readonly api = inject(Api);

  protected readonly debtors = signal<PatientSummary[] | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly total = computed(() =>
    (this.debtors() ?? []).reduce((sum, p) => sum + p.balance, 0),
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.patients({ status: 'debtor', sort: 'balance', limit: 200 }).subscribe({
      next: (page) => {
        this.debtors.set(page.items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }
}
