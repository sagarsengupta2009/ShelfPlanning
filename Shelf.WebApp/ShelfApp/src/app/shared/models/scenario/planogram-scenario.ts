export interface PlanogramScenario {
    IdPOGScenario: number;
    ProjectName: string;
    ProjectWeekStartD: Date;
    ProjectWeekEndD: Date;
    EffectiveWeekCount: string;
    ProjectModifiedTs: Date;
    IdProject: number;
    IdCorp: number;
    IncludedCategoryNames: string;
    IdAsrtScenario: number;
    Name: string;
    Status: number;
    StatusName: string;
    ApprovalComments: string;
    IsReady: true;
    LastStatusCode: number;
    LastStatusMessage: string;
    CreatedBy: string;
    CreatedTS: Date;
    ModifiedBy: string;
    ModifiedTS: Date;
    IsApprover: false;
    IsAssignee: true;
    IsStoreUser: false;
    NotesCount: number;
}
