export enum UprightType {
    None = 1,
    Fixed = 2,
    Variable = 3,
}

export interface UprightValidationResult {
    flag: boolean;
    errMsg?: string;
    validatedUprights?: number[];
}

export interface UprightObject {
    uprightType: number;
    uprightValues: number[];
}
