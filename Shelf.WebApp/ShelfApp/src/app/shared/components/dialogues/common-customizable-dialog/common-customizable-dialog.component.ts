import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

interface CommonCustomizableDialogData {
  message?: string;
  buttons?: CustomButton[];
  showCloseIcon?: boolean;
}

interface CustomButton {
  text?: string;
  callBackValue?: any; // callBackValue could be anything so type should be any
  color?: string;
  customClass?: string;
}

@Component({
  selector: 'shelf-common-customizable-dialog',
  templateUrl: './common-customizable-dialog.component.html',
  styleUrls: ['./common-customizable-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CommonCustomizableDialogComponent {

  constructor(
    private readonly dialogRef: MatDialogRef<CommonCustomizableDialogComponent>,
    public readonly translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public readonly data: CommonCustomizableDialogData
  ) { }

  closeDialog(): void {
    this.dialogRef.close();
  }

}
