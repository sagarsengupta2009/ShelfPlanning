import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { RowNode } from 'ag-grid-community';


@Injectable({
  providedIn: 'root'
})
export class AgGridStoreService {

  public gridHoldingData: {
    id: string;
    data: any[]; //Added any type becaues grid data can be of any type
  }[] = [];
  public gridState: { filtermodel: any, colSortState: any, isGroup: number, data?: any, gridId: string }[] = [];
  public booleanTranslatedValue: { YES: string, NO: string, ACTIVE: string, INACTIVE: string };
  public dynamicFilterValues: { field: string, values: { key: number, value: string }[] }[] = [];
  public filterList: { key: number, value: string }[] = []
  public isGlobalSearch: boolean = false;
  public editedCellList = [];
  constructor(private readonly translate: TranslateService) {
    this.booleanTranslatedValue = { YES: this.translate.instant('YES'), NO: this.translate.instant('NO'), ACTIVE: this.translate.instant('ACTIVE'), INACTIVE: this.translate.instant('INACTIVE') };
  }

  public getFilterValuesForDynamicDropdown(rowNodes: RowNode[], template: string, field: string, columnValueArray: number[]): number[] {
    let filterList: { key: number, value: string }[] = []
    rowNodes.forEach((rowNode) => {
      filterList.push(...eval(String(template).replaceAll("dataItem", "rowNode.data")))
    });
    filterList = filterList.filter(ele => columnValueArray.includes(ele.key));
    const index = this.dynamicFilterValues.findIndex((el) => el.field === field);
    if (this.dynamicFilterValues.length === 0 || index === -1) {
      this.dynamicFilterValues.push({ field: field, values: filterList })
    } else {
      let index = this.dynamicFilterValues.findIndex(ele => ele.field === field);
      this.dynamicFilterValues[index].values = filterList;
    }
    this.filterList = filterList.filter((a, i) => filterList.findIndex((s) => a.value === s.value) === i);
    return this.filterList.map((element) => element.key);
  }

}
