import { Component, NgZone, Input, Output, EventEmitter, ViewChild, OnDestroy, OnInit, ElementRef, Optional, AfterViewChecked, ViewEncapsulation } from '@angular/core';
import { COLOR_PALETTE } from 'src/app/shared/constants/colorPalette';
import { cloneDeep, difference, filter, template } from 'lodash';
import { Dictionary, LABEL, LabelType, PaletteSettings, LabelTemplate, DisplaySetting } from 'src/app/shared/models';
import { PogSettingParamKey, POGSettingParam, PogSettingParamGroup, AllSettings } from 'src/app/shared/models/sa-dashboard';
import { GridConfig, GridColumnCustomConfig, GridColumnSettings } from 'src/app/shared/components/ag-grid/models';
import { AgGridHelperService, NotifyService, PlanogramStoreService, SharedService } from 'src/app/shared/services';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ColDef } from 'ag-grid-community';
import { TranslateService } from '@ngx-translate/core';
import { FormControl } from '@angular/forms';
import { COMMA, ENTER, I } from '@angular/cdk/keycodes';
import { MatAutocomplete, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatChipInputEvent } from '@angular/material/chips';
import { CdkDragEnd, moveItemInArray } from '@angular/cdk/drag-drop';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SaveTemplateDialog } from './dialog-template.component'
import { LabelNumber } from 'src/app/shared/models/planogram-enums';
import { LabelEditType } from 'src/app/shared/models/enums';
import { MatSelect } from '@angular/material/select';
import { MatCheckboxChange } from '@angular/material/checkbox';


@Component({
  selector: 'sp-label-template',
  templateUrl: './label-template.component.html',
  styleUrls: ['./label-template.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class LabelTemplateComponent implements OnDestroy, OnInit, AfterViewChecked {
  public get labelType(): typeof LabelType {
    return LabelType;
  }
  public currTemplate: LabelTemplate;
  public templatesData: LabelTemplate[];
  public rawTemplatesData: LabelTemplate[];
  @Input() templates: AllSettings;
  @Input() templateMetaData: PogSettingParamGroup[];
  @Input() labelFilters: Dictionary[];
  @Input() key: string;
  @Output() emitSelection = new EventEmitter();
  @Output() cancel = new EventEmitter();
  @Input() gridId: string;
  public shrinkFitValue_1: number;
  public shrinkFitValue_2: number;
  private tempEditField: string;
  public sameAlignmentSelected: boolean;
  public min: number = 0;
  public sliderSize: number = 10;
  public sliderValues = Array.from({length: 101}, (v, k) => k + 1);
  public Lable1PreviewCls: string = "Lable1PreviewCls";
  public Lable2PreviewCls: string = "Lable2PreviewCls";
  public gradientSettings = {
    opacity: false,
  };
  public paletteSettings: PaletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE,
  };
  public fillColor: string = '#000000';
  public labelExpression: string;
  private selectedArray: number[];
  public alignmentsSection: string[] = ['VERTICAL_ALIGNMENT', 'LABEL_ORIENTATION', 'HORIZONTAL_ALIGNMENT', 'STRECH_TO_FACING', 'WORD_WRAP', 'SHRINK_TO_FIT', 'CROSSBAR_LABEL_DISPLAY'];
  public alignmentsBooleanSection: string[] = ['STRECH_TO_FACING', 'WORD_WRAP', 'SHRINK_TO_FIT'];
  public backgroundsSection: string[] = ['BACKGROUND_COLOR', 'STROKE_COLOR', 'TRANSPARENCY']
  public filterText: string = '';
  public gridConfigData1: GridConfig;
  public gridConfigData2: GridConfig;
  public labelID: LABEL = LABEL.LABEL_1;
  public visible: boolean = true;
  public selectable: boolean = true;
  public removable: boolean = true;
  public addOnBlur: boolean = true;
  public separatorKeysCodes: number[] = [ENTER, COMMA];
  public labelCtrl = new FormControl();
  public labelFiltersSelected: [Dictionary[], Dictionary[]] = [[], []];
  public labelFiltersAutoComplete: [Dictionary[], Dictionary[]] = [[], []];
  public labelExpressions: [string, string] = ['', ''];
  public openLabelTemplateSave: boolean = false;
  public labelTemplateName: string = '';
  public limit: number = 5;
  public defaultDecimalPlaces: number = -1;
  public horizontalScroll: boolean[] = [];
  public verticalScroll: boolean[] = [];
  public displaySetting: DisplaySetting = { type: '', fromCloneDeleteSave: LabelEditType.NONE };
  public fixtureKeyNames = ['Pegboard', 'CoffinCase', 'Basket', 'Slotwall', 'Crossbar', 'StandardShelf', 'BlockFixture'];

  @ViewChild(`grid1`) grid1: AgGridComponent;
  @ViewChild(`grid2`) grid2: AgGridComponent;
  private grid: AgGridComponent;
  @ViewChild('auto', { static: false }) matAutocomplete: MatAutocomplete;
  @ViewChild('labelInput', { static: false }) labelInput: ElementRef<HTMLInputElement>;
  @ViewChild('chipInput', { static: false }) chipInput: ElementRef<HTMLInputElement>;
  @ViewChild('templateInput', { static: false }) templateInput: ElementRef<HTMLInputElement>;
  @ViewChild('templateSelect', { static: false }) templateSelect: MatSelect;
  @ViewChild('enter', { static: false }) enter: ElementRef<HTMLInputElement>;
  constructor(
    private readonly zone: NgZone,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly translate: TranslateService,
    public readonly planogramStore: PlanogramStoreService,
    @Optional() private readonly matDialog: MatDialog,
    private readonly notifyService: NotifyService,
    private sharedService :SharedService
  ) { }

  public ngAfterViewChecked(): void {
    this.checkForScrollBarLabel(this.labelID);

    if (this.horizontalScroll[this.labelID] || this.verticalScroll[this.labelID]) {
      this.zone.runOutsideAngular(() => {
        setTimeout(() => {
          document.getElementById("Lable1PreviewCls")?.click();
          if (this.currTemplate['LABEL_' + this.labelID]?.WORD_WRAP) {
            this.labelID == 1 ? this.shrinkFitValue_1 = 0.3 : this.shrinkFitValue_2 = 0.3;
          } else {
            this.labelID == 1 ? this.shrinkFitValue_1 = this.currTemplate['LABEL_' + this.labelID].FONT_SIZE : this.shrinkFitValue_2 = this.currTemplate['LABEL_' + this.labelID].FONT_SIZE;
            this.currTemplate['LABEL_' + this.labelID].FONT_SIZE = this.currTemplate['LABEL_' + this.labelID].FONT_SIZE;
          }
        }, 100);
      });


    }
  }

  //appending the label filters
  private appendLabelFilters(): void {
    this.templatesData.forEach((temp) => {
      if(!temp.labelFiltersSelected){
        temp.labelFiltersSelected = [[], []];
        this.resetLabelFilters();
        temp.labelFiltersAutoComplete = cloneDeep([this.labelFilters, this.labelFilters]);
      }
    });
  }

  private resetLabelFilters() {
    this.labelFilters.forEach((label) => {
      label.startTitle = label.title + ': ';
      label.endTitle = ' ';
      label.lineBreak = false;
      label.startInputs = 1;
      label.endInputs = 1;
    });
  }

  public ngOnInit(): void {
    this.templatesData = JSON.parse(this.templates.KeyValue.toString()).LABELS;
    const decimalPlacesSetting = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.filter(set => set.KeyName == 'LABEL_DEFAULT_DECIMAL_PLACES' && set.KeyGroup == 'POG');
    this.defaultDecimalPlaces = decimalPlacesSetting?.[0]?.KeyValue as number ?? -1;
    this.templatesData[0]['LABEL_1']['DECIMALS'] = this.defaultDecimalPlaces;
    this.templatesData[0]['LABEL_2']['DECIMALS'] = this.defaultDecimalPlaces;
    this.rawTemplatesData = cloneDeep(this.templatesData);
    this.appendLabelFilters();
    const limitSetting = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.filter(set => set.KeyName == 'LABEL_FIELD_SELECTION_LIMIT' && set.KeyGroup == 'POG');
    this.limit = limitSetting[0]?.KeyValue as number;
    if (this.gridId == LabelType.POSITION) {
      this.templateMetaData[0].children.forEach(template => template.fieldObj.KeyName = template.fieldObj?.KeyName?.replace('USER_DEFAULTS.POSLABEL.', ''));
    } else if (this.gridId == LabelType.FIXTURE) {
      this.templateMetaData[0].children.forEach(template => template.fieldObj.KeyName = template.fieldObj?.KeyName?.replace('USER_DEFAULTS.FIXTLABEL.', ''));
    }
    this.currTemplate = this.templatesData.filter(template => template.IS_SELECTED == true)[0];
    document.querySelectorAll('.cdk-overlay-pane').forEach((pane) => { (pane as any).innerHTML.includes('position-setting')||(pane as any).innerHTML.includes('fixture-setting') ? (pane as any).style.width = '80vw' : '' });
    document.querySelectorAll('.cdk-overlay-pane').forEach((pane) => { (pane as any).innerHTML.includes('position-setting')||(pane as any).innerHTML.includes('fixture-setting') ? (pane as any).style.height = '85%' : '' });
    document.querySelector<HTMLElement>('.mat-dialog-content.settingCntnr').style.height = '100%';
    this.grid = this.grid1;
    this.templateChanged();
  }

  private selectLabelExpression(labelExp: string, labelID: number): void {
    this.appendLabelFilters();
    this.currTemplate.labelFiltersSelected[labelID - 1] = [];
    let labelTitles = labelExp.split('~|~');
    labelTitles.forEach(lab => {
      if (lab) {
        let startTitle = lab.substring(0, lab.indexOf('~')).trim() + ' ';
        let dictID = lab.substring(lab.indexOf('~') + 1, lab.lastIndexOf('~'));
        let endTitle = lab.substring(lab.lastIndexOf('~') + 1).trim() + ' ';
        let label = cloneDeep(this.labelFilters.find(l => l.IDDictionary as any == dictID));
        if (label) {
          label.startTitle = startTitle;
          label.endTitle = endTitle;
          this.currTemplate.labelFiltersSelected[labelID - 1].push(label);
        }
      }
    });
    this.currTemplate.labelFiltersAutoComplete[labelID - 1] = this.labelFilters.filter(x => !this.currTemplate.labelFiltersSelected[labelID - 1].map(lab => lab.IDDictionary).includes(x.IDDictionary));
  }

  public ngAfterViewInit(): void {
    this.templateSelect._handleKeydown = (event: KeyboardEvent) => {
      if (event.code.toLowerCase() == 'space')
        return;
    };
    this.grid = this.labelID == 1 ? this.grid1 : this.grid2;
  }

  public isCheckDisabled(fieldObj: string): boolean {
    if (fieldObj === 'DOCK_STATUSBAR') {
      return true;
    }
    return false;
  }

  public showCheck(fieldObj: string): boolean {
    if (fieldObj === 'DOCK_STATUSBAR') {
      return false;
    }
    return true;
  }

  private isReadOnly(tData: PogSettingParamGroup[]): boolean {
    return (
      filter(tData[0].children, function (o) {
        return o.key.indexOf('.POSLABEL.') > 0;
      }).length === 0
    );
  }

  public getLabelExpArray(): void {
    this.labelFilters.forEach((obj) => {
      if (this.labelExpression && this.labelExpression.includes('~' + obj.value + '~')) {
        this.selectedArray.push(obj.IDDictionary);
      }
    });
  }

  public updateSliderSetting(value: number): void {
    this.sliderSize = (value / 100);
  }

  private generateLabelExp(): void {
    let labelStr = ''
    this.currTemplate.labelFiltersSelected[this.labelID - 1].forEach((label) => {
      const startTitleID = 'S_' + label.IDDictionary + '_L' + this.labelID;
      let startTitles = document.querySelectorAll("[id$=" + startTitleID + "]");
      const endTitleID = 'E_' + label.IDDictionary + '_L' + this.labelID;
      let endTitles = document.querySelectorAll("[id$=" + endTitleID + "]");
      startTitles.forEach(node => {
        switch (node.nodeName.toLowerCase()) {
          case 'input':
            labelStr += (node as HTMLInputElement).value;
            break;
          case 'mat-icon':
            labelStr += '\\n';
            break;
        }
      });
      labelStr += '~' + label.IDDictionary + '~';
      endTitles.forEach(node => {
        switch (node.nodeName.toLowerCase()) {
          case 'input':
            labelStr += (node as HTMLInputElement).value;
            break;
          case 'mat-icon':
            labelStr += '\\n';
            break;
        }
      });
      labelStr += '~|~';
    });
    this.currTemplate['LABEL_' + this.labelID].LABEL = labelStr;
  }

  public showTitleChange(event: boolean): void {
    this.currTemplate['LABEL_' + this.labelID].SHOW_LABEL_TITLE = event;
    this.generateLabelExp();
  }

  public checkForScrollBarLabel(LabelID: number): boolean { //check the preview has scrollbars
    this.horizontalScroll[LabelID] = false;
    this.verticalScroll[LabelID] = false;
    const labelClass = LabelID == 1 ? "Lable1PreviewCls" : "Lable2PreviewCls";
    var div = document.getElementById(labelClass) as HTMLElement;
    this.horizontalScroll[LabelID] = div?.scrollWidth > div?.clientWidth;
    this.verticalScroll[LabelID] = div?.scrollHeight > div?.clientHeight;
    if (this.horizontalScroll[LabelID] || this.verticalScroll[LabelID]) {
      return true;
    } else {
      return false;
    }
  }

  public updateFontSize(event, keyName: string, labelID: number): void {
    let fontValue;
    if (event && keyName == "SHRINK_TO_FIT") {
      fontValue = this.checkForScrollBarLabel(labelID) && (this.currTemplate['LABEL_' + labelID].WORD_WRAP) ? "0.3" : this.currTemplate['LABEL_' + labelID].FONT_SIZE;

      labelID == LabelNumber.LABEL1 ? this.shrinkFitValue_1 = fontValue : this.shrinkFitValue_2 = fontValue;
    }
  }

  public disabledShrinkFit(keyName: string, labelID: number): boolean {
    if (keyName == "SHRINK_TO_FIT") {
      return !this.currTemplate['LABEL_' + labelID].WORD_WRAP ? true : false;
    } else {
      return false
    }
  }

  public changeInFontSize(shrinkValue: boolean, keyName: string, labelID: number): void { //changeFontsize from dropdown
    if (shrinkValue && keyName == "FONT_SIZE") {
      setTimeout(() => {
        this.updateFontSize(true, "SHRINK_TO_FIT", labelID);
      }, 20);
    }
  }

  public invokeSelectedRow(): void {
    const selectedRows: Dictionary[] = this.grid?.gridApi?.getSelectedRows();
    if (selectedRows.length > (this.limit as number)) {
      const removableRows = selectedRows.splice(this.limit);
      const dictIDs = removableRows.map(id => id.IDDictionary);
      dictIDs.forEach((dictID) => this.grid?.gridApi.forEachNode((node) => node.data.IDDictionary == dictID ? node.setSelected(false) : ''));
      this.notifyService.warn('REACHED_MAXIMUM_SELECTION_LIMIT');
    }
    let itemsAdd = selectedRows.filter(x => !this.currTemplate.labelFiltersSelected[this.labelID - 1].map(lab => lab.IDDictionary).includes(x.IDDictionary));
    let itemsRemove = this.currTemplate.labelFiltersSelected[this.labelID - 1].filter(x => !selectedRows.map(lab => lab.IDDictionary).includes(x.IDDictionary));
    itemsAdd.forEach((item) => {
      item.startTitle = item.title + ': ';
      item.endTitle = ' ';
      this.currTemplate.labelFiltersSelected[this.labelID - 1].push(item)
    });
    itemsRemove.forEach((item) => {
      item.startTitle = item.title + ': ';
      item.endTitle = ' ';
      const index = this.currTemplate.labelFiltersSelected[this.labelID - 1].indexOf(item);
      index != -1 ? this.currTemplate.labelFiltersSelected[this.labelID - 1].splice(index, 1) : '';
      this.removeAttachedTitles(item.IDDictionary);
    });
    this.currTemplate.labelFiltersAutoComplete[this.labelID - 1] = this.labelFilters.filter(x => !this.currTemplate.labelFiltersSelected[this.labelID - 1].map(lab => lab.IDDictionary).includes(x.IDDictionary));
    if (!this.horizontalScroll[this.labelID] && !this.verticalScroll[this.labelID]) {
      this.labelID == 1 ? this.shrinkFitValue_1 = this.currTemplate['LABEL_' + this.labelID]?.FONT_SIZE : this.shrinkFitValue_2 = this.currTemplate['LABEL_' + this.labelID]?.FONT_SIZE;
      this.currTemplate['LABEL_' + this.labelID] ? this.currTemplate['LABEL_' + this.labelID].FONT_SIZE = this.currTemplate['LABEL_' + this.labelID]?.FONT_SIZE : '';
    }
    setTimeout(() => {
      this.resetLabelBoxSize();
      this.generateLabelExp();
     });
  }

  private removeAttachedTitles(dictID) {
    const id = '_' + dictID + '_L' + this.labelID;
    let chipInputEls = document.querySelectorAll("[id$=" + id + "]");
    chipInputEls.forEach(el => {
      if (el.parentNode.nodeName.toLowerCase() == 'span') {
        el.parentElement.remove();
      }
    });
  }

  private gridConfigData(id: string, data: Dictionary[], selectedItems: Dictionary[]): GridConfig {
    let gridData =
    {
      id: id,
      columnDefs: this.prepareColumnsList(id),
      data: data,
      height: '51vh',
      rowHeight: 25,
      hideColumnConfig: true,
      hideSelectAll: true,
      hideGroupHeader: true,
      shoeColCongig: false,
      firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
      setRowsForSelection: { field: 'IDDictionary', items: selectedItems ? selectedItems : [] },

    }
    return gridData;
  }

  public onDataBound(searchValArray: { text: string; value: number }[], searchTxt: string): void {
    if (searchTxt) {
      const index = searchValArray.findIndex((item) => item.text.includes(searchTxt));
      if (index < 0) {
        searchValArray.push({ text: searchTxt, value: Number(searchTxt) });
      }
    }
  }

  public onchange(SelectedValue: { text: string; value: string }): void {
    SelectedValue.text = JSON.stringify(SelectedValue.value);
  }

  //TODO @Amit Move this col conf to DB
  private prepareColumnsList(id: string): ColDef[] {
    let cellClass={'font-size': '12px'};
    let col: GridColumnSettings = {
      0: this.translate.instant('FIELD'),
      1: 'value',
      2: 8,
      3: false,
      4: false,
      5: true,
      6: false,
      7: 0,
      8: 60,
      9: false,
      10: "string",
      11: 'Field',
      12: "",
      13: "True",
      14: JSON.stringify(cellClass),
      15: "",
      16: 0,
      17: 0,
      18: 0,
      ColumnMenu: true,
      IsMandatory: false,
      ProjectType: "",
      SkipTemplateForExport: false,
      SortByTemplate: false,
      FilterTemplate: "",
      Template: ""
    };

    let gridColumnCustomConfig: GridColumnCustomConfig = {
      customCol: [col],
    }
    return this.agGridHelperService.getAgGridColumns(id, gridColumnCustomConfig)
  }

  public ngOnDestroy(): void {
    document.querySelectorAll('.cdk-overlay-pane').forEach((pane) => { (pane as any).innerHTML.includes('position-setting')||(pane as any).innerHTML.includes('fixture-setting') ? (pane as any).style.width = '50vw' : '' });
    document.querySelectorAll('.cdk-overlay-pane').forEach((pane) => { (pane as any).innerHTML.includes('position-setting')||(pane as any).innerHTML.includes('fixture-setting') ? (pane as any).style.height = '76%' : '' });
  }

  public onchangeAlignment(value: string, key: string, readonly: boolean): void {
    if (!readonly) {
      this.currTemplate['LABEL_' + this.labelID][key] = value;
    }
  }

  public tabChanged(index: number): void {
    this.labelID = index + 1;
    this.grid = this.labelID == 1 ? this.grid1 : this.grid2;
    this.selectLabelExpression(this.currTemplate['LABEL_'+this.labelID].LABEL, this.labelID);
    setTimeout(() => {
      this.attachTitleBoxesonLoad();
    });
  }

  public remove(event: Dictionary): void {
    const index = this.currTemplate.labelFiltersSelected[this.labelID - 1].indexOf(event);
    if (index >= 0) {
      this.currTemplate.labelFiltersSelected[this.labelID - 1].splice(index, 1);
      this.currTemplate.labelFiltersAutoComplete[this.labelID - 1] = this.labelFilters.filter(x => !this.currTemplate.labelFiltersSelected[this.labelID - 1].map(lab => lab.IDDictionary).includes(x.IDDictionary));
      this.grid.gridApi.forEachNode((node) => { node.data.IDDictionary == event.IDDictionary ? node.setSelected(false) : null })
      this.removeAttachedTitles(event.IDDictionary);
      this.generateLabelExp();
    }

  }

  public prevent(event: KeyboardEvent | MouseEvent, adjust?: boolean): void {
    event.stopImmediatePropagation();
    if (adjust) {
      let inputEl = event.target as HTMLInputElement;
      inputEl.style.maxWidth = inputEl.value.length < 4?(inputEl.value.length * 1.15) + 'ch':'';
    }
  }

  public entered(event: KeyboardEvent): void {
    event.stopImmediatePropagation();
    event.preventDefault();
  }

  public drop(event): void {
    moveItemInArray(this.currTemplate.labelFiltersSelected[this.labelID - 1], event.previousIndex, event.currentIndex);
    setTimeout(() => {
      this.currTemplate.labelFiltersSelected[this.labelID - 1].forEach(label => {
        this.attachTitleBoxesonDrop(label.IDDictionary);
      });
      this.generateLabelExp();
    });
  }

  public titleUpdate(): void {
    this.generateLabelExp();
  }

  public titleEdit(id: string, chipEl): void {
    this.labelInput.nativeElement.value=chipEl.value;
    this.tempEditField = id;
    this.labelInput.nativeElement.focus();
  }

  public titleEditBlur(): void {
    let chip = document.getElementById('chipInput_1S_' + this.tempEditField + '_L' + this.labelID) as HTMLInputElement;
    if (chip) {
        chip.value = this.labelInput.nativeElement.value;
        chip.parentElement.setAttribute('data-value', chip.value);
        chip.style.maxWidth = chip.value.length == 0 ? '0.5ch' : chip.value.length < 4 ? (chip.value.length * 1.15) + 'ch' : '';
        this.generateLabelExp();
        this.focusChipAfterEdit(this.tempEditField);
        this.tempEditField = '';
        this.labelInput.nativeElement.value = '';
    }
  }

  private focusChipAfterEdit(id): void {
    const chips = this.currTemplate.labelFiltersSelected[this.labelID - 1].filter(field => field.IDDictionary == id);
    if (chips[0]) {
      (document.getElementById('chipLabel' + chips[0].IDDictionary) as HTMLSpanElement).focus();
    }
  }
  public showPegboardTitleChange(event: boolean): void {
    this.currTemplate['LABEL_' + this.labelID].SHOW_PEGBOARD_LABEL = event;
  }
  public updateLabelSettings(apply?: boolean, newTemplate?: string, deleteTemplate?: string, saveTemplate?: boolean) {
    if (saveTemplate && this.currTemplate.TEMPLATE_NAME == 'DefaultTemplate') {
      //FromCloneDeleteSave = true;
      return;
    }
    this.generateLabelExp();
    let keysLabel1 = Object.keys(this.currTemplate.LABEL_1);
    keysLabel1?.forEach(key => {
      this.currTemplate.LABEL_1[key] === undefined ? this.currTemplate.LABEL_1[key] = null : '';
    });
    let keysLabel2 = Object.keys(this.currTemplate.LABEL_2);
    keysLabel2?.forEach(key => {
      this.currTemplate.LABEL_2[key] === undefined ? this.currTemplate.LABEL_2[key] = null : '';
    });

    let template = cloneDeep(this.currTemplate);
    if (newTemplate) {
      template.TEMPLATE_NAME = newTemplate;
      template.IS_SELECTED = false;
      this.rawTemplatesData.push({ ...template });
      this.templatesData.push(template);
    }
    if (deleteTemplate) {
      template.TEMPLATE_NAME = newTemplate;
      let index = this.templatesData.findIndex(x => x.TEMPLATE_NAME === deleteTemplate);
      if (index != -1) {
        this.templatesData.splice(index, 1);
      }
      let index1 = this.rawTemplatesData.findIndex(x => x.TEMPLATE_NAME === deleteTemplate);
      if (index1 != -1) {
        this.rawTemplatesData.splice(index1, 1);
      }
      let tempCurrent=this.templatesData.find(template => template.IS_SELECTED == true);
      if (!tempCurrent) {
        this.templatesData.forEach(temp => temp.TEMPLATE_NAME == 'DefaultTemplate' ? temp.IS_SELECTED = true : '');
        //assigning the value to current templates after deleting
        this.currTemplate = this.templatesData.find(temp => temp.TEMPLATE_NAME == 'DefaultTemplate');
        this.rawTemplatesData.forEach(temp => temp.TEMPLATE_NAME == 'DefaultTemplate' ? temp.IS_SELECTED = true : '');
      }
      else{
        this.currTemplate=tempCurrent;
      }
    }
    this.rawTemplatesData.forEach((temp) => {
      if (apply) {
        temp.IS_SELECTED = false;
      }
      if (temp.TEMPLATE_NAME == template.TEMPLATE_NAME) {
        let keys = Object.keys(template);
        let values = Object.values(template);
        keys.forEach(key => {
          temp[key] = values[keys.indexOf(key)];
        });
        if (apply) {
          temp.IS_SELECTED = true;
        }
      }
      delete temp['labelFiltersSelected'];
      delete temp['labelFiltersAutoComplete'];
    });
    if (this.currTemplate.IS_SELECTED && this.currTemplate.TEMPLATE_NAME !='DefaultTemplate') {
      apply = true;
    }
    let obj = {};
    obj['LABELS'] = this.rawTemplatesData;

    let type = '';
    if (this.gridId == LabelType.POSITION) {
      type = LabelType.POSITION;
    } else if (this.gridId == LabelType.FIXTURE) {
      type = LabelType.FIXTURE;
    }

    this.displaySetting.type = type;
    this.displaySetting.fromCloneDeleteSave = saveTemplate ? LabelEditType.SAVE :
        newTemplate ? LabelEditType.CLONE :
          deleteTemplate ? LabelEditType.DELETE :
          apply?LabelEditType.APPLY: LabelEditType.NONE;
    if (newTemplate) {
      this.currTemplate = template;
    }
    this.emitSelection.emit({ keyName: this.gridId, keyValue: JSON.stringify(obj), apply: apply, isDefault: apply && this.currTemplate.TEMPLATE_NAME == 'DefaultTemplate', displaySetting: this.displaySetting });
    this.resetLabelFilters();
    this.templateChanged();
    this.sharedService.renderPositionAgainEvent.next(true);
  }

  public openDialog(field: string): void {
    let component;
    let height: string = '';
    let width: string = '';
    let minHeight: string = '';
    switch (field) {
      case `Delete`:
        component = SaveTemplateDialog;
        height = '22%';
        width = '32%';
        break;
      case `Save`:
      case `Clone`:
        component = SaveTemplateDialog;
        height = '30%';
        width = '32%';
        break;
      default:
        break;
    }
    let isdirty: boolean = false;
    let tempToClone = cloneDeep(this.currTemplate);
    delete tempToClone['labelFiltersSelected'];
    delete tempToClone['labelFiltersAutoComplete'];
    let selectedTemp = JSON.stringify(tempToClone);
    let rawtemplate = JSON.stringify(this.rawTemplatesData.find(x => x.TEMPLATE_NAME == this.currTemplate.TEMPLATE_NAME));
    if (selectedTemp !== rawtemplate) {
      isdirty = true;
    }
    if (field == 'Clone' && isdirty) {
      this.notifyService.success('TEMPLATE_UNSAVED_CHANGES', 'GOT IT!');
    }
    else {
      tempToClone.IS_SELECTED = false;
      const dialogRef = this.matDialog.open(component, {
        minHeight: minHeight,
        height: height,
        width: width,
        data: { template: tempToClone, templatesData: this.rawTemplatesData, feature: field, dirtyFlag: isdirty },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
          if (result.feature == 'Delete') {
            this.updateLabelSettings(false, '', result.templateName);
          } else if (result.feature == 'Clone' || result.feature == 'Save') {
            this.updateLabelSettings(false, result.templateName);
          }
        }
      });
    }
  }

  public savePostLabelSettings(): void {
    if (this.currTemplate.TEMPLATE_NAME == 'DefaultTemplate') {
      this.openLabelTemplateSave = true;
      let component;
      let height: string;
      let width: string;
      let minHeight: string = '';
      component = SaveTemplateDialog;
      height = '30%';
      width = '35%';
      const dialogRef = this.matDialog.open(component, {
        minHeight: minHeight,
        height: height,
        width: width,
        autoFocus: false,
      });
      dialogRef.afterClosed().subscribe((template) => {
        if (template) {
          this.updateLabelSettings(false, template);
        }
      });
    }
    else {
      this.updateLabelSettings(false, '', '', true);
    }
  }

  public templateChanged(): void {
    this.selectLabelExpression(this.currTemplate['LABEL_1'].LABEL, 1);
    this.selectLabelExpression(this.currTemplate['LABEL_2'].LABEL, 2);
    this.grid1?.gridApi?.deselectAll();
    this.grid2?.gridApi?.deselectAll();
    this.gridConfigData1 = this.gridConfigData('labelSettingsGrid', this.labelFilters as Dictionary[], this.currTemplate.labelFiltersSelected[0]);
    this.gridConfigData2 = this.gridConfigData('labelSettingsGrid', this.labelFilters as Dictionary[], this.currTemplate.labelFiltersSelected[1]);
    setTimeout(() => {
      this.attachTitleBoxesonLoad();
    });
  }

  public applyPosAlignJustifyValidation(): boolean {
    if(this.gridId == LabelType.FIXTURE){
      return;
    }
    if (this.currTemplate.labelFiltersSelected &&
      this.currTemplate.LABEL_1.ENABLED &&
      this.currTemplate.labelFiltersSelected[0].length &&
      this.currTemplate.LABEL_2.ENABLED &&
      this.currTemplate.labelFiltersSelected[1].length) {
      if (
        this.currTemplate.LABEL_1.VERTICAL_ALIGNMENT === this.currTemplate.LABEL_2.VERTICAL_ALIGNMENT &&
        this.currTemplate.LABEL_1.HORIZONTAL_ALIGNMENT === this.currTemplate.LABEL_2.HORIZONTAL_ALIGNMENT
      ) {
        this.sameAlignmentSelected = true;
        return true;
      }
    }
    this.sameAlignmentSelected = false;
    return false;
  }

  public focusInput(): void {
    this.templateInput.nativeElement.value = "";
    this.templateInput.nativeElement.focus();
  }

  public focusChip(event: MatChipInputEvent): void {
    const val = event.value.toLowerCase().trim();
    const chips = this.currTemplate.labelFiltersSelected[this.labelID - 1].filter(field => field.value.toLowerCase().trim() == val);
    if (chips[0]) {
      (document.getElementById('chipLabel' + chips[0].IDDictionary) as HTMLSpanElement).focus();
    }
  }

  public removeLineBreak(event: PointerEvent, dir: string): void {
    let iconID = (event.target as HTMLElement).id;
    let inputID = iconID.replace('removeInput', 'chipInput');
    if (dir == 'S') {
      let nextInput;
      if (document.getElementById(iconID).parentNode.nextSibling.nodeName.toLowerCase() == 'mat-chip') {
        nextInput = document.getElementById(iconID).parentNode.nextSibling.childNodes[1].childNodes[0] as HTMLInputElement;
      }
      else {
        nextInput = document.getElementById(iconID).parentNode.nextSibling.childNodes[0].childNodes[0] as HTMLInputElement;
      }
      nextInput.value = (document.getElementById(inputID) as HTMLInputElement).value + nextInput.value;
      nextInput.style.maxWidth = nextInput.value.length == 0 ? '0.5ch' :
                                 nextInput.value.length < 4?
                                (nextInput.value.length * 1.15) + 'ch':'';
      nextInput.parentElement.setAttribute('data-value', nextInput.value);
      document.getElementById(iconID).parentElement.remove();
    } else {
      let prevInput;
      let prevParent = document.getElementById(iconID).parentNode.previousSibling;
      if (prevParent.lastChild.nodeName.toLowerCase() == '#comment') {
        prevInput = prevParent.lastChild.previousSibling.childNodes[0] as HTMLInputElement;
      } else {
        prevInput = prevParent.lastChild.childNodes[0] as HTMLInputElement;
      }
      prevInput.value = prevInput.value + (document.getElementById(inputID) as HTMLInputElement).value;
      prevInput.style.maxWidth = prevInput.value.length == 0 ? '0.5ch' :
                                 prevInput.value.length < 4?
                                (prevInput.value.length * 1.15) + 'ch':'';
      prevInput.parentElement.setAttribute('data-value', prevInput.value);
      document.getElementById(iconID).parentElement.remove();
    }
    this.generateLabelExp();
  }

  public trimExtraSpaces(event, dir: string) {
    let pastedText = '';
    if (event.clipboardData && event.clipboardData.getData) {
       pastedText = event.clipboardData.getData('text/plain');
    }
    if (pastedText.trim()) {
      let string = event.target.value;
      string = string.substring(0, event.target.selectionStart) + pastedText + string.substring(event.target.selectionEnd);
      event.target.value = dir == 'S' ? string.replace(/\s+/g, ' ').trimStart() : string.replace(/\s+/g, ' ');
      event.target.parentNode.dataset.value = event.target.value;
    }
    return false;
  }

  public inputKeyDown(event, dir: string): void {
    if (event.key == ' ' &&
      ((dir == 'S' && event.currentTarget.selectionStart == 0) ||
        event.currentTarget.value[event.currentTarget.selectionStart] == ' ' ||
        event.currentTarget.value[event.currentTarget.selectionStart - 1] == ' ')) {
      event.stopImmediatePropagation();
      event.preventDefault();
      return;
    }
    if ((event.key.toLowerCase() == 'backspace' && event.target.selectionStart == 0) ||
      (event.key.toLowerCase() == 'delete' && event.target.selectionStart == event.target.value.length)) {
      this.removeTitleLineBreak(event, dir);
    } else {
      this.prevent(event);
    }
  }

  public removeTitleLineBreak(event, dir: string): void {
    try {
      if (event.key.toLowerCase() == 'backspace' && event.target.selectionStart == 0) {
        if (event.target.parentNode.previousSibling && event.target.parentNode.previousSibling.lastChild.nodeName.toLowerCase() == 'br') {
          if (dir == 'S') {
            event.target.value = event.target.parentNode.previousSibling.firstChild.value + event.target.value;
            event.target.style.width = event.target.value.length + 1.6 + 'ch';
            event.target.parentNode.previousSibling.remove();
          }
        }
        if (dir == 'E') {
          if (event.target.previousSibling.nodeName.toLowerCase() == 'br') {
            if (event.target.parentNode.previousSibling.nodeName.toLowerCase() == 'mat-chip') {
              event.target.parentNode.previousSibling.lastChild.previousSibling.value = event.target.parentNode.previousSibling.lastChild.previousSibling.value + event.target.value;
            } else {
              event.target.parentNode.previousSibling.lastChild.value = event.target.parentNode.previousSibling.lastChild.value + event.target.value;
              event.target.parentNode.previousSibling.lastChild.style.width = event.target.parentNode.previousSibling.lastChild.value.length + 1.6 + 'ch';
            }
            event.target.parentNode.remove();
          }
        }
      }
      if (event.key.toLowerCase() == 'delete' && event.target.selectionStart == event.target.value.length) {
        if (event.target.parentNode.nextSibling && event.target.parentNode.lastChild.nodeName.toLowerCase() == 'br') {
          if (dir == 'S') {
            if (event.target.parentNode.nextSibling.nodeName.toLowerCase() == 'mat-chip') {
              event.target.parentNode.nextSibling.children[1].value = event.target.value + event.target.parentNode.nextSibling.children[1].value;
            } else {
              event.target.parentNode.nextSibling.children[0].value = event.target.value + event.target.parentNode.nextSibling.children[0].value;
              event.target.parentNode.nextSibling.children[0].style.width = event.target.parentNode.nextSibling.children[0].value.length + 1.6 + 'ch';
            }
            event.target.parentNode.remove();
          }
        }
        if (dir == 'E') {
          if (event.target.parentNode.nextSibling?.children[1].nodeName.toLowerCase() == 'br') {
            event.target.value = event.target.value + event.target.parentNode.nextSibling.lastChild.value;
            event.target.parentNode.nextSibling.remove();
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
    this.generateLabelExp();
  }

  public updateChipTitle(chipData: {dictID: number, direction: string, labelID: number, currElement: HTMLInputElement, onLoad?: boolean, startTitle?: string, endTitle?: string}): void {
    let label = this.currTemplate.labelFiltersSelected[chipData.labelID - 1].find(x => x.IDDictionary == chipData.dictID);
    let dir = chipData.direction == 'startInputs' ? 'S' : 'E';
    if (!chipData.onLoad) {
      let grandParentNode = chipData.currElement.parentNode.parentNode as HTMLElement;
      let firstPart = chipData.currElement.value.substring(0, chipData.currElement.selectionStart).trim();
      let secondPart = chipData.currElement.value.substring(chipData.currElement.selectionStart).trim();

      if (dir == 'S') {
        let prevSibling = grandParentNode.previousElementSibling;
        if ((!firstPart && (!prevSibling || (prevSibling?.childNodes.length && prevSibling.getElementsByTagName('mat-icon')[0].innerHTML === 'vertical_align_center')))
          || (grandParentNode.tagName == 'SPAN' && !secondPart)) {
          return;
        }
      } else {
        let nextSibling = grandParentNode.nextElementSibling;
        if (grandParentNode.tagName == 'MAT-CHIP') {
          if (!secondPart && nextSibling?.childNodes.length 
            && ((nextSibling.children[0].tagName == 'MAT-ICON' && nextSibling.children[0].innerHTML === 'vertical_align_center')
             || (nextSibling.children[0].tagName == 'LABEL' && !nextSibling.children[0]['dataset']['value']))) {
            return;
          }
        } else if (grandParentNode.tagName == 'SPAN') {
          if ((!firstPart || !secondPart) && nextSibling) {
            return;
          }
        }
      }
    }

    if (label) {
      label[chipData.direction] += 1;
      const id = 'chipInput_' + label[chipData.direction] + dir + '_' + chipData.dictID + '_L' + chipData.labelID;
      let titleBox = document.createElement('input');
      let labelBox = document.createElement('label');
      labelBox.classList.add('resizer');
      titleBox.setAttribute('oninput', 'this.parentNode.dataset.value = this.value');
      titleBox.setAttribute('size', '1');
      titleBox.setAttribute('id', id);
      titleBox.addEventListener('keypress', this.prevent);
      titleBox.addEventListener('keyup', (event) => {
        if (event.key == 'Enter' && this.gridId== this.labelType.POSITION) {
          this.updateChipTitle({dictID:chipData.dictID, direction:chipData.direction, labelID:chipData.labelID,currElement: event.target as HTMLInputElement});
        } else {
          this.prevent(event, true);
        }
      });
      titleBox.addEventListener('keydown', (event) => {
        this.inputKeyDown(event, dir);
      });
      titleBox.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        (event.target as HTMLInputElement).focus();
      });
      titleBox.addEventListener('blur', (event) => {
        this.titleUpdate();
      });
      titleBox.addEventListener('mousedown', (event) => {
        event.stopPropagation();
      });
      let lineBreak = document.createElement('mat-icon');
      lineBreak.setAttribute('id', id.replace('chipInput', 'removeInput'));
      lineBreak.title = 'Remove Line Break';
      lineBreak.innerHTML = 'vertical_align_center';
      lineBreak.className = 'mat-icon material-icons lb';
      lineBreak.addEventListener('click', event => {
        this.removeLineBreak(event as PointerEvent, dir);
      });
      let spanBox = document.createElement('span');
      const breakEl = document.createElement('br');
      let curRow = chipData.currElement.parentNode.parentNode;
      if (!chipData.onLoad) {
        chipData.startTitle = chipData.currElement.value.substring(0, chipData.currElement.selectionStart);
        chipData.endTitle = chipData.currElement.value.substring(chipData.currElement.selectionStart);
      }
      if (dir == 'S') {
        titleBox.value = chipData.startTitle;
        labelBox.setAttribute('data-value', titleBox.value);
        chipData.currElement.value = chipData.endTitle;
        (chipData.currElement.parentNode as HTMLLabelElement).setAttribute('data-value', chipData.currElement.value);
        titleBox.style.maxWidth = titleBox.value.length == 0 ? '0.5ch' :
                                  titleBox.value.length < 4?
                                  (titleBox.value.length * 1.15) + 'ch':'';
        chipData.currElement.style.maxWidth = chipData.currElement.value.length == 0 ? '0.5ch' :
                                              chipData.currElement.value.length < 4 ?
                                              (chipData.currElement.value.length * 1.15) + 'ch' : '';
        labelBox.appendChild(titleBox);
        spanBox.appendChild(labelBox);
        if (this.gridId != LabelType.FIXTURE) {
          spanBox.appendChild(lineBreak);
          spanBox.appendChild(breakEl);
        }
        curRow.parentNode.insertBefore(spanBox, curRow);
      }
      else {
        titleBox.value = chipData.endTitle;
        labelBox.setAttribute('data-value', titleBox.value);
        chipData.currElement.value = chipData.startTitle;
        (chipData.currElement.parentNode as HTMLLabelElement).setAttribute('data-value', chipData.currElement.value);
        titleBox.style.maxWidth = titleBox.value.length == 0 ? '0.5ch' :
                                  titleBox.value.length < 4?
                                  (titleBox.value.length * 1.15) + 'ch':'';
        chipData.currElement.style.maxWidth = chipData.currElement.value.length == 0 ? '0.5ch' :
                                              chipData.currElement.value.length < 4 ?
                                              (chipData.currElement.value.length * 1.15) + 'ch' : '';
        labelBox.appendChild(titleBox);
        if (this.gridId != LabelType.FIXTURE) {
          spanBox.appendChild(lineBreak);
          spanBox.appendChild(breakEl);
        }
        spanBox.appendChild(labelBox);
        if (curRow.nextSibling) {
          curRow.parentNode.insertBefore(spanBox, curRow.nextSibling);
        }
        else {
          curRow.parentNode.appendChild(spanBox);
        }
      }
      this.generateLabelExp();
    }
  }

  private attachTitleBoxesonLoad(): void {
    let chipInputEls = document.querySelectorAll("[id^='chipInput_']");
    chipInputEls.forEach(el => {
      if (el.parentNode.nodeName.toLowerCase() == 'label' && el.parentNode.parentNode.nodeName.toLowerCase() == 'span') {
        el.parentElement.parentElement.remove();
      }
    });
    if (this.gridId == LabelType.POSITION) {
      this.currTemplate.labelFiltersSelected[this.labelID - 1].forEach((label) => {
        let startTitles = label.startTitle.split('\\n');
        label.startTitle = startTitles.pop();
        let prevTitle = label.startTitle;
        startTitles.reverse().forEach(title => {
          const id = 'chipInput_' + label['startInputs'] + 'S_' + label.IDDictionary + '_L' + this.labelID;
          this.updateChipTitle({ dictID: label.IDDictionary, direction: 'startInputs', labelID: this.labelID, currElement: document.getElementById(id) as HTMLInputElement, onLoad: true, startTitle: title, endTitle: prevTitle });
          prevTitle = title;
        });
        let endTitles = label.endTitle.split('\\n');
        label.endTitle = endTitles.shift();
        let prevTitleEnd = label.endTitle;
        endTitles.forEach(title => {
          const id = 'chipInput_' + label['endInputs'] + 'E_' + label.IDDictionary + '_L' + this.labelID;
          this.updateChipTitle({ dictID: label.IDDictionary, direction: 'endInputs', labelID: this.labelID, currElement: document.getElementById(id) as HTMLInputElement, onLoad: true, startTitle: prevTitleEnd, endTitle: title });
          prevTitleEnd = title;
        });
      });
    }
    this.resetLabelBoxSize();
  }

  private attachTitleBoxesonDrop(dictID: number): void {
    let chip = document.getElementById('chip_' + dictID);
    const startTitleID = 'S_' + dictID + '_L' + this.labelID;
    const endTitleID = 'E_' + dictID + '_L' + this.labelID;
    let endTitles = document.querySelectorAll("[id$=" + endTitleID + "]");
    let startTitles = document.querySelectorAll("[id$=" + startTitleID + "]");
    startTitles.forEach(node => {
      if (node.nodeName.toLowerCase() == 'mat-icon') {
        chip.parentNode.insertBefore(node.parentNode, chip);
      }
    });
    endTitles.forEach(node => {
      if (node.nodeName.toLowerCase() == 'mat-icon') {
        if (chip.nextSibling) {
          chip.parentNode.insertBefore(node.parentNode, chip.nextSibling);
        } else {
          chip.parentNode.append(node.parentNode);
        }
      }
    });
  }

  private resetLabelBoxSize(): void {
    let chipInputElsAfter = document.querySelectorAll("[id^='chipInput_']");
    chipInputElsAfter.forEach(el => {
      if (el.parentNode.nodeName.toLowerCase() == 'label' &&
        (el.parentNode as HTMLLabelElement).dataset.value != (el as HTMLInputElement).value) {
        el.parentElement.setAttribute('data-value', (el as HTMLInputElement).value);
      }
    });
  }

  public isAllFixturesReadonly(children: PogSettingParamKey[]) {
    return children.filter(c => this.fixtureKeyNames.includes(c.fieldObj.KeyName)).every(f => f.fieldObj.Readonly);
  }

  public isAllFixturesSelected() {
    return this.fixtureKeyNames.every(keyName => this.currTemplate['LABEL_' + this.labelID][keyName]);
  }

  public updateAllFixtures(event: MatCheckboxChange) {
    this.fixtureKeyNames.forEach(keyName => {
      this.currTemplate['LABEL_' + this.labelID][keyName] = event.checked;
    });
  }
}
