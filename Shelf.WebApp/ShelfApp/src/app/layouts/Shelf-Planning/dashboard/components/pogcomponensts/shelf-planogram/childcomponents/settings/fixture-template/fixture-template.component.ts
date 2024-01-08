import { Component, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild } from '@angular/core';
import { COLOR_PALETTE } from 'src/app/shared/constants/colorPalette';
import { difference, filter } from 'lodash';
import { Dictionary } from 'src/app/shared/models';
import { PogSettingParamKey, POGSettingParam, PogSettingParamGroup } from 'src/app/shared/models/sa-dashboard';
import { GridConfig, GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { AgGridHelperService, SharedService } from 'src/app/shared/services';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ColDef } from 'ag-grid-community';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'sp-fixture-template',
    templateUrl: './fixture-template.component.html',
    styleUrls: ['./fixture-template.component.scss'],
})
export class FixtureTemplateComponent implements OnChanges {
    @Input() FixtureSettings: POGSettingParam[];
    @Input() templateData: PogSettingParamGroup[];
    @Input() gridData: PogSettingParamKey[];
    @Input() labelFilters: Dictionary[];
    @Input() key: string;
    @Output() emitSelection = new EventEmitter();
    @ViewChild(`grid`) grid: AgGridComponent;
    @Input() gridId: string;
    public min: number = 0;
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings = {
        columns: 17,
        palette: COLOR_PALETTE,
    };
    public labelExpression: string;
    private selectedArray: number[];
    public gridConfigData: GridConfig;
    public filterText: string = '';
    
    constructor(
        private readonly agGridHelperService: AgGridHelperService,
        private readonly sharedService: SharedService,
        private readonly translate: TranslateService
    ) { }

    public ngOnChanges(changes: SimpleChanges): void {
        if (
            (changes.FixtureSettings && changes.FixtureSettings.currentValue) ||
            (changes.gridData && changes.gridData.currentValue) ||
            (changes.labelFilters && changes.labelFilters.currentValue)
        ) {
            this.selectedArray = [];
            this.labelExpression = this.gridData[0].fieldObj.SelectedValue.value
                ? this.gridData[0].fieldObj.SelectedValue.value as string
                : '';
            this.labelExpression = this.labelExpression
                .replaceAll('\\\\\\n', '\n')
                .replaceAll('\\\\n', '\n')
                .replaceAll('\\n', '\n')
                .replaceAll('·', '.');
            this.getLabelExpArray();
            if (this.gridData && this.gridData[0].fieldObj.Values.length) {
                this.bindgriddata('labelSettingsGrid', this.gridData[0].fieldObj.Values as Dictionary[]);
            }
        }
    }

    public isCheckDisabled(fieldObj: string): boolean {
        if (fieldObj === 'DOCK_STATUSBAR') {
            return true;
        }
        return false;
    }
    public showCheck(fieldObj: string): boolean {
        if (fieldObj === 'DOCK_STATUSBAR') {
            return false;
        }
        return true;
    }

    public isReadOnly(tData: PogSettingParamGroup[]): boolean {
        return (
            filter(tData[0].children, function (o) {
                return o.key.indexOf('.POSLABEL.') > 0;
            }).length === 0
        );
    }

    public getLabelExpArray(): void {
        this.labelFilters.forEach((obj) => {
            if (this.labelExpression && this.labelExpression.includes('~'+obj.value+'~')) {
                this.selectedArray.push(obj.IDDictionary);
            }
        });
        this.emitSelection.emit({ labelExpression: this.labelExpression });
    }

    private generateLabelExp(): void {
        let newList = [];
        for (let dictID of this.selectedArray) {
            let dictobj = this.labelFilters.find((obj) => obj.IDDictionary === dictID);
            if (dictobj) newList.push('~' + dictobj.value + '~');
        }
        const currentList = this.labelExpression.match(/~.*?~/g);
        let addList = difference(newList, currentList);
        let delList = difference(currentList, newList);
        delList.forEach((d) => (this.labelExpression = this.labelExpression.replaceAll(d, '')));
        const textArea: HTMLTextAreaElement = document.querySelector('textarea#labelExpression');
        let cursorPos = textArea ? textArea.selectionStart : this.labelExpression.length;
            addList.forEach((a) => {
                this.labelExpression = this.labelExpression.slice(0, cursorPos) + a + this.labelExpression.slice(cursorPos);
                cursorPos += a.length;
            });

        this.emitSelection.emit({ labelExpression: this.labelExpression });
    }

    public invokeSelectedRow(retrieveSelection?: boolean): void {
        if (retrieveSelection) {
            let rowsSelected: Dictionary[] = [];
            for (const labelObj of this.labelFilters) {
                (this.selectedArray?.indexOf(labelObj.IDDictionary) != -1) ? rowsSelected.push(labelObj) : '';
            }
            this.sharedService.selectedRowData.push({ id: this.gridId, selectedIdDictionary: rowsSelected })
        } else {
            const selectedRows = this.grid?.gridApi?.getSelectedRows();
            this.selectedArray = [];
            if (selectedRows.length) {
                this.selectedArray = selectedRows.map(ele => ele.IDDictionary);
            }
            const index = this.sharedService.selectedRowData.findIndex((el) => el.id === this.gridId);
            if (this.sharedService.selectedRowData.length == 0 || index === -1) {
                this.sharedService.selectedRowData.push({ id: this.gridId, selectedIdDictionary: selectedRows })
            } else {
                this.sharedService.selectedRowData.forEach((node) => {
                    if (node.id === this.gridId) {
                        node.selectedIdDictionary = selectedRows ? selectedRows : [];;
                    }
                })
            }
        }
        let allSelectedStores: Dictionary[] = []
        this.sharedService.selectedRowData.forEach((node) => {
            node.selectedIdDictionary.forEach((item) => {
                allSelectedStores.push(item);
            })
        })
        this.generateLabelExp();
    }

    private bindgriddata(id: string, data: Dictionary[]): void {
        if (this.labelFilters) {
            this.invokeSelectedRow(true);//to retrieve already selected label expression Data in the grid
        }
        let items = this.sharedService.selectedRowData.length ? this.sharedService.selectedRowData.find(ele => ele.id == this.gridId) : [];
        if (this.grid) {
            this.grid?.gridApi?.setRowData(data);
        } else {
            this.gridConfigData = {
                id: id,
                columnDefs: this.prepareColumnsList(id),
                data: data,
                height: '325px',
                hideColumnConfig: true,
                hideSelectAll: true,
                hideGroupHeader: true,
                shoeColCongig: false,
                firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
                setRowsForSelection: { field: 'IDDictionary', items: items ? items['selectedIdDictionary'] : [] },
            }
        }
    }

    public onDataBound(searchValArray: { text: string; value: number }[], searchTxt: string): void {
        if (searchTxt) {
            const index = searchValArray.findIndex((item) => item.text.includes(searchTxt));
            if (index < 0) {
                searchValArray.push({ text: searchTxt, value: Number(searchTxt) });
            }
        }
    }

    public onchange(SelectedValue: { text: string; value: string }): void {
        SelectedValue.text = JSON.stringify(SelectedValue.value);
    }

    //TODO @Amit Move this col conf to DB
    private prepareColumnsList(id): ColDef[] {
        let col: GridColumnSettings = {
            0: this.translate.instant('FIELD'),
            1: 'value',
            2: 8,
            3: false,
            4: false,
            5: true,
            6: false,
            7: 0,
            8: 60,
            9: false,
            10: "string",
            11: 'Field',
            12: "",
            13: "True",
            14: "",
            15: "",
            16: 0,
            17: 0,
            18: 0,
            ColumnMenu: true,
            IsMandatory: false,
            ProjectType: "",
            SkipTemplateForExport: false,
            SortByTemplate: false,
            FilterTemplate: "",
            Template: ""
        };

        let gridColumnCustomConfig: GridColumnCustomConfig = {
            customCol: [col],
        }
        return this.agGridHelperService.getAgGridColumns(id, gridColumnCustomConfig)
    }
}
