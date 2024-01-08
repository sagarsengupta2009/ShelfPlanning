import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { AppConstantSpace } from 'src/app/shared/constants';
import { IApiResponse, ProductType, PogActionTypes, apiEndPoints } from 'src/app/shared/models';
import {
  SharedService, LocalSearchService, PlanogramLibraryService,
  UserPermissionsService, PlanogramService, AllocateService,
  PlanogramCommonService, HistoryService, PanelService,
  ShelfbumpService, NotifyService, Render2dService, BlockHelperService, ParentApplicationService
} from 'src/app/shared/services';
import { AdvanceSearchComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/advance-search/advance-search.component';
import { Position, Section } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { AllocateValidationService } from '../../../allocate/validation/allocate-validation.service';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  public searchOption: string;
  public searchText: string = 'Please fill out this field';
  public searchPlaceHolder: string;
  public display: string;
  public selectedSearchField: string;
  public advanceOption = new Subject<string>();
  public searchReadOnly: boolean = false;
  public searchCountChange = new Subject<boolean>();

  constructor(private readonly sharedService: SharedService,
    private readonly notifyService: NotifyService,
    private readonly localSearch: LocalSearchService,
    private readonly dialog: MatDialog,
    private readonly LibraryToBase: PlanogramLibraryService,
    private readonly userPermissions: UserPermissionsService,
    private readonly planogramService: PlanogramService,
    private readonly translate: TranslateService,
    private readonly allocateService: AllocateService,
    private readonly http: HttpClient,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly panelServie: PanelService,
    private readonly historyService: HistoryService,
    private readonly shelfbumpService: ShelfbumpService,
    private readonly render2d: Render2dService,
    private readonly blockhelper: BlockHelperService,
    private readonly envConfig: ConfigService,
    private readonly parentApp: ParentApplicationService,
    private readonly allocateValidator: AllocateValidationService
  ) { }

  public shelfSearchOption(option: string): boolean {
    let isadvanceOptions = true;
    this.searchOption = option;
    if (option == 'FieldSearch' || option == 'Actions') {
      const dialogRef = this.dialog.open(AdvanceSearchComponent, {
        width: '30vw',
        height: '70%',
        data: option
      });
      dialogRef.beforeClosed().subscribe(result => {
        this.allocateService.resizeParentWindow(false);
      });
      // TODO: @malu why do you need this emitter?
      dialogRef.componentInstance.emitAction.subscribe((result: string) => {
        if (result) {
          this.searchText = result;
          this.searchReadOnly = true;
          this.advanceOption.next(result);
          dialogRef.close();
        }
      })
    }
    else if (option == 'Expression') {
      const dialogRef = this.dialog.open(AdvanceSearchComponent, {
        width: '50vw',
        height: '80%',
        data: option
      });
      dialogRef.beforeClosed().subscribe(result => {
        this.allocateService.resizeParentWindow(false);
      });
      dialogRef.componentInstance.emitExpression.subscribe((result: string) => {
        if (result) {
          this.searchText = result;
          this.searchReadOnly = true;
          this.advanceOption.next(result);
        }
      })
    }
    if (option == 'ItemScanning') {
      this.toggleItemscanning();
      isadvanceOptions = false;
    }
    return isadvanceOptions;
  }

  public toggleItemscanning(): void {
    let sectionId = this.sharedService.getActiveSectionId();
    if (sectionId) {
      this.sharedService.isItemScanning = !this.sharedService.isItemScanning;
      this.initiateItemscanning()
    }
    else {
      this.notifyService.warn('Please load the Planogram and then select a fixture / position before scanning item.');
    }
  }

  public closeSearchBox(): void {
    this.searchOption = '';
    this.localSearch.search = '';
    this.sharedService.isItemScanning = false;
    this.setPlaceHolder();
  }

  public setPlaceHolder(): void {
    this.sharedService.changeSearchedText('');
    
    this.searchText = '';
    this.searchOption = '';
    if (this.display == 'Header') {
      if (this.sharedService.isShelfLoaded) {
        this.localSearch.placeHolderValue = this.translate.instant('LOCAL_SEARCH_FIND_AND_SELECT');
        this.searchPlaceHolder = this.translate.instant('LOCAL_SEARCH_FIND_AND_SELECT');
      } else {
        this.localSearch.placeHolderValue = this.translate.instant(`PLANOGRAM_LIBRARY_SEARCH`);
        this.searchPlaceHolder = this.translate.instant(`PLANOGRAM_LIBRARY_SEARCH`);
      }
      this.sharedService.isItemScanning = false;
    } else {

      if (this.selectedSearchField == '*' || this.selectedSearchField === undefined) {
        this.searchPlaceHolder = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
      } else {
        this.searchPlaceHolder = this.selectedSearchField;
      }
    }
  }

  public triggerShelfSearch(text: string): void {
    if(this.checkIfPogIsLoaded(this.sharedService.getActiveSectionId())) {
      this.localSearch.search = text;
      this.doLocalSearch();
      this.addScannedItem();  
    } else {
      this.notifyService.warn('NO_PLANOGRAM_LOADED');
    }
  }

  public doLocalSearch(): void {
    if (this.sharedService.isItemScanning) {
      // Item scanning mode. Do not do local search.
      return;
    }
    if (this.searchOption === "Block") {
      this.doBlockLocalSearch(this.localSearch.search);
    } else {
      this.localSearch.doLocalSearch();
      this.searchCountChange.next(true);
    }
  }

  public clearsText(): void {
    this.searchText = '';
    this.searchOption = '';
    this.sharedService.changeSearchedText('');
    this.searchReadOnly = false;
    this.localSearch.search = '';
    this.localSearch.actionFlag = false;
    this.localSearch.expressionFlag = false;
    if (this.display == 'Header' && this.sharedService.isWorkSpaceActive) {
      if (this.searchOption === "Block") {
        this.doBlockLocalSearch(this.localSearch.search);
      } else {
        this.localSearch.doLocalSearch();
      }
    }
    if (this.localSearch.searchFieldsFrmDb) {
      for (let searchField of this.localSearch.searchFieldsFrmDb.Actions) {
        searchField.selected = false;
      }
    }
    this.sharedService.gridReloadSubscription.next(true);
    this.sharedService.duplicateProducts = [];
    this.sharedService.selectedDuplicateProducts.next(null);
  }

  public addScannedItem(): void {
    this.localSearch.posRef = { sectionId: null, indexToAdd: null, selectedObj: null };
    const sectionId = this.sharedService.getActiveSectionId();

    const ctx = new Context(this.sharedService.getObjectAs(sectionId,sectionId));
    if (!this.sharedService.isItemScanning) {
      // Local search mode. Do not do Item scanning.
      return;
    }
    let upc = this.localSearch.search;
    if (this.localSearch.scanRegEx) {
      let result = upc.match(this.localSearch.scanRegEx);
      if (result && result[0]) {
        upc = result[0];
      }
    }
    if (!upc || upc.trim().length == 0) {
      return;
    }
    upc = upc.trim();
    const guid = this.panelServie.panelPointer["panelOne"]['globalUniqueID'];
    const currObj = this.planogramService.getCurrentObject(guid);
    if (!currObj.isLoaded) {
      this.notifyService.warn('Please load the Planogram and then select a fixture / position before scanning item.');
      return;
    }

    const selectedObjsList = this.planogramService.getSelectedObject(sectionId);
    const selectedObjsSize = selectedObjsList.length;
    if (selectedObjsSize == 0) {
      //TODO: @pranita add translated string
      this.notifyService.warn('PLEASE_SELECT_A_FIXTURE_POSITION_BEFORE_SCANNING_ITEM');
    } else if (selectedObjsSize > 1) {
      this.notifyService.warn('Multiple items are selected. Item scanning can be done with only one fixture / position selected.');
    } else {
      let indexToAdd: number = null;
      let selectedObj = selectedObjsList[0];
      if (selectedObj.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
        this.notifyService.warn('SECTION_SELECTED_ITEM_SCANNING_CAN_BE_DONE_WITH_ONLY_FIXTURE_POSITION');
        return;
      }
      else if (selectedObj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
        //check if selected object is same as scanned item
        if (selectedObj.Position.Product.UPC == upc) {
          let unqHistoryID = this.historyService.startRecording();
          let facings = selectedObj.Position.FacingsX + 1;
          this.shelfbumpService.increaseFacing(ctx, [selectedObj], facings);
          const dObj = { porertyType: null, products: [selectedObj.IDPOGObject], objectDerivedType: null, productlist: [] }
          this.render2d.setDirty(dObj);
          this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
          this.historyService.stopRecording(undefined, undefined, unqHistoryID);
          return;
        }
        const posId = selectedObj.$id;
        selectedObj = this.sharedService.getParentObject(selectedObj, selectedObj.$sectionID);
        selectedObj.Children.forEach((child, key) => {
          if (child.$id == posId) {
            indexToAdd = key + 1;
            return;
          }
        }, selectedObj);
      }
      let itemInCart = this.getShoppingCartItem(upc);
      if (!itemInCart) {
        // TODO: @pranita, remove subscribe from service
        this.http.get<IApiResponse<Array<ProductType>>>(`${this.envConfig.shelfapi}${apiEndPoints.getProduct}${upc}`).subscribe((response: any) => {
          if (response && response.Data && response.Data.length > 0) {
            const rootObject: Section = this.sharedService.getObject(sectionId, sectionId) as Section;
            let unitPos = [response.Data[0]];
            if (response.Data.length != 1) {
              for (let product of response.Data) {
                if (product.ProductPackage.IdPackageStyle == 0) {
                  unitPos = [product];
                  break;
                }
              }
            }
            if(this.parentApp.isAllocateApp) {
              this.allocateValidator.validateProducts(unitPos).subscribe((isValid: boolean) => {
                if(isValid) {
                  const position = this.planogramCommonService.initPrepareModel(unitPos, rootObject);
                  this.localSearch.addToFixture(ctx, selectedObj, position[0], indexToAdd);
                }
              })
            } else {
              const position = this.planogramCommonService.initPrepareModel(unitPos, rootObject);
              this.localSearch.addToFixture(ctx, selectedObj, position[0], indexToAdd);
            }
          }
          else {
            this.localSearch.posRef.selectedObj = selectedObj;
            this.localSearch.posRef.indexToAdd = indexToAdd;
            this.localSearch.posRef.sectionId = sectionId;
            return this.localSearch.handleItemScannedNotFound(upc);
          }
        })
      }
      else {
        if (!itemInCart.ObjectDerivedType) {
          const rootObject: Section = this.sharedService.getObject(sectionId, sectionId) as Section;
          itemInCart = this.planogramCommonService.initPrepareModel([itemInCart], rootObject)[0];
          this.localSearch.addToFixture(ctx, selectedObj, itemInCart, indexToAdd);
        } else {
          this.localSearch.addToFixture(ctx, selectedObj, itemInCart, indexToAdd, true);
        }
      }
    }
    return;
  }

  private initiateItemscanning(): void {
    const sectionId = this.sharedService.getActiveSectionId();
    this.planogramService.rootFlags[sectionId].isItemScanning = this.sharedService.isItemScanning;
    if (this.sharedService.isItemScanning) {
      const rootObject = this.sharedService.getObject(sectionId, sectionId) as Section;
      let correspondingMapperObj: any = {};
      for (let mapper of this.LibraryToBase.mapper) {
        if (mapper.IDPOG == rootObject.IDPOG) {
          correspondingMapperObj = mapper;
          break;
        }
      }
      //permission pending
      if (!this.userPermissions.checkUserPermissionBySectionID(sectionId, PogActionTypes.UPDATE)
        || correspondingMapperObj.IsReadOnly) {

        this.planogramService.rootFlags[sectionId].isItemScanning = false;
        this.sharedService.isItemScanning = false;
        if (correspondingMapperObj.IsReadOnly) {
          this.notifyService.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
          return;
        } else {
          this.notifyService.warn('User is not authorised to update the current Planogram');
          return;
        }
      }
      this.searchPlaceHolder = this.translate.instant('SCAN_WHEN_YOU_ARE_READY');
    }
    else {
      this.closeSearchBox();
    }
  }

  private getShoppingCartItem(upc: string): Position {
    const cartItems = this.getCartItems();
    let scannedItem = null;
    cartItems.forEach((obj) => {
      if (obj.Position.Product.UPC == upc) {
        scannedItem = obj;
      }
    });
    return scannedItem;
  }
  public getCartItems(): Position[] {
    if (this.sharedService.getActiveSectionId() != '') {
      const sectionId = this.sharedService.getActiveSectionId();
      const firstLevelChild = this.sharedService.getObject(sectionId, sectionId).Children;
      for (let child of firstLevelChild) {
        if (child.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
          child.badgeVisible = false;
          child.numOfAvlItems = 0;
          let numItems = 0;
          child.Children.forEach((obj) => {
            if (obj.Position.attributeObject.RecADRI != 'D') {
              numItems++;
            }
          });
          if (numItems > 0) {
            child.badgeVisible = true;
            child.numOfAvlItems = numItems;
          }
          return child.Children;
        }
      }
    } else {
      return [];
    }
  }
  private doBlockLocalSearch(searchText: string): void {

    const sectionId = this.sharedService.getActiveSectionId();
    const section = this.sharedService.getObject(sectionId, sectionId);
    const blocks = this.blockhelper.getAllBlocks(section as Section);
    this.planogramService.removeAllSelection(sectionId);
    searchText = searchText.toLocaleLowerCase();
    blocks.forEach((block) => {
      if(block.attributeValue.toLowerCase() == searchText || block.attributeValueFixture.toLowerCase() == searchText) {
       this.planogramService.addToSelectionById(block.$id,sectionId);
      };
    })
    this.planogramService.updateNestedStyleDirty = true;
  }

  private checkIfPogIsLoaded(sectionId: string): boolean {
    for (const panelObj in this.panelServie.panelPointer) {
      if (sectionId && this.panelServie.panelPointer[panelObj].sectionID === sectionId) {
          return true;
      }
    }
    return false;
  }
  
}
