import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AnnotationDirection, AnnotationType, FreeFlowDetails, PanelSplitterViewType, PanelView, ZoomType } from 'src/app/shared/models';
import { SharedService } from '../../shared/shared.service';
import { PlanogramService } from '../planogram.service';
import { Utils } from 'src/app/shared/constants';
import { Annotation, Fixture, Position, Section } from 'src/app/shared/classes';
import { AnnotationSvgRenderService, PanelService, PlanogramCommonService, PlanogramHelperService, PlanogramStoreService} from 'src/app/shared/services';
import { AnnotationDialogComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/annotation';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root'
})
export class AnnotationService {
  public annotationAreaChanged: boolean = false;
  public updateAnnotationConnector: Subject<string> = new Subject();
  public annotationDialogRef: MatDialogRef<AnnotationDialogComponent> = null ;
  public annotationFDialogRef: MatDialogRef<AnnotationDialogComponent> = null ;
  constructor(private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private planogramCommonService: PlanogramCommonService,
    private planogramHelperService: PlanogramHelperService,
    private readonly annotationSvgRender: AnnotationSvgRenderService,
    private readonly dialog: MatDialog,
    private readonly panelService: PanelService,
    private readonly planogramStore: PlanogramStoreService,
    ) {

  }

  public resizePlanogram():void {
    if(this.annotationAreaChanged) {
      this.annotationAreaChanged = false;
      this.sharedService.changeZoomView.next(ZoomType.CENTER_ZOOM);
    }
  }
  public getDimensionsByFont(content, fontDetails, style, sectionID): { width: number, height: number } {
    const sizeFactor = this.planogramService.convertToScale(sectionID) / 8;
    let lines = content?.split('\n');
    let width = 0;
    let italicBold = fontDetails?.italic ? 'italic ' : '' + fontDetails.Font?.weight ? 'bold' : '';
    lines.forEach(line => {
      let widthTemp = Utils.getWidthOfTextByCanvas(line, style.fontfamily, style.fontsize * sizeFactor, italicBold.trim());
      width = widthTemp > width ? widthTemp : width;
    });
    let height = lines.length * style.fontsize * sizeFactor * 1.5;
    return { width: width, height: height };
  }

  public populateAnnotation(details: FreeFlowDetails, sectionID) {

    let annotation = {
      IdPogObjectExtnLocal: Utils.generateGUID(),
      Content: '',
      LkExtensionType: details.LkExtensionType,
      $belongsToID: sectionID,
      status: 'new',
      Attribute: {
        calloutLocation: undefined,
        location: {
          width: 10,
          height: 6,
          locX: null,
          locY: null,
          locZ: null,
          relLocX: null,
          relLocY: null,
          top: null,
          direction: AnnotationDirection.BOTTOM_RIGHT,
        },
        style: { bgcolor: details.style.bgcolor, lncolor: details.style.lncolor, color: '#000000', fontfamily: 'Roboto', fontsize: details.style.fontsize },
        callout: false,
        imgDispType: 'stretch',
        iPointSize: false,
        imgHeight: null,
        imgUrl: null,
        imgWidth: null,
        Font: { weight: 0, italic: 0, underline: 0 }
      },
      $sectionID: sectionID,
    };
    if (details.LkExtensionType == AnnotationType.FREEFLOW_BOX) {
      annotation.Attribute.style.bgcolor = 'transparent';
    }
    else if (details.LkExtensionType == AnnotationType.FREEFLOW_TEXT) {
      annotation.Attribute.style.bgcolor = '#ffffff';
      annotation.Attribute.style.lncolor = '#000000';
      //this.annotation.Content = 'hell';
    }
    if (details.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR) {
      annotation.Attribute.style.bgcolor = 'transparent';
    }
    return annotation;
  }


  public saveAnnotation(annotation): void {
    let section = this.sharedService.getObject(annotation.$sectionID, annotation.$sectionID) as Section;

    let isNewAnnotation = false;
    if (annotation.status == 'new') {
      annotation.status = 'insert';
      isNewAnnotation = true;
      this.addAnnotationFreeFlow(annotation, section);
    }

    section.PogObjectExtension = section.PogObjectExtension.map((element) => {
      // section annotations do not have IDPOGObject
      if (element.IDPOGObject && element.IDPOGObject == annotation.IDPOGObject) {
        return (element = annotation);
      } else {
        return element;
      }
    });

    section.annotations = section.annotations.map((element) => {
      if (element.$id == annotation.$id) {
        return (element = annotation);
      } else {
        return element;
      }
    });

    section.computeAnnotationDimension();
    this.sharedService.updateAnnotationPosition.next(true);
    this.sharedService.saveAnnotationPosition.next(true);
    if (isNewAnnotation) {
      this.sharedService.newAnnotationCreated.next(true);
    }
    this.planogramService.UpdatedSectionObject.next(section);
    this.planogramService.updateNestedStyleDirty = true;;
    //check this part later-----------------------------------------------------------------------------------
    // this.changeDetector.markForCheck();
    // if (this.isPOGReadOnly) {
    //     this.subscriptions.add(
    //         this.planogramService.saveAnnotationforReadonlyPlanogram(this.annotation).subscribe(
    //             (res) => {
    //                 if (this.annotation) this.annotation.status = 'saved';
    //                 this.annotation.status = 'saved';
    //             },
    //             (error) => {
    //                 console.error('Annotation could not be saved.');
    //                 console.error(error);
    //             },
    //         ),
    //     );
    // }
    // this.dialogref.close();
    // this.annotationUpdated = true;
    setTimeout(()=>{
      this.planogramService.triggerAnnotationSelection.next(section.annotations[section.annotations.length-1]);
    })
  }

  private addAnnotationFreeFlow(annotation, section): void {
    let sectionID = section.$sectionID;
    let isPOGReadOnly = false;
    annotation.ObjectDerivedType = 'Annotation'; //AppConstantSpace.ANNOTATION;
    annotation.IDPOG = section.IDPOG;
    // newly added fixture/position will not have an IDPOGObject.
    annotation.IDPOGObject = section.IDPOGObject ? section.IDPOGObject : null;
    annotation.TempId = section.TempId;
    this.planogramCommonService.extend(annotation, false, sectionID);
    annotation.$belongsToID = section.$id;
    section.addAnnotation(annotation, isPOGReadOnly, true);
    section.showAnnotation = this.planogramService.rootFlags[section.$id].isAnnotationView = 1;
  }

  public addAnnotation(annotation: Annotation, section: Section, referenceItem): void {
    const sectionID = section.$id;
        annotation.Attribute.location.width = annotation.Attribute.location.width || 10;
        annotation.Attribute.location.height = annotation.Attribute.location.height || 6;
        this.annotationSvgRender.calculateAnnotationPosition(annotation as Annotation, referenceItem, section);
        annotation.Attribute.style.bgcolor = annotation.Attribute.style.bgcolor || '#fff';
        annotation.Attribute.style.lncolor = annotation.Attribute.style.lncolor || '#f00';
        annotation.Attribute.style.color = annotation.Attribute.style.color || '#000';
        annotation.Attribute.style.fontsize = annotation.Attribute.style.fontsize || 12;
        annotation.ObjectDerivedType = 'Annotation'; //AppConstantSpace.ANNOTATION;
        annotation.IDPOG = section.IDPOG;
        // newly added fixture/position will not have an IDPOGObject.
        annotation.IDPOGObject = referenceItem.IDPOGObject ? referenceItem.IDPOGObject : null;
        annotation.TempId = referenceItem.TempId;
        this.planogramCommonService.extend(annotation, false, sectionID);
        annotation.$belongsToID = referenceItem.$id;
        section.addAnnotation(annotation, this.planogramHelperService.checkIfReadonly(section.IDPOG));
    this.updateAnnotationConnector.next('add');
  }

  public assignAnnotationProperties(sourceAnn, targetAnn) {
    let keys = Object.keys(sourceAnn);
    let values = Object.values(sourceAnn);
    keys.forEach(key => {
      targetAnn[key] = values[keys.indexOf(key)];
    });
    return targetAnn
  }

  public refreshAnnotationDialog(isFreeFlow, refObj, panelID?, close?, refresh?) {
    if (close) {
      this.closeAnnotationDialogs(panelID);
      return;
    }
    const dialogName = !isFreeFlow ? 'annotation-editor-dialog' : 'annotation-freeflow-dialog';
    let isDialogOpen = document.getElementById(dialogName);
    if (isDialogOpen) {
      this.planogramService.updateAnnotationDialog.next({ refObj: refObj as (Position | Fixture | Section), hierarchy: isFreeFlow ? 'freeFlow' : 'section' });
      return;
    };
    const activePanelID = panelID || this.panelService.activePanelID;
    const panelDimensions = document.querySelector('#' + activePanelID + ' #bodyPanel').getBoundingClientRect();
    if(!refresh){
      let dialog = this.dialog.open(AnnotationDialogComponent, {
        width: isFreeFlow ? '400px' : '40%',
        data: { refObj: refObj, hierarchy: isFreeFlow ? 'freeFlow' : 'section' },
        panelClass: ['mat-dialog-move-cursor', 'annotation-dialog'],
        hasBackdrop: false,
        disableClose: false,
        id: dialogName,
        position: { left: panelDimensions.left + 15 + 'px', top: isFreeFlow ? panelDimensions.top + 15 + 'px' : panelDimensions.top + 75 + 'px' },
      });
      isFreeFlow ? this.annotationFDialogRef = dialog : this.annotationDialogRef = dialog;
    }
    return;
  }

  private closeAnnotationDialogs(panelID) {
    let editorDialogDim = document.getElementById('annotation-editor-dialog')?.getBoundingClientRect();
    let freeFlowDialogDim = document.getElementById('annotation-freeflow-dialog')?.getBoundingClientRect();
    let panelBodyDim = document.querySelector('#' + panelID + ' #bodyPanel')?.getBoundingClientRect();
    let close = !panelID ||
                this.planogramStore.splitterViewMode.displayMode == PanelSplitterViewType.Full ||
                this.planogramStore.splitterViewMode.displayMode != PanelSplitterViewType.Full && this.panelService.panelPointer.panelOne.view != PanelView.PLANOGRAM && this.panelService.panelPointer.panelTwo.view != PanelView.PLANOGRAM;
    if (editorDialogDim && (close || (
      editorDialogDim.bottom < panelBodyDim.bottom &&
      editorDialogDim.left >= panelBodyDim.left + 45 &&
      editorDialogDim.top >= panelBodyDim.top + 45 &&
      editorDialogDim.right < panelBodyDim.right))) {
      this.annotationDialogRef.close();
    }
    if (freeFlowDialogDim && (close || (
      freeFlowDialogDim.bottom < panelBodyDim.bottom &&
      freeFlowDialogDim.left >= panelBodyDim.left + 45 &&
      freeFlowDialogDim.top >= panelBodyDim.top + 45 &&
      freeFlowDialogDim.right < panelBodyDim.right))) {
      this.annotationFDialogRef.close();
    }
  }

  public isAnnotationDialogOpen(): boolean {
    return (document.getElementById('annotation-editor-dialog') || document.getElementById('annotation-freeflow-dialog')) ? true : false;
  }

}
