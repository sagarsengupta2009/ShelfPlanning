import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Position, Section, StandardShelf } from '../../classes';
import { AppConstantSpace } from '../../constants';
import { DragDropEventsService } from '../../drag-drop.module';
import {
  DragOrigins,
  IBeginDragEventArgs, ICanDropEventArgs,
  IDragDropData, IDropEventArgs, IEndDragEventArgs, ITargetInfo
} from '../../drag-drop.module/models';
import { DisplayMode, PanelIds, QuardTreeBound } from '../../models';
import { PlanogramService, PogDragDropService, SharedService, SpinnerService } from '../common';
import { CrunchMode, IntersectionChooserHandlerService, PanelService, ShoppingCartService } from '../layouts';
import { Render2dService } from '../render-2d/render-2d.service';
import { CommonSvgRenderService } from 'src/app/shared/services';
import { Context } from '../../classes/context';

@Injectable({
  providedIn: 'root'
})
export class MoveService {

  public dropTargets: ITargetInfo[] = [];
  public hoverTargets: ITargetInfo[] = [];
  public scale: number = 1;
  public isResizing: boolean;
  public initialState: { x: number; y: number, id: string, scale: number, locX?: number, locY?: number };

  public isDown = false;
  public isDragging = false;

  /** first selected object, assigned on mouse down and move (start drag) */
  private selected: IDragDropData;

  /** capture the initiall offset from mouse to the selected object
   * so dragging happens from the same point within that object */
  private selectedOffset = { x: 0, y: 0, height: 0 };
  private selectedOffsetCoffinCase = { x: 0, y: 0, height: 0 };

  // This is to accomodate the Shelf label.
  private labelHeightOffset = 0;

  /** when drag starts, this is the initial position of the mouse */
  public initialPosition = { x: 0, y: 0 };

  /** mouse position as reported by mousemove event, which triggers many times per frame */
  private mousePosition = { x: 0, y: 0 };

  public mouseMoveEvent: MouseEvent;

  public onAnnotationResize = new Subject();
  previewRect: DOMRect;

  constructor(
    private readonly pogDragDropService: PogDragDropService,
    private readonly dragDropEventsService: DragDropEventsService,
    private readonly render2d: Render2dService,
    private readonly shared: SharedService,
    private readonly intersectionChooserHandlerService: IntersectionChooserHandlerService,
    private readonly panelService: PanelService,
    private readonly planogramService: PlanogramService,
    private readonly cartService: ShoppingCartService,
    private readonly commonSvgRenderService: CommonSvgRenderService,
    private readonly spinner: SpinnerService
  ) {
    (window as any).move = this;
    window.addEventListener('mouseup', ev => {
      //indicates end of resize
      if (this.isResizing) {
        this.onAnnotationResize.next({ x: null, y: null, id: this.initialState.id });
      }
      this.isResizing = false;
      this.isDown = false;
      if (this.isDragging) {

        let delayTime = 0;
        if (this.pogDragDropService.multiDragableElementsList.length > 10) {
          this.spinner.show();
          delayTime = 300;
        }

        // Added timeout to show loader
        setTimeout(() => {
          this.previewRect = document.querySelector('#preview-image svg')?.getBoundingClientRect();

          this.isDragging = false;
          // stop drag
          const args = this.formEndDragEventArgs();
          this.dragDropEventsService.endDrag.publish(args);
          this.pogDragDropService.endDrag();

          this.onDrop();

          this.removeIsDraggingClass();
          this.spinner.hide();
        }, delayTime);

      }
    });


    (window as any).mousemove.push(ev => {
      if(this.shared.freeFlowOn.panelOne || this.shared.freeFlowOn.panelTwo) return;
      this.mouseMoveEvent = ev;
      this.pogDragDropService.hover(this.hoverTargets, this.isDragging);
    });

    this.render2d.onUpdate.subscribe(dt => this.update(dt));
  }

  mouseDownEvent: MouseEvent;
  /** pog objects mousedown handler */
  onMouseDown(data: IDragDropData, event: MouseEvent) {
    this.labelHeightOffset = 0;
    if (data.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ && data.dragOriginatedFrom !== DragOrigins.ClipBoard) {
      this.intersectionChooserHandlerService.initiate(data.$sectionID, event, data.$sectionID);
      const intersectedObjects: QuardTreeBound[] = this.intersectionChooserHandlerService.rootFlags[data.$sectionID].objectIntersecting; // prioritize object of type 'Position',
      //If ObjectDerivedType is not position, it will check selected object while shelf and pegboard is overlapping
     const intersectedObject = intersectedObjects.find(it => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT || it.ObjectDerivedType == data.ObjectDerivedType) || intersectedObjects[0];
      if (intersectedObject) {
        const panelId: string = (this.panelService.panelPointer.panelOne.sectionID === data.$sectionID) ? PanelIds.One : PanelIds.Two;
        let element = document.getElementById(data.$id + panelId) as HTMLElement;
        element.style.pointerEvents = 'none';
        /*Added this line to select position object. It is not affecting if we select the other
        type of Object.
        TODO @Amit : Remove dependancy of the following line i.e  data.ObjectDerivedType = 'Position'
         */
        data.ObjectDerivedType = intersectedObject.ObjectDerivedType === 'Position' ? intersectedObject.ObjectDerivedType : data.ObjectDerivedType;
        // Added setTimeOut to remove poiters-event property and add merchandising height to Shelf
        setTimeout(() => {
          element.style.pointerEvents = '';
          data.ObjectDerivedType = AppConstantSpace.STANDARDSHELFOBJ;
        })
      }
    }
    if (data.$sectionID && this.shared.activeSectionID != data.$sectionID) {
      const panelId: string = (this.panelService.panelPointer.panelOne.sectionID === data.$sectionID) ? PanelIds.One : PanelIds.Two;
      this.panelService.updatePanel(panelId, data.$sectionID)
    }

    const isModularView = data.$sectionID && this.planogramService.rootFlags[data.$sectionID].isModularView;

    if ((isModularView || data.ObjectDerivedType == AppConstantSpace.ANNOTATION || data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) && data.dragOriginatedFrom != DragOrigins.ClipBoard) {
      if (isModularView && data.ObjectDerivedType !== AppConstantSpace.MODULAR && data.ObjectDerivedType !== AppConstantSpace.ANNOTATION) {
        // if in modular view, only allow modular and annotations objects to be dragged
        return;
      }
      let target = event.target as HTMLElement;
      let boundingRect = target.getBoundingClientRect();

      let targetHeight = boundingRect.height;
      if (data.ObjectDerivedType == 'Annotation') {
        targetHeight = 0;
      }

      let selectedOffsetY = 0;
      let eventOffsetY = event.offsetY  * this.scale;
      if (data.ObjectDerivedType == 'StandardShelf') {
        const domElement: HTMLElement = document.querySelector(`#${data.$id}${this.panelService.activePanelID} svg`);
        const boundingRect = domElement.getBoundingClientRect();
        const itemData = this.shared.getObject(data.$id, data.$sectionID);
        if (itemData.Fixture.BackgroundFrontImage?.Url || itemData.Fixture.ForegroundImage?.Url) {
          eventOffsetY = targetHeight + eventOffsetY - boundingRect.height;
        }
        selectedOffsetY = targetHeight - boundingRect.height;
        targetHeight = boundingRect.height;
      }

      // set selected info
      this.selectedOffset = { x: -event.offsetX * this.scale, y: selectedOffsetY - eventOffsetY, height: targetHeight };
      this.selected = data;
      // from pog
    } else if (data.dragOriginatedFrom == DragOrigins.Planogram && !this.intersectionChooserHandlerService.popupOpen) {

      // get the list of intersected pog objects
      this.intersectionChooserHandlerService.initiate(data.$sectionID, event, data.$sectionID);
      const intersectedObjects: QuardTreeBound[] = this.intersectionChooserHandlerService.rootFlags[data.$sectionID].objectIntersecting;

      // prioritize object of type 'Position',  //If ObjectDerivedType is not position, it will check selected object while fixtures are overlapping
      const intersectedObject = intersectedObjects.find(it => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT || it.ObjectDerivedType == data.ObjectDerivedType) || intersectedObjects[0];
      if (!intersectedObject) {
        return;
      }

      // get position and height of the dom element of the intersected object
      const domElement: HTMLElement = document.querySelector(`#${intersectedObject.id}${this.panelService.activePanelID} svg`);
      const boundingRect = domElement.getBoundingClientRect();
      let targetHeight = boundingRect.height;

      let targetX = boundingRect.left;
      let targetY = boundingRect.top;

      // set selected info
      this.selectedOffset = { x: targetX - event.clientX, y: targetY - event.clientY, height: targetHeight };
      this.selected = {
        $id: intersectedObject.id,
        $sectionID: data.$sectionID,
        ObjectDerivedType: intersectedObject.ObjectDerivedType,
        dragOriginatedFrom: data.dragOriginatedFrom,
      };
      if (intersectedObject.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ
        || intersectedObject.ObjectDerivedType === AppConstantSpace.CROSSBAROBJ
        || intersectedObject.ObjectDerivedType === AppConstantSpace.SLOTWALLOBJ
        || intersectedObject.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ
        || intersectedObject.ObjectDerivedType === AppConstantSpace.BASKETOBJ
        || intersectedObject.ObjectDerivedType === AppConstantSpace.BLOCK_FIXTURE){
          const scaleForLabel = this.planogramService.convertToScale(data.$sectionID);
          let labelHeight = this.commonSvgRenderService.getLabelHeight(scaleForLabel); // This is to accomodate the Shelf label.
          this.labelHeightOffset = labelHeight * this.planogramService.rootFlags[data.$sectionID].scaleFactor;
        }
      // from product library
    } else if (data.dragOriginatedFrom == DragOrigins.ProductLibrary || data.dragOriginatedFrom == DragOrigins.FixtureGallary || data.dragOriginatedFrom == DragOrigins.ClipBoard) {
      // set selected info
      this.selectedOffset = { x: 0, y: 0, height: 0};
      this.selected = data;
    } else { // from shopping cart
      if (this.cartService.displayMode == DisplayMode.CompactView) {
        const boundingRect = (event.target as HTMLElement).getBoundingClientRect();
        // set selected info
        this.selectedOffset = { x: boundingRect.left - event.clientX, y: boundingRect.top - event.clientY, height: boundingRect.height };
      } else {
        const item = this.shared.getObject(data.$id, data.$sectionID);
        const width = item.Position.ProductPackage.Width * this.scale;
        const height = item.Position.ProductPackage.Height * this.scale;
        this.selectedOffset = {
          x: -width,
          y: height * 0.5, height,
        };
      }
      this.selected = data;
    }

    this.mouseDownEvent = event;
    this.isResizing = false;
    this.isDown = true;

    // record mouse position
    this.initialPosition.x = event.clientX;
    this.initialPosition.y = event.clientY;
    this.mousePosition.x = event.clientX;
    this.mousePosition.y = event.clientY;

    this.render2d.mustCheck = event;

  }

  private formBeginDragEventArgs(event: MouseEvent): IBeginDragEventArgs {
    const args: IBeginDragEventArgs = {
      dragType: this.selected.ObjectDerivedType,
      data: this.selected,
      event: event,
    };
    return args;
  }

  private formEndDragEventArgs(): IEndDragEventArgs {
    const args: IEndDragEventArgs = {
      dragType: this.selected.ObjectDerivedType,
      data: this.selected,
    };
    return args;
  }



  private formDropEventArguments(targetData: IDragDropData): IDropEventArgs {

    // use the mouse position to determine the drop position on standard shelf
    if (this.selected.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
      && targetData.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
      const shelf = this.shared.getObjectAs<StandardShelf>(targetData.$id, targetData.$sectionID);
      return {
        targetData,
        sourceData: this.selected, // can be anything based on what is dropped
        clientOffset: {
          // when crunch mode is not active we use the offset to drop the position exactly in the same place on the x axis
          x: this.mousePosition.x + (shelf.Fixture.LKCrunchMode == CrunchMode.NoCrunch ? this.selectedOffset.x : 0),
          y: this.mousePosition.y,
        },
      }
    }

    const dropEventArgs: IDropEventArgs = {
      targetData,
      sourceData: this.selected, // can be anything based on what is dropped
      clientOffset: {
        x: this.mousePosition.x + this.selectedOffset.x,
        y: this.mousePosition.y + this.selectedOffset.y,
      },
    };

    // when dropping on peg type (pegboard|slowtwall|crossbar), we need to use top center instead of top left
    if (dropEventArgs.sourceData.$sectionID && [AppConstantSpace.CROSSBAROBJ, AppConstantSpace.SLOTWALLOBJ, AppConstantSpace.PEGBOARDOBJ]
      .includes(dropEventArgs.targetData.ObjectDerivedType as any)) {
      const position = this.shared.getObjectAs<Position>(dropEventArgs.sourceData.$id, dropEventArgs.sourceData.$sectionID);

      const positionHeight = position.computeHeight();
      const positionWidth = position.computeWidth();

      const height = this.planogramService.convertToPixel(positionHeight, dropEventArgs.sourceData.$sectionID)
                       * this.planogramService.rootFlags[dropEventArgs.sourceData.$sectionID].scaleFactor;
      const implicitScale = height / positionHeight;

      const pegInfo = position.getPegInfo();

      dropEventArgs.clientOffset.x += (positionWidth - pegInfo.OffsetX) * implicitScale;
      dropEventArgs.clientOffset.y += (positionHeight - pegInfo.OffsetY) * implicitScale;
    }

    if ((window as any).map) {
      (window as any).map(this.selectedOffset, dropEventArgs)
    }
    return dropEventArgs;
  }

  private formCanDropArgs(targetData: IDragDropData): ICanDropEventArgs {
    const args: ICanDropEventArgs = {
      sourceData: this.selected,
      targetData,
    };
    return args;
  }


  private onDrop() {
    this.dropTargets.reverse();
    for (const dropTarget of this.dropTargets) {
      const args = this.formCanDropArgs(dropTarget.targetData);
      if (dropTarget.allowedDropTypes.includes(this.selected.ObjectDerivedType) && this.pogDragDropService.canDrop(args)) {
        const dropArgs = this.formDropEventArguments(dropTarget.targetData);

        this.planogramService.hasCacheShrinkFactors = true;
        Context.cacheShrinkFactors = {};
        this.pogDragDropService.drop(dropArgs);
        this.planogramService.hasCacheShrinkFactors = false;
        this.dragDropEventsService.itemDropped.publish(dropArgs);
        break;
      }
    }
    this.selected = null;
    this.dropTargets = [];
  }

  update(dt: number) {
    if(this.shared.freeFlowOn.panelOne || this.shared.freeFlowOn.panelTwo) return;
    const distanceSquared = Math.pow(this.mousePosition.x - this.initialPosition.x, 2) + Math.pow(this.mousePosition.y - this.initialPosition.y, 2)

    if (this.mouseMoveEvent) {
      if (this.isDown && !this.isDragging && distanceSquared > 64) {
        if (this.isResizing) {
          // this.onAnnotationResize.next({
          //   x: (this.mouseMoveEvent.clientX - this.initialPosition.x)>=0?
          //      Math.max(10, (this.mouseMoveEvent.clientX - this.initialPosition.x) / this.scale):
          //      Math.min(-10, (this.mouseMoveEvent.clientX - this.initialPosition.x) / this.scale),
          //   y: (this.mouseMoveEvent.clientY - this.initialPosition.y)>=0?
          //      Math.max(10, (this.mouseMoveEvent.clientY - this.initialPosition.y) / this.scale):
          //      Math.min(-10, (this.mouseMoveEvent.clientY - this.initialPosition.y) / this.scale),
          //   id: this.initialState.id,
          //   movementX: this.mouseMoveEvent.movementX,
          //   movementY: this.mouseMoveEvent.movementY,
          // });
          this.onAnnotationResize.next({
            x: (this.mouseMoveEvent.clientX - this.initialPosition.x) / this.initialState.scale,
            y: (this.mouseMoveEvent.clientY - this.initialPosition.y) / this.initialState.scale,
            id: this.initialState.id,
            movementX: this.mouseMoveEvent.movementX,
            movementY: this.mouseMoveEvent.movementY,
          })
        } else {
          if (this.selected && this.mouseDownEvent && this.pogDragDropService.canDrag({ data: this.selected, event: this.mouseDownEvent })) {
            this.dropTargets.length = 0;
            this.hoverTargets.length = 0;
            this.isDragging = true;
            // start drag
            const args = this.formBeginDragEventArgs(this.mouseMoveEvent);
            this.dragDropEventsService.beginDrag.publish(args);

            this.pogDragDropService.beginDrag(args);
            if (args.data.dragOriginatedFrom == DragOrigins.ClipBoard && (this.pogDragDropService.dragItemData == null)) {
              return;
            } else {
              this.pogDragDropService.prepareGhostImage(args, { x: this.mouseMoveEvent.clientX, y: this.mouseMoveEvent.clientY });
            }
            if (this.selected.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT && args.data.dragOriginatedFrom == DragOrigins.Planogram) {
              if (this.pogDragDropService.multiDragableElementsList.length > 1) { // to retain mouse x position during multiple position drag
                let selectedIndex = this.pogDragDropService.multiDragableElementsList.findIndex(i => i.$id === this.selected.$id);
                for (let i = 0; i < selectedIndex; i++) {
                  const domElement: HTMLElement = document.querySelector(`#${this.pogDragDropService.multiDragableElementsList[i].$id}${this.panelService.activePanelID} svg`);
                  const boundingRect = domElement.getBoundingClientRect();
                  this.selectedOffset.x = this.selectedOffset.x - boundingRect.width;
                }
              }

              let positionWithLayoversY = this.pogDragDropService.multiDragableElementsList.find(e => e.$id === this.selected.$id && e.Position.LayoversY !== 0);

              if (positionWithLayoversY) { // to position ghost image properly when position with layovers y getting dragged
                const domElement: HTMLElement = document.querySelector(`#${positionWithLayoversY.$id}${this.panelService.activePanelID} svg`);
                const boundingClientRect = domElement.getBoundingClientRect();
                let ActualProductHeightInPx = (boundingClientRect.height / positionWithLayoversY.linearHeight()) * positionWithLayoversY.Position.ProductPackage.Height;
                let heightDifference = boundingClientRect.height % ActualProductHeightInPx;
                this.selectedOffset.height = boundingClientRect.height - heightDifference;
              }

              this.selectedOffsetCoffinCase = { x: this.selectedOffset.x, y: this.selectedOffset.y, height: this.selectedOffset.height };
              if (this.pogDragDropService.multiDragableElementsList.length > 1 && this.pogDragDropService.isFromCoffinCase && this.pogDragDropService.isFromSameParent) {
                const minXPos = this.pogDragDropService.multiDragableElementsList.filter(item => item.Location.X === Math.min(...this.pogDragDropService.multiDragableElementsList.map(item => item.Location.X)))[0];
                const domElement: HTMLElement = document.querySelector(`#${minXPos.$id}${this.panelService.activePanelID} svg`);
                const boundingRect = domElement.getBoundingClientRect();
                this.selectedOffsetCoffinCase.x = boundingRect.left - this.mousePosition.x;

                const maxYEndPos = this.pogDragDropService.multiDragableElementsList.filter(item => item.Location.Y === Math.max(...this.pogDragDropService.multiDragableElementsList.map(item => item.Location.Y)))[0];
                const maxYDomElement: HTMLElement = document.querySelector(`#${maxYEndPos.$id}${this.panelService.activePanelID} svg`);
                const maxYPosBoundingRect = maxYDomElement.getBoundingClientRect();
                this.selectedOffsetCoffinCase.y = maxYPosBoundingRect.top - this.mousePosition.y - this.selectedOffset.height;
              }
            }


            let panel: HTMLElement = document.querySelector(`#${this.panelService.activePanelID}`);
            panel.classList.add("isDragging");

            this.render2d.mustCheck = this.mouseMoveEvent;

          } else {
            this.selected = null;

          }
          this.mouseDownEvent = null;
        }
      }
      if (this.isDown) {
        this.mousePosition.x = this.mouseMoveEvent.clientX;
        this.mousePosition.y = this.mouseMoveEvent.clientY;
      }

      //this.mouseMoveEvent = null;

    }


    let preview: HTMLElement = document.querySelector('#preview-image');
    if (preview && this.isDragging) {
      const mouseX = this.selected.dragOriginatedFrom == DragOrigins.Planogram && this.moveByNotch ? this.initialPosition.x : this.mousePosition.x;
      const offset = this.pogDragDropService.hoveringOnCoffincase ? this.selectedOffsetCoffinCase : this.selectedOffset;
      preview.style.left = `${mouseX + offset.x}px`;
      /*Subtracting label height as we consider svg height(that includes fixture height and label height) for offset calculation
      whereas while ghost image created only fixture height considered. So this is done for precise positioning of ghost image created.*/
      //label height always 0 unless fixtures includes label height along with fixture height during svg creation
      preview.style.top = `${this.mousePosition.y + offset.y + offset.height - this.labelHeightOffset}px`;
    }
  }

  /** should happen after positions are updated which is in the next frame after drop */
  private removeIsDraggingClass() {
    const panelOne: HTMLElement = document.querySelector(`#${PanelIds.One}`);
    panelOne.classList.remove("isDragging");
    const panelTwo: HTMLElement = document.querySelector(`#${PanelIds.Two}`);
    panelTwo.classList.remove("isDragging");
  }

  private get moveByNotch() {
    if (!this.selected) {
      return false;
    }
    //For drag from clipBoard move by notch is always false
    if (this.selected.dragOriginatedFrom === DragOrigins.ClipBoard) {
      return false;
    }
    const rootObject = this.shared.getObject(this.selected.$sectionID, this.selected.$sectionID) as Section;
    // move by notch
    return this.selected.ObjectDerivedType !== AppConstantSpace.MODULAR &&
      this.selected.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT &&
      rootObject.LKFixtureMovement == 1 &&
      this.selected.ObjectDerivedType !== AppConstantSpace.ANNOTATION;
  }
}
