import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    ViewChild,
    Inject,
    ElementRef,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { cloneDeep, groupBy, flatten, sortBy, map, uniqBy } from 'lodash-es';
import { Subscription } from 'rxjs';
import { SelectionEvent } from '@progress/kendo-angular-grid';
import { KednoGridConfig } from 'src/app/shared/models/kendoGrid';
import { IDragDrop, DragOrigins, DragDropEventsService } from 'src/app/shared/drag-drop.module';
import { Position, Section } from 'src/app/shared/classes';
import {
    PogSideNaveView,
    SearchProductList,
    ProductLibraryMenus,
    ProductLibraryViewMode,
    SuggestProducts,
    ProductSearchSetting,
    CustomMenuClickEventPayload,
    ProductLibraryHeaderMenuShowHide,
    SearchTypeName,
    UserSearchMode
} from 'src/app/shared/models';
import { Utils, AppConstantSpace, LocalStorageKeys } from 'src/app/shared/constants';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import { ProductHierarchyComponent } from './product-hierarchy/product-hierarchy.component';
import {
    SharedService,
    ProductlibraryService,
    AgGridHelperService,
    PanelService,
    HistoryService,
    PlanogramService,
    PlanogramCommonService,
    AllocateService,
    PogSideNavStateService,
    NotifyService,
    PlanogramStoreService,
    SearchSettingService,
    Render2dService,
    ParentApplicationService
} from 'src/app/shared/services';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { Context } from 'src/app/shared/classes/context';
import { AllocateValidationService } from 'src/app/shared/services/layouts';
@Component({
    selector: 'sp-product-library',
    templateUrl: './product-library.component.html',
    styleUrls: ['./product-library.component.scss'],
})
export class ProductLibraryComponent implements OnInit, OnDestroy {
    @ViewChild('productHierarchy') productHierarchy: ProductHierarchyComponent;
    @ViewChild(`grid`) grid: KendoGridComponent;
    @ViewChild('productLibrary', { read: ElementRef }) productLibrary;
    @Input('state') state: boolean;
    @Input('isPin') isPin: boolean;
    @Input() searchData: string;
    @Output() onPinUnpintoggle: EventEmitter<boolean> = new EventEmitter();
    @Output() viewComponentInSideNav: EventEmitter<boolean> = new EventEmitter();
    @Output() getWidth: EventEmitter<number> = new EventEmitter();
    private readonly subscriptions: Subscription = new Subscription();
    private isWindowResize: boolean = false;
    public gridConfig: KednoGridConfig;
    public aggridConfig: GridConfig;
    public selectedManuKey: string = '';
    public width: number;
    public productListVisibility: boolean;
    public searchSettingVisibility: boolean;
    public searchText: string;
    public isLoadingResult: boolean;
    public data: SuggestProducts[] = [];
    public isPosResultReturned: boolean;
    public productItems: SearchProductList[] = [];
    public allProductList: SearchProductList[] = [];
    public displayMode: ProductLibraryViewMode = ProductLibraryViewMode.ListView;
    public existingProducts: string[] = [];
    public orderBy: { predicate: string, reverse: boolean } = {
        predicate: '',
        reverse: false,
    };
    public configuredCardInfo: string[] = [];

    public pogProdLibHeaderMenuShowHide: ProductLibraryHeaderMenuShowHide = {
        isProductItemSelected: true,
        showProductHierarchy: false,
        hideOrderBy: true,
        displayMode: ProductLibraryViewMode.ListView,
        productItems: false,
        isPlanogramLoaded: false,
        showAsMenu: false,
        isPin: false,
        isFilterExisting: true,
    };
    public product: ProductSearchSetting = {
        id: 'product',
        searchType: 'Product',
        itemVisibility: true,
        searchVisibility: true,
        selectedField: '',
        isAzSearch: true,
        selectedType: '*',
        includeProjectFilter: true,
    };
    @ViewChild('agGrid') gridComp: AgGridComponent;

    constructor(
        private readonly productlibraryservice: ProductlibraryService,
        private readonly sharedService: SharedService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly translate: TranslateService,
        private readonly matDialog: MatDialog,
        private readonly planogramService: PlanogramService,
        private readonly notifyService: NotifyService,
        private readonly historyService: HistoryService,
        private readonly planogramCommonService: PlanogramCommonService,
        @Optional() private dialog: MatDialogRef<ProductLibraryComponent>,
        @Optional() @Inject(MAT_DIALOG_DATA) private dialogInput: { searchData?: string, newProduct?: boolean },
        private readonly panelService: PanelService,
        private readonly dragDropEventsService: DragDropEventsService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly allocateService: AllocateService,
        private readonly log: ConsoleLogService,
        private readonly localStorage: LocalStorageService,
        private readonly pogSideNavStateService: PogSideNavStateService,
        private readonly searchSetting: SearchSettingService,
        private readonly render2d: Render2dService,
        private readonly parentApp: ParentApplicationService,
        private readonly allocateValidator: AllocateValidationService
    ) { }

    ngOnInit(): void {
        const pog = this.planogramStore.getPogById(this.sharedService.getSelectedIDPOG());
        this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded = Boolean(pog);
        //search data should be retained when maximize
        if (this.dialogInput?.searchData || this.searchData) {
            this.productItems = this.productlibraryservice.ProductGallery.products;
            this.data = this.productlibraryservice.ProductGallery.suggestionData;
            this.searchText = this.productlibraryservice.ProductGallery.searchText;
            this.existingProducts = this.productlibraryservice.ProductGallery.existingProducts;
            this.pogProdLibHeaderMenuShowHide.isFilterExisting =
                this.productlibraryservice.ProductGallery.isFilterExisting;
            this.allProductList = this.productlibraryservice.ProductGallery.allProductList;
        }
        this.pogProdLibHeaderMenuShowHide.productItems = this.productItems.length ? true : false;
        this.pogProdLibHeaderMenuShowHide.isPin = this.isPin;
        this.width = this.pogSideNavStateService.productLibView.width;
        this.isPosResultReturned = this.productlibraryservice.ProductGallery.isPosResultReturned;
        this.restoreDisplayMode();
        this.pogProdLibHeaderMenuShowHide.showAsMenu = this.state;
        this.registerEventSubscriptions();

        if (this.productItems.length > 0 && this.productlibraryservice.selectedProductList.length > 0) {
            this.productlibraryservice.selectedProductList.forEach(sp => {
                let product = this.productItems.find(p => p.IDProduct == sp.IDProduct && p.IDPackage == sp.IDPackage);
                if (!!product)
                    product.selected = true;
            })
        }
        const settingValue = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(set => set.KeyName == 'PRODUCTLIST_TEMPLATE')?.KeyValue;
        this.configuredCardInfo = !Utils.isNullOrEmpty(settingValue) ? eval(settingValue as string) : [];
    }

    public registerEventSubscriptions(): void {
        this.subscriptions.add(this.dragDropEventsService.beginDrag.subscribe(() => this.toggleProductLib(true)));
        this.subscriptions.add(this.dragDropEventsService.endDrag.subscribe(() => this.toggleProductLib(false)));
        this.subscriptions.add(this.dragDropEventsService.itemDropped.subscribe(() => this.reBindProductList()));
        this.subscriptions.add(
            this.sharedService.updateProductsList.subscribe((arg) => {
                if (arg) {
                    this.prepareExistingList();
                    switch (this.displayMode) {
                        case ProductLibraryViewMode.ListView:
                            if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
                                this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
                            }
                            break;
                        case ProductLibraryViewMode.GridView:
                            this.bindProductGrid();
                            break;
                        case ProductLibraryViewMode.ProductHierarchyView:
                            this.productHierarchy?.reBindProductHierarchy(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
                            break;
                    }
                }
            })
        );
        this.subscriptions.add(this.render2d.onKeyDown.subscribe(ev=>this.onKeyDown(ev)));
    }

    public onKeyUp(event: KeyboardEvent): void {
      event.stopImmediatePropagation();
    }

    private onKeyDown(event: KeyboardEvent): void {
        setTimeout(()=>{
            switch (event.key) {
                case "ArrowDown":
                    if (event.shiftKey) {
                        this.selectNextItem('multi', 'down');
                    } else {
                        if (!event.ctrlKey) {
                            this.selectNextItem('single', 'down');
                        }
                    }
                    break;
                case "ArrowUp":
                    if (event.shiftKey) {
                        this.selectNextItem('multi', 'up');
                    } else {
                        if (!event.ctrlKey) {
                            this.selectNextItem('single', 'up');
                        }
                    }
                    break;
            }
        })

    }

    public getDragDropData(itemData: SearchProductList): IDragDrop {
        // TODO: define type
        const dropData: IDragDrop = {
            $id: `productlib|${itemData.IDPackage}|${itemData.ProductPackage.IDProduct}`,
            ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
            $sectionID: '',
            dragOriginatedFrom: DragOrigins.ProductLibrary,
            dragDropSettings: { drag: true, drop: false },
        };
        return dropData;
    }

    public getDragDropDataGrid(): IDragDrop {
        const dropData: IDragDrop = {
            $id: `productlib_grid`,
            ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
            $sectionID: '',
            dragOriginatedFrom: DragOrigins.ProductLibrary,
            dragDropSettings: { drag: true, drop: false },
        };
        return dropData;
    }

    private getSearchData(): void {
        const keys = this.searchSetting.getSearchSettingsNames(SearchTypeName.PRODUCT);
        const mode = this.searchSetting.getSearchSetting<'Enterprise' | 'DB'>(keys.ModeKey);
        const field = this.searchSetting.getSearchSetting<string>(keys.FieldKey);

        this.product.isAzSearch = mode === UserSearchMode.ENTERPRISE;
        this.product.selectedType = field;

        if (field === '*') {
            this.product.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
        } else {
            const fieldDesc = this.translate.instant(this.searchSetting.getFieldDescription(SearchTypeName.PRODUCT, field));
            this.product.selectedField = `${this.translate.instant('SEARCH_BY')} <${fieldDesc}>`;
        }
    }

    public getServerResponse(text: string): void {
        this.searchText = text;
        text = text.replaceAll(" ","  ");
        this.productlibraryservice.ProductGallery[`searchText`] = text;
        if (!this.product.isAzSearch) {
            this.getProductsList();
        } else if (text) {
            text = text.replaceAll("  "," ");
            let suggestText = text.indexOf(' ') !== -1 ? text.substring(0, text.length).substring(0, text.indexOf(' ')) : text;
            this.isLoadingResult = true;
            this.subscriptions.add(this.productlibraryservice
                .GetProductSearch(suggestText, this.product.isAzSearch)
                .subscribe((response: SuggestProducts[]) => {
                    this.isPosResultReturned = response.length ? this.isPosResultReturned : true;
                    response.forEach((ele) => {
                        let str: string = '';
                        if (ele.UPC) {
                            str += `${ele.UPC} - `;
                        }
                        if (ele.Name) {
                            str += ele.Name;
                        }
                        if (ele.PackageName) {
                            str += `(${ele.PackageName})`;
                        }
                        let str1: string = '';
                        if (ele.L1) {
                            str1 += `${ele.L1}/`;
                        }
                        if (ele.L2) {
                            str1 += `${ele.L2}/`;
                        }
                        if (ele.L3) {
                            str1 += ele.L3;
                        }
                        ele.ComboGTIN_NAME_PKGNAME = str;
                        ele.ComboL123 = str1;
                    });
                    this.data = [...response];
                    this.isLoadingResult = false;
                }));
        }
    }

    public customFilter(): SuggestProducts[] {
        return this.data;
    }

    public clearProductSearch(): void {
        this.searchText = '';
        this.isPosResultReturned = false;
        this.data = [];
        this.productItems = [];
        this.pogProdLibHeaderMenuShowHide.productItems = this.productItems.length ? true : false;
        this.displayMode === ProductLibraryViewMode.GridView ? this.bindProductGrid() : '';
        this.allProductList = [];
        this.productlibraryservice.ProductGallery = {
            products: [],
            searchText: '',
            hierarchyProducts: [],
            suggestionData: [],
            isFilterExisting: true,
            existingProducts: [],
            isPosResultReturned: false,
            allProductList: []
        }
    }

    public selectEvent(item: SuggestProducts): void {
        this.searchText = item.Name;
        this.getProductsList();
        this.productlibraryservice.ProductGallery.searchText = this.searchText;
    }

    private getProductHierarchy(): void {
        this.pogProdLibHeaderMenuShowHide.showProductHierarchy = true;
        this.productHierarchy.searchProducts();
    }

    public getProductsList(): void {
        this.productItems = [];
        this.productlibraryservice.ProductGallery.products = [];
        this.allProductList = [];
        this.prepareExistingList();
        if (this.searchText) {
            if (typeof this.searchText === 'undefined') {
                this.searchText = '*';
            }
            this.isPosResultReturned = false;
            const idProdHier = {
                isAzSearch: this.product.isAzSearch,
                searchText: this.searchText,
                searchableColumn: this.product.selectedType,
                idProdHier: 0,
            };
            this.subscriptions.add(
                this.productlibraryservice.getSearchProducts(idProdHier).subscribe(
                    (response) => {
                        if (response.Data) {
                            this.isPosResultReturned = true;
                            response.Data = sortBy(response.Data, (val) => {
                                return val.LastModifiedDate;
                            });
                            const uniqueList = flatten(
                                map(
                                    groupBy(response.Data.reverse(), (val) => {
                                        return val.ProductPackage.IdPackageStyle;
                                    }),
                                    (item) => {
                                        return uniqBy(item, 'UPC');
                                    },
                                ),
                            );
                            this.productItems = cloneDeep(uniqueList);
                            this.productlibraryservice.ProductGallery.products = this.productItems;
                            this.pogProdLibHeaderMenuShowHide.productItems =
                                this.productItems.length ? true : false;
                            this.allProductList = uniqueList;
                            if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
                                this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
                            }
                            if (this.displayMode === ProductLibraryViewMode.GridView) {
                                this.bindProductGrid();
                            }
                        }
                    },
                    (error) => {
                        this.log.error('error retriving immediate mmchild' + error);
                    },
                ),
            );
        }
        this.productlibraryservice.ProductGallery.searchText = this.searchText;
    }

    public bindProductGrid(): void {
        const selectionArray = this.prepareProductItems();
        if (this.gridComp) {
            this.gridComp.gridApi.setRowData(this.productItems);
        } else {
            let columnDefs = this.agGridHelperService.getAgGridColumns(`shelf_prod_search_details`);
            let imageIndex = columnDefs.findIndex(c => c.field === 'ProductPackage.Images.front');
            columnDefs[imageIndex].filter = false;
            columnDefs[imageIndex].enableRowGroup = false;
            this.aggridConfig = {
                ...this.aggridConfig,
                id: `shelf_prod_search_details`,
                columnDefs: columnDefs,
                data: this.productItems,
                height: this.state ? 'calc(100vh - 12em)' : 'calc(100vh - 21em)',
                setRowsForSelection: { items: selectionArray, field: 'IDPackage' },
            }
        }

    }
    public invokeSelectedRow(events: SelectionEvent): void {
        this.productlibraryservice.selectedProductList = [];
        const selectedRows = this.gridComp.gridApi.getSelectedRows();
        selectedRows.forEach(rows => {
            this.productlibraryservice.selectedProductList.push(rows);
        });
    }

    public onDialogClick(event: MouseEvent):void {
        if( !ProductLibraryViewMode.GridView){
            this.productLibrary.nativeElement.focus();
            event.stopPropagation();
        }
      }

    public clickedItemSelection(itemData: SearchProductList, event?: MouseEvent): void {
        this.productLibrary.nativeElement.focus();
        if (this.dialogInput?.newProduct) {
            this.dialog.close({ itemData: itemData });
            return;
        }
        const len = this.productlibraryservice.selectedProductList.length;
        if (event && event.type === 'click' && event.shiftKey && len > 0) {
            const lastSelectItm = this.productlibraryservice.selectedProductList[len - 1];
            let lastIndex = this.productItems.indexOf(lastSelectItm);
            let newIndex = this.productItems.indexOf(itemData);
            let diff = newIndex - lastIndex;
            diff = diff < 0 ? -1 : 1;
            this.productlibraryservice.selectedProductList.map((prdct) => {
                prdct.selected = false;
            });
            this.productlibraryservice.selectedProductList.length = 0;
            for (; newIndex !== lastIndex;) {
                this.productlibraryservice.selectedProductList.push(this.productItems[lastIndex]);
                this.productItems[lastIndex].selected = true;
                lastIndex = lastIndex + diff;
            }
            this.productlibraryservice.selectedProductList.push(this.productItems[newIndex]);
            this.productItems[newIndex].selected = true;
        } else if (!itemData.selected) {
            itemData.selected = true;
            this.productlibraryservice.selectedProductList.push(itemData);
        } else {
            itemData.selected = false;
            const pos = this.productlibraryservice.selectedProductList.indexOf(itemData);
            this.productlibraryservice.selectedProductList.splice(pos, 1);
        }
    }

    public onSetting(): void {
        this.productListVisibility = false;
        this.searchSettingVisibility = true;
    }

    public cancelSearchSetting(selectedProductObj: ProductSearchSetting): void {
        this.product = selectedProductObj;
        this.productListVisibility = true;
        this.searchSettingVisibility = false;
        switch (this.displayMode) {
            case ProductLibraryViewMode.ListView:
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_LIST;
                break;
            case ProductLibraryViewMode.GridView:
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_GRID;
                break;
            case ProductLibraryViewMode.ProductHierarchyView:
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_PRODHIRARCHY;
                break;
        }
    }

    public selectAll(): void {
        if (this.displayMode === ProductLibraryViewMode.GridView && !this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.gridComp.gridApi.selectAll();
            this.productlibraryservice.selectedProductList = this.gridComp.gridConfig.data;
        } else if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productHierarchy.selectAllProducts();
        } else {
            this.productlibraryservice.selectedProductList.length = 0;
            this.productItems.forEach((element) => {
                if (!element.selected) {
                    this.clickedItemSelection(element);
                } else {
                    this.productlibraryservice.selectedProductList.push(element);
                }
            });
        }
    }

    public unSelectAll(): void {
        if (this.displayMode === ProductLibraryViewMode.GridView && !this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            //this.grid.mySelection = [];
            this.gridComp.gridApi.deselectAll();
            this.productlibraryservice.selectedProductList.length = 0;
            this.bindProductGrid();
        } else if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productHierarchy.unSelectAllProducts();
        } else {
            this.productlibraryservice.selectedProductList.length = 0;
            this.productItems.forEach((element) => {
                element.selected = false;
            });
        }
    }

    public isProductItemSelected(): number {
        this.pogProdLibHeaderMenuShowHide.isProductItemSelected =
            this.productlibraryservice.selectedProductList.length ? true : false;
        return this.productlibraryservice.selectedProductList.length;
    }

    public productItemsFromHierarachy(items: SearchProductList[]): void {
        if (items.length) {
            this.pogProdLibHeaderMenuShowHide.productItems = true;
        }
    }

    public orderSearchBy(predicate: string): void {
        this.orderBy.predicate = predicate;
        this.orderBy.reverse = !this.orderBy.reverse;
    }

    public isPosDataAvailable(): boolean {
        if (!this.searchText && !this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productItems = [];
            this.productlibraryservice.ProductGallery.products = [];
            this.isPosResultReturned = false;
        }
        if (
            this.searchText &&
            !this.productItems.length &&
            this.isPosResultReturned &&
            !this.pogProdLibHeaderMenuShowHide.showProductHierarchy
        ) {
            return false;
        } else {
            return true;
        }
    }

    //To get the Image URL, If the value is null it will give by default no-img.png
    public getImage(itemData): string {
        if (itemData.ProductPackage.Images.front) {
            return itemData.ProductPackage.Images.front;
        } else if (itemData.ProductPackage.Images.back) {
            return itemData.ProductPackage.Images.back;
        } else if (itemData.ProductPackage.Images.left) {
            return itemData.ProductPackage.Images.left;
        } else if (itemData.ProductPackage.Images.right) {
            return itemData.ProductPackage.Images.right;
        } else if (itemData.ProductPackage.Images.top) {
            return itemData.ProductPackage.Images.top;
        } else if (itemData.ProductPackage.Images.bottom) {
            return itemData.ProductPackage.Images.bottom;
        } else {
            return AppConstantSpace.NO_IMAGE;
        }
    }

    public addToShoppingCart(item?: SearchProductList): void {
        if (!this.sharedService.checkIfAssortMode('new-position-add')) {
            if (this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
                let itemsToAdd: SearchProductList[] = [];
                const rootObj = this.sharedService.getObject(
                    this.sharedService.activeSectionID,
                    this.sharedService.activeSectionID,
                ) as Section;
                if (item) {
                    itemsToAdd.push(item);
                } else {
                    itemsToAdd = this.productlibraryservice.selectedProductList;
                }
                if(this.parentApp.isAllocateApp) {
                  this.allocateValidator.validateProducts(itemsToAdd).subscribe((isValid) => {
                    if(isValid) {
                      this.processProductAndAddtoShoppingCart(itemsToAdd, rootObj, item);
                    }
                  })
                } else {
                  this.processProductAndAddtoShoppingCart(itemsToAdd, rootObj, item);
                }
            }
        } else {
            this.notifyService.warn('ADDING_TO_CART_IS_DISABLED');
        }
    }

    private processProductAndAddtoShoppingCart(itemsToAdd: SearchProductList[], rootObj: Section, item?: SearchProductList): void {
      this.historyService.startRecording();
      const ctx = new Context(rootObj);
      let cartObj = Utils.getShoppingCartObj(rootObj.Children);
      let itemNotAdded: number = 0;
      const positionItemsToAdd: Position[] = this.planogramCommonService.initPrepareModel(itemsToAdd, rootObj);
      positionItemsToAdd.forEach((element) => {
          if (element.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
              if (typeof element.moveSelectedToCartfromProductSearch === 'function') {
                  let itemAdded = element.moveSelectedToCartfromProductSearch(ctx, cartObj);
                  itemAdded ? '' : itemNotAdded++;
                  this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag =
                      true;
                  this.planogramService.updateSaveDirtyFlag(
                      this.planogramService.rootFlags[this.sharedService.getActiveSectionId()]
                          .isSaveDirtyFlag,
                  );
                  const item = this.productlibraryservice.selectedProductList.find(
                      (item) => item.IDPackage === element['IDPackage'],
                  );
                  if (
                      itemAdded &&
                      item &&
                      item.selected
                  ) {
                      this.clickedItemSelection(item);
                  } else if (!itemAdded) {
                      this.planogramService.cleanByID(rootObj.$sectionID, element.$id);
                      this.requestToBack();
                  }
              }
          }
      });
      if (!this.pogProdLibHeaderMenuShowHide.showProductHierarchy && this.displayMode === ProductLibraryViewMode.GridView) {
          this.getProductsList();
      } else if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
          this.getProductHierarchy();
      }
      if (itemNotAdded) {
          this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = false;
          this.planogramService.updateSaveDirtyFlag(
              this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag,
          );
          if (item) {
              this.notifyService.warn('PRODUCT_IS_ALREADY_EXIST_IN_SHOPPING_CART_PLANOGRAM');
          } else {
              this.productlibraryservice.selectedProductList.length === 1
                  ? this.notifyService.warn('PRODUCT_IS_ALREADY_EXIST_IN_SHOPPING_CART_PLANOGRAM')
                  : this.notifyService.warn(
                      'SOME_OF_THE_PRODUCTS_ARE_ALREADY_EXIST_IN_SHOPPINGCART_PLANOGRAM',
                  );
          }
      } else {
          this.notifyService.warn('PRODUCTS_ADDED_SUCCESSFULLY_TO_CART');
          if (!this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
              this.requestToBack();
          } else if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
              this.requestToBackToHierarachyscreen();
          }
      }
      this.historyService.stopRecording();
    }

    private requestToBackToHierarachyscreen(): void {
        this.productlibraryservice.selectedProductList.forEach((element) => {
            element.selected = false;
        });
        this.productlibraryservice.selectedProductList.length = 0;
        this.pogProdLibHeaderMenuShowHide.showProductHierarchy = true;
    }

    public requestToBack(): void {
        this.productlibraryservice.selectedProductList.forEach((element) => {
            element.selected = false;
        });
        this.productlibraryservice.selectedProductList.length = 0;
        if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.pogProdLibHeaderMenuShowHide.showProductHierarchy = !this.pogProdLibHeaderMenuShowHide.showProductHierarchy;
        }
        if (this.prepareExistingList().length && this.displayMode === ProductLibraryViewMode.ListView) {
            if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded && !this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
                this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
            }
        }
    }

    public toggleDisplayMode(value: ProductLibraryViewMode): void {
        this.displayMode = value;
        this.pogProdLibHeaderMenuShowHide.displayMode = value;
        this.pogProdLibHeaderMenuShowHide.hideOrderBy = false;
        this.pogProdLibHeaderMenuShowHide.showProductHierarchy = false;
        switch (value) {
            case ProductLibraryViewMode.ListView:
                if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
                    this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
                }
                this.pogProdLibHeaderMenuShowHide.hideOrderBy = true;
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_LIST;
                break;
            case ProductLibraryViewMode.GridView:
                if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
                    this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
                }
                this.bindProductGrid();
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_GRID;
                break;
            case ProductLibraryViewMode.ProductHierarchyView:
                this.pogProdLibHeaderMenuShowHide.showProductHierarchy = true;
                this.selectedManuKey = ProductLibraryMenus.pogProductLibView_VIEW_PRODHIRARCHY;
                this.pogProdLibHeaderMenuShowHide.productItems =
                    this.productlibraryservice.ProductGallery.hierarchyProducts.length ? true : false;
                break;
        }

        this.localStorage.setNumber(LocalStorageKeys.PRODUCT_LIBRARY_VIEW, this.displayMode);
        this.productListVisibility = true;
        this.searchSettingVisibility = false;
        this.getSearchData();
    }

    private filterExitstingItems(filteroff?: boolean): void {
        this.productItems = cloneDeep(this.allProductList);
        this.prepareExistingList();
        if (filteroff) {
            this.productItems = this.productItems.filter(item => !this.existingProducts.includes(`${item.IDProduct.toString()}@${item.IDPackage.toString()}`));
        }
        this.pogProdLibHeaderMenuShowHide.productItems = this.productItems.length ? true : false;
        this.productItems.forEach(obj => {
            obj.filteredStyle = this.getStyleForImage(obj);
        });
        if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productHierarchy?.reBindProductHierarchy(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
        }
    }

    private prepareExistingList(): string[] {
        if (!this.panelService.activePanelID) {
            this.pogProdLibHeaderMenuShowHide.isFilterExisting = true;
            this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded = false;
            return;
        }

        let exstArr: string[] = [];
        const sectionID = this.panelService.panelPointer[this.panelService.activePanelID].sectionID;
        if (sectionID) {
            this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded = true;
            let list: Position[] = this.sharedService.getAllPositionFromObjectList(sectionID);
            list.forEach(obj => {
                exstArr.push(`${obj.Position.IDProduct.toString()}@${obj.Position.IDPackage.toString()}`);
            });
        } else {
            this.pogProdLibHeaderMenuShowHide.isFilterExisting = true;
            this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded = false;
        }
        this.existingProducts = exstArr;
        return exstArr;
    }

    private toggleFilterExistingItem(): void {
        this.pogProdLibHeaderMenuShowHide.isFilterExisting = !this.pogProdLibHeaderMenuShowHide.isFilterExisting;
        this.filterExitstingItems(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
        if (this.displayMode === ProductLibraryViewMode.GridView) {
            this.bindProductGrid();
        }
    }

    public onClose(): void {
        if (this.state) {
            let gettxt = document.getElementById('PL');
            if (gettxt) {
                gettxt.style.fontWeight = '500';
            }
            this.pogProdLibHeaderMenuShowHide.isPin = true;
            this.isPin = true;
            this.pogSideNavStateService.activeVeiw =
                this.pogSideNavStateService.activeVeiw === PogSideNaveView.PRODUCT_LIBRARY ? null : ('' as any);
            this.viewComponentInSideNav.emit(false);
        } else {
            this.dialog.close();
        }
    }

    public onPinUnpin(): void {
        this.isPin = !this.isPin;
        this.pogProdLibHeaderMenuShowHide.isPin = this.isPin;
        this.onPinUnpintoggle.emit(this.isPin);
    }

    public changeSideNavWidth(id: string, event: MouseEvent): void {
        if (id === 'maximize' && this.width < 50 && this.width >= 30) {
            this.width = this.width + 10;
        } else if (id === 'minimize' && this.width > 30) {
            this.width = this.width - 10;
        } else {
            this.width = 30;
        }
        this.getWidth.emit(this.width);
        event.stopPropagation();
    }

    public openProductDialog(): void {
        this.isWindowResize = true;
        this.saveDataToProductLibrary();
        this.onClose();
        this.allocateService.resizeParentWindow(true);
        const dialogRef = this.matDialog.open(ProductLibraryComponent, {
            height: 'fit-content',
            width: '100%',
            data: { searchData: this.searchText },
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.allocateService.resizeParentWindow(false);
        });
    }

    public openInSideNav(): void {
        this.isWindowResize = true;
        this.saveDataToProductLibrary();
        this.dialog.close();
        this.sharedService.openSelectedComponentInSideNav.next({
            activeScreen: 'PL',
            isPin: true,
            searchData: this.searchText,
        })
    }

    public menuButtonClick_PogLib(response: CustomMenuClickEventPayload): void {
        let selectedMenu = response.data;
        if (selectedMenu) {
            if (!(selectedMenu.childMenus.length)) {
                this.selectedManuKey = selectedMenu.key;
            }
            switch (selectedMenu.key.trim()) {
                case ProductLibraryMenus.pogProductLibView_VIEW_LIST:
                    this.toggleDisplayMode(ProductLibraryViewMode.ListView);
                    break;
                case ProductLibraryMenus.pogProductLibView_VIEW_GRID:
                    this.toggleDisplayMode(ProductLibraryViewMode.GridView);
                    break;
                case ProductLibraryMenus.pogProductLibView_VIEW_PRODHIRARCHY:
                    this.toggleDisplayMode(ProductLibraryViewMode.ProductHierarchyView);
                    break;
                case ProductLibraryMenus.pogProductLibView_PIN:
                case ProductLibraryMenus.pogProductLibView_UNPIN:
                    this.onPinUnpin();
                    break;
                case ProductLibraryMenus.pogProductLibView_PIN_WINDOW:
                    this.openInSideNav();
                    break;
                case ProductLibraryMenus.pogProductLibView_OPENINWINDOW:
                    this.openProductDialog();
                    break;
                case ProductLibraryMenus.PohHighlightView_CLOSE:
                    this.onClose();
                    break;
                case ProductLibraryMenus.pogProductLibView_SELECTALL:
                    this.selectAll();
                    break;
                case ProductLibraryMenus.pogProductLibView_SETTTINGS:
                    this.onSetting();
                    break;
                case ProductLibraryMenus.pogProductLibView_FILTERITEMINSHELF_CHECK:
                case ProductLibraryMenus.pogProductLibView_FILTERITEMINSHELF:
                    this.toggleFilterExistingItem();
                    break;

                case ProductLibraryMenus.pogProductLibView_ADDCART:
                    this.addToShoppingCart();
                    break;

                case ProductLibraryMenus.pogProductLibView_REMOVE:
                    this.unSelectAll();
                    break;
                    default : { //sort options made dynamic and handled using template
                        if(selectedMenu?.key.includes("pogProductLibView_SORT") && !selectedMenu?.childMenus.length){
                            this.orderSearchBy(selectedMenu.template);
                        }
                    }

            }
        }
    }

    //Multi selection
    public selectNextItem(mode: string, direction: string): void {
        let selectedItems = this.productlibraryservice.selectedProductList;
        let selectedItemsLen = selectedItems.length;
        if (selectedItemsLen >= 1 && this.displayMode !== ProductLibraryViewMode.GridView) {
            let lastSelectedItem: SearchProductList = selectedItems[selectedItemsLen - 1];
            let nextSilblingID = {};
            let prevSilblingID = {};
            let nextSibliingObject: any = {};
            let nextSelectionID: number = null;
            if (document.getElementById(lastSelectedItem.IDPackage as string)) {
                let prevSilblingclass = document.getElementById(lastSelectedItem.IDPackage as string).previousElementSibling;
                let nextSilblingclass = document.getElementById(lastSelectedItem.IDPackage as string).nextElementSibling;

                nextSilblingID = document.getElementById(lastSelectedItem.IDPackage as string).nextElementSibling;
                prevSilblingID = document.getElementById(lastSelectedItem.IDPackage as string).previousElementSibling;

                if (direction === 'down') {
                    if (nextSilblingID) {
                        nextSelectionID = Number(nextSilblingID['id']);
                        nextSibliingObject = this.productItems.find((item) => item.IDPackage === nextSelectionID);
                        if (nextSibliingObject['selected']) {
                            nextSibliingObject = lastSelectedItem;
                        }
                    }
                } else {
                    if (direction === 'up') {
                        if (prevSilblingID != undefined && prevSilblingID != null) {
                            nextSelectionID = Number(prevSilblingID['id']);
                            nextSibliingObject = this.productItems.find((item) => item.IDPackage === nextSelectionID);
                            if (nextSibliingObject['selected']) {
                                nextSibliingObject = lastSelectedItem;
                            }
                        }
                    }
                }

                if (!nextSelectionID) {
                    if (mode === 'single') {
                        this.requestToBack();
                        if (lastSelectedItem.IDPackage) this.clickedItemSelection(lastSelectedItem);
                    }
                    return;
                }

                if (direction === 'up' && prevSilblingclass) {
                    prevSilblingclass.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
                }
                if (direction === 'down' && nextSilblingclass) {
                    nextSilblingclass.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'nearest' });
                }
                if (mode === 'multi' && nextSibliingObject.IDPackage) {
                    this.clickedItemSelection(nextSibliingObject);
                } else {
                    if (mode === 'single' && nextSibliingObject.IDPackage) {
                        this.requestToBack();
                        this.clickedItemSelection(nextSibliingObject);
                    }
                }
            }
        }
    }

    public getStyleforAvailable(item: SearchProductList): { 'background-color'?: string; width?: string; height?: string; position?: string; bottom?: string; left?: string; display: string } {
        const idProd = item.IDProduct.toString() + '@' + item.IDPackage.toString();
        if (this.existingProducts.indexOf(idProd) > -1 && !this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
            return {
                'background-color': 'purple',
                width: '3px',
                height: '90%',
                position: 'absolute',
                bottom: '4%',
                left: '0px',
                display: 'block',
            };
        } else {
            return {
                display: 'none',
            };
        }
    }

    public getStyleForImage(dataItem: SearchProductList): string {
        const idProd = dataItem.IDProduct.toString() + '@' + dataItem.IDPackage.toString();
        if (this.existingProducts.indexOf(idProd) > -1 && !this.pogProdLibHeaderMenuShowHide.isFilterExisting && this.pogProdLibHeaderMenuShowHide.isPlanogramLoaded) {
            return "borderLeftPurple";
        } else {
            return "";
        }
    }

    private toggleProductLib(toggle: boolean): void {
        const dialogRef = this.dialog;
        //dialog mode
        if (dialogRef) {
            if (toggle) {
                document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = 'hidden';
                //  timeout necessary as hiding before dnd registers the element, triggers drag end.
                setTimeout(() => {
                    document.querySelector(`#${dialogRef.id}`).parentElement.classList.add('hidden-dialog');
                });
            } else {
                document.querySelector<HTMLElement>('.cdk-overlay-backdrop').style.visibility = 'visible';
                setTimeout(() => {
                    document.querySelector(`#${dialogRef.id}`).parentElement.classList.remove('hidden-dialog');
                });
                this.reBindProductList();
            }
        } else {
            let backdrop: HTMLElement = document.querySelector('.mat-drawer-backdrop');
            if (backdrop) {
                if (toggle) {
                    backdrop.style.display = 'none';
                } else {
                    backdrop.style.display = 'block';
                    this.reBindProductList();
                    this.productLibrary.nativeElement.blur();
                }
            }
        }
    }

    private reBindProductList(): void {
        this.prepareExistingList();
        if (this.pogProdLibHeaderMenuShowHide.isFilterExisting && !this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productItems = this.productItems.filter(item => !this.existingProducts.includes(`${item.IDProduct.toString()}@${item.IDPackage.toString()}`));
        }
        if (this.displayMode === ProductLibraryViewMode.GridView) {
            this.prepareProductItems()
            this.gridComp?.gridApi?.setRowData(this.productItems);
        }

        if (this.displayMode === ProductLibraryViewMode.ProductHierarchyView && this.pogProdLibHeaderMenuShowHide.showProductHierarchy) {
            this.productHierarchy.reBindProductHierarchy(this.pogProdLibHeaderMenuShowHide.isFilterExisting);
        }
    }

    private prepareProductItems(): SearchProductList[] {
        let searchedArray: SearchProductList[] = [];
        if (this.productItems.length) {
            searchedArray = this.productlibraryservice.selectedProductList.filter(x => {
                return this.productItems.some(p => {
                    return p['IDProduct'] === x.IDProduct && p['IDPackage'] === x.IDPackage
                })
            });

            this.productItems.forEach(obj => {
                obj.filteredStyle = this.getStyleForImage(obj);
            });
        }
        return searchedArray;
    }

    private saveDataToProductLibrary(): void {
        this.productlibraryservice.ProductGallery = {
            products: this.productItems,
            searchText: this.searchText,
            suggestionData: this.data,
            isFilterExisting: this.pogProdLibHeaderMenuShowHide.isFilterExisting,
            existingProducts: this.existingProducts,
            hierarchyProducts: this.productlibraryservice.ProductGallery.hierarchyProducts,
            isPosResultReturned: this.isPosResultReturned,
            allProductList: this.allProductList,
        };
    }

    private restoreDisplayMode(): void {
        const saved = this.localStorage.getNumber(LocalStorageKeys.PRODUCT_LIBRARY_VIEW);
        const displayMode = saved ? saved as ProductLibraryViewMode : ProductLibraryViewMode.ListView;
        this.toggleDisplayMode(displayMode);
    }

    ngOnDestroy(): void {
        if (!this.isWindowResize) {
            this.clearProductSearch();
            if (this.productlibraryservice.selectedProductList.length > 0)
                this.productlibraryservice.selectedProductList = [];
            if (this.pogProdLibHeaderMenuShowHide.showProductHierarchy)
                this.productlibraryservice.selectedKeys = [];
        }
        this.subscriptions.unsubscribe();
    }
}
