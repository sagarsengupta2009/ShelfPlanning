import { DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-enterprise';

@Component({
  selector: 'shelf-date',
  templateUrl: './date.component.html',
  styleUrls: ['./date.component.scss']
})
export class DateComponent implements ICellEditorAngularComp {

  public value!: string;
  public maxDate: string;
  public minDate: string;
  constructor(private datePipe: DatePipe) { }

  public agInit(params: ICellEditorParams): void {
    //Check whether the date string value is valid or not
    if (!Date.parse(params.value)) {
      const dateEle = params.value.split('/');
      this.value = new Date(dateEle[2], dateEle[1] - 1, dateEle[0]).toString();
    } else {
      this.value = params.value;
    }
    if (params.colDef.cellRendererParams?.dateSettings?.minDate) {
      this.minDate = this.datePipe.transform(params.colDef.cellRendererParams?.dateSettings?.minDate, 'yyyy-MM-dd');
    }
    if (params.colDef.cellRendererParams?.dateSettings?.maxDate) {
      this.maxDate = this.datePipe.transform(params.colDef.cellRendererParams?.dateSettings?.maxDate, 'yyyy-MM-dd');
    }
  }

  // the final value to send to the grid, on completion of editing
  public getValue() {
    return this.value;
  }

  // Gets called once when editing is finished (eg if Enter is pressed).
  // If you return true, then the result of the edit will be ignored.
  public isCancelAfterEnd(): boolean {
    // our editor will reject any value greater than 1000
    return false;
  }

  public valueChanged(event): void {
    if ((this.minDate && this.minDate > event.target.value) || (this.maxDate && this.maxDate < event.target.value)) {
      return;
    }
    this.value = this.datePipe.transform(event.target.value, 'MM/dd/yyyy');
  }

}