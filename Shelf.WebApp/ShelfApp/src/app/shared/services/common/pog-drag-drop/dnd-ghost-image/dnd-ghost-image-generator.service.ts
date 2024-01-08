import { Injectable } from '@angular/core';
import { cloneDeep, isEmpty } from 'lodash';
import { Position } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants';
import { DragOrigins, IBeginDragEventArgs } from 'src/app/shared/drag-drop.module';
import { GhostImage, NextPositionLeftData, SvgStringInput } from 'src/app/shared/models';
import { PositionSvgRenderService } from '../../..';
import { PlanogramService } from '../../planogram/planogram.service';
import { MerchandisableList, SharedService, AllFixtureList } from '../../shared/shared.service';
import { PogDragDropService } from '../pog-drag-drop.service';
@Injectable({
  providedIn: 'root'
})
export class DndGhostImageGeneratorService {

  public dragDropService: PogDragDropService;
  //TODO @karthik this needs to be moved to local assets
  private readonly NO_PREVIEW = `/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/no-img.png`;

  constructor(private readonly planogramService: PlanogramService,
    private readonly positionSvgRender: PositionSvgRenderService,
    private readonly sharedService: SharedService) { }

  //TODO @karthik eliminate PogDragDropService dependency from all the methods in this service.
  public generateGhostImageHTML(mode: number, droppableItemdata: MerchandisableList, canGenerateSSGImg?: boolean): GhostImage {
    let imgTagHTML = "", pegImgTagHTML = "", coffinImgTagHTML = "";
    let left = 0, width, height, itemImage, itemColor, draggedPos = false;
    let pegHeight = 0, pegWidth = 0, pegDIVOffsetX = 0, pegDivOffsetY = 0, posLeft = 0, posTop = 0, pegOffsetX;
    let minXPos, maxXEndPos, minYPos, maxYEndPos, pegGhostHt = 0, pegGhostWt = 0, diffPegleft = 0;
    //If all the items are from the same peg need to create div for all the itmes with relative distances
    if (this.dragDropService.isFromSamePeg) {
      minXPos = this.dragDropService.multiDragableElementsList.filter(item => item.Location.X === Math.min(...this.dragDropService.multiDragableElementsList.map(item => item.Location.X)))[0];
      maxXEndPos = this.dragDropService.multiDragableElementsList.filter(item => item.Location.X === Math.max(...this.dragDropService.multiDragableElementsList.map(item => item.Location.X)))[0];
      minYPos = this.dragDropService.multiDragableElementsList.filter(item => item.Location.Y === Math.min(...this.dragDropService.multiDragableElementsList.map(item => item.Location.Y)))[0];
      maxYEndPos = this.dragDropService.multiDragableElementsList.filter(item => item.Location.Y === Math.max(...this.dragDropService.multiDragableElementsList.map(item => item.Location.Y)))[0];

      pegGhostHt = this.planogramService.convertToPixel(((maxYEndPos.Location.Y + droppableItemdata.linearHeightPosition(maxYEndPos)) - minYPos.Location.Y), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      pegGhostWt = this.planogramService.convertToPixel(((maxXEndPos.Location.X + droppableItemdata.linearWidthPosition(maxXEndPos, null, null)) - minXPos.Location.X), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      pegImgTagHTML = '<div style="height:' + pegGhostHt + 'px; width:' + pegGhostWt + 'px;">'
      pegDivOffsetY = pegGhostHt - this.planogramService.convertToPixel((this.dragDropService.dragItemData.Location.Y - minYPos.Location.Y), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      pegDIVOffsetX = this.planogramService.convertToPixel((this.dragDropService.dragItemData.Location.X - minXPos.Location.X), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
    }

    if (Utils.checkIfPegType(droppableItemdata)) {
      //In ghostimage first item should be at zero location so assigning pefofffset to item offsetX
      pegOffsetX = this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) * this.dragDropService.multiDragableElementsList[0].getPegInfo().OffsetX;
    }

    let offset = this.planogramService.convertToPixel(this.dragDropService.offfsetX, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
    for (let obj = 0; obj < this.dragDropService.multiDragableElementsList.length; obj++) {
      //default no image
      let imgRef = this.NO_PREVIEW;
      let currentObject = this.dragDropService.multiDragableElementsList[obj];
      itemImage = currentObject.Position.ProductPackage.Images.front;
      itemColor = currentObject.getStringColor();
      width = droppableItemdata.linearWidthPosition(currentObject, null, null);
      pegHeight = currentObject.Position.ProductPackage.Height;
      pegWidth = currentObject.Position.ProductPackage.Width;
      height = droppableItemdata.linearHeightPosition(currentObject);
      let parentItemData = this.sharedService.getObject(currentObject.$idParent, this.dragDropService.sectionId) as MerchandisableList;

      //if image exists override default
      if (itemImage != null) {
        imgRef = itemImage;
      }
      //take scale factor into consideration
      let imgWidthRef = this.planogramService.convertToPixel(width, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      let imgHeightRef = this.planogramService.convertToPixel(height, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      let pegImgHeightRef = this.planogramService.convertToPixel(pegHeight, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      let pegImgWidthRef = this.planogramService.convertToPixel(pegWidth, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      //if vivid use img else color
      let itemHt = this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) * height;
      let itemwt = this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) * width;
      let pegItemData;
      if (Utils.checkIfPegType(droppableItemdata)) {
        pegItemData = droppableItemdata.getPegHoleInfo();
      }
      let SVGHeader = '';
      //if (index == -1) {
      SVGHeader = '<g transform="translate(0, ' + itemHt + ') scale(' + this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) + ', ' + -this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) + ') ">';
      let YScaleFactor = 1;
      if (('FrontScale' in currentObject.$packageBlocks) && (currentObject.$packageBlocks.FrontScale != 1)) {
        YScaleFactor = currentObject.$packageBlocks.FrontScale;
      }
      if (YScaleFactor != 1) {
        let move = currentObject.Dimension.Height * (1 - YScaleFactor);
        SVGHeader += '<g transform="translate(0,' + move + ') scale(1,' + YScaleFactor + ')">';
      } else {
        SVGHeader += '<g>';
      }

      /* uncomment when supporting dynamic ghost image change based on target fixture
      Need to check why this cloneDeep is required
      let currentObjectPBCopy = cloneDeep(currentObject.$packageBlocks);

      if (currentObject.$packageBlocks.length > 1) {
        currentObject.$packageBlocks = [currentObject.$packageBlocks[0]];
      }
      */

      if (Utils.isNullOrEmpty(canGenerateSSGImg)) {
        coffinImgTagHTML += '<div style="left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute;">';
        coffinImgTagHTML += '<svg  style="position:absolute;bottom:0px;top: auto; left:' + left + 'px;height:' + imgHeightRef + 'px;width:' + imgWidthRef + 'px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + SVGHeader + '<g>' + this.positionSvgRender.SVGPositionRenderer(currentObject, this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId), { ghostImgGen: true }, true, currentObject.$sectionID) + '</g></g></svg></div>';
      } else {
        coffinImgTagHTML = this.dragDropService.imgHTML.coffinImgTagHTML;
      }

      //currentObject.$packageBlocks = currentObjectPBCopy; uncomment when supporting dynamic ghost image change based on target fixture

      if (Utils.isNullOrEmpty(canGenerateSSGImg)) {
        imgTagHTML += '<div style="left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute;">';
        if (isEmpty(currentObject.$packageBlocks)) {

          imgTagHTML += this.getDivHtml(currentObject, pegImgHeightRef, pegImgWidthRef, imgWidthRef, imgRef, left, pegItemData, 'auto', 0, mode, itemColor, width);
          imgTagHTML += '</div>';
        } else {
          imgTagHTML += this.getSVGString({ left, imgHeightRef, imgWidthRef, SVGHeader, currentObject, pegItemData, top: 'auto' });
        }
        //}
      } else {
        imgTagHTML = this.dragDropService.imgHTML.imgTagHTML;
      }


      if (this.dragDropService.isFromSameFixture && !this.dragDropService.isFromSS) {
        posLeft = 0, posTop = 0;

        if (this.dragDropService.isFromSamePeg) {
          posTop = pegGhostHt - this.planogramService.convertToPixel((currentObject.Location.Y - minYPos.Location.Y + height), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
          posLeft = this.planogramService.convertToPixel((currentObject.Location.X - minXPos.Location.X), this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
        } else {
          //If the items are from diffrent pegs
          //to calculate the distance b/w positions
          if (Utils.checkIfPegType(droppableItemdata)) {
            posLeft = this.getNextPosLeft({ currentObject, droppableItemdata, diffPegleft, pegOffsetX });
            diffPegleft = posLeft + imgWidthRef;
          } else {
            posLeft = left;
          }
        }
        if (droppableItemdata.getType() != parentItemData.getType()) {
          pegImgTagHTML += '<div style="left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute;height:' + pegImgHeightRef + 'px;width:' + itemwt + 'px;">';
          pegImgTagHTML += this.getDivHtml(currentObject, pegImgHeightRef, pegImgWidthRef, imgWidthRef, imgRef, posLeft, pegItemData, posTop, 0, mode, itemColor, width);
        } else {
          pegImgTagHTML += '<div style="left: 0px; right: 0px; top: 0px; bottom: 0px; position: absolute;height:' + itemHt + 'px;width:' + itemwt + 'px;">';
          pegImgTagHTML += this.getSVGString({ left: posLeft, imgHeightRef: itemHt, imgWidthRef: itemwt, SVGHeader, currentObject, pegItemData, top: posTop.toString() });
        }
      } else {
        let pegImgWidth = 0, tempPegImgTagHTML = '';
        if (Utils.checkIfPegType(droppableItemdata)) {
          pegItemData = droppableItemdata.getPegHoleInfo();
          posLeft = this.getNextPosLeft({ currentObject, droppableItemdata, diffPegleft, pegOffsetX });
          if ((Utils.checkIfPegType(parentItemData)) && droppableItemdata.getType() == parentItemData.getType()) {
            tempPegImgTagHTML = this.getSVGString({ left: 0, imgHeightRef: itemHt, imgWidthRef: itemwt, SVGHeader, currentObject, pegItemData, top: '0' });
          } else {
            for (let i = 0; i < currentObject.Position.FacingsX; i++) {
              if (mode != 0) {
                tempPegImgTagHTML += '<div class="cloned-img" style="position:absolute;bottom:0px;top: auto;background-color:' + itemColor + ';left:' + pegImgWidth + 'px;height:' + pegImgHeightRef + 'px;width:' + pegImgWidthRef + 'px;" class="no-img-text"></div>'
              } else {
                tempPegImgTagHTML += '<img class="cloned-img" style="position:absolute;bottom:0px;top: auto;left:' + pegImgWidth + 'px;height:' + pegImgHeightRef + 'px;width:' + pegImgWidthRef + 'px;" src=\'' + imgRef + '\'>';
              }
              let gapX = Math.ceil((width + currentObject.Position.GapX) / pegItemData.PegIncrementX) * pegItemData.PegIncrementX - width;
              gapX = this.planogramService.convertToPixel(currentObject.Position.GapX, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
              pegImgWidth += pegImgWidthRef + gapX;
            }
          }
        }
        pegImgTagHTML += `<div style="position:absolute;bottom:auto;top: 0px;left:${posLeft}px;height:${pegImgHeightRef}px;width:${imgWidthRef}px;">`;
        pegImgTagHTML += tempPegImgTagHTML;
        pegImgTagHTML += '</div>';
        diffPegleft = posLeft + itemwt;
      }
      left += imgWidthRef;
      // add offset till the dragged item comes
      if ((!this.dragDropService.isCloneMode && currentObject != this.dragDropService.dragItemData && !draggedPos && !this.dragDropService.isFromSamePeg) || (this.dragDropService.isCloneMode && currentObject.$id != this.dragDropService.dragItemData.$id)) {
        offset = offset + imgWidthRef;
      } else {
        draggedPos = true;
      }
    }
    if (this.dragDropService.isFromSamePeg) {
      pegImgTagHTML += "</div>"
    }
    this.dragDropService.OffsetX = offset;
    imgTagHTML = "<div class='cloned-img-holder " + this.dragDropService.getDisplayMode() + "' style='left:2px'>" + imgTagHTML + "</div>";
    pegImgTagHTML = "<div class='cloned-img-holder " + this.dragDropService.getDisplayMode() + "' style='left:2px'>" + pegImgTagHTML + "</div>";
    coffinImgTagHTML = "<div class='cloned-img-holder " + this.dragDropService.getDisplayMode() + "' style='left:2px'>" + coffinImgTagHTML + "</div>";
    return { 'imgTagHTML': imgTagHTML, 'coffinImgTagHTML': coffinImgTagHTML, 'pegImgTagHTML': { 'pegImgTagHTML': pegImgTagHTML, 'pegDIVOffsetX': pegDIVOffsetX, 'pegDivOffsetY': pegDivOffsetY } };
  }

  public getFixtureGalleryGhostImages(options: IBeginDragEventArgs): HTMLElement {
    let imgRef: string = this.NO_PREVIEW;
    let rectRef;
    let svg = null;
    if (options.data.dragOriginatedFrom == DragOrigins.ClipBoard) {
      let clipid = options.data.$id.split("|")[1];
      svg = document.querySelector(`#clip-${clipid} svg`).outerHTML;
    }
    else if (!this.dragDropService.dragItemData.Image) {
      rectRef = this.generateFixtureGhostImage(this.dragDropService.dragItemData, this.dragDropService.sectionId);
    }
    else {
      imgRef = this.dragDropService.dragItemData.Image;
    }
    let heightUnit = this.dragDropService.dragItemData.Fixture.Height;
    let widthUnit = this.dragDropService.dragItemData.Fixture.Width;
    let heightPX = this.planogramService.convertToPixel(heightUnit, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
    let widthPX = this.planogramService.convertToPixel(widthUnit, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
    let imgTagHTML = $('<img class="cloned-img" style="position: absolute;bottom: 0px;top: 0px;left: 0px;height: 100%;width: 100%;padding: 0px;" src=\'' + imgRef + '\'>');
    let imgHolder = $("<div class='cloned-img-holder " + this.dragDropService.getDisplayMode() + "' style='left: 0px;right: 0px;top: 0px;bottom: 0px;height: 100%;width: 100%;'></div>");
    let clonedImgHolder = $("<div></div>");

    imgHolder.append(svg ? svg : imgTagHTML);
    if (!this.dragDropService.dragItemData.Image && options.data.dragOriginatedFrom !== DragOrigins.ClipBoard) {
      imgHolder.append(rectRef);
    } else {
      clonedImgHolder.append(imgHolder);
    }
    clonedImgHolder.css({
      "z-index": 9999,
      "position": "absolute",
      "top": 'auto',
      "bottom": '0px',
      "height": heightPX,
      "width": widthPX,
      'pointer-events': 'none'
    });
    return clonedImgHolder[0];
  }


  public generateFixtureGhostImage(dragItemData: AllFixtureList, sectionID: string): string {
    let heightUnit = dragItemData.Fixture.Height;
    let widthUnit = dragItemData.Fixture.Width;
    let scaleFactor = this.planogramService.rootFlags[sectionID].scaleFactor;
    let heightPX = this.planogramService.convertToPixel(heightUnit, sectionID) * scaleFactor;
    let widthPX = this.planogramService.convertToPixel(widthUnit, sectionID) * scaleFactor;
    return "<div style='width:" + widthPX + "px; height:" + heightPX + "px; border:1px solid black; background-color:" + dragItemData.Color + "'></div>";
  }

  // TODO @karthik itemList based on product lib, position
  public generateGhostImageProductHTML(itemList, sectionID: string, mode: number, isProductPositionDragging?: DragOrigins): GhostImage {
    let imgTagHTML = "";
    let left = 0, width, height, itemImage, itemColor;
    for (let obj = 0; obj < itemList.length; obj++) {
      //default no image
      let imgRef = this.NO_PREVIEW;
      let currentObject = itemList[obj];
      if (isProductPositionDragging) {
        itemImage = currentObject.ProductPackage.Images.front;
        width = currentObject.ProductPackage.Width;
        height = currentObject.ProductPackage.Height;
        itemColor = '#' + '808080';
      } else {
        itemImage = currentObject.Position.ProductPackage.Images.front;
        itemColor = currentObject.getStringColor();
        width = currentObject.Position.ProductPackage.Width;
        height = currentObject.Position.ProductPackage.Height;
      }
      //if image exists override default
      if (itemImage != null) {
        imgRef = itemImage;
      }
      //take scale factor into consideration
      let imgWidthRef = this.planogramService.convertToPixel(width, sectionID) * this.planogramService.rootFlags[sectionID].scaleFactor;
      let imgHeightRef = this.planogramService.convertToPixel(height, sectionID) * this.planogramService.rootFlags[sectionID].scaleFactor;
      //if vivid use img else color
      if (mode == 0) {
        imgTagHTML += '<img class="cloned-img" style="opacity:1 !important;position:absolute;bottom:0px;top: auto;left:' + left + 'px;height:' + imgHeightRef + 'px;width:' + imgWidthRef + 'px;" src=\'' + imgRef + '\'>';

      } else {
        imgTagHTML += '<div class="cloned-img" style="position:absolute;bottom:0px;top: auto;background-color:' + itemColor + ';left:' + left + 'px;height:' + imgHeightRef + 'px;width:' + imgWidthRef + 'px;" class="no-img-text"></div>';

      }
      left += imgWidthRef;

    }
    return { 'imgTagHTML': imgTagHTML, 'coffinImgTagHTML': imgTagHTML, 'pegImgTagHTML': { 'pegImgTagHTML': imgTagHTML, 'pegDIVOffsetX': 0, 'pegDivOffsetY': 0 } };
  }

  //To get the relative distances from dragged item
  private getRelativeCords(eachPosition: Position, droppableItemdata: MerchandisableList): { left: number; top: number } {
    let left = 0, top = 0;
    //@Narendra pegholeinfo
    left = (eachPosition.Location.X + eachPosition.getPegInfo().OffsetX) - (this.dragDropService.dragItemData.Location.X) - this.dragDropService.offfsetX;
    top = (eachPosition.Location.Y + (droppableItemdata.linearHeightPosition(eachPosition) - (eachPosition.computeHeight() - eachPosition.getPegInfo().OffsetY))) - (this.dragDropService.dragItemData.Location.Y) - this.dragDropService.offfsetY;
    return { 'left': left, 'top': top }
  }

  //To get the relative distances from dragged item for coffin case
  private getRelativeCordsForCoffinCase(eachPosition: Position, droppableItemdata: MerchandisableList) {
    let left = 0, top = 0;
    //@Millan
    left = eachPosition.Location.X - (this.dragDropService.dragItemData.Location.X + this.dragDropService.offfsetX);
    top = (eachPosition.Location.Y + droppableItemdata.linearHeightPosition(eachPosition)) - (this.dragDropService.dragItemData.Location.Y) - this.dragDropService.offfsetY;
    return { 'left': left, 'top': top }
  }

  //getting next left of the position for pegboard ghost image
  private getNextPosLeft(data: NextPositionLeftData): number {
    let pegHole = data.currentObject.getPegInfo();
    const PHI = data.droppableItemdata.getPegHoleInfo();
    pegHole.OffsetX = this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) * pegHole.OffsetX;
    PHI.PegIncrementX = this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId) * PHI.PegIncrementX;
    let PegHoleX = data.diffPegleft + pegHole.OffsetX - data.pegOffsetX;

    if (PHI.PegIncrementX < 0.01) PHI.PegIncrementX = 0.01;
    let holeX = Math.ceil((PegHoleX) / PHI.PegIncrementX);
    PegHoleX = holeX * PHI.PegIncrementX;
    let posLeft = PegHoleX - pegHole.OffsetX + data.pegOffsetX;
    if (data.diffPegleft > posLeft) {
      PegHoleX = PegHoleX + PHI.PegIncrementX;
      let holeX = Math.ceil((PegHoleX) / PHI.PegIncrementX);
      PegHoleX = holeX * PHI.PegIncrementX;
      posLeft = PegHoleX - pegHole.OffsetX + data.pegOffsetX;
    }
    return posLeft;
  }

  //Get SVG string
  private getSVGString(data: SvgStringInput) {
    if (data.top != 'auto') { data.top += 'px' }
    data.pegItemData || (data.pegItemData = { ghostImgGen: true });
    let SVGString = '<svg  style="position:absolute;bottom:0px;top: ' + data.top + '; left:' + data.left + 'px;height:' + data.imgHeightRef + 'px;width:' + data.imgWidthRef + 'px;" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">' + data.SVGHeader + '<g>' + this.positionSvgRender.SVGPositionRenderer(data.currentObject, this.planogramService.convertToPixel(this.dragDropService.scaleFactor, this.dragDropService.sectionId), data.pegItemData, true, data.currentObject.$sectionID) + '</g></g></svg></div>'
    return SVGString;
  }

  //Get Div html
  private getDivHtml(currentObject, pegImgHeightRef, pegImgWidthRef, imgWidthRef, imgRef, posLeft, pegItemData, top, bottom, mode, itemColor, width): string {
    if (Utils.isNullOrEmpty(bottom)) {
      bottom = 'auto'
    } else {
      bottom += 'px'
    }
    if (top != 'auto') { top += 'px' }
    let tempPegImgTagHTML = '', pegImgTagHTML = '', pegImgWidth = 0;
    currentObject.Position.FacingsX = currentObject.Position.FacingsX ? currentObject.Position.FacingsX : 1;
    for (let i = 0; i < currentObject.Position.FacingsX; i++) {
      if (mode != 0) {
        tempPegImgTagHTML += '<div class="cloned-img" style="position:absolute;bottom:0px;top: auto;background-color:' + itemColor + ';left:' + pegImgWidth + 'px;height:' + pegImgHeightRef + 'px;width:' + pegImgWidthRef + 'px;" class="no-img-text"></div>'
      } else {
        tempPegImgTagHTML += '<img class="cloned-img" style="position:absolute;bottom:0px;top: auto;left:' + pegImgWidth + 'px;height:' + pegImgHeightRef + 'px;width:' + pegImgWidthRef + 'px;" src=\'' + imgRef + '\'>';
      }
      let gapX = 0;
      if (pegItemData) {
        gapX = Math.ceil((width + currentObject.Position.GapX) / pegItemData.PegIncrementX) * pegItemData.PegIncrementX - width;
      }
      gapX = this.planogramService.convertToPixel(currentObject.Position.GapX, this.dragDropService.sectionId) * this.dragDropService.scaleFactor;
      pegImgWidth += pegImgWidthRef + gapX;
    }

    pegImgTagHTML += '<div style="position:absolute;bottom:' + bottom + ';top: ' + top + ';left:' + posLeft + 'px;height:' + pegImgHeightRef + 'px;width:' + imgWidthRef + 'px;">';
    pegImgTagHTML += tempPegImgTagHTML;
    pegImgTagHTML += '</div>';

    return pegImgTagHTML;
  }

  private sortByYEndPos(positions: Position[]): Position[] {
    return Utils.sortPositions(positions, [{ fun: 'getPosEndY' }], [Utils.ascendingOrder]);
  }

  private sortByXEnd(positions: Position[]): Position[] {
    return Utils.sortPositions(positions, [{ fun: 'getPosPOGEndX' }], [Utils.ascendingOrder]);
  }

}
