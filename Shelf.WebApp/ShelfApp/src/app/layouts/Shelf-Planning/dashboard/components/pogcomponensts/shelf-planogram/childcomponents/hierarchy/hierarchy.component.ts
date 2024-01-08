import { Component, OnInit, Output, EventEmitter, Input, OnDestroy, ViewChild, SimpleChanges, OnChanges } from '@angular/core';
import { of, Subscription } from 'rxjs';
import { IntlService } from '@progress/kendo-angular-intl';
import { State, process, CompositeFilterDescriptor } from '@progress/kendo-data-query';
import { SelectableSettings, GridComponent } from '@progress/kendo-angular-grid';
import { TranslateService } from '@ngx-translate/core';
import { ExcelExportData } from '@progress/kendo-angular-excel-export';
import {
    HierarchyService,
    CategoriesService,
    AgGridHelperService,
    SharedService,
    ConfigService,
    DictConfigService,
} from 'src/app/shared/services';
import { HierarchyChildren, HierarchyGridData, LookUpOptions, POGLibraryListItem } from 'src/app/shared/models';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { IGetRowsParams, RowNode } from 'ag-grid-enterprise';
import { AgGridComponent, CellRendererComponent } from 'src/app/shared/components/ag-grid';
import { PlanogramStoreService } from 'src/app/shared/services/common/planogram-store.service';
import { HierarchyPlanogram } from 'src/app/shared/models/hierarchy-models';

@Component({
    selector: 'app-hierarchy',
    templateUrl: './hierarchy.component.html',
    styleUrls: ['./hierarchy.component.scss'],
})
export class HierarchyComponent implements OnInit, OnChanges, OnDestroy {
    private subscriptions: Subscription = new Subscription();
    @ViewChild('agPogGrid') agPogGrid: AgGridComponent;
    public pogGridConfig: GridConfig;
    @Input() planogramList: POGLibraryListItem[];
    @Output() selectedHierarchyRows: EventEmitter<any> = new EventEmitter();
    @Output() AddpogFromHierarchy: EventEmitter<any> = new EventEmitter();
    public allOptionSelected: boolean = false;
    public presentPlanogramList: number[] = [];
    public showGrid = false;
    public id: number;
    public filter: CompositeFilterDescriptor;
    public text = '';
    public treeList: HierarchyChildren[] = [];
    public parsedData: HierarchyChildren[] = [];
    public expandedKeys = [];
    private gridList: HierarchyGridData;
    public selectedRows: HierarchyPlanogram[] = [];
    public serverSidepaging = true;
    public state: State = {
        take: 50,
        skip: 0,
        filter: {
            logic: 'and',
            filters: [],
        },
        group: [],
        sort: [],
    };
    public skeletonDateFormat: string;
    private isPogGridReload: boolean = false;

    constructor(
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly hierarchyService: HierarchyService,
        public readonly intl: IntlService,
        private readonly config: ConfigService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly categoriesService: CategoriesService,
        private readonly dictService: DictConfigService,
        private readonly planogramStoreService: PlanogramStoreService
    ) {
      this.allData = this.allData.bind(this);
      this.skeletonDateFormat = 'dd MMM yyyy';
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes && changes['planogramList']) {
            this.planogramList.forEach(p => {
                if (!this.presentPlanogramList.some(idpog => idpog == p.IDPOG)) {
                    this.presentPlanogramList.push(p.IDPOG);
                    if (this.agPogGrid) {
                        let selectedNode: RowNode = this.agPogGrid.gridApi.getSelectedNodes()?.find(n => n.data?.IDPOG === p.IDPOG);
                        if (selectedNode && !selectedNode.data?.PogAddedToLibrary) {
                            let data: HierarchyPlanogram = selectedNode.data;
                            data.PogAddedToLibrary = true;
                            selectedNode.setData(data);
                            selectedNode.setSelected(false);
                        }
                    }
                }
            });
        }
    }

    public hasChildren(item: any): boolean {
        return item.IsChildrenAvailable || (item.Children && item.Children.length > 0);
    }

    public fetchChildren(item: any) {
        return of(item.Children);
    }

    public handleCollapse(node): void {
        for (let i in this.expandedKeys)
            if (this.expandedKeys[i] == node.dataItem.id) {
                this.expandedKeys.splice(Number(i), 1);
            }
    }

    public handleExpand(event): void {
        if (event.dataItem.Children.length == 0) {
            this.gethierarchyChildren(event);
        }
    }

    public onkeyup(value): void {
        if (value == '') {
            this.expandedKeys = [];
            this.parsedData = this.treeList;
        }
    }

    public getSearhitem(value: string): void {
        this.parsedData = this.search(this.treeList, value);
    }

    public search(items: any[], term: string): any[] {
        return items.reduce((acc, item) => {
            if (this.contains(item.name, term)) {
                let index = this.expandedKeys.indexOf(item.id);
                if (index < 0) {
                    if (item.Children && item.Children.length > 0)
                        this.expandedKeys = this.expandedKeys.concat(item.id);
                }
                acc.push(item);
            } else if (item.Children && item.Children.length > 0) {
                const newItems = this.search(item.Children, term);
                let index = this.expandedKeys.indexOf(item.id);
                if (index < 0) {
                    if (item.Children && item.Children.length > 0)
                        this.expandedKeys = this.expandedKeys.concat(item.id);
                }
                if (newItems.length > 0) {
                    acc.push({ name: item['name'], id: item['id'], Children: newItems });
                }
            }

            return acc;
        }, []);
    }

    public contains(text: string, term: string): boolean {
        return text && text.toLowerCase().indexOf(term.toLowerCase()) >= 0;
    }

    private gethierarchyChildren(event): void {
        let obs3 = this.hierarchyService.gethierarchyChildren(event.dataItem.id, true).subscribe((res: any) => {
            event.dataItem.Children = res.Data;
            //}
            let index = this.expandedKeys.indexOf(event.dataItem.id);
            if (index < 0) {
                this.expandedKeys = this.expandedKeys.concat(event.dataItem.id);
            }
            let hierarchyData = this.parsedData;
            this.parsedData = hierarchyData.slice(0);
        });
        this.subscriptions.add(obs3);
    }

    private getHierarchy(): void {
        let obs1 = this.hierarchyService.hierarchy().subscribe((res: any) => {
            for (let d of this.planogramList) {
                this.presentPlanogramList.push(d.IDPOG);
            }
            // this.bindhierarchyGrid([], 0)
            this.treeList = res.Data.hierarchyChildren;
            this.parsedData = res.Data.hierarchyChildren;
        });
        this.subscriptions.add(obs1);
    }

    public onSelectedKeysChange(evt): void {
        this.allOptionSelected = this.gridList.total == this.selectedRows.length;
        this.selectedHierarchyRows.emit(this.selectedRows);
    }

    public onNodeSelect(event): void {
        this.selectedRows = [];
        this.allOptionSelected = false;
        this.state.filter.filters = [];
        this.state.skip = 0;
        this.id = event.dataItem.id;
        this.showGrid = true;
        if (event.dataItem.Children.length == 0 && event.dataItem.IsChildrenAvailable) {
            this.gethierarchyChildren(event);
        }
        let obj: any = {
            PogHierID: this.id,
            IsRecursive: true,
            PageSize: 40,
            Skip: 0,
        };
        this.bindGridData();
    }


    public allData(): ExcelExportData {
        let list = this.gridList.data.map((a) => Object.assign({}, a));
        for (let o of list) {
            o.POGLastModifiedDate = this.intl.formatDate(this.intl.parseDate(o.POGLastModifiedDate), this.skeletonDateFormat);
            o.EffectiveFrom = this.intl.formatDate(this.intl.parseDate(o.EffectiveFrom), this.skeletonDateFormat);
            o.Version_template = o.Version_template.replace(/<[^>]*>/g, '');
        }
        const result: ExcelExportData = {
            data: process(list, { group: this.state.group }).data,
            group: this.state.group,
        };
        return result;
    }

    public exportAsExcel(): void {
        this.agPogGrid.exportToExcel();
    }

    public selectionChangeHandler(): void {
        const selectedRows = this.agPogGrid?.gridApi?.getSelectedRows();
        if (selectedRows.length || !this.isPogGridReload) {
            this.selectedRows = [...selectedRows];
        }
        this.selectedRows = this.selectedRows.filter((it) => !this.presentPlanogramList.includes(it.id));
        this.selectedHierarchyRows.emit(this.selectedRows);
        if (this.selectedRows.length > 0 && selectedRows.length === 0) {
            /* 
               Need to change type of selectedRows from HierarchyPlanogram[] to RowNode[]. 
               But as RowNode do not have IDPOG and also can not change it. So need to make it as any[]
            */
            this.agPogGrid?.setSelectedRows(this.selectedRows as any[], 'IDPOG');
        }
        this.isPogGridReload = false;
    }

    ngOnInit(): void {
        this.getHierarchy();
        this.sharedService.setSerachView('ph');
    }

    public ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }


    public Add($event): void {
        this.AddpogFromHierarchy.emit($event.data);
    }

    private bindGridData(): void {
        let customFilter = [];
        const columns = this.config.getGridColumns('pogHierarchy-details');
        columns.forEach(col => {
            switch (col[1]) {
                case 'EffectiveFrom':
                case 'POGLastModifiedDate':
                case 'EffectiveTo':
                    customFilter.push({
                        field: col[1], filterDetails: {
                            filter: 'agDateColumnFilter',
                            filterParams: {
                                debounceMs: 2000,
                                suppressAndOrCondition: true,
                                browserDatePicker: true,
                                comparator: (filterDate: Date, cellValue: string) => {
                                    if (cellValue == null) return -1;
                                    return new Date(cellValue).getTime() - filterDate.getTime();
                                },
                                buttons: ['reset', 'apply']
                            },

                        }
                    });
                    break;
                case 'Version':
                    const lookupData = this.planogramStoreService.lookUpHolder[this.dictService.findById(col[18])?.LkUpGroupName]
                    customFilter.push({
                        field: col[1], filterDetails: {
                            filter: 'agSetColumnFilter',
                            filterParams: {
                                comparator: (a: string, b: string) => {
                                    return a < b ? -1 : a > b ? 1 : 0;
                                },
                                values: [...lookupData?.options?.map(x => x?.text)],
                                filterTemplate: `(dataItem == 'Experimental' || dataItem == 'Draft' || dataItem == 'Actionable') ? '<div style=\"background-color:#438F0E;color:white;text-align: center\">'+dataItem+'</div>' : (dataItem == 'Retired') ? '<div style=\"background-color:#FF4600;color:white;text-align: center\">'+dataItem+'</div>' : (dataItem == 'Live') ? '<div style=\"background-color:#0E1F8F;color:white;text-align: center\">'+dataItem+'</div>' : (dataItem == 'Pending') ? '<div style=\"background-color:#FFFB0A;color:black;text-align: center\">'+dataItem+'</div>' : dataItem`,
                                cellRenderer: CellRendererComponent
                            }
                        }
                    })
                    break;
                case 'IDPOG':
                case 'NoOfStores':
                    customFilter.push({
                        field: col[1], filterDetails: {
                            filter: 'agNumberColumnFilter',
                            filterParams: {
                                debounceMs: 2000,
                                filterOptions: ['equals'],
                                suppressAndOrCondition: true
                            }
                        }
                    });
                    break;
                default:
                    customFilter.push({
                        field: col[1], filterDetails: {
                            filter: 'agTextColumnFilter',
                            filterParams: {
                                debounceMs: 2000,
                                filterOptions: ['contains'],
                                suppressAndOrCondition: true,
                            }
                        }
                    });
                    break;
            }
        });
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            columnFilters: customFilter,
            isServerSideGrid: true
        }
        let columnDefs = this.agGridHelperService.getAgGridColumns('pogHierarchy-details', gridColumnCustomConfig);
        
        //TODO: @Priyanka Kumar - Move sortable configuration to sp_settings
        let actionColumnIndex = columnDefs.findIndex(c => c.field === 'Action');
        columnDefs[actionColumnIndex].sortable = false;

        this.pogGridConfig = {
            ...this.pogGridConfig,
            id: 'pogHierarchy-details',
            columnDefs: columnDefs,
            data: [],
            type: 'serverside',
            hideColumnConfig: false,
            firstCheckBoxColumn: { show: true, template: 'dataItem.PogAddedToLibrary' },
            height: '100%',
            actionFields: ['Action'],
            hideGroupHeader: true,
            rowSelection: 'multiple',
            rowHeight: 45
        }
    }

    public serverSideGridEmit($event: IGetRowsParams): void {
        this.subscriptions.add(
            this.categoriesService.getPlanogramDetailsByHierarchy($event, this.id)
                .subscribe((res: HierarchyGridData) => {
                    if (res) {
                        let data = res.data.map(d => {
                            d.PogAddedToLibrary = this.presentPlanogramList.some(idpog => idpog === d.IDPOG);
                            return d;
                        })
                        this.isPogGridReload = true;
                        $event.successCallback(data, res.total);
                    }
                }, (error) => {
                    $event.failCallback();
                }));
    }
}
