import {
    Component,
    OnInit,
    AfterViewInit,
    OnChanges,
    OnDestroy,
    Input,
    ViewChild,
    Output,
    EventEmitter,
    SimpleChanges,
    NgZone,
    ViewEncapsulation,
    ElementRef,
    Renderer2,
    ChangeDetectorRef,
    TemplateRef,
    ChangeDetectionStrategy,
} from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';
import { trigger, style, transition, animate, state } from '@angular/animations';
import {
    State,
    SortDescriptor,
    GroupDescriptor,
    process,
    distinct,
    CompositeFilterDescriptor,
} from '@progress/kendo-data-query';
import {
    GridComponent,
    GridItem,
    RowClassArgs,
    SelectAllCheckboxState,
    PageChangeEvent,
    ColumnComponent,
    SelectionEvent,
} from '@progress/kendo-angular-grid';
import { IntlService } from '@progress/kendo-angular-intl';
import { TooltipDirective } from '@progress/kendo-angular-tooltip';
import { ExcelExportData } from '@progress/kendo-angular-excel-export';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { ConsoleLogService } from 'src/app/framework.module';
import { KendoColumnSetting, KednoGridConfig, MenuItemSummary } from '../../models';
import {
    WorksheetGridService,
    KendoService,
    SharedService,
    SaDashboardService,
    PlanogramService,
    Planogram_2DService,
    ConfigService,
    _,
  NotifyService,
  LanguageService
} from '../../services';
import { GridColumnFormatterPipe } from '../../pipe/columnFormatter/grid-column-formatter.pipe';
import { AppConstantSpace } from '../../constants';
import { KendoGridColumnConfigComponent } from './kendo-grid-column-config/kendo-grid-column-config.component';

const matches = (el, selector) => {
    return (el.matches || el.msMatchesSelector).call(el, selector);
};

declare const window: any;
const CLEAR_FILTER = `filter_list`; // `k-i-filter-clear`;
const CLEAR_SORT = `sort`; // `k-i-unsort`;

const numericTypes: string[] = ['number', 'numeric', 'integer', 'float'];
const dateTypes: string[] = ['date', 'datetime'];

@Component({
    selector: 'srp-kendo-grid',
    templateUrl: './kendo-grid.component.html',
    styleUrls: ['./kendo-grid.component.scss'],
    animations: [
        trigger('paGrid', [
            transition('void => *', [
                style({
                    transform: Math.floor(Math.random() * 2) == 1 ? 'translateX(100%)' : 'translateY(100%)',
                    opacity: 0.1,
                }),
                animate('1000ms ease-out'),
            ]),
        ]),
        trigger('settingsSecondaryIcon', [
            state('default', style({ transform: 'rotate(0deg)' })),
            state('loaded', style({ transform: 'rotate(720deg)' })),
            transition('loaded => default', animate('1500ms ease-out')),
            transition('default=> loaded', animate('1500ms ease-in')),
        ]),
        trigger('settingsPrimaryIcon', [
            state('loaded', style({})),
            state('default', style({ display: 'none' })),
            transition('loaded => default', animate('1800ms ease-in')),
            transition('default=> loaded', animate('1800ms ease-out')),
        ]),
    ],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush, // TODO: @malu why ?
})
export class KendoGridComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
    private _subscription = new Subscription();

    mySelectionPassive: any = null;

    public preIndex;
    private prevElementIndex = -1;
    public sectionID;
    public skeletonDateFormat: string;
    public skeletonDateTimeFormat: string;

    /** Page size is a constant, as virtual scrollong is implemented.
     *
     * To avoid unexpected behavior during scrolling, set pageSize to at least three times
     * the number of the visible Grid elements. The number of the visible Grid elements is
     * determined by the height and rowHeight settings of the Grid.
     *
     * Refer to: https://www.telerik.com/kendo-angular-ui/components/grid/scroll-modes/virtual/
     */
    public readonly pageSize = 50;

    constructor(
        private readonly ngZone: NgZone,
        private readonly kendoService: KendoService,
        private readonly saDashboardService: SaDashboardService,
        private readonly intl: IntlService,
        private readonly render: Renderer2,
        private readonly sharedService: SharedService,
        private readonly gridColumnFormatterPipe: GridColumnFormatterPipe,
        private readonly notifyService: NotifyService,
        private readonly ref: ChangeDetectorRef,
        private readonly dialogRef: MatDialog,
        private readonly translate: TranslateService,
        private readonly config: ConfigService,
        private readonly pipe: GridColumnFormatterPipe,
        private readonly planogramService: PlanogramService,
        private readonly planogram2dService: Planogram_2DService,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly log: ConsoleLogService,
        private readonly languageService: LanguageService,
    ) {
      this.skeletonDateFormat = this.languageService.getDateFormat();
      this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();

    }

    public get animate(): any {
        return {
            duration: 1000,
            type: 'slide',
        };
    }

    @ViewChild('edittemplate', { read: ElementRef }) public selectedCell;
    @ViewChild(`configColumn`, { static: true }) configColumn: TemplateRef<any>;
    @ViewChild(TooltipDirective) public tooltipDir: TooltipDirective;

    public groups: GroupDescriptor[] = [];
    public sort: SortDescriptor[] = [];
    public data: any[];
    public loading = true;
    public groupable = false;
    public columns: KendoColumnSetting[];
    public gridId: string;
    public detailExpand = false;
    public menuItems: any[] = [];
    public height = '50vh';
    public uniqueColumn: string;
    public excelData: any;
    public tempArrGroup: any = [];
    public filter: CompositeFilterDescriptor;
    public selectedCellData: any;
    public mySelection: any[];
    public mySelectionColumn = ``;
    public RowSelectionColumn = false;
    public customCss: string;
    public itemToRemove: any;
    public headerType: string;
    public previousFilterField: string;

    private keydownlistenerFn: () => void;
    private mouseoverlistenerFn: () => void;
    private mouseDownlistenerFn: () => void;
    private mouseUplistenerFn: () => void;
    private docClickSubscription: () => void;

    @Input() gridConfig: KednoGridConfig;
    @ViewChild(GridComponent) public grid: GridComponent;
    @ViewChild('grid', { read: ElementRef }) gridTemp;
    @Output() selectedRow = new EventEmitter<any>();
    @Output() stateChange = new EventEmitter<any>();
    @Output() doubleClickRow = new EventEmitter<any>();
    @Output() onContextSelect = new EventEmitter<any>();
    @Output() onContextOpen = new EventEmitter<any>();
    @Output() actionEventEmit = new EventEmitter<any>();
    @Output() rowValueUpdated = new EventEmitter<{ event; data }>();
    @Output() changeGridData = new EventEmitter();
    @Output() KeyEventsmWS = new EventEmitter();
    private editedRowIndex: number;
    private clickedRowItem: any;
    public skip = 0;
    showDetailedTooltip = false;
    content: { info: string; title: string };
    anchor: Element;
    private selectedItems: any[] = [];
    private scrollBy = '';
    private tmpSrNo: any;
    public objCopyOfMySelection: any[] = [];
    public selectAllState: SelectAllCheckboxState = 'unchecked';
    public colCorpDetail = [`#divisionName`, `#divisionCode`];
    // TODO: @malu calling service. move it to ngIninit or ctor
    public commonMenuItems = [
        {
            icon: CLEAR_FILTER,
            text: this.translate.instant('CLEAR_LOCAL_FILTER'),
        },
        {
            icon: CLEAR_SORT,
            text: this.translate.instant('CLEAR_LOCAL_SORT'),
        },
    ];

    public gridHeight = {
        height: 'calc(100vh - 140px)',
    };
    public settingsState = 'default';
    public fileName = 'export';
    public expandedDetailKeys: any[] = [];
    public expandId: any;
    public showSelectall: any = true;
    public showGroupHeader: any = true;
    public pdfPaperSize = "auto";


    @Output() pageChangeEventEmit = new EventEmitter<any>();

    ngOnInit(): void {
        this.settingsState = 'loaded';
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes && changes[`gridConfig`]) {
            this.data = [];
            this.objCopyOfMySelection = [];
            this.loadGridData();
            this.loading = false;
        }
        if (changes[`gridConfig`][`previousValue`]) {
            if (!this.gridConfig.customWidth) {
                this.fitColumns();
            }
        }
        if (changes[`gridConfig`][`currentValue`][`forceUpdate`]) {
            setTimeout((e) => {
                this.grid.autoFitColumns();
                this.ref.detectChanges();
            });
        }
    }

    ngAfterViewInit(): void {
        
        if (!this.gridConfig.customWidth) {
            this.fitColumns();
        }

        if (this.gridConfig.skipToRow) {
            this.skipTo(this.gridConfig.skipToRow.col, this.gridConfig.skipToRow.val);
        }

        this.docClickSubscription = this.render.listen(
            this.gridTemp.nativeElement,
            'click',
            this.onDocumentClick.bind(this),
        );

        setTimeout(() => {
            if (this.gridConfig && this.grid && this.gridConfig.selectAllCheckbox) {
                this.selectAllCheckbox(this.gridConfig.columns, this.gridConfig.data);
            }
        }, 1000);
    }

    public pageChange(event: PageChangeEvent): void {
        this.skip = event.skip;
        this.pageChangeEventEmit.emit(event);
    }

    private getMenus(gridId: string): MenuItemSummary[] {
        let gridMenus: MenuItemSummary[] = this.config.getGridMenus(gridId);

        if (this.commonMenuItems) {
            if (this.filter && this.filter.filters.length > 0) {
                gridMenus.push(this.commonMenuItems[0]);
            }
            if (this.sort && this.sort.length > 0) {
                if (!gridMenus.some(ele => ele.text === this.commonMenuItems[1].text)) {                
                    gridMenus.push(this.commonMenuItems[1]);
                }
            }
        }
        return gridMenus;
    }


    private onDocumentClick(e: any): void {
        // TODO: @malu why do you need this?
        if (matches(e.target, '.customevent')) {
            this.actionEventEmit.emit({
                element: e,
                dataItem: this.data.find(
                    (x) =>
                        x[`rowKey`] === e.target.value ||
                        x[`IdScenario`] === Number(e.target.value) ||
                        x[`generatedPogId`] === Number(e.target.value) ||
                        x[`combinedpogId`] === e.target.value ||
                        x[`IdPOGScenario`] === Number(e.target.value),
                ),
            });
        }
        if (matches(e.target, '.assignpog')) {
            this.actionEventEmit.emit(e.target.value);
        }
        if (matches(e.target, '.syncpog')) {
            this.actionEventEmit.emit({
                element: e,
                dataItem: this.data.find((x) => x[`IDPOG`] === Number(e.target.value)),
            });
            this.actionEventEmit.emit(e.target.value);
        }
        if (matches(e.target, '.syncAnchorpog')) {
            this.actionEventEmit.emit({
                element: e,
                dataItem: {
                    IDProduct: e.target.value,
                    id: e.target.getAttribute('id'),
                    tempId: e.target.getAttribute('tempId'),
                    Colmfield: e.target.getAttribute('Colmfield'),
                },
            });
        }
        if (matches(e.target, '.expandTableCell')) {
            this.data[e.target.value.split('_')[0]][e.target.value.split('_')[1]] =
                this.data[e.target.value.split('_')[0]][`shrinkCellValue`];
        }
        if (matches(e.target, '.shrinkCellValue')) {
            this.data[e.target.value.split('_')[0]][e.target.value.split('_')[1]] =
                this.data[e.target.value.split('_')[0]][`expandCellValue`];
            this.fitColumns();
        }
        if (matches(e.target, '.pLibRow')) {
            const val = e.target.closest('div').id;
            this.actionEventEmit.emit({
                element: e.target.getAttribute('data-text'),
                dataItem: this.data.find((x) => x[`IDPOG`] === Number(val)),
            });
        }
        if (
            matches(e.target, '.pLibRow') ||
            matches(e.target, '.favorite') ||
            matches(e.target, '.load') ||
            matches(e.target, '.unload') ||
            matches(e.target, '.customeventShelf')
        ) {
            let val = e.target.parentNode.id;
            if (!val || val === '') {
                val = e.target.parentNode.parentNode.id;
                if (val === '' && e.target.getAttribute('data-text') === this.uniqueColumn) {
                    val = e.target.innerText;
                }
            }
            this.actionEventEmit.emit({
                element: e.target.getAttribute('data-text'),
                dataItem: this.data.find((x) => x[`IDPOG`] === Number(val) || x[`IdPOGScenario`] === Number(val)),
            });
        }
        if (matches(e.target, '.ExcelSyncReport')) {
            this.actionEventEmit.emit({
                element: e,
                dataItem: {
                    link: this.data.find((x) => x[`IDSyncRequest`] === Number(e.target.closest('div').parentNode.id))[
                        'XLSAttachment'
                    ],
                },
            });
        }
        if (matches(e.target, '.PDFSyncReport')) {
            this.actionEventEmit.emit({
                element: e,
                dataItem: {
                    link: this.data.find((x) => x[`IDSyncRequest`] === Number(e.target.closest('div').parentNode.id))[
                        'PDFAttachment'
                    ],
                },
            });
        }
        if (matches(e.target, '.reportChart')) {
            let val = e.target.parentNode.id;
            if (!val || val === '') {
                val = e.target.parentNode.parentNode.id;
                if (val === '' && e.target.getAttribute('data-text') === this.uniqueColumn) {
                    val = e.target.innerText;
                }
            }
            this.actionEventEmit.emit({
                element: e.target.getAttribute('data-text'),
                dataItem: this.data.find(
                    (x) =>
                        x[`Id`] === Number(val) ||
                        x[`IDPOGAttachment`] === Number(val) ||
                        x[`IdPogAttachment`] === Number(val),
                ),
            });
        }
        if (matches(e.target, '.btn-npi-edit')) {
            this.actionEventEmit.emit({
                element: e.target.getAttribute('value'),
                dataItem: this.data.find((x) => x[`id`] === e.target.getAttribute('value')),
            });
        }
        if (matches(e.target, '.errorReport')) {
            this.actionEventEmit.emit({
                element: e.target.getAttribute('data-text'),
                dataItem: this.data.find((x) => x[`Code`] === e.target.getAttribute('value')),
            });
        }
        if (matches(e.target, '.overRideCheckbox')) {
            this.actionEventEmit.emit({
                element: 'overRideCheckbox',
                dataItem: this.data.find((x) => x[`IdPogLog`] === Number(e.target.getAttribute('value'))),
            });
        }
        if (matches(e.target, '.searchPlanogram')) {
            let val = e.target.parentNode.id;
            if (!val || val === '') {
                val = e.target.parentNode.parentNode.id;
                if (val === '' && e.target.getAttribute('data-text') === this.uniqueColumn) {
                    val = e.target.innerText;
                }
            }
            this.actionEventEmit.emit({
                element: e.target.getAttribute('data-text'),
                dataItem: this.data.find((x) => x[`IDPOG`] === Number(val)),
            });
        }
    }
    public destroyGrid() {
        this.groups = [];
        this.sort = [];
        this.filter = {
            filters: [],
            logic: 'and',
        };
    }
    ngOnDestroy(): void {
        if (this.grid?.pageChange) {
            this.grid?.pageChange.unsubscribe();
        }
        // TODO: why do you have to invoke these?
        if (this.mouseoverlistenerFn) {
            this.mouseoverlistenerFn();
        }
        if (this.mouseDownlistenerFn) {
            this.mouseDownlistenerFn();
        }
        if (this.mouseUplistenerFn) {
            this.mouseUplistenerFn();
        }
        if (this.keydownlistenerFn) {
            this.keydownlistenerFn();
        }
        if (this.docClickSubscription) {
            this.docClickSubscription();
        }
        const activeElements = document.getElementsByClassName(`isactivecell`);
        if (activeElements && activeElements.length > 0) {
            while (activeElements.length > 0) {
                activeElements[0].classList.remove(`isactivecell`);
            }
        }
        for (let j = 0; j < document.getElementsByClassName('dynamiccurser').length; j++) {
            document.getElementsByClassName('dynamiccurser')[j].remove();
        }
        this.objCopyOfMySelection = [];

        if (this._subscription) {
            this._subscription.unsubscribe();
        }
    }

    //shift + click  and ctrl + click
    public itemclicked(item, $event): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        switch (true) {
            case $event.ctrlKey:
                item.selected = true;
                //add to selctionobject
                this.ctrlSelectObject(item);
                this.planogramService.selectionEmit.next(true);
                break;
            case $event.shiftKey:
                item.selected = true;
                //add to selctionobject
                this.shiftSelectObject(item);
                this.planogramService.selectionEmit.next(true);
                break;
            case this.prevElementIndex === item.$id:
                this.prevElementIndex = -1;
                break;
        }
    }

    public ctrlSelectObject = (object) => {
        let lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(object.$sectionID); //Find last selected type
        let parentObj = this.sharedService.getObject(object.$idParent, this.sectionID); //Find parent of object
        if (
            (lastSelectedType != '' && object.ObjectDerivedType != lastSelectedType) ||
            (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                this.sharedService.getLastSelectedParentDerievedType(this.sectionID) ==
                AppConstantSpace.SHOPPINGCARTOBJ &&
                parentObj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ)
        ) {
            //if different object clicked
            return;
        }
        if (this.planogramService.rootFlags[this.sectionID].isModularView) {
            this.planogramService.removeAllSelection(this.sectionID);
        }
        this.planogramService.addToSelectionByObject(object, this.sectionID);
    };

    public shiftSelectObject = (object) => {
        let lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(object.$sectionID); //Find last selected type
        let parentObj = this.sharedService.getObject(object.$idParent, this.sectionID); //Find parent of object
        if (
            (lastSelectedType != '' && object.ObjectDerivedType != lastSelectedType) ||
            (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                this.sharedService.getLastSelectedParentDerievedType(this.sectionID) ==
                AppConstantSpace.SHOPPINGCARTOBJ &&
                parentObj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ)
        ) {
            //if different object clicked
            return;
        }

        this.planogram2dService.selectItemsWithShiftKey(object);
    };

    // Grid events
    public editHandler({ sender, rowIndex, dataItem }) {
        if (sender) {
            this.closeEditor(sender);
            this.editedRowIndex = rowIndex;
            sender.editRow(rowIndex);
        }
    }

    public cancelHandler({ sender, rowIndex }) {
        this.closeEditor(sender, rowIndex);
    }
    public openNotes(dataItem) { }
    public removeHandler({ dataItem }) { }
    public editTemplateValueChangeEvent = (event, data) => {
        this.selectedCellData = event.value;
        this.sharedService.GridValueUpdated(true);
        this.rowValueUpdated.emit({ event, data });
    };

    public skipTo(columnName: string, value: any, isRefresh?: boolean, previousIndex?: any) {
        let groupCount = 0;
        let ind = -1;
        let currentDataState;
        const pageSize = 20;
        let prevInd;
        let displayRowCount = 10;
        this.mySelectionColumn = columnName;

        if (this.grid) {
            if (this.data.length > 0) {
                if (this.mySelectionPassive) {
                    prevInd = process(this.data, {
                        sort: this.grid.sort,
                        filter: this.grid.filter,
                    }).data.findIndex(
                        (x) => String(x[columnName]).toLowerCase() === String(this.mySelectionPassive).toLowerCase(),
                    );
                }
                if (previousIndex !== undefined && previousIndex !== null) {
                    // Added for planogram-library
                    prevInd = previousIndex;
                } else {
                    this.mySelection.push(value);
                }
                if (this.grid.group.length > 0) {
                    let index = 0;
                    currentDataState = process(this.data, {
                        sort: this.grid.sort,
                        group: this.grid.group,
                        filter: this.grid.filter,
                    });
                    loop1: for (let i = 0; i < currentDataState.data.length; i++) {
                        index++;
                        groupCount++;
                        loop2: for (let j = 0; j < currentDataState.data[i].items.length; j++) {
                            index++;
                            if (currentDataState.data[i].items[j][`${columnName}`] === value) {
                                ind = index;
                                break loop1;
                            }
                        }
                    }
                } else {
                    currentDataState = process(this.data, {
                        sort: this.grid.sort,
                        filter: this.grid.filter,
                    });
                    ind = currentDataState.data.findIndex(
                        (x) => String(x[columnName]).toLowerCase() === String(value).toLowerCase(),
                    );
                }

                if (ind !== -1) {
                    if (ind >= displayRowCount) {
                        if (ind >= this.data.length - displayRowCount + groupCount) {
                            this.skip = this.data.length - displayRowCount - 5 + groupCount;
                        } else {
                            this.skip = ind - 1;
                        }
                    } else {
                        this.skip = 0;
                    }
                    this.skip = this.skip < 0 ? 0 : this.skip; //if skip value is -ve default to 0;
                    setTimeout(() => {
                        if (!isRefresh) {
                            this.fitColumns();
                        }
                        // scroll after fit columns

                        setTimeout(() => {
                            document.querySelectorAll(`.k-state-selected`).forEach((item1) => item1.scrollIntoView());
                            this.ref.markForCheck();
                        });
                    });
                } else {
                    this.ngZone.run(() => {
                        this.notifyService.warn(`Product not found`, `GOT IT!`);
                    });
                }
                this.ref.markForCheck();
            }
        }
    }
    public skiponly(columnName: string, value: any) {
        let index = 0;
        // conflicts with row selectionKey.
        // this.mySelectionColumn = columnName;
        const prevInd = process(this.data, {
            sort: this.grid.sort,
            filter: this.grid.filter,
        }).data.findIndex((x) => String(x[columnName]).toLowerCase() === String(this.mySelectionPassive).toLowerCase());

        const ind = process(this.data, {
            sort: this.grid.sort,
            filter: this.grid.filter,
        }).data.findIndex((x) => String(x[columnName]).toLowerCase() === String(value).toLowerCase());
        this.mySelectionPassive = value;
        if (ind !== -1) {
            if (ind >= 20 || (prevInd >= 20 && ind <= 20)) {
                if (this.grid.group.length > 0) {
                    const filtered = process(this.data, {
                        group: this.grid.group,
                        sort: this.grid.sort,
                        filter: this.grid.filter,
                    });
                    filtered.data.forEach((group) => {
                        index += 1;
                        group.items.forEach((item) => {
                            index += 1;
                            if (item[`${columnName}`] === value) {
                                this.skip = index - 2;
                                setTimeout(() => {
                                    Array.from(document.querySelectorAll(`.passive`)).forEach((item1) =>
                                        item1.scrollIntoView(),
                                    );
                                });
                            }
                        });
                    });
                } else {
                    process(this.data, {
                        sort: this.grid.sort,
                        filter: this.grid.filter,
                    }).data.forEach((item) => {
                        index += 1;
                        if (item[`${columnName}`] === value) {
                            this.skip = index - 2;
                            setTimeout(() => {
                                Array.from(document.querySelectorAll(`.passive`)).forEach((item1) =>
                                    item1.scrollIntoView(),
                                );
                            });
                        }
                    });
                }
            } else {
                setTimeout(() => {
                    Array.from(document.querySelectorAll(`.passive`)).forEach((item1) => item1.scrollIntoView());
                    this.fitColumns();
                });
            }
        }
    }

    // TODO: @malu what is the alternative?
    public KeyupEvent(event) {
        this.KeyEventsmWS.emit(event);
    }

    public cellClickHandler({ sender, rowIndex, columnIndex, dataItem, isEdited }) {
        if (this.gridConfig.id == 'SHELF_POSITION_WORKSHEET' && this.columns[columnIndex]['editable'] == true) {
            columnIndex = columnIndex - (this.gridConfig.firstCheckBoxColumn ? 1 : 0);
            // this.selectedCellData = dataItem[this.columns[columnIndex][`field`]];
            let fieldEditable = this.worksheetGridService.checkIffieldEditable(
                this.columns[columnIndex][`field`],
                dataItem,
            );
            if (!fieldEditable) {
                this.notifyService.warn(
                    this.columns[columnIndex][`field`] + ' is not editable for the selected position.',
                );
                this.mySelection = [];
                return;
            }
        }
        if (eval(this.gridConfig?.rowEditTemplate)) {
            return; //if rowEdittemplate is true row will not be edited
        }
        if (!isEdited) {
            sender.editCell(rowIndex, columnIndex);
            const filteredData = process(this.data, {
                sort: this.grid.sort,
                filter: this.grid.filter,
            }).data;
            columnIndex = columnIndex - (this.gridConfig.firstCheckBoxColumn ? 1 : 0);
            this.selectedCellData = dataItem[this.columns[columnIndex][`field`]];
            const tempele = document.getElementById(`tempElement`);
            if (tempele) {
                tempele.remove();
            }
            let fName;
            let selectedRows = [];
            const activeElements = document.getElementsByClassName(`isactivecell`);
            if (activeElements && activeElements.length > 0) {
                while (activeElements.length > 0) {
                    activeElements[0].classList.remove(`isactivecell`);
                }
            }
            if (this.keydownlistenerFn) {
                this.keydownlistenerFn();
            }
            if (this.gridConfig.fillDownRequired) {
                this.keydownlistenerFn = this.render.listen(document, `keydown`, (e) => {
                    if (e.key === `d` && e.ctrlKey) {
                        e.preventDefault();
                        const temp = document.getElementById(`tempElement`);
                        if (temp) {
                            this.shortCutFillUPAndDown(rowIndex, columnIndex, dataItem, `DOWN`);
                            this.closeEditor(sender, rowIndex);
                        }
                    } else if (e.key === `u` && e.ctrlKey) {
                        e.preventDefault();
                        const temp = document.getElementById(`tempElement`);
                        if (temp) {
                            this.shortCutFillUPAndDown(rowIndex, columnIndex, dataItem, `UP`);
                            this.closeEditor(sender, rowIndex);
                        }
                    } else if (e.keyCode === 13 || e.keyCode === 40) {
                        this.closeEditor(sender, rowIndex);
                        sender.editCell(rowIndex + 1, columnIndex);
                    }
                });
            }
            setTimeout(() => {
                const ele = document.querySelector(`.k-grid-edit-cell`);
                if (ele) {
                    ele.className = `${ele.className} isactivecell`;
                    const coordinates = ele.getBoundingClientRect();
                    let dynamincdiv;
                    if (this.gridConfig.fillDownRequired) {
                        dynamincdiv = this.render.createElement(`div`);
                        this.render.appendChild(ele, dynamincdiv);
                        this.render.setAttribute(dynamincdiv, `id`, `tempElement`);
                        this.render.addClass(dynamincdiv, `dynamincdiv`);

                        this.mouseDownlistenerFn = this.render.listen(dynamincdiv, `mousedown`, () => {
                            this.render.addClass(dynamincdiv, `dynamiccurser`);
                            this.mouseoverlistenerFn = this.render.listen(
                                this.gridTemp.nativeElement,
                                `mouseover`,
                                (event) => {
                                    if (
                                        event.target.nodeName === `TD` &&
                                        columnIndex - this.grid.lockedColumns.length ===
                                        event.target.cellIndex - (this.gridConfig.firstCheckBoxColumn ? 1 : 0)
                                    ) {
                                        const nextelement = event.target;
                                        nextelement.classList.add(`isactivecell`);
                                        const gridId = nextelement.getAttribute('id').split('-')[1];
                                        const tmpRowIndex = nextelement
                                            .getAttribute('id')
                                            .split('-')[2]
                                            .slice(
                                                nextelement.getAttribute('id').split('-')[2].indexOf('r') + 1,
                                                nextelement.getAttribute('id').split('-')[2].indexOf('c'),
                                            );
                                        const tmpColumnIndex = nextelement
                                            .getAttribute('id')
                                            .split('-')[2]
                                            .slice(
                                                nextelement.getAttribute('id').split('-')[2].indexOf('c') + 1,
                                                nextelement.getAttribute('id').split('-')[2].length,
                                            );
                                        const firstTdId = `k-` + gridId + `-r` + tmpRowIndex + `c0`;
                                        if (document.getElementById(firstTdId)) {
                                            this.tmpSrNo =
                                                document.getElementById(firstTdId).childNodes[0].childNodes[1];
                                        }
                                        const selectedTD = {
                                            id: event.target.getAttribute('id'),
                                            rowIndex: Number(tmpRowIndex),
                                            colIndex: Number(tmpColumnIndex),
                                            reflectColumnIndex: Number(tmpColumnIndex),
                                            reflectRowIndex: Number(tmpRowIndex) - 1,
                                            srno: this.tmpSrNo ? Number(this.tmpSrNo.value) : 0,
                                        };
                                        if (!this.selectedItems.some((x) => x.id === selectedTD.id)) {
                                            this.selectedItems.push(selectedTD);
                                        }
                                        const coordinatestmp = nextelement.getBoundingClientRect();
                                        if (coordinates.y < coordinatestmp.y) {
                                            if (this.selectedItems.length > 0) {
                                                this.scrollBy = `mouseDown`;
                                            }
                                            this.selectedItems.push(selectedTD);
                                            const scroll = document
                                                .getElementById(this.gridId)
                                                .getElementsByClassName(`k-grid-content k-virtual-content`);
                                            if (event.pageY > 400) {
                                                const yOffset = 16000;
                                                const y =
                                                    scroll[0].getBoundingClientRect().top +
                                                    window.pageYOffset +
                                                    yOffset;
                                                scroll[0].scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'end',
                                                    inline: 'start',
                                                });
                                                scroll[0].scrollTo({ top: y, behavior: 'smooth' });
                                            }
                                        } else {
                                            if (this.selectedItems.length > 0) {
                                                this.scrollBy = `mouseUp`;
                                            }
                                            const scroll = document
                                                .getElementById(this.gridId)
                                                .getElementsByClassName(`k-grid-content k-virtual-content`);
                                            if (event.pageY < 300) {
                                                const yOffset = -16000;
                                                const y =
                                                    scroll[0].getBoundingClientRect().top +
                                                    window.pageYOffset +
                                                    yOffset;
                                                scroll[0].scrollIntoView({
                                                    behavior: 'smooth',
                                                    block: 'end',
                                                    inline: 'start',
                                                });
                                                scroll[0].scrollTo({ top: y, behavior: 'smooth' });
                                            }
                                        }
                                    }
                                },
                            );
                            this.mouseUplistenerFn = this.render.listen(this.gridTemp.nativeElement, `mouseup`, () => {
                                if (this.selectedItems && this.selectedItems.length > 1) {
                                    if (this.scrollBy === `mouseDown`) {
                                        const val = { ...this.selectedItems[this.selectedItems.length - 1] };
                                        if (val[`rowIndex`] <= this.data.length) {
                                            val[`id`] = val[`id`].replace(
                                                `-r${val[`rowIndex`]}c`,
                                                `-r${val[`rowIndex`] + 1}c`,
                                            );
                                            val[`rowIndex`] = val[`rowIndex`] + 1;
                                            val[`reflectRowIndex`] = val[`reflectRowIndex`] + 1;
                                            val[`srno`] = val[`srno`] + 1;
                                            this.selectedItems.push(val);
                                        }
                                        this.selectedItems.sort((a, b) => (Number(a) > Number(b) ? -1 : 1));
                                    } else if (this.scrollBy === `mouseUp`) {
                                        this.selectedItems.sort((a, b) => (Number(a) > Number(b) ? 1 : -1));
                                    }
                                    const firstElement = this.selectedItems[0];
                                    const lastElement = this.selectedItems[this.selectedItems.length - 1];
                                    const rowDiff = lastElement.rowIndex + 1 - firstElement.rowIndex;
                                    if (rowDiff == this.selectedItems.length) {
                                        for (let index = 0; index <= this.selectedItems.length - 1; index++) {
                                            const fieldname =
                                                this.columns[
                                                this.selectedItems[index].reflectColumnIndex -
                                                (this.gridConfig.firstCheckBoxColumn ? 1 : 0)
                                                ][`field`];
                                            fName = fieldname;
                                            const rowNum = this.selectedItems[index].reflectRowIndex;
                                            if (this.grid.group && this.grid.group.length > 0) {
                                                this.selectedItems.forEach((item) => {
                                                    for (let i = 0; i < filteredData.length; i++) {
                                                        if (filteredData[i].srno === item.srno) {
                                                            filteredData[Number(i)][fieldname] = this.selectedCellData;
                                                            filteredData[Number(rowNum)][`Dirty`] = true;
                                                            selectedRows.push(filteredData[Number(rowNum)]);
                                                        }
                                                    }
                                                });
                                            } else {
                                                if (fieldname.indexOf('_template') !== -1) {
                                                    filteredData[Number(rowNum)][fieldname.replace('_template', '')] =
                                                        this.selectedCellData;
                                                }
                                                filteredData[Number(rowNum)][fieldname] = this.selectedCellData;
                                                filteredData[Number(rowNum)][`Dirty`] = true;
                                                selectedRows.push(filteredData[Number(rowNum)]);
                                            }
                                        }
                                    } else {
                                        for (let index = firstElement.rowIndex; index < lastElement.rowIndex; index++) {
                                            const fieldname =
                                                this.columns[
                                                lastElement.colIndex - (this.gridConfig.firstCheckBoxColumn ? 1 : 0)
                                                ][`field`];
                                            fName = fieldname;
                                            const rowNum = index - 1;
                                            if (this.grid.group && this.grid.group.length > 0) {
                                                this.selectedItems.forEach((item) => {
                                                    for (let i = 0; i < filteredData.length; i++) {
                                                        if (filteredData[i].srno === item.srno) {
                                                            filteredData[Number(i)][fieldname] = this.selectedCellData;
                                                            filteredData[Number(rowNum)][`Dirty`] = true;
                                                            selectedRows.push(filteredData[Number(i)]);
                                                        }
                                                    }
                                                });
                                            } else {
                                                if (fieldname.indexOf('_template') !== -1) {
                                                    filteredData[Number(rowNum)][fieldname.replace('_template', '')] =
                                                        this.selectedCellData;
                                                }
                                                filteredData[Number(rowNum)][fieldname] = this.selectedCellData;
                                                filteredData[Number(rowNum)][`Dirty`] = true;
                                                selectedRows.push(filteredData[Number(rowNum)]);
                                            }
                                        }
                                    }
                                    if (this.filter && this.filter.filters && this.filter.filters.length > 0) {
                                        const tempFilter = { ...this.filter };
                                        this.filterChange(tempFilter);
                                    }
                                    let data = {
                                        selectedcols: selectedRows,
                                        selectedData: this.selectedCellData,
                                        field: fName,
                                    };
                                    this.changeGridData.emit(data);
                                }
                                this.sharedService.GridValueUpdated(true);
                                const element = document.getElementById(`tempElement`);
                                if (element) {
                                    element.remove();
                                }
                                if (this.selectedItems && this.selectedItems.length > 0) {
                                    for (let index = 0; index <= this.selectedItems.length - 1; index++) {
                                        if (document.getElementById(this.selectedItems[index].id) !== null) {
                                            document
                                                .getElementById(this.selectedItems[index].id)
                                                .classList.remove(`isactivecell`);
                                        }
                                    }
                                    this.selectedItems = [];
                                    const activeElements = document.getElementsByClassName(`isactivecell`);
                                    if (activeElements && activeElements.length > 0) {
                                        while (activeElements.length > 0) {
                                            activeElements[0].classList.remove(`isactivecell`);
                                        }
                                    }
                                }
                                this.closeEditor(sender, rowIndex);
                                if (this.mouseoverlistenerFn) {
                                    this.mouseoverlistenerFn();
                                }
                                if (this.mouseDownlistenerFn) {
                                    this.mouseDownlistenerFn();
                                }
                                if (this.mouseUplistenerFn) {
                                    this.mouseUplistenerFn();
                                }
                            });
                        });
                    }
                }
            });
        }
    }

    public shortCutFillUPAndDown(rowIndex, columnIndex, dataItem, direction: string) {
        let selectedcols = [];
        let groupedData = [];
        groupedData = process(this.data, {
            sort: this.grid.sort,
            filter: this.grid.filter,
        })[`data`];

        if (this.grid.group && this.grid.group.length > 0) {
            groupedData = [];
            process(this.data, {
                group: this.grid.group,
                filter: this.grid.filter,
            })[`data`].forEach((element) => {
                element.items.forEach((ele) => {
                    groupedData.push(ele);
                });
            });
        }

        switch (direction) {
            case `UP`:
                for (let index = rowIndex; index >= 0; index--) {
                    if (this.columns[columnIndex][`field`].indexOf('_template') !== -1) {
                        groupedData[index][this.columns[columnIndex][`field`].replace('_template', '')] =
                            this.selectedCellData;
                        selectedcols.push(groupedData[index]);
                    }
                    groupedData[index][this.columns[columnIndex][`field`]] = this.selectedCellData;
                    groupedData[index][`Dirty`] = true;
                }
                break;
            case `DOWN`:
                for (let index = rowIndex; index <= groupedData.length - 1; index++) {
                    if (this.columns[columnIndex][`field`].indexOf('_template') !== -1) {
                        groupedData[index][this.columns[columnIndex][`field`].replace('_template', '')] =
                            this.selectedCellData;
                        selectedcols.push(groupedData[index]);
                    }
                    groupedData[index][this.columns[columnIndex][`field`]] = this.selectedCellData;
                    groupedData[index][`Dirty`] = true;
                }
                break;
            default:
                break;
        }
        const tempele = document.getElementById(`tempElement`);
        if (tempele) {
            tempele.remove();
        }
        const activeElements = document.getElementsByClassName(`isactivecell`);
        if (activeElements && activeElements.length > 0) {
            while (activeElements.length > 0) {
                activeElements[0].classList.remove(`isactivecell`);
            }
        }
        this.sharedService.GridValueUpdated(true);
        let field = this.columns[columnIndex][`field`];
        let selectedData = this.selectedCellData;
        let data = {
            selectedcols,
            field,
            selectedData,
        };
        this.changeGridData.emit(data);
    }

    public onStateChangeHandler(state: State) {
        this.stateChange.emit();
    }

    // TODO: @malu Remove all empty event bindings
    public cellCloseHandler(args: any) { }

    public columnLockedChangeHandler = (events) => { };

    public columnResizeHandler = (events) => {
        if (events) {
            const columns = this.saDashboardService.GetGridColumns(this.gridId);
            const index = columns.findIndex(
                (x) =>
                    x['field'] === events[0].column[`field`] || x['field'] + '_template' === events[0].column[`field`],
            );
            if (index !== -1) {
                columns[index]['width'] = events[0].newWidth;
            } else {
                const i = columns.findIndex(
                    (x) =>
                        (x['field'].includes('.') && x['field'].split('.').join('_') === events[0].column[`field`]) ||
                        (x['field'].includes('.') &&
                            x['field'].split('.').join('_') + '_template' === events[0].column[`field`]),
                );
                if (i !== -1) {
                    columns[i]['width'] = events[0].newWidth;
                }
            }
            this.saDashboardService.setGridColumns(this.gridId, columns);
            const finalColumns = this.saDashboardService.setUserPrefGridColumns(this.gridId, columns);

            this._subscription.add(
                this.kendoService.updateGridConfig(finalColumns, this.gridId, 'true').subscribe(
                    (res) => {
                        this.log.info(`kendo-grid.component: setUserPrefGridColumns completed.`, res);
                    },
                    (err) => {
                        this.log.error(`kendo-grid.component: setUserPrefGridColumns API call failed.`, err);
                    },
                ),
            );
        }
    };

    //@Pranay - Below code is commeted as per discussion with QA Jayanthi, as there is no requirement to store grid information into DB when changes made from Grid events
    // Implementation updated as existing changes were not working correctly for locked columns
    public columnReorderHandler = (events) => {
        // if (events) {
        //   let colsToUpdate = [...this.columns];
        //   colsToUpdate.shift()
        //   colsToUpdate = this.moveArrayItemToNewIndex(
        //     colsToUpdate,
        //     events.oldIndex - 1,
        //     events.newIndex - 1
        //   )
        //   const lockedCol = colsToUpdate.filter(x => x['locked'] && (x['field'] !== events.column.field || `${x['field']}_template` !== events.column.field));
        //   if (lockedCol?.length > 0) {
        //     if (events.newIndex - 1 <= lockedCol.length) {
        //       colsToUpdate[events.newIndex - 1]['locked'] = true;
        //     }
        //   }
        //   const col = colsToUpdate.findIndex(x => x['field'] === events.column.field || x['field'] === `${events.column.field}_template` );
        //   if (colsToUpdate[col]['locked'] && events.newIndex - 1 >= lockedCol.length) {
        //     colsToUpdate[col]['locked'] = false;
        //   }
        //   const columns = this.saDashboardService.GetGridColumns(this.gridId);
        //   columns.forEach((element) => {
        //     const index = colsToUpdate.findIndex(x => x['field'] === element['field'] || x['field'] === `${element['field']}_template`);
        //     if (index !== -1) {
        //       element[`orderIndex`] = index;
        //       element[`locked`] = colsToUpdate[index]['locked'];
        //     }
        //   });
        //   const finalColumns = this.saDashboardService.setGridColumns(
        //     this.gridId,
        //     columns
        //   );
        //   this._subscription.add(
        //     this.kendoService.updateGridConfig(finalColumns, this.gridId, 'true')
        //       .subscribe((res) => {
        //         this.log.info(`kendo-grid.component: setUserPrefGridColumns completed.`, res);
        //       }, (err) => {
        //         this.log.error(`kendo-grid.component: setUserPrefGridColumns API call failed.`, err);
        //       }));
        // }
    };
    public onCellClick = (e) => {
        this.clickedRowItem = e.dataItem;
    };
    public onDblClick = () => {
        this.doubleClickRow.emit(this.clickedRowItem);
    };

    // TODO: @malu Column Change has to save data to DB / local storage
    // Below code needs to be enabled and tested.
    public columnVisibilityChangeHandler = (events) => {
        // if (events) {
        //   const columns = this.saDashboardService.GetGridColumns(this.gridId);
        //   events.columns.forEach((column) => {
        //     columns.find((x) => x[`field`] === column[`field`])[`hidden`] =
        //       column[`hidden`];
        //   });
        //   const finalColumns = this.saDashboardService.setGridColumns(
        //     this.gridId,
        //     columns
        //   );
        //   this.kendoService.updateGridConfig(finalColumns, this.gridId);
        //   this.fitColumns();
        // }
    };

    public groupChangeHandler = (groups: GroupDescriptor[]) => {
        this.groups = groups;
        // const columns = this.saDashboardService.GetGridColumns(this.gridId);
        // columns.forEach((element) => {
        //   element[`groupable`] = false;
        //   element[`groupOrder`] = 0;
        // });
        // if (groups && groups.length > 0) {
        //   groups.forEach((sortItem, i) => {
        //     const index = columns.findIndex(
        //       (x) => x[`field`] === sortItem[`field`]
        //     );
        //     columns[index][`groupable`] = true;
        //     columns[index][`groupOrder`] = i;
        //   });
        //   this.groups =[...groups];
        // }
        // const finalColumns = this.saDashboardService.setGridColumns(
        //   this.gridId,
        //   columns
        // );
        // this.kendoService.updateGridConfig(finalColumns, this.gridId);
    };

    previousSort: any;
    public sortChangeHandler = (sort: SortDescriptor[]) => {
        const arryItems = ['desc', 'asc', undefined];
        let tempSort = [...sort];
        if (tempSort?.length > 0 && tempSort.some((x) => x['field'].includes('_template'))) {
            let menuClickSortOption;
            if (Object.keys(sort[sort.length - 1])[0] === 'field') {
                menuClickSortOption = sort[sort.length - 1]['dir'];
            }
            tempSort.forEach((item, i) => {
                let fieldTemplate = this.columns.find((x) => x['field'] === item['field']);
                if (!fieldTemplate) {
                    fieldTemplate = this.columns.find((x) => x['field'] === item['field'] + '_template');
                }
                if (!fieldTemplate['SortByTemplate'] && item['field'].includes('_template')) {
                    const splittedField = item['field'].split('_').slice(0, -1).join('_');
                    const ind = tempSort.findIndex((x) => x['field'] === splittedField);
                    if (ind !== -1) {
                        let dirInd = arryItems.indexOf(tempSort[ind]['dir']);
                        const checknull = this.previousSort?.some(
                            (x) => x['field'] === tempSort[ind]['field'] && !x['dir'],
                        );
                        if (checknull) {
                            dirInd++;
                        }
                        switch (dirInd) {
                            case 0:
                                tempSort[ind]['dir'] = menuClickSortOption ? menuClickSortOption : 'asc';
                                break;
                            case 1:
                                tempSort[ind]['dir'] = menuClickSortOption ? menuClickSortOption : undefined;
                                break;
                            default:
                                tempSort[ind]['dir'] = menuClickSortOption ? menuClickSortOption : 'desc';
                                break;
                        }
                        tempSort.splice(i, 1);
                    } else {
                        item['field'] = splittedField;
                        const checknull = this.previousSort?.some((x) => x['field'] === item['field'] && !x['dir']);
                        if (checknull) {
                            item['dir'] = 'desc';
                        }
                    }
                }
            });
            this.data = process(this.data, { sort: tempSort }).data;
            sort = _.cloneDeep(tempSort);
            this.previousSort = _.cloneDeep(tempSort);
            this.ref.markForCheck();
        }

        if (sort && sort.length > 0 && sort.some((x) => x[`dir`])) {
            this.sort = sort.filter((x) => x[`dir`]);
            if (!this.menuItems.some((x) => x[`icon`] === CLEAR_SORT)) {
                this.menuItems.push(this.commonMenuItems[1]);
            }
        } else {
            this.sort = [];
            this.menuItems = this.menuItems.filter((x) => x[`icon`] !== CLEAR_SORT);
        }
    };

    public detailCollapseHandler = (events) => { };
    public detailExpandHandler = (events) => { };
    public getAllGroups(groupD) {
        if (groupD.items) {
            groupD.items.forEach((items) => {
                if (items.items) {
                    this.getAllGroups(items);
                } else {
                    this.tempArrGroup.push(items);
                }
            });
        }
    }

    public onSelectedKeysChange(e: EventEmitter<any[]>) {
        const len = this.mySelection.length;

        if (len === 0) {
            this.selectAllState = 'unchecked';
        } else if (
            len > 0 &&
            len < process(this.data, { sort: this.grid.sort, filter: this.grid.filter }).data.length
        ) {
            this.selectAllState = 'indeterminate';
        } else {
            this.selectAllState = 'checked';
        }
    }

    filterOpened = (event) => {
        this.previousFilterField = event.column.field;
    };

    public onSelectAllCheckBoxChange = (checkedState: SelectAllCheckboxState) => {
        if (checkedState === 'checked') {
            this.mySelection = process(this.data, {
                sort: this.grid.sort,
                filter: this.grid.filter,
            }).data.map((item, index) => (this.mySelectionColumn ? item[this.mySelectionColumn] : index));
            this.objCopyOfMySelection = process(this.data, {
                sort: this.grid.sort,
                filter: this.grid.filter,
            }).data.map((item) => item);
            this.selectAllState = 'checked';
        } else {
            this.mySelection = [];
            this.objCopyOfMySelection = [];
            this.selectAllState = 'unchecked';
        }
    };

    public filterChange(filter: CompositeFilterDescriptor): void {
        if (filter.filters.length > 0) {
            filter?.filters.forEach((element) => {
                if (element && element['filters']) {
                    switch (true) {
                        case element['filters'].some((x) => x['value'] === 'EMPTY'):
                            const i = element['filters'].findIndex((x) => x['value'] === 'EMPTY');
                            element['filters'][i]['value'] = '';
                            break;
                        case element['filters'].some((x) => x['value'] === 'NULL'):
                            const j = element['filters'].findIndex((x) => x['value'] === 'NULL');
                            element['filters'][j]['value'] = null;
                            break;
                        case element['filters'].some((x) => x['value'] === 'UNDEFINED'):
                            const k = element['filters'].findIndex((x) => x['value'] === 'UNDEFINED');
                            element['filters'][k]['value'] = undefined;
                            break;
                    }
                }
            });
        }

        if (filter?.filters?.length > 0 && filter?.filters[0]['field']) {
            if (
                !this.filter.filters
                    .map((x) => x['filters'])
                    ?.find((x) => x && x['field'] && x['field'] === filter.filters[0]['field'])
            ) {
                if (filter?.filters[0] && filter?.filters[0]['field']) {
                    const ind = this.filter.filters.findIndex((x) => x['field'] === filter?.filters[0]['field']);
                    if (ind !== -1) {
                        this.filter.filters[ind] = filter?.filters[0];
                    } else {
                        this.filter = {
                            ...this.filter,
                            filters: [...this.filter.filters.concat(filter?.filters[0])],
                        };
                    }
                }
            }
        } else {
            if (filter?.filters?.length === 0 && this.filter?.filters?.length > 1) {
                const filteredArry = [...this.filter.filters.filter((x) => x['field'] !== this.previousFilterField)];
                const tempArr = this.filter.filters
                    .filter((x) => x['filters'])
                    .filter((x) => x['filters'].find((y) => y['field'] !== this.previousFilterField));
                this.filter = {
                    ...this.filter,
                    filters: [...filteredArry, ...tempArr],
                };
            } else {
                this.filter = filter;
            }
        }

        if (this.filter.filters.length === 0) {
            this.menuItems = this.menuItems.filter((x) => x[`icon`] !== CLEAR_FILTER);
            if (this.selectAllState === 'checked') {
            } else {
                if (this.data && this.objCopyOfMySelection.length > 0) {
                    this.mySelection = [];
                    this.objCopyOfMySelection.forEach((selected) => {
                        const index = this.mySelectionColumn
                            ? this.data.find(
                                (item) => item[this.mySelectionColumn] == selected[this.mySelectionColumn],
                            )[this.mySelectionColumn]
                            : this.data.indexOf(selected);
                        this.mySelection.push(index);
                    });
                }
            }
        } else {
            if (!this.menuItems.some((x) => x[`icon`] === CLEAR_FILTER)) {
                this.menuItems.push(this.commonMenuItems[0]);
            }
            if (this.selectAllState === 'checked') {
                // TODO: reverse the if block
            } else {
                if (this.data && this.objCopyOfMySelection.length > 0) {
                    this.mySelection = [];
                    this.objCopyOfMySelection.forEach((selected) => {
                        const index = this.mySelectionColumn
                            ? this.data.find(
                                (item) => item[this.mySelectionColumn] == selected[this.mySelectionColumn],
                            )[this.mySelectionColumn]
                            : this.data.indexOf(selected);
                        this.mySelection.push(index);
                    });
                } else {
                    this.mySelection = [];
                    this.objCopyOfMySelection = [];
                    this.selectAllState = 'unchecked';
                }
            }
        }
    }
    checkforDuplicates = (arr) => {
        let tempArr = [];
        if (arr?.length > 0) {
            arr.forEach((element) => {
                if (!tempArr.some((x) => String(x).toLowerCase() === String(element).toLowerCase())) {
                    tempArr.push(element);
                }
            });
        }
        return tempArr;
    };
    public distinctGroupItems(fieldName: string): any {
        return distinct(this.data, fieldName).map((item) => {
            return {
                value: Number(item[fieldName]),
                field: Number(item[fieldName]),
                type: `number`,
            };
        });
    }
    public distinctPrimitive(fieldName: string): any {
        const template = this.columns.find((x) => x[`field`] === fieldName)[`templateDummy`];
        const eleType = this.columns.find((x) => x[`field`] === fieldName)[`type`];
        if (template && template !== `` && template !== `NULL`) {
            const arr = [...new Set(this.data.map((x) => x[fieldName]))];

            return this.checkforDuplicates(arr).map((ele) => {
                if (eleType === `numeric` || eleType === `float` || eleType === `number`) {
                    ele = Number(ele);
                } else if (eleType == `dropdown`) {
                    const indx = eval(template).findIndex((x) => x.key == ele);
                    return {
                        value: eval(template)[indx]?.value,
                        field: eval(template)[indx]?.key,
                        type: eleType,
                    };
                }

                return {
                    value: ele,
                    field: ele,
                    type: eleType,
                };
            });
        } else {
            let arr = [
                ...new Set(
                    process(this.data, {}).data.map((x) => {
                        if (eleType === `date`) {
                            return x[fieldName]
                                ? this.intl.formatDate(new Date(x[fieldName]), { skeleton: this.skeletonDateTimeFormat })
                                : '';
                        }
                        return x[fieldName];
                    }),
                ),
            ];
            if (eleType === `date`) {
                arr = arr.map((x) => {
                    return x ? new Date(x) : '';
                });
            }

            return this.checkforDuplicates(arr).map((item) => {
                let ele = item;
                if (eleType === `numeric` || eleType === `float` || eleType === `number`) {
                    ele = Number(item);
                }
                return {
                    value: ele,
                    field: ele,
                    type: eleType,
                };
            });
        }
    }
    public allData = (): ExcelExportData => {
        const result: ExcelExportData = {
            data: process(this.data, {
                sort: this.grid.sort,
                group: this.grid.group,
                filter: this.grid.filter,
            }).data,
            group: this.grid.group,
        };

        return result;
    };
    public excelExportHandler = (events) => {
        if (events) {
            events.workbook.fileName = `SSSSSS.xlsx`;
            const rows = events.workbook.sheets[0].rows;
            const columnsForExcel = this.gridConfig.columns;
            const headings = rows[0].cells.map((element) => {
                if (element.value) {
                    return element.value;
                }
            });
            if (this.gridConfig.hideColumnWhileExport && this.gridConfig.hideColumnWhileExport.length > 0) {
                for (const iterator of this.gridConfig.hideColumnWhileExport) {
                    const colValue = columnsForExcel.find(
                        (x) => x[`field`] === iterator || x[`field`] === iterator + '_template',
                    );
                    if (colValue) {
                        let rowIndex = 0;
                        rows.forEach((row) => {
                            switch (row[`type`]) {
                                case `header`:
                                    rowIndex = row.cells.findIndex(
                                        (x) => x[`value`] === colValue[`title`] || x[`value`] === colValue[`field`],
                                    );
                                    if (rowIndex !== -1) {
                                        row.cells.splice(rowIndex, 1);
                                        headings.splice(rowIndex, 1);
                                        if (colValue[`locked`]) {
                                            events.workbook.sheets[0].freezePane[`colSplit`] =
                                                events.workbook.sheets[0].freezePane[`colSplit`] - 1;
                                        }
                                    }
                                    break;
                                case `data`:
                                    if (rowIndex !== -1) {
                                        row.cells.splice(rowIndex, 1);
                                    }
                                    break;
                            }
                        });
                    }
                }
            }
            // Remove Sr Column
            rows.forEach((row) => {
                let rowIndex = 0;
                switch (row[`type`]) {
                    case `header`:
                        rowIndex = row.cells.findIndex((x) => x[`value`] === `sr`);
                        if (rowIndex !== -1) {
                            row.cells.splice(rowIndex, 1);
                            headings.splice(rowIndex, 1);
                            events.workbook.sheets[0].freezePane[`colSplit`] =
                                events.workbook.sheets[0].freezePane[`colSplit`] - 1;
                        }
                        break;
                    case `data`:
                        if (rowIndex !== -1) {
                            row.cells.splice(rowIndex, 1);
                        }
                        break;
                }
            });

            const sortedData = process(this.data, {
                sort: this.grid.sort,
                group: this.grid.group,
                filter: this.grid.filter,
            });
            if (this.grid.group && this.grid.group.length > 0) {
                sortedData.data.forEach((element) => {
                    this.getAllGroups(element);
                });
            }
            let innerCtr = 0;
            let rowDataCounter = 0;
            rows.forEach((row) => {
                switch (row[`type`]) {
                    case `data`:
                        let isIncremmented = false;
                        rowDataCounter++;
                        row[`cells`].forEach((cell, cellIndex) => {
                            switch (headings[cellIndex]) {
                                case `sr`:
                                    cell[`value`] = rowDataCounter;
                                    break;
                                default:
                                    if (headings[cellIndex]) {
                                        if (
                                            this.getFieldByTitle(this.columns, headings[cellIndex]) === `minBlockLinear`
                                        ) {
                                            cell.value = `${cell.value === '-1'
                                                ? 'From Model'
                                                : Number(cell.value.replace('%', '')) === 0
                                                    ? 'Auto'
                                                    : cell.value
                                                }`;
                                        } else if (
                                            this.getFieldByTitle(this.columns, headings[cellIndex])?.includes(
                                                'selectedVersionvalue',
                                            )
                                        ) {
                                            const val = sortedData[`data`][rowDataCounter - 1]['IDPOGStatusTo'].find(
                                                (x) =>
                                                    x['Value'] ===
                                                    sortedData[`data`][rowDataCounter - 1]['selectedVersionvalue'],
                                            );
                                            cell.value = val?.Name;
                                        } else if (this.getFieldByTitle(this.columns, headings[cellIndex]) === `date`) {
                                            cell[`value`] = cell.value
                                                ? this.intl.formatDate(new Date(cell.value), { skeleton: this.skeletonDateFormat })
                                                : '';
                                        } else if (this.checkType(this.columns, headings[cellIndex]) === `datetime`) {
                                            cell[`value`] = cell.value
                                                ? this.intl.formatDate(new Date(cell.value), {
                                                    skeleton: this.skeletonDateTimeFormat,
                                                })
                                                : '';
                                        } else if (this.checkType(this.columns, headings[cellIndex]) === `float`) {
                                            cell[`value`] = Number(cell.value).toFixed(2);
                                        } else if (this.tempArrGroup && this.tempArrGroup.length > 0) {
                                            cell[`value`] = this.getTemplateForExcel(
                                                this.tempArrGroup[innerCtr],
                                                columnsForExcel.find(
                                                    (x) =>
                                                        x[`title`] === headings[cellIndex] ||
                                                        x[`field`] === headings[cellIndex],
                                                ),
                                            );
                                            if (!isIncremmented) {
                                                isIncremmented = true;
                                            }
                                        } else {
                                            cell[`value`] = this.getTemplateForExcel(
                                                sortedData[`data`][rowDataCounter - 1],
                                                columnsForExcel.find(
                                                    (x) =>
                                                        x[`title`] === headings[cellIndex] ||
                                                        x[`field`] === headings[cellIndex],
                                                ),
                                            );
                                        }
                                    }
                                    break;
                            }
                        });
                        if (isIncremmented) {
                            innerCtr++;
                        }
                        break;

                    default:
                        break;
                }
            });
        }
    };

    public trackBy(index: number, item: GridItem): any {
        return index;
    }

    public selectionChangeHandler = (events: SelectionEvent) => {
        this.clickedRowItem =
            events[`selectedRows`] && events[`selectedRows`][0]
                ? events[`selectedRows`][0][`dataItem`]
                : events[`deselectedRows`][0][`dataItem`];
        if (events[`selectedRows`].length > 0) {
            events[`selectedRows`].forEach((element) => {
                this.objCopyOfMySelection.push(element[`dataItem`]);
            });
        }
        if (events[`deselectedRows`].length > 0) {
            for (let indx = 0; indx < events[`deselectedRows`].length; indx++) {
                this.objCopyOfMySelection = this.objCopyOfMySelection.filter(
                    (x) => x.srno !== Number(events[`deselectedRows`][indx][`dataItem`].srno),
                );
            }
        }
        this.selectedRow.emit(events);
    };
    public onContextMenuSelect = (event) => {
        if (event) {
            switch (event[`item`][`icon`]) {
                case CLEAR_FILTER:
                    this.filter = {
                        filters: [],
                        logic: 'and',
                    };
                    this.menuItems = this.menuItems.filter((x) => x[`icon`] !== CLEAR_FILTER);
                    break;
                case CLEAR_SORT:
                    this.sort = [];
                    this.menuItems = this.menuItems.filter((x) => x[`icon`] !== CLEAR_SORT);
                    break;
                default:
                    this.onContextSelect.emit(event);
                    break;
            }
        }
    };

    private formatGridData(columnsInput: KendoColumnSetting[]): void {
        const columns = _.cloneDeep(columnsInput);
        this.groups = [];
        this.sort = [];

        if (!columns || !columns.length) {
            return;
        }

        this.groups = this.identifyGroups(columns);
        this.sort = this.identifyCurrentSort(columns);
        this.ref.markForCheck();
    }

    private identifyGroups(columns: KendoColumnSetting[]): GroupDescriptor[] {
        const groupedColumns = columns.filter((x) => x.groupable);
        if (!groupedColumns || !groupedColumns.length) {
            return [];
        }

        return groupedColumns.sort((a, b) => a.groupOrder - b.groupOrder).map((x) => this.toGroupDescriptor(x));
    }

    private toGroupDescriptor(column: KendoColumnSetting): GroupDescriptor {
        return {
            field: column.field,
        };
    }
    private toSortDescriptor(column: KendoColumnSetting): SortDescriptor {
        const direction = column['sortable']['initialDirection'];
        return {
            field: column.field,
            dir: direction,
        };
    }

    private identifyCurrentSort(columns: KendoColumnSetting[]): SortDescriptor[] {
        // filter columns with sort settings
        const sortedColumns = columns.filter((x) => x.field != 'sr' && x[`sortable`][`initialDirection`]);

        sortedColumns.forEach((item, i) => {
            let fieldTemplate = columns.find((x) => x.field === item.field);
            if (!fieldTemplate) {
                fieldTemplate = columns.find((x) => x.field === item.field + '_template');
            }
            if (!fieldTemplate.SortByTemplate && item.field.includes('_template')) {
                const splittedField = item.field.split('_').slice(0, -1).join('_');
                item['field'] = splittedField;
            }
        });
        if (sortedColumns && sortedColumns.length > 0) {
            return sortedColumns.sort((a, b) => a.sortorder - b.sortorder).map((x) => this.toSortDescriptor(x));
        }
        return [];
    }

    private loadGridData(): void {
        if (this.gridConfig) {
            this.gridId = this.gridConfig.id;
            // TODO: @malu Change the type of columns in gridConfig
            this.columns = (this.gridConfig.columns as KendoColumnSetting[])
                .filter((x) => x.isactive && !x.hidden)
                .sort((a, b) => {
                    return a.orderIndex - b.orderIndex;
                });

            this.data = this.gridConfig.data.map((x, i) => Object.assign({}, this.gridConfig.data[i], { srno: i + 1 }));
            const dateCols = this.columns.filter((x) => x['type'] === 'date');
            if (dateCols && dateCols.length > 0) {
                dateCols.forEach((tCols) => {
                    const field = tCols['field'];
                    this.data = this.data.map((data) => {
                        return {
                            ...data,
                            [`${field}`]: data[field]
                              ? new Date(this.intl.formatDate(data[field], { skeleton: this.skeletonDateFormat }))
                                : '',
                        };
                    });
                });
            }
            const dateTimeCols = this.columns.filter((x) => x['type'] === 'datetime');
            if (dateTimeCols && dateTimeCols.length > 0) {
                dateTimeCols.forEach((tCols) => {
                    const field = tCols['field'];
                    this.data = this.data.map((data) => {
                        return {
                            ...data,
                            [`${field}`]: data[field] ? new Date(data[field]) : '',
                        };
                    });
                });
            }
            this.skip = this.gridConfig.skip ? this.gridConfig.skip : 0;
            if (this.gridConfig.skipToRow) {
                this.skipTo(this.gridConfig.skipToRow.col, this.gridConfig.skipToRow.val);
            }
            this.gridHeight.height = this.gridConfig.height ? this.gridConfig.height : this.gridHeight.height;
            this.mySelection = this.gridConfig.selectionParam ? this.gridConfig.selectionParam.items : [];
            this.mySelectionColumn = this.gridConfig.selectionParam ? this.gridConfig.selectionParam.name : ``;
            this.detailExpand = this.gridConfig.detailExpand ? this.gridConfig.detailExpand : false;
            this.showSelectall = this.gridConfig.hideSelectAll ? false : true;
            this.showGroupHeader = this.gridConfig.hideGroupHeader ? false : true;
            this.expandId = this.gridConfig.expandId ? this.gridConfig.expandId : ``;
            this.expandedDetailKeys = this.gridConfig.expandedDetailKeys ? this.gridConfig.expandedDetailKeys : [];
            this.uniqueColumn = this.gridConfig.uniqueColumn ? this.gridConfig.uniqueColumn : ``;
            if (this.gridConfig.menuItems) {
                this.menuItems = this.gridConfig.menuItems ? this.gridConfig.menuItems : [];
                if (this.commonMenuItems) {
                    if (this.filter && this.filter.filters.length > 0) {
                        this.menuItems.push(this.commonMenuItems[0]);
                    }
                    if (this.sort && this.sort.length > 0) {
                        this.menuItems.push(this.commonMenuItems[1]);
                    }
                }
            } else {
                this.menuItems = this.getMenus(this.gridId);
            }
            this.fileName = this.gridConfig.fileName ? `Shelf-${this.gridConfig.fileName}.xlsx` : `export.xlsx`;

            this.RowSelectionColumn = this.gridConfig.isRowSelectableByCheckbox
                ? this.gridConfig.isRowSelectableByCheckbox
                : false;

            this.gridConfig.columnMenuDisplay = this.gridConfig.columnMenuDisplay === false ? false : true;
            this.gridConfig.columnConfig = this.gridConfig.columnConfig === false ? false : true;
            this.gridConfig.fillDownRequired = this.gridConfig.fillDownRequired === true ? true : false;
            this.customCss = this.gridConfig.cssclass ? this.gridConfig.cssclass : this.customCss;

            if (!this.detailExpand) {
                if (!this.columns.some((x) => x[`field`] === `sr`)) {
                    this.columns.unshift({
                        templateDummy: `id`,
                        field: `sr`,
                        title: ``,
                        width: this.gridConfig.data.length > 999 ? 60 : this.gridConfig.data.length > 99 ? 50 : 40,
                        locked: true,
                        columnMenu: false,
                        editable: false,
                        style: { 'pointer-events': 'none' },
                    });
                }
            }

            const templateColumns = this.columns.filter((x) => this.hasTemplate(x));

            // TODO: @Malu this loop is non sense, get rid of it.
            for (let i = 0; i < this.data[`length`]; i++) {
                for (let j = 0; j < templateColumns[`length`]; j++) {
                    if (templateColumns[j].field.indexOf('_template') !== -1) {
                        const reg = new RegExp('_template', 'g');
                        templateColumns[j].field = templateColumns[j].field.replace(reg, '');
                    }
                    this.data[i][templateColumns[j].field.split('.').join('_') + '_template'] = this.getTemplateVal(
                        this.data[i],
                        templateColumns[j],
                    );
                }
            }

            templateColumns.forEach((element) => {
                const ind = this.columns.findIndex((x) => x[`field`] === element.field);
                this.columns[ind][`field`] = element.field.split('.').join('_') + '_template';
            });

            this.formatGridData(this.columns);


            if (!!this.gridConfig.columnThresholdForPdfSize)
                this.pdfPaperSize = this.columns.length <= this.gridConfig.columnThresholdForPdfSize ? "A4" : "auto";
        }
    }

    private hasTemplate(column: KendoColumnSetting): boolean {
        return column.templateDummy && column.templateDummy !== 'id';
    }

    private fitColumns(): void {
        if (this.grid) {
            const onStableSubscription = this.ngZone.onStable
                .asObservable()
                .pipe(take(1))
                .subscribe(() => {
                    this.grid.columns[`_results`].forEach((element) => {
                        const ind = this.columns.findIndex((x) => x[`field`] === element[`field`]);
                        if (ind !== -1 && element['_width'] < 400) {
                            element[`_width`] = this.columns[ind]['width']
                                ? this.columns[ind]['width']
                                : element[`_width`];
                        } else {
                            if (element[`field`]) {
                                element[`_width`] = 400;
                            }
                        }
                    });
                    this.grid.columns[`_results`] = [...this.grid.columns[`_results`]];
                    this.ref.markForCheck();
                });
            this._subscription.add(onStableSubscription);
        }
    }

    public closeEditor(grid, rowIndex = this.editedRowIndex) {
        if (grid) {
            grid.closeRow(rowIndex);
            this.editedRowIndex = undefined;
        }
    }

    private getTemplateForExcel(dataItem, column) {
        let returnVal = ``;
        let colname = '';
        try {
            const columnInfo = this.columns.find((x) => x[`field`] === column.field);
            if (columnInfo && columnInfo.templateDummy && columnInfo.templateDummy != 'id') {
                if (column.SkipTemplateForExport === true) {
                    const arr = ['_template'];
                    if (column[`type`] !== `dropdown`) {
                        if (arr.some((substring) => column.field.includes(substring))) {
                            colname = column.field.replace(
                                arr.find((substring) => column.field.includes(substring)),
                                '',
                            );
                        }
                        returnVal = dataItem[colname];
                    }
                    if (column[`type`] == `dropdown`) {
                        returnVal = eval(column[`templateDummy`]).find((x) => x['key'] == dataItem[column.field])[
                            'value'
                        ];
                    }
                    // returnVal = dataItem[colname];
                } else {
                    returnVal = this.gridColumnFormatterPipe.transform(
                        eval(this.columns.find((x) => x[`field`] === column.field)[`templateDummy`]),
                        this.columns.find((x) => x[`field`] === column.field),
                        'plainExcel',
                    );
                }
            } else {
                returnVal = dataItem[column.field];
            }
        } catch (error) {
            returnVal = dataItem[column.field];
        }
        return returnVal;
    }

    public isNumericType(column: ColumnComponent): boolean {
        const columnType = this.getColumnType(column);
        return numericTypes.some((x) => x === columnType);
    }
    public isDateType(column: ColumnComponent): boolean {
        const columnType = this.getColumnType(column);
        return dateTypes.some((x) => x === columnType);
    }
    public getColumnType(columnComp: ColumnComponent): string {
        const column: KendoColumnSetting = this.columns.find((x) => x.field === columnComp.field);
        return column?.type ? column.type : 'string'; // string is the default type
    }

    private checkType(columns: KendoColumnSetting[], field: string): string {
        return columns.find((x) => x.title === field || x.field === field)?.type;
    }

    private getFieldByTitle(columns: KendoColumnSetting[], title: string): string {
        const column = columns.find((x) => x.title === title);
        return column?.field;
    }

    public getTemplateVal(dataItem, column) {
        let returnVal;
        try {
            if (this.hasTemplate(column) && column['templateDummy'] !== `NULL` && column[`type`] !== `dropdown`) {
                returnVal = eval(column[`templateDummy`]);
            } else {
                if (column['field'] == 'Position.IsLayUnder') {
                    const strArray = column.field.split('.');
                    let isLayunder = dataItem[strArray[0]][strArray[1]];
                    if (isLayunder == false) {
                        returnVal = 2;
                    } else {
                        returnVal = 1;
                    }
                } else if (column['field'] == 'Position.IDOrientation') {
                    returnVal = dataItem['Position']['IDOrientation'];
                } else if (column['field'] == 'Fixture.LKCrunchMode') {
                    returnVal = dataItem['Fixture']['LKCrunchMode'];
                } else if (column['field'] == 'Fixture.SnapToRight') {
                    const strArray = column.field.split('.');
                    let snapToRight = dataItem[strArray[0]][strArray[1]];
                    if (snapToRight == false) {
                        returnVal = 2;
                    } else {
                        returnVal = 1;
                    }
                } else if (column['field'] == 'Fixture.SnapToLeft') {
                    const strArray = column.field.split('.');
                    let snapToLeft = dataItem[strArray[0]][strArray[1]];
                    if (snapToLeft == false) {
                        returnVal = 2;
                    } else {
                        returnVal = 1;
                    }
                } else if (column['field'] == 'Fixture.AutoComputeFronts') {
                    const strArray = column.field.split('.');
                    let autoComputeFronts = dataItem[strArray[0]][strArray[1]];
                    if (autoComputeFronts == false) {
                        returnVal = 2;
                    } else {
                        returnVal = 1;
                    }
                } else if (column['field'] == 'Fixture.TestItemCollision') {
                    const strArray = column.field.split('.');
                    let testItemCollision = dataItem[strArray[0]][strArray[1]];
                    if (testItemCollision == false) {
                        returnVal = 2;
                    } else {
                        returnVal = 1;
                    }
                } else if (column['field'] == 'Fixture.LeftImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['LeftImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.RightImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['RightImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.TopImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['TopImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.FrontImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['FrontImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.BottomImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['BottomImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.BackImage.LkDisplayType') {
                    returnVal = dataItem['Fixture']['BackImage']['LkDisplayType'];
                } else if (column['field'] == 'Fixture.DisplayViews') {
                    returnVal = dataItem['Fixture']['DisplayViews'];
                } else {
                    returnVal = dataItem[column.field];
                }
            }
        } catch (error) {
            returnVal = dataItem[column.field] ? dataItem[column.field] : column['templateDummy'];
        }
        if (column.type === `number` || column.type === `numeric` || column.type === `float`) {
            returnVal = Number(returnVal);
        }
        return returnVal;
    }

    // public getHeaderTemplateVal = (dataItem, column) => {
    //   let returnVal = ``;
    //   let textToDisplay = ``;
    //   try {
    //     if (this.hasTemplate(column)) {
    //       const template = column['templateDummy'];
    //       const field = column.field.indexOf('_template') !== -1 ? column.field.split('_')[0] : column.field;
    //       const replace = new RegExp(`${field}`, 'g');
    //       textToDisplay = eval(template.replace(replace, `value`));
    //     } else {
    //       textToDisplay = dataItem.value;
    //     }
    //     returnVal = textToDisplay;
    //   } catch (error) {
    //     returnVal = dataItem.value;
    //   }
    //   return returnVal;
    // }

    public customSaveAsExcel() {
        if (this.grid) {
            this.grid.saveAsExcel();
            this.sharedService.downloadExportExcel.next(null);
        }
    }

    public customSaveAsPDF() {
        if (this.grid) {
            this.grid.saveAsPDF();
        }
    }
    public onMouseEnter(e, col) {
        if (e.event) {
            e = e.event;
        }
        this.showDetailedTooltip = false;
        this.anchor = e.target.closest('th');
        this.content = this.saDashboardService.getTooltip(this.gridId, col.title);
        if (this.content && this.content.title !== this.content.info) {
            setTimeout(() => {
                // enable detailed tooltip after 2 sec delay
                this.showDetailedTooltip = true;
            }, 2000);
        }
    }
    public onMouseLeave() {
        this.showDetailedTooltip = false;
        this.anchor = undefined;
        this.content = null;
    }
    public confirmRemove = (value) => {
        this.kendoService.confirmRemove({ itemToRemove: this.itemToRemove, value });
        this.itemToRemove = null;
    };
    public moveArrayItemToNewIndex = (arr, oindex, nindex) => {
        const element = arr[oindex];
        arr.splice(oindex, 1);
        arr.splice(nindex, 0, element);
        return arr;
    };
    public rowCallback(context: RowClassArgs) {
        if (window.activeIDPOG && context.dataItem.rowKey === window.activeIDPOG) {
            return {
                passive: true,
            };
        }
        if (window.activeBayMappingIDPOG && context.dataItem.generatedPogId === window.activeBayMappingIDPOG) {
            return {
                passive: true,
            };
        }
        if (context.dataItem.isValid == false) {
            return {
                invalid: true,
            };
        }
        if (context.dataItem && context.dataItem.isBlocked == true) {
            return {
                blocked: true,
            };
        }
        if (context.dataItem && context.dataItem.backgroundColor) {
            return {
                nopadding: true,
            };
        }
    }

    public openColumnConfig = () => {
        const dialogConfig = new MatDialogConfig();
        dialogConfig.disableClose = true;
        if (!_.isEqual(this.data[0], this.gridConfig.data[0])) {
            this.gridConfig = {
                ...this.gridConfig,
                data: this.data,
            };
        }
        dialogConfig.data = {
            gridConfig: JSON.parse(JSON.stringify(this.gridConfig)),
            groups: JSON.parse(JSON.stringify(this.groups)),
            sort: JSON.parse(JSON.stringify(this.sort)),
        };
        const dialogRef = this.dialogRef.open(KendoGridColumnConfigComponent, dialogConfig);
        this._subscription.add(
            dialogRef.backdropClick().subscribe(() => {
                this.sharedService.GridValueUpdated(false);
                dialogRef.close();
            }),
        );
        this._subscription.add(
            dialogRef.afterClosed().subscribe((data) => {
                if (data && data.onsaveClick) {
                    this.gridConfig.columns.forEach((gridCol) => {
                        const gridColumnindex = data.config.columns.findIndex(
                            (x) => x[`field`] === gridCol[`field`] || `${x[`field`]}_template` === gridCol[`field`],
                        );
                        if (gridColumnindex !== -1) {
                            const tempCol = { ...data.config.columns[gridColumnindex] };
                            data.config.columns[gridColumnindex] = {
                                ...gridCol,
                                [`hidden`]: tempCol[`hidden`],
                                [`isactive`]: tempCol[`isactive`],
                                [`locked`]: tempCol[`locked`],
                                [`orderIndex`]: tempCol[`orderIndex`],
                                [`groupOrder`]: tempCol[`groupOrder`],
                                [`groupable`]: tempCol[`groupable`],
                                [`sortable`]: tempCol[`sortable`],
                                [`sortorder`]: tempCol[`sortorder`],
                                [`style`]: tempCol[`style`],
                                ['width']: tempCol[`width`],
                                [`headerType`]: gridCol['headerType'] ? gridCol['headerType'] : null,
                            };
                        }
                    });
                    Object.assign(this.gridConfig, data.config);
                    this.sort = [...data.sort];
                    this.groups = [...data.groups];
                    this.loadGridData();
                    if (this.selectAllState === 'checked') {
                        this.selectAllCheckbox(this.gridConfig.columns, this.gridConfig.data);
                    }
                }
            }),
        );
    };
    public refreshGrid = () => {
        setTimeout((e) => {
            this.grid.autoFitColumns();
            this.ref.detectChanges();
        });
    };

    public refreshSearchGrid = () => {
        this.ref.markForCheck();
    };

    public applyStyle(column: KendoColumnSetting): { [key: string]: string } {
        if (column.editable && !column.style) {
            return { 'background-color': 'rgb(234, 250, 255)' };
        }
        return column.style;
    }

    public manageGridSelections = (column) => {
        if (this.objCopyOfMySelection.length > 0) {
            this.mySelection = [];
            this.objCopyOfMySelection.forEach((x) => {
                if (this.data.some((ele) => ele[column] === x[column])) {
                    this.mySelection.push(this.data.findIndex((ele) => ele[column] === x[column]));
                }
            });
        }
    };

    public selectAllCheckbox = (columnName: any, value: any) => {
        this.mySelectionColumn = this.gridConfig.selectionParam ? this.gridConfig.selectionParam.name : ``;
        if (value.length > 0) {
            this.selectAllState = 'checked';
            this.mySelection = process(value, {
                sort: this.grid.sort,
                filter: this.grid.filter,
            }).data.map((item, index) => (this.mySelectionColumn ? item[this.mySelectionColumn] : index));
        }
        this.ref.markForCheck();
    };

    public showTooltip(e: MouseEvent): void {
        const element = e.target as HTMLElement;
        if (
            element.offsetWidth < element.scrollWidth &&
            (element.style.textAlign ||
                element.classList.contains('customevent') ||
                element.classList.contains('assignpog') ||
                element.classList.contains('expandTableCell') ||
                element.classList.contains('shrinkCellValue') ||
                element.classList.contains('fixtureCol'))
        ) {
            this.tooltipDir.toggle(element);
        } else {
            this.tooltipDir.hide();
        }
    }

    GetGridHeaderTooltip(title, value, dataItem) {
        const col = this.columns.find((x) => x['field'] === dataItem['field']);
        return `${title} : ${this.pipe.transform(value, col, 'plain')}`;
    }

    setBackgroundColor = (dataItem, rowIndex) => {
        if (dataItem.backgroundColor) {
            if (this.mySelection.indexOf(dataItem?.IDPOGObject) > -1) {
                return '';
            }
            if (this.mySelection.indexOf(dataItem?.TempId) > -1) {
                return '';
            }
            if (this.mySelection.indexOf(rowIndex) > -1) {
                return '';
            }
            return dataItem.backgroundColor;
        }
    };

    getStyleClassName = (dataItem, columnField) => {
        if (dataItem.filteredStyle && columnField['field'] == 'ProductPackage_Images_front_template') {
            return 'borderLeftPurple';
        } else if (dataItem.backgroundColor) {
            return 'whole-cell';
        }
    };

    public scrollTo(field, value) {
        let rowIndex = process(this.data, {
            sort: this.grid.sort,
            group: this.grid.group,
            filter: this.grid.filter,
        }).data.findIndex((item) => item[field] == value);
        this.grid.scrollTo({ row: rowIndex, column: 0 });
    }

    public childGridActionEmit(event) {
        this.actionEventEmit.emit(event);
    }
}
