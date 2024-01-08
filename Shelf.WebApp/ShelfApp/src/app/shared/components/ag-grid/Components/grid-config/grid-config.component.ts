import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PaletteSettings } from '@progress/kendo-angular-inputs';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { SharedService, SaDashboardService, NotifyService, _, KendoService, SelectedScenarioService, AgGridHelperService } from 'src/app/shared/services';
import { AgGridComponent } from '../../ag-grid.component';
import { GridColumnCustomConfig, GridConfig } from '../../models';
import { ColDef } from 'ag-grid-community';
import { cloneDeep } from 'lodash';

@Component({
    selector: 'shelf-grid-config',
    templateUrl: './grid-config.component.html',
    styleUrls: ['./grid-config.component.scss']
})
export class GridConfigComponent implements OnInit {
    public columnsList: any[];
    public showSearchArrow = false;
    public scrollAt = 0;
    public gridId: string;
    constructor(
        @Inject(MAT_DIALOG_DATA) public inputGridConfig: any,
        private readonly sharedService: SharedService,
        private readonly saDashboardService: SaDashboardService,
        private readonly notifyService: NotifyService,
        private readonly kendoService: KendoService,
        private readonly selectedScenarioService: SelectedScenarioService,
        public dialogRef: MatDialogRef<GridConfigComponent>,
        private readonly agGridHelperService: AgGridHelperService
    ) {
        this.gridId = inputGridConfig.gridConfig.id;
    }
    @ViewChild(`configGrid`) configGrid: AgGridComponent;
    public searchColumn = ``;
    public gridConfig: GridConfig;
    ;
    public view = 'palette';
    public defaultColumnColor = '#F5F5F5'; // 'rgb(245, 245, 245)'; // #F5F5F5
    public defaultFontColor = '#656565';
    public paletteSettings: PaletteSettings = {
        palette: [
            '#F5F5F5',
            '#000000',
            '#8db3e2',
            '#b8cce4',
            '#e5b9b7',
            '#d7e3bc',
            '#ccc1d9',
            '#b7dde8',
            '#fbd5b5',
            '#d8d8d8',
            '#c4bd97',
            '#548dd4',
            '#95b3d7',
            '#d99694',
            '#c3d69b',
            '#b2a2c7',
            '#92cddc',
            '#fac08f',
            '#bfbfbf',
            '#938953',
            '#1f497d',
            '#4f81bd',
            '#c0504d',
            '#9bbb59',
            '#8064a2',
            '#31859b',
            '#f79646',
            '#a5a5a5',
            '#494429',
            '#17365d',
            '#366092',
            '#953734',
            '#76923c',
            '#5f497a',
            '#0e6075',
            '#e36c09',
        ],
        columns: 9,
        tileSize: 30,
    };

    public ngOnInit(): void {
        const cols = [
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `columnfield`,
                title: `Fields`,
                orderIndex: 1,
                locked: false,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `columnTitle`,
                title: `Title`,
                orderIndex: 2,
                locked: false,
                editable: true,
                type: `string`,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `columnDescription`,
                title: `Description`,
                orderIndex: 5,
                locked: false,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `isHide`,
                title: `Hide/Show`,
                orderIndex: 3,
                locked: false,
                templateDummy: ``,
                type: `boolean`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `isLocked`,
                title: `Lock/Unlock`,
                orderIndex: 4,
                locked: false,
                templateDummy: ``,
                type: `boolean`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `sortDir`,
                title: `Sort`,
                orderIndex: 5,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `color`,
                title: `color`,
                orderIndex: 6,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: false,
            },
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `searchcss`,
                title: `searchcss`,
                orderIndex: 7,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: false,
            },
            ,
            {
                ...this.inputGridConfig.gridConfig.columnDefs[2],
                field: `width`,
                title: `width`,
                orderIndex: 8,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: false,
            },
        ];

        let finalCols = [];
        let storedCols: ColDef[]; 
        if(this.inputGridConfig.gridConfig?.gridColumnCustomConfig){
            storedCols = this.agGridHelperService.getAgGridColumns(this.gridId, this.inputGridConfig.gridConfig?.gridColumnCustomConfig);
        } else {
            storedCols = this.agGridHelperService.getAgGridColumns(this.gridId);
        }
        
        storedCols.forEach((col) => {
            let colName = col['field'];
            if (col['field'].indexOf('.') !== -1) {
                colName = col['field'].replace(/\./g, '_');
            }
            if (
                this.inputGridConfig.gridConfig.columnDefs.some(
                    (x) =>
                        x[`field`] === col[`field`] || x[`field`] === colName,
                )
            ) {
                const tempData = this.inputGridConfig.gridConfig.columnDefs.filter(
                    (x) =>
                        x[`field`] === col[`field`] || x[`field`] === colName,
                );
                tempData[0][`field`] = col[`field`];
                finalCols.push(tempData[0]);
            }
        });

        let tempData = finalCols
            .sort((a, b) => {
                return a.cellRendererParams.orderIndex - b.cellRendererParams.orderIndex;
            })
            .map((col) => {
                return {
                    [`columnfield`]: col[`field`],
                    [`columnTitle`]: col[`headerName`],
                    [`columnDescription`]: col[`description`],
                    [`isHide`]: col[`hide`],
                    [`isLocked`]: col[`pinned`] === 'left' ? true : false,
                    [`searchcss`]: false,
                    ['width']: this.getActualWidth(col[`field`], col['width']),
                    ['sortDir']:
                        col[`sortable`] && col[`sortable`][`initialDirection`]
                            ? col[`sortable`][`initialDirection`]
                            : ``,
                    [`color`]: this.extractColorFromStyle(col.cellRendererParams.style, 0),
                    [`fontColor`]: this.extractColorFromStyle(col.cellRendererParams.style, 1),
                };
            });
        let hiddencols = tempData
            .filter((item) => item[`isHide`] == true)
            .sort((a, b) => {
                if (a[`isLocked`]) {
                    return 1;
                }
            })
            .sort((a, b) => {
                if (a[`columnTitle`] < b[`columnTitle`]) {
                    return -1;
                }
            });
        tempData = tempData.filter((item) => item[`isHide`] == false).concat(hiddencols);
        this.gridConfig = {
            ...this.gridConfig,
            id: `column_config`,
            columnDefs: cols,
            data: tempData,
            height: `calc(100vh - 245px)`,
            hideColumnConfig: false,
        };
        this.columnsList = [...finalCols];
        this.columnsList.shift();
    }

    public drop(event: CdkDragDrop<string[]>, dataObject): boolean {
        if (event.previousContainer !== event.container) {
            if (
                event.container.data.some(
                    (x) =>
                        x[`colId`] === event.item.data.columnfield
                )
            ) {
                return false;
            }
            let CopyObject = [];
            if (event.container.id === `sortList`) {
                if (
                    this.inputGridConfig.sort &&
                    this.inputGridConfig.sort.some(
                        (x) =>
                            x[`colId`] === event.item.data.columnfield
                    )
                ) {
                    return false;
                }
                CopyObject = event.previousContainer.data.map((x) => {
                    return {
                        colId: x[`columnfield`],
                        sort: x[`sortDir`] ? x[`sortDir`] : 'desc'
                    };
                });
            }
            if (event.container.id === `groupList`) {
                if (
                    this.inputGridConfig.group &&
                    this.inputGridConfig.group.some(
                        (x) =>
                            x[`colId`] === event.item.data.columnfield
                    )
                ) {
                    return false;
                }
                CopyObject = event.previousContainer.data.map((x) => {
                    return {
                        colId: x[`columnfield`],
                    };
                });
            }

            transferArrayItem(CopyObject, event.container.data, event.previousIndex, event.currentIndex);
        } else {
            const isHideContainer = dataObject[event.currentIndex].isHide;
            moveItemInArray(dataObject, event.previousIndex, event.currentIndex);
            dataObject[event.currentIndex].isHide = isHideContainer;
        }

        //TODO: @Pranita: Verify this code with different cases and the remove, as for now, its not usefull
        // if (event.previousIndex !== event.currentIndex) {
        //     if (event.currentIndex > -1 && event.currentIndex + 1 < dataObject.length) {
        //         dataObject[event.currentIndex].isHide = dataObject[event.currentIndex + 1].isHide;
        //         dataObject[event.currentIndex].isLocked = dataObject[event.currentIndex + 1].isLocked;
        //     } else if (event.currentIndex === dataObject.length - 1 && dataObject.length > 1) {
        //         dataObject[event.currentIndex].isHide = dataObject[event.currentIndex - 1].isHide;
        //         dataObject[event.currentIndex].isLocked = dataObject[event.currentIndex - 1].isLocked;
        //     }
        // }
    }

    public searchAndHighlight(): void {
        if (this.searchColumn) {
            const filteredItem = this.gridConfig.data.filter(
                (x) => String(x[`columnTitle`]).toLowerCase().indexOf(String(this.searchColumn).toLowerCase()) !== -1,
            );

            this.gridConfig.data.forEach((element) => {
                element[`searchcss`] = false;
            });

            filteredItem.forEach((element) => {
                const rowIndex = this.gridConfig.data.findIndex((x) => x[`columnTitle`] === element[`columnTitle`]);
                this.gridConfig.data[rowIndex][`searchcss`] = true;
            });
            if (filteredItem.length === 1) {
                this.gotoElement();
                this.showSearchArrow = false;
            } else {
                this.showSearchArrow = true;
            }
        } else {
            this.gridConfig.data.forEach((element) => {
                element[`searchcss`] = false;
            });
            this.showSearchArrow = false;
        }
    };
    public gotoElement(scrollUp: boolean = false): void {
        setTimeout(() => {
            if (this.scrollAt >= 0) {
                if (scrollUp) {
                    this.scrollAt > 0 ? this.scrollAt-- : this.scrollAt;
                } else {
                    Array.from(document.querySelectorAll(`.searchcss`)).length - 1 > this.scrollAt
                        ? this.scrollAt++
                        : this.scrollAt;
                }
                Array.from(document.querySelectorAll(`.searchcss`))[this.scrollAt].scrollIntoView();
            }
        });
    }
    public validateDrop(item: CdkDrag<any>): boolean {
        return !item.data[`isHide`];
    }
    private extractColorFromStyle(style, val): string {
        let tempStyle = {
            'background-color': this.defaultColumnColor,
            color: this.defaultFontColor,
        };

        if (style && Object.keys(style).length > 0) {
            tempStyle = style;
        }

        if (val === 0) {
            if (tempStyle[`background-color`]) {
                return String(tempStyle[`background-color`]).trim();
            } else {
                return ``;
            }
        } else {
            if (tempStyle[`color`]) {
                return String(tempStyle[`color`]).trim();
            } else {
                return ``;
            }
        }
    };

    public LightenDarkenColor(col: string): string {
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
            isPercent,
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
    public pickerSwitch(picker): void {
        picker.toggle(!picker.isOpen);
    };

    public getActualWidth(field, width): number {
        const storedColumns = this.saDashboardService.GetGridColumns(this.gridId);
        if (storedColumns?.length > 0) {
            const col = storedColumns.find((x) => x['field'] === field);
            if (col) {
                return col['width'] ? col['width'] : width;
            } else {
                return width;
            }
        } else {
            return width;
        }
    };

    public bindTitleOrDescription(field, val): string {
        let returnVal = ``;
        if (field) {
            const col = this.inputGridConfig.gridConfig.columnDefs.find((x) => x[`field`] === field);
            if (col) {
                switch (val) {
                    case 0:
                        returnVal = col[`headerName`];
                        break;
                    case 1:
                        if (col[`headerName`] != col[`description`]) {
                            returnVal = col[`description`];
                        } else {
                            returnVal = '';
                        }
                        break;
                }
            }
        }
        return returnVal;
    };

    public OnColorChange(event, data): void {
        data[`existingcolor`] = data[`color`];
        data[`existingFontcolor`] = data[`fontColor`];
        data[`fontColor`] = this.LightenDarkenColor(event);
        data[`color`] = event;
    };
    public lockUnlock(val: number, data: any): void {
        const currentIndex = this.gridConfig.data.findIndex((x) => x[`columnfield`] === data[`columnfield`]);
        switch (val) {
            case 0:
                data[`isLocked`] = false;
                break;
            case 1:
                data[`isLocked`] = true;
                break;
        }
        this.MoveToEnd(currentIndex);
    };
    public hideShow(val: number, data: any): void {
        const currentIndex = this.gridConfig.data.findIndex((x) => x[`columnfield`] === data[`columnfield`]);
        switch (val) {
            case 0:
                if (this.gridConfig.data.filter((x) => x[`isHide`] === false).length === 1) {
                    return;
                }
                data[`isHide`] = true;
                data[`isLocked`] = false;
                break;
            case 1:
                data[`isHide`] = false;
                break;
        }
        this.MoveToEnd(currentIndex);
    };
    private MoveToEnd(itemIndex: number): void {
        let newIndex = itemIndex;
        const currentItem = this.gridConfig.data[itemIndex];
        if (currentItem.isLocked === true) {
            newIndex = this.gridConfig.data.filter((x) => x[`isLocked`] === true).length - 1;
        } else if (currentItem.isHide === false) {
            newIndex = this.gridConfig.data.filter((x) => x[`isHide`] === false).length - 1;
        } else {
            newIndex = this.gridConfig.data.length - 1;
        }
        if (newIndex < 0) {
            newIndex = 0;
        }
        if (itemIndex + 1 < this.gridConfig.data.length) {
            const adjacentItem = this.gridConfig.data[itemIndex + 1];
            if (adjacentItem.isLocked === currentItem.isLocked && adjacentItem.isHide === currentItem.isHide) {
                newIndex = itemIndex;
            }
        }
        moveItemInArray(this.gridConfig.data, itemIndex, newIndex);
        let hiddencols = this.gridConfig.data
            .filter((item) => item[`isHide`] == true)
            .sort((a, b) => {
                if (a[`columnTitle`] < b[`columnTitle`]) {
                    return -1;
                }
            });
        this.gridConfig.data = this.gridConfig.data.filter((item) => item[`isHide`] == !true).concat(hiddencols);
    }
    public prepareColumnData(config, columns): any {
        let cols = [];
        columns.forEach((ele) => {
            const ind = config.data.findIndex((x) => x[`columnfield`] === ele[`field`]);
            if (ind !== -1) {
                ele.cellRendererParams.orderIndex = ind;
                ele[`hide`] = config.data[ind][`isHide`];
                ele[`locked`] = config.data[ind][`isLocked`];
                if (ele.cellRendererParams.style || (config.data[ind][`color`] && config.data[ind][`color`] !== ``)) {
                    if (ele.cellRendererParams.style && ele.cellRendererParams.style[`background-color`]) {
                        ele.cellRendererParams.style[`background-color`] = config.data[ind][`color`];
                    } else {
                        ele.cellRendererParams.style = {
                            'background-color': config.data[ind][`color`]
                                ? config.data[ind][`color`]
                                : config.data[ind][`existingcolor`],
                        };
                    }
                }
                if (ele.cellRendererParams.style || (config.data[ind][`fontColor`] && config.data[ind][`fontColor`] !== ``)) {
                    if (ele.cellRendererParams.style && ele.cellRendererParams.style[`font-color`]) {
                        ele.cellRendererParams.style[`color`] = config.data[ind][`fontColor`];
                    } else {
                        ele.cellRendererParams.style = {
                            'background-color': config.data[ind][`color`]
                                ? config.data[ind][`color`]
                                : config.data[ind][`existingcolor`],
                            color: config.data[ind][`fontColor`]
                                ? config.data[ind][`fontColor`]
                                : config.data[ind][`existingFontcolor`],
                        };
                    }
                }

                if (
                    ele.cellRendererParams.style &&
                    ele.cellRendererParams.style[`background-color`] &&
                    ele.cellRendererParams.style[`background-color`].toLowerCase() === this.defaultColumnColor.toLowerCase()
                ) {
                    delete ele.cellRendererParams.style[`background-color`];
                }
                if (
                    ele.cellRendererParams.style &&
                    ele.cellRendererParams.style[`color`] &&
                    ele.cellRendererParams.style[`color`].toLowerCase() === this.defaultFontColor.toLowerCase()
                ) {
                    delete ele.cellRendererParams.style[`color`];
                }
                cols.push(ele);
            }
            if (this.inputGridConfig.sort && this.inputGridConfig.sort.length > 0) {
                let sorind = -1;
                if (
                    this.inputGridConfig.sort.some((x) => x[`colId`] === `${ele[`field`]}`)
                ) {
                    sorind = this.inputGridConfig.sort.findIndex((x) => x[`colId`] === `${ele[`field`]}`);
                }
                if (sorind !== -1) {
                    ele[`sort`] = this.inputGridConfig.sort[sorind][`sort`];
                    ele[`sortIndex`] = sorind + 1;
                } else {
                    ele[`sort`] = null;
                    ele[`sortIndex`] = null;
                }
            } else {
                ele[`sort`] = null;
                ele[`sortIndex`] = null;
            }
            if (this.inputGridConfig.groups && this.inputGridConfig.groups.length > 0) {
                let grpind = -1;
                if (
                    this.inputGridConfig.groups.some((x) => x[`colId`] === `${ele[`field`]}`)
                ) {
                    grpind = this.inputGridConfig.groups.findIndex((x) => x[`colId`] === ele[`field`]);
                }
                if (grpind !== -1) {
                    ele[`rowGroupIndex`] = grpind;
                    ele[`rowGroup`] = true;
                } else {
                    ele[`rowGroupIndex`] = 0;
                    ele[`rowGroup`] = false;
                }
            } else {
                ele[`rowGroupIndex`] = 0;
                ele[`rowGroup`] = false;
            }
        });
        this.inputGridConfig.gridConfig.columnDefs = [...cols];
        return columns;
    };

    public SaveConfiguration(): void {
        this.sharedService.GridValueUpdated(false);    
        const data = { id: this.gridId, data: this.gridConfig.data };
        const columns = this.agGridHelperService.getAgGridColumns(this.gridId); // Take old AG Grid columns before update as need this to used in prepareColumnData
        const originalColumns = cloneDeep(columns);
        const updatedColumns = this.prepareColumnData(data, columns);
        const finalColumns = this.agGridHelperService.setAgGridColumns(this.gridId, updatedColumns); // Set Column config data as backend requirement to save
        // Get updated data in AGGrid required format after update so that its accesible in ag-grid after grid config dialo closed
        this.inputGridConfig.gridConfig.columnDefs = this.agGridHelperService.getAgGridColumns(this.gridId);
        if (!this.inputGridConfig.doNotCallGridConfigSaveAPI) {
            this.kendoService.updateGridConfig(JSON.stringify(finalColumns), this.gridId).subscribe(
                (res) => {
                    this.notifyService.success('COLUMN_CONFIG_SAVED', 'GOT IT!');
                    this.dialogRef.close({
                        onsaveClick: true,
                        config: this.inputGridConfig.gridConfig,
                        sort: this.inputGridConfig.sort,
                        groups: this.inputGridConfig.groups,
                    });
                    this.sharedService.bindGridSubscription.next(this.gridId);
                },
                (err) => {
                    this.notifyService.error('COLUMN_CONFIG_FAILED', 'GOT IT!');
                    this.agGridHelperService.setAgGridColumns(this.gridId, originalColumns);
                    this.inputGridConfig.gridConfig.columnDefs = this.agGridHelperService.getAgGridColumns(this.gridId);
                    this.dialogRef.close({
                        onsaveClick: true,
                        config: this.inputGridConfig.gridConfig,
                        sort: this.inputGridConfig.sort,
                        groups: this.inputGridConfig.groups,
                    });
                },
            );
        } else {
            if (this.inputGridConfig.customGridConfigSaveAPI) {
                this.inputGridConfig.customGridConfigSaveAPI().subscribe(
                    () => {
                        this.notifyService.success('COLUMN_CONFIG_SAVED', 'GOT IT!');
                        this.dialogRef.close({
                            onsaveClick: true,
                            config: this.inputGridConfig.gridConfig,
                            sort: this.inputGridConfig.sort,
                            groups: this.inputGridConfig.groups,
                        });
                        this.sharedService.bindGridSubscription.next(this.gridId);
                    },
                    () => {
                        this.notifyService.error('COLUMN_CONFIG_FAILED', 'GOT IT!');
                        this.agGridHelperService.setAgGridColumns(this.gridId, originalColumns);
                        this.inputGridConfig.gridConfig.columnDefs = this.agGridHelperService.getAgGridColumns(this.gridId);
                        this.dialogRef.close({
                            onsaveClick: true,
                            config: this.inputGridConfig.gridConfig,
                            sort: this.inputGridConfig.sort,
                            groups: this.inputGridConfig.groups,
                        });
                    },
                );
            } else {
                this.dialogRef.close({
                    onsaveClick: true,
                    config: this.inputGridConfig.gridConfig,
                    sort: this.inputGridConfig.sort,
                    groups: this.inputGridConfig.groups,
                });
            }
        }
        
    };

    public addNewSortItem(): void {
        this.inputGridConfig = {
            ...this.inputGridConfig,
            sort: this.inputGridConfig.sort.concat({ field: '', dir: 'asc' }),
        };
    };
    public sortItem(index: number, dir: number): void {
        if (this.inputGridConfig.sort[index]) {
            switch (dir) {
                case 0:
                    this.inputGridConfig.sort[index].sort = 'desc';
                    break;
                case 1:
                    this.inputGridConfig.sort[index].sort = 'asc';
                    break;
            }
        }
    };
    public removeSort(index: number): void {
        this.inputGridConfig = {
            ...this.inputGridConfig,
            sort: this.inputGridConfig.sort.filter((x, i) => i !== index),
        };
    };
    public addNewGroupItem(): void {
        this.inputGridConfig = {
            ...this.inputGridConfig,
            groups: this.inputGridConfig.groups.concat({ field: '' }),
        };
    };
    public removeGroup(index: number): void {
        this.inputGridConfig = {
            ...this.inputGridConfig,
            groups: this.inputGridConfig.groups.filter((x, i) => i !== index),
        };
    };

    public resetColumnConfig(): void {
        this.sharedService.GridValueUpdated(false);
        const data = { id: this.gridId, data: this.gridConfig.data };
        const columns = this.agGridHelperService.getAgGridColumns(this.gridId);
        const updatedColumns = this.prepareColumnData(data, columns);
        // this.inputGridConfig.gridConfig.columns = [...updatedColumns];
        const finalColumns = this.agGridHelperService.setAgGridColumns(this.gridId, updatedColumns);
        this.kendoService.resetGridConfig(finalColumns, this.gridId).subscribe((res) => {
            this.inputGridConfig.sort = [];
            this.inputGridConfig.groups = [];
            this.sharedService.GridValueUpdated(false);
            const data = { id: this.gridId, data: this.gridConfig.data };
            const columns = this.agGridHelperService.getAgGridColumns(this.gridId);
            const updatedColumns = this.prepareColumnData(data, columns);
            // this.inputGridConfig.gridConfig.columns = [...updatedColumns];
            this.agGridHelperService.setAgGridColumns(this.gridId, updatedColumns);
            this.dialogRef.close({
                onsaveClick: true,
                config: this.inputGridConfig.gridConfig,
                sort: this.inputGridConfig.sort,
                groups: this.inputGridConfig.groups,
            });
        });
    }
}
