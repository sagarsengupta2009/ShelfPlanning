import { Component, EventEmitter, Input, OnInit, Output, ViewEncapsulation, OnChanges, SimpleChanges, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSelect } from '@angular/material/select';
import { cloneDeep } from 'lodash';
import { Annotation, Fixture, Position, Section } from 'src/app/shared/classes';
import { COLOR_PALETTE } from 'src/app/shared/constants';
import { AnnotationType, PaletteSettings, PanelIds } from 'src/app/shared/models';
import { NotifyService, PanelService, SharedService } from 'src/app/shared/services';
import { AnnotationService } from 'src/app/shared/services/common/planogram/annotation/annotation.service';

@Component({
  selector: 'sp-freeflow-dialog',
  templateUrl: './freeflow-dialog.component.html',
  styleUrls: ['./freeflow-dialog.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class FreeflowDialogComponent implements OnInit {
  public gradientSettings = {
    opacity: false,
  };
  public paletteSettings: PaletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE,
  };
  public fontSizes: number[] = [...Array(17).keys()].map(i => (i + 4)*2);
  public customFont: number = null;
  public isBoxInit: boolean = true;
  public freeFlowType: AnnotationType;
  public isFreeFlow: boolean = true;
  @Input() dummyTrigger: boolean;
  @Input() originalAnnotation: Partial<Annotation>;
  public annotationDialogObj: Partial<Annotation>[];
  @Input() referenceItem: Position | Fixture | Section;
  @Output() editAnnotation = new EventEmitter();
  @ViewChild('fontSelect', { static: false }) fontSelect: MatSelect;
  constructor(
    private readonly sharedService: SharedService,
    private readonly annotationService: AnnotationService,
    private readonly dialog: MatDialogRef<FreeflowDialogComponent>,
    private readonly notifyService: NotifyService,
    private readonly panelService: PanelService
  ) { }

  ngOnInit(): void {
    if (this.originalAnnotation.LkExtensionType == AnnotationType.DUMMY_PLACEHOLDER || (this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_BOX && this.originalAnnotation.status == 'new')) {
      this.originalAnnotation.LkExtensionType = AnnotationType.FREEFLOW_BOX;
      this.originalAnnotation.Attribute.style.lncolor = 'black';
    }
    this.isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_TEXT, AnnotationType.FREEFLOW_CONNECTOR].includes(this.originalAnnotation.LkExtensionType);
    if (this.isFreeFlow) {
      let lineAnn = cloneDeep(this.originalAnnotation);
      this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_TEXT && this.newFontSizePush(this.originalAnnotation?.Attribute.style.fontsize as any);
      if (this.originalAnnotation.status == 'new') {
        lineAnn.Attribute.style.lncolor = 'red';
        this.annotationDialogObj = [null, null, null, null, cloneDeep(this.originalAnnotation), cloneDeep(this.originalAnnotation), lineAnn];
      }
      else {
        this.setupAnnotations();
      }
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.originalAnnotation.LkExtensionType == AnnotationType.DUMMY_PLACEHOLDER || (this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_BOX && this.originalAnnotation.status == 'new')) {
      this.originalAnnotation.LkExtensionType = AnnotationType.FREEFLOW_BOX;
      this.originalAnnotation.Attribute.style.lncolor = 'black';
    }
    this.isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_TEXT, AnnotationType.FREEFLOW_CONNECTOR].includes(this.originalAnnotation.LkExtensionType);
    if (this.isFreeFlow) {
      this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_TEXT && this.newFontSizePush(this.originalAnnotation?.Attribute.style.fontsize as any);
      this.setupAnnotations();
    }
  }

  private setupAnnotations(){
    let boxAnnotation, textAnnotation, lineAnnotation;
    boxAnnotation = this.annotationService.populateAnnotation({ LkExtensionType: AnnotationType.FREEFLOW_BOX, style: { bgcolor: '#fff', lncolor: '#f00', color: '#000', fontfamily: 'Roboto', fontsize: 16 } }, this.referenceItem.$sectionID);
    boxAnnotation.Attribute.style.lncolor = 'black';
    textAnnotation = this.annotationService.populateAnnotation({ LkExtensionType: AnnotationType.FREEFLOW_TEXT, style: { bgcolor: '#fff', lncolor: '#f00', color: '#000', fontfamily: 'Roboto', fontsize: 16 } }, this.referenceItem.$sectionID);
    lineAnnotation = this.annotationService.populateAnnotation({ LkExtensionType: AnnotationType.FREEFLOW_CONNECTOR, style: { bgcolor: '#fff', lncolor: '#f00', color: '#000', fontfamily: 'Roboto', fontsize: 16 } }, this.referenceItem.$sectionID);
    this.freeFlowType = this.originalAnnotation.LkExtensionType;
    this.annotationDialogObj = [null, null, null, null,
      this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_BOX ? cloneDeep(this.originalAnnotation) : boxAnnotation,
      this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_TEXT ? cloneDeep(this.originalAnnotation) : textAnnotation,
      this.originalAnnotation.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR ? cloneDeep(this.originalAnnotation) : lineAnnotation];
  }

  public buttonClick(eventName, type: AnnotationType, event?) {
    if(eventName!='save'){
      this.freeFlowType = type;
    }
    if (eventName == 'save') {
      this.populateAnnotation(type);
      if(this.annotationDialogObj[type].status != 'new'){
        this.notifyService.warn('CLICK_OUTSIDE_TO_ADD_A_NEW_ANNOTATION');
        return;
      }
      const activePanelID = this.panelService.activePanelID == 'panelOne' ? PanelIds.One : PanelIds.Two;
      this.sharedService.freeFlowOn.panelOne = this.sharedService.freeFlowOn.panelTwo = false;
      this.sharedService.freeFlowOn[activePanelID] = true;
      this.sharedService.freeFlowDetails = {LkExtensionType: type, style: this.annotationDialogObj[type].Attribute.style, font: this.annotationDialogObj[type].Attribute.Font, activePanelID: activePanelID};
      const elem = document.querySelector('#' +
      activePanelID +
                ' #bodyPanel',
            ) as HTMLElement;
      setTimeout(() => {
        if (type == AnnotationType.FREEFLOW_TEXT) {
          elem.style.cursor = 'text';
        } else {
          elem.classList.add('freeFlowCursor')
        }
      });
    } else if (eventName == 'delete' || (this.annotationDialogObj[type].status != 'new' && eventName != 'save')) {
      let annotation = eventName == 'delete' ? this.originalAnnotation : this.annotationDialogObj[type];
      if ((eventName == 'lncolor' && this.freeFlowType == AnnotationType.FREEFLOW_BOX ||
        eventName == 'bgcolor' && this.freeFlowType == AnnotationType.FREEFLOW_TEXT
      )) {
        setTimeout(() => {
          this.editAnnotation.emit({ 'action': 'save', 'annotation': annotation });
        })
      } else {
        this.editAnnotation.emit({ 'action': eventName == 'delete' ? eventName : 'save', 'annotation': annotation });
      }
    }
  }
  private populateAnnotation(type: AnnotationType) {
    if (this.annotationDialogObj[type].status != 'new') return;
    this.annotationDialogObj[type] = this.annotationService.populateAnnotation({LkExtensionType: type, style: this.annotationDialogObj[type].Attribute.style}, this.referenceItem.$sectionID);
  }

  public newFontSizePush(newFontSizeS: number, event?): void {
    let newFontSize: number = newFontSizeS as any;
    if (newFontSize && ((event?.key.toLowerCase() == 'enter') || !event)) {
      if (event && (newFontSize < 8 || newFontSize > 80)) {
        this.customFont = null;
        return;
      }
      const index = this.fontSizes.findIndex((item) => item == (newFontSize));
      if (index < 0) {
        this.fontSizes.push(newFontSize);
      }
      if (this.annotationDialogObj && this.annotationDialogObj[AnnotationType.FREEFLOW_TEXT]) {
        this.annotationDialogObj[AnnotationType.FREEFLOW_TEXT].Attribute.style.fontsize = newFontSizeS;
        if (event) {
          let annotation = this.annotationDialogObj[AnnotationType.FREEFLOW_TEXT];
          this.editAnnotation.emit({ 'action': 'save', 'annotation': annotation });
        }
      }
      if (event) {
        this.fontSelect.close();
      }
    }
  }

}
