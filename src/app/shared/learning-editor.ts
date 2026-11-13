import { Component, inject, input, output, OnInit, OnDestroy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from './dialog';
import { LearningEntry } from '../models/life';
import { LifeService } from '../services/life';
import { Markdown } from './markdown';
@Component({
  selector: 'app-learning-editor',
  imports: [FormsModule, Dialog, Markdown],
  template: `<app-dialog
    [title]="entry() ? 'Edit learning note' : 'New learning note'"
    (close)="close.emit()"
    ><form (ngSubmit)="save()" #form="ngForm">
      <label class="sr-only" for="note-title">Note title</label
      ><input
        class="note-title"
        id="note-title"
        name="title"
        [(ngModel)]="title"
        placeholder="Untitled note"
        maxlength="200"
        (ngModelChange)="draft()"
      />
      <div class="note-tools" aria-label="Note formatting">
        @for (tool of tools; track tool.label) {
          <button
            type="button"
            class="text-button"
            (click)="format(tool.before, tool.after)"
            [attr.aria-label]="tool.label"
          >
            {{ tool.text }}
          </button>
        }
        <button type="button" class="text-button" (click)="preview.set(!preview())">
          {{ preview() ? 'Write' : 'Preview' }}
        </button>
      </div>
      @if (preview()) {
        <app-markdown [content]="content" />
      } @else {
        <label class="sr-only" for="learning-content">Note content</label
        ><textarea
          #body
          id="learning-content"
          name="content"
          [(ngModel)]="content"
          (ngModelChange)="draft()"
          required
          maxlength="50000"
          rows="12"
          placeholder="What did you learn? Start writing…"
        ></textarea>
      }
      <details>
        <summary>More Options</summary>
        <div class="form-grid">
          <label>Category<input name="category" [(ngModel)]="category" maxlength="60" /></label
          ><label
            >Tags<input
              name="tags"
              [(ngModel)]="tags"
              maxlength="500"
              placeholder="design, coding" /></label
          ><label
            >Date<input
              type="date"
              name="date"
              [(ngModel)]="date"
              [max]="life.tracker.today()" /></label
          ><label
            >Time spent (minutes)<input
              type="number"
              name="minutes"
              [(ngModel)]="minutes"
              min="0"
              max="1440"
          /></label>
        </div>
        <label
          >Related links<textarea
            name="resources"
            [(ngModel)]="resources"
            rows="2"
            maxlength="4000"
          ></textarea></label
        ><label
          >Related streak<select aria-label="Related streak" name="activity" [(ngModel)]="activityId">
            <option value="">No linked streak</option>
            @for (a of life.tracker.active(); track a.id) {
              @if (!a.automation && (a.quantityTarget === 1 || a.progressType === 'duration')) {
                <option [value]="a.id">{{ a.name }}</option>
              }
            }
          </select></label
        ><label
          >Learning goal / next steps<textarea
            name="next"
            [(ngModel)]="next"
            rows="2"
            maxlength="1000"
          ></textarea></label
        ><label class="checkbox-label"
          ><input type="checkbox" name="pinned" [(ngModel)]="pinned" />Pin this note</label
        >
      </details>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      <p class="helper" role="status">{{ draftState() }}</p>
      <div class="form-actions">
        <button class="btn" type="button" (click)="close.emit()">Cancel</button
        ><button class="btn primary" [disabled]="!content.trim() || life.tracker.api.busy()">
          {{ life.tracker.api.busy() ? 'Saving…' : 'Save note' }}
        </button>
      </div>
    </form></app-dialog
  >`,
  styles: `
    .note-title {
      font-size: 22px;
      border: 0;
      padding: 8px 0;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
    }
    .note-tools {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      padding: 8px 0;
      border-block: 1px solid var(--line);
      margin-bottom: 16px;
    }
    .note-tools .text-button {
      color: var(--muted);
    }
    textarea#learning-content {
      border: 0;
      padding: 8px 0;
      resize: vertical;
      font-size: 15px;
      line-height: 1.9;
      min-height: 220px;
    }
    .note-title:focus,
    textarea#learning-content:focus {
      outline: none;
    }
    .note-title:focus-visible, textarea#learning-content:focus-visible { box-shadow: 0 2px 0 var(--accent); }
    summary {
      font-size: 12px;
    }
    details {
      margin-top: 18px;
    }
    .form-actions {
      position: sticky;
      bottom: -28px;
      background: var(--surface);
      z-index: 2;
    }
  `,
})
export class LearningEditor implements OnInit, OnDestroy {
  life = inject(LifeService);
  entry = input<LearningEntry | null>(null);
  close = output<void>();
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
  tools = [
    { label: 'Heading', text: 'H', before: '## ', after: '' },
    { label: 'Bold', text: 'B', before: '**', after: '**' },
    { label: 'Italic', text: 'I', before: '*', after: '*' },
    { label: 'Bullet list', text: '• List', before: '- ', after: '' },
    { label: 'Numbered list', text: '1. List', before: '1. ', after: '' },
    { label: 'Checklist', text: '☐', before: '- [ ] ', after: '' },
    { label: 'Code block', text: '</>', before: '```\n', after: '\n```' },
    { label: 'Link', text: 'Link', before: '[', after: '](https://example.com)' },
  ];
  ngOnInit() {
    this.revision = this.life.tracker.data().revision ?? 0;
    const e = this.entry();
    if (e) {
      this.title = e.topic;
      this.content = [e.description, e.notes].filter(Boolean).join('\n\n');
      this.category = e.category;
      this.tags = e.tags?.join(', ') ?? '';
      this.date = e.date;
      this.minutes = e.minutes;
      this.resources = e.resources;
      this.activityId = e.activityId;
      this.next = e.next;
      this.pinned = !!e.pinned;
    } else if (this.life.tracker.api.enabled())
      void this.life.tracker.api
        .request<{ epoch: number; title: string; content: string } | null>('/drafts/learning')
        .then((d) => {
          this.draftEpoch = d?.epoch ?? 0;
          if (d && !this.destroyed && !this.content && !this.title) {
            this.title = d.title;
            this.content = d.content;
            this.draftState.set('Recovered your saved draft.');
          }
        })
        .catch(() =>
          this.draftState.set(
            'Draft unavailable. Your new note will remain in this editor until saved.',
          ),
        );
  }
  format(before: string, after: string) {
    const area = document.querySelector<HTMLTextAreaElement>('#learning-content');
    const start = area?.selectionStart ?? this.content.length,
      end = area?.selectionEnd ?? start;
    this.content =
      this.content.slice(0, start) +
      before +
      (this.content.slice(start, end) || 'text') +
      after +
      this.content.slice(end);
    this.draft();
    setTimeout(() => area?.focus());
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
    if (!this.content.trim() || this.life.tracker.api.busy()) return;
    this.error.set('');
    if ((this.life.tracker.data().revision ?? 0) !== this.revision) {
      this.error.set(
        'Your workspace changed while writing. Copy your note or reload the latest data before retrying.',
      );
      return;
    }
    const e = this.entry();
    const saved = this.life.saveLearning({
      ...e,
      id: e?.id ?? crypto.randomUUID(),
      topic:
        this.title.trim() ||
        this.content
          .replace(/^#+\s*/, '')
          .split('\n')[0]
          .slice(0, 100),
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
      this.close.emit();
    } else
      this.error.set(
        this.life.error() ||
          this.life.tracker.api.error() ||
          'Could not save this note. Your text is still here.',
      );
  }
  ngOnDestroy() {
    this.destroyed = true;
    clearTimeout(this.timer);
  }
}
