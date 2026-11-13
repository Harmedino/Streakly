import { AppData, AutomationTrigger } from '../models/tracker';
import { isScheduled, isPaused, isRest, isFrozen } from './streaks';
export function reconcileAutomation(data: AppData) {
  const prior = data.autoCredits ?? [];
  for (const c of prior) {
    if (!data.activities.some((a) => a.id === c.activityId)) continue;
    data.completions = data.completions.filter(
      (e) => e.activityId !== c.activityId || e.date !== c.date,
    );
    if (c.baseQuantity > 0)
      data.completions.push({
        activityId: c.activityId,
        date: c.date,
        quantity: c.baseQuantity,
        note: c.baseNote,
      });
  }
  data.autoCredits = [];
  const life = data.life!;
  for (const a of data.activities.filter((a) => a.automation)) {
    if (!['daily', 'weekly'].includes(a.frequency) || a.quantityTarget !== 1)
      throw new Error('Automatic streaks support daily or weekly Yes/No tracking.');
    if (life.learning.some((e) => e.activityId === a.id))
      throw new Error('Unlink manual learning credits before enabling this automatic rule.');
    const rule = a.automation!,
      minimum = rule.minimum ?? 0;
    let events: { id: string; date: string; score: number }[] = [];
    if (rule.trigger === 'learning')
      events = life.learning
        .filter((e) => (e.description || e.notes || e.topic).trim())
        .map((e) => ({ id: e.id, date: e.date, score: e.minutes }));
    if (rule.trigger === 'jobs')
      events = life.jobs.map((e) => ({ id: e.id, date: e.date, score: 1 }));
    if (rule.trigger === 'expenses')
      events = life.transactions
        .filter((e) => e.kind === 'expense')
        .map((e) => ({ id: e.id, date: e.date, score: e.amount }));
    if (rule.trigger === 'journal')
      events = life.journal
        .filter((e) =>
          [e.accomplished, e.learned, e.challenges, e.ideas, e.improve, e.tomorrow].some((t) =>
            t.trim(),
          ),
        )
        .map((e) => ({ id: e.id, date: e.date, score: 1 }));
    if (rule.trigger === 'planning')
      events = (data.todos ?? [])
        .filter((e) => e.done && e.completedOn)
        .map((e) => ({ id: e.id, date: e.completedOn!, score: 1 }));
    const groups = new Map<string, typeof events>();
    for (const e of events) {
      const g = groups.get(e.date) ?? [];
      g.push(e);
      groups.set(e.date, g);
    }
    for (const [date, rows] of groups) {
      if (a.archived && !prior.some((c) => c.activityId === a.id && c.date === date)) continue;
      if (
        rows.reduce((n, e) => n + e.score, 0) < minimum ||
        !isScheduled(a, date) ||
        isPaused(a, date) ||
        isRest(a, date) ||
        isFrozen(a, date)
      )
        continue;
      const base = data.completions.find((e) => e.activityId === a.id && e.date === date);
      data.autoCredits.push({
        activityId: a.id,
        date,
        baseQuantity: base?.quantity ?? 0,
        baseNote: base?.note ?? '',
        sources: rows.map((e) => e.id),
        trigger: rule.trigger as AutomationTrigger,
      });
      data.completions = data.completions.filter((e) => e.activityId !== a.id || e.date !== date);
      data.completions.push({
        activityId: a.id,
        date,
        quantity: Math.max(1, base?.quantity ?? 0),
        note:
          base?.note ||
          'Automatic · ' + rule.trigger + ' · ' + rows.length + ' qualifying record(s)',
      });
    }
  }
}
