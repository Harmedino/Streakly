import { Component, OnInit, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api';
import { Dialog } from '../dialog/index';
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
  templateUrl: './entry-form.component.html',
  styleUrl: './entry-form.component.scss',
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
