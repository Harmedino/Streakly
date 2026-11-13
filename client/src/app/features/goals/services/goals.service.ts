import { Injectable, inject } from '@angular/core';
import { Goal } from '../../../core/models/life';
import { LifeService } from '../../../core/services/life';
import { goalPercent, goalTracking } from '../../../core/utils/workflows';
@Injectable({ providedIn: 'root' })
export class GoalsService {
  life = inject(LifeService);
  tracker = this.life.tracker;
  save(goal: Goal) {
    return this.life.saveGoal(goal);
  }
  complete(goal: Goal) {
    const next = structuredClone(goal),
      done = goalPercent(goal) === 100;
    if (next.source && next.source !== 'manual') return false;
    if (goalTracking(next) === 'milestones')
      next.milestones.forEach((m) => {
        m.done = !done;
        m.manualDone = !done;
        m.completedOn = !done ? this.tracker.today() : '';
      });
    else if (goalTracking(next) === 'numeric') next.current = done ? 0 : (next.target ?? 100);
    next.progress = done ? 0 : 100;
    next.status = done ? 'active' : 'completed';
    return this.save(next);
  }
  moveMilestone(goal: Goal, id: string, direction: number) {
    const next = structuredClone(goal),
      from = next.milestones.findIndex((m) => m.id === id),
      to = from + direction;
    if (to < 0 || to >= next.milestones.length) return false;
    [next.milestones[from], next.milestones[to]] = [next.milestones[to], next.milestones[from]];
    return this.save(next);
  }
}
