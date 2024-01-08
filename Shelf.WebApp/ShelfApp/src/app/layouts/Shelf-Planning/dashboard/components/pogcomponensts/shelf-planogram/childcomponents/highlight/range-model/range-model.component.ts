import {
    Component,
    OnChanges,
    SimpleChanges,
    Input,
    Output,
    EventEmitter,
    ViewChild,
    ElementRef,
    ChangeDetectorRef,
    OnInit,
} from '@angular/core';
import { uniqBy, sortBy } from 'lodash-es';
import { Utils } from 'src/app/shared/constants/utils';
import { HighlightService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/highlight_Setting/highlight.service';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { NotifyService, SearchService } from 'src/app/shared/services';
import {
    FieldObjectChosen,
    ModelHL,
    TemplateOptions,
    SavedSearch,
    RangeModelValues,
    RangeModelPosition,
    TBATemplateOptions,
} from 'src/app/shared/models';
import { Position, Section } from 'src/app/shared/classes';
import { TranslateService } from '@ngx-translate/core';

@Component({
    selector: 'sp-range-model',
    templateUrl: './range-model.component.html',
    styleUrls: ['./range-model.component.scss'],
})
export class RangeModelComponent implements OnInit, OnChanges {
    @ViewChild('slider', { read: ElementRef }) slider: ElementRef;
    @ViewChild('slider') myslider;
    @ViewChild('sliderCount', { read: ElementRef }) sliderCount: ElementRef;
    @ViewChild('sliderCount') mySliderCount;
    public sectionID: string;
    @Input() modelHL: ModelHL;
    @Output() emitSelection = new EventEmitter();
    public clrArr: string[] = ['#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#FFA500', '#964B00', '#00FFFF', '#FFC0CB', '#4B0082', '#7F00FF'];
    public SPMTotal: number = 0;
    public SPMItem: number = 0;
    public capacityOfEachRow: number = 0;
    public TotalLinear: number = 0;
    public showRangePercentageCapacity: boolean = false;
    public showRangePercentageLinear: boolean = false;
    public showRangeCapacity: boolean = false;
    public showRangeLinear: boolean = false;
    public showSPM: boolean = false;
    public savedSearchOptions: SavedSearch[] = [];
    public values: Array<RangeModelValues> = [];
    public valuesCount: Array<RangeModelValues> = [];
    public destArray: Position[];
    public valuestoUP: number[] = [33, 66];
    public totalVal: number = 0;
    public eachPositionDetails: Array<RangeModelPosition>;
    public finalTotalcapacity: number;
    public finalTotalLinear: number;
    public fieldStr: string;
    public advFind: number = 0;
    public sliderDisplay: boolean = false;
    public sliderDisplayCount = false;
    public showCount = false;
    public excludeZeroVal: boolean = false;
    public savedTemplateRangeModel: TBATemplateOptions;
    someKeyboardConfig: any = {
        connect: [],
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
    sliderRange: number[];
    public gradientSettings = {
        opacity: false,
    };
    public paletteSettings = {
        columns: 17,
        palette: [],
    };
    public togglingExcludeZero: boolean = false;

    constructor(
        private readonly translate: TranslateService,
        public highlightService: HighlightService,
        private readonly notifyService: NotifyService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
        public changeDetector: ChangeDetectorRef,
        private searchService: SearchService
    ) {}

    public ngOnInit(): void {
        this.planogramService.updateDropCount.subscribe(res => {
            if(!this.planogramService.templateRangeModel.count) {
                !this.modelHL.chosenTemplate ? this.setReset() : this.applyTemplate();
            } else {
                !this.modelHL.chosenTemplate ? this.setResetCount() : this.applyTemplateCount();
            }
        });
        this.highlightService.updateRangeCount.subscribe(result => {
            result && this.planogramService.templateRangeModel.count ? this.toggleChange(result) : '';
        });    
    }

    //To stop panning when typing on any input field
    onInputField(event: KeyboardEvent): void {
        if (event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();
        }
    }

    public DoAdvFind(index: number): void {
        this.advFind = index;
        this.highlightService.DoAdvFind(this.savedSearchOptions[index], this.sectionID);
    }

    public emit(id: string): void {
        this.emitSelection.emit(id);
    }

    public getFieldPath(fieldChoosen: FieldObjectChosen): string {
        if (fieldChoosen.FieldPath) {
            return fieldChoosen.FieldPath;
        } else {
            return fieldChoosen.field;
        }
    }

    public colorChange(color: string, index: number): void {
        this.values[index].color = color;
        this.planogramService.templateRangeModel.rangeModel.rangeValues = this.values.slice(0);
        this.sharedService.isListEdited = true;
        this.minandmax();
        this.setSliderColor();
        this.applyPositionWorksheetColor();
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public sliderRangeChange(event: Array<number>): void {
        this.valuestoUP = this.sliderRange;
        this.updateCircles();
        this.sharedService.isListEdited = true;
    }

    public isNumeric(value: string, $index: number): boolean {
        this.fieldStr = value;
        if (value == undefined) {
            return;
        }
        let alphaNumericExpression = /^$|^[A-Za-z0-9 _-]+$/;
        if (!this.fieldStr.match(alphaNumericExpression)) {
            this.values[$index].label = '';
            //return false;
        } else {
            this.sharedService.isListEdited = true;
            //return true;
        }
        this.applyPositionWorksheetColor();
    }

    public GetTotalValue(obj: Section, searchValue: string, num1?: number, num2?: number): void {
        let modifiedObjectArray = searchValue.split('.');
        if (modifiedObjectArray.length > 1) {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfPosition(child)) {
                        let modifiedModelPosValue1 = child.Position[modifiedObjectArray[0]];
                        let modifiedModelPosValue2: any;
                        if (modifiedModelPosValue1 != undefined) {
                            modifiedModelPosValue2 = child.Position[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductValue1 = child.Position.Product[modifiedObjectArray[0]];
                        let modifiedModelProductValue2: any;
                        if (modifiedModelProductValue1 != undefined) {
                            modifiedModelProductValue2 =
                                child.Position.Product[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelProductPkgValue1 = child.Position.ProductPackage[modifiedObjectArray[0]];
                        let modifiedModelProductPkgValue2: any;
                        if (modifiedModelProductPkgValue1 != undefined) {
                            modifiedModelProductPkgValue2 =
                                child.Position.ProductPackage[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        let modifiedModelPosAttrValue1 = child.Position.attributeObject[modifiedObjectArray[0]];
                        let modifiedModelPosAttrValue2;
                        if (modifiedModelPosAttrValue1 != undefined) {
                            modifiedModelPosAttrValue2 =
                                child.Position.attributeObject[modifiedObjectArray[0]][modifiedObjectArray[1]];
                        }
                        if (
                            modifiedModelPosValue1 != undefined &&
                            modifiedModelPosValue2 != undefined &&
                            modifiedModelPosValue1 !== '' &&
                            modifiedModelPosValue1 != null &&
                            modifiedModelPosValue2 !== '' &&
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
                            modifiedModelProductValue2 != '' &&
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
                            modifiedModelProductPkgValue2 != '' &&
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
                            modifiedModelPosAttrValue2 != '' &&
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
                        let modifiedModelPosValue1 = child.Position[searchValue];
                        let modifiedModelProductValue1 = child.Position.Product[searchValue];
                        let modifiedModelProductPkgValue1 = child.Position.ProductPackage[searchValue];
                        let modifiedModelPosAttrValue1 = child.Position.attributeObject[searchValue];
                        this.eachPositionDetails.forEach((dataItem) => {
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
                        this.TotalLinear = 0;
                        this.capacityOfEachRow = 0;
                    }
                    this.GetTotalValue(child, searchValue);
                }, obj);
            }
        }
    }

    public getRangeCapacity(): void {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        this.SPMItem = 0;
        this.SPMTotal = 0;
        this.GetTotalValue(sectionObj, fieldStr);
        let capacityForRed = 0;
        let capacityForBlue = 0;
        let capacityForGreen = 0;
        let capacityForYellow = 0;
        let capacityForOrange = 0;
        let capacityForBrown = 0;
        let capacityForCyan = 0;
        let capacityForPink = 0;
        let capacityForIndigo = 0;
        let capacityForViolet = 0;
        let spmForRed = 0;
        let spmForBlue = 0;
        let spmForGreen = 0;
        let spmForYellow = 0;
        let spmForOrange = 0;
        let spmForBrown = 0;
        let spmForCyan = 0;
        let spmForPink = 0;
        let spmForIndigo = 0;
        let spmForViolet = 0;
        for (const eachPos of this.eachPositionDetails) {
            if (eachPos.color == '#FF0000') {
                capacityForRed = capacityForRed + eachPos.capacity;
                spmForRed = spmForRed + eachPos.SPM;
            } else if (eachPos.color == '#0000FF') {
                capacityForBlue = capacityForBlue + eachPos.capacity;
                spmForBlue = spmForBlue + eachPos.SPM;
            } else if (eachPos.color == '#00FF00') {
                capacityForGreen = capacityForGreen + eachPos.capacity;
                spmForGreen = spmForGreen + eachPos.SPM;
            } else if (eachPos.color == '#FFFF00') {
                capacityForYellow = capacityForYellow + eachPos.capacity;
                spmForYellow = spmForYellow + eachPos.SPM;
            } else if (eachPos.color == '#FFA500') {
                capacityForOrange = capacityForOrange + eachPos.capacity;
                spmForOrange = spmForOrange + eachPos.SPM;
            } else if (eachPos.color == '#964B00') {
                capacityForBrown = capacityForBrown + eachPos.capacity;
                spmForBrown = spmForBrown + eachPos.SPM;
            } else if (eachPos.color == '#00FFFF') {
                capacityForCyan = capacityForCyan + eachPos.capacity;
                spmForCyan = spmForCyan + eachPos.SPM;
            } else if (eachPos.color == '#FFC0CB') {
                capacityForPink = capacityForPink + eachPos.capacity;
                spmForPink = spmForPink + eachPos.SPM;
            } else if (eachPos.color == '#4B0082') {
                capacityForIndigo = capacityForIndigo + eachPos.capacity;
                spmForIndigo = spmForIndigo + eachPos.SPM;
            } else if (eachPos.color == '#7F00FF') {
                capacityForViolet = capacityForViolet + eachPos.capacity;
                spmForViolet = spmForViolet + eachPos.SPM;
            }
        }
        this.finalTotalcapacity =
            capacityForRed +
            capacityForBlue +
            capacityForGreen +
            capacityForYellow +
            capacityForOrange +
            capacityForBrown +
            capacityForCyan +
            capacityForPink +
            capacityForIndigo +
            capacityForViolet;
         
        if(this.showCount) {
            this.valuesCount.forEach((dataItem) => {
                if (dataItem.color == '#FF0000') {
                    dataItem.rangeCapacity = capacityForRed.toPrecision(5);
                    dataItem.SPM = spmForRed;
                } else if (dataItem.color == '#0000FF') {
                    dataItem.rangeCapacity = capacityForBlue.toPrecision(5);
                    dataItem.SPM = spmForBlue;
                } else if (dataItem.color == '#00FF00') {
                    dataItem.rangeCapacity = capacityForGreen.toPrecision(5);
                    dataItem.SPM = spmForGreen;
                } else if (dataItem.color == '#FFFF00') {
                    dataItem.rangeCapacity = capacityForYellow.toPrecision(5);
                    dataItem.SPM = spmForYellow;
                } else if (dataItem.color == '#FFA500') {
                    dataItem.rangeCapacity = capacityForOrange.toPrecision(5);
                    dataItem.SPM = spmForOrange;
                } else if (dataItem.color == '#964B00') {
                    dataItem.rangeCapacity = capacityForBrown.toPrecision(5);
                    dataItem.SPM = spmForBrown;
                } else if (dataItem.color == '#00FFFF') {
                    dataItem.rangeCapacity = capacityForCyan.toPrecision(5);
                    dataItem.SPM = spmForCyan;
                } else if (dataItem.color == '#FFC0CB') {
                    dataItem.rangeCapacity = capacityForPink.toPrecision(5);
                    dataItem.SPM = spmForPink;
                } else if (dataItem.color == '#4B0082') {
                    dataItem.rangeCapacity = capacityForIndigo.toPrecision(5);
                    dataItem.SPM = spmForIndigo;
                } else if (dataItem.color == '#7F00FF') {
                    dataItem.rangeCapacity = capacityForViolet.toPrecision(5);
                    dataItem.SPM = spmForViolet;
                }
            });
        } else {
            this.values.forEach((dataItem) => {
                if (dataItem.color == '#FF0000') {
                    dataItem.rangeCapacity = capacityForRed.toPrecision(5);
                    dataItem.SPM = spmForRed;
                } else if (dataItem.color == '#0000FF') {
                    dataItem.rangeCapacity = capacityForBlue.toPrecision(5);
                    dataItem.SPM = spmForBlue;
                } else if (dataItem.color == '#00FF00') {
                    dataItem.rangeCapacity = capacityForGreen.toPrecision(5);
                    dataItem.SPM = spmForGreen;
                } else if (dataItem.color == '#FFFF00') {
                    dataItem.rangeCapacity = capacityForYellow.toPrecision(5);
                    dataItem.SPM = spmForYellow;
                } else if (dataItem.color == '#FFA500') {
                    dataItem.rangeCapacity = capacityForOrange.toPrecision(5);
                    dataItem.SPM = spmForOrange;
                } else if (dataItem.color == '#964B00') {
                    dataItem.rangeCapacity = capacityForBrown.toPrecision(5);
                    dataItem.SPM = spmForBrown;
                } else if (dataItem.color == '#00FFFF') {
                    dataItem.rangeCapacity = capacityForCyan.toPrecision(5);
                    dataItem.SPM = spmForCyan;
                } else if (dataItem.color == '#FFC0CB') {
                    dataItem.rangeCapacity = capacityForPink.toPrecision(5);
                    dataItem.SPM = spmForPink;
                } else if (dataItem.color == '#4B0082') {
                    dataItem.rangeCapacity = capacityForIndigo.toPrecision(5);
                    dataItem.SPM = spmForIndigo;
                } else if (dataItem.color == '#7F00FF') {
                    dataItem.rangeCapacity = capacityForViolet.toPrecision(5);
                    dataItem.SPM = spmForViolet;
                }
            });
        }       
    }

    public getRangeLinear(): void {
        let sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        let fieldStr = this.modelHL.field;
        this.SPMItem = 0;
        this.SPMTotal = 0;
        this.GetTotalValue(sectionObj, fieldStr);
        let linearForRed = 0;
        let linearForBlue = 0;
        let linearForGreen = 0;
        let linearForYellow = 0;
        let linearForOrange = 0;
        let linearForBrown = 0;
        let linearForCyan = 0;
        let linearForPink = 0;
        let linearForIndigo = 0;
        let linearForViolet = 0;
        let spmForRed = 0;
        let spmForBlue = 0;
        let spmForGreen = 0;
        let spmForYellow = 0;
        let spmForOrange = 0;
        let spmForBrown = 0;
        let spmForCyan = 0;
        let spmForPink = 0;
        let spmForIndigo = 0;
        let spmForViolet = 0;
        for (const eachPos of this.eachPositionDetails) {
            if (eachPos.color == '#FF0000') {
                linearForRed = linearForRed + eachPos.linear;
                spmForRed = spmForRed + eachPos.SPM;
            } else if (eachPos.color == '#0000FF') {
                linearForBlue = linearForBlue + eachPos.linear;
                spmForBlue = spmForBlue + eachPos.SPM;
            } else if (eachPos.color == '#00FF00') {
                linearForGreen = linearForGreen + eachPos.linear;
                spmForGreen = spmForGreen + eachPos.SPM;
            } else if (eachPos.color == '#FFFF00') {
                linearForYellow = linearForYellow + eachPos.linear;
                spmForYellow = spmForYellow + eachPos.SPM;
            } else if (eachPos.color == '#FFA500') {
                linearForOrange = linearForOrange + eachPos.linear;
                spmForOrange = spmForOrange + eachPos.SPM;
            } else if (eachPos.color == '#964B00') {
                linearForBrown = linearForBrown + eachPos.linear;
                spmForBrown = spmForBrown + eachPos.SPM;
            } else if (eachPos.color == '#00FFFF') {
                linearForCyan = linearForCyan + eachPos.linear;
                spmForCyan = spmForCyan + eachPos.SPM;
            } else if (eachPos.color == '#FFC0CB') {
                linearForPink = linearForPink + eachPos.linear;
                spmForPink = spmForPink + eachPos.SPM;
            } else if (eachPos.color == '#4B0082') {
                linearForIndigo = linearForIndigo + eachPos.linear;
                spmForIndigo = spmForIndigo + eachPos.SPM;
            } else if (eachPos.color == '#7F00FF') {
                linearForViolet = linearForViolet + eachPos.linear;
                spmForViolet = spmForViolet + eachPos.SPM;
            }
        }
        this.finalTotalLinear =
            linearForRed +
            linearForBlue +
            linearForGreen +
            linearForYellow +
            linearForOrange +
            linearForBrown +
            linearForCyan +
            linearForPink +
            linearForIndigo +
            linearForViolet;
         
        if(this.showCount) {
            this.valuesCount.forEach((dataItem) => {
                if (dataItem.color == '#FF0000') {
                    dataItem.rangeLinear = linearForRed.toPrecision(5);
                    dataItem.SPM = spmForRed;
                } else if (dataItem.color == '#0000FF') {
                    dataItem.rangeLinear = linearForBlue.toPrecision(5);
                    dataItem.SPM = spmForBlue;
                } else if (dataItem.color == '#00FF00') {
                    dataItem.rangeLinear = linearForGreen.toPrecision(5);
                    dataItem.SPM = spmForGreen;
                } else if (dataItem.color == '#FFFF00') {
                    dataItem.rangeLinear = linearForYellow.toPrecision(5);
                    dataItem.SPM = spmForYellow;
                } else if (dataItem.color == '#FFA500') {
                    dataItem.rangeLinear = linearForOrange.toPrecision(5);
                    dataItem.SPM = spmForOrange;
                } else if (dataItem.color == '#964B00') {
                    dataItem.rangeLinear = linearForBrown.toPrecision(5);
                    dataItem.SPM = spmForBrown;
                } else if (dataItem.color == '#00FFFF') {
                    dataItem.rangeLinear = linearForCyan.toPrecision(5);
                    dataItem.SPM = spmForCyan;
                } else if (dataItem.color == '#FFC0CB') {
                    dataItem.rangeLinear = linearForPink.toPrecision(5);
                    dataItem.SPM = spmForPink;
                } else if (dataItem.color == '#4B0082') {
                    dataItem.rangeLinear = linearForIndigo.toPrecision(5);
                    dataItem.SPM = spmForIndigo;
                } else if (dataItem.color == '#7F00FF') {
                    dataItem.rangeLinear = linearForViolet.toPrecision(5);
                    dataItem.SPM = spmForViolet;
                }
            });
        } else {
            this.values.forEach((dataItem) => {
                if (dataItem.color == '#FF0000') {
                    dataItem.rangeLinear = linearForRed.toPrecision(5);
                    dataItem.SPM = spmForRed;
                } else if (dataItem.color == '#0000FF') {
                    dataItem.rangeLinear = linearForBlue.toPrecision(5);
                    dataItem.SPM = spmForBlue;
                } else if (dataItem.color == '#00FF00') {
                    dataItem.rangeLinear = linearForGreen.toPrecision(5);
                    dataItem.SPM = spmForGreen;
                } else if (dataItem.color == '#FFFF00') {
                    dataItem.rangeLinear = linearForYellow.toPrecision(5);
                    dataItem.SPM = spmForYellow;
                } else if (dataItem.color == '#FFA500') {
                    dataItem.rangeLinear = linearForOrange.toPrecision(5);
                    dataItem.SPM = spmForOrange;
                } else if (dataItem.color == '#964B00') {
                    dataItem.rangeLinear = linearForBrown.toPrecision(5);
                    dataItem.SPM = spmForBrown;
                } else if (dataItem.color == '#00FFFF') {
                    dataItem.rangeLinear = linearForCyan.toPrecision(5);
                    dataItem.SPM = spmForCyan;
                } else if (dataItem.color == '#FFC0CB') {
                    dataItem.rangeLinear = linearForPink.toPrecision(5);
                    dataItem.SPM = spmForPink;
                } else if (dataItem.color == '#4B0082') {
                    dataItem.rangeLinear = linearForIndigo.toPrecision(5);
                    dataItem.SPM = spmForIndigo;
                } else if (dataItem.color == '#7F00FF') {
                    dataItem.rangeLinear = linearForViolet.toPrecision(5);
                    dataItem.SPM = spmForViolet;
                }
            });
        }       
    }

    public toggleSpectrumSpm(): void {
        this.showSPM = !this.showSPM;
        if (this.showSPM) {
            this.getRangeLinear();
            this.planogramService.templateRangeModel.rangeModel.rangeValues = this.values.slice(0);
        }
    }

    public toggleRangeModelCapacity(): void {
        if (this.showRangeCapacity) {
            this.getRangeCapacity();
            this.planogramService.templateRangeModel.rangeModel.rangeValues = this.values.slice(0);
        }
    }

    public toggleRangeModelLinear(): void {
        if (this.showRangeLinear) {
            this.showRangeLinear = true;
            this.getRangeLinear();
            this.planogramService.templateRangeModel.rangeModel.rangeValues = this.values.slice(0);
        }
    }

    public toggleRangeModelPercentageCapacity(): void {
        if (this.showRangePercentageCapacity) {
            this.getRangeCapacity();
            if(this.showCount) {
                this.valuesCount.forEach((item) => {
                    item.rangePercentageCapacity = (Number(item.rangeCapacity) / this.finalTotalcapacity) * 100;
                    item.rangePercentageCapacity = parseFloat(item.rangePercentageCapacity.toPrecision(5));
                });
            } else {
                this.values.forEach((item) => {
                    item.rangePercentageCapacity = (Number(item.rangeCapacity) / this.finalTotalcapacity) * 100;
                    item.rangePercentageCapacity = parseFloat(item.rangePercentageCapacity.toPrecision(5));
                });
            }        
        }
    }

    public toggleRangeModelPercentageLinear(): void {
        if (this.showRangePercentageLinear) {
            this.getRangeLinear();
            if(this.showCount) {
                this.valuesCount.forEach((item) => {
                    item.rangePercentageLinear = (Number(item.rangeLinear) / this.finalTotalLinear) * 100;
                    item.rangePercentageLinear = parseFloat(item.rangePercentageLinear.toPrecision(5));
                });
            } else {
                this.values.forEach((item) => {
                    item.rangePercentageLinear = (Number(item.rangeLinear) / this.finalTotalLinear) * 100;
                    item.rangePercentageLinear = parseFloat(item.rangePercentageLinear.toPrecision(5));
                });
            }        
        }
    }

    public validateKeyup = (event?: KeyboardEvent) => {
        if (event && event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();
        }
        let val: number = this.highlightService.splitCount;
        if (!this.isValidSplitCount(val)) {
            return;
        }
        this.highlightService.splitCount = Number(val);
        this.sharedService.isListEdited = true;
        this.splitCountChange();
        this.updateCircles();
    };

    private isValidSplitCount(splitCount: number): boolean {
        if (!splitCount || splitCount < 2 || splitCount > 10) {
            this.highlightService.splitCount = undefined;
            this.notifyService.warn('PLEASE_ENTER_VALUE_BETWEEN_2_TO_10');
            return false;
        } else {
            return true;
        }
    }

    public updateCircles(): void {
        let valuestoUP: number[] = this.valuestoUP; //= document.getElementById('range').noUiSlider.get();--need to add
        this.valuestoUP = valuestoUP;
        const minRange = this.excludeZeroVal ? '0.1' : '0';
        if (this.values.length == 0) {
            if (typeof valuestoUP == 'object') {
                for (const [i, val] of valuestoUP.entries()) {
                    let valueTo: string;
                    if (i == 0) {
                        const num = Number(val).toFixed(2);
                        valueTo = `${minRange} - ${Number(num)}`;
                    } else {
                        const num1 = Number(valuestoUP[i - 1]).toFixed(2);
                        const num2 = Number(val).toFixed(2);
                        valueTo = `${Number(num1)} - ${Number(num2)}`;
                    }
                    this.values.push({ color: this.clrArr[i], value: valueTo, num: i });
                }
                this.values.push({
                    color: this.clrArr[this.values.length],
                    value: `${Number(valuestoUP[valuestoUP.length - 1])} - 100`,
                });
            } else {
                if (Number(valuestoUP) < 100) {
                    this.values.push({ color: this.clrArr[0], value: `${minRange} - ${Number(valuestoUP)}` });
                    this.values.push({ color: this.clrArr[1], value: `${Number(valuestoUP)} - 100` });
                } else {
                    this.values.push({ color: this.clrArr[0], value: `${minRange} - 100` });
                }
            }
        } else {
            for (const [i, val] of valuestoUP.entries()) {
                let valueTo: string;
                if (i == 0) {
                    const num = Number(val).toFixed(2);
                    valueTo = `${minRange} - ${Number(num)}`;
                } else {
                    const num1 = Number(valuestoUP[i - 1]).toFixed(2);
                    const num2 = Number(val).toFixed(2);
                    valueTo = `${Number(num1)} - ${Number(num2)}`;
                }
                this.values[i].value = valueTo;
            }
            const num = Number(valuestoUP[valuestoUP.length - 1]).toFixed(2);
            this.values[valuestoUP.length].value = `${Number(num)} - 100`;
        }
        for (const value of this.values) {
            const spltVal = value.value.split(' - ');
            value['actPer'] = Number((this.totalVal / 100) * (Number(spltVal[1]) - Math.floor(Number(spltVal[0])))).toFixed(2);
        }
    }

    public splitCountChange = () => {
        let val: any = this.highlightService.splitCount;
        if (!this.highlightService.splitCount || val == '' || val < 2 || val > 10) {
            this.highlightService.splitCount = undefined; //it  was '' and replaced by undefined
            return false;
        }
        let first = 100 / val;
        let start: any[] = [];
        let tooltips: any[] = [];
        let connectArr: any[] = [];
        this.values = [];
        if (val == 1) {
            let num: any = Number(first).toFixed(2);
            start.push(Math.floor(num));
            tooltips.push(true);
            connectArr.push(true);
        } else {
            for (let i = 0; i < val - 1; i++) {
                let num: any = Number(first * (i + 1)).toFixed(2);
                start.push(Math.floor(num));
                tooltips.push(true);
                connectArr.push(true);
            }
        }
        connectArr.push(true);
        this.valuestoUP = start;
        if (this.myslider && this.myslider.slider) {
            this.someKeyboardConfig.start = [];
            this.someKeyboardConfig.connect = [];
            this.myslider.slider.destroy();
            this.sliderDisplay = false;
        }
        this.changeDetector.detectChanges();
        this.sliderRange = start;
        this.someKeyboardConfig.start = start;
        this.someKeyboardConfig.connect = connectArr;
        this.sliderDisplay = true;

        let timer = setInterval(() => {
            if (this.slider) {
                clearInterval(timer);
                this.setSliderColor();
            }
        }, 250);
    };

    public minandmax(): void {
        let totalVal = 0;
        let fieldStr = this.modelHL.field;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'TOP_BOTTOM_ANALYSIS';
        let itemValRel = [];
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
            itemValRel.push({ IDPogObject: element.IDPOGObject, Value: valP });
        }
        this.totalVal = totalVal;
        this.totalVal = parseFloat(this.totalVal.toPrecision(5));
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

                if (this.excludeZeroVal && sortedDescContainer[i].Value === 0) {
                    obj[sortedDescContainer[i].IDPogObject] = 'grey';
                }

                if (sum >= actPer) {
                    break;
                }
            }
        }

        sortedDesc.forEach((dataItem) => {
            let colorForSpecificPosition = obj[dataItem.IDPogObject];
            dataItem.color = colorForSpecificPosition;
        });

        this.eachPositionDetails = sortedDesc.slice(0);
        this.planogramService.TopBottomAnalysisData = obj;
    }

    public createRangeSliders(): void {
        let val = this.highlightService.splitCount;
        let first: number = 100 / val;
        let start: number[] = [];
        let connectArray: boolean[] = [];
        if (!this.savedTemplateRangeModel.rangeModel.rangeValues) {
            connectArray = new Array(this.highlightService.splitCount).fill(true);
        } else {
            connectArray = new Array(this.savedTemplateRangeModel.rangeModel.rangeValues.length).fill(true);
        }
        if (this.savedTemplateRangeModel.rangeModel.rangeValues) {
            this.values = this.savedTemplateRangeModel.rangeModel.rangeValues;
        } else {
            this.values = [];
        }
        if (this.values.length == 0) {
            for (let i = 0; i < val - 1; i++) {
                let num: any = Number(first * (i + 1)).toFixed(2);
                start.push(Math.floor(num));
            }
        } else {
            for (const val of this.values) {
                let splitArray = val.value.split(' - ');
                start.push(Number(splitArray[1]));

                /* Note: Set values 0.1 to 0 if excludeZero checkbox is disable */
                if (!this.excludeZeroVal && splitArray[0] === '0.1') {
                    splitArray[0] = '0';
                    val.value = splitArray.join(' - ');
                }
            }
            start.pop();
        }

        let totalVal = 0;
        let fieldStr = this.modelHL.field;
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
        }
        this.totalVal = totalVal;
        this.totalVal = parseFloat(this.totalVal.toPrecision(5));
        if (this.myslider && this.myslider.slider) {
            this.myslider.slider.destroy();
            this.sliderDisplay = false;
        }
        this.changeDetector.detectChanges();

        this.sliderRange = start;
        this.someKeyboardConfig.start = start;
        this.someKeyboardConfig.connect = connectArray;
        this.sliderDisplay = true;
        let timer = setInterval(() => {
            if (this.slider) {
                clearInterval(timer);
                this.setSliderColor();
            }
        }, 250);
    }

    public setFill(): void {
        let val: number = this.highlightService.splitCount;
        if (!this.isValidSplitCount(val)) {
            return;
        }
        this.getPositionsData();
        this.minandmax();
        if (this.totalVal == 0) {
            let rangeM = {};
            rangeM['rangeValues'] = this.values;
            this.planogramService.templateRangeModel.rangeModel.isNoHighlight = rangeM;
            this.planogramService.templateRangeModel.rangeModel.isNoHighlight = true;
        } else {
            let rangeM = {};
            rangeM['rangeValues'] = this.values;
            this.planogramService.templateRangeModel.rangeModel = rangeM;
            this.planogramService.templateRangeModel.rangeModel.isNoHighlight = false;
        }
        this.toggleRangeModelPercentageCapacity();
        this.toggleRangeModelPercentageLinear();
        this.toggleRangeModelLinear();
        this.toggleRangeModelCapacity();
    }

    public setReset(): void {
        if (!this.togglingExcludeZero) {
            this.splitCountChange();   
        }
        this.updateCircles();
        !this.modelHL.chosenTemplate ? this.highlightService.resetTemplateRangeModel(false) : '';
        this.setFill();
    }

    public applyTemplate(): void {
        this.values = this.savedTemplateRangeModel.rangeModel.rangeValues;
        this.highlightService.splitCount = this.values.length;
        this.createRangeSliders();
        this.minandmax();
        if (this.savedTemplateRangeModel.rangeModel.rangeValues[0].rangePercentageLinear) {
            this.showRangePercentageLinear = true;
        }
        if (this.savedTemplateRangeModel.rangeModel.rangeValues[0].rangeLinear) {
            this.showRangeLinear = true;
        }
        if (this.savedTemplateRangeModel.rangeModel.rangeValues[0].rangePercentageCapacity) {
            this.showRangePercentageCapacity = true;
        }
        if (this.savedTemplateRangeModel.rangeModel.rangeValues[0].rangeCapacity) {
            this.showRangeCapacity = true;
        }
    }

    public getPositionsData(): void {
        this.destArray = [];
        //@Sagar: keeping the commented code because same thing needs to be checked from old /ishelf code. Once that url is available will check and remove the code from here.
        // let allPositions = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        // this.destArray = uniqBy(allPositions, 'IDPOGObject');
        const cartItems = this.searchService.getCartItems();
        this.destArray = this.sharedService.getAllPositionFromSection(this.sharedService.activeSectionID);
        this.destArray = this.destArray.concat(cartItems);
        let totalVal: number = 0;
        let fieldStr = this.modelHL.field;
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
        }
        this.totalVal = totalVal;
        this.totalVal = parseFloat(this.totalVal.toPrecision(5));
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['modelHL'] && changes['modelHL'].currentValue) {
            this.paletteSettings.palette = this.highlightService.blockPalette;
            this.sectionID = this.sharedService.activeSectionID;
            this.getPositionsData();
            this.savedSearchOptions = this.highlightService.retrieveSavedSearch(this.sectionID);
            this.planogramService.modelHLField(changes['modelHL'].currentValue.field);
            this.checkExcludeZero();
            if (this.modelHL.chosenTemplate) {
                this.excludeZeroVal = !this.disableExcludeZero() ? (this.modelHL.chosenTemplate.excludeZeroVal || false) : false;
                this.savedTemplateRangeModel = { ...this.planogramService.templateRangeModel };
            }
            if(!this.planogramService.templateRangeModel.count) {
                this.showCount = false;
                if (!this.modelHL.chosenTemplate) {
                    this.setReset();
                } else {
                    this.applyTemplate();
                }
            } else {
                this.showCount = true;
                this.someKeyboardConfig.range.max = this.getDestArrayLength();
                if (!this.modelHL.chosenTemplate) {
                    this.setResetCount();
                } else {
                    this.applyTemplateCount();
                }
            }
            
            this.planogramService.updateNestedStyleDirty = true;;
            this.planogramService.highlightPositionEmit.next(true);
        }
    }

    public ngAfterViewInit() {
        this.setSliderColor();
    }

    private setSliderColor(): void {
        if (this.slider) {
            if (this.planogramService.templateRangeModel.rangeModel.rangeValues) {
                this.slider.nativeElement.querySelectorAll('.noUi-connect').forEach((row, index) => {
                    row.style.background = this.values[index].color;
                });
            } else {
                this.slider.nativeElement.querySelectorAll('.noUi-connect').forEach((row, index) => {
                    row.style.background = this.clrArr[index];
                });
            }    
        }
    }

    public keyPressNumbers(event: KeyboardEvent): boolean {
        if (event.key >= '0' && event.key <= '9') {
            this.validateKeyup(event);
        } else {
            event.preventDefault();
            return false;
        }
    }

    public toggleChange(changedVal: boolean): void {
        this.checkExcludeZero();
        if(!changedVal) {
            this.someKeyboardConfig.range.max = 100;
            if (this.modelHL.chosenTemplate && !this.modelHL.chosenTemplate.isCount && this.modelHL.chosenTemplate.excludeZeroVal == this.excludeZeroVal) {
                this.applyTemplate();
            } else {
                this.setReset();
            }
            this.planogramService.templateRangeModel.count = false;
            this.planogramService.updateNestedStyleDirty = true;
            this.planogramService.highlightPositionEmit.next(true);
        } else {
            this.someKeyboardConfig.range.max = this.getDestArrayLength();
            if (this.modelHL.chosenTemplate && this.modelHL.chosenTemplate.isCount && this.modelHL.chosenTemplate.excludeZeroVal == this.excludeZeroVal) {
                this.applyTemplateCount();
            } else {
                this.setResetCount();
            }
            this.planogramService.templateRangeModel.count = true;
            this.planogramService.updateNestedStyleDirty = true;
            this.planogramService.highlightPositionEmit.next(true);
        }    
        this.applyPositionWorksheetColor();
    }

    public setResetCount(): void {
        this.splitCountChangeForCount();
        this.updateCirclesCount();
        !this.modelHL.chosenTemplate ? this.highlightService.resetTemplateRangeModel(true) : '';
        this.setFillCount();
    }

    public splitCountChangeForCount(): void {
        let val: number = this.highlightService.splitCount;
        let first = this.getDestArrayLength() / val;
        let start: number[] = [];
        let tooltips: any[] = [];
        let connectArr: boolean[] = [];
        this.valuesCount = [];
        if (val == 1) {
            let num: number = Number((first).toFixed(2));
            start.push(Math.floor(num));
            tooltips.push(true);
            connectArr.push(true);
        } else {
            for (let i = 0; i < val - 1; i++) {
                let num: number = Number((first * (i + 1)).toFixed(2));
                start.push(Math.floor(num));
                tooltips.push(true);
                connectArr.push(true);
            }
        }
        connectArr.push(true);
        this.valuestoUP = start;
        if (this.mySliderCount && this.mySliderCount.slider) {
            this.someKeyboardConfig.start = [];
            this.someKeyboardConfig.connect = [];
            this.mySliderCount.slider.destroy();
            this.sliderDisplay = false;
        }
        this.changeDetector.detectChanges();
        this.sliderRange = start;
        this.someKeyboardConfig.start = start;
        this.someKeyboardConfig.connect = connectArr;
        this.someKeyboardConfig.range.max = this.getDestArrayLength();
        this.sliderDisplay = true;

        let timer = setInterval(() => {
            if (this.sliderCount) {
                clearInterval(timer);
                this.setCountSliderColor();
                this.changeCountSliderTooltip();
            }
        }, 250);
    };

    public updateCirclesCount(): void {
        let valuesToUp: any[] = this.valuestoUP;
        this.valuestoUP = valuesToUp;
        let destArrayLength = this.getDestArrayLength();
        let bottom = Number(valuesToUp[0]);
        let top = destArrayLength - Number(valuesToUp[1]);
        let mid = valuesToUp[1] - valuesToUp[0];
        if (this.valuesCount.length == 0) {
            if (typeof valuesToUp == 'object') {
                for (const [i, val] of valuesToUp.entries()) {
                    let valueTo: string;
                    if (i == 0) {
                        valueTo = Math.floor(valuesToUp[i]).toFixed(2);
                    }
                    else {
                        valueTo = Math.floor(valuesToUp[i]).toFixed(2);
                    }
                    this.valuesCount.push({ color: this.clrArr[i], value: valueTo, num: i });
                }
                this.valuesCount.push({
                    color: this.clrArr[this.valuesCount.length],
                    value: destArrayLength.toString(),
                });
            } else {
                if (Number(valuesToUp) < 100) {
                    this.valuesCount.push({ color: this.clrArr[0], value: `0 - ${Number(valuesToUp)}` });
                    this.valuesCount.push({ color: this.clrArr[1], value: `${Number(valuesToUp)} - 100` });
                } else {
                    this.valuesCount.push({ color: this.clrArr[0], value: '0 - 100' });
                }
            }
        } else {
            for (const [i, val] of valuesToUp.entries()) {
                let valueTo: string;
                if (i == 0) {
                    const num = Number(val).toFixed(2);
                    valueTo = `0 - ${Number(num)}`;
                } else {
                    const num1 = Number(valuesToUp[i - 1]).toFixed(2);
                    const num2 = Number(val).toFixed(2);
                    valueTo = `${Number(num1)} - ${Number(num2)}`;
                }
                this.valuesCount[i].value = valueTo;
            }
            const num = Number(valuesToUp[valuesToUp.length - 1]).toFixed(2);
            this.valuesCount[valuesToUp.length].value = this.showCount ? `${Number(num)} - ${Number(destArrayLength)}` : `${Number(num)} - 100`;
        }
        if (!this.showCount) {
            this.valuesCount[0]['value'] = bottom.toString();
            this.valuesCount[1]['value'] = mid.toString();
            this.valuesCount[2]['value'] = top.toString();
        }
        this.valuesCount[0]['inset'] = this.translate.instant('BOTTOM');
        this.valuesCount[1]['inset'] = this.translate.instant('HIGHLIGHT_MID');
        this.valuesCount[2]['inset'] = this.translate.instant('TOP');
    }

    public setFillCount(): void {
        let val: number = this.highlightService.splitCount;
        if (!this.isValidSplitCount(val)) {
            return;
        }
        this.minandmaxCount();
        if (this.totalVal == 0) {
            let rangeM = {};
            rangeM['rangeValues'] = this.valuesCount;
            this.planogramService.templateRangeModel.rangeModelCount.isNoHighlight = rangeM;
            this.planogramService.templateRangeModel.rangeModelCount.isNoHighlight = true;
        } else {
            let rangeM = {};
            rangeM['rangeValues'] = this.valuesCount;
            this.planogramService.templateRangeModel.rangeModelCount = rangeM;
            this.planogramService.templateRangeModel.rangeModelCount.isNoHighlight = false;
        }
        this.toggleRangeModelPercentageCapacity();
        this.toggleRangeModelPercentageLinear();
        this.toggleRangeModelLinear();
        this.toggleRangeModelCapacity();
    }

    public minandmaxCount(): void {
        let valuestoUP: number[] = this.sliderRange;
        let bottom: number, top: number, middle: number;
        if (typeof valuestoUP == "object") {
            bottom = Number(valuestoUP[0]);
            top = this.getDestArrayLength() - Number(valuestoUP[1]);
            middle = Number(valuestoUP[1]) - bottom;
        }
        let totalVal = 0;
        let fieldStr = this.modelHL.field;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'TOP_BOTTOM_ANALYSIS';
        let itemValRel = [];

        for (const element of this.destArray) {
            var valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
            itemValRel.push({ 'IDPogObject': element.IDPOGObject, 'Value': valP })
        }

        this.totalVal = totalVal;
        this.totalVal = parseFloat(this.totalVal.toPrecision(5));
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
            if (this.excludeZeroVal && dataItem.Value == 0) {
                obj[dataItem.IDPogObject] = colorForSpecificPosition = 'grey';
            }
            dataItem.color = colorForSpecificPosition;
        })

        this.eachPositionDetails = sortedDesc.slice(0);
        this.planogramService.TopBottomAnalysisData = obj;
    }

    public countSliderRangeChange(event: Array<number>): void {
        this.valuestoUP = this.sliderRange;
        this.updateCirclesCount();
        this.sharedService.isListEdited = true;
        this.changeCountSliderTooltip();
    }

    public colorChangeCount(color: string, index: number): void {
        this.valuesCount[index].color = color;
        this.planogramService.templateRangeModel.rangeModelCount.rangeValues = this.valuesCount.slice(0);
        this.sharedService.isListEdited = true;
        this.minandmaxCount();
        this.setCountSliderColor();
        this.applyPositionWorksheetColor();
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public applyTemplateCount(): void {
        this.valuesCount = this.savedTemplateRangeModel.rangeModelCount.rangeValues;
        this.highlightService.splitCount = this.valuesCount.length;
        this.createCountRangeSliders();
        this.minandmaxCount();
        if (this.savedTemplateRangeModel.rangeModelCount.rangeValues[0].rangePercentageLinear) {
            this.showRangePercentageLinear = true;
        }
        if (this.savedTemplateRangeModel.rangeModelCount.rangeValues[0].rangeLinear) {
            this.showRangeLinear = true;
        }
        if (this.savedTemplateRangeModel.rangeModelCount.rangeValues[0].rangePercentageCapacity) {
            this.showRangePercentageCapacity = true;
        }
        if (this.savedTemplateRangeModel.rangeModelCount.rangeValues[0].rangeCapacity) {
            this.showRangeCapacity = true;
        }
    }

    public createCountRangeSliders(): void {
        let val = this.highlightService.splitCount;
        let first = this.getDestArrayLength() / val;
        let start: number[] = [];
        let connectArray: boolean[] = [];
        if (!this.savedTemplateRangeModel.rangeModelCount.rangeValues) {
            connectArray = new Array(this.highlightService.splitCount).fill(true);
        } else {
            connectArray = new Array(this.savedTemplateRangeModel.rangeModelCount.rangeValues.length).fill(true);
        }
        if (this.savedTemplateRangeModel.rangeModelCount.rangeValues) {
            this.valuesCount = this.savedTemplateRangeModel.rangeModelCount.rangeValues;
        } else {
            this.valuesCount = [];
        }
        if (this.valuesCount.length == 0) {
            for (let i = 0; i < val - 1; i++) {
                let num: any = Number(first * (i + 1)).toFixed(2);
                start.push(Math.floor(num));
            }
        } else {
            for (const val of this.valuesCount) {
                let splitArray = val.value.split(' - ');
                start.push(Number(splitArray[1]));

                /* Note: Set values 0.1 to 0 if excludeZero checkbox is disable */
                if (!this.excludeZeroVal && splitArray[0] === '0.1') {
                    splitArray[0] = '0';
                    val.value = splitArray.join(' - ');
                }
            }
            start.pop();
        }

        let totalVal = 0;
        let fieldStr = this.modelHL.field;
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                fieldStr,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            totalVal = totalVal + valP;
        }
        this.totalVal = totalVal;
        this.totalVal = parseFloat(this.totalVal.toPrecision(5));
        if (this.mySliderCount && this.mySliderCount.slider) {
            this.mySliderCount.slider.destroy();
            this.sliderDisplay = false;
        }
        this.changeDetector.detectChanges();

        this.someKeyboardConfig.start = this.sliderRange = start;
        this.someKeyboardConfig.connect = connectArray;
        this.sliderDisplay = true;
        let timer = setInterval(() => {
            if (this.sliderCount) {
                clearInterval(timer);
                this.setCountSliderColor();
                this.setCountSliderRangeOnApplyTemplate();
            }
        }, 250);
    }

    public toggleExcludeZeroVal(): void{
        this.togglingExcludeZero = true;
        this.sharedService.isListEdited = true;
        this.planogramService.templateRangeModel.excludeZeroVal = this.excludeZeroVal;
        this.toggleChange(this.showCount);
        this.togglingExcludeZero = false;
        if (this.showCount) {
            setTimeout(() => {
                this.changeCountSliderTooltip();
            }, 1);    
        }
    }

    public disableExcludeZero(): boolean {
        let isDisabled = true;
        for (const element of this.destArray) {
            let valP = Utils.findPropertyValue(
                element,
                this.modelHL.field,
                undefined,
                this.getFieldPath(this.modelHL.fieldObjectChosen),
            );
            if (valP == 0) {
                isDisabled = false;
                break;
            }
        }
        return isDisabled;
    }

    private getDestArrayLength(): number{
        this.getPositionsData();
        let destArrayCopy = [...this.destArray];
        if (this.excludeZeroVal) {
            destArrayCopy = [];
            let fieldStr = this.modelHL.field;
            for (const element of this.destArray) {
                let valP = Utils.findPropertyValue(
                    element,
                    fieldStr,
                    undefined,
                    this.getFieldPath(this.modelHL.fieldObjectChosen),
                );
                if (valP != 0) {
                    destArrayCopy.push(element);    
                }
            }
        }
        return destArrayCopy.length;
    }

    private setCountSliderRangeOnApplyTemplate(): void {
        this.valuestoUP = this.sliderRange;
        this.updateCirclesCount();
        this.changeCountSliderTooltip();
    }

    private setCountSliderColor(): void {
        if (this.planogramService.templateRangeModel.rangeModelCount.rangeValues) {
            this.sliderCount.nativeElement.querySelectorAll('.noUi-connect').forEach((row, index) => {
                row.style.background = this.valuesCount[index].color;
            });
        } else {
            this.sliderCount.nativeElement.querySelectorAll('.noUi-connect').forEach((row, index) => {
                row.style.background = this.clrArr[index];
            });
        }
    }

    public changeCountSliderTooltip(): void {
        this.sliderCount.nativeElement.querySelectorAll('.noUi-tooltip')[1].innerHTML = (this.getDestArrayLength() - this.valuestoUP[1]).toString(); 
    }

    private checkExcludeZero(): void {
        if(this.modelHL.chosenTemplate && !this.modelHL.chosenTemplate.excludeZeroVal) {
            this.modelHL.chosenTemplate.excludeZeroVal = false;
        }
    }

    public applyPositionWorksheetColor(): void{
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
    }
}
