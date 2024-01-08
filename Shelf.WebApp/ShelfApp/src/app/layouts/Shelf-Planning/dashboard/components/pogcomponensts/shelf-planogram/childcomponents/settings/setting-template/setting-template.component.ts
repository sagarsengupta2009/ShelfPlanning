import {
    Component,
    Input,
    OnChanges,
    SimpleChanges,
    Output,
    EventEmitter,
    ViewChild,
    Renderer2,
    Inject,
    OnDestroy,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AvailableWSConfColService } from 'src/app/shared/services/layouts/space-automation/dashboard/user-Setting/available-wsconf-col.service';
import { PogSettingParamKey, AllSettings } from 'src/app/shared/models/sa-dashboard';
import { Dictionary } from 'src/app/shared/models';
import { GridConfig, GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { ColDef } from 'ag-grid-community';
import { AgGridHelperService, SettingsService } from 'src/app/shared/services';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { difference } from 'lodash';

@Component({
    selector: 'sp-setting-template',
    templateUrl: './setting-template.component.html',
    styleUrls: ['./setting-template.component.scss'],
})
export class SettingTemplateComponent implements OnChanges, OnDestroy {
    @Input() fieldData: PogSettingParamKey[];
    @Input() key: string;
    @Input() statusbarSelectedVal: { fixture: Dictionary[]; pog: Dictionary[]; position: Dictionary[] };
    @Output() emitSelection = new EventEmitter();
    @Output() gridChanges = new EventEmitter();
    @ViewChild(`grid`) grid: AgGridComponent;
    @Input() gridId: string;
    public statusbar_settings: string = ' ';
    public min: number = 0;
    public statusbarFilters: GridConfig;
    public statusTabDropDownData = {
        SelectedValue: 'position',
        Values: [],
        gridData: [],
        SelectedDataDisplay: '',
    };
    public selectedArray: number[];

    public isLabelDisplay: boolean;

    constructor(
        private readonly translate: TranslateService,
        private readonly availableWSConfColService: AvailableWSConfColService,
        @Inject(DOCUMENT) private readonly document,
        private readonly renderer: Renderer2,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly settingsService: SettingsService
    ) {
        renderer.addClass(document.body, 'status-filter-panel');
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (
            (changes.fieldData && changes.fieldData.currentValue) ||
            (changes.key && changes.key.currentValue) ||
            (changes.statusbarSelectedVal && changes.statusbarSelectedVal.currentValue)
        ) {
            if (this.key === 'StatusSettingstab') {
                this.statusTabDropDownData.Values = [
                    { text: this.translate.instant('SECTION'), value: 'pog' },
                    { text: this.translate.instant('FIXTURE'), value: 'fixture' },
                    { text: this.translate.instant('POSITION'), value: 'position' },
                ];

                this.pogObjectChanged(this.statusTabDropDownData.SelectedValue);
            }
        }
    }

    public ngOnDestroy(): void {
        this.renderer.removeClass(document.body, 'status-filter-panel');
    }

    public isCheckDisabled(fieldObj: PogSettingParamKey): string {
        if (fieldObj.key === 'DOCK_STATUSBAR') {
            const docktoolBarValue = this.fieldData
                .filter((ele) => ele.key === 'DOCK_TOOLBAR')[0].fieldObj.SelectedValue.value as string;
            fieldObj.fieldObj.SelectedValue.value = docktoolBarValue
                ? docktoolBarValue
                : fieldObj.fieldObj.SelectedValue.value as string;
            return docktoolBarValue;
        }
        if (['TURN_OFF_POS_CALLOUT', 'TURN_OFF_FIXT_CALLOUT'].includes(fieldObj.key)) {
          const annotationON = this.fieldData
            .filter((ele) => ele.key === 'TURN_ON_ANNOTATION')[0].fieldObj.SelectedValue.value as string;
          fieldObj.fieldObj.SelectedValue.value = annotationON ? fieldObj.fieldObj.SelectedValue.value as string: annotationON;
          return (annotationON ? false : true) as any;
        }
        return;
    }

    public displayButton(keyname: string): boolean {
        if (keyname === 'TURN_ON_FIXT_LABEL' || keyname === 'STATUSBAR_SETTINGS' || keyname === 'TURN_ON_LABEL') {
            return true;
        } else return false;
    }

    public showSettings(keyname: string, settingObj: AllSettings): void {
        this.emitSelection.emit({ id: keyname, fieldObj: settingObj });
    }

    public pogObjectChanged(pogObjType: string): void {
        this.selectedArray = [];

        switch (pogObjType) {
            case 'pog': {
                this.statusTabDropDownData.gridData = this.availableWSConfColService.availableConfiguration.availableSectionStatusbarColumnConfig;
                this.labelFilterSelection(this.settingsService.selectedPogLabelData);
                break;
            }
            case 'position': {
                this.statusTabDropDownData.gridData = this.availableWSConfColService.availableConfiguration.availableColumnConfig;
                this.labelFilterSelection(this.settingsService.selectedPositionLabelData);
                break;
            }
            case 'fixture': {
                this.statusTabDropDownData.gridData = this.availableWSConfColService.availableConfiguration.availableFixtureColumnConfig;
                this.labelFilterSelection(this.settingsService.selectedFixtureLabelData);
                break;
            }
        }

        for (let dictObj of this.statusbarSelectedVal[pogObjType]) {

            let griDataobj = this.statusTabDropDownData.gridData.find(
                (item) => item['IDDictionary'] === dictObj.IDDictionary,
            );
            if (griDataobj && !this.isLabelDisplay) {
                if (dictObj.value) {
                    this.statusTabDropDownData.SelectedDataDisplay += '~' + dictObj.value + '~';
                } else {
                    this.statusTabDropDownData.SelectedDataDisplay += '~' + dictObj.ShortDescription + '~';
                }
            }
            this.selectedArray.push(dictObj.IDDictionary);
        }

        let data = Object.assign({}, this.statusbarSelectedVal);
        this.gridChanges.emit(data);
        this.bindgriddata('statussetting', this.statusTabDropDownData.gridData);

    }

    private labelFilterSelection(labelSelectedType: string) {
        if (labelSelectedType) {
            this.statusTabDropDownData.SelectedDataDisplay = labelSelectedType;
            this.isLabelDisplay = true;
        } else {
            this.statusTabDropDownData.SelectedDataDisplay = '';
            this.isLabelDisplay = false;
        }
    }

    public invokeSelectedRow(event): void {
            const selectedRows = this.grid?.gridApi?.getSelectedRows();
            this.selectedArray = [];
            if (selectedRows.length) {
                selectedRows.forEach((element) => {
                    let indexObj = this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue].findIndex(
                        (item) => item.IDDictionary === element.IDDictionary,
                    );
                    if (indexObj < 0){
                        this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue].push(element);
                    }
                    if (this.selectedArray.indexOf(element.IDDictionary) < 0){
                        this.selectedArray.push(element.IDDictionary);
                    }
                });
            }
            //removing the unselected data from array
            this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue] = this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue].filter(o1 => selectedRows.some(o2 => o1.IDDictionary === o2.IDDictionary));
         this.generateLabelExp();
    }

    private generateLabelExp(): void {
        let newList = [];

        for (const dictObj of this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue]) {
            const gridDataObj = this.statusTabDropDownData.gridData.find(
                (item) => item['IDDictionary'] === dictObj.IDDictionary,
            );

            if (gridDataObj) {
                if (gridDataObj.value) {
                    newList.push('~' + gridDataObj.value + '~');
                } else {
                    newList.push('~' + gridDataObj.ShortDescription + '~');
                }
            }
        }
       // Below operation appends the selected elements in order of their selection to label
        const currentList = this.statusTabDropDownData.SelectedDataDisplay.match(/~.*?~/g);
        let addList = difference(newList, currentList);
        let delList = difference(currentList, newList);
        delList.forEach((d) => (this.statusTabDropDownData.SelectedDataDisplay = this.statusTabDropDownData.SelectedDataDisplay.replaceAll(d, '')));
        const textArea: HTMLTextAreaElement = document.querySelector('textarea#labelExpression');
        let cursorPos = textArea ? textArea.selectionStart : this.statusTabDropDownData.SelectedDataDisplay.length;
            addList.forEach((a) => {
                this.statusTabDropDownData.SelectedDataDisplay = this.statusTabDropDownData.SelectedDataDisplay.slice(0, cursorPos) + a + this.statusTabDropDownData.SelectedDataDisplay.slice(cursorPos);
                cursorPos += a.length;
            });

        const data = Object.assign({}, this.statusbarSelectedVal);

        switch (this.statusTabDropDownData.SelectedValue) {
            case 'pog': {
                this.settingsService.selectedPogLabelData = this.statusTabDropDownData.SelectedDataDisplay;
                break;
            }
            case 'position': {
                this.settingsService.selectedPositionLabelData = this.statusTabDropDownData.SelectedDataDisplay;
                break;
            }
            case 'fixture': {
                this.settingsService.selectedFixtureLabelData = this.statusTabDropDownData.SelectedDataDisplay;
                break;
            }
        }

        this.gridChanges.emit(data);
    }

    private bindgriddata(id: string, data: Dictionary[]): void {

            this.statusbarFilters = {
                    id: id,
                    columnDefs: this.prepareColumnsList(id),
                    data: data,
                    height: '265px',
                    hideColumnConfig: true,
                    hideSelectAll: true,
                    hideGroupHeader:true,
                    shoeColCongig: false,
                    firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
                    setRowsForSelection: {field: 'IDDictionary', items:  this.statusbarSelectedVal[this.statusTabDropDownData.SelectedValue] },
                }

    }

    private prepareColumnsList(id): ColDef[] {
        let col: GridColumnSettings = {
            0: this.translate.instant('FIELD'),
            1: 'ShortDescription',
            2: 2,
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
            FilterTemplate: '',
            Template: ''
        };

        let gridColumnCustomConfig: GridColumnCustomConfig = {
            customCol: [col]
        }
        return this.agGridHelperService.getAgGridColumns(id, gridColumnCustomConfig)
    }
}
