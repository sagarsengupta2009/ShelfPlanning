import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
  selector: 'sp-scenario-dialog',
  templateUrl: './scenario-dialog.component.html',
  styleUrls: ['./scenario-dialog.component.scss']
})
export class ScenarioDialogComponent {

  constructor(
    public dialogRef: MatDialogRef<ScenarioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) { }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
