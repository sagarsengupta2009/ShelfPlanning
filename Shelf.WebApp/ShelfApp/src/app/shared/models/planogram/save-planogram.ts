import { Position } from '../../classes'
import { Fixture } from './fixture'
import { PackageAttributes } from './planogram'


export interface SavePlanogram{
    Fixture: Fixture[]
    PackageAttributes: PackageAttributes[]
    Pog: PogInfo
    Positions: Position[]
}


export interface PogInfo{
    IDPOGLiveOriginal: string;
    ModifiedBy: string;
    ModifiedTs: string;
    PogVersion: string;
    RowVersion: number
}


export interface SavePlanogramSVG{
    RowVersion: number;
    Thumbnail: string;
    Version: string
}
