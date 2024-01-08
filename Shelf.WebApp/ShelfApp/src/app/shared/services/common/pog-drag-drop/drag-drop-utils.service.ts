import { Injectable } from '@angular/core';
import * as _ from 'lodash';
import { ConsoleLogService } from 'src/app/framework.module';
import { IDragDrop } from 'src/app/shared/drag-drop.module';
import {
  AppConstantSpace, Utils, EmptyArray, DropTypesToPositions,
  DropTypesToFixtures, DropTypesToSections, DropTypesToModulars,
} from 'src/app/shared/constants';
import {
  SharedService, PogDragDropService, PanelService, PlanogramService, PlanogramStoreService
} from 'src/app/shared/services';
import { PanelIds } from 'src/app/shared/models/planogram-enums';
import { ObjectListItem } from '../shared/shared.service';
import { PanelSplitterViewType } from 'src/app/shared/models';

@Injectable({
  providedIn: 'root'
})
export class DragDropUtilsService {

  constructor(
    private readonly log: ConsoleLogService,
    private readonly planogramService: PlanogramService,
    private readonly panelService: PanelService,
    public sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
  ) { }

  // TODO: find alternative angular code (DOM manipulation, depricated feature usage)
  public cancelDragOnESC = function (obj) {
    var dragdrop = this;
    $(document).keyup(function (e) {
      e.preventDefault();
      if ((e.which === 27 || e.keyCode === 27) && $('.ui-draggable-dragging').length != 0) {
        obj.cancelDragging = true;
        dragdrop.revertBackItems(obj);
        $('.ui-draggable-dragging').draggable({
          'revert': true
        }).trigger('mouseup');
        $('#multipleDragItems').html('');
        return false;
      }
    });
  }

  public updateFixtureMovement = function (option, sectionId) {
    //Y axis movement conditions will come here.
    return true;
  }

  /** What can be dropped to this PlanogramObject? */
  public getTargetTypes(obj: IDragDrop): string[] {
    if (!obj.ObjectDerivedType) {
      this.log.info(`getTargetTypes not derived for PlanogramObject`, obj);
      return EmptyArray;
    }
    switch (obj.ObjectDerivedType) {
      case AppConstantSpace.ANNOTATION: {
        return EmptyArray;
      }
      case AppConstantSpace.POSITIONOBJECT:
      case AppConstantSpace.GRILLOBJ: {
        return DropTypesToPositions;
      }
      case AppConstantSpace.STANDARDSHELFOBJ:
      case AppConstantSpace.PEGBOARDOBJ:
      case AppConstantSpace.COFFINCASEOBJ:
      case AppConstantSpace.SLOTWALLOBJ:
      case AppConstantSpace.CROSSBAROBJ:
      case AppConstantSpace.BASKETOBJ: {
        return DropTypesToFixtures;
      }
      case AppConstantSpace.SECTIONOBJ: {
        return DropTypesToSections;
      }
      case AppConstantSpace.MODULAR: {
        return DropTypesToModulars;
      }
      case 'Annotation-dropper': {
        return [AppConstantSpace.ANNOTATION];
      }
      default: {
        this.log.info(`getTargetTypes went to default case for PlanogramObject.ObjectDerivedType: ${obj.ObjectDerivedType}`, obj);
        return EmptyArray;
      }
    }
  }

  public startFix = function (ui, scaleFactor) {
    ui.helper.tweakedOriginalPosition = {};
    ui.helper.tweakedOriginalPosition.left = ui.position.left / scaleFactor;
    ui.helper.tweakedOriginalPosition.top = ui.position.top / scaleFactor;
    ui.position.top = 0;
    ui.position.left = 0;
  }

  public setOffsets(ngDragDropService, initDropCords, isByCoordinate) {
    var dragPos = ngDragDropService.dragItemData;
    var parentItemData = this.sharedService.getObject(ngDragDropService.dragItemData.$idParent, ngDragDropService.sectionId)
    var diff = 0;
    if (parentItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || parentItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
      if (parentItemData.Dimension.Depth < parentItemData.Dimension.Height) {
        diff = parentItemData.Dimension.Depth - parentItemData.Dimension.Height;
      }
    }
    var locX = dragPos.Location.X;
    var locY = 0;
    if (parentItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || parentItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
      locY = dragPos.Location.Y - parentItemData.Location.Z - diff;
    } else {
      locY = dragPos.Location.Y;
    }

    //to calculate relative distances
    if (!isByCoordinate) {
      ngDragDropService.offfsetX = initDropCords.left;
      ngDragDropService.offfsetY = initDropCords.top;
      ngDragDropService.OffsetX = this.planogramService.convertToPixel((initDropCords.left), ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
      ngDragDropService.OffsetY = this.planogramService.convertToPixel((initDropCords.top), ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
    } else {
      ngDragDropService.offfsetX = initDropCords.left - locX;
      ngDragDropService.offfsetY = initDropCords.top - locY;
      ngDragDropService.OffsetX = this.planogramService.convertToPixel(ngDragDropService.offfsetX, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
      ngDragDropService.OffsetY = this.planogramService.convertToPixel(ngDragDropService.offfsetY, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
    }
  }

  public checkItemDraggable = function (ui, scaleFactor) {
    if ((ui.helper.tweakedOriginalPosition.left - ui.position.left / scaleFactor) > (5 / scaleFactor) || (ui.helper.tweakedOriginalPosition.top - ui.position.top / scaleFactor) > (5 / scaleFactor) || (ui.helper.tweakedOriginalPosition.left - ui.position.left / scaleFactor) < -(5 / scaleFactor) || (ui.helper.tweakedOriginalPosition.top - ui.position.top / scaleFactor) < -(5 / scaleFactor)) {
      return true;
    } else { return false };
  }

  public dragFix = function (ui, scaleFactor) {
    // find change in left
    var changeLeft = ui.position.left - ui.originalPosition.left;
    // adjust new left by our zoomScale
    var newLeft = ui.originalPosition.left + (changeLeft / scaleFactor);
    // find change in top
    var changeTop = ui.position.top - ui.originalPosition.top;
    // adjust new top by our zoomScale
    var newTop = ui.originalPosition.top + (changeTop / scaleFactor);
    ui.position.left = newLeft;
    ui.position.top = newTop;
  }

  public setCursorPos = function (event, ui, ngDragDropService) {
    event.clientX = event.clientX - ngDragDropService.OffsetX;
    event.clientY = event.clientY + ngDragDropService.OffsetY;
    event.screenX = event.screenX + ngDragDropService.OffsetX;
    event.screenY = event.screenY - ngDragDropService.OffsetY;
  }

  public togglejQueryHelperCloneOnCtrlKey = function (ngDragDropService) {
    $('#' + ngDragDropService.sectionId).find('.Position').mousedown(function (e) {
      if (e.ctrlKey) {
        $(this).draggable({ 'helper': 'clone' });
      } else {
        $(this).draggable({ 'helper': 'original' });
      }
    });
  }

  public setCursor = function (ngDragDropService: PogDragDropService) {
    // no cursor on iPad/iDevices
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      return;
    }
    else if (ngDragDropService.isPositionDragging || ngDragDropService.isShoppingCartItemDragging) {
      if (!$('.over').is(":visible")) {
        if (ngDragDropService.cursorsStyle != 'no-drop') {
          document.body.style.cursor = 'no-drop';
          ngDragDropService.cursorsStyle = 'no-drop';
        }
      } else {
        if (ngDragDropService.cursorsStyle != 'move') {
          document.body.style.cursor = 'move'
          ngDragDropService.cursorsStyle = 'move';
        }
      }
    }
  }

  //TODO @karthik this may not be required, but cannot be decided at this point as this may be required when ghost image based off fixture type is addressed.
  public showGhostImages(ngDragDropService: PogDragDropService, droppableItemdata: ObjectListItem) {
    //Tweak to get peg info before creating viewModel while draging over pegboard
    var getPegInfo = function (currentObject) {
      var PegOffsetX;
      if ((currentObject.ProductPackage.hasOwnProperty('XPegHole')) && (currentObject.ProductPackage.XPegHole != null) && (currentObject.ProductPackage.XPegHole != 0)) {
        PegOffsetX = currentObject.ProductPackage.XPegHole;
      } else {
        PegOffsetX = currentObject.ProductPackage.Width / 2;
      }
      var pegYDefaultOffset = .25
      if (this.sharedService.measurementUnit == 'METRIC') {  //metric
        pegYDefaultOffset = .25 * 2.54;
      }
      var PegOffsetY;
      if ((currentObject.ProductPackage.hasOwnProperty('YPegHole')) && (currentObject.ProductPackage.YPegHole != null) && (currentObject.ProductPackage.YPegHole != 0)) {
        PegOffsetY = currentObject.ProductPackage.YPegHole;
      } else {
        PegOffsetY = currentObject.ProductPackage.Height - pegYDefaultOffset;
      }
      return {
        OffsetX: PegOffsetX,
        OffsetY: PegOffsetY,
      };
    }
    if ((ngDragDropService.isPositionDragging || ngDragDropService.isShoppingCartItemDragging)) {
      var offsetX = 0;
      var offsetY = 0;
      if (Utils.checkIfPegType(droppableItemdata)) {
        var currentObject = ngDragDropService.multiDragableElementsList[0];
        var pegInfo = getPegInfo(currentObject);
        offsetX = this.planogramService.convertToPixel(pegInfo.OffsetX, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
        offsetY = this.planogramService.convertToPixel(pegInfo.OffsetY, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;

      }
      ngDragDropService.selector = "#multipleDragItems";
      ngDragDropService.OffsetX = offsetX;
      ngDragDropService.OffsetY = offsetY;
    }
  }

  // TODO @karthik delete if not required.
  public showGhostImagesProducts = function (event, ngDragDropService: PogDragDropService) {

    if (ngDragDropService.isPositionDragging || ngDragDropService.isShoppingCartItemDragging) {
      var offsetX = 0;
      var offsetY = 0;
      if ($('.over').hasClass('child_' + AppConstantSpace.PEGBOARDOBJ)) {
        for (var obj = 0; obj < ngDragDropService.multiDragableElementsList.length; obj++) {
          var currentObject = ngDragDropService.multiDragableElementsList[obj];
          var pegInfo = currentObject.getPegInfo();
          offsetX = this.planogramService.convertToPixel(pegInfo.OffsetX, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
          offsetY = this.planogramService.convertToPixel(pegInfo.OffsetY, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
          break;
        }
      }
      $("#multipleDragItems").css({
        left: event.clientX - offsetX,
        top: event.clientY + offsetY
      });
    }
  }

  public setFixtureImages = function (ngDragDropService: PogDragDropService) {
    var left = 0;
    //var imgWidthRef = 200;//this.planogramService.convertToPixel(ngDragDropService.dragItemData.Dimension.Width, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
    //var imgHeightRef = 250;//this.planogramService.convertToPixel(ngDragDropService.dragItemData.Dimension.Height, ngDragDropService.sectionId) * ngDragDropService.scaleFactor;
    var imgRef = '/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/no-img.png';
    if (!_.isUndefined(ngDragDropService.dragItemData.Image)) {
      imgRef = ngDragDropService.dragItemData.Image;
    }
    var imgTagHTML = '<img class="cloned-img" style="position:absolute;bottom:0px;top: auto;left:' + left + 'px;height:75px;width:auto;" src=\'' + imgRef + '\'>';
    $('#multipleDragItems').html("<div class='cloned-img-holder " + ngDragDropService.getDisplayMode() + "' style='left:2px'>" + imgTagHTML + "</div>").css({
      "z-index": 9999,
      position: "fixed",
      padding: 0
    }).show();
  }


  public revertBackFixtureGallery = function () {
    $('#fixtureGalleryGhostDragItem').hide();
    $('#merchandisingareaSeparator').hide();
    $('.collection-fixture-item').css({
      'position': 'relative',
      'left': '0px',
      'top': '0px'
    });
  }

  public revertBackItem = function (id, sectionID) {
    $('#merchandisingareaSeparator').hide();
    var draggableScope = { itemData: this.sharedService.getObject(id, sectionID) };//$('#' + id);
    var shelfItemData = draggableScope.itemData;

    if (shelfItemData && !shelfItemData.selected) {
      this.planogramService.addToSelectionByObject(shelfItemData, sectionID);
    }

    $('#' + id).show().css({
      'top': 'auto',
      'bottom': this.planogramService.convertToPixel(draggableScope.itemData.Location.Y, draggableScope.itemData.$sectionID) + 'px',
      'left': this.planogramService.convertToPixel(draggableScope.itemData.Location.X, draggableScope.itemData.$sectionID) + 'px',
      //'z-index': 0
    });
  }

  public revertBackItems = function (ngDragDropService: PogDragDropService) {
    // Because StandardShelf and  Bay ngDragDropService.multiDragableElementsList Will Zero
    if (ngDragDropService.isPositionDragging || ngDragDropService.isShoppingCartItemDragging) {
      for (var obj = 0; obj < ngDragDropService.multiDragableElementsList.length; obj++) {
        var elementRef = ngDragDropService.multiDragableElementsList[obj];
        var idRef = elementRef.$id;
        if (ngDragDropService.isShoppingCartItemDragging) {
          $('#' + idRef).show().css({
            'left': 0,
            'top': 'auto'
          });
        } else {
          this.revertBackItem(idRef);
        }
      }
    }
    if (ngDragDropService.isStandShelfDragging || ngDragDropService.isBayDragging
      || ngDragDropService.isPegBoardDragging || ngDragDropService.isCrossbarDragging
      || ngDragDropService.isSlotwallDragging || ngDragDropService.isCoffinCaseDragging
      || ngDragDropService.isBasketDragging || ngDragDropService.isBlockFixtureDragging) {
      this.revertBackItem(ngDragDropService.dragItemData.$id);
    }

  }

  public getNextZIndex = function () {
    this.zIndex += 10;
    return this.zIndex;
  }

  // TODO: Why can't this be hooked to the component?
  public addPanelBluring(activePanelId: PanelIds) {
    switch (activePanelId) {
      case PanelIds.One: {
        $('#sapp-panel-blur-panelTwo').addClass('panel-bluring');
        $('#sapp-panel-blur-panelOne').removeClass('panel-bluring');
        break;
      }
      case PanelIds.Two: {
        $('#sapp-panel-blur-panelOne').addClass('panel-bluring');
        $('#sapp-panel-blur-panelTwo').removeClass('panel-bluring');
        break;
      }
    }
  }

  public removePanelBluring() {
    //performance fix in IE
    /* 20th, April, 2016 : Performance Fix for IE 11*/
    //return;
    $('#sapp-panel-blur-panelOne').removeClass('panel-bluring');
    $('#sapp-panel-blur-panelTwo').removeClass('panel-bluring');
  }

  public findBlurInfo(activeSectionId: string): { inactiveSectionId: string, activePanelId: PanelIds } {
    const closestPanelId = this.findClosestPanelId(activeSectionId);
    const activePanelId = this.panelService.getActivePanelId(activeSectionId, closestPanelId);
    const inactiveSectionId = this.panelService.getInactiveSectionId(activePanelId);
    const blurInfo = { activePanelId: activePanelId, inactiveSectionId: inactiveSectionId }
    return blurInfo;
  }
  private findClosestPanelId(activeSectionId: string): PanelIds {
    if (this.planogramStore.splitterViewMode.displayMode === PanelSplitterViewType.Full) {
          return this.panelService.activePanelID as PanelIds;
    }
    // Find closest panel element
    const sectionElement = document.getElementById(`sectionContainer_${activeSectionId}`);
    const closestPanelElement = sectionElement && $(sectionElement).closest('.sapp-panel');

    // Read panel id of closest panel
    const panelId = closestPanelElement && closestPanelElement.attr('id');
    return panelId ? panelId as PanelIds : PanelIds.One;
  }

}
