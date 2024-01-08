import { Fixture } from './fixture';
import { CommonResponseObject } from "../planogram-transaction-api/common-object-response";
import { PogObject } from './pog-object'


export interface Basket extends Fixture, CommonResponseObject{
    $sectionID:string;
    Children?:PogObject[];
    Color:string;
    IDCorp: number;
    IDPOGObject: number;
    IDPOGObjectParent: number;
    IdPog: number;
    ObjectDerivedType: string;
    ObjectType: string;
    ParentPogObject: PogObject;
    Planogram: any;
    Position: any;
    Rotation: Location;
    RotationOrigin: Location;
    TempId: number;
    TempParentId: null
    maxItemHeight: number;
    minMerchHeight: number;
    minMerchIntersectFlag: boolean;
    minmax:minMaxLocation;
    shrinkMode: boolean;
    _CalcField: { id: string; sectionId: string; };
}
export interface Location {
    X?: number;
    Y?: number;
    Z?: number;
}
export interface minMaxLocation {
    lx?: number;
    rx?: number;
    ty?: number;
}