import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MoveService, PanelBodyService, PanelService, PlanogramHelperService } from 'src/app/shared/services';
import { DragOrigins, IDragDrop } from 'src/app/shared/drag-drop.module';
import { AnnotationDirection, AnnotationType, ZoomType } from 'src/app/shared/models';
import { HistoryService } from 'src/app/shared/services';
import { PlanogramService } from 'src/app/shared/services';
import { SharedService } from 'src/app/shared/services';
import { Annotation, Fixture, Position, Section } from 'src/app/shared/classes';
import { ObjectListItem } from 'src/app/shared/services/common/shared/shared.service';
import { AnnotationService } from 'src/app/shared/services/common/planogram/annotation/annotation.service';

/** Annotation cannot have on push untill the approch is the same for all the other pog components. */
@Component({
  selector: 'sp-annotation',
  templateUrl: './annotation.component.html',
  styleUrls: ['./annotation.component.scss'],
})
export class AnnotationComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() panelID: string;
  @Input() data: Annotation;
  @Input() section: Section;
  @ViewChild('annotationsEle', { static: true }) annotationsEle: ElementRef;
  public view: boolean = true;
  public ContentList: string[];
  public imgUrl: string;
  public imgStyle: Object;
  public divStyle: Object;
  public isAnnotationSelected: boolean = false;
  public grabber: boolean = false;
  private updateAnnotationFlag: boolean = true;
  private newAnnotationCreatedFlag: boolean = false;
  private _subscriptions = new Subscription();
  private scaleFactor: number = 1;
  @ViewChild('annotationText', { static: false }) annotationText: ElementRef<HTMLTextAreaElement>;
  private freeFlowTextBefore: { width: number, height: number, Content: string } = {width: 0, height: 0, Content: ''};
  constructor(
    private readonly planogramService: PlanogramService,
    private readonly sharedService: SharedService,
    private readonly panelBodyService: PanelBodyService,
    private readonly zone: NgZone,
    private readonly cd: ChangeDetectorRef,
    private readonly historyService: HistoryService,
    private readonly planogramHelperService: PlanogramHelperService,
    private readonly move: MoveService,
    private readonly annotationService: AnnotationService,
    private readonly panelService: PanelService,
  ) { }

  ngOnInit(): void {

    this._subscriptions.add(this.move.onAnnotationResize.subscribe((state: { x, y, id, movementX, movementY }) => {
      if (this.data.$id === state.id) {
        if (state.x != null) {
          this.doResize(state.x, state.y, state.movementX, state.movementY);
        }
        else {
          this.recordResize([AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_CONNECTOR, AnnotationType.FREEFLOW_TEXT].includes(this.data.LkExtensionType));
        }
      }

    }));
    this._subscriptions.add(
      this.panelBodyService.annotationUndoRedo.subscribe((result: Annotation) => {
        if (result) {
          if (this.data.IdPogObjectExtn === result.IdPogObjectExtn || (this.data.IdPogObjectExtnLocal && this.data.IdPogObjectExtnLocal === result.IdPogObjectExtnLocal)) {
            this.data = result;
            // update the value in object list(Reason: after doing undo-redo, annotation is not droppable as value is not updated)
            this.sharedService.objectList[this.section.$id][this.data.$id] = this.data as any;

            // update the value in section object as undo redo is not reflected if pog switch
            this.section.annotations = this.section.annotations.map((element) => {
              if (this.data.IdPogObjectExtn === element.IdPogObjectExtn || (this.data.IdPogObjectExtnLocal && this.data.IdPogObjectExtnLocal === element.IdPogObjectExtnLocal)) {
                return (element = this.data);
              } else {
                return element;
              }
            });

            this.planogramService.UpdatedSectionObject.next(this.section);
          }
        }
      }),
    );

    //TODO : updateAnnotationPosition and updateValueInPlanogram subscriptiptions are performing same operation Need to remove one of them Checking dependency
    this._subscriptions.add(
      this.sharedService.updateAnnotationPosition.subscribe((res: boolean) => {
        if (res) {
          this.link();
          if(this.data.$belongsToID != this.data.$sectionID)
            this.annotationService.updateAnnotationConnector.next(this.data.$belongsToID);
        }
      }),
    );

    this._subscriptions.add(
      this.sharedService.saveAnnotationPosition.subscribe((res: boolean) => {
        if (res) {
          this.updateAnnotationFlag = false;
        }
      }),
    );

    this._subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe((res: Object) => {
        if (res) {
          this.link();
          if(this.data.$belongsToID != this.data.$sectionID)
            this.annotationService.updateAnnotationConnector.next(this.data.$belongsToID);
          this.cd.detectChanges();
        }
      }),
    );

    this._subscriptions.add(
      this.sharedService.newAnnotationCreated.subscribe((res: boolean) => {
        if (res) {
          this.newAnnotationCreatedFlag = true;
        }
      }),
    );

    this._subscriptions.add(
      this.planogramService.updateAnnotationSelection.subscribe((res: boolean) => {
        this.checkIfSelected(this.data);
        this.cd.markForCheck();
      }),
    );

    this._subscriptions.add(
      this.planogramService.triggerAnnotationSelection.subscribe((ann: Annotation) => {
        if(ann){
          this.addToselction(ann);
          if(ann.LkExtensionType == AnnotationType.FREEFLOW_TEXT){
            this.annotationText?.nativeElement?.focus();
          }
        }
      }),
    );
    this.link();
  }

  public recordBeforeTextChange(event){
    this.freeFlowTextBefore.Content = this.data.Content;
  }
  public recordResize(freeFlow?, textChange?): void {
    const nHeight = this.move.initialState.y;
    const nWidth = this.move.initialState.x;
    const h = this.planogramService.convertToUnit(nHeight, this.section.$id);
    const w = this.planogramService.convertToUnit(nWidth, this.section.$id);
    if (h != this.data.Attribute.location.height || w != this.data.Attribute.location.width || (this.data.Content!=this.freeFlowTextBefore.Content && this.data.LkExtensionType == AnnotationType.FREEFLOW_TEXT)) {
      if (!freeFlow) {
        this.annotationService.annotationAreaChanged = this.section.computeAnnotationDimension();
        //this.callDoResize();
        this.sharedService.updateAnnotationPosition.next(true);
      }
      this.planogramService.rootFlags[this.section.$sectionID].isSaveDirtyFlag = true;
      this.planogramService.updateSaveDirtyFlag(
        this.planogramService.rootFlags[this.section.$sectionID].isSaveDirtyFlag,
      );
      let unqHistoryID = this.historyService.startRecording();
      let revert = ((annotation, height, width, section, content, textChange, locX, locY) => {
        return () => {
          if (textChange) {
            annotation.Content = content;
          } else {
              annotation.Attribute.location.locX = annotation.Attribute.location.relLocX = locX;
              annotation.Attribute.location.locY = annotation.Attribute.location.relLocY = locY;
            annotation.Attribute.location.width = width;
            annotation.Attribute.location.height = height;
          }
          section.computeAnnotationDimension();
        };
      })(this.data, h, w, this.section, this.freeFlowTextBefore.Content, textChange, this.move.initialState.locX, this.move.initialState.locY);
      let original = ((annotation, height, width, section, content, textChange, locX, locY) => {
        return () => {
          if (textChange) {
            annotation.Content = content;
          } else {
              annotation.Attribute.location.locX = annotation.Attribute.location.relLocX = locX;
              annotation.Attribute.location.locY = annotation.Attribute.location.relLocY = locY;
            annotation.Attribute.location.width = width;
            annotation.Attribute.location.height = height;
          }
          section.computeAnnotationDimension();
        };
      })(
        this.data,
        this.data.Attribute.location.height,
        this.data.Attribute.location.width,
        this.section,
        this.data.Content,
        textChange,
        this.data.Attribute.location.locX,
        this.data.Attribute.location.locY,
      );
      this.historyService.captureActionExec({
        funoriginal: original,
        funRevert: revert,
        funName: 'ResizeAnnotation',
      });
      this.historyService.stopRecording(undefined, undefined, unqHistoryID);
      const isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_CONNECTOR, AnnotationType.FREEFLOW_TEXT].includes(this.data.LkExtensionType);
      const annotationID =  (this.data.IdPogObjectExtn || this.data.IdPogObjectExtnLocal).toString() ;
      this.planogramService.updateAnnotationDialog.next({refObj: this.section as  (Position | Fixture | Section), hierarchy: isFreeFlow?'freeFlow': 'section', annotationID: annotationID });
      this.annotationService.resizePlanogram();
    }
  }

  public callDoResize() {
    if ([AnnotationType.FREEFLOW_TEXT, AnnotationType.TEXT_ANNOTATION].includes(this.data.LkExtensionType)) {
      let dim = this.annotationService.getDimensionsByFont(this.data.Content, this.data.Attribute.Font, this.data.Attribute.style, this.data.$sectionID);
      this.annotationsEle.nativeElement.style.width = dim.width + 'px';
      this.annotationsEle.nativeElement.style.height = dim.height + 'px';
      this.data.Attribute.location.width = this.planogramService.convertToUnit(dim.width, this.data.$sectionID);
      this.data.Attribute.location.height = this.planogramService.convertToUnit(dim.height, this.data.$sectionID);
    }
  }



  private doResize(rawWidth: number, rawHeight: number, movementX, movementY): void {
    this.zone.run(() => {
      const width = Math.abs(rawWidth);
      const height = Math.abs(rawHeight);
      this.annotationsEle.nativeElement.style.width = width;
      this.annotationsEle.nativeElement.style.height = height;
      this.updateAnnotationFlag = true;
      if (this.planogramHelperService.checkIfReadonly(this.section.IDPOG)) {
        return;
      }

      // !this.newAnnotationCreatedFlag: added this condition as undo redo is not working, because resize annotation added in history stack
      if (!this.newAnnotationCreatedFlag) {
        if (this.updateAnnotationFlag) {
          const widthUnits = this.planogramService.convertToUnit(width, this.section.$id);
          const heightUnits = this.planogramService.convertToUnit(height, this.section.$id);
          // if (width <= 10) {
          //   switch (this.data.Attribute.location.direction) {
          //     case AnnotationDirection.TOP_LEFT:
          //       if (movementX > 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.TOP_RIGHT;
          //       }
          //       break;
          //     case AnnotationDirection.TOP_RIGHT:
          //       if (movementX < 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.TOP_LEFT;
          //       }
          //       break;
          //     case AnnotationDirection.BOTTOM_LEFT:
          //       if (movementX > 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_RIGHT;
          //       }
          //       break;
          //     case AnnotationDirection.BOTTOM_RIGHT:
          //     default:
          //       if (movementX < 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_LEFT;
          //       }
          //       break;
          //   }
          // }
          // if (height <= 10) {
          //   switch (this.data.Attribute.location.direction) {
          //     case AnnotationDirection.TOP_LEFT:
          //       if (movementY > 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_LEFT;
          //       }
          //       break;
          //     case AnnotationDirection.BOTTOM_LEFT:
          //       if (movementY < 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.TOP_LEFT;
          //       }
          //       break;
          //     case AnnotationDirection.TOP_RIGHT:
          //       if (movementY > 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_RIGHT;
          //       }
          //       break;
          //     case AnnotationDirection.BOTTOM_RIGHT:
          //     default:
          //       if (movementY < 0) {
          //         this.data.Attribute.location.direction = AnnotationDirection.TOP_RIGHT;
          //       }
          //       break;
          //   }
          // }
          // if (width >= 10 && height >= 10) {
          //   if (rawWidth < 0 && rawHeight < 0) {
          //     this.data.Attribute.location.direction = AnnotationDirection.TOP_LEFT;
          //   } else if (rawWidth > 0 && rawHeight < 0) {
          //     this.data.Attribute.location.direction = AnnotationDirection.TOP_RIGHT;
          //   } else if (rawWidth > 0 && rawHeight > 0) {
          //     this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_RIGHT;
          //   } else if (rawWidth < 0 && rawHeight > 0) {
          //     this.data.Attribute.location.direction = AnnotationDirection.BOTTOM_LEFT;
          //   }
          // }
          if (this.data.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR) {
            if ((width >= 10 && height >= 10) && ((this.data.Attribute.location.direction == AnnotationDirection.TOP_LEFT && rawHeight < 0 && rawWidth < 0) ||
              (this.data.Attribute.location.direction == AnnotationDirection.TOP_RIGHT && rawHeight < 0 && rawWidth > 0) ||
              ((this.data.Attribute.location.direction == AnnotationDirection.BOTTOM_RIGHT || !this.data.Attribute.location.direction) && rawHeight > 0 && rawWidth > 0) ||
              (this.data.Attribute.location.direction == AnnotationDirection.BOTTOM_LEFT && rawHeight > 0 && rawWidth < 0))
            ) {
              if ([AnnotationDirection.TOP_RIGHT, AnnotationDirection.TOP_LEFT].includes(this.data.Attribute.location.direction)) {
                const offset = heightUnits - this.data.Attribute.location.height;
                this.annotationsEle.nativeElement.style.top = (parseFloat(this.annotationsEle.nativeElement.style.top) - this.planogramService.convertToPixel(offset, this.section.$id)) + 'px';
              }
              if (!this.data.Attribute.location.direction || [AnnotationDirection.BOTTOM_RIGHT, AnnotationDirection.BOTTOM_LEFT].includes(this.data.Attribute.location.direction)) {
                const offset = heightUnits - this.data.Attribute.location.height;
                this.data.Attribute.location.locY = this.data.Attribute.location.locY - offset;
                this.data.Attribute.location.relLocY = this.data.Attribute.location.locY;
              }
              if ([AnnotationDirection.BOTTOM_LEFT, AnnotationDirection.TOP_LEFT].includes(this.data.Attribute.location.direction)) {
                const offset = widthUnits - this.data.Attribute.location.width;
                this.data.Attribute.location.locX = this.data.Attribute.location.locX - offset;
                this.data.Attribute.location.relLocX = this.data.Attribute.location.locX;
                this.annotationsEle.nativeElement.style.left = (parseFloat(this.annotationsEle.nativeElement.style.left) - this.planogramService.convertToPixel(offset, this.section.$id)) + 'px';
              }
              this.data.Attribute.location.width = widthUnits;
              this.data.Attribute.location.height = heightUnits;
              this.annotationsEle.nativeElement.style.width = this.planogramService.convertToPixel(this.data.Attribute.location.width, this.section.$id) + 'px';
              this.annotationsEle.nativeElement.style.height = this.planogramService.convertToPixel(this.data.Attribute.location.height, this.section.$id) + 'px';
            }
          }
          else {
            const offset = heightUnits - this.data.Attribute.location.height;
            this.data.Attribute.location.locY = this.data.Attribute.location.locY - offset;
            this.data.Attribute.location.relLocY = this.data.Attribute.location.locY;
            this.data.Attribute.location.width = widthUnits;
            this.data.Attribute.location.height = heightUnits;
            this.annotationsEle.nativeElement.style.width = this.planogramService.convertToPixel(this.data.Attribute.location.width, this.section.$id) + 'px';
            this.annotationsEle.nativeElement.style.height = this.planogramService.convertToPixel(this.data.Attribute.location.height, this.section.$id) + 'px';
          }

          //if ([AnnotationType.TEXT_ANNOTATION].includes(this.data.LkExtensionType)) {
          const sizeFactor = this.planogramService.convertToScale(this.section.$id) / 8;
          let lines = this.data.Content?.split('\n');
          let fontsizeTemp = this.planogramService.convertToPixel(this.data.Attribute.location.height, this.section.$id) / (sizeFactor * 1.5 * lines.length);
          //this.data.Attribute.style.fontsize = fontsizeTemp.toFixed(2) as any;
          //this.annotationsEle.nativeElement.style['font-size'] =  (this.data.Attribute.style.fontsize * sizeFactor)  + 'px';

          // }
        }
        this.imgStyle = this.styleImageObj('img');
        this.divStyle = this.styleImageObj('div');
        this.cd.markForCheck();
        //     this.observer.unobserve(this.annotationsEle.nativeElement); // Detaching the observer here for undo redo
      } else {
        this.newAnnotationCreatedFlag = false;
      }
    });
  }

  ngAfterViewInit(): void {
    this.imgStyle = this.styleImageObj('img');
    this.divStyle = this.styleImageObj('div');
    this.sharedService.sectionStyleSub.next(true);
  }

  public getDragDropData(itemData: IDragDrop): IDragDrop {
    // This method is used to remove all additional properties and make the obj light weight
    return {
      $id: itemData.$id,
      ObjectDerivedType: itemData.ObjectDerivedType,
      $sectionID: itemData.$sectionID,
      dragOriginatedFrom: DragOrigins.Planogram,
      dragDropSettings: itemData.dragDropSettings,
    };
  }

  private positionAnnotation(ele: HTMLDivElement): void {
    const sectionId = this.section.$id;
    const topFromTy = this.section.getAnnotationDimensionTop() - (this.data.top() - this.section.Dimension.Height);
    if (isNaN(topFromTy)) {
      //added due to In JS, top() throwing exception so we have removed annotation from this step
      const wrapper = document.querySelector('.removeWrapperAnnotation_' + this.data.$belongsToID);
      if (wrapper != null) {
        const a = wrapper.parentElement;
        a.removeChild(wrapper);
      }
      return;
    }
    const leftFromLy = this.section.getAnnotationDimensionLeft() + this.data.left();
    const style = {};
    ele.style.top = this.planogramService.convertToPixel(topFromTy, sectionId) + 'px';
    ele.style.left = this.planogramService.convertToPixel(leftFromLy, sectionId) + 'px';
    ele.style.width =  this.planogramService.convertToPixel(this.data.Attribute.location.width, sectionId) + 'px';
    ele.style.height = this.planogramService.convertToPixel(this.data.Attribute.location.height, sectionId) + 'px';
    ele.style.color = this.data.Attribute.style.color;
    ele.style['background-color'] = this.data.Attribute.style.bgcolor;
    ele.style['border-color'] = this.data.Attribute.style.lncolor;
    ele.style.fontStyle = this.data.Attribute.Font?.italic ?'italic':'normal';
    ele.style.fontWeight = this.data.Attribute.Font?.weight ?'bold':'normal';
    ele.style['text-decoration'] = this.data.Attribute.Font?.underline ?'underline':'none';
    const scale = this.planogramService.convertToScale(sectionId);

    ele.style['font-size'] = (this.data.Attribute.style.fontsize * scale) / 8 + 'px';
    ele.style['font-family'] = this.data.Attribute.style.fontfamily;

    if (this.data.LkExtensionType === AnnotationType.IMAGE_POP) {
      ele.style['border-style'] = 'outset';
      ele.style['border-color'] = '#ccc';
    }
  }

  private updateSectionPanel(sectionID: string): void {
    if (this.panelID != this.panelService.activePanelID) {
      this.panelService.updatePanel(this.panelID, sectionID);
      this.planogramService.setSelectedIDPOGPanelID(this.panelID);
    }
    if(!this.section){
      this.section = this.sharedService.getObject(sectionID, sectionID) as Section;
    }
  }

  public selectAnnotation(obj: Annotation, event: MouseEvent): void {
    this.updateSectionPanel(obj.$sectionID);
    this.planogramService.setSelectedAnnotation(obj.$sectionID, obj);
    const refObj = this.sharedService.getObject(obj.$belongsToID, this.section.$id);
    if (!refObj) return;
    const isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_CONNECTOR, AnnotationType.FREEFLOW_TEXT].includes(obj.LkExtensionType);
    event.stopPropagation();
    this.annotationService.refreshAnnotationDialog(isFreeFlow, refObj, this.panelID);
  }

  public addToselction(obj: Annotation, event?, focus?): boolean {
    if (obj) {
      this.updateAnnotationFlag = true;
      const sectionID = this.sharedService.getActiveSectionId();
      obj.$sectionID === sectionID
        ? ''
        : (this.section = this.sharedService.getObject(obj.$sectionID, obj.$sectionID) as Section) &&
        this.sharedService.setActiveSectionId(obj.$sectionID);
      if (event?.ctrlKey) {
        if (obj.selected) {
          this.planogramService.removeSelectedAnnotation(obj.$sectionID, obj);
          this.checkIfSelected(obj);
          this.cd.markForCheck();
          event.preventDefault();
          event.stopPropagation();
          return true;
        }
      } else {
        // remove annotation if selected
        this.planogramService.removeSelectedAnnotation(obj.$sectionID);
        this.planogramService.updateAnnotationSelection.next(true);
      }
    }
    if(obj.LkExtensionType == AnnotationType.FREEFLOW_TEXT && !focus){
      this.annotationText?.nativeElement?.blur();
    }
    this.planogramService.setSelectedAnnotation(obj.$sectionID, obj);

    //Check and detect the changes of annotation selection with single click and cntrl click
    this.checkIfSelected(obj);
    this.cd.markForCheck();

   event && event.stopPropagation();
  }

  private checkIfSelected(annotation: Annotation): void {
    if (annotation.selected) this.isAnnotationSelected = true;
    else this.isAnnotationSelected = false;
  }
  splitLines(content: string): Array<string> {
    const lines = content.split(/[\r]+/);
    return lines;
  }

  private showOrHide(): boolean {
    if (this.data.status === 'deleted') {
      const wrapper = document.querySelector('.removeWrapperAnnotation_' + this.data.$belongsToID);
      if (wrapper != null) {
        (<HTMLElement>wrapper).style.display === 'none';
      }
      this.view = true;
      return false;
    }

    if ([AnnotationType.TEXT_ANNOTATION, AnnotationType.FREEFLOW_TEXT].includes(this.data.LkExtensionType) && this.section.showAnnotation === 3) {
      this.view = true;
      return false;
    }

    if ([AnnotationType.IMAGE_POP, AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_CONNECTOR].includes(this.data.LkExtensionType) && this.section.showAnnotation === 2) {
      this.view = true;
      return false;
    }
    this.view = false;
    return true;
  }

  private styleImageObj(elemType: string): Object {
    if (elemType === 'div') {
      if (this.data.Attribute.imgDispType === 'tile' && this.data.LkExtensionType === AnnotationType.IMAGE_POP) {
        const obj = { 'background-image': "url('" + this.data.Attribute.imgUrl + "')" }; //= { "background-image": "url('" + kendo.htmlEncode(this.data.Attribute.imgUrl) + "')" }
        return obj;
      } else {
        return {};
      }
    } else if (elemType === 'img') {
      if (this.data.Attribute.imgDispType === 'tile') {
        return { display: 'none' };
      } else {
        const sectionId = this.section.$id;
        const width =
          this.planogramService.convertToPixel(this.data.Attribute.location.width, sectionId) + 'px';
        const height =
          this.planogramService.convertToPixel(this.data.Attribute.location.height, sectionId) + 'px';
        return { height: height, width: width };
      }
    }
  }

  private link(): void {
    if (this.showOrHide()) {
      this.scaleFactor = this.planogramService.rootFlags[this.section.$id].scaleFactor;
      if (this.section.showAnnotation) {
        this.view = false;
        const ele = this.annotationsEle.nativeElement; // document.getElementsByClassName('annotationcontainer')[0];
        this.positionAnnotation(ele);
      } else {
        this.view = true;
      }
    } else {
      this.view = true;
    }
    this.imgStyle = this.styleImageObj('img');
    this.divStyle = this.styleImageObj('div');
    this.ContentList = this.splitLines(this.data.Content);
    this.imgUrl = this.data.Attribute.imgUrl;
    this.sharedService.sectionStyleSub.next(true);
    this.cd.markForCheck();
  }

  public centerTxt(data: Annotation) {
    return data.Attribute.iPointSize;
  }

  public truncateByHeight(data: Annotation) {
    return !data.Attribute.iPointSize;
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
    //this.observer.unobserve(this.annotationsEle.nativeElement);
  }

  public onResizerDown(event: MouseEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    event.stopPropagation();
    const width = parseFloat(this.annotationsEle.nativeElement.style.width);
    const height = parseFloat(this.annotationsEle.nativeElement.style.height);
    this.scaleFactor = this.planogramService.rootFlags[this.data.$sectionID].scaleFactor;
    this.move.isResizing = true;
    this.move.isDown = true;
    this.move.initialPosition.x = event.clientX + width*this.scaleFactor *([1,4].includes(this.data.Attribute.location.direction)?1:-1);
    this.move.initialPosition.y = event.clientY + height*this.scaleFactor *([1,2].includes(this.data.Attribute.location.direction)?1:-1);;
    this.move.initialState = {
      x: width,
      y: height,
      id: this.data.$id,
      scale: this.scaleFactor,
      locX: this.data.Attribute.location.locX,
      locY: this.data.Attribute.location.locY
    };
  }

  public getLineLength(): string {
    this.scaleFactor = this.planogramService.rootFlags[this.data.$sectionID].scaleFactor;
    const width = parseFloat(this.annotationsEle.nativeElement.style.width);
    const height = parseFloat(this.annotationsEle.nativeElement.style.height);
    const lineLength = Math.sqrt(Math.pow(width * this.scaleFactor, 2) + Math.pow(height * this.scaleFactor, 2));
    return (5*this.scaleFactor) + ' ' + (lineLength - (5*this.scaleFactor));
  }
}
