export interface PromoteDataList {
  IDPogs: number[];
  promoteFlag: number;
}


export interface PogPromoteDemote {
  enableHistory: boolean;
  promote: number;
  data: PogPromoteDemoteData[];

}

export interface PogPromoteDemoteData {
  IdPog: number;
  IdPogStatus?: number;
  Log: string[];
  isLoaded?: boolean;
}
export interface PromotegridRowData {
  Dimensions: string;
  IDPOGStatusFrom: number;
  IDPOGStatusTo: IDPOGStatusTo[];
  IdPog: number;
  IsReadOnly: boolean;
  Name: string;
  POGLastModifiedBy: string;
  POGLastModifiedDate: string;
  POGStatusFrom: string;
  Stores: []
  error: number;
  information: number;
  isCheckInOutEnable: boolean;
  isCheckedOut: boolean;
  isLoaded: boolean;
  logDetails: { [key: string]: string[] };
  selectedVersion: string;
  selectedVersionname: string;
  selectedVersionvalue: number | { key: number };
  warning: string;
}

export interface IDPOGStatusTo {
  Name: string;
  Value: number;
}

