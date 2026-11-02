import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

import { errorKey } from '../../core/i18n/api-error';
import { AuthService } from '../../core/services/auth.service';
import { TzBanner, TzButton, TzLogo, TzTextField } from '../../shared/ui';

@Component({
  selector: 'tz-login',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe, TzBanner, TzButton, TzLogo, TzTextField],
  template: `
    <main class="login">
      <form class="login__card" [formGroup]="form" (ngSubmit)="submit()">
        <tz-logo [size]="56" />
        <h1>{{ 'login.title' | translate }}</h1>
        <p class="login__subtitle">{{ 'login.subtitle' | translate }}</p>

        @if (error(); as key) {
          <tz-banner tone="error" size="compact" icon="error">{{ key | translate }}</tz-banner>
        }

        <tz-text-field
          [control]="form.controls.username"
          [label]="'login.username' | translate"
          prefixIcon="person"
          nativeAutocomplete="username"
          [ltr]="true"
        />
        <tz-text-field
          [control]="form.controls.password"
          [label]="'login.password' | translate"
          type="password"
          prefixIcon="lock"
          nativeAutocomplete="current-password"
          [ltr]="true"
        />
        <tz-button
          type="submit"
          size="large"
          [fullWidth]="true"
          [loading]="busy()"
          [loadingText]="'login.submitting' | translate"
        >
          {{ 'login.submit' | translate }}
        </tz-button>
      </form>
    </main>
  `,
  styles: `
    @use '../../../styles/surface';

    .login {
      display: grid;
      place-items: center;
      min-height: 100dvh;
      padding: var(--tz-space-4);
      background: var(--tz-canvas);
    }
    .login__card {
      @include surface.elevated(extra-large);

      display: flex;
      flex-direction: column;
      align-items: stretch;
      gap: var(--tz-space-2);
      width: min(400px, 100%);
      padding: var(--tz-space-6) var(--tz-space-5);

      tz-logo {
        align-self: center;
      }
    }
    h1 {
      margin: var(--tz-space-2) 0 0;
      text-align: center;
      font: var(--mat-sys-headline-small);
    }
    .login__subtitle {
      margin: 0 0 var(--tz-space-3);
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set(null);
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: (err: unknown) => {
        this.busy.set(false);
        this.error.set(errorKey(err));
      },
    });
  }
}
