import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AlertDialogComponent } from 'src/app/shared/components/dialogues/alert-dialog/alert-dialog.component';
import { Menu, POGLibraryListItem } from 'src/app/shared/models';
import {
    NotifyService, _,
    PlanogramLibraryService,
    PlanogramService,
    PlanogramStoreService,
    ReportandchartsService,
    AgGridHelperService,
    ConfigService,
} from 'src/app/shared/services';

@Component({
    selector: 'app-append-section',
    templateUrl: './append-section.component.html',
    styleUrls: ['./append-section.component.scss'],
})
export class AppendSectionComponent implements OnInit, OnDestroy {
    @ViewChild('appendSectionGrid') appendSectionGrid: AgGridComponent;
    public planogramList: POGLibraryListItem[] = [];
    public selectedPlanogram: number;
    public addSectionView: boolean = false;
    public currentAppendPog: POGLibraryListItem[] = [];
    public reportgridConfig: GridConfig;
    public openappendSectionNameDialog: boolean = false;
    public appendPogName: string = '';
    private sucessMesg: string = '';
    private subscriptions: Subscription = new Subscription();
    private unsavedArry: number[] = [];
    private cachePogId: number[] = [];
    private newArray: number[] = [];
    private blockAppend: boolean = false;
    private selectedItems: number[] = [];
    private isDeletedRow: boolean = false;  // TODO @Amit Need to Remove :  Added as grid is not rebinding 
    constructor(
        private readonly alertdialog: MatDialog,
        private readonly reportService: ReportandchartsService,
        private readonly pogLibraryService: PlanogramLibraryService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly dialog: MatDialogRef<AppendSectionComponent>,
        private readonly config: ConfigService
    ) { }

    public ngOnInit(): void {
        this.initPogList();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public onSelectionChange(): void {
        if (this.unsavedArry.indexOf(this.selectedPlanogram) !== -1) {
            this.addSectionView = true;
            this.notifyService.warn(
                `We found that POG# ${this.selectedPlanogram} is not yet Saved. Unless you Save it will not be possible to continue with Append operation`,
            );
        } else if (this.currentAppendPog.length >= this.getMaxAllowPogCount()) {
            this.addSectionView = true;
            this.notifyService.warn(
                `${this.translate.instant(
                    'AT_A_TIME_CAN_APPEND_ONLY',
                )} ${this.getMaxAllowPogCount()} ${this.translate.instant('SECTIONS')}`,
            );
        } else {
            this.addSectionView = false;
        }
    }

    private getMaxAllowPogCount(): number {
        if (this.planogramStore.appSettings.allSettingsObj != undefined) {
            const setting = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data
                .find(it => it.KeyName === 'APPEND_SECTION_POG_LIMIT');
            return setting?.KeyValue as number;
        } else {
            return 10;
        }
    }

    private hasDuplicates(array: number[]): boolean {
        let valuesSoFar = [];
        for (let id of array) {
            if (valuesSoFar.indexOf(id) !== -1) {
                return true;
            }
            valuesSoFar.push(id);
            this.newArray = valuesSoFar;
        }
        return false;
    }

    public addPogTogrid(): void {
        let pogObj = this.planogramList.find((item) => item.IDPOG == this.selectedPlanogram);
        if (pogObj) {
            this.cachePogId.push(pogObj.IDPOG);
            //duplicate check
            if (!this.hasDuplicates(this.cachePogId)) {
                this.currentAppendPog.push(pogObj);
            } else {
                this.cachePogId = this.newArray;
                this.notifyService.warn('APPEND_SELECT_POG');
            }
            if (this.currentAppendPog.length >= this.getMaxAllowPogCount()) {
                this.addSectionView = true;
                this.notifyService.warn(
                    `${this.translate.instant(
                        'AT_A_TIME_CAN_APPEND_ONLY',
                    )} ${this.getMaxAllowPogCount()} ${this.translate.instant('SECTIONS')}`,
                );
            } else {
                this.addSectionView = false;
            }
            if(this.currentAppendPog.length > 1 || this.isDeletedRow){
                this.appendSectionGrid?.gridApi?.setRowData(this.currentAppendPog);
            }else{
                this.initiateAppendSectionGrid();
                this.appendSectionGrid?.gridApi?.redrawRows();
            }
        }
    }

    private initiateAppendSectionGrid(): void {
        this.bindgriddata(this.currentAppendPog);
    }

    private bindgriddata(data: POGLibraryListItem[]): void {
        let gridContextMenus: Menu[] = this.config.getGridMenus('appendSection_grid');
        this.reportgridConfig = {
                id: 'appendSection_grid',
                columnDefs: this.agGridHelperService.getAgGridColumns('appendSection_grid'),
                data,
                height: 'calc(100vh - 28em)',
                menuItems: gridContextMenus
            }
    }

    public onMenuSelect(event): void {
        if (event && event.menu && event.data) {
            switch (event.menu.key) {
                case 'appendSection_grid_CONTEXT_MOVE_UP':
                    this.upNodeInGrid(event.data);
                    break;
                case 'appendSection_grid_CONTEXT_MOVE_DOWN':
                    this.downNodeInGrid(event.data);
                    break;
                case 'appendSection_grid_CONTEXT_MOVE_DELETE':
                    this.deleteNodeInGrid(event.data);
                    break;
            }
        }
    }

    private checkForUnsavedPogId(data: POGLibraryListItem[]): void {
        for (let pogObj of data) {
            if (this.unsavedArry.indexOf(pogObj.IDPOG) !== -1) {
                this.blockAppend = true;
                this.notifyService.warn(
                    `We found that POG# ${pogObj.IDPOG} is not yet Saved. Unless you Save it will not be possible to continue with Append operation`,
                );
                break;
            } else {
                this.blockAppend = false;
            }
        }
    }

    private deleteNodeInGrid(dataItem: POGLibraryListItem): void {
        if (this.newArray.indexOf(dataItem.IDPOG) >= 0) {
            this.newArray.splice(this.newArray.indexOf(dataItem.IDPOG), 1);
        }
        this.cachePogId = this.newArray;
        let index = this.currentAppendPog.findIndex((item) => item.IDPOG == dataItem.IDPOG);
        if (index > -1) {
            this.currentAppendPog.splice(index, 1);
            this.isDeletedRow = true;
            this.appendSectionGrid.gridApi.setRowData(this.currentAppendPog);
            
        }
        if (this.currentAppendPog.length > 0) {
            this.checkForUnsavedPogId(this.currentAppendPog);
        }
        if (this.currentAppendPog.length < this.getMaxAllowPogCount()) {
            this.addSectionView = false;
        } else {
            this.addSectionView = false;
        }
    }

    private downNodeInGrid(dataItem: POGLibraryListItem): void {
        let index = this.currentAppendPog.findIndex((item) => item.IDPOG == dataItem.IDPOG);
        let maxIndex = this.currentAppendPog.length - 1;
        if (index < maxIndex) {
            let newIndex = index + 1;
            this.currentAppendPog.splice(index, 1);
            this.currentAppendPog.splice(newIndex, 0, dataItem);
            this.appendSectionGrid.gridApi.setRowData(this.currentAppendPog);
        }
    }

    private upNodeInGrid(dataItem: POGLibraryListItem): void {
        let index = this.currentAppendPog.findIndex((item) => item.IDPOG == dataItem.IDPOG);
        if (index > 0) {
            let newIndex = index - 1;
            this.currentAppendPog.splice(index, 1);
            this.currentAppendPog.splice(newIndex, 0, dataItem);
            this.appendSectionGrid.gridApi.setRowData(this.currentAppendPog);
        }
    }

    private initPogList(): void {
        let tempPogList: POGLibraryListItem[] = _.cloneDeep(this.planogramStore.mappers);
        this.unsavedArry = [];
        for (let pogObj of tempPogList) {
            if (pogObj.sectionID && this.planogramService.rootFlags[pogObj.sectionID].isSaveDirtyFlag) {
                this.unsavedArry.push(pogObj.IDPOG);
            }
        }
        this.planogramList = tempPogList;
        this.selectedPlanogram = tempPogList[0].IDPOG;
        if (this.unsavedArry.indexOf(tempPogList[0].IDPOG) > -1) {
            this.addSectionView = true;
        } else {
            this.addSectionView = false;
        }
    }

    public appendSection(): void {
        this.selectedItems = [];
        for (let pogObj of this.currentAppendPog) {
            if (this.unsavedArry.indexOf(pogObj.IDPOG) !== -1) {
                this.blockAppend = true;
                this.notifyService.warn(
                    `We found that POG# ${pogObj.IDPOG} is not yet Saved. Unless you Save it will not be possible to continue with Append operation`,
                );

                break;
            }
            this.selectedItems.push(pogObj.IDPOG);
        }
        if (!this.blockAppend) {
            this.openappendSectionNameDialog = true;
            this.dialog.updateSize('45%', '40%');
        }
    }

    public closeNameSection(): void {
        this.openappendSectionNameDialog = false;
        this.dialog.updateSize('80vw', '80vh');
    }

    public postAppendData(): void {
        let postObj = {
            Name: this.appendPogName,
            IdScenario: this.planogramStore.scenarioId,
            Data: this.selectedItems,
        };
        this.sucessMesg = `${this.appendPogName} ${this.translate.instant('APPEND_POG_SUCCESS')}`;
        this.subscriptions.add(
            this.reportService.SendAppendSectionPog(postObj).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.closeNameSection();
                    this.notifyService.error(res.Log.Details[0].Message);

                    this.openAlertComponent(this.translate.instant('APPEND_SECTION_FAILED'), false);
                    this.appendPogName = '';
                } else {
                    if (res && res.Data) {
                        if (res.Data[0].IDPOG != undefined) {
                            this.pogLibraryService.markRequestToPin(res.Data, false);
                            this.sucessMesg = `${this.appendPogName}- ${res.Data[0].IDPOG} ${this.translate.instant(
                                'APPEND_POG_SUCCESS',
                            )}`;
                            this.openAlertComponent(this.sucessMesg, true);
                        }
                    }
                }
            }, (error) => {
                if (error) {
                    this.notifyService.error(error, 'GOT IT!');
                }
            }),
        );
    }

    private openAlertComponent(msg: string, flag: boolean): void {
        const dialogRef = this.alertdialog.open(AlertDialogComponent, {
            data: msg,
            width:'500px',
            height:'auto'
        });
        this.subscriptions.add(
            dialogRef.afterClosed().subscribe((res) => {
                if (flag) {
                    this.closeNameSection();
                    this.planogramService.pogChangesInLibrary.next('saveAppendSectionData');
                    this.appendPogName = ''; //clear name after success pop up close
                }
            }),
        );
    }

    public closeDialog(): void {
        this.dialog.close();
    }
}
