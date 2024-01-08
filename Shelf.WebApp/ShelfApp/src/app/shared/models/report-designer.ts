export interface ReportDatasources {
    IDDataSource: number;
    Name: string;
    API: string;
    AssemblyFullName: string;
    Type: string;
}

export interface ReportTemplateList {
    API: string;
    BrCode: any;
    CreatedBy: string;
    IDDataSource: number;
    Id: number;
    IdCorp: number;
    IsBrReport: boolean;
    IsCustom: boolean;
    IsDefault: boolean;
    ModifiedBy: string;
    Name: string;
    ReportGroup: any;
}

export interface BusinessRulesForReport {
    API: string;
    BRCode: string;
    IDBRSignature: number;
    IDDatasource: number;
    IDReportTemplate: number;
    IsReport: boolean;
    Name: string;
    Signature: string;
}

export enum ReportTemplate {
    BusinessRuleModel = 'BusinessRuleModel',
    undefined = 'undefined',
    ADD_NEW = 'ADD_NEW',
    Report = 'Report',
    CREATE = 'CREATE',
    EDIT = 'EDIT',
    AddNew = 'Add New'
}
