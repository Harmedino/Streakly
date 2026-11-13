import { AppData } from '../models/tracker';
import { isFrozen, isPaused, isRest, isScheduled } from './streaks';
export function syncLearning(data: AppData, pairs: { activityId: string; date: string }[]) {
  const life = data.life!;
  for (const { activityId, date } of [
    ...new Map(
      pairs.filter((p) => p.activityId).map((p) => [p.activityId + ':' + p.date, p]),
    ).values(),
  ]) {
    const a = data.activities.find((a) => a.id === activityId);
    if (!a) throw new Error('Choose an existing streak activity.');
    const entries = life.learning.filter((e) => e.activityId === activityId && e.date === date);
    let credit = life.learningCredits.find((c) => c.activityId === activityId && c.date === date);
    if (entries.length) {
      if (
        !credit &&
        (a.archived ||
          a.frequency === 'once' ||
          (a.progressType !== 'duration' && a.quantityTarget !== 1) ||
          !isScheduled(a, date) ||
          isFrozen(a, date) ||
          isPaused(a, date) ||
          isRest(a, date))
      )
        throw new Error(
          'Link learning to an active binary or duration streak on a scheduled, unprotected date.',
        );
      if (!credit) {
        const record = data.completions.find((c) => c.activityId === activityId && c.date === date);
        credit = {
          activityId,
          date,
          baseQuantity: record?.quantity ?? 0,
          baseNote: record?.note ?? '',
        };
        life.learningCredits.push(credit);
      }
    }
    if (!credit) continue;
    const quantity = entries.length
      ? a.progressType === 'duration'
        ? credit.baseQuantity + entries.reduce((n, e) => n + e.minutes, 0)
        : Math.max(credit.baseQuantity, 1)
      : credit.baseQuantity;
    if (quantity > 1000000) throw new Error('The combined learning progress is too large.');
    data.completions = data.completions.filter(
      (c) => c.activityId !== activityId || c.date !== date,
    );
    if (quantity > 0) data.completions.push({ activityId, date, quantity, note: credit.baseNote });
    if (!entries.length) life.learningCredits = life.learningCredits.filter((c) => c !== credit);
  }
}
