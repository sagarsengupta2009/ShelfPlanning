import {
    Component,
    OnInit,
    ViewChild,
    Output,
    Input,
    EventEmitter,
    SimpleChanges,
    OnChanges,
    OnDestroy,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LegendLabelsContentArgs, ChartComponent } from '@progress/kendo-angular-charts';
import { saveAs } from '@progress/kendo-file-saver';
import { exportPDF, geometry, fit, Group } from '@progress/kendo-drawing';
import { MatDialog } from '@angular/material/dialog';
import { AnalysisSettingComponent } from './analysis-setting/analysis-setting.component';
import { KendoColumnSetting } from 'src/app/shared/models/kendoGrid';
import { Subscription } from 'rxjs';
import {
    DictConfigService,
    SharedService,
    PlanogramStoreService,
    PogSideNavStateService,
    AgGridHelperService
} from 'src/app/shared/services';
import { BarGraphSeries, ChartSettingData, ChartType, Dictionary, Levels, PogSideNaveView, SelectedDisplayType } from 'src/app/shared/models';
import { HeaderMenu } from 'src/app/shared/models/config/application-resources';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig, GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { DecimalPipe } from '@angular/common';

function mm(val: number): number {
    return val * 2.8347;
}

const PAGE_RECT = new geometry.Rect([0, 0], [mm(210 - 20), mm(297 - 20)]);

@Component({
    selector: 'sp-analysis',
    templateUrl: './analysis.component.html',
    styleUrls: ['./analysis.component.scss'],
})
export class AnalysisComponent implements OnInit, OnDestroy, OnChanges {
    private _subscriptions: Subscription = new Subscription();
    @ViewChild(`agReportGrid`) agReportGrid: AgGridComponent;
    @Input() isPin: boolean;
    @Input() pogData; //TODO shoulde get from other interface
    @Output() onPinUnpintoggle: EventEmitter<boolean> = new EventEmitter();
    @Output() viewComponentInSideNav: EventEmitter<boolean> = new EventEmitter();
    @Output() getWidth: EventEmitter<number> = new EventEmitter();
    @ViewChild('pieChart') public _pieChart: ChartComponent;
    @ViewChild('barChart') public _barChart: ChartComponent;
    public pogChartHeaderMenuShowHide: HeaderMenu = {
        selectedChartType: 1,
        isPin: false,
        maxwidth: 40,
    };
    private chartTypeList: ChartType[] = [];
    public selectedChartType: number;
    private showChartInPercent: boolean = false;
    private dynamicCharts;
    private allLevel: Levels[];
    private allMeasure: Levels[];
    private sectionID: string;
    private selectedAttributeType: string;
    public selectedCategoryTypeinPie: string;
    private levels: Levels[] = [];
    private measures: Levels[] = [];
    public showValueInPercent: boolean = false;
    private selectedMeasure: Levels[] = [];
    private selectedMeasureid: string[] = [];
    public chartDataSource = []; //TODO add interface
    private mlevels: number = 7;
    public showLabels: boolean = true;
    public showLegends: boolean = true;
    private reportColumnsList: GridColumnSettings[];
    public reportGridConfig: GridConfig;
    public pieChart_title: string;
    public barChart_title: string;
    public barGraphSeries: BarGraphSeries[] = [];
    public width: number;
    private maxwidth: number = 40;
    public showLabelsBarGraph: boolean = true;

    constructor(
        private readonly translate: TranslateService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly sharedService: SharedService,
        private readonly dictConfigService: DictConfigService,
        private readonly dialog: MatDialog,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly decimalPipe: DecimalPipe,
        
    ) {
        this.labelContent = this.labelContent.bind(this);
    }

    public ngOnInit(): void {
        this.pogChartHeaderMenuShowHide.isPin = this.isPin;
        this.inIt();
        this._subscriptions.add(
            this.sharedService.updateCharts.subscribe((res) => {
                if (res) {
                    this.inIt();
                }
            }),
        );
    }

    public ngOnDestroy(): void {
        if (this._subscriptions) {
            this._subscriptions.unsubscribe();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes.pogData && changes.pogData.currentValue) {
            this.inIt();
        }
    }

    private changeSideNavWidthtoMax(id: string, event): void {
        if (id == 'maximize') {
            this.maxwidth = 60;
            this.width = 60;
            this.changeSideNavWidth(id, event);
        }
        if (id == 'minimize') {
            this.maxwidth = 40;
            this.width = 40;
            this.changeSideNavWidth(id, event);
        }
        this.pogChartHeaderMenuShowHide.maxwidth = this.width;
    }

    public changeSideNavWidth(action: string, event: PointerEvent): void {
      this.width = this.PogSideNavStateService.changeSideNavWidth(action, this.width);
        event.stopPropagation();
    }

    private onpinUnpin(): void {
        this.isPin = !this.isPin;
        this.onPinUnpintoggle.emit(this.isPin);
        this.pogChartHeaderMenuShowHide.isPin = this.isPin;
    }

    private onclose(): void {
        let gettxt = document.getElementById('AC');
        gettxt.style.fontWeight = '500';
        this.PogSideNavStateService.activeVeiw = this.PogSideNavStateService.activeVeiw == PogSideNaveView.CHARTS ? null : "" as any;
        this.viewComponentInSideNav.emit(false);
    }

    private openSettings(): void {
        this.selectedChartType = this.getChartType().find(x=>x.Selected == true).ID;
        let settingsData: ChartSettingData = {
            chartTypeList: this.chartTypeList,
            selectedChartType: this.selectedChartType,
            selectedAttributeType: this.selectedAttributeType,
            levels: this.levels,
            selectedCategoryTypeinPie: this.selectedCategoryTypeinPie,
            measures: this.measures,
            selectedMeasureid: this.selectedMeasureid,
            mlevels: this.mlevels,
            showLabels: this.showLabels,
            showLegends: this.showLegends,
            showValueInPercent: this.showValueInPercent,
            emitTYpe: '',
        };
        const dialogRef = this.dialog.open(AnalysisSettingComponent, {
            width: '60vw',
            height: '60vh',
            data: settingsData,
        });
        this._subscriptions.add(
            dialogRef.componentInstance.emitSelectedTemplate.subscribe((res) => {
                this.chartTypeList = res.data.chartTypeList;
                this.selectedChartType = res.data.selectedChartType;
                this.pogChartHeaderMenuShowHide.selectedChartType = this.selectedChartType;
                this.selectedAttributeType = res.data.selectedAttributeType;
                this.levels = res.data.levels;
                this.selectedCategoryTypeinPie = res.data.selectedCategoryTypeinPie;
                this.measures = res.data.measures;
                this.selectedMeasureid = res.data.selectedMeasureid;
                this.mlevels = res.data.mlevels;
                this.showLabels = res.data.showLabels;
                this.showLegends = res.data.showLegends;
                this.showValueInPercent = res.data.showValueInPercent;
                if (res.emitTYpe == 'refreshAnalysisCharts') {
                    this.refreshAnalysisCharts();
                }
                if (res.emitTYpe == 'changeAttributeType') {
                    this.changeAttributeType();
                }
                if (res.emitTYpe == 'oncheckboxChange') {
                    this.oncheckboxChange();
                }
                if (res.emitTYpe == 'onChartTypeChange') {
                    this.onChartTypeChange();
                }
            }),
        );
    }

    private exportAsExcel(): void {
        this.agReportGrid.exportToExcel();
    }

    private exportChartPdf(): void {
        if (this.selectedChartType === SelectedDisplayType.PIE_CHART) {
            this.exportScaledChart(this._pieChart, 'pieChart');
        }
        if (this.selectedChartType === SelectedDisplayType.BAR_GRAPH) {
            this.exportScaledChart(this._barChart, 'BarChart');
        }
        if (this.selectedChartType === SelectedDisplayType.GRID_VIEW) {
            this.agReportGrid.exportToPDF('KendoPivotGrid.pdf');
        }
    }

    private exportScaledChart(chart: ChartComponent, PDFName: string): void {
        const visual = chart.exportVisual();
        const content = new Group();

        content.append(visual);
        fit(content, PAGE_RECT);

        this.exportElement(content, PDFName);
    }

    private exportElement(element: Group, PDFName: string): void {
        exportPDF(element, {
            paperSize: 'auto',
            margin: '1cm',
        }).then((dataURI) => {
            saveAs(dataURI, PDFName);
        });
    }

    private exportChartSVG(): void {
        if (this.selectedChartType === SelectedDisplayType.PIE_CHART) {
            this._pieChart.exportSVG().then((dataURI) => {
                saveAs(dataURI, 'pieChart');
            });
        }
        if (this.selectedChartType === SelectedDisplayType.BAR_GRAPH) {
            this._barChart.exportSVG().then((dataURI) => {
                saveAs(dataURI, 'BarChart');
            });
        }
    }

    private oncheckboxChange(): void {
        this.selectedMeasure = [];
        for (let value of this.selectedMeasureid) {
            let measureObject = this.measures.find((item) => item.Id == value);
            this.selectedMeasure.push(measureObject);
        }
        this.getChartDataSource(this.selectedChartType);
    }

    private changeAttributeType(): void {
        this.getChartDataSource(this.selectedChartType);
    }

    private refreshAnalysisCharts(): void {
        this.getChartDataSource(this.selectedChartType);
    }

    private onChartTypeChange(): void {
        this.getChartDataSource(this.selectedChartType);
    }

    private transformPositionArrBasedOnSelectedLevel(positions, selectedLevelObj: Levels[]): object[] {
        //TODO add param type should get from another interface
        //TODO add return type interface
        let newArr = [];
        let types = {};
        for (let d of positions) {
            let cur = d;
            let levelValue = this.sharedService.getObjectField(cur.$id, selectedLevelObj[0].field, this.sectionID);
            if (typeof levelValue != 'string') {
                levelValue = levelValue.toString();
            }
            levelValue = levelValue.replace(/ /g, '_');
            if (!(levelValue in types)) {
                types[levelValue] = { selectedLevel: levelValue, Positions: [] };
                newArr.push(types[levelValue]);
            }
            types[levelValue].Positions.push(cur);
        }
        return newArr;
    }
    //Modify chart data source based on maximum number of levels(input field) to be shown
    private reModifyChartDataSource(dsChart): void {
        //TODO add param type
        if (this.mlevels && this.mlevels != 0) {
            if (this.mlevels < this.chartDataSource.length) {
                if (this.selectedChartType == SelectedDisplayType.PIE_CHART) {
                    this.chartDataSource = dsChart.sort((a, b) => b[this.selectedCategoryTypeinPie] - a[this.selectedCategoryTypeinPie])
                    let othersVal = 0;
                    let newchartDataSource = [];

                    this.chartDataSource.forEach((val, i) => {
                        if (i < this.mlevels) {
                            newchartDataSource.push(val);
                        } else {
                            othersVal += val[this.selectedCategoryTypeinPie];
                        }
                    })

                    let data: any = {};
                    data[this.selectedCategoryTypeinPie] = Math.round(othersVal * 100) / 100;
                    data.SubClass = 'Others';
                    newchartDataSource.push(data);
                    this.chartDataSource = newchartDataSource;
                } else if (this.selectedChartType == SelectedDisplayType.BAR_GRAPH) {
                    this.chartDataSource = dsChart.sort((a, b) => b[this.selectedMeasure[0].Id] - a[this.selectedMeasure[0].Id])
                    let othersVal = {};
                    let newchartDataSource = [];
                    for (const [i, val] of this.chartDataSource.entries()) {
                        if (i < this.mlevels) {
                            newchartDataSource.push(val);
                        } else {
                            this.selectedMeasure.forEach((selectedMeasureObj) => {
                                if (typeof othersVal[selectedMeasureObj.Id] == 'undefined')
                                    othersVal[selectedMeasureObj.Id] = 0;
                                othersVal[selectedMeasureObj.Id] += val[selectedMeasureObj.Id];
                            });
                        }
                    }
                    let data: any = {};
                    this.selectedMeasure.forEach((selectedMeasureObj) => {
                        data[selectedMeasureObj.Id] = Math.round(othersVal[selectedMeasureObj.Id] * 100) / 100;
                    });
                    data.SubClass = 'Others';
                    newchartDataSource.push(data);
                    this.chartDataSource = newchartDataSource.sort((a, b) => b[this.selectedMeasure[0].Id] - a[this.selectedMeasure[0].Id]);
                }
            }
        }
    }

    private reModifyChartDataSourceValues(dsChartTotal, dsChart): object[] {
        //TODO add return type interface
        dsChart.forEach((obj) => {
            if (this.selectedChartType === SelectedDisplayType.PIE_CHART) {
                let selectedMeasureObj = this.selectedCategoryTypeinPie;
                //calculate percentage
                obj[selectedMeasureObj] =
                    dsChartTotal[selectedMeasureObj] === 0
                        ? 0
                        : (obj[selectedMeasureObj] / dsChartTotal[selectedMeasureObj]) * 100;
                //round of to 2 decimal places
                obj[selectedMeasureObj] = Math.round(obj[selectedMeasureObj] * 100) / 100;
            } else {
                this.selectedMeasure.forEach((selectedMeasureObj) => {
                    //calculate percentage
                    obj[selectedMeasureObj.Id] =
                        dsChartTotal[selectedMeasureObj.Id] === 0
                            ? 0
                            : (obj[selectedMeasureObj.Id] / dsChartTotal[selectedMeasureObj.Id]) * 100;
                    //round of to 2 decimal places
                    obj[selectedMeasureObj.Id] = Math.round(obj[selectedMeasureObj.Id] * 100) / 100;
                });
            }
        });
        return dsChart;
    }

    private getTotalOfAllLevels(dsChart): object {
        let data = dsChart.map((a) => Object.assign({}, a));
        let dsChartTotal = data.reduce((acc, o) => {
            for (var p in o) acc[p] = (p in acc ? acc[p] : 0) + o[p];
            return acc;
        });
        return dsChartTotal;
    }

    private getChartDataSource(chartType: number): void {
        if (chartType == this.selectedChartType && this.levels.length && this.measures.length) {
            let dsChart: any = [];
            let positions = this.sharedService.getAllPositionFromSection(this.sectionID);
            let selectedLevel = this.selectedAttributeType;
            let selectedMeasure = this.selectedCategoryTypeinPie;
            let positionsPerLevelArr: any;
            let noDataCount = 0;
            let measureValue: number;
            let selectedLevelObj = this.levels.filter((item) => item.DictionaryName == selectedLevel);
            positionsPerLevelArr = this.transformPositionArrBasedOnSelectedLevel(positions, selectedLevelObj);
            if (this.selectedChartType === SelectedDisplayType.PIE_CHART) {
                for (let levels of positionsPerLevelArr) {
                    let val = 0;
                    let data: any = {};
                    let UPCArr = [];
                    let selectedMeasureObj = this.measures.filter((item) => item.DictionaryName == selectedMeasure);
                    if (selectedMeasureObj[0].Owner == 'PackageAttributes') {
                        if (
                            selectedMeasureObj[0].AttributeType == 'Direct' ||
                            selectedMeasureObj[0].AttributeType == 'Calculated'
                        ) {
                            for (let positions of levels.Positions) {
                                let index = UPCArr.indexOf(positions.Position.Product.UPC);
                                if (index == -1) {
                                    measureValue = <number>this.sharedService.getObjectField(
                                        positions.$id,
                                        selectedMeasureObj[0].field,
                                        this.sectionID,
                                    );
                                    val += measureValue;
                                    UPCArr.push(positions.Position.Product.UPC);
                                }
                            }
                        }
                    } else {
                        for (let positions of levels.Positions) {
                            measureValue = <number>this.sharedService.getObjectField(
                                positions.$id,
                                selectedMeasureObj[0].field,
                                this.sectionID,
                            );
                            val += measureValue;
                        }
                    }
                    if (!val) {
                        noDataCount++;
                    }
                    data[this.selectedCategoryTypeinPie] = Math.round(val * 100) / 100;
                    data.SubClass = levels.selectedLevel.replace(/_/g, ' ');
                    dsChart.push(data);
                }
            } else {
                for (let levels of positionsPerLevelArr) {
                    let data: any = {};
                    for (let selectedMeasureObj of this.selectedMeasure) {
                        let UPCArr = [];
                        let val = 0;
                        if (selectedMeasureObj.Owner == 'PackageAttributes') {
                            if (
                                selectedMeasureObj.AttributeType == 'Direct' ||
                                selectedMeasureObj.AttributeType == 'Calculated'
                            ) {
                                for (let positions of levels.Positions) {
                                    let index = UPCArr.indexOf(positions.Position.Product.UPC);
                                    if (index == -1) {
                                        measureValue = <number>this.sharedService.getObjectField(
                                            positions.$id,
                                            selectedMeasureObj.field,
                                            this.sectionID,
                                        );
                                        val += measureValue;
                                        UPCArr.push(positions.Position.Product.UPC);
                                    }
                                }
                            }
                        } else {
                            for (let positions of levels.Positions) {
                                measureValue = <number>this.sharedService.getObjectField(
                                    positions.$id,
                                    selectedMeasureObj.field,
                                    this.sectionID,
                                );
                                val += measureValue;
                            }
                        }
                        if (!val) {
                            noDataCount++;
                        }
                        data[selectedMeasureObj.DictionaryName] = Math.round(val * 100) / 100;
                    }
                    data.SubClass = levels.selectedLevel.replace(/_/g, ' ');
                    dsChart.push(data);
                }
            }
            if (
                this.selectedMeasure.length == 0 ||
                (this.selectedChartType == SelectedDisplayType.PIE_CHART && noDataCount == positionsPerLevelArr.length)
            ) {
                dsChart = [];
            } else {
                if (this.showValueInPercent) {
                    let dsChartTotal = this.getTotalOfAllLevels(dsChart);
                    dsChart = this.reModifyChartDataSourceValues(dsChartTotal, dsChart);
                }
            }
            this.chartDataSource = dsChart;
            this.reModifyChartDataSource(dsChart);
            this.createShareOfSpaceChart();
            this.createShareOfSpaceChartVertical();
            if (this.selectedChartType === SelectedDisplayType.GRID_VIEW) {
                //gridview
                this.createShareComparisonChart(this.chartDataSource);
            }
        }
    }

    private createShareOfSpaceChart(): void {
        let selectedLevel = this.levels.find((item) => item.Id == this.selectedAttributeType);
        let selectedMeasure = this.measures.find((item) => item.Id == this.selectedCategoryTypeinPie);
        this.pieChart_title = '' + selectedLevel?.Name + '-' + selectedMeasure?.Name + '';
    }

    public labelContent(args: LegendLabelsContentArgs): string {
        if (this.selectedChartType === SelectedDisplayType.PIE_CHART) {
            if (this.showValueInPercent) {
                return `${args.dataItem.SubClass}: ${args.dataItem[this.selectedCategoryTypeinPie]}%`;
            } else {
                return `${args.dataItem.SubClass}: ${this.decimalPipe.transform(args.dataItem[this.selectedCategoryTypeinPie], '1.2-2')}`;
            }
        }
        if (this.selectedChartType === SelectedDisplayType.BAR_GRAPH) {
            if (this.showValueInPercent) {
                return `${args.value}%`;
            } else {
                return `${this.decimalPipe.transform(args.value, '1.2-2')}`;
            }
        }
    }

    private createShareOfSpaceChartVertical(): void {
        let selectedLevel: any = this.levels.find((item) => item.Id == this.selectedAttributeType);
        let _confColumns: BarGraphSeries[] = [];
        this.barChart_title = '' + selectedLevel.Name + ' -';

        for (let d of this.selectedMeasure) {
            if (this.showChartInPercent) {
                let obj = { name: d.Name, field: 'percent' + d.Id, categoryField: 'SubClass' };
                _confColumns.push(obj);
            } else {
                let obj = { name: d.Name, field: d.Id, categoryField: 'SubClass' };
                _confColumns.push(obj);
            }
            this.barChart_title += ' ' + d.Name + ',';
        }
        this.barChart_title = this.barChart_title.substring(0, this.barChart_title.length - 1);
        this.barGraphSeries = _confColumns;
    }

    private createShareComparisonChart(dsChart: object[]): void {
        dsChart = dsChart.sort((a, b) => b[this.selectedMeasure[0].Id] - a[this.selectedMeasure[0].Id]);
        //TODO add param type interface
        let _confColumns: any[] = [];
        let selectedLevel: any = this.levels.find((item) => item.Id == this.selectedAttributeType);
        _confColumns.push({ 1: 'SubClass', 0: selectedLevel.Name });
        for (let d of this.selectedMeasure) {
            if (this.showChartInPercent) {
                let obj = { 0: d.Name, 1: 'percent' + d.Id };
                _confColumns.push(obj);
            } else {
                let obj = { 0: d.Name, 1: d.Id };
                _confColumns.push(obj);
            }
        }
        Object.entries(dsChart).forEach(([key, value]) => {
            Object.entries(value).forEach(([name, index]) => {
                 value[name] = value[name].toLocaleString(undefined, { minimumFractionDigits: 2,  maximumFractionDigits: 2 });
             });
         });
        this.reportColumnsList = _confColumns;
        this.bindgriddata(dsChart);
    }

    private bindgriddata(data: object[]): void {
        let gridColumnCustomConfig: GridColumnCustomConfig = {
            customCol: this.reportColumnsList
        }
        if (this.agReportGrid) {
            const columns = [this.agReportGrid.gridConfig.columnDefs.find(x => x.field === 'srno'), ...this.agGridHelperService.getAgGridColumns('', gridColumnCustomConfig)]
            this.agReportGrid?.gridApi?.setColumnDefs(columns);
            this.agReportGrid?.gridApi?.setRowData(data);
        } else {
            this.reportGridConfig = {
                ...this.reportGridConfig,
                id: 'attachment_Grid',
                columnDefs: this.agGridHelperService.getAgGridColumns('', gridColumnCustomConfig),
                data,
                height: 'calc(100vh - 11em)',
                hideColumnConfig: true
            }
        }
    }

    private allMeasurePromise(chartType: number): void {
        const measureDataDictionary = this.allMeasure.map((a) => ({
            IDDictionary: a.IDDictionary,
            Selected: a.Selected
        }));
        this.measures = this.dictConfigService.dictionaryConfigCollection(measureDataDictionary as Dictionary[]) as any;
        for (let d of this.measures) {
            d.Id = d.DictionaryName;
            d.Name = d.value;
        }
        this.selectedMeasure = [this.measures.find(x => x.Selected == true)];
        this.selectedMeasureid = [this.measures.find(x => x.Selected == true).Id];
        this.selectedCategoryTypeinPie = this.measures.find(x => x.Selected == true).Id;

        const levelDataDictionary = this.allLevel.map((a) => ({
            IDDictionary: a.IDDictionary,
            Selected: a.Selected
        }));
        this.levels = this.dictConfigService.dictionaryConfigCollection(levelDataDictionary as Dictionary[]) as any;
        for (let d of this.levels) {
            d.Id = d.DictionaryName;
            d.Name = d.value;
        }
        this.selectedAttributeType = this.levels.find(x => x.Selected == true).Id; //this.levels[1].Id;
        this.getChartDataSource(chartType);
    }

    private inIt(): void {
        this.width = this.PogSideNavStateService.chartsView.width;
        this.pogChartHeaderMenuShowHide.maxwidth = this.width;
        this.sectionID = this.sharedService.activeSectionID;
        this.chartTypeList = this.getChartType();
        this.pogChartHeaderMenuShowHide.selectedChartType = this.chartTypeList.filter(x=>x.Selected == true);
        this.selectedChartType = this.pogChartHeaderMenuShowHide.selectedChartType[0].ID;
        this.dynamicCharts = this.planogramStore.appSettings.analysisCharts;
        this.allLevel = this.dynamicCharts.LEVEL;
        this.allMeasure = this.dynamicCharts.MEASURE;
        this.allMeasurePromise(this.selectedChartType);
    }

    public menuButtonClick_Chart(response): void {
        let selectedMenu = response.data;
        if (selectedMenu) {
            switch (selectedMenu.key.trim()) {
                case 'pogChartView_SETTINGS':
                    this.openSettings();
                    break;
                case 'pogChartView_EXPORTEXCEL':
                    this.exportAsExcel();
                    break;
                case 'pogChartView_EXPORTPDF':
                    this.exportChartPdf();
                    break;
                case 'pogChartView_EXPORTSVG':
                    this.exportChartSVG();
                    break;
                case 'pogChartView_REFRESH':
                    this.refreshAnalysisCharts();
                    break;
                case 'pogChartView_FULLSCREENOPEN':
                    this.changeSideNavWidthtoMax('maximize', response.event);
                    break;
                case 'pogChartView_FULLSCREENCLOSE':
                    this.changeSideNavWidthtoMax('minimize', response.event);
                    break;
                case 'pogChartView_PIN':
                case 'pogChartView_UNPIN':
                    this.onpinUnpin();
                    break;
                case 'pogChartView_CLOSE':
                    this.onclose();
                    break;
            }
        }
    }

    private getChartType(): ChartType[] {
        const chartTypes: ChartType[] = this.planogramStore.appSettings.analysisCharts['CHART'];
        return chartTypes;
    }
    
}
