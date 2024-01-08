import { PlanogramView } from "../enums/planogram-view-enums";

export interface IPanelInfo {
    sectionID: string;
    IDPOG?: number,
    view: string,
    componentID: number;
    globalUniqueID: string;
    scope: string;
    flag: boolean,
    isLoaded: boolean,
    index:number,
    selectedViewKey: string, 
    previousView: string
}

export interface IPanelPointers {
    panelOne: IPanelInfo;
    panelTwo: IPanelInfo
}
