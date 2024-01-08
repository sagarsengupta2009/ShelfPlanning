export interface PAPlanogram {
    isSsPogQueued: boolean;
    deltaWhiteSpace: number;
    isSetSizeQueued: boolean;
    parentModel: number;
    setSizes: number;
    modelChangeReason: string;
    modelChanged: boolean;
    cPogScore: number;
    isBlocked: boolean;
    isVerified: boolean;
    blockType: string;
    desc01: string;
    desc02: string;
    desc03: string;
    desc04: string;
    groupId: number;
    prodGroupId: number;
    groupName: string;
    clusterName: string;
    pogName: string;
    modules: number;
    fixtures: number;
    footage: string;
    pinned: boolean;
    cached: boolean;
    favorite: boolean;
    status: number;
    requestStatus: number;
    approveState: string;
    qualifier: string;
    stockingSection: string;
    pogAssignmentType: number;
    stores: number;
    totalLinear: number;
    availableLinear: number;
    whiteSpace: number;
    spaceUtilized: number;
    corpId: number;
    createdIn: number;
    noOfProducts: number;
    score: string;
    pogType: string;
    l1: string;
    l2: string;
    l3: string;
    l4: string;
    l5: string;
    l6: string;
    l7: string;
    l8: string;
    l9: string;
    l10: string;
    profile: string;
    p1: string;
    p2: string;
    p3: string;
    p4: string;
    p5: string;
    isOptimized: boolean;
    active: boolean;
    cOptimized: boolean;
    displayVersion: string;
    noOfOffSets: number;
    classification: string;
    createdBy: string;
    createdTime: string;
    modifiedBy: string;
    statusCode: string;
    height: number;
    width: number;
    depth: number;
    storePercentage: string;
    isReadOnly: boolean;
    stockingSectionId: string;
    lastUpdated: string;
    refStoreId: number;
    bayProfile: string;
    placedItems: number;
    shoppingCartItems: number;
    totalFixtures: number;
    mbErrorMsg: string;
    runStatus: number;
    ruleSetId: number;
    syncPog: string;
    statusResult: boolean;
    assortmentScore: number;
    minDosScore: number;
    minCasesScore: number;
    isCommented: boolean;
    cloneFrom: number;
    partitionKey: string;
    rowKey: string;
    timestamp: string;
    eTag: string;
}

export interface PAPogsUpdate {
    data: PAPlanogram[];
    isShelfReload?: boolean;
}