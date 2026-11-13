import { FormsModule } from '@angular/forms';
import { ApiService } from '../services/api';
import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  input,
  output,
  viewChild,
  inject,
} from '@angular/core';
import { Icon } from './icon';
@Component({
  selector: 'app-dialog',
  imports: [Icon],
  template: `<div
    class="modal-backdrop"
    animate.enter="dialog-enter"
    animate.leave="dialog-leave"
    (click)="requestClose()"
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
        <button class="icon-button" aria-label="Close dialog" (click)="requestClose()">
          <app-icon name="x" />
        </button>
      </div>
      <ng-content />
    </section>
  </div>`,
})
export class Dialog implements AfterViewInit {
  api = inject(ApiService);
  requestClose() {
    if (!this.api.busy()) this.close.emit();
  }
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
    if (e.key === 'Escape') this.requestClose();
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
  imports: [Dialog, FormsModule],
  template: `<app-dialog [title]="title()" (close)="cancel.emit()"
    ><p class="muted">{{ message() }}</p>
    @if (requireWord()) {
      <label
        >Type {{ requireWord() }} to confirm<input
          aria-label="Reset confirmation"
          [(ngModel)]="typed"
          autocomplete="off"
      /></label>
    }
    @if (api.error()) {
      <p class="error" role="alert">{{ api.error() }}</p>
    }
    @if (offerBackup()) {
      <button class="text-button" (click)="backup.emit()">Export data before resetting</button>
    }
    <div class="form-actions">
      <button class="btn" [disabled]="api.busy()" (click)="cancel.emit()">Cancel</button
      ><button
        class="btn danger"
        [disabled]="api.busy() || (!!requireWord() && typed !== requireWord())"
        (click)="confirm.emit(typed)"
      >
        {{ api.busy() ? 'Processing…' : label() }}
      </button>
    </div></app-dialog
  >`,
})
export class ConfirmDialog {
  title = input('Are you sure?');
  message = input('');
  label = input('Confirm');
  cancel = output<void>();
  api = inject(ApiService);
  requireWord = input('');
  offerBackup = input(false);
  backup = output<void>();
  typed = '';
  confirm = output<string>();
}
