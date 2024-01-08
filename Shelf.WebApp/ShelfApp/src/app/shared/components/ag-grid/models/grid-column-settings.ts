import { ColDef } from "ag-grid-community";

export interface GridColumnSettings {
    0: string;
    1: string;
    2: number;
    3: boolean;
    4: boolean;
    5: boolean;
    6: boolean;
    7: number;
    8: number;
    9: boolean;
    10: string;
    11: string;
    12: string;
    13: string;
    14: string;
    15: string;
    16: number;
    17: number;
    18: number;
    ColumnMenu: boolean;
    FilterTemplate?: string;
    IsMandatory?: boolean;
    ProjectType?: string;
    SkipTemplateForExport?: boolean;
    SortByTemplate?: boolean;
    Template?: string;

    // Note: Below fields only use for pivot type grid
    isPivotGrid?: boolean;
    enablePivot?: boolean;
    enableRowGroup?: boolean;
    pivot?: boolean;
    enableValue?: boolean;
    aggFunc?: string;
}

export interface GridColumnCustomConfig {
    customCol?: GridColumnSettings[];
    dateFormat?: string;
    timeFormat?: string;
    dateSettings?: { minDate?: Date, maxDate?: Date };
    headerParams?: { field: string, headerType: string, data: any }[];
    columnFilters?: { field: string; filterDetails: any }[];
    isLookUpDataNeeded?: boolean;
    lookUpDataGetterFunc?: LookUpDataGetterFunc;
    dynamicDropdown?: { field: string[], value: boolean[], fillUpDownIsDynamic?: boolean[] };
    isServerSideGrid?: boolean;
    editableCallbacks?: { isEditableCallbackRequired?: boolean, fieldsToValidateForCallback?: string[], editableCallbackTemplate?: string, }[];
    isImageColEditable?: { fields: string[] };
    imageValidation?: { field: string, supportedFileType: string[], maxFileSizeInKB?: number, supportedFileTypeErrMsg?: string, maxFileSizeErrMsg?: string };
    dirtyCheckCol?: { field: string }
}

export interface LookUpDataGetterFunc {
    (id: number): boolean | string;
}
