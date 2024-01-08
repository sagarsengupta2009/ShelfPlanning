import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ApplicationRef, ElementRef, Injectable } from '@angular/core';
import { Observable, of, Subject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import * as _ from 'lodash';
import { AppConstantSpace } from 'src/app/shared/constants';
import { PAPlanogram, PogFixtureDetails, PAPogsUpdate } from 'src/app/shared/models/allocate';
import { SharedService, PlanogramStoreService, PlanogramService, ParentApplicationService, AppSettingsService, UserService } from '../../common';
import { PlanogramLibraryService } from '../space-automation/dashboard/shelf-planogram/planogramLibrary/planogram-library.service';
import { AllocateFixtureService, ManualBlockService, AllocateCommonService, PanelService, AllocateEventService, ConfirmBaymappingResetComponent, PlanogramLoaderService, PaBroadcasterService, BlockHelperService } from '..';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { LogsListItemOption, PanelSplitterViewType, SvgToolTip, ZoomType } from 'src/app/shared/models';
import { SplitterService } from '../space-automation/dashboard/splitter/splitter.service';
import { Position, Section } from 'src/app/shared/classes';
import { MatDialog } from '@angular/material/dialog';
import { Context } from 'src/app/shared/classes/context';
import { PlanogramInfo } from 'src/app/shared/models/planogram-library/planogram-list';
import { TranslateService } from '@ngx-translate/core';
import { LocalStorageKeys } from 'src/app/shared/constants';

declare const window: any;

/**
 * Allocate service will have a special use case where the service may subscribe to certain calls, as the service is mainly used for interacting with the parent app.
 * Hence the methods and events may not be associated with any of the components.
 */

@Injectable({
  providedIn: 'root',
})
export class AllocateService {
  // TODO @karthik move all events to event service.
  public updatePlibPogs = new Subject<PAPogsUpdate>();
  public updatePlibPogStatus = new Subject<PAPlanogram[]>();
  public autoDownloadPog = new Subject<boolean>();
  public paSearchField = new Subject<string>();
  public triggerShelfSearch = new Subject<string>();
  public clearAllocateText = new Subject<boolean>();
  public openPlanogramSettings = new Subject<boolean>();
  private pogsRefreshed = false;
  public paReviewTabChange = new Subject<boolean>();
  public paWorkSheetChange = new Subject<boolean>();
  public currentMode: number = PanelSplitterViewType.Full;
  public selectLog: Subject<LogsListItemOption> = new Subject<LogsListItemOption>();
  public sideNavDisplay = new Subject<number>();
  public pogwiseFixturedata: PogFixtureDetails = {};
  public syncFlag: boolean;
  public svgTooltipData:  {"Fixture": [],"Product": [], "ShoppingCart": []};
  private isMixedPogMode: boolean = false;
  constructor(

    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramService: PlanogramService,
    private readonly planogramLibService: PlanogramLibraryService,
    private readonly allocateCommonService: AllocateCommonService,
    private readonly manualBlockService: ManualBlockService,
    private readonly panelService: PanelService,
    private readonly httpclient: HttpClient,
    private readonly parentApp: ParentApplicationService,
    private readonly log: ConsoleLogService,
    private readonly splitterService: SplitterService,
    private readonly appRef: ApplicationRef,
    private readonly allocateEvent: AllocateEventService,
    private readonly matDialog: MatDialog,
    private readonly planogramLoader: PlanogramLoaderService,
    private readonly paBroadcaster: PaBroadcasterService,
    private readonly allocateFixtureService: AllocateFixtureService,
    private readonly translate: TranslateService,
    private readonly blockHelper: BlockHelperService,
    private readonly localStorage: LocalStorageService,
    private readonly user: UserService,
  ) {
    this.parentApp.onReady
      .pipe(filter(isReady => isReady))
      .subscribe(() => {
        if (this.parentApp.isAllocateApp) {
          this.initWindowFunctions();
          this.initSubscriptions();
          this.allocateEvent.bayMappingEnabled = this.checkForBayMapping();
        }
      });
  }

  public get isMixedPogModeEnabled(): boolean {
    return this.isMixedPogMode;
  }
  private get allocateAppUrl(): string {
    return this.parentApp.allocateAzure.url;
  }
  private get allocateAuthCode(): string {
    return this.parentApp.allocateAzure.code;
  }

  // TODO @karthik use the planogram list inteface once setup from planogram service
  public getAllPAPlanograms() {
    let pType = this.getPogType();
    const corpId = this.localStorage.get(LocalStorageKeys.PA.CORP_DETAILS)['IdCorp']
    let url = `${this.allocateAppUrl}/api/GetPlanograms?code=${this.allocateAuthCode}`
      + `&scenarioId=${this.planogramStore.scenarioId}`
      + `&isPreferredOnly=false&pogType=${pType}&corpId=${corpId}&storespecific=true`;

    let headers = new HttpHeaders();
    headers = headers.append('emailid', this.user.emailId);

    const persistantPogs = window.parent.getMixedPogsList();
    let apiCall;
    if (persistantPogs.length) {
      this.isMixedPogMode = true;
      apiCall = of(persistantPogs);
    } else {
      apiCall = this.httpclient.get<PAPlanogram[]>(url, {headers});
    }
    return apiCall.pipe(
      map((response) => {
        let pogs = this.filterPlanograms(response);
        return this.processPlanograms(pogs);
      }),
    );
  }

  // TODO @karthik use the planogram list inteface once setup from planogram service
  public processPlanograms(pogs) {
    pogs.forEach((e) => {
      e['IDPOG'] = parseInt(e.rowKey);
      e['scenarioID'] = this.planogramStore.scenarioId;
      e['mode'] = this.sharedService.mode;
      e['Name'] = e.pogName;
      e['PogStatusSymbol'] = e.statusCode;
      e['IsApproved'] = e.approveState == 'A' ? true : e.approveState == 'R' ? false : null;
      e['CheckoutOwner'] = '';
      e['POGTypeSymbol'] = e.pogType;
      e['POGType'] = e.pogAssignmentType;
      e['L4'] = e.l4;
      e['Dimension'] = e.footage;
      e['POGLastModifiedDate'] = e.timestamp;
      e['POGLastModifiedBy'] = e.modifiedBy;
      e['IDPogStatus'] = e.status;
      e['POGStatus'] = e.status;
      e['IsReadOnly'] = e.isReadOnly;
      e['pogCount']  = e.pogCount;
      e.svgSaved = false;
      e.PogClassificationType = e.pogClassificationType;
      // remove new variables
      e = _.omit(e, [
        'pogName',
        'rowKey',
        'pogAssignmentType',
        'footage',
        'timestamp',
        'modifiedBy',
        'isReadOnly',
        'status',
        'approveState',
      ]);
    });
    return pogs;
  }

  public openGrid(response) {
    if (response.data.key == "Review_ListHeader_view_Review_planogram") {
      window.parent.loadAllocateComponentReview(this.splitterService.getSplitterView());
    } else {
      window.parent.openGrid(response.data);
    }
    this.splitterService.changeSplitterOrientation(0);
  }

  //TODO @karthik move to broadcaster
  public resizeParentWindow(expand: boolean): void {
    if (this.parentApp.isAllocateApp) {
      window.parent.expandFrame(expand);
    }
  }

  public updatePlacementRules(item: Position): void {
    if (window.parent.currentScreen === 'layouts') {
      window.parent.updatePlacementRules(item);
    }
  }

  public validatePogData(section: Section): Observable<boolean> {
      return this.validateFixturesBeforeSave();
  }

  public getToolTipData(svgSlement: ElementRef): SvgToolTip[] {
    return window.parent.getTooltipData(svgSlement,this.svgTooltipData);
  }

  // fetch shopping cart items for svg display
  public getShoppingCartItems() {
    return window.parent.getShoppingCartItems(this.svgTooltipData.ShoppingCart);
  }

  private validateFixturesBeforeSave(): Observable<boolean> {
    if (this.allocateEvent.isBayMappingEnabled && this.parentApp.isAllocateAppInResetProjectType && window.parent.currentScreen === 'layouts') {
      let pogObject = <Section>this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId());
      const oldFixtures = this.allocateEvent.getPogFixturesData(pogObject.IDPOG);
      let currentFixtures = this.allocateFixtureService.createFixtureData();

      if (oldFixtures.length !== currentFixtures.length) {
        return this.openBayMappingResetDialog();
      }
      for (let currentFixture of currentFixtures) {
        let item = oldFixtures.filter(e => e.FixtureId == currentFixture.FixtureId)[0]
        if (!_.isEqual(item, currentFixture)) {
          return this.openBayMappingResetDialog();
        }
      }
    }
    return of(true);
  }

  private getPogType(): string {
    let pType = window.parent.mode == 'manual' ? 'Model' : 'SSPOG';
    return window.parent.optimizeMode ? 'Manual' : pType;
  }

  // init all functions to be used in PA
  private initWindowFunctions() {

    this.initPaListener();
    // TODO: @malu parent app setter
    window.invokeShelf = (scenarioId, loadPogID, mode, dummy, dummy2) => {
      this.planogramStore.scenarioId = scenarioId;
      this.planogramStore.loadPogId = loadPogID;
      this.parentApp.updateParentAppInfo('allocate', mode, '', '', '');
      this.sharedService.mode = window.parent.mode = mode;
      this.pogsRefreshed = true;
      this.updatePlanograms();
      const disableProductLib = this.getProductLibConfiguration(window.parent.currentScreen);
      this.paReviewTabChange.next(disableProductLib);
      this.allocateEvent.bayMappingEnabled = this.checkForBayMapping();
      this.panelService.invokedIdpogApiForPanelID = null;
    };

    window.syncMode = () => {
      return this.sharedService.shelfSyncMode;
    };
    window.toggleMixedPogMode = (flag: boolean) => {
      this.isMixedPogMode = flag;
    }

    window.checkIsPogLoaded = () => {
      let idpog = this.panelService.panelPointer['panelOne']['IDPOG'];
      for (let g = 0; g < this.planogramLibService.mapper.length; g++) {
        if (this.planogramLibService.mapper[g].IDPOG == idpog && this.planogramLibService.mapper[g].isLoaded) {
          return true;
        }
      }
      return false;
    };

    window.updatePositionDetails = (gridData) => {
      try {
        let sectionID = this.sharedService.getActiveSectionId();
        let pog = this.sharedService.getObject(sectionID, sectionID);
        const recursive = (obj) => {
          if (obj.ObjectDerivedType == 'Position') {
            let gridItem = gridData.filter((e) => e.productKey == obj.Position.Product.ProductKey)[0];
            if (gridItem) {
              this.updatePositionAttribute(gridItem, obj);
            }
          }
          if (obj.hasOwnProperty('Children')) {
            obj.Children.forEach((child) => {
              recursive(child);
            });
          }
        };
        recursive(pog);
      } catch (e) {
        this.log.error(e);
      }
    };

    window.openWorksheetFromAllocate = (componentID: number, view: PanelSplitterViewType, key = this.panelService.panelPointer.panelTwo.selectedViewKey) => {
      componentID = componentID ? componentID : this.panelService.panelPointer.panelTwo.componentID;
      if (this.splitterService.getSplitterView() != view) {
        this.planogramStore.splitterViewMode.displayMode = view;
        this.splitterService.changeSplitterOrientation(view);
      }
      this.syncFlag = componentID == 1 ? true : false;
      this.panelService.loadWorkSheet.next({ componentID, key, view });
      this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
    };
    window.isPogDirty = () => {
      return (
        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()] &&
        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag
      );
    };
    window.updatePositionItems = (gridData) => {
      this.updatePositionDetails(gridData);
    };

    window.selectObjectFromActionReport = (IDProduct, itemData) => {
      this.allocateCommonService.highlightScope(IDProduct, itemData);
    };

    window.updatePlibPogs = (updatePogs) => {
      if (this.pogsRefreshed) {
        this.pogsRefreshed = false;
        return;
      }

      this.updatePlibPogs.next({ data: updatePogs, isShelfReload: false });
    };

    window.updatePlibPogStatus = (updatePogs) => {
      this.updatePlibPogStatus.next(updatePogs);
    };

    window.triggerShelfSearch = (text: string) => {
      this.triggerShelfSearch.next(text);
    };

    // here grid item is from allocate app.
    window.updatePositionItemAutomation = (gridItem) => {
      this.updatePositionDetails([gridItem]);
    }

    //TODO @karthik eliminate type
    window.logRowSelectFromAllocate = (options, type) => {
      this.selectLog.next(options);
    }

    window.requestToDownload = (pogs) => {
      let newPogs = [];
      for (let pog in pogs) {
        const indx = this.planogramStore.mappers.findIndex(x => x.IDPOG == +pogs[pog].rowKey);
        if (indx != -1) {
          const currPog = this.planogramStore.mappers[indx];
          if (currPog.isLoaded === true) {
            this.planogramLoader.unloadPlanogramInBackground([currPog]);
            break;
          } else {
            this.planogramLoader.requestToDownload(currPog);
          }
        } else {
          newPogs.push(pogs[pog]);
        }

        this.paBroadcaster.updatePogDownload(pogs[pog].rowKey, true);
      }
      if (newPogs.length) {
        const processedPog = this.processPlanograms(newPogs);
        this.planogramLibService.markRequestToPin(processedPog, false);
        for (let pog in processedPog) {
          this.planogramLoader.requestToDownload(processedPog[pog]);
        }
      }
    }

    window.getDirtyPlanograms = (): number[] => {
      const dirtyPogs = Object.keys(this.planogramService.rootFlags)
        .filter(sectionId => this.planogramService.rootFlags[sectionId].isSaveDirtyFlag);
      const pogIds = this.planogramStore.mappers.filter(pog => dirtyPogs.includes(pog.sectionID))
        .map(pog => pog.IDPOG);
      return pogIds;
    }
  }

  private unloadPlanograms(): void {
    this.planogramStore.mappers.forEach((pog) => {
      if (pog.isLoaded === true) {
        this.planogramLoader.unloadPlanogramInBackground([pog]);
        this.paBroadcaster.updatePogDownload(pog.rowKey, false);
      }
    })
  }

  // Get the Product Library Configuration from app setting
  public getProductLibConfiguration(screenName: string): boolean {
    let config = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(val => val.KeyName === 'PA_CONFIGURATIONS');
    if (config) {
      //TODO Below line can be eliminated once we change the layouts screen name to rules
      screenName = screenName === 'layouts' ? 'rules' : screenName;
      let prductLibConfig = JSON.parse(config.KeyValue as string);
      const isDisabled = prductLibConfig['Product_Library'].includes(screenName) || prductLibConfig['Product_Library'].includes('*');
      return !isDisabled;
    } else {
      return true;
    }
  }

  private initSubscriptions(): void {
    this.sharedService.itemSelection.subscribe((response) => {
      if (response) {
        const pos = response['pogObject'];
        if (
            window.parent.makeRowSelected &&
            (pos?.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT ||
            pos?.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT)) {
          window.parent.makeRowSelected(pos);
        }
        /**
         *  ensure the focus is always on the window when any selections are triggered.
         */
        setTimeout(() => {
          window.focus();
        });
      }
    });

    this.planogramService.updatePOGInfo.subscribe((currentPogInfo: PlanogramInfo) => {
      let activePanelInfo = this.panelService.ActivePanelInfo;
      if (activePanelInfo?.IDPOG === currentPogInfo?.pogInfo?.IDPOG) {
        window.parent.componentID = this.panelService.panelPointer[this.panelService.activePanelID].componentID;
        window.parent.updatePog(currentPogInfo.pogInfo);
        window.parent.refreshAllocate();
      }
    })
  }


  private updatePositionDetails(gridData): void {
    try {
      let sectionID = this.sharedService.getActiveSectionId();
      let pog = this.sharedService.getObject(sectionID, sectionID);
      let recursive = (obj) => {
        if (obj.ObjectDerivedType == 'Position') {
          let gridItem = gridData.filter((e) => {
            return e.productKey == obj.Position.Product.ProductKey;
          })[0];
          if (gridItem) {
            this.updatePositionAttribute(gridItem, obj);
          }
        }
        if (obj.hasOwnProperty('Children')) {
          obj.Children.forEach((child) => {
            recursive(child);
          });
        }
      };
      recursive(pog);
      // need to manually call computeMerch since this action is not recorded as part of history stack.
      const rootObj = <Section>this.sharedService.getObjectAs(this.sharedService.activeSectionID, this.sharedService.activeSectionID);
      const ctx = new Context(rootObj);
      rootObj.computeMerchHeight(ctx, { reassignFlag: true, recFlag: true });
    } catch (e) {
      this.log.error(e);
    }
  }

  private updatePositionAttribute(gridItem, position = null) {
    //update fields from grid to shelf
    if (position == null)
      position = this.sharedService
        .getAllPositionFromObjectList(this.sharedService.activeSectionID)
        .filter((e) => {
          return e.Position.Product.ProductKey == gridItem.productKey;
        })[0];
    if (position) {
      this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
      this.planogramService.updateSaveDirtyFlag(this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag);
      position.Position.attributeObject.ForceFit = gridItem.forceFit ?? false;
      position.Position.attributeObject.RecMustNotStock = gridItem.mustNotStock ?? false;
      position.Position.attributeObject.RecMustStock = gridItem.mustStock ?? false;
    }
  }

  // on navigating b/w screens
  //TODO @karthik eliminate getAllPAPlanograms and pogs refreshed flag
  private updatePlanograms() {
    this.getAllPAPlanograms().subscribe((response) => {
      //TODO filter pogs
      let planograms = response;
      if (!planograms.length) {
        window.parent.showNoPlanogramMsg("NP");
        return;
      }
      window.parent.showNoPlanogramMsg("PE");
      /**
       * When review screen reloads, if sspog is already loaded need to unload and load again since there is a chance this sspog has been regenerated.
       * TODO @karthik can this be done only when the sspog is regenerated. update the downloaded planogram list.
       */
      if (this.parentApp.isAllocateAppInReviewMode) {
        planograms.forEach((pog) => {
          let existingPog = this.planogramStore.downloadedPogs.filter(e => e.IDPOG === pog.IDPOG)[0];
          if (existingPog) {
            this.planogramStore.removePogById(existingPog.IDPOG);
            if (pog.IDPOG === +window.parent.activeIDPOG) {
              // ensure this happens after plibis updated below
              // This can be skipped if we have the data on which pogs to unload.
              setTimeout(() => {
                this.autoDownloadPog.next(true);
              });
            }
          }
        });
      }

      this.planogramStore.mappers = [];
      this.planogramLibService.mapper = [];
      this.planogramLibService.markRequestToPin(planograms, false);
      this.updatePlibPogs.next({ data: planograms, isShelfReload: true });
    });
  }

  private filterPlanograms(response): Array<PAPlanogram> {
    let result = {};
    let pogs = [];
    if (!response.length) {
      return [];
    }
    result['Planograms'] = response;
    let activePog = result['Planograms'].filter((el) => {
      return el.rowKey == window.parent.activeIDPOG;
    })[0];
    let planogramList = result['Planograms'].filter((e) => {
      return e.pinned == true || window.parent.savedPOG.includes(e.rowKey);
    });
    if (window.parent.activeIDPOG == null) {
      //set last active pog if exists
      let lastActivePog = window.parent.getLastActivePog();
      if (lastActivePog && result['Planograms'].filter((el) => el.rowKey == lastActivePog).length) {
        window.parent.activeIDPOG = lastActivePog;
      } else {
        if (planogramList.length) window.parent.activeIDPOG = planogramList[0].rowKey;
        else window.parent.activeIDPOG = result['Planograms'][0].rowey;
      }
    }
    if (planogramList.length) {
      pogs = planogramList;
    }
    if (activePog) {
      pogs.push(activePog);
    }
    //consider first pog when no active pog set or pinned
    if (activePog == undefined && result['Planograms'].length && planogramList.length == 0) {
      pogs.push(result['Planograms'][0]);
      window.parent.activeIDPOG = pogs[0].rowKey;
    }

    return _.uniqBy(pogs, (x: any) => {
      return x.rowKey;
    });
  }

  private checkForBayMapping(): boolean {
    try {
      let PA_menus = JSON.parse(localStorage.getItem('ApplicationMenus'))
      let bayMappingMenu = PA_menus.menu.filter(e => e.screenName == "Home")[0].controlName.filter(e => e.name == "bottomSideNav")[0].menus.filter(e => e.key == 'BayMapping');
      if (bayMappingMenu.length) {
        return true;
      }
      return false;

    } catch (err) {
      console.log(err);
      return false;
    }
  }

  private openBayMappingResetDialog(): Observable<boolean> {
    return this.matDialog.open(ConfirmBaymappingResetComponent).afterClosed()
      .pipe(tap((res: boolean) => {
        if (res) {
          this.allocateEvent.resetBayMapping = true;
        }
      }))
  }

  private resizePlanogram(): void {
    if (this.sharedService.getActiveSectionId()) {
      this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
    }
  }

  private initPaListener(): void {
    window.addEventListener('message', this.processFromPA, false);
  }

  /** processFromPA will be an callback to window post message listener,
  * which needs to be arrow funtion to retain context */
  private processFromPA = (message: MessageEvent): void => {
    // triggeres with data. A bit slower than without data hence seperate if blocks.
    if (message.data.startsWith("withData:")) {

      if (message.data.includes("selectObject")) {
        let objectType = message.data.split(':')[2];
        let item = message.data.split(':')[3];
        if (objectType == 'block') {
          this.blockHelper.selectBlocks(item);
        } else {
          this.allocateCommonService.selectObject(item, 'ProductKey');
        }
      }

      else if (message.data.includes("setSearchOption")) {
        let option = message.data.split(':')[2];
        this.paSearchField.next(option);
      }

    } else {
      switch (message.data) {
        case "openFixtureGallery":
          this.planogramLibService.openFixtureGalleryDialog();
          break;
        case "openPlanogramSettings":
          this.openPlanogramSettings.next(true);
          break;
        case "createManualBlock":
          this.manualBlockService.initDraw(document.getElementById('pog-drawspace'));
          break;
        case "toggleSyncMode":
          this.allocateEvent.synchronize.next(true);
          break;
        case "unloadPlanograms":
          this.unloadPlanograms();
          break;
        case "savePlanogram":
          this.allocateEvent.savePlanogram.next(true);
          break;
        case "openProductLibrary":
          this.allocateEvent.openProductLibrary.next(true);
          break;
        case "toggleItemScanning":
          this.sharedService.isItemScanning = !this.sharedService.isItemScanning;
          break;
        case "clearSearchText":
          this.clearAllocateText.next(true);
          break;
        case "resizePlanogram":
          this.resizePlanogram();
          break;
        default:
          console.log("unknown message triggered from PA");
          break;
      }
    }
  }

}
