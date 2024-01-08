import {
    Component,
    OnInit,
    Output,
    Input,
    EventEmitter,
    OnDestroy,
    ViewChild,
    OnChanges,
    SimpleChanges,

} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { HighlightSettingComponent } from './highlight-setting/highlight-setting.component';
import { Observable, Subscription } from 'rxjs';
import { SpectrumComponent } from './spectrum/spectrum.component';
import { RangeModelComponent } from './range-model/range-model.component';
import { QuadrantAnalysisComponent } from './quadrant-analysis/quadrant-analysis.component';
import { StringMatchComponent } from './string-match/string-match.component';
import { NumericRangeComponent } from './numeric-range/numeric-range.component';
import { without, find } from 'lodash-es';
import {
    HighlightService, 
    PlanogramStoreService, 
    PlanogramService,
    SharedService, 
    PogSideNavStateService, 
    NotifyService,
    AppSettingsService,
    DictConfigService,
    ShoppingCartService,
} from 'src/app/shared/services';
import {
    ModelHL, SelectedTemplate, HighlightTypeKey,
    HighlightTemplate, IApiResponse, PogData,
    PogSideNaveView, 
    SavedSearch, 
    AppSettings, 
    SettingValue, 
    LookUpType, 
    FieldObjectChosen, 
    Dictionary, 
    SortedGuidList
} from 'src/app/shared/models';
import { HeaderMenu } from 'src/app/shared/models/config/application-resources';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Utils } from 'src/app/shared/constants';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { Section } from 'src/app/shared/classes';

/* Blocks  related code is removed as  of  now as functionality is not  implemented fully. */

@Component({
    selector: 'sp-highlight',
    templateUrl: './highlight.component.html',
    styleUrls: ['./highlight.component.scss'],
})
export class HighlightComponent implements OnInit, OnChanges, OnDestroy {
    @ViewChild(`stringMatch`) stringMatch: StringMatchComponent;
    @ViewChild(`numericmatch`) numericmatch: NumericRangeComponent;
    @ViewChild(`spectrum`) spectrum: SpectrumComponent;
    @ViewChild(`rangeModel`) rangeModel: RangeModelComponent;
    @ViewChild(`quadrant`) quadrant: QuadrantAnalysisComponent;
    @ViewChild(`highlightOnOffToggle`) highlightOnOffToggle: MatSlideToggle;
    @Input() isPin: boolean;
    @Input() pogData: PogData;
    @Output() onPinUnpintoggle: EventEmitter<boolean> = new EventEmitter();
    @Output() viewComponentInSideNav: EventEmitter<boolean> = new EventEmitter();
    @Output() getWidth: EventEmitter<number> = new EventEmitter();
    private isAnyTemplateDirty = false;
    private isListDirty = false;
    public filterListText = '';
    public allTemplates: HighlightTemplate[];
    public STRING_MATCH: string;
    public NUMERIC_RANGE: string;
    public COLOR_SCALE: string;
    public TOP_BOTTOM_ANALYSIS: string;
    public QUADRANT_ANALYSIS: string;
    public selectedTemplateIndex: number = 0;
    private subscriptions: Subscription = new Subscription();
    public favoriteTemplatesList: HighlightTemplate[] = [];
    public pogHighlightHeaderMenuShowHide: HeaderMenu = {
        isPin: false,
        gridOnIcon: true,
    };
    private updateFlag: boolean = false;
    private changeFieldCount: boolean = false;
    private validTemplate: boolean = true;
    private selectedTemplate: SelectedTemplate;
    private changeInList: boolean = false;
    public blockSearchFlag = false;
    private duplicateValue: string;
    public blockHighlight = false;
    public toggleFavoriteTemplate: boolean = false;
    public width: number;
    public index: number = 0;
    public toggleIndex: number = -1;
    public selectedTemplateToPopulate: string = '?';
    public selectedtype: string = '?';
    public selectedfield: string = '?';
    public selectedcopyOfField: string = '?';
    public type: LookUpType[] = [];
    public field: FieldObjectChosen[] = [];
    public copyOfField: FieldObjectChosen[] = [];
    public isSetAsDefaultEnabled: boolean = false;
    public highlightDefaultFlag: boolean = true;
    public updateRangeModel:boolean = false; //for highlighting the default template
     
    constructor(
        private readonly translate: TranslateService,
        public readonly highlightService: HighlightService,
        private readonly notifyService: NotifyService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramService: PlanogramService,
        private readonly dialog: MatDialog,
        private readonly sharedService: SharedService,
        private readonly appSettingsService: AppSettingsService,
        private readonly pogSideNavStateService: PogSideNavStateService,
        private readonly dictConfigService: DictConfigService,
        private readonly shoppingCartService: ShoppingCartService
    ) { }

    private empty(): any {
        return {};
    }

    //To stop panning when typing on Template Name
    public onTemplateName(event: KeyboardEvent): void {
        event.stopPropagation();
    }

    public onListSearch(event: KeyboardEvent): void {
        event.stopPropagation();
    }

    public onMouseEnter(templateGuid: string): void {
        const highlightDefault = document.getElementById(templateGuid);
        highlightDefault.setAttribute('style',`margin-left: auto!important; visibility: visible; cursor: pointer!important; color: #4E9698`);
        for (let item of this.allTemplates) {
            if(item.GUID === templateGuid){
                highlightDefault.innerHTML = item.isDefault ? this.translate.instant('DEFAULT') : this.translate.instant('SET_DEFAULT');
            }
        }
    }
      
    public onMouseLeave(templateGuid: string): void {
        const highlightDefault = document.getElementById(templateGuid);
        for (let item of this.allTemplates) {
            if (item.GUID === templateGuid) {
                if (highlightDefault.innerHTML == this.translate.instant('DEFAULT')) {
                    highlightDefault.setAttribute('style', `margin-left: auto!important; visibility: visible; cursor: pointer!important; color: #4E9698`);
                } else {
                    highlightDefault.setAttribute('style', `visibility: hidden`);
                }
            }
        }
    }
    private enableDisableAllActiveSectionID(isActive):void { //multiple or single download we need to enable all the setionID Obj to true
        Object.keys(this.planogramService.rootFlags)?.forEach(sectionId => {
            isActive ? this.planogramService.rootFlags[sectionId].isEnabled = true : this.planogramService.rootFlags[sectionId].isEnabled = false ;
        });  
    }
    private checkForActiveSectionID():number[]{ //get the list of loaded section id
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
  
    public toggleChange(ctrlClick?: boolean): void {
        const sectionID = this.sharedService.getActiveSectionId();

        if (this.highlightService.modelHL.tool) {
            this.highlightService.modelHL.toggleName = this.translate.instant('ON');
            this.planogramService.rootFlags[sectionID].isEnabled = true;
            this.enableDisableAllActiveSectionID(true);
            this.pogHighlightHeaderMenuShowHide.gridOnIcon = !this.sharedService.enableHighlightInWorksheet;
            if (this.highlightOnOffToggle) {
                this.highlightOnOffToggle._inputElement.nativeElement.blur();   
            }
            
            if (ctrlClick && !this.highlightService.isHighLightManulChange) {
                let defaultHighLight = this.highlightService.highlightList.filter(elm => elm.isDefault == true)[0];
                if (defaultHighLight && this.highlightDefaultFlag) {
                    this.reDirectToTemplate(this.allTemplates.filter(elm => elm.GUID == defaultHighLight.guid)[0]);
                    this.highlightService.updateRangeModelFlag = true;
                    this.highlightDefaultFlag = false;
                }
            }
            if(this.highlightService.options){
                this.highlightService.options = this.planogramService.templateRangeModel;
            }
        } else {
            this.highlightService.modelHL.toggleName = this.translate.instant('OFF');
           // this.planogramService.rootFlags[sectionID].isEnabled = false;
            this.enableDisableAllActiveSectionID(false);
            if (ctrlClick) {
                this.worksheetIconClick(true);
            } else {
                let isEnabled = false;
                for (const key in this.planogramService.rootFlags) {
                    if (this.planogramService.rootFlags[key].isEnabled) {
                        isEnabled = true;
                    }
                }
                if (isEnabled) {
                    this.sharedService.enableHighlightInWorksheet = false;
                    this.pogHighlightHeaderMenuShowHide.gridOnIcon = true;
                } else {
                    this.pogHighlightHeaderMenuShowHide.gridOnIcon = !this.sharedService.enableHighlightInWorksheet;
                }
            }
            //update only if toggle switch off
            this.highlightService.buttonSettings.showSave = false;
            this.highlightService.showLegend.next(false);
        }
        this.highlightService.selectedOptions.tool = this.highlightService.modelHL.tool;
        this.planogramService.updateNestedStyleDirty = true;
        this.shoppingCartService.checkForChangeInCart.next(false);
        this.planogramService.highlightPositionEmit.next(true);
    }

    public offOnBlockHighlight(flag: boolean): void {
        if (flag) {
            this.highlightService.modelHL.toggleName = this.translate.instant('ON');
            this.blockSearchFlag = true;
        } else {
            this.highlightService.modelHL.toggleName = this.translate.instant('OFF');
            this.blockSearchFlag = false;
            this.planogramService.blockSearchStatus = false;
        }
    }

    private addSystemTemplate(): void {
        /*adding to system temp*/
        const templateName = this.highlightService.buttonSettings.templateName;
        let objMain: any = {};
        objMain.name = templateName;
        objMain.value = templateName;
        objMain.readonly = false;
        objMain.isSystem = true;
        objMain.options = {};

        this.setHighlightType(this.planogramService.templateRangeModel.highlightType);

        objMain.options = Object.assign({}, this.planogramService.templateRangeModel);
        //need to verify below line code
        this.planogramStore.appSettings.highlightSysTemplate.push(objMain);

        this.planogramStore.appSettings.highlightSysTemplate.forEach((item: HighlightTemplate) => {
            this.allTemplates.forEach(element => {
                if(item.name === element.name) {
                    item.GUID = element.GUID;
                    item.isFavorite = element.isFavorite;
                }
            });

            switch (item.options.highlightType) {
                case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                    item.options.highlightType = HighlightTypeKey.STRING_MATCH_kEY;
                    break;
                case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                    item.options.highlightType = HighlightTypeKey.NUMERIC_RANGE_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                    item.options.highlightType = HighlightTypeKey.COLOR_SCALE_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                    item.options.highlightType = HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                    item.options.highlightType = HighlightTypeKey.QUADRANT_ANALYSIS_KEY;
                    break;
            }
        });

        /*remove from user template*/
        this.planogramStore.appSettings.highlightUsrTemplate = without(
            this.planogramStore.appSettings.highlightUsrTemplate,
            find(this.planogramStore.appSettings.highlightUsrTemplate, { name: templateName }),
        );

        this.planogramStore.appSettings.highlightUsrTemplate.forEach((item: HighlightTemplate) => {
            this.allTemplates.forEach(element => {
                if(item.name === element.name) {
                    item.GUID = element.GUID;
                    item.isFavorite = element.isFavorite;
                }
            });

            switch (item.options.highlightType) {
                case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                    item.options.highlightType = HighlightTypeKey.STRING_MATCH_kEY;
                    break;
                case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                    item.options.highlightType = HighlightTypeKey.NUMERIC_RANGE_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                    item.options.highlightType = HighlightTypeKey.COLOR_SCALE_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                    item.options.highlightType = HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY;
                    break;
                case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                    item.options.highlightType = HighlightTypeKey.QUADRANT_ANALYSIS_KEY;
                    break;
            }
        });

        const dataTopost = {
            SYSTemp: JSON.stringify(this.planogramStore.appSettings.highlightSysTemplate),
            USRTemp: JSON.stringify(this.planogramStore.appSettings.highlightUsrTemplate),
        };

        const obs = this.highlightService
            .UpdateHighlightTemplates(dataTopost)
            .subscribe((res: IApiResponse<string>) => {
                this.notifyService.success('SYSTEM_TEMPLATE_ADDED_SUCCESSFULLY');
                this.highlightService.modelHL.template = templateName;
                this.highlightService.buttonSettings = {
                    showSaveAs: true,
                    showUpdate: false,
                    showSave: false,
                    autoFill: false,
                    showRemove: false,
                    showAddSysTemp: false,
                    templateName: templateName,
                };
            });
        this.subscriptions.add(obs);
    }

    private updateTemplate(): void {
        this.updateFlag = true;
        if (this.sharedService.isListEdited) {
            this.saveTemplate();
            this.notifyService.success('TEMPLATE_UPDATED_SUCCESSFULLY');
            this.sharedService.isListEdited = false;
        } else {
            this.notifyService.warn('No changes to update');
        }
    }

    private removeTemplate(): void {
        let templateName = this.highlightService.buttonSettings.templateName;
        this.planogramStore.appSettings.highlightUsrTemplate = without(
            this.planogramStore.appSettings.highlightUsrTemplate,
            find(this.planogramStore.appSettings.highlightUsrTemplate, { name: templateName }),
        );
        this.allTemplates.forEach((item, index) => {
            if(item.name === templateName && !item.isSystem) {
                this.allTemplates.splice(index, 1);
            }
        });
        this.subscriptions.add(
            this.saveTemplateAsAppSettings().subscribe((res: boolean) => {
                this.notifyService.success('TEMPLATE_REMOVED_SUCCESSFULLY');
                this.highlightService.modelHL.type = '?';
                this.highlightService.modelHL.field = '?';
                this.highlightService.modelHL.fieldQ = '?';
                this.highlightService.modelHL.chosenTemplate = this.empty();
                this.openHighlightSetting();
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
                this.planogramService.updateNestedStyleDirty = true;;
                this.planogramService.highlightPositionEmit.next(true);
            }));
    }

    private toggleHighlight(blockHighlight): void {
        this.blockHighlight = !blockHighlight;
        this.highlightService.modelHL.tool = false;
        this.highlightService.modelHL.blockHighlightOn = false;
        this.offOnBlockHighlight(this.highlightService.modelHL.blockHighlightOn);
    }

    public selection(id: string): void {
        switch (id) {
            case 'SYSTEM_TEMPLATE':
                this.addSystemTemplate();
                break;
            case 'UPDATE':
                this.updateTemplate();
                break;
            case 'REMOVE':
                this.removeTemplate();
                break;
            case 'TOGGLE_TEMPLATE':
                this.toggleHighlight(false);
                break;
        }
    }

    public changedList(): void {
        this.changeInList = !this.changeInList;
    }

    public FieldCountchange(modelField_value): void {
        if (this.changeFieldCount) {
            this.changeFieldCount = false;
        } else {
            if (modelField_value != '') {
                this.changeFieldCount = true;
            } else {
                this.changeFieldCount = false;
            }
        }
    }

    public colseSaveAsEditor(): void {
        this.highlightService.buttonSettings.showSave = false;
        this.highlightService.buttonSettings.showSaveAs = true;
        if (this.highlightService.modelHL.template === '?') {
            this.highlightService.buttonSettings.templateName = '';
        } else {
            this.highlightService.buttonSettings.templateName = this.highlightService.modelHL.template;
        }
    }

    private openHighlightSetting(): void {
        const dialogRef = this.dialog.open(HighlightSettingComponent, {
            width: '60vw',
            height: '60vh',
            data: this.highlightService.modelHL,
        });

        this.emitSelectedTemplate(dialogRef);
        this.emitDefaultSelection(dialogRef);
        this.afterClosed(dialogRef);
    }

    private emitDefaultSelection(dialogRef: MatDialogRef<HighlightSettingComponent>): void {
        let obs2 = dialogRef.componentInstance.emitDefaultSelection.subscribe(() => {
            this.highlightService.modelHL.type = '';
            this.highlightService.modelHL.chosenTemplate = undefined;
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
            this.planogramService.updateNestedStyleDirty = true;
            this.planogramService.highlightPositionEmit.next(true);
        });
        this.subscriptions.add(obs2);
    }

    private emitSelectedTemplate(dialogRef: MatDialogRef<HighlightSettingComponent>): void {
        let obs1 = dialogRef.componentInstance.emitSelectedTemplate.subscribe((result: any) => {
            this.showSelectedTemplate(result);
        });
        this.subscriptions.add(obs1);
    }

    private afterClosed(dialogRef: MatDialogRef<HighlightSettingComponent>): void {
        let obs3 = dialogRef.afterClosed().subscribe((res) => {
            setTimeout(() => {
                if (this.sharedService.enableHighlightInWorksheet) {
                    this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
                }
            }, 200);
        });
        this.subscriptions.add(obs3);
    }

    public saveTemplate(): void {
        let templateName = this.highlightService.buttonSettings.templateName;
        let templateExists = false;
        let existingTemplates = this.planogramStore.appSettings.highlightUsrTemplate;
        let existingSystemTemplates = this.planogramStore.appSettings.highlightSysTemplate;
        //checking the existing template in user templates
        existingTemplates.forEach((item) => {
            if (item.name.toLowerCase() === templateName.toLowerCase()) {
                templateExists = true;
            }
        });
        
        //checking the existing template in system templates
        existingSystemTemplates.forEach((item) => {
            if (item.name.toLowerCase() === templateName.toLowerCase()) {
                templateExists = true;
            }
        });
        if (templateExists && !this.updateFlag) {
            const failedToSaveMsg = this.translate.instant('FAILED_TO_SAVE_TEMPLATE');
            const alreadyExistsMsg = this.translate.instant('IS_ALREADY_EXISTS',);
            this.notifyService.warn(`${failedToSaveMsg} ${templateName} ${alreadyExistsMsg}`);
        } else {
            this.validTemplate = true;

            const objMain: SelectedTemplate = {
                name: templateName,
                value: templateName,
                readonly: false,
                isFavorite: false,
                isSystem: false,
                options: undefined,
                GUID: Utils.generateGUID(),
                isCount: this.planogramService.templateRangeModel.count,
                excludeZeroVal: this.planogramService.templateRangeModel.excludeZeroVal
            };

            this.setHighlightType(this.planogramService.templateRangeModel.highlightType);

            objMain.options = Object.assign({}, this.planogramService.templateRangeModel);
            if (objMain.options.highlightType === 'STRING_MATCH') {
                let tempRangeModelName: string[] = [];
                let tempRangeNModelcolor: string[] = [];
                objMain.options.rangeModel.forEach((v) => {
                    if (this.validTemplate) {
                        if (tempRangeModelName.indexOf(v.value) == -1) {
                            tempRangeModelName.push(v.value);
                        } else {
                            this.duplicateValue = v.value;
                            this.validTemplate = false;
                        }

                        if (tempRangeNModelcolor.indexOf(v.color) == -1) {
                            tempRangeNModelcolor.push(v.color);
                        } else {
                            this.duplicateValue = v.color;
                            this.validTemplate = false;
                        }
                    }
                });
            }
            if (this.validTemplate) {
                let updated = false;
                this.planogramStore.appSettings.highlightUsrTemplate.forEach((element, index, list) => {
                    this.allTemplates.forEach(item => {
                        if(item.name === element.name) {
                            element.GUID = item.GUID;
                            element.isFavorite = item.isFavorite;
                        }
                    });                       
                    
                    if (element.name == objMain.name) {
                        list[index] = objMain;
                        updated = true;
                    }

                    switch (element.options.highlightType) {
                        case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                            element.options.highlightType = HighlightTypeKey.STRING_MATCH_kEY;
                            break;
                        case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                            element.options.highlightType = HighlightTypeKey.NUMERIC_RANGE_KEY;
                            break;
                        case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                            element.options.highlightType = HighlightTypeKey.COLOR_SCALE_KEY;
                            break;
                        case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                            element.options.highlightType = HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY;
                            break;
                        case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                            element.options.highlightType = HighlightTypeKey.QUADRANT_ANALYSIS_KEY;
                            break;
                    }
                }, objMain);
                if (!updated) {
                    this.planogramStore.appSettings.highlightUsrTemplate.push(objMain);
                    this.allTemplates.push(objMain);
                    this.subscriptions.add(
                        this.saveTemplateAsAppSettings().subscribe((res) => {
                            this.notifyService.success('NEW_TEMPLATE_ADDED_SUCCESSFULLY');
                            this.highlightService.modelHL.chosenTemplate = objMain;
                            this.highlightService.modelHL = Object.assign({}, this.highlightService.modelHL);
                            !this.planogramService.templateRangeModel.count ? this.highlightService.modelHL.chosenTemplate.isCount = false : this.highlightService.modelHL.chosenTemplate.isCount = true;
                        }));
                } else {
                    this.planogramStore.appSettings.highlightUsrTemplate = without(
                        this.planogramStore.appSettings.highlightUsrTemplate,
                        find(this.planogramStore.appSettings.highlightUsrTemplate, { name: templateName }),
                    );
                    this.planogramStore.appSettings.highlightUsrTemplate.push(objMain);

                    this.subscriptions.add(
                        this.saveTemplateAsAppSettings().subscribe((res) => {
                            this.highlightService.modelHL.chosenTemplate = objMain;
                            this.highlightService.modelHL = Object.assign({}, this.highlightService.modelHL);
                            this.updateAllTemplatesArray(objMain);
                        }));
                }                
            }

            if (this.validTemplate) {
                this.updateFlag = false;
                this.highlightService.modelHL.template = templateName;
                this.highlightService.buttonSettings = {
                    showSaveAs: true,
                    showUpdate: true,
                    showSave: false,
                    autoFill: false,
                    showRemove: true,
                    showAddSysTemp: true,
                    templateName: templateName,
                };
            } else this.notifyService.error('FAILED_TO_SAVE_TEMPLATE');
        }
    }

    private updateAllTemplatesArray(objMain: SelectedTemplate): void{
        for (const template of this.allTemplates) {
            if (template.name.toLowerCase() == objMain.name.toLowerCase()) {
                template.isCount = objMain.isCount;
                template.excludeZeroVal = objMain.excludeZeroVal;
            }
        }
    }

  private saveTemplateAsAppSettings(): Observable<boolean> {
    const usertemplateData = JSON.stringify(this.planogramStore.appSettings.highlightUsrTemplate);
    const settingObj: SettingValue = {
      KeyName: 'HIGHLIGHT_USR_TEMPLATE',
      KeyType: 'string',
      KeyValue: usertemplateData,
    };
    const sortedListObj: SettingValue = {
      KeyName: 'HIGHLIGHT_USR_TEMPLATE_ORDER',
      KeyType: 'string',
      KeyValue: JSON.stringify(this.highlightService.makeSortedGuidList(this.allTemplates)),
    }
    const newTemplateData: AppSettings = {
      AppSettings: {
        KeyGroup: 'POG',
        User: null,
        Values: [settingObj, sortedListObj],
      },
    };
    this.toggleIndex = -1;//setting index to -1 when we save a new template
    return this.appSettingsService.saveSettings(newTemplateData, false, true);
    
  }

    private setHighlightType(highlightType: string): void {
        switch (highlightType) {
            case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                this.planogramService.templateRangeModel.highlightType = HighlightTypeKey.STRING_MATCH_kEY;
                break;
            case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                this.planogramService.templateRangeModel.highlightType = HighlightTypeKey.NUMERIC_RANGE_KEY;
                break;
            case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                this.planogramService.templateRangeModel.highlightType = HighlightTypeKey.COLOR_SCALE_KEY;
                break;
            case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                this.planogramService.templateRangeModel.highlightType = HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY;
                break;
            case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                this.planogramService.templateRangeModel.highlightType = HighlightTypeKey.QUADRANT_ANALYSIS_KEY;
                break;
        }
    }

    private resetColor(fromFill: boolean = true): void {
        switch (this.highlightService.modelHL.type) {
            case this.translate.instant(HighlightTypeKey.STRING_MATCH_kEY):
                this.stringMatch.changeInItemCount();
                if (this.highlightService.modelHL.fieldObjectChosen.LkUpGroupName == 'Orientation' || this.highlightService.modelHL.fieldObjectChosen.LkUpGroupName === 'PACKAGESTYLE') {
                    this.stringMatch.setReset(fromFill);
                } else {
                    if (this.changeInList || this.planogramService.templateRangeModel?.rangeModel) {
                        //color reset happens if there is any changes in position
                        this.stringMatch.setReset(fromFill);
                    }
                }
                break;
            case this.translate.instant(HighlightTypeKey.NUMERIC_RANGE_KEY):
                this.numericmatch.setFill();
                break;
            case this.translate.instant(HighlightTypeKey.COLOR_SCALE_KEY):
                this.spectrum.setReset();
                break;
            case this.translate.instant(HighlightTypeKey.TOP_BOTTOM_ANALYSIS_KEY):
                this.planogramService.templateRangeModel.count ? this.rangeModel.setFillCount() : this.rangeModel.setFill();
                break;
            case this.translate.instant(HighlightTypeKey.QUADRANT_ANALYSIS_KEY):
                this.quadrant.setFill(fromFill);
                break;
        }

        this.changeFieldCount = false;
        this.changeInList = false;
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
        if (this.sharedService.enableHighlightInWorksheet) {
            this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
        }
    }

    private OnpinUnpin(): void {
        this.isPin = !this.isPin;
        this.onPinUnpintoggle.emit(this.isPin);
        this.pogHighlightHeaderMenuShowHide.isPin = this.isPin;
    }

    private Onclose(): void {
        this.pogSideNavStateService.activeVeiw = this.pogSideNavStateService.activeVeiw == PogSideNaveView.HIGHLIGHT ? null : "" as any;
        this.viewComponentInSideNav.emit(false);
    }

    private retrieveSavedSearch(): void {
        this.subscriptions.add(
            this.appSettingsService.getAppSettingsByName<SavedSearch[]>('NAMED_FIND', 'POG')
                .subscribe((res: SavedSearch[]) => {
                    this.highlightService.retrievedData = res;
                }));
    }

    private addGuidToTemplate(): void {
        let systemTemplates: HighlightTemplate[] = [];
        let userTemplates: HighlightTemplate[] = [];
        this.allTemplates = this.highlightService.getTemplates();
        this.allTemplates.shift(); //@Sagar: To pop the Default template out
        //@Sagar: To check each template has the GUID created or else create for that one 
        this.allTemplates.forEach(item => {
            if(!item.GUID) {
                item.GUID = Utils.generateGUID();
                this.isAnyTemplateDirty = true;
            }

            if(item.isFavorite === undefined || item.isFavorite === null) {
                item.isFavorite = false;
                this.isAnyTemplateDirty = true;
            }

            if(item.isSystem) {
                systemTemplates.push(item);
            } else {
                userTemplates.push(item);
            }
        })        

        //@Sagar: To save the all templates(system and User) initially with GUID and isFavorite
        if(this.isAnyTemplateDirty) {
            const dataTopost = {
                SYSTemp: JSON.stringify(systemTemplates),
                USRTemp: JSON.stringify(userTemplates),
            };
            const obs = this.highlightService
            .UpdateHighlightTemplates(dataTopost)
            .subscribe((res: IApiResponse<string>) => {
                this.isAnyTemplateDirty = false;
            });
            this.subscriptions.add(obs);
        }
        
    }

    private mapTemplatesToSortedOrder(): void {
        this.addGuidToTemplate();
        let sortedListContainer: HighlightTemplate[] = [];
        this.subscriptions.add(
            this.appSettingsService.getAppSettingsByName<SortedGuidList[]>('HIGHLIGHT_USR_TEMPLATE_ORDER', 'POG')
                .subscribe((res: SortedGuidList[]) => {
                    this.highlightService.retrivedGuidList = res;                     
                    //@Sagar: To Sort All templates for the List
                    this.highlightService.retrivedGuidList?.reverse().forEach(eachFromList => { 
                        this.allTemplates.sort(eachTemplate => {
                            if(eachFromList.guid === eachTemplate.GUID) {
                                eachTemplate.isFavorite = eachFromList.isFav;
                                eachTemplate.isDefault = eachFromList.isDefault;
                                return -1;
                            } else return 1;
                        });
                    });
                })
            );   
    }

    private init(ctrl: boolean = false): void {
        this.mapTemplatesToSortedOrder();
        this.width = this.pogSideNavStateService.highlightView.width;
        if(!this.highlightService.modelHL.chosenTemplate) {
            this.highlightService.modelHL = Object.assign({}, this.highlightService.selectedOptions);
        }
        this.highlightService.modelHL.tool = this.isHighlightEnabledForActivePog();
         if(this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isEnabled && this.highlightDefaultFlag){
             this.toggleChange(true);
         }else{
            this.toggleChange(ctrl);
         }     
        
    }

    public changeSideNavWidth(action: string, event: PointerEvent): void {
        this.width = this.pogSideNavStateService.changeSideNavWidth(action, this.width);
        event.stopPropagation();
    }

    public menuButtonClick_Highlight(response: Event): void {
        const selectedMenu = response[`data`];
        if (selectedMenu) {
            switch (selectedMenu[`key`].trim()) {
                case 'PohHighlightView_GRIDON':
                    this.worksheetIconClick(true);
                    break;
                case 'PohHighlightView_GRIDOFF':
                    this.worksheetIconClick(false);
                    break;
                case 'PohHighlightView_SETTINGS':
                    this.openHighlightSetting();
                    break;
                case 'PohHighlightView_FILLCOLOR':
                    this.resetColor();
                    break;
                case 'PohHighlightView_PIN':
                case 'PohHighlightView_UNPIN':
                    this.OnpinUnpin();
                    break;
                case 'PohHighlightView_CLOSE':
                    this.Onclose();
                    break;
            }
        }
    }

    public worksheetIconClick(flag: boolean): void {
        this.pogHighlightHeaderMenuShowHide.gridOnIcon = flag;
        this.sharedService.enableHighlightInWorksheet = !flag && this.highlightService.modelHL.tool;
        this.sharedService.itemWSApplyPositionColor.next({ gridType: 'Position' });
    }

    public ngOnDestroy(): void {
        this.highlightService.highlightDestroyed = true;
        this.subscriptions.unsubscribe();
    }
  

    private isHighlightEnabledForActivePog(): boolean {
        const sectionID = this.sharedService.getActiveSectionId();
        const pogSettings = this.planogramService.rootFlags[sectionID];
        //check loaded pogs any one sectionID has highlight enabled 
        if (pogSettings) { return this.checkForActiveSectionID()?.length > 0}
        return false; // default value
    }

    public ngOnInit(): void {
        this.highlightService.updateRangeModelFlag = false;
        this.STRING_MATCH = this.translate.instant('STRING_MATCH'), this.NUMERIC_RANGE = this.translate.instant('NUMERIC_RANGE'), 
        this.COLOR_SCALE = this.translate.instant('COLOR_SCALE'), this.TOP_BOTTOM_ANALYSIS = this.translate.instant('TOP_BOTTOM_ANALYSIS'),
        this.QUADRANT_ANALYSIS = this.translate.instant('QUADRANT_ANALYSIS'); 
        this.type = this.highlightService.getHighlightOptions();
        this.retrieveSavedSearch();
        this.pogHighlightHeaderMenuShowHide.isPin = this.isPin;
        this.highlightService.highlightInitialized = true;
        this.highlightService.highlightDestroyed = false;
        this.init();
        const obsShowHighlight = this.sharedService.showHighlight.subscribe((res) => {
            if (res) {
                this.init(true); //ctrl+H
            }
        });
        this.subscriptions.add(obsShowHighlight);
        const obsUpdateHighlight = this.sharedService.updateHighlight.subscribe((res) => {
            if (res) {
                this.highlightService.modelHL.tool = this.isHighlightEnabledForActivePog();
                this.toggleChange();
            }
        });
        this.subscriptions.add(obsUpdateHighlight);

        const objToggleForward = this.planogramService.toggleForwardBetweenTemplate.subscribe(() => {
            this.toggleForwardBetweenTemplates();
        });
        this.subscriptions.add(objToggleForward);

        const obgToggleBackward = this.planogramService.toggleBackwardBetweenTemplate.subscribe(() => {
            this.toggleBackwardBetweenTemplates();
        });
        this.subscriptions.add(obgToggleBackward);
        
        this.subscriptions.add(this.highlightService.refreshHighLight.subscribe((res) => {
            if (res) {   
                this.resetColor(true);
              }
        }));
        setInterval(() => {
            if(this.isListDirty) {
                this.subscriptions.add(
                    this.saveTemplateAsAppSettings().subscribe((res) => {
                    })
                );
                this.isListDirty = false;
            }
        }, 3000);
    }

    public ngOnChanges(changes: SimpleChanges): void {
        if (changes['pogData'] && changes['pogData'].currentValue) {
            this.init();
        }
    }

  public toggleForwardBetweenTemplates(): void {
    this.toggleIndex++;
    if (this.toggleFavoriteTemplate) {
      if (this.toggleIndex >= this.favoriteTemplatesList.length) {
        this.toggleIndex = 0;
      }
    } else {
      if (this.toggleIndex >= this.allTemplates.length) {
        this.toggleIndex = 0;
      }
    }
    this.toggleBetweenTemplates(this.toggleIndex);
  }

    private toggleBetweenTemplates(index: number): void {
        if (this.toggleFavoriteTemplate) {
            if(this.favoriteTemplatesList.length > 0) {
            this.selectedTemplateToPopulate = this.favoriteTemplatesList[index].value;
            this.selectedtype = this.favoriteTemplatesList[index]['options']['highlightType'];
            this.selectedfield = this.favoriteTemplatesList[index]['options']['fieldStr'];
            this.selectedcopyOfField = this.favoriteTemplatesList[index]['options']['fieldStrQ'];
            }
        } else {
            if(this.allTemplates.length > 0) {
            this.selectedTemplateToPopulate = this.allTemplates[index].value;
            this.selectedtype = this.allTemplates[index]['options']['highlightType'];
            this.selectedfield = this.allTemplates[index]['options']['fieldStr'];
            this.selectedcopyOfField = this.allTemplates[index]['options']['fieldStrQ'];
            }
        }
        this.populateLookupField();
    }

  public toggleBackwardBetweenTemplates(): void {
    this.toggleIndex--;
    if (this.toggleFavoriteTemplate) {
      if (this.toggleIndex < 0) {
        this.toggleIndex = this.favoriteTemplatesList.length - 1;
      }
    } else {
      if (this.toggleIndex < 0) {
        this.toggleIndex = this.allTemplates.length - 1;
      }
    }
    this.toggleBetweenTemplates(this.toggleIndex);
  }

    //@Sagar: need to move this function to highlight.service because here and in highlight-settings.component it's been used
    private populateLookupField(): void { 
        this.type = this.highlightService.getHighlightOptions();
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
                        field.value = this.highlightService.makeHighlightOptionsFromDict(field);
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
                    if (this.selectedTemplateToPopulate != '?') {
                        const selectedField = this.field
                            .filter((item) => item['value'] == this.selectedfield)
                            .map((a) => Object.assign({}, a));
                        this.planogramService.fieldOption = this.selectedfield;
                        const selectedFieldQ = this.copyOfField
                            .filter((item) => item['value'] == this.selectedcopyOfField)
                            .map((a) => Object.assign({}, a));
                        const selectedTemplate = this.allTemplates
                            .filter((item) => item['value'] == this.selectedTemplateToPopulate)
                            .map((a) => Object.assign({}, a));
                            if (this.toggleFavoriteTemplate) {
                                this.selectedTemplateIndex = this.favoriteTemplatesList.findIndex(item => item['value'] === this.selectedTemplateToPopulate);
                            } else {
                                this.selectedTemplateIndex = this.allTemplates.findIndex(item => item['value'] === this.selectedTemplateToPopulate);
                            }
                        
                        const highlightObj={
                            selectedTemplate: selectedTemplate[0],
                            field: this.selectedfield,
                            fieldQ: this.selectedcopyOfField,
                            fieldObjectChosen: selectedField[0],
                            fieldObjectChosenQ: selectedFieldQ[0],
                            type: this.selectedtype,
                            selectedTemplateIndex: this.selectedTemplateIndex,
                        }
                        this.showSelectedTemplate(highlightObj);
                    }
                }
            }
        }
    }

    private showSelectedTemplate(result: any): void{
        this.selectedTemplate = result['selectedTemplate'];
            if (this.selectedTemplate['value'] != '?') {
                this.toggleIndex=result['selectedTemplateIndex'];
                this.planogramService.templateRangeModel = result['selectedTemplate']['options'];
                this.planogramService.templateRangeModel.fieldObjectChosen = result['fieldObjectChosen'];
                this.highlightService.modelHL.chosenTemplate = result['selectedTemplate'];
                this.highlightService.modelHL.template = result['selectedTemplate']['name'];
                this.highlightService.buttonSettings.templateName = result['selectedTemplate']['name'];
                this.highlightService.buttonSettings = {
                    showSaveAs: true,
                    showUpdate: !this.highlightService.modelHL.chosenTemplate.readonly,
                    showSave: false,
                    showAddSysTemp: !this.highlightService.modelHL.chosenTemplate.readonly,
                    showRemove: !this.highlightService.modelHL.chosenTemplate.readonly,
                    autoFill: false,
                    templateName: this.highlightService.modelHL.chosenTemplate.name,
                };
            } else {
                this.highlightService.buttonSettings.templateName = '';
                this.highlightService.modelHL.chosenTemplate = undefined;
                this.toggleIndex = -1;
            }       
        this.highlightService.modelHL.fieldObjectChosen = result['fieldObjectChosen'];
        this.highlightService.modelHL.fieldObjectChosenQ = result['fieldObjectChosenQ'];
        this.highlightService.modelHL.type = this.translate.instant(result['type']);
        this.highlightService.modelHL.field = result['field'];
        this.highlightService.modelHL.fieldQ = result['fieldQ'];
        this.highlightService.modelHL = Object.assign({}, this.highlightService.modelHL);
        this.highlightService.selectedOptions = Object.assign({}, this.highlightService.modelHL);
    }

    public drop(event: CdkDragDrop<string[]>) {
        moveItemInArray(this.allTemplates, event.previousIndex, event.currentIndex);
        this.isListDirty = true;
    }

    public toggleFavorite(): void {
        this.toggleFavoriteTemplate = !this.toggleFavoriteTemplate;
        if (this.toggleFavoriteTemplate) {
            this.favoriteTemplatesList = this.allTemplates.filter(x => x.isFavorite);
        } else {
            this.allTemplates = this.allTemplates.sort((a, b) => a.isFavorite > b.isFavorite ? 1 : -1).reverse();
        }
    }

    public markUnmarkFavoriteTemplate(guid: string): void {
        if(guid) {   
            if (this.toggleFavoriteTemplate) {
                const selectedTemplateIndex = this.favoriteTemplatesList.findIndex((item) => item['GUID'] === guid);    
                this.favoriteTemplatesList[selectedTemplateIndex].isFavorite = !this.favoriteTemplatesList[selectedTemplateIndex].isFavorite;
                this.favoriteTemplatesList = this.favoriteTemplatesList.filter(x => x.isFavorite);              
                this.isListDirty = true; 
            } else {
                const selectedTemplateIndex = this.allTemplates.findIndex((item) => item['GUID'] === guid);    
                this.allTemplates[selectedTemplateIndex].isFavorite = !this.allTemplates[selectedTemplateIndex].isFavorite;
                this.favoriteTemplatesList = this.allTemplates.filter(x => x.isFavorite);    
                let newIndex = this.favoriteTemplatesList.length;
                if(this.allTemplates[selectedTemplateIndex].isFavorite == true){
                    newIndex = newIndex-1;
                }
                moveItemInArray(this.allTemplates, selectedTemplateIndex, newIndex);
                this.isListDirty = true;                
            }
            const highlightDefault = document.getElementById(guid);
            for (let item of this.allTemplates) {
                if (item.GUID === guid) {
                    if (highlightDefault.innerHTML == this.translate.instant('DEFAULT')) {
                        highlightDefault.setAttribute('style', `margin-left: auto!important; visibility: visible; cursor: pointer!important; color: #4E9698`);
                    } else {
                        highlightDefault.setAttribute('style', `visibility: hidden`);
                    }
                }
            }
        }
    }


    public templateChangeFromList(template: HighlightTemplate): void {
        if (template) {
            this.highlightService.showLegend.next(false);
            this.sharedService.isListEdited = false;
            const selectedTemplate = template;
            this.selectedtype = selectedTemplate['options']['highlightType'];
            this.setSelectedType(this.selectedtype);
            this.selectedfield = selectedTemplate['options']['fieldStr'];
            this.selectedcopyOfField = selectedTemplate['options']['fieldStrQ'];
            this.selectedTemplateToPopulate = selectedTemplate.value;
            if (this.toggleFavoriteTemplate) {
                this.index = this.favoriteTemplatesList.findIndex(item => item['value'] === this.selectedTemplateToPopulate);
            } else {
                this.index = this.allTemplates.findIndex(item => item['value'] === this.selectedTemplateToPopulate);
            }
            this.populateLookupField();
        }
    }

    //@Sagar: need to move this function to highlight.service because here and in highlight-settings.component it's been used
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

    public reDirectToTemplate(template: HighlightTemplate): void {
        if(template){
            this.highlightService.modelHL.tool = true;
            this.highlightService.modelHL.toggleName = this.translate.instant('ON');
            const sectionID = this.sharedService.getActiveSectionId();
            this.planogramService.rootFlags[sectionID].isEnabled = true;
            this.planogramService.highlightPositionEmit.next(true);
            this.templateChangeFromList(template);
            this.shoppingCartService.checkForChangeInCart.next(false);
            if(this.highlightService.options){
                this.highlightService.options = this.planogramService.templateRangeModel;
            }
        }
    }

    public setAsDefault(templateGuid: string): void {
        for (let item of this.allTemplates) {
            if(item.GUID === templateGuid){
                if(item?.isDefault){
                    item.isDefault = false; //undo Default
                    const highlightDefault = document.getElementById(templateGuid);
                    highlightDefault.innerHTML = this.translate.instant('SET_DEFAULT');
                }else{
                    item.isDefault = true;
                }
            }
            else{
                item.isDefault = false;
            }
        }
        this.highlightService.highlightList?.forEach(eachFromList => { 
            this.allTemplates.forEach(eachTemplate => {
                if(eachFromList.guid === eachTemplate.GUID) {
                    eachFromList.isDefault = eachTemplate.isDefault;
                }
            });
        });
        this.highLightTemplates();
        this.subscriptions.add(
            this.saveTemplateAsAppSettings().subscribe((res) => {
            })
        );
    }

    private highLightTemplates() {
        for (let item of this.allTemplates) {
            const highlightDefault = document.getElementById(item.GUID);
            if (item.isDefault) {
                highlightDefault.innerHTML = this.translate.instant('DEFAULT');
                highlightDefault.setAttribute('style', `margin-left: auto!important; visibility: visible; cursor: pointer!important; color: #4E9698`);
            } else {
                highlightDefault.innerHTML = this.translate.instant('SET_DEFAULT');
                highlightDefault.setAttribute('style', `visibility: hidden`);
            }
        }
    }
}

