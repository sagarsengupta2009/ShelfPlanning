
export interface SyncDashboardData {
    CompletedOn: any;
    IDPogAnchor: number;
    IDScenario: number;
    IDSyncRequest: number;
    IsMarkedForDelete: null
    PDFAttachment: string;
    PogName: string;
    RequestedBy: string;
    RequestedOn: string;
    Status: number;
    StatusName: string;
    XLSAttachment: string;
}

export interface PogsDelta {
    AllowItemFilterPOGSync: string;
    result: Products[]
}

export interface Products {
    Action: string;
    Facings: number | string;
    IDPOGObject: number;
    IDPackage: number;
    IDProduct: number;
    Name: string;
    Pack: string;
    PosNo: number;
    SKU: string;
    UPC: string;
    tempId?: any;
}

export interface InsertPogSyncData{
    
}