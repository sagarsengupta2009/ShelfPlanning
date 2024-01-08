import { CompositeFilterDescriptor } from "@progress/kendo-data-query";
import { Dictionary } from "./sa-dashboard";

export interface KendoColumnSetting {
  field: string;
  title: string;
  width?: number;
  height?: string;
  format?: string;
  orderIndex?: number;
  type?: 'text'
  | 'numeric'
  | 'boolean'
  | 'date'
  | 'float'
  | 'string'
  | 'custom'
  | 'number'
  | 'datetime'
  | 'dropdown';
  editable?: boolean; // Default true
  filterable?: { multi: boolean; search: boolean }; // Default true
  groupable?: boolean; // Default true
  groupOrder?: number;
  hidden?: boolean; // Default false
  includeInChooser?: boolean;
  lockable?: boolean; // Default false
  locked?: boolean; // Default false
  media?: string;
  reorderable?: boolean; // Default true
  resizable?: boolean; // Default true
  sortable?: boolean
  | { allowUnsort?: boolean; initialDirection?: 'asc' | 'desc' };
  sortorder?: number;
  
  style?: { [key: string]: string };
  minResizableWidth?: number;
  templateDummy?: string;
  columnMenu?: boolean;
  headerClass?: string;
  description?: string;
  iconName?: string
  headerType?: string;
  SortByTemplate?: boolean;
  ProjectType?: string;
  isactive?: boolean;
  IDDictionary?: number | Dictionary;
}

export interface KednoGridConfig {
  id: string;
  columns: object[];
  data: any;
  height?: any;
  detailExpand?: boolean;
  menuItems?: any;
  firstCheckBoxColumn?: boolean;
  selectionParam?: any;
  hideColumnWhileExport?: any;
  isRowSelectableByCheckbox?: boolean;
  skipToRow?: any;
  cssclass?: any;
  forceUpdate?: boolean;
  columnMenuDisplay?: boolean;
  columnConfig?: boolean;
  fillDownRequired?: boolean;
  customWidth?: boolean;
  showGroupHeader?: boolean;
  columnGroups?: object[];
  fileName?: any;
  selectAllCheckbox?: boolean;
  uniqueColumn?: string;
  expandId?: string;
  expandedDetailKeys?: any;
  hideSelectAll?: boolean;
  getFilters?: CompositeFilterDescriptor;
  skip?: number;
  hideGroupHeader?: boolean;
  rowEditTemplate?: string;
  columnThresholdForPdfSize?: number;
}

export interface KendoPromoteGridConfig {
  columnfield: any;
  columnTitle: any;
  columnDescription: any;
  isHide: any;
  isLocked: any;
  searchcss: boolean;
  width: any;
  sortDir: any;
  color: string;
  fontColor: string;
}