import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FollowUp, JobApplication, JobEvent, JobStatus } from '../../../../core/models/life';
import { LifeService } from '../../../../core/services/life';
import { monthStart, prettyDate, weekStart } from '../../../../core/utils/dates';
import { JOB_STATUSES } from '../../../../core/utils/workflows';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyState } from '../../../../shared/components/empty-state/empty-state.component';
import { JobForm } from '../../components/job-form/job-form.component';
@Component({
  selector: 'app-jobs',
  imports: [FormsModule, RouterLink, JobForm, EmptyState, ConfirmDialog],
  templateUrl: './jobs.component.html',
  styleUrl: './jobs.component.scss',
})
export class Jobs {
  life = inject(LifeService);
  tracker = this.life.tracker;
  route = inject(ActivatedRoute);
  router = inject(Router);
  id = signal('');
  statuses = JOB_STATUSES;
  filter = signal('');
  search = signal('');
  editing = signal<JobApplication | null | undefined>(undefined);
  error = signal('');
  pretty = prettyDate;
  deleting = signal<{ job: JobApplication; event?: JobEvent; follow?: FollowUp } | null>(null);
  eventTitle = '';
  eventDate = this.tracker.today();
  eventNote = '';
  eventId = '';
  followTitle = '';
  followDate = this.tracker.today();
  followId = '';
  selected = computed(() => this.life.data().jobs.find((j) => j.id === this.id()));
  list = computed(() =>
    this.life
      .data()
      .jobs.filter(
        (j) =>
          (!this.filter() || j.status === this.filter()) &&
          (j.company + ' ' + j.position + ' ' + j.notes)
            .toLowerCase()
            .includes(this.search().toLowerCase()),
      )
      .sort((a, b) => b.date.localeCompare(a.date)),
  );
  stats = computed(() => {
    const jobs = this.life.data().jobs,
      today = this.tracker.today();
    return [
      { label: 'Today', value: jobs.filter((j) => j.date === today).length },
      {
        label: 'This week',
        value: jobs.filter((j) => j.date >= weekStart(today) && j.date <= today).length,
      },
      {
        label: 'This month',
        value: jobs.filter((j) => j.date >= monthStart(today) && j.date <= today).length,
      },
      {
        label: 'Awaiting response',
        value: jobs.filter((j) => j.status === 'Applied' || j.status === 'Assessment').length,
      },
      { label: 'Interviews', value: jobs.filter((j) => j.status === 'Interview').length },
      { label: 'Offers', value: jobs.filter((j) => j.status === 'Offer').length },
      { label: 'Rejections', value: jobs.filter((j) => j.status === 'Rejected').length },
      {
        label: 'Follow-ups due',
        value: jobs.flatMap((j) => j.followUps ?? []).filter((f) => !f.done && f.date <= today)
          .length,
      },
    ];
  });
  timeline = computed(() =>
    [...(this.selected()?.timeline ?? [])].sort(
      (a, b) => b.date.localeCompare(a.date) || (b.at ?? '').localeCompare(a.at ?? ''),
    ),
  );
  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((p) => this.id.set(p.get('id') || ''));
  }
  async save(job: JobApplication) {
    if (this.life.saveJob(job) && (await this.tracker.settled())) {
      this.error.set('');
      return true;
    }
    this.error.set(
      this.life.error() || this.tracker.api.error() || 'Could not save. Please retry.',
    );
    return false;
  }
  status(job: JobApplication, status: string) {
    void this.save({ ...job, status: status as JobStatus });
  }
  editEvent(e: JobEvent) {
    this.eventId = e.id;
    this.eventTitle = e.title;
    this.eventDate = e.date;
    this.eventNote = e.note;
  }
  async addEvent(job: JobApplication) {
    if (!this.eventTitle.trim()) return;
    const event: JobEvent = {
      id: this.eventId || crypto.randomUUID(),
      date: this.eventDate,
      title: this.eventTitle.trim(),
      note: this.eventNote,
      kind: 'note',
    };
    const next = structuredClone(job);
    next.timeline = [...(next.timeline ?? []).filter((e) => e.id !== event.id), event];
    if (await this.save(next)) {
      this.eventId = '';
      this.eventTitle = '';
      this.eventNote = '';
      this.eventDate = this.tracker.today();
    }
  }
  editFollow(f: FollowUp) {
    this.followId = f.id;
    this.followTitle = f.title;
    this.followDate = f.date;
  }
  async addFollow(job: JobApplication) {
    if (!this.followTitle.trim()) return;
    const next = structuredClone(job),
      old = next.followUps?.find((f) => f.id === this.followId);
    const follow: FollowUp = {
      ...old,
      id: old?.id || crypto.randomUUID(),
      title: this.followTitle.trim(),
      date: this.followDate,
      done: old?.done ?? false,
      completedOn: old?.completedOn ?? '',
    };
    next.followUps = [...(next.followUps ?? []).filter((f) => f.id !== follow.id), follow];
    if (await this.save(next)) {
      this.followId = '';
      this.followTitle = '';
      this.followDate = this.tracker.today();
    }
  }
  toggleFollow(job: JobApplication, follow: FollowUp) {
    const next = structuredClone(job),
      f = next.followUps!.find((f) => f.id === follow.id)!;
    f.done = !f.done;
    f.completedOn = f.done ? this.tracker.today() : '';
    void this.save(next);
  }
  async remove() {
    const d = this.deleting()!;
    let ok = false;
    if (d.event) {
      const next = {
        ...d.job,
        timeline: (d.job.timeline ?? []).filter((e) => e.id !== d.event!.id),
      };
      ok = await this.save(next);
    } else if (d.follow) {
      ok = await this.save({
        ...d.job,
        followUps: (d.job.followUps ?? []).filter((f) => f.id !== d.follow!.id),
      });
    } else {
      ok = this.life.remove('jobs', d.job.id) && (await this.tracker.settled());
      if (ok) void this.router.navigateByUrl('/jobs');
    }
    if (ok) this.deleting.set(null);
  }
}
