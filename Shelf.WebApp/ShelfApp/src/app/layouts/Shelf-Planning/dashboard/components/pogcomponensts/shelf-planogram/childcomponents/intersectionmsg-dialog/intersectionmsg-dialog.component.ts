import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { uniq } from 'lodash-es';
import { InterSectionMessage } from 'src/app/shared/models';
import {
  HistoryService, PlanogramService, ParentApplicationService,
} from 'src/app/shared/services';

@Component({
  selector: 'app-intersectionmsg-dialog',
  templateUrl: './intersectionmsg-dialog.component.html',
  styleUrls: ['./intersectionmsg-dialog.component.scss']
})
export class IntersectionmsgDialogComponent implements OnInit {

  public messages: string[];

  constructor(
    private readonly dialogRef: MatDialogRef<IntersectionmsgDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: InterSectionMessage,
    private readonly historyService: HistoryService,
    private readonly planogramService: PlanogramService,
    private readonly parentApp: ParentApplicationService,
  ) {
    dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    this.openDialog();
  }

  public openDialog(): void {
    if (!this.parentApp.isShelfInAutoMode) {
      this.planogramService.dialogOpened = true;
      this.messages = uniq(this.data.message);
    }
  }

  public okClick(): void {
    this.planogramService.dialogOpened = false;

    if (this.data.revertFlag) {
      this.historyService.abandonLastCapturedActionInHistory(this.planogramService.historyUniqueID || this.data.historyUniqueID);
      this.planogramService.historyUniqueID = null;
      this.planogramService.pogIntersectionsCheck = false;
      this.planogramService.effectedPogObjIds.length = 0;
    }
    this.dialogRef.close();
  }

}
