import { Injectable, NgZone } from '@angular/core';
import { ConsoleLogService } from 'src/app/framework.module';
import { AppConstantSpace } from '../../svg-render/svg-render-common/svg-constants';
import { NotifyService } from '../notify/notify.service';
import { TranslateService } from '@ngx-translate/core';
import { MerchandisableList } from '../shared/shared.service';

@Injectable({
  providedIn: 'root'
})
export class DragDropCopyPasteCommonService {
        
  constructor(private readonly log: ConsoleLogService,
    private readonly notifyService: NotifyService,
    private readonly translateService: TranslateService,
    private readonly zone: NgZone) { }

  public doesPositionsValidateFitCheck( //used only for product library items drop and copy paste for pegboard types
    multiDragableElementsList: any[],
    dropItemData: MerchandisableList,
    isFitCheckRequired: boolean,
    isProdLib?: boolean,
  ): boolean {
    // iterate through all items
    // when item dropped into a standardshelf
    // Auto compute ON - 1. dragged item(one frontshigh height) should be less than shelf merch height to qualify fitcheck on item drag
    // Auto compute OFF - 2. dragged item(frontshighs height + layover + layunder height) should be less than shelf merch height to qualify fitcheck on item drag
    try {
      if (!isFitCheckRequired) {
        return true;
      }
      let totalSquareToDrop = 0;
      let availableSquare = 0,
        totalLinear = 0;
      for (let i = multiDragableElementsList.length - 1; i >= 0; i--) {
        let dragElementItemData = multiDragableElementsList[i];
        let ItemHt: number, ItemWidth: number, ItemDepth: number;
        if (isProdLib) {
          ItemHt = parseFloat(dragElementItemData.ProductPackage.Height);
          ItemWidth = parseFloat(dragElementItemData.ProductPackage.Width);
          ItemDepth = parseFloat(dragElementItemData.ProductPackage.Depth);
          if (dragElementItemData.temp && !dropItemData.Fixture.AutoComputeFronts) {
            ItemHt = Math.max(ItemHt, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Height));
            ItemWidth = Math.max(ItemWidth, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Width));
            ItemDepth = Math.max(ItemDepth, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Depth));
          }
        } else {
          ItemHt = parseFloat(dragElementItemData.Position.ProductPackage.Height);
          ItemWidth = parseFloat(dragElementItemData.Position.ProductPackage.Width);
          ItemDepth = parseFloat(dragElementItemData.Position.ProductPackage.Depth);
          if (dragElementItemData.temp && !dropItemData.Position.Fixture.AutoComputeFronts) {
            ItemHt = Math.max(ItemHt, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Height));
            ItemWidth = Math.max(ItemWidth, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Width));
            ItemDepth = Math.max(ItemDepth, parseFloat(dragElementItemData.temp.copiedFromPos.Dimension.Depth));
          }
        }

        dragElementItemData.UPC =
          dragElementItemData.UPC ||
          (dragElementItemData.temp && dragElementItemData.temp.copiedFromPos.Position.Product.UPC);
        let ItemFullHt = ItemHt;
        if (dropItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
          totalLinear += ItemWidth;
          if (totalLinear > dropItemData.unUsedLinear) {
            this.notify('Fit check error required linear is more than Unused Linear', 'Ok');
            //this.dragDropUtilsService.removePanelBluring(); //commenting for copy paste test
            return false;
          }
        } else if (
          dropItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
          dropItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
        ) {
          totalSquareToDrop = totalSquareToDrop + (ItemWidth * ItemHt);
          if (totalSquareToDrop > dropItemData.Fixture.AvailableSquare) {
            this.notify('Fit check error required square is more than available square', 'Ok');
            //this.dragDropUtilsService.removePanelBluring(); //commenting for copy paste test
            return false;
          }
        } else if (dropItemData.ChildDimension.Height < ItemHt && dropItemData.Fixture.AutoComputeFronts && !dropItemData.Fixture.IgnoreMerchHeight) {
          this.notify(
            this.translateService.instant('ONE') +
            '(' +
            dragElementItemData.UPC +
            ' - ' +
            ItemHt.toFixed(2) +
            ' x' +
            ItemWidth.toFixed(2) +
            'x' +
            ItemDepth.toFixed(2) +
            ') ' +
            this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
            ' ' +
            dropItemData.ChildDimension.Height.toFixed(2) +
            '.',
            'Ok',
          );
          return false;
        } else if (dropItemData.ChildDimension.Height < ItemFullHt && !dropItemData.Fixture.AutoComputeFronts && !dropItemData.Fixture.IgnoreMerchHeight) {
          this.notify(
            this.translateService.instant('ONE') +
            '(' +
            dragElementItemData.UPC +
            ' - ' +
            ItemHt.toFixed(2) +
            ' x' +
            ItemWidth.toFixed(2) +
            'x' +
            ItemDepth.toFixed(2) +
            ') ' +
            this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
            ' ' +
            dropItemData.ChildDimension.Height.toFixed(2) +
            '.',
            'Ok',
          );
          return false;
        }
      }
    } catch (e) {
      this.log.error('Dragdrop fail: doesPositionsValidateFitCheck' + e.stack);
      this.log.error(
        ':AngularDragDrop > Method > doesPositionsValidateFitCheck: params : multiDragableElementsList : ',
        multiDragableElementsList,
        ' : dropItemData : ',
        dropItemData,
        e,
      );
    }
    return true;
  }

  public fitCheckNeededPos(selectedItems: any[], containerItems: any[]): any[] {
    let posArry = [];
    let flag = false;
    for (let k = 0; k < containerItems.length; k++) {
      //$('#' + containerItems[k].$id + ' div ').css({ 'border': '' });
      flag = false;
      for (let j = 0; j < selectedItems.length; j++) {
        let eachPositionItemData = selectedItems[j];
        if (eachPositionItemData.$id == containerItems[k].$id) {
          flag = true;
        }
      }
      if (!flag) {
        posArry.push(containerItems[k]);
      }
    }
    return posArry;
  }

  private notify(message: string, action?: string): void {
    this.zone.run(() => {
        if (action) {
            this.notifyService.warn(message, action);
        }
        else {
            this.notifyService.warn(message);
        }
    })
  }
}
