import { Fixture } from './fixture'
import { IPlanogramBase } from './pog-object'
export interface Coffincase extends IPlanogramBase{

    $sectionID:string;
    PercentageUsedCubic:string;
    PercentageUsedSquare:string;
    Fixture:Fixture;
    getColor(arg0:object);
    
}

export interface StyleCoffineCase{
    bottom: string;
    height: string;
    left: string;
    position: string;
    width: string;
    'z-index'?:number
}


