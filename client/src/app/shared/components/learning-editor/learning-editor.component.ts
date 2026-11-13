import { NgTemplateOutlet } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LearningEntry } from '../../../core/models/life';
import { LifeService } from '../../../core/services/life';
import { Dialog } from '../dialog/index';
import { markdown } from '../markdown/markdown.component';
import { RichEditor } from '../rich-editor/rich-editor.component';
@Component({
  selector: 'app-learning-editor',
  imports: [FormsModule, Dialog, RichEditor, NgTemplateOutlet],
  templateUrl: './learning-editor.component.html',
  styleUrl: './learning-editor.component.scss',
})
export class LearningEditor implements OnInit, OnDestroy {
  life = inject(LifeService);
  entry = input<LearningEntry | null>(null);
  close = output<void>();
  saved = output<string>();
  embedded = input(false);
  initialGoal = input('');
  goalId = '';
  milestoneId = '';
  title = '';
  content = '';
  category = 'Learning';
  tags = '';
  date = this.life.tracker.today();
  minutes = 0;
  resources = '';
  activityId = '';
  next = '';
  pinned = false;
  preview = signal(false);
  error = signal('');
  draftState = signal('');
  private timer?: ReturnType<typeof setTimeout>;
  revision = 0;
  draftEpoch = 0;
  private destroyed = false;
  private draftRequest: Promise<unknown> = Promise.resolve();
  ngOnInit() {
    this.revision = this.life.tracker.data().revision ?? 0;
    const e = this.entry();
    if (e) {
      this.title = e.topic;
      this.content =
        e.format === 'html'
          ? [e.description, e.notes].filter(Boolean).join('')
          : markdown([e.description, e.notes].filter(Boolean).join('\n\n'));
      this.goalId = e.goalId ?? '';
      this.milestoneId = e.milestoneId ?? '';
      this.category = e.category;
      this.tags = e.tags?.join(', ') ?? '';
      this.date = e.date;
      this.minutes = e.minutes;
      this.resources = e.resources;
      this.activityId = e.activityId;
      this.next = e.next;
      this.pinned = !!e.pinned;
    } else {
      this.goalId = this.initialGoal();
    }
    if (!e && this.life.tracker.api.enabled())
      void this.life.tracker.api
        .request<{
          epoch: number;
          title: string;
          content: string;
          format?: 'markdown' | 'html';
        } | null>('/drafts/learning')
        .then((d) => {
          this.draftEpoch = d?.epoch ?? 0;
          if (d && (d.title || d.content) && !this.destroyed && !this.content && !this.title) {
            this.title = d.title;
            this.content = d.format === 'html' ? d.content : markdown(d.content);
            this.draftState.set('Recovered your saved draft.');
          }
        })
        .catch(() =>
          this.draftState.set(
            'Draft unavailable. Your new note will remain in this editor until saved.',
          ),
        );
  }
  draft() {
    clearTimeout(this.timer);
    if (this.entry() || !this.life.tracker.api.enabled()) return;
    this.draftState.set('Unsaved draft…');
    this.timer = setTimeout(() => {
      this.draftRequest = this.life.tracker.api
        .request('/drafts/learning', 'PUT', {
          title: this.title,
          content: this.content,
          format: 'html',
          epoch: this.draftEpoch,
        })
        .then(() => this.draftState.set('Draft saved to your server.'))
        .catch(() =>
          this.draftState.set('Draft not saved. Keep this editor open and retry when connected.'),
        );
    }, 1000);
  }
  async save() {
    clearTimeout(this.timer);
    await this.draftRequest;
    if (!this.content.replace(/<[^>]*>/g, '').trim() || this.life.tracker.api.busy()) return;
    if (this.content.length > 50000) {
      this.error.set('This note is too long. Split it into smaller notes before saving.');
      return;
    }
    this.error.set('');
    if ((this.life.tracker.data().revision ?? 0) !== this.revision) {
      this.error.set(
        'Your workspace changed while writing. Copy your note or reload the latest data before retrying.',
      );
      return;
    }
    const e = this.entry();
    const id = e?.id ?? crypto.randomUUID();
    const saved = this.life.saveLearning({
      ...e,
      id,
      topic: this.title.trim(),
      format: 'html',
      goalId: this.goalId,
      milestoneId: this.milestoneId,
      description: this.content,
      notes: '',
      category: this.category.trim() || 'Learning',
      minutes: Number(this.minutes) || 0,
      date: this.date,
      resources: this.resources.trim(),
      activityId: this.activityId,
      next: this.next,
      pinned: this.pinned,
      tags: [
        ...new Set(
          this.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ],
      createdAt: e?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    if (saved && (await this.life.tracker.settled())) {
      if (!e && this.life.tracker.api.enabled())
        await this.life.tracker.api
          .request('/drafts/learning', 'DELETE', { epoch: this.draftEpoch })
          .catch(() => {});
      this.saved.emit(id);
      this.close.emit();
    } else
      this.error.set(
        this.life.error() ||
          this.life.tracker.api.error() ||
          'Could not save this note. Your text is still here.',
      );
  }
  milestones() {
    return this.life.data().goals.find((g) => g.id === this.goalId)?.milestones ?? [];
  }
  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
  }
}
