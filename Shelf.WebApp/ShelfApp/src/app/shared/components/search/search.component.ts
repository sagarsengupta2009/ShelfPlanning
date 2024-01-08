import { Component, Input, OnInit, Output, EventEmitter, OnDestroy, ElementRef, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  SharedService, PanelService, PlanogramStoreService,
  ParentApplicationService, LocalSearchService, SearchService,
  PogSideNavStateService
} from '../../services';
import { NewProductIntroductionComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents';
import { Context } from '../../classes/context';
import { PogSideNaveView } from '../../models';

@Component({
  selector: 'sp-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit, OnDestroy {

  @Input() selectedSearchField: string;
  @Input() width: string;
  @Input() display?: string;
  @Input() isChildSearch?: boolean = false;
  @Input() filterText: string;
  @Output() emitSearchText = new EventEmitter();
  @Output() emitChildSearchText = new EventEmitter();
  @ViewChild('search') searchElement: ElementRef;

  public subcriptions: Subscription = new Subscription();

  public searchText: string = this.translate.instant('PLEASE_FILL_OUT_THIS_FIELD');
  public searchOption: string;
  public searchPlaceHolder: string;
  public showSearch: boolean = true;
  public findSelectAdv: boolean;

  public get isNici(): boolean {
    return this.parentApp.isAllocateAppInNiciProjectType;
  }

  constructor(
    private readonly sharedService: SharedService,
    private readonly localSearch: LocalSearchService,
    private readonly dialog: MatDialog,
    private readonly panelServie: PanelService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly parentApp: ParentApplicationService,
    private readonly translate: TranslateService,
    private readonly searchService: SearchService,
  ) { }

  ngOnInit(): void {
    if (this.filterText) {
      this.searchText = this.filterText;
    }
    this.searchService.selectedSearchField = this.selectedSearchField;
    this.searchService.display = this.display;

    this.findSelectAdv = this.planogramStore.appSettings.findSelectAdv;

    this.subcriptions.add(this.PogSideNavStateService.showSideNavigation.subscribe((res: boolean) => {
      this.setPlaceHolder();
    }));

    this.subcriptions.add(this.sharedService.updateSearchVisibility
      .subscribe((res: boolean) => {
        this.showSearch = res;
      }));

    this.subcriptions.add(this.sharedService.itemScanSubcription.subscribe((res: boolean) => {
      this.searchService.display = this.display;
      if (res && this.isPogSearchActive) {
        this.searchService.toggleItemscanning();
        this.searchPlaceHolder = this.searchService.searchPlaceHolder;
        this.searchElement.nativeElement.focus();
      }
    }));
    this.subcriptions.add(this.localSearch.openNewProdInv.subscribe((upc: string) => {
      if (upc.length > 1) {
        const dialogRef = this.dialog.open(NewProductIntroductionComponent, {
          height: '70vh',
          width: '60%',
          data: upc
        });
        dialogRef.afterClosed().subscribe((data: any) => {
          this.localSearch.addProductFromNewProdIntro(data);
        });
      }
    }));

    this.subcriptions.add(this.sharedService.isShelfLoadedChangedEvent
      .subscribe(() => this.setPlaceHolder()));

    this.setPlaceHolder();
  }

  public setPlaceHolder(): void {
    this.searchService.display = this.display;
    this.searchService.setPlaceHolder();
    this.searchPlaceHolder = this.searchService.searchPlaceHolder;

    this.searchText = this.filterText ? this.filterText : this.searchService.searchText;
  }

  public get isReadOnly(): boolean {
    this.searchService.display = this.display;
    return (this.searchService.searchReadOnly && this.isPogSearchActive);
  }

  public searchExp(): void {
    this.searchService.display = this.display;
    if (this.isPogSearchActive) {
      if (this.searchOption == 'Expression' && this.searchText !== '') {
        this.searchService.shelfSearchOption(this.searchOption);
      }
    }
  }

  public OnSearchKeyup(text: string): boolean {
    if(!text){
      this.localSearch.itemscanerror = false;
    }
    this.searchService.display = this.display;
    // Verify that the key entered is not a special key
    const k = event[`which`];
    if (k == 20 /* Caps lock */
      || k == 16 /* Shift */
      || k == 9 /* Tab */
      || k == 27 /* Escape Key */
      || k == 17 /* Control Key */
      || k == 91 /* Windows Command Key */
      || k == 19 /* Pause Break */
      || k == 18 /* Alt Key */
      || k == 93 /* Right Click Point Key */
      || (k >= 35 && k <= 40) /* Home, End, Arrow Keys */
      || k == 45 /* Insert Key */
      || (k >= 33 && k <= 34) /*Page Down, Page Up */
      || (k >= 112 && k <= 123) /* F1 - F12 */
      || (k >= 144 && k <= 145)) { /* Num Lock, Scroll Lock */
      return false;
    }
    else if (k == 13 && this.isPogSearchActive) {//Enter key
      this.localSearch.search = this.searchText;
      if(this.sharedService.isItemScanning){
        this.searchElement.nativeElement.focus();
        this.searchElement.nativeElement.select();
      }
      this.searchService.doLocalSearch();
      this.searchService.addScannedItem();
    }
    else if(event['ctrlKey'] && k == 75 && this.isPogSearchActive) {
      this.searchService.toggleItemscanning();
      this.searchPlaceHolder = this.searchService.searchPlaceHolder;
    }
    else {
      if (this.isChildSearch) {
        this.emitChildSearchText.emit(text);
      } else {
        this.sharedService.changeSearchedText(text);
      }

    }
    event.stopPropagation();
  }

  private get isPogSearchActive(): boolean {
   return this.searchService.display === 'Header' && 
   this.sharedService.isShelfLoaded && 
   this.sharedService.isWorkSpaceActive
  }

  public shelfSearchOption(option: string): void {
    if (this.searchOption !== option) {
      this.searchOption = option;
      if(this.searchService.searchOption !== ''){
        this.setPlaceHolder();
     }
    }
    const res = this.searchService.shelfSearchOption(option);
    if (res) {
      this.searchService.advanceOption.subscribe((result: string) => {
          this.searchText = result;     
          this.searchService.searchCountChange.next(true);     
      });
    } else {
      this.searchText = this.searchService.searchText;
    }
    if (option == 'ItemScanning') {
      this.searchPlaceHolder = this.searchService.searchPlaceHolder;
    }
    this.searchElement.nativeElement.focus();
    this.showHeaderFooter(false);
  }

  public showHeaderFooter(showToolBar: boolean): void {
    if (this.sharedService.isShelfLoaded && !this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(showToolBar);
    }
  }

  public clearsText(): void {
    if(this.PogSideNavStateService.shoppingCartView.pos ==  PogSideNaveView.SHOPPING_CART_TOP){
      this.searchService.display = this.searchService.display? this.searchService.display :"Header";
    }
    this.searchText = '';
    this.searchOption = '';
    this.emitChildSearchText.emit('');
    this.searchService.clearsText();
    this.localSearch.itemscanerror = false;
  }

  public closeSearchBox(): void {
    this.searchService.display = 'Header';
    this.searchService.closeSearchBox();
    this.searchText = this.searchService.searchText;
    this.searchPlaceHolder = this.searchService.searchPlaceHolder;
    this.localSearch.itemscanerror = false;
  }

  public getToolTip(): string {
    for (let panelObj in this.panelServie.panelPointer) {
      if (typeof this.panelServie.panelPointer[panelObj].sectionID != 'undefined') {
        const sectionId = this.panelServie.panelPointer[panelObj].sectionID;
        if (sectionId) {
          if (this.searchText == '') {
            return this.translate.instant('PLEASE_FILL_OUT_THIS_FIELD');
          } else {
            return this.searchText;
          }
        } else {
          return '';
        }
      }
    }
  }

  public setActions(event: PointerEvent, actionId: string): void {
    if(this.sharedService.isItemScanning) {
        this.setPlaceHolder();
    }
    if (event) {
      this.localSearch.actionsObj = this.localSearch.searchFieldsFrmDb.Actions.find(ele => ele.ACTIONID == actionId);
      this.localSearch.searchAction = this.translate.instant(this.localSearch.actionsObj.Name);
      this.localSearch.actionFlag = true;
      this.localSearch.expressionFlag = false;
      this.localSearch.doLocalSearch();
    }
    else {
      this.sharedService.duplicateProducts = [];
      this.sharedService.selectedDuplicateProducts.next(this.sharedService.duplicateProducts);
    }
    this.searchText = this.localSearch.searchAction;
    this.searchService.searchText = this.localSearch.searchAction;
    this.searchService.searchReadOnly = true;
    this.searchService.searchCountChange.next(true);
  }

  public setFindSelectAdv(): void {
    //check whether findSelectAdv has value, if not then set
    if (!this.findSelectAdv) {
      this.findSelectAdv = this.planogramStore.appSettings.findSelectAdv;
    }
  }

  ngOnDestroy() {
    this.subcriptions ? this.subcriptions.unsubscribe() : null;
  }
}