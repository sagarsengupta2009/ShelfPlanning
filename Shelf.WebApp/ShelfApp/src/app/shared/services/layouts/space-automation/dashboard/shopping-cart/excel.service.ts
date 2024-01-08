import { Injectable } from '@angular/core';
import * as FileSaver from 'file-saver';
import * as XLSX from 'xlsx-js-style';
import * as _  from 'lodash';
import { DatePipe } from '@angular/common';

const EXCEL_TYPE = 'application/vnd.ms-excel';
const EXCEL_EXTENSION = '.xlsx';

@Injectable({
  providedIn: 'root'
})
export class ExcelService {
  constructor(
    private readonly pipe: DatePipe,
  ) { }

  public exportAsExcelFile(json: any[], excelFileName: string): void {
    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet(json);
    const wb: XLSX.WorkBook = XLSX.utils.book_new();

    const header = Object.keys(json[0]); // columns name
    ws['!cols'] = this.fitToColumn(json);
    
    _.forEach(ws, (v, c) => {
      if (c !== '!ref') {
        if (c !== '!cols') {
          if (c.match(/\d+/g).map(Number)[0] === 1) {
            if (header.indexOf(v.v) >= 0) {
              ws[c]['s'] = {
                fill: {
                  patternType: 'solid', // none or solid
                  fgColor: { rgb: '4E9698' }
                },
                font: { color: { rgb: "eeeeee" } }
              }
            }
          }
        }
      }
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Cart');
    const excelBuffer: any = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    this.saveAsExcelFile(excelBuffer, excelFileName);
  }

  private fitToColumn(json: any[]) {
    // get maximum character of each column
    const columnWidths = [];
    for (const property in json[0]) {
        columnWidths.push({
            wch: Math.max(property ? property.toString().length + 5 : 0, ...json.map(obj => obj[property] ? obj[property].toString().length + 5 : 0))
        });
    }
    return columnWidths;
}

  private saveAsExcelFile(buffer: any, fileName: string): void {
    const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });
    FileSaver.saveAs(data, 'POG' + fileName + '_CARTDETAILS_' + (this.pipe.transform(new Date(), 'ddMMMyyyy', 'en-US')).toUpperCase() + EXCEL_EXTENSION);
  }
}