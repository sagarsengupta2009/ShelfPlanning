import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/services';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-enterprise';
import { ConfigService } from 'src/app/shared/services';

@Component({
  selector: 'lib-cell-renderer',
  templateUrl: './cell-renderer.component.html'
})
export class CellRendererComponent implements ICellRendererAngularComp {

  constructor(
    private readonly config: ConfigService,
    private readonly datePipe: DatePipe,
    private readonly translate: TranslateService,
    private readonly languageService: LanguageService) {
  }
  public cellValue: string;
  public param: any;
  // gets called once before the renderer is used
  public agInit(params: ICellRendererParams): void {
    this.param = params;
    if (params['isPivotGrid']) {
      this.cellValue = this.getValueToDisplayPivotGrid(params);
    } else {
      this.cellValue = this.getValueToDisplay(params);
    }
    if (this.param.colDef.headerName === "Image") {
      setTimeout(() => { //handle broken image scenario
        document.querySelectorAll('.img').forEach((item) => {
          item.addEventListener('error', (event: any) => {
            event.target.setAttribute('src', `${this.config?.deploymentPath}/assets/images/errors/brokenImage.png`)
          }), { once: true };
        });
      }, 10);
    }
  }

  // gets called whenever the cell refreshes
  public refresh(params: ICellRendererParams): boolean {
    // set value into cell again
    if (params['isPivotGrid']) {
      this.cellValue = this.getValueToDisplayPivotGrid(params);
    } else {
      this.cellValue = this.getValueToDisplay(params);
    }
    return true;
  }

  public getValueToDisplay(params: ICellRendererParams): string {
    if (!params.data && params.value && params.value !== "(Select All)" && !params.api['infiniteRowModel']) {
      const columnValueArray = Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data']).map((x, i) => params.colDef.field.split('.').reduce((p, c) => p && p[c], Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data'])[i]));
      if (columnValueArray?.length) {
        let ind = -1;
        if ((params.colDef.cellRendererParams?.['columntype'].includes('custom')) || (params.colDef.cellRendererParams?.['columntype'].includes('customAction'))) {
          ind = columnValueArray.findIndex(z => z.toString() === params.value.toString());
        } else {
          ind = columnValueArray.findIndex(z => z === params.value);
        }
        if (ind !== -1) {
          params.data = Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data'])[ind];
        }
      }
    }
    if (params?.data && params.colDef.cellRendererParams?.['template'] && ((params.colDef.cellRendererParams?.['columntype'].includes('custom')) || (params.colDef.cellRendererParams?.['columntype'].includes('customAction')))) {
      try {
        if (params.colDef.cellRendererParams.isImageEditCol && params.value && typeof (params.value) === 'object') {
          //Handle this code when image is updated
          let data = JSON.parse(JSON.stringify(params.data));          
          data[params.colDef.field] = params.value.content; //Need to change the code if field is in hierarchya format, for single level it can be used.
          let temp = eval(String(params.colDef.cellRendererParams['template']).replaceAll('dataItem', 'data'));
          return temp;
        } else {
          let temp = eval(String(params.colDef.cellRendererParams['template']).replaceAll('dataItem', 'params.data'));
          //If template have checked directive added and and row is not selected still its showing checkbox selected
          //Added this to remove checked directive if row in not selected
          //This should work only for the checkboxes which didn't have default value as checked (like this is for anchor sync pog grid is checkboxes didn't have default value)
          if (temp.includes('type="checkbox"') && !temp.includes('disabled') && this.isNumeric(params.colDef.headerName)) {
            if (!params.node.isSelected()) {
              temp = temp.replace('checked', '');
            }
          }
          return temp;
        }
      } catch (error) {
        return params.colDef.cellRendererParams['template'] ? params.colDef.cellRendererParams['template'] : params.value;
      }
    }
    if (params.api['infiniteRowModel']) {
      let setColumnFilter = params.colDef?.filterParams?.filters?.find(x => x.filter === 'agSetColumnFilter');
      let filterTemplate = setColumnFilter?.filterParams?.filterTemplate;
      if (filterTemplate) {
        try {
          let template = eval(String(filterTemplate).replaceAll('dataItem', 'params.value'));
          return template;
        } catch (error) {
          return params.value;
        }
      }
    }
    return params.value;
  }

  public getValueToDisplayPivotGrid(params: ICellRendererParams): string {
    //Handling in case of pivot grid
    if (params?.value && typeof params?.value === 'object') {
      if (Object.keys(params?.value).length === 0) {
        return '';
      } else {
        return params.value;
      }
    }
    return params.value;
  }
  //Check whether is the string value is number 
  private isNumeric(val) {
    return /^-?\d+$/.test(val);
  }
  
}
