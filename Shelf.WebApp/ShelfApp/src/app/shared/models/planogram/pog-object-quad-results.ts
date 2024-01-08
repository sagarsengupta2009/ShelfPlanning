// TODO: @malu this needs to be changed to:
// interface IntersectionCheckResult {
//     intersectingFlag: boolean;
//     intersectingFixtures: []; // find type
//     minMerchCheckFlag: boolean;
//     minMerchCheckFixtures: [] // find type
// }

export interface IntersectionCheckResult {
    intersectingFlag: boolean | any;
    minMerchCheckFlag: boolean | any
}
