import {
    Component,
    OnInit,
    Inject,
    Output,
    EventEmitter,
    OnDestroy,
    ViewChild,
    ViewContainerRef,
    ChangeDetectorRef,
} from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ConsoleLogService } from 'src/app/framework.module';
import {
    AppSettings, FieldSearchVM, SavedSearch
} from 'src/app/shared/models/';
import {
    SharedService, LocalSearchService, NotifyService,
    UserService, AppSettingsService
} from 'src/app/shared/services/';
import { MatCheckboxChange } from '@angular/material/checkbox';
import { Position } from 'src/app/shared/classes';

@Component({
    selector: 'app-advance-search',
    templateUrl: './advance-search.component.html',
    styleUrls: ['./advance-search.component.scss'],
})
export class AdvanceSearchComponent implements OnInit, OnDestroy {
    @Output() emitAction = new EventEmitter();
    @Output() emitExpression = new EventEmitter();
    @ViewChild('outlet', { read: ViewContainerRef }) outletRef: ViewContainerRef;

    private subscriptions = new Subscription();
    public value = 0;
    public showQContent = false;
    public listEmpty = false;
    public options;

    // moved from local-search-service to component
    public selectAll: boolean = false;

    constructor(
        private readonly changeDetector: ChangeDetectorRef,
        public readonly localSearch: LocalSearchService,
        private readonly translate: TranslateService,
        private readonly dialog: MatDialogRef<AdvanceSearchComponent>,
        private readonly notifyService: NotifyService,
        private readonly sharedService: SharedService,
        private readonly user: UserService,
        private readonly appSettingsService: AppSettingsService,
        private readonly log: ConsoleLogService,
        @Inject(MAT_DIALOG_DATA) public readonly data: string,
    ) { }

    ngOnInit(): void {
        if (!this.localSearch.savedNames.length) {
            this.subscriptions.add(
                this.appSettingsService.getAppSettingsByName<SavedSearch[]>('NAMED_FIND', 'POG')
                    .subscribe((data: SavedSearch[]) => {
                        if (!data) { data = []; }
                        data.filter(it => !!it.name); // exclude entries without name
                        this.localSearch.savedSearchOptions = data;
                        this.localSearch.savedNames = data.map(it => it); // create a copy
                    }));
        }
        if (!this.localSearch.searchFieldsFrmDb) {
            this.localSearch.initFields();
        }
        this.localSearch.selectedSearchFields = <FieldSearchVM>{};
        this.CheckboxSelection();
        this.subscriptions.add(this.sharedService.deleteSubscription.subscribe((res: Position[]) => {
            if (res) {
                this.localSearch.initFields();
            }
        }));
        this.localSearch.showExpressionContent();
        this.subscriptions.add(
            this.localSearch.isNumField.subscribe((res: boolean) => {
                this.value = this.localSearch.min;
                this.options = {
                    floor: this.localSearch.min,
                    ceil: this.localSearch.max,
                    showTicks: true,
                };
                this.showQContent = res;
            }));

        this.subscriptions.add(
            this.localSearch.itemlistEmpty.subscribe((res: boolean) => {
                this.listEmpty = res;
            }));
        this.value = 0;
        this.options = {
            floor: 0,
            ceil: 100,
            showTicks: true,
        };
    }

    private CheckboxSelection() {
        this.localSearch.selectedSearchFields.FieldSearch = [];
        if (this.localSearch.searchFieldsFrmDb) {
            this.localSearch.searchFieldsFrmDb.FieldSearch.forEach((item) => {
                if (item.selected) {
                    this.localSearch.selectedSearchFields.FieldSearch.push(item);
                }
            });
            this.selectAll = this.localSearch.searchFieldsFrmDb.FieldSearch.length
                == this.localSearch.selectedSearchFields.FieldSearch.length;
        }
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    public searchExpression(): void {
        this.emitExpression.emit(this.localSearch.expressionTooltip);
        if(this.localSearch.expressionTooltip != '') {
           this.closeDialog();
        }
    }

    public setSearchFilter(event: boolean, value: string): void {
        if (value == 'All') {
            for (let d of this.localSearch.searchFieldsFrmDb.FieldSearch) {
                d.selected = event;
            }
            if (event) {
                this.localSearch.searchAllfields = this.localSearch.searchFieldsFrmDb;
                this.localSearch.selectedSearchFields = <FieldSearchVM>{};
            } else {
                this.localSearch.searchAllfields = <FieldSearchVM>{};
            }
            this.localSearch.placeHolderValue = 'Find and Select';
        } else {
            this.localSearch.searchAllfields = <FieldSearchVM>{};
            this.CheckboxSelection();
            if (this.localSearch.selectedSearchFields.FieldSearch.length == 1) {
                this.localSearch.placeHolderValue =
                    'Find and Select on <' + this.localSearch.selectedSearchFields.FieldSearch[0].value + '>';
            } else if (this.localSearch.selectedSearchFields.FieldSearch.length > 1) {
                this.localSearch.placeHolderValue = 'Find and Select on Selected Fields';
            }
        }
    }

    public setActions(event: MatCheckboxChange, actionId: string): void {
        if (event) {
            this.localSearch.actionsObj = this.localSearch.searchFieldsFrmDb.Actions.find(
                (ele) => ele.ACTIONID == actionId,
            );
            this.localSearch.searchAction = this.translate.instant(this.localSearch.actionsObj.Name);
            this.localSearch.actionFlag = true;
            this.localSearch.expressionFlag = false;
            this.localSearch.doLocalSearch();
        } else {
            this.sharedService.duplicateProducts = [];
            this.sharedService.selectedDuplicateProducts.next(this.sharedService.duplicateProducts);
        }
        this.emitAction.emit(this.localSearch.searchAction);
    }

    public selectedOption(): void {
        this.localSearch.expressiontable = false;
        this.localSearch.itemsearch = '';
        this.changeDetector.detectChanges();
        this.localSearch.showTable();
    }

    public saveQueryExpression(): void {
        this.saveNewSearch();
        this.notifyService.success('SEARCH_SAVED');
    }

    public rangeChange(min: number, max: number, compValue: string): void {
        if (min == undefined && max == undefined) {
            return;
        }
        let first: any = '';
        if (this.localSearch.compValue == this.localSearch.numbericComparisons.BETWEEN) {
            first = this.localSearch.min;
        }
        if (first > this.localSearch.max) {
            first = '';
        }
        let value = first + ' ' + compValue + ' ' + this.localSearch.max;
        this.localSearch.addQueryContent(value, this.localSearch.selectedType);
    }

    rangeChangeSlider(event): void {
        this.changeDetector.detectChanges();
        if (event[0] > event[1]) {
            event[0] = event[1];
        }
        this.localSearch.minValue = event[0];
        this.localSearch.maxValue = event[1];
        this.localSearch.min = event[0];
        this.localSearch.max = event[1];
    }

    public onOpen(): void {
        this.handleFilter(this.localSearch.filter);
    }

    public onClose(): void {
        this.localSearch.savedSearchOptions = [...this.localSearch.savedNames];
    }
    public applyExpressionFilters() {
        this.localSearch.applyExpressionFilters();
    }
    public clearFilter() {
        this.localSearch.clearFilter();
    }

    public isSaveDisabled(): boolean {
        const exprSearch = this.localSearch.expressionsearch;

        // New template name not entered
        if (!exprSearch) { return true; }

        // Is new search template name a duplicate?
        return this.localSearch.savedSearchOptions.some((ele) => ele.name == exprSearch);
    }

    public isDeleteDisabled(): boolean {
        return !this.localSearch.selectedOp;
    }

    public deleteCurrentSearch(): void {
        const index = this.localSearch.savedNames.findIndex((x) => x.name == this.localSearch.selectedOp);
        if (index != -1) {
            this.localSearch.savedNames.splice(index, 1);
            this.localSearch.selectedOp = '';
            this.clearFilter();

            this.subscriptions.add(
                this.saveTemplateAsAppSettings()
                    .subscribe((result: boolean) => {
                        this.localSearch.expressionsearch = '';
                        this.notifyService.success('SEARCH_DELETED');
                     }));
        }
    }

    public disableAddOption(): boolean {
        const arrayContent = this.localSearch.queryContent.filter((i) => Array.isArray(i));
        if (arrayContent.length > 0 && arrayContent[arrayContent.length - 1].length > 0) {
            return false;
        }
        return true;
    }
    public QueryBlock(): void {
        this.localSearch.QueryBlock();
    }
    public removeQueryBlock(index: number): void {
        this.localSearch.removeQueryBlock(index);
    }
    public removeQueryContent(blockId: number, position: number, subposition: number): void {
        this.localSearch.queryContent[blockId][position].val.splice(subposition, 1);

        if (this.localSearch.queryContent[blockId][position].val.length == 0) {
            this.localSearch.queryContent[blockId].splice(position, 1);
        }
    }
    public selectQueryBlock(divId: number): void {
        this.localSearch.selectQueryBlock(divId);
    }
    public handleFilter(value: string): void {
        if (!value) {
            this.localSearch.savedSearchOptions = this.localSearch.savedNames;
            return;
        }
        this.localSearch.savedSearchOptions = this.localSearch.savedNames.filter((item) =>
            item.name.toLowerCase().includes(value.toLowerCase()),
        );
    }
    public onSelect(name: string): void {
        this.localSearch.onSelect(name);
    }
    public selectedCompValue(): void {
        this.localSearch.selectedCompValue();
    }
    public addQueryContent(val: string, attr: string) {
        this.localSearch.addQueryContent(val, attr);
    }

    private saveTemplateAsAppSettings(): Observable<boolean> {
        const newTemplateData: AppSettings = {
            AppSettings: {
                KeyGroup: 'POG',
                User: this.user.emailId,
                Values: [
                    {
                        KeyName: 'NAMED_FIND',
                        KeyType: 'string',
                        KeyValue: JSON.stringify(this.localSearch.savedNames),
                    }
                ]
            }
        };
        return this.appSettingsService.saveSettings(newTemplateData);
    }

    private saveNewSearch(): void {
        if (this.localSearch.expressionsearch.length > 0) {
            this.makeSavedSearch(this.localSearch.expressionsearch);
            this.localSearch.selectedOp = this.localSearch.savedSearchOptions[0].name;
        }
    }

    private makeSavedSearch(name: string): void {
        const currentSearchObj = {
            queryContent: this.localSearch.queryContent,
            andOrSelect: this.localSearch.selectedAndOR,
            noOfBlock: this.localSearch.noOfBlock,
            searchFieldsFrmDb: this.localSearch.searchFieldsFrmDb,
        };
        const search = JSON.stringify(currentSearchObj);
        const savedSearch: SavedSearch = { name, search };

        if (!this.localSearch.savedSearchOptions) {
            this.localSearch.savedSearchOptions = []; // initialize array, if not done already.
        }

        // insert at index 0
        this.localSearch.savedSearchOptions.unshift(savedSearch);
        this.localSearch.savedNames.unshift(savedSearch);

        this.subscriptions.add(
            this.saveTemplateAsAppSettings()
                .subscribe((result: boolean) => {
                    if (result) {
                        this.log.info('Highlight template saved');
                    }
                }));
    }

    public trackByValue(index: number): number {
        return index;
    }
    
    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
