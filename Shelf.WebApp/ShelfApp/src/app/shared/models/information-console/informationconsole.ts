export interface ConsoleObject {
    result: number;
    Summary: SummaryObject;
    settings: SettingObject;
    earlier: boolean;
}
export interface SummaryObject {
    Error: number;
    Information: number;
    Warning: number;
}
export interface SettingObject {
    error: boolean;
    information: boolean;
    warning: boolean;
    count: number;
}

export interface PogZindexInfo {
    ObjectType: string;
    objItemDataId: string;
    parentFixId?: string;
    zIndex: number;
    parentZIndex?: number;
}

export interface LogsListItem {
    Code: string;
    Type: number | string;
    Message: string;
    IsClientSide?: boolean;
    Option?: LogsListItemOption;
    PlanogramID?: string | number;
    Source?: string;
    StackTrace?: string;
    SubType?: string | number;
    runOnTimeStamp?: number;
    RunOn?: Date;
    Executed?: string;
    TypeCode?: string;
    earlier?: boolean;
    IsCheck?: boolean;
    IsOverridable?: boolean;
    noLogs?: boolean;

}

export interface LogsListItemOption {
    $id: string;
    $sectionID: string;
    Group: string;
    Type?: string | number;
}

export interface LogsDataObject {
    [key: number | string]: LogsDataObjectItem;
}

export interface LogsDataObjectItem {
    Status: LogStatus;
    Timestamp: number;
}

export interface LogStatus {
    User: string;
    Summary: SummaryObject;
    settings: SettingObject;
    Result: number;
    Details: LogsListItem[];
}

export interface LogsInfoObject {
    count: number | string;
    consoleInfo: ConsoleObject;
    logs: LogsListItem[];
}

export enum LogsGroupName {
    FitCheck = 'FitCheck',
    SpreadFacings = 'SpreadFacings',
    Allocation = 'Allocation',
    Orientation = 'Orientation',
}

export enum ConsoleInfoType {
    ALL = '',
    ERROR = 'E',
    WARNING = 'W',
    INFORMATION = 'I',
}

export enum LogDataType {
    ERROR = -1,
    WARNING = 0,
    INFORMATION = 1,
    OTHERS = 3,
}
export enum LogDataSubType {
    WARNING = 7,
    INFORMATION = 8,
    ERROR = 6,
}
