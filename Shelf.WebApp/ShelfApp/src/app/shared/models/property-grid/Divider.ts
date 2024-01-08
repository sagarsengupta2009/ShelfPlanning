export interface Divider {
    selectedDividerPlacement: number;
    dividerHeight: number;
    dividerWidth: number;
    dividerDepth: number;
    dividerSlotStart: number;
    dividerSlotSpacing: number;
    partNumber: string;
}



export interface DividerGap {
    horizontal: Horizontal[], vertical: Vertical[], type: string
  }
  interface Horizontal {
    y: number;
    length: number;
  }
  
  interface Vertical {
    x: number;
    length: number;
  }