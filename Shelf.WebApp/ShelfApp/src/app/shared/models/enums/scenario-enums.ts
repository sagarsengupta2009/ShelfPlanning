export enum ScenarioStatusCode {
    NOT_READY = 1,
    READY = 2,
    IN_PROGRESS = 3,
    SUBMITTED_FOR_APPROVAL = 4,
    PROCESSING = 5,
    APPROVED = 6,
    APPROVE_FAILED = 7,
    COMPLETED = 8,
    CANCELLED = -1
}

export const NonEdiatbleScenarioStatuses: ScenarioStatusCode[] = [
    ScenarioStatusCode.SUBMITTED_FOR_APPROVAL,
    ScenarioStatusCode.PROCESSING,
    ScenarioStatusCode.COMPLETED
 ];


