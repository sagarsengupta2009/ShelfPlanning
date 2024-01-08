import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { PlanogramInfo } from 'src/app/shared/models/planogram-library/planogram-list';
import { PogData } from 'src/app/shared/models/shelf-planogram';
import { SharedService, PlanogramService, PogSideNavStateService } from 'src/app/shared/services';
import { Subscription } from 'rxjs';
import { PogSideNaveView } from 'src/app/shared/models';
@Component({
  selector: 'shelf-sidebar-navigation',
  templateUrl: './sidebar-navigation.component.html',
  styleUrls: ['./sidebar-navigation.component.scss']
})
export class SidebarNavigationComponent implements OnInit,OnDestroy {
  @Input() activeScreen: string;
  @Input() filterText: string;
  @Input() pogInfo: PlanogramInfo;
  @Input() isPin: boolean;
  @Input() sidenavWidth: number;
  @Input() pogData: PogData;
  @Input() isPlanogramDownload: boolean;
  @Output() viewSideNav = new EventEmitter();
  private subscriptions = new Subscription();

  constructor(public readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,private readonly PogSideNavStateService: PogSideNavStateService) { }

  public ngOnInit() {
    this.subscriptions.add(this.PogSideNavStateService.sidenavWidthChange.subscribe((width:number) => {
        this.sidenavWidthChange(width);
    }))
  }

  public sidenavWidthChange(width: number): void {
    this.sidenavWidth = width;
    this.PogSideNavStateService.activeVeiw = this.activeScreen as any;
    this.PogSideNavStateService.getActive().width = width;
    this.viewSideNav.emit({ isPin: this.isPin, activeScreen: this.activeScreen, sidenavWidth: this.sidenavWidth });
  };

  public onsideNav(): void {
    this.filterText = '';
    this.PogSideNavStateService.activeVeiw = this.activeScreen as any;
    this.PogSideNavStateService.getActive().isPinned = this.isPin;
    let pinnedView = this.PogSideNavStateService.getAllViews().filter(it => it.isPinned === true && it.id!=this.PogSideNavStateService.activeVeiw);
    if(pinnedView.length>0){
      this.activeScreen = pinnedView.reverse()[0].id;
      this.isPin = pinnedView.reverse()[0].isPinned;
    }else {
      this.activeScreen = '';
      this.isPin = false;
    }
    this.viewSideNav.emit({ isPin: this.isPin, activeScreen: this.activeScreen, sidenavWidth: this.sidenavWidth });
    const res = this.planogramService.setPinUnpinAppSetting();
    this.subscriptions.add(res.subscribe());
    this.PogSideNavStateService.activeVeiw = this.activeScreen as PogSideNaveView;
  };

  public onPin(isPin: boolean, sideNavValue?: string): void {
    this.isPin = isPin;
    this.sidenavWidth= this.PogSideNavStateService.getActive().width;
    this.viewSideNav.emit({ isPin: this.isPin, activeScreen: this.activeScreen, sidenavWidth: this.sidenavWidth });
    if (sideNavValue) {
      this.PogSideNavStateService.activeVeiw = this.activeScreen as any;
      this.PogSideNavStateService.getActive().isPinned = this.isPin;
      const res = this.planogramService.setPinUnpinAppSetting();
      this.subscriptions.add(res.subscribe());
    };
    setTimeout(() => {
      this.sharedService.updatematTab.next(true);
    }, 100);
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
