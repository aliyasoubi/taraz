import { Component, DestroyRef, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormArray, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged, forkJoin, of, startWith, switchMap } from 'rxjs';

import { Notifier } from '../../core/i18n/api-error';
import type {
  Account,
  Category,
  Doctor,
  Entry,
  EntryInput,
  PatientSummary,
} from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { Amount } from '../../shared/components/amount';
import { CATEGORIES, CATEGORY_GROUPS, balanceLabel, categoryInfo } from '../../shared/labels';
import { fromIsoDay, toIsoDay, today } from '../../shared/lib/jalali';
import { formatMoney } from '../../shared/lib/money';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  TzBanner,
  TzButton,
  TzDateField,
  TzFieldGrid,
  TzFormActions,
  TzIconButton,
  TzMoneyField,
  TzPage,
  TzPageHeader,
  TzSurface,
  TzTextField,
  type TextFieldOption,
} from '../../shared/ui';
import { PaymentFields, paymentForm, paymentInput, type PaymentForm } from './payment-fields';

/**
 * One row of the book: pick or name the patient, say what the cost was for
 * and who treated them, then whatever was paid — by whom, from where, into
 * which account. Editing an entry changes the cost part; its payments are
 * edited on the patient's page.
 */
@Component({
  selector: 'tz-entry-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    Amount,
    MoneyPipe,
    PaymentFields,
    TzBanner,
    TzButton,
    TzDateField,
    TzFieldGrid,
    TzFormActions,
    TzIconButton,
    TzMoneyField,
    TzPage,
    TzPageHeader,
    TzSurface,
    TzTextField,
  ],
  templateUrl: './entry-form.html',
  styleUrl: './entry-form.scss',
})
export class EntryForm implements OnInit {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly notifier = inject(Notifier);
  private readonly destroyRef = inject(DestroyRef);

  /** Route `entries/:id/edit`. */
  readonly id = input<string>();
  /** `?patient=<id>` — open with this patient already chosen. */
  readonly patient = input<string>();

  protected readonly categories = CATEGORIES;
  protected readonly groups = CATEGORY_GROUPS;

  protected readonly doctors = signal<Doctor[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly chosen = signal<PatientSummary | null>(null);
  protected readonly editing = signal<Entry | null>(null);
  protected readonly loading = signal(true);
  protected readonly busy = signal(false);

  protected readonly form = new FormGroup({
    patientName: new FormControl('', { nonNullable: true }),
    patientPhone: new FormControl('', { nonNullable: true }),
    category: new FormControl<Category>('treatment', { nonNullable: true }),
    doctorId: new FormControl('', { nonNullable: true }),
    date: new FormControl<Date | null>(today(), Validators.required),
    amount: new FormControl<number | null>(null),
    description: new FormControl('', { nonNullable: true }),
    payments: new FormArray<PaymentForm>([paymentForm()]),
  });

  private readonly value = toSignal(this.form.valueChanges.pipe(startWith(null)), {
    initialValue: null,
  });

  protected readonly category = computed(() => {
    this.value();
    return this.form.controls.category.value;
  });
  protected readonly isDeposit = computed(() => this.category() === 'deposit');

  protected readonly cost = computed(() => {
    this.value();
    return this.isDeposit() ? 0 : (this.form.controls.amount.value ?? 0);
  });

  protected readonly paidNow = computed(() => {
    this.value();
    return this.form.controls.payments.controls.reduce(
      (sum, p) => sum + (p.controls.amount.value ?? 0),
      0,
    );
  });

  protected readonly remaining = computed(() => this.cost() - this.paidNow());
  protected readonly overpaid = computed(() => !this.isDeposit() && this.remaining() < 0);

  /** Whether the patient's deposits go toward this entry, when there are any. */
  protected readonly useDeposits = signal(true);

  /** What of the patient's deposits would go toward a new treatment entry. */
  protected readonly depositsOffer = computed(() => {
    const held = this.chosen()?.deposits ?? 0;
    if (!held || this.editing() || categoryInfo(this.category()).group !== 'treatment') return 0;
    return Math.min(held, Math.max(0, this.remaining()));
  });

  protected readonly depositsApplied = computed(() =>
    this.useDeposits() ? this.depositsOffer() : 0,
  );

  /** What the patient will owe once this is saved. */
  protected readonly balanceAfter = computed(() => {
    const before = this.chosen()?.balance ?? 0;
    const editing = this.editing();
    if (editing) return before - editing.amount + this.cost();
    return before + this.remaining();
  });

  protected readonly newPatientName = computed(() => {
    this.value();
    return this.chosen() ? '' : this.form.controls.patientName.value.trim();
  });

  protected readonly activeDoctors = computed(() => {
    this.value();
    const selected = this.form.controls.doctorId.value;
    return this.doctors().filter((d) => d.active || d.id === selected);
  });

  protected readonly suggestions = toSignal(
    this.form.controls.patientName.valueChanges.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) =>
        q.trim() && !this.chosen()
          ? this.api.patients({ q: q.trim(), limit: 8, sort: 'name' })
          : of(null),
      ),
    ),
    { initialValue: null },
  );

  private chosenFrom: PatientSummary[] = [];

  protected readonly patientOptions = computed<TextFieldOption[]>(() => {
    const page = this.suggestions();
    this.chosenFrom = page?.items ?? [];
    return this.chosenFrom.map((p) => ({
      id: p.id,
      value: p.name,
      label: p.name,
      meta: p.phone ?? (p.balance ? formatMoney(p.balance) : undefined),
    }));
  });

  ngOnInit(): void {
    const entryId = this.id();
    const patientId = this.patient();
    const entry$ = entryId ? this.api.entry(entryId) : of(null);
    forkJoin({ doctors: this.api.doctors(), accounts: this.api.accounts(), entry: entry$ })
      .pipe(
        switchMap(({ doctors, accounts, entry }) => {
          this.doctors.set(doctors);
          this.accounts.set(accounts);
          if (entry) this.fillFrom(entry);
          const pid = entry?.patientId ?? patientId;
          return pid ? this.api.patient(pid) : of(null);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (patient) => {
          if (patient) this.choose(patient);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.notifier.error(err);
        },
      });
  }

  private fillFrom(entry: Entry): void {
    this.editing.set(entry);
    this.form.controls.payments.clear();
    this.form.patchValue({
      category: entry.category,
      doctorId: entry.doctor?.id ?? '',
      date: fromIsoDay(entry.date),
      amount: entry.amount,
      description: entry.description ?? '',
    });
  }

  protected onPatientPicked(option: TextFieldOption): void {
    const patient = this.chosenFrom.find((p) => p.id === option.id);
    if (patient) this.choose(patient);
  }

  private choose(patient: PatientSummary): void {
    this.chosen.set(patient);
    this.form.controls.patientName.setValue(patient.name, { emitEvent: false });
  }

  protected changePatient(): void {
    this.chosen.set(null);
    this.form.controls.patientName.setValue('');
  }

  protected setCategory(category: Category): void {
    this.form.controls.category.setValue(category);
  }

  protected setDoctor(id: string): void {
    this.form.controls.doctorId.setValue(this.form.controls.doctorId.value === id ? '' : id);
  }

  protected addPayment(): void {
    const date = this.form.controls.date.value ?? today();
    this.form.controls.payments.push(paymentForm(undefined, date));
  }

  protected removePayment(index: number): void {
    this.form.controls.payments.removeAt(index);
  }

  protected inGroup(group: string) {
    return this.categories.filter((c) => c.group === group);
  }

  protected readonly balanceLabel = balanceLabel;

  protected cancel(): void {
    const pid = this.chosen()?.id;
    void this.router.navigate(pid ? ['/patients', pid] : ['/month']);
  }

  protected save(): void {
    const f = this.form.controls;
    // A payment row left empty is no payment, not an error.
    for (let i = f.payments.length - 1; i >= 0; i--) {
      const p = f.payments.at(i).controls;
      if (p.amount.value === null && !p.payerName.value.trim() && !p.source.value.trim()) {
        f.payments.removeAt(i);
      }
    }
    if (!this.isDeposit()) {
      f.amount.setValidators([Validators.required, Validators.min(0)]);
    } else {
      f.amount.clearValidators();
    }
    f.amount.updateValueAndValidity();
    if (!this.chosen() && !f.patientName.value.trim()) {
      f.patientName.setErrors({ required: true });
    }
    if (this.form.invalid || (!this.chosen() && !f.patientName.value.trim())) {
      this.form.markAllAsTouched();
      return;
    }

    const base = {
      date: toIsoDay(f.date.value ?? today()),
      category: f.category.value,
      doctorId: f.doctorId.value || null,
      amount: this.isDeposit() ? 0 : (f.amount.value ?? 0),
      description: f.description.value.trim() || null,
    };
    this.busy.set(true);
    const editing = this.editing();
    if (editing) {
      this.api.updateEntry(editing.id, base).subscribe({
        next: (entry) => this.done(entry, 'entry.updated'),
        error: (err: unknown) => this.fail(err),
      });
      return;
    }
    const chosen = this.chosen();
    const input: EntryInput = {
      ...base,
      ...(chosen
        ? { patientId: chosen.id }
        : {
            patientName: f.patientName.value.trim(),
            patientPhone: f.patientPhone.value.trim() || null,
          }),
      payments: f.payments.controls.map(paymentInput),
      ...(this.depositsApplied() > 0 ? { applyDeposits: true } : {}),
    };
    this.api.createEntry(input).subscribe({
      next: (entry) => this.done(entry, 'entry.saved'),
      error: (err: unknown) => this.fail(err),
    });
  }

  private done(entry: Entry, message: string): void {
    this.notifier.done(message);
    void this.router.navigate(['/patients', entry.patientId]);
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    this.notifier.error(err);
  }
}
