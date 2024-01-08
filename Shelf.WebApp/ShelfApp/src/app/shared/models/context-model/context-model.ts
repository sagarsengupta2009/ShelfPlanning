
import { Point3 } from '../planogram-library/planogram-transaction';
import { Dimension, PositionResponse } from '..';
import { Fixture, Position, Section } from '../../classes';

export type PropertyObject =
    { property: 'Orientation', data: Position } |
    { property: 'Facings', data: Position } |
    { property: 'FixtureCrunchMode', data: Fixture } |
    { property: 'SectionCrunchMode', data: Section }

export enum PropertyType {
    Facings = 'Facings',
    Orientation = 'Orientation',
    FixtureCrunchMode = 'FixtureCrunchMode',
    SectionCrunchMode = 'SectionCrunchMode'
}
export interface PositionFixtureObj {
    $sectionID?: string;
    $idParent: string;
    ChildDimension: Dimension;
    ChildOffset: Point3;
    Color: string;
    Dimension: Dimension;
    IDCorp: number;
    IDPOGObject: number;
    IDPOGObjectParent: number;
    IdPog: number;
    Location: Point3;
    ObjectDerivedType: string;
    ObjectType: string;
    ParentPogObject: any;
    Planogram: any
    Position: PositionResponse,
    Rotation: Point3;
    RotationOrigin: Point3;
    TempId: string;
    TempParentId: string;
}
export interface PositionObject extends PositionFixtureObj {
    computeWidth();
    Children: any;
    Fixture: FixtureStore;
    IntersectionLocation: Dimension;
    defaultOrinetation: OrinetationStore
    minMerchIntersectFlag: boolean
    selected: boolean
    spreadSpanPosNo: number
}

export interface FixtureObject extends PositionFixtureObj {
    getColor();
    getAllSpreadSpanPositions(arg0: boolean);
    Fixture: Fixture;
    Children: PositionObject;
    canUseShrinkVal: boolean;
    maxItemHeight: number;
    minMerchDepth: number;
    minMerchHeight: number;
    minMerchIntersectFlag: false;
    selected: true;
    spanShelfs: any;
    unUsedCubic: number;
    unUsedLinear: number;
    unUsedSquare: number;
}

interface OrinetationStore {
    value: number;
    XPegHole: number;
    YPegHole: number;
}

export interface FixtureStore {
    FixtureNumber: number,
    FixtureFullPath: string,
    FixtureDesc: string,
    AutoComputeFronts: boolean
}

