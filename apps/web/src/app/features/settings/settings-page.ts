import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';

import { Notifier } from '../../core/i18n/api-error';
import type { Account, Doctor } from '../../core/models/api.model';
import { Api } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, type ThemeMode } from '../../core/services/theme.service';
import { accountKindIcon } from '../../shared/labels';
import {
  TzButton,
  TzIconButton,
  TzPage,
  TzPageHeader,
  TzSegmentedButton,
  TzSurface,
  TzTextField,
  type SegmentOption,
} from '../../shared/ui';
import { AccountDialog, DoctorDialog } from './catalog-dialogs';

@Component({
  selector: 'tz-settings-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatIconModule,
    TranslatePipe,
    TzButton,
    TzIconButton,
    TzPage,
    TzPageHeader,
    TzSegmentedButton,
    TzSurface,
    TzTextField,
  ],
  template: `
    <tz-page width="form">
      <tz-page-header [title]="'settings.title' | translate" />

      <tz-surface
        [title]="'settings.doctors' | translate"
        icon="stethoscope"
        [description]="'settings.doctorsHint' | translate"
      >
        <ul class="list">
          @for (d of doctors(); track d.id) {
            <li [class.is-inactive]="!d.active">
              <mat-icon aria-hidden="true">stethoscope</mat-icon>
              <span class="list__text">
                <strong>{{ d.name }}</strong>
                @if (!d.active) {
                  <small>{{ 'settings.inactive' | translate }}</small>
                }
              </span>
              <tz-icon-button
                icon="edit"
                size="compact"
                [ariaLabel]="'settings.edit' | translate"
                (click)="editDoctor(d)"
              />
              <tz-icon-button
                [icon]="d.active ? 'visibility_off' : 'visibility'"
                size="compact"
                [ariaLabel]="(d.active ? 'settings.deactivate' : 'settings.activate') | translate"
                [tooltip]="(d.active ? 'settings.deactivate' : 'settings.activate') | translate"
                (click)="toggleDoctor(d)"
              />
            </li>
          } @empty {
            <li class="muted">{{ 'settings.empty' | translate }}</li>
          }
        </ul>
        <tz-button variant="stroked" icon="add" (click)="editDoctor(null)">{{
          'settings.addDoctor' | translate
        }}</tz-button>
      </tz-surface>

      <tz-surface
        [title]="'settings.accounts' | translate"
        icon="account_balance"
        [description]="'settings.accountsHint' | translate"
      >
        <ul class="list">
          @for (a of accounts(); track a.id) {
            <li [class.is-inactive]="!a.active">
              <mat-icon aria-hidden="true">{{ kindIcon(a.kind) }}</mat-icon>
              <span class="list__text">
                <strong>{{ a.title }}</strong>
                <small>
                  {{ 'accountKind.' + a.kind | translate }}
                  @if (a.holder) {
                    · {{ a.holder }}
                  }
                  @if (a.bank) {
                    · {{ a.bank }}
                  }
                  @if (!a.active) {
                    · {{ 'settings.inactive' | translate }}
                  }
                </small>
              </span>
              <tz-icon-button
                icon="edit"
                size="compact"
                [ariaLabel]="'settings.edit' | translate"
                (click)="editAccount(a)"
              />
              <tz-icon-button
                [icon]="a.active ? 'visibility_off' : 'visibility'"
                size="compact"
                [ariaLabel]="(a.active ? 'settings.deactivate' : 'settings.activate') | translate"
                [tooltip]="(a.active ? 'settings.deactivate' : 'settings.activate') | translate"
                (click)="toggleAccount(a)"
              />
            </li>
          } @empty {
            <li class="muted">{{ 'settings.empty' | translate }}</li>
          }
        </ul>
        <tz-button variant="stroked" icon="add" (click)="editAccount(null)">{{
          'settings.addAccount' | translate
        }}</tz-button>
      </tz-surface>

      <tz-surface [title]="'settings.appearance' | translate" icon="palette">
        <tz-segmented-button
          [options]="themes()"
          [value]="theme.mode()"
          [ariaLabel]="'settings.theme' | translate"
          (valueChange)="setTheme($event)"
        />
      </tz-surface>

      <tz-surface [title]="'settings.password' | translate" icon="lock">
        <form class="password" [formGroup]="password" (ngSubmit)="changePassword()">
          <tz-text-field
            [control]="password.controls.current"
            [label]="'settings.currentPassword' | translate"
            type="password"
            nativeAutocomplete="current-password"
            [ltr]="true"
          />
          <tz-text-field
            [control]="password.controls.next"
            [label]="'settings.newPassword' | translate"
            [hint]="'settings.newPasswordHint' | translate"
            type="password"
            nativeAutocomplete="new-password"
            [ltr]="true"
          />
          <tz-button type="submit" variant="stroked" icon="key" [loading]="changing()">
            {{ 'settings.changePassword' | translate }}
          </tz-button>
        </form>
      </tz-surface>
    </tz-page>
  `,
  styles: `
    .list {
      display: flex;
      flex-direction: column;
      margin: 0 0 var(--tz-space-3);
      padding: 0;
      list-style: none;

      li {
        display: flex;
        align-items: center;
        gap: var(--tz-space-3);
        padding: var(--tz-space-2) 0;
      }
      li + li {
        border-top: 1px solid color-mix(in srgb, var(--mat-sys-outline-variant) 55%, transparent);
      }
      li > mat-icon {
        color: var(--mat-sys-primary);
      }
      li.is-inactive {
        opacity: 0.6;
      }
    }
    .list__text {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
      line-height: 1.5;

      small {
        font: var(--mat-sys-body-small);
        color: var(--mat-sys-on-surface-variant);
      }
    }
    .password {
      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--tz-space-2);
      max-width: 420px;

      tz-button {
        align-self: flex-start;
      }
    }
  `,
})
export class SettingsPage {
  private readonly api = inject(Api);
  private readonly auth = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly notifier = inject(Notifier);
  private readonly i18n = inject(TranslateService);
  protected readonly theme = inject(ThemeService);

  protected readonly doctors = signal<Doctor[]>([]);
  protected readonly accounts = signal<Account[]>([]);
  protected readonly changing = signal(false);

  protected readonly themes = computed<SegmentOption[]>(() => [
    { value: 'system', label: this.i18n.instant('settings.themeSystem'), icon: 'brightness_auto' },
    { value: 'light', label: this.i18n.instant('settings.themeLight'), icon: 'light_mode' },
    { value: 'dark', label: this.i18n.instant('settings.themeDark'), icon: 'dark_mode' },
  ]);

  protected readonly password = new FormGroup({
    current: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    next: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
  });

  constructor() {
    this.loadDoctors();
    this.loadAccounts();
  }

  protected readonly kindIcon = accountKindIcon;

  protected editDoctor(doctor: Doctor | null): void {
    this.dialog
      .open(DoctorDialog, { data: doctor })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.loadDoctors());
  }

  protected toggleDoctor(doctor: Doctor): void {
    this.api.saveDoctor(doctor.id, { active: !doctor.active }).subscribe({
      next: () => this.loadDoctors(),
      error: (err: unknown) => this.notifier.error(err),
    });
  }

  protected editAccount(account: Account | null): void {
    this.dialog
      .open(AccountDialog, { data: account })
      .afterClosed()
      .pipe(filter(Boolean))
      .subscribe(() => this.loadAccounts());
  }

  protected toggleAccount(account: Account): void {
    this.api.saveAccount(account.id, { active: !account.active }).subscribe({
      next: () => this.loadAccounts(),
      error: (err: unknown) => this.notifier.error(err),
    });
  }

  protected setTheme(mode: string): void {
    this.theme.set(mode as ThemeMode);
  }

  protected changePassword(): void {
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    const { current, next } = this.password.getRawValue();
    this.changing.set(true);
    this.auth.changePassword(current, next).subscribe({
      next: () => {
        this.changing.set(false);
        this.password.reset();
        this.notifier.done('settings.passwordChanged');
      },
      error: (err: unknown) => {
        this.changing.set(false);
        this.notifier.error(err);
      },
    });
  }

  private loadDoctors(): void {
    this.api.doctors().subscribe({ next: (d) => this.doctors.set(d) });
  }

  private loadAccounts(): void {
    this.api.accounts().subscribe({ next: (a) => this.accounts.set(a) });
  }
}
