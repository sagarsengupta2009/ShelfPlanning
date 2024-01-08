import { AnnotationDirection, AnnotationType } from "../enums";
import { PanelIds } from "../planogram-enums";

export interface AnnotationResponse {
    Attribute: string;
    Content: string;
    IDPOG: number;
    IDPOGObject: string;
    IdPogObjectExtn: number;
    LkExtensionType: number;
    ObjectDerivedType?:string;
    $belongsToID?:string;
    status?:string;
}
export interface AnnotationAttribute {
    calloutLocation: AnnotationLocation;
    callout: boolean;
    imgDispType: string;
    imgHeight: number;
    imgUrl: string;
    imgWidth: number;
    location: AnnotationLocation;
    style: AnnotationStyle;
    iPointSize:boolean;
    Font?: FontAddOn;
}
interface AnnotationLocation {
    height: number;
    locX: number;
    locY: number;
    locZ: number;
    relLocX: number;
    relLocY: number;
    top: number;
    width: number;
    direction?: AnnotationDirection;
}

interface AnnotationStyle {
    bgcolor: string;
    color: string;
    fontfamily: string;
    fontsize: number;
    lncolor: string;
}
interface FontAddOn {
  weight?: number;
  italic?: number;
  underline?: number;
}

export interface FreeFlowDetails{
  LkExtensionType: AnnotationType;
  style: AnnotationStyle;
  font?: FontAddOn;
  activePanelID?: PanelIds;
}
