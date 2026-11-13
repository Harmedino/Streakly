import { Component, inject, input, OnInit, output } from '@angular/core';
import { EntryForm, FormField, FormValues } from './entry-form';
import { LifeService } from '../services/life';
import { money } from '../core/finance';
@Component({
  selector: 'app-quick-entry',
  imports: [EntryForm],
  template: `<app-entry-form
    [title]="title"
    [fields]="fields"
    [initial]="initial"
    [error]="life.error()"
    (save)="save($event)"
    (close)="close.emit()"
  />`,
})
export class QuickEntry implements OnInit {
  life = inject(LifeService);
  mode = input.required<'income' | 'expense' | 'learning' | 'progress'>();
  close = output<void>();
  fields: FormField[] = [];
  initial: FormValues = {};
  title = '';
  revision = 0;
  ngOnInit() {
    this.life.error.set('');
    this.revision = this.life.tracker.data().revision ?? 0;
    const mode = this.mode(),
      today = this.life.tracker.today();
    this.title = {
      income: 'Record income',
      expense: 'Record expense',
      learning: 'Record learning',
      progress: 'Mark daily progress',
    }[mode];
    this.initial = {
      date: today,
      category: mode === 'income' ? 'Salary' : mode === 'expense' ? 'Food' : 'Learning',
      accountId: '',
      activityId: '',
      quantity: 1,
    };
    const accounts = [
      { value: '', label: 'Unassigned · not included in account balances' },
      ...this.life.data().accounts.map((a) => ({ value: a.id, label: a.name })),
    ];
    if (mode === 'income' || mode === 'expense')
      this.fields = [
        {
          key: 'amount',
          label:
            'Amount (' +
            (this.life.tracker.data().preferences.currency &&
            this.life.tracker.data().preferences.currency !== 'NGN'
              ? this.life.tracker.data().preferences.currency
              : '₦') +
            ')',
          type: 'number',
          required: true,
          min: 0.01,
          step: '.01',
        },
        {
          key: 'source',
          label: mode === 'income' ? 'Income source' : 'Source / merchant',
          required: mode === 'income',
        },
        {
          key: 'category',
          label: 'Category',
          required: true,
          maxLength: 60,
          hint: 'Type an existing category or create your own.',
        },
        { key: 'date', label: 'Transaction date', type: 'date', required: true, max: today },
        { key: 'accountId', label: 'Payment account', type: 'select', options: accounts },
        { key: 'description', label: 'Notes', type: 'textarea', maxLength: 1000 },
      ];
    if (mode === 'learning')
      this.fields = [
        { key: 'topic', label: 'Learning topic', required: true, maxLength: 200 },
        { key: 'description', label: 'What I learned', type: 'textarea', required: true },
        { key: 'category', label: 'Learning category', required: true, maxLength: 60 },
        {
          key: 'minutes',
          label: 'Time spent (minutes)',
          type: 'number',
          required: true,
          min: 1,
          max: 1440,
          step: 1,
        },
        { key: 'date', label: 'Learning date', type: 'date', required: true, max: today },
        {
          key: 'activityId',
          label: 'Contribute to a streak',
          type: 'select',
          options: [
            { value: '', label: 'No linked streak' },
            ...this.life.tracker
              .active()
              .filter(
                (a) =>
                  a.frequency !== 'once' &&
                  (a.progressType === 'duration' || a.quantityTarget === 1),
              )
              .map((a) => ({ value: a.id, label: a.name })),
          ],
        },
      ];
    if (mode === 'progress')
      this.fields = [
        {
          key: 'activityId',
          label: 'Streak activity',
          type: 'select',
          required: true,
          options: this.life.tracker.active().map((a) => ({
            value: a.id,
            label: a.name + ' · target ' + a.quantityTarget + ' ' + a.unit,
          })),
        },
        { key: 'date', label: 'Completion date', type: 'date', required: true, max: today },
        {
          key: 'quantity',
          label: 'Actual progress total',
          type: 'number',
          required: true,
          min: 0,
          max: 1000000,
          hint: 'Use 1 for a Yes/No activity. Enter the total minutes or units for quantity targets.',
        },
        { key: 'note', label: 'Completion note', type: 'textarea', maxLength: 1000 },
      ];
    const primary: Record<string, string[]> = {
      income: ['amount', 'source'],
      expense: ['amount', 'category', 'description'],
      learning: ['description'],
      progress: ['activityId', 'quantity'],
    };
    this.fields = this.fields.map((f) => ({
      ...f,
      advanced: !primary[mode].includes(f.key),
      required: primary[mode].includes(f.key) ? f.required : false,
    }));
  }
  async save(v: FormValues) {
    if ((this.life.tracker.data().revision ?? 0) !== this.revision) {
      this.life.error.set('Data changed while this form was open. Reopen it before saving.');
      return;
    }
    const s = (k: string) => String(v[k] ?? '').trim();
    try {
      let saved = false;
      const mode = this.mode();
      if (mode === 'income' || mode === 'expense')
        saved = this.life.saveTransaction({
          id: crypto.randomUUID(),
          kind: mode,
          amount: money(s('amount')),
          source: s('source'),
          category: s('category'),
          date: s('date'),
          accountId: s('accountId'),
          toAccountId: '',
          description: s('description'),
        });
      if (mode === 'learning')
        saved = this.life.saveLearning({
          id: crypto.randomUUID(),
          topic: s('topic'),
          description: s('description'),
          category: s('category'),
          date: s('date'),
          minutes: Number(v['minutes']),
          activityId: s('activityId'),
          resources: '',
          notes: '',
          next: '',
        });
      if (mode === 'progress') {
        const a = this.life.tracker.active().find((a) => a.id === s('activityId'));
        if (!a) throw new Error('Choose an existing activity.');
        saved = this.life.tracker.record(a, s('date'), Number(v['quantity']), s('note'));
        if (!saved)
          this.life.error.set(
            this.life.tracker.storage.error() ||
              'This day cannot be marked. Check the activity start, schedule, pause and protection settings.',
          );
      }
      if (saved && (await this.life.tracker.settled())) this.close.emit();
    } catch (e) {
      this.life.error.set(e instanceof Error ? e.message : 'Check the entered values.');
    }
  }
}
