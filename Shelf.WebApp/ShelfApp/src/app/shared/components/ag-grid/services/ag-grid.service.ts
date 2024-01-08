import { DatePipe } from '@angular/common';
import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Column, ColumnApi, GridApi, IHeaderColumn, RowNode } from 'ag-grid-enterprise';
import { LanguageService } from 'src/app/shared/services';
import { DOC_DEFINATIONS, PDF_PARAMS } from '../models';
import { AGGridColumnFormatterPipe } from '../pipes/format-column.pipe';
@Injectable({
  providedIn: 'root'
})
export class AgGridService {
  //For templated column eveluation, we need this service injection(DatePipe,TranslateService,LanguageService)
  constructor(
    private readonly pipe: AGGridColumnFormatterPipe,
    private readonly datePipe: DatePipe,
    private readonly translate: TranslateService,
    private readonly languageService: LanguageService
  ) { }

  public lightenDarkenColor(col: string): string {
    let hex = col;
    if (col.indexOf('#') === 0) {
      hex = hex.slice(1);
    } else {
      hex = this.rgba2hex(col);
    }
    if (hex.length === 3) {
      hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length > 6) {
      hex = hex.slice(0, 6);
    }
    const r = parseInt(hex.slice(0, 2), 16),
      g = parseInt(hex.slice(2, 4), 16),
      b = parseInt(hex.slice(4, 6), 16);
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#656565' : '#FFFFFF';
  }

  private rgba2hex(orig): any {
    let a,
      rgb = orig.replace(/\s/g, '').match(/^rgba?\((\d+),(\d+),(\d+),?([^,\s)]+)?/i),
      alpha = ((rgb && rgb[4]) || '').trim(),
      hex = rgb
        ? (rgb[1] | (1 << 8)).toString(16).slice(1) +
        (rgb[2] | (1 << 8)).toString(16).slice(1) +
        (rgb[3] | (1 << 8)).toString(16).slice(1)
        : orig;

    if (alpha !== '') {
      a = alpha;
    } else {
      a = 0o1;
    }
    // multiply before convert to HEX
    a = ((a * 255) | (1 << 8)).toString(16).slice(1);
    hex = hex + a;

    return hex;
  }

  public isNumber(type: string): boolean {
    const numberType = ['number', 'floatneg', 'float', 'numeric', 'integer'];
    return numberType.includes(type);
  }

  public formatGroupHeaderRow(params, template, data): string {
    if (data && template) {
      try {
        if (String(params.node.key) === 'NaN') {
          params.node.key = null;
        }
        if (params?.node?.rowGroupColumn.colDef?.cellRendererParams?.columntype === 'dropdown') {
          if (params.node.key === 'false' || params.node.key === 'true') {
            params.node.key = (params.node.key === true || params.node.key === 'true') ? 1 : 2;
          }
          const value = JSON.parse(template).find(x => x.key.toString() === params.node.key.toString()).value;
          return `${params?.node?.rowGroupColumn?.colDef?.headerName}: ${value}`;
        }
        let temp = eval(String(template).replaceAll('dataItem', 'data'));
        temp = this.pipe.transform(temp, params, 'plainExcel');
        return `${params?.node?.rowGroupColumn?.colDef?.headerName}: ${temp}`;
      } catch (error) {
        return `${params?.node?.rowGroupColumn?.colDef?.headerName}: ${this.pipe.transform(params.node.key, params, 'plainExcel')}`;
      }
    }
    return `${params?.node?.rowGroupColumn?.colDef?.headerName}: ${params.node.key}`;
  }

  //This method is used for export to PDF, Uses as is from reference, will revisit to refactor
  public getDocDefinition(printParams: PDF_PARAMS, agGridApi: GridApi, agGridColumnApi: ColumnApi): DOC_DEFINATIONS {
    const {
      PDF_HEADER_COLOR,
      PDF_INNER_BORDER_COLOR,
      PDF_OUTER_BORDER_COLOR,
      PDF_ODD_BKG_COLOR,
      PDF_EVEN_BKG_COLOR,
      PDF_HEADER_HEIGHT,
      PDF_ROW_HEIGHT,
      PDF_PAGE_ORITENTATION,
      PDF_WITH_CELL_FORMATTING,
      PDF_WITH_COLUMNS_AS_LINKS,
      PDF_SELECTED_ROWS_ONLY,
      PDF_WITH_HEADER_IMAGE,
      PDF_WITH_FOOTER_PAGE_COUNT,
      PDF_LOGO
    } = printParams;

    return ((): DOC_DEFINATIONS => {

      const getColumnGroupsToExport = (): IHeaderColumn[] | null => {
        let displayedColumnGroups = agGridColumnApi.getAllDisplayedColumnGroups();

        let isColumnGrouping = displayedColumnGroups.some(col =>
          col.hasOwnProperty("children")
        );

        if (!isColumnGrouping) {
          return null;
        }

        let columnGroupsToExport = [];

        displayedColumnGroups.forEach(colGroup => {
          let isColSpanning = colGroup['children'].length > 1;
          let numberOfEmptyHeaderCellsToAdd = 0;

          if (isColSpanning) {
            let headerCell = createHeaderCell(colGroup);
            columnGroupsToExport.push(headerCell);
            // subtract 1 as the column group counts as a header
            numberOfEmptyHeaderCellsToAdd--;
          }

          // add an empty header cell now for every column being spanned
          colGroup['displayedChildren'].forEach(childCol => {
            let pdfExportOptions = getPdfExportOptions(childCol.getColId());
            if (!pdfExportOptions || !pdfExportOptions.skipColumn) {
              numberOfEmptyHeaderCellsToAdd++;
            }
          });

          for (let i = 0; i < numberOfEmptyHeaderCellsToAdd; i++) {
            columnGroupsToExport.push({});
          }
        });

        return columnGroupsToExport;
      }
      const getColumnsToExport = (): Column[] => {
        let columnsToExport: Column[] = [];

        agGridColumnApi.getAllDisplayedColumns().forEach((col: Column) => {
          let pdfExportOptions = getPdfExportOptions(col.getColId());
          if (pdfExportOptions && pdfExportOptions.skipColumn) {
            return;
          }
          let headerCell = createHeaderCell(col);
          columnsToExport.push(headerCell);
        });

        return columnsToExport;
      }
      const getRowsToExport = (columnsToExport: Column[]): any[] => {
        let rowsToExport = [];

        agGridApi.forEachNodeAfterFilterAndSort((node: RowNode) => {
          if (PDF_SELECTED_ROWS_ONLY && !node.isSelected()) {
            return;
          }
          let rowToExport = columnsToExport.map((col: Column, index: number) => {
            let cellValue = node.group ? index === 0 ? `${node.rowGroupColumn?.['userProvidedColDef']?.headerName} : ${node.key} (${node.allChildrenCount})` : '' : agGridApi.getValue(col['colId'], node);
            let tableCell = createTableCell(cellValue, col['colId']);
            return tableCell;
          });
          rowsToExport.push(rowToExport);
        });

        return rowsToExport;
      }

      const getExportedColumnsWidths = (columnsToExport: Column[]): string[] => {
        return columnsToExport.map(() => 100 / columnsToExport.length + "%");
      }

      const createHeaderCell = (col): Column => {
        let headerCell = {};

        let isColGroup = col.hasOwnProperty("children");

        if (isColGroup) {
          headerCell['text'] = col.originalColumnGroup.colGroupDef.headerName;
          headerCell['colSpan'] = col.children.length;
          headerCell['colId'] = col.groupId;
        } else {
          let headerName = col.colDef.headerName;

          if (col.sort) {
            headerName += ` (${col.sort})`;
          }
          if (col.filterActive) {
            headerName += ` [FILTERING]`;
          }

          headerCell['text'] = headerName;
          headerCell['colId'] = col.getColId();
        }

        headerCell["style"] = "tableHeader";

        return headerCell as Column;
      }

      const createTableCell = (cellValue: string, colId: string): { text: string; style: string; } => {
        const tableCell = {
          text: cellValue !== undefined ? cellValue : "",
          // noWrap: PDF_PAGE_ORITENTATION === "landscape",
          style: "tableCell"
        };

        const pdfExportOptions = getPdfExportOptions(colId);

        if (pdfExportOptions) {
          const { styles, createURL } = pdfExportOptions;

          if (PDF_WITH_CELL_FORMATTING && styles) {
            Object.entries(styles).forEach(
              ([key, value]) => (tableCell[key] = value)
            );
          }

          if (PDF_WITH_COLUMNS_AS_LINKS && createURL) {
            tableCell["link"] = createURL(cellValue);
            tableCell["color"] = "blue";
            tableCell["decoration"] = "underline";
          }
        }

        return tableCell;
      }

      const getPdfExportOptions = (colId: string): { styles, createURL, skipColumn } => {
        let col = agGridColumnApi.getColumn(colId);
        return col['colDef'].pdfExportOptions;
      }

      const columnGroupsToExport = getColumnGroupsToExport();
      const columnsToExport = getColumnsToExport();
      const widths = getExportedColumnsWidths(columnsToExport);
      const rowsToExport = getRowsToExport(columnsToExport);
      const body = columnGroupsToExport
        ? [columnGroupsToExport, columnsToExport, ...rowsToExport]
        : [columnsToExport, ...rowsToExport];
      const headerRows = columnGroupsToExport ? 2 : 1;
      const header = PDF_WITH_HEADER_IMAGE
        ? {
          image: "ag-grid-logo",
          width: 150,
          alignment: "center",
          margin: [0, 10, 0, 10]
        }
        : null;
      const footer = PDF_WITH_FOOTER_PAGE_COUNT
        ? (currentPage, pageCount) => {
          return {
            text: currentPage.toString() + " of " + pageCount,
            margin: [20]
          };
        }
        : null;
      const pageMargins = [
        10,
        PDF_WITH_HEADER_IMAGE ? 70 : 20,
        10,
        PDF_WITH_FOOTER_PAGE_COUNT ? 40 : 10
      ];
      const heights = rowIndex =>
        rowIndex < headerRows ? PDF_HEADER_HEIGHT : PDF_ROW_HEIGHT;
      const fillColor = (rowIndex, node, columnIndex) => {
        if (rowIndex < node.table.headerRows) {
          return PDF_HEADER_COLOR;
        }
        return rowIndex % 2 === 0 ? PDF_ODD_BKG_COLOR : PDF_EVEN_BKG_COLOR;
      };

      const hLineWidth = (i, node) =>
        i === 0 || i === node.table.body.length ? 1 : 1;

      const vLineWidth = (i, node) =>
        i === 0 || i === node.table.widths.length ? 1 : 0;

      const hLineColor = (i, node) =>
        i === 0 || i === node.table.body.length
          ? PDF_OUTER_BORDER_COLOR
          : PDF_INNER_BORDER_COLOR;

      const vLineColor = (i, node) =>
        i === 0 || i === node.table.widths.length
          ? PDF_OUTER_BORDER_COLOR
          : PDF_INNER_BORDER_COLOR;

      const docDefintiion = {
        pageOrientation: PDF_PAGE_ORITENTATION,
        header,
        footer,
        content: [
          {
            style: "myTable",
            table: {
              headerRows,
              widths,
              body,
              heights
            },
            layout: {
              fillColor,
              hLineWidth,
              vLineWidth,
              hLineColor,
              vLineColor
            }
          }
        ],
        images: {
          "ag-grid-logo": PDF_LOGO
        },
        styles: {
          myTable: {
            margin: [0, 0, 0, 0]
          },
          tableHeader: {
            bold: true,
            margin: [0, PDF_HEADER_HEIGHT / 3, 0, 0]
          },
          tableCell: {
            // margin: [0, 15, 0, 0]
          }
        },
        pageMargins
      };

      return docDefintiion;
    })();

  }
}
