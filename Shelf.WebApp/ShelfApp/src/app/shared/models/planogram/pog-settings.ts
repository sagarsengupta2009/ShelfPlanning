export interface PogSettings {
    LogHistory: HistoryLogInfo;
    allocateRetainVals: AllocateRetainVals;
    asyncSaveFlag: AsyncFlagInfo;
    blockview: number;
    ctrlDragClonedPositions: [];
    displayWorksheet: { Cart: boolean, Planogram: boolean };
    isActionPerformed: number;
    isAnnotationView: number;
    isAutoSaveDirtyFlag: boolean;
    isDragging: boolean;
    isEnabled: boolean;
    isFixtureCopied: boolean;
    isGrillView: boolean;
    isItemCopied: boolean;
    isItemScanning: boolean;
    isModularView: boolean;
    isSaveDirtyFlag: boolean;
    mode: number;
    scaleFactor: number;
    selectionCount: number;
    sizeReductionFactor: number;
    unitFactor: number;
    marchingAntResize(panelId: string, sectionId: string, scaleF: number): void;
    isAnnotationCopied: boolean;
    is3DLabelOn: boolean;
}

export interface HistoryLogInfo {
    enable: boolean;
    isApiCalled: boolean;
}

export interface AsyncFlagInfo {
    isPOGSavingInProgress: boolean;
    isPOGChangedDuringSave: boolean;
    SVG: string;
    historySaveFlag: number;
    temphistorySaveFlag: number;
}
export interface AllocateRetainVals{
  FacingsMin: number;
  FacingsMax: number;
  DOSMin: number;
  DOSMax: number;
  UnitsMin: number;
  UnitsMax: number;
  CasesMin: number;
  CasesMax: number;
  overrideInv: boolean;
  useItems: boolean;
}
