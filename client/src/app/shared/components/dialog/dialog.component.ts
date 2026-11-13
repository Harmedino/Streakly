import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { ApiService } from '../../../core/services/api';
import { Icon } from '../icon/icon.component';
@Component({
  selector: 'app-dialog',
  imports: [Icon],
  templateUrl: './dialog.component.html',
  styleUrl: './dialog.component.scss',
})
export class Dialog implements AfterViewInit {
  api = inject(ApiService);
  requestClose() {
    if (!this.api.busy()) this.close.emit();
  }
  title = input('');
  fullScreen = input(false);
  close = output<void>();
  panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private previous = document.activeElement as HTMLElement | null;
  ngAfterViewInit() {
    this.panel().nativeElement.focus();
  }
  ngOnDestroy() {
    this.previous?.focus();
  }
  @HostListener('document:keydown', ['$event']) key(e: KeyboardEvent) {
    if (e.key === 'Escape') this.requestClose();
    if (e.key === 'Tab') {
      const els = Array.from(
        this.panel().nativeElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[href],[contenteditable="true"],[tabindex]:not([tabindex="-1"])',
        ),
      ).filter((x) => x.offsetParent !== null);
      if (!els.length) {
        e.preventDefault();
        return;
      }
      const first = els[0],
        last = els.at(-1)!;
      if (
        e.shiftKey &&
        (document.activeElement === first || document.activeElement === this.panel().nativeElement)
      ) {
        last.focus();
        e.preventDefault();
      } else if (
        !e.shiftKey &&
        (document.activeElement === last || document.activeElement === this.panel().nativeElement)
      ) {
        first.focus();
        e.preventDefault();
      }
    }
  }
}
