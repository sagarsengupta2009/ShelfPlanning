import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CellKeyDownEvent, EditableCallback } from 'ag-grid-community';
import { ColDef } from 'ag-grid-enterprise';
import { GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models/grid-column-settings';
import { AgGridColumnService } from 'src/app/shared/components/ag-grid/services/ag-grid-column.service';
import { PanelView } from 'src/app/shared/models';
import { ConfigService, DictConfigService, LanguageService, PanelService, NotifyService, PlanogramStoreService, WorksheetGridService } from 'src/app/shared/services';

@Injectable({
  providedIn: 'root'
})
export class AgGridHelperService {

  private skeletonFormat: string;
  private skeletonHourFormat: string;

  constructor(
    private readonly config: ConfigService,
    private readonly agGridColumnService: AgGridColumnService,
    private readonly languageService: LanguageService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly dictConfigService: DictConfigService,
    private readonly panelService: PanelService,
    private readonly worksheetGridService: WorksheetGridService,
    private readonly notifyService: NotifyService,
    private readonly translate: TranslateService

  ) {
    this.skeletonFormat = this.languageService.getDateFormat();
    this.skeletonHourFormat = " " + this.languageService.getTimeFormat();
  }

  public getAgGridColumns(gridName: string, gridColumnCustomConfig?: GridColumnCustomConfig): ColDef[] {
    let columns: GridColumnSettings[] = [];
    if (gridName) {
      columns = [...this.config.getGridColumns(gridName)];
    }

    gridColumnCustomConfig = {
      ...gridColumnCustomConfig,
      dateFormat: this.skeletonFormat,
      timeFormat: this.skeletonHourFormat
    }

    if (gridColumnCustomConfig?.isLookUpDataNeeded) {
      gridColumnCustomConfig = {
        ...gridColumnCustomConfig,
        lookUpDataGetterFunc: this.getLookupDataForDropdown.bind(this)
      }
    }
    return this.agGridColumnService.getAgGridColumns(columns, gridColumnCustomConfig);
  }

  private getLookupDataForDropdown(idDictionary: number): boolean | string {
    let dictData;
    let lookUPData = [];
    dictData = this.planogramStore.lookUpHolder[this.dictConfigService.configurableDataDictionary.find((ele) => ele.IDDictionary === idDictionary)?.LkUpGroupName];
    let options = dictData?.options;
    if(idDictionary == 589){
      //filter the options of divider type dropdown
      options = dictData?.options?.filter((ele) => {return ele.value !== -1;});
    }
    if (dictData) {
      lookUPData = [];
      options.forEach(opt => {
        lookUPData.push({ value: opt.text, key: opt.value });
      });
      return JSON.stringify(lookUPData);
    } else {
      false;
    }
  }

  //TODO @Karthik add type once AG grid config is finalized
  public setAgGridColumns(gridName: string, newColumnsData: any[]): any[] {
    const columns = this.config.getGridColumns(gridName);
    if (columns) {
      let updatedGrid = this.agGridColumnService.updateAgGridColumns(columns, newColumnsData);
      this.config.saveGridColumns(gridName, updatedGrid);

      // Set Hide property vice verca as per API requirement for user preference
      // updatedGrid updated refernce everywhere so need deep clone
      const updatedGridUserPreference = JSON.parse(JSON.stringify(updatedGrid));
      updatedGridUserPreference.forEach(ele => {
        ele[3] = !ele[3]
      });

      return updatedGridUserPreference;
    }
  }

  public isWorksheetGrid(): boolean {
    if (this.panelService.ActivePanelInfo.view && (this.panelService.ActivePanelInfo.view === PanelView.POSITION
      || this.panelService.ActivePanelInfo.view === PanelView.FIXTURE || this.panelService.ActivePanelInfo.view === PanelView.ITEM)) {
      return true;
    } else {
      return false;
    }
  }

  //TODO @Amit - type of params
  public cellValidation(params): boolean {
    return this.worksheetGridService.cellValidation(params?.data, params?.colDef?.field, params?.colDef?.editable, params?.colDef?.cellRendererParams?.IDDictionary, this.panelService.ActivePanelInfo.view);
  }

  public isFillUpDownApplicable(noFillUpDown: boolean, field: string, isEditable: boolean | EditableCallback): boolean {
    if (noFillUpDown && isEditable) {
      this.notifyService.warn(this.translate.instant('DROPDOWN_IS_NOT_APPLICABLE_FOR') + ' ' + field);
      return;
    }
    return true;
  }
}
