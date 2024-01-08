import { BehaviorSubject, Subject } from 'rxjs';
import { Injectable } from '@angular/core';
import { PogSideNaveView, SideNavViewSetting, PogSideNaveViewDefault, AnchorSettings } from '../../models';

@Injectable({ providedIn: 'root' })
export class PogSideNavStateService {
  public sideNavWidth: number;
  public showSideNavigation: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);
  public activeVeiw?: PogSideNaveView = null;
  public shoppingCartView: SideNavViewSetting = { id: PogSideNaveView.SHOPPING_CART, width: 30, isPinned: false, pos: 'right'};
  public clipBoardView:SideNavViewSetting= { id: PogSideNaveView.CLIPBOARD_BOTTOM, width: 30, isPinned: false, pos: 'bottom'};
  public propertiesView: SideNavViewSetting = { id: PogSideNaveView.PROPERTYGRID, width: 30, isPinned: false };
  public productLibView: SideNavViewSetting = { id: PogSideNaveView.PRODUCT_LIBRARY, width: 30, isPinned: false };
  public highlightView: SideNavViewSetting = { id: PogSideNaveView.HIGHLIGHT, width: 30, isPinned: false };
  public chartsView: SideNavViewSetting = { id: PogSideNaveView.CHARTS, width: 30, isPinned: false }
  public sidenavWidthChange: Subject<number> = new Subject<number>();
  public closeSideNav: Subject<boolean> = new Subject<boolean>();
  constructor() {} 

  public getActive(): SideNavViewSetting | undefined {
    return this.getAllViews().find(it => it.id == this.activeVeiw);
  }
  public setDefaultSideNavProperties(anchorSetting: AnchorSettings): void {
    for (const [k, v] of Object.entries(anchorSetting)) {
      if (v.isActive && v.pinned) {
        this.activeVeiw = PogSideNaveViewDefault[k]
      }
    }
    if (anchorSetting['sappHighlightTool'].pinned) {
      this.highlightView.isPinned = true;
    }
    if (anchorSetting['sappPropertyGridDialog'].pinned) {
      this.propertiesView.isPinned = true;
    }
    if (anchorSetting['sappShoppingCartDialog'].pinned) {
      this.shoppingCartView.isPinned = true;   
    }
    this.shoppingCartView.pos=anchorSetting['sappShoppingCartDialog'].pos;  

    if (anchorSetting['sappProductsSearchListDialog'].pinned) {
      this.productLibView.isPinned = true;
    }
    if (anchorSetting['sappCharts']?.pinned) {
      this.chartsView.isPinned = true;
    }
  }
  public unpinAll(): void {
    this.getAllViews().forEach(it => it.isPinned = false);
  }
  public getPinAll(): SideNavViewSetting {
    return this.getAllViews().filter(it => it.isPinned === true).reverse()[0];
  }
  public updateActiveView(anchorSetting: AnchorSettings): void { //  the active view not updating properly created a task for the same to change the object coming from backend as we not need isActive for each view
    for (const [k, v] of Object.entries(anchorSetting)) {
      v.isActive = PogSideNaveViewDefault[k] == this.activeVeiw;
    }
  }
  public getAllViews(): SideNavViewSetting[] {
    return [this.shoppingCartView, this.productLibView, this.chartsView, this.highlightView, this.propertiesView];
  }

    // Top Icon Event
    public changeSideNavWidth(action: string,currentWidth: number): number {
      if (action == 'maximize') {
        currentWidth = currentWidth + 5;
        this.sidenavWidthChange.next(currentWidth);
      } else if (action == 'minimize') {
        currentWidth = currentWidth - 5;
        this.sidenavWidthChange.next(currentWidth);
      } else {
        currentWidth = 30;
        this.sidenavWidthChange.next(currentWidth);
      }
      const view = this.getActive();
      view.width = currentWidth;
      return currentWidth;
    };
}
