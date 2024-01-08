import { Planograms } from "..";

export interface CheckinCheckout {
  canEdit: boolean;
  canReload?: boolean;
  expiresOn?: string;
  id?: string;
  idPog: number;
  message: string;
  userId: string;
  checkedoutManually?: boolean;
}


export interface ExportOptions {
  PLN: boolean;
  PSA: boolean;
  XML: boolean;
  XMZ: boolean;
}

export interface Pinned{
  isPinned: IsPinned
}
interface IsPinned{
  filterType: string;
  filterModels: FilterModel[];
}

export interface FilterModel{
  values: string[];
  filterType: string;
}
