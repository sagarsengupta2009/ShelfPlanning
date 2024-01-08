export interface PromoteLog {
    Code: string;
    CreatedBy: string;
    IdPog: number;
    IdPogLog: string;
    IsCheck: boolean;
    IsOverridable: boolean;
    IsReport: boolean;
    Message: string;
    RunOn: string;
    Source: string;
    StackTrace: string;
    SubType: number;
    Type: number;
    excutedEarlier: string;
    subTypeRow?: string;
    subTypeName?: string;
}
