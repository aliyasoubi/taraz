import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, ElementRef, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { TranslatePipe } from '@ngx-translate/core';
import { filter, map, startWith } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { ThemeService } from '../core/services/theme.service';
import { TzAvatar, TzButton, TzIconButton, TzLogo } from '../shared/ui';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

/** Four sections: the month is where the work is watched, the rest is where it is done. */
const NAV: readonly NavItem[] = [
  { path: '/month', label: 'nav.month', icon: 'calendar_month' },
  { path: '/patients', label: 'nav.patients', icon: 'groups' },
  { path: '/debtors', label: 'nav.debtors', icon: 'account_balance_wallet' },
  { path: '/settings', label: 'nav.settings', icon: 'settings' },
];

@Component({
  selector: 'tz-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatMenuModule,
    MatIconModule,
    TranslatePipe,
    TzAvatar,
    TzButton,
    TzIconButton,
    TzLogo,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  // Injected for its constructor, which applies the stored theme on boot.
  private readonly theme = inject(ThemeService);

  protected readonly nav = NAV;

  /** A phone gets a bottom bar, a tablet a drawer, a desktop a permanent rail. */
  protected readonly isHandset = toSignal(
    this.breakpoints.observe([Breakpoints.Handset]).pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  protected readonly isDesktop = toSignal(
    this.breakpoints.observe('(min-width: 1024px)').pipe(map((r) => r.matches)),
    { initialValue: true },
  );

  protected readonly drawerOpen = signal(false);

  private readonly path = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.router.url.split(/[?#]/)[0]),
      startWith(this.router.url.split(/[?#]/)[0]),
    ),
    { initialValue: '' },
  );

  private readonly page = viewChild<ElementRef<HTMLElement>>('page');

  constructor() {
    // A new page opens at its top: the page area scrolls, not the window.
    effect(() => {
      this.path();
      untracked(() => this.page()?.nativeElement.scrollTo({ top: 0 }));
    });
  }

  protected toggleDrawer(): void {
    this.drawerOpen.update((open) => !open);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
  }

  protected logout(): void {
    this.auth.logout();
  }
}
