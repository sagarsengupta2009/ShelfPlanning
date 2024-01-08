import {
    ApplicationSettings, HighlightTemplate, LookUpOptions,
    LookUpType, PlanogramType, POGResources
} from '.';
import { Section } from '../classes';
import { SectionResponse } from './planogram-transaction-api';
import { Dictionary } from './sa-dashboard';
import { IApiResponse } from './apiResponseMapper';

export interface PinnedActive {
    pinned: boolean;
    isActive: boolean;
    pos?:string;
}

export interface DownloadedPog {
    IDPOG: number;
    isCreated?: boolean;
    sectionObject?: Section | IApiResponse<SectionResponse>;
    sectionID?: string;
    itemWS?: string;
}

export interface SplitterViewMode {
    displayMode: number;
    syncMode: boolean;
}

export interface LockUpHolder {
    CrunchMode: LookUpOptions;
    PlanogramVersion: LookUpOptions;
    POGType: { options: PlanogramType[] };
    FIXTURE_UPRIGHTS_DIRECTION: LookUpOptions;
    DividerType: LookUpOptions;
    GrillPlacement: LookUpOptions;
    SVG_RENDRING_MODE: LookUpOptions;
    PogReportPrintOption: LookUpOptions;
    PRINT_ORIENTATION: LookUpOptions;
    PACKAGESTYLE: LookUpOptions;
}

export interface StatusBarConfig {
    pog: Dictionary[];
    position: Dictionary[];
    fixture: Dictionary[];
}
export interface AnchorSettings {
    sappHighlightTool: PinnedActive;
    sappPropertyGridDialog: PinnedActive;
    sappShoppingCartDialog: PinnedActive;
    sappProductsSearchListDialog: PinnedActive;
    sappCharts: PinnedActive;
}

export interface StoreAppSettings {
    analysisCharts: {};
    showDynamicChart: boolean;
    StoreTF: {};
    maxPOGHierarchyNodes: number;
    readOnlyfieldsInAssort: number[];
    libPogMoreDetails: POGResources;
    userProfile: { EmailId: string };
    default_pog_type: number;
    vertical_spacing: number;
    AssortFeatureNoAllow: boolean;
    AllowEditAssort: boolean;
    NICIFeatureNoAllow: NiciFeatureFlags;
    turnOnPegItemLabels: string;
    newproductintro: {
        SelectedValue: {
            value: boolean;
        };
    };
    peg_direction: number;
    horizontal_spacing: number;
    dockStatusbar: boolean;
    shelfLabelProp: {};
    statusBarConfig: StatusBarConfig;
    isStatusBarCustom: boolean;
    logServiceLimit: number;
    computeTagetInventoryValues: boolean;
    secWidReducnFixLimit: number;
    skipStoreViewPreview: boolean;
    PogExportOptions: PogExportOptions;
    POG_CLASSIFIER_LOOKUP: PogClassifierLookupItem[];
    FIXTURE_TYPE_LOOKUP: FixtureTypeLookupItem[];
    FIXTURE_TYPE_SUPPLEMENTS_LOOKUP: PropertyLookupItem[];
    SECTION_CONFIGURATION_LOOKUP: PropertyLookupItem[];
    localStorageIsEnable: boolean;
    loadPogFromChild: boolean;
    highlightSysTemplate: HighlightTemplate[];
    highLightOpts: LookUpType[];
    highLightOptPogTemplete: string;
    highlightUsrTemplate: HighlightTemplate[];
    SHELFAUTOLOADPOG: string;
    overhanging_items_beyond_edge: boolean;
    FITCHECKTOLERANCE: number;
    isReadOnly: boolean;
    disableDeletedScItem: boolean;
    isLogAllocations: boolean;
    daysInMovement: number;
    autoSavePromptFlag: boolean;
    autoSaveEnableFlag: boolean;
    saveEnableFlag: boolean;
    pog_profile_applicable: boolean;
    asyncSaveToogleFlag: boolean;
    asyncSavePogCap: number;
    manualPerfTemplate: {}[];
    maxPogCount: number;
    pogTabExpression: string;
    autocalc: boolean;
    // TODO: @malu What is the type?
    // type is number (dictionary id) configSettings()
    // Later replaced with string '_CalcField.Position.IsPositionLocked'
    // Except in dictionary-function.service.ts it is used as a string
    positionLockField: string;
    ProductAuthPattern: string;
    CONSIDER_DISPLAY_VIEW_ONLY: boolean;
    showLabelIfNoPackageImage: string;
    fixtCallOutOff: boolean;
    posCallOutOff: boolean;
    pegHelperURL: string;
    defaultViewMode: number; // TODO: @malu this should be an enum;
    isAppOnline: boolean;
    dockToolbar: boolean;
    shelfLabelOn: boolean;
    Anchor_settings: AnchorSettings;
    allSettingsObj: ApplicationSettings;
    worksheetGridSettings: {
        positionColumns: {}[];
    };
    findSelectAdv: boolean;
    useWillChange: boolean;
    autoSaveTimer: number;
    turnoff_tooltip: boolean;
    isProjectProductSearchEnable: boolean;
    roundoff: string;
    backColor: string;
    measurement: 'IMPERIAL' | 'METRIC';
    propertygrid_default_view: number;
    canValidatePeggable?: boolean;
    defaultUnitCappingForAdvancedTray: number;
    isWeightCapacityValidationEnable:boolean;
    allowPegPartID?: boolean;
    notchThicknessCalculation: {
        includeCrossbarHeight: boolean,
        includeStandardShelfThickness: boolean,
        includeFixtureHeight: boolean
    };
    turnOn_ShoppingCartToolTip: boolean;
    StandardShelfPositionMovement: number;
    CoffinPositionMovement: number;
    renamePlanogramAllowed: string;
    DisplayUnitsForTrayAndCase: boolean;
    CutCaseMarginOfError: number;
    DisplayGapForExtraSpaceInTrayAndCase: boolean;
}

/** This is a dynamic list based on the client. */
export interface NiciFeatureFlags {
    [key: string]: boolean;
}

export interface PogExportOptions {
    XML: boolean;
    XMZ: boolean;
    PLN: boolean;
    PSA: boolean;
}

// TODO: Is this a diplicate of PropertyStoreList
export interface PropertyLookupItem {
    Display: string;
    Value: string;
    Default?: boolean;
}

export class PogClassifierLookupItem {
    Display: string;
    Value: number;
    Default?: boolean;

    constructor(data: PropertyLookupItem) {
        this.Display = data.Display;
        this.Value = +data.Value;
        this.Default = data.Default;
    }
}

export interface FixtureTypeLookupItem extends PropertyLookupItem {
    Options: { HasDoors: boolean; };
}
