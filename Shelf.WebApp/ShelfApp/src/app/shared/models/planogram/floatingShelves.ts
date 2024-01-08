
export interface FloatingShelves {
    ExportOptionName: string;
    SelectionField: number;
    SelectionFieldDictName: string;
    SelectionFieldName: string;
    Shelves: FloatingShelvesTypes[];
    SortField: number;
    SortFieldDictName: string;
    SortOrder: string;
    TextBoxFont: TextBoxFontDetails;
    TextBoxStyle: TextBoxStyleDetails;
    XYZLocation: string;
    enabled?: boolean;
    posInCart: string;
    posInCartNewName: string;
}

export interface FloatingShelvesTypes {
    CanDrag: boolean;
    CrunchMode: string;
    Depth: number;
    FontColor: string;
    Index: number;
    SelectionValue: string;
    ShelfColor: number;
    ShelfName: string;
    TextBox: ShelveTextBoxDetails;
    TextBoxText: string;
    Thickness: number;
    Width: number;
    X: number;
    Y: number;
    Z: number;
}
export interface ShelveTextBoxDetails {
    BackColor: string;
    FontColor: string;
    High: number;
    Wide: number;
    X: number;
    Y: number;
}
export interface TextBoxFontDetails {
    FontCharSet: number;
    FontClipPrecision: number;
    FontEscapement: number;
    FontFaceName: string;
    FontHeight: number;
    FontItalic: number;
    FontOrientation: number;
    FontOutPrecision: number;
    FontPitchAndFamily: number;
    FontQuality: number;
    FontStrikeOut: number;
    FontUnderline: number;
    FontWeight: number;
    FontWidth: number;
}
export interface TextBoxStyleDetails {
    transform: string;
    backgroundColor: string;
    bottom: string;
    color: string;
    height: string;
    lineHeight: string;
    textAlign: string;
    verticalAlign: string;
    width: string;
}
export interface labelData {
    canvas: HTMLCanvasElement;
    imgHeight: number;
    imgWidth: number;
    labelOn: boolean;
    labelAlways: boolean;
    svgTextObject: svgTextObject;
}
export interface svgTextObject {
    fontSize: number;
    height: number;
    labelObj: labelTextObj;
    lineDY: number;
    rotateDeg?: number;
    savePermittedFontSize: number;
    textSVG: string;
    wrappedTextArr: any[];
    width: number;
    xPos?: number;
    yPos?: number;
    permittedFontSize?: number;
}
export interface labelTextObj {
    text: string;
    fontsize: number;
    fontcolor: string;
    fontfamily: string;
    backgroundcolor: string;
    alignment: string;
    calcMechanism: string;
    opacity: number;
    orientation: number;
    shrinkToFit: boolean;
    wordwrap: boolean;
    xAlignment: number;
    yAlignment: number;
    type?: string;
    fontStyle:string;
    stretchToFacing:boolean;
}
