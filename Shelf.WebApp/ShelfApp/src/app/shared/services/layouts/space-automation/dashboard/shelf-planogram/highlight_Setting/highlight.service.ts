import { Injectable, ChangeDetectorRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { IApiResponse } from 'src/app/shared/models/apiResponseMapper';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { COLOR_PALETTE } from 'src/app/shared/constants/colorPalette';
import { 
    HighlightTemplate, 
    LookUpType,
    SavedSearch,
    StringMatchData,
    StringMatch,
    SortedGuidList,
    ModelHL,
    Dictionary,
    HighlightTypeKey,
    RangeModelValues,
    TemplateOptions,
    FieldObjectChosen
} from 'src/app/shared/models';
import { 
    PlanogramStoreService, 
    PlanogramService, 
    LocalSearchService, 
    _, 
    SharedService,DictConfigService, NotifyService, ShoppingCartService
} from 'src/app/shared/services';
import { cloneDeep, sortBy, truncate } from 'lodash';
import { Utils } from 'src/app/shared/constants';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { Position, Section } from 'src/app/shared/classes';
import { StringMatchComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/highlight/string-match/string-match.component';
import { NumericRangeComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/highlight/numeric-range/numeric-range.component';
import { SpectrumComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/highlight/spectrum/spectrum.component';
import { QuadrantAnalysisComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/highlight/quadrant-analysis/quadrant-analysis.component';
@Injectable({
    providedIn: 'root',
})
export class HighlightService {
    public stringMatchComponent:StringMatchComponent = new StringMatchComponent(this,this.sharedService,this.planogramService,this.planogramStore);
    public spectrumComponent:SpectrumComponent = new SpectrumComponent(this,this.sharedService,this.planogramService);
    public numericRangeComponent:NumericRangeComponent = new NumericRangeComponent(this,this.sharedService,this.planogramService,this.shoppingcartService,this.notifyService,this.translate);
    public quadrantAnalysisComponent:QuadrantAnalysisComponent = new QuadrantAnalysisComponent(this,this.sharedService,this.planogramService);
    public showLegend = new BehaviorSubject<boolean>(false);
    public updateRangeCount = new Subject<boolean>();
    public refreshHighLight = new Subject<boolean>()
    public retrievedData: SavedSearch[] = [];
    public retrivedGuidList: SortedGuidList[] = [];
    public colorScaleValues: any;
    public fieldArray1: any[] = [];
    public splitCount: number = 3;
    public stringMatchData: StringMatchData = {data: [], fieldName: ''};
    public selectedOptions: any = {};
    public highlightInitialized: boolean = false;
    public highlightDestroyed: boolean = false;
    private initHighlightSetting: boolean = false;
    public blockPalette: Array<string> = COLOR_PALETTE;
    public rootFlags: any = {};
    public DEFAULT_FIELDCOUNT: number = 2;
    public highlightList: SortedGuidList[] = [];
    public buttonSettings = {
        showSaveAs: true,
        showUpdate: false,
        showSave: false,
        autoFill: true,
        showRemove: false,
        showAddSysTemp: false,
        templateName: '',
    };
    public modelHL: ModelHL = {
        blockHighlightOn: false,
        tool: false,
        toggleName: '',
        chosenTemplate: this.empty(),
        fieldObjectChosen: this.empty(),
        fieldObjectChosenQ: this.empty(),
        type: '',
        field: '',
        fieldQ: '',
        template: '',
    };
    public isHighLightManulChange: boolean = false;
    public options:any;
    public rangeModel:any;
    public fieldStr:string;
    private values: Array<RangeModelValues> = [];
    private valuesCount: Array<RangeModelValues> = [];
    private destArray: Position[];
    private sliderRange: number[];
    public updateRangeModelFlag:boolean = false;

    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly http: HttpClient,
        private readonly localSearch: LocalSearchService,
        private readonly planogramService: PlanogramService,
        private readonly envConfig: ConfigService,
        private readonly sharedService:SharedService,
        private readonly dictConfigService:DictConfigService,
        private readonly shoppingcartService: ShoppingCartService,
        private readonly notifyService: NotifyService
    ) {}

    private empty(): any {
        return {};
    }

    public setStringMatchData(data: StringMatch[], fieldName: string): void {
        this.stringMatchData.data = data;
        this.stringMatchData.fieldName = fieldName;
    }

    public getStringMatchData(): StringMatchData {
        return this.stringMatchData;
    }

    public UpdateHighlightTemplates(data): Observable<IApiResponse<string>> {
        return this.http.post<IApiResponse<string>>(`${this.envConfig.shelfapi}${'/api/Appsettings/UpdateHighlightTemplates'}`, data);
    }

    public toggleHighlightTool(sectionID: string): void {
        this.rootFlags[sectionID].isEnabled = !this.rootFlags[sectionID].isEnabled;
    }

    public initBySectionId(sectionID: string): void {
        this.rootFlags[sectionID] = {};
        this.rootFlags[sectionID].isEnabled = false;
        if (!this.initHighlightSetting) {
            this.initHighlightSetting = true;
            this.resetTemplateRangeModel();
        }
    }

    public setRulsetAllocateMode(): boolean {
        return this.planogramService.ruleSets ? true : false;
    }

    public getTemplates(): HighlightTemplate[] {
        const defaultTemplate: HighlightTemplate = {
            name: this.translate.instant('Default'),
            value: '?',
            readonly: true,
            options: { highlightType: 'Default' },
            isFavorite: false,
            isCount: false,
            excludeZeroVal: false,
         //   isDefault: false
        };
        const sysTemplate: HighlightTemplate[] = cloneDeep(this.planogramStore.appSettings.highlightSysTemplate);
        const userTemplate: HighlightTemplate[] = cloneDeep(this.planogramStore.appSettings.highlightUsrTemplate);
        return [defaultTemplate, ...sysTemplate, ...userTemplate];
    }

    public getHighlightOptions(): LookUpType[] {
        const highlightOptions: LookUpType[] = this.planogramStore.appSettings.highLightOpts
            .map((a) => Object.assign({}, a))
            .map((it) => {
                it.value = it.name;
                return it;
            });
        return highlightOptions;
    }

    public getStringNameFromField(): string {
        let fieldString = '';
        if (this.selectedOptions['field']) {
            for (let d of this.fieldArray1) {
                if (d.value == this.selectedOptions['field']) {
                    fieldString = d.name;
                }
            }
        }
        return fieldString;
    }

    public getStringNameFromFieldQ(): string {
        let fieldString = '';
        if (this.selectedOptions['fieldQ']) {
            for (let d of this.fieldArray1) {
                if (d.value == this.selectedOptions['fieldQ']) {
                    fieldString = d.name;
                }
            }
        }
        return fieldString;
    }

    public resetTemplateRangeModel(count?: boolean): void {
        this.planogramService.templateRangeModel.rangeModel = [];
        this.planogramService.templateRangeModel.rangeModelCount = [];
        this.planogramService.templateRangeModel.count = count;
        this.planogramService.templateRangeModel.highlightType = '';
        this.planogramService.templateRangeModel.fieldStr = '';
        this.planogramService.templateRangeModel.defaultColor = '#8B8B8B';
        this.planogramService.templateRangeModel.numericRangeAttr = {};
        this.planogramService.templateRangeModel.stringMatchAttr = {};
        this.planogramService.templateRangeModel.spectrumAttr = {};
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend = false;
        this.planogramService.templateRangeModel.fieldObjectChosen = {};
        this.planogramService.templateRangeModel.defaultLabel = 12345;
    }

    public resetTemplateName(): void {        
        this.buttonSettings.templateName = '';
    }

    public HEX2RGB(hex): number[] {
        let hexToR = function (h) {
            return parseInt(cutHex(h).substring(0, 2), 16);
        };
        let hexToG = function (h) {
            return parseInt(cutHex(h).substring(2, 4), 16);
        };
        let hexToB = function (h) {
            return parseInt(cutHex(h).substring(4, 6), 16);
        };
        let cutHex = function (h) {
            return h.charAt(0) == '#' ? h.substring(1, 7) : h;
        };
        return [hexToR(hex), hexToG(hex), hexToB(hex)];
    }

    public MathRound(num): number {
        return Math.round(Number(num) * 100) / 100;
    }

    public componentToHex(c: number): string {
        let hex = c.toString(16);
        return hex.length == 1 ? '0' + hex : hex;
    }

    public RGB2HEX(r, g, b): string {
        return '#' + this.componentToHex(r) + this.componentToHex(g) + this.componentToHex(b);
    }

    public getADRColorPalette(value): string[] {
        let colorModel: string[] = [];
        if (value.length > 0) {
            let ADRValue = value;
            for (let d of ADRValue) {
                if (d == 'A') {
                    colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                } else if (d == 'D') {
                    colorModel.push(this.RGB2HEX(255, 0, 0));
                } else {
                    colorModel.push(this.RGB2HEX(0, 0, 255));
                }
            }
        }
        return colorModel;
    }

    public getStdColorPalette(count: number): string[] {
        let colorModel: string[] = [];
        switch (count) {
            case 2:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 3:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 4:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 5:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 6:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 7:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 8:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 9:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 10:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 11:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 191, 127)); //Light Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 12:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(191, 191, 0));
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 191, 127)); //Light Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 13:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(191, 191, 0));
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 191, 127)); //Light Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 191, 191)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 14:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 191, 0)); //Light Orange
                colorModel.push(this.RGB2HEX(255, 255, 0)); ////Light Orange
                colorModel.push(this.RGB2HEX(191, 191, 0));
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 191, 127)); //Light Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 191, 191)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            case 15:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                colorModel.push(this.RGB2HEX(255, 127, 0));
                colorModel.push(this.RGB2HEX(255, 191, 0)); //Light Orange
                colorModel.push(this.RGB2HEX(255, 255, 0)); //Yellow
                colorModel.push(this.RGB2HEX(191, 191, 0));
                colorModel.push(this.RGB2HEX(127, 127, 0));
                colorModel.push(this.RGB2HEX(127, 191, 0)); //Dark Green
                colorModel.push(this.RGB2HEX(0, 255, 0)); //Green
                colorModel.push(this.RGB2HEX(0, 191, 127)); //Light Green
                colorModel.push(this.RGB2HEX(0, 127, 127)); //
                colorModel.push(this.RGB2HEX(0, 191, 191)); //
                colorModel.push(this.RGB2HEX(0, 255, 255)); //Cyan
                colorModel.push(this.RGB2HEX(0, 191, 255)); //
                colorModel.push(this.RGB2HEX(0, 127, 255)); // Dark Cyan
                colorModel.push(this.RGB2HEX(0, 0, 255)); //Blue
                break;
            default:
                colorModel.push(this.RGB2HEX(255, 0, 0));
                break;
        }
        return colorModel;
    }

    public HUE2RGB(m1, m2, hue): number {
        let v;
        if (hue < 0) hue += 1;
        else if (hue > 1) hue -= 1;

        if (6 * hue < 1) v = m1 + (m2 - m1) * hue * 6;
        else if (2 * hue < 1) v = m2;
        else if (3 * hue < 2) v = m1 + (m2 - m1) * (2 / 3 - hue) * 6;
        else v = m1;

        return 255 * v;
    }

    public HSL2HEX(h, s, l): string {
        let m1, m2, hue;
        let r, g, b;
        s /= 100;
        l /= 100;
        if (s == 0) r = g = b = l * 255;
        else {
            if (l <= 0.5) m2 = l * (s + 1);
            else m2 = l + s - l * s;
            m1 = l * 2 - m2;
            hue = h / 360;
            r = this.HUE2RGB(m1, m2, hue + 1 / 3);
            g = this.HUE2RGB(m1, m2, hue);
            b = this.HUE2RGB(m1, m2, hue - 1 / 3);
        }

        return this.RGB2HEX(Math.round(r), Math.round(g), Math.round(b));
    }

    public getExtendedColorPalette(count): string[] {
        let colorModel: string[] = [];
        let bright;
        let brightness_changes;
        if (count < 999) brightness_changes = count / 11 + 1;
        else brightness_changes = 99;

        if (brightness_changes == 0) {
            for (let hue = 0; hue < 360; hue += 360 / count) colorModel.push(this.HSL2HEX(hue, 100, 50));
        } else {
            //Changed the previous logic.
            //Now Color wheel will rotate from Red(255,0,0) to Blue(0,0,255)
            //For more colors it will rotates Red to Blue starting From
            //red to lighter shade of red end with Blue to Lighter shades of blue

            let hueChange;
            if (count <= 11) hueChange = 240 / (count - 1);
            else {
                hueChange = 240 / (count / brightness_changes);
            }

            for (let hue = 0; hue <= 240; hue += hueChange) {
                for (let i = 0; i < brightness_changes; i++) {
                    bright = 50 + (50 / brightness_changes) * i;
                    colorModel.push(this.HSL2HEX(hue, 100, bright));

                    if (colorModel.length == count) break;
                }
            }
        }
        return colorModel;
    }

    public DoAdvFind(selectedFind, sectionID): void {
        if (selectedFind.search != null) {
            let searchInfo = JSON.parse(selectedFind.search);
            this.localSearch.getModifiedPlanogramForExpression(
                true,
                searchInfo.searchFieldsFrmDb,
                searchInfo.queryContent,
                searchInfo.andOrSelect,
            );
        } else {
            this.localSearch.getModifiedPlanogramVM('', null, {}, false, false);
        }
        this.planogramService.removeAllSelection(sectionID);
    }

    public cleanBySectionId(sectionID: string): void {
        delete this.rootFlags[sectionID];
    }

    public retrieveSavedSearch(sectionID: string): SavedSearch[] {
        let savedSavedSearch: SavedSearch[] = this.retrievedData ? [...this.retrievedData] : [];
        savedSavedSearch.unshift({ name: 'None', search: null });
        this.DoAdvFind(savedSavedSearch[0], sectionID);
        return savedSavedSearch; //should return search option used in highlight components
    }

    public makeHighlightOptionsFromDict = (dataDict) => {
        let field;
        if (dataDict.Owner == 'POGInventoryModel') {
            field = 'inventoryObject.' + dataDict.DictionaryName;
        } else {
            if (dataDict.DictionaryName.indexOf('_') == 0) {
                let extendedDataField = Utils.makeExtendedField(dataDict.DataType);
                field = dataDict.DictionaryName + '.' + extendedDataField;
            } else {
                field = dataDict.DictionaryName;
            }
        }
        return field;
    }

    //@Sagar: To make the ordered GUID List according to drag n drop done by user
    public makeSortedGuidList(allTemplates: HighlightTemplate[]): SortedGuidList[] {
        let sortedGuidContainer: Array<SortedGuidList> = [];
        allTemplates.forEach((item) => {
            sortedGuidContainer.push({name: item.name, guid: item.GUID, isFav: item.isFavorite, isDefault: item.isDefault});
        })   
        return sortedGuidContainer;
    }


    public checkForActiveSectionID():number[]{ //get the list of loaded section id
        let highlightedSectionIds = [];
        Object.keys(this.planogramService.rootFlags)?.forEach(sectionId => {
            let sectionObj = this.sharedService.getObject(sectionId, sectionId) as Section;
            let currentObj = this.planogramStore.mappers?.filter(pog => pog.IDPOG === sectionObj.IDPOG)[0];
             if(this.planogramService.rootFlags[sectionId].isEnabled && currentObj?.isLoaded){
                highlightedSectionIds.push(sectionId);
             }
        });
        return highlightedSectionIds;
    }
    public disableHighLightForActiveSectionIDs():void{ //get the list of loaded section id
        Object.keys(this.planogramService.rootFlags)?.forEach(sectionId => {
            this.planogramService.rootFlags[sectionId].isEnabled = false ;
        });
    }
    public enableHighLightForActiveSectionIDs():void{ //get the list of loaded section id
        Object.keys(this.planogramService.rootFlags)?.forEach(sectionId => {
            this.planogramService.rootFlags[sectionId].isEnabled = true ;
        });
    }
    public populateLookupField(selectedtype:string): void { 
        let type = this.getHighlightOptions();
            for (let item of type) {
                const selectedType = this.translate.instant(selectedtype);
                if (this.translate.instant(item.name) == selectedType || this.translate.instant(item.value) == selectedType) {
                    let tempfield = this.dictConfigService.dictionaryConfigCollection(item.options as Dictionary[]) as any;
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
                    this.planogramService.lookupHL = tempfield;              
                }
            }
        }
        public getFieldPath(fieldChoosen: FieldObjectChosen): string {
            if (fieldChoosen.FieldPath) {
                return fieldChoosen.FieldPath;
            } else {
                return fieldChoosen.field;
            }
        }
        private applyTemplateCount(): void {
            this.valuesCount = this.planogramService.templateRangeModel.rangeModelCount.rangeValues;
            this.splitCount = this.valuesCount.length;
            this.destArray = [];
            const cartItems = [];//this.searchService.getCartItems();
            this.destArray = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
            this.destArray = this.destArray.concat(cartItems);
            this.splitCountChange();
            this.minandmaxCount();
        }
        private splitCountChange(){
            let val: number = this.splitCount;
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
        private applyTemplate(): void {
            this.values = this.planogramService.templateRangeModel.rangeModel.rangeValues;
            this.splitCount = this.values.length;
            this.minandmax();
        }
        private minandmax(): void {
            let totalVal = 0;
            let fieldStr = this.planogramService.templateRangeModel.fieldStr;
            let itemValRel = [];
            this.destArray = [];
            const cartItems =[];// this.searchService.getCartItems();
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
    public updateRangeModel() {
        if (Object.keys(this.modelHL?.fieldObjectChosen).length) {
            this.matchTemplateType(true);
        } else { // when there is no highlight template take always default highlight
            const anyPogHighlighted = Object.keys(this.planogramService.rootFlags).some(sectionID => this.planogramService.rootFlags[sectionID].isEnabled === true);
            if (this.options == undefined || anyPogHighlighted) {
                const defaultHighLight = this.highlightList.filter(elm => elm.isDefault == true)[0];
                let allTemplates = this.getTemplates();
                this.options = allTemplates.filter(elm => elm.GUID == defaultHighLight?.guid)[0]?.options as any;
                this.fieldStr = this.options.fieldStr;
                if (defaultHighLight) {
                    this.populateLookupField(this.options?.highlightType);
                    this.planogramService.modelHLField(this.fieldStr);
                }
            }
            this.matchTemplateType(false);
        }
        this.options.rangeModel = this.rangeModel;
    }

    private matchTemplateType(options) {
        const fieldstring = options ? this.modelHL?.field : this.fieldStr;
        this.planogramService.templateRangeModel.highlightType = this.planogramService?.templateRangeModel?.highlightType === '' ? this.options?.highlightType :this.planogramService?.templateRangeModel?.highlightType;
        switch (this.modelHL?.type || this.translate.instant(this.options?.highlightType)) {
            case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                if (Object.keys(this.options).length && !this.planogramService.templateRangeModel.rangeModel.length) {
                    this.rangeModel = this.stringMatchComponent.getRangeModel(fieldstring, this.options);
                } else {
                    this.setStringMatchData([], '');
                    this.rangeModel = this.stringMatchComponent.getRangeModel(fieldstring);
                    this.planogramService.templateRangeModel.rangeModel = this.rangeModel;
                }
                break;
            case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                const dataType: string = options ? this.modelHL?.fieldObjectChosen?.DataTypeDesc : this.options?.fieldObjectChosen?.DataTypeDesc;
                const count = this.planogramService.templateRangeModel.rangeModel.length ? this.planogramService.templateRangeModel.rangeModel.length - 1 : this.options.rangeModel.length - 1;
                this.rangeModel = this.numericRangeComponent.getRangeModel(
                    this.numericRangeComponent.getMinValue(fieldstring),
                    this.numericRangeComponent.getMaxValue(fieldstring),
                    count,
                    dataType
                );
                break;
            case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                const field = options ? this.modelHL?.field : this.options?.fieldStr;
                this.spectrumComponent.modelSP_startcolor = this.RGB2HEX(255, 0, 0);
                this.spectrumComponent.modelSP_middlecolor = this.RGB2HEX(255, 255, 0);
                this.spectrumComponent.modelSP_endcolor = this.RGB2HEX(0, 0, 255);
                this.spectrumComponent.modelSP_startval = this.spectrumComponent.getMinValue(field);
                let max: any = this.spectrumComponent.getMaxValue(field);
                let min: any = this.spectrumComponent.modelSP_startval;
                this.spectrumComponent.modelSP_middleval = this.MathRound((min + max) / 2);
                this.spectrumComponent.modelSP_endval = max;
                this.rangeModel = this.spectrumComponent.getRangeModel();
                break;
            case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                this.planogramService.TopBottomAnalysisData = {};
                if (Object.keys(this.planogramService.templateRangeModel.rangeModel).length == 0) {
                    this.planogramService.templateRangeModel.rangeModel = this.options.rangeModel;
                }
                this.planogramService.templateRangeModel.count ? this.applyTemplateCount() : this.applyTemplate();
                this.rangeModel = this.planogramService.templateRangeModel.rangeModel ? this.planogramService.templateRangeModel.rangeModel :this.options.rangeModel;
                break;
            case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                if (this.planogramService.templateRangeModel.rangeModel && !this.planogramService.templateRangeModel.rangeModel.length) {
                    this.planogramService.templateRangeModel = this.options;
                    this.planogramService.templateRangeModel.fieldStr = this.options.fieldStr;
                    this.planogramService.templateRangeModel.fieldStrQ = this.options.fieldStrQ;
                    this.planogramService.templateRangeModel.startArr[0] = this.options.startArr[0];
                    this.planogramService.templateRangeModel.startArr[1] = this.options.startArr[1];
                }
                this.quadrantAnalysisComponent.applyQuadrantTemplate();
                this.rangeModel = this.planogramService.templateRangeModel.rangeModel ? this.planogramService.templateRangeModel.rangeModel :this.options.rangeModel;
                break;


        }

    }
}
