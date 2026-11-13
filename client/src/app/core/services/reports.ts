import { Injectable, inject } from '@angular/core';
import { ReportBundle, reportBundle } from '../utils/daily-report';
import { TrackerService } from './tracker';
@Injectable({ providedIn: 'root' })
export class ReportsService {
  private tracker = inject(TrackerService);
  get(period: 'day' | 'week' | 'month', date: string): Promise<ReportBundle> {
    return this.tracker.api.enabled()
      ? this.tracker.api.request<ReportBundle>(
          '/reports?period=' + period + '&date=' + encodeURIComponent(date),
        )
      : Promise.resolve(reportBundle(this.tracker.data(), period, date, this.tracker.today()));
  }
}
