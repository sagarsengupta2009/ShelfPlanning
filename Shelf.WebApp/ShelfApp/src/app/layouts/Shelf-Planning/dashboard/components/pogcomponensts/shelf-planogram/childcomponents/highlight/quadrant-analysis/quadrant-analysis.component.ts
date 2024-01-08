import { Component, EventEmitter, Output, Input, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { uniqBy, min, max } from 'lodash-es';
import { Position, Section } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants/utils';
import {
    FieldObjectChosen,
    ModelHL,
    PaletteSettings,
    RangeModelPosition,
    RangeModelValues,
    SavedSearch,
    TemplateOptions,
} from 'src/app/shared/models';
import { SharedService, PlanogramService, HighlightService } from 'src/app/shared/services';

@Component({
    selector: 'sp-quadrant-analysis',
    templateUrl: './quadrant-analysis.component.html',
    styleUrls: ['./quadrant-analysis.component.scss'],
})
export class QuadrantAnalysisComponent implements OnChanges {
    @ViewChild('slider1') range;
    @ViewChild('slider2') range1;
    public sectionID: string;
    @Input() modelHL: ModelHL;
    @Input() updateRangeModel: Boolean;
    @Output() emitSelection = new EventEmitter();
    public savedSearchOptions: SavedSearch[] = [];
    public inputRangeModel: TemplateOptions;
    public destArray: Position[];
    public values: Array<RangeModelValues> = [];
    private capacityOfEachRow: number = 0;
    public SPMTotal: number = 0;
    public SPMItem: number = 0;
    public TotalLinear: number = 0;
    public showQuadrantPercentageCapacity: boolean = false;
    public showQuadrantCapacity: boolean = false;
    public showQuadrantPercentageLinear: boolean = false;
    public showQuadrantLinear: boolean = false;
    public showSPM: boolean = false;
    public totalVal: number;
    public totalValQ: number;
    public ll: RangeModelPosition[] = [];
    public hh: RangeModelPosition[] = [];
    public lh: RangeModelPosition[] = [];
    public hl: RangeModelPosition[] = [];
    public finalTotalQuadrantLinear: number = 0;
    public finalTotalQuadrantCapacity: number = 0;
    public fieldStr: string;
    public advFind: number = 0;
    public minimum: number;
    public maximum: number;
    public minimumQ: number;
    public maximumQ: number;
    someKeyboardConfig1 = {
        connect: [true, true],
        start: [],
        step: 1,
        tooltips: true,
        range: {
            min: 0,
            max: 100,
        },
        pips: {
            mode: 'range',
            density: 3,
        },

        behaviour: 'drag',
    };
    public sliderRange1: number;
    someKeyboardConfig2 = {
        connect: [true, true],
        start: [],
        step: 1,
        tooltips: true,
        range: {
            min: 0,
            max: 100,
        },
        pips: {
            mode: 'range',
            density: 3,
        },
        behaviour: 'drag',
    };

    public sliderRange2: number;

    public gradientSettings = {
        opacity: false,
    };

    public paletteSettings: PaletteSettings = {
        columns: 17,
        palette: [],
    };

    constructor(
        private readonly highlightService: HighlightService,
        public readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
    ) {}

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

    public get getStringNameFromFieldQ(): string {
        return this.highlightService.getStringNameFromFieldQ();
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

    public colorChange(color: string, $index: string): void {
        this.values[$index].color = color;
        this.planogramService.templateRangeModel.rangeModel = this.values.slice(0);
        this.sharedService.isListEdited = true;
        this.minandmax();
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    private getFieldPath(fieldChoosen: FieldObjectChosen): string {
        if (fieldChoosen.FieldPath) {
            return fieldChoosen.FieldPath;
        } else {
            return fieldChoosen.field;
        }
    }

    public isNumeric(value: string, indx: number): boolean {
        this.fieldStr = value;
        if (value == undefined) {
            return;
        }
        var alphaNumericExpression = /^$|^[A-Za-z0-9 _-]+$/;
        if (!this.fieldStr.match(alphaNumericExpression)) {
            this.values[indx].label = '';
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

    private GetTotalValue(obj: Section, searchValue: string, num1?: number, num2?: number): void {
        let modifiedObjectArray: string[] = searchValue.split('.');
        if (modifiedObjectArray.length > 1) {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
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
                    this.GetTotalValue(child, searchValue, num1, num2);
                }, obj);
            }
        } else {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        if (this.ll.length != 0) {
                            this.ll.forEach((dataItem, key) => {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                                if (dataItem.IDPogObject == child.IDPOGObject) {
                                    this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                    dataItem.linear = this.TotalLinear;
                                    dataItem.SPM = this.SPMItem;
                                    dataItem.capacity = this.capacityOfEachRow;
                                }
                            });
                        }
                        if (this.hh.length != 0) {
                            this.hh.forEach((dataItem, key) => {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                                if (dataItem.IDPogObject == child.IDPOGObject) {
                                    this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                    dataItem.linear = this.TotalLinear;
                                    dataItem.SPM = this.SPMItem;
                                    dataItem.capacity = this.capacityOfEachRow;
                                }
                            });
                        }
                        if (this.hl.length != 0) {
                            this.hl.forEach((dataItem, key) => {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                                if (dataItem.IDPogObject == child.IDPOGObject) {
                                    this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                    dataItem.linear = this.TotalLinear;
                                    dataItem.SPM = this.SPMItem;
                                    dataItem.capacity = this.capacityOfEachRow;
                                }
                            });
                        }
                        if (this.lh.length != 0) {
                            this.lh.forEach((dataItem, key) => {
                                this.SPMTotal = this.SPMTotal + child.Position.attributeObject['SPM'];
                                if (dataItem.IDPogObject == child.IDPOGObject) {
                                    this.TotalLinear = this.TotalLinear + child.Position['UsedLinear'];
                                    this.SPMItem = this.SPMItem + child.Position.attributeObject['SPM'];
                                    this.capacityOfEachRow = this.capacityOfEachRow + child.Position['Capacity'];
                                    dataItem.linear = this.TotalLinear;
                                    dataItem.SPM = this.SPMItem;
                                    dataItem.capacity = this.capacityOfEachRow;
                                }
                            });
                        }
                        this.TotalLinear = 0;
                        this.capacityOfEachRow = 0;
                    }
                    this.GetTotalValue(child, searchValue);
                }, obj);
            }
        }
    }

    private getQuadrantCapacity(): void {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        var fieldStr = this.modelHL.field;
        this.SPMItem = 0;
        this.SPMItem = 0;
        this.GetTotalValue(sectionObj, fieldStr);
        let capacityForLl = 0;
        let capcityForHh = 0;
        let capcityForLh = 0;
        let capcityForHl = 0;
        let spmForLl = 0;
        let spmForHh = 0;
        let spmForLh = 0;
        let spmForHl = 0;
        this.ll.forEach((dataItem) => {
            capacityForLl = capacityForLl + dataItem.capacity;
            spmForLl = spmForLl + dataItem.SPM;
        });
        this.hh.forEach((dataItem) => {
            capcityForHh = capcityForHh + dataItem.capacity;
            spmForHh = spmForHh + dataItem.SPM;
        });
        this.lh.forEach((dataItem) => {
            capcityForLh = capcityForLh + dataItem.capacity;
            spmForLh = spmForLh + dataItem.SPM;
        });
        this.hl.forEach((dataItem) => {
            capcityForHl = capcityForHl + dataItem.capacity;
            spmForHl = spmForHl + dataItem.SPM;
        });
        this.finalTotalQuadrantCapacity = capacityForLl + capcityForHh + capcityForLh + capcityForHl;
        this.values.forEach((dataItem) => {
            if (dataItem.range == 'hh') {
                dataItem.quadrantCapacity = capcityForHh.toPrecision(5);
                dataItem.SPM = spmForHh;
            } else if (dataItem.range == 'll') {
                dataItem.quadrantCapacity = capacityForLl.toPrecision(5);
                dataItem.SPM = spmForLl;
            } else if (dataItem.range == 'lh') {
                dataItem.quadrantCapacity = capcityForLh.toPrecision(5);
                dataItem.SPM = spmForLh;
            } else if (dataItem.range == 'hl') {
                dataItem.quadrantCapacity = capcityForHl.toPrecision(5);
                dataItem.SPM = spmForHl;
            }
        });
    }

    private getQuadrantLinear(): void {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        var fieldStr = this.modelHL.field;
        this.SPMItem = 0;
        this.SPMItem = 0;
        this.GetTotalValue(sectionObj, fieldStr);
        let linearForLl = 0;
        let linearForHh = 0;
        let linearForLh = 0;
        let linearForHl = 0;
        let spmForLl = 0;
        let spmForHh = 0;
        let spmForLh = 0;
        let spmForHl = 0;
        this.ll.forEach((dataItem) => {
            linearForLl = linearForLl + dataItem.linear;
            spmForLl = spmForLl + dataItem.SPM;
        });
        this.hh.forEach((dataItem) => {
            linearForHh = linearForHh + dataItem.linear;
            spmForHh = spmForHh + dataItem.SPM;
        });
        this.lh.forEach((dataItem) => {
            linearForLh = linearForLh + dataItem.linear;
            spmForLh = spmForLh + dataItem.SPM;
        });
        this.hl.forEach((dataItem) => {
            linearForHl = linearForHl + dataItem.linear;
            spmForHl = spmForHl + dataItem.SPM;
        });
        this.finalTotalQuadrantLinear = linearForLl + linearForHh + linearForLh + linearForHl;
        this.values.forEach((dataItem) => {
            if (dataItem.range == 'hh') {
                dataItem.quadrantLinear = linearForHh.toPrecision(5);
                dataItem.SPM = spmForHh;
            } else if (dataItem.range == 'll') {
                dataItem.quadrantLinear = linearForLl.toPrecision(5);
                dataItem.SPM = spmForLl;
            } else if (dataItem.range == 'lh') {
                dataItem.quadrantLinear = linearForLh.toPrecision(5);
                dataItem.SPM = spmForLh;
            } else if (dataItem.range == 'hl') {
                dataItem.quadrantLinear = linearForHl.toPrecision(5);
                dataItem.SPM = spmForHl;
            }
        });
    }

    public toggleSpectrumSpm(): void {
        this.showSPM = !this.showSPM;
        if (this.showSPM) {
            this.getQuadrantLinear();
            this.planogramService.templateRangeModel.rangeModel.rangeValues = this.values.slice(0);
        }
    }

    public toggleQuadrantCapacity(): void {
        this.showQuadrantCapacity = !this.showQuadrantCapacity;
        if (this.showQuadrantCapacity) {
            let totalCount =
                this.planogramService.rangeValues.hh.length +
                this.planogramService.rangeValues.hl.length +
                this.planogramService.rangeValues.lh.length +
                this.planogramService.rangeValues.ll.length;
            this.getQuadrantCapacity();
            this.planogramService.templateRangeModel.rangeModel;
        }
    }

    public toggleQuadrantLinear(): void {
        this.showQuadrantLinear = !this.showQuadrantLinear;
        if (this.showQuadrantLinear) {
            let totalCount =
                this.planogramService.rangeValues.hh.length +
                this.planogramService.rangeValues.hl.length +
                this.planogramService.rangeValues.lh.length +
                this.planogramService.rangeValues.ll.length;
            this.getQuadrantLinear();
            this.planogramService.templateRangeModel.rangeModel;
        }
    }

    public toggleQuadrantPercentageCapacity(): void {
        this.showQuadrantPercentageCapacity = !this.showQuadrantPercentageCapacity;
        if (this.showQuadrantPercentageCapacity) {
            this.getQuadrantCapacity();
            this.values.forEach((item) => {
                item.quadrantPercentageCapacity = (
                    (Number(item.quadrantCapacity) / this.finalTotalQuadrantCapacity) *
                    100
                ).toPrecision(5);
            });
        }
    }

    public toggleQuadrantPercentageLinear(): void {
        this.showQuadrantPercentageLinear = !this.showQuadrantPercentageLinear;
        if (this.showQuadrantPercentageLinear) {
            this.getQuadrantLinear();
            this.values.forEach((item) => {
                item.quadrantPercentageLinear = (
                    (Number(item.quadrantLinear) / this.finalTotalQuadrantLinear) *
                    100
                ).toPrecision(5);
            });
        }
    }

    public setFill(fromFill?:boolean): void {
        this.getPositionsData();
        if(fromFill){
            this.createSliders();
        }
        this.values = [];
        this.inputRangeModel = this.planogramService.templateRangeModel;
        this.minandmax();
        this.values.push(
            {
                color: '#00FF00',
                range: 'hh',
                value:
                    'High: ' +
                    this.highlightService.getStringNameFromField() +
                    '  -  High: ' +
                    this.highlightService.getStringNameFromFieldQ() +
                    '',
            },
            {
                color: '#0000FF',
                range: 'hl',
                value:
                    'High: ' +
                    this.highlightService.getStringNameFromField() +
                    '  -  Low: ' +
                    this.highlightService.getStringNameFromFieldQ() +
                    '',
            },
            {
                color: '#FFFF00',
                range: 'lh',
                value:
                    'Low: ' +
                    this.highlightService.getStringNameFromField() +
                    '  -  High: ' +
                    this.highlightService.getStringNameFromFieldQ() +
                    '',
            },
            {
                color: '#FF0000',
                range: 'll',
                value:
                    'Low: ' +
                    this.highlightService.getStringNameFromField() +
                    '  -  Low: ' +
                    this.highlightService.getStringNameFromFieldQ() +
                    '',
            },
        );

        if (this.planogramService.templateRangeModel.fieldStr == this.planogramService.templateRangeModel.fieldStrQ) {
            this.maximum = 0;
            this.maximumQ = 0;
        }
        let timer = setInterval(() => {
            if (this.range && this.range1) {
                clearInterval(timer);
                if (this.maximum == 0 || this.maximumQ == 0) {
                    this.planogramService.templateRangeModel.rangeModel = this.values;
                    let startArr = [];
                    let spltVal = this.range ? this.range.slider.get() : this.someKeyboardConfig1.start[0];
                    let spltValQ = this.range1 ? this.range1.slider.get() : this.someKeyboardConfig2.start[0];
                    startArr.push(Number(spltVal));
                    startArr.push(Number(spltValQ));
                    this.planogramService.templateRangeModel.startArr = startArr;
                    this.planogramService.templateRangeModel.rangeModel.isNoHighlight = true;
                } else {
                    this.planogramService.templateRangeModel.rangeModel = this.values;
                    let startArr = [];
                    let spltVal = this.range ? this.range.slider.get() : this.someKeyboardConfig1.start[0];
                    let spltValQ = this.range1 ? this.range1.slider.get() : this.someKeyboardConfig2.start[0];
                    startArr.push(Number(spltVal));
                    startArr.push(Number(spltValQ));
                    this.planogramService.templateRangeModel.startArr = startArr;
                    this.planogramService.templateRangeModel.rangeModel.isNoHighlight = false;
                }
                if (this.showQuadrantLinear) {
                    this.showQuadrantLinear = !this.showQuadrantLinear;
                    this.toggleQuadrantLinear();
                }
                if (this.showQuadrantCapacity) {
                    this.showQuadrantCapacity = !this.showQuadrantCapacity;
                    this.toggleQuadrantCapacity();
                }
                if (this.showQuadrantPercentageLinear) {
                    this.showQuadrantPercentageLinear = !this.showQuadrantPercentageLinear;
                    this.toggleQuadrantPercentageLinear();
                }
                if (this.showQuadrantPercentageCapacity) {
                    this.showQuadrantPercentageCapacity = !this.showQuadrantPercentageCapacity;
                    this.toggleQuadrantPercentageCapacity();
                }
                if (this.showSPM) {
                    this.showSPM = !this.showSPM;
                    this.toggleSpectrumSpm();
                }
                this.planogramService.updateNestedStyleDirty = true;;
                this.planogramService.highlightPositionEmit.next(true);
                if (this.sharedService.enableHighlightInWorksheet) {
                    this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
                }
                if(this.highlightService.options){
                    this.highlightService.options = this.planogramService.templateRangeModel;
                }
            }
        }, 250);
    }

    private minandmax(): void {
        let totalVal = 0;
        let fieldStr = this.modelHL.field;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'QUADRANT_ANALYSIS';
        let totalValQ = 0;
        let fieldStrQ = this.modelHL.fieldQ;
        let dataType = this.modelHL.fieldObjectChosen.dataType;
        this.planogramService.templateRangeModel.fieldObjectChosenQ = this.modelHL.fieldObjectChosenQ;
        this.planogramService.templateRangeModel.fieldStrQ = fieldStrQ;
        let timer = setInterval(() => {
            if (this.range && this.range1) {
                clearInterval(timer);
                let spltVal = this.range.slider.get();
                let spltValQ = this.range1.slider.get();
                let ll = [];
                let hh = [];
                let lh = [];
                let hl = [];
                this.ll = [];
                this.hh = [];
                this.lh = [];
                this.hl = [];
                for (const element of this.destArray) {
                    const valP = Utils.findPropertyValue(
                        element,
                        fieldStr,
                        undefined,
                        this.getFieldPath(this.modelHL.fieldObjectChosen),
                    );
                    const valPQ = Utils.findPropertyValue(
                        element,
                        fieldStrQ,
                        undefined,
                        this.getFieldPath(this.modelHL.fieldObjectChosenQ),
                    );
                    if (valP < spltVal && valPQ < spltValQ) ll.push(element.IDPOGObject);
                    if (valP >= spltVal && valPQ >= spltValQ) hh.push(element.IDPOGObject);
                    if (valP >= spltVal && valPQ < spltValQ) hl.push(element.IDPOGObject);
                    if (valP < spltVal && valPQ >= spltValQ) lh.push(element.IDPOGObject);
                }
                this.planogramService.rangeValues['ll'] = ll;
                ll.forEach((item) => {
                    this.ll.push({ IDPogObject: item });
                });
                this.planogramService.rangeValues['hh'] = hh;
                hh.forEach((item) => {
                    this.hh.push({ IDPogObject: item });
                });
                this.planogramService.rangeValues['lh'] = lh;
                lh.forEach((item) => {
                    this.lh.push({ IDPogObject: item });
                });
                this.planogramService.rangeValues['hl'] = hl;
                hl.forEach((item) => {
                    this.hl.push({ IDPogObject: item });
                });
            }
        }, 250);
    }

    private createSliders(): void {
        let start = [50];
        let totalVal = 0;
        let totalValQ = 0;
        let fieldStr = this.modelHL.field;
        let fieldStrQ = this.modelHL.fieldQ;
        let itemValRel: any[] = [];
        let itemValRelQ: any[] = [];
        for (const element of this.destArray) {
            const valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;

            const valPQ = Utils.findPropertyValue(
                element,
                fieldStrQ,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosenQ),
            );
            totalValQ = totalValQ + valPQ;

            itemValRel.push({ IDPogObject: element.IDPOGObject, Value: valP });
            itemValRelQ.push({ IDPogObject: element.IDPOGObject, Value: valPQ });
        }
        this.minimum = min(
            itemValRel.map(function (rec) {
                return rec.Value;
            }),
        )
            ? min(
                  itemValRel.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.maximum = max(
            itemValRel.map(function (rec) {
                return rec.Value;
            }),
        )
            ? max(
                  itemValRel.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.minimumQ = min(
            itemValRelQ.map(function (rec) {
                return rec.Value;
            }),
        )
            ? min(
                  itemValRelQ.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.maximumQ = max(
            itemValRelQ.map(function (rec) {
                return rec.Value;
            }),
        )
            ? max(
                  itemValRelQ.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.totalVal = totalVal;
        this.totalValQ = totalValQ;
        //should create UIslider
        if (!this.range) {
            //1st slider
            this.someKeyboardConfig1.connect = [true, true];
            this.someKeyboardConfig1.start = start;
            this.someKeyboardConfig1.range = {
                min: this.minimum,
                max: this.maximum,
            };
            //2st slider
            this.someKeyboardConfig2.connect = [true, true];
            this.someKeyboardConfig2.start = start;
            this.someKeyboardConfig2.range = {
                min: this.minimumQ,
                max: this.maximumQ,
            };
        }
        //update slider
        else {
            this.range.slider.updateOptions({
                range: {
                    min: this.minimum,
                    max: this.maximum,
                },
            }); //slider1
            this.range1.slider.updateOptions({
                range: {
                    min: this.minimumQ,
                    max: this.maximumQ,
                },
            }); //slider2
        }
    }

    private setReset(): void {
        this.highlightService.resetTemplateRangeModel();
        this.highlightService.resetTemplateName();
        let start = [50];
        let fieldStr = this.modelHL.field;
        let fieldStrQ = this.modelHL.fieldQ;
        let itemValRel = [];
        let itemValRelQ = [];
        for (const element of this.destArray) {
            const valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            const valPQ = Utils.findPropertyValue(
                element,
                fieldStrQ,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosenQ),
            );
            itemValRel.push({ IDPogObject: element.IDPOGObject, Value: valP });
            itemValRelQ.push({ IDPogObject: element.IDPOGObject, Value: valPQ });
        }
        this.minimum = min(
            itemValRel.map(function (rec) {
                return rec.Value;
            }),
        )
            ? min(
                  itemValRel.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.maximum = max(
            itemValRel.map(function (rec) {
                return rec.Value;
            }),
        )
            ? max(
                  itemValRel.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.minimumQ = min(
            itemValRelQ.map(function (rec) {
                return rec.Value;
            }),
        )
            ? min(
                  itemValRelQ.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;
        this.maximumQ = max(
            itemValRelQ.map(function (rec) {
                return rec.Value;
            }),
        )
            ? max(
                  itemValRelQ.map(function (rec) {
                      return rec.Value;
                  }),
              )
            : 0;

        /// destroy and create slider
        //should create UIslider
        if (!this.range) {
            //1st slider
            this.someKeyboardConfig1.connect = [true, true];
            this.someKeyboardConfig1.start = start;
            this.someKeyboardConfig1.range = {
                min: this.minimum,
                max: this.maximum,
            };
            //2st slider
            this.someKeyboardConfig2.connect = [true, true];
            this.someKeyboardConfig2.start = start;
            this.someKeyboardConfig2.range = {
                min: this.minimumQ,
                max: this.maximumQ,
            };
        }
        //update slider
        else {
            this.range.slider.updateOptions({
                range: {
                    min: this.minimum,
                    max: this.maximum,
                },
            }); //slider1
            this.range1.slider.updateOptions({
                range: {
                    min: this.minimumQ,
                    max: this.maximumQ,
                },
            }); //slider2
        }
        this.setFill();
    }

    private applyTemplate(): void {
        this.inputRangeModel = this.planogramService.templateRangeModel;
        this.values = this.planogramService.templateRangeModel.rangeModel;
        this.createSliders();
        if (this.range) this.range.slider.set(this.planogramService.templateRangeModel.startArr[0]);
        else this.someKeyboardConfig1.start = [this.planogramService.templateRangeModel.startArr[0]];
        if (this.range1) this.range1.slider.set(this.planogramService.templateRangeModel.startArr[1]);
        else this.someKeyboardConfig2.start = [this.planogramService.templateRangeModel.startArr[1]];
        this.minandmax();
        this.values.forEach((item) => {
            if (item.quadrantPercentageLinear) {
                this.showQuadrantPercentageLinear = true;
            }
            if (item.quadrantLinear) {
                this.showQuadrantLinear = true;
            }
            if(item.quadrantPercentageCapacity) {
                this.showQuadrantPercentageCapacity = true;
            }
            if (item.quadrantCapacity) {
                this.showQuadrantCapacity = true;
            }
        });
    }

    private getPositionsData(): void {
        this.destArray = [];
        let allPositions = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        this.destArray = uniqBy(allPositions, 'IDPOGObject');
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['modelHL'] && changes['modelHL'].currentValue) {
            this.paletteSettings.palette = this.highlightService.blockPalette;
            this.sectionID = this.sharedService.activeSectionID;
            this.getPositionsData();
            this.savedSearchOptions = this.highlightService.retrieveSavedSearch(this.sectionID);
            this.planogramService.modelHLField(changes['modelHL'].currentValue.field);
            if (!this.modelHL.chosenTemplate) {
                this.setReset();
            } else if(this.highlightService.updateRangeModelFlag){
                this.setReset();
                this.highlightService.updateRangeModelFlag = false;
            }else  {
                this.applyTemplate();
                this.planogramService.updateNestedStyleDirty = true;;
                this.planogramService.highlightPositionEmit.next(true);
            }
        }
    }

    public applyQuadrantTemplate(): void {
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
