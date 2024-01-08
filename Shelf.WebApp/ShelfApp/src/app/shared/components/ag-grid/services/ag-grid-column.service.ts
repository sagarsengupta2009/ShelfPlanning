import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CellClassParams, ColDef, ISetFilterParams, KeyCreatorParams, SetFilterValuesFuncParams, ValueFormatterParams, ValueGetterParams } from 'ag-grid-enterprise';
import { LanguageService } from 'src/app/shared/services';
import { CellRendererComponent, ColorComponent, DateComponent, DropdownCellEditorComponent, DropdownComponent, NumericComponent, StringComponent, TooltipComponent } from '../Components';
import { CustomHeaderComponent } from '../Components/grid/custom-header/custom-header.component';
import { GridColumnCustomConfig, GridColumnSettings } from '../models';
import { AgGridStoreService } from './ag-grid-store.service';
import { AgGridService } from './ag-grid.service';

@Injectable({
  providedIn: 'root'
})
export class AgGridColumnService {

  //For templated column eveluation, we need this service injection(DatePipe,TranslateService,LanguageService)
  constructor(private readonly agGridService: AgGridService,
    private readonly datePipe: DatePipe,
    private readonly translate: TranslateService,
    private readonly languageService: LanguageService,
    private readonly agGridStoreService: AgGridStoreService
  ) { }

  public getAgGridColumns(columns: GridColumnSettings[], gridColumnCustomConfig: GridColumnCustomConfig): ColDef[] {
    if (gridColumnCustomConfig?.customCol) {
      columns = [...columns, ...gridColumnCustomConfig.customCol];
    }
    if (columns) {
      return columns.filter(x => !x[1]?.toLowerCase().includes('checkbox')).map((item: any, i: number) => {
        let headerComponentParams: { field: string, headerType: string, data: any } = null;
        if (gridColumnCustomConfig?.headerParams && gridColumnCustomConfig.headerParams.length) {
          headerComponentParams = gridColumnCustomConfig.headerParams.find(p => p.field === item[1]);
        }
        const isDynamic = gridColumnCustomConfig?.dynamicDropdown?.value && gridColumnCustomConfig?.dynamicDropdown?.value[gridColumnCustomConfig?.dynamicDropdown?.field.indexOf(item[1])];
        if (gridColumnCustomConfig?.isLookUpDataNeeded && !isDynamic) {
          const lookUpData = gridColumnCustomConfig.lookUpDataGetterFunc(item[18]);
          if (lookUpData) {
            item[`Template`] = lookUpData;
          }
        }
        return {
          field: item[1],
          headerName: item[0],
          headerComponent: headerComponentParams ? CustomHeaderComponent : null,
          headerComponentParams: { headerType: headerComponentParams?.headerType, data: headerComponentParams?.data },
          minWidth: item[8],
          //editable: ...(gridColumnCustomConfig.isEditableCallbackRequired)? () =>  item[9],

          ...((this.checkIfEditableCallbackIsRequired(gridColumnCustomConfig, item[1])) && {
            editable: (params) => {
              let template = this.getEditableCallbackTemplate(gridColumnCustomConfig, params.colDef.field);
              return eval(template);
            }
          }),
          ...((!this.checkIfEditableCallbackIsRequired(gridColumnCustomConfig, item[1])) && {
            editable: item[9],
          }),
          suppressFillHandle: !item[9],
          filter: 'agMultiColumnFilter',
          filterParams: this.getFilterParams(item[10], item[1], gridColumnCustomConfig?.columnFilters, gridColumnCustomConfig?.dateFormat, gridColumnCustomConfig.timeFormat, gridColumnCustomConfig.dynamicDropdown),
          columnsMenuParams: {
            suppressColumnSelectAll: true
          },
          cellClass: this.getType(item[10]),//'stringType',
          ...((gridColumnCustomConfig?.dirtyCheckCol && gridColumnCustomConfig?.dirtyCheckCol?.field === item[1]) && {
            cellClassRules: {
              // print details of editing cell
              'edited-cell': (params) => {
                let index: number = -1;
                if (this.agGridStoreService.editedCellList.length) {
                  index = this.agGridStoreService.editedCellList.findIndex((e) => e === params.node.data[gridColumnCustomConfig?.dirtyCheckCol?.field]);
                }
                return (index !== -1) ? true : false;
              }
            }
          }),
          cellStyle: (params: CellClassParams) => {
            let style = { 'display': 'block', 'text-overflow': 'ellipsis', 'white-space': 'nowrap', 'overflow': 'hidden', 'padding': 0 };
            if (item[14]) {
              //Merge both style
              style = {
                ...style,
                ...(item[14].startsWith('#') || {
                  ...JSON.parse(item[14]),
                }),
              };
            }
            if (item[9]) {
              //Apply editable background color only if grid setting color is not applied
              if (!style.hasOwnProperty('background-color')) {
                style = { ...style, ...{ backgroundColor: 'rgb(234, 250, 255)' } };
              }
            }
            //Overried highlighted color
            if (params?.data?.backgroundColor) {
              if (params?.api?.getSelectedRows().length && params?.api?.getSelectedRows().find(ele => ele.$id == params.data.$id)) {
                style = { ...style, ...{ backgroundColor: '#b5dbf2', color: '#6F6F6F' } };
              } else {
                const lightColor = this.agGridService.lightenDarkenColor(params?.data?.backgroundColor);
                style = { ...style, ...{ backgroundColor: params?.data?.backgroundColor, color: lightColor } };
              }
            }
            if (this.isNumber(item[10])) {
              style = { ...style, ...{ 'text-align': 'right', 'padding-right': '5px' } };
            }
            // This fix is required when we have server side grid and we are setting colour as default(whitesmoke) for column, then style is not getting updated as it's not removing colour properties on ag-grid end.
            // So making background-color and color as '' updating color, in future we can check by commenting this code, if things works then remove the code
            if (gridColumnCustomConfig.isServerSideGrid && !style.hasOwnProperty('background-color') && !style.hasOwnProperty('backgroundColor')) {
              style = { ...style, ...{ backgroundColor: '', color: '' } };
            }
            return style;
          },
          rowGroup: item[6] ? item[6] : false,
          rowGroupIndex: item[6] ? item[7] : 0,
          hide: item[3],
          pinned: item[4] ? 'left' : '',
          sortable: true,
          sort: item[12] !== `` ? item[12]?.toLowerCase() : null,
          ...(item[10]?.toLowerCase() === 'string' && {
            comparator: (a, b) => {
              if (typeof (a) === 'string' && typeof (b) === 'string')
                return a?.toLowerCase().localeCompare(b?.toLowerCase());
            }
          }),
          initialSort: item[12] !== `` ? item[12]?.toLowerCase() : null,
          sortIndex: item[12] !== `` ? item[16] : null,
          initialSortIndex: item[12] !== `` ? item[16] : null,
          suppressMenu: item[`ColumnMenu`] !== undefined ? !item[`ColumnMenu`] : false,
          valueFormatter: (params) => {
            if (!params?.data && item[`Template`] !== '') return;
            return this.formatData(params, item['Template']);
          },
          tooltipField: item[1],
          tooltipComponent: TooltipComponent,
          tooltipComponentParams: {
            columntype: item[10] ? item[10] : `string`,
            template: item[`Template`]
          },
          //HeaderTooltip is added to enable tooltip for column
          ...((gridColumnCustomConfig?.customCol && headerComponentParams?.headerType === 'icon') && { headerTooltip: item[0] }),
          cellRenderer: this.getRendererComponent(item[10]),
          cellRendererParams: {
            orderIndex: item[2],
            columntype: item[10] ? item[10] : `string`,
            format: item[10] === `number | float` ? `{0:n}` : null,
            description: item[11] ? item[11] : ``,
            IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
            ProjectType: item[`ProjectType`] ? item[`ProjectType`].split(`,`) : [`*`],
            IDDictionary: item[18],
            SkipTemplateForExport: item[`SkipTemplateForExport`] ? item[`SkipTemplateForExport`] : false,
            SortByTemplate: item['SortByTemplate'] ? item['SortByTemplate'] : false,
            style: item[14] && !item[14].startsWith('#') ? { ...JSON.parse(item[14]) } : '',
            template: item[`Template`],
            isPivotGrid: item['isPivotGrid'],
            isImageEditCol: gridColumnCustomConfig?.isImageColEditable?.fields?.includes(item[1]) ? true : false,
            ...({ isDynamicDropdown: gridColumnCustomConfig?.dynamicDropdown?.value[gridColumnCustomConfig?.dynamicDropdown?.field.indexOf(item[1])] }),
            ...({ isDropdownApplicable: gridColumnCustomConfig?.dynamicDropdown?.fillUpDownIsDynamic[gridColumnCustomConfig?.dynamicDropdown?.field.indexOf(item[1])] }),
            ...(gridColumnCustomConfig?.dateSettings && { dateSettings: gridColumnCustomConfig?.dateSettings }),
            ...((gridColumnCustomConfig?.imageValidation && gridColumnCustomConfig?.imageValidation.field === item[1]) && { imageValidation: gridColumnCustomConfig?.imageValidation })
          },
          cellEditorPopup: (item[10] === 'color' || gridColumnCustomConfig?.isImageColEditable?.fields?.includes(item[1])) ? true : false,
          cellEditor: this.getEditComponent(item[10]),
          cellEditorParams: {
            cellRenderer: this.getRendererComponent(item[10]),
            values: this.getCellEditorValues(item[10], item[`Template`], item, gridColumnCustomConfig.dynamicDropdown)
          },
          //If we have Dynamic values for dropdown setting keyCreator for grouping
          ...(gridColumnCustomConfig?.dynamicDropdown?.value && ((gridColumnCustomConfig?.dynamicDropdown?.field??'').includes(item[1])) && {
            keyCreator: (params: KeyCreatorParams) => {
              if (params.column.isRowGroupActive()) {
                if (this.agGridStoreService.dynamicFilterValues.length === 0) {
                  let columnValueArray = this.getColumnValueArray(params)
                  this.agGridStoreService.getFilterValuesForDynamicDropdown(Object.values(params.api['rowModel'].nodeManager.allNodesMap), params?.colDef?.cellRendererParams.template, params?.colDef?.field, columnValueArray);
                }
                const fieldValue = this.agGridStoreService.dynamicFilterValues.find(ele => ele.field == params.colDef.field)
                  .values.find(ele => ele.key === params.value).value;
                return fieldValue;
              } else {
                return params.value;
              }
            }

          }),
          enablePivot: item['enablePivot'],
          enableRowGroup: item['enableRowGroup'],
          pivot: item['pivot'],
          enableValue: item['enableValue'],
          aggFunc: item['aggFunc']
        } as ColDef;
      });
    }
  }

  private formatData(params, template) {
    if (params?.data && template) {
      try {
        if (params?.column.colDef.cellRendererParams.columntype === 'dropdown') {
          return JSON.parse(template).find(x => x.key === params.value).value;
        }
        const temp = eval(String(template).replaceAll('dataItem', 'params.data'));
        return temp;
      } catch (error) {
        return template ? template : params.value;
      }
    }
    return params.value;
  }

  private getType(columnType: string): string {
    let type = 'stringType';
    switch (columnType) {
      case 'number':
      case 'floatneg':
      case 'float':
      case 'numeric':
      case 'integer':
        type = 'numberType'
        break;

      default:
        break;
    }
    return type;
  }

  public getCellEditorValues(columnType: string, template: string, column, dynamicDropdown?: { field: string[], value: boolean[] }): any {
    if (template === '') {
      return null;
    }
    let values;
    switch (columnType) {
      case 'dropdown':
        if (dynamicDropdown?.value && (dynamicDropdown?.field??'').includes(column[1])) {
          values = null;
        } else {
          try {
            values = JSON.parse(template);
          } catch (e) {
            values = null;
          }
        }
        break;
      default:
        break;
    }
    return values;
  }

  private getEditComponent(columnType: string): CellRendererComponent {
    let component;
    switch (columnType) {
      case 'number':
      case 'floatneg':
      case 'float':
      case 'numeric':
      case 'integer':
        component = NumericComponent;
        break;
      case 'dropdown':
        component = DropdownCellEditorComponent;
        break;
      case 'date':
        component = DateComponent;
        break;
      case 'color':
        component = ColorComponent;
        break;
      default:
        component = StringComponent;
        break;
    }
    return component;
  }

  private getRendererComponent(columnType: string): CellRendererComponent {
    let component;
    switch (columnType) {
      case 'dropdown':
        component = DropdownComponent;
        break;
      default:
        component = CellRendererComponent;
        break;
    }
    return component;
  }

  private getFilterParams(columnType: string,
    field: string,
    columnFilters?: { field: string; filterDetails: ISetFilterParams }[],
    dateFormat?: string,
    timeFormat?: string, dynamicDropdown?: { field: string[], value: boolean[] }): { filters: ISetFilterParams[]; } {
    const filters = [];
    if (columnFilters) {
      const filterData = columnFilters.find(x => x.field === field);
      if (filterData) {
        filters.push(filterData.filterDetails);
      }
    } else {
      filters.push({
        filter: 'agSetColumnFilter',
        filterParams: {
          comparator: (a: string, b: string) => {
            switch (columnType) {
              case 'number':
              case 'floatneg':
              case 'float':
              case 'numeric':
              case 'integer':
                return +a - +b
              default:
                return a < b ? -1 : a > b ? 1 : 0;
            }
          },
          values: (params: SetFilterValuesFuncParams) => {
            let columnValueArray = this.getColumnValueArray(params);
            if (params?.colDef?.cellRendererParams.isDynamicDropdown) {
              const filterValues = this.agGridStoreService.getFilterValuesForDynamicDropdown(Object.values(params.api['rowModel'].nodeManager.allNodesMap), params?.colDef?.cellRendererParams.template, params?.colDef?.field, columnValueArray);
              if (filterValues)
                columnValueArray = filterValues;
            }
            return params.success(columnValueArray);
          },
          cellRenderer: CellRendererComponent,
          valueFormatter: columnType == 'date' || columnType == 'datetime' ? (params: ValueFormatterParams) => {
            switch (columnType) {
              case 'date': {
                return this.datePipe.transform(new Date(params.value), dateFormat)
              }
              case 'datetime':
                return this.datePipe.transform(new Date(params.value), dateFormat + timeFormat)
              default:
                return params.value
            }
          } : null,
          refreshValuesOnOpen: true,
          ...(((dynamicDropdown?.field??'').includes(field) && dynamicDropdown?.value) && {
            valueGetter: (params: ValueGetterParams) => {
              let fieldValue = params.data;
              params.colDef.field.split('.').forEach(ele => { fieldValue = fieldValue[ele] });
              fieldValue = this.agGridStoreService.dynamicFilterValues.find(ele => ele.field == params.colDef.field)
                .values.find(ele => ele.key === fieldValue).value;
              return this.agGridStoreService.filterList.find(ele => ele.value === fieldValue).key;
            }
          }),
          ...((columnType === 'boolean' || columnType === 'dropdown') && {
            // text formatter is used to transform the value typed in mini-filter(input textbox in column filter while seraching list in filter/data)
            // We need this when we have yes/No value with columnType boolean
            textFormatter: (value: string) => {
              if (('yes'.includes(value.trim().toLowerCase())) || 'active'.includes(value.trim().toLowerCase())) {
                return 'true';
              }
              if (('no'.includes(value.trim().toLowerCase())) || 'inactive'.includes(value.trim().toLowerCase())) {
                return 'false';
              }
              return value
            }
          })
        }
      });
      switch (columnType) {
        case 'datetime':
        case 'date':
          filters.push(
            {
              filter: 'agDateColumnFilter',
              filterParams: {
                debounceMs: 2000,
                suppressAndOrCondition: true,
                browserDatePicker: true,
                comparator: (filterDate: Date, cellValue: string) => {
                  if (cellValue == null) return -1;
                  return new Date(this.formatDate(new Date(Date.parse((new Date(cellValue).getFullYear() + '-'
                    + (("0" + (new Date(cellValue).getMonth() + 1)).slice(-2)) + '-'
                    + ("0" + new Date(cellValue).getDate()).slice(-2)))).toISOString().split('T')[0])).getTime()
                    - new Date(this.formatDate((new Date(Date.parse((filterDate.getFullYear() + '-'
                      + (("0" + (filterDate.getMonth() + 1)).slice(-2)) + '-'
                      + ("0" + filterDate.getDate()).slice(-2)))).toISOString()).split('T')[0])).getTime();
                },
                buttons: ['reset', 'apply'],
                closeOnApply: true
              },

            }
          )
          break;
        case 'number':
        case 'floatneg':
        case 'float':
        case 'numeric':
        case 'integer':
          filters.push(
            {
              filter: 'agNumberColumnFilter',
              filterParams: {
                numberParser: text => {
                  return text == null ? null : parseFloat(text.replace(',', '.'));
                }
              },

            }
          )
      }
    }
    return { filters: filters };
  }

  private isNumber(type: string): boolean {
    const numberType = ['number', 'floatneg', 'float', 'numeric', 'integer'];
    return numberType.includes(type);
  }

  /**
   *
   * @param params : SetFilterValuesFuncParams or KeyCreatorParams
   * @returns columnValueArray
   */
  private getColumnValueArray(params: SetFilterValuesFuncParams | KeyCreatorParams): any[] {
    const valuesToReplace = ['NULL', 'null', 'Undefined', null, undefined]
    let columnValueArray = Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data']).map((x, i) => params.colDef.field.split('.').reduce((p, c) => p && p[c], Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data'])[i]));
    columnValueArray = columnValueArray = columnValueArray.filter((item, pos) => {
      return columnValueArray.indexOf(item) == pos;
    }).map(ele => valuesToReplace.includes(ele) ? '' : ele);
    return columnValueArray;
  }

  //Check for editable callbacks
  private checkIfEditableCallbackIsRequired(gridColumnCustomConfig: GridColumnCustomConfig, fieldName: string): boolean {
    if (gridColumnCustomConfig?.editableCallbacks?.length) {
      let res = gridColumnCustomConfig?.editableCallbacks?.some(ele => {
        return (ele.fieldsToValidateForCallback.includes(fieldName) || ele.fieldsToValidateForCallback.includes('ALL'));
      });
      return res;
    }
    return false;
  }


  //get editable callback template
  private getEditableCallbackTemplate(gridColumnCustomConfig: GridColumnCustomConfig, fieldName: string): string {
    if (gridColumnCustomConfig?.editableCallbacks?.length) {
      let editableCallback = gridColumnCustomConfig?.editableCallbacks?.filter(ele => {
        return (ele.fieldsToValidateForCallback.includes(fieldName) || ele.fieldsToValidateForCallback.includes('ALL'));
      });
      return editableCallback?.length ? editableCallback[0].editableCallbackTemplate : '';
    }
    return '';
  }

  public formatDate(date: string): string {
    let arr = date.split(/[-/]+/);
    if (date.indexOf('-') !== -1) {
      return arr ? ('0' + arr[1]).slice(-2) + '/' + ('0' + arr[2]).slice(-2) + '/' + arr[0] : null;
    }
    else if (date.indexOf('/') !== -1) {
      return arr ? ('0' + arr[1]).slice(-2) + '/' + ('0' + arr[0]).slice(-2) + '/' + arr[2] : null;
    }
  }

  public updateAgGridColumns(existingColumns: GridColumnSettings[], newColumns: ColDef[]): any[] {
    if (existingColumns) {
      let updatedGrid = newColumns.map((item) => {
        const existingItem = existingColumns.find((x) => x[1] === item[`field`]);
        return {
          0: item[`headerName`],
          1: item[`field`],
          2: item?.cellRendererParams?.orderIndex,
          3: item[`hide`],
          4: item[`locked`],
          5: item[`isactive`],
          6: item[`rowGroup`] ? item[`rowGroup`] : false,
          7: item[`rowGroupIndex`] ? item[`rowGroupIndex`] : 0,
          8: item[`minWidth`],
          9: item[`editable`],
          10: item.cellRendererParams.columntype,
          11: existingItem ? existingItem[11] : ``,
          12:
            item[`sort`]
              ? item[`sort`]
              : ``,
          13: existingItem ? existingItem[13] : ``,
          14: JSON.stringify(item?.cellRendererParams?.style) === '{}' ? '' : JSON.stringify(item?.cellRendererParams?.style),
          15: existingItem ? existingItem[15] : ``,
          16: item[`sortIndex`] ? item[`sortIndex`] : existingItem[16],
          17: existingItem ? existingItem[17] : ``,
          18: existingItem ? existingItem[18] : ``,
          Template: item.cellRendererParams.template ? item.cellRendererParams.template : ``,
          filterTemplate: existingItem ? existingItem[`filterTemplate`] : ``,
          IsMandatory: item.cellRendererParams?.IsMandatory !== undefined ? item.cellRendererParams?.IsMandatory : true,
          ProjectType: item.cellRendererParams.ProjectType
            ? item.cellRendererParams.ProjectType[0] === `*`
              ? null
              : item.cellRendererParams.ProjectType.join(',')
            : null,
          SkipTemplateForExport: item.cellRendererParams.SkipTemplateForExport ? item.cellRendererParams.SkipTemplateForExport : false,
          SortByTemplate: item.cellRendererParams.SortByTemplate,
          enablePivot: item['enablePivot'],
          enableRowGroup: item['enableRowGroup'],
          pivot: item['pivot'],
          enableValue: item['enableValue'],
          aggFunc: item['aggFunc'],
          isPivotGrid: item.cellRendererParams?.isPivotGrid
        };
      });
      return updatedGrid;
    }
  }
}
