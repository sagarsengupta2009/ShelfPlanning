import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of, Subscription } from 'rxjs';
import { TreeItem } from '@progress/kendo-angular-treeview';
import { HierarchyChildren } from 'src/app/shared/models';
import { Planogram } from 'src/app/shared/models/planogram/planogram';
import { HistoryService, HierarchyService, PlanogramStoreService, NotifyService } from 'src/app/shared/services';
import { ConsoleLogService } from 'src/app/framework.module';

@Component({
    selector: 'app-change-hierarchy',
    templateUrl: './change-hierarchy.component.html',
    styleUrls: ['./change-hierarchy.component.scss'],
})
export class ChangeHierarchyComponent implements OnInit, OnDestroy {
    private subscriptions: Subscription = new Subscription();
    public parsedData: HierarchyChildren[];
    public expandedKeys: number[] = [];
    public minimumHierarchyValue: number;
    public selectedPath: string[] = [];
    public nodeToShiftPreviousPogs: number;
    constructor(
        private readonly hierarchyService: HierarchyService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dialog: MatDialogRef<ChangeHierarchyComponent>,
        @Inject(MAT_DIALOG_DATA) private readonly data: Planogram,
        private readonly notifyService: NotifyService,
        private readonly historyService: HistoryService,
        private readonly log: ConsoleLogService,
    ) {}

    public ngOnInit(): void {
        this.minimumHierarchyValue = this.planogramStore.appSettings.maxPOGHierarchyNodes;
        this.getHierarchyBasedOnCorporationNew();
    }

    public getHierarchyBasedOnCorporationNew(): void {
        this.subscriptions.add(
            this.hierarchyService.hierarchy().subscribe(
                (res) => {
                    this.parsedData = res.Data.hierarchyChildren;
                },
                (err) => {
                    this.log.error('err', err);
                },
            ),
        );
    }

    public fetchChildren = (item: HierarchyChildren) => of(item.Children);
    public hasChildren(item: HierarchyChildren): boolean {
        //Check if the parent node has children.
        return item.Children && item.Children.length > 0;
    }

    public onNodeSelect(event: TreeItem): void {
      if (!event.dataItem.Children.length && event.dataItem.IsChildrenAvailable) {
            this.getImmediateChildren(event);
        }
    }
    public getImmediateChildren(event: TreeItem): void {
        this.nodeToShiftPreviousPogs = event.dataItem.id;
        if (event.dataItem.idParentPogHier == null) {
            event.dataItem.parentNodeName = event.dataItem.name;
        }
        if (event.dataItem.depth < this.minimumHierarchyValue) {
            this.subscriptions.add(
                this.hierarchyService.getImmediateChildren(event.dataItem.id, true).subscribe(
                    (res) => {
                        res.Data.forEach((element: any) => {
                            // TODO: remove any, element type is HierarchyChild. It doesn't have parentNodeName field
                            element.parentNodeName = `${event.dataItem.parentNodeName}#${element.name}`;
                            element.depth = event.dataItem.depth + 1;
                        });
                        event.dataItem.Children = res.Data;
                        const index = this.expandedKeys.indexOf(event.dataItem.id);
                        if (index < 0) {
                            this.expandedKeys = this.expandedKeys.concat(event.dataItem.id);
                        }
                    },
                    (err) => {
                        this.log.error('err', err);
                    },
                ),
            );
        } else {
            if (event.dataItem.depth >= this.minimumHierarchyValue) {
                this.selectedPath = event.dataItem.parentNodeName.split('#');
            }
        }
    }
    public handleExpand(event: TreeItem): void {
        if (!event.dataItem.Children) {
            this.getImmediateChildren(event);
        }
    }

    public handleCollapse(node: TreeItem): void {
        this.expandedKeys.forEach((id, index) => {
            if (id === node.dataItem.id) {
                this.expandedKeys.splice(index, 1);
            }
        });
    }

    private assignHierarchy(itemData: Planogram, selectedPath: string[], idPogHier: number): void {
        for (let i = 0; i < 10; i++) {
            itemData[`L${i + 1}`] = selectedPath[i] ? selectedPath[i] : null;
        }
        itemData.ControllingHier = idPogHier;
    }

    public action(): void {
        const data: { idPog: number; idPogHier: number } = {
            idPog: this.data.IDPOG,
            idPogHier: this.nodeToShiftPreviousPogs,
        };
        if (this.selectedPath.length != this.minimumHierarchyValue) {
            this.notifyService.warn('Select minimum Hierarchy');
        } else {
            let unqHistoryID = this.historyService.startRecording();
            const oldControllingHier = this.data.ControllingHier;
            let oldSelectedPath = [];
            for (let i = 1; i <= 10; i++) {
                oldSelectedPath.push(this.data[`L${i}`]);
            }
            this.assignHierarchy(this.data, this.selectedPath, data.idPogHier);
            const funoriginal = () => {
                return () => {
                    this.assignHierarchy(this.data, this.selectedPath, this.data.ControllingHier);
                };
            };
            const funRevert = () => {
                return () => {
                    this.assignHierarchy(this.data, oldSelectedPath, oldControllingHier);
                };
            };
            this.historyService.captureActionExec({
                funoriginal,
                funRevert,
                funName: 'hierarchyAssignment',
            });
            this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID);
            this.dialog.close();
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }
}
