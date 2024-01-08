export interface IApiResponse<T> {
    Log?: IApiResponseLog;
    Permissions: any;
    Data: T;
}

export interface IApiResponseLog {
    Result: number; // TODO: @malu should be enum
    User: string;
    Summary: ILogSummary;
    Details: ILogDetails[];
}

export interface ILogSummary {
    BR: number;
    Error: ResponseLogError;
    Information: number;
    Warning: number;
}

export interface ILogDetails {
    Type: LogDetailsType;
    Code: any;
    Message: string;
    Source: any;
    StackTrace: any;
    SubType: any;
    IdPog: number;
    IsOverridable: boolean;
    IsCheck: boolean;
    IdPogLog: any;
    RunOn: Date;
    CreatedBy: string;
    IsReport: boolean;
    subTypeName?: string;
    subTypeRow?: string;
    excutedEarlier?: string;
}

export enum LogDetailsType {
    Error = -1,
    Warning = 0,
    Message = 1,
    BR = 3
}

export enum ResponseLogError {
    OCCURRED = 1,
    NOT_OCCURED = 0
}
