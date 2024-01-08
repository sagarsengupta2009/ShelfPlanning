import { Component, OnInit, Input, OnDestroy, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { ParamMPCardComponent } from './param-mpcard/param-mpcard.component';
import { ReportTemplateComponent } from './report-template/report-template.component';
import {
    PlanogramService,
    PlanogramRendererService,
    AgGridHelperService,
    SharedService,
    UserPermissionsService,
    ReportandchartsService,
    PlanogramStoreService,
    NotifyService,
    ConfigService,
    AppSettingsService,
    HighlightService,
    DictConfigService,
    SearchService,
} from 'src/app/shared/services';
import { TranslateService } from '@ngx-translate/core';
import { ReportData, ReportList, ArrayList, RadioBtnGroup, BayArrayList, PanelSplitterViewType, MenuItemSummary, Menu, SortedGuidList, IApiResponse, HighlightTemplate, Dictionary, RangeModelValues, RangeModelPosition } from 'src/app/shared/models';
import { ReportMode } from 'src/app/shared/models/print';
import { StoreCardComponent } from './store-card/store-card.component';
import { Position, Section } from 'src/app/shared/classes';
import { SplitterService } from 'src/app/shared/services/layouts/space-automation/dashboard/splitter/splitter.service';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { ColorPalette, FieldObjectChosen, HighLightOptions, HighlightTypeKey, IdPogObjectList, LookUpType, TBATemplateOptions, TemplateOptions } from 'src/app/shared/models/highlight';
import { Utils } from 'src/app/shared/constants/utils';
import { sortBy, uniqBy } from 'lodash';
import { Context } from 'src/app/shared/classes/context';
@Component({
    selector: 'sp-report-charts',
    templateUrl: './report-charts.component.html',
    styleUrls: ['./report-charts.component.scss'],
})
export class ReportChartsComponent implements OnInit, OnDestroy {
    @ViewChild(`paramMPCardComponent`) paramMPCardComponent: ParamMPCardComponent;
    @ViewChild(`StoreCardComponent`) storeCardComponent: StoreCardComponent;
    @ViewChild(`ReportTemplateComponent`) reportTemplateComponent: ReportTemplateComponent;
    @ViewChild(`agReportGrid`) agReportGrid: AgGridComponent;
    @Input() pogData;
    private sectionId: string;
    public pogName: string = '';
    private priorityFlag = true;
    private reportGridData: ReportData[] = [];
    public reportTypeList: ReportList[] = [];
    public selectedReportType: ReportList;
    public paramMPCard: boolean = false;
    public storeCard: boolean = false;
    public highLightSVG: any;
    private reportTemplate: boolean = false;
    public isHighlightEnabled: boolean = true;
    public merchReportDetails: boolean = false;
    public labelDetails: boolean = false;
    public orientationDetails: boolean = false;
    public printByWidth: boolean = false;
    public radioButtonGroup: RadioBtnGroup[] = [];
    public byBay: number = 1;
    public NoOfBays: BayArrayList[] = [];
    private enableBaysDropdown: boolean = false;
    public selectedBays: number;
    public printByWidthtext: string;
    public printOrientation: ArrayList[] = [];
    public selectedprintOrientation: number;
    public PrintMode: ArrayList[] = [];
    public selectedPrintMode: number;
    public printOrder: ArrayList[] = [];
    public selectedPrintOrder: number;
    public labelFlag: boolean = false;
    public labelFlagplaceHolder: string;
    public labelCalcTypeList = [
        { text: 'Optimized', value: 'canvas' },
        { text: 'Sharp', value: 'd3' },
    ];
    public labelCalcType: string;
    public shelfLabelFlag: boolean = false;
    public shelfLabelFlagPlaceHolder: string;
    public annotationFlag: boolean = false;
    private labelTypeList = [{ text: 'Customized', value: 2 }];
    private labelType: number;
    private subscriptions: Subscription = new Subscription();
    public reportGridConfig: GridConfig;
    public splitterOrientation: number;
    public highlightList: HighlightTemplate[] = [];
    public userHighLightList: SortedGuidList[] = []; 
    public positionDataWithHighlightColor: IdPogObjectList[] = [];
    private position: Position[] = [];
    public selectedHighLight: string;
    private legends: any[] = [];
    private type: LookUpType[] = [];
    private rangeModel: any[] =[];
    private values: Array<RangeModelValues> = [];
    private valuesCount: Array<RangeModelValues> = [];
    private destArray: Position[];
    private inputRangeModel: TemplateOptions;
    private sliderRange: number[];
    private modelSP_startcolor: string;
    private modelSP_middlecolor: string;
    private modelSP_endcolor: string;
    private modelSP_startval: number = 0;
    private modelSP_middleval: number = 0;
    private modelSP_endval: number = 0;
    private modelSP_startLabel: string;
    private modelSP_middleLabel: string;
    private modelSP_endLabel: string;
    private highLightOptions: HighLightOptions;
    constructor(
        private reportchartsService: ReportandchartsService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly notifyService: NotifyService,
        public readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly translate: TranslateService,
        private readonly planogramRendererService: PlanogramRendererService,
        private readonly userPermissions: UserPermissionsService,
        private readonly splitterService: SplitterService,
        private readonly config: ConfigService,
        private readonly appSettingsService: AppSettingsService,
        private readonly highlightService: HighlightService,
        private readonly planogramRender: PlanogramRendererService,
        private readonly dictConfigService: DictConfigService,
        private readonly searchService: SearchService
    ) { }

    ngOnInit(): void {
        this.sectionId = this.sharedService.activeSectionID;
        this.reportchartsService.currentPlanogramData = this.pogData;
        this.pogName = `${this.pogData.Name}-${this.pogData.IDPOG}`;
        this.getReportList();
        this.refreshReport();
        this.fetchBaysCount();
        this.fetchPrintMode();
        this.fetchPrintOrientation();
        this.fetchPrintOrder();
        this.labelCalcType = this.labelCalcTypeList[0].value;
        this.labelFlagplaceHolder = `Position ${this.translate.instant('PRINT_REPORT_LABEL_ON_OFF')}`;
        this.shelfLabelFlagPlaceHolder = `Shelf ${this.translate.instant('PRINT_REPORT_LABEL_ON_OFF')}`;
        this.radioButtonGroup = [
            { Name: this.translate.instant('PRINT_REPORT_BAYSPERPAGE'), Value: 1 },
            { Name: this.translate.instant('Print By Width (eg. 5-12,14-22)'), Value: 2 },
        ];
        this.type = this.highlightService.getHighlightOptions();
        this.labelType = this.labelTypeList[0].value;
        this.splitterOrientation = this.splitterService.splitterOrientation;
        this.highlightList = this.highlightService.getTemplates().filter(x => x.GUID);
        this.highlightList.unshift({ name: this.translate.instant('SELECT_OPTION'),
        value: 'Select', readonly: false, 
        options: { highlightType: '' },
        GUID: 'Select', isDefault: false, 
        isCount: false,excludeZeroVal: false });
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    private getReportList(): void {
        this.subscriptions.add(
            this.reportchartsService.getReportList().subscribe((res) => {
                for (let report of res.Data) {
                    if (report.Group == null) {
                        report.Group = 'Others';
                    }
                }
                this.reportTypeList = res.Data;
            }),
        );
        this.subscriptions.add(
            this.appSettingsService.getAppSettingsByName<SortedGuidList[]>('HIGHLIGHT_USR_TEMPLATE_ORDER', 'POG')
                .subscribe((res: SortedGuidList[]) => {
                    this.userHighLightList = res;
            })
        );
    }

    private fetchBaysCount(): void {
        this.NoOfBays = [];
        let sectionObj = this.sharedService.getObject(this.sectionId, this.sectionId) as Section;
        let allModularCollection = this.sharedService.getAllModulars(sectionObj);
        let totalNoOfbays = allModularCollection.length;
        if (totalNoOfbays > 0) {
            this.enableBaysDropdown = false;
            for (let i = 0; i < totalNoOfbays; i++) {
                this.NoOfBays.push({ value: i + 1, text: i + 1 });
            }
        } else {
            this.enableBaysDropdown = true;
            this.NoOfBays = [{ value: 1, text: 1 }];
        }
        this.selectedBays = this.NoOfBays[0].value;
    }

    private fetchPrintOrientation(): void {
        let data = this.planogramStore.lookUpHolder;
        this.printOrientation = data.PRINT_ORIENTATION.options;
        this.selectedprintOrientation = this.printOrientation[0].value;
    }

    private fetchPrintMode(): void {
        let data = this.planogramStore.lookUpHolder;
        this.PrintMode = data.SVG_RENDRING_MODE.options;
        this.selectedPrintMode = 3;
    }

    private fetchPrintOrder(): void {
        let data = this.planogramStore.lookUpHolder;
        this.printOrder = data.PogReportPrintOption.options;
        this.selectedPrintOrder = this.printOrder[0].value;
    }

    public get checkPrintPogPermission(): boolean {
        return this.userPermissions.hasUpdatePermission('POGPRINT');
    }

    public get hasAbilityToSubmitRequest(): boolean {
        if (!this.selectedReportType) {
            return true;
        }
        if (this.selectedReportType.ParameterGroupName == 'MP') {
            if (!this.paramMPCardComponent.selComType) {
                return true;
            }
            switch (this.paramMPCardComponent.selComType) {
                case 1:
                    if (!this.paramMPCardComponent.selScenario) {
                        return true;
                    }
                    break;
                case 3:
                    if (!this.paramMPCardComponent.selectedPlanogram) {
                        return true;
                    }
                    break;
                case 2:
                    if (!this.paramMPCardComponent.storeCardComponent?.selectedPlanogram3) return true;
                    if (!this.paramMPCardComponent.storeCardComponent?.selectedStore) return true;
            }
        }
        return false;
    }

    public selectionChange(event): void {
        this.paramMPCard = false;
        this.merchReportDetails = false;
        this.labelDetails = false;
        this.orientationDetails = false;
        this.printByWidth = false;
        this.storeCard = false;
        this.reportTemplate = false;

        this.highLightOptions = {
            FieldNames : [],
            HighLightName : '',
            IsCount : null,
            StartArr :[],
        }
        if (event.ReportCode == 'PARAM_REPORT' || event.IsPogImage) {
            this.reportTemplate = true;
            let defaultHighLight = null;
            if(this.userHighLightList){
                defaultHighLight = this.userHighLightList.length > 0 
                                    ? this.userHighLightList.filter(x=> x.isDefault == true)[0]?.guid : null;
            }
            this.selectedHighLight = defaultHighLight ? defaultHighLight : 'Select';
            if(this.selectedHighLight){
                this.highLightChange();
            }
        }
        if (event.ParameterGroupName == 'MP') {
            this.paramMPCard = true;
        }
        if (event.ParameterGroupName == 'Store') {
            this.storeCard = true;
        }
        if (event.IsSvgConfig && !event.IsPogImage) {
            this.merchReportDetails = true;
            this.labelDetails = true;
            this.orientationDetails = true;
            this.printByWidth = true;
        }
        if (event.IsSvgConfig && event.IsPogImage) {
            this.merchReportDetails = false;
            this.labelDetails = true;
            this.orientationDetails = true;
            this.printByWidth = false;
        }
    }

    private makeHighlightOptionsFromDict = (dataDict) => {
        var field;
        if (dataDict.Owner == 'POGInventoryModel') {
            field = 'inventoryObject.' + dataDict.DictionaryName;
        } else {
            if (dataDict.DictionaryName.indexOf('_') == 0) {
                var extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                field = dataDict.DictionaryName + '.' + extendedDataField;
            } else {
                field = dataDict.DictionaryName;
            }
        }
        return field;
    }

    public highLightChange(): void {
        this.position = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);;
        if(this.selectedHighLight && this.selectedHighLight != 'Select'){
            this.planogramService.templateRangeModel = {
                defaultColor: '#8B8B8B',
                defaultLabel: 12345,
                fieldObjectChosen: {},
                fieldStr: '',
                highlightType: '',
                numericRangeAttr: {},
                rangeModel: [],
                spectrumAttr: { modelSP_legend: false },
                stringMatchAttr: {},
            };
            this.highLightOptions = {
                FieldNames : [],
                HighLightName : '',
                IsCount : null,
                StartArr :[],
            }
            let type = this.type.filter(item => item.value.toUpperCase().replaceAll(' ','_') == this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.highlightType.toUpperCase().replaceAll(' ','_'));
            let tempfield = this.dictConfigService.dictionaryConfigCollection(type[0].options as Dictionary[]) as any;
            for (let field of tempfield) {
                field.name = field.value;
                field.dataType = Utils.typeForPropGrid(field.DataType);
                field.mapping = 0;
                field.value = this.makeHighlightOptionsFromDict(field);
                field.FieldPath = Utils.makeCalculatedFieldFromDict(field, false);
                if (field.AttributeType == 'Calculated') {
                    field.calculatedFieldPath = Utils.makeCalculatedFieldFromDict(field, true);
                } else {
                    field.calculatedFieldPath = null;
                }
                field.mapping = 0;
                field.dataType = Utils.typeForPropGrid(field.DataType);
                if (field.LkUpGroupName != null && field.LkUpGroupName && field.LkUpGroupName != '') {
                    field.FieldPath = field.FieldPath + 'text';
                }
                field.field = field.FieldPath;
            }
            this.planogramService.lookupHL = [];
            this.planogramService.templateRangeModel = {};
            this.planogramService.lookupHL = tempfield;
            this.planogramService.templateRangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options;
            this.planogramService.modelHLField(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['fieldStr']);
            this.highLightOptions.HighLightName = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].name;
            let highLightType = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.highlightType.toUpperCase().replaceAll(' ','_');
            if(highLightType == HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY){
                this.planogramService.TopBottomAnalysisData = {};
                this.planogramService.templateRangeModel.count ? this.applyTemplateCount() : this.applyTemplate();
            }
            if(highLightType == HighlightTypeKey.NUMERIC_RANGE_KEY){
                this.applyNumericTemplate();
            }
            if(highLightType == HighlightTypeKey.COLOR_SCALE_KEY){
                this.applyColorScaleTemplate();
            }
            if(highLightType == HighlightTypeKey.QUADRANT_ANALYSIS_KEY){
                this.applyQuadrantTemplate();
            }
            let defaultColor = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['defaultColor'];
            this.position.forEach((dataItem) => {
                let color =dataItem.highlightColor(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options, dataItem);
                dataItem.backgroundColor =  !color ? '' : color;
            });
            this.legends = [];
            this.highLightOptions.FieldNames.push(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['fieldStr']);
            if(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.hasOwnProperty('fieldStrQ')){
                this.highLightOptions.FieldNames.push(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['fieldStrQ']);
            }
            if(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.hasOwnProperty('count')){
                this.highLightOptions.IsCount = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['count'];
            }
            switch (this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.highlightType.toUpperCase().replaceAll(' ','_')) {
                case HighlightTypeKey.STRING_MATCH_kEY:
                    this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['rangeModel'];
                    this.rangeModel.forEach(item=>{
                    this.legends.push({color: !item.color ? defaultColor : item.color, value: item.value});
                });
                    break;
                case HighlightTypeKey.NUMERIC_RANGE_KEY:
                    this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['rangeModel'];
                    for (let i = 0; i < this.rangeModel.length -1 ; i++) {
                        if(i == 0){
                            this.legends.push({ color: !this.rangeModel[i].color ? defaultColor : this.rangeModel[i].color, value: this.rangeModel[i].num + ' - ' +  this.rangeModel[i + 1].num });
                        }
                        else {
                            this.legends.push({ color: !this.rangeModel[i].color ? defaultColor : this.rangeModel[i].color, value: (this.rangeModel[i].num + 0.01).toFixed(2) + ' - ' + this.rangeModel[i + 1].num });
                        }
                    }
                    break;
                case HighlightTypeKey.COLOR_SCALE_KEY:
                    this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['spectrumAttr'];
                    this.legends.push({color: this.rangeModel['modelSP_startcolor'], value: 'Start: ' + this.rangeModel['modelSP_startval']});
                    this.legends.push({color: this.rangeModel['modelSP_middlecolor'], value: 'Mid Point: ' + this.rangeModel['modelSP_middleval']});
                    this.legends.push({color: this.rangeModel['modelSP_endcolor'], value: 'End : ' +  this.rangeModel['modelSP_endval']});
                    break;
                case HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY:
                    if(this.planogramService.templateRangeModel.count){
                        this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['rangeModelCount']['rangeValues'];
                        this.rangeModel.forEach(item=>{
                            this.legends.push({color: item.color, value: item.inset + ' : ' + item.value});
                        });
                    }
                    else {
                        this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['rangeModel']['rangeValues'];
                        this.rangeModel.forEach(item=>{
                            this.legends.push({color: item.color, value: item.actPer + ' : ' + item.value});
                        });
                    }
                    break;
                case HighlightTypeKey.QUADRANT_ANALYSIS_KEY:
                    this.rangeModel = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['rangeModel'];
                    this.rangeModel.forEach(item=>{
                        this.legends.push({color: item.color, value: item.value});
                    });
                    if(this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options.hasOwnProperty('startArr')){
                        let startAr = this.highlightList.filter(elm => elm.GUID == this.selectedHighLight)[0].options['startArr'];
                        startAr.forEach(item=>{
                            this.highLightOptions.StartArr.push(item);
                        })
                    }
                    break;
            }
            this.positionDataWithHighlightColor = this.position.map((a) => Object.assign({}, { idPogObject: a.IDPOGObject, backgroundColor: a.backgroundColor })) as any;
        }
    }

    public SelectedItem(event: { data: ReportData, fieldName: string, iconName: string }): void {
        switch (event.iconName) {
            case `visibility`:
                this.openReport(event.data);
                break;
            case `delete`:
                this.deleteReport(event.data);
                break;
            case `refresh`:
                this.refreshGridRow(event.data);
                break;
        }
    }

    private refreshGridRow(dataItem: ReportData): void {
        if (dataItem.IDReportStatus == 2 || dataItem.IDReportStatus == 3) {
            return;
        }
        this.subscriptions.add(
            this.reportchartsService.refreshReportRow(dataItem.Id).subscribe((res) => {
                if (res && res.Data) {
                    let index = this.reportGridData.findIndex((item) => item.Id == dataItem.Id);
                    this.reportGridData[index].TimeSpan = this.timeSpanDivision(res.Data);
                    this.reportGridData[index].Status = res.Data.Status;
                    this.reportGridData[index].IDReportStatus = res.Data.IDReportStatus;
                    if (this.reportGridData[index].IDReportStatus == 2) {
                        this.reportGridData[index].Url = res.Data.Url;
                    }
                    this.bindgriddata(this.reportGridData);
                }
            }),
        );
    }

    private deleteReport(dataItem: ReportData): void {
        if (dataItem.IDReportStatus == 2 || dataItem.IDReportStatus == 3) {
            this.subscriptions.add(
                this.reportchartsService.deleteReport(dataItem.Id).subscribe((res) => {
                    if (res && res.Log.Summary.Error) {
                        this.notifyService.error(res.Log.Details[0].Message);
                    } else {
                        this.refreshReport();
                    }
                }),
            );
        } else {
            return;
        }
    }

    private openReport(dataItem: ReportData): void {
        if (dataItem.IDReportStatus == 3 || dataItem.IDReportStatus != 2) {
            return;
        }
        if (!dataItem.Url) {
            return;
        }
        let reportUrl = dataItem.Url;
        let isHttpUrl = reportUrl.indexOf('file');
        if (isHttpUrl == -1) {
            var win = window.open(dataItem.Url, '_blank');
            win.focus();
        } else {
            this.forceDownload(dataItem.Url);
        }
    }

    private forceDownload(link: string): void {
        let ua = window.navigator.userAgent;
        let msie = ua.indexOf('MSIE ');

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            window.open(link, 'Download');
        } else {
            let myTempWindow = window.open(link, '_blank');
            myTempWindow.focus();
        }
    }

    public refreshReport(): void {
        this.subscriptions.add(
            this.reportchartsService.getReport(this.pogData.IDPOG).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else {
                    this.reportGridData = res.Data;
                    for (let report of this.reportGridData) {
                        report.Status = this.planogramStore.lookUpHolder.REPORTSTATUS.options.find(ele => ele.value === report.IDReportStatus).text
                        report.TimeSpan = this.timeSpanDivision(report);
                    }
                    this.bindgriddata(this.reportGridData);
                }
            }),
        );
    }

    private timeSpanDivision(data: ReportData): string {
        let timeslot = Math.abs(data.TimeSlot);
        let w = 0;
        //example of return - e: 4 days ago
        if (timeslot < 7) {
            if (timeslot == 0) {
                return `${this.sortStringAdd('day', timeslot)}${this.translate.instant('REPORT_TIMESLOT_RECENTLY')}`;
            }
            if (timeslot == 1) {
                return `${this.sortStringAdd('day', timeslot)}${this.translate.instant('REPORT_TIMESLOT_YESTERDAY')}`;
            }

            if (timeslot > 1 && timeslot <= 6) {
                return `${this.sortStringAdd('day', timeslot)}${timeslot} ${this.translate.instant(
                    'REPORT_TIMESLOT_DAYS_AGO',
                )}`;
            }
        }

        if (timeslot < 31) {
            w = Math.floor(timeslot / 7);

            if (w == 1) {
                return `${this.sortStringAdd('week', w)}${this.translate.instant('REPORT_TIMESLOT_LAST_WEEK')}`;
            }

            if (w > 1 && w < 5) {
                return `${this.sortStringAdd('week', w)}${w} ${this.translate.instant('REPORT_TIMESLOT_WEEKS_AGO')}`;
            }
        }
        if (timeslot < 61) {
            return `${this.sortStringAdd('month', 1)}${this.translate.instant('REPORT_TIMESLOT_LAST_MONTH')}`;
        }

        return `${this.sortStringAdd('month', 2)}${this.translate.instant('REPORT_TIMESLOT_OLDER')}`; //if timeslot > 60
    }

    private sortStringAdd(time: string, val: number): string {
        let tempObj = {
            day: {
                0: 'a',
                1: 'b',
                2: 'c',
                3: 'd',
                4: 'e',
                5: 'f',
                6: 'g',
            },
            week: {
                1: 'h',
                2: 'i',
                3: 'j',
                4: 'k',
            },
            month: {
                1: 'l',
                2: 'm',
            },
        };

        return tempObj[time][val] + ': ';
    }

    public onMenuSelect(event: { menu: MenuItemSummary, data?: ReportData }): void {
        if (event?.menu?.key) {
            switch (event?.menu?.key) {
                case `reportGrid_CONTEXT_MENU_REFRESH`:
                    this.refreshReport();
                    break;
            }
        }
    }

    private bindgriddata(data: ReportData[]): void {

        if (this.agReportGrid) {
            this.agReportGrid.gridConfig.data = data;
            this.agReportGrid?.gridApi?.setRowData(data);
        } else {
            let gridContextMenus: Menu[] = this.config.getGridMenus('reportGrid');
            this.reportGridConfig = {
                ...this.reportGridConfig,
                id: 'reportGrid',
                columnDefs: this.agGridHelperService.getAgGridColumns('reportGrid'),
                data,
                height: this.splitterService.splitterOrientation == PanelSplitterViewType.OverUnder ? 'calc(100vh - 34em)' : 'calc(100vh - 11em)',
                actionFields: ['Action'],
                menuItems: gridContextMenus
            }
        }
    }

    private getPrintByWidth(allModularCollection): object[] {
        //TODO add param type
        let printByWidth = this.printByWidthtext && this.byBay == 2 ? this.printByWidthtext.split(',') : null;
        if (printByWidth) {
            //TODO Validate print by width values against min max, min < max and multiple values not overlapping.
            // Post that convert into the following structure.
            // {startWidth : 2, endWidth : 5, startModular : 1, endModular : 8}
            let printByWidth = [];
            for (const pbWidth of printByWidth) {
                let printByWidthObj: any = {}; //TODO should create interface for printByWidthObj
                printByWidthObj.startWidth = parseInt(pbWidth.split('-')[0].trim());
                printByWidthObj.endWidth = parseInt(pbWidth.split('-')[1].trim());
                if (printByWidthObj.startWidth >= printByWidthObj.endWidth) {
                    this.notifyService.warn('Start range should be lower than end range.');
                    return null;
                }
                printByWidthObj.startModular = null;
                printByWidthObj.endModular = null;
                printByWidthObj.idPogObjectArr = [];
                printByWidthObj.totalDimension = { Width: 0 };
                printByWidthObj.totalDimension.Width = printByWidthObj.endWidth - printByWidthObj.startWidth;
                let i = 0;
                for (let modularObj of allModularCollection) {
                    let modular = modularObj;
                    let dimension = modular.getXPosToPog();
                    if (
                        modularObj &&
                        dimension + modular.Dimension.Width >= printByWidthObj.startWidth &&
                        dimension <= printByWidthObj.endWidth
                    ) {
                        printByWidthObj.idPogObjectArr.push(modular.IDPOGObject);
                        printByWidthObj.startModular =
                            printByWidthObj.startModular == null ? i++ : printByWidthObj.startModular;
                        printByWidthObj.endModular = i++;
                    }
                }
                printByWidthObj.totalDimension.clipX =
                    printByWidthObj.startWidth - allModularCollection[printByWidthObj.startModular].getXPosToPog();
                printByWidth.push(printByWidthObj);
            }
            return printByWidth;
        }
        return null;
    }

    public submitReportRequest(): void {
        if (this.hasAbilityToSubmitRequest) {
            return;
        }

        //when the planogram is in modified state,throws a warning to save before generating report
        let sectionObj = this.sharedService.getObject(this.sectionId, this.sectionId) as Section;
        let currObj = this.planogramService.getCurrentObject(sectionObj.globalUniqueID);
        let checkDirty = this.planogramService.checkIfObjectDirty(currObj);
        if (checkDirty) {
            this.notifyService.warn('WARN_TOSAVE_BEFORE_REPORTREQUEST');
            return;
        }

        let defaultReportGenerateData = {
            IDPOG1: this.pogData.IDPOG,
            IDPOG2: undefined,
            IDStore: this.storeCardComponent.selectedStore ? this.storeCardComponent.selectedStore : null,
            IsCombinedReport: this.selectedReportType.IsCombinedReport,
            IsComparisonReport: this.selectedReportType.IsComparisonReport,
            IdReportTemplate: this.selectedReportType.IDReportTemplate,
            IdReport: this.selectedReportType.Id,
            ReportCode: this.selectedReportType.ReportCode,
            ReportName: this.selectedReportType.Name,
            PersistFile: true,
            IsSvgConfig: this.selectedReportType.IsSvgConfig,
            Svg: '',
            ReportMode: this.selectedReportType.ReportMode == ReportMode.SI ? 0 : 1,
            IsHighPriority: this.priorityFlag,
            PrintPogOption: undefined,
            printOrientation: undefined,
            ReportParameterString:
                this.selectedReportType.ReportCode == 'PARAM_REPORT'
                    ? this.reportTemplateComponent && this.reportTemplateComponent.reportTemplateData
                        ? JSON.stringify(this.reportTemplateComponent.reportTemplateData)
                        : []
                    : null,
            Legends : undefined,
            PositionDataWithHighlightColor: undefined,
            HighLightOptions: this.highLightOptions
        };

        if (this.paramMPCardComponent.selComType) {
            switch (this.paramMPCardComponent.selComType) {
                case 1:
                    defaultReportGenerateData.IDPOG2 = this.paramMPCardComponent.selScenario;
                    break;
                case 2:
                    if (this.paramMPCardComponent.storeCardComponent?.selectedPlanogram3 != null) {
                        defaultReportGenerateData.IDStore = this.paramMPCardComponent.storeCardComponent?.selectedStore;
                        defaultReportGenerateData.IDPOG2 =
                            this.paramMPCardComponent.storeCardComponent?.selectedPlanogram3;
                    }
                    break;
                case 3:
                    defaultReportGenerateData.IDPOG2 = this.paramMPCardComponent.selectedPlanogram;
                    break;
            }
        }
        if (this.selectedReportType.IsSvgConfig || this.selectedReportType.IsPogImage) {
            defaultReportGenerateData.printOrientation = this.selectedprintOrientation;
        }
        if (this.selectedReportType.IsSvgConfig) {
            let isImage = false;
            let isBox = false;
            let isSku = false;
            if (this.selectedPrintMode == 1) {
                isBox = true;
            } else if (this.selectedPrintMode == 2) {
                isSku = true;
            } else if (this.selectedPrintMode == 3) {
                isImage = true;
            }
            let SVGObject = null;
            defaultReportGenerateData.PrintPogOption = this.selectedPrintOrder;
            let allModularCollection = this.sharedService.getAllModulars(sectionObj);
            let printByWidth: any = this.getPrintByWidth(allModularCollection);
            if (printByWidth == -1) return;
            if (allModularCollection.length === 0 || this.selectedReportType.IsPogImage) {
                let parameters = {
                    labels: this.labelFlag,
                    labelType: this.labelType,
                    calcMechanism: this.labelCalcType,
                    shelfLabelFlag: this.shelfLabelFlag,
                    annotationFlag: this.annotationFlag,
                    byModular: false,
                    generateImageRect: isImage,
                    generateBoxRect: isBox,
                    generateSKURect: isSku,
                };
                SVGObject = {
                    Content: this.planogramRendererService.SVG(sectionObj, 1, parameters),
                    IdPogObjectArr: [sectionObj.IDPOG],
                };
                defaultReportGenerateData.Svg = '';
            } else {
                let modularPerPage = this.selectedBays;
                let totalModularCount = allModularCollection.length;
                let totalPossiblePages = printByWidth
                    ? printByWidth.length
                    : Math.ceil(totalModularCount / modularPerPage);
                let start = 0;
                let end = 0;
                let parameters;
                let customDefs = '';
                let leftShiftOfPage = 0;
                for (let j = 1; j <= totalPossiblePages; j++) {
                    parameters = {
                        labels: this.labelFlag,
                        labelType: this.labelType,
                        calcMechanism: this.labelCalcType,
                        shelfLabelFlag: this.shelfLabelFlag,
                        annotationFlag: this.annotationFlag,
                        clipX: 0,
                        clipWidth: 0,
                        idPogObjectArr: [],
                        totalDimension: { Width: 0 },
                        byClip: false,
                        byModular: true,
                        generateImageRect: isImage,
                        generateBoxRect: isBox,
                        generateSKURect: isSku,
                        page: j,
                        startWidth: printByWidth ? printByWidth[j - 1].startWidth : null,
                        endWidth: printByWidth ? printByWidth[j - 1].endWidth : null,
                    };
                    if (printByWidth) {
                        parameters.idPogObjectArr = printByWidth[j - 1].idPogObjectArr;
                        parameters.totalDimension = printByWidth[j - 1].totalDimension;
                    } else {
                        let end = j * modularPerPage;
                        let start = end - modularPerPage;
                        parameters.clipX = allModularCollection[start].Location.X;
                        for (let i = start; i < end; i++) {
                            if (allModularCollection[i] != undefined) {
                                parameters.idPogObjectArr.push(allModularCollection[i].IDPOGObject);
                                parameters.totalDimension.Width += allModularCollection[i].Dimension.Width;
                                parameters.clipWidth += allModularCollection[i].Dimension.Width;
                            }
                        }
                        // For subsequent pages track how much width existed to the left of it.
                        // This is used in annotation positioning as annotations are positioned from left bottom of section.
                        parameters.leftShiftOfPage = leftShiftOfPage;
                        leftShiftOfPage += parameters.totalDimension.Width;
                    }
                    let idPogObjectsInPage: string = '';
                    for (const [k, element] of parameters.idPogObjectArr.entries()) {
                        if (k !== 0) {
                            idPogObjectsInPage += ',';
                        }
                        idPogObjectsInPage += element;
                    }

                    customDefs += `<shelf:custom page='${j}' clipX='${parameters.totalDimension.clipX || parameters.clipX
                        }' width='${parameters.totalDimension.Width}' idPogObjects = '${idPogObjectsInPage}' />`;
                    SVGObject = {
                        Content: this.planogramRendererService.SVG(sectionObj, 1, parameters),
                        IdPogObjectArr: parameters.idPogObjectArr,
                        startWidth: parameters.startWidth,
                        endWidth: parameters.endWidth,
                    };
                    defaultReportGenerateData.Svg = '';
                }
            }
        }

        if(this.selectedReportType.ReportCode == 'PARAM_REPORT' || this.selectedReportType.IsPogImage){
            let isImage = false;
            let isBox = false;
            let isSku = false;
            if (this.reportTemplateComponent.reportTemplateData.filter(item => item.Name == 'DisplayMode')[0].Value == 'BOX') {
                isBox = true;
            } else if (this.reportTemplateComponent.reportTemplateData.filter(item => item.Name == 'DisplayMode')[0].Value == 'SKU') {
                isSku = true;
            } else if (this.reportTemplateComponent.reportTemplateData.filter(item => item.Name == 'DisplayMode')[0].Value == 'Image') {
                isImage = true;
            }
            this.labelFlag = true;
            this.shelfLabelFlag = true;
            let parameters = {
                labels: this.labelFlag,
                labelType: this.labelType,
                isImagecalcMechanism: this.labelCalcType,
                shelfLabelFlag: this.shelfLabelFlag,
                annotationFlag: this.annotationFlag,
                byModular: false,
                generateImageRect: isImage,
                generateBoxRect: isBox,
                generateSKURect: isSku,
                isReport: true,
                highLight: !this.selectedHighLight || this.selectedHighLight == 'Select' ? 'highlightOff' : 'highlightOn',
                highLightPosition: !this.selectedHighLight || this.selectedHighLight == 'Select'  ? null : this.positionDataWithHighlightColor 
            };
            let section = this.sharedService.getObject(this.sectionId, this.sectionId) as Section;
            this.highLightSVG = this.planogramRender.SVG(section, 1, parameters);
            console.log(this.highLightSVG);
            if (this.selectedHighLight && this.selectedHighLight != 'Select') {
                defaultReportGenerateData.Legends = this.legends;
                defaultReportGenerateData.PositionDataWithHighlightColor = this.positionDataWithHighlightColor;
            }
            defaultReportGenerateData.Svg = this.highLightSVG;
        }
        this.subscriptions.add(
            this.reportchartsService.reportGenerate(defaultReportGenerateData).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.notifyService.error(res.Log.Details[0].Message);
                } else {
                    this.refreshReport();
                }
            }),
        );
    }


    private minandmax(): void {
        let totalVal = 0;
        let fieldStr = this.planogramService.templateRangeModel.fieldStr;
        let itemValRel = [];
        this.destArray = [];
        const cartItems = this.searchService.getCartItems();
        this.destArray = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        this.destArray = this.destArray.concat(cartItems);
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
            itemValRel.push({ IDPogObject: element.IDPOGObject, Value: valP });
        }
        let sortedDesc = sortBy(itemValRel, 'Value').reverse();
        let obj = {};
        let j = 0;
        for (let k = this.values.length - 1; k >= 0; k--) {
            let actPer = Number(this.values[k].actPer);
            let sortedDescContainer = sortedDesc.slice(0);
            let sum = 0;
            for (let i = j; i < sortedDescContainer.length; i++) {
                obj[sortedDescContainer[i].IDPogObject] = this.values[0].color;
                sum = sum + sortedDescContainer[i].Value;
                j++;
                obj[sortedDescContainer[i].IDPogObject] = this.values[k].color;

                if (this.planogramService.templateRangeModel.excludeZeroVal && sortedDescContainer[i].Value === 0) {
                    obj[sortedDescContainer[i].IDPogObject] = 'grey';
                }

                if (sum >= actPer) {
                    break;
                }
            }
        }
        this.planogramService.TopBottomAnalysisData = obj;
    }



    private applyTemplateCount(): void {
        this.valuesCount = this.planogramService.templateRangeModel.rangeModelCount.rangeValues;
        this.highlightService.splitCount = this.valuesCount.length;
        this.destArray = [];
        const cartItems = this.searchService.getCartItems();
        this.destArray = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        this.destArray = this.destArray.concat(cartItems);
        this.splitCountChange();
        this.minandmaxCount();
    }


    private splitCountChange(){
        let val: number = this.highlightService.splitCount;
        let first = this.getDestArrayLength() / val;
        let start: number[] = [];
       if (val == 1) {
            let num: number = Number((first).toFixed(2));
            start.push(Math.floor(num));
        } else {
            for (let i = 0; i < val - 1; i++) {
                let num: number = Number((first * (i + 1)).toFixed(2));
                start.push(Math.floor(num));
            }
        }
        this.sliderRange = start;
    }

    private minandmaxCount(): void {
        let valuestoUP: number[] = this.sliderRange;
        let bottom: number, top: number, middle: number;
        if (typeof valuestoUP == "object") {
            bottom = Number(valuestoUP[0]);
            top = this.getDestArrayLength() - Number(valuestoUP[1]);
            middle = Number(valuestoUP[1]) - bottom;
        }
        let totalVal = 0;
        let fieldStr = this.planogramService.templateRangeModel.fieldStr;
        let itemValRel = [];
        for (const element of this.destArray) {
            var valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
            itemValRel.push({ 'IDPogObject': element.IDPOGObject, 'Value': valP })
        }
        let sortedDesc = sortBy(itemValRel, 'Value').reverse();
        let sortedDescContainer = sortedDesc.slice(0);
        let obj = {};

        for (var i = 0; i < top; i++) {
            obj[sortedDescContainer[i].IDPogObject] = this.valuesCount[2].color;
        }
        sortedDescContainer.splice(0, top);

        for (var j = 0; j < middle; j++) {
            obj[sortedDescContainer[j].IDPogObject] = this.valuesCount[1].color;
        }
        sortedDescContainer.splice(0, middle);

        for (var k = 0; k < bottom; k++) {
            obj[sortedDescContainer[k].IDPogObject] = this.valuesCount[0].color;
        }

        sortedDescContainer.splice(0, bottom);

        sortedDesc.forEach((dataItem) => {
            let colorForSpecificPosition = obj[dataItem.IDPogObject];
            if (this.planogramService.templateRangeModel.excludeZeroVal && dataItem.Value == 0) {
                obj[dataItem.IDPogObject] = colorForSpecificPosition = 'grey';
            }
            dataItem.color = colorForSpecificPosition;
        })

        this.planogramService.TopBottomAnalysisData = obj;
    }

    private getFieldPath(fieldChoosen: FieldObjectChosen): string {
        if (fieldChoosen.FieldPath) {
            return fieldChoosen.FieldPath;
        } else {
            return fieldChoosen.field;
        }
    }


    private applyTemplate(): void {
        this.values = this.planogramService.templateRangeModel.rangeModel.rangeValues;
        this.highlightService.splitCount = this.values.length;
        this.minandmax();
    }

    private getDestArrayLength(): number{
        let destArrayCopy = [...this.destArray];
        if (this.planogramService.templateRangeModel.excludeZeroVal) {
            destArrayCopy = [];
            let fieldStr = this.planogramService.templateRangeModel.fieldStr;
            for (const element of this.destArray) {
                let valP = Utils.findPropertyValue(
                    element,
                    fieldStr,
                    undefined,
                    this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen),
                );
                if (valP != 0) {
                    destArrayCopy.push(element);    
                }
            }
        }
        return destArrayCopy.length;
    }

    private applyNumericTemplate(): void {
        this.inputRangeModel = this.planogramService.templateRangeModel;
        let currMinVal = this.getMinValue(this.inputRangeModel.fieldStr);
        let currMaxVal = this.getMaxValue(this.inputRangeModel.fieldStr);
        let continueloop = true;
        for (const [i, itm] of this.inputRangeModel.rangeModel.entries()) {
            if (continueloop) {
                if (itm.num > currMaxVal) {
                    this.updateRange(i, currMinVal, itm.num);
                    continueloop = false;
                }
            }
        }
   }

    private updateRange(indx: number, minVal: number, newVal: number): void {
        let fieldStr: string = this.planogramService.templateRangeModel.fieldStr;
        if (newVal != undefined) {
            if (Number(newVal) <= minVal) {
                this.inputRangeModel.rangeModel[indx].num = minVal + 1;
            }
            if (Number(newVal) >= this.getMaxValue(fieldStr)) {
                this.inputRangeModel.rangeModel[indx].num = this.getMaxValue(fieldStr);
                if (this.planogramService.templateRangeModel.rangeModel.length - 1 > indx) {
                    let temp = [];
                    for (let i = 0; i <= indx; i++) {
                        temp.push(this.planogramService.templateRangeModel.rangeModel[i]);
                    }
                    this.planogramService.templateRangeModel.rangeModel = temp;
                }
            } else {
                if(Number(newVal) > this.inputRangeModel.rangeModel[indx-1].num) {
                    this.inputRangeModel.rangeModel[indx].num = Number(newVal);
                } else {
                    this.inputRangeModel.rangeModel[indx].num = minVal + 1;
                }    
            }
        }
        if (indx == this.planogramService.templateRangeModel.rangeModel.length - 1) {
            if (this.planogramService.templateRangeModel.rangeModel[indx].num < this.getMaxValue()) {
                let lastColor = this.planogramService.templateRangeModel.rangeModel[indx - 1].color;
                if (this.planogramService.templateRangeModel.rangeModel.length > 2) {
                    this.planogramService.templateRangeModel.rangeModel[indx - 1].color = this.COLOR_LUMINANCE(
                        this.planogramService.templateRangeModel.rangeModel[indx - 2].color,
                        -0.2,
                    );
                } else {
                    this.planogramService.templateRangeModel.rangeModel[indx - 1].color = this.COLOR_LUMINANCE(
                        this.planogramService.templateRangeModel.rangeModel[indx - 1].color,
                        -0.2,
                    );
                }
                this.planogramService.templateRangeModel.rangeModel[indx].color = lastColor;
                this.planogramService.templateRangeModel.rangeModel.push({ color: undefined, num: this.getMaxValue() });
            }
        }
    }


    private COLOR_LUMINANCE(hex: string, lum: number): string {
        // validate hex string
        hex = String(hex).replace(/[^0-9a-f]/gi, '');
        if (hex.length < 6) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        lum = lum || 0;
        // convert to decimal and change luminosity
        let rgb = '#',
            c,
            i;
        for (i = 0; i < 3; i++) {
            c = parseInt(hex.substr(i * 2, 2), 16);
            c = Math.round(Math.min(Math.max(0, c + c * lum), 255)).toString(16);
            rgb += ('00' + c).substr(c.length);
        }
        return rgb;
    }


    private getMaxValue(fieldName?: string): number {
        if(Context.numericRangeMaxVal[this.sharedService.activeSectionID] !== null) {
            return Context.numericRangeMaxVal[this.sharedService.activeSectionID];
        }
        fieldName = fieldName || this.planogramService.templateRangeModel.fieldStr;
        const fieldPath = this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen);
        const sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        
        
        if (sectionObj) {
            Context.numericRangeMaxVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath));
        } 
        return Context.numericRangeMaxVal[this.sharedService.activeSectionID];
    }

    private getMinValue(fieldName: string): number {  
        if(Context.numericRangeMinVal[this.sharedService.activeSectionID] !== null) {
            return Context.numericRangeMinVal[this.sharedService.activeSectionID];
        } 
        fieldName = fieldName || this.planogramService.templateRangeModel.fieldStr;
        const fieldPath = this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen);
        const sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;

        if (sectionObj) {
                Context.numericRangeMinVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath));
        }  
        return Context.numericRangeMinVal[this.sharedService.activeSectionID];      
    }

    private applyColorScaleTemplate(): void {
        let temp: TemplateOptions = this.planogramService.templateRangeModel;
        this.inputRangeModel = temp;
        this.modelSP_startcolor = temp.spectrumAttr.modelSP_startcolor;
        this.modelSP_middlecolor = temp.spectrumAttr.modelSP_middlecolor;
        this.modelSP_endcolor = temp.spectrumAttr.modelSP_endcolor;
        this.modelSP_startval = parseInt(temp.spectrumAttr.modelSP_startval);
        this.modelSP_middleval = parseInt(temp.spectrumAttr.modelSP_middleval);
        this.modelSP_endval = parseInt(temp.spectrumAttr.modelSP_endval);
        this.generateColorRange();
    }

    private generateColorRange(): void {
        this.modelSP_startval = this.getColorMinValue();
        let max: any = this.getColorMaxValue();
        let min: any = this.getColorMinValue();
        this.modelSP_middleval = this.highlightService.MathRound((min + max) / 2);
        this.modelSP_endval = this.getColorMaxValue();
        let temp = this.planogramService.templateRangeModel;
        if (temp.fieldStr == 'FacingDeviation') {
            this.modelSP_middleval = 0;
            this.modelSP_startval = this.modelSP_startval < 0 ? this.modelSP_startval : 0;
            this.modelSP_endval = this.modelSP_endval > 0 ? this.modelSP_endval : 0;
            this.modelSP_middlecolor = '#00ff33';
        }
        this.setFill();
    }

    private setFill(): void {
        let fieldStr =this.planogramService.templateRangeModel.fieldStr;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.planogramService.templateRangeModel.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'Color Scale';
        this.planogramService.templateRangeModel.rangeModel = this.planogramService.templateRangeModel.rangeModel;
        this.planogramService.templateRangeModel.spectrumAttr = {};
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_startval = this.modelSP_startval;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_middleval = this.modelSP_middleval;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_endval = this.modelSP_endval;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_startLabel = this.modelSP_startLabel;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_middleLabel = this.modelSP_middleLabel;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_endLabel = this.modelSP_endLabel;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_startcolor = this.modelSP_startcolor;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_middlecolor = this.modelSP_middlecolor;
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_endcolor = this.modelSP_endcolor;
    }

    private getColorMinValue(fieldName?: string): number {
        fieldName = this.planogramService.templateRangeModel.fieldStr;
        let sectionObj= this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as  Section;
        let fieldPath = this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen);
        return sectionObj ? this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath)) : 0;
    }

    private getColorMaxValue(fieldName?: string): number {
        fieldName = this.planogramService.templateRangeModel.fieldStr;
        let fieldPath = this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen);
        let sectionObj= this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as  Section;
        return sectionObj ? this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath)) : 0;
    }

    private applyQuadrantTemplate(): void {
        let fieldStr = this.planogramService.templateRangeModel.fieldStr;
        let fieldStrQ = this.planogramService.templateRangeModel.fieldStrQ;
        this.destArray = [];
        let allPositions = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        this.destArray = uniqBy(allPositions, 'IDPOGObject');
        if (this.planogramService.templateRangeModel.startArr[0] && this.planogramService.templateRangeModel.startArr[1]) {
            let spltVal = this.planogramService.templateRangeModel.startArr[0];
            let spltValQ = this.planogramService.templateRangeModel.startArr[1];
            let ll = [];
            let hh = [];
            let lh = [];
            let hl = [];
            for (const element of this.destArray) {
                const valP = Utils.findPropertyValue(
                    element,
                    fieldStr,
                    undefined,
                    this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosen),
                );
                const valPQ = Utils.findPropertyValue(
                    element,
                    fieldStrQ,
                    undefined,
                    this.getFieldPath(this.planogramService.templateRangeModel.fieldObjectChosenQ),
                );
                if (valP < spltVal && valPQ < spltValQ) ll.push(element.IDPOGObject);
                if (valP >= spltVal && valPQ >= spltValQ) hh.push(element.IDPOGObject);
                if (valP >= spltVal && valPQ < spltValQ) hl.push(element.IDPOGObject);
                if (valP < spltVal && valPQ >= spltValQ) lh.push(element.IDPOGObject);
            }
            this.planogramService.rangeValues['ll'] = ll;
            this.planogramService.rangeValues['hh'] = hh;
            this.planogramService.rangeValues['lh'] = lh;
            this.planogramService.rangeValues['hl'] = hl;
        }
    }
}
