export interface FeedbackData {
    ExecStatus: ExecData[];
    HistoryFeedback: HistoryFeedbackData[];
    Feedbacks: FeedbacksData[];
    RejectStatus: RejectStatus[];
    Store: StoreData[];
}

export interface ExecData {
    idExec: number;
    name: string;
}

export interface FeedbacksData {
    ExecBy: string;
    ExecNote: string;
    ExecStatus: number;
    ExecutedOn: Date;
    IdPog: number;
    IdStore: number;
    RejReason: string;
}

export interface HistoryFeedbackData {
    executionStatusName: string;
    CreatedBy: string;
    CreatedOn: Date;
    ExecBy: string;
    ExecNote: string;
    ExecStatus: number;
    ExecutedOn: Date;
    IdPog: number;
    IdStore: number;
    RejReason: string;
    StoreName: string;
}

export interface RejectStatus {
    intschreq: number;
    name: string;
    value: string;
}

export interface StoreData {
    EffectiveDate: Date;
    IdStore: number;
    StoreName: string;
}

export interface DisscussionData {
    Discussions: PostMessageData[];
    Stores: MessageBoardStoreList[];
}

export interface MessageBoardStoreList {
    IDStore: string;
    StoreName: string;
}

export interface PostMessageData {
    Children?: PostMessageData[];
    ChildrenDisplayLength?: number;
    userComment?: string;
    content: string;
    created: Date;
    file_mime_type: string;
    file_url: string;
    fullname: string;
    id: string;
    idPog: string;
    isRead: boolean;
    parent: number;
    storeIdentifier: string;
    upvote_count: number;
    user_has_upvoted: boolean;
}

export interface NewMessageData {
    content: string;
    created: Date;
    file_mime_type: string;
    file_url: string;
    fullname: string;
    id: number;
    idPog: number;
    isRead: boolean;
    parent: number;
    storeIdentifier: string;
    upvote_count: number;
    user_has_upvoted: boolean;
}

export enum ExecStatusValue {
    Incomplete = -1,
    Pending = 0,
    Implemented = 1,
}
