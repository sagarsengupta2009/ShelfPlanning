import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ExportOptions, Planogram, AllPlanogramResponse } from 'src/app/shared/models';
import {
  SharedService,
  PlanogramStoreService,
  PlanogramService,
  PanelService,
  SaDashboardService,
  ContextMenuService,
  ParentApplicationService,
} from 'src/app/shared/services';
import { NewProductInventoryComponent, PrintComponent } from '../../../childcomponents';
import { PanelHeaderComponent } from './panel-header/panel-header.component';

@Component({
  selector: 'shelf-main-panel',
  templateUrl: './main-panel.component.html',
  styleUrls: ['./main-panel.component.scss'],
})
export class MainPanelComponent implements AfterViewInit, OnDestroy {

  @Input() exportoptions: ExportOptions;
  @Input() PogDataObj: AllPlanogramResponse;
  @Input() selectedPogObject: Planogram;
  @Input() panelID: string;
  @Output() postMessage: EventEmitter<object> = new EventEmitter();
  @Output() openHighlightsideNav: EventEmitter<object> = new EventEmitter();
  @Output() showPogInfoAndHideRightSideNav: EventEmitter<boolean> = new EventEmitter();

  @ViewChild('printContainerRef', { read: ViewContainerRef })
  printContainerRef: ViewContainerRef;
  @ViewChild('npiContainerRef', { read: ViewContainerRef })
  npiContainerRef: ViewContainerRef;
  @ViewChild('panelHeader') panelHeader: PanelHeaderComponent;

  private subscription: Subscription = new Subscription();
  public displayView: string = 'panalView';

  constructor(
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly panelService: PanelService,
    private readonly cd: ChangeDetectorRef,
    public readonly saDashboardService: SaDashboardService,
    private readonly contextMenuService: ContextMenuService,
    private readonly parentApp: ParentApplicationService
  ) { }

  public ngAfterViewInit(): void {
    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(true);
    }
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.parentApp.isAssortAppInIAssortNiciMode || this.parentApp.isWebViewApp || this.parentApp.isAllocateApp) {
      if (changes?.selectedPogObject) {
        if (this.displayView === 'npiView') {
          this.closeNpiScreen();
        } else if (this.displayView === 'printView') {
          this.closePrintScreen();
        }
      }
    }
  }

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  public openPostMessage(event: EventEmitter<any>): void {
    this.postMessage.emit(event);
  }

  public openHighlight(): void {
    this.openHighlightsideNav.emit();
  }

  public closeNpiScreen() {
    this.npiContainerRef.clear();
    this.displayView = this.panelService.panelPointer[this.panelService.activePanelID].view
    this.cd.detectChanges();
    this.showPogInfoAndHideRightSideNav.emit(false);
    this.panelService.updateView.next({ componentId: this.panelService.panelPointer[this.panelID].componentID, selectedKey: this.panelService.panelPointer[this.panelID].selectedViewKey })
  }

  public opennpiScreen(pog: Planogram): void {
    this.showPogInfoAndHideRightSideNav.emit(true);
    this.displayView = 'npiView';
    this.cd.detectChanges();
    let selectedPOGData = pog;
    //@ Pranay: Updated to remove component factory resolver reference to utilize Angular 13 dynamic component rendering feature
    let npiComp = this.npiContainerRef.createComponent(NewProductInventoryComponent);
    (<any>npiComp.instance).compData = selectedPOGData;
    this.subscription.add(npiComp.instance.onClose.subscribe((res) => {
      this.selectedPogObject = pog;
      this.closeNpiScreen();
    }));
    this.mouseout();
  }

  public closePrintScreen() {
    this.printContainerRef.clear();
    this.displayView = 'panalView';
    this.showPogInfoAndHideRightSideNav.emit(false);
  }

  public openPrintScreen(pog: Planogram): void {
    this.showPogInfoAndHideRightSideNav.emit(true);
    this.displayView = 'printView';
    this.cd.detectChanges();
    let selectedPOGData = { pogObj: pog, panelId: this.panelID };
    //@ Pranay: Updated to remove component factory resolver reference to utilize Angular 13 dynamic component rendering feature
    let printComp = this.printContainerRef.createComponent(PrintComponent);
    (<any>printComp.instance).compData = selectedPOGData;
    this.subscription.add(printComp.instance.onClose.subscribe((res) => {
      this.selectedPogObject = pog;
      this.closePrintScreen();
    }));
    this.mouseout();
  }
  public openStoreView(): void {
    this.displayView = 'store';
  }
  public updatePanel(): void {
    this.panelService.updatePanel(this.panelID, this.panelService.panelPointer[this.panelID]['sectionID'])
    this.planogramService.setSelectedIDPOGPanelID(this.panelID);
    //Remove context menu if it is available
    this.contextMenuService.removeContextMenu();
  }

  public closeStore(event: string): void {
    this.displayView = event;
  }
  public handleHeaderIcons(): void {
    this.panelService.updateHeaderIcons.next(true);
  }
  public mouseout(): void {
    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }
  }
}
