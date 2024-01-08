import { Injectable } from '@angular/core';
import { PanelService } from '../panel.service';
import { SharedService } from '../../../../../../../common/shared/shared.service';

@Injectable({
  providedIn: 'root'
})

export class PanelHeaderService {

  constructor(private panelService: PanelService,
    private SharedService: SharedService) { }

  setActiveSectionID(sectionID: any, componentID: any) {
    if (sectionID != undefined && componentID != undefined && sectionID != '') {
      if (this.SharedService.getActiveSectionId() == sectionID && this.SharedService.getActiveComponentNumber() == componentID) {
        return;
      } else {
        //CuiConsoleLogService.resetAllLog();
        //CuiConsoleLogService.setClientLog(CuiConsoleLogService.getAllConsoleLog());
        this.SharedService.setActiveSectionId(sectionID);
        this.SharedService.setActiveComponentNumber(componentID);
      }
    }
  }
}
