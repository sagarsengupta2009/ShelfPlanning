import { AfterViewInit, Component } from '@angular/core';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-enterprise';
import { AgGridHelperService } from 'src/app/shared/services';
import { AgGridStoreService } from '../../../../services/ag-grid-store.service';

@Component({
  selector: 'shelf-dropdown-cell-editor',
  templateUrl: './dropdown-cell-editor.component.html',
  styleUrls: ['./dropdown-cell-editor.component.scss']
})
export class DropdownCellEditorComponent implements ICellRendererAngularComp, AfterViewInit {

  constructor(private readonly agGridStoreService: AgGridStoreService,
    private readonly agGridHelperService: AgGridHelperService) { }

  params: ICellRendererParams;
  items: Array<{ value: string, key: number }>;
  selectedItemID: number;
  private type: string
  public agInit(params: ICellRendererParams): void {
    this.params = params;
    this.type = typeof params.value;
    let isEditable: boolean = true;
    if (this.agGridHelperService.isWorksheetGrid()) {
      isEditable = this.agGridHelperService.cellValidation(params);
    }
    if (isEditable) {
      if (typeof params.colDef.cellEditorParams != 'undefined') {
        //Need a deep clone as doing translation for boolean values
        this.items = params.colDef.cellEditorParams.values ? params.colDef.cellEditorParams.values : eval(String(this.params.colDef?.cellRendererParams['template'])?.replaceAll('dataItem', 'this.params.data'));
        if (params.column['colId'].includes(`selectedVersionvalue`)) {
          if (params.data.IDPOGStatusTo && params.data.IDPOGStatusTo.length > 0) {
            this.items = params.data.IDPOGStatusTo.map((ele) => {
              return {
                value: ele.Name,
                key: ele.Value,
              };
            });
          } else {
            this.items = [];
          }
        }
      }

      if (this.type === 'boolean') {
        params.value = params.value === true ? 1 : 2;
        this.items.forEach(ele => {
          if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.YES.toLowerCase() || ele.value.toLowerCase() === 'yes') {
            this.agGridStoreService.booleanTranslatedValue.YES
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.NO.toLowerCase() || ele.value.toLowerCase() === 'no') {
            this.agGridStoreService.booleanTranslatedValue.NO
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.ACTIVE.toLowerCase() || ele.value.toLowerCase() === 'active') {
            this.agGridStoreService.booleanTranslatedValue.ACTIVE
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.INACTIVE.toLowerCase() || ele.value.toLowerCase() === 'inactive') {
            this.agGridStoreService.booleanTranslatedValue.INACTIVE
          }
        });
      }
      if (params.value === null) {
        this.selectedItemID = -1;
      } else {
        this.selectedItemID = this.type === 'object' && params.value.key ? params.value.key : params.value;
      }
      // this.selectedItemID = this.type === 'object' && params.value.key ? params.value.key : params.value;
    } else {
      if (this.type === 'boolean') {
        params.value = params.value === true ? 1 : 2;
        this.items?.forEach(ele => {
          if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.YES.toLowerCase() || ele.value.toLowerCase() === 'yes') {
            this.agGridStoreService.booleanTranslatedValue.YES
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.NO.toLowerCase() || ele.value.toLowerCase() === 'no') {
            this.agGridStoreService.booleanTranslatedValue.NO
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.ACTIVE.toLowerCase() || ele.value.toLowerCase() === 'active') {
            this.agGridStoreService.booleanTranslatedValue.ACTIVE
          } else if (ele.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.INACTIVE.toLowerCase() || ele.value.toLowerCase() === 'inactive') {
            this.agGridStoreService.booleanTranslatedValue.INACTIVE
          }
        });
      }
      if (params.value === null) {
        this.selectedItemID = -1;
      } else {
        this.selectedItemID = this.type === 'object' && params.value.key ? params.value.key : params.value;
      }
    }
  }
  public ngAfterViewInit(): void {
    setTimeout(() => {
      const selectedElement = document.querySelector('.dropDownListSelectedItem');
      if (selectedElement) {
        selectedElement.scrollIntoView(true);
      }
    });
  }
  public selectItem(id): void {
    //  When the user selects an item in our drop down list,
    //  we'll store their selection, and ask
    //  agGrid to stop editing (so our drop down list disappears)
    this.selectedItemID = id;
    this.params.api.stopEditing();
    //Below code is added to to set the focus on Grid after dropdown value changed
    let cell = this.params.api.getFocusedCell();
    if (cell) {
      this.params.api.setFocusedCell(cell.rowIndex, cell.column);
    }
  }
  public getValue(): { value: string, key: number } | number | boolean {
    //  This gets called by agGrid when it closes the DatePicker control.
    //  agGrid uses it to get the final selected value.
    let dropDownValues: { key: number, value: string }[] = [];
    if (this.params.colDef?.cellRendererParams?.isDynamicDropdown) {
      dropDownValues = eval(String(this.params.colDef?.cellRendererParams['template'])?.replaceAll('dataItem', 'this.params.data'));
    } else {
      dropDownValues = this.params.colDef.cellEditorParams.values
    }
    let selectedValue = dropDownValues?.find(ele => ele.key === this.selectedItemID);
    if (!selectedValue) {
      selectedValue = this.params.colDef.cellEditorParams.values?.find(ele => ele.key === this.params.value)
    }
    if (selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.YES.toLowerCase() || selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.NO.toLowerCase()) {
      if (selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.YES.toLowerCase()) {
        selectedValue.value = this.agGridStoreService.booleanTranslatedValue.YES
      } else if (selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.NO.toLowerCase()) {
        selectedValue.value = this.agGridStoreService.booleanTranslatedValue.NO
      } else if (selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.ACTIVE.toLowerCase()) {
        selectedValue.value = this.agGridStoreService.booleanTranslatedValue.ACTIVE
      } else if (selectedValue?.value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.INACTIVE.toLowerCase()) {
        selectedValue.value = this.agGridStoreService.booleanTranslatedValue.INACTIVE
      }
    }
    if (this.params.colDef?.cellRendererParams?.isDynamicDropdown) {
      return selectedValue?.key;
    }
    if (this.type === 'boolean') {
      return selectedValue.key === 1 ? true : false;
    } else {
      return selectedValue ? selectedValue.key : selectedValue
    }
  }
  public getStyle(): { width: string } {
    return {
      'width': `${this.params?.column?.getActualWidth()}px`
    }
  }
  public isPopup(): boolean {
    //  We MUST tell agGrid that this is a popup control, to make it display properly.
    return true;
  }
  public refresh(params: ICellRendererParams): boolean {
    return true;
  }
  public trackById(index, item): number {
    return item.key;
  }
}
