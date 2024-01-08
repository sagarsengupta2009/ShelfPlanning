import { Component, OnInit, ViewChild, OnDestroy, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ConsoleLogService } from 'src/app/framework.module';
import {
    ScenarioService, SharedService, AgGridHelperService,
    LanguageService, NotifyService, PlanogramStoreService,
    PogSideNavStateService, SelectedScenarioService,
    SplitterService,
    ConfigService,
    AppSettingsService
} from 'src/app/shared/services';
import { ScenarioDialogComponent } from './scenario-dialog/scenario-dialog.component';
import { CreateScenarioComponent } from './create-scenario/create-scenario.component';
import { PlanogramScenario, ScenarioStatus, UpdatedScenarioStatus, ScenarioStatusCode, PanelSplitterViewType, SelectedItem, SelectedRow, MenuItemSummary, Menu } from 'src/app/shared/models';
import { DeleteAlertComponent, ConfirmationDialogComponent } from 'src/app/shared/components/dialogues';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { ExcelExportParams } from 'ag-grid-community';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';
import { NgxI2eNotesComponent } from '../pogcomponensts/shelf-planogram/common';
import { AppConstantSpace } from 'src/app/shared/constants';


@Component({
    selector: 'srp-scenarios',
    templateUrl: './scenarios.component.html',
    styleUrls: ['./scenarios.component.scss'],
})
export class ScenariosComponent implements OnInit, AfterViewInit, OnDestroy {
    private readonly _subscriptions: Subscription = new Subscription();
    public gridConfig: GridConfig;
    private data: PlanogramScenario[] = [];
    private dataItem: PlanogramScenario;
    private statusList: ScenarioStatus[] = [];
    @ViewChild(`agGrid`) agGrid: AgGridComponent;
    public showDetailedTooltip = false;

    public get canShowScenarios(): boolean {
        return this.sharedService.link != 'iAssort' && !this.sharedService.vmode && this.language.isReady;
    }

    constructor(
        private readonly scenarioService: ScenarioService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly sharedService: SharedService,
        private readonly notifyService: NotifyService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly dialog: MatDialog,
        private readonly language: LanguageService,
        private readonly translate: TranslateService,
        private readonly router: Router,
        private readonly splitterService: SplitterService,
        private readonly selectedScenarioService: SelectedScenarioService,
        private readonly log: ConsoleLogService,
        private readonly agGridStoreService: AgGridStoreService,
        private readonly config: ConfigService,
        private readonly appSettingsService: AppSettingsService,
    ) { }

    ngOnInit() {
        this.sharedService.setActiveSectionId('');
        this.sharedService.isShelfLoaded = false;
        this.PogSideNavStateService.showSideNavigation.next(false);
        this.planogramStore.downloadedPogs = [];
        this.getScenariosList();
        this.splitterService.setSplitterView(PanelSplitterViewType.Full);
        this.sharedService.updateSearchVisibility.next(true);
        this.sharedService.GridValueUpdated(false);
        this.sharedService.mouseoverDockToolbar(true);
        this._subscriptions.add(
        this.appSettingsService
        .getAppSettingsByNameData(AppConstantSpace.POG_IMPLEMENTATION_DATE_ENABLE, AppConstantSpace.PLATFORM)
        .subscribe((data: string) => {
            this.planogramStore.implemenationDateDisable= data;
        }
        ));
    }

    ngAfterViewInit(): void {
        this._subscriptions.add(
            this.scenarioService.getScenarioStatus().subscribe((result) => {
                this.statusList = result.Data;
            }),
        );
        this.bindSearchEvent();
    }

    private bindSearchEvent() {
        this._subscriptions.add(
            this.sharedService.filterSearch.subscribe((response) => {
                if (this.agGrid) {
                    this.agGrid.gridConfig.data = this.sharedService.runFilter(
                        this.agGridStoreService.gridHoldingData.find(x => x.id === this.agGrid.gridConfig.id)[`data`],
                        response
                    );
                }
            }),
        );
    }


    private getScenariosList() {
        this._subscriptions.add(
            this.scenarioService.GetPlanogramScenarios().subscribe((scenarioResponse) => {
                if (scenarioResponse) {
                    this.data = scenarioResponse.Data;
                    this.setOrUpdateScenarioDetail(this.data);
                    this.rebindScenarioGrid(this.data);
                }
            }),
        );
    }

    private isSavedScenarioNotInScenarioList(scenariolist: PlanogramScenario[], selected: PlanogramScenario): boolean {
        return !scenariolist.some((x) => x.IdPOGScenario == selected.IdPOGScenario);
    }

    private setOrUpdateScenarioDetail(scenariolist: PlanogramScenario[]): void {
        if (scenariolist && scenariolist.length) {
            // get currently selected scenario, saved in the service and localStorage.
            let selectedScenario = this.selectedScenarioService.getSelectedPlanogramScenario();
            if (!selectedScenario || this.isSavedScenarioNotInScenarioList(scenariolist, selectedScenario)) {
                // reset selected scenario to first item in the list
                selectedScenario = scenariolist[0];
            }
            this.selectedScenarioService.setSelectedPlanogramScenario(selectedScenario);
        }
    }

    public invokeSelectedRow(event: { data: PlanogramScenario, fieldName: string, classList: DOMTokenList }): void {
        const scenario: PlanogramScenario = event.data;
        this.dataItem = scenario;
        if (scenario) {
            this.selectedScenarioService.setSelectedPlanogramScenario(scenario);
        }
    }

    private exportToExcel = () => {
        let params: ExcelExportParams = {};
        params.fileName = this.planogramStore.scenarioId && 'Scenario';
        this.agGrid.exportToExcel(params);
    };

    private rebindScenarioGrid(data: PlanogramScenario[]) {
        const selected = this.selectedScenarioService.getSelectedScenarioName();
        const scenarioId = this.planogramStore.scenarioId;
        let gridContextMenus: Menu[] = this.config.getGridMenus('Shelf-Scenario-Grid');
        const selectedIds = !selected || scenarioId == -1 ? [] : [+scenarioId];
        if (this.agGrid) {
            this.agGrid?.gridApi?.setRowData(data);
            this.agGrid?.setGridHoldingData(data);
        } else {
            this.gridConfig = {
                ...this.gridConfig,
                id: 'Shelf-Scenario-Grid',
                columnDefs: this.agGridHelperService.getAgGridColumns('Shelf-Scenario-Grid'),
                data,
                setRowsForSelection: {
                    field: 'IdPOGScenario',
                    items: scenarioId == -1 ? [] : selectedIds,
                },
                actionFields: ['Name'],
                height: 'calc(100vh - 141px)',
                defaultSort: { field: "ProjectModifiedTs", sort: "desc" },
                menuItems: gridContextMenus
            };
        }
    }

    public onContextMenuSelect(event: { menu: MenuItemSummary, data?: PlanogramScenario }) {
        if (event?.menu?.key) {
            this.dataItem = event.data;
            switch (event.menu.key) {
                case 'SCENARIONGRID_CONTEXT_Open':
                    this.selectedItem(event);
                    break;
                case 'SCENARIONGRID_CONTEXT_Rename':
                    this.renameScenario();
                    break;
                case 'SCENARIONGRID_CONTEXT_Delete':
                    this.deleteScenarionConfirmation(this.dataItem);
                    break;
                case 'SCENARIONGRID_CONTEXT_SubmitApproval':
                    this.updateScenarioStatus(ScenarioStatusCode.SUBMITTED_FOR_APPROVAL);
                    break;
                case 'SCENARIONGRID_CONTEXT_Revoke':
                    this.updateScenarioStatus(ScenarioStatusCode.IN_PROGRESS);
                    break;
                case 'SCENARIONGRID_CONTEXT_MarkAsInComplete':
                    this.updateScenarioStatus(ScenarioStatusCode.APPROVE_FAILED);
                    break;
                case 'SCENARIONGRID_CONTEXT_MarkAsComplete':
                    this.updateScenarioStatus(ScenarioStatusCode.COMPLETED);
                    break;
                case 'SCENARIONGRID_CONTEXT_Approve':
                    this.updateScenarioStatus(ScenarioStatusCode.PROCESSING);
                    break;
                case `SCENARIONGRID_CONTEXT_Notes`:
                    this.openNotesDialog(this.dataItem);
                    break;
                case `SCENARIONGRID_CONTEXT_Refresh`:
                    this.getScenariosList();
                    break;
            }
        }
    }

    private renameScenario(): void {
        const dialogRef = this.dialog.open(ScenarioDialogComponent, {
            width: '300px',
            data: { ScenarioName: this.dataItem.Name },
        });

        this._subscriptions.add(
            dialogRef.afterClosed().subscribe((result) => {
                if (result) {
                    const dataForRename = {
                        Name: result,
                        ScenarioId: this.dataItem.IdPOGScenario,
                    };
                    if (this.dataItem.Name === result) {
                        this.notifyService.warn('SCENARIO_CANNOT_HAVE_THE_SAME_NAME', 'GOT_IT');
                        return false;
                    } else if (this.agGrid.gridConfig.data.findIndex((x) => x.Name == result) > -1) {
                        this.notifyService.warn('SCENARIO_WITH_THE_SAME_NAME_ALREADY_EXIST', 'GOT_IT');
                        return false;
                    }
                    const scenarioToUpdate = this.agGridStoreService.gridHoldingData.find(x=>x.id===this.gridConfig.id)?.data.find(
                        (x) => x.IdPOGScenario === this.dataItem.IdPOGScenario,
                    );
                    scenarioToUpdate.Name = result;

                    this._subscriptions.add(
                        this.scenarioService.renameScenario(dataForRename)
                            .subscribe((errorMessage: string | undefined) => {
                                if (errorMessage) {
                                    this.notifyService.error(errorMessage, 'GOT_IT');
                                } else {
                                    this.notifyService.success('RENAMED_SUCCESSFULLY', 'GOT_IT');
                                }

                                this.getScenariosList();
                            },
                            (error) => {
                                if (error) {
                                    this.notifyService.error(error, 'GOT IT!');
                                }
                            },
                        ),
                    );
                }
            }),
        );
    }

    private deleteScenarionConfirmation(dataItem: PlanogramScenario): void {
        if (this.data.length == 1) {
            this.dialog.open(DeleteAlertComponent, {
                width: '350px',
                data: `Last scenario can not be deleted.`,
            });
            return;
        }

        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '350px',
            data: this.translate.instant('DELETE_SCENARIO'),
        });

        this._subscriptions.add(
            dialogRef.afterClosed().subscribe((result: boolean) => {
                if (result) {
                    this.deleteScenario(dataItem);
                }
            }));
    }

    private deleteScenario(dataItem: PlanogramScenario) {
        this._subscriptions.add(
            this.scenarioService.deleteScenario(dataItem)
                .subscribe((errorMessage: string | undefined) => {
                    if (errorMessage) {
                        this.notifyService.error(errorMessage, 'GOT_IT');
                    } else {
                        this.notifyService.success('SCENARIO_DELETED_SUCCESSFULLY', 'GOT_IT');
                    }
                    this.getScenariosList();
                }, (error) => {
                    if (error) {
                        this.notifyService.error(error, 'GOT IT!');
                    }
                    this.log.error('Scenario delete api call failed wit error:', error);
                }));
    }

    private updateScenarioStatus(statusId: ScenarioStatusCode) {
        this._subscriptions.add(
            this.scenarioService.getUpdateScenarioStatus(this.dataItem.IdPOGScenario, statusId).subscribe((result) => {
                const newScenarioStatus: UpdatedScenarioStatus = result.Data;
                let dontHavePermission = result.Log.Summary.Error > 0;
                dontHavePermission ? this.notifyService.error(result.Log.Details[0].Message, 'GOT IT!') : '';
                if (newScenarioStatus && !dontHavePermission) {
                    const updatedStatus = this.statusList.find((x) => x.StatusCode === newScenarioStatus.Status);
                    this.data.forEach((obj) => {
                        if (obj.IdPOGScenario === newScenarioStatus.IDPOGScenario) {
                            obj.Status = newScenarioStatus.Status;
                            obj.StatusName = updatedStatus.StatusDesc;
                        }
                    });
                    this.rebindScenarioGrid(this.data);
                }
            }),
        );
    }

    private openNotesDialog(data) {
        const dialogobj = this.dialog.open(NgxI2eNotesComponent, {
            width: '70vw',
            height: '80vh',
            disableClose: true,
            data: {
                dataItem: {
                    idproject: data.IdProject,
                    idscenario: data.IdAsrtScenario,
                    Appname: 'Shelf',
                },
                translationStrings: {
                    ENTER_NOTES: this.translate.instant('ENTER_NOTES'),
                    NOTE_SAVE_FAIL: this.translate.instant('NOTE_SAVE_FAIL'),
                    NOTE_SAVE_SUCCESS: this.translate.instant('NOTE_SAVE_SUCCESS'),
                    CREATED_ON: this.translate.instant('CREATED_ON'),
                    NOTE_DELETE_SUCCESS: this.translate.instant('NOTE_DELETE_SUCCESS'),
                    NOTE_DELETE_FAIL: this.translate.instant('NOTE_DELETE_FAIL'),
                    NOTES_APPNAME: this.translate.instant('NOTES_APPNAME'),
                    MODIFIED_ON: this.translate.instant('FEEDBACK_DATE'),
                    OPTIONS: this.translate.instant('UNLOAD_OPTIONS'),
                    NOTE_UPDATE_SUCCESS: this.translate.instant('NOTE_UPDATE_SUCCESS'),
                    NOTE_UPDATE_FAIL: this.translate.instant('NOTE_UPDATE_FAIL'),
                    CREATED_BY: this.translate.instant('CREATED_BY'),
                    SAVE: this.translate.instant('SAVE'),
                    CLEAR: this.translate.instant('CLEAR'),
                    PROJECT_NOTES: this.translate.instant('PROJECT_NOTES'),
                    SORTDESC: this.translate.instant('SORTDESC'),
                    SORTASC: this.translate.instant('SORTASC'),
                    PLS_SELECT_ROW: this.translate.instant('PLS_SELECT_ROW'),
                    BROADCAST_NO_PERMISSIONS: this.translate.instant('BROADCAST_NO_PERMISSIONS')
                },
            },
        });
        this._subscriptions.add(
            dialogobj.afterClosed().subscribe(() => {
                this.getScenariosList();
            }),
        );
    }
    public selectedItem(event: { data: PlanogramScenario } | { menu: MenuItemSummary, data?: PlanogramScenario }): void {
        const scenario: PlanogramScenario = event.data;
        if (!scenario) { return; }

        const scenarioId = scenario.IdPOGScenario;
        const projectId = scenario.IdProject;

        //updating the store
        this.planogramStore.scenarioId = scenarioId;
        this.planogramStore.projectId = projectId;

        this.selectedScenarioService.setSelectedPlanogramScenario(scenario);

        this.sharedService.setDefaultSyncPanelViewMode.next(true);

        if (scenario.Status !== ScenarioStatusCode.NOT_READY) {
            this.router.navigate(['sp/pogs'], { queryParams: { scenarioID: scenarioId, projectID: projectId } });
            this.PogSideNavStateService.showSideNavigation.next(true);
            this.sharedService.isNavigatedToPogLib.next(true);
        }
    }

    public openDialog = () => {
        const dialogRef = this.dialog.open(CreateScenarioComponent, {
            width: '41vw',
            height: 'auto',
        });
        this._subscriptions.add(
            dialogRef.afterClosed().subscribe((response) => {
                if (response && response[`Data`] == null) {
                    this.notifyService.error(response[`Log`][`Details`][0][`Message`], 'GOT IT!');
                }
                this.getScenariosList();
            }),
        );
    };

    public ngOnDestroy() {
        this._subscriptions.unsubscribe();
    }

    public menu = (response) => {
        let selectedMenu = response[`data`];
        if (selectedMenu) {
            switch (selectedMenu[`key`].trim()) {
                case 'EXPORT':
                    this.exportToExcel();
                    break;
                case 'REFRESH':
                    this.getScenariosList();
                    break;
            }
        }
    };
}
