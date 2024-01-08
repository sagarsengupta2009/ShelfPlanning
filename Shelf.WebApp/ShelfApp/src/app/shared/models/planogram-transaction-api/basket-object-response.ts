import { FixtureObjectResponse } from './fixture-object-response';

    export interface BasketResponse extends FixtureObjectResponse {
        $id:string;
        $blocks:any[];
        unUsedLinear: boolean;
        PercentageUsedSquare: number;
        allowOverflow: boolean;
        enableBayProperty: boolean;
        minMerchHeight: number;
        maxItemHeight: number;
        isSpreadShelf: boolean;
    }
    


