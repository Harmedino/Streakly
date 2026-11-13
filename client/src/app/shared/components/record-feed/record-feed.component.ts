import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { prettyDate } from '../../../core/utils/dates';
import { Icon } from '../icon/icon.component';
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
  templateUrl: './record-feed.component.html',
  styleUrl: './record-feed.component.scss',
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
