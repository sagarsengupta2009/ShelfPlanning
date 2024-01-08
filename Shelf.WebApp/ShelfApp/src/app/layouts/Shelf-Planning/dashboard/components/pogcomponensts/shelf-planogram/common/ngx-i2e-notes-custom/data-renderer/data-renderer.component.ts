import { Component, OnInit } from '@angular/core';
import { IntlService } from '@progress/kendo-angular-intl';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'lib-data-renderer',
  templateUrl: './data-renderer.component.html'
})
export class DataRendererComponent implements ICellRendererAngularComp {

  public cellValue: string = '';
  public param!: ICellRendererParams & { isAlert: number };
  public isAlert: boolean=true;

  constructor(private intl: IntlService) {}

  refresh(params: ICellRendererParams): boolean {
    this.cellValue = this.getValueToDisplay(params);
    return true;
  }

  agInit(params: ICellRendererParams & { isAlert: number }): void {
    this.param = params;
    this.isAlert = params.isAlert === 1? true: false;
    this.cellValue = this.getValueToDisplay(params);
  }

  public getValueToDisplay(params: ICellRendererParams): string {
    return params.value
  }

}
