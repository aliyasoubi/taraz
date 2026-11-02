import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import type { PatientPage, PatientSummary } from '../../core/models/api.model';
import { Api, type PatientQuery } from '../../core/services/api.service';
import { Amount } from '../../shared/components/amount';
import { EmptyState } from '../../shared/components/empty-state';
import { LoadError } from '../../shared/components/load-error';
import { balanceLabel, balanceTone } from '../../shared/labels';
import { JalaliDayPipe, MoneyPipe } from '../../shared/pipes/money.pipe';
import {
  TzAvatar,
  TzButton,
  TzFilterChips,
  TzListToolbar,
  TzPage,
  TzPageHeader,
  TzPaginator,
  TzSearchField,
  TzSelectField,
  type FilterChipOption,
  type SelectOption,
} from '../../shared/ui';
import { PatientDialog, type PatientDialogData } from './patient-dialog';

type Status = NonNullable<PatientQuery['status']>;
type Sort = NonNullable<PatientQuery['sort']>;

const PAGE_SIZE = 50;

@Component({
  selector: 'tz-patients-page',
  standalone: true,
  imports: [
    RouterLink,
    MatIconModule,
    MatProgressBarModule,
    TranslatePipe,
    Amount,
    EmptyState,
    LoadError,
    JalaliDayPipe,
    MoneyPipe,
    TzAvatar,
    TzButton,
    TzFilterChips,
    TzListToolbar,
    TzPage,
    TzPageHeader,
    TzPaginator,
    TzSearchField,
    TzSelectField,
  ],
  template: `
    <tz-page>
      @if (loading()) {
        <mat-progress-bar mode="indeterminate" />
      }
      <tz-page-header
        [title]="'patients.title' | translate"
        [count]="page() ? ('patients.count' | translate: { count: (page()!.total | money) }) : null"
      >
        <tz-button variant="stroked" icon="person_add" [collapseBelow]="600" (click)="addPatient()">
          {{ 'patients.add' | translate }}
        </tz-button>
      </tz-page-header>

      <tz-list-toolbar>
        <tz-search-field
          class="search"
          [control]="search"
          [placeholder]="'patients.search' | translate"
          [ariaLabel]="'patients.search' | translate"
        />
        <tz-select-field
          class="sort"
          [options]="sorts()"
          [value]="sort()"
          [label]="'patients.sort' | translate"
          subscript="dynamic"
          (valueChange)="setSort($event)"
        />
        <tz-filter-chips
          [options]="statuses()"
          [selected]="[status()]"
          [ariaLabel]="'patients.filter' | translate"
          (selectedChange)="setStatus($event[0])"
        />
      </tz-list-toolbar>

      @if (failed()) {
        <tz-load-error [message]="'common.loadError' | translate" (retry)="load()" />
      } @else if (page(); as p) {
        @if (!p.items.length) {
          <tz-empty-state
            icon="person_search"
            [title]="(filtered() ? 'patients.emptyTitle' : 'patients.noneTitle') | translate"
            [hint]="(filtered() ? 'patients.emptyHint' : 'patients.noneHint') | translate"
          />
        } @else {
          <ul class="people">
            @for (patient of p.items; track patient.id) {
              <li>
                <a class="person" [routerLink]="['/patients', patient.id]">
                  <tz-avatar [name]="patient.name" size="medium" [tone]="avatarTone(patient)" />
                  <span class="person__name">
                    <strong>{{ patient.name }}</strong>
                    <small class="muted">
                      @if (patient.phone) {
                        <span class="ltr-nums">{{ patient.phone }}</span> ·
                      }
                      @if (patient.lastActivity) {
                        {{
                          'patients.lastActivity'
                            | translate: { date: (patient.lastActivity | jday) }
                        }}
                      }
                    </small>
                  </span>
                  <span class="balance">
                    <tz-amount tone="balance" [value]="patient.balance" />
                    <small class="muted">{{ balanceLabel(patient.balance) | translate }}</small>
                  </span>
                </a>
              </li>
            }
          </ul>
          @if (p.total > p.limit) {
            <tz-paginator
              [length]="p.total"
              [page]="p.page - 1"
              [pageSize]="p.limit"
              (pageChange)="goToPage($event.pageIndex + 1)"
            />
          }
        }
      }
    </tz-page>
  `,
  styles: `
    .search {
      flex: 1 1 280px;
    }
    .sort {
      flex: 0 0 200px;
    }
    .balance {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      line-height: 1.4;

      small {
        font: var(--mat-sys-label-small);
      }
    }
  `,
})
export class PatientsPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly i18n = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly q = input<string>();
  readonly status = input<Status, string | undefined>('all', {
    transform: (v) => (['debtor', 'creditor', 'settled'].includes(v ?? '') ? (v as Status) : 'all'),
  });
  readonly sort = input<Sort, string | undefined>('recent', {
    transform: (v) => (['name', 'balance'].includes(v ?? '') ? (v as Sort) : 'recent'),
  });
  readonly p = input<number, string | undefined>(1, {
    transform: (v) => Math.max(1, Number(v) || 1),
  });

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly page = signal<PatientPage | null>(null);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly filtered = computed(() => !!this.q() || this.status() !== 'all');

  protected readonly statuses = computed<FilterChipOption[]>(() =>
    (['all', 'debtor', 'creditor', 'settled'] as const).map((value) => ({
      value,
      label: this.i18n.instant(`patients.${value}`),
    })),
  );

  protected readonly sorts = computed<SelectOption[]>(() => [
    { value: 'recent', label: this.i18n.instant('patients.sortRecent') },
    { value: 'name', label: this.i18n.instant('patients.sortName') },
    { value: 'balance', label: this.i18n.instant('patients.sortBalance') },
  ]);

  constructor() {
    effect(() => {
      const query: PatientQuery = {
        q: this.q() ?? '',
        status: this.status(),
        sort: this.sort(),
        page: this.p(),
        limit: PAGE_SIZE,
      };
      untracked(() => {
        if (this.search.value !== query.q)
          this.search.setValue(query.q ?? '', { emitEvent: false });
        this.load(query);
      });
    });
    this.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((q) => this.navigate({ q: q.trim() || null, p: null }));
  }

  private lastQuery: PatientQuery = {};

  protected load(query: PatientQuery = this.lastQuery): void {
    this.lastQuery = query;
    this.loading.set(true);
    this.failed.set(false);
    this.api.patients(query).subscribe({
      next: (page) => {
        if (query === this.lastQuery) this.page.set(page);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  protected setStatus(status: string | undefined): void {
    this.navigate({ status: status && status !== 'all' ? status : null, p: null });
  }

  protected setSort(sort: string): void {
    this.navigate({ sort: sort === 'recent' ? null : sort, p: null });
  }

  protected goToPage(page: number): void {
    this.navigate({ p: page > 1 ? page : null });
  }

  protected addPatient(): void {
    this.dialog
      .open<PatientDialog, PatientDialogData, PatientSummary>(PatientDialog, { data: {} })
      .afterClosed()
      .subscribe((patient) => {
        if (patient) void this.router.navigate(['/patients', patient.id]);
      });
  }

  protected avatarTone(patient: PatientSummary): 'primary' | 'neutral' {
    return balanceTone(patient.balance) === 'debt' ? 'primary' : 'neutral';
  }

  protected readonly balanceLabel = balanceLabel;

  private navigate(queryParams: Record<string, string | number | null>): void {
    void this.router.navigate([], { queryParams, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
