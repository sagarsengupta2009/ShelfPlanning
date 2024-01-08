import { Injectable } from '@angular/core';
import { LogsDataObject, LogsListItem } from 'src/app/shared/models';
import { ParentApplicationService } from '../../common';
declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class PaBroadcasterService {

  constructor(private readonly parentApp: ParentApplicationService) { }

  public updatePogDownload(pogId: string | number, isDownloaded: boolean): void {
    window.parent.updatePogDownload(pogId, isDownloaded);
  }

  public setCurrentActivePanel(): void {
    window.parent.setActivePanel();
    window.focus();
  }

  public expandFrame(expand: boolean): void {
    if(this.parentApp.isAllocateApp) {
      window.parent.expandFrame(expand);
    }
  }

  public updatePAGrid(isManual: boolean): void {
    if(window.parent.currentScreen === 'layouts' ) {
      if (isManual && window.parent.currentProjectType != 'NICI') {
        window.parent.updataBlockData(true);
      }
      // NPI updated
      if (window.parent.refreshAllProducts == true && typeof window.parent.updatePlacementData == 'function') {
        window.parent.updatePlacementData();
      }
    }
    
  }

  public resizeParentWindow(expand: boolean): void {
    if (this.parentApp.isAllocateApp) {
      window.parent.expandFrame(expand);
    }
  }

  public updateInfoConsole(logList: LogsDataObject | LogsListItem): void {
    window.parent.updateInfoConsole(logList);
  }

  public updateBlockData(): void {
    window.parent.updataBlockData();
  }

  public openBulkOperation(): void {
    window.parent.openBulkOperation();
  }

  public toastMessage(message: string): void {
    window.parent.toastMessage(message);
  }
  
  public approveRejectToReview(selectedMenu: string, data: {modelId: string, scenarioId: number}): void {
    window.parent.approveRejectToReview(selectedMenu, data);
  }
}
