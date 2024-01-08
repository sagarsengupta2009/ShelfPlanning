import { Pipe, PipeTransform } from '@angular/core';
import { IntlService } from '@progress/kendo-angular-intl';
import { AppConstantSpace } from 'src/app/shared/constants';
import { LanguageService } from './../../services';

@Pipe({
  name: 'formatColumn'
})
export class GridColumnFormatterPipe implements PipeTransform {

  private skeletonFormat: string;
  private skeletonHourFormat: string;

  constructor(
    private readonly intl: IntlService,
    private readonly languageService: LanguageService,
  ) {
    this.skeletonFormat = this.languageService.getDateFormat();
    this.skeletonHourFormat = " " + this.languageService.getTimeFormat();
  }

  public transform(value: any, column: any, format: string = 'html', filter?: boolean): string {
    let returnValue = value;
    if (value === undefined || value === null || value === 'NULL' || value === 'null' || value === '') { return ''; }
    if (!column) { return value; }
    switch (column.type.toLowerCase()) {
      case 'string':
        returnValue = `<div style='text-align:left'>${value}</div>`;
        break;
      case 'number':
      case 'long':
        if (isNaN(Number(value))) {
          returnValue = `<div style='text-align:right;'>${value}</div>`;
        } else {
          if (Number(value) === 0 && column.filter) {
            returnValue = `<div style='text-align:right;'>${parseInt(value)}</div>`;
          } else {
            returnValue = `<div style='text-align:right;display:${Number(value) === 0 ? 0 : ''}'>${parseInt(value)}</div>`;
          }
        }
        break;
      case 'float':
        returnValue = `<div style='text-align:right;display:${Number(value) === 0 ? 0 : ''}'>${Number(value).toFixed(2)}</div>`;
        break;
      case 'floatneg':
        returnValue = `<div style='text-align:right;display:${Number(value) === 0 ? 0 : ''}'>${Number(value).toFixed(2)}</div>`;
        break;
      case 'date':
        returnValue = `<div style='text-align:left'>${this.intl.formatDate(new Date(value), this.skeletonFormat)}</div>`;
        break;
      case 'datetime':
        returnValue = `<div style='text-align:left'>${this.intl.formatDate(new Date(value), this.skeletonFormat + this.skeletonHourFormat)}</div>`;
        break;
      case 'time':
        returnValue = `<div style='text-align:left'>${this.intl.formatDate(new Date(value), this.skeletonFormat)}</div>`;
        break;
      case 'boolean':
        returnValue = `${value ? 'Yes' : 'No'}`;
        break;
      case 'custom':
        returnValue = value;
        break;
      case 'dropdown':
        if (column[`templateDummy`] && column[`templateDummy`] !== ``) {
          const obj = JSON.parse(column[`templateDummy`]);
          returnValue = obj.find(x => x[`key`] === value)[`value`];
        } else {
          returnValue = value;
        }
        break;
      case 'percent':
        returnValue = `${value ? `${value}%` : ''}`;
        break;
      case 'color':
        returnValue = '<div style = "padding-left : 70px;min-height: 14px; background-color : ' + value + '" >';
        break;
      default:
        break;
    }
    if (column.field == 'minBlockLinear') {
      let isNumericValue = false;
      if (Number(value.replace('%', '') > 0)) { isNumericValue = true; }
      returnValue = `${value === '-1' ? 'From Model' : (Number(value.replace('%', '')) === 0 ? 'Auto' : value)}`;
      if (isNumericValue) {
        returnValue = `<div style='text-align:right' > ${returnValue} </div>`;
      }
    }
    if (format == 'plain') {
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
    } else if (format == 'plainExcel') {
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
