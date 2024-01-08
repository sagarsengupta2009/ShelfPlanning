import { GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { PlanogramView } from '../enums/planogram-view-enums';

// TODO: @malu move to config folder
export interface ApplicationResources {
    grid: ApplicationGridList;
    lables: LabelArray;
    menu: ApplicationMenu[];
}

export interface LabelArray {
    [key: string]: string;
}

export interface ApplicationGridList {
    appendSection_grid: GridColumnSettings[];
    attachment_Grid: GridColumnSettings[];
    BATCH_PRINT_GRID: GridColumnSettings[];
    'br-DashBoardGrid': GridColumnSettings[];
    feedback_Grid: GridColumnSettings[];
    importPogGrid: GridColumnSettings[];
    'info-Grid': GridColumnSettings[];
    invalidImportProductGrid: GridColumnSettings[];
    inventorynonNPIGrid: GridColumnSettings[];
    inventoryNPIGrid: GridColumnSettings[];
    planogram_Performance_Worksheet: GridColumnSettings[];
    POG_EXPORT_GRID: GridColumnSettings[];
    'pogHierarchy-details': GridColumnSettings[];
    'POG-Scenario-Grid': GridColumnSettings[];
    'pogScenario-grid': GridColumnSettings[];
    pogSearch_Grid: GridColumnSettings[];
    promoteDemoteGrid: GridColumnSettings[];
    reportGrid: GridColumnSettings[];
    SHELF_FIXTURE_WORKSHEET: GridColumnSettings[];
    SHELF_INVENTORY_WORKSHEET: GridColumnSettings[];
    SHELF_ITEM_WORKSHEET: GridColumnSettings[];
    SHELF_POSITION_WORKSHEET: GridColumnSettings[];
    shelf_prod_search_details: GridColumnSettings[];
    shelf_store_assign_grid_details: GridColumnSettings[];
    shelf_store_screen_details: GridColumnSettings[];
    'Shelf-Scenario-Grid': GridColumnSettings[];
    'Sync-Pog-Grid': GridColumnSettings[];
    'Sync-Pog-Status-Grid': GridColumnSettings[];
    'Sync-With-Anchor-Grid': GridColumnSettings[];
    validImportProductGrid: GridColumnSettings[];
    ValidPogListGrid: GridColumnSettings[];
}

export interface ApplicationMenu {
    controlName: ScreenMenus[];
    screenName: string;
}

export interface ScreenMenus {
    maxItemsToDisplay: number;
    menus: MenuItem[];
    name: string;
}
export interface MenuItemSummary {
    icon: string;
    text: string;
    key?: string;
}
export interface MenuItem extends MenuItemSummary {
    authorization: string[];
    canHide: boolean;
    childMenus: MenuItem[];
    description: string;
    key: string;
    menuId: number;
    order: number;
    parentMenuId: number;
    projectType: string[];
    status: string[];
    template: string;
}

export interface HeaderMenu {
    [exportoptions: string]: any; // this is a dynamic list where, the values can be of any type.
    planoviewer?: boolean;
    hideForPAssort?: boolean;
    view?: boolean;
    componentID?: PlanogramView;
    isActivePanel?: boolean;
    feedbackPermission?: boolean;
    postMsgPermission?: boolean;
    NPIPermission?: boolean;
    isSearchFocus?: boolean;
    displayedPlanogramsOnSearch?: boolean;
    showHierarchyIcon?: boolean;
    pinned?: number;
    failedPogCount?: boolean;
    ischecked?: boolean;
    isLoaded?: boolean;
    selectedPogs?: any;
    poghierarchy?: any;
    multipleClone?: boolean;
    syncDisabled?: boolean;
    ispogCountOne?: boolean;
}
export interface styleCss {
    'pointer-events': string;
    color: string;
}
export interface CustomMenuClick {
    data: MenuItem;
    event?: Event;
}
export interface HeaderBgColor {
    'background-color'?: string;
    display?: string;
}
export interface IsVisibleMode {
    'min-width': string;
    width?: string;
}
export interface UpdatePOGInfo {
    isPogDownloaded: boolean;
    pogInfo: object;
    displayView: string;
}
export interface CustomMenuClickEventPayload {
    data: MenuItem;
    event: Event;
}
export interface HeaderBgColor {
    'background-color'?: string;
    display?: string;
}
export interface IsVisibleMode {
    'min-width': string;
    width?: string;
}
export interface UpdatePOGInfo {
    isPogDownloaded: boolean;
    pogInfo: object;
    displayView: string;
}
export interface IsVisibleMode {
    'min-width': string;
    width?: string;
}
