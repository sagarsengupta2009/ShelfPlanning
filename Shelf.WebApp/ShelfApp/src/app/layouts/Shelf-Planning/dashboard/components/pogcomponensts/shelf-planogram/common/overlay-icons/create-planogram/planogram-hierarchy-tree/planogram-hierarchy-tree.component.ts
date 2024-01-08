import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, of } from 'rxjs';
import { NodeClickEvent } from '@progress/kendo-angular-treeview';

import { SaDashboardService, CreatePlanogramService, PlanogramStoreService } from 'src/app/shared/services';
import { ConsoleLogService } from 'src/app/framework.module';
import { Corporation, HierarchyChildren, PogType } from 'src/app/shared/models';

@Component({
    selector: 'sp-planogram-hierarchy-tree',
    templateUrl: './planogram-hierarchy-tree.component.html',
    styleUrls: ['./planogram-hierarchy-tree.component.scss'],
})
export class PlanogramHierarchyTreeComponent implements OnInit {
    @Output() selectPlanogramHieraId = new EventEmitter();

    public modelCorpIdSelected: number;
    public planogramHierarchyId: number;
    public parsedData: HierarchyChildren[];
    public expandedKeys: number[] = [];
    public pogTypeSelect: number;
    public treeList: HierarchyChildren[];
    public corpList: Corporation;
    public pogType: PogType[] = [];

    private creatingDynamicHierarchy: boolean = false;
    private minimumHierarchy: number;

    constructor(
        private readonly createPlanogramService: CreatePlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dashboardService: SaDashboardService,
        private readonly log: ConsoleLogService
    ) { }

    ngOnInit(): void {
        this.pogTypeSelect = this.planogramStore.appSettings.default_pog_type;
        const hierarchy = this.planogramStore.hierarchy;
        this.minimumHierarchy = hierarchy.minimumHierarchy;
        this.parsedData = hierarchy.hierarchyChildren;
        this.treeList = hierarchy.hierarchyChildren;
        this.getCorpList();
        this.getPogType();
    }

    public BindSearchEvent(searchKey: string): void {
        this.parsedData = this.search(this.treeList, searchKey);
    }

    private getCorpList(): void {
        this.dashboardService.getCorpList().subscribe((response) => {
            if (response) {
                this.corpList = response.Data;
                this.modelCorpIdSelected = this.corpList[0].IDCorp;
            }
        });
    };

    private getPogType(): void {
        const lookUpData = this.planogramStore.lookUpHolder as any; // pushing value into pog type, thats why needed any here
        lookUpData.POGType.options.forEach((item) => {
            if (item.value > -1) {
                this.pogType.push(item);
            }
        });
        const obj = this.pogType.find((item) => item.value === this.pogTypeSelect);
        if (!obj) {
            this.pogTypeSelect = 0;
        }
    };

    public fetchChildren = (item: HierarchyChildren) => of(item.Children);

    public hasChildren(item: HierarchyChildren): boolean {
        //Check if the parent node has children.
        return item.Children && item.Children.length > 0;
    }

    private gethierarchyChildren(event: KendoTreeViewEvent): void {
        if (!this.hasChildren(event.dataItem) && !this.creatingDynamicHierarchy) {
            this.creatingDynamicHierarchy = true;
            if (event.dataItem.id) {
                this.createPlanogramService
                    .getHierarchyBasedOnCorp(event.dataItem.id, true)
                    .subscribe(
                        (res: any) => {
                            res.Data.forEach((element) => {
                                element.depth = event.dataItem.depth + 1;
                            });
                            if (event.dataItem.Children.length == 0) {
                                event.dataItem.Children = res.Data;
                            }
                            let index = this.expandedKeys.indexOf(event.dataItem.id);
                            if (index < 0) {
                                this.expandedKeys = this.expandedKeys.concat(event.dataItem.id);
                            }
                            this.creatingDynamicHierarchy = false;
                        },
                        () => {
                            this.log.error('error retriving immediate child');
                        },
                    );
            }
        }
    };

    public onNodeSelect(event: KendoTreeViewEvent): void {
        if (event.dataItem.Children.length == 0) {
            this.gethierarchyChildren(event);
        }
        if (event.dataItem.depth >= this.minimumHierarchy) {
            this.planogramHierarchyId = event.dataItem.id;
        }
    };
    public handleExpand(event: KendoTreeViewEvent): void {
        if (event.dataItem.Children.length == 0) {
            this.gethierarchyChildren(event);
        }
    };

    public handleCollapse(node: KendoTreeViewEvent): void {
        this.expandedKeys.forEach((element, index) => {
            if (element == node.dataItem.id) {
                this.expandedKeys.splice(index, 1);
            }
        });
    };

    public search(items: HierarchyChildren[], term: string): HierarchyChildren[] {
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
                const index = this.expandedKeys.indexOf(item.id);
                if (index < 0) {
                    if (item.Children && item.Children.length > 0)
                        this.expandedKeys = this.expandedKeys.concat(item.id);
                }
                if (newItems.length > 0) {
                    acc.push({ name: item.name, id: item.id, Children: newItems });
                }
            }

            return acc;
        }, []);
    };

    public contains(text: string, term: string): boolean {
        return text && text.toLowerCase().indexOf(term.toLowerCase()) >= 0;
    };

    public onkeyup(): void {
        this.expandedKeys = [];
        this.parsedData = this.treeList;
    };

    public valueChange(event: number): void {
        this.pogTypeSelect = event;
    };

    public trackByType(index: number): number {
        return index;
    }
    public trackByCorp(index: number): number {
        return index;
    }
}

export interface KendoTreeViewEvent {
    dataItem: HierarchyChildren;
    index: string;
}
