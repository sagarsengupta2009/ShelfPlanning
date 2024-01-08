export interface ActionExecItem {
  funName: string;
  funoriginal: () => void;
  funRevert: () => void;
  timeStamp: number;
}

export interface HistoryItem {
  actionExecStack: ActionExecItem[];
  isAuto: boolean;
  saveDirtyFlag: boolean;
  unqHistoryID: string;
}

export interface RefreshParams {
  reassignFlag?: boolean; // position parent change
  recFlag?: boolean; // recording flag
  Load?: boolean; // is this from loading of planogram
  IsCalculationRequired?: boolean; // Whether ti calculate or not, but always false for now.
}
