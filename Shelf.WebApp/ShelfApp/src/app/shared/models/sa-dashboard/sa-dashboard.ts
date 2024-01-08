import { LookUpChildOptions } from './lookup';

export interface PlanogramStatus {
  IDPOGStatus: number;
  Name: string;
  IsPriorityReportRequired: boolean
}

export interface AllDictionaryData {
  Dictionary: Dictionary[];
  HashCodes: DictionaryHashCodes;
}

export interface Dictionary {
  IDDictionary: number;
  DictionaryName: string;
  IDResource: number;
  IDProdVersion: number;
  IsActive: boolean;
  DataType: number;
  DefaultValue: any;
  MaxValue: any;
  MinValue: any;
  IDAggregationType: number;
  ActionOnChange: any;
  AccessType: string;
  Owner: string;
  IDFormatType: number;
  AttributeType: string;
  LkUpGroupName: any;
  IsUnUsedField: boolean;
  FieldType: string;
  FieldQualifier: any;
  IsDialog: boolean;
  UiFormat: string;
  Applicability: any;
  IsDisAllowUserConfig: boolean;
  Expression: any;
  RoundOff: any;
  InMemory: boolean;
  UiViewable: any;
  IsReportField: any;
  LongDescription: string;
  ShortDescription: string;
  Remarks: any;
  ProdVersionName: string;
  AggregationType: string;
  FormatType: string;
  value?: string;
  field?: string;
  options?: LookUpChildOptions[]; //TODO: @pranita confirm data type
  DataTypeDesc: string;
  type?: string;
  title: string;
  accessType?: boolean;
  lineBreak?: boolean;
  startTitle?: string;
  endTitle?: string;
  startInputs?: number;
  endInputs?: number;
  Selected?: boolean;
}

interface DictionaryHashCodes {
  DictionaryHash: string;
  DictionaryName: string;
}

export interface DictRecordsCache {
  [key: string]: DictRecord
}

interface DictRecord {
  searched: boolean;
  actualData: Dictionary;
}

export interface InterSectionMessage {
  message: Array<string>;
  revertFlag: boolean;
  historyUniqueID?: string;
}

export interface ShelfLabelProp {
  fontStyle: string;
  fontFamily: string;
  fontColor: string;
  labelOrientation: string;
  wordWrap: string;
  bgColor: string;
  hAlign: string;
  vAlign: string;
  fontSize: string;
  opacity: string;
  label: any; //TODO: Pranay : Need to update, assigning string through an error, need to check its funtionlity
  crossLabelDisplay: string;
}

export interface iShelf {
  settings: iShelfSetting;
  IDBcount: number;
  FetchreportDesignerTemplate: boolean;
  fetchStoreHierarchy: boolean;
  CreatePogfetchStoreHierarchy: boolean;
  showDirective: { discussionThread: number; panelID: string; clipboard: boolean }
}

interface iShelfSetting {
  isReady_planogramSetting: number;
  isReady_lookup: number;
  isReady_propertyGrid: number;
  isReady_itemWorksheet: number;
  isReady_fixtureWorksheet: number;
  isReady_worksheetColumnConfig: number;
  isReady_template_positionWorksheetSettings: number;
  isReady_inventoryWorksheet: number;
  isReady_inventorySettingWorksheet: number;
  isReady_pogQualifier: number;
  isReady_allSettings: number;
}
