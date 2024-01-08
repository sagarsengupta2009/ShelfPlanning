import { Injectable } from '@angular/core';
import { FixtureList } from '../../../common/shared/shared.service';
import { Position } from 'src/app/shared/classes/position';
import { AppConstantSpace } from 'src/app/shared/constants';
import { Modular } from 'src/app/shared/classes';

@Injectable({
  providedIn: 'root'
})
export class AllocateUtilitiesService {

  constructor() { }

  public updatePAFixtureKey(fixture: FixtureList, parent: Modular): void {
    fixture.Key = `${+fixture.getXPosToPog().toFixed(2)}_${+fixture.getYPosToPog().toFixed(2)}`;
    fixture.ParentKey = parent.Key;
    fixture.Children.forEach((child) => {
      if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        this.updatePaPositionKey(child);
      }
    });
  }

  public updatePaPositionKey(item: Position): void {
    if (item.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
      item.ParentKey = item.parent.Key;
      item.Key = `${item.ParentKey}_${item.Position.Product.ProductKey}`;
    }
  }

  public updatePaModularKey(modular: Modular): void {
    modular.Key = `Modular_${+modular.Location.X.toFixed(2)}`;
    // @karthik PA has issues when location Y is set to null, handling this on backend may need quite some efforts, hence updating manually here.
    modular.Location.Y = 0;
    modular.Children.forEach((child) => {
      if (child.ObjectDerivedType !== AppConstantSpace.SHOPPINGCARTOBJ) {
        this.updatePAFixtureKey(child, modular);
      }
    });
  }

  /**
   * The challenge here is, this will be a one time operation and is not dynamic as that of highlight functionality.
   * Only the items will be dynamic. Hence handling this in style it of nested component will result in unnecessary calculations and tax on the system.
   * Hence toggling the class manually only when required to have minimal impact on performance.
   *  */
  public showItemsWithoutBlock(positions: Position[], sectionId: string): void {
    positions.forEach((position) => {
      if (!position.Position.IdBlock) {
        document.querySelectorAll(`.${position.$id}${sectionId}`).forEach((item) => {
          item.classList.add('show-items-without-blocks');
        })
      }
    })
  }

  public resetItemsWithoutBlock(): void {
    document.querySelectorAll(`.show-items-without-blocks`).forEach((item) => {
      item.classList.remove('show-items-without-blocks');
    })
  }
}
