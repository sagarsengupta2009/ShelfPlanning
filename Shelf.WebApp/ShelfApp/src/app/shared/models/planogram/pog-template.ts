// TODO: @malu this is same as PogFixturesSearch 
// remove this model, rename PogFixturesSearch to PogFixturesSearchItem
export interface PogTemplate {
    ID: number;
    IDPOG: number;
    IDCorp: number;
    Name: string;
    Height: string;
    Length: string;
    Depth: string;
    nHeight: number;
    nLength: number;
    nDepth: number;
    Measurement: string;
    FixtL1: string;
    FixtL2: string;
    FixtL3: string;
    FixtL4: string;
    FixtL5: string;
    FixtL6: string;
    FixtL7: string;
    FixtL8: string;
    FixtL9: string;
    FixtL10: string;
    PogType: number;
    Image: string;
    FixtCreatedDate: any;
    FixtCreatedBy: string;
    FixtLastModifiedDate: any;
    FixtLastModifiedBy: string;
}