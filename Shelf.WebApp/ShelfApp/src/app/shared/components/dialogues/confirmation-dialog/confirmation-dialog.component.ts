import { Component, Inject, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'srp-confirmation-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirmation-dialog.component.html',
  styleUrls: ['./confirmation-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ConfirmationDialogComponent {

  constructor(
    private readonly dialogRef: MatDialogRef<ConfirmationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly message: string, // used in html
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
