import { Component, ElementRef } from "@angular/core";
import { IHeaderParams } from 'ag-grid-community';
import { IHeaderAngularComp } from 'ag-grid-angular';

export interface ICustomHeaderParams {
  headerType: string;
  data: any;
}

@Component({
  selector: 'shelf-custom-header',
  templateUrl: './custom-header.component.html',
  styleUrls: ['./custom-header.component.scss']
})
export class CustomHeaderComponent implements IHeaderAngularComp {

  public params!: IHeaderParams & ICustomHeaderParams;
  public iconName: string;
  public iconColor: string;

  constructor(elementRef: ElementRef) { }

  agInit(params: IHeaderParams & ICustomHeaderParams): void {
    this.params = params;
    
    if(this.params.headerType === 'icon'){
      this.iconName = this.params.data.iconName;
      this.iconColor = this.params.data.iconColor;
    }
  }

  public refresh(params: IHeaderParams): boolean {
    return true;
  }
}