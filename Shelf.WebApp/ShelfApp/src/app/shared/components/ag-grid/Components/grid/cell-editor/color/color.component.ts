import { AfterViewInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-enterprise';
import { COLOR_PALETTE } from 'src/app/shared/constants';

@Component({
  selector: 'shelf-color',
  templateUrl: './color.component.html',
  styleUrls: ['./color.component.scss']
})
export class ColorComponent implements ICellEditorAngularComp, AfterViewInit {
  public gradientSettings = {
    opacity: false,
  };
  public paletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE,
  };
  public view = "palette";
  public format = "hex";
  private params!: ICellEditorParams;
  public value!: string;
  @ViewChild('input', { read: ViewContainerRef }) public input: ViewContainerRef;
  constructor() { }

  ngAfterViewInit() {
    // focus on the input
    setTimeout(() => {
      this.input.element.nativeElement.click();
      this.input.element.nativeElement.focus();
    });
  }
  public agInit(params: ICellEditorParams): void {
    this.params = params;
    this.value =  params.value;//`${eval(params.colDef.cellRendererParams.template.replace('dataItem', 'params.data'))}`;
  }

  /* Component Editor Lifecycle methods */
  // the final value to send to the grid, on completion of editing
  public getValue() {
    return this.value;
  }

  // Gets called once before editing starts, to give editor a chance to
  // cancel the editing before it even starts.
  public isCancelBeforeStart(): boolean {
    return false;
  }

  // Gets called once when editing is finished (eg if Enter is pressed).
  // If you return true, then the result of the edit will be ignored.
  public isCancelAfterEnd(): boolean {
    // our editor will reject any value greater than 1000
    return false;
  }
  public valueChanged($event): void {
    this.value = $event;
  }
  public onBlur(): void {
    this.params.api.stopEditing();
  }
  public isPopup(): boolean {
    return true;
  }
}
