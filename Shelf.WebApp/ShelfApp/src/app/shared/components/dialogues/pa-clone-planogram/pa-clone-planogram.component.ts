import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'srp-clone-planogram',
  templateUrl: './pa-clone-planogram.component.html',
  styleUrls: ['./pa-clone-planogram.component.scss']
})
export class PAClonePlanogramComponent implements OnInit {
  constructor(
    public dialogRef: MatDialogRef<PAClonePlanogramComponent>,
    @Inject(MAT_DIALOG_DATA) public pogName: string) { }

  public ngOnInit(): void {
  }
  public onNoClick(): void {
    this.dialogRef.close();
  }
}
