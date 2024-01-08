import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';

import { speedDialFabAnimations } from './speed-dial-fab.animations';
import { PogSideNavStateService, SharedService, UserPermissionsService } from '../../services';
import { FabButton, PogSideNaveView } from '../../models';

@Component({
  selector: 'srp-fab-speed-dial',
  templateUrl: './fab-speed-dial.component.html',
  styleUrls: ['./fab-speed-dial.component.scss'],
  animations: speedDialFabAnimations,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FabSpeedDialComponent {
  @Input('buttons') fabButtons: FabButton[];
  @Output() iconClickEvent = new EventEmitter<string>();

  public buttons: FabButton[] = [];
  public fabTogglerState = 'inactive';
  public link: string;
  constructor(
    private readonly sharedService: SharedService,
    private readonly userPermissions: UserPermissionsService,
    private readonly pogSideNavStateService: PogSideNavStateService
  ) {
    this.link = this.sharedService.link;
  }

  public defaultbtn = {
    icon: 'open_in_new',
    tooltip: 'Planogram Library',
    btncolor: 'btn-blue'
  };

  private showItems(): void {
    this.fabTogglerState = 'active';
    this.buttons = this.fabButtons;
  }

  private hideItems(): void {
    this.fabTogglerState = 'inactive';
    this.buttons = [];
  }

  public onToggleFab(): void {
    this.buttons.length ? this.hideItems() : this.showItems();
  }

  public onClickFab(btn: { icon: string }): void {
    this.iconClickEvent.emit(btn.icon);
  }

  public OnSelectionChange(data: FabButton): boolean {
    let value: boolean;
    if (data) {
      switch (data[`icon`]) {
        case 'add_to_photos'://create new planogram
          value = this.sharedService.vmode ? true : false;
          break;
        case 'dns'://fixture
          value = !this.checkAllowLiveEdit(false);
          break
        case 'description'://product       
          value = !this.checkAllowLiveEdit(true);
          break;
        case 'pegicon'://peg library       
          value = !this.checkAllowLiveEdit(false);
          break;
      }
    }
    return value
  }

  public checkAllowLiveEdit(fromProductLib?:boolean): boolean {
    if (!this.sharedService.vmode) {
      const activeView = this.pogSideNavStateService.getActive()?.id ;
      const pinnedView = this.pogSideNavStateService.getPinAll()?.id;
      let isPLActiveView: boolean;
      if(!this.sharedService.getActiveSectionId() && (pinnedView != PogSideNaveView.PRODUCT_LIBRARY)) {//unloadstate
        isPLActiveView = false;
      } else {
        isPLActiveView = (activeView && (activeView == PogSideNaveView.PRODUCT_LIBRARY));
      }   
       return fromProductLib? !isPLActiveView : true;
       }
    return this.userPermissions.hasUpdatePermission('WEB_VIEW_LIVE_POG_EDIT');
  }
}

export enum SpeedDialFabPosition {
  Top = 'top',
  Bottom = 'bottom',
  Left = 'left',
  Right = 'right'
}
