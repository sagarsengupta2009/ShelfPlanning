import { 
    Component, 
    OnChanges, 
    SimpleChanges, 
    Input, 
    EventEmitter, 
    Output,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Utils } from 'src/app/shared/constants/utils';
import {
    ModelHL,
    SavedSearch,
    TemplateOptions,
    SpmType,
    RangeItemModel,
    RangeModel,
    PaletteSettings,
} from 'src/app/shared/models';
import { 
    HighlightService, 
    SharedService, 
    PlanogramService, 
    ShoppingCartService, 
    NotifyService 
} from 'src/app/shared/services';
import { Section, Position } from 'src/app/shared/classes';
import { ObjectListItem } from 'src/app/shared/services/common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { Subscription } from 'rxjs';

@Component({
    selector: 'sp-numeric-range',
    templateUrl: './numeric-range.component.html',
    styleUrls: ['./numeric-range.component.scss'],
})
export class NumericRangeComponent implements OnChanges {
    @Input() modelHL: ModelHL;
    @Input() updateRangeModel: Boolean;
    @Output() emitSelection: EventEmitter<number> = new EventEmitter();
    @Output() changeFieldCount: EventEmitter<number> = new EventEmitter();
    private sectionID: string;
    public inputRangeModel: TemplateOptions;
    public model_fieldCount: number = this.highlightService.DEFAULT_FIELDCOUNT;
    public hidePercentageCapacity: boolean = false;
    public hidePercentageLinear: boolean = false;
    public hideCapacity: boolean = false;
    public hideLinear: boolean = false;
    public hideSpm: boolean = false;
    private fieldStr: string;
    private SPMTotal: number;
    private SPMItem: number;
    private capacityOfEachRow: number = 0;
    private TotalLinear: number = 0;
    public SPM: SpmType = {};
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings: PaletteSettings = {
        columns: 17,
        palette: [],
    };
    public advFind: number = 0;
    public savedSearchOptions: SavedSearch[] = [];

    constructor(
        private readonly highlightService: HighlightService,
        public readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private shoppingcartService: ShoppingCartService,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
       
    ) { }

    public get inputMinValue(): number {
        return this.getMinValue(this.modelHL.field);
    }

    public get inputMaxValue(): number {
        const max: number = this.getMaxValue(this.modelHL.field);
        const min: number = this.getMinValue(this.modelHL.field);    
        return max - min;
    }

    //To stop panning when typing on any input field
    public onInputField(event: KeyboardEvent): void {
        if (event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();
        }
    }

    public DoAdvFind(num: number): void {
        this.advFind = num;
        this.highlightService.DoAdvFind(this.savedSearchOptions[num], this.sectionID);
    }

    public emit(id: number): void {
        this.emitSelection.emit(id);
    }

    public get showSystemTemplate(): boolean {
        return (
            this.modelHL.chosenTemplate &&
            !this.modelHL.chosenTemplate.isSystem &&
            this.highlightService.buttonSettings.showAddSysTemp
        );
    }

    public get showUpdate(): boolean {
        return (
            this.modelHL.chosenTemplate &&
            !this.modelHL.chosenTemplate.isSystem &&
            this.highlightService.buttonSettings.showUpdate
        );
    }

    public get showRemove(): boolean {
        return (
            this.modelHL.chosenTemplate &&
            !this.modelHL.chosenTemplate.isSystem &&
            this.highlightService.buttonSettings.showRemove
        );
    }

    public get getStringNameFromField(): string {
        return this.highlightService.getStringNameFromField();
    }

    public get getTemplateName(): string {
        return this.highlightService.buttonSettings.templateName;
    }

    public get toggleTemplate(): boolean {
        return this.highlightService.setRulsetAllocateMode();
    }

    public showSave(): void {
        this.highlightService.buttonSettings.showSaveAs = false;
        this.highlightService.buttonSettings.showSave = true;
    }

    public colorChange(color: string, index: string): void {
        this.inputRangeModel.rangeModel[index]['color'] = color;
        this.planogramService.templateRangeModel.rangeModel = this.inputRangeModel.rangeModel;
        this.sharedService.isListEdited = true;
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public isNaN(num: number, val: number): string | number {
        if (isNaN(num)) {
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.color != undefined) {
                    if (val == dataItem.num) {
                        dataItem.SPM = 'NA';
                    }
                }
            });

            return 'NA';
        }

        this.inputRangeModel.rangeModel.forEach((dataItem) => {
            if (dataItem.color != undefined) {
                if (val == dataItem.num) {
                    dataItem.SPM = num;
                }
            }
        });

        return num;
    }

    public getLinear(item: RangeModel, mum1: number, mum2: number): string {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.GetTotalValue(sectionObj, mum1, mum2, fieldStr);
            let linear: number | string = this.TotalLinear / (sectionObj.AvailableLinear + sectionObj.UsedLinear);
            linear = linear.toPrecision(3);
            linear = Number(linear);
            let linearToShow = this.TotalLinear.toPrecision(4);
            this.TotalLinear = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.num == item.num) {
                    dataItem.linear = linear;
                }
            });
            return linearToShow;
        }
    }

    public getCapacity(index: number, item: RangeModel, mum1: number, mum2: number): string {
        //@Sagar: If (second last row's max value - last row's max value) is equal to 1, then to calculate the capacity only for the last row
        const rows = this.inputRangeModel.rangeModel.length;
        if(index === rows - 1) {
            this.inputRangeModel.rangeModel[index].num - this.inputRangeModel.rangeModel[index - 1].num == 1 ? mum1 = mum2 : ''; 
        }
        this.capacityOfEachRow = 0;
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.GetTotalValue(sectionObj, mum1, mum2, fieldStr);
            let capacity: number | string = this.capacityOfEachRow;
            capacity = capacity;
            capacity = Number(capacity);
            let capacityToShow = this.capacityOfEachRow.toPrecision(4);
            this.capacityOfEachRow = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.num === item.num) {
                    dataItem.capacity = capacityToShow;
                }
            });
            return capacityToShow;
        }
    }

    public getPercentageLinear(mum1: number, mum2: number): number {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.GetTotalValue(sectionObj, mum1, mum2, fieldStr);
            let percentageLinear: number =
                (this.TotalLinear / (sectionObj.AvailableLinear + sectionObj.UsedLinear)) * 100;
            percentageLinear = Math.round(percentageLinear * 100) / 100;
            let HighlightedSPM = this.SPMTotal ? this.SPMItem / this.SPMTotal : 0;
            this.SPM[mum2] = Math.round(HighlightedSPM * 100) / 100;
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.TotalLinear = 0;
            this.inputRangeModel.rangeModel.forEach((item) => {
                if (item.percentageLinear == undefined) {
                    if (item.num == mum1 && item.color != undefined) {
                        item.percentageLinear = percentageLinear;
                    }
                }
            });
            return percentageLinear;
        }
    }

    public getPercentageCapacity(index: number, item: RangeModel, mum1: number, mum2: number): number {
        this.capacityOfEachRow = 0;
        
        //@Sagar: If (second last row's max value - last row's max value) is equal to 1, then to calculate the capacity percentage only for the last row
        const rows = this.inputRangeModel.rangeModel.length;
        if(index === rows - 1) {
            this.inputRangeModel.rangeModel[index].num - this.inputRangeModel.rangeModel[index - 1].num == 1 ? mum1 = mum2 : ''; 
        }

        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        if (
            this.modelHL.fieldObjectChosen.LkUpGroupName &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != null &&
            this.modelHL.fieldObjectChosen.LkUpGroupName != ''
        ) {
            fieldStr = fieldStr + 'text';
        }
        if (sectionObj == null) {
        } else {
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.GetTotalValue(sectionObj, mum1, mum2, fieldStr);
            let capacity: number | string = this.capacityOfEachRow;
            let capacityToCalculatePercentage: number = 0;
            this.inputRangeModel.rangeModel.forEach((dataItem) => {
                if (dataItem.num === item.num) {
                    dataItem.capacity = capacity;
                    dataItem.capacityOfEachRow = Number(capacity);
                }
                !dataItem.capacityOfEachRow ? dataItem.capacityOfEachRow = 0 : '';
                capacityToCalculatePercentage = capacityToCalculatePercentage + dataItem.capacityOfEachRow;
            });
            let percentageCapacity: number = capacity
                ? (this.capacityOfEachRow / capacityToCalculatePercentage) * 100
                : 0;
            percentageCapacity = Math.round(percentageCapacity * 100) / 100;
            let HighlightedSPM = this.SPMTotal ? this.SPMItem / this.SPMTotal : 0;
            this.SPM[mum2] = Math.round(HighlightedSPM * 100) / 100;
            this.SPMItem = 0;
            this.SPMTotal = 0;
            this.capacityOfEachRow = 0;
            this.inputRangeModel.rangeModel.forEach((item) => {
                if (!item.percentageCapacity) {
                    if (item.num === mum1 && item.color) {
                        item.percentageCapacity = percentageCapacity;
                    }
                }
            });
            return percentageCapacity;
        }
    }

    public validateKeyup(event: KeyboardEvent): boolean {
        if (event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();
        }
        let numberValue = this.model_fieldCount;
        let fieldStr = this.modelHL.field;

        if (numberValue > 100) {
            this.model_fieldCount = undefined;
            this.notifyService.warn(this.translate.instant('COUNT_CAN_NOT_BE_MORE_THAN') + '' + ` ${100}`);
            return false;
        }

        if(numberValue === 0) {
            this.model_fieldCount = 1;
            this.notifyService.warn(`PLEASE_ENTER_VALID_COUNT`);
            return false;
        }

        let max: number = this.getMaxValue(fieldStr);
        let min: number = this.getMinValue(fieldStr);
        this.sharedService.isListEdited = true;
        let countRange: number = max - min;
        this.changeFieldCount.emit(this.model_fieldCount);
        if (numberValue > countRange) {
            this.model_fieldCount = Math.floor(countRange);     
            this.notifyService.warn(this.translate.instant('COUNT_CAN_NOT_BE_MORE_THAN') + '' + ` ${this.model_fieldCount}`);
            return false;
        }
    }

    public isNumeric(value: string, indx: number): boolean {
        this.fieldStr = value;
        if (value == undefined) {
            return;
        }
        let alphaNumericExpression = /^$|^[A-Za-z0-9 _-]+$/;
        if (!this.fieldStr.match(alphaNumericExpression)) {
            this.inputRangeModel.rangeModel[indx].label = '';

            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        } else {
            setTimeout(() => {
                this.sharedService.isListEdited = true;
                if (this.sharedService.enableHighlightInWorksheet) {
                    this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
                }
            }, 500);
        }
    }

    public updateDecimalRangeByone(num: number): number {
        if (num != undefined || num != null) {
            if (this?.modelHL?.fieldObjectChosen?.DataType == 4) { //For Float Datatypes
                const numIncrement = parseFloat(num.toString()) + 0.01;
                return parseFloat(numIncrement.toFixed(2));
            } else {
                return parseFloat(num.toString()) + 1;
            }
        }
    }

    private GetTotalValue(obj: ObjectListItem, num1: number, num2: number, searchValue: string): void {
        let modifiedObjectArray: string[] = searchValue.split('.');
        if (modifiedObjectArray.length > 1) {
            if (obj.hasOwnProperty('Children') && !Utils.checkIfShoppingCart(obj)) {
                obj.Children.forEach((child) => {
                    if (Utils.checkIfPosition(child as Position)) {
                        let modifiedModelPosValue1 = child.Position[modifiedObjectArray[0]];
                        let modifiedModelPosValue2: number | boolean;
                        if (modifiedModelPosValue1 != undefined) {
                            modifiedModelPosValue2 = child.Position[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductValue1 = child.Position.Product[modifiedObjectArray[0]];
                        let modifiedModelProductValue2: number;
                        if (modifiedModelProductValue1 != undefined) {
                            modifiedModelProductValue2 =
                                child.Position.Product[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductPkgValue1 = child.Position.ProductPackage[modifiedObjectArray[0]];
                        let modifiedModelProductPkgValue2: number;
                        if (modifiedModelProductPkgValue1 != undefined) {
                            modifiedModelProductPkgValue2 =
                                child.Position.ProductPackage[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelPosAttrValue1 = child.Position.attributeObject[modifiedObjectArray[0]];
                        let modifiedModelPosAttrValue2: number;
                        if (modifiedModelPosAttrValue1 != undefined) {
                            modifiedModelPosAttrValue2 =
                                child.Position.attributeObject[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        if (
                            modifiedModelPosValue1 != undefined &&
                            modifiedModelPosValue2 != undefined &&
                            modifiedModelPosValue1 !== '' &&
                            modifiedModelPosValue1 != null &&
                            modifiedModelPosValue2 != null
                        ) {
                            if (typeof modifiedModelPosValue2 === 'boolean') {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            } else {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                                if (num1 <= modifiedModelPosValue2 && modifiedModelPosValue2 <= num2) {
                                    this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                }
                            }
                        } else if (
                            modifiedModelProductValue1 != undefined &&
                            modifiedModelProductValue2 != undefined &&
                            modifiedModelProductValue1 !== '' &&
                            modifiedModelProductValue1 != null &&
                            modifiedModelProductValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelProductValue2 && modifiedModelProductValue2 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductPkgValue1 != undefined &&
                            modifiedModelProductPkgValue2 != undefined &&
                            modifiedModelProductPkgValue1 !== '' &&
                            modifiedModelProductPkgValue1 != null &&
                            modifiedModelProductPkgValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelProductPkgValue2 && modifiedModelProductPkgValue2 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelPosAttrValue1 != undefined &&
                            modifiedModelPosAttrValue2 != undefined &&
                            modifiedModelPosAttrValue1 !== '' &&
                            modifiedModelPosAttrValue1 != null &&
                            modifiedModelPosAttrValue2 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelPosAttrValue2 && modifiedModelPosAttrValue2 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        }
                    }
                    this.GetTotalValue(child, num1, num2, searchValue);
                }, obj);
            }
        } else {
            if (obj.hasOwnProperty('Children') && !Utils.checkIfShoppingCart(obj)) {
                obj.Children.forEach((child) => {
                    if (child.asPosition()) {
                        let modifiedModelPosValue1 = child.Position[searchValue];
                        let modifiedModelProductValue1 = child.Position.Product[searchValue];
                        let modifiedModelProductPkgValue1 = child.Position.ProductPackage[searchValue];
                        let modifiedModelPosAttrValue1 = child.Position.attributeObject[searchValue];
                        if (
                            modifiedModelPosValue1 != undefined &&
                            modifiedModelPosValue1 !== '' &&
                            modifiedModelPosValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelPosValue1 && modifiedModelPosValue1 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductValue1 != undefined &&
                            modifiedModelProductValue1 !== '' &&
                            modifiedModelProductValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelProductValue1 && modifiedModelProductValue1 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelProductPkgValue1 != undefined &&
                            modifiedModelProductPkgValue1 !== '' &&
                            modifiedModelProductPkgValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelProductPkgValue1 && modifiedModelProductPkgValue1 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        } else if (
                            modifiedModelPosAttrValue1 != undefined &&
                            modifiedModelPosAttrValue1 !== '' &&
                            modifiedModelPosAttrValue1 != null
                        ) {
                            this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                            if (num1 <= modifiedModelPosAttrValue1 && modifiedModelPosAttrValue1 <= num2) {
                                this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                            }
                        }
                    }
                    this.GetTotalValue(child, num1, num2, searchValue);
                }, obj);
            }
        }
    }

    public getRangeModel(lower: number, upper: number, count: number, dataType: string): RangeItemModel[] {
        let rangeModel: RangeItemModel[] = [];
        let colorPalette: string[] = [];
        count = Number(count);
        lower = Number(lower);
        upper = Number(upper);
        if (upper - lower == 0) {
            count = 1;
        }
        this.model_fieldCount = count;
        if (count < 15) {
            colorPalette = this.highlightService.getStdColorPalette(count);
        } else {
            colorPalette = this.highlightService.getExtendedColorPalette(count); // is this if count > 1
        }
        if (colorPalette.length < count) {
            // if the fillCount was greater than 1000, we are just going to duplicate the beginning
            // of the palette.  After a 1000, you can't really tell the diff between the colors.
            let emptyColorsToFill = count - colorPalette.length;
            for (let i = 0; i < emptyColorsToFill; i++) colorPalette.push(colorPalette[i]);
        }
        let interval = Number((upper - lower) / count);
        for (let i = 0; i <= count; i++) {
            if (i == 0) {
                rangeModel.push({ color: colorPalette[i], num: this.highlightService.MathRound(lower) });
            }
            if (i == count) {
                rangeModel.push({ color: colorPalette[i], num: this.highlightService.MathRound(upper) });
            }
            if (i > 0 && i < count) {
                let val = lower + i * interval;
                if (dataType == 'int') {
                    val = Math.ceil(val);
                }
                rangeModel.push({ color: colorPalette[i], num: this.highlightService.MathRound(val) });
            }
        }
        if(this.highlightService.options){
            this.highlightService.options.rangeModel = rangeModel;
        }
        return rangeModel;
    }

    public COLOR_LUMINANCE(hex: string, lum: number): string {
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

    public trackByFn(index: number, itm: RangeModel) {
        return `${index}___${itm.lastModified}`;
    }

    public updateRange(indx: number, minVal: number, newVal: number): void {
        let fieldStr: string = this.modelHL.field;
        this.inputRangeModel.rangeModel[indx].lastModified = Date.now();
        if (newVal != undefined) {
            if (Number(newVal) <= minVal) {
                if(Number(newVal) == 0 && minVal == 0 && indx == 1 && this.getMinValue(this.modelHL.field) <= 0){
                    this.inputRangeModel.rangeModel[indx].num = minVal;
                }else{
                    this.inputRangeModel.rangeModel[indx].num = minVal +1;
                }
              
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
                    if(Number(newVal) == 0 && minVal == 0 && indx == 1  && this.getMinValue(this.modelHL.field) <= 0){
                        this.inputRangeModel.rangeModel[indx].num = minVal;
                    }else{
                        this.inputRangeModel.rangeModel[indx].num = (minVal +1) > this.getMaxValue(fieldStr)? minVal: minVal +1;
                    }
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
        this.model_fieldCount = this.planogramService.templateRangeModel.rangeModel.length - 1;
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
    }

    private getFieldPath(fieldChoosen): string {
        return fieldChoosen.calculatedFieldPath || fieldChoosen.FieldPath || fieldChoosen.field;
    }

    public getMaxValue(fieldName?: string): number {
        if(Context.numericRangeMaxVal[this.sharedService.activeSectionID] !== null) {
            return Context.numericRangeMaxVal[this.sharedService.activeSectionID];
        }
        const modelHLField = this.modelHL ? this.modelHL?.field:this.highlightService.options?.fieldObjectChosen?.fieldStr;
        fieldName = fieldName || modelHLField;
        const field = this.modelHL?.fieldObjectChosen ? this.modelHL?.fieldObjectChosen :this.highlightService.options?.fieldObjectChosen? this.highlightService.modelHL.fieldObjectChosen:this.highlightService.options?.fieldObjectChosen;
        const fieldPath = this.getFieldPath(field);
        const sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        
        if (this.shoppingcartService.floatingShelvesConfig.enabled) {
            const cartObj = Utils.getShoppingCartObj(sectionObj?.Children);
            if (this.highlightService.MathRound(cartObj.getMaxPropertyValue(fieldName, fieldPath)) > 
                this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath))) {
                Context.numericRangeMaxVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(cartObj.getMaxPropertyValue(fieldName, fieldPath));
            } else {
                Context.numericRangeMaxVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath));
            }
        } else {
            if (sectionObj) {
                Context.numericRangeMaxVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath));
            }      
        } 
        return Context.numericRangeMaxVal[this.sharedService.activeSectionID];
    }

    public getMinValue(fieldName: string): number {  
        if(Context.numericRangeMinVal[this.sharedService.activeSectionID] !== null) {
            return Context.numericRangeMinVal[this.sharedService.activeSectionID];
        } 
        const modelHLField = this.modelHL ? this.modelHL?.field:this.highlightService.options?.fieldObjectChosen?.fieldStr;
        fieldName = fieldName || modelHLField;
        const field = this.modelHL?.fieldObjectChosen ? this.modelHL?.fieldObjectChosen :this.highlightService.options?.fieldObjectChosen? this.highlightService.modelHL.fieldObjectChosen:this.highlightService.options?.fieldObjectChosen;
        const fieldPath = this.getFieldPath(field);
        const sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;

        if(this.shoppingcartService.floatingShelvesConfig.enabled) { 
            const cartObj = Utils.getShoppingCartObj(sectionObj?.Children);
            if (this.highlightService.MathRound(cartObj.getMinPropertyValue(fieldName, fieldPath)) < 
                this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath))) {
                Context.numericRangeMinVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(cartObj.getMinPropertyValue(fieldName, fieldPath));
            } else {
                Context.numericRangeMinVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath));
            }
        } else {
            if (sectionObj) {
                Context.numericRangeMinVal[this.sharedService.activeSectionID] = this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath));
            }   
        }  
        return Context.numericRangeMinVal[this.sharedService.activeSectionID];      
    }

    private applyTemplate(): void {
        this.inputRangeModel = this.planogramService.templateRangeModel;
        if (
            this.modelHL.chosenTemplate.options.rangeModel != undefined &&
            this.modelHL.chosenTemplate.options.rangeModel != null
        ) {
            this.inputRangeModel = this.modelHL.chosenTemplate.options;
           // this.setFill();

        }
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
        if (this.inputRangeModel.rangeModel[0].percentageLinear) {
            this.hidePercentageLinear = true;
            this.hideLinear = true;
        }

        if (this.inputRangeModel.rangeModel[0].percentageCapacity) {
            this.hidePercentageCapacity = true;
            this.hideCapacity = true;
        }

        if (this.inputRangeModel.rangeModel[1].SPM != undefined) {
            this.hideSpm = true;
        }
        this.highlightService.buttonSettings.showSaveAs = true;
        this.model_fieldCount = this.inputRangeModel.rangeModel.length - 1;
    }

    public setFill(): void {
        let fieldStr: string = this.modelHL.field;
        let dataType: string = this.modelHL.fieldObjectChosen.DataTypeDesc;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'Numeric Range';
        if(this.inputRangeModel?.rangeModel) {
            this.sharedService.isListEdited = this.model_fieldCount !== this.inputRangeModel.rangeModel.length - 1 ? true : false;
        }
        this.planogramService.templateRangeModel.rangeModel = this.getRangeModel(
            this.getMinValue(fieldStr),
            this.getMaxValue(fieldStr),
            this.model_fieldCount,
            dataType,
        );
        if(this.highlightService.options){
            this.highlightService.options = this.planogramService.templateRangeModel
        }
        this.inputRangeModel = this.planogramService.templateRangeModel;
    }

    public setReset(): void {
        this.model_fieldCount = this.highlightService.DEFAULT_FIELDCOUNT;
        this.highlightService.resetTemplateRangeModel();
        this.highlightService.resetTemplateName();
        this.setFill();
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['modelHL'] && changes['modelHL'].currentValue) {
            this.paletteSettings.palette = this.highlightService.blockPalette;
            this.sectionID = this.sharedService.activeSectionID;
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
            this.planogramService.updateNestedStyleDirty = true;
            this.planogramService.highlightPositionEmit.next(true);
        }
    }
}
