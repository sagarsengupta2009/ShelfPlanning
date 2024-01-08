import { Injectable, Input } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import {  AppSettings, DisplayMode, SettingValue } from 'src/app/shared/models';
import { AppSettingsService, ParentApplicationService, PlanogramService, PlanogramStoreService, PogSideNavStateService, SharedService, HistoryService, NotifyService, PanelService } from 'src/app/shared/services';
import { DictConfigService } from '../dict-Config/dict-config.service';
import { PlanogramCommonService } from '../shelf-planogram/planogram-common.service';
import { MatDialog } from '@angular/material/dialog';
import { ShoppingCartComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/shopping-cart/shopping-cart.component';
import { SortFieldDetails } from 'src/app/shared/models/shopping-cart';
import { ConsoleLogService } from 'src/app/framework.module';
import { Position, Section } from 'src/app/shared/classes';
import { Utils } from 'src/app/shared/constants';
import { ShoppingCartUnloadedStateComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/common';

@Injectable({
  providedIn: 'root'
})
export class ShoppingCartService {

  public shoppingCartFieldOptions: any = [];
  public additionalFieldsToShow: any = [];
  public SC_PROPERTIES_CONFIG: any = {};
  public SC_PROPERTIES_CONFIG_VALUE: any = {};
  private SC_SORT_FIELD_ORDER_CONFIG: any = [];
  public sortFieldOrder: SortFieldDetails[] = [];
  public floatingShelvesConfig: any = { enabled: false };
  public updateLabelsInCart: Subject<boolean> = new Subject<boolean>();
  public checkForChangeInCart: Subject<boolean> = new Subject<boolean>();
  public updateUnLoadedCart: Subject<boolean> = new Subject<boolean>();
  public displayMode: DisplayMode = DisplayMode.CompactView;
  public floatingwidth : number = 30;
  public unLoadedCartwidth : number = 35;
  public floatingShelvesHeight: number = 200;
  public unLoadedCartHeight: number = 150;
  public sideNavMenuWidth: number = 68;
  public shoppingCartViewTop: boolean = false;
  public showShoppingCartUnloaded :boolean = false;
  public hideUnLoadCart: boolean = false;
  public cartObj = [];
  private orderBy: { predicate: string[], reverse: boolean, orders: boolean[] } = {
    predicate: ['Position.RecommendationNumber', 'Position._X05_POSVALX01.ValData', 'Position.Product.Name'],
    reverse: false,
    orders: []
  };
  @Input('state') state: boolean;
  constructor(
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly dictConfigService: DictConfigService,
    private readonly planogramService: PlanogramService,
    private readonly pogSideNavStateService: PogSideNavStateService,
    private readonly parentApp: ParentApplicationService,
    private readonly appSettingsService: AppSettingsService,
    private readonly sharedService:SharedService,
    private readonly matDialog: MatDialog,
    private readonly log: ConsoleLogService,
    private readonly historyService: HistoryService,
    private readonly notifyService: NotifyService,
    private readonly panelService: PanelService,
  ) { }

  public loadAdditionalColumns(): void {
    // Setting corresponding to Additional Fields in Shopping Cart.
    this.SC_PROPERTIES_CONFIG = this.planogramCommonService.getSettingsForKey("SC_PROPERTIES_CONFIG", this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, true);
    this.SC_PROPERTIES_CONFIG_VALUE = JSON.parse(this.SC_PROPERTIES_CONFIG.SelectedValue.value);
    const availableColumns = []
    this.SC_PROPERTIES_CONFIG_VALUE.AvailableColumns.forEach(value => {
      availableColumns.push({ 'IDDictionary': value });
    });
    this.shoppingCartFieldOptions = this.dictConfigService.dictionaryConfigCollection(availableColumns);

    let selectedColumns = [];
    this.SC_PROPERTIES_CONFIG_VALUE.SelectedColumns.forEach(value => {
      selectedColumns.push({ IDDictionary: value });
    });

    this.additionalFieldsToShow = this.dictConfigService.dictionaryConfigCollection(selectedColumns);
  }

  public saveDockToTop(): Observable<void> {
    return this.planogramService.setPinUnpinAppSetting();
  }

  public openDialog(flag: boolean, filterText: string, calledFrom: string): void {
    this.sharedService.isCartSideView = false;
    this.pogSideNavStateService.shoppingCartView.isPinned = false;
    let activePinned = this.pogSideNavStateService.getActive();
    this.floatingwidth = 3;
    if (this.parentApp.isWebViewApp) {
      this.floatingwidth = 2;
    }
    else if (activePinned) {
      this.floatingwidth = activePinned.width;
    }
    this.sharedService.showFloatingShelves.next(flag);
    let position;
    if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
      position = { left: '0px', top: '0px' }
    }
    else if (this.parentApp.isWebViewApp) {
      position = { left: '6px', top: '57px' }
    }
    else {
      position = { left: '55px', top: '57px' }
    }
    const dialogRef = this.matDialog.open(ShoppingCartComponent, {
      maxWidth: `calc(100vw -${this.sideNavMenuWidth}px)`,
      height: `${this.floatingShelvesHeight}px`,
      width: `calc(100vw - ${this.floatingwidth}% - ${this.sideNavMenuWidth}px)`,
      hasBackdrop: false,
      data: { filterText: filterText || '', position: this.pogSideNavStateService.shoppingCartView.pos },
      position,
      autoFocus: false,
      panelClass: 'shoppingcart-topview',
      id: 'shoppingcart-top-view'
    });
    if (calledFrom === "openInTop") {
      this.state = true;
      this.shoppingCartViewTop = flag;
    }
    this.checkForChangeInCart.next(false);

    dialogRef.disableClose = true;
    dialogRef.afterClosed().subscribe((result) => {
      if (calledFrom === "openInTop") {
        this.state = false;
        this.pogSideNavStateService.shoppingCartView.pos = 'right';
      }
      this.sharedService.showFloatingShelves.next(false);
    });
  }

  public loadSortFieldOrder() {
    this.SC_SORT_FIELD_ORDER_CONFIG = this.planogramCommonService.getSettingsForKey("SC_SORT_FIELD_ORDER", this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, true);
    if (this.SC_SORT_FIELD_ORDER_CONFIG) {
      this.sortFieldOrder = JSON.parse(this.SC_SORT_FIELD_ORDER_CONFIG.SelectedValue.value);
    } else {
      this.sortFieldOrder = [{ field: 'Position.RecommendationNumber', name: 'Recommendation', order: 1, dir: 'asc' }];
    }
  }

  public saveSortFieldOrder(sortFieldOrderDetails: SortFieldDetails[]): void {
    const sortFieldOrderValue = JSON.stringify(sortFieldOrderDetails);
    const scSortFieldOrderConfig = this.SC_SORT_FIELD_ORDER_CONFIG;
    const oneValue: SettingValue = {
      KeyName: scSortFieldOrderConfig.KeyName,
      KeyType: scSortFieldOrderConfig.KeyType,
      KeyValue: sortFieldOrderValue,
    };
    const objToSave: AppSettings = {
      AppSettings: {
        KeyGroup: scSortFieldOrderConfig.KeyGroup,
        Values: [oneValue]
      }
    };
    this.appSettingsService.saveSettings(objToSave, true)
      .subscribe((result: boolean) => {
        if (result) {
          this.log.success('ShoppingCart sort details updated');
        }
      }, () => { // error
        this.log.error('Error during ShoppingCart sort details save');
      });
  }

  public changeInSortDirection = this.debounceForchangeInSortDirection((sortFieldOrderDetails) =>
    this.saveSortFieldOrder(sortFieldOrderDetails)
  );

  private debounceForchangeInSortDirection(callback, wait = 2000) {
    let timeout;
    return (...args) => {
      const context = this;
      clearTimeout(timeout);
      timeout = setTimeout(() => callback.apply(context, args), wait);
    };
  }

  public removeFromSelectionById($id: string, sectionID: string): void {
    if (!this.sharedService.selectedID[sectionID]) {
      this.sharedService.selectedID[sectionID] = [];
    }
    const indexOf = this.sharedService.selectedID[sectionID].findIndex((x) => x === $id);
    if (indexOf !== -1) {
      const object = this.sharedService.getObject($id, sectionID);
      object.selected = false;
      this.sharedService.selectedID[sectionID] = this.sharedService.selectedID[sectionID].filter((x, i) => i !== indexOf);
      this.planogramService.rootFlags[sectionID].selectionCount = this.sharedService.selectedID[sectionID].length;
      this.planogramService.setLastSelectedObjCartStatus(
        this.sharedService.selectedID[sectionID][this.planogramService.rootFlags[sectionID].selectionCount - 1],
        sectionID,
      );
    }
    return;
  }
  private deleteItems(selectedList: Position[], sectionID: string): void {
    const pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    let cartObj = Utils.getShoppingCartObj(pogObj.Children);
    for (let i = selectedList.length - 1; i >= 0; i--) {
      for (let j = cartObj.Children.length - 1; j >= 0; j--) {
        let selObj = selectedList[i],
          obj = cartObj.Children[j];
        if (
          selObj.Position.IDPackage === obj.Position.IDPackage &&
          selObj.Position.IDProduct === obj.Position.IDProduct
        ) {
          //Items which were locked can't be removed from the list
          const fieldHierarchyStr = this.planogramStore.appSettings.positionLockField;
          const positionLocField = this.sharedService.getPositionLockField(fieldHierarchyStr, selObj);
          if (!positionLocField || !(positionLocField.flag && positionLocField.list.indexOf(2) !== -1)) {
            if (selObj.selected) {
              this.removeFromSelectionById(selObj.$id, sectionID);
            }
            cartObj.Children.splice(j, 1);
            if (this.sharedService.link === 'iAssort')
              window.parent.postMessage(`invokePaceFunc:deleteProduct:["${selObj.Position.IDProduct}"]`, '*',);
            this.planogramService.deleteFromInvModel(sectionID, selObj);
            this.planogramService.cleanByID(sectionID, selObj.$id);
          } else {
            this.notifyService.error(selObj.getLockErrorMsg(), 'lockerror');
          }
          break;
        }
      }
    }
    this.planogramService.removeAllSelection(sectionID);
    this.planogramService.addToSelectionByObject(pogObj, sectionID);
    this.sharedService.updateNPIGrid.next({ reloadNPI: true });
  }
  private undoDelete(selectedList: Position[], sectionID: string): void {
    selectedList.forEach((obj) => {
      const pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
      const cartObj = Utils.getShoppingCartObj(pogObj.Children);
      cartObj.Children.push(obj);
      const packId = obj.Position.IDProduct.toString() + '@' + obj.Position.IDPackage.toString();
      obj.IDPOGObjectParent = null;
      obj.IDPOGObject = null;
      obj.Position.IDPOGObject = null;
      obj.TempId = Utils.generateUID();
      if (!pogObj.PackageInventoryModel[packId]) {
        pogObj.PackageInventoryModel[packId] = obj.Position.inventoryObject;
      }
      if (!pogObj.PackageAttributes[packId]) {
        pogObj.PackageAttributes[packId] = obj.Position.attributeObject;
      }
      this.planogramService.addByID(sectionID, obj.$id, obj);
    });
    this.sharedService.changeInCartItems.next(true);
  }
  //create a public function to delete items from shopping cart. This function will be called from shopping cart component.
  public deleteItemsFromShoppingCart(selectedList: Position[]): void {
    const sectionId: string = selectedList[0].$sectionID;
    selectedList.forEach(item => {
      this.planogramService.removeFromSelectionByObject(item, item.$sectionID);
    });
    this.deleteItems(selectedList, sectionId);
    // Undo-Redo
    const original = ((arr, sectionID) => {
      return () => {
        this.deleteItems(arr, sectionID);
      };
    })(selectedList, sectionId);
    const revert = ((arr, sectionID) => {
      return () => {
        this.undoDelete(arr, sectionID);
      };
    })(selectedList, sectionId);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funname: 'deleteitems',
    });
  }

  public openShoppingCartDialog() {
    this.showShoppingCartUnloaded = true;
    let position;
    let activePinned = this.pogSideNavStateService.getActive();
    this.sharedService.showUnLoadedCart.next(true);
    this.unLoadedCartwidth = 0;
    if (this.parentApp.isWebViewApp) {
      this.unLoadedCartwidth = 2;
    }
    else if (activePinned) {
      this.unLoadedCartwidth = activePinned.width - 2;
    }
    if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
      position = { left: '0px', top: '0px' }
    }
    else if (this.parentApp.isWebViewApp) {
      position = { left: '6px', top: '57px' }
    }
    else {
      position = { left: '55px', top: '57px' }
    }
    const dialogRef = this.matDialog.open(ShoppingCartUnloadedStateComponent, {
      maxWidth: `calc(100vw -${this.sideNavMenuWidth}px)`,
      height: `${this.unLoadedCartHeight}px`,
      width: `calc(100vw - ${this.unLoadedCartwidth}% - ${this.sideNavMenuWidth}px)`,
      hasBackdrop: false,
      position,
      panelClass: 'shoppingcart-Unloaded-topview',
      id: 'shoppingcart-Unloaded-top-view'
    });
  }

  public closeShoppingcartDialog(): void {
    this.matDialog.getDialogById('shoppingcart-Unloaded-top-view')?.close();
    this.showShoppingCartUnloaded = false;
    this.sharedService.showUnLoadedCart.next(false);
  }
  public showHideSCDialogUS(flag: boolean) {
    let cartViewUS = document.getElementsByClassName('shoppingcart-Unloaded-topview') as HTMLCollectionOf<HTMLElement>;
    if (cartViewUS?.length && flag && !(this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '' && (this.panelService.ActivePanelInfo.componentID === 1 || this.panelService.ActivePanelInfo.componentID === 2))) {
      cartViewUS[0].style.display = "block";
    } else if (cartViewUS?.length) {
      cartViewUS[0].style.display = "none";
    }
  }

  public orderCartBy(sortFieldDetails: SortFieldDetails[]): any {
    let predicate: string[] = ['Position.RecommendationNumber', 'Position._X05_POSVALX01.ValData', 'Position.Product.Name'];
    let orders: boolean[] = [];
    if (this.floatingShelvesConfig?.enabled) {
      predicate = ['Position.RecommendationNumber', '-' + Utils.makeFieldFromDict(this.dictConfigService.findById(this.floatingShelvesConfig.SortField)), 'Position.Product.Name'];
      orders = [true, this.floatingShelvesConfig.SortOrder === 'asc', true];
      this.orderBy.reverse = this.floatingShelvesConfig.SortOrder === 'desc';
      if (sortFieldDetails.some(s => s.field !== 'Position.RecommendationNumber')) {
        sortFieldDetails.forEach(s => {
          predicate[s.order] = s.field;
          orders[s.order] = s.dir === 'asc';
        });
      }
    } else {
      predicate = ['Position.RecommendationNumber', 'Position._X05_POSVALX01.ValData', 'Position.Product.Name'];
      orders = [true, true, true];
      if (sortFieldDetails.some(s => s.field === 'Position.Product.Name')) {
        predicate.pop();
      }
      sortFieldDetails.forEach(s => {
        predicate[s.order - 1] = s.field;
        orders[s.order - 1] = s.dir === 'asc';
      });
    }
    this.orderBy.predicate = predicate;
    const pogObj = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId());
    const cartObj = Utils.getShoppingCartObj(pogObj.Children);
    cartObj.orderBy = this.orderBy;
    this.orderBy.orders = orders;
    return this.orderBy;
    // I don't think these lines are needed, but I'm leaving them commented for now if an issue comes up and the need to be put back
      //  cartObj.Children = orderBy(cartObj.Children, this.orderBy.predicate, this.orderBy.orders);
      //  this.cartItems = orderBy(this.cartItems, this.orderBy.predicate, this.orderBy.orders);
  }
}
