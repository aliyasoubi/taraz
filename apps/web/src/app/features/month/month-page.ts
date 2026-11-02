import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { map } from 'rxjs';

import { Notifier } from '../../core/i18n/api-error';
import type { JalaliMonth, MonthReport } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { Amount } from '../../shared/components/amount';
import { CategoryChip } from '../../shared/components/category-chip';
import { EmptyState } from '../../shared/components/empty-state';
import { LoadError } from '../../shared/components/load-error';
import { MoneyTile } from '../../shared/components/money-tile';
import { accountKindIcon, categoryInfo } from '../../shared/labels';
import {
  monthKey,
  monthOf,
  monthParam,
  parseMonthParam,
  sameMonth,
  shiftMonth,
  today,
} from '../../shared/lib/jalali';
import { persianDigits } from '../../shared/lib/money';
import { JalaliDayPipe, MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  TzButton,
  TzIconButton,
  TzPage,
  TzPageHeader,
  TzSegmentedButton,
  TzSurface,
  type SegmentOption,
} from '../../shared/ui';

type Tab = 'rows' | 'accounts' | 'doctors' | 'debtors' | 'patients';
const TABS: readonly Tab[] = ['rows', 'accounts', 'doctors', 'debtors', 'patients'];

/**
 * The month sheet, kept by the app: every cost and payment of one Jalali
 * month with the patient's balance after it, what came into each account,
 * each doctor's work, and who still owes at the month's end.
 */
@Component({
  selector: 'tz-month-page',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatMenuModule,
    MatProgressBarModule,
    TranslatePipe,
    Amount,
    CategoryChip,
    EmptyState,
    LoadError,
    MoneyTile,
    MoneyPipe,
    JalaliDayPipe,
    TzButton,
    TzIconButton,
    TzPage,
    TzPageHeader,
    TzSegmentedButton,
    TzSurface,
  ],
  templateUrl: './month-page.html',
  styleUrl: './month-page.scss',
})
export class MonthPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly i18n = inject(TranslateService);
  private readonly notifier = inject(Notifier);

  /** `?m=1405-08`; the current month when absent. */
  readonly m = input<string>();
  /** `?tab=debtors`. */
  readonly tab = input<string>();

  protected readonly thisMonth = monthOf(today());
  protected readonly month = computed(() => parseMonthParam(this.m()) ?? this.thisMonth);
  protected readonly isThisMonth = computed(() => sameMonth(this.month(), this.thisMonth));
  protected readonly activeTab = computed<Tab>(() =>
    TABS.includes(this.tab() as Tab) ? (this.tab() as Tab) : 'rows',
  );

  protected readonly report = signal<MonthReport | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly exporting = signal(false);
  private readonly knownMonths = signal<JalaliMonth[]>([]);

  protected readonly compact = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 760px)')
      .pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly tabs = computed<SegmentOption[]>(() => {
    const t = (key: string) => this.i18n.instant(key);
    return [
      { value: 'rows', label: t('monthPage.tabRows'), icon: 'receipt_long' },
      { value: 'accounts', label: t('monthPage.tabAccounts'), icon: 'account_balance' },
      { value: 'doctors', label: t('monthPage.tabDoctors'), icon: 'stethoscope' },
      { value: 'debtors', label: t('monthPage.tabDebtors'), icon: 'person_alert' },
      { value: 'patients', label: t('monthPage.tabPatients'), icon: 'groups' },
    ];
  });

  /** Months that have rows, plus this one, newest first — for the month menu. */
  protected readonly months = computed(() => {
    const all = [this.thisMonth, ...this.knownMonths()];
    const unique = all.filter((m, i) => all.findIndex((o) => sameMonth(o, m)) === i);
    return unique.sort((a, b) => b.year - a.year || b.month - a.month);
  });

  protected readonly debtors = computed(
    () => this.report()?.patients.filter((p) => p.closing > 0) ?? [],
  );

  protected readonly paidTotal = computed(() => this.report()?.totals.paid ?? 0);

  constructor() {
    effect(() => {
      const month = this.month();
      untracked(() => this.load(month));
    });
    this.api.months().subscribe({ next: (months) => this.knownMonths.set(months) });
  }

  protected monthLabel(month: JalaliMonth): string {
    return `${this.i18n.instant(monthKey(month.month))} ${persianDigits(String(month.year))}`;
  }

  protected go(month: JalaliMonth): void {
    void this.router.navigate([], {
      queryParams: { m: sameMonth(month, this.thisMonth) ? null : monthParam(month) },
      queryParamsHandling: 'merge',
    });
  }

  protected step(by: number): void {
    this.go(shiftMonth(this.month(), by));
  }

  protected selectTab(tab: string): void {
    void this.router.navigate([], {
      queryParams: { tab: tab === 'rows' ? null : tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected load(month: JalaliMonth = this.month()): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.month(month).subscribe({
      next: (report) => {
        if (sameMonth(report.month, this.month())) this.report.set(report);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  protected exportWorkbook(): void {
    const month = this.month();
    this.exporting.set(true);
    this.api.monthWorkbook(month).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `taraz-${monthParam(month)}.xlsx`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.exporting.set(false);
      },
      error: (err: unknown) => {
        this.exporting.set(false);
        this.notifier.error(err);
      },
    });
  }

  protected share(amount: number): number {
    const total = this.paidTotal();
    return total ? Math.round((amount / total) * 100) : 0;
  }

  protected percent(value: number): string {
    return persianDigits(String(value)) + '٪';
  }

  protected readonly categoryInfo = categoryInfo;
  protected readonly accountKindIcon = accountKindIcon;
}
