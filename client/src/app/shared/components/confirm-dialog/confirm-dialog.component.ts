import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api';
import { Dialog } from '../dialog/dialog.component';
@Component({
  selector: 'app-confirm',
  imports: [Dialog, FormsModule],
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.scss',
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
