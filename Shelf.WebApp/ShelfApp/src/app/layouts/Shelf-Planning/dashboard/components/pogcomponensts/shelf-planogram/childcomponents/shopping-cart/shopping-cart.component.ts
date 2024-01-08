import {
  Component, EventEmitter, Input, OnDestroy, OnInit,
  Optional, Output, ChangeDetectorRef, Renderer2,
  AfterViewInit, ElementRef, ViewChild, Inject, ChangeDetectionStrategy
} from '@angular/core';
import { Subscription } from 'rxjs';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { orderBy, isEmpty, filter, cloneDeep } from 'lodash-es';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { IDragDrop, DragOrigins, DragDropEventsService } from 'src/app/shared/drag-drop.module';
import { AppConstantSpace, LocalStorageKeys, Utils } from 'src/app/shared/constants';
import { Position, Section } from 'src/app/shared/classes';
import {
  AppSettings, SettingValue, DisplayMode,
  PogSideNaveView, CartDisplaySetting, CartDisplaySettingName,
  ShoppingCartFieldOptions, AssortRecADRI, DialogSearch, SvgToolTip,
} from 'src/app/shared/models';
import { ShoppingCartFilterPipe, SortPipe } from 'src/app/shared/pipe';
import { Orientation } from 'src/app/shared/classes/orientation';
import { PropertyGridComponent } from '../property-grid';
import {
  ShoppingCartService,
  PlanogramService,
  SharedService,
  PlanogramStoreService,
  HistoryService,
  AllocateService,
  PogSideNavStateService,
  NotifyService, AppSettingsService,
  DictConfigService,
    ParentApplicationService, Render2dService, MoveService, PanelService, HighlightService, ExcelService, AgGridHelperService
} from 'src/app/shared/services';

//Not exporting, as this interface is added for code readability & it is not used outside this file
interface PositionStyle {
  transform: string;
  'transform-origin': string;
  height: string;
  width: string;
  display: string;
  'background-color': string;
  border: string
}
declare const window: any;
import { FloatingShelves, FloatingShelvesTypes, TextBoxStyleDetails, SortFieldDetails } from 'src/app/shared/models';



@Component({
  selector: 'sp-shopping-cart',
  templateUrl: './shopping-cart.component.html',
  styleUrls: ['./shopping-cart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ShoppingCartComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild('shoppingCartDiv', { read: ElementRef }) shoppingCartDiv;
  @Input('state') state: boolean;
  @Input() isPin: boolean;
  @Input() searchData: string;
  @Output() getWidth: EventEmitter<number> = new EventEmitter();
  @Output() onPinUnpintoggle: EventEmitter<boolean> = new EventEmitter();
  @Output() viewComponentInSideNav: EventEmitter<boolean> = new EventEmitter();

  public isCartView: boolean = true;
  public cartViewType: string;
  public cartItems: Position[] = [];
  public isDownloadActive: boolean = false;
  public isCartSideView: boolean = false;
  public sectionID: string;
  private scaleFactor: number;
  public fitToContent: boolean = true;
  public disableDeletedScItem: boolean;
  public shoppingCartFieldOptions: ShoppingCartFieldOptions[] = [];
  public defaultSortFieldIds = [244,258,247,246];
  public defaultSortFieldsToShow: any[] = [];
  public additionalFieldsToShow: ShoppingCartFieldOptions[] = [];
  private selectionCount: number = 0;
  public planogramSettingMode: number = 0;
  private orientation: Orientation = new Orientation();
  public sideNavWidth: number;
  public lastSelectedItemIndex: number;
  public orderBy: { predicate: string[], reverse: boolean, orders: boolean[] } = {
    predicate: ['Position.RecommendationNumber', 'Position._X05_POSVALX01.ValData', 'Position.Product.Name'],
    reverse: false,
    orders: []
  };
  private sortPipe: SortPipe;
  public shoppingCartViewTop = false;
  public cartDisplaySetting: CartDisplaySetting = {
    column1: [
      {
        fieldName: CartDisplaySettingName.UPC,
        enable: true,
      },
      {
        fieldName: CartDisplaySettingName.SKU,
        enable: true,
      },
      {
        fieldName: CartDisplaySettingName.NAME,
        enable: true,
      },
      {
        fieldName: CartDisplaySettingName.BRAND,
        enable: true,
      },
    ]
  };
  private docKeyDownSubscription: () => void;
  private subscriptions = new Subscription();
  public filterText: string;
  private shoppingCartId: string = '';
  public hasFloatingShelves: boolean = false;
  public overrideScaleFactor: number = 0;
  /* side nav  menu thickness*/
  private sideNavMenuWidth = 68;
  private resizeFlag: boolean = false;
  private startLocY: number = 0;
  private initialSizeY = 0;
  public ToolTipData: Array<{ keyName: string; value: string | number }>;
  private excelArr: any[] = [];
  constructor(
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly render: Renderer2,
    public readonly shoppingCartService: ShoppingCartService,
    private readonly cdr: ChangeDetectorRef,
    private readonly notifyService: NotifyService,
    private readonly shoppingCartFilterPipe: ShoppingCartFilterPipe,
    private readonly matDialog: MatDialog,
    private readonly historyService: HistoryService,
    private readonly dragDropEventsService: DragDropEventsService,
    private readonly allocateService: AllocateService,
    private readonly log: ConsoleLogService,
    private readonly localStorage: LocalStorageService,
    private readonly appSettingsService: AppSettingsService,
    public readonly PogSideNavStateService: PogSideNavStateService,
    private readonly dictConfigService: DictConfigService,
    private readonly parentApp: ParentApplicationService,
    private readonly render2d: Render2dService,
    private readonly moveService: MoveService,
    private readonly panelService: PanelService,
    private readonly highlightService:HighlightService,
    private readonly excelService: ExcelService,
    private readonly agGridHelperService: AgGridHelperService,
    @Optional() private readonly dialog: MatDialogRef<ShoppingCartComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private dialogSearchData?: DialogSearch
  ) {
    window.addEventListener('mouseup', (ev: MouseEvent) => {
      this.resizeClicked();
    })
    this.render2d.onUpdate.subscribe(() => {
      if(this.resizeFlag && this.moveService.mouseMoveEvent){
        this.updateDialogSize({activeScreen: 'SC',width: this.shoppingCartService.floatingwidth, height: this.initialSizeY + (this.moveService?.mouseMoveEvent?.clientY - this.startLocY)}, true);
        this.moveService.mouseMoveEvent.preventDefault();
      }
    });
    if(dialogSearchData?.position === 'top') {
      this.shoppingCartViewTop = true;
    }
    this.sortPipe = new SortPipe();
  }


  get displayMode(): DisplayMode {
    return this.shoppingCartService.displayMode;
  }

  set displayMode(value: DisplayMode) {
    this.shoppingCartService.displayMode = value;
  }

  public isSortBySelected(value: string, order: number): boolean {
    if (this.shoppingCartService.sortFieldOrder.length >= order) {
      return this.shoppingCartService.sortFieldOrder[order-1].field === value;
    }
    return false;
  }

  public ngOnInit(): void {
    let defaultSortFields: any[] = [];
    this.defaultSortFieldIds.forEach(id => {
      defaultSortFields.push({ 'IDDictionary': id });
    });
    this.defaultSortFieldsToShow = this.dictConfigService.dictionaryConfigCollection(defaultSortFields);
    this.defaultSortFieldsToShow.push({'field':'Position.RecommendationNumber','value':'RECOMMENDATION'});
    this.retrieveFloatingShelvesConfig();
    this.isPin = this.PogSideNavStateService.getAllViews().filter(it => it.id === 'SC')[0].isPinned;
    this.filterText = this.state ? this.searchData : this.dialogSearchData?.filterText;
    this.sectionID = this.sharedService.getActiveSectionId();
    this.sideNavWidth = this.PogSideNavStateService.shoppingCartView.width;
    this.shoppingCartFieldOptions = this.shoppingCartService.shoppingCartFieldOptions; //this line is added dut to it is in watch and we need field
    this.additionalFieldsToShow = this.shoppingCartService.additionalFieldsToShow; //this line is added dut to it is in watch and we need field
    if (!this.additionalFieldsToShow.some(dict => dict.IDDictionary === this.shoppingCartService.floatingShelvesConfig.SortField)
        && !this.shoppingCartFieldOptions.some(dict => dict.IDDictionary === this.shoppingCartService.floatingShelvesConfig.SortField)) {
      let floatingShelfSpecificField: any[] = [{ 'IDDictionary': this.shoppingCartService.floatingShelvesConfig.SortField }];
      let floatingShelfSpecificFieldDict: any = this.dictConfigService.dictionaryConfigCollection(floatingShelfSpecificField)?.[0];
      if (floatingShelfSpecificFieldDict) {
        this.shoppingCartFieldOptions.push(floatingShelfSpecificFieldDict);
      }
    }
    this.fitToContent = !this.fitToContent;
    this.disableDeletedScItem = this.planogramStore.appSettings.disableDeletedScItem;
    this.cartItems = this.getCartItems();
    this.restoreSavedDisplayMode();
    if (this.filterText) {
      this.bindSearchEvent(this.filterText);
    }
    this.registerEventSubscriptions();

    if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
      this.sideNavMenuWidth = 25;
    }
    else if (this.parentApp.isWebViewApp) {
      this.sideNavMenuWidth = 32;
    }
    this.planogramSettingMode = this.planogramService.rootFlags[this.sharedService.getActiveSectionId()]?.mode;
    this.cartViewType = this.displayMode === DisplayMode.ListView ? 'CompactView' : 'ListView';
  }

  private jsonCreation(cartItems: Position[]): void {
    this.excelArr = [];
    const cols = this.agGridHelperService.getAgGridColumns(`SHELF_ITEM_WORKSHEET`);
    let excelCols = cols.filter(ele => ele.hide == false);
    cartItems.forEach((ele, index) => {
      let objExcel = {};
      let SrNo = ' ';
      objExcel[SrNo] = index + 1;
      this.cartDisplaySetting.column1.forEach((el) => {
        const fieldArr = el.fieldName.split('.');
        let headerName = fieldArr[2];
        objExcel[headerName] = this.getCartColumnValue(ele, el.fieldName);
      });
      this.shoppingCartFieldOptions.forEach((el) => {
        objExcel[el.value] = this.getCartColumnValue(ele, el.field);
      });
      for (let j = 0; j <= excelCols.length - 1; j++) {
        let headerName = excelCols[j].headerName;
        objExcel[headerName] = this.getCartColumnValue(ele, excelCols[j].field);
      }
      this.excelArr.push(objExcel);
    });
  }

  public ngAfterViewInit(): void {
    this.docKeyDownSubscription = this.render.listen(
      this.shoppingCartDiv.nativeElement,
      'keyup', // changing the keydown event to keyup to stop propagation to the workspace
      (event) => {
        if (event) {
          switch (event.keyCode) {
            case 46:
              if (this.selectionCount > 0) {
                this.deleteSelected();
              }
              event.stopPropagation();
              break;
            case 40:
              if (this.displayMode === DisplayMode.CompactView) {
                break;
              }
              if (event.shiftKey) {
                this.selectNextItem('multi', 'down', event);
              } else {
                if (!event.ctrlKey) {
                  this.selectNextItem('single', 'down', event);
                }
              }
              event.stopPropagation();
              break;
            case 38:
              if (this.displayMode === DisplayMode.CompactView) {
                break;
              }
              if (event.shiftKey) {
                this.selectNextItem('multi', 'up', event);
              } else {
                if (!event.ctrlKey) {
                  this.selectNextItem('single', 'up', event);
                }
              }
              event.stopPropagation();
              break;
            case 39:
              if (this.displayMode === DisplayMode.ListView) break;
              if (event.shiftKey) {
                this.selectNextItem('multi', 'down', event);
              } else {
                if (!event.ctrlKey) {
                  this.selectNextItem('single', 'down', event);
                }
              }
              event.stopPropagation();
              break;
            case 37:
              if (this.displayMode === DisplayMode.ListView) break;
              if (event.shiftKey) {
                this.selectNextItem('multi', 'up', event);
              } else {
                if (!event.ctrlKey) {
                  this.selectNextItem('single', 'up', event);
                }
              }
              event.stopPropagation();
              break;
          }
        }
      },
    );
    if (!this.shoppingCartService.sortFieldOrder?.length) {
      this.shoppingCartService.loadSortFieldOrder();
      this.shoppingCartService.sortFieldOrder.forEach(s => {
        s.name = this.defaultSortFieldsToShow.find(d => d.field === s.field)?.value
                  ?? this.additionalFieldsToShow.find(d => d.field === s.field)?.value ?? s.name;
      });
    }
    this.orderBy = this.shoppingCartService.orderCartBy(this.shoppingCartService.sortFieldOrder);
  }

  private registerEventSubscriptions(): void {
    this.subscriptions.add(this.dragDropEventsService.beginDrag.subscribe(() => this.toggleShoppingCart(true)));
    this.subscriptions.add(this.dragDropEventsService.endDrag.subscribe(() => this.toggleShoppingCart(false)));
    this.subscriptions.add(
      this.sharedService.updateShoppingCartFromClipboard.subscribe((result) => {
        if (result) {
          this.sectionID = this.sharedService.getActiveSectionId();
          this.cartItems = this.getCartItems();
        }
      }),
    );
    this.subscriptions.add(
      this.sharedService.changeInCartItems.subscribe((result) => {
        if (result) {
          this.sectionID = this.sharedService.getActiveSectionId();
          this.cartItems = this.getCartItems();
          this.shoppingCartService.updateLabelsInCart.next(true);
          this.cdr.markForCheck();
        }
      }),
    );
    this.subscriptions.add(
      this.sharedService.toggleDisplayMode.subscribe((res: any) => {
        if (res != null && res.toggleDisplayMode === 'shoppingCart') {
          this.planogramSettingMode =
            this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].mode;
          this.cdr.markForCheck();
        }
      }),
    );
    if (this.sharedService.mode === 'iAssortNICI') {
      this.subscriptions.add(
        this.planogramService.deleteItemFromShoppingcart.subscribe((item) => {
          if (item) {
            this.sectionID = this.sharedService.getActiveSectionId();
            this.deleteSelected(item);
            this.cdr.markForCheck();
          }
        }),
      );
    }
    this.subscriptions.add(this.sharedService.floatingShelvesWidthChange.subscribe((result: { activeScreen: string, width: number }) => {
      result ? this.updateDialogSize(result) : '';
    }));
    this.subscriptions.add(this.shoppingCartService.checkForChangeInCart.subscribe((res: boolean) => {
      res ? this.cdr.detectChanges() : this.cdr.markForCheck();
    }));
  }

  public changeSideNavWidth(action: string, event: PointerEvent): void {
    this.sideNavWidth = this.PogSideNavStateService.changeSideNavWidth(action, this.sideNavWidth);
    event.stopPropagation();
  }

  public bindSearchEvent(searchtext: string): void {
    this.filterText = searchtext ? searchtext : '';
  }

  public labelsOn(noImage: boolean): boolean {
    if (noImage && this.planogramStore.appSettings.showLabelIfNoPackageImage) return true;
    return this.planogramService.labelOn;
  }

  public getCartColumnValue(item: Position, field: string): string {
    const fieldArr = field.split('.');
    switch (fieldArr.length) {
      case 1:
        return item[fieldArr[0]];
      case 2:
        return item[fieldArr[0]][fieldArr[1]];
      case 3:
        if (fieldArr[2] === 'SKU' && item[fieldArr[0]][fieldArr[1]][fieldArr[2]]) {
          return `[${item[fieldArr[0]][fieldArr[1]][fieldArr[2]]}]`;
        }
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]];
      case 4:
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]][fieldArr[3]];
      case 5:
        return item[fieldArr[0]][fieldArr[1]][fieldArr[2]][fieldArr[3]][fieldArr[4]];
    }
  }

  public getCartItems(): Position[] {
    if (this.sharedService.getActiveSectionId() !== '') {
      const firstLevelChild = this.sharedService.planogramVMs[this.sharedService.getActiveSectionId()].Children;
      const activeSection = this.sharedService.planogramVMs[this.sharedService.getActiveSectionId()];
      let positionsInCart: Position[] = [];
      if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
        let pat = this.shoppingCartService.floatingShelvesConfig?.SelectionFieldName?.split('.');
        let positions = activeSection.getAllPositions();
        positionsInCart = filter(positions, (pos) => {
          let val = this.pat_reduce(pat, pos);
          if (val == this.shoppingCartService.floatingShelvesConfig.posInCart) {
            pos.floatingShelveStyle = this.styleLabel(pos);
          }
          return val == this.shoppingCartService.floatingShelvesConfig.posInCart;
        });
      }
      let shoppingCartArr = firstLevelChild.filter(d => d.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ);
      if (shoppingCartArr.length == 0) return [];
      let shoppingCart = shoppingCartArr[0];
      this.shoppingCartId = shoppingCart.$id;
      shoppingCart.badgeVisible = false;
      shoppingCart.numOfAvlItems = 0;

      let numItems: number = 0;
      shoppingCart.Children.forEach(obj => {
        obj.floatingShelveStyle = this.styleLabel(obj)
        if (this.ifRetainedItem(obj)) {
          numItems++;
        }
      });
      if (numItems > 0) {
        shoppingCart.badgeVisible = true;
        shoppingCart.numOfAvlItems = numItems;
      }
      this.isDownloadActive = numItems > 0;
      // return orderBy(flChild.Children, this.orderBy.predicate, this.orderBy.reverse);
      return this.addRecommendationNumber(shoppingCart.Children.concat(positionsInCart), shoppingCart.$id);
    }
    return [];
  }

  public selectedItemCount(): number {
    if (this.sharedService.getLastSelectedParentDerievedType(this.sectionID) === AppConstantSpace.SHOPPINGCARTOBJ) {
      return this.planogramService.rootFlags[this.sectionID].selectionCount;
    }
    return 0;
  }

  public isItemSelectedAndCheckAssort(val: boolean): boolean {
    let PosSel: Position[] = [];
    let flag = true;
    if (
      this.sharedService.getLastSelectedParentDerievedType(this.sectionID) === AppConstantSpace.SHOPPINGCARTOBJ
    ) {
      PosSel = this.planogramService.getSelectedObject(this.sectionID) as Position[];
      if (val) {
        for (const pSel of PosSel) {
          if (this.isDelete(pSel)) {
            flag = false;
          }
        }
      } else {
        for (const pSel of PosSel) {
          if (!this.isDelete(pSel)) {
            flag = false;
          }
        }
      }
    }
    if (!PosSel.length) {
      flag = false;
    }
    return flag;
  }

  public sortOrderChanged(field: string, name: string, order: number): void {
    if (this.shoppingCartService.sortFieldOrder.length < order && this.shoppingCartService.sortFieldOrder.length + 1 === order) {
      if (order == 1 || (order == 2 && this.shoppingCartService.sortFieldOrder[0].field != field)) {
        this.shoppingCartService.sortFieldOrder[order - 1] = { field: field, name: name, dir: 'asc', order: order };
      }
    } else if (this.shoppingCartService.sortFieldOrder.length >= order) {
      for (let i = 0; i < this.shoppingCartService.sortFieldOrder.length; i++) {
        if (this.shoppingCartService.sortFieldOrder[i].field === field) {
          if (order === 1 && this.shoppingCartService.sortFieldOrder.length === 1) {
            if (field !== 'Position.RecommendationNumber') {
              field = 'Position.RecommendationNumber';
              name = 'Recommendation';
              break;
            }
          } else if (i + 1 === order && i + 1 === this.shoppingCartService.sortFieldOrder.length) {
            this.shoppingCartService.sortFieldOrder.pop();
          }
          /* It returns in following cases,
          1) if field already selected for any other order,
          2) if tried to uncheck and if not last order */
          return;
        }
      }
      this.shoppingCartService.sortFieldOrder[order - 1].field = field;
      this.shoppingCartService.sortFieldOrder[order - 1].name = name;
    } else {
      return;
    }
    this.orderBy =  this.shoppingCartService.orderCartBy(this.shoppingCartService.sortFieldOrder);
  }

  


  sortMenuClosed() {
    this.shoppingCartService.saveSortFieldOrder(this.shoppingCartService.sortFieldOrder);
  }

  toggleSortDirection(order: number) {
    this.shoppingCartService.sortFieldOrder[order-1].dir = this.shoppingCartService.sortFieldOrder[order-1].dir === 'asc' ? 'desc' : 'asc';
    this.orderBy = this.shoppingCartService.orderCartBy(this.shoppingCartService.sortFieldOrder);
    this.shoppingCartService.changeInSortDirection(this.shoppingCartService.sortFieldOrder);
  }

  public requestToBack(): void {
    this.planogramService.removeAllSelection(this.sectionID);
  };

  public isAddFieldSelected(IDDictionary: number): boolean {
    return this.additionalFieldsToShow?.some((x) => x?.IDDictionary === IDDictionary);
  }

  public deleteSelected(itemObj?: Position): void {
    const unqHistoryID = this.historyService.startRecording();
    let selectedList: Position[] = [];
    if (itemObj) {
      selectedList.push(itemObj);
    } else {
      selectedList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
    }
    this.shoppingCartService.deleteItemsFromShoppingCart(selectedList);
    // Undo-Redo
    const revert = (() => {
      return () => {
        this.cartItems = this.getCartItems();
        this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
        this.cdr.markForCheck();
      };
    })();
    this.historyService.captureActionExec({
      funoriginal: revert,
      funRevert: revert,
      funname: 'deleteitemsFinal',
    });
    this.cartItems = this.getCartItems();
    this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    this.sharedService.deleteItemFromShoppingCart.next(true);
    if(!this.planogramService.templateRangeModel.rangeModel.isNoHighlight) {
      this.planogramService.updateDropCount.next(true);
    }
    this.cdr.markForCheck();
  }

  public toggleDisplayMode(): void {
    this.displayMode = this.displayMode === DisplayMode.ListView ? DisplayMode.CompactView : DisplayMode.ListView;
    this.cartViewType = this.displayMode === DisplayMode.ListView ? 'CompactView' : 'ListView';
    this.localStorage.setNumber(LocalStorageKeys.SHOPPINGCART_VIEW, this.displayMode);

  }

  public toggleFitToContent(): void {
    this.fitToContent = !this.fitToContent;
  }

  private saveFloatingShelfMode(isEnabled: boolean): void {
    const configValues = isEnabled ? '{"enabled": true}' : '{"enabled": false}';
    const oneValue: SettingValue = {
      KeyName: 'FLOATING_SHELF_ENABLED',
      KeyType: 'string',
      KeyValue: configValues,
    };
    const objToSave: AppSettings = {
      AppSettings: {
        KeyGroup: 'POG',
        Values: [oneValue]
      }
    };
    this.subscriptions.add(
      this.appSettingsService.saveSettings(objToSave, true)
        .subscribe((result: boolean) => {
          if (result) {
            this.log.success('Floating Shelf Config updated');
          }
        }, () => { // error
          this.log.error('Error during Floating Shelf Config save');
        }));

  }

  public toggleFloatingShelfMode(): void {
    this.shoppingCartService.floatingShelvesConfig.enabled = !this.shoppingCartService.floatingShelvesConfig?.enabled;
    this.saveFloatingShelfMode(this.shoppingCartService.floatingShelvesConfig.enabled);
    this.cartItems = this.getCartItems();
    if (!this.shoppingCartService.sortFieldOrder.length) {
      this.shoppingCartService.sortFieldOrder = [{ field: 'Position.RecommendationNumber', name: 'Recommendation', order: 1, dir: 'asc' }];
    }
    this.orderBy = this.shoppingCartService.orderCartBy(this.shoppingCartService.sortFieldOrder);
    this.cdr.markForCheck();
  }

  public getDisplayMode(): string {
    const htSetting = this.planogramService.getSettingsBySectionId(this.sectionID);
    if (htSetting.isEnabled) {
      return 'highlightOn';
    }
    return '';
  }

  public desktopSelection(itemData: Position, event: MouseEvent, i: number): void {
    this.clickedItemSelection(itemData, event, i);
    this.planogramService.selectionEmit.next(true);
  }

  public ifRetainedItem(itemData: Position): boolean {
    return !this.isDelete(itemData);
  }

  public clickedItemSelection(itemData: Position, event: MouseEvent, i?: number) {
    //Added this to keep dom event control on this component after selecting checkbox.
    this.shoppingCartDiv.nativeElement.focus();

    if (!isEmpty(itemData)) {
      if (event.type === 'click' && !event.shiftKey) {
        this.lastSelectedItemIndex = i;
      }
      if (
        (this.displayMode === DisplayMode.ListView || (this.displayMode === DisplayMode.CompactView && event.shiftKey) || event.ctrlKey) &&
        event.type !== 'dblclick'
      ) {
        let selectedProductList = this.planogramService.getSelectedObject(this.sectionID);
        const len = selectedProductList.length;
        if (event.type === 'click' && event.shiftKey && len > 0) {
          let lastIndex = this.lastSelectedItemIndex;
          let newIndex = i;
          let diff = newIndex - lastIndex;
          if (diff < 0) {
            diff = -1;
            newIndex--;
          } else {
            diff = 1;
            newIndex++;
          }
          this.planogramService.removeAllSelection(this.sectionID);
          let product: any = {};
          product.id = selectedProductList[len - 1].$id;
          for (; newIndex != lastIndex;) {
            this.planogramService.addToSelectionById(product.id, this.sectionID);
            product =
              diff === -1
                ? document.getElementById(product.id).previousElementSibling
                : document.getElementById(product.id).nextElementSibling;
            lastIndex = lastIndex ? lastIndex + diff : diff;
          }
          this.lastSelectedItemIndex = i;
        } else if (!itemData.selected) {
          if (
            this.sharedService.getLastSelectedParentDerievedType(this.sectionID) !==
            AppConstantSpace.SHOPPINGCARTOBJ
          ) {
            this.planogramService.removeAllSelection(this.sectionID);
          }
          this.planogramService.addToSelectionById(itemData.$id, this.sectionID);
          this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
        } else {
          this.shoppingCartService.removeFromSelectionById(itemData.$id, this.sectionID);
          this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
        }
      } else {
        if (this.parentApp.isAllocateApp ||
          ([1, 2].includes(this.panelService.ActivePanelInfo.componentID) && itemData.$idParent != this.shoppingCartId)) {
          this.sharedService.itemSelection.next({
            pogObject: itemData,
            view: 'panalView',
          });
        }
        this.planogramService.removeAllSelection(this.sectionID);
        this.planogramService.addToSelectionById(itemData.$id, this.sectionID);
        this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
      }
      this.cdr.markForCheck();
    }
  }

  public toggleAdditionalField(additionalField: ShoppingCartFieldOptions, event: MouseEvent): void {
    // ShoppingCartFieldOptions comparison logic
    const equals = (
      a: ShoppingCartFieldOptions,
      b: ShoppingCartFieldOptions
    ): boolean =>
      a.IDDictionary === b.IDDictionary;

    // toggle selection for additionalField
    const isPresent = this.additionalFieldsToShow.some(it => equals(it, additionalField));
    if (isPresent) { // is present already, then remove it
      this.additionalFieldsToShow = this.additionalFieldsToShow.filter(it => !equals(it, additionalField));
    } else { // not present, then add to list
      this.additionalFieldsToShow.push(additionalField);
    }

    // Update in shoppingCartService
    const selectedColumns = this.additionalFieldsToShow.map(it => it.IDDictionary);
    this.shoppingCartService.SC_PROPERTIES_CONFIG_VALUE.SelectedColumns = selectedColumns;
    this.shoppingCartService.additionalFieldsToShow = this.additionalFieldsToShow;

    // Update the settings in DB, by calling API.
    const configValues = JSON.stringify(this.shoppingCartService.SC_PROPERTIES_CONFIG_VALUE);
    const scConfig = this.shoppingCartService.SC_PROPERTIES_CONFIG;
    const oneValue: SettingValue = {
      KeyName: scConfig.KeyName,
      KeyType: scConfig.KeyType,
      KeyValue: configValues,
    };
    const objToSave: AppSettings = {
      AppSettings: {
        KeyGroup: scConfig.KeyGroup,
        Values: [oneValue]
      }
    };
    this.subscriptions.add(
      this.appSettingsService.saveSettings(objToSave, true)
        .subscribe((result: boolean) => {
          if (result) {
            this.log.success('ShoppingCartConfig updated');
          }
        }, () => { // error
          this.log.error('Error during  Shopping Cart Additional Field save');
        }));

    // stop event
    event.stopImmediatePropagation();
    event.preventDefault();
  }

  public retainSelected(itemData?: Position): void {
    let Pos: Position[] = [];
    if (itemData) {
      Pos.push(itemData);
    } else {
      Pos = this.planogramService.getSelectedObject(this.sectionID) as Position[];
    }
    let data = {
      IdScenario: this.planogramStore.scenarioId,
      IdLayoutPog: Pos[0].IdPog,
      IdPackage: [],
      IsNew: false
    }
    for (const p of Pos) {
      data.IdPackage.push(p.Position.IDPackage);
    }

    if (this.sharedService.mode === 'iAssortNICI' && Pos[0].Position.attributeObject.RecMustNotStock) {
      this.notifyService.warn('Cannot restore must not stock item');
      return;
    }

    for (const p of Pos) {
      p.Position.attributeObject.RecADRI = AssortRecADRI.Retain;
      p.Position.canDragFlag = true;
      if (this.sharedService.link === 'iAssort')
        window.parent.postMessage(`invokePaceFunc:addProduct:["${p.Position.IDProduct}"]`, '*');
    }
    this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
    this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isAutoSaveDirtyFlag = true;
    this.planogramService.updateSaveDirtyFlag(true);
    this.cartItems = this.getCartItems();
  }

  public getAssortmentClass(itemData: Position): { cartiAssortAdd: boolean; 'cartiAssortDelete allowDelete'?: boolean; cartiAssortDelete?: boolean; cartiAssortRetain: boolean } {
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      return {
        cartiAssortAdd: false,
        cartiAssortDelete: false,
        cartiAssortRetain: false,
      };
    }

    if (this.planogramStore.appSettings?.disableDeletedScItem) {
      return {
        cartiAssortAdd: itemData.Position.attributeObject.RecADRI === AssortRecADRI.Add,
        'cartiAssortDelete allowDelete': itemData.Position.attributeObject.RecADRI === AssortRecADRI.Delete,
        cartiAssortRetain: itemData.Position.attributeObject.RecADRI === AssortRecADRI.Retain,
      };
    } else {
      return {
        cartiAssortAdd: itemData.Position.attributeObject.RecADRI === AssortRecADRI.Add,
        cartiAssortDelete: itemData.Position.attributeObject.RecADRI === AssortRecADRI.Delete,
        cartiAssortRetain: itemData.Position.attributeObject.RecADRI === AssortRecADRI.Retain,
      };
    }
  }

  public stylePositionContainer(itemData: Position): { 'background-color': string; filter?: string; opacity?: string } {
    const settingsBySection = this.planogramService.getSettingsBySectionId(this.sectionID);
    if (settingsBySection.isEnabled) {
      if(this.planogramService.templateRangeModel.highlightType === '') {
        return {
          'background-color': itemData.highlightColor(this.planogramService.templateRangeModel, itemData),
          filter: 'grayscale(100%)',
          opacity: '0.7'
        };
      } else {
        return {
          'background-color': itemData.highlightColor(this.planogramService.templateRangeModel, itemData, this.highlightService.options)
        };
      }
    }
  }

  public stylePositionDiv(itemData: Position, isDiv?: boolean): { height: string; width: string; 'background-color'?: string; border?: string; } {
    this.scaleFactor = this.overrideScaleFactor > 0 ? this.overrideScaleFactor : this.planogramService.rootFlags[this.sectionID]?.scaleFactor; //0.6399
    const imageRotation = this.getRotation(itemData);
    let imgWidthRef;
    let imgHeightRef;
    switch (imageRotation) {
      case 0:
        imgWidthRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Width, this.sectionID) *
          this.scaleFactor;
        imgHeightRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Height, this.sectionID) *
          this.scaleFactor;
        break;
      case 90:
        imgWidthRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Height, this.sectionID) *
          this.scaleFactor;
        imgHeightRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Width, this.sectionID) *
          this.scaleFactor;
        break;
      case 180:
        imgWidthRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Width, this.sectionID) *
          this.scaleFactor;
        imgHeightRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Height, this.sectionID) *
          this.scaleFactor;
        break;
      case 270:
        imgWidthRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Height, this.sectionID) *
          this.scaleFactor;
        imgHeightRef =
          this.planogramService.convertToPixel(itemData.Position.ProductPackage.Width, this.sectionID) *
          this.scaleFactor;
        break;
    }
    const settingsBySection = this.planogramService.getSettingsBySectionId(this.sectionID);
    settingsBySection.isEnabled
    const style = {
      height: imgHeightRef + 'px',
      width: imgWidthRef + 'px',
    };

    if (this.planogramService.templateRangeModel.highlightType !== '' && settingsBySection.isEnabled) {
      style['filter'] = 'grayscale(100%)';
      style['opacity'] = '0.7';
    }

    if (isDiv) {
      style['background-color'] = itemData.getStringColor();
      style['border'] = '1px solid #000';
    }
    style['position'] = "relative";
    return style;
  }

  public stylePositionObject(itemData: Position, isDiv?: boolean): PositionStyle {
    this.scaleFactor = this.overrideScaleFactor > 0 ? this.overrideScaleFactor : this.planogramService.rootFlags[this.sectionID]?.scaleFactor;
    let transform: string;
    let imageRotation: number = this.getRotation(itemData);
    let imgWidthRef =
      this.planogramService.convertToPixel(itemData.Position.ProductPackage.Width, this.sectionID) *
      this.scaleFactor;
    let imgHeightRef =
      this.planogramService.convertToPixel(itemData.Position.ProductPackage.Height, this.sectionID) *
      this.scaleFactor;
    let style: PositionStyle = {
      transform: '',
      'transform-origin': '',
      height: '',
      width: '',
      display: '',
      'background-color': '',
      border: ''
    };
    switch (imageRotation) {
      case 0:
        break;
      case 90:
        transform = `scale(1, 1) translate(${imgHeightRef}px, 0px) rotate(90deg)`;
        style['transform'] = transform;
        style['transform-origin'] = '0px 0px 0px';
        break;
      case 180:
        transform = 'rotate(180deg)';
        style['transform'] = transform;
        break;
      case 270:
        transform = `scale(1, 1) translate(0px,${imgWidthRef}px) rotate(270deg)`;
        style['transform'] = transform;
        style['transform-origin'] = '0px 0px 0px';
        break;
    }
    style.height = imgHeightRef + 'px';
    style.width = imgWidthRef + 'px';
    style.display = 'block';
    if (isDiv) {
      style['background-color'] = itemData.getStringColor();
      style['border'] = '1px solid #000';
    }
    return style;
  }

  public getRotation(itemData: Position): number {
    const orientation = itemData.Position.IDOrientation & 0x1f;
    const view = this.orientation.View.Front;
    const faceAndRotation = this.orientation.GetImageFaceAndRotation(orientation, false, view);
    const imageRotation = faceAndRotation.Rotation;
    const face = faceAndRotation.Face;
    itemData.Position.imageUrl = itemData.getImageURlfromView(face);
    return imageRotation;
  };

  public isDelete(itemData: Position) {
    let flag: boolean;
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      let selectedShelve: FloatingShelvesTypes = this.getShelfConfig(this.shoppingCartService.floatingShelvesConfig, itemData, this.shoppingCartId);
      flag = !(selectedShelve ? selectedShelve.CanDrag : true);
    } else {
      flag = itemData?.Position?.attributeObject?.RecADRI === AssortRecADRI.Delete
    }
    return flag;
  }

  public selectAllItems(): void {
    const pogObj = this.sharedService.getObject(this.sectionID, this.sectionID);
    if (this.sharedService.getLastSelectedParentDerievedType(this.sectionID) != AppConstantSpace.SHOPPINGCARTOBJ) {
      this.planogramService.removeAllSelection(this.sectionID);
    }
    const cartObj = Utils.getShoppingCartObj(pogObj.Children);
    const filteredList = this.shoppingCartFilterPipe.transform(cartObj.Children, this.filterText);

    for (const filtered of filteredList) {
      const itemData = filtered;
      if (Utils.checkIfPosition(itemData) && !itemData.selected) {
        if (
          !this.isDelete(itemData) ||
          !this.planogramStore.appSettings.disableDeletedScItem
        ) {
          this.planogramService.addToSelectionByObject(itemData, this.sectionID);
        }
      }
      this.selectionCount = this.planogramService.rootFlags[this.sectionID].selectionCount;
    }
  }

  public getImage(itemData): string {
    if (itemData.Position.ProductPackage.Images.front) {
      return itemData.Position.ProductPackage.Images.front;
    } else {
      return AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
    }
  }

  public OnpinUnpin(): void {
    this.isPin = !this.isPin;
    this.onPinUnpintoggle.emit(this.isPin);
  }

  public Onclose(): void {
    if (this.state) {
      let gettxt = document.getElementById('SC');
      gettxt.style.fontWeight = '500';
      this.PogSideNavStateService.activeVeiw =
        this.PogSideNavStateService.activeVeiw == PogSideNaveView.SHOPPING_CART ? null : ('' as any);
      this.viewComponentInSideNav.emit(false);
      this.dialog?.close();
    } else {
      this.updateGridHeight();
      this.dialog.close();
    }
  }

  public resizeClicked(): void{
    this.resizeFlag = false;
  }

  public mouseDownResize(event: MouseEvent): void{
    this.resizeFlag = true;
    this.initialSizeY = this.shoppingCartService.floatingShelvesHeight;
    this.startLocY = event.clientY;
  }

  public updateDialogSize(result:{activeScreen?: string, width?: number, height?: number}, cartResize: boolean = false): void{
    //Adjusting floating shelves Dock to top screen based on Property grid widget.
    //Floatingwidth will be 3 or 2 (For Webview) if Property grid is unpinned and maximized window
    if (!cartResize) {
      if (this.shoppingCartService.floatingwidth > result.width)
        this.sideNavMenuWidth = (this.parentApp.isWebViewApp) ? (this.sideNavMenuWidth + 2) : (this.sideNavMenuWidth + 5);
      else if (this.shoppingCartService.floatingwidth < result.width && this.shoppingCartService.floatingwidth != (3 || 2))
        this.sideNavMenuWidth = (this.parentApp.isWebViewApp) ? (this.sideNavMenuWidth - 2) : (this.sideNavMenuWidth - 5);
    }
    this.shoppingCartService.floatingwidth = result.activeScreen ? result.width : this.parentApp.isWebViewApp ? 2 : 3;
    result.height && (this.shoppingCartService.floatingShelvesHeight = result.height);
    this.sharedService.showFloatingShelves.next(true);
    this.sharedService.changeInGridHeight.next(true);
    this.dialog?.updateSize(`calc(100vw - ${this.shoppingCartService.floatingwidth}% - ${this.sideNavMenuWidth}px)`, this.shoppingCartService.floatingShelvesHeight + 'px');
  }
  private updateGridHeight(): void { //change the grids  height on dock & close of dialog
    if([1, 2].includes(this.panelService.ActivePanelInfo.componentID)){
      this.sharedService.changeInGridHeight.next(true);
    }
  }
  public openInTop(): void {
    this.dialog.close();
    this.PogSideNavStateService.shoppingCartView.pos = {top:'right', right: 'top'}[this.PogSideNavStateService.shoppingCartView.pos];
    let flag = this.PogSideNavStateService.shoppingCartView.pos == 'top';
    if (flag) {
      this.updateGridHeight();
      this.shoppingCartService.openDialog(flag,this.filterText,"openInTop");
    } else {
      this.openShoppingCartDialogue();
    }
    this.shoppingCartService.saveDockToTop().subscribe();
  }

  public openShoppingCartDialogue(): void {
    this.Onclose();
    this.allocateService.resizeParentWindow(true);
    this.sharedService.isCartSideView = false;
    const dialogRef = this.matDialog.open(ShoppingCartComponent, {
      height: '77vh',
      width: '100%',
      panelClass: 'mat-dialog-move-cursor',
      data: {filterText: this.filterText},
    });
    dialogRef.afterClosed().subscribe((result) => {
      this.allocateService.resizeParentWindow(false);
    });
  }

  public openInSideNav(): void {
    this.dialog.close();
    this.sharedService.isCartSideView = true;
    this.sharedService.openSelectedComponentInSideNav.next({
      activeScreen: 'SC',
      isPin: true,
      searchData: this.filterText,
    });
  }

  private selectNextItem(mode: string, direction: string, event: MouseEvent): void {
    if (this.planogramService.getSelectionCount(this.sectionID) >= 1) {
      const selectedItems = this.planogramService.getSelectedObject(this.sectionID);
      const lastSelectedItem: any = this.planogramService.getSelectedObject(this.sectionID)[
        selectedItems.length - 1
      ];
      if (document.getElementById(lastSelectedItem.$id)) {
        let nextSilblingID: any = {};
        let prevSilblingID: any = {};
        let nextSibliingObject: any = {};
        let nextSelectionID = null;
        let prevSilblingclass: any = document.getElementById(lastSelectedItem.$id).previousElementSibling;
        let nextSilblingclass: any = document.getElementById(lastSelectedItem.$id).nextElementSibling;
        nextSilblingID = document.getElementById(lastSelectedItem.$id).nextElementSibling;
        prevSilblingID = document.getElementById(lastSelectedItem.$id).previousElementSibling;
        if (direction === 'down') {
          if (nextSilblingID) {
            nextSelectionID = nextSilblingID.id;
            nextSibliingObject = this.sharedService.getObject(nextSelectionID, this.sectionID);
            if (nextSibliingObject.selected) {
              nextSibliingObject = lastSelectedItem;
            }
          }
        } else {
          if (direction === 'up') {
            if (prevSilblingID) {
              nextSelectionID = prevSilblingID.id;
              nextSibliingObject = this.sharedService.getObject(nextSelectionID, this.sectionID);
              if (nextSibliingObject.selected) {
                nextSibliingObject = lastSelectedItem;
              }
            }
          }
        }
        if (!nextSelectionID) {
          if (mode === 'single') {
            this.planogramService.removeAllSelection(this.sectionID);
            this.clickedItemSelection(lastSelectedItem, event);
          }
          return;
        } else {
          if (
            nextSibliingObject.Position &&
            this.isDelete(nextSibliingObject) &&
            this.planogramStore.appSettings.disableDeletedScItem
          ) {
            return;
          }
        }
        if (direction === 'up' && prevSilblingclass) {
          prevSilblingclass.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
        }
        if (direction === 'down' && nextSilblingclass) {
          nextSilblingclass.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
        }
        if (mode === 'multi') {
          this.clickedItemSelection(nextSibliingObject, event);
        } else {
          if (mode === 'single') {
            this.planogramService.removeAllSelection(this.sectionID);
            this.clickedItemSelection(nextSibliingObject, event);
          }
        }
      }
    }
  }

  public openPropertyGrid(child: Position, event: MouseEvent): void {
    this.sharedService.fixtureTypeMultiple = false;
    if (
      this.sharedService.mode === 'iAssortNICI' &&
      this.sharedService.link === 'iAssort' &&
      child?.ObjectType === 'Position'
    ) {
      window.parent.postMessage(
        `invokePaceFunc:openPropertyGrid:["${this.planogramStore.loadPogId}","${child?.Position.Product.IDProduct}"]`,
        '*',
      );
      event.stopPropagation();
      return;
    }

    this.matDialog.open(PropertyGridComponent, {
      height: '84%',
      width: '55%',
      panelClass: 'mat-dialog-move-cursor',
      id: 'property-grid-dialog'
    });
    event.stopPropagation();
  }

  public getDragDropData(itemData: Position): IDragDrop {
    const dropData: IDragDrop = {
      $id: `${itemData.$id}`,
      ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
      $sectionID: itemData.$sectionID,
      dragOriginatedFrom: DragOrigins.ShoppingCart,
      dragDropSettings: { drag: true, drop: false },
    };
    return dropData;
  }

  private toggleShoppingCart(toggle: boolean): void {
    setTimeout(() => {
      if (this.dialog) {
        if (toggle) {
          document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = 'hidden';
          //  timeout necessary as hiding before dnd registers the element, triggers drag end.
          setTimeout(() => {
            document.querySelector(`#${this.dialog.id}`).parentElement.classList.add('hidden-dialog');
          });
        } else {
          document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = 'visible';
          setTimeout(() => {
            document.querySelector(`#${this.dialog.id}`).parentElement.classList.remove('hidden-dialog');
          });
        }
      }
      let backdrop: HTMLElement = document.querySelector<HTMLElement>('.mat-drawer-backdrop');
      if (toggle) {
        backdrop.style.display = 'none';
      } else {
        backdrop.style.display = 'block';
        this.shoppingCartDiv.nativeElement.blur();
      }
    });
  }

  public onInfo(event: MouseEvent): void {
    if (
        this.PogSideNavStateService.propertiesView.isPinned &&
        this.PogSideNavStateService.shoppingCartView.pos === 'top'
    ) {
        this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
    }
    else if (
        this.PogSideNavStateService.propertiesView.isPinned &&
        this.PogSideNavStateService.activeVeiw != PogSideNaveView.PROPERTYGRID
    ) {
        this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
    } else {
        this.openPropertyGrid(undefined, event);
    }
  }
  private restoreSavedDisplayMode(): void {
    const savedValue = this.localStorage.getNumber(LocalStorageKeys.SHOPPINGCART_VIEW);
    if (savedValue) { this.displayMode = savedValue as DisplayMode; }
  }


  public ngOnDestroy(): void {
    this.orientation = null;
    this.subscriptions.unsubscribe();
    if (this.docKeyDownSubscription) {
      this.docKeyDownSubscription();
    }
  }

  private retrieveFloatingShelvesConfig(): void {
    this.hasFloatingShelves = (this.shoppingCartService.floatingShelvesConfig?.ExportOptionName?.length > 0) ? true : false;
  }

  public ifLineBreak(itemData: Position, filteredItems: Position[], index: number, first: boolean, last: boolean): boolean {
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      if (index > 0) {
        let previtemData: Position = filteredItems[index - 1];
        return (previtemData && (itemData.Position.RecommendationNumber != previtemData.Position.RecommendationNumber)) ? true : false;
      }
      if (index == 0) {
        return true;
      }
    }
    return false;
  }

  public ifLabel(itemData: Position, filteredItems: Position[], index: number, first: boolean, last: boolean): boolean {
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      let selectedShelve: FloatingShelvesTypes = this.getShelfConfig(this.shoppingCartService.floatingShelvesConfig, itemData, this.shoppingCartId);
      let label: string = selectedShelve && selectedShelve.SelectionValue ? selectedShelve.SelectionValue : "";
      return label && label.length > 0 ? true : false;
    }
    return false;
  }

  public getLabel(itemData: Position, index: number, first: boolean, last: boolean): string {
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      let selectedShelve: FloatingShelvesTypes = this.getShelfConfig(this.shoppingCartService.floatingShelvesConfig, itemData, this.shoppingCartId);
      return selectedShelve && selectedShelve.SelectionValue ? selectedShelve.SelectionValue : "";
    }
    return "";
  }

  private toWebColor(winColor: number): string {
    let hex: string = winColor.toString(16).padStart(6, '0');
    let red: string = hex.substr(4, 2);
    let green: string = hex.substr(2, 2);
    let blue: string = hex.substr(0, 2);
    return '#' + red + green + blue;
  };

  private pat_reduce(pat: string[], obj: Position): string {
    try {
      return pat.reduce((a, b) => a[b], obj);
    }
    catch {
      return "";
    }
  }

  private getField(SelectionFieldName: string, obj: Position): string {
    let pat: string[] = SelectionFieldName.split('.')
    return this.pat_reduce(pat, obj);
  }

  private getShelfConfig(floatingShelvesConfig: FloatingShelves, itemData: Position, shoppingCartId?: string): FloatingShelvesTypes {
    let val: string = this.getField(floatingShelvesConfig.SelectionFieldName, itemData);
    val = (itemData.$idParent != shoppingCartId && val == floatingShelvesConfig.posInCart) ? floatingShelvesConfig.posInCartNewName : val;
    let selectedShelve: FloatingShelvesTypes = this.shoppingCartService.floatingShelvesConfig.Shelves.find(el => el.SelectionValue == val);
    return selectedShelve;
  }

  public styleLabel(itemData: Position, index?: number, first?: boolean, last?: boolean): TextBoxStyleDetails {
    let styleObj: TextBoxStyleDetails = {
      bottom: '',
      color: '',
      height: '',
      lineHeight: '',
      textAlign: '',
      transform: '',
      verticalAlign: '',
      width: '',
      backgroundColor: ''
    };
    if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
      styleObj = cloneDeep(this.shoppingCartService.floatingShelvesConfig.TextBoxStyle);
      let selectedShelve: FloatingShelvesTypes = this.getShelfConfig(this.shoppingCartService.floatingShelvesConfig, itemData, this.shoppingCartId);
      styleObj.backgroundColor = selectedShelve && this.toWebColor(selectedShelve.ShelfColor) ? this.toWebColor(selectedShelve.ShelfColor) : "";
      styleObj.color = selectedShelve && selectedShelve.FontColor ? selectedShelve.FontColor : "";
    }
    return styleObj;
  }

  private addRecommendationNumber(cartData: Position[], shoppingCartId: string): Position[] {
    this.shoppingCartId = shoppingCartId;
    const cartItemsLen = cartData.length;
    if (cartItemsLen == 0) return cartData;
    for (let cartItem of cartData) {

      if (this.shoppingCartService.floatingShelvesConfig?.enabled) {
        let selectedShelve = this.getShelfConfig(this.shoppingCartService.floatingShelvesConfig, cartItem, this.shoppingCartId);
        cartItem.Position.RecommendationNumber = selectedShelve && selectedShelve.Index ? selectedShelve.Index : 0;
        cartItem.Position.canDragFlag = (selectedShelve ? selectedShelve.CanDrag : true);
      } else {
        switch (cartItem.Position.attributeObject.RecADRI) {
          case 'A':
            cartItem.Position.RecommendationNumber = 1;
            cartItem.Position.canDragFlag = true;
            break;
          case 'R':
            cartItem.Position.RecommendationNumber = 2;
            cartItem.Position.canDragFlag = true;
            break;
          case 'D':
            cartItem.Position.RecommendationNumber = 3;
            cartItem.Position.canDragFlag = false;
            break;
          default:
            cartItem.Position.RecommendationNumber = 0;
            cartItem.Position.canDragFlag = true;
        }
      }
    }
    return cartData;
  }
  public zoomOut(): void {
    this.overrideScaleFactor = this.overrideScaleFactor > 0 ? this.overrideScaleFactor : this.planogramService.rootFlags[this.sectionID].scaleFactor;
    this.overrideScaleFactor = this.overrideScaleFactor / 1.1;
  }
  public zoomIn(): void {
    this.overrideScaleFactor = this.overrideScaleFactor > 0 ? this.overrideScaleFactor : this.planogramService.rootFlags[this.sectionID]?.scaleFactor;
    this.overrideScaleFactor = this.overrideScaleFactor * 1.1;
  }

  public excelDownload(): void {
    let sectionID = this.sharedService.getActiveSectionId();
    const pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    const cartObj = Utils.getShoppingCartObj(pogObj.Children);
    cartObj.orderBy = this.orderBy;
    const sortedCartObj = this.sortPipe.transform(cartObj.Children, {'col':this.orderBy.predicate,'sortReverse':this.orderBy.reverse,'orders':this.orderBy.orders});
    this.jsonCreation(sortedCartObj);
    this.excelService.exportAsExcelFile(this.excelArr, pogObj.IDPOG.toString());
  }

  public get isFloatingShelveEnabled(): boolean {
    return this.shoppingCartService.floatingShelvesConfig?.enabled && (this.shoppingCartService.floatingShelvesConfig?.SelectionField != 3956);//enable retain option  for RecADRIADRI
  }

  public checkIfPositionHasImage(itemData: Position): boolean {
    const imageSide = ['front', 'left', 'top', 'back', 'right', 'bottom'][
      Math.floor(itemData.Position.IDOrientation / 4)
    ];
    return Boolean(itemData.Position.ProductPackage.Images[imageSide]);
  }

  public getToolTipData(itemData: Position): SvgToolTip[] {
    return this.planogramService.getPlanogramToolTipData(itemData);
  }

  public checkShoppingCart(itemData: Position): string {
    this.ToolTipData = this.getToolTipData(itemData);
    const image = this.ToolTipData.find((x) => x.keyName === 'Image').value as string;
    const index = this.ToolTipData.indexOf(
      this.ToolTipData.find((x) => x.keyName == 'Image'),
      0,
    );
    if (index > -1) {
      this.ToolTipData.splice(index, 1);
    }
    return image;
  }
}
