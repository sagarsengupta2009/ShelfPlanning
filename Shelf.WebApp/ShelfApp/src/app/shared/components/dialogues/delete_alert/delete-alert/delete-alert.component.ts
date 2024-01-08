import { Component, OnInit, Inject, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './delete-alert.component.html',
  styleUrls: ['./delete-alert.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DeleteAlertComponent  {

  constructor(public dialogRef: MatDialogRef<DeleteAlertComponent>,
    @Inject(MAT_DIALOG_DATA) public message: string) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
