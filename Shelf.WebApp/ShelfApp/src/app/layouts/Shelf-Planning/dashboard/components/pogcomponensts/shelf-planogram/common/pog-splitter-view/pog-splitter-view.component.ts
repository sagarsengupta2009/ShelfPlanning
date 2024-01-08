import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatSidenav } from '@angular/material/sidenav';
import { Subscription } from 'rxjs';
import { ClipBoardService, PanelService, ParentApplicationService, PlanogramStoreService, ShoppingCartService } from 'src/app/shared/services';
import { PlanogramInfo } from 'src/app/shared/models/planogram-library/planogram-list';
import { Planograms } from 'src/app/shared/models/sa-dashboard';
import { AllPlanogramResponse, PogData, ActiveComponenetInfo, PanelSplitterViewType
        , PlanogramView, PanelView 
       } from 'src/app/shared/models';
import { SharedService, PlanogramService, AllocateService, SearchService, PogSideNavStateService, HighlightService } from 'src/app/shared/services';
import { ExportOptions } from 'src/app/shared/models/shelf-planogram/all-planogram';
import { PogSideNaveView } from 'src/app/shared/models';
import { MatDialog } from '@angular/material/dialog';
declare const window: any;
@Component({
    selector: 'shelf-pog-splitter-view',
    templateUrl: './pog-splitter-view.component.html',
    styleUrls: ['./pog-splitter-view.component.scss'],
})

export class PogSplitterViewComponent implements OnInit, OnDestroy, AfterViewInit {

    @ViewChild(`snav`) snav: MatSidenav;
    @Input() pogInputData: AllPlanogramResponse;
    @Input() exportoptions: ExportOptions;
    @Input() selectedPogObject: Planograms;
    private subscriptions: Subscription = new Subscription();
    public splitterHeight = 'calc(100vh - 102px)';
    public pogInfo: PlanogramInfo;
    public isPin: boolean = false;
    public activeScreen: string = '';
    public sidenavWidth: number = 30;
    public currentPog: PogData;
    public appSettingsSvc;
    public showlegends: boolean = false;
    public filterText: string = '';
    public showRightSideNav: boolean = true;
    public currentPinnedId : string;
    public hideProductLibrary: boolean = false;
    public hidePAorAssortspecific: boolean = true;
    public showFloatingShelves: boolean = false;

    constructor(
        public readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        public readonly planogramStore: PlanogramStoreService,
        private readonly PlanogramService: PlanogramService,
        private readonly allocateService: AllocateService,
        private readonly searchService: SearchService,
        private readonly pogSideNavStateService: PogSideNavStateService,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly matDialog: MatDialog,
        private readonly panelService: PanelService,
        private readonly clipBoardService: ClipBoardService,private readonly highLightService:HighlightService) { }

    public ngOnInit(): void {
        this.registerEventSubscriptions();
        if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this.splitterHeight = '100vh';
        }
        if (this.parentApp.isAllocateApp || this.parentApp.isAssortApp) {
            this.hideProductLibrary = this.parentApp.isAllocateApp ? this.allocateService.getProductLibConfiguration(window.parent.currentScreen) : true;
        } else {
            this.hidePAorAssortspecific = false;
        }
        if (this.pogSideNavStateService.shoppingCartView.pos === "top" && this.pogSideNavStateService.shoppingCartView.isPinned === false) {
            this.showHideSCFloatingDialog();
        }
    }   

    ngAfterViewInit() {
        this.subscriptions.add(this.PlanogramService.updatePOGInfo.subscribe((res: PlanogramInfo) => {
            if (res && this.snav) {
                let activePanelInfo = this.panelService.ActivePanelInfo;
                if (activePanelInfo?.IDPOG === res.pogInfo?.IDPOG
                    && (activePanelInfo?.view === res.displayView || !res.isPogDownloaded))
                    this.updatePOGInfo(res);
            }
        }));
    }

    public rightSideNavClosed(): void {
        let pinnedView = this.pogSideNavStateService.getAllViews().filter(it => it.isPinned === true && it.id !== this.currentPinnedId);
        if(pinnedView.length) {
            this.activeScreen = this.getActiveScreen(pinnedView.reverse()[0].id);
            this.isPin = pinnedView.reverse()[0].isPinned;
            this.pogSideNavStateService.activeVeiw = this.activeScreen as any;
            this.activeScreen && this.snav.open();
        } else {
            this.pogSideNavStateService.activeVeiw = null;
            this.activeScreen = '';
        }
        if(this.pogSideNavStateService.shoppingCartView.pos == 'top' && (this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '')){
          this.sharedService.floatingShelvesWidthChange.next({activeScreen: this.activeScreen, width: pinnedView.reverse()[0]?.width});
         }
    }

    public legendDisplay(showlegends: boolean): void {
        this.showlegends = showlegends;
        if (showlegends) {
            this.splitterHeight = 'calc(100vh - 131px)';
        } else if (this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this.splitterHeight = 'calc(100vh)';
        } else {
            this.splitterHeight = 'calc(100vh - 102px)';
        }
    }

    public sideNavContent(id: string): void {
        if (id === 'SC' && this.pogSideNavStateService.shoppingCartView.pos == 'top') {     
            this.showHideSCFloatingDialog();
            return;
            }
        let txt = document.getElementById(id);
        if (txt) {
            txt.style.fontWeight = '600';
        }
        if (this.activeScreen !== '') {
            let gettxt = document.getElementById(this.activeScreen);
            if (gettxt) gettxt.style.fontWeight = '500';
        }
        this.pogSideNavStateService.activeVeiw = id as any;

        const sideNavWidth = this.pogSideNavStateService.getActive().width;
        this.sidenavWidth = sideNavWidth;
        this.activeScreen = this.getActiveScreen(id);
        this.currentPinnedId = this.pogSideNavStateService.getActive().id;
        if (this.activeScreen) {
            this.isPin = this.pogSideNavStateService.getActive().isPinned;
            this.snav.open();      
            if (this.pogInfo?.isPogDownloaded) {
                switch (this.activeScreen) {
                    case 'PG':
                        this.sharedService.propertyGridUpdateData.next(true);
                        break;
                    case 'SC':
                        this.sharedService.isCartSideView = true;
                        this.sharedService.changeInCartItems.next(true);
                        break;
                    case 'PL':
                        this.sharedService.updateProductsList.next(true);
                }
            }
            setTimeout(() => {
                this.sharedService.updatematTab.next(true);
            }, 100);
        }
        if(this.pogSideNavStateService.shoppingCartView.pos == 'top' && (this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '')){
          this.sharedService.floatingShelvesWidthChange.next({activeScreen: this.activeScreen, width: this.sidenavWidth});
         }
    }

    public viewSelectedComponent(activeComponenetInfo: ActiveComponenetInfo): void {
        this.filterText = '';
        this.isPin = activeComponenetInfo.isPin;
        this.activeScreen = this.getActiveScreen(activeComponenetInfo.activeScreen);
        this.currentPinnedId = this.pogSideNavStateService.getActive().id;
        this.sidenavWidth = activeComponenetInfo.sidenavWidth;
        if(this.pogSideNavStateService.shoppingCartView.pos == 'top' && (this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '')){
         this.sharedService.floatingShelvesWidthChange.next({activeScreen: this.activeScreen, width: this.sidenavWidth});
        }
        if (this.activeScreen === '') {
          this.snav?.toggle();
          this.pogSideNavStateService.activeVeiw = null;
        }
    }
    public showHideSCFloatingDialog(): void { //TO handle hide/show of Floatingshelve dialog on tabchange, unload , clicking from planogramLib screens
        let cartView = document.getElementsByClassName('shoppingcart-topview') as HTMLCollectionOf<HTMLElement>;
        if (!cartView.length && this.panelService.panelPointer[this.panelService.activePanelID].sectionID && this.pogSideNavStateService.shoppingCartView.pos == 'top') {
            this.setDockToTop();
            this.sharedService.isCartSideView = false;
        }
        if (cartView?.length  && !(this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '' && (this.panelService.ActivePanelInfo.componentID === 1 || this.panelService.ActivePanelInfo.componentID === 2))) {
            cartView[0].style.display = "none";
            this.sharedService.showFloatingShelves.next(false);
        } else if (cartView?.length  && this.pogSideNavStateService.shoppingCartView.pos == "top") {
            cartView[0].style.display = "block";
            this.sharedService.isCartSideView = false;
            this.sharedService.showFloatingShelves.next(true);
            this.sharedService.changeInCartItems.next(true);
        }        
    }
    
    public updatePOGInfo(planogramInfo: PlanogramInfo): void {
        this.pogInfo = planogramInfo;
        let flag = false;
        let activeKey;
        if (this.pogSideNavStateService.getPinAll()) {
            flag = true;
            activeKey = this.pogSideNavStateService.getPinAll().id;
        }
        if ((this.pogInfo?.isPogDownloaded && flag) || (activeKey == PogSideNaveView.PRODUCT_LIBRARY && !this.pogInfo?.isPogDownloaded)) {
            if (this.pogSideNavStateService.getPinAll().id && this.pogSideNavStateService.activeVeiw == this.pogSideNavStateService.getPinAll().id) {
                activeKey = this.pogSideNavStateService.getPinAll().id;
            }
            else if((this.pogSideNavStateService.activeVeiw) && this.pogSideNavStateService.activeVeiw != this.pogSideNavStateService.getPinAll().id) {
                activeKey = ((this.pogSideNavStateService.activeVeiw == PogSideNaveView.POG_INFO) && (this.panelService.panelPointer.panelOne.componentID === 1 || this.panelService.panelPointer.panelTwo.componentID === 1))? this.pogSideNavStateService.getPinAll().id :this.pogSideNavStateService.activeVeiw;
            }
            //for Assort mode Product Library is not required
            if (!(this.parentApp.isAssortApp && activeKey === PogSideNaveView.PRODUCT_LIBRARY)) {
                this.sideNavContent(activeKey);
            }
           
        } else if (!this.pogInfo?.isPogDownloaded && flag) {
            this.activeScreen = PogSideNaveView.POG_INFO;
            this.isPin = true;
            this.snav.open();
        }
        if(this.pogInfo?.isPogDownloaded){
            const anyPogHighlighted =  Object.keys(this.PlanogramService.rootFlags).some(sectionID => this.PlanogramService.rootFlags[sectionID].isEnabled === true);
            if(this.pogSideNavStateService.activeVeiw != PogSideNaveView.HIGHLIGHT && anyPogHighlighted){
                this.highLightService.updateRangeModel(); 
            }
        }
        this.showHideSCFloatingDialog();
        const cartViewUnloaded = document.getElementsByClassName('shoppingcart-Unloaded-topview') as HTMLCollectionOf<HTMLElement>;
        if (this.pogInfo?.isPogDownloaded) {//handlingshoppingcart unloaded state
            if (cartViewUnloaded?.length) {
                this.shoppingCartService.showHideSCDialogUS(false)
            }

        } else if (this.shoppingCartService.showShoppingCartUnloaded) {//check for settingtrue
            if (cartViewUnloaded?.length) {
                this.shoppingCartService.showHideSCDialogUS(true)
            }
        }
    }
    public openPostMesaage(pogData: PogData): void {
        this.isPin = false;
        this.activeScreen = this.getActiveScreen(PogSideNaveView.POST_MESSAGE);
        this.currentPog = Object.assign({}, pogData);
        this.snav.open();
    }

    public openHighlightsideNav(): void {
        this.sideNavContent('HL');
    }

    public showPogInfoAndHideRightSideNav(showPogInfo: boolean): void {
        let tempActiveScreen = showPogInfo ?
            (this.activeScreen == PogSideNaveView.PRODUCT_LIBRARY ? PogSideNaveView.PRODUCT_LIBRARY : PogSideNaveView.POG_INFO)
            : '';
        this.activeScreen = this.getActiveScreen(tempActiveScreen);
        this.showRightSideNav = !showPogInfo;
    }

    private registerEventSubscriptions() {
        this.subscriptions.add(this.sharedService.openSelectedComponentInSideNav.subscribe((result: any) => {
            if (result && this.snav) {
                this.activeScreen = this.getActiveScreen(result.activeScreen);
                this.isPin = result.isPin;
                this.pogSideNavStateService.activeVeiw = result.activeScreen;
                this.pogSideNavStateService.getActive().isPinned = result.isPin;
                const res = this.PlanogramService.setPinUnpinAppSetting();
                this.subscriptions.add(res.subscribe());
                this.filterText = result.searchData || "";
                this.snav.open();
                if(this.pogSideNavStateService.shoppingCartView.pos == 'top' && (this.panelService.panelPointer[this.panelService.activePanelID].sectionID != '')){
                    this.sharedService.floatingShelvesWidthChange.next({activeScreen: this.activeScreen, width: this.sidenavWidth});
                }
                setTimeout(() => {
                    this.sharedService.updatematTab.next(true);
                }, 100);
            }
        }));

        if (this.parentApp.isAllocateApp) {
            this.subscriptions.add(
                this.allocateService.paSearchField.subscribe((option: string) => {
                    if(!['Block','ItemScanning'].includes(option)) {
                      this.allocateService.resizeParentWindow(true);
                    }
                    this.searchService.shelfSearchOption(option);
                }),
            );
            this.subscriptions.add(
                this.allocateService.triggerShelfSearch.subscribe((text: string) => {
                    this.allocateService.resizeParentWindow(false);
                    this.searchService.triggerShelfSearch(text);
                }),
            );
            this.subscriptions.add(
                this.allocateService.clearAllocateText.subscribe(() => {
                    this.allocateService.resizeParentWindow(false);
                    this.searchService.display = 'Header';
                    this.searchService.clearsText();
                }),
            );
            this.subscriptions.add(
                this.allocateService.paReviewTabChange.subscribe((hideProductlib: boolean) => {
                    this.hideProductLibrary = hideProductlib;
                }),
            );
            this.subscriptions.add(
                this.allocateService.paWorkSheetChange.subscribe(() => {
                    this.sidenavWidth = this.pogSideNavStateService.getActive()?.width;
                }),
            );

            this.subscriptions.add(
                this.allocateService.sideNavDisplay.subscribe((componentID: number) => {
                   this.updateDisplayViewForPA(componentID);
                }),
            );
        }

        if (this.parentApp.isAllocateApp || this.parentApp.isWebViewApp || this.parentApp.isAssortAppInIAssortNiciMode) {
            this.subscriptions.add(
                this.pogSideNavStateService.closeSideNav.subscribe((close: boolean) => {
                    this.snav.close();
                }),
            );
        }
    }

    public getActiveScreen(activeScreen: string): string {
        let tempActiveScreen = '';
        switch (activeScreen) {
            case PogSideNaveView.SHOPPING_CART:
            case PogSideNaveView.PROPERTYGRID:
            case PogSideNaveView.HIGHLIGHT:
            case PogSideNaveView.CHARTS: {
                if (this.pogInfo && this.pogInfo.isPogDownloaded && (this.pogInfo.displayView == 'panelView' || this.pogInfo.displayView == 'positionWS'))
                    tempActiveScreen = activeScreen;
                break;
            }
            case PogSideNaveView.PRODUCT_LIBRARY:
            case PogSideNaveView.POST_MESSAGE: {
                tempActiveScreen = activeScreen;
                break;
            }
        }
        if (!tempActiveScreen) {
            if (activeScreen == 'PI'
                || (this.pogInfo
                    && (!this.pogInfo.isPogDownloaded || (this.pogInfo.displayView != 'panelView' && this.pogInfo.displayView != 'positionWS'))))
                tempActiveScreen = PogSideNaveView.POG_INFO;
            else
                tempActiveScreen = '';
        }
        return tempActiveScreen;
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private updateDisplayViewForPA(componentID: number): void {
        switch (componentID) {
            case PlanogramView.PLANOGRAM: { 
                this.pogInfo.displayView = PanelView.PLANOGRAM;
                break;
            }
            case PlanogramView.POSITION: { 
                this.pogInfo.displayView = PanelView.POSITION;
                break;
            }
            case PlanogramView.ITEM: { 
                this.pogInfo.displayView = PanelView.ITEM;
                break;
            }
            case PlanogramView.FIXTURE: { 
                this.pogInfo.displayView = PanelView.FIXTURE;
                break;
            }
            case PlanogramView.INVENTORY: { 
                this.pogInfo.displayView = PanelView.INVENTORY;
                break;
            }
            case PlanogramView.THREED: { 
                this.pogInfo.displayView = PanelView.THREED;
                break;
            }
        }          
    }

    public setDockToTop(): void {  
        this.shoppingCartService.openDialog(true,this.filterText,"setDockToTop"); 
    }
}
