import { 
    Component, 
    OnChanges, 
    Input, 
    SimpleChanges, 
    EventEmitter, 
    Output, 
    OnDestroy
} from '@angular/core';
import { Section, Position } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants/utils';
import { PositionFixtureObj } from 'src/app/shared/models/context-model/context-model';
import {
    ModelHL,
    RangeModel,
    SavedSearch,
    SPMData,
    StringMatch,
    TemplateOptions,
} from 'src/app/shared/models';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { HighlightService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/highlight_Setting/highlight.service';
import { PlanogramStoreService } from 'src/app/shared/services';

@Component({
    selector: 'sp-string-match',
    templateUrl: './string-match.component.html',
    styleUrls: ['./string-match.component.scss'],
})
export class StringMatchComponent implements OnChanges, OnDestroy {
    @Input() modelHL: ModelHL;
    @Input() updateRangeModel: Boolean;
    @Output() emitSelection = new EventEmitter();
    @Output() changedList = new EventEmitter();
    private previousPogId: number;
    private currentPogId: number;
    public savedSearchOptions: SavedSearch[] = [];
    private uniqueValueLookup: string[];
    private sectionID: string;
    private nonUniqueValueLookup: string[] = [];
    public inputRangeModel: TemplateOptions;
    private sortPercentageLinear: boolean = false;
    private sortPerecentageCapacity: boolean = false;
    private sortName: boolean = false;
    public showPercentageLinear: boolean = false;
    public showLinear: boolean = false;
    public showSpm: boolean = false;
    public showCapacityPercentage: boolean = false;
    public showCapacity: boolean = false;
    private SPMTotal: number;
    private SPMItem: number;
    private totalLinear: number = 0;
    private capacityOfEachRow: number = 0;
    public SPM: SPMData = {};
    private fieldStr: string;
    private previousItemCount: number;
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings = {
        columns: 17,
        palette: [],
    };
    public advFind: number = 0;
    public modelHLObject;

    constructor(
        private readonly highlightService: HighlightService,
        public readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
    ) {
     }

    //To stop panning when typing on any input field
    public onInputField(event: KeyboardEvent): void {
        if (event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();
        }
    }

    public doAdvFind(searchOptions: SavedSearch): void {
        this.highlightService.buttonSettings.templateName = searchOptions.name;
        this.highlightService.DoAdvFind(searchOptions, this.sectionID);
        this.advFind = this.savedSearchOptions.indexOf(searchOptions);
    }
    public get stringNameFromField(): string {
        return this.highlightService.getStringNameFromField();
    }
    public get templateName(): string {
        return this.highlightService.buttonSettings.templateName;
    }
    public saveAs(): void {
        this.highlightService.buttonSettings.showSaveAs = false;
        this.highlightService.buttonSettings.showSave = true;
    }
    public get showAddSysTemp(): boolean {
        return this.highlightService.buttonSettings.showAddSysTemp;
    }
    public get showUpdate(): boolean {
        return this.highlightService.buttonSettings.showUpdate;
    }
    public get showRemove(): boolean {
        return this.highlightService.buttonSettings.showRemove;
    }
    public get setRulsetAllocateMode(): boolean {
        return this.highlightService.setRulsetAllocateMode();
    }

    public emitId(id: string): void {
        this.emitSelection.emit(id);
    }

    public sortByName(): void {
        this.sortName = true;
        this.sortPercentageLinear = false;
        this.setReset();
    }

    public sortByPercentageLinear(): void {
        this.sortName = false;
        this.sortPercentageLinear = true;
        this.setReset();
    }

    public colorChange(color: string, index: number): void {
        this.inputRangeModel.rangeModel[index]['color'] = color;
        this.planogramService.templateRangeModel.rangeModel = this.inputRangeModel.rangeModel;
        this.sharedService.isListEdited = true;
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public getLinear(item: RangeModel): string {
        let sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let fieldStr: string = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen &&
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = undefined;
            this.SPMTotal = undefined;
            this.GetTotalValue(sectionObj, item, fieldStr);
            let linear: number | string = this.totalLinear / (sectionObj.AvailableLinear + sectionObj.UsedLinear);
            linear = linear.toPrecision(3);
            linear = Number(linear);
            let linearToShow = this.totalLinear.toPrecision(4);
            this.totalLinear = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.linear = linear;
                    dataItem.totalLinear = Number(linearToShow);
                }
            });
            return linearToShow;
        }
    }

    public getCapacity(item: RangeModel): number {
        this.capacityOfEachRow = 0;
        let sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let fieldStr: string = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen &&
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = undefined;
            this.SPMTotal = undefined;
            this.GetTotalValue(sectionObj, item, fieldStr);
            let capacity: number | string = this.capacityOfEachRow;
            capacity = capacity.toPrecision(3);
            capacity = Number(capacity);
            let capacityToShow = this.capacityOfEachRow;
            this.capacityOfEachRow = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.capacity = capacity;
                    dataItem.capacityOfEachRow = Number(capacityToShow);
                }
            });
            return capacityToShow;
        }
    }

    public isNaNCheck(SPMitem: number, val: string): number | string {
        if (isNaN(SPMitem)) {
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (val == dataItem.value) {
                    dataItem.SPM = 'NA';
                }
            });
            return 'NA';
        }
        this.inputRangeModel.rangeModel.forEach((dataItem) => {
            if (val == dataItem.value) {
                dataItem.SPM = SPMitem;
            }
        });
        return SPMitem;
    }

    public isNumeric(value: string, indx: number): boolean {
        this.fieldStr = value;
        if (value == undefined) {
            return false;
        }
        let alphaNumericExpression = /^$|^[A-Za-z0-9 _-]+$/;
        if (!this.fieldStr.match(alphaNumericExpression)) {
            this.inputRangeModel.rangeModel[indx].label = '';

            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        } else {
            this.sharedService.isListEdited = true;
            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        }
    }

    private GetTotalValue(obj: Section, item: RangeModel, searchValue: string): void {
        let selectedValue: boolean | string =
            item.value === 'true' ? true : item.value === 'false' ? false : item.value;
        let modifiedObjectArray: string[] = searchValue.split('.');
        if (modifiedObjectArray.length > 1) {
            if (obj.hasOwnProperty('Children') && !Utils.checkIfShoppingCart(obj)) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        let modifiedModelPosValue1: PositionFixtureObj = child.Position[modifiedObjectArray[0]];
                        let modifiedModelPosValue2: boolean | string;
                        let modifiedModelProductValue2: boolean | string;
                        let modifiedModelPosAttrValue2: boolean | string;
                        let modifiedModelProductPkgValue2: boolean | string;
                        if (modifiedModelPosValue1 != undefined) {
                            modifiedModelPosValue2 = child.Position[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductValue1 = child.Position.Product[modifiedObjectArray[0]];
                        if (modifiedModelProductValue1 != undefined) {
                            modifiedModelProductValue2 =
                                child.Position.Product[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductPkgValue1 = child.Position.ProductPackage[modifiedObjectArray[0]];
                        if (modifiedModelProductPkgValue1 != undefined) {
                            modifiedModelProductPkgValue2 =
                                child.Position.ProductPackage[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }

                        let modifiedModelPosAttrValue1 = child.Position.attributeObject[modifiedObjectArray[0]];
                        if (modifiedModelPosAttrValue1 != undefined) {
                            modifiedModelPosAttrValue2 =
                                child.Position.attributeObject[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        if (
                            modifiedModelPosValue1 != undefined &&
                            modifiedModelPosValue2 != undefined &&
                            modifiedModelPosValue1 != null &&
                            modifiedModelPosValue2 !== '' &&
                            modifiedModelPosValue2 != null
                        ) {
                            if (typeof modifiedModelPosValue2 === 'boolean') {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            } else {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];

                                if (modifiedModelPosValue2 == selectedValue) {
                                    this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                }
                            }
                        } else if (
                            modifiedModelProductValue1 != undefined &&
                            modifiedModelProductValue2 != undefined &&
                            modifiedModelProductValue1 !== '' &&
                            modifiedModelProductValue1 != null &&
                            modifiedModelProductValue2 != '' &&
                            modifiedModelProductValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelProductValue2 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductPkgValue1 != undefined &&
                            modifiedModelProductPkgValue2 != undefined &&
                            modifiedModelProductPkgValue1 !== '' &&
                            modifiedModelProductPkgValue1 != null &&
                            modifiedModelProductPkgValue2 != '' &&
                            modifiedModelProductPkgValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelProductPkgValue2 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelPosAttrValue1 != undefined &&
                            modifiedModelPosAttrValue2 != undefined &&
                            modifiedModelPosAttrValue1 !== '' &&
                            modifiedModelPosAttrValue1 != null &&
                            modifiedModelPosAttrValue2 != '' &&
                            modifiedModelPosAttrValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelPosAttrValue2 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        }
                    }
                    this.GetTotalValue(child, item, searchValue);
                }, obj);
            }
        } else {
            if (obj.hasOwnProperty('Children') && !Utils.checkIfShoppingCart(obj)) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        let modifiedModelPosValue1: boolean | string = child.Position[searchValue];
                        let modifiedModelProductValue1: boolean | string = child.Position.Product[searchValue];
                        let modifiedModelProductPkgValue1: boolean | string =
                            child.Position.ProductPackage[searchValue];
                        let modifiedModelPosAttrValue1: boolean | string = child.Position.attributeObject[searchValue];

                        if (
                            modifiedModelPosValue1 != undefined &&
                            modifiedModelPosValue1 !== '' &&
                            modifiedModelPosValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelPosValue1 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductValue1 != undefined &&
                            modifiedModelProductValue1 !== '' &&
                            modifiedModelProductValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelProductValue1 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductPkgValue1 != undefined &&
                            modifiedModelProductPkgValue1 !== '' &&
                            modifiedModelProductPkgValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelProductPkgValue1 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelPosAttrValue1 != undefined &&
                            modifiedModelPosAttrValue1 !== '' &&
                            modifiedModelPosAttrValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (modifiedModelPosAttrValue1 == selectedValue) {
                                this.totalLinear = this.totalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        }
                    }
                    this.GetTotalValue(child, item, searchValue);
                }, obj);
            }
        }
    }

    public getPercentageCapacity(item: RangeModel): number {
        this.capacityOfEachRow = 0;
        let sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen &&
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = undefined;
            this.SPMTotal = undefined;
            this.GetTotalValue(sectionObj, item, fieldStr);
            let capacity: number | string = this.capacityOfEachRow;
            capacity = capacity.toPrecision(3);
            capacity = Number(capacity);
            let capacityToShow = this.capacityOfEachRow.toPrecision(2);
            let capacityToCalculatePercentage: number = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.capacity = capacity;
                    dataItem.capacityOfEachRow = Number(capacityToShow);
                }
                capacityToCalculatePercentage = capacityToCalculatePercentage + dataItem.capacityOfEachRow;
            });
            let percentageCapacity: number = capacityToCalculatePercentage
                ? (this.capacityOfEachRow / capacityToCalculatePercentage) * 100
                : 0;
            percentageCapacity = Math.round(percentageCapacity * 100) / 100;
            let HighlightedSPM: number = this.SPMTotal ? this.SPMItem / this.SPMTotal : 0;
            this.SPM[item.value] = Math.round(HighlightedSPM * 100) / 100;
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.capacityOfEachRow = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.percentageCapacity = percentageCapacity;
                }
            });

            if (this.sortPerecentageCapacity) {
                this.inputRangeModel.rangeModel = this.inputRangeModel.rangeModel.sort(function (a, b) {
                    if (a.percentageCapacity < b.percentageCapacity) {
                        return -1;
                    }
                });
            }
            return percentageCapacity;
        }
    }

    public getPercentageLinear(item: RangeModel): number {
        this.totalLinear = 0;
        let sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen &&
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = undefined;
            this.SPMTotal = undefined;
            this.GetTotalValue(sectionObj, item, fieldStr);
            let linear: number | string = this.totalLinear / (sectionObj.AvailableLinear + sectionObj.UsedLinear);
            linear = linear.toPrecision(3);
            linear = Number(linear);
            let linearToShow: string = this.totalLinear.toPrecision(4);
            let linearToCalculatePercentage: number = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.linear = linear;
                    dataItem.totalLinear = Number(linearToShow);
                }
                linearToCalculatePercentage = linearToCalculatePercentage + dataItem.totalLinear;
            });
            let percentageLinear: number = linearToCalculatePercentage
                ? (this.totalLinear / linearToCalculatePercentage) * 100
                : 0;
            percentageLinear = Math.round(percentageLinear * 100) / 100;
            let HighlightedSPM: number = this.SPMTotal ? this.SPMItem / this.SPMTotal : 0;
            this.SPM[item.value] = Math.round(HighlightedSPM * 100) / 100;
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.totalLinear = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.value == item.value) {
                    dataItem.percentageLinear = percentageLinear;
                }
            });

            if (this.sortPercentageLinear) {
                this.inputRangeModel.rangeModel = this.inputRangeModel.rangeModel.sort(function (a, b) {
                    if (a.percentageLinear < b.percentageLinear) {
                        return -1;
                    }
                });
            }
            return percentageLinear;
        }
    }

    private getUniqueValueList(list: string[]): string[] {
        let result: string[] = [];
        for (let d of list) {
            if (result.indexOf(d) == -1) {
                result.push(d);
            }
        }
        return result;
    }

    private getFieldPath(fieldChoosen): string {
        return fieldChoosen?.calculatedFieldPath || fieldChoosen?.field || fieldChoosen?.FieldPath;
    }
    
    private recurseAndPopulateNonUniqueValueLookup(obj: Section, searchValue: string){
        const field = this.modelHL?.fieldObjectChosen ? this.modelHL?.fieldObjectChosen :this.highlightService.options?.fieldObjectChosen;
        const fieldPath = this.getFieldPath(field);
        if (obj.hasOwnProperty('Children')) {
            obj.Children.forEach((child, key) => {
                if (Utils.checkIfPosition(child)) {
                    const modifiedModelPosValue = this.sharedService.getObjectField(undefined, fieldPath, undefined, child);
                    if ( modifiedModelPosValue !== undefined && modifiedModelPosValue !== '' && modifiedModelPosValue !== null){
                         this.nonUniqueValueLookup.push(modifiedModelPosValue.toString().trim());
                    }
                }
                this.recurseAndPopulateNonUniqueValueLookup(child, searchValue);
            }, obj);
        }
    }

    private generateListOfUniqueValues(fieldStr: string): string[] {
        this.nonUniqueValueLookup = [];
        let sectionObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section;
        this.recurseAndPopulateNonUniqueValueLookup(sectionObj, fieldStr);
        return this.getUniqueValueList(this.nonUniqueValueLookup);
    }

    public getRangeModel(fieldStr: string,options?:ModelHL): number | StringMatch[] {
       this.modelHLObject = options ? options:"";
        const stringMatchData = this.highlightService.getStringMatchData();
        if(this.currentPogId === this.previousPogId && stringMatchData && 
            (this.planogramService.templateRangeModel.fieldObjectChosen.name === stringMatchData.fieldName) && 
            stringMatchData.data.length) {
            return stringMatchData.data;
        }
        let colorPalette: string[] = [];
        let rangeModel: StringMatch[] = [];
        if (this.modelHL && this.modelHL['fieldObjectChosen']?.LkUpGroupName) {
            this.uniqueValueLookup = this.generateListOfUniqueValues(fieldStr + 'text');
        } else {
            this.uniqueValueLookup = this.generateListOfUniqueValues(fieldStr);
        }
        if (fieldStr == 'RecADRI' && this.uniqueValueLookup.length != 0) {
            colorPalette = this.highlightService.getADRColorPalette(this.uniqueValueLookup);
        } else {
            if (this.uniqueValueLookup.length <= 15) {
                colorPalette = this.highlightService.getStdColorPalette(this.uniqueValueLookup.length);
            } else {
                colorPalette = this.highlightService.getExtendedColorPalette(this.uniqueValueLookup.length);
            }
        }
        for (const [i, uniqueVal] of this.uniqueValueLookup.entries()) {
            let child: StringMatch = { color: '', value: '' };
            child.color = colorPalette[i];
            child.value = uniqueVal;
            rangeModel.push(child);
        }
        let rangeContainer: string[] = [];
        let numericContainer: StringMatch[] = [];
        let alphaContainer: StringMatch[] = [];

        for (let item of rangeModel) {
            rangeContainer = item.value.split('-');
            if (rangeContainer.length > 1) {
                let sumOfRange = Number(rangeContainer[0]) + Number(rangeContainer[1]);
                if (isNaN(sumOfRange)) {
                    alphaContainer.push({ color: item.color, val: item.value, value: item.value });
                } else {
                    numericContainer.push({ color: item.color, val: sumOfRange, value: item.value });
                }
            } else {
                alphaContainer.push({ color: item.color, val: item.value, value: item.value });
            }
        }

        numericContainer = numericContainer.sort(function (a, b) {
            if (a.val < b.val) {
                return -1;
            }
        });
        alphaContainer = alphaContainer.sort(function (a, b) {
            if (a.val.toString().toLowerCase() < b.val.toString().toLowerCase()) {
                return -1;
            }
        });
        rangeModel = numericContainer.concat(alphaContainer);
        return rangeModel;
    }

    private applyTemplate(): void {
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let allPositions: Position[] = rootObject.getAllPositions();
        this.previousItemCount = allPositions.length;
        let fieldStr: string = this.modelHL.field;
        if (this.modelHL.chosenTemplate.options.rangeModel) {
            this.setReset(true);
            // let prevRange = this.modelHL.chosenTemplate.options.rangeModel;
            // prevRange = prevRange.map((a) => Object.assign({}, a));
            fieldStr = this.modelHL.chosenTemplate.options.fieldStr;
        } else {
            this.planogramService.templateRangeModel.rangeModel = this.getRangeModel(fieldStr);
            if(this.highlightService.options){
                this.highlightService.options = this.planogramService.templateRangeModel;
            }
        }
        this.uniqueValueLookup = this.generateListOfUniqueValues(fieldStr);
        this.inputRangeModel = this.planogramService.templateRangeModel;
        if (this.inputRangeModel.rangeModel[0].percentageLinear) {
            this.showPercentageLinear = true;
            this.showLinear = true;
        }
        if (this.inputRangeModel.rangeModel[0].percentageCapacity) {
            this.showCapacityPercentage = true;
            this.showCapacity = true;
        }
        if (this.inputRangeModel.rangeModel[0].SPM != undefined) {
            this.showSpm = true;
        }
    }

    public setReset(fromFill?:boolean): number | void {
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let allPositions: Position[] = rootObject.getAllPositions();
        this.previousItemCount = allPositions.length;
        if (!this.sortName && !this.sortPercentageLinear) {
            this.highlightService.resetTemplateRangeModel();
        }
        let fieldStr: string = this.modelHL.field;
        if (this.modelHL.fieldObjectChosen.LkUpGroupName) {
            this.uniqueValueLookup = this.generateListOfUniqueValues(fieldStr + 'text');
        } else {
            this.uniqueValueLookup = this.generateListOfUniqueValues(fieldStr);
        }
        if (this.modelHL.fieldObjectChosen) {
            this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        }
        if (this.planogramService.templateRangeModel.fieldStr == '') {
            this.planogramService.templateRangeModel.fieldStr = fieldStr;
        }
        if (this.planogramService.templateRangeModel.highlightType == '') {
            this.planogramService.templateRangeModel.highlightType = 'STRING_MATCH';
        }
        if (fromFill){
            this.planogramService.templateRangeModel.rangeModel = this.getRangeModel(fieldStr);
        } else if (this.planogramService.templateRangeModel.rangeModel.length == 0) {
            this.planogramService.templateRangeModel.rangeModel = this.getRangeModel(fieldStr);
        } else {
            if (this.sortPercentageLinear) {
                for (const [i, val] of this.inputRangeModel.rangeModel.entries()) {
                    this.getPercentageLinear(val);
                }
            }
            if (this.sortName) {
                let anotherRangeContainer: string[] = [];
                let anotherNumericContainer: StringMatch[] = [];
                let anotherAlphaContainer: StringMatch[] = [];
                this.inputRangeModel.rangeModel.forEach((item) => {
                    anotherRangeContainer = item.value.split('-');
                    if (anotherRangeContainer.length > 1) {
                        let sumOfRange = Number(anotherRangeContainer[0]) + Number(anotherRangeContainer[1]);
                        if (isNaN(sumOfRange)) {
                            anotherAlphaContainer.push({ color: item.color, val: item.value, value: item.value });
                        } else {
                            anotherNumericContainer.push({ color: item.color, val: sumOfRange, value: item.value });
                        }
                    } else {
                        anotherAlphaContainer.push({ color: item.color, val: item.value, value: item.value });
                    }
                });
                anotherNumericContainer = anotherNumericContainer.sort(function (a, b) {
                    if (a.val < b.val) {
                        return -1;
                    }
                });

                anotherAlphaContainer = anotherAlphaContainer.sort(function (a, b) {
                    if (a.val.toString().toLowerCase() < b.val.toString().toLowerCase()) {
                        return -1;
                    }
                });
                this.inputRangeModel.rangeModel = anotherNumericContainer.concat(anotherAlphaContainer);
            }
        }
        this.inputRangeModel = this.planogramService.templateRangeModel;
        if(this.highlightService.options){
            this.highlightService.options = this.planogramService.templateRangeModel;
        }
    }

    public changeInItemCount(): void {
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let allPositions = rootObject.getAllPositions();
        let newItemCount = allPositions.length;

        if (this.previousItemCount != newItemCount) {
            this.changedList.emit();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['modelHL'] && changes['modelHL'].currentValue) {
            this.paletteSettings.palette = this.highlightService.blockPalette;
            this.sectionID = this.sharedService.activeSectionID;
            this.currentPogId = Number(this.planogramStore.activeSelectedPog);
            this.savedSearchOptions = this.highlightService.retrieveSavedSearch(this.sectionID);
            this.planogramService.modelHLField(changes['modelHL'].currentValue.field);
            if (!this.modelHL.chosenTemplate) {
                this.setReset();
            } else if(this.highlightService.updateRangeModelFlag){
                this.setReset();
                this.highlightService.updateRangeModelFlag = false;
            }else {
                this.applyTemplate();
            }
            this.planogramService.updateNestedStyleDirty = true;;
            this.planogramService.highlightPositionEmit.next(true);
        }
    }

    public ngOnDestroy(): void {
        this.previousPogId = this.currentPogId;
        this.highlightService.setStringMatchData(this.inputRangeModel.rangeModel, this.inputRangeModel.fieldObjectChosen.name);
    }
}
