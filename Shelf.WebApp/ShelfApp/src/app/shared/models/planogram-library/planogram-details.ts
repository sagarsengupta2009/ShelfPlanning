import { Planograms } from "../sa-dashboard";

export interface POGLibraryListItem extends Planograms{// TODO: @salma to remove this comment

    IsLoaded: string;
    PermissionCreate?: boolean;
    PermissionRead?: boolean;
    editable?: boolean;
    globalUniqueID?: string;
    isCheckInOutEnable?: boolean;
    isCheckedOut?: boolean;
    isPinned?: boolean
    isSelected?: boolean;
    version?: number;
    RunOn?: string;
    isnew?: boolean;
    PogVersion?: string;
    displayVersion?: string;
    isSaveDirtyFlag?: boolean;
    isPOGReadOnly?: boolean;
    isObsolete?: boolean;
    mode?: string;
    scenarioID?: number;
    requestStatus?: number;
    sectionID:string
    pogID?: number;
    ruleSetId?: number;
    azureBlobToken?: string;
    pogType?: string;
    checkedoutManually?: boolean; // Not from API. hence added here to support bindWatchForCheckout method of PanalSectionComponent
    EffectiveTo: string;
    completed?:boolean;
    // PA specifc keys
    pogClassificationType?: string;
    rowKey?:string;
    cached?: boolean; // Added to support data from PA
    syncPog?: string;
    pinned?:boolean;
    svgSaved? : boolean // used in PA to check if svg was already saved to trigger when opening reports.
    corpId?: number; // PA specific.
    pogCount?: number;  // PA specific.
}

export interface PogScenarioDetails {
  Planograms: POGLibraryListItem[];
  ProjectName: string;
  Remarks: string;
  ScenarioName: string;
  StartDate:string;
  Status: number;
  StatusDesc: string;
}

export interface PogLoadCounts {
   maxPogCount: number;
   loadedCount: number;
   canDownload: boolean;
}

export interface PogInfoPosition {
  top: string;
  left: string;
} 

