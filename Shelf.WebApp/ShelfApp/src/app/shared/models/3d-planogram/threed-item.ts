import { Dimension } from '../planogram';
import { DirectionImage } from '../planogram-transaction-api/pog-object-response';
import { Planograms } from '../sa-dashboard';

export interface ThreeDItemData extends Planograms {
    Children?: any;    // TODO: @Bala define the childrens array return type
    annotations?: any;
    Fixture?: any;
    IDPOGObject?: any;
    getGrillEdgeInfo?: (front: string, shelfObject: Planograms)=> any;
    getPegHoleInfo?: () =>  any;
    getCoffinCaseInfo?: () => any;
    getColorForView?: () => any;
    getShrinkWidth?: (para: string) => any;
    getSKUGap?: (isSku: boolean, widthShrink: string) => any;
    getNotchInterval?: () => [];
    readonly uprightIntervals: number[];
    getShelfLabelObject?: (obj: any) => any;
    getLabelCustomizedObject?: (para: any, labelFields: any) => any;
    name?: string;
    ObjectDerivedType?: string;
    ChildDimension?: Dimension;
    Position?: any;
    $packageBlocks?: any;
    $idParent?: any;
    $id?: any;
    facings?: any;
    yFacings?: any;
    layoversDeep?: any;
    zFacings?: any;
    positionDetail?: any;
    layovers?: any;
    Attribute?: any;
    LkExtensionType?: number;
    Content?: any;
    left?: () => any;
    bottom?: () => any;
    top?: () => any;
    right?: () => any;
    linearHeight?: () => number;
    linearWidth?: () => number;
    linearDepth?: () => number;
    $belongsToID?: string;
    status?: string;
    FrontImage?: DirectionImage;
    BackImage?: DirectionImage;
}
