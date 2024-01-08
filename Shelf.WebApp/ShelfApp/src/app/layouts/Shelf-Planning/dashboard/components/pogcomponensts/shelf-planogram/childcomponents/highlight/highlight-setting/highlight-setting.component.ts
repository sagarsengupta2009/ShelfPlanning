import { Component, OnInit, Inject, Output, EventEmitter } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { 
    SharedService, 
    PlanogramService, 
    DictConfigService, 
    HighlightService, 
    ShoppingCartService
} from 'src/app/shared/services';
import { Utils } from 'src/app/shared/constants';
import { HighlightTemplate, HighlightTypeKey, LookUpType, ModelHL, FieldObjectChosen, Dictionary } from 'src/app/shared/models';
import { MatSelectChange } from '@angular/material/select';
import { Context } from 'src/app/shared/classes/context';
import { Section } from 'src/app/shared/classes';
@Component({
    selector: 'sp-highlight-setting',
    templateUrl: './highlight-setting.component.html',
    styleUrls: ['./highlight-setting.component.scss'],
})
export class HighlightSettingComponent implements OnInit {
    @Output() emitSelectedTemplate = new EventEmitter();
    @Output() emitDefaultSelection = new EventEmitter();
    public QUADRANT_ANALYSIS: string;
    public selectedTemplateIndex: number = 0;
    public templateDropdown: HighlightTemplate[] = [];
    public type: LookUpType[] = [];
    public field: FieldObjectChosen[] = [];
    public copyOfField: FieldObjectChosen[] = [];
    public selectedtemplate: string = '?';
    public selectedtype: string = '?';
    public selectedfield: string = '?';
    public selectedcopyOfField: string = '?';
    constructor(
        private readonly highlightService: HighlightService,
        private readonly planogramService: PlanogramService,
        private readonly sharedService: SharedService,
        private readonly translate: TranslateService,
        private readonly dictConfigService: DictConfigService,
        private readonly dialog: MatDialogRef<HighlightSettingComponent>,
        private readonly shoppingcartService: ShoppingCartService,
        @Inject(MAT_DIALOG_DATA) private readonly data: ModelHL,
    ) {
        this.selectedtemplate = data.chosenTemplate && data.chosenTemplate.value ? data.chosenTemplate.value : '?';
        this.selectedtype = data.type ? data.type : '?';
        this.selectedfield = data.field ? data.field : '?';
        this.selectedcopyOfField = data.fieldQ ? data.fieldQ : '?';
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    public templateChange(): void {
        if (this.selectedtemplate == '?') {
            this.highlightService.buttonSettings = {
                showSaveAs: true,
                showUpdate: false,
                showSave: false,
                autoFill: true,
                showRemove: false,
                showAddSysTemp: false,
                templateName: '',
            };
            this.selectedtype = '?';
            this.selectedfield = '?';
            this.selectedcopyOfField = '?';
            this.emitDefaultSelection.emit('?');
        }
        this.highlightService.showLegend.next(false);
        this.sharedService.isListEdited = false;
        const selectedTemplate = this.templateDropdown
            .filter((item) => item['value'] == this.selectedtemplate)
            .map((a) => Object.assign({}, a));
        this.selectedtype = selectedTemplate.length > 0 ? selectedTemplate[0]['options']['highlightType'] : '';
        this.setSelectedType(this.selectedtype);
        this.selectedfield = selectedTemplate.length > 0 ? selectedTemplate[0]['options']['fieldStr'] : '';
        this.selectedcopyOfField = selectedTemplate.length > 0 ? selectedTemplate[0]['options']['fieldStrQ'] : '';
        this.populateLookupField();
    }

    //@Sagar: need to move this function to highlight.service because here and in highlight.component it's been used
    public populateLookupField(menu?: boolean): void {
        if (menu) {
            this.highlightService.showLegend.next(false);
            this.selectedfield = '?';
            this.selectedcopyOfField = '?';
            this.emitDefaultSelection.emit('?');
        }
        if (this.selectedtype == '?') {
            this.selectedfield = '?';
            this.selectedcopyOfField = '?';
            this.field = [];
            this.copyOfField = [];
        } else {
            this.field = [];
            for (let item of this.type) {
                const selectedType = this.translate.instant(this.selectedtype);
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
                    this.field = tempfield;
                    this.planogramService.lookupHL = tempfield;
                    this.copyOfField = this.field.map((a) => Object.assign({}, a));
                    this.highlightService.fieldArray1 = this.field.map((a) => Object.assign({}, a));
                    if (this.selectedtemplate != '?') {
                        const selectedField = this.field
                            .filter((item) => item['value'] == this.selectedfield)
                            .map((a) => Object.assign({}, a));
                        this.planogramService.fieldOption = this.selectedfield;
                        const selectedFieldQ = this.copyOfField
                            .filter((item) => item['value'] == this.selectedcopyOfField)
                            .map((a) => Object.assign({}, a));
                        const selectedTemplate = this.templateDropdown
                            .filter((item) => item['value'] == this.selectedtemplate)
                            .map((a) => Object.assign({}, a));
                        this.selectedTemplateIndex = this.templateDropdown.findIndex(item => item['value'] === this.selectedtemplate);
                        this.emitSelectedTemplate.emit({
                            selectedTemplate: selectedTemplate[0],
                            field: this.selectedfield,
                            fieldQ: this.selectedcopyOfField,
                            fieldObjectChosen: selectedField[0],
                            fieldObjectChosenQ: selectedFieldQ[0],
                            type: this.selectedtype,
                            selectedTemplateIndex: this.selectedTemplateIndex,
                        });
                    }
                }
            }
        }
        this.shoppingcartService.checkForChangeInCart.next(false);
    }

    public setObjectForFieldChosen(event: MatSelectChange): void {
        const sectionObj = this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID) as Section;
        const ctx = new Context(sectionObj);
        this.highlightService.showLegend.next(false);
        this.copyOfField = this.field.map((a) => Object.assign({}, a));
        this.copyOfField = this.copyOfField
            .filter((item) => item['value'] != event.value)
            .map((a) => Object.assign({}, a));
        const selectedField = this.field
            .filter((item) => item['value'] == this.selectedfield)
            .map((a) => Object.assign({}, a));
        const selectedTemplate = this.templateDropdown
            .filter((item) => item['value'] == this.selectedtemplate)
            .map((a) => Object.assign({}, a));
        this.selectedTemplateIndex = -1;
        this.emitSelectedTemplate.emit({
            selectedTemplate: selectedTemplate[0],
            field: this.selectedfield,
            fieldObjectChosen: selectedField[0],
            type: this.selectedtype,
            selectedTemplateIndex: this.selectedTemplateIndex,           
        });
        if (!this.data.chosenTemplate) {
            this.highlightService.resetTemplateRangeModel();
        }
        this.highlightService.isHighLightManulChange = true;
        //@Sagar: To highlight shopping cart products on the fly, the delay is to run the change detection cycle slightly late after creating the new template.
        setTimeout(() => {
            this.shoppingcartService.checkForChangeInCart.next(false);    
        }, 100);
    }

    public setObjectForFieldChosenQ(): void {
        this.highlightService.showLegend.next(false);
        const selectedField = this.field
            .filter((item) => item['value'] == this.selectedfield)
            .map((a) => Object.assign({}, a));
        const selectedTemplate = this.templateDropdown
            .filter((item) => item['value'] == this.selectedtemplate)
            .map((a) => Object.assign({}, a));
        const selectedFieldQ = this.copyOfField
            .filter((item) => item['value'] == this.selectedcopyOfField)
            .map((a) => Object.assign({}, a));
        this.selectedTemplateIndex = -1;
        this.emitSelectedTemplate.emit({
            selectedTemplate: selectedTemplate[0],
            field: this.selectedfield,
            fieldQ: this.selectedcopyOfField,
            fieldObjectChosen: selectedField[0],
            fieldObjectChosenQ: selectedFieldQ[0],
            type: this.selectedtype,
            selectedTemplateIndex: this.selectedTemplateIndex,  
        });
        if (!this.data.chosenTemplate) {
            this.highlightService.resetTemplateRangeModel();
        }
        setTimeout(() => {
            this.shoppingcartService.checkForChangeInCart.next(false);
        }, 300);
    }

    //@Sagar: need to move this function to highlight.service because here and in highlight.component it's been used
    private setSelectedType(selectedType: string): void {
        switch (selectedType) {
            case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
            case HighlightTypeKey.STRING_MATCH_kEY:
                this.selectedtype = this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY);
                break;
            case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
            case HighlightTypeKey.NUMERIC_RANGE_KEY:
                this.selectedtype = this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY);
                break;
            case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
            case HighlightTypeKey.COLOR_SCALE_KEY:
                this.selectedtype = this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY);
                break;
            case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
            case HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY:
                this.selectedtype = this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY);
                break;
            case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
            case HighlightTypeKey.QUADRANT_ANALYSIS_KEY:
                this.selectedtype = this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY);
                break;
        }
    }

    public ngOnInit(): void {
        this.QUADRANT_ANALYSIS = this.translate.instant('QUADRANT_ANALYSIS');
        this.templateDropdown = this.highlightService.getTemplates();
        this.type = this.highlightService.getHighlightOptions();
        if(this.selectedtype !== '?' && this.type) {
            this.type.forEach((item) => {
                if(this.translate.instant(item.value) === this.selectedtype) {
                    this.selectedtype = item.value;
                }
            });
        }
        this.translateTypes();
        this.type.unshift({ name: `--${this.translate.instant('CHOOSEFILED')}--`, value: '?', options: [] });
        this.populateLookupField();
        this.selectedtype = this.translate.instant(this.selectedtype); //To populate the translated selected field in the dropdown
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

    public translateTypes(): void {
        this.type.forEach((item) => {
            item.name = this.translate.instant(item.name);
            item.value = item.name;
        })
    }
}
