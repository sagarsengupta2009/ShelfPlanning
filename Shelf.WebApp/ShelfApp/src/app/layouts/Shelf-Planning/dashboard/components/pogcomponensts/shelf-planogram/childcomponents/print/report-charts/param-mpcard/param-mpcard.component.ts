import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AzureSearchPogs, POGLibraryListItem, SearchTypeName } from 'src/app/shared/models';
import { PlanogramSearchData } from 'src/app/shared/models/print';
import {
    PlanogramLibraryService, ReportandchartsService, PlanogramStoreService,
    PlanogramLibraryApiService, SearchSettingService
} from 'src/app/shared/services';
import { StoreCardComponent } from '../store-card/store-card.component';

@Component({
    selector: 'sp-param-mpcard',
    templateUrl: './param-mpcard.component.html',
    styleUrls: ['./param-mpcard.component.scss'],
})
export class ParamMPCardComponent implements OnInit, OnDestroy {
    public comparisionTypeList = [];
    public selComType: number;
    public reportsComparewithArray: POGLibraryListItem[] = [];
    public selScenario: number;
    private planogram = {
        id: 'planogram',
        searchType: 'Planogram',
        selectedField: '',
        isAzSearch: true,
        selectedType: '*',
    };
    public keyword = 'displayName';
    public data: PlanogramSearchData[] = [];
    private searchText: string;
    private lastSearchText: string;
    public selectedPlanogram: number;
    private subscriptions: Subscription = new Subscription();
    @ViewChild(`StoreCardComponent`) storeCardComponent: StoreCardComponent;

    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly planogramLibService: PlanogramLibraryService,
        private readonly reportchartsService: ReportandchartsService,
        private readonly planogramLibraryApiService: PlanogramLibraryApiService,
        private readonly searchSetting: SearchSettingService,
    ) { }

    public ngOnInit(): void {
        this.getSearchData();
        this.comparisionTypeList = [
            { Id: 1, Text: this.translate.instant('PLANOGRAM_SCENARIO') },
            { Id: 2, Text: this.translate.instant('PREVIOUS_VERSION') },
            { Id: 3, Text: this.translate.instant('ANY_PLANOGRAM') },
        ];
        let data = this.reportchartsService.currentPlanogramData;
        this.reportsComparewithArray = this.planogramStore.mappers;
        this.reportsComparewithArray = this.reportsComparewithArray.filter((item) => item.IDPOG != data.IDPOG);
    }

    public ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    public searchCleared() {
        this.searchText = '';
        this.lastSearchText = '';
        this.data = [];
        this.selectedPlanogram = undefined;
    }

    public customFilter(): PlanogramSearchData[] {
        return this.data;
    }

    public selectEvent(event: PlanogramSearchData): void {
        this.selectedPlanogram = event.IDPOG;
    }

    public getServerResponse(event: string): void {
        this.searchText = event;
        if (this.lastSearchText == this.searchText) {
            return;
        }
        if (event) {
            this.lastSearchText = this.searchText;
            this.triggerAzureSearch(event);
        }
    }

    private triggerAzureSearch(val): void {
        if (val) {
            const postObj: AzureSearchPogs = {
                searchText: val,
                searchableColumn: this.planogram.selectedType,
                isAzSearch: this.planogram.isAzSearch,
            };
            this.subscriptions.add(
                this.planogramLibraryApiService
                    .fetchPLIBAzureResult(postObj)
                    .subscribe((response) => {
                        this.data = [];
                        for (let d of response.Data) {
                            d.displayName = `${d.Name}-${d.IDPOG}`;
                        }
                        this.data = response.Data;
                    }),
            );
        }
    }

    private getSearchData(): void {
        const keys = this.searchSetting.getSearchSettingsNames(SearchTypeName.PLANOGRAM);
        const mode = this.searchSetting.getSearchSetting<'Enterprise' | 'DB'>(keys.ModeKey);
        const field = this.searchSetting.getSearchSetting<string>(keys.FieldKey);

        this.planogram.isAzSearch = mode == 'Enterprise';
        this.planogram.selectedType = field;

        if (field == '*') {
            this.planogram.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
        } else {
            const fieldDesc = this.translate.instant(this.searchSetting.getFieldDescription(SearchTypeName.PLANOGRAM, field));
            this.planogram.selectedField = `${this.translate.instant('SEARCH_BY')} <${fieldDesc}>`;
        }
    }
}
