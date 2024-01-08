import { Directive, Input, ElementRef, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import * as _ from 'lodash-es';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { AnnotationDirection, AnnotationType, RectangleCoordinates2d } from 'src/app/shared/models';
import { SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import {
  SharedService, PlanogramService, QuadtreeUtilsService,
  CollisionService,
  ShoppingCartService,
  AnnotationService,
  PanelService
} from 'src/app/shared/services';
import { PogSettings } from 'src/app/shared/models';
import { Bounds, CartDomRect, Offset } from 'src/app/shared/models/planogram/pog-object';
import { Section } from 'src/app/shared/classes';
import { SortPipe } from 'src/app/shared/pipe';

@Directive({
  selector: '[appRubberbandSupport]'
})
export class RubberbandSupportDirective implements AfterViewInit, OnDestroy {

  @Input() panelID: string;
  @Input() isCartView: boolean = false;
  @Input() cartView: string;
  private mouseDown: boolean = false;
  private rubberBandOn: boolean = false;
  private freeFlowOn: boolean = false;
  private sTop: number = 0;
  private sLeft: number = 0;
  private pogOffset: Offset;
  private bounds: Bounds= {
    x: 0,
    y: 0,
    z: 0,
    left: 0,
    top: 0,
    back: 0,
    selectTop: 0,
    selectHeight: 0,
    minMerchHeight: 0,
    rotationx: 0,
    backtop: 0,
    width: 0,
    height: 0,
    depth: 0
  }
  private pogSettings: PogSettings;
  private leftt: number;
  private topp: number;
  private sectionID: string;
  private scaleFactor: number;
  private sortPipe: SortPipe;
  public CartDomRect: CartDomRect[];
  public orderBy: { predicate: string[], reverse: boolean, orders: boolean[] } = {
    predicate: ['Position.RecommendationNumber', 'Position._X05_POSVALX01.ValData', 'Position.Product.Name'],
    reverse: false,
    orders: []
  };
  private isSelecting = false;
  private autoScrollMargin = 10;
  private autoScrollInterval = 10;
  private initialMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private currentMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private scrollCount: {x: number, y: number, height: number, 
                              width: number} = 
                              {x: 0, y: 0, height: 0, 
                                width: 0};
  constructor(
    public readonly sharedService: SharedService,
    public readonly planogramservice: PlanogramService,
    private readonly quadtreeUtilsService: QuadtreeUtilsService,
    private readonly collision: CollisionService,
    private readonly panelBodyEl: ElementRef,
    private readonly shoppingCartService: ShoppingCartService,
    private readonly annotationService: AnnotationService,
    private readonly panelService: PanelService
    ) {
    this.sortPipe = new SortPipe();
  }
  public ngAfterViewInit(): void {
    this.setupRubberBanding();
  }

  public ngAfterViewChecked(): void {
    this.setupRubberBanding();
  }
  private setupRubberBanding(): void {
    let planogramHolder = this.isCartView ? $("#cartListID") : $("#planogram-holder_" + this.panelID);
    if(this.isCartView){
      if(this.cartView === 'ListView'){
        planogramHolder.append('<div id="rubberbandselector' + this.cartView + '" class="ui-selectable-helper" style="left: 0px; top: 0px; position: absolute; right: 0px; bottom: 0px; display: none;z-index:9999; border: 2px dotted black;" ></div>');
      }
    }
    else{
        planogramHolder.append('<div id="rubberbandselector' + this.panelID + '" class="ui-selectable-helper" style="left: 0px; top: 0px; position: absolute; right: 0px; bottom: 0px; display: none;z-index:9999; border: 2px dotted black;" ></div>');
    }
    planogramHolder.append('<div id="freeflowselector' + this.panelID + '" class="ui-selectable-helper" style="left: 0px; top: 0px; position: absolute; right: 0px; bottom: 0px; display: none;z-index:9999; border: 2px groove black;" ></div>');
    let freeFlowConnector = `<div id="freeflowconnector` + this.panelID + `" class="ui-selectable-helper" style="left: 0px; top: 0px; position: absolute; right: 0px; bottom: 0px; display: none;z-index:9999; border: 1px dotted black;" >` +
      `<svg style="display: block;" id="freeflowconnectorsvg" viewBox="0 0 5 5" xmlns="http://www.w3.org/2000/svg">
      <defs>
            <marker
            id="arrowConnector"
            viewBox="0 0 20 20"
            refX="5"
            refY="5"
            markerWidth="10"
            markerHeight="10"
            style="fill: red;"
            orient="auto-start-reverse">
            <path d="M 0 0 L 20 5 L 0 10 z" />
          </marker>
        </defs>
    <line style="fill: black; stroke-width: 1px; stroke: red ; marker-end: url(&quot;#arrowConnector&quot;);"  x1="0" y1="0" x2="5" y2="5" />
  </svg>`
      + `</div>`;
    planogramHolder.append(freeFlowConnector);
    planogramHolder.on('mousedown', (event) => {
      let sectionID = this.sharedService.getActiveSectionId();
      let rootObj = this.sharedService.getObject(sectionID, sectionID);
      if (rootObj) {
        const isFreeFlow = this.sharedService.freeFlowDetails?.activePanelID && this.sharedService.freeFlowOn[this.sharedService.freeFlowDetails.activePanelID];
        if(this.panelID && this.panelID != this.panelService.activePanelID && isFreeFlow  && event.button == 0){
          this.panelService.updatePanel(this.panelID, this.panelService.panelPointer[this.panelID]['sectionID'])
          this.planogramservice.setSelectedIDPOGPanelID(this.panelID);
        }
        if (![0, 2].includes(event.button) || (!isFreeFlow  && event.button == 0)) {
          return;
        }
        this.mouseDown = true;
        this.sLeft = event.clientX;
        this.sTop = event.clientY;
        this.leftt = this.isCartView
                      ? $("#cartListID").offset().left : $("#planogram-holder_" + this.panelID).offset().left;
        this.topp = this.isCartView
                    ? $("#cartListID").offset().top : $("#planogram-holder_" + this.panelID).offset().top;
        this.pogSettings = this.planogramservice.rootFlags[sectionID];
        if(isFreeFlow && event.button == 0){
          event.stopImmediatePropagation();
        }
        setTimeout(() => {
          if (this.mouseDown && !Utils.objectDrag && !Utils.isAnnotationDrag && !this.pogSettings.isModularView && event.button == 2) {
            this.rubberBandOn = true;
            Utils.isRubberBandDrag = true;
            let elem;
            if(this.isCartView){
              if(this.cartView === 'ListView'){
                elem = document.getElementById("rubberbandselector" +  this.cartView);
                if(this.sharedService.isCartSideView){
                  elem.style.left = Math.abs(event.clientX)  + 'px';
                  elem.style.top = Math.abs(event.clientY) + 'px';
                }
                else{
                  elem.style.left = Math.abs(event.clientX)  + 'px';
                  elem.style.top = Math.abs(event.clientY) + 'px';
                }
                elem.style.width = '5px';
                elem.style.height = '5px';
                elem.style.display = "block";
                elem.style.cursor = 'crosshair';
                this.panelBodyEl.nativeElement.style.cursor = 'crosshair';
                this.sharedService.rubberBandOn = true;
                this.initialMousePos = { x: event.clientX, y: event.clientY };
              }
            }
            else{
              elem = document.getElementById("rubberbandselector" +  this.panelID);
              elem.style.left = Math.abs(this.sLeft - this.leftt) + 'px';
              elem.style.top = Math.abs(this.sTop - this.topp) + 'px';
              elem.style.width = '5px';
              elem.style.height = '5px';
              elem.style.display = "block";
              elem.style.cursor = 'crosshair';
              this.panelBodyEl.nativeElement.style.cursor = 'crosshair';
              this.sharedService.rubberBandOn = true;
            }
            // adding additional events
            planogramHolder.on('mousemove', (event) => {
              if (this.rubberBandOn && this.sharedService.rubberBandOn) {
                if(this.isCartView){
                  if(this.cartView === 'ListView'){
                    this.cartRepositionMarkers(event);
                  }
                }
                else{
                  this.repositionMarkers(event, 'rubberbandselector');
                }
              } else {
                if (this.sLeft - event.clientX > 10 || this.sTop - event.clientX > 10)
                  this.mouseDown = false;
                let elem;
                if(this.isCartView){
                  if(this.cartView === 'ListView'){
                    elem = document.getElementById("rubberbandselector" +  this.cartView);
                    elem.style.display = 'none';
                    elem.style.cursor = 'auto';
                  }
                }
                else{
                  elem = document.getElementById("rubberbandselector" +  this.panelID);
                  elem.style.display = 'none';
                  elem.style.cursor = 'auto';
                }
              }
            })
          }
          if (this.mouseDown && !Utils.objectDrag && !Utils.isAnnotationDrag && !this.pogSettings.isModularView && event.button == 0 && this.sharedService.freeFlowDetails.activePanelID && this.panelID == this.sharedService.freeFlowDetails.activePanelID) {
            this.freeFlowOn = true;
            Utils.isFreeFlowDrag = true;
            Utils.isRubberBandDrag = true;
            let selector = this.sharedService.freeFlowDetails.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR ? "freeflowconnector" : "freeflowselector";
            let elem = document.getElementById(selector + this.panelID);
            elem.style.left = Math.abs(this.sLeft - this.leftt) + 'px';
            elem.style.top = Math.abs(this.sTop - this.topp) + 'px';
            elem.style.width = '5px';
            elem.style.height = '5px';
            elem.style.display = "block";
            elem.style.cursor = 'inherit';
            this.panelBodyEl.nativeElement.style.cursor = 'inherit';
            // adding additional events
            planogramHolder.on('mousemove', (event) => {
              if (this.freeFlowOn) {
                this.repositionMarkers(event, selector);
              } else {
                if (this.sLeft - event.clientX > 10 || this.sTop - event.clientX > 10)
                  this.mouseDown = false;
                let elem = document.getElementById(selector + this.panelID);
                elem.style.display = 'none';
                elem.style.cursor = 'auto';
              }
            })
          }
        }, 500);

        planogramHolder.on('mouseup', (event) => {
          this.mouseDown = false;
          if (this.rubberBandOn) {
            if(this.isCartView){
              if(this.cartView === 'ListView'){
                this.cartRepositionMarkers(event);
                this.selectCartPositionsWithinRubberBand();
              }
            }
            else{
              this.repositionMarkers(event, 'rubberbandselector');
              this.selectPositionsWithinRubberBand();
            }
            this.rubberBandOn = false;
            Utils.isRubberBandDrag = false;
            let elem;
            if(this.isCartView){
              if(this.cartView === 'ListView'){
                elem = document.getElementById("rubberbandselector" +  this.cartView);
                elem.style.display = 'none';
                elem.style.cursor = 'auto';
                this.panelBodyEl.nativeElement.style.cursor = 'auto';
                window.setTimeout(() => {
                  this.sharedService.rubberBandOn = false;
                }, 100)
              }
            }
            else{
              elem = document.getElementById("rubberbandselector" +  this.panelID);
              elem.style.display = 'none';
              elem.style.cursor = 'auto';
              this.panelBodyEl.nativeElement.style.cursor = 'inherit';
              window.setTimeout(() => {
                this.sharedService.rubberBandOn = false;
              }, 100)
            }
            // removing events attached
            planogramHolder.off('mouseup');
            planogramHolder.off('mousemove')
            event.stopPropagation();
            event.preventDefault();
          }
          if (this.sharedService.freeFlowOn[this.sharedService.freeFlowDetails?.activePanelID] && !this.freeFlowOn && this.sharedService.freeFlowDetails.LkExtensionType == AnnotationType.FREEFLOW_TEXT) {
            this.drawAnnotationOnMouseUp(event, planogramHolder, 'freeflowselector', true);
            this.sharedService.freeFlowOn[this.sharedService.freeFlowDetails.activePanelID] = false;
            return;
          }
          if (this.freeFlowOn) {
            let selector = this.sharedService.freeFlowDetails.LkExtensionType == AnnotationType.FREEFLOW_CONNECTOR ? "freeflowconnector" : "freeflowselector";
            this.repositionMarkers(event, selector);
            this.drawAnnotationOnMouseUp(event, planogramHolder, selector);
            this.sharedService.freeFlowOn[this.sharedService.freeFlowDetails.activePanelID] = false;
            return;
          }
        });
      };
    })


  }

  private drawAnnotationOnMouseUp(event, planogramHolder, selector, textBoxOnClick?){
    let sectionID = this.sharedService.getActiveSectionId();
    let section = this.sharedService.getObject(sectionID, sectionID) as Section;
    let targetScaleFactor = this.planogramservice.rootFlags[sectionID].scaleFactor;
    //need to get the proper sectionContainer as the current below line works only in case of full mode-----------------------------------------------------------------------------------------------
    var basepos = document.getElementById('sectionContainer_' + sectionID).getBoundingClientRect();
    let xToBe = this.sLeft < event.clientX ? this.sLeft : event.clientX;
    let yToBe = this.sTop < event.clientY ? this.sTop : event.clientY;
    let x = this.planogramservice.convertToUnit(
      (xToBe - basepos.x) / targetScaleFactor,
      sectionID,
    );
    let y = this.planogramservice.convertToUnit(
      (yToBe - basepos.y) / targetScaleFactor,
      sectionID,
    );
    let rawHeight = event.clientY - this.sTop;
    let rawWidth = event.clientX - this.sLeft
    let height = Math.abs(rawHeight) / targetScaleFactor;
    let width = Math.abs(rawWidth) / targetScaleFactor;
    if(textBoxOnClick){
      let dimensions = this.annotationService.getDimensionsByFont('A'.repeat(10), this.sharedService.freeFlowDetails.font, this.sharedService.freeFlowDetails.style, sectionID);
      height = dimensions.height;
      width = dimensions.width;
    }
    let annotation = this.annotationService.populateAnnotation(this.sharedService.freeFlowDetails, sectionID);
    annotation.Attribute.location.height = this.planogramservice.convertToUnit(height, sectionID);
    annotation.Attribute.location.width = this.planogramservice.convertToUnit(width, sectionID);
    annotation.Attribute.location.locX = x;//this.planogramservice.convertToUnit( x, sectionID);
    annotation.Attribute.location.locY = -y + section.Dimension.Height - annotation.Attribute.location.height;// this.planogramservice.convertToUnit( y, sectionID);
    if (rawHeight < 0 && rawWidth < 0) {
      annotation.Attribute.location.direction = AnnotationDirection.TOP_LEFT;
    } else if (rawHeight < 0 && rawWidth > 0) {
      annotation.Attribute.location.direction = AnnotationDirection.TOP_RIGHT;
    } else if (rawHeight > 0 && rawWidth > 0) {
      annotation.Attribute.location.direction = AnnotationDirection.BOTTOM_RIGHT;
    } else if (rawHeight > 0 && rawWidth < 0) {
      annotation.Attribute.location.direction = AnnotationDirection.BOTTOM_LEFT;
    }
    this.annotationService.saveAnnotation(annotation);
    this.freeFlowOn = false;
    Utils.isFreeFlowDrag = false;
    Utils.isRubberBandDrag = false;
    let elem = document.getElementById(selector + this.panelID);
    elem.style.display = 'none';
    elem.style.cursor = 'auto';
    this.panelBodyEl.nativeElement.style.cursor = 'inherit';
    let bodyPanelElem = document.querySelector('#' + this.sharedService.freeFlowDetails.activePanelID + ' #bodyPanel',          ) as HTMLElement;;
    bodyPanelElem.classList.remove('freeFlowCursor');
    bodyPanelElem.style.cursor = 'auto';
    window.setTimeout(() => {
      this.sharedService.freeFlowOn[this.sharedService.freeFlowDetails.activePanelID] = false;
      //this.planogramservice.updateAnnotationDialog.next({refObj: section, hierarchy: 'DUMMY_PLACEHOLDER'});
    }, 100)
    // removing events attached
    planogramHolder.off('mouseup');
    planogramHolder.off('mousemove')
    event.stopPropagation();
    event.preventDefault();
  }

  private selectCartPositionsWithinRubberBand(): void {
    let sectionID = this.sharedService.getActiveSectionId();
    this.scaleFactor = this.planogramservice.rootFlags[sectionID].scaleFactor;
    this.sectionID = sectionID;
    const parentRect: RectangleCoordinates2d = {
      xstart: this.bounds.x,
      xend: this.bounds.x + this.bounds.width,
      ystart: this.bounds.y,
      yend: this.bounds.y + this.bounds.height,
    };
    this.CartDomRect = [];
    let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
    const cartObj = Utils.getShoppingCartObj(rootObject.Children);
    this.orderBy = this.shoppingCartService.orderCartBy(this.shoppingCartService.sortFieldOrder);
    cartObj.orderBy = this.orderBy;
    const sortedCartObj = this.sortPipe.transform(cartObj.Children, {'col':cartObj?.orderBy?.predicate,'sortReverse':cartObj?.orderBy?.reverse,'orders':cartObj.orderBy !== undefined ? cartObj?.orderBy['orders'] : ''});
    this.planogramservice.removeAllSelection(this.sectionID);
    this.planogramservice.selectionEmit.next(true);
    sortedCartObj.forEach((element) => {
      const domRect = document.getElementById(element.$id).getBoundingClientRect();
      const cartRect: RectangleCoordinates2d = {
        xstart: domRect.x,
        xend: domRect.x+ domRect.width,
        ystart: domRect.y,
        yend: domRect.y+ domRect.height,
      };
      this.retriveCartQuads(parentRect,cartRect,element,this.sectionID);
    });
    this.shoppingCartService.checkForChangeInCart.next(true);
  }
  private selectPositionsWithinRubberBand(): void {
    if (!this.bounds.width || !this.bounds.height) return;
    let sectionObj= this.sharedService.getObject(this.sectionID, this.sectionID) as  Section;
    const cartObj = Utils.getShoppingCartObj(sectionObj.Children);
    cartObj.Children.forEach((element) => {
      this.shoppingCartService.removeFromSelectionById(element.$id, this.sectionID);
      this.shoppingCartService.checkForChangeInCart.next(true);
    });
    this.pogOffset = $("#planogram-holder_" + this.panelID).find('div[id^="innerWebPOG_"]').offset();
    let leftCorrection = this.pogOffset.left - this.leftt;
    let topCorrection = this.pogOffset.top - this.topp;
    leftCorrection = this.planogramservice.convertToUnit(leftCorrection / this.scaleFactor, this.sectionID);
    topCorrection = this.planogramservice.convertToUnit(topCorrection / this.scaleFactor, this.sectionID);
    this.bounds.x -= leftCorrection;
    this.bounds.y -= topCorrection;

    this.bounds.y -= sectionObj.anDimension.top;

    const rect1: RectangleCoordinates2d = {
      xstart: this.bounds.x,
      xend: this.bounds.x + this.bounds.width,
      ystart: this.bounds.y,
      yend: this.bounds.y + this.bounds.height,
    };
    let retrievedQuads = this.quadtreeUtilsService.retrieve(this.sectionID, this.bounds);
    retrievedQuads = retrievedQuads.sort((a, b) => { if (a.x < b.x) { return -1 } });
    let selectedObjType: SelectableList[] = this.planogramservice.getSelectedObject(this.sectionID);
    this.planogramservice.removeAllSelection(this.sectionID);
    this.sharedService.RemoveSelectedItemsInWS.next({ view: `removeSelectionInWS` })
    for (const retQuad of retrievedQuads) {
      const objToSelect = this.sharedService.getObject(retQuad.id, this.sectionID);

      if (typeof selectedObjType[0] != 'undefined' && objToSelect.ObjectDerivedType == selectedObjType[0].ObjectDerivedType) {
        this.retriveQuads(rect1, retQuad, objToSelect, this.sectionID)
      } else {
        if (typeof selectedObjType[0] == 'undefined' || selectedObjType[0].ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
          if (objToSelect.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            this.retriveQuads(rect1, retQuad, objToSelect, this.sectionID)
          }
        }
      }
    }
    this.planogramservice.selectionEmit.next(true);
  }
  private retriveQuads(rect1: RectangleCoordinates2d, quadChild, objToSelect, sectionID: string): void {
    const rect2: RectangleCoordinates2d = {
      xstart: quadChild.x,
      xend: quadChild.x + quadChild.width,
      ystart: quadChild.y,
      yend: quadChild.y + quadChild.height,
    };
    if (this.collision.isIntersecting2D(rect1, rect2, 0)) {
      this.planogramservice.addToSelectionByObject(objToSelect, sectionID);
      this.sharedService.itemSelection.next({ pogObject: objToSelect, view: 'ctrl' });
    }
  }

  private retriveCartQuads(parentRect: RectangleCoordinates2d, cartPosRect: RectangleCoordinates2d, objToSelect, sectionID: string): void {
    if (this.collision.isIntersecting2D(parentRect, cartPosRect, 0)) {
      this.planogramservice.addToSelectionByObject(objToSelect, sectionID);
      this.sharedService.itemSelection.next({ pogObject: objToSelect, view: 'ctrl' });
    }
  }
  private cartRepositionMarkers(event: JQuery.MouseMoveEvent | JQuery.MouseUpEvent): void {
    let width = event.clientX - this.sLeft;
    let height = event.clientY - this.sTop;
    let elem, left, top;
    elem = document.getElementById("rubberbandselector" + this.cartView);
    if (this.sharedService.isCartSideView) {
      left = ((width > 0) ? this.sLeft : event.clientX) - this.leftt;
      top = ((height > 0) ? this.sTop : event.clientY) - this.topp + 80;
      elem.style.left = Math.abs(left) + 'px';
      elem.style.top = Math.abs(top) + 'px';
      elem.style.width = Math.abs(width) + 'px';
      elem.style.height = Math.abs(height) + 'px';
      elem.style.cursor = 'crosshair';
      elem.style.display = 'block';
    }
    else {
      left = ((width > 0) ? this.sLeft : event.clientX);
      top = ((height > 0) ? this.sTop : event.clientY);
      elem.style.left = Math.abs(left) + 'px';
      elem.style.top = Math.abs(top) + 'px';
      elem.style.width = Math.abs(width) + 'px';
      elem.style.height = Math.abs(height) + 'px';
      elem.style.cursor = 'crosshair';
      elem.style.display = 'block';
    }
    let cartRubberBand = document.getElementById("rubberbandselector" + this.cartView).getBoundingClientRect();
    if(this.scrollCount.y > 0){
      this.bounds.x = this.initialMousePos.x - this.scrollCount.x;
      this.bounds.y = this.initialMousePos.y - this.scrollCount.y;
      this.bounds.width = cartRubberBand.width + this.scrollCount.x;
      this.bounds.height = cartRubberBand.height + this.scrollCount.y;
    }
    else if (this.scrollCount.y == 0){
      this.bounds.x = cartRubberBand.x;
      this.bounds.y = cartRubberBand.y;
      this.bounds.width = cartRubberBand.width;
      this.bounds.height = cartRubberBand.height;
    }
    else if (this.scrollCount.y < 0){
      this.bounds.x = cartRubberBand.left;
      this.bounds.y = cartRubberBand.top;
      this.bounds.width = cartRubberBand.width;
      this.bounds.height = cartRubberBand.height - this.scrollCount.y;
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (this.isCartView) {
      if (this.cartView === 'ListView') {
        this.isSelecting = true;
        this.scrollCount = { x: 0, y: 0, height: 0, width: 0 };
      }
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isCartView) {
      if (this.cartView === 'ListView') {
        if (this.isSelecting) {
          this.currentMousePos = { x: event.clientX, y: event.clientY };
          this.autoScroll();
        }
      }
    }
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isCartView) {
      if (this.cartView === 'ListView') {
        if (this.isSelecting) {
          this.isSelecting = false;
        }
      }
    }
  }

  private autoScroll(): void {
    const container = document.getElementById("cartListID");
    const containerRect = container.getBoundingClientRect();
    if (this.currentMousePos.y > containerRect.bottom - this.autoScrollMargin) {
      container.scrollTop += this.autoScrollInterval;
      this.scrollCount.y += this.autoScrollInterval;
    } else if (this.currentMousePos.y < containerRect.top + this.autoScrollMargin) {
      container.scrollTop -= this.autoScrollInterval;
      this.scrollCount.y -= this.autoScrollInterval;
    }

    if (this.currentMousePos.x > containerRect.right - this.autoScrollMargin) {
      container.scrollLeft += this.autoScrollInterval;
      this.scrollCount.x += this.autoScrollInterval;
    } else if (this.currentMousePos.x < containerRect.left + this.autoScrollMargin) {
      container.scrollLeft -= this.autoScrollInterval;
      this.scrollCount.x -= this.autoScrollInterval;
    }
  }


  private repositionMarkers(event: JQuery.MouseMoveEvent | JQuery.MouseUpEvent, selector: string): void {
    let width = event.clientX - this.sLeft;
    let height = event.clientY - this.sTop;
    let elem;
    elem = document.getElementById(selector + this.panelID);
    let left = ((width > 0) ? this.sLeft : event.clientX) - this.leftt;
    let top = ((height > 0) ? this.sTop : event.clientY) - this.topp;
    elem.style.left = Math.abs(left) + 'px';
    elem.style.top = Math.abs(top) + 'px';

    elem.style.width = Math.abs(width) + 'px';
    elem.style.height = Math.abs(height) + 'px';
    if (selector == 'rubberbandselector') {
      elem.style.cursor = 'crosshair';
    } else {
      elem.style.cursor = 'inherit';
    }
    elem.style.display = 'block';
    if (this.sharedService.freeFlowDetails?.LkExtensionType == AnnotationType.FREEFLOW_TEXT) {
      elem.style.border = '1px groove black';
    }
    if (this.sharedService.freeFlowDetails?.LkExtensionType == AnnotationType.FREEFLOW_BOX) {
      elem.style.border = '2px solid '+ this.sharedService.freeFlowDetails.style.lncolor;
    }
    if (selector == 'freeflowconnector') {
      let connectorSVG = elem.children[0];
      connectorSVG.setAttribute('viewBox', '0 0 ' + Math.abs(width) + ' ' + Math.abs(height));
      let line = connectorSVG.children[1];
      let marker = connectorSVG.children[0].children[0];
      if (width < 0) {
        line.setAttribute('x1', Math.abs(width));
        line.setAttribute('x2', 5);
      } else if (width >= 0) {
        line.setAttribute('x1', 0);
        line.setAttribute('x2', Math.abs(width) - 5);
      }
      if (height < 0) {
        line.setAttribute('y1', Math.abs(height));
        line.setAttribute('y2', 5);
      } else if (height >= 0) {
        line.setAttribute('y1', 0);
        line.setAttribute('y2', Math.abs(height) - 5);
      }
      if (width > height) {
        connectorSVG.style.width = '100%';
        connectorSVG.style.height = '';
      } else if (height > width) {
        connectorSVG.style.width = '';
        connectorSVG.style.height = '100%';
      }
      marker.style.color = this.sharedService.freeFlowDetails.style.lncolor;
      marker.style.fill = this.sharedService.freeFlowDetails.style.lncolor;
      marker.setAttribute('id', 'arrowConnector'+this.sharedService.freeFlowDetails.style.lncolor.substring(1));
      line.style.markerEnd = `url(#arrowConnector${this.sharedService.freeFlowDetails.style.lncolor.substring(1)})`;
      line.style.stroke = this.sharedService.freeFlowDetails.style.lncolor;
    }
    let sectionID = this.sharedService.getActiveSectionId();
    this.scaleFactor = this.planogramservice.rootFlags[sectionID].scaleFactor;
    this.sectionID = sectionID;
    if (selector == 'rubberbandselector') {
      this.bounds.x = this.planogramservice.convertToUnit(left / this.scaleFactor, this.sectionID);
      this.bounds.y = this.planogramservice.convertToUnit(top / this.scaleFactor, this.sectionID);
      this.bounds.width = this.planogramservice.convertToUnit(Math.abs(width / this.scaleFactor), this.sectionID);
      this.bounds.height = this.planogramservice.convertToUnit(Math.abs(height / this.scaleFactor), this.sectionID);
    }
  }
  public ngOnDestroy(): void {

  }
}
