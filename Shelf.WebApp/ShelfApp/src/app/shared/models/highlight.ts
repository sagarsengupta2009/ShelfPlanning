import { RangeModelValues } from "./range-model";

export interface HighlightTemplate {
    name: string;
    value: string;
    readonly: boolean;
    options: { highlightType: string };
    isSystem?: boolean;
    GUID?: string;
    isFavorite?: boolean;
    isCount: boolean;
    excludeZeroVal: boolean;
    isDefault?: boolean;
}

export interface SelectedTemplate {
    name: string;
    value: string;
    GUID: string;
    readonly: boolean;
    isFavorite?: boolean;
    isSystem?: boolean;
    options: TemplateOptions;
    isCount: boolean;
    excludeZeroVal: boolean;
    isDefault?: boolean;
}

export interface TemplateOptions {
    rangeModel: RangeModel[];
    highlightType: string;
    fieldStr: string;
    defaultColor: string;
    defaultLabel?: number;
    numericRangeAttr: {};
    stringMatchAttr: {};
    spectrumAttr: SpectrumAttr;
    fieldObjectChosen: FieldObjectChosen;
    fieldObjectChosenQ: FieldObjectChosenQ;
    fieldStrQ: string;
    startArr: number[];
}

export interface HighLightOptions {
    HighLightName: String;
    FieldNames: String[];
    IsCount: boolean;
    StartArr: String[];
}


export interface TBATemplateOptions {
    rangeModel: RangeModel;
    rangeModelCount: RangeModel;
    highlightType: string;
    fieldStr: string;
    fieldObjectChosen: FieldObjectChosen;
    count: boolean;
}

export interface StringMatchData {
    data: StringMatch[];
    fieldName: string;
}

export interface NumericRangeData {
    data: RangeItemModel[] | RangeModel[];
    fieldName: string;
}

export interface SpectrumData {
    data: RangeModel[];
    startColor:  string;
    middleColor: string;
    endColor: string;
}

export interface RangeItemModel {
    color: string;
    num: number;
}

export interface RangeModel {
    color: string;
    value: string;
    num?: number;
    linear?: number | string;
    totalLinear?: number;
    SPM?: number | string;
    label?: string;
    percentageLinear?: number;
    val?: string | number;
    capacity?: number | string;
    capacityOfEachRow?: number;
    percentageCapacity?: number;
    rangeValues?: RangeModelValues[];
    lastModified?: number;
}

export interface StringMatch {
    color: string;
    value: string;
    label?: string;
    val?: string | number;
}
export interface SPMData {
    [key: string|number]: string | number;
}
export interface SpectrumAttr {
    modelSP_startval: string;
    modelSP_middleval: string;
    modelSP_endval: string;
    modelSP_startLabel: string;
    modelSP_middleLabel: string;
    modelSP_endLabel: string;
    modelSP_startcolor: string;
    modelSP_middlecolor: string;
    modelSP_endcolor: string;
    modelSP_legend?: boolean;
}

export interface FieldObjectChosen {
    IDDictionary: number;
    field: string;
    options: string;
    value: string;
    IsDialog: boolean;
    Remarks: string;
    accessType: boolean;
    MinValue?: any;
    MaxValue?: any;
    Applicability?: any;
    Owner: string;
    DictionaryName: string;
    AttributeType: string;
    FormatType: string;
    DataTypeDesc: string;
    DataType: number;
    LkUpGroupName?: any;
    name: string;
    Expression: string;
    ShortDescription: string;
    title: string;
    dataType: string;
    mapping?: number;
    FieldPath: string;
    calculatedFieldPath: string;
    type: string;
}

export interface FieldObjectChosenQ {
    name: string;
    value: string;
    mapping: number;
    type: string;
    dataType: string;
    FieldPath: string;
    calculatedFieldPath?: any;
    AttributeType: string;
}

export interface ModelHL {
    blockHighlightOn: boolean;
    tool: boolean;
    toggleName: string;
    chosenTemplate: SelectedTemplate;
    fieldObjectChosen: FieldObjectChosen;
    fieldObjectChosenQ?: FieldObjectChosen;
    type: string;
    field: string;
    template: string;
    fieldQ?: string;
}

export enum HighlightTypeKey {
    STRING_MATCH_kEY = 'STRING_MATCH',
    NUMERIC_RANGE_KEY = 'NUMERIC_RANGE',
    COLOR_SCALE_KEY = 'COLOR_SCALE',
    TOP_BOTTOM_ANALYSIS_KEY = 'TOP_BOTTOM_ANALYSIS',
    QUADRANT_ANALYSIS_KEY = 'QUADRANT_ANALYSIS',
}

export interface LookUpOption {
    IDDictionary: number;
}

export interface LookUpType {
    name: string;
    options: LookUpOption[];
    value: string;
}

export interface ColorPalette {
    color: string;
    num: number;
    label: string;
}

export interface SpmType {
    [key: string]: string | number;
}

export interface PaletteSettings {
    columns: number;
    palette: string[];
}


export interface SortedGuidList {
    name: string;
    guid: string;
    isFav: boolean;
    isDefault?: boolean;
}

export interface IdPogObjectList {
    idPogObject: number;
    backgroundColor?: string;
}
