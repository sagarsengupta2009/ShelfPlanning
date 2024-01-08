import {
    ChangeDetectionStrategy, ChangeDetectorRef, Component,
    ElementRef, EventEmitter, Input, OnChanges, OnDestroy,
    OnInit, Output, SimpleChanges,
} from '@angular/core';
import { HttpHeaders } from '@angular/common/http';
import { isEmpty } from 'lodash-es';
import { Observable, Observer, Subject, Subscription, zip } from 'rxjs';
import { SyncAuthCodeWithVM } from 'src/app/shared/classes/sync-auth-code-with-vm';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { MatDialog } from '@angular/material/dialog';
import {
    DownloadedPog,
    IApiResponse, IPanelInfo, LogsListItem, PanelSplitterViewType, Planograms, PlanogramStore, POGLibraryListItem,
    PogSideNaveView,
    ProductAuth, SectionResponse,
    SplitterViewMode,
    SvgTooltip
} from 'src/app/shared/models';
import {
    AllocateAPIService, BlockHelperService, HistoryService,
    PanelService, PlanogramCommonService, PlanogramStoreService,
    PlanogramLibraryService, PlanogramService, Planogram_2DService,
    SharedService, IntersectionChooserHandlerService, NotifyService,
    InformationConsoleLogService, ParentApplicationService, PaBroadcasterService, SplitterService, AllocateNpiService, AllocateService, AllocateEventService, ConfigService,AllocateFixtureService, PlanogramSaveService, PlanogramInfoService, PlanogramLibraryApiService, ClipBoardService, PogSideNavStateService, HighlightService, ShoppingCartService
} from 'src/app/shared/services';
import { Fixture, Position, Section } from 'src/app/shared/classes';
import { TranslateService } from '@ngx-translate/core';
import { PogMaxCountDialogComponent } from '../../../../planogram-library/planogram-maxcount-dialog-component';
import { SvgToolTip } from 'src/app/shared/models/ToolTipData';

declare const window: any;
@Component({
    selector: 'shelf-panel-content',
    templateUrl: './panel-content.component.html',
    styleUrls: ['./panel-content.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PanelContentComponent implements OnInit, OnChanges, OnDestroy {
    @Input() panelPointer: IPanelInfo;
    @Input() panelID: string;
    @Output() updateHeaderIcon: EventEmitter<boolean> = new EventEmitter();
    @Output() closeStoreView: EventEmitter<string> = new EventEmitter();
    public displayView: string;
    public id: number;
    public svgDisplay: any;
    public toolTipData: SvgToolTip[];
    public sectionObject: Section;
    public selectedPogObject: POGLibraryListItem;
    public loadPogInNewTab;
    private svgTooltipData: SvgTooltip[];
    private subscriptions: Subscription = new Subscription();
    private invokeProcessAuth: Subject<boolean> = new Subject<boolean>();
    public showNoPreview: boolean;
    public readonly imageNoPreviewSrc: string = AppConstantSpace.DEFAULT_PREVIEW_IMAGE;
    public styleThumbnail = {};
    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly intersectionChooserHandlerService: IntersectionChooserHandlerService,
        private readonly blockHelperService: BlockHelperService,
        private readonly historyService: HistoryService,
        private readonly panelService: PanelService,
        private readonly translate: TranslateService,
        private readonly notify: NotifyService,
        private readonly allocateAPIService: AllocateAPIService,
        private readonly planogram2DService: Planogram_2DService,
        private readonly planogramLibService: PlanogramLibraryService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly cd: ChangeDetectorRef,
        public readonly el: ElementRef,
        private readonly paBroadcaster: PaBroadcasterService,
        private readonly splitterService: SplitterService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly allocateService: AllocateService,
        private readonly allocateEventService: AllocateEventService,
        private readonly allocateFixtureService: AllocateFixtureService,
        private readonly config: ConfigService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly planogramInfoService: PlanogramInfoService,
        private readonly planogramLibapiService: PlanogramLibraryApiService,
        private readonly MatDialog:MatDialog,
        private readonly sappClipBoardService: ClipBoardService,
        private readonly pogSideNavStateService:PogSideNavStateService,
        private readonly highLightService:HighlightService,
        private readonly shoppingCartService: ShoppingCartService
    ) { }

    ngOnInit(): void {
        //Forcefully added detection for tooltip
        this.subscriptions.add(this.sharedService.turnoNOffSub.subscribe((res) => {
            this.cd.markForCheck();
        }));
        this.subscriptions.add(this.invokeProcessAuth.subscribe((apiResponse: boolean) => {
            if (apiResponse) {
                const list = this.planogramStore.downloadedPogs;
                let inx = list.findIndex((x) => x.IDPOG === this.panelService.skipApiCallForPanel.IDPOG);
                if (inx !== -1) {
                    this.bindStoredSectionObject(list, inx, this.panelService.skipApiCallForPanel.panelID);
                    this.panelService.invokedIdpogApiForPanelID = null;
                    this.panelService.skipApiCallForPanel = { panelID: '', flag: false, IDPOG: null };
                }
            }
        }));
        if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.Full) {
            this.styleThumbnail = 'FULLCART';
        }
        else if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.SideBySide) {
            this.styleThumbnail = 'SBSCART'
        }
        else if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.OverUnder) {
            this.styleThumbnail = 'OUCART'
        }
    }
    //TODO @karthik this method needs a refactor.
    private bindStoredSectionObject(list: DownloadedPog[], inx: number, panelID: string): void {
        this.sectionObject = list[inx].sectionObject as Section;
        const storedMode: SplitterViewMode = this.planogramStore.splitterViewMode;
        // default to panelview switch based on below criteria.
        let view: string = 'panelView';
        if (storedMode.displayMode != PanelSplitterViewType.Full && storedMode.syncMode) {
            if (!this.parentApp.isAssortAppInIAssortNiciMode && this.panelService.ActivePanelInfo.view === 'panelView' && this.panelService.panelPointer[panelID].view === 'panelView') {
                view = 'positionWS';
            } else {
                view = this.panelService.panelPointer[panelID].view ? this.panelService.panelPointer[panelID].view  : 'panelView';
            }
        }
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [panelID]: {
                ...this.panelService.panelPointer[panelID],
                sectionID: this.sectionObject.$sectionID,
                componentID: 1,
                isLoaded: true,
                selectedViewKey: this.panelService.panelPointer[panelID].selectedViewKey,
                view
            },
        };
        this.informationConsoleLogService.logUpdatedEvent.next({ obj: false });
        this.RenderPlanogramData();
        const obj = {
            isPogDownloaded: this.panelService.panelPointer[panelID].isLoaded,
            pogInfo: this.selectedPogObject,
            displayView: this.panelService.panelPointer[panelID].view,
        };
        this.planogramService.updatePOGInfo.next(obj);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.Full) {
            this.styleThumbnail = 'FULLCART';
        }
        else if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.SideBySide) {
            this.styleThumbnail = 'SBSCART'
        }
        else if (this.planogramStore.splitterViewMode?.displayMode === PanelSplitterViewType.OverUnder) {
            this.styleThumbnail = 'OUCART'
        }
        this.updatePanelContent();
    }

    private updatePanelContent(): void {
        if (!isEmpty(this.panelPointer)) {
            const storedMode = this.planogramStore.splitterViewMode;
            if (storedMode.displayMode === 0 && this.panelID !== this.panelService.activePanelID) {
                return;
            }
            this.id = this.panelPointer.IDPOG;
            this.displayView = this.panelPointer.view;
            // page change in PA
            //  if (this.sharedService.link == 'allocate' && !this.selectedPogObject) {
            const planogramList: POGLibraryListItem[] = this.planogramStore.mappers;
            // }
            this.selectedPogObject = planogramList.find((x) => x.IDPOG === this.id);
            const list = this.planogramStore.downloadedPogs;
            const index = list.findIndex(
                (x) => x.IDPOG === this.selectedPogObject.IDPOG && x.sectionObject,
            );
            if (this.panelPointer.isLoaded) {
                this.sectionObject = null;
                this.svgDisplay = undefined;
                if (index !== -1) {
                    const result = list[index];
                    if (((list[index].sectionObject) as IApiResponse<SectionResponse>).Data) {
                        this.processPlanogramData((list[index].sectionObject) as IApiResponse<SectionResponse>);
                        list[index].isCreated = false;
                    } else {
                        this.sectionObject = result.sectionObject as Section;
                        this.sharedService.setSelectedIDPOG(this.selectedPogObject.IDPOG);
                        this.informationConsoleLogService.logUpdatedEvent.next({ obj: false });

                        if(this.parentApp.isAllocateApp || this.parentApp.isAssortApp) {
                            this.updateLoadedPogParams(this.sectionObject);
                        }
                        this.RenderPlanogramData();
                        const obj = {
                            isPogDownloaded: this.panelService.panelPointer[this.panelID].isLoaded,
                            pogInfo: this.selectedPogObject,
                            displayView: this.panelService.panelPointer[this.panelID].view,
                        };
                        if(this.panelService.activePanelID !== this.panelID){
                            let view : string = ''
                            if (storedMode.syncMode) {
                                if (this.panelService.ActivePanelInfo.view === 'panelView' && this.panelService.panelPointer[this.panelID].view === 'panelView') {
                                    //When user selects planogram option in PA and right pane need to load planogram and not position worksheet
                                    if(this.parentApp.isAllocateApp && this.allocateService.syncFlag) {
                                        this.allocateService.syncFlag = false;
                                    } else {
                                        view = 'positionWS';
                                    }
                                } else {
                                    view = this.panelService.panelPointer[this.panelID].view  ? this.panelService.panelPointer[this.panelID].view  : 'panelView';
                                }
                            }
                            this.panelService.panelPointer[this.panelID].view = view ? view : this.panelService.panelPointer[this.panelID].view;
                            this.panelPointer.view = this.panelService.panelPointer[this.panelID].view;
                        }
                        if(this.pogSideNavStateService.activeVeiw != PogSideNaveView.HIGHLIGHT && this.planogramService.getSettingsBySectionId(this.sectionObject.$id).isEnabled){
                            this.highLightService.updateRangeModel();
                        }
                        this.planogramService.updatePOGInfo.next(obj);
                    }
                } else {
                    /** when pogs are auto downloaded, panel view is not updated. */
                    if (['', 'svgView'].includes(this.panelService.panelPointer[this.panelID].view)) {
                        this.panelService.panelPointer[this.panelID].view = 'panelView';
                        const obj = {
                            isPogDownloaded: this.panelService.panelPointer[this.panelID].isLoaded,
                            pogInfo: this.selectedPogObject,
                            displayView: this.panelService.panelPointer[this.panelID].view,
                        };
                        this.planogramService.updatePOGInfo.next(obj);
                    }
                    this.getSectionObject();
                }
                this.cd.markForCheck();
                this.planogramInfoService.openPlanogramInfo(); //opening the pog info dialog when it was previoulsy opened
            } else {
                // OnInit handles if pog needs to be auto downloaded, check here is reduendent and creates issue when API fails.
                this.getSVG();
                if(this.MatDialog.getDialogById('clipBoard-top-view')){
                    this.MatDialog.getDialogById('clipBoard-top-view')?.close();
                    this.sappClipBoardService.openDialog(false,"collapse");
                }
            }
            // Update console information on tab change
            this.informationConsoleLogService.logUpdatedEvent.next({ obj: false });
            this.cd.markForCheck();
        }
    }
    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }
    //TODO @Navya: Confirm if response from allocate getPlanogramSvg is SvgToolTip[], if not modify it accordingly.
    private getSVG(): void {
        window.checkImageerror = (ele) => { //handling image failure onerror in the thumbnail
            const imgFallback = `${this.config?.fallbackImageUrl}`;
            ele.setAttribute('xlink:href', imgFallback);
        };
        this.svgDisplay = undefined;
        if (this.sharedService.link == 'allocate') {
            this.subscriptions.add(
                this.allocateAPIService.getPlanogramSvg(this.selectedPogObject).subscribe((pogSVG) => {
                    this.svgDisplay = pogSVG['SvgContent']['Content'];
                    this.allocateService.svgTooltipData = pogSVG['ToolTipData'];
                    this.shoppingCartService.updateUnLoadedCart.next(true);
                    this.cd.markForCheck();
                })
            );
        } else {
            let fileName = '';
            //api call to get filename
            const pogInfoSubscription = this.planogramLibapiService.getPlanogramsInfo(this.selectedPogObject.IDPOG.toString()).subscribe((response: IApiResponse<Planograms[]>)=>{
                if (response.Data.length) {
                    fileName = response.Data[0].ThumbnailFileName;
                    if (this.displayView != 'store') {
                        this.getSVGImg(fileName);
                    }
                }
            },
                (error: any) => {
                    this.cd.markForCheck();
                });
            this.subscriptions.add(pogInfoSubscription);
        }

        this.sharedService.setSelectedIDPOG(this.selectedPogObject.IDPOG);
        const obj = {
            isPogDownloaded: false,
            pogInfo: this.selectedPogObject,
            displayView: 'svgView',
        };
        this.planogramService.updatePOGInfo.next(obj);
    };

    public checksvg(achor: ElementRef): string {
        this.toolTipData = this.getToolTipData(achor);
        const image =(this.toolTipData.find((x) => x.keyName === 'Image')?.value as string) || achor.nativeElement.href?.baseVal;
        this.toolTipData = this.toolTipData.filter((it) => it.keyName != 'Image');
        return image;
    }

    private getToolTipData(svgSlement: ElementRef): SvgToolTip[] {
        if(this.parentApp.isAllocateApp){
            return this.allocateService.getToolTipData(svgSlement);
        } else {
            return this.planogramService.getsvgToolTipData(svgSlement, this.svgTooltipData);
        }
    }

    private getSectionObject(): boolean | void {
        let pogCounts = this.planogramLibService.getLoadCount();
        let currObj: POGLibraryListItem = this.selectedPogObject;
        if (pogCounts.canDownload) {
            //checking POG count before creating a new planogram
            if (currObj.IsLocked) {
                this.notify.error('Planogram not ready. Please try after some time', 'Ok');
                return false;
            } else {
                if (this.loadPogInNewTab > 0 && this.planogramLibService.mapper.length > this.loadPogInNewTab) {
                    window.open('sp/pogs?loadpogID=' + currObj.IDPOG, 'POGID: ' + currObj.IDPOG); //not yet implemented todo
                } else {
                    if (this.panelService.invokedIdpogApiForPanelID === this.selectedPogObject.IDPOG) {
                        this.panelService.skipApiCallForPanel = { panelID: this.panelID, flag: true, IDPOG: this.selectedPogObject.IDPOG };
                    }
                    // API can be called to load pog
                    else {
                        this.panelService.invokedIdpogApiForPanelID = this.selectedPogObject.IDPOG;
                        // API change for PA
                        if (this.parentApp.isAllocateApp) {
                            window.parent.updateBlocks = false;
                            this.subscriptions.add(
                                this.allocateAPIService.getPlanogramData(this.selectedPogObject)
                                    .subscribe((result) => {
                                        if(result.Data) {
                                            this.processPlanogramData(result);
                                        } else {
                                            this.pogLoadErrorHandler(this.selectedPogObject,false,result.Message)
                                            window.parent.showNoPlanogramMsg('loading', 'finished');
                                        }
                                    },
                                        (error) => {
                                            this.pogLoadErrorHandler(this.selectedPogObject,false);
                                        }));

                        } else {
                            const planogramDataSub = this.panelService
                                .getPlanogramData(this.selectedPogObject.IDPOG)
                                .subscribe((result: IApiResponse<SectionResponse>) => {
                                    if (result.Data != null) {
                                        this.processPlanogramData(result);
                                        //adding permissions from parent
                                        result.Data[`Permissions`] = result.Permissions;
                                    } else {
                                        this.pogLoadErrorHandler(currObj,false);
                                        if (result?.Log?.Details[0]?.Message) {
                                            this.notify.error(result.Log.Details[0].Message, this.translate.instant('OK'));
                                        }
                                    }
                                },
                                    (error: any) => {
                                        this.pogLoadErrorHandler(currObj, false, error);
                                    })
                            this.subscriptions.add(planogramDataSub);
                        }
                    }
                }
            }
        } else {
            const dialogRef = this.MatDialog.open(PogMaxCountDialogComponent, {
                width: '50vw',
                data: { data: []},
                autoFocus: false
            });
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    console.log("dialogClose")
                }
            });
            this.panelService.panelPointer = {
                ...this.panelService.panelPointer,
                [this.panelID]: {
                    ...this.panelService.panelPointer[this.panelID],
                    sectionID: '',
                    componentID: '',
                    isLoaded: false,
                },
            };
            this.pogLoadErrorHandler(currObj,true);
            this.notify.warn(`${pogCounts.maxPogCount} ${this.translate.instant('POG_ALREADY_LOADED')}`);
        }
    };

    private pogLoadErrorHandler(currObj: POGLibraryListItem,fromMaxCount:boolean= false, message?: string): void {
        if(!fromMaxCount){
            if(this.parentApp.isAllocateApp && message) {
                this.paBroadcaster.toastMessage(message);
            } else {
                this.notify.error(message, 'OK');
            }
            this.getSVG();
        }
        // Remove from downloaded list
        this.planogramStore.removePogById(currObj.IDPOG);

        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                sectionID: '',
                componentID: '',
                isLoaded: false,
            },
        };
        this.updateHeaderIcon.emit(true);
        this.panelService.invokedIdpogApiForPanelID = null;
    }

    private processPlanogramData(result: IApiResponse<SectionResponse>): void {
        const AppSettingsSvc = this.planogramStore.appSettings;

        this.planogramCommonService.loadLabelItems();
        this.planogramCommonService.obtainShelfLabelParams(AppSettingsSvc.allSettingsObj.GetAllSettings.data);
        this.planogramCommonService.loadFixtLabelItems();
        // skip prod auth for allocate
        if (this.sharedService.link == 'allocate') {
            window.parent.showNoPlanogramMsg('loading', 'finished');
            if (!this.checkForNegativeDimPos(result.Data)) {
                this.processAfterProdAuth(result);
            } else {
                this.productAuthErrorHandler(this.translate.instant('INVALID_PLANOGRAM_DATA') + ' ' + this.translate.instant('POSITION_WITH_NEGATIVE_DIMENSION'));
            }
        } else {
            if (this.planogramService.inProcessPOGId.indexOf(result.Data.IDPOG) > -1) {
                return;
            } this.planogramService.inProcessPOGId.push(result.Data.IDPOG);
            const hasPosNegativeDim$ = new Observable((observer: Observer<boolean>) => {
                if (this.checkForNegativeDimPos(result.Data)) {
                    observer.error({ message: this.translate.instant('INVALID_PLANOGRAM_DATA') + ' ' + this.translate.instant('POSITION_WITH_NEGATIVE_DIMENSION'), hasNegativeDimPos: true });
                }
                observer.next(false);
            });

            hasPosNegativeDim$.pipe(source => zip(source, this.panelService.getProductAuthForPOG(result.Data.IDPOG)))
                .subscribe(
                    (response) => {
                        if (!response[0]) {
                            this.processAfterProdAuth(result, response[1].Data);
                        }
                        this.planogramService.inProcessPOGId = this.planogramService.inProcessPOGId.filter((id) => id !== result.Data.IDPOG);
                    },
                    (error: any) => {
                        this.getSVG();
                        const msg = error.hasNegativeDimPos ? error.message : 'INVALID_PLANOGRAM_DATA';
                        this.productAuthErrorHandler(msg);
                        this.planogramService.inProcessPOGId = this.planogramService.inProcessPOGId.filter((id) => id !== result.Data.IDPOG);
                    }
                );
        }
    };

    private productAuthErrorHandler(msg: string): void {
        this.notify.error(msg, 'OK');
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                sectionID: '',
                componentID: '',
                isLoaded: false,
            },
        };
        this.panelService.invokedIdpogApiForPanelID = null;
        this.updateHeaderIcon.emit(true);
    }

    private checkForNegativeDimPos(data: SectionResponse): boolean {
        const negativeDimPositions: Position[] = [];
        let recursiveCheck = (data) => {
            if (data.hasOwnProperty('Children')) {
                for (const item of data.Children) {
                    // Check for skip shopping cart positions
                    if (Utils.checkIfFixture(item as Fixture) && item.Fixture.FixtureNumber == -1) {
                        continue;
                    }
                    if (Utils.checkIfPosition(item as Position) && (item.Position.ProductPackage.Width <= 0 || item.Position.ProductPackage.Height <= 0 || item.Position.ProductPackage.Depth <= 0)) {
                        negativeDimPositions.push(item);
                    }
                    recursiveCheck(item);
                }
            }
        }
        recursiveCheck(data);

        if (negativeDimPositions.length) {
            const idPog = negativeDimPositions[0].IdPog;
            const upcs = negativeDimPositions.map((pos) => pos.Position.Product.UPC).join(',');
            const logDetails: LogsListItem[] = [{
                Code: this.translate.instant('INVALID'),
                Message: this.translate.instant('INVALID_PLANOGRAM_DATA') + ' ' + this.translate.instant('POSITION_WITH_NEGATIVE_DIMENSION') + ' ' + this.translate.instant('FOOTER_UPC') + upcs,
                Type: -1,
                IsClientSide: true,
                PlanogramID: idPog,
            }];
            this.informationConsoleLogService.setClientLog(logDetails, idPog);
        }

        return negativeDimPositions.length > 0;
    }

    private processAfterProdAuth(result: IApiResponse<SectionResponse>, authData?: ProductAuth): void {
        const list = this.planogramStore.downloadedPogs;
        let inx = list.findIndex((x) => x.IDPOG === +result.Data.IDPOG);
        this.sharedService.setSelectedIDPOG(this.selectedPogObject.IDPOG);
        this.planogramStore.getLookupdata();
        //modifying SectionResponse to Section type
        this.prepareData(result.Data);
        this.sectionObject.globalUniqueID = this.selectedPogObject.globalUniqueID;
        if (authData) {
            this.planogramService.syncAuthCodeWithVM = new SyncAuthCodeWithVM(authData, this.sectionObject);
        }
        this.selectedPogObject.sectionID = this.sectionObject.$sectionID;

        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                sectionID: this.sectionObject.$sectionID,
                componentID: 1,
                isLoaded: true,
                selectedViewKey: this.panelService.panelPointer[this.panelID].selectedViewKey,
            },
        };

        const obj = {
            isPogDownloaded: this.panelService.panelPointer[this.panelID].isLoaded,
            pogInfo: this.selectedPogObject,
            displayView: this.panelService.panelPointer[this.panelID].view,
        };
        this.updateHeaderIcon.emit(true);
        this.planogramService.updatePOGInfo.next(obj);

        this.selectedPogObject.isLoaded = true;
        let objectMapper: POGLibraryListItem[] = this.planogramStore.mappers;
        objectMapper.forEach((element) => {
            if (element.IDPOG == this.selectedPogObject.IDPOG) {
                element.isLoaded = true;
                element.sectionID = this.sectionObject.$sectionID;
            }
        });
        this.planogramLibService.markAlreadyLoaded({
            IDPOG: result.Data.IDPOG,
            isLoaded: true,
            sectionID: this.sectionObject.$sectionID,
        });

        if (inx === -1) {
            this.planogramStore.downloadedPogs.push(
                {
                    IDPOG: result.Data.IDPOG,
                    sectionObject: this.sectionObject,
                    sectionID: this.sectionObject.$sectionID,
                },
            );
            inx = this.planogramStore.downloadedPogs.length - 1;
        } else {
            const storedMode = this.planogramStore.splitterViewMode;
            if (storedMode.displayMode !== 0 && storedMode.syncMode) {
                if (list[inx].sectionID && list[inx].IDPOG == this.sectionObject.IDPOG) {
                    this.sectionObject.$sectionID = list[inx].sectionID;
                    list[inx].sectionID = list[inx].sectionID;
                } else {
                    list[inx].sectionObject = this.sectionObject;
                    list[inx].sectionID = this.sectionObject.$sectionID;
                    this.planogramStore.downloadedPogs = [...list];
                }
            } else {
                list[inx].sectionObject = this.sectionObject;
                list[inx].sectionID = this.sectionObject.$sectionID;
                this.planogramStore.downloadedPogs = [...list];
            }
        }
        this.panelService.panelPointer[this.panelID].sectionID = list[inx].sectionID;
        this.sectionObject = this.sectionObject;
        if (this.panelService.skipApiCallForPanel.flag) {
            this.invokeProcessAuth.next(true);
        }

        if(this.parentApp.isAllocateApp) {
            this.paBroadcaster.updatePogDownload(result.Data.IDPOG, true);
            this.allocateNpi.setNpiUpdated(this.sectionObject.$sectionID, false);
            this.allocateEventService.originalFixtureData =  this.allocateFixtureService.prepareFixtureData(this.sectionObject);
            this.planogramService.updateSectionFromTool.next(this.sectionObject);
        }else if (this.parentApp.isAssortApp) {
            window.parent.postMessage('invokePaceFunc:shelfLoaded', '*');
            window.parent.postMessage(`invokePaceFunc:syncAssortWorkbook:["${this.selectedPogObject.IDPOG}"]`, '*',);
        }

        /*Highlight in worksheet might be true when navigating from downloaded pog to unloaded pog
         or while reloading, hence resetting during fresh download*/
        if(this.sharedService.enableHighlightInWorksheet)
        {
            this.sharedService.enableHighlightInWorksheet = false;
        }

        //To fit grid into panel after pog download in over-under display mode
        if (this.planogramStore.splitterViewMode?.displayMode === 2)
            this.splitterService.refreshSplitter.next(true);

        this.planogramSaveService.initiateAutoSave(this.sectionObject, this.sectionObject.$sectionID);
    };

    private prepareData(data: SectionResponse): void {
        let pogObj = this.panelService.sortChildrens(data);

        this.sectionObject = this.planogramCommonService.prepareModel(pogObj);
        this.sharedService.planogramVMs[this.sectionObject.$id] = this.sectionObject;
        this.sharedService.NewIsSaveDirtyFlag[this.sectionObject.$id] = false;
        this.sharedService.OldIsSaveDirtyFlag[this.sectionObject.$id] = false;
        this.planogramService.initBySectionIdByCommunicator(this.sectionObject.$id);
        this.planogramService.initBySectionIdMeasurment(this.sectionObject.$id);
        this.planogramService.initBySectionIdByPlanogramsetting(this.sectionObject.$id);
        this.planogramService.initBySectionIdByHighlight(this.sectionObject.$id);
        this.sharedService.setActiveSectionId(this.sectionObject.$id);
        this.sharedService.setActiveComponentNumber(1);
        this.intersectionChooserHandlerService.initBySectionId(this.sectionObject.$id);

        if (this.parentApp.isAllocateApp) {
            this.blockHelperService.processPogBlocks(this.sectionObject);
        }
        this.processAnnotation();
        this.RenderPlanogramData();
        this.historyService.historyStack[this.sectionObject.$id] === undefined
            ? this.historyService.initBySectionId(this.sectionObject.$id)
            : null;
        this.planogramService.addToSelectionByObject(this.sectionObject, this.sectionObject.$id);
    }

    private processAnnotation(): void {
        if (this.sectionObject.ObjectDerivedType === 'Section' && this.sectionObject.annotations.length === 0) {
            this.sectionObject.annotationLoaded = false;
            this.sectionObject.annotations = [];
            if (!this.planogramService.annotationON) {
                this.sectionObject.showAnnotation = this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView = 0;
            } else {
                this.sectionObject.showAnnotation = this.planogramService.rootFlags[this.sectionObject.$id].isAnnotationView = 1;
            }
            // for PA pogs, annotation is part of section object
            if(this.parentApp.isAllocateApp) {
                let annotations = {
                    Data: this.sectionObject.PogObjectExtension,
                    Permissions: null
                };
                this.planogram2DService.processAnnotations(this.sectionObject, annotations);
            } else {
                this.planogram2DService.toggleAnnotations(this.sectionObject, true).subscribe();
            }
        }
    }

    private RenderPlanogramData(): void {
        setTimeout(() => {
            this.planogram2DService.activate();
        }, 2000);
    };

    private updateLoadedPogParams(sectionObj: Section): void {
        /**
         * When switching b/w screens in PA/Assort NICI, the pog loaded state is retained, but the pog list is regenerated.
         * This is done because in cases such as pogs being regenerated, the list of pogs might change.
         * Hence the pog might have already been loaded (before switching the screen) but not marked as loaded after pog list was updated.
         */
        this.planogramLibService.markAlreadyLoaded({
            IDPOG: this.selectedPogObject.IDPOG,
            isLoaded: true,
            sectionID: sectionObj.$id
        })
        // when there is a pog change and pog is already loaded, update the blocks category of the selected pog.
        if(this.parentApp.isAllocateApp) {
            if (this.parentApp.isAllocateAppInResetProjectType) {
                this.blockHelperService.updateCurrentBlockType(sectionObj);
            }
            // pog auto downloads from previously loaded list, but the pog list is updated from api which regenerates the guid.
            sectionObj.globalUniqueID = this.selectedPogObject.globalUniqueID;
        }
    }

    public closeStore(): void {
        this.displayView = 'svgView';
        this.panelService.panelPointer = {
            ...this.panelService.panelPointer,
            [this.panelID]: {
                ...this.panelService.panelPointer[this.panelID],
                sectionID: '',
                componentID: '',
                isLoaded: false,
                view: this.displayView,
            },
        };
        this.getSVG();
        this.closeStoreView.emit(this.displayView);
    };

    private getSVGImg(fileName: string): void {
        if (fileName) {
            const headers = new HttpHeaders();
            headers.set('Accept', 'image/svg+xml');
            //api call to get svg image
            const thumbnailSvgSub = this.panelService.getThumbnail(fileName).subscribe((response: IApiResponse<string>) => {
                this.showNoPreview = false;
                this.svgDisplay = response.Data;
                this.getSVGTooltipData();
            },
                (error: any) => {
                    this.svgDisplay = undefined;
                    this.showNoPreview = true;
                    this.cd.markForCheck();
                });
            this.subscriptions.add(thumbnailSvgSub);
        }
        else {
            this.svgDisplay = undefined;
            this.showNoPreview = true;
            this.shoppingCartService.cartObj = [];
            this.shoppingCartService.updateUnLoadedCart.next(true);
            this.cd.markForCheck();
        }
    }

    private getSVGTooltipData(): void {
        //api call to get svg tooltip data
        const svgToolTipSub = this.panelService.getsvgTooltipData(this.selectedPogObject.IDPOG).subscribe((response: IApiResponse<SvgTooltip[]>) => {
            this.svgTooltipData = response.Data;
            this.shoppingCartService.cartObj = response.Data['shoppingCartData'];
            this.shoppingCartService.updateUnLoadedCart.next(true);
        },
            (error: any) => {
                this.cd.markForCheck();
            });
        this.cd.markForCheck();
        this.subscriptions.add(svgToolTipSub);

    }
}
