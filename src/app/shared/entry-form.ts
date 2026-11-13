import { inject } from '@angular/core';
import { ApiService } from '../services/api';
import { Component, input, output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from './dialog';
export interface FormField {
  key: string;
  label: string;
  type?: 'text' | 'textarea' | 'date' | 'month' | 'number' | 'url' | 'select' | 'checkbox';
  required?: boolean;
  advanced?: boolean;
  maxLength?: number;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  hint?: string;
  options?: { value: string; label: string }[];
}
export type FormValues = Record<string, string | number | boolean>;
@Component({
  selector: 'app-entry-form',
  imports: [FormsModule, Dialog],
  template: `<app-dialog [title]="title()" (close)="close.emit()"
    ><form (ngSubmit)="submit()" #form="ngForm">
      <div class="entry-fields">
        @for (field of fields(); track field.key) {
          <label
            [hidden]="field.advanced && !more"
            [class.checkbox-label]="field.type === 'checkbox'"
            [class.entry-wide]="
              !['date', 'month', 'number'].includes(field.type || 'text') || field.key === 'amount'
            "
            [class.entry-amount]="field.key === 'amount'"
            >{{ field.label }}
            @switch (field.type) {
              @case ('textarea') {
                <textarea
                  [name]="field.key"
                  [attr.aria-label]="field.label"
                  [attr.aria-describedby]="field.hint ? 'entry-hint-' + field.key : null"
                  [(ngModel)]="values[field.key]"
                  [required]="!!field.required"
                  [maxlength]="field.maxLength ?? 5000"
                  rows="3"
                ></textarea>
              }
              @case ('select') {
                <select
                  [name]="field.key"
                  [attr.aria-label]="field.label"
                  [attr.aria-describedby]="field.hint ? 'entry-hint-' + field.key : null"
                  [(ngModel)]="values[field.key]"
                  [required]="!!field.required"
                >
                  @for (option of field.options; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              }
              @case ('checkbox') {
                <input
                  type="checkbox"
                  [name]="field.key"
                  [attr.aria-label]="field.label"
                  [attr.aria-describedby]="field.hint ? 'entry-hint-' + field.key : null"
                  [(ngModel)]="values[field.key]"
                />
              }
              @default {
                <input
                  [type]="field.type ?? 'text'"
                  [name]="field.key"
                  [attr.aria-label]="field.label"
                  [attr.aria-describedby]="field.hint ? 'entry-hint-' + field.key : null"
                  [(ngModel)]="values[field.key]"
                  [required]="!!field.required"
                  [maxlength]="field.maxLength ?? 200"
                  [attr.min]="field.min ?? null"
                  [attr.max]="field.max ?? null"
                  [attr.step]="field.step ?? 'any'"
                />
              }
            }
            @if (field.hint) {
              <span class="helper" [id]="'entry-hint-' + field.key">{{ field.hint }}</span>
            }
          </label>
        }
      </div>
      @if (hasOptions()) {
        <button
          type="button"
          class="text-button more-options"
          [attr.aria-expanded]="more"
          (click)="more = !more"
        >
          {{ more ? 'Fewer options' : 'More Options' }}
          <span aria-hidden="true">{{ more ? '−' : '+' }}</span>
        </button>
      }
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
      @if (api.error()) {
        <p class="error" role="alert">{{ api.error() }}</p>
      }
      @if (localError) {
        <p class="error" role="alert">{{ localError }}</p>
      }
      <div class="form-actions">
        <button type="button" class="btn" [disabled]="api.busy()" (click)="close.emit()">
          Cancel</button
        ><button class="btn primary" type="submit" [disabled]="form.invalid || api.busy()">
          {{ api.busy() ? 'Saving…' : submitLabel() }}
        </button>
      </div>
    </form></app-dialog
  >`,
})
export class EntryForm implements OnInit {
  api = inject(ApiService);
  title = input.required<string>();
  fields = input.required<FormField[]>();
  initial = input<FormValues>({});
  error = input('');
  submitLabel = input('Save record');
  save = output<FormValues>();
  close = output<void>();
  values: FormValues = {};
  more = false;
  hasOptions() {
    return this.fields().some((f) => f.advanced);
  }
  localError = '';
  ngOnInit() {
    for (const f of this.fields())
      this.values[f.key] = this.initial()[f.key] ?? (f.type === 'checkbox' ? false : '');
  }
  submit() {
    if (
      this.fields().some(
        (f) => f.required && f.type !== 'checkbox' && !String(this.values[f.key] ?? '').trim(),
      )
    ) {
      this.localError = 'Complete the required fields.';
      return;
    }
    this.localError = '';
    this.save.emit({ ...this.values });
  }
}
