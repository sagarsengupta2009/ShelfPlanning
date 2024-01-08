import { Planograms } from './sa-dashboard';

export interface ReportList {
    DisplayOrder: number;
    Group: string;
    IDReportTemplate: number;
    Id: number;
    IsCombinedReport: boolean;
    IsComparisonReport: boolean;
    IsPogImage: boolean;
    IsSvgConfig: boolean;
    Name: string;
    ParameterGroupName: string;
    ReportCode: string;
    ReportMode: string;
    Type: string;
}

export interface ReportData {
    TimeSpan: string;
    DateTime: Date;
    DateTimeISO: Date;
    IDReportStatus: number;
    Id: number;
    ReportName: string;
    ReportType: string;
    Status: string;
    TimeSlot: number;
    Url: string;
}

export interface ReportStoreList {
    IDStore: number;
    Name: string;
    Planograms: PogInfo[];
}

export interface PogInfo {
    IDPOG: number;
    Name: string;
}

export interface ArrayList {
    text: string;
    value: number;
}
export interface BayArrayList {
    text: number;
    value: number;
}

export interface RadioBtnGroup {
    Name: string;
    Value: number;
}

//Attachment

export interface AttachmentList {
    AttachmentURL: string;
    CompletedOn: Date;
    DocumentSubType: string;
    DocumentType: string;
    Group: string;
    IdPog: number;
    IdPogAttachment: number;
    IdReportRef: number;
    IdStore: number;
    IsActive: boolean;
    IsMarkedForDelete: boolean;
    IsSystemGenerated: boolean;
    LkAttachmentSubType: number;
    LkAttachmentType: number;
    Name: string;
    RequestedBy: string;
    RequestedOn: Date;
    Status: string;
    StoreName: string;
    cDocType?: string;
}

export interface LookUp {
    Name: string;
    value: string;
}

export interface ChartSettingData {
    chartTypeList: ChartType[];
    selectedChartType: number;
    selectedAttributeType: string;
    levels: Levels[];
    selectedCategoryTypeinPie: string;
    measures: Levels[];
    selectedMeasureid: string[];
    mlevels: number;
    showLabels: boolean;
    showLegends: boolean;
    showValueInPercent: boolean;
    emitTYpe: string;
}
export interface ChartType {
    ID: number;
    Name: string;
    Alias: string;
    Selected: boolean;
}

export interface Levels {
    Applicability: number;
    AttributeType: string;
    DataType: number;
    DataTypeDesc: string;
    DictionaryName: string;
    Expression: string;
    FormatType: string;
    IDDictionary: number;
    IsDialog: boolean;
    LkUpGroupName: string;
    MaxValue: number;
    MinValue: number;
    Owner: string;
    Remarks: string;
    ShortDescription: string;
    accessType: boolean;
    field: string;
    options: string;
    title: string;
    value: string;
    Id?: string;
    Name?: string;
    Selected: boolean;
}

export interface BarGraphSeries {
    name: string;
    field: string;
    categoryField: string;
}

export enum ReportMode {
    SI = 'SI',
}

export interface ChartDynamicData {
    [key: string]: string | number;
}

export interface PlanogramSearchData extends Planograms {
    displayName?: string;
}

export enum SelectedDisplayType {
    PIE_CHART = 1,
    BAR_GRAPH = 2,
    GRID_VIEW = 3
}
export interface GetReportTemplateParameters{ Description: string;IsDynamicLookUp: boolean;LookUp : LookUpTypes[];Name: string;ParameterType: number;Value: string;Visible: boolean;}
export interface LookUpTypes{ SKU: string; Image: string; BOX: string;}