export interface DisplayInfo {
    annotationOn: boolean;
    annotationView: number;
    customSheetSelection: string;
    grillView: boolean;
    modularView: boolean;
    shwShelfsItms: boolean;
    shwShpgCartItems: boolean;
    view: number;
    zoom: number;
    itemScanning: boolean;
}

export interface WorkSheetGridSettings {
    customColoumnConfig: { templatePositionColumns: {}[] };
}

export interface PositionWkSheetShelfModeObject {
    guid: string;
    showShelf: boolean;
    showCart: boolean;
}
