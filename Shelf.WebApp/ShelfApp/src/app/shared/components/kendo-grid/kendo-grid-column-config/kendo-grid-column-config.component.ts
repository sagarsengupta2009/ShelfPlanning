import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { KednoGridConfig, KendoColumnSetting, KendoPromoteGridConfig } from 'src/app/shared/models/kendoGrid';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SharedService, SaDashboardService, NotifyService, SelectedScenarioService } from 'src/app/shared/services';
import { KendoGridComponent } from '../kendo-grid.component';
import { CdkDragDrop, moveItemInArray, transferArrayItem, CdkDrag } from '@angular/cdk/drag-drop';
import { KendoService } from 'src/app/shared/services/common/kendo/kendo.service';
import { PaletteSettings } from '@progress/kendo-angular-inputs';
import * as _ from 'lodash';

@Component({
    selector: 'srp-kendo-grid-column-config',
    templateUrl: './kendo-grid-column-config.component.html',
    styleUrls: ['./kendo-grid-column-config.component.scss'],
})
export class KendoGridColumnConfigComponent implements OnInit {
    public columnsList: any[];
    public showSearchArrow = false;
    public scrollAt = 0;
    public gridId: string;
    public tData: KendoPromoteGridConfig[];
    constructor(
        @Inject(MAT_DIALOG_DATA) public inputGridConfig: any,
        private readonly sharedService: SharedService,
        private readonly saDashboardService: SaDashboardService,
        private readonly notifyService: NotifyService,
        private readonly kendoService: KendoService,
        public dialogRef: MatDialogRef<KendoGridColumnConfigComponent>,
        private readonly selectedScenarioService: SelectedScenarioService,
    ) {
        this.gridId = inputGridConfig.gridConfig.id;
    }
    @ViewChild(`configGrid`) configGrid: KendoGridComponent;
    public searchColumn = ``;
    public gridConfig: KednoGridConfig;
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
    drop(event: CdkDragDrop<string[]>, dataObject) {
        if (event.previousContainer !== event.container) {
            if (
                event.container.data.some(
                    (x) =>
                        x[`field`] === event.item.data.columnfield ||
                        x[`field`] === event.item.data.columnfield + `_template`,
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
                            x[`field`] === event.item.data.columnfield ||
                            x[`field`] === event.item.data.columnfield + `_template`,
                    )
                ) {
                    return false;
                }
                CopyObject = event.previousContainer.data.map((x) => {
                    return {
                        field: x[`columnfield`],
                        dir: x[`sortDir`] ? x[`sortDir`] : 'desc',
                    };
                });
            }
            if (event.container.id === `groupList`) {
                if (
                    this.inputGridConfig.group &&
                    this.inputGridConfig.group.some(
                        (x) =>
                            x[`field`] === event.item.data.columnfield ||
                            x[`field`] === event.item.data.columnfield + `_template`,
                    )
                ) {
                    return false;
                }
                CopyObject = event.previousContainer.data.map((x) => {
                    return {
                        field: x[`columnfield`],
                    };
                });
            }
            transferArrayItem(CopyObject, event.container.data, event.previousIndex, event.currentIndex);
        } else {
            moveItemInArray(dataObject, event.previousIndex, event.currentIndex);
        }
        if (event.previousIndex !== event.currentIndex) {
            if (event.currentIndex > -1 && event.currentIndex + 1 < dataObject.length) {
                dataObject[event.currentIndex].isHide = dataObject[event.currentIndex + 1].isHide;
                dataObject[event.currentIndex].isLocked = dataObject[event.currentIndex + 1].isLocked;
            } else if (event.currentIndex === dataObject.length - 1 && dataObject.length > 1) {
                dataObject[event.currentIndex].isHide = dataObject[event.currentIndex - 1].isHide;
                dataObject[event.currentIndex].isLocked = dataObject[event.currentIndex - 1].isLocked;
            }
        }
    }

    public searchAndHighlight(): void{
        if (this.searchColumn && this.searchColumn !== ``) {
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
    public gotoElement(scrollUp: boolean = false) {
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
    validateDrop(item: CdkDrag<any>) {
        return !item.data[`isHide`];
    }
    private extractColorFromStyle = (style, val) => {
        const replace = new RegExp(`\'`, `g`);
        const temp =
            style && style !== `` && !_.isEmpty(style)
                ? style
                : {
                      'background-color': this.defaultColumnColor,
                      color: this.defaultFontColor,
                  };

        if (val === 0) {
            if (temp[`background-color`]) {
                return String(temp[`background-color`]).trim();
            } else {
                return ``;
            }
        } else {
            if (temp[`color`]) {
                return String(temp[`color`]).trim();
            } else {
                return ``;
            }
        }
    };

    public LightenDarkenColor(col) {
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
    rgba2hex(orig) {
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
    public pickerSwitch(picker): void{
         picker.toggle(!picker.isOpen);
    };
    ngOnInit(): void {
        const cols = [
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `columnfield`,
                title: `Fields`,
                orderIndex: 1,
                locked: false,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `columnTitle`,
                title: `Title`,
                orderIndex: 2,
                locked: false,
                editable: true,
                type: `string`,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `columnDescription`,
                title: `Description`,
                orderIndex: 5,
                locked: false,
                templateDummy: ``,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `isHide`,
                title: `Hide/Show`,
                orderIndex: 3,
                locked: false,
                templateDummy: ``,
                type: `boolean`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `isLocked`,
                title: `Lock/Unlock`,
                orderIndex: 4,
                locked: false,
                templateDummy: ``,
                type: `boolean`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `sortDir`,
                title: `Sort`,
                orderIndex: 5,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: true,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `color`,
                title: `color`,
                orderIndex: 6,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: false,
            },
            {
                ...this.inputGridConfig.gridConfig.columns[2],
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
                ...this.inputGridConfig.gridConfig.columns[2],
                field: `width`,
                title: `width`,
                orderIndex: 8,
                locked: false,
                templateDummy: ``,
                type: `string`,
                editable: false,
            },
        ];

        this.inputGridConfig.sort.forEach((element) => {
            const strArray = element.field.split('_');
            if (strArray[1] == 'CalcField') {
                element[`field`] = element.field.split('_template')[0].replace(/_/g, '.');
                element[`field`] = element[`field`].replace(/^./, '_');
            } else {
                element[`field`] = element.field.split('_template')[0].replace(/_/g, '.');
            }
        });

        this.inputGridConfig.groups.forEach((element) => {
            const strArray = element.field.split('_');
            if (strArray[1] == 'CalcField') {
                element[`field`] = element.field.split('_template')[0].replace(/_/g, '.');
                element[`field`] = element[`field`].replace(/^./, '_');
            } else {
                element[`field`] = element.field.split('_template')[0].replace(/_/g, '.');
            }
        });

        let finalCols = [];
        let storedCols: KendoColumnSetting[] = this.saDashboardService.GetGridColumns(this.gridId);
        const scenarioName = this.selectedScenarioService.getSelectedScenarioName();
        if (scenarioName) {
            storedCols = storedCols.filter((x) => x[`ProjectType`].includes(`*`));
        }
        storedCols.forEach((col) => {
            let colName = col['field'];
            if (col['field'].indexOf('.') !== -1) {
                colName = col['field'].replace(/\./g, '_');
            }
            if (
                this.inputGridConfig.gridConfig.columns.some(
                    (x) =>
                        x[`field`] === col[`field`] || x[`field`] === colName || x[`field`] === colName + `_template`,
                )
            ) {
                const tempData = this.inputGridConfig.gridConfig.columns.filter(
                    (x) =>
                        x[`field`] === col[`field`] || x[`field`] === colName || x[`field`] === colName + `_template`,
                );
                tempData[0][`field`] = col[`field`];
                finalCols.push(tempData[0]);
            }
        });



        this.tData = storedCols
            .filter((x) => x[`IsMandatory`] == false)
            .map((col: KendoColumnSetting) => this.toKendoColumnSetting(col));


        let tempData: KendoPromoteGridConfig[] = finalCols
            .sort((a, b) => {
                return a[`orderIndex`] - b[`orderIndex`];
            })
            .filter((x) => x[`IsMandatory`])
            .map((col: KendoColumnSetting) => this.toKendoColumnSetting(col));

        let hiddencols = tempData
            .filter((item) => item[`isHide`] == true)
            .sort((a, b) => {
                if (a[`columnTitle`] < b[`columnTitle`]) {
                    return -1;
                }
            });
        tempData = tempData.filter((item) => item[`isHide`] == !true).concat(hiddencols);
        this.gridConfig = {
            ...this.gridConfig,
            id: `column_config`,
            columns: cols,
            data: tempData,
            height: `calc(100vh - 245px)`,
            // firstCheckBoxColumn: true,
            // isRowSelectableByCheckbox: true,
            columnConfig: false,
        };
        this.columnsList = [...finalCols];
        this.columnsList.shift();
    }

    private toKendoColumnSetting(column: KendoColumnSetting): KendoPromoteGridConfig{
        return {
            [`columnfield`]: column.field,
            [`columnTitle`]: column.title,
            [`columnDescription`]: column.description,
            [`isHide`]: column.hidden,
            [`isLocked`]: column.locked,
            [`searchcss`]: false,
            ['width']: this.getActualWidth(column.field, column.width),
            ['sortDir']:
            column.sortable && column.sortable[`initialDirection`]
                    ? column.sortable[`initialDirection`]
                    : ``,
            [`color`]: this.extractColorFromStyle(column.style, 0),
            [`fontColor`]: this.extractColorFromStyle(column.style, 1),
        };
    }

    public getActualWidth(field: string, width: number): number{
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

    public bindTitleOrDescription(field:string, val: number): string{
        let returnVal = ``;
        field = field.indexOf('_template') !== -1 ? field.split('_')[0] : field;
        if (field) {
            const col = this.inputGridConfig.gridConfig.columns.find((x) => x[`field`] === field);
            if (col) {
                switch (val) {
                    case 0:
                        returnVal = col[`title`];
                        break;
                    case 1:
                        if (col[`title`] != col[`description`]) {
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

    public OnColorChange(event, data){
        data[`existingcolor`] = data[`color`];
        data[`existingFontcolor`] = data[`fontColor`];
        data[`fontColor`] = this.LightenDarkenColor(event);
        data[`color`] = event;
    };
    public lockUnlock(val: number, data: any): void{
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
    public hideShow(val: number, data: any): void{
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
    private MoveToEnd(itemIndex) {
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
    public prepareColumnData(config, columns){
        let cols = [];
        columns.forEach((ele) => {
            const ind = config.data.findIndex((x) => x[`columnfield`] === ele[`field`]);
            if (ind !== -1) {
                ele[`orderIndex`] = ind;
                ele[`hidden`] = config.data[ind][`isHide`];
                ele[`locked`] = config.data[ind][`isLocked`];
                if (ele[`style`] || (config.data[ind][`color`] && config.data[ind][`color`] !== ``)) {
                    if (ele[`style`] && ele[`style`][`background-color`]) {
                        ele[`style`][`background-color`] = config.data[ind][`color`];
                    } else {
                        ele[`style`] = {
                            'background-color': config.data[ind][`color`]
                                ? config.data[ind][`color`]
                                : config.data[ind][`existingcolor`],
                        };
                    }
                }
                if (ele[`style`] || (config.data[ind][`fontColor`] && config.data[ind][`fontColor`] !== ``)) {
                    if (ele[`style`] && ele[`style`][`font-color`]) {
                        ele[`style`][`color`] = config.data[ind][`fontColor`];
                    } else {
                        ele[`style`] = {
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
                    ele[`style`] &&
                    ele[`style`][`background-color`] &&
                    ele[`style`][`background-color`].toLowerCase() === this.defaultColumnColor.toLowerCase()
                ) {
                    delete ele[`style`][`background-color`];
                }
                if (
                    ele[`style`] &&
                    ele[`style`][`color`] &&
                    ele[`style`][`color`].toLowerCase() === this.defaultFontColor.toLowerCase()
                ) {
                    delete ele[`style`][`color`];
                }
                cols.push(ele);
            }
            if (this.inputGridConfig.sort && this.inputGridConfig.sort.length > 0) {
                let sorind = -1;
                if (
                    ele[`templateDummy`] &&
                    ele[`templateDummy`] !== '' &&
                    this.inputGridConfig.sort.some((x) => x[`field`] === `${ele[`field`]}_template`)
                ) {
                    sorind = this.inputGridConfig.sort.findIndex((x) => x[`field`] === `${ele[`field`]}_template`);
                } else {
                    sorind = this.inputGridConfig.sort.findIndex((x) => x[`field`] === `${ele[`field`]}`);
                }
                if (sorind !== -1) {
                    ele[`sortable`][`initialDirection`] = this.inputGridConfig.sort[sorind][`dir`];
                    ele[`sortorder`] = sorind;
                } else {
                    ele[`sortable`] = { initialDirection: null };
                }
            } else {
                ele[`sortable`] = { initialDirection: null };
            }
            if (this.inputGridConfig.groups && this.inputGridConfig.groups.length > 0) {
                let grpind = -1;
                if (
                    ele[`templateDummy`] &&
                    ele[`templateDummy`] !== '' &&
                    this.inputGridConfig.groups.some((x) => x[`field`] === `${ele[`field`]}_template`)
                ) {
                    grpind = this.inputGridConfig.groups.findIndex((x) => x[`field`] === `${ele[`field`]}_template`);
                } else {
                    grpind = this.inputGridConfig.groups.findIndex((x) => x[`field`] === ele[`field`]);
                }
                if (grpind !== -1) {
                    ele[`groupOrder`] = grpind;
                    ele[`groupable`] = true;
                } else {
                    ele[`groupOrder`] = 0;
                    ele[`groupable`] = false;
                }
            } else {
                ele[`groupOrder`] = 0;
                ele[`groupable`] = false;
            }
        });
        this.inputGridConfig.gridConfig.columns = [...cols];
        return columns;
    };

    public SaveConfiguration(){
        this.sharedService.GridValueUpdated(false);
        this.gridConfig.data = this.tData.concat(this.gridConfig.data);
        const data = { id: this.gridId, data: this.gridConfig.data };
        const columns = this.saDashboardService.GetGridColumns(this.gridId);
        const updatedColumns = this.prepareColumnData(data, columns);
        this.saDashboardService.setGridColumns(this.gridId, updatedColumns);
        const finalColumns = this.saDashboardService.setUserPrefGridColumns(this.gridId, updatedColumns);
        this.kendoService.updateGridConfig(finalColumns, this.gridId).subscribe(
            (res) => {
                this.notifyService.success('COLUMN_CONFIG_SAVED', 'GOT IT!');
            },
            (err) => {
                this.notifyService.error('COLUMN_CONFIG_FAILED', 'GOT IT!');
            },
        );
    };

    public addNewSortItem(){
        this.inputGridConfig = {
            ...this.inputGridConfig,
            sort: this.inputGridConfig.sort.concat({ field: '', dir: 'asc' }),
        };
    };
    public sortItem(index: number, dir: number){
        if (this.inputGridConfig.sort[index]) {
            switch (dir) {
                case 0:
                    this.inputGridConfig.sort[index][`dir`] = 'desc';
                    break;
                case 1:
                    this.inputGridConfig.sort[index][`dir`] = 'asc';
                    break;
            }
        }
    };
    public removeSort(index: number){
        this.inputGridConfig = {
            ...this.inputGridConfig,
            sort: this.inputGridConfig.sort.filter((x, i) => i !== index),
        };
    };
    public addNewGroupItem(){
        this.inputGridConfig = {
            ...this.inputGridConfig,
            groups: this.inputGridConfig.groups.concat({ field: '' }),
        };
    };
    public removeGroup(index: number){
        this.inputGridConfig = {
            ...this.inputGridConfig,
            groups: this.inputGridConfig.groups.filter((x, i) => i !== index),
        };
    };

    public resetColumnConfig(): void {
        this.sharedService.GridValueUpdated(false);
        const data = { id: this.gridId, data: this.gridConfig.data };
        const columns = this.saDashboardService.GetGridColumns(this.gridId);
        const updatedColumns = this.prepareColumnData(data, columns);
        this.inputGridConfig.gridConfig.columns = [...updatedColumns];
        this.saDashboardService.setGridColumns(this.gridId, updatedColumns);
        this.kendoService.resetGridConfig(columns, this.gridId).subscribe((res) => {
            this.inputGridConfig.sort = [];
            this.inputGridConfig.groups = [];
            this.sharedService.GridValueUpdated(false);
            const data = { id: this.gridId, data: this.gridConfig.data };
            const columns = this.saDashboardService.GetGridColumns(this.gridId);
            const updatedColumns = this.prepareColumnData(data, columns);
            // this.inputGridConfig.gridConfig.columns = [...updatedColumns];
            const finalColumns = this.saDashboardService.setGridColumns(this.gridId, updatedColumns);
            this.dialogRef.close({
                onsaveClick: true,
                config: this.inputGridConfig.gridConfig,
                sort: this.inputGridConfig.sort,
                groups: this.inputGridConfig.groups,
            });
        });
    }
}
