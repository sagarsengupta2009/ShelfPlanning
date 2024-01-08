import { 
    Component, 
    OnChanges, 
    SimpleChanges, 
    Input, 
    Output, 
    EventEmitter, 
    OnDestroy 
} from '@angular/core';
import { ColorPalette, FieldObjectChosen, ModelHL, TemplateOptions, SavedSearch } from 'src/app/shared/models';
import { SharedService, HighlightService, PlanogramService } from 'src/app/shared/services';
import { Section } from 'src/app/shared/classes';
import { isEmpty } from 'lodash';

@Component({
    selector: 'sp-spectrum',
    templateUrl: './spectrum.component.html',
    styleUrls: ['./spectrum.component.scss'],
})
export class SpectrumComponent implements OnChanges {
    public sectionID: string;
    @Input() modelHL: ModelHL;
    @Input() updateRangeModel: Boolean;
    @Output() emitSelection = new EventEmitter();
    public inputRangeModel: TemplateOptions;
    public modelSP_specify: string = 'highlow';
    public modelSP_startcolor: string;
    public modelSP_middlecolor: string;
    public modelSP_endcolor: string;
    public modelSP_startval: number = 0;
    public modelSP_middleval: number = 0;
    public modelSP_endval: number = 0;
    public modelSP_legend: boolean;
    public legendSelected: boolean = false;
    public showSpectrumPercentageLinear: boolean = false;
    public showSpectrumLinear: boolean = false;
    public showSpectrumSpm: boolean = false;
    public fieldChange: boolean = false;
    public HL_HIGHLOWPOINT: boolean = true;
    public modelSP_startLabel: string;
    public modelSP_middleLabel: string;
    public modelSP_endLabel: string;
    public fieldStr: string;
    public advFind: number = 0;
    public savedSearchOptions: SavedSearch[] = [];
    public gradientSettings = {
        opacity: false,
    };

    public paletteSettings = {
        columns: 17,
        palette: [],
    };

    constructor(
        public highlightService: HighlightService,
        public sharedService: SharedService,
        public planogramService: PlanogramService,
    ) {}

    //To stop panning when typing on any input field
    public onInputField(event: KeyboardEvent): void {
        if (event.key.toLocaleLowerCase() !== 'f9') {
            event.stopPropagation();   
        }
    }

    public DoAdvFind(num): void {
        this.advFind = num;
        this.highlightService.DoAdvFind(this.savedSearchOptions[num], this.sectionID);
    }

    public emit(id): void {
        this.emitSelection.emit(id);
    }

    public colorChange(color: string, id: string): void {
        if (id == 'start') {
            this.modelSP_startcolor = color;
            this.planogramService.templateRangeModel.spectrumAttr.modelSP_startcolor = this.modelSP_startcolor;
        } else if (id == 'middle') {
            this.modelSP_middlecolor = color;
            this.planogramService.templateRangeModel.spectrumAttr.modelSP_middlecolor = this.modelSP_middlecolor;
        } else if (id == 'end') {
            this.modelSP_endcolor = color;
            this.planogramService.templateRangeModel.spectrumAttr.modelSP_endcolor = this.modelSP_endcolor;
        }
        this.sharedService.isListEdited = true;
        this.setFill();
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public modelSP_startvalFn(): void {
        if (this.modelSP_startval) {
            this.highlightService.colorScaleValues = {
                modelSP_middleval: this.modelSP_middleval,
                modelSP_startval: this.modelSP_startval,
                modelSP_endval: this.modelSP_endval,
            };

            this.highlightService.showLegend.next(this.modelSP_legend);
            this.setFill();
            this.sharedService.isListEdited = true;
            this.planogramService.updateNestedStyleDirty = true;;
            this.planogramService.highlightPositionEmit.next(true);
            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        }
        this.sharedService.onChangeTemplate = true;
    }

    public modelSP_middlevalFn(): void {
        if (this.modelSP_middleval) {
            this.highlightService.colorScaleValues = {
                modelSP_middleval: this.modelSP_middleval,
                modelSP_startval: this.modelSP_startval,
                modelSP_endval: this.modelSP_endval,
            };

            this.highlightService.showLegend.next(this.modelSP_legend);
            this.setFill();
            this.sharedService.isListEdited = true;
            this.planogramService.updateNestedStyleDirty = true;;
            this.planogramService.highlightPositionEmit.next(true);
            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        }
        this.sharedService.onChangeTemplate = true;
    }

    public modelSP_endvalFn(): void {
        if (this.modelSP_endval) {
            this.highlightService.colorScaleValues = {
                modelSP_middleval: this.modelSP_middleval,
                modelSP_startval: this.modelSP_startval,
                modelSP_endval: this.modelSP_endval,
            };

            this.highlightService.showLegend.next(this.modelSP_legend);
            this.setFill();
            this.sharedService.isListEdited = true;
            this.planogramService.updateNestedStyleDirty = true;;
            this.planogramService.highlightPositionEmit.next(true);
            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        }
        this.sharedService.onChangeTemplate = true;
    }

    public modelSP_startLabelFn(): void {
        if (this.modelSP_startLabel && !this.sharedService.onChangeTemplate) {
            this.setFill();
            this.sharedService.isListEdited = true;
        }
        this.sharedService.onChangeTemplate = true;
    }

    public modelSP_middleLabelFn(): void {
        if (this.modelSP_middleLabel && !this.sharedService.onChangeTemplate) {
            this.setFill();
            this.sharedService.isListEdited = true;
        }
        this.sharedService.onChangeTemplate = true;
    }

    public modelSP_endLabelFn(): void {
        if (this.modelSP_endLabel && !this.sharedService.onChangeTemplate) {
            this.setFill();
            this.sharedService.isListEdited = true;
        }
        this.sharedService.onChangeTemplate = true;
    }

    public isNumeric(value: string, str: string): boolean {
        this.fieldStr = value;
        if (value == undefined) {
            return;
        }
        let alphaNumericExpression = /^$|^[A-Za-z0-9 _-]+$/;
        if (!this.fieldStr.match(alphaNumericExpression)) {
            if (str == 'start') {
                this.modelSP_startLabel = '';
                return false;
            } else if (str == 'middle') {
                this.modelSP_middleLabel = '';
                return false;
            } else if (str == 'end') {
                this.modelSP_endLabel = '';
                return false;
            }
        } else {
            if (this.sharedService.enableHighlightInWorksheet) {
                this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
            }
        }
    }

    public changeLegends(): void {
        if (this.modelSP_legend) {
            this.modelSP_legend = false;
            this.legendSelected = false;
        } else {
            this.modelSP_legend = true;
            this.legendSelected = true;
        }
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend = this.modelSP_legend;
        this.highlightService.showLegend.next(this.modelSP_legend);
    }

    public toggleModelSp(HL_HIGHLOWPOINT: boolean): void {
        if (HL_HIGHLOWPOINT) {
            this.modelSP_specify = 'highlow';
        } else {
            this.modelSP_specify = 'midpoint';
        }
    }

    private getFieldPath(fieldChoosen: FieldObjectChosen): string {
        if (fieldChoosen.FieldPath) {
            return fieldChoosen.FieldPath;
        } else {
            return fieldChoosen.field;
        }
    }

    public getMinValue(fieldName?: string): number {
        fieldName = fieldName || this.modelHL.field;
        let sectionObj= this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as  Section;
        const field = this.modelHL?.fieldObjectChosen ? this.modelHL?.fieldObjectChosen :this.highlightService.options?.fieldObjectChosen;
        let fieldPath = this.getFieldPath(field);
        return sectionObj ? this.highlightService.MathRound(sectionObj.getMinPropertyValue(fieldName, fieldPath)) : 0;
    }

    public getMaxValue(fieldName?: string): number {
        fieldName = fieldName || this.modelHL.field;
        const field = this.modelHL?.fieldObjectChosen ? this.modelHL?.fieldObjectChosen :this.highlightService.options?.fieldObjectChosen;
        let fieldPath = this.getFieldPath(field);
        let sectionObj= this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as  Section;
        return sectionObj ? this.highlightService.MathRound(sectionObj.getMaxPropertyValue(fieldName, fieldPath)) : 0;
    }

    public getRangeModel(): ColorPalette[] {
        let minFieldVal = this.highlightService.MathRound(this.modelSP_startval);
        let midFieldVal = this.highlightService.MathRound(this.modelSP_middleval);
        let maxFieldVal = this.highlightService.MathRound(this.modelSP_endval);
        let startRGBArr = this.highlightService.HEX2RGB(this.modelSP_startcolor);
        let midRGBArr = this.highlightService.HEX2RGB(this.modelSP_middlecolor);
        let endRGBArr = this.highlightService.HEX2RGB(this.modelSP_endcolor);
        //logic to find count between
        //we take 25 minimum value if the range is too small
        //@todo for now lets assume 25 divisions always

        let COUNT_SET1 = 50;
        let COUNT_SET2 = 50;
        //these are used to increment range and color palette
        let FACTOR_SET1 = 1 / COUNT_SET1;
        let FACTOR_SET2 = 1 / COUNT_SET2;
        let INCREMENT_VAL_SET1 = (midFieldVal - minFieldVal) / COUNT_SET1;
        let INCREMENT_VAL_SET2 = (maxFieldVal - midFieldVal) / COUNT_SET2;
        //get RGB of the color entered in view
        let SR = startRGBArr[0];
        let SG = startRGBArr[1];
        let SB = startRGBArr[2];
        let MR = midRGBArr[0];
        let MG = midRGBArr[1];
        let MB = midRGBArr[2];
        let ER = endRGBArr[0];
        let EG = endRGBArr[1];
        let EB = endRGBArr[2];
        //need by algorithm used
        let DIFF_R_SET1 = SR - MR;
        let DIFF_G_SET1 = SG - MG;
        let DIFF_B_SET1 = SB - MB;

        let DIFF_R_SET2 = MR - ER;
        let DIFF_G_SET2 = MG - EG;
        let DIFF_B_SET2 = MB - EB;

        //generates spectrum color palette
        let colorPalette: ColorPalette[] = [];
        //lowest
        colorPalette.push({ color: this.modelSP_startcolor, num: minFieldVal, label: this.modelSP_startLabel });
        //low to mid
        for (let i = 1; i < COUNT_SET1; i++) {
            let tempObj: any = {};
            tempObj.color = this.highlightService.RGB2HEX(
                Math.round(SR - DIFF_R_SET1 * FACTOR_SET1 * i),
                Math.round(SG - DIFF_G_SET1 * FACTOR_SET1 * i),
                Math.round(SB - DIFF_B_SET1 * FACTOR_SET1 * i),
            );
            tempObj.num = minFieldVal + INCREMENT_VAL_SET1 * i;
            colorPalette.push(tempObj);
        }
        //mid
        colorPalette.push({ color: this.modelSP_middlecolor, num: midFieldVal, label: this.modelSP_middleLabel });
        //mid to high
        for (let i = 1; i < COUNT_SET2; i++) {
            let tempObj: any = {};
            tempObj.color = this.highlightService.RGB2HEX(
                Math.round(MR - DIFF_R_SET2 * FACTOR_SET2 * i),
                Math.round(MG - DIFF_G_SET2 * FACTOR_SET2 * i),
                Math.round(MB - DIFF_B_SET2 * FACTOR_SET2 * i),
            );
            tempObj.num = midFieldVal + INCREMENT_VAL_SET2 * i;
            colorPalette.push(tempObj);
        }
        //high
        colorPalette.push({ color: this.modelSP_endcolor, num: maxFieldVal, label: this.modelSP_endLabel });
        this.highlightService.colorScaleValues = {
            modelSP_middleval: this.modelSP_middleval,
            modelSP_startval: this.modelSP_startval,
            modelSP_endval: this.modelSP_endval,
        };
        return colorPalette;
    }

    public generateRange(): void {
        this.modelSP_startval = this.getMinValue();
        let max: any = this.getMaxValue();
        let min: any = this.getMinValue();
        this.modelSP_middleval = this.highlightService.MathRound((min + max) / 2);
        this.modelSP_endval = this.getMaxValue();
        let temp = this.planogramService.templateRangeModel;
        if (temp.fieldStr == 'FacingDeviation') {
            this.modelSP_middleval = 0;
            this.modelSP_startval = this.modelSP_startval < 0 ? this.modelSP_startval : 0;
            this.modelSP_endval = this.modelSP_endval > 0 ? this.modelSP_endval : 0;
            this.modelSP_middlecolor = '#00ff33';
        }
        this.setFill();
        this.highlightService.colorScaleValues = {
            modelSP_middleval: this.modelSP_middleval,
            modelSP_startval: this.modelSP_startval,
            modelSP_endval: this.modelSP_endval,
        };
    }

    private setFill(): void {
        let fieldStr = this.modelHL.field;
        this.planogramService.templateRangeModel.fieldObjectChosen = this.modelHL.fieldObjectChosen;
        this.planogramService.templateRangeModel.fieldStr = fieldStr;
        this.planogramService.templateRangeModel.highlightType = 'Color Scale';
        this.planogramService.templateRangeModel.rangeModel = this.getRangeModel();
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
        this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend =
            this.modelSP_legend || this.legendSelected ? true : false;
        this.modelSP_legend = this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend; //legend value update
        this.highlightService.colorScaleValues = {
            modelSP_middleval: this.modelSP_middleval,
            modelSP_startval: this.modelSP_startval,
            modelSP_endval: this.modelSP_endval,
        };
        if(this.highlightService.options){
            this.highlightService.options = this.planogramService.templateRangeModel
        }
        this.highlightService.showLegend.next(this.modelSP_legend);
    }

    public setReset(): void {
        this.modelSP_startcolor = this.highlightService.RGB2HEX(255, 0, 0);
        this.modelSP_middlecolor = this.highlightService.RGB2HEX(255, 255, 0);
        this.modelSP_endcolor = this.highlightService.RGB2HEX(0, 0, 255);
        this.modelSP_startval = this.getMinValue();
        let max: any = this.getMaxValue();
        let min: any = this.getMinValue();
        this.modelSP_middleval = this.highlightService.MathRound((min + max) / 2);
        this.modelSP_endval = this.getMaxValue();
        this.highlightService.resetTemplateRangeModel();
        this.setFill();
        this.highlightService.colorScaleValues = {
            modelSP_middleval: this.modelSP_middleval,
            modelSP_startval: this.modelSP_startval,
            modelSP_endval: this.modelSP_endval,
        };
    }

    private applyTemplate(): void {
        let temp: TemplateOptions = this.planogramService.templateRangeModel;
        if (
            this.modelHL.chosenTemplate.options.rangeModel != undefined &&
            this.modelHL.chosenTemplate.options.rangeModel != null
        ) {
            temp = this.modelHL.chosenTemplate.options;
        }
        this.inputRangeModel = temp;
        this.modelSP_startcolor = temp.spectrumAttr.modelSP_startcolor;
        this.modelSP_middlecolor = temp.spectrumAttr.modelSP_middlecolor;
        this.modelSP_endcolor = temp.spectrumAttr.modelSP_endcolor;
        this.modelSP_startval = parseInt(temp.spectrumAttr.modelSP_startval);
        this.modelSP_middleval = parseInt(temp.spectrumAttr.modelSP_middleval);
        this.modelSP_endval = parseInt(temp.spectrumAttr.modelSP_endval);
        this.modelSP_legend = temp.spectrumAttr.modelSP_legend;
        if (this.legendSelected) {
            this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend = true;
            this.modelSP_legend = this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend;
        } else {
            this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend = false;
            this.modelSP_legend = this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend;
        }
        this.highlightService.colorScaleValues = {
            modelSP_middleval: this.modelSP_middleval,
            modelSP_startval: this.modelSP_startval,
            modelSP_endval: this.modelSP_endval,
        };
        this.highlightService.showLegend.next(this.modelSP_legend); //legends update
        if (
            temp.fieldStr != 'FacingDeviation' &&
            this.modelHL.chosenTemplate.options.rangeModel != undefined &&
            this.modelHL.chosenTemplate.options.rangeModel == null
        ) {
            this.generateRange();
        }
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['modelHL'] && changes['modelHL'].currentValue) {
            this.paletteSettings.palette = this.highlightService.blockPalette;
            this.sectionID = this.sharedService.activeSectionID;
            this.modelSP_legend = this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend;
            this.modelSP_startcolor = this.highlightService.RGB2HEX(255, 0, 0);
            this.modelSP_middlecolor = this.highlightService.RGB2HEX(255, 255, 0);
            this.modelSP_endcolor = this.highlightService.RGB2HEX(0, 0, 255);
            this.modelSP_startval = this.getMinValue();
            this.modelSP_middleval = 0;
            this.modelSP_endval = this.getMaxValue();
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
}
