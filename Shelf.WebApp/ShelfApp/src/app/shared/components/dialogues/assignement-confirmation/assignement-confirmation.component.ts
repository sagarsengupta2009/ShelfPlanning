import { Component, OnInit, Inject, ViewEncapsulation, ChangeDetectionStrategy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'srp-assignement-confirmation',
  templateUrl: './assignement-confirmation.component.html',
  styleUrls: ['./assignement-confirmation.component.scss']
})
export class AssignementConfirmationComponent implements OnInit {
  constructor(public dialogRef: MatDialogRef<AssignementConfirmationComponent>,
    @Inject(MAT_DIALOG_DATA) public message: string) { }

  ngOnInit(): void {
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }
  onYesClick() {
    this.dialogRef.close(true);
  }
}
