export interface BatchPrintPogsInput {
    IDReports: Array<number>;
    IsRegenerate: boolean;
    IDPOGList: Array<number>;
}

export interface BatchPrintAccess {
    URL: string;
}

export interface IDPogStoreCollection {
    IDPog: number;
    IDStore: number;
}

export interface BatchReport {
    ID: number;
    IDCORP: number;
    IDPOG: number;
    IDPOGAttachment: number;
    IDReportStatus: number;
    IDStore: number;
    IdReport: number;
    POGName: string;
    ReportName: string;
    StoreName: string;
    StoreNum: number;
    URL: string;
    seqNo?: number;
}
