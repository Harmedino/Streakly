import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  viewChild,
} from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'app-dialog',
  imports: [Icon],
  template: `<div
    class="modal-backdrop"
    animate.enter="dialog-enter"
    animate.leave="dialog-leave"
    (click)="close.emit()"
  >
    <section
      #panel
      class="modal"
      role="dialog"
      aria-modal="true"
      [attr.aria-label]="title()"
      tabindex="-1"
      (click)="$event.stopPropagation()"
    >
      <div class="modal-head">
        <div>
          <span class="eyebrow">A LITTLE INTENTION</span>
          <h2>{{ title() }}</h2>
        </div>
        <button class="icon-button" aria-label="Close dialog" (click)="close.emit()">
          <app-icon name="x" />
        </button>
      </div>
      <ng-content />
    </section>
  </div>`,
})
export class Dialog implements AfterViewInit {
  title = input('');
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
    if (e.key === 'Escape') this.close.emit();
    if (e.key === 'Tab') {
      const els = Array.from(
        this.panel().nativeElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input,select,textarea,[href]',
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
@Component({
  selector: 'app-confirm',
  imports: [Dialog],
  template: `<app-dialog [title]="title()" (close)="cancel.emit()"
    ><p class="muted">{{ message() }}</p>
    <div class="form-actions">
      <button class="btn" (click)="cancel.emit()">Cancel</button
      ><button class="btn danger" (click)="confirm.emit()">{{ label() }}</button>
    </div></app-dialog
  >`,
})
export class ConfirmDialog {
  title = input('Are you sure?');
  message = input('');
  label = input('Confirm');
  cancel = output<void>();
  confirm = output<void>();
}
