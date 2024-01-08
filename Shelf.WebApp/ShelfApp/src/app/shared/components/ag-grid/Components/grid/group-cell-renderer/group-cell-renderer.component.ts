import { DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from 'src/app/shared/services';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'shelf-group-cell-renderer',
  templateUrl: './group-cell-renderer.component.html',
  styleUrls: ['./group-cell-renderer.component.scss']
})
export class GroupCellRendererComponent implements ICellRendererAngularComp {

  public cellValue: string;
  public param: any;
  public headerName: string;
  //For templated column eveluation, we need this service injection
  constructor(private readonly datePipe: DatePipe, private readonly translate: TranslateService, private readonly languageService: LanguageService) {
  }
  // gets called once before the renderer is used
  public agInit(params: ICellRendererParams): void {
    this.param = params;

    this.headerName = params?.node?.rowGroupColumn?.getColDef().headerName;
    this.cellValue = this.getValueToDisplayForRowGroup(params);
  }

  public refresh(params: ICellRendererParams): boolean {
    // set value into cell again
    this.cellValue = this.getValueToDisplayForRowGroup(params);
    return true;
  }

  public getValueToDisplayForRowGroup(params: ICellRendererParams): string {
    return this.formatGroupHeaderRow(params, params?.node?.rowGroupColumn?.getColDef(), params?.node?.rowGroupColumn?.getColDef().cellRendererParams?.template, params.node.allLeafChildren[0].data);
  }
  private formatGroupHeaderRow(params, colDef, template, data): string {
    if (data && template) {
      try {
        if (colDef.cellRendererParams?.columntype.includes('custom')) {
          let temp;
          if (template.includes('params.data')) {
            temp = eval(String(template).replaceAll('params.data', 'params.node.allLeafChildren[0].data'));
          } else {
            temp = eval(String(template).replaceAll('dataItem', 'data'));
          }
          if (temp === true || temp === false) {
            temp = temp ? 'Yes' : 'No';
          }
          return temp;
        }
        return params.value;
      } catch (error) {
        return template ? template : params.value;
      }
    }
    return params.value;
  }

}
