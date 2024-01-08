import { Dimension } from '../../planogram';

export interface PASVGTooltip {
    SvgContent: string;
    ToolTipData: PATooltip;
}

export interface PATooltip {
    Product: PAProductTooltip;
    Fixture: PAFixtureTooltip;
}

export interface PAProductTooltip {
    FrontsHigh: number;
    FrontsDeep: number;
    LayoversHigh: number;
    LayoversDeep: number;
    Orientations: number;
    Capacity: number;
    IDPOGObject: string;
    IDPOGObjectParent: string;
}

export interface PAFixtureTooltip extends Dimension {
    ModelNumber: number;
    FixtureNumber: number;
    FixDesc: number;
    FixtureType: number;
    IDPOGObject: string;
    IDPOGObjectParent: string;
}
