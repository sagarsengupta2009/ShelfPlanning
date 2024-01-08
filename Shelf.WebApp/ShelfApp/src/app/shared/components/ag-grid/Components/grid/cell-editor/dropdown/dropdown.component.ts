import { Component } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';
import { AgGridStoreService } from '../../../../services/ag-grid-store.service';

@Component({
  selector: 'shelf-dropdown',
  templateUrl: './dropdown.component.html',
  styleUrls: ['./dropdown.component.scss']
})
export class DropdownComponent implements ICellRendererAngularComp {
  cellValue: string;

  constructor(private readonly agGridStoreService: AgGridStoreService,
    private readonly translate: TranslateService) { }

  public agInit(params: ICellRendererParams): void {
    if (params?.value?.value) {
      this.cellValue = `${params.value.value}`;
    } else {
      const type = typeof params.value;
      if (type === 'boolean') {
        params.value = params.value === true ? 1 : 2;
      }
      let value;
      if (params['template'] && params['template'] !== '' && params.value !== undefined && params.value !== null) {
        const ddlValues = params.colDef?.cellRendererParams?.isDynamicDropdown ?
          eval(String(params.colDef?.cellRendererParams['template']).replaceAll('dataItem', 'params.data')) :
          JSON.parse(params['template']);
        value = ddlValues.find(x => x['key'] === params?.value)?.['value'];
      } else if (params.value && Object.keys(params.value).length === 0 && Array.isArray(params.valueFormatted)) {
        value = params.valueFormatted.find(x => x['key'] === params?.value)?.['value'];
      }
      //Specific language translation for boolean values
      if (type === 'boolean') {
        if (value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.YES.toLowerCase() || value.toLowerCase() === 'yes') {
          this.cellValue = this.agGridStoreService.booleanTranslatedValue.YES
        } else if (value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.NO.toLowerCase() || value.toLowerCase() === 'no') {
          this.cellValue = this.agGridStoreService.booleanTranslatedValue.NO
        } else if (value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.ACTIVE.toLowerCase() || value.toLowerCase() === 'active') {
          this.cellValue = this.agGridStoreService.booleanTranslatedValue.ACTIVE
        } else if (value.toLowerCase() === this.agGridStoreService.booleanTranslatedValue.INACTIVE.toLowerCase() || value.toLowerCase() === 'inactive') {
          this.cellValue = this.agGridStoreService.booleanTranslatedValue.INACTIVE
        }
      } else {
        this.cellValue = value;
      }
    }
  }

  public refresh(params: ICellRendererParams): boolean {
    return false;
  }
}