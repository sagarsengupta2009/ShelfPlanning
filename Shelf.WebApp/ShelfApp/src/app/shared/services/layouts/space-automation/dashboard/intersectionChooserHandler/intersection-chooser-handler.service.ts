import { Injectable } from '@angular/core';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { PlanogramService } from "src/app/shared/services/common/planogram/planogram.service";
import { QuadtreeUtilsService } from 'src/app/shared/services/common/shelfCommonService/quadtree-utils.service';
import { Section } from 'src/app/shared/classes';
import { PanelService } from '../shelf-planogram/splitter-container/panel/panel.service';
@Injectable({
  providedIn: 'root'
})
export class IntersectionChooserHandlerService {
  public rootFlags: any;
  public intersectingPosition: any;
  public bycoordinate = true;
  public popupOpen: boolean;
  constructor(public sharedService: SharedService,
    public planogramService: PlanogramService,
    private readonly panelService: PanelService,
    public QuadtreeUtilsService: QuadtreeUtilsService) {
    this.rootFlags = {};
  }

  public initBySectionId(sectionID: string):void {
    this.rootFlags[sectionID] = {};
    this.rootFlags[sectionID].objectIntersecting = [],
      this.rootFlags[sectionID].storage = {
        Position: [],
        Block: [],
        CoffinCase: [],
        BlockFixture: [],
        Pegboard: [],
        Crossbar: [],
        Section: [],
        Modular: [],
        StandardShelf: [],
        Slotwall: [],
        Basket: [],
        Nested: []
      },
      this.rootFlags[sectionID].scope = null,
      this.rootFlags[sectionID].coord = {
        clientX: null,
        clientY: null,
        xFromPOG: null,
        yFromPOG: null
      },
      this.rootFlags[sectionID].dimension = {
        height: null,
        width: null
      }
    this.intersectingPosition = [];
  }

  public cleanBySectionId(sectionID: string): void {
    delete this.rootFlags[sectionID];
  }

  public initiate(sectionID: string, event: MouseEvent, childID: string): void {
    const sectionObj = this.sharedService.getObjectAs<Section>(sectionID, sectionID);
    const panelID = this.panelService.activePanelID;
    const pogOffSetPX = $("#planogram-holder_" + panelID).find('div[id^="innerWebPOG_"]').offset();
    const scaleF = this.planogramService.rootFlags[sectionID].scaleFactor;//this.PlanogramSettings.rootFlags[sectionID].scaleFactor;
    const sectionBasedSetting = this.rootFlags[sectionID];
    const showAnnotation = this.planogramService.rootFlags[sectionID].isAnnotationView;
    //co-ordinate initialize
    sectionBasedSetting.coord.clientX = event.clientX + 1;
    sectionBasedSetting.coord.clientY = event.clientY + 1;
    sectionBasedSetting.coord.xFromPOG = this.planogramService.convertToUnit(((sectionBasedSetting.coord.clientX - pogOffSetPX.left) / scaleF), sectionID); // What is this 0.21 ??
    sectionBasedSetting.coord.yFromPOG = this.planogramService.convertToUnit(((sectionBasedSetting.coord.clientY - pogOffSetPX.top) / scaleF), sectionID);

    if (showAnnotation) {
      sectionBasedSetting.coord.xFromPOG -= sectionObj.getAnnotationDimensionLeft();
      sectionBasedSetting.coord.yFromPOG -= sectionObj.getAnnotationDimensionTop();
    }

    const bounds = { x: sectionBasedSetting.coord.xFromPOG, y: sectionBasedSetting.coord.yFromPOG, width: 0.1, height: 0.1, id: childID };
    sectionBasedSetting.objectIntersecting = this.QuadtreeUtilsService.findingIntersectionsAtBound(sectionID, bounds);
    this.setObjectIntersected(sectionID);

    //dimension initialize
    //(function (that) {
    const len = sectionBasedSetting.storage.Position.length;
    const allLinearHeightArr = [];
    var totalLinearWidth = 0;
    var maxLinearHeight = 0;
    const minHeight = 250;
    const minWidth = 400;
    for (var i = 0; i < len; i++) {
      allLinearHeightArr.push(sectionBasedSetting.storage.Position[i].linearHeight());
      totalLinearWidth += sectionBasedSetting.storage.Position[i].linearWidth();
    }
    maxLinearHeight = Math.max.apply(null, allLinearHeightArr);
    //summation of all linearWidth
    sectionBasedSetting.dimension.width = (totalLinearWidth === 0) ? minWidth : (this.planogramService.convertToPixel(totalLinearWidth, sectionID) + 100);
    //max of all linearHeight
    sectionBasedSetting.dimension.height = (allLinearHeightArr.length == 0) ? minHeight : (this.planogramService.convertToPixel(maxLinearHeight, sectionID) + 50);

    //for better view
    if (sectionBasedSetting.dimension.width < minWidth) {
      sectionBasedSetting.dimension.width = minWidth;
    }
    if (sectionBasedSetting.dimension.height < minHeight) {
      sectionBasedSetting.dimension.height = minHeight;
    }


    //})(this);
  }

  //setObjectIntersected: function (sectionID, type) {
  //    var sectionBasedSetting = this.rootFlags[sectionID];
  //    var len = sectionBasedSetting.objectIntersecting.length;
  //    var storage = [];
  //    for (var i = 0; i < len; i++) {
  //        if (sectionBasedSetting.objectIntersecting[i].ObjectDerivedType == type) {
  //            //this.objectIntersecting[i].selected = false;
  //            sectionBasedSetting.storage.part.push(sectionBasedSetting.objectIntersecting[i]);
  //        }
  //    }
  //   // return sectionBasedSetting.storage.part;
  //},

  public setObjectIntersected = function (sectionID) {
    var sectionBasedSetting = this.rootFlags[sectionID];
    var len = sectionBasedSetting.objectIntersecting.length;
    var storage = [];
    var temp = null;
    var type;
    var tempLocationXIncrementor = 0;
    //@enable @migration
    //angular.forEach(sectionBasedSetting.storage, function (v, k) {
    //  this[k] = [];
    //}, sectionBasedSetting.storage);
    for (let type in sectionBasedSetting.storage) {
      sectionBasedSetting.storage[type] = [];
    }
    for (var i = 0; i < len; i++) {
      temp = this.sharedService.getObject(sectionBasedSetting.objectIntersecting[i].id, sectionID);
      type = sectionBasedSetting.objectIntersecting[i].ObjectDerivedType;
      if (temp.ObjectDerivedType == 'Position') {
        temp.IntersectionLocation = {
          X: tempLocationXIncrementor,
          Y: 0
        };
        tempLocationXIncrementor += temp.linearWidth();
      }
      else if (temp.Order == 'Nested') {
        type = 'Nested'
      }
      sectionBasedSetting.storage[type].push(temp);
    }
  }

  public openPop(sectionID) {
    this.popupOpen = true;

    var sectionBasedSetting = this.rootFlags[sectionID];
    var $component = $('#intersectionChooserPop-' + sectionID);
    var $popWindow = $component.find('.intersect-window');
    var $overLay = $component.find('.intersect-overlay');
    var $positionHolder = $component.find('.position-holder');

    var initialCSS = {
      height: 5,
      width: 5,
      left: this.planogramService.convertToPixel(sectionBasedSetting.coord.xFromPOG, sectionID),
      top: this.planogramService.convertToPixel(sectionBasedSetting.coord.yFromPOG, sectionID),
      borderRadius: '150px',
      opacity: 0.1
    }

    var middleCSS = {
      height: 75,
      width: 75,
      left: this.planogramService.convertToPixel(sectionBasedSetting.coord.xFromPOG, sectionID) - 75 / 2,
      top: this.planogramService.convertToPixel(sectionBasedSetting.coord.yFromPOG, sectionID) - 75 / 2,
      borderRadius: '100px',
      opacity: 0.5
    }

    var finalCSS = {
      height: sectionBasedSetting.dimension.height,
      width: sectionBasedSetting.dimension.width,
      left: this.planogramService.convertToPixel(sectionBasedSetting.coord.xFromPOG, sectionID) - sectionBasedSetting.dimension.width / 2 + 'px',
      top: this.planogramService.convertToPixel(sectionBasedSetting.coord.yFromPOG, sectionID) - sectionBasedSetting.dimension.height / 2 + 'px',
      opacity: 0.9
    }

    /**Animating the pop up**/
    $component.show();
    document.querySelector<HTMLElement>('.intersect-overlay').style.visibility = "visible";
    setTimeout(() => {
      document.querySelector(`#intersect-chooser-pop-id-${sectionID}`).parentElement.classList.remove('hidden-dialog');
    });
    $positionHolder.hide();
    $overLay.css({ opacity: 0.1 });
    $popWindow.animate(initialCSS, 0, function () {
      //window.setTimeout(function () {
      $popWindow.animate(middleCSS, 300, function () {
        $overLay.animate({ opacity: 0.7 }, 100);
        //hold animation to make user feel the point of intersection
        //window.setTimeout(function () {
        $popWindow.animate(finalCSS, 100, function () {
          $popWindow.animate({ borderRadius: '2px' }, 50, function () {
            $positionHolder.fadeIn("slow");
          });
        })
        // }, 100);

      });
      //}, 100);
    });

    sectionBasedSetting.scope.intersectingPosition = sectionBasedSetting.storage.Position;
    this.intersectingPosition = sectionBasedSetting.storage.Position;
  }

  public closePop(sectionID, dragStart?) {
    this.popupOpen = false;
    var sectionBasedSetting = this.rootFlags[sectionID];
    var $component = $('#intersectionChooserPop-' + sectionID);
    var $popWindow = $component.find('.intersect-window');
    var $overLay = $component.find('.intersect-overlay');
    if (dragStart) {
      document.querySelector<HTMLElement>('.intersect-overlay').style.visibility = "hidden";
      setTimeout(() => {
        document.querySelector(`#intersect-chooser-pop-id-${sectionID}`).parentElement.classList.add('hidden-dialog');
      });
    } else {
      $component.css({ 'display': 'none' });
    }
  }
}
