import { ColDef } from "ag-grid-community";
import { Menu } from "src/app/shared/models";
import { GridColumnCustomConfig } from ".";
import { Observable } from "rxjs";

export interface GridConfig {
  // PROPERTIES
  id: string;
  data: any[];
  defaultColDef?: ColDef;
  columnDefs: ColDef[];
  rowSelection?: 'single' | 'multiple';
  rowHeight?: number;
  // rowMultiSelectWithClick?:boolean;
  isFillDown?: boolean;
  firstCheckBoxColumn?: { show: boolean, template?: string };
  tooltipShowDelay?: number;
  tooltipHideDelay?: number;
  skipToParam?: { colName: string, value: string | number }
  height?: string;
  hideColumnConfig?: boolean;
  setRowsForSelection?: { field: string, items: any[] };
  panelId?: string;
  actionFields?: string[];
  isSelectAll?: boolean;
  menuItems?: Menu[];
  masterDetails?: { show: boolean, id: string };
  hideSelectAll?: boolean;
  shoeColCongig?: boolean;
  hideGroupHeader?: boolean;
  hideColumnWhileExport?: string[];
  type?: string;
  filterActionRequired?: boolean;
  defaultSort?: { field: string; sort: string }
  isHeaderCheckboxSelectionOverrideRequired?: boolean;
  gridColumnCustomConfig?: GridColumnCustomConfig;
  suppressClickEdit?: boolean;
  supressSrNo?: boolean;
  pivotMode?: boolean;
  excelStyles?: any[];
  doNotCallGridConfigSaveAPI?: boolean;

  // Note : This should be has only any returntype as it will use for funtion and different function can have different return type
  customGridConfigSaveAPI?: () => Observable<any>;
}

export interface FillDownOldValue {
  id: number;
  field: string;
  oldValue: number | string | boolean;
  $id: string;
  IDPegLibrary?: number;
}
