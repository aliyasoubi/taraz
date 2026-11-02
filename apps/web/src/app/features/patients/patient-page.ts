import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter, switchMap } from 'rxjs';

import { Notifier } from '../../core/i18n/api-error';
import type { Account, Entry, PatientDetail, Payment } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { Amount } from '../../shared/components/amount';
import { CategoryChip } from '../../shared/components/category-chip';
import { ConfirmDialog, type ConfirmData } from '../../shared/components/confirm-dialog';
import { EmptyState } from '../../shared/components/empty-state';
import { LoadError } from '../../shared/components/load-error';
import { MoneyTile } from '../../shared/components/money-tile';
import { balanceLabel } from '../../shared/labels';
import { formatMoney } from '../../shared/lib/money';
import { JalaliDayPipe } from '../../shared/pipes/money.pipe';
import { TzButton, TzIconButton, TzPage, TzPageHeader, TzSurface } from '../../shared/ui';
import { PaymentDialog, type PaymentDialogData } from '../entries/payment-dialog';
import { PatientDialog, type PatientDialogData } from './patient-dialog';

/** One patient's account: every entry, the payments against it, and what is left. */
@Component({
  selector: 'tz-patient-page',
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
    JalaliDayPipe,
    TzButton,
    TzIconButton,
    TzPage,
    TzPageHeader,
    TzSurface,
  ],
  templateUrl: './patient-page.html',
  styleUrl: './patient-page.scss',
})
export class PatientPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly i18n = inject(TranslateService);

  readonly id = input.required<string>();

  protected readonly patient = signal<PatientDetail | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  private readonly accounts = signal<Account[]>([]);

  protected readonly subtitle = computed(() => {
    const p = this.patient();
    return p?.phone ?? null;
  });

  constructor() {
    effect(() => {
      const id = this.id();
      untracked(() => this.load(id));
    });
    this.api.accounts().subscribe({ next: (accounts) => this.accounts.set(accounts) });
  }

  protected load(id: string = this.id()): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.patient(id).subscribe({
      next: (patient) => {
        this.patient.set(patient);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  protected back(): void {
    void this.router.navigate(['/patients']);
  }

  protected edit(): void {
    const p = this.patient();
    if (!p) return;
    this.dialog
      .open<PatientDialog, PatientDialogData>(PatientDialog, {
        data: { patient: { id: p.id, name: p.name, phone: p.phone, note: p.note } },
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  protected remove(): void {
    const p = this.patient();
    if (!p) return;
    this.confirm({
      title: this.i18n.instant('patient.deleteTitle'),
      message: this.i18n.instant('patient.deleteMessage', { name: p.name }),
      confirmLabel: this.i18n.instant('action.delete'),
      tone: 'warn',
    })
      .pipe(switchMap(() => this.api.deletePatient(p.id)))
      .subscribe({
        next: () => {
          this.notifier.done('patient.deleted');
          void this.router.navigate(['/patients']);
        },
        error: (err: unknown) => this.notifier.error(err),
      });
  }

  protected addPayment(entry: Entry): void {
    this.openPayment({ entry, accounts: this.accounts() });
  }

  /** What of the patient's deposits would go toward this entry. */
  protected depositsFor(entry: Entry): number {
    const held = this.patient()?.deposits ?? 0;
    return entry.category === 'deposit' ? 0 : Math.min(held, Math.max(0, entry.remaining));
  }

  protected applyDeposits(entry: Entry): void {
    this.confirm({
      title: this.i18n.instant('entry.applyDepositsTitle'),
      message: this.i18n.instant('entry.applyDepositsMessage', {
        amount: formatMoney(this.depositsFor(entry)),
      }),
      confirmLabel: this.i18n.instant('entry.applyDeposits'),
    })
      .pipe(switchMap(() => this.api.applyDeposits(entry.id)))
      .subscribe({
        next: (updated) => {
          this.notifier.done(
            updated.remaining > 0 ? 'entry.depositsApplied' : 'entry.depositsSettled',
            { amount: formatMoney(updated.remaining) },
          );
          this.load();
        },
        error: (err: unknown) => this.notifier.error(err),
      });
  }

  protected editPayment(entry: Entry, payment: Payment): void {
    this.openPayment({ entry, payment, accounts: this.accounts() });
  }

  protected removePayment(payment: Payment): void {
    this.confirm({
      title: this.i18n.instant('payment.deleteTitle'),
      message: this.i18n.instant('payment.deleteMessage', { amount: formatMoney(payment.amount) }),
      confirmLabel: this.i18n.instant('action.delete'),
      tone: 'warn',
    })
      .pipe(switchMap(() => this.api.deletePayment(payment.id)))
      .subscribe({
        next: () => {
          this.notifier.done('payment.deleted');
          this.load();
        },
        error: (err: unknown) => this.notifier.error(err),
      });
  }

  protected removeEntry(entry: Entry): void {
    this.confirm({
      title: this.i18n.instant('entry.deleteTitle'),
      message: this.i18n.instant('entry.deleteMessage'),
      confirmLabel: this.i18n.instant('action.delete'),
      tone: 'warn',
    })
      .pipe(switchMap(() => this.api.deleteEntry(entry.id)))
      .subscribe({
        next: () => {
          this.notifier.done('entry.deleted');
          this.load();
        },
        error: (err: unknown) => this.notifier.error(err),
      });
  }

  protected readonly balanceLabel = balanceLabel;

  private openPayment(data: PaymentDialogData): void {
    this.dialog
      .open<PaymentDialog, PaymentDialogData, Entry>(PaymentDialog, {
        data,
        autoFocus: 'first-tabbable',
      })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.load());
  }

  private confirm(data: ConfirmData) {
    return this.dialog
      .open<ConfirmDialog, ConfirmData, boolean>(ConfirmDialog, { data })
      .afterClosed()
      .pipe(filter((ok): ok is true => ok === true));
  }
}
