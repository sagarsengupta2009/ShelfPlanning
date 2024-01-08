import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'shelf-confirm-baymapping-reset',
  templateUrl: './confirm-baymapping-reset.component.html',
  styleUrls: ['./confirm-baymapping-reset.component.scss']
})
export class ConfirmBaymappingResetComponent implements OnInit {

  constructor(
    public dialogRef: MatDialogRef<ConfirmBaymappingResetComponent>
  ) { }

  ngOnInit(): void {
  }

  public closeDialog(confirmation: boolean): void {
    this.dialogRef.close(confirmation);
  }
}
