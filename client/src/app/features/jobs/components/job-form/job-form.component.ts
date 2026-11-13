import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JobApplication } from '../../../../core/models/life';
import { LifeService } from '../../../../core/services/life';
import { JOB_STATUSES } from '../../../../core/utils/workflows';
import { Dialog } from '../../../../shared/components/dialog/dialog.component';
@Component({
  selector: 'app-job-form',
  imports: [FormsModule, Dialog],
  templateUrl: './job-form.component.html',
  styleUrl: './job-form.component.scss',
})
export class JobForm implements OnInit {
  life = inject(LifeService);
  tracker = this.life.tracker;
  entry = input<JobApplication | null>(null);
  close = output<void>();
  value!: JobApplication;
  statuses = JOB_STATUSES;
  error = signal('');
  ngOnInit() {
    this.value = this.entry()
      ? structuredClone(this.entry()!)
      : {
          id: crypto.randomUUID(),
          company: '',
          position: '',
          date: this.tracker.today(),
          link: '',
          status: 'Applied',
          notes: '',
          timeline: [],
          followUps: [],
          salary: '',
          location: '',
          interview: '',
        };
  }
  async save() {
    this.error.set('');
    if (
      this.life.saveJob({
        ...this.value,
        company: this.value.company.trim(),
        position: this.value.position.trim(),
      }) &&
      (await this.tracker.settled())
    )
      this.close.emit();
    else
      this.error.set(
        this.life.error() ||
          this.tracker.api.error() ||
          'Could not save. Your edits are still here.',
      );
  }
}
