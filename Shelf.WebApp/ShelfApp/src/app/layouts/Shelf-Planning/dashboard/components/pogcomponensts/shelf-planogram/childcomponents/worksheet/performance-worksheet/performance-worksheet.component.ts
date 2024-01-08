import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSelect } from '@angular/material/select';
import { TranslateService } from '@ngx-translate/core';
import { isEmpty } from 'lodash-es';
import { IApiResponse, Performance, StoreAppSettings } from 'src/app/shared/models';
import { KednoGridConfig, KendoColumnSetting } from 'src/app/shared/models/kendoGrid';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { AgGridHelperService, SharedService } from 'src/app/shared/services';
import { PlanogramPerformanceService } from 'src/app/shared/services';
import { PlanogramStoreService } from 'src/app/shared/services';
import { SplitterService } from 'src/app/shared/services/layouts/space-automation/dashboard/splitter/splitter.service';
import { Section } from 'src/app/shared/classes';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';

@Component({
    selector: 'sp-performance-worksheet',
    templateUrl: './performance-worksheet.component.html',
    styleUrls: ['./performance-worksheet.component.scss'],
})
export class PerformanceWorksheetComponent implements OnInit, AfterViewInit, OnChanges {
    @ViewChild('performanceWS') performanceWS: KendoGridComponent;
    //-------------
    public aggridConfig: GridConfig;
    //-------------
    @ViewChild('agGrid') gridComp: AgGridComponent;
    private columnsData: KendoColumnSetting[] = [];
    private sectionID: string;
    public gridConfig: KednoGridConfig;
    public get AppSettingsSvc(): StoreAppSettings {
        return this.planogramStore.appSettings;
    }
    private rootObj: Section;
    public performancePeriod: number = 0;
    public choosePerformanceText: string = this.planogramStore.lookUpHolder.PerformancePeriod.value;
    public performancePeriodList: Object[];
    public presentActivePog: number[] = [];
    public presentIdPog: number;
    private performanceSubscription: Subscription[] = [];
    public selectedPeriod: number  = 0;
    public splitterview: boolean = false;
    private downloadExcelSub: Subscription;
    public pogObject: Section;
    private performanceData: Performance[];
    @ViewChild('teamDropdown') teamDropdown: MatSelect;
    @Input() secObject: any;
    @Input() selectedPogObject: any;
    @Input() displayView: string;
    @Input() panalID: string;
    private subscriptions: Subscription = new Subscription();
    constructor(
        private translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramPerformanceService: PlanogramPerformanceService,
        private readonly splitterService: SplitterService
    ) {}

    public performancePeriodText: string = this.translate.instant('PERFORMANCE_PERIOD');
    public caliculateText: string = this.translate.instant('PERFORMANCE_CALCULATE');

    ngOnInit(): void {
        this.subscriptions.add(this.splitterService.spitterView.subscribe((result) => {
                this.splitterview = result;
            })
        );

        // Download Excel
        this.subscriptions.add(this.sharedService.downloadExportExcel.subscribe((res: { view: string }) => {
            if (res?.view === 'performanceWS') {
                this.gridComp.gridApi.exportDataAsExcel();
            }
        }));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (!isEmpty(this.secObject)) {
            this.initWorkSheet();
        }
    }
    public initWorkSheet(): void {
        let sectionObject;
        this.performancePeriodList = this.planogramStore.lookUpHolder['PerformancePeriod'].options.filter((data) => {
            //not manual or assortment
            if (data.value === -1) return false;
            if (data.value === 0) return false;
            return true;
        });

        this.performancePeriodList.unshift({ text: this.translate.instant('PERFORMANCE_PERIOD'), value: 0 });
        this.presentActivePog = [];
        sectionObject = this.sharedService.getObject(
            this.sharedService.getActiveSectionId(),
            this.sharedService.getActiveSectionId(),
        ) as Section;
        this.presentIdPog = sectionObject.IDPOG;
        const pog = this.planogramStore.getPogById(sectionObject.IDPOG as any);
        if (pog) {
            this.sectionID = pog.sectionID;
            this.rootObj = this.pogObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        } else {
            this.sectionID = this.sharedService.activeSectionID;
            this.rootObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            this.pogObject = this.rootObj;
        }
        const cols = this.agGridHelperService.getAgGridColumns('planogram_Performance_Worksheet');
        this.performanceData = this._prepareDataModel([]);
        this.aggridConfig = {
            ...this.aggridConfig,
            id: 'planogram_Performance_Worksheet',
            data: this.performanceData,
            columnDefs: cols,
            isFillDown: true,
            height: 'calc(100vh - 206px)',
        };
    }

    ngAfterViewInit(): void {
        setTimeout(() => {
            this.teamDropdown.options.first.select();
        });
    }

    public fetchData(perfID: number, perfText: string): void {
        this.performancePeriod = perfID;
        this.performancePeriodText = perfText;
        let per = this.planogramPerformanceService
            .getPOGPerformanceData(this.rootObj.IDPOG, perfID)
            .subscribe((performanceData: IApiResponse<Performance[]>) => {
                if (performanceData) {
                    this.performanceData = performanceData.Data;
                }
                this.performanceData = this._prepareDataModel(this.performanceData);
                this.gridComp.bindGrid(this.performanceData);
            });
        this.performanceSubscription.push(per);
    }

    public findAndAppend(child: Performance): void {
        const positionsArray = this.sharedService.getAllPositionFromObjectList(this.sectionID);
        for (const pos of positionsArray) {
            if (pos.Position.IDPackage === child.IDPackage && pos.Position.IDProduct === child.IDProduct) {
                child.SKU = pos.Position.Product.SKU;
                child.UPC = pos.Position.Product.UPC;
                child.Name = pos.Position.Product.Name;
                child.Package = pos.Position.Product.L8;
                child.HighlightLabel = '';
                return;
            }
        }
        child.SKU = '';
        child.UPC = '';
        child.Package = '';
        child.Name = '';
        child.HighlightLabel = '';
    }

    public _prepareDataModel(rawData: Performance[]): Performance[] {
        //  let performanceData = rawData[0].filter(x => x);
        rawData.forEach((child, key) => {
            this.findAndAppend(child);
        });
        return rawData;
    }

    public processPogCal(): void {
        this.presentActivePog[0] = this.presentIdPog;
        this.subscriptions.add(this.planogramPerformanceService.getPOGPerformanceCalculation(this.presentActivePog[0], this.performancePeriod).subscribe((result: IApiResponse<Performance[]>) => {
            if (result.Data != null) {
                this.performanceData = this._prepareDataModel(result.Data);
                if (this.performanceData && this.performancePeriod === this.rootObj.IDPerfPeriod) {
                    this.planogramPerformanceService.applyPerformanceData(
                        this.rootObj.$sectionID,
                        this.performancePeriod,
                        this.performanceData,
                    );
                    this.sharedService.updatePosPropertGrid.next(true);
                }
                this.gridComp.bindGrid(this.performanceData);
                this.sharedService.gridReloadSubscription.next(true);
            }
        }))
    }

      public getPerformanceData(): void  {
        // performance period has value set to 0 which is valid
        if (this.selectedPeriod || this.selectedPeriod === 0) {
          const resultArray = Object.keys(this.performancePeriodList).map(index => {
            let period = this.performancePeriodList[index];
            return period;
        });
          resultArray.forEach(element => {
            if (element.value == this.selectedPeriod) {
              this.fetchData(element.value, element.text);
            }
          });
        }
      }

    public calculateData(): void {
        this.getPerformanceData();
    }

    public ngOnDestroy(): void {
        if (this.performanceSubscription.length > 0)
            this.performanceSubscription.forEach((subscription) => subscription.unsubscribe());
        this.downloadExcelSub ? this.downloadExcelSub.unsubscribe() : null;
        if (this.subscriptions) {
            this.subscriptions.unsubscribe();
        }
    }
}
