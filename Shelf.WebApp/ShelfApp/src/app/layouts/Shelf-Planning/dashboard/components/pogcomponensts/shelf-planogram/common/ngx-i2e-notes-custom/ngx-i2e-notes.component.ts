import { Component, OnInit, Inject, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IntlService } from '@progress/kendo-angular-intl';
import { ColDef, ColumnApi, GetContextMenuItemsParams, GetMainMenuItemsParams, GridApi, GridReadyEvent, IsRowSelectable, MenuItemDef, RowNode, ValueFormatterParams } from 'ag-grid-community';
import { DataRendererComponent } from './data-renderer/data-renderer.component';

@Component({
  selector: 'app-scenario-notes',
  template: `
  <div fxLayout="row" fxLayoutAlign="space-between center"
  style="border-bottom: 1px dashed #ccc; margin-top: 5px; margin-bottom: 20px;">
  <h3>{{parentData.translationStrings.PROJECT_NOTES}}</h3>
  <button mat-icon-button aria-label="close" (click)="closeDialog()">
      <mat-icon>close</mat-icon>
  </button>
</div>
<div class="notesDialog" mat-dialog-content *ngIf="!progressbar">
  <div class="editorCntnr" style="height: 150px;">
      <kendo-editor [(value)]="notesMsg">
          <kendo-toolbar>
              <kendo-toolbar-dropdownlist kendoEditorFormat></kendo-toolbar-dropdownlist>
              <kendo-toolbar-buttongroup>
                  <kendo-toolbar-button kendoEditorBoldButton></kendo-toolbar-button>
                  <kendo-toolbar-button kendoEditorItalicButton></kendo-toolbar-button>
                  <kendo-toolbar-button kendoEditorUnderlineButton></kendo-toolbar-button>
                  <kendo-toolbar-button kendoEditorStrikethroughButton></kendo-toolbar-button>
              </kendo-toolbar-buttongroup>
              <kendo-toolbar-buttongroup>
                  <kendo-toolbar-button kendoEditorInsertUnorderedListButton></kendo-toolbar-button>
                  <kendo-toolbar-button kendoEditorInsertOrderedListButton></kendo-toolbar-button>
              </kendo-toolbar-buttongroup>
          </kendo-toolbar>
      </kendo-editor>
      <div class="btnCntnr">
          <button mat-icon-button [matTooltip]="parentData.translationStrings.CLEAR"
              (click)="clearNote()"><mat-icon>clear</mat-icon></button>
          <button mat-icon-button  [matTooltip]="parentData.translationStrings.SAVE" [disabled]="saveDisable"
              (click)="saveNote()"><mat-icon>save</mat-icon></button>
      </div>
  </div>
  <div class="gridBtnCntnr" *ngIf="!progressbar">
      <button mat-icon-button class="scenarioNotesButton" aria-label="close" (click)="editNote(selectedRows)">
          <mat-icon>edit_mode</mat-icon>
      </button>
      <button mat-icon-button class="scenarioNotesButton" aria-label="close" (click)="deleteNote(selectedRows)">
          <mat-icon>delete</mat-icon>
      </button>
  </div>
  <div class="gridCntnr" style="height: calc(100% - 195px);">
      <ag-grid-angular  style="width: 100%; height: 100%;" class="ag-theme-alpine" [rowSelection]="rowSelection"
          [columnDefs]="notesColDefs" [defaultColDef]="defaultColDef" [rowData]="rowData"
          (gridReady)="onGridReady($event)" [getMainMenuItems]="getMainMenuItems"
          [getContextMenuItems]="getContextMenuItems" (selectionChanged)="onSelectionChanges()"
          [localeText]="localeText"></ag-grid-angular>
  </div>
</div>`,
  styles: [`
  @import "ag-grid-community/dist/styles/ag-grid.css";
  @import "ag-grid-community/dist/styles/ag-theme-alpine.css";
  .notesDialog {
                 height: calc(100% - 55px);
            }
             .notesDialog .editorCntnr {
                 position: relative;
            }
             .notesDialog .editorCntnr kendo-editor {
                 height: 150px;
            }
             .notesDialog .editorCntnr .btnCntnr {
                 position: absolute;
                 top: 2px;
                 right: 5px;
            }
             .notesDialog .editorCntnr .btnCntnr button {
                 padding: 0;
                 min-width: 30px;
                 margin-right: 8px;
            }
             .notesDialog .editorCntnr .btnCntnr button mat-icon {
                 color: #666;
                 font-size: 22px;
                 width: 22px;
                 height: 22px;
            }
             .notesDialog .gridCntnr {
                 margin-top: 10px;
                 height: 250px;
            }
            .ag-grid-menu-option-selected {
              background-color: #ff6358;
              color: white;
            }
            .notesDialog .mat-icon {
              user-select: none;
              background-repeat: no-repeat;
              display: inline-block;
              fill: currentColor;
              height: 24px;
              width: 24px;
              overflow: hidden;
              transform: scale(0.9);
              color: #999;
            }
            .ag-theme-alpine [class^=ag-], .ag-theme-alpine [class^=ag-]:focus, .ag-theme-alpine [class^=ag-]:after, .ag-theme-alpine [class^=ag-]:before {
              box-sizing: border-box;
              outline: none;
              font-size: 12px;
          }
          .gridBtnCntnr {
             height: 35px; 
             overflow: hidden; 
             display: block;
          }
          .scenarioNotesButton {
             float: right;
          }
            `],
  encapsulation: ViewEncapsulation.None
})
export class NgxI2eNotesComponent implements OnInit {
  progressbar: boolean = true;
  public rowData: any[] = [];
  public rowSelection: any = 'single';
  private gridApi!: GridApi;
  private gridColumnApi!: ColumnApi;
  public notesList: any = [];
  public notesMsg: any;
  public saveDisable: boolean = false;
  public IdNotes: number = 0;
  public action: string = 'I';
  public selectedRows: any = {};
  public defaultColDef: ColDef = {
    width: 150,
    filter: 'agSetColumnFilter',
    resizable: true,
    sortable: true,
    cellStyle: { 'font-family': 'Helvetica', 'font-size': 10 }
  };
  public notesColDefs: ColDef[] = [
    {
      field: ' ', maxWidth: 30, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 },
      checkboxSelection: true
    },
    {
      headerName: this.parentData.translationStrings.NOTES_APPNAME, field: 'AppName', minWidth: 150, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 },
      cellRenderer: DataRendererComponent,
      cellRendererParams: { isAlert: this.parentData.dataItem.IsAlert }
    },
    {
      headerName: this.parentData.translationStrings.PROJECT_NOTES, field: 'Notes', minWidth: 250, wrapText: true, autoHeight: true, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 },
      cellRenderer: (params: any) => {
        var a = document.createElement('span');
        a.innerHTML = params.data.Notes;
        return a;
      }
    },
    { headerName: this.parentData.translationStrings.CREATED_BY, field: 'CreatedBy', width: 250, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 } },
    {
      headerName: this.parentData.translationStrings.CREATED_ON, field: 'CreatedTS', minWidth: 160, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 },
      valueFormatter: this.dateFormat.bind(this),
      filterParams: {
        valueFormatter: this.dateFormat.bind(this),
      }
    },
    {
      headerName: this.parentData.translationStrings.MODIFIED_ON, field: 'ModifiedTS', minWidth: 150, suppressSizeToFit: false, cellStyle: { 'font-family': 'Helvetica', 'font-size': 12 },
      valueFormatter: this.dateFormat.bind(this),
      filterParams: {
        valueFormatter: this.dateFormat.bind(this),
      }
    }
  ];


  constructor(public dialog: MatDialogRef<NgxI2eNotesComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public parentData: any,
    private http: HttpClient, public intl: IntlService) { }
  private getNotes(data: any) {
    this.http.get("/api/Project/GetProjectNotes?idproject=" + data.idproject + "&idScenario=" + data.idscenario + "&appName=" + data.Appname)
      .subscribe((res: any) => {
        if (res) {
          this.notesList = res;
          this.progressbar = false;
        }
      });
  }

  public closeDialog() {
    this.dialog.close();
  }

  public clearNote() {
    this.notesMsg = "";
    this.IdNotes = 0;
    this.action = "I";
  }

  public dateFormat(params: ValueFormatterParams) {
    var time = params.value;
    if (time) {
      let timeStr = this.intl.formatDate(this.intl.parseDate(time), localStorage.getItem("timeFormat") === "1" ? "HH:mm" : "hh:mm a")
      return this.intl.formatDate(this.intl.parseDate(time), "d") + " " + timeStr;
    } else {
      return "";
    }
  }

  public isOptionsAvl(note: any) {
    return note.IsEditOrDeleteEnabled;
  }

  public onOptionsButtonClick(e: any) {
    if (e.eventType === "edit") {
      this.editNote(e.rowData);
    } else if (e.eventType === "delete") {
      this.deleteNote(e.rowData);
    }
  }

  public editNote(note: any) {
    if (!this.selectedRows.IdNotes) {
      let msg = this.parentData.translationStrings.PLS_SELECT_ROW;
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    if (this.selectedRows.IsEditOrDeleteEnabled === 0) {
      let msg = this.parentData.translationStrings.BROADCAST_NO_PERMISSIONS
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    this.notesMsg = note.Notes;
    this.IdNotes = note.IdNotes;
    this.action = "U";
  }

  public deleteNote(note: any) {
    if (!this.selectedRows.IdNotes) {
      let msg = this.parentData.translationStrings.PLS_SELECT_ROW;
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    if (this.selectedRows.IsEditOrDeleteEnabled === 0) {
      let msg = this.parentData.translationStrings.BROADCAST_NO_PERMISSIONS
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    this.parentData.dataItem.note = note.Notes;
    this.parentData.dataItem.IDNotes = note.IdNotes;
    this.parentData.dataItem.action = "D";
    this.http.post("/api/Project/CreateNotesForProject", this.parentData.dataItem).subscribe(() => {
      let msg = this.parentData.translationStrings.NOTE_DELETE_SUCCESS;
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      this.saveDisable = false;
      this.closeDialog();
    }, () => {
      let msg = this.parentData.translationStrings.NOTE_DELETE_FAIL;
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      this.saveDisable = false;
    });
  }

  public deleteNoteAll() {
    if (!this.notesList) {
      let msg = "No notes are available";
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    const deleteList = this.notesList.filter((data: any) => data.IsEditOrDeleteEnabled === 1);
    if (deleteList) {
      deleteList.forEach((note: any) => {
        this.parentData.dataItem.note = note.Notes;
        this.parentData.dataItem.IDNotes = note.IdNotes;
        this.parentData.dataItem.action = "D";
        console.log(this.parentData);
        // this.http.post("/api/Project/CreateNotesForProject", this.parentData.dataItem).subscribe(() => {
        //   let msg = this.parentData.translationStrings.NOTE_DELETE_SUCCESS;
        //   this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
        //   this.saveDisable = false;
        //   this.closeDialog();
        // }, () => {
        //   let msg = this.parentData.translationStrings.NOTE_DELETE_FAIL;
        //   this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
        //   this.saveDisable = false;
        // });
      });
    } else {
      let msg = "No notes are available under your name";
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
  }

  public saveNote() {
    if (!this.notesMsg) {
      this.snackBar.open(this.parentData.translationStrings.ENTER_NOTES, "", { duration: 4000, verticalPosition: 'top' });
      return;
    }
    this.saveDisable = true;

    this.parentData.dataItem.note = this.notesMsg;
    this.parentData.dataItem.IDNotes = this.IdNotes;
    this.parentData.dataItem.action = this.action;
    this.http.post("/api/Project/CreateNotesForProject", this.parentData.dataItem).subscribe(() => {
      let msg = this.IdNotes == 0 ? this.parentData.translationStrings.NOTE_SAVE_SUCCESS : this.parentData.translationStrings.NOTE_UPDATE_SUCCESS
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      this.saveDisable = false;
      this.closeDialog();
    }, () => {
      let msg = this.IdNotes == 0 ? this.parentData.translationStrings.NOTE_SAVE_FAIL : this.parentData.translationStrings.NOTE_UPDATE_FAIL
      this.snackBar.open(msg, "", { duration: 4000, verticalPosition: 'top' });
      this.saveDisable = false;
    });
  }

  public localeText = {
    pinColumn: this.parentData.translationStrings.PIN_COLUMN,
    autosizeThiscolumn: this.parentData.translationStrings.AUTOSIZE_COLUMN,
    autosizeAllColumns: this.parentData.translationStrings.AUTOSIZE_ALL_COLUMNS,
    groupBy: this.parentData.translationStrings.GROUP_BY,
    ungroupBy: this.parentData.translationStrings.UNGROUP_BY,
    pinLeft: this.parentData.translationStrings.PIN_LEFT,
    pinRight: this.parentData.translationStrings.PIN_RIGHT,
    noPin: this.parentData.translationStrings.NO_PIN,
    searchOoo: this.parentData.translationStrings.MENU_SEARCH,
    resetColumns: this.parentData.translationStrings.RESET_COLS,
    noRowsToShow: this.parentData.translationStrings.NO_DATA_IS_THERE
  };

  onGridReady(params: GridReadyEvent) {
    this.gridApi = params.api;
    this.gridColumnApi = params.columnApi;
    this.gridApi?.setRowData(this.notesList);
  }

  public getMainMenuItems = (params: GetMainMenuItemsParams): (string | MenuItemDef)[] => {

    params.api.hidePopupMenu();
    // you don't need to switch, we switch below to just demonstrate some different options
    // you have on how to build up the menu to return
    let customMenuItems: (MenuItemDef | string)[] = params.defaultItems.slice(0);

    //Remove 'resetColumns' built in menu
    customMenuItems = customMenuItems.filter(ele => ele !== 'resetColumns');

    const colId: any = params.column.getColId();
    const column: any = params.columnApi.getColumnState().find(ele => ele.colId === colId);
    //Sort value can be asc, desc and '' when sort is not applied
    const isAscSort = column.sort === 'asc';
    const isDescSort = column.sort === 'desc';

    //TODO: add translation string here for names

    const descObj: MenuItemDef = {
      name: this.parentData.translationStrings.SORTDESC,
      icon: '<mat-icon style="position: absolute;top: 85px;font-size: 15px;" class="mat-icon notranslate menuicon material-icons mat-icon-no-color">arrow_downward</mat-icon>',
      action: () => {
        const columnstate = params.columnApi
          .getColumnState()
          .filter((ele) => ele.colId === params.column.getColId())
          .map((ele) => {
            ele.sort = ele.sort == 'desc' ? null : 'desc';
            return ele;
          });
        params.api.refreshCells();
        params.columnApi.applyColumnState({ state: columnstate });
      },
    };
    if (isDescSort) {
      descObj.cssClasses = ['ag-grid-menu-option-selected']; //Add css class to highlight menu option if sort is already applied
    }
    customMenuItems.unshift(descObj);

    const ascObj: MenuItemDef = {
      name: this.parentData.translationStrings.SORTASC,
      icon: '<mat-icon  style="position: absolute;top: 52px;font-size: 15px;"  class="mat-icon notranslate menuicon material-icons mat-icon-no-color">arrow_upward</mat-icon>',
      action: () => {
        let columnstate = params.columnApi
          .getColumnState()
          .filter((ele: any) => ele.colId === params.column.getColId())
          .map((ele: any) => {
            ele.sort = ele.sort == 'asc' ? null : 'asc';
            return ele;
          });
        params.api.refreshCells();
        params.columnApi.applyColumnState({ state: columnstate });
      },
    };
    if (isAscSort) {
      ascObj.cssClasses = ['ag-grid-menu-option-selected']; //Add css class to highlight menu option if sort is already applied
    }
    if (isDescSort) {
      descObj.cssClasses = ['ag-grid-menu-option-selected']; //Add css class to highlight menu option if sort is already applied
    }
    customMenuItems.unshift(ascObj);
    const autoSizeIndex = customMenuItems.findIndex(x => x === "autoSizeAll");
    const autoSizeAllColumnsObj: MenuItemDef = {
      name: 'Autosize All Columns',
      action: () => {
        params.api.sizeColumnsToFit()
        params.api.refreshCells();
        params.columnApi.autoSizeAllColumns();
      },
    };
    customMenuItems[autoSizeIndex] = autoSizeAllColumnsObj;
    return customMenuItems;
  }

  getContextMenuItems(
    params: GetContextMenuItemsParams
  ): (string | MenuItemDef)[] {
    var result: (string | MenuItemDef)[] = [
    ];
    return result;
  }

  onSelectionChanges() {
    this.selectedRows = this.gridApi.getSelectedRows()[0];
  }

  ngOnInit() {
    this.getNotes(this.parentData.dataItem);
  }


}
