import { Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon.component';
@Component({
  selector: 'app-empty',
  imports: [Icon],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyState {
  title = input('Make room for a little growth.');
  description = input('Your next chapter starts with one small action.');
  action = input('');
  activate = output<void>();
}
