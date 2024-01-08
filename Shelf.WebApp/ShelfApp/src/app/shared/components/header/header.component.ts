import { Component, OnInit, HostListener, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { HelpComponent } from '../help/help.component';
import { SettingsComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/settings';
import { INotificationStrings, IAboutUsPackageStrings, IAccountPackageStrings, PanelSplitterViewType, ZoomType } from '../../models';
import {
  SharedService, ThemeService, PanelService,
  PlanogramStoreService, LanguageService, ParentApplicationService,
  SplitterService,
  PaBroadcasterService,
  AllocateService,
  AllocateEventService,
  PogSideNavStateService
} from 'src/app/shared/services';

declare const window: any;

@Component({
  selector: 'srp-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  public view: PanelSplitterViewType;

  public notificationStrings: INotificationStrings = null;
  public accountPackageStrings: IAccountPackageStrings = null;
  public aboutUsPackageStrings: IAboutUsPackageStrings = null;

  private isOnCompatMode = true;
  private subscriptions: Subscription = new Subscription();
  //Move or Copy toggle button: true for copy and false for move, initially true means copy
  public moveOrCopy: boolean = true;
  public updateMoveOrCopy(): void {
    this.sharedService.moveOrCopy = this.moveOrCopy = !this.moveOrCopy;
  }
  public get canRender(): boolean {
    return this.language.isReady && this.parentApp.isReady
      && !this.parentApp.isAllocateApp
      && !this.parentApp.isAssortAppInIAssortNiciMode
  }

  public get isAssort(): boolean {
    return this.parentApp.isAssortApp;
  }

  public get isWebView(): boolean {
    return this.parentApp.isWebViewApp;
  }

  public get isShelfLoaded(): boolean {
    return this.sharedService.isShelfLoaded;
  }

  public get isSyncMode(): boolean {
    return this.sharedService.shelfSyncMode;
  }

  constructor(
    private readonly zone: NgZone,
    private readonly themeService: ThemeService,
    private readonly sharedService: SharedService,
    private readonly openSettingDialog: MatDialog,
    private readonly planogramStore: PlanogramStoreService,
    private readonly translate: TranslateService,
    private readonly language: LanguageService,
    private readonly panelService: PanelService,
    private readonly parentApp: ParentApplicationService,
    private readonly splitterService: SplitterService,
    private readonly paBroadcaster: PaBroadcasterService,
    private readonly allocateService: AllocateService,
    private readonly changeDetector : ChangeDetectorRef,
    private readonly allocateEvent: AllocateEventService,
    private readonly pogSideNavStateService: PogSideNavStateService

  ) { }

  @HostListener('click', ['$event']) click(e) {
    e.stopPropagation();
  }
  @HostListener('document:click') resetToggle() {
    if (!this.isOnCompatMode) {
      this.openNav();
    }
  }

  @HostListener('window:keyup.esc') onKeyUp() {
    this.sharedService.GridValueUpdated(false);
  }

  public ngOnInit(): void {
    this.registerEvents();
    this.sharedService.shelfSyncMode = true;
    this.setUserPreference();
    this.setview(PanelSplitterViewType.Full);
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public setview(viewId: number) {

    this.view = viewId;
    this.planogramStore.splitterViewMode = {
      ...this.planogramStore.splitterViewMode,
      displayMode: viewId
    }
    if (viewId === PanelSplitterViewType.Full) {
      this.splitterService.changeSplitterOrientation(viewId);
    } else {
      this.splitterService.changeSplitterOrientation(viewId);
    }
    if (viewId == PanelSplitterViewType.SideBySide) {
      this.splitterService.spitterView.next(true);
    } else {
      this.splitterService.spitterView.next(false);
    }
    this.sharedService.updatematTab.next(true);

    this.panelService.panelSyncEventInvoked.next(true);

    this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
  }

  public openNav(): void {
    this.isOnCompatMode = !this.isOnCompatMode;
    this.sharedService.changeSideNav(this.isOnCompatMode);
  }

  public openPlanogramSettings(): void {
      const dialogRef = this.openSettingDialog.open(SettingsComponent, {
        width: '50vw',
        height: '76%'
      });
      this.subscriptions.add(
        dialogRef.afterClosed().subscribe((result: any) => {
          if(this.parentApp.isAllocateApp) {
            this.paBroadcaster.expandFrame(false);
          }
        }));
      this.showHeaderFooter(false);
  }

  public syncShelf(): void {
    const storedMode = this.planogramStore.splitterViewMode;
    const previousSyncMode = storedMode.syncMode;
    this.planogramStore.splitterViewMode = {
      ...storedMode,
      syncMode: !previousSyncMode
    };
    this.sharedService.shelfSyncMode = !this.sharedService.shelfSyncMode;

    this.panelService.panelSyncEventInvoked.next(true);
    if (this.sharedService.shelfSyncMode &&
      this.planogramStore.splitterViewMode.displayMode != PanelSplitterViewType.Full) {
      this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
    }
  }

  private setUserPreference(): void {
    const currentTheme = this.themeService.getCurrentThemeName();
    this.themeService.setTheme(currentTheme);
    if (!this.splitterService.getSplitterView()) { this.splitterService.setSplitterView(PanelSplitterViewType.Full); }
  }

  public openInfoDialog(): void {
    const dialogRef = this.openSettingDialog.open(HelpComponent, {
      height: '73vh',
      width: '60%'
    });
    this.subscriptions.add(
      dialogRef.afterClosed().subscribe(result => { }));
    this.showHeaderFooter(false);
  };

  public closeIframe(): void {
    this.pogSideNavStateService.closeSideNav.next(true);
    window.parent.closeIframe();
    window.parent.reloadfBReportapi && window.parent.reloadfBReportapi();
  }
  // TODO: @malu change here
  public refreshIframe(): void {
    window.location.href = `/sp/pogs?&loadpogID=${this.parentApp.pogId}`
      + `&vmode=Feedback&IDStore=${this.parentApp.idStore}`
      + `&link=iShelf&TF=${null}`
  }

  public showHeaderFooter(showToolbar: boolean): void {
    if (this.sharedService.isShelfLoaded && !this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(showToolbar);
    }
  }

  public mouseout(event: MouseEvent, hover: boolean): void {
    if (this.sharedService.isShelfLoaded && !this.planogramStore.appSettings.dockToolbar && event.clientY < 0) {
      this.sharedService.mouseoverDockToolbar(hover);
    }
  }

  private populateTranslations(): void {
    this.notificationStrings = {
      'APPLICATION_ALLOCATE': 'Planogram Automation',
      'NOTIFICATION': this.translate.instant('NOTIFICATION'),
      'APPLICATION_ASSORT': this.translate.instant('APPLICATION_ASSORT'),
      'SHELF': this.translate.instant('SHELF'),
      'NO_DATA_IS_THERE': this.translate.instant('NORECORDS'),
      'PROJECT': this.translate.instant('PROJECT'),
      'APPLICATION_CLUSTER': this.translate.instant('APPLICATION_CLUSTER')
    };

    this.accountPackageStrings = {
      'MY_PROF': this.translate.instant('MY_PROFILE'),
      'ACC_SETTING': 'Account Settings',
      'SIGN_OUT': this.translate.instant('LOG_OUT'),
      'CANCLE': this.translate.instant('PANEL_HEADER_CANCEL'),
      'SAVE': this.translate.instant('PANEL_HEADER_SAVE')
    };

    this.aboutUsPackageStrings = {
      'PLATFORM_HOME': 'Category Planning Platform',
      'ABOUT_US_INSIGHT_EXECUTION': this.translate.instant('ABOUTUS_INSIGHTEXECUTE'),
      'ABOUT': this.translate.instant('HEADER_ABOUT')
    };
  }

  private registerEvents(): void {
    this.subscriptions.add(
      this.language.onReady
      .pipe(filter(isReady => isReady))
        .subscribe(() => {
          this.populateTranslations();
        }));

    this.subscriptions.add(
      this.sharedService.toggleSideNav.subscribe(isOnCompatMode => {
        this.isOnCompatMode = isOnCompatMode;
      }));

    this.subscriptions.add(
      this.sharedService.setDefaultSyncPanelViewMode.subscribe(res => {
        if (res) {
          this.setview(PanelSplitterViewType.Full);
          this.sharedService.shelfSyncMode = true;
        }
      }));

      if(this.parentApp.isAllocateApp) {
        this.subscriptions.add(this.allocateService.openPlanogramSettings.subscribe((res)=>{
          this.paBroadcaster.expandFrame(true);
          this.openPlanogramSettings();
          this.changeDetector.detectChanges();
        }))
        this.subscriptions.add(this.allocateEvent.synchronize.subscribe((res)=>{
          this.syncShelf();
          this.changeDetector.detectChanges();
        }))
      }
  }

}
