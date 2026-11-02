import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { Notifier } from '../../core/i18n/api-error';
import type { Account, AccountKind, Doctor } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { ACCOUNT_KINDS } from '../../shared/labels';
import { TzButton, TzSelectField, TzTextField, type SelectOption } from '../../shared/ui';

@Component({
  selector: 'tz-doctor-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, TranslatePipe, TzButton, TzTextField],
  template: `
    <h2 mat-dialog-title>
      {{ (doctor ? 'settings.doctorDialogEdit' : 'settings.doctorDialogNew') | translate }}
    </h2>
    <form (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <tz-text-field
          [control]="name"
          [label]="'settings.doctorName' | translate"
          prefixIcon="stethoscope"
        />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <tz-button variant="text" (click)="ref.close()">{{
          'action.cancel' | translate
        }}</tz-button>
        <tz-button type="submit" [loading]="busy()">{{ 'action.save' | translate }}</tz-button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      min-width: min(380px, 80vw);
      padding-top: var(--tz-space-2) !important;
    }
  `,
})
export class DoctorDialog {
  protected readonly doctor = inject<Doctor | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<DoctorDialog, Doctor>>(MatDialogRef);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);

  protected readonly busy = signal(false);
  protected readonly name = new FormControl(this.doctor?.name ?? '', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(80)],
  });

  protected save(): void {
    if (this.name.invalid) {
      this.name.markAsTouched();
      return;
    }
    this.busy.set(true);
    this.api.saveDoctor(this.doctor?.id ?? null, { name: this.name.value }).subscribe({
      next: (doctor) => {
        this.notifier.done('settings.saved');
        this.ref.close(doctor);
      },
      error: (err: unknown) => {
        this.busy.set(false);
        this.notifier.error(err);
      },
    });
  }
}

@Component({
  selector: 'tz-account-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    TranslatePipe,
    TzButton,
    TzSelectField,
    TzTextField,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ (account ? 'settings.accountDialogEdit' : 'settings.accountDialogNew') | translate }}
    </h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="fields">
        <tz-text-field
          [control]="form.controls.title"
          [label]="'settings.accountTitle' | translate"
          [hint]="'settings.accountTitleHint' | translate"
          prefixIcon="account_balance"
        />
        <tz-select-field
          [control]="form.controls.kind"
          [options]="kinds"
          [label]="'settings.accountKind' | translate"
        />
        <tz-text-field
          [control]="form.controls.holder"
          [label]="'settings.accountHolder' | translate"
        />
        <tz-text-field
          [control]="form.controls.bank"
          [label]="'settings.accountBank' | translate"
        />
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <tz-button variant="text" (click)="ref.close()">{{
          'action.cancel' | translate
        }}</tz-button>
        <tz-button type="submit" [loading]="busy()">{{ 'action.save' | translate }}</tz-button>
      </mat-dialog-actions>
    </form>
  `,
  styles: `
    .fields {
      display: flex;
      flex-direction: column;
      gap: var(--tz-space-2);
      min-width: min(420px, 80vw);
      padding-top: var(--tz-space-2) !important;
    }
  `,
})
export class AccountDialog {
  protected readonly account = inject<Account | null>(MAT_DIALOG_DATA);
  protected readonly ref = inject<MatDialogRef<AccountDialog, Account>>(MatDialogRef);
  private readonly api = inject(Api);
  private readonly notifier = inject(Notifier);
  private readonly i18n = inject(TranslateService);

  protected readonly busy = signal(false);
  protected readonly kinds: SelectOption[] = ACCOUNT_KINDS.map((k) => ({
    value: k.value,
    label: this.i18n.instant(k.label),
  }));
  protected readonly form = new FormGroup({
    title: new FormControl(this.account?.title ?? '', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(80)],
    }),
    kind: new FormControl<string>(this.account?.kind ?? 'bank', { nonNullable: true }),
    holder: new FormControl(this.account?.holder ?? '', { nonNullable: true }),
    bank: new FormControl(this.account?.bank ?? '', { nonNullable: true }),
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.api
      .saveAccount(this.account?.id ?? null, {
        title: v.title,
        kind: v.kind as AccountKind,
        holder: v.holder || null,
        bank: v.bank || null,
      })
      .subscribe({
        next: (account) => {
          this.notifier.done('settings.saved');
          this.ref.close(account);
        },
        error: (err: unknown) => {
          this.busy.set(false);
          this.notifier.error(err);
        },
      });
  }
}
