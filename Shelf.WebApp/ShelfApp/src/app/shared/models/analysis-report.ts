export interface AnalysisReportData {
    Columns: ReportsDataColumns[];
    DataSourceUrl: string;
    Measures: ReportsDataMeasures[];
    Reports: ReportsData[];
    Rows: ReportsDataColumns[];
    Schema: SchemaDataType;
    Order: number[];
    LastModified: string;
}

export interface PogDataSource {
    Brand: string;
    CPI: number;
    CSC: string;
    Capacity: number;
    Casepack: number;
    Cases: number;
    DOS: number;
    DOSMax: number;
    DOSMin: number;
    Facings: number;
    FacingsMax: number;
    FacingsMin: number;
    Fixture: string;
    FixtureNumber: number;
    GTIN: string;
    IDPOG: number;
    L1: string;
    L2: string;
    L3: string;
    L4: string;
    L5: string;
    L6: string;
    Linear: number;
    LostSales: number;
    Manufacturer: string;
    Movement: string;
    OOS: number;
    PackageType: string;
    Pog: string;
    Product: string;
    RecADRI: string;
    Retail: number;
    RowNum: number;
    SKU: string;
    Sales: number;
    UPC: string;
    UnitsMax: number;
    UnitsMin: number;
    _EXTDESC1: string;
    _EXTDESC2: string;
    _EXTDESC3: string;
    _EXTDESC4: string;
    _EXTDESC5: string;
    _EXTDESC6: string;
    _EXTDESC7: string;
    _EXTDESC8: string;
    _EXTDESC9: string;
    _EXTDESC10: string;
    _EXTDESC11: string;
    _EXTDESC12: string;
    _EXTDESC13: string;
    _EXTDESC14: string;
    _EXTDESC15: string;
    _EXTDESC16: string;
    _EXTDESC17: string;
    _EXTDESC18: string;
    _EXTDESC19: string;
    _EXTDESC21: string;
}

export interface ReportsData {
    Columns: ReportsDataColumns[];
    CreatedBy: string;
    IdTemplate: number;
    Measures: ReportsDataMeasures[];
    Name: string;
    Rows: ReportsDataColumns[];
    IsPivotMode: boolean;
    IsSystemReport: boolean;
    GridTemplateConfig?: string;
}

export interface ReportsDataMeasures {
    name: string;
    aggFunc?: string;
}

export interface ReportsDataColumns {
    name: string;
}

export interface SchemaDataType {
    cube: cubeFieldsData;
    model: modelField;
}

interface cubeFieldsData {
    dimensions: dimensionsField;
    measures: measuresField;
}

interface dimensionsField {
    [key: string]: { caption: string };
}

interface measuresField {
    [key: string]: { aggregate: string; field: string };
}

interface modelField {
    fields: fieldsData;
}

interface fieldsData {
    [key: string]: { type: string };
}

export interface savedReportData {
    Report: ReportsData[];
    IsNewReport: boolean;
}
