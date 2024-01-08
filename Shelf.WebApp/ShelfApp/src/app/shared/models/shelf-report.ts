export interface ShelfPowerBiReport {
    CategoryName: string;
    IDReport: number;
    Params: ReportURLParams[];
    ReportName: string
    ReportUrl: string
}

export interface ReportURLParams{
    ParamName: string;
    ParamValue: string;
}

