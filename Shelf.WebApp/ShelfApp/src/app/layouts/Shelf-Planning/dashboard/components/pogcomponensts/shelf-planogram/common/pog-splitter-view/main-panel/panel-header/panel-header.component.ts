import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatTabChangeEvent } from '@angular/material/tabs';
import { TranslateService } from '@ngx-translate/core';
import { isEmpty, cloneDeep, uniqBy, orderBy } from 'lodash-es';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    ExportPlanogram,
    IApiResponse,
    POGLibraryListItem,
    AllPlanogramResponse,
    PlanogramView,
    AutoBlocks,
    ZoomType,
    PanelView,
    PanelSplitterViewType,
    Planograms,
    PogSideNaveView,
    PanelIds,
    ParentAppType,
} from 'src/app/shared/models';
import {
    DisplayMenuComponent,
    PaneltoolsComponent,
    PromoteDemoteComponent,
    FeedbackComponent,
    ShowPogMoreInfoComponent,
    BatchPrintComponent,
    PropertyGridComponent,
} from '../../../../childcomponents';
import { PAClonePlanogramComponent, ConfirmationDialogComponent } from 'src/app/shared/components/dialogues';
import { PAPogsUpdate, PAPlanogram } from 'src/app/shared/models/allocate';
import { DownloadedPog, SplitterViewMode } from 'src/app/shared/models/planogram-store';
import { PogSettings } from 'src/app/shared/models/planogram/pog-settings';
import {
    HistoryService,
    PlanogramService,
    SharedService,
    AllocateService,
    AssortService,
    PlanogramHelperService,
    PlanogramLibraryService,
    PanelService,
    PlanogramLibraryApiService,
    UserPermissionsService,
    BlockHelperService,
    AllocateAPIService,
    PlanogramStoreService,
    ParentApplicationService,
    NotifyService,
    HighlightService,
    PlanogramLoaderService,
    SplitterService,
    PaBroadcasterService,
    ContextMenuService,
    SearchService,
    LocalSearchService,
    PogSideNavStateService,
    PlanogramInfoService,
    AllocateFixtureService,
    ClipBoardService,
    ShoppingCartService,
    UprightService,
    AnnotationService
} from 'src/app/shared/services';
import {
    CustomMenuClickEventPayload, HeaderBgColor, HeaderMenu,
    IsVisibleMode, MenuItem, UpdatePOGInfo
} from 'src/app/shared/models/config/application-resources';
import { Section } from 'src/app/shared/classes';
import { PostMessageObjectEmit } from 'src/app/shared/models/panel/panel-header';
import { WorkspaceInfo } from 'src/app/shared/models/enums';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';

declare const window: any;

@Component({
    selector: 'shelf-panel-header',
    templateUrl: './panel-header.component.html',
    styleUrls: ['./panel-header.component.scss'],
})
export class PanelHeaderComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
    @Input() PogDataObj: AllPlanogramResponse;
    @Input() selectedPogObject: POGLibraryListItem;
    @Input() panelID: string;
    @Input() exportoptions: string;
    @Input() sectionObject: Section;
    @ViewChild('tabGroup') tabGroup;

    @Output() openReportsScreen: EventEmitter<POGLibraryListItem> = new EventEmitter();
    @Output() openNPIScreen: EventEmitter<POGLibraryListItem> = new EventEmitter();
    @Output() openPostMessage: EventEmitter<PostMessageObjectEmit> = new EventEmitter();
    @Output() openStoreView: EventEmitter<void> = new EventEmitter();
    @Output() openHighlight: EventEmitter<void> = new EventEmitter();
    @Output() mouseoverDockToolbar: EventEmitter<void> = new EventEmitter();


    private _subscriptions: Subscription = new Subscription();

    private pog: POGLibraryListItem;
    private pogId: number;
    public planogramList: POGLibraryListItem[] = [];
    public selectedIndex: number = -1;
    public planoviewer: boolean = false;
    public IsMultiSelectMode: boolean = false;
    public scenarioID: string;
    private sectionID: string;
    public IsVisibleMode: IsVisibleMode;
    public autoBlocks: AutoBlocks;
    public pogLibHeaderMenuShowHide: HeaderMenu = {
        planoviewer: null,
        hideForPAssort: false,
        exportoptions: {},
        view: false,
        componentID: undefined,
        isActivePanel: false,
        feedbackPermission: false,
        postMsgPermission: false,
        NPIPermission: false,
        Promote_DemotePermission: false,
        exportDisabled: false,
        syncDisabled: false,
        ispogCountOne: false
    };

    private pogSettings: PogSettings;
    public orderBy = {
        predicate: '',
        reverse: false,
    };
    public showTabs: boolean = false;
    public isPaRulesScreen: boolean = false;
    public itemSelectedCount: number;
    private isUnloadPlanogramClicked: boolean = false;
    private isTabClicked: boolean = false;

    constructor(
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
        private readonly planogramHelperService: PlanogramHelperService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly notifyService: NotifyService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly dialog: MatDialog,
        private readonly zone: NgZone,
        private readonly historyService: HistoryService,
        private readonly blockHelperService: BlockHelperService,
        private readonly assortService: AssortService,
        private readonly panelService: PanelService,
        private readonly allocateService: AllocateService,
        private readonly userPermissions: UserPermissionsService,
        private readonly cd: ChangeDetectorRef,
        private readonly allocateAPIService: AllocateAPIService,
        private readonly planogramLibApiService: PlanogramLibraryApiService,
        private readonly highlightService: HighlightService,
        private readonly planogramLoaderService: PlanogramLoaderService,
        private readonly splitterService: SplitterService,
        private readonly paBroadcaster: PaBroadcasterService,
        private readonly contextMenuService: ContextMenuService,
        private readonly localSearchService: LocalSearchService,
        private readonly searchService: SearchService,
        private readonly pogSideNavState: PogSideNavStateService,
        private readonly agGridStoreService: AgGridStoreService,
        private readonly planogramInfoService: PlanogramInfoService,
        private readonly allocateFixtureService: AllocateFixtureService,
        private readonly sappClipBoardService:ClipBoardService,
        private readonly shoppingCartService:ShoppingCartService,
        private uprightService: UprightService,
        private annotationService: AnnotationService
    ) { }

    public ngAfterViewInit(): void {
        this.pog = this.planogramList[this.selectedIndex];
        //panel pointer
        this.planoviewer = this.pog.isLoaded;
        this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
        this.pogId = this.pog.IDPOG;
        // TODO: @malu why these subscriptions added in ngAfterViewInit?
        this._subscriptions.add(
            this.panelService.panelSyncEventInvoked.subscribe((resp: boolean) => {
                    this.initalizeSelectedTab(resp);
            }),
        );

        this._subscriptions.add(
            this.planogramLoaderService.reloadPlanogram.subscribe((resp: boolean) => {
                if (resp && this.panelService.activePanelID === this.panelID) {
                    this.unloadplanogram();
                    setTimeout(() => {
                        this.downLoadPlanogram();
                    }, 100);
                }
            }),
        );

        this._subscriptions.add(
            this.planogramService.selectionEmit.subscribe((res: boolean) => {
                this.checkMultiselectionMode();
                this.visibilityMode();
            }),
        );

        this.checkMultiselectionMode();
        this.visibilityMode();
        this._subscriptions.add(
            this.sharedService.editPlanogramTemplate.subscribe((res: boolean) => {
                if (res) {
                    setTimeout(() => {
                    this.planogramList = this.planogramStore.mappers;
                    this.selectedIndex = this.planogramList.length - 1;
                    if (this.panelID == 'panelOne') {
                        this.downLoadPlanogram();
                    }
                    }, 100);
                }
            }),
        );
        //Todo
        this._subscriptions.add(
            this.planogramService.pogChangesInLibrary.subscribe((res) => {
                if (res == 'saveAppendSectionData') {
                    this.planogramList = this.checkForGrouping();
                }
            }),
        );

        //auto load for assort nici handled via setting check
        if (this.panelID == 'panelOne' && this.parentApp.isAllocateApp) {
            this.autoDownLoadPlanogram(this.selectedIndex);
            // TODO @karthik move this to allocate service. Challenge here is cannot have this async and need the data from this component.
            // Can the data be updated to service or convert method in PA to async?
            window.getPlanogramList = () => {
              return this.planogramList;
            }
        }
        this._subscriptions.add(
            this.sharedService.unloadplanogramForWebView.subscribe((res: boolean) => {
                if (res) {
                    this.unloadplanogram();
                }
            }),
        );
        this._subscriptions.add(
            this.planogramService.savePog.subscribe((ele: boolean) => {
                this.cd.detectChanges();
            }),
        );
        this._subscriptions.add(
            this.sharedService.updatematTab.subscribe((res: boolean) => {
                this.showTabs = false;
                this.cd.detectChanges();
                this.showTabs = true;
            }),
        );
        this._subscriptions.add(
            this.panelService.updateSidePanelfordelete.subscribe((list: POGLibraryListItem[]) => {
                if (this.panelID !== this.panelService.activePanelID) {
                    this.planogramList = [...list];
                    this.panelService.panelSyncEventInvoked.next(true);
                }
            }),
        );
        this._subscriptions.add(
            this.searchService.searchCountChange.subscribe((resp: boolean) => {
                this.giveCountItemSelected();
                this.cd.detectChanges();
            })
        );
        if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this._subscriptions.add(
                this.panelService.loadWorkSheet.subscribe((res: { componentID, key, view }) => {
                    if (this.parentApp.isAllocateApp && this.panelID == 'panelTwo') {
                        const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;
                        this.planogramStore.splitterViewMode = {
                            displayMode: res.view,
                            syncMode: storedMode.syncMode,
                        };
                        this.initalizeSelectedTab();
                        this.loadComponentIntoPanel(res[`componentID`], res[`key`]);
                        this.panelService.updatePanel(this.panelID, this.panelService.panelPointer[this.panelID].sectionID);
                        setTimeout(()=>{
                          this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
                        })
                    }
                    else if (this.parentApp.isAssortAppInIAssortNiciMode) {
                        this.loadComponentIntoPanel(res[`componentID`], res[`key`]);
                    }
                }),
            );
            this._subscriptions.add(
              this.allocateService.autoDownloadPog.subscribe((resp: boolean) => {
                 if(this.panelID === PanelIds.One) {
                    this.autoDownLoadPlanogram(this.selectedIndex);
                 }
              })
            );
        }

        this._subscriptions.add(this.panelService.updateView.subscribe((res) => {
            if (res) {
                this.loadComponentIntoPanel(res.componentId, res.selectedKey);
            }
        }))
    }

    public get isPogLoaded(): boolean {
        return this.panelService.panelPointer[this.panelID].isLoaded;
    }

    public get paMixedPogModeEnabled(): boolean {
      return this.parentApp.isAllocateApp && this.allocateService.isMixedPogModeEnabled;
    }

    private handleHeaderIcons(): void {
        if (this.panelService.panelPointer[this.panelID].isLoaded) {
            this.planoviewer = true;
            this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
        } else {
            this.planoviewer = false;
            this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
        }
    }

    public ngOnDestroy(): void {
        this._subscriptions.unsubscribe();
    }

    public ngOnInit(): void {
        this._subscriptions.add(
            this.parentApp.onReady
                .pipe(filter(isReady => isReady))
                .subscribe(() => {
                    this.pogLibHeaderMenuShowHide.hideForPAssort = !this.isBatchPrintIconVisible();
                    if (this.parentApp.isAllocateApp) {
                        this.selectedIndex = this.planogramList.findIndex((x) => x.IDPOG === +window.parent.activeIDPOG);
                    }
                }));

        this.initalizeSelectedTab();
        // on first panel load, if auto download is set to true, set panel to be auto loaded.
        if (this.planogramStore.appSettings.SHELFAUTOLOADPOG ||
            (this.parentApp.isAssortApp && this.planogramStore.appSettings.AssortFeatureNoAllow['pog-auto-load'])) {
            this.panelService.panelPointer[this.panelID].isLoaded = true;
        }
        this.checkMultiselectionMode();
        this.visibilityMode();
        this.initAllocateAssortHandlers();
        // post message and feedback always disalbed for PA and assort NICI
        if(!this.parentApp.isAllocateApp && !this.parentApp.isAssortAppInIAssortNiciMode) {
          this.pogLibHeaderMenuShowHide.feedbackPermission = this.userPermissions.hasCreatePermission('POGFEEDBACK');
          this.pogLibHeaderMenuShowHide.postMsgPermission = this.userPermissions.hasReadPermission('POGDISCUSS');
        }
        this.pogLibHeaderMenuShowHide.NPIPermission = this.userPermissions.hasReadPermission('ADDUPDATENPI');
        this.pogLibHeaderMenuShowHide.Promote_DemotePermission = !this.userPermissions.hasUpdatePermission('POGPROMOTE');
        this._subscriptions.add(
            this.panelService.updateHeaderIcons.subscribe((res: boolean) => {
                this.handleHeaderIcons();
            }),
        );
        this._subscriptions.add(
          this.assortService.loadPlanogram.subscribe((res: string) => {
              this.updatePanelHeader();
              this.initalizeSelectedTab();
              if (!Utils.isNullOrEmpty(this.panelService.panelPointer[this.panelID].sectionID)) {
                  this.sharedService.setActiveSectionId(this.panelService.panelPointer[this.panelID].sectionID);
              }
          }),
      );
      this.panelService.invokedIdpogApiForPanelID = null;
    }

    private isBatchPrintIconVisible(): boolean {
        return (
            this.sharedService.link != ParentAppType.Allocate &&
            !this.sharedService.checkIfAssortMode('batch-print-icon')
        );
    }

    private giveCountItemSelected(): void {

        if (this.panelService.panelPointer[this.panelID].globalUniqueID === '') {
            return;
        }
        if (this.sharedService.getLastSelectedParentDerievedType(this.sectionID) == AppConstantSpace.SHOPPINGCARTOBJ && this.panelService.panelPointer[this.panelService.activePanelID].view === 'panelView') {
            this.planogramService.removeAllSelection(this.sectionID);
            this.planogramService.addToSelectionById(this.sectionID, this.sectionID);
        }
        this.itemSelectedCount = this.planogramService.getSelectionCount(this.sectionID);
    }

    private checkIfNotMultiNSheetMode(): boolean {

        let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(this.panelService.panelPointer[this.panelID].globalUniqueID);
        return (
            !this.checkMultiselectionMode() &&
            this.panelService.panelPointer[this.panelID].componentID == PlanogramView.POSITION &&
            currObj &&
            currObj.isLoaded &&
            false
        );
    }

    private checkMultiselectionMode(): boolean {
        let guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (!guid) return (this.IsMultiSelectMode = false);

        let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);
        if (currObj?.Version === 'Retired') {
            currObj.PogStatusSymbol = 'R';
        }
        this.sectionID = this.panelService.panelPointer[this.panelID].sectionID;
        this.itemSelectedCount = this.planogramService.getSelectionCount(this.sectionID)
        if (this.sectionID) {
            if (
                this.sharedService.getLastSelectedParentDerievedType(this.sectionID) != AppConstantSpace.SHOPPINGCARTOBJ
            ) {
                if (
                    currObj &&
                    this.itemSelectedCount > 1 &&
                    !this.sharedService.lastSelectedObjCartStatus[currObj.sectionID]
                ) {
                    this.IsMultiSelectMode = true;
                    return true;
                }
            } else {
                if (this.itemSelectedCount > 1 && (this.panelService.panelPointer[this.panelService.activePanelID].view === PanelView.POSITION || this.panelService.panelPointer[this.panelService.activePanelID].view === PanelView.ITEM)) {
                    this.IsMultiSelectMode = true;
                    return true;
                }
            }
        }
        this.IsMultiSelectMode = false;
        return false;
    }

    public scrollTabs(event): void {
        event.preventDefault();
        const children = this.tabGroup._tabHeader._elementRef.nativeElement.children;
        const back = children[0];
        const forward = children[2];
        if (event.deltaY > 0) {
            forward.click();
        } else {
            back.click();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        this.updatePanelHeader();
    }

    private updatePanelHeader(): void {
        if (!isEmpty(this.selectedPogObject) && !isEmpty(this.PogDataObj)) {
            this.planogramList = this.checkForGrouping();
            this.selectedIndex = this.planogramList.findIndex((x) => x.IDPOG === this.selectedPogObject.IDPOG);
            if (this.selectedIndex === -1) {
                this.selectedIndex = 0;
                this.selectedPogObject = this.planogramList[0];
            }
            this.planogramStore.activeSelectedPog = this.planogramList[this.selectedIndex];
            this.rowChangeInvokeforWebView();
        }
        this.pogLibHeaderMenuShowHide.exportoptions = this.exportoptions;
    }

    private initalizeSelectedTab(tabChanged: boolean = false): void {
        if (this.planogramList?.length) {
            const pog: DownloadedPog = this.planogramStore.getPogById(this.planogramList[this.selectedIndex]?.IDPOG);
            if (!pog) {
                if (!this.planogramList[this.selectedIndex]) { this.selectedIndex = 0; }
                this.panelService.panelPointer[this.panelID].sectionID = "";
                this.sharedService.hidedefaultMenu.next(true);
            }
            const activePanelInfo = this.panelService.ActivePanelInfo;
            if (this.panelService.activePanelID === '') {
                this.panelService.activePanelID = 'panelOne';
                this.planogramService.setSelectedIDPOGPanelID('panelOne');
            }
            const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;
            if (storedMode.displayMode === 0 && this.panelID !== this.panelService.activePanelID) { return; }
            if (storedMode.syncMode) { // Sync Mode
                if (this.panelID !== this.panelService.activePanelID &&
                    activePanelInfo.index !== -1 &&
                    this.selectedIndex !== activePanelInfo.index
                ) {
                    this.selectedIndex = activePanelInfo.index;
                    this.sharedService.setActiveSectionId(activePanelInfo.sectionID);
                }
            } else { //Async Mode
              if (this.panelID !== this.panelService.activePanelID && tabChanged) {
                if (
                  (this.panelService.panelPointer[this.panelID].index === -1 ||
                    this.panelService.panelPointer[this.panelID].index === activePanelInfo.index)
                ) {
                  if (this.selectedIndex === this.planogramList.length - 1) {
                    this.selectedIndex = 0;
                  } else {
                    this.selectedIndex = this.selectedIndex + 1;
                  }
                } else if (this.selectedIndex !== this.panelService.panelPointer[this.panelID].index) {
                  this.selectedIndex = this.panelService.panelPointer[this.panelID].index;
                }
              }
            }
            this.updatePanelPointer(this.selectedIndex, tabChanged);
            this.handleHeaderIcons();
            this.sharedService.updateFooterNotification.next(true);
            // enable export only for apporved pogs in PA.
            if (this.parentApp.isAllocateApp) {
              this.updateExportEnabledStatus();
            }

        }
    }
    private updatePanelPointer(selectedIndex: number, tabChanged: boolean = false): void {
        const tempView: string = this.getView(selectedIndex, tabChanged);

        const pog: DownloadedPog = this.planogramStore.getPogById(this.planogramList[selectedIndex].IDPOG);
        if(pog){
            this.shoppingCartService.hideUnLoadCart = true;
        }
        else{
            if(this.shoppingCartService.showShoppingCartUnloaded){
                this.shoppingCartService.hideUnLoadCart = true;
            }
            else if(!this.shoppingCartService.showShoppingCartUnloaded){
                this.shoppingCartService.hideUnLoadCart = false;
            }
        }
        if (tempView == 'positionWS') {
            this.pogLibHeaderMenuShowHide.view = true;
            this.pogLibHeaderMenuShowHide.componentID = PlanogramView.POSITION;
            this.panelService.panelPointer[this.panelID].componentID = PlanogramView.POSITION;
        } else if (tempView == 'panelView') {
            this.pogLibHeaderMenuShowHide.componentID = PlanogramView.PLANOGRAM;
            this.panelService.panelPointer[this.panelID].componentID = PlanogramView.PLANOGRAM;
        }
        const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;
        const setSectionID = pog?.sectionID ? pog?.sectionID : storedMode.syncMode && this.panelService.panelPointer[this.panelService.activePanelID].sectionID ? this.panelService.panelPointer[this.panelService.activePanelID].sectionID : '';
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                IDPOG: this.planogramList[selectedIndex].IDPOG,
                isLoaded: Boolean(pog),
                view: tempView,
                globalUniqueID: this.planogramList[selectedIndex].globalUniqueID,
                index: this.selectedIndex,
                sectionID: setSectionID,
                selectedViewKey:
                    tempView == 'positionWS'
                        ? 'POGLIB_HEADERMENU_1_VIEW_POSITION'
                        : tempView == 'panelView'
                            ? 'POGLIB_HEADERMENU_1_VIEW_PLANOGRAM'
                            : this.panelService.panelPointer[this.panelID].selectedViewKey,
            },
        };
    }

    //TODO @karthik this logic needs refactor and moved to panel service.
    private getView(selectedIndex: number, tabChanged: boolean = false): string {
        const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;

        /**if Pre-download ia enabled and Async mode  download planogram in second panel automatically
         */
        if ((tabChanged && this.planogramStore.appSettings.SHELFAUTOLOADPOG && !storedMode.syncMode && this.panelService.panelPointer.panelTwo)) {
            this.pog = this.planogramList[this.selectedIndex];
            this.planogramStore.upsertPog({ IDPOG: this.pog.IDPOG });

            this.panelService.panelPointer = {
                ...this.panelService.panelPointer,
                [this.panelID]: {
                    ...this.panelService.panelPointer[this.panelID],
                    isLoaded: true,
                    view:
                        this.panelService.panelPointer[this.panelID].view !== ''
                            ? this.panelService.panelPointer[this.panelID].view
                            : 'panelView',
                    sectionID: '',
                },
            };
            this.panelService.view = 'planogram';
            this.pogId = this.pog.IDPOG;
            this.planoviewer = true;
            this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
            this.pogLibHeaderMenuShowHide.componentID = PlanogramView.PLANOGRAM;
        } else if (!this.isUnloadPlanogramClicked && (this.planogramStore.appSettings.SHELFAUTOLOADPOG || this.parentApp.isAssortApp)) {
            this.pog = this.planogramList[this.selectedIndex];
            this.planogramStore.upsertPog({ IDPOG: this.pog.IDPOG });
        }

        let returnview: string = this.panelService.panelPointer[this.panelID].view;
        const pog: DownloadedPog = this.planogramStore.getPogById(this.planogramList[selectedIndex].IDPOG);
        if (!pog) {
            return returnview;
        } else {
            if (this.panelID !== this.panelService.activePanelID) {
                if (storedMode.syncMode && this.panelService.ActivePanelInfo.view === 'panelView' && (this.panelService.panelPointer[this.panelID].view === '' || this.panelService.panelPointer[this.panelID].view === 'panelView')) {
                    return 'positionWS';
                } else {
                    return this.panelService.panelPointer[this.panelID].view ? this.panelService.panelPointer[this.panelID].view : 'panelView';
                }
            }
            /** pog is downloaded, but active panel's view is not set. */
            else if (this.panelID === this.panelService.activePanelID && ['', 'svgView'].includes(returnview)) {
                return 'panelView';
            }

        }
        if (pog?.isCreated) {
            return 'panelView';
        }
        return returnview;
    }
    private checkForGrouping(): POGLibraryListItem[] {
      /**
       * For PA, the planogramList is the currently visible pogs and mappers would be complete list.
       * Hence should not reassign if planogramList is already prepared ( from updatePlibPogs subscription)
       */
        if(this.parentApp.isAllocateApp) {
          return  this.planogramList.length ? this.planogramList : this.planogramStore.mappers;
        }
        this.planogramList = this.planogramStore.mappers;
        if (this.parentApp.isAssortApp || this.parentApp.isWebViewApp) {
            if (this.parentApp.isAssortApp && this.planogramStore.readOnlyMode) {
                this.planogramList = this.planogramList.map((planogram) => ({ ...planogram, IsReadOnly: true }));
                this.planogramLibraryService.mapper = this.planogramList;
                this.planogramStore.mappers = this.planogramList;
            }
            return this.planogramList;
        }
        let index = this.agGridStoreService.gridState.findIndex(grid => grid.gridId === 'pogScenario-grid');
        if (this.agGridStoreService.gridState.map(e => e.isGroup > -1)) {
          let mergedArr: POGLibraryListItem[] = [];
          let list = [...this.planogramList];
          if (this.agGridStoreService.gridState[index]?.data) {
            list = this.planogramList.filter((ele) => this.agGridStoreService.gridState[index]?.data?.some(x => x?.IDPOG === ele?.IDPOG));
            for (let d of list) {
              mergedArr = mergedArr.concat(d);
            }
          } else {
            mergedArr = list;
          }
          let sortColData = this.agGridStoreService.gridState[index]?.colSortState?.find(a => a.sort != null);
          if (this.agGridStoreService.gridState[index]?.colSortState && !Utils.isNullOrEmpty(sortColData)) {
            let doubleSortCol = 'IDPOG';
            let col = sortColData['colId'];
            let order = (sortColData['sort'] == 'asc' ? 1 : -1);
            mergedArr.sort((a, b) => {
              let ret;
              if (a[col] < b[col]) {
                ret = 1;
              } else if (a[col] > b[col]) {
                ret = -1;
              } else if (a[col] === b[col]) {
                ret = (a[doubleSortCol] < b[doubleSortCol] ? 1 : -1 * order);
              }
              return ret * order;
            }).reverse();
          }
          return mergedArr;
        } else if (this.agGridStoreService.gridState[index]?.filtermodel || this.agGridStoreService.gridState[index]?.colSortState) {
          let list: POGLibraryListItem[];
          if (this.agGridStoreService.gridState[index].data && (!isEmpty(this.agGridStoreService.gridState[index]?.filtermodel) ||
            this.planogramList.length === this.agGridStoreService.gridState[index].data.length || this.agGridStoreService.isGlobalSearch)) {
            list = this.agGridStoreService.gridState[index].data;
          } else {
            list = this.planogramList;
          }
          return list;
        } else {
          return this.planogramList;
        }
    }

    public verifyTabChange(tab: MatTabChangeEvent): void {
        if (this.isTabClicked) {
            if (this.sharedService.isStoreDirty) {
                let check = confirm(this.translate.instant('UNSAVED_DATA_MOVE'));
                if (check) {
                    this.sharedService.isStoreDirty = false;
                    this.tabChanged(tab);
                }
                else {
                    this.tabGroup.selectedIndex = this.selectedIndex;
                }
            }
            else{
                this.tabChanged(tab);
            }
        }
        this.isTabClicked = false;
        return;
    }

    public setTabChange(event) {
        this.isTabClicked = true;
    }

    private tabChanged(tab: MatTabChangeEvent): void {
        // @karthik for PA app, when navigating b/w screens, the method may invoke more than once due to validation checks on which pog to load.
        // TODO This can be eliminated if the invoke shelf method is refactored accordingly, which has quite a few dependencies.
        if(this.parentApp.isAllocateApp && tab.index === this.selectedIndex) {
            return;
          }
        this.selectedIndex = tab.index;
        this.panelService.panelPointer[this.panelID].index = tab.index;
        const pog = this.planogramStore.getPogById(this.planogramList[tab.index].IDPOG);
        if (pog && pog?.sectionObject) {
            this.sectionID = (pog.sectionObject as Section).$sectionID;
            this.panelService.panelPointer[this.panelID].sectionID = this.sectionID;
            this.panelService.panelPointer[this.panelID].isLoaded = true;
            this.sectionObject = <Section>pog.sectionObject;
        } else {
            this.panelService.panelPointer[this.panelID].sectionID = "";
        }
        this.panelService.panelSyncEventInvoked.next(false);
        if (
            (this.sharedService.link == 'iShelf' && this.planogramStore.appSettings.SHELFAUTOLOADPOG) ||
            (this.sharedService.link == 'iAssort' && this.planogramStore.appSettings.AssortFeatureNoAllow['pog-auto-load']) ||
            (this.parentApp.isAllocateApp && this.planogramList[tab.index].isLoaded)
        ) {
            this.panelService.panelPointer[this.panelID].isLoaded = true;
        }
        this.sharedService.setActiveSectionId(this.panelService.panelPointer[this.panelID].sectionID);
        //Remove context menu if it is available
        this.contextMenuService.removeContextMenu();
        this.planogramStore.activeSelectedPog = this.planogramList[tab.index];
        this.pog = this.planogramList[this.selectedIndex];
        this.pogId = this.pog.IDPOG;
        if (this.pog.IsLoaded === 'Loaded') {
            setTimeout(() => {
                this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
                this.sharedService.changeZoomView.next(null);
            }, 1000);
            this.uprightService.isPogChanged = true;
        }
        this.sharedService.hidedefaultMenu.next(true);
        this.highlightService.showLegend.next(false);
        let index = this.highlightService.checkForActiveSectionID().indexOf(this.panelService.panelPointer[this.panelID].sectionID);
        if(index != -1){
            if(this.highlightService.refreshHighLight.observers.length == 0){
                this.highlightService.updateRangeModel();
            }else{
                this.highlightService.refreshHighLight.next(true);

            }

        }
        if([1, 2].includes(this.panelService.ActivePanelInfo.componentID) && this.pogSideNavState.shoppingCartView.pos == "top"){
            this.sharedService.changeInGridHeight.next(true);
        }
        if (this.planogramStore.splitterViewMode?.displayMode === 2)
            this.splitterService.refreshSplitter.next(true);

        if (this.planogramInfoService.isPogInfoOpened) {
            this.planogramInfoService.getLoadedPogInfo.next(this.pog);
        }
        if (this.panelService.panelPointer[this.panelID].isLoaded) {//handlingshoppingcart unloaded state
          this.shoppingCartService.showHideSCDialogUS(false);
          this.annotationService.refreshAnnotationDialog(true, this.sectionObject, this.panelID, false, true);
          this.annotationService.refreshAnnotationDialog(false, this.sectionObject, this.panelID, false, true);
        } else if (!this.panelService.panelPointer[this.panelID].isLoaded) {//check for settingtrue&& this.shoppingCartService.showShoppingCartUnloaded
          if (!document.getElementsByClassName('shoppingcart-Unloaded-topview').length) {
            this.shoppingCartService.showHideSCDialogUS(true)
          }
          this.annotationService.refreshAnnotationDialog(null, null, this.panelID, true);
        }
    }

    public checkDirty(planogramItem: POGLibraryListItem): boolean {
        return this.planogramService.checkIfObjectDirty(planogramItem);
    }
    public checkedOutBySystem(obj: POGLibraryListItem, index: number, planogramListLen: number): string {
        let tooltipContent: string = '';
        if (typeof obj != 'undefined') {
            if (this.sharedService.link == 'allocate') {
                tooltipContent = `${obj.Name}${' ('}${obj.L4}${' ) '}${(index + 1)}${' '}${this.translate.instant('OF')}${' '}${planogramListLen}`;
            } else {
                tooltipContent = `${obj.Name}${' '}${(index + 1)}${' '}${this.translate.instant('OF')}${' '}${planogramListLen}`;
            }

            if (!Utils.isNullOrEmpty(obj.CheckoutOwner) && obj.CheckoutOwner.toLowerCase() == AppConstantSpace.SYSTEM) {
                tooltipContent += '<br>Check-out by SYSTEM';
                tooltipContent += Utils.isNullOrEmpty(obj.CheckOutMessage) ? '' : ':' + obj.CheckOutMessage;
            }
        }
        return tooltipContent;
    }
    public menuButtonClick(response: CustomMenuClickEventPayload): void {
        let selectedMenu: MenuItem = response.data;
        this.planogramList = this.checkForGrouping();
        if(this.selectedIndex < this.planogramList.length) {
          this.pog = this.planogramList[this.selectedIndex];
        }
        this.panelService.updatePanel(this.panelID, this.panelService.panelPointer[this.panelID].sectionID);
        if (selectedMenu) {
            this.sharedService.setActiveSectionId(this.panelService.panelPointer[this.panelID].sectionID);
            switch (selectedMenu.key) {
                case 'POGLIB_HEADERMENU_1_PROMOTE_DEMOTE':
                case 'POGLIB_HEADERMENU_1_PROMOTE_DEMOTE_MORE':
                    this.promoteMultiple();
                    break;
                case 'POGLIB_HEADERMENU_1_DOWNLOAD':
                    this.downLoadPlanogram();
                    break;
                case 'POGLIB_HEADERMENU_1_VIEW_STORE':
                    this.loadComponentIntoPanel(8, selectedMenu[`key`]);
                    break;
                case 'POGLIB_HEADERMENU_1_PROMOTE_DEMOTE':
                    // TODO : No Action is Avaiable
                    break;
                case 'rulesModelHeader_view_Planogram':
                case 'POGLIB_HEADERMENU_1_VIEW_PLANOGRAM':
                    this.loadComponentIntoPanel(1, selectedMenu[`key`]);
                    break;
                case 'rulesModelHeader_view_Worksheet_position':
                case 'POGLIB_HEADERMENU_1_VIEW_POSITION':
                    this.loadComponentIntoPanel(2, selectedMenu[`key`]);
                    break;
                case 'rulesModelHeader_view_Worksheet_Item':
                case 'POGLIB_HEADERMENU_1_VIEW_ITEM':
                    if (this.parentApp.isAssortAppInIAssortNiciMode && !this.assortService.assortOpenWorksheet) {
                        window.parent.postMessage(`invokePaceFunc:syncAssortWorkbook:["${this.planogramStore.loadPogId}"]`, '*',);
                        this.assortService.assortOpenWorksheet = true;
                        return;
                    }
                    this.loadComponentIntoPanel(5, selectedMenu[`key`]);
                    break;
                case 'rulesModelHeader_view_Worksheet_Fixture':
                case 'POGLIB_HEADERMENU_1_VIEW_FIXTURE':
                    this.loadComponentIntoPanel(3, selectedMenu[`key`]);
                    break;
                case 'rulesModelHeader_view_Worksheet_Inventory':
                case 'POGLIB_HEADERMENU_1_VIEW_INVENTORY':
                    this.loadComponentIntoPanel(6, selectedMenu[`key`]);
                    break;
                case 'rulesModelHeader_view_3D':
                case 'POGLIB_HEADERMENU_1_VIEW_3D':
                    this.loadComponentIntoPanel(4, selectedMenu[`key`]);
                    break;
                case 'POGLIB_HEADERMENU_1_VIEW_PERFORMANCE':
                    this.loadComponentIntoPanel(7, selectedMenu[`key`]);
                    break;
                case 'POGLIB_HEADERMENU_1_VIEW_STORE':
                    this.loadComponentIntoPanel(8, selectedMenu[`key`]);
                    break;
                case 'POGLIB_HEADERMENU_1_EXPORTPOG_XML':
                    this.exportPlanogram('XML');
                    break;
                case 'POGLIB_HEADERMENU_1_EXPORTPOG_XMZ':
                    this.exportPlanogram('XMZ');
                    break;
                case 'POGLIB_HEADERMENU_1_EXPORTPOG_PLN':
                    this.exportPlanogram('PLN');
                    break;
                case 'POGLIB_HEADERMENU_1_EXPORTPOG_PSA':
                    this.exportPlanogram('PSA');
                    break;
                case 'POGLIB_HEADERMENU_1_EXPORTPOG_PSA_FLOATINGSHELVES':
                    this.exportPlanogram('PSA', 'FloatingShelves');
                    break;
                case 'POGLIB_HEADERMENU_1_ACTIONS_FEEDBACK':
                    this.openFeedback();
                    break;
                case 'POGLIB_HEADERMENU_1_ACTIONS_MESSAGE':
                    this.displayThread();
                    break;
                case 'POGLIB_HEADERMENU_1_ACTIONS_DELETEPOG':
                    this.deletePlanogram();
                    break;
                case 'POGLIB_HEADERMENU_1_ACTIONS_NPI':
                    this.openPanelRevealForTempInventory();
                    break;
                case 'POGLIB_HEADERMENU_1_DISPLAY':
                    this.displayClickHandler();
                    break;
                case 'POGLIB_HEADERMENU_1_HIGHLIGHT':
                    this.triggerHighlightTool('unpinned');
                    break;
                case 'POGLIB_HEADERMENU_1_TOOLS':
                    this.toolsClickHandler();
                    break;
                case 'POGLIB_HEADERMENU_1_UNDO':
                    this.triggerUndo();
                    break;
                case 'POGLIB_HEADERMENU_1_REDO':
                    this.triggerRedo();
                    break;
                case 'POGLIB_HEADERMENU_1_SAVE':
                    this.triggerSave();
                    break;
                case 'POGLIB_HEADERMENU_1_SAVE_ALL':
                    this.planogramHelperService.saveAllPlanograms();
                    break;
                case 'POGLIB_HEADERMENU_1_UNLOAD':
                    this.isUnloadPlanogramClicked = true;
                    this.unloadplanogram();
                    this.isUnloadPlanogramClicked = false;
                    break;
                case 'POGLIB_HEADERMENU_1_PRINT_MORE':
                case 'POGLIB_HEADERMENU_1_PRINT':
                    this.validateAndLoadPrint();
                    break;
                case 'POGLIB_HEADERMENU_1_Shopping_cart':
                    this.shoppingCartService.openShoppingCartDialog();
                    break;
                // allocate menu items
                case 'Placement':
                case 'Blocks':
                case 'rulesModelHeader_View_Rules_ItemPriorityRules':
                case 'rulesModelHeader_View_Rules_GroupRules':
                case 'rulesModelHeader_View_Rules_LSAuth':
                case 'rulesModelHeader_View_Rules_ModelPriorityRules':
                case 'Review_ListHeader_view_Review_planogram':
                    this.openAllocateGrid(response);
                    break;
                case 'POGLIBLib_HeaderMenu_1_EXPORTEXCEL':
                    this.sharedService.downloadExportExcel.next({
                        view: this.panelService.ActivePanelInfo.view,
                    });
                    break;
                case 'POGLIB_HEADERMENU_1_Approve':
                    this.approvePOGAllocate(1);
                    break;
                case 'POGLIB_HEADERMENU_1_Reject':
                    this.approvePOGAllocate(0);
                    break;
                case 'POGLIB_HEADERMENU_1_SyncPog':
                    this.syncPOGAllocate();
                     break;
                case 'POGLIB_HEADERMENU_1_ClonePlanogram':
                    this.clonePlanogramAllocateMode();
                    break;
                case 'Rules_LeftSidePanel_Restore':
                    let guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
                    if (guid == '') break;
                    let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);
                    window.parent.triggerMenuAction(selectedMenu[`key`], currObj);
                    break;
                case 'POGLIB_HEADERMENU_1_DOWNLOAD_LIVE_POG':
                    this.downLoadPlanogram('edit');
                    break;
                case 'POGLIB_HEADERMENU_1_MORE_POG_INFO':
                    this.showPogMoreInfo();
                    break;
                case 'POGLIB_HEADERMENU_1_PA_BULK_ACTION':
                    this.paBroadcaster.openBulkOperation();
                    break;
                case 'Rules_LeftSidePanel_ThumbupThumbdown_MoveToReview_Approve':
                case 'Rules_LeftSidePanel_ThumbupThumbdown_MoveToReview_Reject':
                    let data = {modelId: this.pog.rowKey, scenarioId: this.planogramStore.scenarioId}
                    this.paBroadcaster.approveRejectToReview(selectedMenu.key,data);
                    break;
                default:
                    break;
            }
            if (!selectedMenu.childMenus.length) {
                this.mouseoverDockToolbar.emit();
            }
        }
    }

    private showPogMoreInfo(): void {
        let rowData: any = { data: this.pog, product: 'StoreViewPOG' };
        const dialogRef = this.dialog.open(ShowPogMoreInfoComponent, {
            width: '55vw',
            height: '75vh',
            data: rowData,
        });
    }

    private openPanelRevealForTempInventory(): void {
        this.dialog.getDialogById('clipBoard-top-view')?.close();
        this.dialog.getDialogById('clipBoard-bottom-view')?.close();
        this.openNPIScreen.emit(this.pog);
    }
    public triggerRedo(): void {
        this.historyService.redo();
    }
    public triggerUndo(): void {
        this.historyService.undo();
    }

    private unloadplanogram(): void {
        this.shoppingCartService.hideUnLoadCart = false;
        this.pog = this.planogramList[this.selectedIndex];
        const sectionID = this.pog.sectionID;
        this.sectionID = '';
        if (this.pog.IDPOG === this.panelService.invokedIdpogApiForPanelID) {
            this.panelService.invokedIdpogApiForPanelID = null;
            this.panelService.skipApiCallForPanel = { panelID: '', flag: false, IDPOG: null };
        }
        this.planogramLoaderService.unloadplanogram(this.pog, this.panelID);
        this.planogramLibraryService.pogChangesInworkspace.next(WorkspaceInfo.UNLOAD);
        this.planoviewer = false;
        this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
        this.pogLibHeaderMenuShowHide.componentID = PlanogramView.PLANOGRAM;
        this.removePlanogramVm(this.pog, sectionID);
        const obj: UpdatePOGInfo = {
            isPogDownloaded: false,
            pogInfo: this.planogramList[this.selectedIndex],
            displayView: this.panelService.panelPointer[this.panelID].view,
        };
        this.planogramService.updatePOGInfo.next(obj);
        this.planogramService.markRequestToCheckIn([this.pog]);
        if (this.parentApp.isAllocateApp) {
            this.paBroadcaster.updatePAGrid(this.parentApp.isAllocateAppInManualMode);
            this.paBroadcaster.updatePogDownload(this.pog.IDPOG, false);
            this.allocateFixtureService.removePogFixture(this.pog.IDPOG);
        }
        if(this.dialog.getDialogById('clipBoard-top-view')){
            this.dialog.getDialogById('clipBoard-top-view')?.close();
            this.sappClipBoardService.openDialog(false,"collapse");
        }
        this.localSearchService.clearFilter();
        this.planogramInfoService.getLoadedPogInfo.next(null);//closing the pog info screen
        this.shoppingCartService.showShoppingCartUnloaded = false;
    }

    public removePlanogramVm(mapperObj: POGLibraryListItem, sectionID: string): void {
        this.planogramLoaderService.removePlanogramVM(mapperObj.IDPOG, sectionID);
        if (this.sharedService.vmode) {
            this.planogramLibraryService.mapper = cloneDeep(this.planogramLibraryService.mapperForVmode);
            this.planogramStore.mappers = this.planogramLibraryService.mapper;
                this.planogramList[this.selectedIndex].IsReadOnly = this.planogramStore.mappers.filter((pogItem)=>{
                    return pogItem.IDPOG == mapperObj.IDPOG;
                })[0].IsReadOnly;
            this.planogramStore.activeSelectedPog = this.planogramList[this.selectedIndex];
        }
        this.sharedService.updateFooterNotification.next(false); // Remove footer status
    }

    public triggerSave(): void {
        const guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;

        let section = this.sharedService.getObject(
            this.sharedService.getActiveSectionId(),
            this.sharedService.getActiveSectionId(),
        ) as Section;


        if (guid != '') {
            const currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);

            if (currObj.isLoaded) {
                /** @karthik DO NOT ADD this to subscriptions, even if component is destroyed, save should not be cancelled. */
                if (section) {
                    this.planogramHelperService.savePlanogramDatasource(section).subscribe(response => {
                        if (this.sharedService.isSaveAllInProgress) {
                          this.planogramHelperService.processSaveSectionIdsInQueue();
                        }
                    }); //'save-planogram'
                    this.planogramService.rootFlags[section.$sectionID].isSaveDirtyFlag = true;

                    //assort specific code

                    if (this.sharedService.link == 'iAssort') window.parent.postMessage('invokePaceFunc:PlanogramSaving');
                } else {
                    console.log(`Section details could not be retrieved for section id - ${this.sharedService.getActiveSectionId()}`);
                }
            }
        }
    }

    private displayClickHandler(): void {
      this.paBroadcaster.expandFrame(true);
      this.dialog.open(DisplayMenuComponent, {
            width: '40%',
            data: this.panelID,
      }).afterClosed().subscribe(()=>{
        this.paBroadcaster.expandFrame(false);
      });
    }
    public toolsClickHandler(): void {
        this.sharedService.iSHELF.showDirective.panelID = this.panelID;
        this.paBroadcaster.expandFrame(true);
        this.dialog.open(PaneltoolsComponent, {
            height: '85%',
            width: '55%',
            data: '',
        }).afterClosed().subscribe(()=>{
          this.paBroadcaster.expandFrame(false);
        });
    }
    /**
     * In PA, when Print option is selected, need to save pog SVG if not saved already, for thumbnail reports.
     */
    private validateAndLoadPrint(): void {
        this.dialog.getDialogById('clipBoard-top-view')?.close();
        this.dialog.getDialogById('clipBoard-bottom-view')?.close();
      if(this.parentApp.isAllocateApp && !this.pog.svgSaved) {
        let checkDirty = this.planogramService.checkIfObjectDirty(this.pog);
        if (checkDirty) {
            this.notifyService.warn('WARN_TOSAVE_BEFORE_REPORTREQUEST');
            return;
        }
        this.planogramHelperService.generateAndSaveSVG(this.sectionID).subscribe((res)=>{
          if(res) {
            this.pog.svgSaved = true;
            this.loadPrintScreen();
          } else {
            this.notifyService.warn('SOMETHING_WENT_WRONG_TRY_AGAIN');
          }
        })

      } else {
        this.loadPrintScreen();
      }
    }


    private loadPrintScreen(): void {
        if (this.pog.isLoaded) {
            this.openReportsScreen.emit(this.pog);
        } else {
            let storeID: number[] = [];
            if (this.sharedService.vmode) {
                storeID.push(this.parentApp.idStore);
            }
            let guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
            if (guid != '') {
                let currObj = this.planogramLibraryService.getCurrentObject(guid);
                this.zone.runOutsideAngular(() => {
                    const dialogRef = this.dialog.open(BatchPrintComponent, {
                        width: '125vw',
                        height: '80vh',
                        data: {
                            IdPogCollection: [
                                {
                                    IDPog: currObj.IDPOG,
                                    IDStore: this.parentApp.idStore ? this.parentApp.idStore : -1,
                                },
                            ],
                            idStore: storeID,
                        },
                    });
                });
            }
        }
    }

    private triggerHighlightTool(actionUI: string): void {
        this.openHighlight.emit();
    }

    private autoDownLoadPlanogram(selectedIndex: number): void {
        this.pog = this.planogramList[selectedIndex];
        this.pogId = this.pog.IDPOG;
        this.downLoadPlanogram();
    }

    private downLoadPlanogram(editflag?: string): boolean {
        if (editflag == 'edit') {
            this.planogramList[this.selectedIndex].IsReadOnly = false;
            this.planogramStore.mappers = this.planogramList;
            this.planogramLibraryService.mapper = this.planogramList;
            this.sharedService.isLivePogEditable = true;
        }
        else {
            this.sharedService.isLivePogEditable = false;
        }
        this.shoppingCartService.hideUnLoadCart = true;
        this.shoppingCartService.showShoppingCartUnloaded = true;
        this.shoppingCartService.closeShoppingcartDialog();
        this.pog = this.planogramList[this.selectedIndex];
        if (this.pog?.IsLocked) {
            this.notifyService.warn('Planogram not ready. Please try after some time', 'Ok');
            return false;
        }
        else if (this.parentApp.isAllocateApp && (this.pog.requestStatus == 3 || this.pog.requestStatus == 4)) {
            this.notifyService.warn("POG_PROCESSING_PLEASE_WAIT");
            return false;
        }

        this.planogramStore.upsertPog({ IDPOG: this.pog.IDPOG });
        const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                isLoaded: true,
                view:
                    this.panelService.panelPointer[this.panelID].view
                        ? this.panelService.panelPointer[this.panelID].view
                        : 'panelView',
                sectionID: '',
            },
        };
        //Update loaded state on both sync and async mode
        this.panelService.panelSyncEventInvoked.next(false);
        if([1, 2].includes(this.panelService.ActivePanelInfo.componentID) && this.pogSideNavState.shoppingCartView.pos === PogSideNaveView.SHOPPING_CART_TOP) { //for planogram and position grid component need to recaliculate grid heights
            this.sharedService.changeInGridHeight.next(true);
        }
        this.panelService.view = 'planogram';
        this.pogId = this.pog.IDPOG;
        this.planoviewer = true;
        this.pogLibHeaderMenuShowHide.planoviewer = this.planoviewer;
        this.pogLibHeaderMenuShowHide.componentID = this.pogLibHeaderMenuShowHide.componentID ? this.pogLibHeaderMenuShowHide.componentID : PlanogramView.PLANOGRAM;
        this.highlightService.setStringMatchData([], '');


    }

    private updatePogList(status: string, key: string): void {
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                view: status,
                selectedViewKey: key,
            },
        };
        const obj: UpdatePOGInfo = {
            isPogDownloaded: this.panelService.panelPointer[this.panelID].isLoaded,
            pogInfo: this.planogramList[this.selectedIndex],
            displayView: this.panelService.panelPointer[this.panelID].view,
        };
        if (this.sectionID) {
            this.planogramService.updatePOGInfo.next(obj);
        }
    }

    private loadComponentIntoPanel(componentID: number, selectedkey: string): void {
        this.pogLibHeaderMenuShowHide.view = componentID == 1 ? false : true;
        this.pogLibHeaderMenuShowHide.componentID = componentID;
        this.panelService.panelPointer[this.panelID].componentID = componentID;
        this.sharedService.setActiveComponentNumber(componentID);
        this.planogramInfoService.openPlanogramInfo(); //opening the pog info dialog when it was previoulsy opened
        let guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (componentID == 1) {
            this.panelService.view = 'planogram';
            this.updatePogList(`panelView`, selectedkey);
        } else if (componentID == 2) {
            let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);
            this.pogSettings = this.planogramService.rootFlags[currObj.sectionID];
            this.updatePogList(`positionWS`, selectedkey);
            this.panelService.view = 'positionWS';
            if (this.pogSettings.displayWorksheet.Cart && this.pogSettings.displayWorksheet.Planogram) {
                this.sharedService.ShppingcartItems = this.getCartItems();
                this.sharedService.showShelfItem.next(true);
            } else if (!this.pogSettings.displayWorksheet.Cart && !this.pogSettings.displayWorksheet.Planogram) {
                this.sharedService.ShppingcartItems = [];
                this.sharedService.showShoppingCartItem.next(true);
            } else if (this.pogSettings.displayWorksheet.Cart) {
                this.sharedService.ShppingcartItems = this.getCartItems();
                this.sharedService.showShoppingCartItem.next(true);
            } else if (this.pogSettings.displayWorksheet.Planogram) {
                this.sharedService.showShoppingCartItem.next(false);
            }
        } else if (componentID == 4) {
            this.panelService.view = '3D';
            this.updatePogList(`threeDPlanoViewer`, selectedkey);
        } else if (componentID == 8) {
            this.panelService.view = 'store';
            this.updatePogList(`store`, selectedkey);
            this.openStoreView.emit();

        } else if (componentID == 5) {
            this.updatePogList('itemWS', selectedkey);
            this.panelService.view = 'itemWS';
        } else if (componentID == 3) {
            this.updatePogList(`fixtureWS`, selectedkey);
            this.panelService.view = 'fixtureWS';
        } else if (componentID == 6) {
            this.updatePogList(`inventoryWS`, selectedkey);
            this.panelService.view = 'inventoryWS';
        } else if (componentID == 7) {
            this.updatePogList(`performanceWS`, selectedkey);
            this.panelService.view = 'performanceWS';
        }
        if(componentID !== 1){
            if(this.dialog.getDialogById('clipBoard-top-view')){
                this.dialog.getDialogById('clipBoard-top-view')?.close();
                this.sappClipBoardService.openDialog(false,"collapse");
            }
        }
        if (this.parentApp.isAllocateApp && ![7, 8].includes(componentID)) {
            this.allocateService.paWorkSheetChange.next(true);
        }
        this.splitterService.refreshSplitter.next(true);
    }

    private exportPlanogram(type: string, option = ""): void {
        this.sharedService.skipUnloadEvent = true;
        let options = [];
        if (option && option.length) options.push(option);
        let exportData: ExportPlanogram = { id: 0, isExportByProject: 0, exportType: type, idPogs: [this.pogId], options: options };
        this._subscriptions.add(
            this.planogramLibApiService.exportPlanogram(exportData).subscribe((res: IApiResponse<ExportPlanogram>) => {
                this.forceDownload(`${res.Data}`);
            }),
        );
    }

    private forceDownload(link: string): void {
        let ua: string = window.navigator.userAgent;
        let msie: number = ua.indexOf('MSIE ');
        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            window.open(link, 'Download');
        } else {
            window.open(link, '_self');
        }
    }
    private deletePlanogram(): boolean {
        if (!this.checkVersion()) {
            let guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
            if (guid == '') return false;
            let currObj = this.planogramService.getCurrentObject(guid);
            this.panelService.selectedPogs = [currObj.IDPOG];
            const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
                data: this.translate.instant('DELETE_PLANOGRAM_CONFIRM_MSG'),
            });
            dialogRef.afterClosed().subscribe((result: any) => {
                if (result) {
                    let obs = this.planogramLibApiService
                        .deletePlanogram(this.panelService.selectedPogs)
                        .subscribe((res: IApiResponse<number[]>) => {
                            if (res && res.Log.Summary.Error > 0) {
                                this.notifyService.warn(res.Log.Details[0].Message);
                            } else {
                                this.notifyService.warn('POG_DELETE_SUCCESS');
                                this.planogramLibraryService.markRequestToUnpin([currObj]);
                                //update grid data
                                this.updateGridState([currObj]);
                                this.planogramList = this.checkForGrouping();
                                this.panelService.updateSidePanelfordelete.next(this.planogramList);
                            }
                        },
                        (error) => {
                            if (error) {
                                this.notifyService.error(error, 'GOT IT!');
                            }
                        });
                    this._subscriptions.add(obs);
                }
            });
        }
    }

    private checkVersion(): boolean {
        let guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (guid == '') return false;
        let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);
        return typeof currObj != 'undefined' && currObj.IDPogStatus > 3;
    }

    public closeMultiselectMode(): boolean {
        this.IsMultiSelectMode = false;

        const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (guid == '') return false;

        this.planogramService.removeAllSelection(this.sectionID);
        this.planogramService.addToSelectionById(this.sectionID, this.sectionID);
        Object.keys(this.panelService.panelPointer).forEach((key) => {
            switch (this.panelService.panelPointer[key].view) {
                case `positionWS`:
                    this.sharedService.RemoveSelectedItemsInWS.next({ view: `positionWS` });
                    break;
                case `itemWS`:
                    this.sharedService.RemoveSelectedItemsInWS.next({ view: `itemWS` });
                    break;
                case `fixtureWS`:
                    this.sharedService.RemoveSelectedItemsInWS.next({ view: `fixtureWS` });
                    break;
                case `inventoryWS`:
                    this.sharedService.RemoveSelectedItemsInWS.next({ view: `inventoryWS` });
                    break;
                case `performanceWS`:
                    this.sharedService.RemoveSelectedItemsInWS.next({ view: `performanceWS` });
                    break;
            }
        });
        this.planogramService.updateNestedStyleDirty = true;;
        this.visibilityMode();
    }
    public visibilityMode(): void {
        if (this.checkIfNotMultiNSheetMode() && !this.checkifHQview()) {
            this.IsVisibleMode = {
                'min-width': '165px',
                width: '74%',
            };
        } else {
            if (this.IsMultiSelectMode) {
                this.IsVisibleMode = { 'min-width': 'auto', width: 'calc(100% - 15vw)' };
            } else {
                this.IsVisibleMode = { 'min-width': 'auto' };
            }
        }
    }

    private checkifHQview(): boolean {
        if (this.scenarioID == '-1') {
            return true;
        } else {
            return false;
        }
    }

    private promoteMultiple(): void {
        let guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (guid != '') {
            let currObj: POGLibraryListItem = this.planogramService.getCurrentObject(guid);
            if (!this.planogramService.checkIfObjectDirty(currObj)) {
                //Changed selectedPogObject with pog because pog has updated value respective to tabChanged
                const dialogRef = this.dialog.open(PromoteDemoteComponent, {
                    width: '90vw',
                    height: '65vh',
                    maxWidth: '92vw',
                    data: { rowData: [this.pog], failedFlag: false },
                });
                this._subscriptions.add(
                    dialogRef.componentInstance.promoteDemot.subscribe((result: boolean) => {
                        if (result) {
                            this.planogramList = this.checkForGrouping();
                        }
                    }),
                );
                this._subscriptions.add(
                    dialogRef.afterClosed().subscribe((result: void) => {
                        this.planogramList = this.checkForGrouping();
                    }),
                );
            } else {
                this.notifyService.warn('PROMOTE_SAVE_PENDING_CHANGES');
            }
        }
    }
    private displayThread(): void {
        if(this.dialog.getDialogById('clipBoard-top-view')){
            this.dialog.getDialogById('clipBoard-top-view')?.close();
            this.sappClipBoardService.openDialog(false,"collapse");
        }
        if (!this.sharedService.iSHELF.showDirective.discussionThread) {
            this.sharedService.iSHELF.showDirective.discussionThread = 1;
            this.displayThread();
            return;
        }

        let guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (guid) {
            this.openPostMessage.emit({
                pogName: this.planogramList[this.selectedIndex].Name,
                idpog: this.planogramList[this.selectedIndex].IDPOG,
            });
        }
    }

    private openFeedback(): void {
        let guid: string = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (guid) {
            let currObj = this.planogramLibraryService.getCurrentObject(guid);
            const dialogRef = this.dialog.open(FeedbackComponent, {
                width: '65vw',
                height: '55vh',
                data: { pogName: currObj.Name, idpog: currObj.IDPOG },
            });
        }
    }

    public giveBackgroundColor(): HeaderBgColor {
        if (this.checkMultiselectionMode()) {
            return {
                'background-color': 'white',
                display: 'flex',
            };
        }
        if (this.getStyleForActive()) {
            return {
                'background-color': 'rgb(194 216 221)',
                display: 'flex',
            };
        } else {
            return {};
        }
    }
    public getStyleForActive(): boolean {
        if (
            this.sharedService.getActiveSectionId() != '' &&
            this.sharedService.getActiveSectionId() != undefined &&
            this.planogramList[this.selectedIndex]
        ) {
            if (
                this.planogramList[this.selectedIndex].isLoaded &&
                this.sharedService.getActiveSectionId() &&
                this.panelID == this.panelService.activePanelID
            ) {
                this.pogLibHeaderMenuShowHide.isActivePanel = true;
                return true;
            }
        }
        this.pogLibHeaderMenuShowHide.isActivePanel = false;
        return false;
    }

    public createAutoBlocks(block): void {
        this.blockHelperService.createAutoBlocks(block);
    }

    public clearBlocks(): void {
        let sectionID: string = this.sharedService.getActiveSectionId();
        this.blockHelperService.clearBlocks(sectionID, true);
        window.parent.updataBlockData();
        // fixtures' children also needs refresh.
        this.planogramService.updateNestedStyleDirty = true;
        this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
    }

    //TODO @karthik refactor
    private initAllocateAssortHandlers(): void {
      if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
        this._subscriptions.add(this.sharedService.tabChangeEvent.subscribe((res: Object) => {
          if (res) {
            if (this.parentApp.isAllocateApp) {
              if (this.selectedPogObject?.IDPOG != window.parent.activeIDPOG) {
                this.planogramList = this.planogramStore.mappers;
                this.selectedPogObject = this.planogramList.filter(
                  (x) => x.IDPOG == +window.parent.activeIDPOG
                )[0];
                window.parent.updatePog(this.selectedPogObject);
                this.initalizeSelectedTab();
              }
            }
            this.updatePanelHeader();
          }
        }));
      }
      if (this.parentApp.isAllocateApp || this.parentApp.isAssortApp) {
        this._subscriptions.add(this.assortService.triggerPogSave.subscribe((trigger: boolean) => {
          if (trigger) {
            if (this.panelID == 'panelOne') {
              this.triggerSave();
              this.assortService.triggerPogSave.next(false);
            }
          }
        }));
        if (this.parentApp.isAllocateApp) {
          this._subscriptions.add(this.allocateService.updatePlibPogs.subscribe((paPlanogram: PAPogsUpdate) => {
            if (paPlanogram.data.length) {
              let pogSelectedfromLib;
              const pogs: POGLibraryListItem[] = this.planogramStore.mappers;
              let activePog = pogs.filter((e) => e.IDPOG === +window.parent.activeIDPOG)[0];
              for (const d of paPlanogram.data) {
                let pog = pogs.filter((e) => e.IDPOG === Number(d.rowKey))[0];
                if (pog) {
                  pog.pinned = d.pinned;
                  if (pog.pinned && this.planogramList.filter(e => e.IDPOG === pog.IDPOG).length  < 1) {
                    this.planogramList.push(pog);
                  }
                } else {
                    // pog selected in PA, is not part of the current list of planograms in shelf.
                    const processedPog: POGLibraryListItem[] = this.allocateService.processPlanograms([d]);
                    this.planogramLibraryService.markRequestToPin(processedPog, false);
                  if (window.parent.activeIDPOG === d.rowKey) {
                    pogSelectedfromLib = activePog = this.planogramStore.mappers.filter((e) => e.IDPOG === Number(d.rowKey))[0];
                  }
                }
              }
              this.planogramList = this.planogramStore.mappers.filter((pog) => {
                return pog.pinned === true || pog.isLoaded === true;
              });
              if (activePog) {
                let pinned = this.planogramList.filter((e) => e.pinned == true);
                if (((pogSelectedfromLib && activePog.IDPOG === pogSelectedfromLib.IDPOG) || activePog.isLoaded ||
                  pinned.length === 0 || activePog.IDPOG !== this.selectedPogObject.IDPOG) &&
                  this.planogramList.filter(e => e.IDPOG === activePog.IDPOG).length  < 1) {
                  this.planogramList.push(activePog);
                } else if (paPlanogram.data != undefined && this.planogramList.length > 0) {
                  let item = this.planogramList.filter((e) => e.rowKey === activePog.rowKey);
                  if (item.length == 0 && pinned.length > 0) {
                    window.parent.activeIDPOG = this.planogramList[0].IDPOG;
                    activePog = this.planogramList[0];
                  }
                }
              }else {
                const setActivePog = this.planogramStore.mappers.filter(pog => pog.IDPOG === +window.parent.activeIDPOG);
                // activePog part of current list
                if (setActivePog.length) {
                  activePog = setActivePog[0];
                  if(this.planogramList.filter(e => e.IDPOG === activePog.IDPOG).length  < 1) {
                    this.planogramList.push(activePog);
                  }
                  // activepog not part of current list, in case of navigation. Need to set a default pog.
                } else {
                  window.parent.activeIDPOG = this.planogramList[0].IDPOG;
                  activePog = this.planogramList[0];
                }
              }
              this.planogramList = uniqBy(this.planogramList, (x) => {
                return x.IDPOG;
              });
              // if pog has changed/deleted load the new active pog
              if ((this.selectedPogObject && activePog && this.selectedPogObject.IDPOG != activePog.IDPOG) ||
                (this.selectedPogObject === null && activePog)) {
                this.currentPogInitializtion(activePog);
                if (!activePog.isLoaded) {
                  this.pogSideNavState.closeSideNav.next(true);
                }
                this.cd.detectChanges();
              }
              if (paPlanogram.isShelfReload) {
                this.currentPogInitializtion(activePog);
              }
              this.isPaRulesScreen = this.parentApp.isAllocateAppInResetProjectType && window.parent.currentScreen == 'layouts';
              this.cd.detectChanges();
            }
          }));

          this._subscriptions.add(
            this.allocateService.updatePlibPogStatus.subscribe((data: PAPlanogram[]) => {
              for (const d of data) {
                const pogs: POGLibraryListItem[] = this.planogramStore.mappers;
                const pog = pogs.filter((e) => e.IDPOG == Number(d.rowKey))[0];
                if (pog) {
                  pog.IDPogStatus = d.status;
                  pog.POGStatus = d.status;
                  pog.IsReadOnly = d.isReadOnly;
                  pog.PogStatusSymbol = d.statusCode;
                  pog.requestStatus = d.requestStatus;
                  pog.cached = d.cached;
                  pog.IsApproved = d.approveState == 'A' ? true : d.approveState == 'R' ? false : null;
                  pog.syncPog = d.syncPog;
                }
              }
              this.updateExportEnabledStatus();
            }));
          // setup initial PA parms.
          window.parent.updatePog(this.pog);
          this.isPaRulesScreen = this.parentApp.isAllocateAppInResetProjectType && window.parent.currentScreen == 'layouts';
          this.autoBlocks = this.blockHelperService.blockAttributes;
        }
      }
    }

    public approvePOGAllocate(status: number): void {
        let data: any = {};
        data.pogID = this.pog.IDPOG;
        data.IsModel = this.pog.POGTypeSymbol === 'M' ? true : false;
        if (status == 0) data.status = 'RI';
        else if (status == 1) data.status = 'I';
        window.parent.approveReject(data);
    }
    private syncPOGAllocate(): void {
        let data = {};
        data['pogID'] = this.pog.IDPOG;
        data['IsModel'] = this.pog.POGTypeSymbol === 'M' ? true : false;
        window.parent.doSyncPog(data);
    }
    public getCartItems() {
        if (this.sharedService.getActiveSectionId() !== '') {
            const firstLevelChild = this.sharedService.planogramVMs[this.sharedService.getActiveSectionId()].Children;
            for (const flChild of firstLevelChild) {
                if (flChild.ObjectDerivedType === AppConstantSpace.SHOPPINGCARTOBJ) {
                    flChild.badgeVisible = false;
                    flChild.numOfAvlItems = 0;
                    let numItems: number = 0;
                    // this.cartIndex = i;
                    flChild.Children.forEach((obj) => {
                        switch (obj.Position.attributeObject.RecADRI) {
                            case `A`:
                                obj.Position.RecommendationNumber = 1;
                                break;
                            case `R`:
                                obj.Position.RecommendationNumber = 2;
                                break;
                            case `D`:
                                obj.Position.RecommendationNumber = 3;
                                numItems++;
                                break;
                        }
                    });
                    if (numItems > 0) {
                        flChild.badgeVisible = true;
                        flChild.numOfAvlItems = numItems;
                    }

                    return orderBy(flChild.Children, this.orderBy.predicate, this.orderBy.reverse);
                }
            }
        }
        return [];
    }

    public clonePlanogramAllocateMode(): void {
        const dialogRef = this.dialog.open(PAClonePlanogramComponent, { panelClass: 'custom-dialog-container' });

        this._subscriptions.add(
            dialogRef.afterClosed().subscribe((result) => {
                if (result !== undefined) {
                    let data: any = {};
                    data.IdScenario = this.planogramStore.scenarioId;
                    data.AssignmentType = this.sharedService.mode == 'manual' ? 'M' : 'S';
                    data.IdPog = this.pog.IDPOG;
                    data.Name = result ? result : `Clone - ${this.pog.Name}`;
                    this._subscriptions.add(
                        this.allocateAPIService.clonePlanogram(data).subscribe({
                          next:(key) => {
                            this.paBroadcaster.toastMessage('CLONED_POG_SUCCESSFULLY');
                          },
                          error:error => {
                            this.paBroadcaster.toastMessage('ERROR_CLONING_POG');
                          }
                        }),
                    );
                }
            }),
        );
    }

    public rowChangeInvokeforWebView(): void {
        this.pog = this.selectedPogObject;
        this.pogId = this.selectedPogObject?.IDPOG;
        if (this.parentApp.isWebViewApp) {
            this.initalizeSelectedTab();
            if (this.planogramStore.appSettings.SHELFAUTOLOADPOG ) {
                this.panelService.panelPointer[this.panelID].isLoaded = true;
            }
            this.cd.detectChanges();
        }
    }

    private openAllocateGrid(response: CustomMenuClickEventPayload): void {
      this.panelService.updatePanel(PanelIds.One, this.panelService.panelPointer[PanelIds.One]['sectionID'])
      this.planogramService.setSelectedIDPOGPanelID(PanelIds.One);
        this.allocateService.openGrid(response);
    }

    private updateGridState(pogs: POGLibraryListItem[]): void {
        let ind = this.agGridStoreService.gridState.findIndex(grid => grid.gridId === 'pogScenario-grid');
        if (this.agGridStoreService.gridState[ind]?.data) {
            pogs.forEach((pog) => {
                const index = this.agGridStoreService.gridState[ind]?.data.findIndex(e => e.IDPOG === pog.IDPOG);
                if (index >= 0) {
                    this.agGridStoreService.gridState[ind].data.splice(index, 1);
                }
            });
        }
    }

    private updateExportEnabledStatus(): void {
        if (this.planogramList[this.selectedIndex]?.IsApproved || this.planogramList[this.selectedIndex]?.syncPog == 'Success') {
            this.pogLibHeaderMenuShowHide.exportDisabled = false;
        }
        else {
            this.pogLibHeaderMenuShowHide.exportDisabled = true;
        }
        if (this.parentApp.isAllocateApp) {
           this.pogLibHeaderMenuShowHide.ispogCountOne = this.planogramList[this.selectedIndex]?.pogCount === 1 ? true : false;
        }
    }


    //initialize when load/update Pogs from Planogram automation
    private currentPogInitializtion(activePog: POGLibraryListItem): void {
      // on pog change
      if(activePog.isLoaded && this.selectedPogObject != activePog) {
        this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
      }
        this.selectedPogObject = activePog;
        this.selectedIndex = this.planogramList.findIndex((x) => x.IDPOG === activePog.IDPOG);
        // fallback
        if(this.selectedIndex === -1) {
          this.selectedIndex = 0;
          window.parent.activeIDPOG = this.planogramList[0].IDPOG;
        }
        this.initalizeSelectedTab();
        if(this.panelID === this.panelService.activePanelID) {
          this.panelService.updatePanel(this.panelID, this.panelService.panelPointer[this.panelID].sectionID);
        }
    }

    public objectPropertyGrid(event: Event): void {
        if(!this.IsMultiSelectMode){
            return;
        }
        this.sharedService.fixtureTypeMultiple = false;
        if (!this.pogSideNavState.propertiesView.isPinned) {
            const items = this.planogramService.getSelectedObject(this.sharedService.getActiveSectionId());
            if (this.parentApp.isAllocateApp) {
            this.allocateService.resizeParentWindow(true);
          } else if (this.parentApp.isAssortAppInIAssortNiciMode && items[0].ObjectDerivedType  === AppConstantSpace.POSITIONOBJECT) {
              window.parent.postMessage(`invokePaceFunc:openPropertyGrid:["${this.planogramStore.loadPogId}","${items[0].Position.Product.IDProduct}"]`, '*');
              event.stopPropagation();
              return;
            }
            // propery pane
            const dialogRef = this.dialog.open(PropertyGridComponent, {
                height: 'fit-content',
                width: '55%',
                panelClass: 'mat-dialog-move-cursor',
                id: 'property-grid-dialog'
            });
            this._subscriptions.add(
                dialogRef.beforeClosed().subscribe((result) => {
                    this.allocateService.resizeParentWindow(false);
                }),
            );
        }
        else if (this.pogSideNavState.propertiesView.isPinned && this.pogSideNavState.activeVeiw != PogSideNaveView.PROPERTYGRID) {
            this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
        }
        event.stopPropagation();
    }

}
