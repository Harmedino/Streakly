import { Component, input } from '@angular/core';
@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrl: './progress.component.scss',
})
export class Progress {
  value = input(0);
}
