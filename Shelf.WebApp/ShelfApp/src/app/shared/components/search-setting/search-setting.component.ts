import { Component, OnInit, Input, Output, EventEmitter, Inject, Optional, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ConsoleLogService } from 'src/app/framework.module';
import {
    AllSettings,
    HierarchyObject,
    SearchTypeName,
    UserSearchMode,
    ProductHierarchy,
    RawSearchSetting,
    SettingsValueOption,
} from '../../models';
import { SearchSettingVM } from '../../models/fixture-gallary';
import { NotifyService, PlanogramStoreService, SearchSettingService } from '../../services';

@Component({
    selector: 'sp-search-setting',
    templateUrl: './search-setting.component.html',
    styleUrls: ['./search-setting.component.scss'],
})
export class SearchSettingComponent implements OnInit, OnDestroy {
    @Input() customSearchType: SearchSettingVM;
    @Input() type: SearchTypeName;
    @Output() close = new EventEmitter<SearchSettingVM>();
    @Output() onUpdateProductHierarchy = new EventEmitter<HierarchyObject[]>();

    public modeValues = []; //TODO @keerthi add interface
    public fieldOptions: SettingsValueOption[] = [];
    public selectedMode: string = '';
    public selectedField: string = '';
    public isDisplayApplyBtnInSearch = true;
    private modeKeyName: string = '';
    private fieldKeyName: string = '';
    private searchSettingCollection: { [key: string]: AllSettings } = {};
    private rawFieldOptions: RawSearchSetting;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private readonly translate: TranslateService,
        private readonly notifyService: NotifyService,
        private readonly searchSetting: SearchSettingService,
        @Optional() @Inject(MAT_DIALOG_DATA) private readonly data,
        @Optional() private readonly dialog: MatDialogRef<SearchSettingComponent>,
        private readonly planogramStore: PlanogramStoreService,
        private readonly consoleLogService: ConsoleLogService,
    ) {
        if (data) {
            this.customSearchType = data.planogram;
            this.type = data.type;
        }
    }

    ngOnInit(): void {
        this.initSearchSetting(this.type);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public get isDisplayProjectFilter(): boolean {
        const isProjectProductSearchEnable = this.planogramStore.appSettings.isProjectProductSearchEnable;
        const isProjectFilterTurnedOn = this.planogramStore.projectProductHierarchy?.IsFilterable;
        return isProjectFilterTurnedOn && isProjectProductSearchEnable;
    }

    private initSearchSetting(type: SearchTypeName): void {
        const keys = this.searchSetting.getSearchSettingsNames(type);

        this.modeKeyName = keys.ModeKey;
        const modeSetting = this.searchSetting.getSetting(this.modeKeyName);

        this.modeValues = modeSetting.Values;
        this.selectedMode = modeSetting.SelectedValue.value as string;
        this.searchSettingCollection[this.modeKeyName] = modeSetting;

        this.populateFieldSearchOptions(type);

        this.fieldKeyName = keys.FieldKey;
        const fieldSettings = this.searchSetting.getSetting(this.fieldKeyName);

        if (fieldSettings) {
            if (this.selectedMode === 'DB' && fieldSettings.SelectedValue.value === '*' ){
                this.selectedField = this.fieldOptions[0].value as string;
            } else {
                this.selectedField = fieldSettings.SelectedValue.value as string;
            }
            this.searchSettingCollection[this.fieldKeyName] = fieldSettings;
        } else {
            this.selectedField = this.fieldOptions[0].value as string;
            this.searchSettingCollection[this.fieldKeyName] = {} as AllSettings;
        }

        this.customSearchType.selectedType = this.selectedField;
        if (this.selectedField === '*') {
            this.customSearchType.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
            if (this.selectedMode === UserSearchMode.DB) { // as ABS has only DB mode this is to handle default value
                const checkDefaultValue = this.fieldOptions.some((item) => item.value === '*');
                checkDefaultValue ? this.fieldOptions.shift() : this.fieldOptions;
                if (!checkDefaultValue) {
                    this.selectedField = this.fieldOptions[0].value as string;
                }
            }
        } else {
            const searchBy = this.translate.instant(this.searchSetting.getFieldDescription(type, this.selectedField));
            this.customSearchType.selectedField = `${this.translate.instant('SEARCH_BY')} <${searchBy}>`;
        }

        if (type === SearchTypeName.PRODUCT) {
            this.getProductHierarchy();
        }
    }

    private populateFieldSearchOptions(type: SearchTypeName): void {
        this.rawFieldOptions = this.searchSetting.getCustomSearchOption(type);
        for (let key of Object.keys(this.rawFieldOptions)) {
            const option = {
                value: key,
                text: `${this.translate.instant(this.rawFieldOptions[key])}`,
            };
            this.fieldOptions.push(option);
        }
        const isAllOptionIncluded = this.fieldOptions.some((item) => item.value === '*');

        if (this.selectedMode === UserSearchMode.ENTERPRISE && !isAllOptionIncluded) {
            // add all option at the begining
            this.fieldOptions.unshift({ text: 'All Fields', value: '*' });
        } else if (this.selectedMode === UserSearchMode.DB && isAllOptionIncluded) {
            // remove all option
            this.fieldOptions.shift();
        }
    }

    public changedValue(): void {
        const flag = !this.fieldOptions.some((item) => item.value === '*');
        if (this.selectedMode === UserSearchMode.ENTERPRISE && flag) {
            this.fieldOptions.unshift({ text: 'All Fields', value: '*' });
            this.selectedField = this.fieldOptions[0].value as string;
        } else if (this.selectedMode === UserSearchMode.DB) {
            if (!flag) {
                this.fieldOptions.shift();
                this.selectedField = this.fieldOptions[0].value as string;
            }
        }
    }

    public applySearchSettings(): void {
        const updatedSearchSettingCollection = [];

        if (this.searchSettingCollection[this.modeKeyName].SelectedValue.value !== this.selectedMode) {
            this.searchSettingCollection[this.modeKeyName].SelectedValue.value = this.selectedMode;
            this.searchSettingCollection[this.modeKeyName].SelectedValue.text = this.selectedMode;
            this.customSearchType.isAzSearch = this.selectedMode === UserSearchMode.ENTERPRISE;
            updatedSearchSettingCollection.push(this.searchSettingCollection[this.modeKeyName]);
        }

        if (this.searchSettingCollection[this.fieldKeyName].SelectedValue.value !== this.selectedField) {
            this.searchSettingCollection[this.fieldKeyName].SelectedValue.value = this.selectedField;
            this.searchSettingCollection[this.fieldKeyName].SelectedValue.text = this.selectedField;
            this.customSearchType.selectedType = this.selectedField;
            updatedSearchSettingCollection.push(this.searchSettingCollection[this.fieldKeyName]);
        }

        if (updatedSearchSettingCollection.length) {
            this.subscriptions.add(
                this.searchSetting.savePogSettings(updatedSearchSettingCollection).subscribe(
                    (d) => {
                        if (this.rawFieldOptions[this.selectedField] === 'All Fields') {
                            this.customSearchType.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
                        } else {
                            const searchBy = this.translate.instant(this.rawFieldOptions[this.selectedField]);
                            this.customSearchType.selectedField = `${this.translate.instant('SEARCH_BY')} <${searchBy}>`;
                        }
                        if (this.customSearchType.searchType === SearchTypeName.PLANOGRAM) {
                            this.dialog.close(this.customSearchType);
                        } else {
                            this.onClose();
                        }
                    },
                    (error) => {
                        this.consoleLogService.error(
                            `Error during Save of ${this.customSearchType.searchType} search setting data`,
                        );
                        this.notifyService.error(`Error during Save of ${this.type}`);
                    },
                ),
            );
        } else {
            if (this.customSearchType.searchType === SearchTypeName.PLANOGRAM) {
                this.dialog.close(this.customSearchType);
            } else {
                this.onClose();
            }
        }
    }

    public openTab(cls: string): void {
        document.querySelectorAll('[class^="TAB_ID_"]').forEach((box: any) => {
            box.style.display = 'none';
        });
        document.querySelectorAll('.' + cls).forEach((box: any) => {
            box.style.display = 'block';
        });
        this.isDisplayApplyBtnInSearch = !(cls === 'Project_Filters');
    }

    private genarateItems(hdata: ProductHierarchy[]): HierarchyObject[] {
        const item = [];
        for (let data of hdata) {
            let child;
            child.id = data.Id;
            child.text = data.Name;
            if (typeof data.Children === 'object' && data.Children.length) {
                child.expanded = true;
                child.items = this.genarateItems(data.Children);
            }
            item.push(child);
        }

        return item;
    }

    private _prepareHierarchicalData(): HierarchyObject[] {
        const items = [];
        const hierarchyData = this.planogramStore.projectProductHierarchy.Hierarchy;
        if (hierarchyData.length) {
            for (let data of hierarchyData) {
                const hierarchyObject = {
                    text: data.Name,
                    id: data.Id,
                    expanded: false,
                    items: [],
                };
                if (typeof data.Children === 'object' && data.Children.length) {
                    hierarchyObject.expanded = true;
                    hierarchyObject.items = this.genarateItems(data.Children);
                }
                items.push(hierarchyObject);
            }
            return items;
        } else {
            return;
        }
    }

    public get checkPlanogram(): boolean {
        return this.customSearchType.searchType === SearchTypeName.PLANOGRAM;
    }

    public get checkProductFixture(): boolean {
        return (
            this.customSearchType.searchType === SearchTypeName.PRODUCT ||
            this.customSearchType.searchType === SearchTypeName.FIXTURE
        );
    }

    public onClose(): void {
        if (this.customSearchType.searchType === SearchTypeName.PLANOGRAM) {
            this.dialog.close(this.customSearchType);
        } else {
            this.close.emit(this.customSearchType);
        }
    }

    public getProductHierarchy(): void {
        this.onUpdateProductHierarchy.emit(this._prepareHierarchicalData());
    }
}
