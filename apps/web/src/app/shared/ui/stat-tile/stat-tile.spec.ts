import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it } from 'vitest';

import { TzStatTile } from './stat-tile';

@Component({
  standalone: true,
  imports: [TzStatTile],
  template: `
    <tz-stat-tile
      id="due"
      label="Overdue"
      icon="schedule"
      tone="warn"
      link="/labs"
      [queryParams]="{ overdue: 'true' }"
      [value]="3"
    />
    <tz-stat-tile id="clear" label="Overdue" icon="schedule" tone="warn" link="/labs" [value]="0" />
    <tz-stat-tile id="order" label="To order" icon="shopping_cart" tone="caution" [value]="2" />
    <tz-stat-tile id="figure" label="Active" icon="how_to_reg" [value]="12" />
  `,
})
class Host {}

describe('TzStatTile', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('links to exactly the list it counts', () => {
    const link = render().querySelector('#due a') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/labs?overdue=true');
  });

  it('warns only while there is something to act on', () => {
    const root = render();
    expect(root.querySelector('#due')?.classList).toContain('tz-stat-tile--warn');
    expect(root.querySelector('#clear')?.classList).not.toContain('tz-stat-tile--warn');
  });

  it('keeps routine work amber, not red', () => {
    const classes = render().querySelector('#order')?.classList;
    expect(classes).toContain('tz-stat-tile--caution');
    expect(classes).not.toContain('tz-stat-tile--warn');
  });

  it('is a plain figure without a link', () => {
    const tile = render().querySelector('#figure') as HTMLElement;
    expect(tile.querySelector('a')).toBeNull();
    expect(tile.querySelector('.tz-stat-tile__label')?.textContent).toBe('Active');
  });
});
