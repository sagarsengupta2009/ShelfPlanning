import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { ConsoleLogService } from 'src/app/framework.module';
import { Section, SyncAuthCodeWithVM } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { POGLibraryListItem, ProductAuth, SectionResponse, SplitterViewMode } from 'src/app/shared/models';
import {
  PlanogramStoreService,
  HistoryService,
  SharedService,
  PlanogramSaveService,
  PlanogramPerformanceService,
  IntersectionChooserHandlerService,
  PlanogramLibraryService,
  HighlightService,
  PanelService,
  PlanogramLibraryApiService,
  ParentApplicationService,
  PaBroadcasterService,
  PlanogramService,
  AllocateAPIService,
  NotifyService,
  PlanogramCommonService,
  BlockHelperService,
  AllocateNpiService,
  AllocateEventService,
  AllocateFixtureService,
} from 'src/app/shared/services';

declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class PlanogramLoaderService {

  public reloadPlanogram = new Subject<boolean>();

  constructor(
    private readonly sharedService: SharedService,
    private readonly historyService: HistoryService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramSaveService: PlanogramSaveService,
    private readonly planogramPerformance: PlanogramPerformanceService,
    private readonly intersectionChooserHandler: IntersectionChooserHandlerService,
    private readonly planogramLibraryService: PlanogramLibraryService,
    private readonly highlightSetting: HighlightService,
    private readonly panelService: PanelService,
    private readonly planogramLibApiService: PlanogramLibraryApiService,
    private readonly planogramService: PlanogramService,
    private readonly parentApp: ParentApplicationService,
    private readonly translate: TranslateService,
    private readonly planogramLibService : PlanogramLibraryService,
    private readonly allocateAPIService : AllocateAPIService,
    private readonly notify : NotifyService,
    private readonly paBroadcaster : PaBroadcasterService,
    private readonly planogramCommonService : PlanogramCommonService,
    private readonly blockHelperService : BlockHelperService,
    private readonly allocateNpi : AllocateNpiService,
    private readonly allocateEventService : AllocateEventService,
    private readonly allocateFixture: AllocateFixtureService,
    private readonly log: ConsoleLogService
  ) {}


  public unloadplanogram(pog: POGLibraryListItem, panelID?: string): void {
    if (this.planogramStore.appSettings.isAppOnline) {
      if (!this.parentApp.isAllocateApp) {
        this.planogramLibApiService.cleareAutoSavedData(pog.IDPOG).subscribe();
      }
    }

    this.planogramStore.removePogById(pog.IDPOG);
    //Update loaded state on both sync and async mode
    this.panelService.panelSyncEventInvoked.next(false);
    const objectMapper: POGLibraryListItem[] = this.planogramStore.mappers;
    objectMapper.forEach((element) => {
      if (element.IDPOG == pog.IDPOG) {
        element.isLoaded = false;
      }
    });
    this.panelService.view = 'svg';

    this.highlightSetting.showLegend.next(false);

    if (panelID) {
      this.panelService.panelPointer[panelID]['sectionID'] = '';
      this.panelService.panelPointer[panelID]['componentID'] = '';
    }
    pog.sectionID = '';
    if (this.parentApp.isAllocateApp) {
      this.paBroadcaster.updatePogDownload(pog.IDPOG, false);
    }
  }

  public removePlanogramVM(IDPOG: number, sectionID: string): void {
    delete this.sharedService.planogramVMs[sectionID];
    this.planogramSaveService.clearAutoSave(sectionID);
    this.sharedService.cleanBySectionId(sectionID);
    this.historyService.cleanBySectionId(sectionID);
    this.highlightSetting.cleanBySectionId(sectionID);
    this.planogramPerformance.cleanBySectionId(sectionID);
    this.intersectionChooserHandler.cleanBySectionId(sectionID);
    this.sharedService.setActiveSectionId('');
    delete this.planogramService.rootFlags[sectionID];

    let index: number = this.planogramLibraryService.mapper.findIndex((item) => item.IDPOG == IDPOG);
    if (index > -1) {
      this.planogramLibraryService.mapper[index].isLoaded = false;
      this.planogramLibraryService.mapper[index].IsAutoSaved = false;
      this.planogramLibraryService.mapper[index].IsLoaded = this.translate.instant('UNLOADED');
      this.planogramLibraryService.mapper[index].sectionID = '';
      this.planogramStore.mappers = this.planogramLibraryService.mapper;
    }
    this.planogramLibraryService.removeAllObselete();
  }


  /**
   * TODO @karthik. This code is repeated in panel-content and planogram libraray with slight modifications.
   * Since this is needed for PA to function but changing in the above components may result in regression and above components may not be loaded in pa, the code refactoring part
   * will be taken care as part of 2023.1
   * #186361
   */
  public requestToDownload(obj: POGLibraryListItem): void {
    const pogCounts = this.planogramLibService.getLoadCount();
    if (!obj.isLoaded) {
      if (pogCounts.canDownload) { //checking POG count before creating a new planogram

        const pog = this.planogramStore.getPogById(obj.IDPOG);
        if (!pog) {
          if (this.parentApp.isAllocateApp) {
            window.parent.updateBlocks = false;
            this.allocateAPIService.getPlanogramData(obj)
              .subscribe((result) => {
                if(result.Data) {
                  this.processPlanogramData(result.Data, obj);
                } else {
                  this.paBroadcaster.toastMessage(result.Message);
                  window.parent.showNoPlanogramMsg('loading', 'finished');
                }
              },
                (error) => {
                  window.parent.showNoPlanogramMsg('loading', 'finished');
                });

          } else {
            this.panelService.getPlanogramData(obj.IDPOG).subscribe(result => {
              if (result.Data != null) {
                this.processPlanogramData(result.Data, obj);
              } else {
                if (result?.Log?.Details[0]?.Message) {
                  this.notify.error(result.Log.Details[0].Message, this.translate.instant('OK'));
                } else {
                  this.notify.error('INVALID_PLANOGRAM_DATA', 'OK');
                }
              }
            }, (error) => {
              this.notify.error('INVALID_PLANOGRAM_DATA', 'OK');
            });
          }
        }
      } else {
        this.notify.warn(`${pogCounts.maxPogCount} ${this.translate.instant('POG_ALREADY_LOADED')}`);
      }
    }
  }

  private processPlanogramData(data: SectionResponse, obj: POGLibraryListItem): void {
    const appSettingsSvc = this.planogramStore.appSettings;
    this.planogramCommonService.loadLabelItems();
    this.planogramCommonService.obtainShelfLabelParams(appSettingsSvc.allSettingsObj.GetAllSettings.data);
    this.planogramCommonService.loadFixtLabelItems();
    if (this.parentApp.isAllocateApp) {
      let paAuth = null;
      if (data.ProdAuthData) {
        paAuth = data.ProdAuthData;
      }
      this.processAfterProdAuth(data, obj, paAuth);
      delete data.ProdAuthData;
      window.parent.showNoPlanogramMsg('loading', 'finished');
    } else {
      this.panelService.getProductAuthForPOG(data.IDPOG).subscribe(response => {
        this.processAfterProdAuth(data, obj, response.Data);
      }, (error) => {
        this.notify.error('INVALID_PLANOGRAM_DATA', 'OK');
      });
    }
  }

  private processAfterProdAuth(data: SectionResponse, obj: POGLibraryListItem, authData?: ProductAuth): void {
    this.sharedService.setSelectedIDPOG(obj.IDPOG)
    this.planogramStore.getLookupdata();
    let section = this.prepareData(data);
    if (authData) {
      this.planogramService.syncAuthCodeWithVM = new SyncAuthCodeWithVM(authData, section);
    }  //authcode
    obj.sectionID = section.$sectionID;
    obj.isLoaded = true;
    const index = this.planogramStore.mappers
      .filter(it => it.IDPOG == obj.IDPOG)
      .reduce((_, it, index) => {
        it.isLoaded = true;
        it.sectionID = section.$sectionID;
        return index;
      }, -1);

    this.planogramLibService.markAlreadyLoaded({ IDPOG: data.IDPOG, isLoaded: true, sectionID: section.$sectionID });
    const pog = this.planogramStore.downloadedPogs.find(it => it.IDPOG === data.IDPOG);
    if (pog) {
      pog.sectionObject = section;
      pog.sectionID = section.$sectionID;
    } else {
      this.planogramStore.downloadedPogs.push({
        IDPOG: data.IDPOG,
        sectionObject: section,
        sectionID: section.$sectionID,
      });
    }

    if (this.parentApp.isAllocateApp) {
      this.paBroadcaster.updatePogDownload(data.IDPOG, true);
      this.allocateNpi.setNpiUpdated(section.$sectionID, false);
      this.allocateEventService.originalFixtureData = this.allocateFixture.prepareFixtureData(section);
    } else if (this.parentApp.isAssortApp) {
      window.parent.postMessage('invokePaceFunc:shelfLoaded', '*');
      window.parent.postMessage('invokePaceFunc:syncAssortWorkbook:[" ' + obj.IDPOG + '"]', '*');
    }
  }

  private prepareData(data: SectionResponse): Section {
    const sorted = this.sortChildrens(data);
    let section = this.planogramCommonService.prepareModel(sorted); // Section class
    this.sharedService.planogramVMs[section.$id] = section;
    this.sharedService.NewIsSaveDirtyFlag[section.$id] = false;
    this.sharedService.OldIsSaveDirtyFlag[section.$id] = false;
    this.planogramService.initBySectionIdByCommunicator(section.$id);
    this.planogramService.initBySectionIdMeasurment(section.$id);
    this.planogramService.initBySectionIdByPlanogramsetting(section.$id);
    this.planogramService.initBySectionIdByHighlight(section.$id);
    this.intersectionChooserHandler.initBySectionId(section.$id);
    const pogObj = sorted as unknown as Section;

    if (this.parentApp.isAllocateApp) {
      this.blockHelperService.processPogBlocks(pogObj);
    }

    this.historyService.historyStack[section.$id] === undefined ? this.historyService.initBySectionId(section.$id) : null;
    return section;
  }

  private sortChildrens(pog?: SectionResponse): SectionResponse {
    if (!pog) {
      return pog;
    }
    const data = pog;
    const shoppingCartObjects = data.Children.filter(it => it.Fixture.FixtureType === AppConstantSpace.SHOPPINGCARTOBJ);
    const notShoppingCartObjects = data.Children.filter(it => it.Fixture.FixtureType !== AppConstantSpace.SHOPPINGCARTOBJ);
    data.Children.sort((a, b) => a.Location.X - b.Location.X);
    data.Children = shoppingCartObjects.concat(notShoppingCartObjects);
    return pog;
  }

  // TODO rename conflict with unloadPlanogram with code refactor
  public unloadPlanogramInBackground(items: POGLibraryListItem[]): void {
    for (const item of items) {
      if (this.planogramStore.appSettings.isAppOnline) {
        if (!this.parentApp.isAllocateApp) {
          this.planogramLibApiService.cleareAutoSavedData(item.IDPOG).subscribe();
        }
      }
      const mapperObj = this.planogramLibService.getCurrentObject(item.globalUniqueID);
      try {
        if (item.IDPOG === this.panelService.invokedIdpogApiForPanelID) {
          this.panelService.invokedIdpogApiForPanelID = null;
          this.panelService.skipApiCallForPanel = { panelID: '', flag: false, IDPOG: null };
        }
        this.planogramStore.removePogById(item.IDPOG);
        mapperObj.isLoaded = false;
        this.removePlanogramVm(mapperObj);
      } catch (e) {
        this.log.error(e);
      }
      mapperObj.sectionID = '';
    }
  }

  private removePlanogramVm({ IDPOG, sectionID }: { IDPOG: number, sectionID: string }): void {
    this.removePlanogramVM(IDPOG, sectionID);
    this.planogramStore.removePogById(IDPOG);
  }
}
