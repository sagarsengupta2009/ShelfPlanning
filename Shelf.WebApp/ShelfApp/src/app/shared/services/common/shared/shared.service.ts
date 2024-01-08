import { ComponentRef, Injectable, Renderer2, RendererFactory2 } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MatSnackBarConfig } from '@angular/material/snack-bar';
import { BehaviorSubject, Subject } from 'rxjs';
import { isUndefined } from 'lodash-es';
import { LocalStorageService } from 'src/app/framework.module';
import { AppConstantSpace, LocalStorageKeys, Utils } from 'src/app/shared/constants';
import {
    PogProfileSignatureSettings,
    ShelfLabelProp,
    iShelf,
    POGLibraryListItem,
    PanelSplitterViewType,
    PositionFieldLock,
    SelectedStoreData,
    Dictionary,
    AnnotationType,
    FreeFlowDetails,
} from 'src/app/shared/models';
import { PlanogramStoreService, ParentApplicationService, SplitterService } from 'src/app/shared/services';
import { ThemeService } from '../theme/theme.service';
import {
    Section, Position, ShoppingCart, Modular,
    StandardShelf, BlockFixture, PegBoard,
    Coffincase, Crossbar, SlotWall, Basket, Divider, Grill, Block, PlanogramObject, Fixture
} from 'src/app/shared/classes';
import { WorksheetEventData } from 'src/app/shared/models/worksheets-models';
import { TranslateService } from '@ngx-translate/core';

/** Annotation/grill/dividers will not be part of this list.
 *  Annotation is not part of planogram but has the selection functionality which is handled differently since it has a different behaviour.
 * TODO add block
 */

export type ObjectListItem = Position | Section | Modular | PositionParentList | NonMerchandisableList | ShoppingCart | Block;
export type PositionParentList = MerchandisableList | ShoppingCart;
export type CoffinTypes = Coffincase | Basket;
export type PegTypes = PegBoard | Crossbar | SlotWall;
export type CrunchModeFixtures = StandardShelf | CoffinTypes;
export type NonMerchandisableList = BlockFixture | Grill | Divider | ShoppingCart;
export type MerchandisableList = StandardShelf | PegTypes | CoffinTypes;
//Fixtures including merchandisable and non-merchandisable list
export type AllFixtureList = MerchandisableList | NonMerchandisableList | Modular;
//Fixtures using in the pog directly. Excluding Grills and Dividers which are child of Standardshelf.
export type FixtureList = BlockFixture | MerchandisableList;
export type SelectableList = Position | Block | Section | Modular | FixtureList;

@Injectable({
    providedIn: 'root',
})
export class SharedService {
    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly rendererFactory: RendererFactory2,
        private readonly route: ActivatedRoute,
        private readonly themeService: ThemeService,
        private readonly parentApp: ParentApplicationService,
        private readonly localStorage: LocalStorageService,
        private readonly splitterService: SplitterService,
        private readonly translate: TranslateService
    ) {
        this.setInitData();
        this.renderer = this.rendererFactory.createRenderer(null, null);
        // setting allocate or assort on app init
        this.route.queryParams.subscribe((params) => {
            if (params['link']) {
                this.updateLink(params.link, params.mode, params.vmode, params.IDStore, params.loadpogID);
            }
        });
    }

    public isItemClickedOnPlanogram : boolean = false;
    public spinnerText: BehaviorSubject<string> = new BehaviorSubject<string>('');
    public updateShoppingCartFromClipboard: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public twoDPanning: Subject<object> = new Subject<object>();
    public editPlanogramTemplate: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public itemSelection: Subject<{ pogObject?: PlanogramObject; view: string; pogObjectArray?: PlanogramObject[] }> = new Subject<{
        pogObject?: PlanogramObject;
        view: string;
        pogObjectArray?: PlanogramObject[];
    }>();
    public changeZoomView: Subject<number> = new Subject<number>();
    public changeInCartItems: Subject<boolean> = new Subject<boolean>();
    public updateHighlight: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public isNavigatedToPogLib: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public sectionStyleSub: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public styleModuleSelect: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public tabChangeEvent: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    public addProductAfterDrag: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public splitterInitializerEvent: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public toggleSideNav: Subject<boolean> = new Subject<boolean>();
    public filterSearch: BehaviorSubject<string> = new BehaviorSubject<string>(``);
    public hidedefaultMenu: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public selectedPogPos: BehaviorSubject<any> = new BehaviorSubject<any>(null);
    public updatePosition: Subject<string> = new Subject<string>();
    // TODO @karthik move to annotation service.
    public updateAnnotationPosition: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public saveAnnotationPosition = new BehaviorSubject<any>(null);
    public updateStandardShelf: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateGrillOnFieldChange: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public propertyGridUpdateData: Subject<boolean> = new Subject<boolean>();
    public workSheetEvent: Subject<WorksheetEventData> = new Subject<WorksheetEventData>();
    public copyPasteSubscription: BehaviorSubject<Position[]> = new BehaviorSubject<Position[]>(null);
    public deleteSubscription: BehaviorSubject<SelectableList[]> = new BehaviorSubject<Position[]>(null);
    public callRenderDividersAgainEvent: boolean = false;
    public renderDividersAgainEvent: Subject<boolean> = new Subject<boolean>();
    public renderSeparatorAgainEvent: Subject<boolean> = new Subject<boolean>();
    public renderPositionAgainEvent: Subject<boolean> = new Subject<boolean>();
    public uprightEvent: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateImageInPOG: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    public itemWSApplyPositionColor: BehaviorSubject<{ gridType: string }> = new BehaviorSubject<{ gridType: string }>(
        null,
    );
    public downloadExportExce: BehaviorSubject<object> = new BehaviorSubject<object>(null);
    public deleteItemFromShoppingCart: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showHighlight: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateCharts: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateNPIGrid: BehaviorSubject<object> = new BehaviorSubject<object>(null);
    public newAnnotationCreated: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public gridReloadSubscription: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public bindGridSubscription: BehaviorSubject<string> = new BehaviorSubject<string>('');
    public updatePosPropertGrid: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateProductsList: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showShoppingCartItem: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public unloadplanogramForWebView: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updatematTab: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showShelfItem: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public selectedDuplicateProducts: BehaviorSubject<Position[]> = new BehaviorSubject<Position[]>(null);
    public openSelectedComponentInSideNav = new BehaviorSubject<object>(null);
    public updateValueInPlanogram: BehaviorSubject<object> = new BehaviorSubject<object>(null);
    public itemScanSubcription: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public turnoNOffSub: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public RemoveSelectedItemsInWS: BehaviorSubject<{ view: string }> = new BehaviorSubject<{ view: string }>(null);
    public toggleDisplayMode: Subject<object> = new Subject<object>();
    public setDefaultSyncPanelViewMode: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public fixtureEdit: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public pegTypeFixtureRefresh: Subject<string> = new Subject<string>();
    public downloadExportExcel: Subject<{ view: string }> = new Subject<{ view: string }>();
    public footerStatusBarUpdate: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public updateFooterNotification = new BehaviorSubject<boolean>(false);
    public updateSearchVisibility: Subject<boolean> = new Subject<boolean>();
    public componentsReferences = Array<ComponentRef<any>>();
    public selectedRowData: { id: string, selectedIdDictionary: Dictionary[] }[] = [];
    public isShelfLoadedChangedEvent: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showFloatingShelves: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showUnLoadedCart: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public showClipBoard: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public floatingShelvesWidthChange: Subject<any> = new Subject<any>();
    public changeInGridHeight: Subject<boolean> = new Subject<boolean>();
    public pegLibPermission: Subject<boolean> = new Subject<boolean>();
    public get isShelfLoaded(): boolean {
        return this.isShelfLoadedChangedEvent.value;
    }
    public set isShelfLoaded(value: boolean) {
        this.isShelfLoadedChangedEvent.next(value);
    }

    public isWorkSpaceActive: boolean = false;
    public onChangeTemplate: boolean = false;
    public isListEdited: boolean = false;
    public badgeVisible: boolean = false;
    public isGridEditing: boolean = false;
    public shelfSyncMode: boolean = true;
    public isListViewSetting: boolean;

    //Added this param for skipping windows beforeunload events;
    public skipUnloadEvent: boolean = false;

    // TODO: @malu remove
    // Values for link can be: iShelf, iAssort, allocate
    public link: string = 'iShelf';
    // TODO: @malu remove
    // mode: possible values: maintenance, manual, iAssortNICI, auto,''
    public mode: string = '';
    // TODO: @malu remove
    // vmode: possible values Assort, ''. This is used as a booolean across the app.
    public vmode: string;

    public blockWatches: boolean = false;
    public objectList: { [key: string]: { [key: string]: ObjectListItem } } = {};
    public mixinList = [];
    public SYSTEM: string = 'system';
    //TODO @karthik replace getActiveSectionId() with the below getter.
    public get activeSectionID(): string {
        return this.activeSectionId;
    }
    private activeSectionId: string = '';
    public activeComponentNumber: number;
    public NewIsSaveDirtyFlag: {[key: string]:boolean} = {};
    public OldIsSaveDirtyFlag: {[key: string]:boolean} = {};
    public rubberBandOn: boolean = false;
    public freeFlowOn: {'panelOne': boolean, 'panelTwo': boolean} = {'panelOne': false, 'panelTwo': false};
    public freeFlowDetails: FreeFlowDetails;
    public labelMode: string = '';
    public isLivePogEditable: boolean = false;
    public splitChangePOGId: number[] = [];
    public triggeredFromAssort: boolean = false;
    public isCartSideView: boolean = true;
    public enableHighlightInWorksheet: boolean = false;
    public isItemScanning: boolean = false;
    public get turnoff_tooltip(): boolean {
        return this.planogramStore.appSettings?.turnoff_tooltip;
    }
    public get turnOn_ShoppingCartToolTip(): boolean {
        const showTooltip = this.planogramStore.appSettings?.turnoff_tooltip ? (this.planogramStore.appSettings?.turnOn_ShoppingCartToolTip ? true : false) : false
        return showTooltip;
    }

    public autoSaveTimerPromise: { [key: string]: any } = {};

    public isSaveAllInProgress: boolean = false;
    public allPogsToSaveInSaveAll: string[] = []; //list of all dirty section ids, used for save all
    public processedPogsInSaveAll: string[] = []; //list of save processed(success/fail) pogs section ids, used for save all
    public asyncSavePogCap: number = 0;
    public isStartedRecording: boolean;
    public storeListByPog: { [key: number]: { "Value": number, "Display": string }[] } = {};
    public sectionId: string = '';
    public get measurementUnit(): 'IMPERIAL' | 'METRIC' {
        return this.planogramStore.appSettings?.measurement;
    }
    public get secWidReducnFixLimit(): number {
        return this.planogramStore.appSettings.secWidReducnFixLimit;
    }
    public selectedIDPOG: number;
    public fixtureTypeMultiple: boolean = false;
    public uidPrefix: string = 'thinSpaceApp';
    public uid: string[] = ['0', '0', '0', '0', '0'];
    public pog_profile_signature_header_settings: {
        IsUDP: boolean;
        ValueSeperator: string;
        Length: number;
    } = {
            IsUDP: false,
            ValueSeperator: '_',
            Length: 0,
        };
    private renderer: Renderer2;

    public splitChangeStatus: { state: boolean; IDPOG: number };

    public allocateAzureKeys: { URL: string; code: string };

    public selectedAnnotation: { sectionID: string } = { sectionID: '' };
    public lastSelectedObjectType: { sectionID: string } = { sectionID: '' };
    public lastSelectedObjectDerivedType: { sectionID: string } = { sectionID: '' };
    public pog_profile_signature_detail_settings: PogProfileSignatureSettings[] = [];

    public PositionCalcFields: { path: string } = { path: '' };
    public FixtureCalcFields: { path: string } = { path: '' };
    public SectionCalcFields: { path: string } = { path: '' };
    public shelfLabelProp: ShelfLabelProp;
    public planogramVMs: { sectionID: string } = { sectionID: '' };
    public objectListByIDPOGObject: { sectionID: { IDPOGObject?: string; IDPOG?: string } } = {
        sectionID: { IDPOGObject: '', IDPOG: '' },
    };
    public Orientation: { options: string } = { options: '' }; //TODO: @Pranay - Looks like redundent param as not assiged anywhere but used in section class
    public selectedID: { sectionID: string[] } = { sectionID: [] };
    public lastSelectedObjCartStatus: { sectionID: boolean } = { sectionID: false };

    public deleteSelectedPos: Position[] = [];
    public ShppingcartItems: Position[] = [];
    public duplicateProducts: Position[] = [];
    public iSHELF: iShelf; // TODO: @malu - check with @Pranay where is this used?

    //TODO : Pranay - Remaining Type Casting
    public updatedpositionsList: any[] = []; //TODO - Here any needs to replace once pog classes are finalized
    public considerOverflowItems: boolean = false;
    public setLookupHolderData: Subject<boolean> = new Subject<boolean>();

    public tooltipDelayTime: number;
    public isStoreDirty: boolean = false;
    public moveOrCopy: boolean = true;

    public positionPegFields: string[] = ['PegWeightCapacity', 'PegOverhang', 'PegSpanCount', 'ProductPegHoleY', 'ProductPegHole1X', 'ProductPegHole2X',
        'HeightSlope', 'BackHooks', 'BackSpacing', 'BackYOffset', 'FrontBars', 'FrontSpacing', 'TagHeight', 'TagWidth', 'TagYOffset', 'TagXOffset',
        'MaxPegWeight', 'PegWeight', 'PegPartID', 'IsPegTag'];

    public setBlockWatch(val: boolean): void {
        this.blockWatches = val;
    }

    public changeSideNav(isOnCompatMode: boolean): void {
        this.toggleSideNav.next(isOnCompatMode);
    }

    public changeSearchedText(text: string): void {
        this.filterSearch.next(text);
    }
    public HideDefaultMenu(val: boolean): void {
        this.hidedefaultMenu.next(val);
    }

    public initializeSplitter(param: boolean): void {
        this.splitterInitializerEvent.next(param);
    }
    public GridValueUpdated(value: boolean): void {
        this.badgeVisible = value;
        this.isGridEditing = value;
    }

    public runFilter<T>(options: T[], searchKey: string): T[] {
        if (searchKey == `` || !options.length) {
            return options;
        }

        // Fields which needs to be ignored from search
        const searchEscapeKeys = new RegExp('PARTITIONKEY|TIMESTAMP|ETAG');
        const getSearcheableKeys = (obj: any) =>
            Object.keys(obj).filter((key) => !searchEscapeKeys.test(key.toLocaleUpperCase()));

        // checks if the value matches the search key
        const matches = (val: string | number) =>
            val &&
            typeof val != 'object' &&
            val
                .toString()
                .replace(/<[^>]*>/g, '')
                .toLocaleLowerCase()
                .indexOf(searchKey.toLocaleLowerCase()) >= 0;

        // checks on the object values and the object children objects values
        return options.filter((obj) => {
            return getSearcheableKeys(obj).some((key) => {
                if (obj[key] && typeof obj[key] === 'object') {
                    return getSearcheableKeys(obj[key]).some((subkey) => matches(obj[key][subkey]));
                }
                return matches(obj[key]);
            });
        });
    }

    public checkIfAssortMode(featureToAllow: string): boolean {
        const AppSettingsSvc = this.planogramStore.appSettings;
        if (!AppSettingsSvc.AssortFeatureNoAllow || !AppSettingsSvc.AllowEditAssort) {
            return this.parentApp.isAssortApp;
        }
        if (this.parentApp.isAssortAppInIAssortNiciMode) {
            return this.parentApp.isNiciMode && featureToAllow
                ? AppSettingsSvc.NICIFeatureNoAllow[featureToAllow]
                : false;
        } else {
            return this.parentApp.isAssortApp
                ? AppSettingsSvc.AllowEditAssort && featureToAllow
                    ? AppSettingsSvc.AssortFeatureNoAllow[featureToAllow]
                    : false
                : false;
        }
    }

    /** If returned true, the feature is disabled. */
    public isNiciFeatureNotAllowed(featureName: string, selectedObjectList?: SelectableList[]): boolean {
        if (!featureName) {
            return false;
        }

        const isNiciMode = this.parentApp.isNiciMode;
        if (!isNiciMode) {
            return false;
        }

        const isNiciNoAllow = this.planogramStore.isNiciFeatureNoAllowed(featureName);
        if (!isNiciNoAllow) {
            return false;
        }

        if (!selectedObjectList?.length) {
            return true;
        }
        if (!Utils.checkIfPosition(selectedObjectList[0])) {
            return true;
        }

        const recFlag = selectedObjectList.some((ele) => ele.Position.attributeObject.RecADRI != 'A');
        return recFlag;
    }

    public getActiveSectionId(): string {
        return this.activeSectionID;
    }
    public setActiveSectionId(sectionID: string): void {
        this.activeSectionId = sectionID;
    }
    public getActiveComponentNumber(): number {
        return Number(this.activeComponentNumber);
    }

    public setActiveComponentNumber(num: number): void {
        this.activeComponentNumber = num;
    }
    private setInitData(): void {
        this.iSHELF = {
            ...this.iSHELF,
            IDBcount: 0,
            FetchreportDesignerTemplate: true,
            fetchStoreHierarchy: true,
        };
        this.iSHELF.settings = {
            ...this.iSHELF.settings,
            isReady_planogramSetting: 0,
            isReady_lookup: 0,
            isReady_propertyGrid: 0,
            isReady_itemWorksheet: 0,
            isReady_fixtureWorksheet: 0,
            isReady_worksheetColumnConfig: 0,
            isReady_template_positionWorksheetSettings: 0,
            isReady_inventoryWorksheet: 0,
            isReady_inventorySettingWorksheet: 0,
            isReady_pogQualifier: 0,
            isReady_allSettings: 0,
        };

        this.iSHELF.showDirective = {
            discussionThread: 0,
            panelID: 'panelOne',
            clipboard: false,
        };
        this.asyncSavePogCap = 0;
    }

    public getModularsCount(obj: Section): number {
        const modulars = this.getAllModulars(obj);
        return modulars.length;
    }

    //Get all modulars in the section
    public getAllModulars(obj: Section): Modular[] {
        const modulars = obj.Children.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.MODULAR);
        return modulars as Modular[];
    }

    public getAllPositionFromObjectList(sectionID: string): Position[] {
        return Object.values(this.objectList[sectionID]).filter(
            (it: { ObjectDerivedType: string }) => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT,
        ) as Position[];
    }

    public nextUid(): string {
        let index = this.uid.length;
        let digit;

        while (index) {
            index--;
            digit = this.uid[index].charCodeAt(0);
            if (digit == 57 /*'9'*/) {
                this.uid[index] = 'A';
                return this.uidPrefix + this.uid.join('');
            }
            if (digit == 90 /*'Z'*/) {
                this.uid[index] = '0';
            } else {
                this.uid[index] = String.fromCharCode(digit + 1);
                return this.uidPrefix + this.uid.join('');
            }
        }
        this.uid.unshift('0');
        return this.uidPrefix + this.uid.join('');
    }

    // TODO: @malu remove - the class additions based on app should be in ThemeService
    public updateLink(link: string, mode: string, vmode: string, idstore: number, loadpogID: number): void {
        this.link = link;
        this.mode = mode ? mode : '';
        this.vmode = vmode ? vmode : '';
        if (link == 'allocate') {
            this.renderer.addClass(document.body, 'allocate');
        } else if (link == 'iAssort') {
            this.renderer.addClass(document.body, 'iAssort');
            if (mode == 'iAssortNICI') {
                this.renderer.addClass(document.body, 'iAssortNICI');
            } else {
                this.themeService.setTheme('assort');
            }
        }
    }

    public isBlockWatch(): boolean {
        return this.blockWatches;
    }
    public getSelectedIDPOG(): number {
        return this.selectedIDPOG;
    }
    public setSelectedIDPOG(IdPog: number): void {
        this.selectedIDPOG = IdPog;
    }
    public cleanBySectionId(sectionID: string): void {
        delete this.objectList[sectionID];
        delete this.objectListByIDPOGObject[sectionID];
    }

    public getSerachView(): string {
        const value = this.localStorage.getValue(LocalStorageKeys.POG_SEARCH_VIEW);
        if (value) { return value; }
        this.setSerachView('ps');
        return 'ps';
    }
    public setSerachView(view: string): void {
        this.localStorage.setValue(LocalStorageKeys.POG_SEARCH_VIEW, view);
    }

    public mouseoverDockToolbar(mouseover: boolean, isCallFromSetting?: boolean): void {
        if (mouseover) {
            isCallFromSetting = true;
            const header = document.querySelector('srp-header mat-toolbar.docktool-header') as HTMLElement;
            if (header) {
                header.style.top = '0px';
            }

            const footer = document.querySelector('srp-footer .footer') as HTMLElement;
            if (footer) {
                footer.style.bottom = '0';
            }

            const sappPanelHeader = document.querySelector(
                '.sapp-panel .sapp-panel-container .panel-panelOne .sapp-panel-header',
            ) as HTMLElement;
            if (sappPanelHeader) {
                this.togglePanelHeader(sappPanelHeader, mouseover);
            }

            const sappPanelTwoHeader = document.querySelector(
                '.sapp-panel .sapp-panel-container .panel-panelTwo .sapp-panel-header',
            ) as HTMLElement;
            if (sappPanelTwoHeader) {
                this.togglePanelHeader(sappPanelTwoHeader, mouseover);
            }

            this.showHidePanelHeader(mouseover);

            const plibMain = document.querySelector('shelf-planogram-library .plib-main') as HTMLElement;
            if (plibMain) {
                plibMain.style.top = '52px';
                plibMain.style.height = 'calc(100% - 94px)';
                if (isCallFromSetting) {
                    plibMain.style.left = '0';
                    plibMain.style.width = '96.5%';
                }
            }

            const mySidepanel = document.querySelector('srp-sidebar #mySidepanel') as HTMLElement;
            if (mySidepanel) {
                mySidepanel.style.top = '52px';
                mySidepanel.style.height = 'calc(100vh - 90px)';
                if (isCallFromSetting) {
                    mySidepanel.style.left = '0';
                }
            }
            const dockToolbar = document.querySelector('app-shelf-planogram #panelResize.doc-toolbar') as HTMLElement;
            if (dockToolbar) {
                dockToolbar.style.top = '57px';
                if (isCallFromSetting) {
                    dockToolbar.style.left = 'revert';
                    dockToolbar.style.width = '96%';
                } else {
                    dockToolbar.style.left = '5px';
                    dockToolbar.style.width = '99%';
                }
            }
            const kendoGridPlanogramsLib = document.querySelector(
                'shelf-planogram-library #plibID #pogScenario-grid') as HTMLElement;
            if (kendoGridPlanogramsLib) {
                kendoGridPlanogramsLib.style.height = 'calc(100vh - 141px)';
            }

            const kendoSplitter = document.querySelector('div#panelResize kendo-splitter') as HTMLElement;
            if (kendoSplitter) {
                kendoSplitter.style.height = 'calc(100vh - 102px)';
            }

            this.adjustSplitterPane('splitterpane-panelOne', mouseover);

            this.adjustSplitterPane('splitterpane-panelTwo', mouseover);

            this.togglePanelBody('panelOne', mouseover);

            this.togglePanelBody('panelTwo', mouseover);

            const reportTemplatebody = document.querySelector('.reportTemplatebody') as HTMLElement;
            if (reportTemplatebody) {
                reportTemplatebody.style.top = '56px';
                reportTemplatebody.style.height = 'calc(100% - 102px)';
                if (isCallFromSetting) {
                    reportTemplatebody.style.left = 'revert';
                    reportTemplatebody.style.width = '95.3%';
                } else {
                    reportTemplatebody.style.left = '0';
                    reportTemplatebody.style.width = '100%';
                }
            }
        } else {
            const header = document.querySelector('srp-header mat-toolbar.docktool-header') as HTMLElement;
            if (header) {
                header.style.top = '-47px';
            }

            const footer = document.querySelector('srp-footer div.footer') as HTMLElement;
            const heightToDecrease = this.planogramStore.appSettings.dockStatusbar ? 0 : 32;
            if (footer) {
                if (this.planogramStore.appSettings.dockStatusbar) {
                    footer.style.bottom = '0';
                } else {
                    footer.style.bottom = '-32px';
                }
            }

            this.showHidePanelHeader(mouseover);

            const sappPanelHeader = document.querySelector(
                '.sapp-panel .sapp-panel-container .panel-panelOne .sapp-panel-header',
            ) as HTMLElement;
            if (sappPanelHeader) {
                this.togglePanelHeader(sappPanelHeader, mouseover);
            }

            const sappPanelTwoHeader = document.querySelector(
                '.sapp-panel .sapp-panel-container .panel-panelTwo .sapp-panel-header',
            ) as HTMLElement;
            if (sappPanelTwoHeader) {
                this.togglePanelHeader(sappPanelTwoHeader, mouseover);
            }

            const plibMain = document.querySelector('shelf-planogram-library .plib-main') as HTMLElement;
            if (plibMain) {
                plibMain.style.top = '5px';
                plibMain.style.height = `calc(100% - ${45 - heightToDecrease}px)`;
                if (!isCallFromSetting) {
                    plibMain.style.left = '-52px';
                    plibMain.style.width = '100%';
                }
            }

            const mySidepanel = document.querySelector('srp-sidebar #mySidepanel') as HTMLElement;
            if (mySidepanel) {
                mySidepanel.style.top = '5px';
                mySidepanel.style.height = `calc(100vh - ${45 - heightToDecrease}px)`;
                if (!isCallFromSetting) {
                    if (document.getElementById(`mySidepanel`).classList.contains(`expanded`)) {
                        this.changeSideNav(true);
                        mySidepanel.style.left = '-105%';
                    } else {
                        mySidepanel.style.left = '-105%';
                    }
                }
            }

            const dockToolbar = document.querySelector('app-shelf-planogram #panelResize.doc-toolbar') as HTMLElement;
            if (dockToolbar) {
                dockToolbar.style.top = '9px';
                dockToolbar.style.width = '99%';
                dockToolbar.style.left = isCallFromSetting ? '0' : '5px';
            }

            const kendoGridPlanogramsLib = document.querySelector(
                'shelf-planogram-library #plibID #pogScenario-grid') as HTMLElement;
            if (kendoGridPlanogramsLib) {
                kendoGridPlanogramsLib.style.height =
                    isCallFromSetting
                        ? `calc(100vh - ${59 - heightToDecrease}px)`
                        : `calc(100vh - ${90 - heightToDecrease}px)`;
            }

            const kendoSplitter = document.querySelector('div#panelResize kendo-splitter') as HTMLElement;
            if (kendoSplitter) {
                kendoSplitter.style.height = `calc(100vh - ${55 - heightToDecrease}px)`;
            }

            this.adjustSplitterPane('splitterpane-panelOne', mouseover);

            this.adjustSplitterPane('splitterpane-panelTwo', mouseover);

            this.togglePanelBody('panelOne', mouseover, heightToDecrease);

            this.togglePanelBody('panelTwo', mouseover, heightToDecrease);

            const reportTemplatebody = document.querySelector('.reportTemplatebody') as HTMLElement;
            if (reportTemplatebody) {
                reportTemplatebody.style.top = '9px';
                reportTemplatebody.style.height = `calc(100% - ${53 - heightToDecrease}px)`;
                reportTemplatebody.style.left = '0';
                reportTemplatebody.style.width = '100%';
            }
        }
    }

    private togglePanelHeader(panelHeader: HTMLElement, mouseover: boolean): void {
        if (mouseover) {
            panelHeader.style.opacity = '1';
            panelHeader.style.top = '44px';
        } else {
            panelHeader.style.opacity = '0';
            panelHeader.style.top = '0px';
        }
    }

    private togglePanelBody(id: string, mouseover: boolean, heightToDecrease?: number): void {
        if (mouseover) {
            const sappPanelOneBody = document.querySelector('#' + id +
                ' #bodyPanel',
            ) as HTMLElement;
            if (sappPanelOneBody) {
                sappPanelOneBody.style.top = '45px';
            }
            const sappPanelOneBodyForWorksheet = document.querySelector('#' + id +
                ' #bodyPanel shelf-ag-grid ag-grid-angular',
            ) as HTMLElement;

            if (sappPanelOneBodyForWorksheet && this.splitterService.splitterView !== PanelSplitterViewType.OverUnder) {
                sappPanelOneBody.style.height = `calc(100vh - 145px)`;
                sappPanelOneBodyForWorksheet.style.height = `calc(100vh - 145px)`;

            }
        } else {
            const sappPanelOneBody = document.querySelector('#' + id +
                ' #bodyPanel',
            ) as HTMLElement;
            if (sappPanelOneBody) {
                sappPanelOneBody.style.top = '0px';
                sappPanelOneBody.style.height = '';
            }

            const sappPanelOneBodyForWorksheet = document.querySelector('#' + id +
                ' #bodyPanel shelf-ag-grid ag-grid-angular',
            ) as HTMLElement;
            if (sappPanelOneBodyForWorksheet && this.splitterService.splitterView !== PanelSplitterViewType.OverUnder) {
                sappPanelOneBody.style.height = `calc(100vh - ${55 - heightToDecrease}px)`
                sappPanelOneBodyForWorksheet.style.height = `calc(100vh - ${55 - heightToDecrease}px)`
            }
        }
    }

    private adjustSplitterPane(id: string, mouseover: boolean): void {
        if (mouseover) {
            const kendoSplitterLeftPane = document.getElementById(id) as HTMLElement;
            if (kendoSplitterLeftPane) {
                kendoSplitterLeftPane.style.height = 'calc(100vh - 102px)';
            }
        } else {
            const kendoSplitterLeftPane = document.getElementById(id) as HTMLElement;
            if (kendoSplitterLeftPane) {
                kendoSplitterLeftPane.style.height = 'auto';
            }
        }
    }

    private hidePanelHeader(panelHeader: HTMLElement, mouseover: boolean): void {
        if (mouseover) {
            panelHeader.style.display = 'block';
        } else {
            panelHeader.style.display = 'none';
        }
    }

    private showHidePanelHeader(mouseover: boolean): void {
        const sappToolBarPanelOne = document.querySelector(
            'shelf-panel-header .panel-panelOne .sapp-panel-header',
        ) as HTMLElement;
        if (sappToolBarPanelOne) {
            this.hidePanelHeader(sappToolBarPanelOne, mouseover);
        }
        const sappToolBarPanelTwo = document.querySelector(
            'shelf-panel-header .panel-panelTwo .sapp-panel-header',
        ) as HTMLElement;
        if (sappToolBarPanelTwo) {
            this.hidePanelHeader(sappToolBarPanelTwo, mouseover);
        }
    }

    public selectedObject(data: SelectableList): void {
        this.selectedPogPos.next(data);
    }

    public getObjectFromIDPOG(IDPOG: number): POGLibraryListItem {
        const mapper: POGLibraryListItem[] = ([] = this.planogramStore.mappers);
        for (let i = 0; i < mapper.length; i++) {
            const obj: POGLibraryListItem = mapper[i];
            if (obj.IDPOG === IDPOG) {
                return obj;
            }
        }
        return;
    }

    public getObject(id: string, sectionID: string): ObjectListItem {
        return this.objectList[sectionID] ? this.objectList[sectionID][id] : null;
    }

    public getObjectField(
        $id: string,
        fieldHierarchyStr: string,
        sectionID: string,
        itemObject?: ObjectListItem,
    ): string | number | boolean | Date {
        itemObject = itemObject || this.getObject($id, sectionID);
        try {
            const fieldHierarchyArr: string[] = fieldHierarchyStr?.split('.');
            let returnVal;
            switch (fieldHierarchyArr?.length) {
                case 1:
                    returnVal = itemObject[fieldHierarchyArr[0]];
                    break;
                case 2:
                    returnVal = itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]];
                    break;
                case 3:
                    returnVal = itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]];
                    break;
                case 4:
                    returnVal =
                        itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][
                        fieldHierarchyArr[3]
                        ];
                    break;
                case 5:
                    returnVal =
                        itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][
                        fieldHierarchyArr[3]
                        ][fieldHierarchyArr[4]];
                    break;
                case 6:
                    returnVal =
                        itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][
                        fieldHierarchyArr[3]
                        ][fieldHierarchyArr[4]][fieldHierarchyArr[5]];
                    break;
            }
            return returnVal;
        } catch (err) {
            return '';
        }
    }

    public getPositionLockField(
        fieldHierarchyStr: string,
        itemObject?: Position,
    ): PositionFieldLock {
        let obj: unknown = this.getObjectField(undefined, fieldHierarchyStr, undefined, itemObject);
        return obj as PositionFieldLock;
    }

    public setObjectField(
        $id: string,
        fieldHierarchyStr: string,
        value: any,
        sectionID: string,
        itemObject?: any,
    ): ObjectListItem {
        sectionID = sectionID ? sectionID : itemObject.$sectionID;
        itemObject = itemObject ? itemObject : this.getObject($id, sectionID);
        const fieldHierarchyArr: string[] = fieldHierarchyStr ? fieldHierarchyStr.split('.') : [];
        switch (fieldHierarchyArr.length) {
            case 1:
                if (fieldHierarchyArr[0] == '_IsSpanAcrossShelf') {
                    itemObject[fieldHierarchyArr[0]]['FlagData'] = value;
                } else {
                    itemObject[fieldHierarchyArr[0]] = value;
                }
                break;
            case 2:
                itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]] = value;
                break;
            case 3:
                itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]] = value;
                break;
            case 4:
                itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][fieldHierarchyArr[3]] =
                    value;
                break;
            case 5:
                itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][fieldHierarchyArr[3]][
                    fieldHierarchyArr[4]
                ] = value;
                break;
            case 6:
                itemObject[fieldHierarchyArr[0]][fieldHierarchyArr[1]][fieldHierarchyArr[2]][fieldHierarchyArr[3]][
                    fieldHierarchyArr[4]
                ][fieldHierarchyArr[5]] = value;
                break;
        }
        return itemObject;
    }

    public getLastSelectedParentDerievedType(sectionID: string): any {
        if (isUndefined(sectionID)) {
            sectionID = this.activeSectionID;
        }
        if (isUndefined(this.selectedID[sectionID])) {
            return false;
        }
        if (this.selectedID[sectionID].length > 0) {
            const lastObjPushed = this.getObject(
                this.selectedID[sectionID][this.selectedID[sectionID].length - 1],
                sectionID,
            );
            //no parent for section
            if (lastObjPushed && lastObjPushed.ObjectDerivedType != AppConstantSpace.SECTIONOBJ) {
                const parentObj = this.getParentObject(lastObjPushed, sectionID);
                if (parentObj != undefined) {
                    return parentObj.ObjectDerivedType;
                }
            }
        }
        return false;
    }

    public getSelectedId(sectionID: string): string[] {
        if (isUndefined(sectionID)) {
            sectionID = this.activeSectionID;
        }

        if (isUndefined(this.selectedID[sectionID])) {
            this.selectedID[sectionID] = [];
        }

        return this.selectedID[sectionID];
    }

    public getParentObject(obj: any, sectionID?: string): any {
        sectionID = sectionID ? sectionID : obj.$sectionID;
        return this.objectList[sectionID][obj.$idParent]; //  sectionID
    }

    public getParentObjectAs<T extends ObjectListItem>(
        obj: { $idParent: string; $sectionID: string },
        sectionID?: any,
    ): T {
        sectionID = sectionID ? sectionID : obj.$sectionID;
        return this.objectList[sectionID][obj.$idParent] as T; //  sectionID
    }

    public getObjectAs<T extends ObjectListItem>(id: string, sectionID: string): T {
        return (this.objectList[sectionID] ? this.objectList[sectionID][id] : null) as T;
    }

    public getAllPositionFromSection(sectionID: string): Position[] {
        return Object.values(this.objectList[sectionID])
            .filter((it: ObjectListItem) => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)
            .filter(
                (it: Position) => !Utils.checkIfShoppingCart(this.getParentObject(it, it.$sectionID)),
            ) as Position[];
    }

    public getObjectByIDPOGObject(IDPOGObject: number | String, sectionID: string): ObjectListItem {
        // Get based on server Id.
        return this.objectListByIDPOGObject[sectionID][IDPOGObject];
    }

    // Note : data can have any kind of object so can not apply any specific interface type
    public evaluateExpression(expression: string, data: any): string {
        return expression.replace(/{{(.*?)}}/g, (_, match) => {
            const field = match.trim().split('..');
            let value = this.getObjectField(undefined, field[0], undefined, data);
            // Evaluate functions like .toFixed()
            if (field.length > 1 && match.includes('..') && !Utils.isNullOrEmpty(value)) {
                value = eval('value.' + field[1]);
            }
            return !Utils.isNullOrEmpty(value) ? value as string : '';
        });
    }

    public scrollToNext(elementID): void {
        let selectedElement = document.getElementById(elementID);
        selectedElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    public getPositionDetailMessage(position: Position): string {
      let message = '';
      const parentItemData = this.getParentObject(position, position.$sectionID);
      const bayObj = this.getParentObject(parentItemData, position.$sectionID);
      let bayMsg = '';
      if (bayObj.Fixture != undefined && bayObj.ObjectDerivedType == AppConstantSpace.MODULAR) {
        bayMsg += ' - ' + this.translate.instant('BAY_NO') + bayObj.Fixture.FixtureNumber + ', ';
      }
      message = bayMsg +
        parentItemData.ObjectDerivedType +
        '#: ' +
        parentItemData.Fixture.FixtureNumber +
        ', ' +
        this.translate.instant('FOOTER_POS_NO') +
        position.Position.PositionNo +
        ', ' +
        this.translate.instant('FOOTER_UPC') +
        position.Position.Product.UPC;
      return message;
    }
}
