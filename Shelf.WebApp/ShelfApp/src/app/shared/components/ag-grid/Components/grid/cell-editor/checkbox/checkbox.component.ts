import { Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

@Component({
  selector: 'shelf-checkbox',
  templateUrl: './checkbox.component.html',
  styleUrls: ['./checkbox.component.scss']
})
export class CheckboxComponent implements ICellRendererAngularComp {
  private params!: ICellRendererParams;
  public isChecked: boolean = false;
  public isDisabled: boolean = false;

  public agInit(params: ICellRendererParams): void {
    this.params = params;
    const selectedRows = params.api.getSelectedRows();
    if (selectedRows?.length) {
      this.isChecked = selectedRows.some(x => x.id === params.data.id);
    } else {
      this.isChecked = false;
    }

    this.isDisabled = eval(String('dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded').replaceAll('dataItem', 'params.data'));
  }

  public checkedHandler(event): void {
    let checked = event.target.firstElementChild.checked;
    let colId = this.params.column['colId'];
    this.params.node.setDataValue(colId, checked);
  }
  public refresh(params: ICellRendererParams): boolean {
    return true;
  }
}
