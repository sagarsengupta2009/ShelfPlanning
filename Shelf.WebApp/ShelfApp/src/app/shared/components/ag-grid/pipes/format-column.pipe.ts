import { DatePipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';
import { ICellRendererParams } from 'ag-grid-enterprise';
import { AppConstantSpace } from 'src/app/shared/constants';
import { LanguageService } from 'src/app/shared/services';
import { TranslateService } from '@ngx-translate/core';
import { AgGridStoreService } from '../services/ag-grid-store.service';

@Pipe({
  name: 'formatAgColumn'
})
export class AGGridColumnFormatterPipe implements PipeTransform {

  private skeletonFormat: string;
  private skeletonHourFormat: string;

  constructor(
    private readonly languageService: LanguageService,
    private readonly datePipe: DatePipe,
    private readonly translate: TranslateService,
    private readonly agGridStoreService: AgGridStoreService
  ) {
    this.skeletonFormat = this.languageService.getDateFormat();
    this.skeletonHourFormat = " " + this.languageService.getTimeFormat();
  }

  public transform(value: any, column: ICellRendererParams, format: string = 'html', filter?: boolean): string {
    let returnValue = value;
    if (value === undefined || value === null || value === 'NULL' || value === 'null' || value === '' || String(value) === 'NaN') { return ''; }
    if (returnValue === this.translate.instant('SELECTALL')) return returnValue;
    let columnType = '';
    let template = ''
    if (column?.node?.group) {
      columnType = column?.node?.rowGroupColumn?.getColDef()?.cellRendererParams?.columntype;
      template = column?.node?.rowGroupColumn?.getColDef().cellRendererParams?.template;
    } else {
      columnType = column?.colDef?.cellRendererParams?.columntype;
      template = column?.colDef?.cellRendererParams?.template
    }
    if (!columnType) { return value; }
    switch (columnType.toLowerCase()) {
      case 'string':
        returnValue = `<span style='text-align:left'>${value}</span>`;
        break;
      case 'number':
      case 'long':
        if (isNaN(Number(value))) {
          returnValue = `<span style='text-align:right;'>${value}</span>`;
        } else {
          //TODO: @pranita need to check this filter logic
          // if (Number(value) === 0 && column.filter) {
          //   returnValue = `<span style='text-align:right;'>${parseInt(value)}</span>`;
          // } else {
          //   returnValue = `<span style='text-align:right;display:${Number(value) === 0 ? 0 : ''}'>${parseInt(value)}</span>`;
          // }
        }
        break;
      case 'float':
      case 'floatneg':
        returnValue = `<span style='text-align:right;display:${Number(value) === 0 ? 0 : ''}'>${Number(value).toFixed(2)}</span>`;
        break;
      case 'date':
      case 'time':
        try {
          returnValue = `<div style='text-align:left'>${this.datePipe.transform(new Date(value), this.skeletonFormat)}</div>`;
        } catch (e) {
          returnValue = `<div style='text-align:left'>${value}</div>`;
        }
        break;
      case 'datetime':
        returnValue = `<div style='text-align:left;display:inline-block'>${this.datePipe.transform(new Date(value), this.skeletonFormat + this.skeletonHourFormat)}</div>`;
        break;
      case 'boolean':
        if (typeof value === 'string') {
          returnValue = `${value.toLocaleLowerCase() === 'true' ? this.translate.instant('YES') : this.translate.instant('NO')}`;
        } else {
          returnValue = `${value ? this.translate.instant('YES') : this.translate.instant('NO')}`;
        }
        break;
      case 'customaction':
        returnValue = `<div style="text-align:center;">${value}</div>`;
        break;
      case 'custom':
        returnValue = value;
        break;
      case 'dropdown':
        if (template && template !== ``) {
          let obj: {key: number, value: string}[] = [];
          if (!column?.node?.rowGroupColumn?.getColDef().cellRendererParams.isDynamicDropdown) {
            if (column?.colDef?.cellRendererParams?.isDynamicDropdown) {
              obj = column.data ? eval(String(template).replaceAll('dataItem', 'column.data')) : this.agGridStoreService.dynamicFilterValues?.find(ele => ele.field == column.colDef.field)["values"]
            } else {
              obj = JSON.parse(template);
            }
          }
          if (value === 'true' || value === 'false') {
            value = value === 'false' ? 2 : 1;
          }
          //if the value is 0 and Number(value) returns 0 then if condition returns false as true and false will be false, so added extra check for 0
          if (typeof value === 'string' && (Number(value) || Number(value) === 0)) {
            value = Number(value);
          }
          if (!Number(value) && value !== 0) {
            returnValue = value;
          } else {
            let cellVal = obj.find((x: any) => x[`key`] === value);
            if (cellVal === undefined) {
              returnValue = null;
            } else {
              returnValue = cellVal.value;
            }
          }
        } else {
          returnValue = value;
        }
        break;
      case 'percent':
        returnValue = `${value ? `${value}%` : ''}`;
        break;
      case 'color':
        returnValue = `<div style = "min-height: 25px;margin-top: 9%; width:75px; background-color :${value}" ></div>`;
        break;
      default:
        break;
    }
    if (typeof returnValue === 'string' && returnValue.includes('mat-icon')) {
      returnValue = `<span style='text-align:center'>${returnValue}</span>`
    }
    if (format == 'plainExcel' && typeof returnValue === 'string') {
      // remove html values
      if (returnValue.indexOf('unFavorite') !== -1) {
        returnValue = returnValue.replace(/<[^>]*>/g, '');
        returnValue = returnValue.replace('push_pin', 'No');
      } if (returnValue.indexOf('Favorite') !== -1) {
        returnValue = returnValue.replace(/<[^>]*>/g, '');
        returnValue = returnValue.replace('push_pin', 'Yes');
      } if (returnValue.indexOf('unload') !== -1) {
        returnValue = returnValue.replace(/<[^>]*>/g, '');
        returnValue = returnValue.replace('cloud_download', 'Yes');
      } if (returnValue.indexOf('load') !== -1) {
        returnValue = returnValue.replace(/<[^>]*>/g, '');
        returnValue = returnValue.replace('cloud_download', 'No');
      }
      if (returnValue.indexOf('visibility') !== -1) {
        returnValue = returnValue.replace(/<[^>]*>/g, '');
        returnValue = returnValue.replace('visibility', 'Completed');
      }
      returnValue = returnValue.replace(/<[^>]*>/g, '');

      //removing icon name
      if (returnValue.indexOf('cloud_done') !== -1) {
        returnValue = returnValue.replace('cloud_done', '');
      } if (returnValue.indexOf('cloud_off') !== -1) {
        returnValue = returnValue.replace('cloud_off', '');
      } if (returnValue.indexOf('autorenew') !== -1) {
        returnValue = returnValue.replace('autorenew', '');
      } if (returnValue.indexOf('thumb_up') !== -1) {
        returnValue = returnValue.replace('thumb_up', '');
      } if (returnValue.indexOf('clear') !== -1) {
        returnValue = returnValue.replace('clear', '');
      } if (returnValue.indexOf('done') !== -1) {
        returnValue = returnValue.replace('done', '');
      }
      returnValue = returnValue.replace(/<[^>]*>/g, '');
      if (returnValue == 'file_downloadpicture_as_pdfCompleted') {
        returnValue = returnValue.replace('file_download', '');
      }
      const arr = ['cloud_off', 'cloud_done', 'file_download', 'picture_as_pdf'];
      if (arr.some(substring => returnValue.includes(substring))) {
        returnValue = returnValue.replace(arr.find(substring => returnValue.includes(substring)), '');
      }
    }
    return returnValue;
  }
}
