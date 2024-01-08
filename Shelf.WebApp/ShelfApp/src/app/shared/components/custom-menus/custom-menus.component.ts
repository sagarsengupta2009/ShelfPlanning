import {
    Component, EventEmitter, HostListener,
    Input, OnDestroy, OnInit, Output,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { LocalStorageKeys, Utils } from '../../constants';
import {
    PlanogramService, ParentApplicationService,
    PanelService, SharedService, HistoryService,
    UserPermissionsService, ConfigService,
    PlanogramStoreService, SelectedScenarioService, ShoppingCartService, AnnotationService
} from '../../services';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { MenuItemType, MenuItem, PlanogramView, ApplicationResources, PanelIds, Menu, POGLibraryListItem } from '../../models';
import {
    CustomMenuClick, CustomMenuClickEventPayload,
    HeaderMenu, ScreenMenus, styleCss,
} from '../../models/config/application-resources';
import { TranslateService } from '@ngx-translate/core';
declare const window: any;

@Component({
    selector: 'srp-custom-menus',
    templateUrl: './custom-menus.component.html',
    styleUrls: ['./custom-menus.component.scss'],
})
export class CustomMenusComponent implements OnInit, OnDestroy {
    @Input() screenName: string;
    @Input() controlName: string;
    @Input() type: string;
    @Input() selectedTabPog: POGLibraryListItem;

    @Input() isOnCompatMode?: boolean;
    @Input() panelID?: string;
    @Input() matTooltipDisabled?: boolean;
    @Input() selectedManuKey: string = '';
    @Input() myselectionlist?: HeaderMenu;

    @Output() menuButtonClick = new EventEmitter<CustomMenuClick>();
    @Output() selectedIndexChange = new EventEmitter<number>();
    @Output() toggleSideNav = new EventEmitter<boolean>();

    public canRender: boolean = false;
    public displayChild: boolean = false;
    public isDefaultMenu: boolean = false;

    public menuList: MenuItem[];
    public subMenulist: MenuItem[];
    public childMenulist: MenuItem[] = [];
    public secondchildMenulist: MenuItem[];
    public previousMenu: MenuItem[];

    private subscriptions = new Subscription();

    public get deploymentPath(): string {
        return this.config.deploymentPath;
    }

    private planogramView: PlanogramView[] = [
        PlanogramView.POSITION,
        PlanogramView.ITEM,
        PlanogramView.INVENTORY,
        PlanogramView.THREED,
        PlanogramView.PERFORMANCE,
    ];

    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly panelService: PanelService,
        private readonly historyService: HistoryService,
        private readonly userPermissions: UserPermissionsService,
        private readonly config: ConfigService,
        private readonly log: ConsoleLogService,
        private readonly localStorage: LocalStorageService,
        private readonly selectedScenarioService: SelectedScenarioService,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly translate: TranslateService,
        private readonly annotationService: AnnotationService
    ) { }

    @HostListener('window:popstate', ['$event'])
    onPopState(event) {
        this.log.error('Back button pressed', event);
    }

    public ngOnInit(): void {
        this.registerEvents();
    }

    public ngAfterViewInit(): void {
        const planogramMenuItem = this.menuList?.find((x) => x.text === 'Planogram') ?? undefined;
        if (planogramMenuItem) {
            const planogramRoute = `/sp/pogs?scenarioID=${this.planogramStore.scenarioId}&projectID=${this.planogramStore.projectId}`;
            planogramMenuItem.template = planogramRoute;
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    private registerEvents(): void {
        this.subscriptions.add(
            this.parentApp.onReady
                .pipe(filter(isReady => isReady))
                .subscribe(() => {
                    // When parent services is ready, we can render this component
                    this.canRender = true;
                }));
        this.subscriptions.add(
            this.sharedService.hidedefaultMenu.subscribe((val: boolean) => {
                this.isDefaultMenu = val;
            }));
        this.subscriptions.add(
            this.sharedService.toggleSideNav.subscribe((isOnCompatMode: boolean) => {
                this.isOnCompatMode = isOnCompatMode;
            }));
        this.subscriptions.add(
            this.selectedScenarioService.selectedScenarioNameChangeEvent.subscribe(() => {
                this.setMenus();
            }));
    }

    private checkIfEnableSave(): boolean {
        const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        const currObj = this.planogramService.getCurrentObject(guid);
        const sectionId = this.panelService.panelPointer[this.panelID].sectionID;
        return (
            !Utils.isNullOrEmpty(guid) &&
            currObj?.isLoaded &&
            this.planogramService.rootFlags[sectionId] &&
            this.planogramService.rootFlags[sectionId].isSaveDirtyFlag
        );
    }

    private checkIfSaveInProgress(): boolean {
        if (this.panelService.panelPointer[this.panelID].sectionID) {
            let isPogSaving = this.planogramService.rootFlags[this.panelService.panelPointer[this.panelID].sectionID].asyncSaveFlag.isPOGSavingInProgress;
            if (!isPogSaving && this.sharedService.isSaveAllInProgress) {
                isPogSaving = this.sharedService.allPogsToSaveInSaveAll.some(id => id === this.panelService.panelPointer[this.panelID].sectionID);
            }
            return isPogSaving;
        } else {
            return false;
        }
    }

    private checkIfWrkSheet2DMode(): boolean {
        return !(
            !this.checkIf2dMode() &&
            this.panelService.panelPointer[this.panelID].componentID != PlanogramView.POSITION &&
            this.panelService.panelPointer[this.panelID].componentID != PlanogramView.INVENTORY
        );
    }

    private checkIf2dMode(): boolean {
        const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        const currObj = this.planogramService.getCurrentObject(guid);
        return !(
            currObj?.isLoaded && this.panelService.panelPointer[this.panelID].componentID != PlanogramView.PLANOGRAM
        );
    }

    private isHighlightToolVisible(): boolean {
        const panelRunningObj = this.panelService.panelPointer[this.panelID];
        return (
            panelRunningObj.componentID === PlanogramView.PLANOGRAM ||
            panelRunningObj.componentID === PlanogramView.POSITION
        );
    }

    private isUndoVisible(): boolean {
        if (this.historyService.historyStack && Object.keys(this.historyService.historyStack).length && this.panelService.view !== '3D') {
            return (
                this.historyService.historyStack[this.sharedService.activeSectionID] &&
                this.historyService.historyStack[this.sharedService.activeSectionID].length
            );
        }
        return false;
    }

    private isRedoVisible(): boolean {
        if (this.historyService.undoStack && Object.keys(this.historyService.undoStack).length && this.panelService.view !== '3D') {
            return (
                this.historyService.undoStack[this.sharedService.activeSectionID] &&
                this.historyService.undoStack[this.sharedService.activeSectionID].length
            );
        }
        return false;
    }

    public closeNav(ev: MenuItem): void {
        if (!ev.childMenus.length) {
            this.removeElementsByClass('cdk-overlay-transparent-backdrop');
        }
        this.toggleSideNav.emit(!this.isOnCompatMode);
        if (ev.childMenus && ev.childMenus.length && this.isOnCompatMode) {
            if (document.getElementById(`mySidepanel`).classList.contains(`expanded`)) {
                this.displayChild = !this.displayChild;
            }
        } else {
            this.displayChild = false;
        }
        this.sharedService.changeSideNav(true);
        this.menuButtonClick.emit({ data: ev });
        //sidebar click functionality moved to sidebar component
    }

    private setMenus(): void {
        this.setMenuList();
        this.setChildMenus();
    }

    private setMenuList(): void {
        //@Saswat TODO:  Temporary revert the the change, Need to discuss with @Malu regarding the design
        let controlFilter: ScreenMenus ;
        if (this.parentApp.isAllocateApp) {
            const response = this.localStorage.get<ApplicationResources>(LocalStorageKeys.APP_RESOURCES);
            if (!response) { return; }
            const appMenu = response?.menu?.find(x => x.screenName.toLocaleLowerCase() == this.screenName.toLowerCase());
            if (!appMenu) { return; }
            controlFilter = appMenu?.controlName.find(x => x.name.toLowerCase() === this.controlName.toLowerCase());
        } else {
            controlFilter = this.config.getScreenMenus(this.screenName, this.controlName);
        }
        if (!controlFilter) { return; }

        const allMenus = [...controlFilter.menus].sort((a, b) => a.order - b.order);

        if (controlFilter.maxItemsToDisplay === 2 || controlFilter.maxItemsToDisplay <= 0) {
            this.menuList = allMenus;
            return;
        }

        const scenarioName = this.selectedScenarioService.getSelectedScenarioName();
        if (scenarioName || !this.parentApp.isShelfApp || this.parentApp.isShelfInAutoMode) {

            const mandatoryMenus = allMenus.filter((x) => !x.canHide);
            const optionalMenus = allMenus.filter((x) => x.canHide);
            const combineArr = [...mandatoryMenus, ...optionalMenus];

            if (combineArr.length - controlFilter.maxItemsToDisplay === 1) {
                this.menuList = combineArr;
            } else {
                this.menuList = combineArr
                    .splice(0, controlFilter.maxItemsToDisplay) // removed items
                    .sort((a, b) => a.order - b.order); // sort
                this.subMenulist = combineArr.sort((a, b) => a.order - b.order)
            }
        }
    }

    private setChildMenus(): void {
        // PA ONLY
      if (this.parentApp.isAllocateApp) {
        try {
          const appResources = this.localStorage.get<ApplicationResources>(LocalStorageKeys.PA.APP_MENUS);
          const rules = appResources.menu.find(it => it.screenName === 'Rules');
          const activePog = this.planogramStore.activeSelectedPog;
          const views = rules.controlName
            ?.find(it => it.name === 'rulesModelHeader')
            ?.menus.find(it => it.key === 'rulesModelHeader_View')?.childMenus;
          // panel two
          if (this.panelID === PanelIds.Two) {
            const menu = this.menuList.find(it => it.key == 'POGLIB_HEADERMENU_1_VIEW');
            menu.childMenus = this.addPAAdditionalMenu(views, appResources);
          }
          const paLeftPanelMenus = appResources.menu.filter(e => e.screenName == 'Rules')[0].controlName.filter(e => e.name == 'Rules_LeftSidePanel')[0];
          // pog restore option.
          const restoreOption = paLeftPanelMenus.menus.filter(e => e.key == "Rules_LeftSidePanel_Restore");
          if(restoreOption.length) {
            this.subMenulist.push(restoreOption[0]);
          }
          const moveToReviewOption = paLeftPanelMenus.menus.filter(e => e.key == "Rules_LeftSidePanel_ThumbupThumbdown");
          if(moveToReviewOption.length) {
            this.subMenulist.push(moveToReviewOption[0]);
          }
          // if model builder enabled, add model builder options.
          if (views.filter(e => e.key == "rulesModelHeader_view_ModelBuilder").length) {
            const approveOption = paLeftPanelMenus.menus.filter(e => e.key == "Rules_LeftSidePanel_ThumbupThumbdown")[0];
            this.menuList.push(approveOption);
          }
        } catch (err) {
          this.log.error('Failed to apply PA menus!');
        }
      }
    }

    private addPAAdditionalMenu(menus: MenuItem[],appResources: ApplicationResources): MenuItem[] {
      const review = appResources.menu.find(it => it.screenName === "Review");
      const reviewViews = review.controlName
        ?.find(it => it.name === 'ReviewListHeader')
        ?.menus.find(it => it.key === 'Review_ListHeader_VIEWS')?.childMenus;
      let reviewMenu = reviewViews.filter(e => e.key == 'Review_ListHeader_view_Review_planogram')[0];
      menus.push(reviewMenu);

      return menus;
    }

    public filterMenuList(menus: Array<MenuItem>): Array<MenuItem> {
        if (menus.length > 0) {
            if (this.sharedService.isStoreDirty) {
                let check = confirm(this.translate.instant('UNSAVED_DATA_MOVE'));
                if (check) {
                    this.sharedService.isStoreDirty = false;
                }
                else {
                    return;
                }
            }
        }
        const scenario = this.selectedScenarioService.getSelectedScenarioName();
        return scenario && menus?.length ? menus.sort((a, b) => a.order - b.order) : menus;
    }

    private removeElementsByClass(className: string) {
        const elements = document.getElementsByClassName(className);
        while (elements.length) {
            elements[0].parentNode.removeChild(elements[0]);
        }
    }

    public menuButtonLCick(selectedMenu: MenuItem, event: Event): void {
        const splitView = this.planogramStore.splitterViewMode.displayMode;
        if (!selectedMenu.childMenus.length) {
            this.removeElementsByClass('cdk-overlay-transparent-backdrop');
            if (this.sharedService.isStoreDirty) {
                let check = confirm(this.translate.instant('UNSAVED_DATA_MOVE'));
                if (check) {
                    this.sharedService.isStoreDirty = false;
                }
                else {
                     return;
                }
            }
        }
        if (selectedMenu) {
          if (selectedMenu.key === 'POGLIB_HEADERMENU_1_VIEW' && splitView === 2 && this.panelID === PanelIds.Two) {
            setTimeout(() => {
              let matMenu = Array.from(document.getElementsByClassName('mat-menu-panel')).pop() as HTMLElement;
              let overlayPane = matMenu.parentElement;
              matMenu.classList.add('overflowBottom');
              overlayPane.appendChild(matMenu);
            });
          }
          const data: CustomMenuClickEventPayload = { data: selectedMenu, event: event };
          this.menuButtonClick.emit(data);
        }
        if([
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_POSITION,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_ITEM,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_FIXTURE,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_INVENTORY,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_PERFORMANCE,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_STORE,
           MenuItemType.POGLIB_HEADERMENU_1_VIEW_3D,
           MenuItemType.POGLIB_HEADERMENU_1_UNLOAD].includes(selectedMenu.key as any)){
            this.annotationService.refreshAnnotationDialog(null, null, this.panelID, true);
           }
    }

    // Note : if value is true Menu will be hidden else it will display the menu.
    public onSelectionChange(data: MenuItem): boolean {
        let value: boolean = false;
        if (data) {
            switch (data.key.trim()) {
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW:
                    value = this.parentApp.isAllocateApp && !this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_PLANOGRAM:
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_POSITION:
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_ITEM:
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_FIXTURE:
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_INVENTORY:
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_3D:
                    value = !this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_UNLOAD:
                    value = !this.myselectionlist.planoviewer || this.parentApp.isAssortAppInIAssortNiciMode;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_PERFORMANCE:
                    if (this.myselectionlist.planoviewer && !this.parentApp.isAllocateApp) {
                        if (!this.checkPerformancePermission()) {
                            value = true;
                        } else {
                            value = false;
                        }
                    } else {
                        value = true;
                    }
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_VIEW_STORE:
                    if (this.parentApp.isAllocateApp) {
                        value = true;
                    } else {
                        value = !this.checkStorePermission();
                    }
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_TOOLS:
                    value = !(this.myselectionlist.planoviewer && this.checkIf2dMode());
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_DISPLAY:
                    value = !(this.myselectionlist.planoviewer && this.checkIfWrkSheet2DMode());
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_HIGHLIGHT:
                    value = !(this.myselectionlist.planoviewer && this.isHighlightToolVisible());
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_SAVE:
                    value = !this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_SAVE_ALL:
                    value = !this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_UNDO:
                    value = !this.isUndoVisible();
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_REDO:
                    value = !this.isRedoVisible();
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_ACTIONS_DELETEPOG:
                    value =
                        !(this.isStandaloneShelf() && this.checkPermissionToDelete()) ||
                        this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_DOWNLOAD:
                    value = this.myselectionlist.planoviewer;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_ACTIONS_FEEDBACK:
                    value = !this.myselectionlist.feedbackPermission;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_ACTIONS_MESSAGE:
                    value = !this.myselectionlist.postMsgPermission;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_ACTIONS_NPI:
                    value =
                        !this.myselectionlist.planoviewer ||
                        !this.myselectionlist.NPIPermission ||
                        this.parentApp.isAssortApp;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG:
                  if(this.parentApp.isAllocateApp) {
                    value = this.myselectionlist.exportDisabled;
                  }else {
                    value = !(this.myselectionlist.exportoptions.XML ||
                      this.myselectionlist.exportoptions.XMZ ||
                      this.myselectionlist.exportoptions.PLN ||
                      this.myselectionlist.exportoptions.PSA ||
                      this.shoppingCartService.floatingShelvesConfig?.enabled );
                  }
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_PROMOTE_DEMOTE:
                    // hide for PA and assort NICI alone.
                    if(this.parentApp.isAllocateApp || this.parentApp.isAssortAppInIAssortNiciMode) {
                        value = true;
                    }
                    else{
                        value = this.myselectionlist.Promote_DemotePermission;
                    }
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_PRINT:
                    value = this.myselectionlist.hideForPAssort;
                    if(this.parentApp.isAllocateApp) {
                        value = this.myselectionlist.exportDisabled;
                      }
                    break;
                case MenuItemType.POGLIBLib_HeaderMenu_1_EXPORTEXCEL:
                    value = !(this.panelID && this.panelService.panelPointer[this.panelID].isLoaded
                        && this.planogramView.includes(this.myselectionlist.componentID));
                    break;
                case MenuItemType.pogLibHeaderMenu_2_SEARCH:
                case MenuItemType.pogLibHeaderMenu_2_REFRESH:
                case MenuItemType.pogLibHeaderMenu_2_EXPORTEXCEL:
                    value = this.parentApp.isAssortApp || this.myselectionlist.isSearchFocus;
                    break;
                case MenuItemType.pogLibHeaderMenu_2_PIN:
                    value = !(!this.myselectionlist.isSearchFocus && !this.myselectionlist.isPinned) || this.parentApp.isAssortApp;
                    break;
                case MenuItemType.pogLibHeaderMenu_2_PINSELECTED:
                    value = !(!this.myselectionlist.isSearchFocus && this.myselectionlist.isPinned);
                    break;
                case MenuItemType.pogshowHierarchy_ADD:
                    value = !(this.myselectionlist && this.myselectionlist.poghierarchy.length);
                    break;
                case MenuItemType.pogLibHeaderMenu_2_FILTERLIST:
                case MenuItemType.pogLibHeaderMenu_2_ADD:
                case MenuItemType.pogLibHeaderMenu_2_GETAAPP:
                    value = !(this.myselectionlist.isSearchFocus && this.myselectionlist.displayedPlanogramsOnSearch);
                    break;
                case MenuItemType.pogLibHeaderMenu_2_SETTINGS:
                    value = !this.myselectionlist.isSearchFocus;
                    break;
                case MenuItemType.pogLibHeaderMenu_2_POGHIRARCHY:
                    value =  !(this.myselectionlist.showHierarchyIcon && this.myselectionlist.isSearchFocus);
                    break;
                case MenuItemType.pogImportAddDelete_DOWNLOADTEMPLATE:
                    value = this.myselectionlist.displayRadiosInImportTemplate;
                    break;
                case MenuItemType.pogChartView_PIN:
                    value = this.myselectionlist.isPin;
                    break;
                case MenuItemType.pogChartView_UNPIN:
                    value = !this.myselectionlist.isPin;
                    break;
                case MenuItemType.pogChartView_EXPORTSVG:
                    value = !(this.myselectionlist.selectedChartType != 3);
                    break;
                case MenuItemType.pogChartView_EXPORTEXCEL:
                    value = !(this.myselectionlist.selectedChartType == 3);
                    break;
                case MenuItemType.pogChartView_FULLSCREENOPEN:
                    value = !(!this.myselectionlist.isPin && this.myselectionlist.maxwidth <= 40);
                    break;
                case MenuItemType.pogChartView_FULLSCREENCLOSE:
                    value = !(!this.myselectionlist.isPin && this.myselectionlist.maxwidth >= 60);
                    break;
                case MenuItemType.PohHighlightView_PIN:
                    value = this.myselectionlist.isPin;
                    break;
                case MenuItemType.PohHighlightView_UNPIN:
                    value = !this.myselectionlist.isPin;
                    break;
                case MenuItemType.PohHighlightView_GRIDON:
                    value = this.myselectionlist.gridOnIcon;
                    break;
                case MenuItemType.PohHighlightView_GRIDOFF:
                    value = !this.myselectionlist.gridOnIcon;
                    break;

                case MenuItemType.pogProductLibView_VIEW:
                    value = this.myselectionlist.isProductItemSelected;
                    break;
                case MenuItemType.pogProductLibView_SORT:
                    value =
                        this.myselectionlist.isProductItemSelected ||
                        this.myselectionlist.showProductHierarchy ||
                        !this.myselectionlist.hideOrderBy;
                    break;
                case MenuItemType.pogProductLibView_SELECTALL:
                    value = !this.myselectionlist.productItems;
                    break;
                case MenuItemType.pogProductLibView_FILTERITEMINSHELF:
                    value =
                        this.myselectionlist.showProductHierarchy ||
                        !this.myselectionlist.isPlanogramLoaded ||
                        this.myselectionlist.isFilterExisting;
                    break;
                case MenuItemType.pogProductLibView_FILTERITEMINSHELF_CHECK:
                    value =
                        this.myselectionlist.showProductHierarchy ||
                        !this.myselectionlist.isPlanogramLoaded ||
                        !this.myselectionlist.isFilterExisting;
                    break;
                case MenuItemType.pogProductLibView_ADDCART:
                    value = !(this.myselectionlist.isProductItemSelected && this.myselectionlist.isPlanogramLoaded);
                    break;
                case MenuItemType.pogProductLibView_REMOVE:
                    value = !this.myselectionlist.isProductItemSelected;
                    break;
                case MenuItemType.pogProductLibView_PIN_WINDOW:
                    value = this.myselectionlist.showAsMenu;
                    break;
                case MenuItemType.pogProductLibView_OPENINWINDOW:
                    value = !this.myselectionlist.showAsMenu;
                    break;
                case MenuItemType.pogProductLibView_PIN:
                    value = !(this.myselectionlist.showAsMenu && !this.myselectionlist.isPin);
                    break;
                case MenuItemType.pogProductLibView_UNPIN:
                    value = !(this.myselectionlist.showAsMenu && this.myselectionlist.isPin);
                    break;
                case MenuItemType.pogLibHeaderMenu_3_EXPORTPOG_XML:

                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG_XML:
                    value = !this.myselectionlist.exportoptions.XML;
                    break;
                case MenuItemType.pogLibHeaderMenu_3_EXPORTPOG_XMZ:
                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG_XMZ:
                    value = !this.myselectionlist.exportoptions.XMZ;
                    break;
                case MenuItemType.pogLibHeaderMenu_3_EXPORTPOG_PLN:
                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG_PLN:
                    value = !this.myselectionlist.exportoptions.PLN;
                    break;
                case MenuItemType.pogLibHeaderMenu_3_EXPORTPOG_PSA:
                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG_PSA:
                    value = !this.myselectionlist.exportoptions.PSA;
                    break;
                case MenuItemType.pogLibHeaderMenu_3_EXPORTPOG_PSA_FLOATINGSHELVES:
                     value = !(this.shoppingCartService.floatingShelvesConfig?.enabled && this.shoppingCartService.floatingShelvesConfig);
                     break;
                case MenuItemType.POGLIB_HEADERMENU_1_EXPORTPOG_PSA_FLOATINGSHELVES:
                    value = !(this.shoppingCartService.floatingShelvesConfig?.enabled && this.shoppingCartService.floatingShelvesConfig);
                     break;
                case MenuItemType.pogLibHeaderMenu_2_PROMOTE_DEMOTE:
                    value = !this.myselectionlist.failedPogCount || this.myselectionlist.isSearchFocus;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_Approve:
                case MenuItemType.POGLIB_HEADERMENU_1_Reject:
                case MenuItemType.POGLIB_HEADERMENU_1_ClonePlanogram:
                    value = !this.parentApp.isAllocateApp;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_SyncPog:
                    value = true;
                    if (this.parentApp.isAllocateApp) {
                        value = this.myselectionlist.syncDisabled;
                    }
                    break;
                case MenuItemType.pogLibHeaderMenu_3_CLONEPOG:
                    value = this.myselectionlist.multipleClone;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_MORE_POG_INFO:
                    value = !this.parentApp.isWebViewApp;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_DOWNLOAD_LIVE_POG:
                case MenuItemType.POGLIB_HEADERMENU_1_DOWNLOAD_LIVE_POG_ARROWDOWN:
                    value = !this.checkAllowLiveEdit();
                    break;
                case MenuItemType.UTILITIES_SYNCPOG:
                    value = !this.syncPOGPermission();
                    break;
                case MenuItemType.REPORT_TEMPLATES:
                    value = !this.checkReportDesignerPermission();
                    break;
                case MenuItemType.BACK_TO_ASSORTMENT:
                    value = !this.parentApp.isAssortApp;
                    break;
                case MenuItemType.POGLIBHEADERMENU_3_DELETE:
                    value = this.parentApp.isAssortApp
                    break;
                case MenuItemType.PLATFORM:
                    value = this.parentApp.isAssortApp;
                    break;
                /* PA specific */
                case MenuItemType.Rules_LeftSidePanel_Restore:
                    if(this.parentApp.isAllocateAppInResetProjectType && this.panelID) {
                        value = window.parent.currentScreen === 'review' ||
                                    this.panelService.panelPointer[this.panelID]?.isLoaded;
                    } else {
                        value = true;
                    }
                    break;
                case MenuItemType.rulesModelHeader_View_Rules:
                    value = (this.parentApp.isAllocateApp && window.parent.currentScreen === 'review');
                    break;
                case MenuItemType.Review_ListHeader_view_Review_planogram:
                case MenuItemType.POGLIB_HEADERMENU_1_PA_BULK_ACTION:
                    value = (this.parentApp.isAllocateApp && window.parent.currentScreen === 'layouts');
                    break;
                case MenuItemType.BLOCKS:
                case MenuItemType.RULESMODELHEADER_VIEW_RULES_GROUPRULES:
                case MenuItemType.RULESMODELHEADER_VIEW_RULES_LSAUTH:
                    value = this.parentApp.isAllocateAppInNiciProjectType;
                    break;
                case MenuItemType.PLANOGRAM_INFO:
                    value = !(this.parentApp.isShelfApp && this.panelService.panelPointer[this.panelService.activePanelID]?.isLoaded);
                    break;
                case MenuItemType.Rules_LeftSidePanel_ThumbupThumbdown:
                    value = !this.myselectionlist.ispogCountOne;
                    break;
                case MenuItemType.POGLIB_HEADERMENU_1_SHOPPING_CART:
                    let hide;
                    if(!this.planogramStore.splitterViewMode.syncMode){
                        if(this.panelService.panelPointer['panelOne'].isLoaded || this.panelService.panelPointer['panelTwo'].isLoaded){
                            hide = true;
                        }
                        else{
                            hide = false;
                        }
                    }
                    this.panelService.panelPointer[this.panelID].isLoaded;
                    let showCartIcon = this.planogramStore.allSettings.GetAllSettings.data.find((val) => val.KeyName == 'SHOW_SHOPPING_CART_ITEM').KeyValue
                    value = !showCartIcon ? !showCartIcon
                                : hide ? hide : this.shoppingCartService.hideUnLoadCart;
                    break;
                default:
                    value = false;
                    break;
            }
            return value;
        }
    }

    private checkAllowLiveEdit(): boolean {
        const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
        if (!guid) return false;
        const currObj = this.planogramService.getCurrentObject(guid);
        if (currObj && currObj.IsReadOnly && this.parentApp.isWebViewApp) {
            const livePogEditPermission = this.userPermissions.hasUpdatePermission('WEB_VIEW_LIVE_POG_EDIT');
            if (livePogEditPermission) {
                return !this.myselectionlist.planoviewer;
            }
        }
        return false;
    }

    private checkPermissionToDelete(): boolean {
        return this.userPermissions.hasDeletePermission('DELETEPLANOGRAM');
    }

    private isStandaloneShelf(): boolean {
        return this.parentApp.isShelfApp;
    }

    public onDisabled(submenu: MenuItem): boolean {
        let disablevalue: boolean = false;
        const activePog = this.planogramStore.activeSelectedPog;

        switch (submenu?.key) {
            case 'POGLIB_HEADERMENU_1_ACTIONS_NPI':
                disablevalue = activePog && activePog.IsReadOnly;
                break;
            case 'POGLIB_HEADERMENU_1_ACTIONS_DELETEPOG':
                disablevalue = activePog && activePog.IsReadOnly;
                break;
            case 'POGLIB_HEADERMENU_1_ACTIONS_FEEDBACK':
                const guid = this.panelService.panelPointer[this.panelID].globalUniqueID;
                if (guid) {
                    let currObj = this.planogramService.getCurrentObject(guid);
                    disablevalue = currObj && currObj.POGStatus != 5 && currObj.POGStatus != 4;
                }
            break;
            case MenuItemType.POGLIB_HEADERMENU_1_SAVE:
              disablevalue = !(
                this.myselectionlist.planoviewer &&
                this.checkIfEnableSave() &&
                !this.checkIfSaveInProgress()
              );
              break;
            case MenuItemType.POGLIB_HEADERMENU_1_SAVE_ALL:
                disablevalue = this.disableSaveAll();
            break;
            case 'pogLibHeaderMenu_3_DELETE':
                disablevalue = this.checkPogsVersion();
        }

        return disablevalue;
    }

    private checkPogsVersion(): boolean {
        const checkDisableforpogversion = (element) => {
            return element.IDPogStatus > 3;
        };

        const checkDisableforPogLoaded = (element) => {
            return element.isLoaded;
        };
        const value1 = this.myselectionlist?.selectedPogs?.some(checkDisableforpogversion);
        const value2 = this.myselectionlist?.selectedPogs?.some(checkDisableforPogLoaded);
        return value1 || value2;
    }

    public disabledCss(menu: MenuItem): string | styleCss {
        let styleCss: string | styleCss;
        if (this.parentApp.isAssortApp) {
            if (menu.key === 'UTILITIES_SYNCPOG' || menu.key === 'PLATFORM' || menu.key === 'UTILITIES_APPENDSECTION') {
                styleCss = {
                    'pointer-events': 'none',
                    color: '#00000024',
                };
            } else {
                styleCss = '';
            }
            return styleCss;
        }
    }

    private syncPOGPermission(): boolean {
        if (!this.userPermissions.isReady) { return false; }
        return this.userPermissions.hasReadPermission('POGSYNC');
    }

    private checkReportDesignerPermission(): boolean {
        if (!this.userPermissions.isReady) { return false; }
        return this.userPermissions.hasReadPermission('POGREPORTDESIGNR');
    }

    private checkPerformancePermission(): boolean {
        const isVisible = this.userPermissions.hasReadPermission('POGPERF');
        return isVisible && !this.sharedService.checkIfAssortMode('performance-permission');
    }

    private checkStorePermission(): boolean {
        const permission = this.userPermissions.hasReadPermission('POGASSIGNSTORE');
        return permission && !this.sharedService.checkIfAssortMode('store-premission');
    }

    public isDownloadedPog(controlName: string): boolean {
        return !(
            controlName === 'pogLibHeaderMenu_1' &&
            this.myselectionlist &&
            this.myselectionlist.planoviewer === true &&
            this.myselectionlist.isActivePanel === true
        );
    }

    public disableSaveAll(): boolean {
        var isAnyPogDirty = Object.keys(this.planogramService.rootFlags).some(sectionId => this.planogramService.rootFlags[sectionId].isSaveDirtyFlag
            && !this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGSavingInProgress);
        return this.sharedService.isSaveAllInProgress || !isAnyPogDirty;
    }
}
