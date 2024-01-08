import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    EventEmitter,
    Input,
    NgZone,
    OnChanges,
    OnDestroy,
    Output,
    SimpleChanges,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';

import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

import { TranslateService } from '@ngx-translate/core';
import { AgGridAngular } from 'ag-grid-angular';
import {
    CellClassParams,
    CellClickedEvent,
    CellEditingStoppedEvent,
    CellKeyDownEvent,
    CellValueChangedEvent,
    ColDef,
    ColumnApi,
    ExcelExportParams,
    FirstDataRenderedEvent,
    GetContextMenuItemsParams,
    GetDetailRowDataParams,
    GetLocaleTextParams as LocaleParam,
    GetMainMenuItemsParams,
    GridApi,
    GridReadyEvent,
    IDatasource,
    IDetailCellRendererParams,
    IGetRowsParams,
    MenuItemDef,
    PostProcessPopupParams,
    RangeSelectionChangedEvent,
    RowNode,
    SelectionChangedEvent,
    SortChangedEvent,
    SideBarDef,
} from 'ag-grid-community';
import { GridConfigComponent } from './Components/grid-config/grid-config.component';

import { WorksheetEventData, KEYBOARD_EVENTS, MenuItemSummary, MenuItem, Menu } from '../../models';
import { FillDownOldValue, GridConfig, PDF_PARAMS, PDF_CONST_PARAMS } from './models';
import { get, set } from 'lodash';
import { LanguageService, AgGridHelperService, NotifyService } from '../../services';
import { AgGridService } from './services/ag-grid.service';
import { CheckboxComponent, CheckboxHeaderComponent, GroupCellRendererComponent } from './Components';

//imports to PDF exports
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { AGGridColumnFormatterPipe } from './pipes/format-column.pipe';
import { DatePipe } from '@angular/common';
import { AgGridStoreService } from './services/ag-grid-store.service';
pdfMake.vfs = pdfFonts.pdfMake.vfs;


@Component({
    selector: 'shelf-ag-grid',
    templateUrl: './ag-grid.component.html',
    styleUrls: ['./ag-grid.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AgGridComponent implements OnChanges, AfterViewInit, OnDestroy {
    @Input() gridConfig: GridConfig;
    @ViewChild('agGrid') agGrid!: AgGridAngular;
    @Output() rowValueUpdated = new EventEmitter<{
        event: RangeSelectionChangedEvent | CellEditingStoppedEvent;
        type: string;
    }>();
    @Output() cellClickHandler = new EventEmitter<{ event: CellClickedEvent }>();
    @Output() selectedRow = new EventEmitter<{ api: GridApi; columnApi: ColumnApi; type: string }>();
    @Output() fillUpDownEvent = new EventEmitter<{
        updatedRows: any[];
        field: string;
        updatedValue: any;
        oldValues: FillDownOldValue[];
        params?: CellKeyDownEvent
    }>();
    @Output() undoRedoEvent = new EventEmitter<KeyboardEvent>();
    @Output() deleteEvent = new EventEmitter<KeyboardEvent>();
    @Output() actionEventEmit = new EventEmitter<{ data: any, fieldName?: string, classList?: DOMTokenList, node?: RowNode, iconName?: string, value: string }>();
    @Output() onContextSelect = new EventEmitter<{ menu: MenuItemSummary, data?: any, rowIndex?: number }>();
    @Output() serverSideGridEmit = new EventEmitter<IGetRowsParams>();
    @Output() clearFilterEvent = new EventEmitter<boolean>();
    @Output() filterEvent = new EventEmitter<boolean>();
    private skipToInvoked: boolean = false; //Added this flag to skip event propogation from planogram item selection.
    private _subscription: Subscription = new Subscription();
    public allowClickEdit = false;
    public params: any;
    public rowGroupPanelShow: string = 'always';
    public sortingOrder: ('asc' | 'desc' | null)[] = ['desc', 'asc', null];
    public gridColumnApi!: ColumnApi;
    public gridApi!: GridApi;
    private detailsGridColumns: ColDef[];
    private rangeSelectionInProgress: boolean = false;
    private valuesBeforeFilldown: Array<FillDownOldValue> = [];
    private filterMenu: Menu[] | MenuItemSummary[] = [];
    private defaultColDef: ColDef = {
        flex: 1,
        maxWidth: 400,
        resizable: true,
        sortable: true,
        enableRowGroup: true,
        suppressCellFlash: true,
        cellClass: 'excelColor',
    };

    public defaultColDefPivot: ColDef = {
        flex: 1,
        minWidth: 150,
        maxWidth: 400,
        resizable: true,
        sortable: true,
        suppressCellFlash: true,
        cellClass: 'excelColor',
    };
    public sideBar: SideBarDef | string | string[] | boolean | null = 'columns';
    private rowGroupIds: string[] = [];
    public excelStyles = [
        {
            id: 'excelColor',
            alignment: {
                horizontal: 'center',
                vertical: 'Bottom',
            },
            borders: {
                borderBottom: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 1,
                },
                borderLeft: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 1,
                },
                borderRight: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 1,
                },
                borderTop: {
                    color: '#000000',
                    lineStyle: 'Continuous',
                    weight: 1,
                },
            },
            font: { color: '#6F6F6F' },
            interior: {
                color: '#eeeeee',
                pattern: 'Solid',
            },
        },
        {
            id: 'cell',
            alignment: {
                horizontal: 'center',
                vertical: 'Center',
            },
        },
        {
            id: 'header',
            alignment: {
                horizontal: 'center',
                vertical: 'Center',
            },
            font: { color: '#eeeeee' },
            interior: {
                color: '#4E9698',
                pattern: 'Solid',
            },
        },
        {
            id: 'stringType',
            dataType: 'String',
        },
        {
            id: 'numberType'
        }
    ];

    public gridOptions = {
        onColumnPivotModeChanged: () => this.gridConfig.hideColumnConfig = this.gridColumnApi.isPivotMode()
    }

    //For templated column eveluation, we need this service injection(DatePipe,TranslateService,LanguageService)
    constructor(
        private readonly changeDetection: ChangeDetectorRef,
        private readonly dialogRef: MatDialog,
        private readonly translate: TranslateService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly agGridService: AgGridService,
        private readonly zone: NgZone,
        private readonly pipe: AGGridColumnFormatterPipe,
        private readonly datePipe: DatePipe,
        private readonly languageService: LanguageService,
        private readonly agGridStoreService: AgGridStoreService,
        private readonly notifyService: NotifyService
    ) {
        if (this.agGridStoreService.gridHoldingData === undefined) {
            this.agGridStoreService.gridHoldingData = [];
        }
    }
    public autoGroupColumnDef: ColDef = {
        minWidth: 150,
        sortable: true,
        filter: true,
        editable: false,
        pinned: 'left',
        suppressMenu: true,
        suppressMovable: true,
        suppressNavigable: true,
        suppressFillHandle: true,
        headerCheckboxSelection: false,
        checkboxSelection: false,
    };
    public groupRowRendererParams = {
        innerRenderer: GroupCellRendererComponent
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (this.gridConfig?.firstCheckBoxColumn) {
            this.addCheckboxColumn();
        }
        if (!this.gridConfig.supressSrNo) {
            this.addSequenceNoColumn();
        }
        if (this.gridConfig?.type && this.gridApi) {
            this.gridApi?.setDatasource(this.dataSource);
        } else {
            this.bindGrid();
        }
    }

    public ngAfterViewInit(): void {
        this.setGridHoldingData();
        this._subscription.add(
            this.zone.onMicrotaskEmpty
                .asObservable()
                .pipe(take(1))
                .subscribe(() => {
                    this.showRowGroupPanel(true);
                }),
        );
        this.params?.api!.sizeColumnsToFit();
    }
    //Assigned 'any' type to method parameter as it axpects data from any grid which is of diffrent type
    public setGridHoldingData(data?: any): void {
        if (this.gridConfig && this.agGridStoreService.gridHoldingData) {
            const index = this.agGridStoreService.gridHoldingData.findIndex((x) => x.id === this.gridConfig.id);
            if (index !== -1) {
                this.agGridStoreService.gridHoldingData[index] = {
                    ...this.agGridStoreService.gridHoldingData[index],
                    data: data ? data : this.gridConfig.data
                }
            } else {
                this.agGridStoreService.gridHoldingData.push({
                    id: this.gridConfig.id,
                    data: this.gridConfig.data
                });
            }
        }
    }

    public ngOnDestroy(): void {
        this.gridApi?.destroy();
    }
    // Grid Events
    public onGridReady = (params: GridReadyEvent): void => {
        this.params = params;
        this.gridColumnApi = params.columnApi;
        this.gridApi = params.api;
        this.gridConfig.suppressClickEdit ? this.allowClickEdit = this.gridConfig.suppressClickEdit : false; //@Sagar: To prevent or allow click editing on demand from specific grids
        if (this.gridConfig.skipToParam) {
            this.skipTo(this.gridConfig.skipToParam.colName, this.gridConfig.skipToParam.value);
        }
        if (this.gridConfig?.setRowsForSelection?.items?.length > 0) {
            this.setSelectedRows(this.gridConfig.setRowsForSelection.items, this.gridConfig.setRowsForSelection.field);
        }
        if (this.gridConfig?.data.length == 0 && this.gridConfig.id == 'feedback_Grid') {
            this.gridApi.setDomLayout('autoHeight');
        }
        if (this.gridConfig?.isSelectAll) {
            this.params.api.selectAll();
            this.skipToInvoked = true;
        }
        if (this.gridConfig && this.gridApi) {
            if (this.agGridStoreService.gridState.length) {
                let index = this.agGridStoreService.gridState.findIndex(grid => grid.gridId === this.gridConfig?.id)
                if (index > -1) {
                    if (this.agGridStoreService.gridState[index].filtermodel) {
                        params.api.setFilterModel(this.agGridStoreService.gridState[index].filtermodel);
                    }
                    if (this.agGridStoreService.gridState[index].colSortState) {
                        params.columnApi.applyColumnState({ state: this.agGridStoreService.gridState[index].colSortState });
                    }
                }
            }
        }

        if (this.gridApi.getSelectedNodes().length) {
            this.gridApi.ensureIndexVisible(this.gridApi.getSelectedNodes()[0].rowIndex, null)
        }
    };

    public dataSource: IDatasource = {
        getRows: (params: IGetRowsParams) => {
            this.serverSideGridEmit.emit(params);
        }
    }
    public onServerGridReady = (params: GridReadyEvent): void => {
        this.params = params;
        this.gridColumnApi = params.columnApi;
        this.gridApi = params.api;
        this.gridApi.setDatasource(this.dataSource);
        this.showRowGroupPanel(false);
    }

    public getRowStyle = (params) => {
        if (params?.data?.backgroundColor) {
            const fontColor = this.agGridService.lightenDarkenColor(params?.data?.backgroundColor);
            return { background: params.data.backgroundColor, color: fontColor };
        }
    }
    public onCellClicked(event: CellClickedEvent) {
        const target = event.event.target as Element;
        // Note : To check and uncheck checkbox while user click inside the cell but outside the checkbox
        const checkboxEle = target.querySelector('input[type="checkbox"]') as HTMLInputElement;
        if (checkboxEle) {
            checkboxEle.checked = !checkboxEle.checked;
        }
        if (this.gridConfig.actionFields?.length && this.gridConfig.actionFields.includes(event.column.getColId())) {
            this.actionEventEmit.emit({ data: event.data, fieldName: event.column.getColId(), classList: target.classList, node: event.node, iconName: target['innerText'], value: event.value });
            this.skipToInvoked = true;
        } else {
            this.cellClickHandler.emit({ event });
        }
    }
    public onRangeSelectionChanged = (event: RangeSelectionChangedEvent) => {
        const ranges = event.api.getCellRanges();
        if (!event.started && event.finished) {
            if (ranges?.length) {
                let range = ranges[0];
                if (!this.rangeSelectionInProgress) {
                    this.rangeSelectionInProgress = true;
                    this.valuesBeforeFilldown = [];
                }
                const startIndex = range.startRow.rowIndex;
                const endIndex = range.endRow.rowIndex;
                if (startIndex !== endIndex) {
                    this.rangeSelectionInProgress = false;
                    let itemsToUpdate = [];
                    /** get edited rows
                     * assuming single column fill down
                     *  filldown does not edit the start row
                     * event.api.getRowNode(index) will give row without sort/filter
                     */
                    let field = range.columns[0].getColId();
                    let updatedValue;
                    event.api.forEachNodeAfterFilterAndSort((rowNode: RowNode) => {
                        if (rowNode.rowIndex >= startIndex && rowNode.rowIndex <= endIndex) {
                            if (!updatedValue) {
                                updatedValue = get(rowNode.data, range.columns[0].getColId());
                            }

                            if (this.valuesBeforeFilldown.some(ele => ele.id === rowNode.data.IDPOGObject)) {
                                itemsToUpdate.push(rowNode.data);
                            }
                        }
                    });
                    const noFillUpDown = range["columns"][0]["userProvidedColDef"].cellRendererParams?.isDynamicDropdown && !range["columns"][0]["userProvidedColDef"].cellRendererParams?.isDropdownApplicable;
                    if (noFillUpDown) {
                        if (this.valuesBeforeFilldown.length) {
                            this.valuesBeforeFilldown.forEach((ele) => {
                                let updatedValue = ele.oldValue;
                                this.fillUpDownEvent.emit({
                                    updatedRows: itemsToUpdate,
                                    field,
                                    updatedValue,
                                    oldValues: this.valuesBeforeFilldown,
                                    params: this.params
                                });
                            })
                            this.notifyService.warn(this.translate.instant('DROPDOWN_IS_NOT_APPLICABLE_FOR') + ' ' + field);
                        }
                        return;
                    }
                    if (this.valuesBeforeFilldown.length > 0) {
                        this.fillUpDownEvent.emit({
                            updatedRows: itemsToUpdate,
                            field,
                            updatedValue,
                            oldValues: this.valuesBeforeFilldown,
                            params: this.params
                        });
                    }
                    this.valuesBeforeFilldown = [];
                    this.gridApi.clearRangeSelection();
                }
            }
        } else if (event.finished) {
            this.rangeSelectionInProgress = false;
            this.gridApi.applyTransactionAsync({});
        }
    };

    public onCellValueChanged(event: CellValueChangedEvent): void {
        /**
         * on filldown, need to record the old values.
         * TODO @karthik this will still trigger for single cell edit, but not be used.
         * Single cell edits are treated as range starts but the flow of triggers needs analysis.
         */
        if (this.rangeSelectionInProgress == true) {
            this.valuesBeforeFilldown.push(this.populateOldValue(event.data, event.column.getColId(), event.oldValue));
        }
    }

    public onCellEditingStopped = (event: CellEditingStoppedEvent) => {
        if (event.newValue !== event.oldValue) {
            this.rowValueUpdated.emit({ event, type: 'edit' });
        }
    };
    public updateRowgroup = (value: string) => {
        this.rowGroupPanelShow = value;
    };
    public defaultExcelExportParams = {
        processCellCallback: (params) => {
            if (this.gridConfig.columnDefs[1].cellRendererParams?.isPivotGrid) {
                return this.formatDataForPivotGrid(params);
            }
            if (params.node.id.includes('row-group') && !this.rowGroupIds.includes(params.node.id)) {
                this.rowGroupIds.push(params.node.id);
                const value = this.agGridService.formatGroupHeaderRow(params, params.node.rowGroupColumn.colDef.cellRendererParams.template, params.node.allLeafChildren[0].data);
                return `${value}: (${params.node.allChildrenCount})`;
            }
            if (!params.node.data && params.column?.userProvidedColDef?.cellRendererParams?.template !== '') return;
            return this.formatData(params, params?.column?.userProvidedColDef?.cellRendererParams?.template);
        },
    };
    //Used ES6 syntax to fixed issue related to undefined this referece, Internally AG grid uses plain Js syntax
    public localeTextFunc = (params: LocaleParam): string => {
        let key = params.key.toUpperCase().trim();
        const data = this.translate.instant(key);
        const pivotSidebarKeys = ['ADDTOVALUES', 'REMOVEFROMVALUES', 'ADDTOLABELS', 'REMOVEFROMLABELS'];
        if (pivotSidebarKeys.includes(key) && params.variableValues.length > 0) {
            return data.replace('${variable}', params.variableValues[0]);
        } else {
            return data == key && key === data ? params.defaultValue : data;   
        }
    };

    public exportToExcel(params?: ExcelExportParams): void {
        if (!params) params = {};
        let columns = [...this.gridApi?.['columnModel'].getColumnDefs()].filter(x => x.field !== this.gridConfig?.hideColumnWhileExport?.find(x => x) && !x.hide);
        params.columnKeys = columns.map(x => x.field).filter(x => !x.toLowerCase().includes('checkbox') && x !== 'Action');
        params.fileName = params.fileName ? params.fileName.replace(/\./g,'-') : this.gridConfig.id;
        params.exportMode = 'xlsx';
        this.gridApi.exportDataAsExcel(params);
        this.rowGroupIds = [];
    }

    public exportToPDF(fileName?: string): void {
        const printParams = { ...PDF_CONST_PARAMS };
        this.printDoc(printParams, fileName);
    }

    private printDoc(printParams: PDF_PARAMS, fileName?: string): void {
        const docDefinition = this.agGridService.getDocDefinition(printParams, this.gridApi, this.gridColumnApi);
        const name = fileName ? fileName : 'PDFFile.pdf';
        pdfMake.createPdf(docDefinition).download(fileName);
    }
    //Custom Events
    private formatData(params, template): any {
        this.getColumnValArray(params);
        if (params?.node?.data && template) {
            try {
                if (String(params.value) === 'NaN') {
                    params.value = null;
                }
                const type = typeof params.value;
                if (params.column?.colDef?.cellRendererParams?.columntype === 'dropdown') {
                    if (type === 'boolean') {
                        params.value = params.value === true ? 1 : 2;
                    }
                    let cellVal;
                    if (params?.column?.colDef?.cellRendererParams?.isDynamicDropdown) {
                      cellVal = eval(template.replace('dataItem', 'params.node.data'))?.find((x) => x.key === params.value);
                    } else {
                      cellVal = JSON.parse(template).find((x) => x.key === params.value);
                    }
                    if (cellVal === undefined) {
                        return null;
                    } else {
                        return cellVal?.value;
                    }
                }
                if (this.agGridService.isNumber(params.column?.colDef?.cellRendererParams?.columntype)) {
                    if (params.value % 1 != 0) {
                        return params.value = params.value.toFixed(2);
                    }
                }
                let temp = eval(String(template).replaceAll('dataItem', 'params.node.data'));
                if (String(temp) === 'NaN') {
                    return null;
                }
                if (Array.isArray(temp) && type === 'string') {
                    temp = params.value;
                }
                return this.pipe.transform(temp, params.column, 'plainExcel');
            } catch (error) {
                return this.pipe.transform(params.value, params.column, 'plainExcel');
            }
        }
        return this.pipe.transform(params.value, params.column, 'plainExcel');
    }

    private formatDataForPivotGrid(params): any {
        //Handling in case of pivot grid
        if (params?.value && typeof params?.value === 'object') {
            if (Object.keys(params?.value).length === 0) {
                return '';
            } else {
                return params.value;
            }
        }
        return params.value;
    }

    // Required to use type 'any' for params as cannot use  the mentioned interfaces as coldef is getting private : SetFilterValuesFuncParams or KeyCreatorParams
    private getColumnValArray(params: any) {
        if (params?.column?.colDef?.cellRendererParams?.isDynamicDropdown) {
            const valuesToReplace = ['NULL', 'null', 'Undefined', null, undefined]
            let columnValueArray = Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data']).map((x, i) => params.column?.colDef?.field?.split('.').reduce((p, c) => p && p[c], Object.values(params.api['rowModel'].nodeManager.allNodesMap).map(x => x['data'])[i]));
            columnValueArray = columnValueArray = columnValueArray.filter((item, pos) => {
                return columnValueArray.indexOf(item) == pos;
            }).map(ele => valuesToReplace.includes(ele) ? '' : ele);
            if (params?.column?.colDef?.cellRendererParams?.isDynamicDropdown &&
                !this.agGridStoreService.dynamicFilterValues.length && columnValueArray) {
                this.agGridStoreService.getFilterValuesForDynamicDropdown(Object.values(params.api['rowModel'].nodeManager.allNodesMap),
                    params?.column?.colDef?.cellRendererParams.template, params?.column?.colDef?.field, columnValueArray)
            }
        }
    }
    public selectMultipleRows(colName: string, rows: string[] | number[], type?: string, rowEventType?: string): void {
        if (rows.length) {
            this.params.api.forEachNode((item: any) => {
                if (!item?.group) {
                    const value = type === 'number' ? Number(item?.data?.[`${colName}`]) : item?.data?.[`${colName}`];
                    if (value && rows.some(x => x === value)) {
                        switch (rowEventType) {
                            case 'ctrl':
                            case 'shift':
                                item.setSelected(true, false, true);
                                break;
                            case 'removeSelection':
                                item.setSelected(false); //deselect a single row
                                break;
                            default: // can be used to select rows as well, and will deselect all rows other than the subject rowNode if clearSelection is true
                                item.setSelected(true, false, true);
                                break;
                        }
                    }
                }
            });

            if (this.gridConfig.isHeaderCheckboxSelectionOverrideRequired) {
                this.overrideCheckboxHeaderSelection();
            }
        }
    }

    private overrideCheckboxHeaderSelection(): void {
        const checkboxElement = document.querySelector(
            `shelf-ag-grid ag-grid-angular#${this.gridConfig.id} .ag-header-cell .ag-checkbox.ag-input-field .ag-checkbox-input-wrapper`,
        );
        const selectedRowsLength = this.gridApi.getSelectedRows().length;
        if (selectedRowsLength < this.gridConfig.data.length) {
            checkboxElement.classList.add('ag-indeterminate');
        } else {
            checkboxElement.classList.add('ag-checked');
        }
    }

    public skipTo(colName?: string, value?: string | number, type?: string, rowEventType?: string): void {
        if (value) {
            switch (type) {
                case 'number':
                    value: Number(value);
                    break;

                default:
                    break;
            }
            this.params.api.forEachNode((item: any) => {
                if (!item?.group && item?.data?.[`${colName}`] === value) {
                    // setSelected = (newValue: boolean,clearSelection: boolean = false,suppressFinishActions: boolean = false)
                    // newValue - true for selection, false for deselection.
                    //clearSelection - If selecting, then passing true will select the node exclusively (i.e. NOT do multi select). If doing deselection, clearSelection has no impact.
                    //suppressFinishActions - Pass true to prevent the selectionChanged from being fired. Note that the
                    switch (rowEventType) {
                        case 'ctrl':
                        case 'shift':
                            item.setSelected(true, false, true);
                            break;
                        case 'removeSelection':
                            item.setSelected(false); //deselect a single row
                            break;
                        default: // can be used to select rows as well, and will deselect all rows other than the subject rowNode if clearSelection is true
                            item.setSelected(true, true);
                            this.params.api.ensureIndexVisible(item.rowIndex);
                            break;
                    }
                }
            });
        }
    }
    public updateValue(response: WorksheetEventData, fieldToCompare: string, fieldToUpdate: string) {
        if (this.gridConfig.columnDefs.some(ele => ele.field === fieldToUpdate)) {
            this.params?.api.forEachNode((item: any) => {
                if (item.data[`${fieldToCompare}`] === response[`${fieldToCompare}`]) {
                    let rowNode = this.gridApi.getRowNode(item.id)!;
                    rowNode.setDataValue(`${fieldToUpdate}`, response.newValue);
                }
            });
        }
        //Required this for sorting
        // this.gridApi.refreshClientSideRowModel('sort');
        // this.gridApi.refreshClientSideRowModel('filter');
        this.changeDetection.detectChanges();
    }
    public clearSort(): void {
        this.gridColumnApi.applyColumnState({
            defaultState: { sort: null },
        });
    }

    public onCellKeyDown(cellEvent: CellKeyDownEvent): void {
        const keyEvent = cellEvent.event as KeyboardEvent;
        let colIsEditable = cellEvent?.colDef?.editable;
        let noFillUpDown = cellEvent?.colDef.cellRendererParams?.isDynamicDropdown && !cellEvent?.colDef.cellRendererParams?.isDropdownApplicable;
        if (keyEvent && keyEvent?.ctrlKey) {
            switch (keyEvent.key) {
                case KEYBOARD_EVENTS.UPFILLKEY:
                    if (this.agGridHelperService.isFillUpDownApplicable(noFillUpDown, cellEvent?.colDef?.field, colIsEditable)) {
                        this.fillUpDown(cellEvent, KEYBOARD_EVENTS.UPFILLKEY, cellEvent.value);
                    }
                    break;
                case KEYBOARD_EVENTS.DOWNFILLKEY:
                    if (this.agGridHelperService.isFillUpDownApplicable(noFillUpDown, cellEvent?.colDef?.field, colIsEditable)) {
                        this.fillUpDown(cellEvent, KEYBOARD_EVENTS.DOWNFILLKEY, cellEvent.value);
                    }
                    break;
                case KEYBOARD_EVENTS.UNDU:
                    this.undoRedoEvent.emit(keyEvent);
                    break;
                case KEYBOARD_EVENTS.REDO:
                    this.undoRedoEvent.emit(keyEvent);
                    break;
            }
        }
    }
    public showRowGroupPanel(param: boolean): void {
        let queryStringForGroupPanel = '';
        if (this.gridConfig?.panelId) {
            queryStringForGroupPanel = `#${this.gridConfig.panelId} #${this.gridConfig.id} .ag-column-drop-wrapper`;
        } else {
            queryStringForGroupPanel = `#${this.gridConfig.id} .ag-column-drop-wrapper`;
        }
        const columnDropElem = document.querySelector(queryStringForGroupPanel);
        if (param) {
            this.rowGroupPanelShow = 'always';
            columnDropElem?.classList.remove('ag-hidden');
            //In case of row grouping, ag-hidden class gets applied to internal element
            let columnDropInElem = document.querySelector(`#${this.gridConfig.id} .ag-column-drop-wrapper .ag-column-drop.ag-column-drop-horizontal`);
            columnDropInElem?.classList.remove('ag-hidden');
        } else {
            this.rowGroupPanelShow = 'never';
            columnDropElem?.classList.add('ag-hidden');
        }
    };
    public openColumnConfig(): void {
        const dialogConfig = new MatDialogConfig();
        this.reorderColumnOrder(); //Arrange column orderIndex as per column order
        const gridConfig = { id: this.gridConfig.id, columnDefs: this.gridConfig.columnDefs, hideGroupHeader: this.gridConfig.hideGroupHeader, gridColumnCustomConfig: this.gridConfig.gridColumnCustomConfig };
        dialogConfig.data = {
            gridConfig: JSON.parse(JSON.stringify(gridConfig)),
            groups: JSON.parse(JSON.stringify(this.params.columnApi.getColumnState().filter((x) => x.rowGroup))),
            sort: JSON.parse(JSON.stringify(this.params.columnApi.getColumnState().filter((x) => x.sort))),
            doNotCallGridConfigSaveAPI: this.gridConfig.doNotCallGridConfigSaveAPI,
            customGridConfigSaveAPI: this.gridConfig.customGridConfigSaveAPI,
            isPivotGrid: this.gridConfig.type === 'pivotGrid'
        };
        dialogConfig.width = '100%';
        const dialogRef = this.dialogRef.open(GridConfigComponent, dialogConfig);

        this._subscription.add(
            dialogRef.afterClosed().subscribe((data) => {
                if (data && data.onsaveClick) {
                    this.gridConfig.columnDefs = data.config.columnDefs;
                    this.gridConfig.columnDefs = this.agGridHelperService.getAgGridColumns(this.gridConfig.id, this.gridConfig.gridColumnCustomConfig);
                    if (this.gridConfig?.firstCheckBoxColumn) {
                        this.addCheckboxColumn();
                    }
                    if (!this.gridConfig.supressSrNo) {
                        this.addSequenceNoColumn();
                    }
                    //Sort the data as per order index
                    this.gridConfig.columnDefs.sort(
                        (a, b) => a?.cellRendererParams?.orderIndex - b?.cellRendererParams?.orderIndex,
                    );

                    const selectedRowNodes = this.gridApi.getSelectedNodes();
                    this.gridApi.setColumnDefs(this.gridConfig.columnDefs);
                    if (this.gridConfig.data.length) {
                        this.gridConfig.data = [];
                        this.gridApi.forEachNode((node) => {
                            if (!node.group) {
                                this.gridConfig.data.push(node.data);
                            }
                        });
                        this.gridApi?.setRowData(this.gridConfig.data);
                    }

                    this.showRowGroupPanel(true);

                    if (this.gridConfig.skipToParam) {
                        this.skipTo(this.gridConfig.skipToParam.colName, this.gridConfig.skipToParam.value);
                    }

                    this.changeDetection.detectChanges();

                    if (selectedRowNodes.length === this.gridConfig.data.length) {
                        this.params.api.selectAll();
                    } else if (selectedRowNodes.length > 0) {
                        this.gridApi.forEachNode((rowNode: RowNode) => {
                            if (!rowNode.group && selectedRowNodes.find((node) => node.id === rowNode.id)) {
                                rowNode.setSelected(true, false, true);
                            }
                        });
                    }

                    if (this.gridConfig?.firstCheckBoxColumn) {
                        this.overrideCheckboxHeaderSelection();
                    }

                    if (this.gridConfig?.isSelectAll) {
                        this.skipToInvoked = true;
                    }

                    this.gridApi.redrawRows();
                }
            }),
        );
    }

    public onSortChanged(param: SortChangedEvent) {
        param.api.refreshCells();
    }
    public onFilterChanged(param: SortChangedEvent) {
        param.api.refreshCells();
        let data = [];
        param.api.forEachNodeAfterFilter((ele) => {
            data.push(ele.data)
        })
        this.filterEvent.next(true);
    }

    //Private Methods
    public bindGrid(data?: any[]): void {
        this.gridConfig = {
            ...this.gridConfig,
            columnDefs: this.gridConfig.columnDefs.sort(
                (a, b) => a?.cellRendererParams?.orderIndex - b?.cellRendererParams?.orderIndex,
            ),
            rowHeight: this.gridConfig.rowHeight ?? 45,
            defaultColDef: this.defaultColDef,
            data: data ? data : this.gridConfig.data,
            rowSelection: this.gridConfig.rowSelection ? this.gridConfig.rowSelection : 'multiple',
            tooltipShowDelay: 0,
            tooltipHideDelay: 2000,
            height: this.gridConfig.height ? this.gridConfig.height : 'calc(100vh - 160px)',
            hideGroupHeader: this.gridConfig.hideGroupHeader ? true : false,
            excelStyles : !this.gridConfig.excelStyles || this.gridConfig.excelStyles.length === 0 ? this.excelStyles : this.gridConfig.excelStyles
        };
        if (this.gridConfig?.masterDetails?.show) {
            this.detailsGridColumns = this.agGridHelperService.getAgGridColumns(this.gridConfig.masterDetails.id);
        }
        this.changeDetection.detectChanges();
        if (this.gridApi && this.gridConfig?.setRowsForSelection?.items?.length) {
            this.setSelectedRows(this.gridConfig.setRowsForSelection.items, this.gridConfig.setRowsForSelection.field);
            this.gridApi.ensureIndexVisible(this.gridApi.getSelectedNodes()[0].rowIndex, null)
        }
    }
    //Called when one or more rows are selected or deselected using Ctrl or Shift keys.
    public onSelectionChanged(event: SelectionChangedEvent): void {
        if (this.skipToInvoked) {
            this.skipToInvoked = false;
        } else {
            this.selectedRow.emit(event);
            if (this.gridConfig?.setRowsForSelection?.items) {
                this.gridConfig.setRowsForSelection.items = [...this.gridApi.getSelectedRows()];
            }
        }
    }
    public setSelectedRows(items: RowNode[], fieldName) {
        this.gridApi.forEachNode((rowNode: RowNode) => {
            if (!rowNode.group && items.some((x) => x[fieldName] === rowNode.data[fieldName])) {
                rowNode.setSelected(true, false, true);
            }
        });
    }

    // This is ag-grid function and we need 'this'(local scope) here so used arrow function so that 'this' should be accessible
    public getMainMenuItems = (params: GetMainMenuItemsParams): (string | MenuItemDef)[] => {
        params.api.hidePopupMenu();
        // you don't need to switch, we switch below to just demonstrate some different options
        // you have on how to build up the menu to return
        let customMenuItems: (MenuItemDef | string)[] = params.defaultItems.slice(0);

        //Remove 'resetColumns' built in menu
        customMenuItems = customMenuItems.filter(ele => ele !== 'resetColumns');

        const colId = params.column.getColId();
        const column = params.columnApi.getColumnState().find(ele => ele.colId === colId);
        //Sort value can be asc, desc and '' when sort is not applied
        const isAscSort = column.sort === 'asc';
        const isDescSort = column.sort === 'desc';

        //TODO: add translation string here for names

        const descObj: MenuItemDef = {
            name: this.translate.instant('SORT_DESCENDING'),
            icon: '<mat-icon class="mat-icon notranslate menuicon material-icons mat-icon-no-color">arrow_downward</mat-icon>',
            action: () => {
                const columnstate = params.columnApi
                    .getColumnState()
                    .filter((ele) => ele.colId === params.column.getColId())
                    .map((ele) => {
                        ele.sort = ele.sort === 'desc' ? null : 'desc';
                        return ele;
                    });
                params.columnApi.applyColumnState({ state: columnstate });
            },
        };
        if (isDescSort) {
            descObj.cssClasses = ['ag-grid-menu-option-selected']; //Add css class to highlight menu option if sort is already applied
        }
        customMenuItems.unshift(descObj);

        const ascObj: MenuItemDef = {
            name: this.translate.instant('SORT_ASCENDING'),
            icon: '<mat-icon class="mat-icon notranslate menuicon material-icons mat-icon-no-color">arrow_upward</mat-icon>',
            action: () => {
                const columnstate = params.columnApi
                    .getColumnState()
                    .filter((ele) => ele.colId === params.column.getColId())
                    .map((ele) => {
                        ele.sort = ele.sort === 'asc' ? null : 'asc';
                        return ele;
                    });
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
            name: this.translate.instant('AUTOSIZEALLCOLUMNS'),
            action: () => {
                params.api.sizeColumnsToFit()
                params.columnApi.autoSizeAllColumns();
            },
        };
        customMenuItems[autoSizeIndex] = autoSizeAllColumnsObj;
        return customMenuItems;
    }
    // Added this method to position column menu pop up, which was hidding column menu option on header
    public postProcessPopup(params: PostProcessPopupParams): void {
        if (params.type !== "columnMenu") {
            return;
        }
        const columnId = params.column.getId();
        if (columnId) {
            let ePopup = params.ePopup;
            let oldTopStr = ePopup.style.top;
            oldTopStr = oldTopStr.substring(0, oldTopStr.indexOf("px"));
            const oldTop = parseInt(oldTopStr);
            const newTop = oldTop + 25;
            ePopup.style.top = newTop + "px";
        }
    };

    //To get the Menus of Grid Converted this function to arrow function
    public getContextMenuItems = (params: GetContextMenuItemsParams): (string | MenuItemDef)[] => {
        this.filterMenu = [];
        const contextMenu: (string | MenuItemDef)[] = [];
        let menus: Menu[] | MenuItemSummary[];
        if (this.gridConfig?.menuItems) {
            menus = this.gridConfig.menuItems;
        }
        if (params.node) {
            if (menus) {
                menus.forEach((element) => {
                    if (!element.colId || (element.colId && element.colId === params.column.getColId())) {
                        if (element.template && element.template != '') {
                            //TODO  @Amit Need to replace the template
                            if (eval(element.template.replaceAll('dataItem', 'params.node.data'))) {
                                this.filterMenu.push(element);
                            }
                        }
                        else {
                            this.filterMenu.push(element);
                        }
                    }
                })
            }
            if (this.filterMenu) {
                this.filterMenu.forEach((menu) => {
                    contextMenu.push({
                        name: menu.text,
                        icon: `<mat-icon class="mat-icon notranslate menuicon material-icons mat-icon-no-color">${menu.icon}</mat-icon>`,
                        action: () => {
                            this.onContextSelect.next({ menu: menu, data: params.node.data, rowIndex: params.node.rowIndex }); //@Sagar: added rowIndex to get reference of the particular row while renaming from pog library
                        },
                    });
                })
            }
            //Show sort option if sorting is applied to any column
            if (params.columnApi.getColumnState().some((ele) => ele.sort)) {
                contextMenu.push({
                    name: this.translate.instant('CLEAR_SORT'),
                    icon: '<mat-icon class="mat-icon notranslate menuicon material-icons mat-icon-no-color">sort</mat-icon>',
                    action: () => {
                        const columnstate = params.columnApi.getColumnState().map((ele) => {
                            if (this.gridConfig.defaultSort && ele.colId === this.gridConfig.defaultSort.field) {
                                ele.sort = this.gridConfig.defaultSort.sort === 'desc' ? 'desc' : 'asc';
                            } else {
                                ele.sort = null;
                            }
                            return ele;
                        });
                        params.columnApi.applyColumnState({ state: columnstate });
                    },
                });
            }

            //Show clear filter option if filtering is applied to any column
            if (Object.keys(params.api.getFilterModel()).length) {
                contextMenu.push({
                    name: this.translate.instant('CLEAR_FILTER'),
                    icon: '<mat-icon class="mat-icon notranslate menuicon material-icons mat-icon-no-color">sort</mat-icon>',
                    action: () => {
                        params.api.setFilterModel(null);
                        params.api.onFilterChanged();
                        if (this.gridConfig.filterActionRequired) {
                            this.clearFilterEvent.next(true);
                        }
                    },
                });
            }
        }
        return contextMenu;
    }

    private addSequenceNoColumn(): void {
        if (!this.gridConfig?.columnDefs?.some((x) => x[`field`] === `srno`)) {
            this.gridConfig?.columnDefs?.unshift({
                field: `srno`,
                headerName: ``,
                maxWidth: 60,
                minWidth: this.gridConfig.data.length > 999 ? 60 : this.gridConfig.data.length > 99 ? 50 : 40,
                pinned: 'left',
                // menuTabs: ['columnsMenuTab'],
                suppressMenu: true,
                suppressMovable: true,
                suppressNavigable: true,
                suppressFillHandle: true,
                resizable: false,
                sortable: false,
                editable: false,
                lockPosition: 'left',
                suppressAutoSize: true,
                suppressColumnsToolPanel: true,
                valueGetter: (params) => {
                    // Need this check when row might have expanded details and need to ignore those rows in case of serial no
                    // @TODO NOTE: valueGetters are very performance heavy. Need to be careful with this
                    if (params.node?.detailNode?.rowIndex && params.node.rowIndex !== 0) {
                        return params.node.rowIndex;
                    } else {
                        return params.node.rowIndex + 1;
                    }
                },
                enableRowGroup: false,
                cellStyle: (params: CellClassParams) => {
                    let style = {};
                    //Overried highlighted color
                    if (params?.data?.backgroundColor) {
                        if (params?.api?.getSelectedRows().length && params?.api?.getSelectedRows().find(ele => ele.$id == params.data.$id)) {
                            style = { ...style, ...{ backgroundColor: '#b5dbf2', color: '#6F6F6F' } };
                        } else {
                            const lightColor = this.agGridService.lightenDarkenColor(params?.data?.backgroundColor);
                            style = { ...style, ...{ backgroundColor: params?.data?.backgroundColor, color: lightColor } };
                        }
                    }
                    return style;
                }
            });
        }
    }
    //Added arrow function to get reference of this instance
    public isRowSelectable = (rowNode: RowNode): boolean => {
        if (!this.gridConfig?.firstCheckBoxColumn?.template) {
            return true;
        }
        let val = true;
        try {
            val = !eval(String(this.gridConfig?.firstCheckBoxColumn?.template).replaceAll('dataItem', 'rowNode.data'));
        } catch (error) {
            val = true;
        }
        return val
    }
    public onFirstDataRendered(params: FirstDataRenderedEvent): void {
        setTimeout(() => {
            if (this.gridConfig?.masterDetails?.show) {
                this.params?.api?.forEachNode((node) => {
                    node.setExpanded(false);
                });
            }
        });
    }

    public detailCellRendererParams: IDetailCellRendererParams = {
        detailGridOptions: {
            rowSelection: 'multiple',
            getMainMenuItems: this.getMainMenuItems,
            rowHeight: 60,
            headerHeight: 45,
            groupHeaderHeight: 45,
            isRowSelectable: this.isRowSelectable,
            multiSortKey: 'ctrl',
            sortingOrder: this.sortingOrder,
            animateRows: true,
            groupDefaultExpanded: -1,
            groupDisplayType: 'groupRows',
            groupRowRendererParams: this.groupRowRendererParams,
            autoGroupColumnDef: this.autoGroupColumnDef,
            rowGroupPanelShow: this.rowGroupPanelShow,
            suppressDragLeaveHidesColumns: true,
            suppressMakeColumnVisibleAfterUnGroup: true,
            postProcessPopup: this.postProcessPopup,
            excelStyles: this.excelStyles,
            defaultExcelExportParams: this.defaultExcelExportParams,
            getContextMenuItems: this.getContextMenuItems,
            getLocaleText: this.localeTextFunc,
            enableRangeSelection: true,
            columnDefs: this.agGridHelperService.getAgGridColumns('br-DashBoardGrid'),
            onCellClicked: (event: CellClickedEvent) => {
                this.onCellClicked(event);
            },
            defaultColDef: {
                ...this.defaultColDef,
                flex: 1,
            },
        },
        getDetailRowData: (params: GetDetailRowDataParams) => {
            params.successCallback(params.data.logDetails);
        },
    } as IDetailCellRendererParams;

    public addCheckboxColumn(): void {
        if (!this.gridConfig?.columnDefs?.some((x) => x[`field`] === ``)) {
            this.gridConfig.columnDefs.unshift({
                field: ``,
                headerName: ``,
                maxWidth: 60,
                pinned: 'left',
                suppressMenu: true,
                suppressMovable: true,
                suppressNavigable: true,
                resizable: false,
                editable: false,
                sortable: false,
                lockPosition: 'left',
                suppressFillHandle: true,
                suppressColumnsToolPanel: true,
                headerComponent: this.gridConfig.type ? CheckboxHeaderComponent : null,
                headerCheckboxSelection: this.gridConfig.hideSelectAll ? false : true,
                //checkboxSelection: true
                checkboxSelection: (params) => {
                    if (!this.gridConfig?.firstCheckBoxColumn?.template) {
                        return true;
                    }
                    let val = true;
                    try {
                        val = !eval(String(this.gridConfig?.firstCheckBoxColumn?.template).replaceAll('dataItem', 'params.data'));
                    } catch (error) {
                        val = true;
                    }
                    return val
                },
            });
        }
    }

    //Added this method if we want to handle checkbox column in custom mannor
    private addCustomCheckboxColumn(): void {
        this.gridConfig.columnDefs.unshift({
            field: ``,
            headerName: ``,
            maxWidth: 60,
            pinned: 'left',
            suppressMenu: true,
            suppressMovable: true,
            suppressNavigable: true,
            resizable: false,
            editable: false,
            sortable: false,
            lockPosition: 'left',
            suppressFillHandle: true,
            headerCheckboxSelection: true,
            cellRenderer: CheckboxComponent,
            cellRendererParams: {
                checkboxColumn: this.gridConfig.columnDefs.find(x => x.field === 'syncPogCheckbox')
            }
        });
    }
    private fillUpDown(params: CellKeyDownEvent, direction: string, value: string | number): void {
        const itemsToUpdate: any[] = [];
        const selectedRows = this.gridApi.getSelectedRows();
        if (selectedRows?.length > 1) {
            //Added this logic to handle fill up or fill down for selected rows only
            //First selected cell will be considered for value updation in fill up and fill down case
            selectedRows.forEach((row: RowNode) => {
                const data = row;
                this.valuesBeforeFilldown.push(this.populateOldValue(data, params.colDef.field));
                set(data, params.colDef.field, value);
                itemsToUpdate.push(data);
            });
            this.gridApi.deselectAll();
        } else {
            params.api.forEachNodeAfterFilterAndSort((rowNode: RowNode, index: number) => {
                if ((direction === 'd' && index <= params.rowIndex) || (direction === 'u' && index >= params.rowIndex)) {
                    return;
                }
                const data = rowNode.data;
                this.valuesBeforeFilldown.push(this.populateOldValue(data, params.colDef.field));
                set(data, params.colDef.field, value);
                itemsToUpdate.push(data);
            });
        }

        this.gridApi.applyTransactionAsync({ update: itemsToUpdate }, () => {
            this.gridApi.clearRangeSelection();
            this.changeDetection.detectChanges();
        })!;
        this.fillUpDownEvent.emit({
            updatedRows: itemsToUpdate,
            field: params.colDef.field,
            updatedValue: value,
            oldValues: this.valuesBeforeFilldown,
            params: params
        });
        this.valuesBeforeFilldown = [];
    }

    /** data can be of any type based on grid being loaded */
    private populateOldValue(data: any, field: string, oldValue?: any): FillDownOldValue {
        //In some cases, we might have boolean value that's why explicitly checking whether value should not be null or undefined
        return {
            id: data.IDPOGObject,
            field: field,
            oldValue: oldValue !== null && oldValue !== undefined ? oldValue : get(data, field),
            $id: data.$id,
            IDPegLibrary: data.IDPegLibrary
        };
    }

    public removeRows(itemsTodelete: any[]): void {
        this.gridApi.applyTransactionAsync({ remove: itemsTodelete }, () => {
            this.gridApi.refreshCells();
        })
    }

    private addItem(itemToAdd): void {
        this.gridApi.applyTransactionAsync({ add: itemToAdd })!;
        this.changeDetection.detectChanges();
    }

    private reorderColumnOrder(): void {
        let reorderedcolumnDefs = this.gridColumnApi.getAllDisplayedColumns();
        this.gridConfig.columnDefs.forEach((ele) => {
            if (ele.field !== "srno") {
                const updatedIndex = reorderedcolumnDefs.findIndex(col => col?.getColId() === ele.field)
                if (updatedIndex !== -1) {
                    ele.hide = false;
                    ele.cellRendererParams.orderIndex = updatedIndex - 1;
                } else {
                    ele.hide = true;
                }
            }
        })
    }

    public exportToExcelForPivotGrid(fileName: string) {
        let params: ExcelExportParams = {};
        params.fileName = fileName;
        params.exportMode = 'xlsx';
        this.gridApi.exportDataAsExcel(params);
    }

}
