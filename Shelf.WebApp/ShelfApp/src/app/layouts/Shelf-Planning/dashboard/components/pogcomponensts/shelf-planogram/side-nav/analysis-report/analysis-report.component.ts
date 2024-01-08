import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import {
    IApiResponse,
    PogDataSource,
    ReportsData,
    ReportsDataColumns,
    ReportsDataMeasures,
    SchemaDataType,
    savedReportData,
} from 'src/app/shared/models';
import { AgGridHelperService, AnalysisReportService, ConfigService, LanguageService, NotifyService, PlanogramStoreService, UserPermissionsService, UserService } from 'src/app/shared/services';
import { GridColumnSettings, GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ColDef } from 'ag-grid-community';
import { ConfirmationDialogComponent } from 'src/app/shared/components';
import { isEqual } from 'lodash';
import { CommonCustomizableDialogComponent } from 'src/app/shared/components/dialogues';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Utils } from 'src/app/shared/constants';

@Component({
    selector: 'shelf-analysis-report',
    templateUrl: './analysis-report.component.html',
    styleUrls: ['./analysis-report.component.scss'],
})
export class AnalysisReportComponent implements OnInit, OnDestroy {
    public userReports: ReportsData[] = [];
    public reportName: string = '';
    public isViewOnly: boolean = false;
    public showSaveIcon: boolean = false;
    private pogDataSource: PogDataSource[] = [];
    private pogReportSchema: SchemaDataType = <SchemaDataType>{};
    public currentIdTemplate: number = -1;
    private currentRows: ReportsDataColumns[] = [];
    private currentColumns: ReportsDataColumns[] = [];
    private currentMeasures: ReportsDataMeasures[] = [];
    private selectedRows: ReportsDataColumns[] = [];
    private selectedColumns: ReportsDataColumns[] = [];
    private selectedMeasures: ReportsDataMeasures[] = [];
    private subscriptions: Subscription = new Subscription();
    private measuresArray = [];
    private dimensionsArray = [];
    public showSavedReports: boolean = false;
    public showReportNameLabel: boolean = false;
    public seletedReport: ReportsData;
    public isAdmin: boolean = false;
    public isSystemReport: boolean = false;
    public tooltipReportName: string = '';
    public lastModified: string = '';
    public isReorderd: boolean = false;
    public newOrder: number[] = [];
    public sharedStr: string = '(' + this.translate.instant('SHARED') + ')';
    public gridName: string = 'shelf_analysis_report_grid';

    aggridConfig: GridConfig;
    @ViewChild('agGrid') gridComp: AgGridComponent;

    constructor(
        private readonly analysisReportService: AnalysisReportService,
        private readonly dialog: MatDialogRef<AnalysisReportComponent>,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
        private readonly cd: ChangeDetectorRef,
        private readonly planogramStore: PlanogramStoreService,
        private readonly matDialog: MatDialog,
        readonly languageService: LanguageService,
        private readonly userPermissions: UserPermissionsService,
        private readonly user: UserService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly config: ConfigService
    ) { }

    ngOnInit(): void {
        this.isAdmin = this.userPermissions.hasUpdatePermission('Pog-Analysis-Report');
        this.refreshReports(false);

        setInterval(() => {
            if (this.isReorderd) {
                this.subscriptions.add(this.analysisReportService.savePivotGridUserPreference(this.newOrder).subscribe());
                this.isReorderd = false;
            }
        }, 3000);
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    @HostListener('document:mouseup')
    onMouseUp(): void {
        setTimeout(() => { 
            this.selectedRows = [];
            this.selectedColumns = [];
            this.selectedMeasures = [];
            this.gridComp?.gridApi?.getColumnDefs().forEach((col: ColDef) => {
                if (col.rowGroup) {
                    this.selectedRows.push({ name: col.field });
                }
                if (col.pivot) {
                    this.selectedColumns.push({ name: col.field });
                }
                if (col.aggFunc) {
                    this.selectedMeasures.push({ name: col.field, aggFunc: col.aggFunc as string });
                }
            });

            this.setShowSaveIcon();
        });
    }

    public setShowSaveIcon(): void{
        this.showSaveIcon = (this.selectedRows.length > 0 || this.selectedColumns.length > 0 || this.selectedMeasures.length > 0) && this.reportName.trim() !== '' &&
            (!(isEqual(this.selectedRows, this.currentRows) && isEqual(this.selectedColumns, this.currentColumns) && isEqual(this.selectedMeasures, this.currentMeasures) && this.reportName.trim() === this.seletedReport?.Name)
            || (this.seletedReport?.IsPivotMode !== this.gridComp?.gridColumnApi?.isPivotMode()) || (this.seletedReport?.IsSystemReport !== this.isSystemReport));
    }

    public validateReportName(event: KeyboardEvent): void{
        if (!event.key.match(/^[A-Za-z0-9 _-]+$/)) {
            event.preventDefault();
        }
    }

    public closeDialog(): void {
        if (this.showSaveIcon) {
            const dialogRef = this.matDialog.open(ConfirmationDialogComponent, {
                data: this.translate.instant('SAVEALERT'),
                disableClose: true
            });
            const subscription = dialogRef.beforeClosed().subscribe(result => {
                if (result) {
                    if (this.reportName.trim() !== this.seletedReport?.Name) {
                        dialogRef.close();
                        this.saveTemplateConfirmation(true);
                    } else {
                        this.saveTemplate(false, true);
                    }
                } else {
                    this.dialog.close();
                }
            });
            this.subscriptions.add(subscription);
        } else {
            this.dialog.close();
        }
    }

    public editReport(report: ReportsData): void {
        if (this.currentIdTemplate === report.IdTemplate) {
            this.reInitGrid();
        } else {
            this.showReportNameLabel = true;
            this.currentIdTemplate = report.IdTemplate;
            this.reportName = report.Name;
            this.currentRows = report.Rows;
            this.currentColumns = report.Columns;
            this.currentMeasures = report.Measures;
            this.seletedReport = report;
            this.isSystemReport = report.IsSystemReport;
            this.isViewOnly = report.IsSystemReport && (!this.isAdmin || report.CreatedBy !== this.user.emailId);
            this.showSaveIcon = false;
            this.gridName = 'shelf_analysis_report_grid' + this.currentIdTemplate;
            this.initGrid(report);   
        }
    }

    public deleteReport(): void {
        if (this.isViewOnly) {
            this.notifyService.warn('SYSTEM_REPORT_CANNOT_BE_DELETED');
            return;
        }

        const dialogRef = this.matDialog.open(CommonCustomizableDialogComponent, {
            width: '480px',
            data: {
                message: this.translate.instant('REPORT_DELETED_PERMANENTLY') + ' <br><br> ' + this.translate.instant('ARE_YOU_SURE'),
                buttons: [{
                    text: 'NO',
                    callBackValue: false
                },
                {
                    text: 'YES',
                    callBackValue: true,
                    customClass: 'primary-color'
                }]
            }
        });

        this.subscriptions.add(
            dialogRef.afterClosed().subscribe((result: boolean) => {
                if (result) {
                    this.subscriptions.add(
                        this.analysisReportService.deletePivortReport(this.seletedReport.IdTemplate).subscribe((res) => {
                            const index = this.userReports.findIndex((reportObj) => reportObj.IdTemplate === this.seletedReport.IdTemplate);
                            if (index > -1) {
                                this.userReports.splice(index, 1);
                            }
                            if (this.userReports.length === 0) {
                                this.showSavedReports = false;   
                            }
                            this.reInitGrid();
                        }),
                    );
                }
            })
        );
    }

    private updateUserReports(report: ReportsData, isNewReport: boolean): void {
        if (!isNewReport) {
            const index = this.userReports.findIndex((reportObj) => reportObj.IdTemplate === report.IdTemplate);
            if (index > -1) {
                this.userReports.splice(index, 1, report);
            }
        } else {
            this.userReports.splice(0, 0, report);
        }
        this.initGrid(report);
    }

    public reInitGrid(): void {
        this.currentIdTemplate = -1;
        this.isViewOnly = false;
        this.reportName = '';
        this.currentRows = [];
        this.currentColumns = [];
        this.currentMeasures = [];
        this.showReportNameLabel = false;
        this.showSaveIcon = false;
        this.isSystemReport = false;
        this.seletedReport = null;
        this.gridName = 'shelf_analysis_report_grid';
        this.initGrid();
    }

    public exportPivotData(): void {
        const fileName = 'Shelf Analysis Report - ' + this.planogramStore.scenarioId
        this.gridComp.exportToExcelForPivotGrid(fileName);
    }

    public saveTemplateConfirmation(closeDialog?: boolean): void{
        if (this.seletedReport) {
            let message = this.translate.instant('SURE_TO_MAKE_CHANGES') + ' <br> ' + this.translate.instant('TO_THE_CURRENT_REPORT');
            let buttons = [{
                text: 'REPORT_ACTION_CONFIRM',
                callBackValue: { isClone: false },
                customClass: 'primary-color'
            }];

            if (this.isViewOnly) {
                message = this.translate.instant('CHOOSE_TO_TAKE_PERSONAL_COPY') + ' <em>' + this.translate.instant('SHARED') + '</em> ' + this.translate.instant('REPORT') + '.';
                buttons = [{
                    text: 'SAVE_AS_NEW',
                    callBackValue: { isClone: true },
                    customClass: 'primary-color'
                }];
            } else if (this.reportName.trim() !== this.seletedReport?.Name) {
                message = this.translate.instant('REPORT_CHANGES_INCLUDE_REPORT_NAME');
                buttons = [
                    {
                        text: 'UPDATE_EXISTING',
                        callBackValue: { isClone: false },
                        customClass: 'primary-color'
                    },
                    {
                        text: 'SAVE_AS_NEW',
                        callBackValue: { isClone: true },
                        customClass: 'primary-color'
                    }
                ];
            }

            const dialogRef = this.matDialog.open(CommonCustomizableDialogComponent, {
                width: '420px',
                data: {
                    message: message,
                    buttons: buttons
                }
            });

            this.subscriptions.add(
                dialogRef.afterClosed().subscribe((result) => {
                    if (result) {
                        this.saveTemplate(result.isClone, closeDialog);
                    }
                })
            );
        } else {
            this.saveTemplate(false, closeDialog);
        }
    }

    public saveTemplate(isClone: boolean, closeDialog?: boolean): void {
        const orgReportName = this.reportName;
        if (this.isViewOnly) {
            this.isSystemReport = false;
            this.reportName = 'Copy of ' + this.reportName.trim();
        }
        if (this.currentIdTemplate <= 0 || this.reportName.trim().toLowerCase() !== this.seletedReport?.Name.toLowerCase()) {
            const reportObj = this.userReports.find((report) => report.Name.toLowerCase() === this.reportName.trim().toLowerCase());
            if (reportObj) {
                this.reportName = orgReportName;
                let msg = this.reportName.trim() + ' ' + this.translate.instant('IS_ALREADY_EXISTS') + '. ';
                if (this.isViewOnly) {
                    msg = this.translate.instant('COPY_OF') + ' ' + msg + this.translate.instant('PLEASE_RENAME_THE_EARLIER_COPY_TO_TAKE_ANOTHER_COPY');
                } else {
                    msg += this.translate.instant('TRY_SAVING_WITH_DIFFERENT_NAME');
                }
                this.notifyService.warn(msg);
                return;
            }
        }
        if (isClone) {
            this.currentIdTemplate = -1;
        }
        const reportToBeSaved = {
            IDTemplate: this.currentIdTemplate,
            Name: this.reportName.trim(),
            Rows: JSON.stringify(this.selectedRows),
            Columns: JSON.stringify(this.selectedColumns),
            Measures: JSON.stringify(this.selectedMeasures),
            IsSystemReport: this.isSystemReport,
            IsPivotMode: this.gridComp.gridColumnApi.isPivotMode(),
            GridTemplateConfig: JSON.stringify(this.config.getGridColumns(this.gridName))
        };
        let reports = [reportToBeSaved];
        this.subscriptions.add(
            this.analysisReportService.savePivotReportTemplate(reports).subscribe((response) => {
                this.showSaveIcon = false;
                if (closeDialog) {
                    this.closeDialog();
                } else {
                    this.isViewOnly = isClone ? false : this.isViewOnly;
                    this.currentIdTemplate = response.Data.Report[0].IdTemplate;
                    this.seletedReport = response.Data.Report[0];
                    this.updateUserReports(response.Data.Report[0], response.Data.IsNewReport);
                }
                this.notifyService.success('ANALYSIS_REPORT_SAVED_SUCCESSFULLY');
            }),
        );
    }

    public initGrid(report?: ReportsData) {
        let columnDefs = this.makeColumnDefinationAsPerAgGrid(report);
        if (this.gridComp) {
            this.gridComp.gridConfig.doNotCallGridConfigSaveAPI = report != undefined;
            this.gridComp.gridConfig.hideColumnConfig = report && report.IsPivotMode;
            this.gridComp.gridConfig.id = this.gridName;
            this.gridComp.gridApi.setRowData(this.pogDataSource);
            this.gridComp.gridConfig.pivotMode = report?.IsPivotMode;
            this.gridComp.gridApi.setColumnDefs([]);
            this.gridComp.gridApi.setColumnDefs(columnDefs);
            this.cd.detectChanges();
            this.gridComp.gridApi.redrawRows();
        } else {
            this.aggridConfig = {
                ...this.aggridConfig,
                id: this.gridName,
                data: this.pogDataSource,
                columnDefs: columnDefs,
                height: 'calc(100% - 35px)',
                type: 'pivotGrid',
                supressSrNo: true,
                pivotMode: report?.IsPivotMode,
                doNotCallGridConfigSaveAPI: report != undefined,
                customGridConfigSaveAPI: this.customGridConfigSaveAPI
            };   
        }
    }

    public customGridConfigSaveAPI = (): Observable<IApiResponse<savedReportData>> => {
        const report = {
            IDTemplate: this.seletedReport.IdTemplate,
            Name: this.seletedReport.Name,
            Rows: JSON.stringify(this.seletedReport.Rows),
            Columns: JSON.stringify(this.seletedReport.Columns),
            Measures: JSON.stringify(this.seletedReport.Measures),
            IsSystemReport: this.seletedReport.IsSystemReport,
            IsPivotMode: this.seletedReport.IsPivotMode,
            GridTemplateConfig: JSON.stringify(this.config.getGridColumns(this.gridName))
        };
        return this.analysisReportService.savePivotReportTemplate([report]);
    }

    public refreshReports(isRefresh: boolean): void {
        this.subscriptions.add(
            this.analysisReportService.getAnalysisReport(isRefresh).subscribe((response) => {
                if (response && response.Data) {
                    this.lastModified = response.Data.LastModified;
                    this.userReports = response.Data.Reports;
                    this.pogReportSchema = response.Data.Schema;

                    // Sort reports based on order
                    this.newOrder = [];
                    if (response.Data.Order) {
                        this.newOrder = response.Data.Order;
                        this.userReports = response.Data.Reports.sort((a, b) => {
                            return response.Data.Order.indexOf(a.IdTemplate) - response.Data.Order.indexOf(b.IdTemplate);
                        });
                    }
                    this.analysisReportService.getAnalysisReportPogData(response.Data.DataSourceUrl).subscribe((data) => {
                        if (data) {
                            this.pogDataSource = data;
                            
                            this.makeMeasuresAndDimensionsArray();
                            this.reInitGrid();
                            if (isRefresh) {
                                this.notifyService.success('ANALYSIS_REPORT_REFRESHED_SUCCESSFULLY');   
                            }
                        }
                    });
                }
            })
        );
    }

    private makeColumnDefinationAsPerAgGrid(report?: ReportsData): ColDef[] {
        let columnDefs: ColDef[] = this.agGridHelperService.getAgGridColumns(this.gridName);
        let gridConfig: GridColumnSettings[] = this.config.getGridColumns(this.gridName);
        if (gridConfig.length <= 0) {
            gridConfig = report && !Utils.isNullOrEmpty(report.GridTemplateConfig) ? JSON.parse(report.GridTemplateConfig) : this.config.getGridColumns('shelf_analysis_report_grid');
            if (columnDefs.length <= 0) {
                this.config.saveGridColumns(this.gridName, gridConfig);
                columnDefs = this.agGridHelperService.getAgGridColumns(this.gridName);
            }
        }

        for (let colDef of columnDefs) {
            colDef.keyCreator = (params) => {
                if (params?.value && typeof params?.value === 'object') {
                    if (Object.keys(params?.value).length === 0) {
                        return '';
                    } else {
                        return params.value;
                    }
                }
                return params.value;
            };
            colDef.filter = true;
            
            const config = gridConfig.find(gc => gc[1] == colDef.field);
            config.isPivotGrid = true;

            let isFieldExistInDimensionOrMeasures = false;
            //grouped rows
            const existDimensionForCol = this.dimensionsArray.find(ele => ele.field === colDef.field);
            if (existDimensionForCol) {
                isFieldExistInDimensionOrMeasures = true;
                config.enablePivot = true;
                config.enableRowGroup = true;
                
                // Set row group
                if (report?.Rows?.find(ele => ele.name === colDef.field)) {
                    config[6] = true;
                }

                //pivot column
                if (report?.Columns?.find(ele => ele.name === colDef.field)) {
                    config.pivot = true;
                }
            }

            //Measurement column
            const existMeasureForCol = this.measuresArray.find(ele => ele.field === colDef.field);
            if (existMeasureForCol) {
                isFieldExistInDimensionOrMeasures = true;
                config.enableValue = true;

                const reportMeasure = report?.Measures.find(ele => ele.name === existMeasureForCol.field);
                config.aggFunc = null;
                if (reportMeasure) {
                    config.aggFunc = reportMeasure.aggFunc === 'average' ? 'avg' : reportMeasure.aggFunc;
                }
            }
        }

        if (report) {
            report.GridTemplateConfig = JSON.stringify(gridConfig);   
        }
        this.config.saveGridColumns(this.gridName, gridConfig);

        const newColumnDefs = this.agGridHelperService.getAgGridColumns(this.gridName);

        //Sort the data as per order index
        newColumnDefs.sort(
            (a, b) => a?.cellRendererParams?.orderIndex - b?.cellRendererParams?.orderIndex,
        );

        return newColumnDefs;
    }

    private makeMeasuresAndDimensionsArray(): void {
        for (const [key, value] of Object.entries(this.pogReportSchema.cube.measures)) {
            this.measuresArray.push({
                name: key,
                field: value.field,
                aggregate: value.aggregate
            });
        }

        for (const [key, value] of Object.entries(this.pogReportSchema.cube.dimensions)) {
            this.dimensionsArray.push({
                field: key,
                name: value.caption
            });
        }
    }

    public drop(event: CdkDragDrop<string[]>) : void {
        moveItemInArray(this.userReports, event.previousIndex, event.currentIndex);
        const order = this.userReports.map((ur) => ur.IdTemplate);
        // Only refresh if order is changed
        if (JSON.stringify(this.newOrder) !== JSON.stringify(order)) {
            this.newOrder = order;
            this.isReorderd = true;
        }
    }

    public mouseOverOnButton(element: HTMLElement, reportName: string): void {
        this.tooltipReportName = (element && element.scrollWidth > element.clientWidth) ? reportName : '';
    }
}
