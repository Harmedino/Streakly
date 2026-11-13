import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icon } from './icon';
import { prettyDate } from '../core/dates';
export interface FeedItem {
  id: string;
  title: string;
  path: string;
  date: string;
  label?: string;
  icon?: string;
}
@Component({
  selector: 'app-record-feed',
  imports: [RouterLink, Icon],
  template: `<section class="feed">
    <div class="section-heading">
      <h2>{{ title() }}</h2>
      <a class="text-button" [routerLink]="actionPath()"
        >{{ actionLabel() }}<app-icon name="up" [size]="15"
      /></a>
    </div>
    @for (item of items(); track item.id) {
      <a class="feed-row" [routerLink]="item.path"
        ><span class="feed-icon"><app-icon [name]="item.icon || 'calendar'" [size]="16" /></span>
        <div>
          <strong>{{ item.title }}</strong>
          @if (item.label) {
            <small>{{ item.label }}</small>
          }
        </div>
        <time [class.overdue]="deadline() && item.date < today()"
          >{{ deadline() && item.date < today() ? 'Overdue · ' : '' }}{{ pretty(item.date) }}</time
        ><app-icon name="right" [size]="14"
      /></a>
    } @empty {
      <div class="inline-empty">
        <app-icon [name]="deadline() ? 'check' : 'sprout'" [size]="18" />
        <p>
          {{ emptyTitle() }}<span>{{ emptyDescription() }}</span>
        </p>
      </div>
    }
  </section>`,
  styleUrl: './record-feed.scss',
})
export class RecordFeed {
  title = input.required<string>();
  items = input.required<FeedItem[]>();
  actionPath = input('/reports');
  actionLabel = input('View all');
  deadline = input(false);
  today = input('');
  emptyTitle = input('Your story starts here.');
  emptyDescription = input('Your recorded moments will appear here.');
  pretty = prettyDate;
}
