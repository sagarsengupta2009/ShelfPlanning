export interface ResizeObject {
    duplicatePositions?: boolean;
    duplicateFacings?: boolean;
    addRightOrLeft?: boolean;
    noOfMoudlars?: number;
    duplicateFixtures?: boolean;
    modularWidth?: number;
}

export interface AllocateObject {
    useItems?: boolean;
    respectPresent?: boolean;
    itemsMode?: number;
    invData?: InvData;
    logModified?: boolean;
    overrideInv?: boolean;
}

export interface ResizeSectionObject {
    adjustRightOrLeft: boolean;
    sectionNewWidth: number;
}

interface InvData {
    FacingsMin?: number;
    FacingsMax?: number;
    DOSMin?: number;
    DOSMax?: number;
    UnitsMin?: number;
    UnitsMax?: number;
    CasesMin?: number;
    CasesMax?: number;
}

export interface Split {
    isMerge: boolean;
    noBays: boolean;
    width: number;
}

export interface ItemList{
    field:string;
    value:number;
}

export interface SortPlanogramOptions {
    sortTypeSelected: number,
    sequenceTypeSelected: number,
    intelligentOption: boolean,
    excelData: string[],
    fileName: string
}