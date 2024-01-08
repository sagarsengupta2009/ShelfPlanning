import { AfterViewInit, Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Subscription, zip } from 'rxjs';
import { cloneDeep } from 'lodash-es';
import { ConsoleLogService } from 'src/app/framework.module';
import {
  AppSettingsNameKeys as NAME_KEYS, AppSettingsGroupKeys as GROUP_KEYS,
  SettingNames as SETTINGS, Utils,
} from 'src/app/shared/constants';
import {
  SharedService, LocalSearchService, SaDashboardService,
  UserPermissionsService, PlanogramCommonService,
  AssortService, PropertyGridService, PogSideNavStateService,
  PogQualifierConfigurationService, ShoppingCartService,
  PlanogramLibraryService, WorkSheetGridConfigurationService,
  DictConfigService, PlanogramService, AppSettingsService,
  PlanogramStoreService, ParentApplicationService, CrunchModeService,
  PlanogramLibraryApiService,
  PegLibraryService,
  HighlightService,
} from 'src/app/shared/services';
import {
  AllDictionaryData, ApplicationSettings, AllPlanogramResponse,
  IApiResponse, LookUpRecords, PlanogramStatus,
  Dictionary, Planograms, PogExportOptions,
  PropertyLookupItem, FixtureTypeLookupItem, PogClassifierLookupItem,
  AllSettings, AnchorSettings, FloatingShelves, SortedGuidList
} from 'src/app/shared/models';
import { MatDialog } from '@angular/material/dialog';
import { PegLibrary } from 'src/app/shared/models/peg-library';
import { setTimeout } from 'timers';

declare const window: any;

@Component({
  selector: 'app-shelf-planogram',
  templateUrl: './shelf-planogram.component.html',
  styleUrls: ['./shelf-planogram.component.scss']
})
export class ShelfPlanogramComponent implements OnInit, OnDestroy, AfterViewInit {

  public subscriptions: Subscription = new Subscription();
  // TODO: @malu change the type and convert to getter
  public appSettingsSvc: any = {}; // StoreAppSettings = <StoreAppSettings>{};
  public gridData: AllPlanogramResponse;
  public showLibraryGrid = true;
  public selectedPogObject: Planograms;
  public planogramStatusList: any;

  public get exportOptions(): PogExportOptions {
    return this.planogramStore.appSettings.PogExportOptions
  }

  constructor(
    private readonly appSettingsService: AppSettingsService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly activeRoute: ActivatedRoute,
    private readonly saDashboardService: SaDashboardService,
    private readonly sharedService: SharedService,
    private readonly localSearch: LocalSearchService,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly userPermissions: UserPermissionsService,
    private readonly assortService: AssortService,
    private readonly propertyGridService: PropertyGridService,
    private readonly planogramLibService: PlanogramLibraryService,
    private readonly pogQualifierConfigurationService: PogQualifierConfigurationService,
    private readonly shoppingCartService: ShoppingCartService,
    private readonly workSheetGridConfigurationService: WorkSheetGridConfigurationService,
    private readonly cd: ChangeDetectorRef,
    private readonly dictConfigService: DictConfigService,
    private readonly planogramService: PlanogramService,
    private readonly log: ConsoleLogService,
    private readonly parentApp: ParentApplicationService,
    private readonly planogramLibApiService: PlanogramLibraryApiService,
    private readonly pogSideNavStateService: PogSideNavStateService,
    private readonly crunchMode: CrunchModeService,
    private readonly dialog: MatDialog,
    private readonly pegLibraryService: PegLibraryService,
    private readonly highLightService: HighlightService
  ) { }

  ngOnInit(): void {
    this.planogramLibService.mapper = [];
    this.planogramStore.mappers = this.planogramLibService.mapper;
    this.initialPageReloadEvent();
    this.registerSubscriptions();
    //used subject as we cannot use concatMap, then as we are not retirning observable.
    this.sharedService.setLookupHolderData.subscribe((res) => {
      if (res) {
        this.getAllSettingObjects();
      }
    })
  }

  initialPageReloadEvent = () => {
    this.sharedService.GridValueUpdated(false);
    window.addEventListener("unload", this.useFetchToCheckInPogs.bind(this));
    window.addEventListener("beforeunload", (e) => {
      if (this.parentApp.isAssortApp) {
        return false;
      }
      else if ((this.sharedService.isGridEditing || this.sharedService.isStoreDirty || this.checkIfAnyPlanogramIsDirty()) && !this.sharedService.skipUnloadEvent) {
        let confirmationMessage = "\o/";
        e.returnValue = confirmationMessage;
        this.sharedService.skipUnloadEvent = false;
        return confirmationMessage;
      }
      if (this.sharedService.skipUnloadEvent) {
        this.sharedService.skipUnloadEvent = false;
      }
      return false;
    }, false);
  }

  private registerSubscriptions(): void {

    this.subscriptions.add(
      this.parentApp.onReady
        .pipe(source => zip(source, this.activeRoute.queryParams))
        .subscribe(([isReady, params]) => {
          if (!isReady) { return; }
          this.setScenarioIdAndProjectId(params);
          this.getLookUpRecords();
          this.getPlanogramStatus();
        }));

    this.subscriptions.add(
      this.sharedService.editPlanogramTemplate.subscribe(res => {
        if (res) {
          let list: Planograms[] = this.planogramStore.mappers;
          this.selectedPogChange(list[list.length - 1])
          this.updateState(false);
        }
      }));
  }

  private setScenarioIdAndProjectId(params: Params): void {
    let scenarioId = this.parentApp.isAssortApp && params.asstScenarioID
      ? params.asstScenarioID : params.scenarioID;
    let projectId = params.projectID;

    if (this.parentApp.isAssortApp) {
      if (this.parentApp.isAssortAppInIAssortNiciMode) {
        projectId = scenarioId = -1;
      }
      if (params.readOnly) {
        this.planogramStore.readOnlyMode = true;
      }
    } else if (this.parentApp.isAllocateApp) {
      projectId = -1;
    } else if (this.parentApp.isWebViewApp) {
      projectId = scenarioId = -1;
    }

    this.planogramStore.scenarioId = scenarioId || -1;
    this.planogramStore.projectId = projectId;
    this.planogramStore.loadPogId = params.loadpogID;
  }

  ngAfterViewInit(): void {
    this.rowChangeForWebview();
  }

  updateState = ($event) => {
    if (!this.localSearch.searchFieldsFrmDb) {
      this.localSearch.initFields();
    }
    this.sharedService.isWorkSpaceActive = !$event;
    this.showLibraryGrid = $event;
    this.hideShoppingCartTopView();
    this.dialog.getDialogById('clipBoard-top-view')?.close();
    this.dialog.getDialogById('clipBoard-bottom-view')?.close();
  }

  private hideShoppingCartTopView(): void {
    let cartView = document.getElementsByClassName('shoppingcart-topview') as HTMLCollectionOf<HTMLElement>;
    let cartViewUnloaded =  document.getElementsByClassName('shoppingcart-Unloaded-topview') as HTMLCollectionOf<HTMLElement>;
    if (cartView?.length && this.showLibraryGrid) {
      this.pogSideNavStateService.shoppingCartView.isPinned = false;
      cartView[0].style.display = 'none';
    }
    if (cartViewUnloaded?.length && this.showLibraryGrid) {
      cartViewUnloaded[0].style.display = 'none';
    }
  }

  public updateStateOnCreate = ($event) => {
    if ($event && $event.length > 0) {
      $event[0]['isnew'] = true;
      this.planogramLibService.markRequestToPin($event, false);
      this.planogramStore.updateScenarioPlanograms(this.planogramStore.mappers);
      this.gridData = Object.assign({}, this.gridData);
      let list: Planograms[] = this.planogramStore.mappers;
      this.selectedPogChange(list[list.length - 1])
    }
  }
  private selectedPogChange(pog: Planograms): void {
    if (pog) {
      this.selectedPogObject = pog;
    }
  }

  public getPlanogramStatus = () => {
    let obs = this.saDashboardService.getPlanogramStatus()
      .subscribe((res: IApiResponse<PlanogramStatus[]>) => {
        this.planogramStatusList = res.Data;
      });
    this.subscriptions.add(obs);
  }

  private getLookUpRecords(): void {
    let lookUpHolder = [];
    let obs = this.saDashboardService.GetLookUpRecords()
      .subscribe((response: IApiResponse<LookUpRecords>) => {
        this.log.info('LookUpRecords: ', response);
        if (response) {
          Object.entries(response.Data).forEach(([key, value]) => {
            if (key === "CrunchMode") {
              value = this.crunchMode.reArrangeCrunhMode(value);
            }
            lookUpHolder[key] = value;
          })
          this.planogramStore.lookUpHolder = lookUpHolder as any;
          this.planogramService.generateAllOrientations();
          this.sharedService.iSHELF.settings.isReady_lookup = 1;
          this.sharedService.setLookupHolderData.next(true);
        }
      });
    this.subscriptions.add(obs);
  }

  private getAllSettingObjects() {

    // Initialize settings object
    this.planogramStore.appSettings = this.appSettingsSvc;
    this.defaultValueConfig();

    this.subscriptions.add(
      this.appSettingsService.getSettings()
        .subscribe((settings: ApplicationSettings) => {
          if (settings) {
            this.configureSettings(settings);
          }
        }));

    this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByName<PogExportOptions>(NAME_KEYS.PogExportOptions, GROUP_KEYS.POG)
        .subscribe((exportOptions: PogExportOptions) => {
          this.planogramStore.appSettings.PogExportOptions = exportOptions;
        }));

    this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByNameData(NAME_KEYS.SearchRegEx, GROUP_KEYS.POG)
        .subscribe((regEx: string) => this.localSearch.scanRegEx = regEx ? new RegExp(regEx) : null));

    this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByName<PropertyLookupItem[]>(NAME_KEYS.PogClassifierLookups, GROUP_KEYS.ABS)
        .subscribe((result: PropertyLookupItem[]) => {
          this.planogramStore.appSettings.POG_CLASSIFIER_LOOKUP = result?.length
            ? result.map(it => new PogClassifierLookupItem(it)) : [];
        }));

    this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByName<PropertyLookupItem[]>(NAME_KEYS.SectionConfigs, GROUP_KEYS.ABS)
        .subscribe((result: PropertyLookupItem[]) => {
          this.planogramStore.appSettings.SECTION_CONFIGURATION_LOOKUP = result?.length ? result : [];
        }));
       this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByName<PropertyLookupItem[]>(NAME_KEYS.FixtureTypeSupplements, GROUP_KEYS.ABS)
        .subscribe((result: PropertyLookupItem[]) => {
          this.planogramStore.appSettings.FIXTURE_TYPE_SUPPLEMENTS_LOOKUP = result?.length ? result : [];
        }));

    this.subscriptions.add(
      this.appSettingsService
        .getAppSettingsByName<FixtureTypeLookupItem[]>(NAME_KEYS.FixtureTypes, GROUP_KEYS.ABS)
        .subscribe((result: FixtureTypeLookupItem[]) => {
          this.planogramStore.appSettings.FIXTURE_TYPE_LOOKUP = result?.length ? result : [];
        }));
    this.subscriptions.add(
      this.appSettingsService.getAppSettingsByName<FloatingShelves[]>('FLOATING_SHELVES', 'POG')
        .subscribe((res: FloatingShelves[]) => {
          if (res) {
            this.shoppingCartService.floatingShelvesConfig = res;
            this.shoppingCartService.floatingShelvesConfig.enabled = true;
            this.subscriptions.add(
              this.appSettingsService.getAppSettingsByName<{ enabled: boolean }>('FLOATING_SHELF_ENABLED', 'POG')
                .subscribe((res: { enabled : boolean }) => {
                  this.shoppingCartService.floatingShelvesConfig.enabled = res?.enabled ? true : false;
                }));
          }
        }));
        this.subscriptions.add(
          this.appSettingsService.getAppSettingsByName<SortedGuidList[]>('HIGHLIGHT_USR_TEMPLATE_ORDER', 'POG')
            .subscribe((res: SortedGuidList[]) => {
              this.highLightService.highlightList = res.sort((a, b) => { return (Number(b.isDefault) - Number(a.isDefault)); });
          })
      );
  }

  private defaultValueConfig(): void {
    this.appSettingsSvc.isReadOnly = false;
    this.sharedService.isItemScanning = false;
  }

  private configureSettings(data: ApplicationSettings) {

    this.appSettingsSvc.allSettingsObj = data;
    this.appSettingsSvc.allowPegPartID = this.getAllAppsettings("USE_PEGPARTID", data.GetAllSettings.data);
    this.appSettingsSvc.loadPogFromChild = this.getAllAppsettings("LOAD_POG_FROM_CHILD", data.GetAllSettings.data);

    /*get pog settings starts*/
    this.appSettingsSvc.measurement = this.getAllAppsettings(SETTINGS.Measurement, data.GetAllSettings.data);

    this.appSettingsSvc.turnoff_tooltip = this.parentApp.isAssortApp ? false : this.getAllAppsettings(SETTINGS.IsTooltipOff, data.GetAllSettings.data);
    this.appSettingsSvc.turnOn_ShoppingCartToolTip = this.parentApp.isAssortApp ? false : this.getAllAppsettings(SETTINGS.IsShoppingCartToolTipOn, data.GetAllSettings.data);
    this.appSettingsSvc.maxPogCount = this.getAllAppsettings("MAX_POG_COUNT", data.GetAllSettings.data);
    this.appSettingsSvc.pogTabExpression = this.getAllAppsettings("POG_TAB_EXPRESSION", data.GetAllSettings.data);
    this.appSettingsSvc.autocalc = this.getAllAppsettings("AUTOCALC_CALCFIELDS", data.GetAllSettings.data);
    this.appSettingsSvc.highlightSysTemplate = JSON.parse(this.getAllAppsettings("HIGHLIGHT_SYS_TEMPLATE", data.GetAllSettings.data));
    this.appSettingsSvc.highlightUsrTemplate = JSON.parse(this.getAllAppsettings("HIGHLIGHT_USR_TEMPLATE", data.GetAllSettings.data));
    this.appSettingsSvc.CONSIDER_DISPLAY_VIEW_ONLY = this.getAllAppsettings('IS_CONSIDER_DISPLAY_VIEW', data.GetAllSettings.data);
    this.appSettingsSvc.renamePlanogramAllowed = this.getAllAppsettings('ALLOWED_POG_STATUS_FOR_RENAME_PLANOGRAM', data.GetAllSettings.data);
    this.appSettingsSvc.FITCHECKTOLERANCE = JSON.parse(this.getAllAppsettings("FITCHECKTOLERANCE", data.GetAllSettings.data));

    this.appSettingsSvc.asyncSaveToogleFlag = JSON.parse(this.getAllAppsettings("TURNON_ASYNC_SAVE", data.GetAllSettings.data));
    this.appSettingsSvc.asyncSavePogCap = JSON.parse(this.getAllAppsettings("ASYNC_SAVE_CAP", data.GetAllSettings.data));
    //Getting positoin lock dictionary
    this.appSettingsSvc.positionLockField = this.getAllAppsettings("POS_LOCK_IDDICTIONARY", data.GetAllSettings.data);
    this.appSettingsSvc.disableDeletedScItem = this.getAllAppsettings("DISABLE_DELETED_SCITEM", data.GetAllSettings.data);

    this.appSettingsSvc.autoSaveTimer = this.getAllAppsettings("AUTOSAVE_TIMER", data.GetAllSettings.data);
    this.appSettingsSvc.autoSavePromptFlag = this.toBoolean(this.getAllAppsettings("PROMPT_BEFORE_POGSAVE", data.GetAllSettings.data));
    this.appSettingsSvc.autoSaveEnableFlag = this.toBoolean(this.getAllAppsettings("AUTOSAVE_IS_ENABLE", data.GetAllSettings.data));
    this.appSettingsSvc.saveEnableFlag = this.toBoolean(this.getAllAppsettings("SAVE_IS_ENABLE", data.GetAllSettings.data));
    this.planogramService.setAutoSave.next(this.appSettingsSvc.autoSaveEnableFlag);

    const labelMode = this.toBoolean(this.getAllAppsettings("TURN_ON_LABEL", data.GetAllSettings.data));
    this.planogramCommonService.setLabelOn(labelMode);
    const annotationON = this.toBoolean(this.getAllAppsettings("TURN_ON_ANNOTATION", data.GetAllSettings.data));
    this.planogramService.annotationON = annotationON;
    this.appSettingsSvc.showLabelIfNoPackageImage = this.getAllAppsettings("SHOWLABEL_IF_NOPACKAGEIMAGE", data.GetAllSettings.data);

    this.appSettingsSvc.daysInMovement = this.getAllAppsettings("DAYS_IN_MOVEMENT", data.GetAllSettings.data);
    this.appSettingsSvc.localStorageIsEnable = this.toBoolean(this.getAllAppsettings("LOCAL_STOREAGE_IS_ENABLE", data.GetAllSettings.data));

    this.appSettingsSvc.backColor = this.getAllAppsettings("BACKCOLOR", data.GetAllSettings.data);

    const roundOff: number = this.getAllAppsettings("POG_ROUNDOFF", data.GetAllSettings.data);
    this.appSettingsSvc.roundoff = `n${roundOff}`;

    this.appSettingsSvc.defaultViewMode = this.getAllAppsettings("USER_DEFAULTS.POG.VIEW_MODE_DEFAULT", data.GetAllSettings.data);

    const statusConfigStr = JSON.parse(this.getAllAppsettings("STATUSBAR_SETTINGS", data.GetAllSettings.data));

    this.appSettingsSvc.statusBarConfig = statusConfigStr;
    this.appSettingsSvc.canValidatePeggable = this.getAllAppsettings("CAN_VALIDATE_PEGGABLE", data.GetAllSettings.data);
    this.appSettingsSvc.statusBarConfig['StandardShelf'] = [];
    this.appSettingsSvc.statusBarConfig['Pegboard'] = [];
    this.appSettingsSvc.statusBarConfig['CoffinCase'] = [];
    this.appSettingsSvc.statusBarConfig['BlockFixture'] = [];
    this.appSettingsSvc.statusBarConfig['Modular'] = [];
    this.appSettingsSvc.isStatusBarCustom = this.getAllAppsettings("STATUSBAR_ISCUSTOM", data.GetAllSettings.data);
    this.appSettingsSvc.computeTagetInventoryValues = this.getAllAppsettings("COMPUTE_TGT_INVENTORYVALUES", data.GetAllSettings.data);

    // TODO: @malu All chart 4 configs
    this.appSettingsSvc.chart1Config = this.getAllAppSettingsAsJson("CHART1_CONFIG", data);
    this.appSettingsSvc.chart2Config = this.getAllAppSettingsAsJson("CHART2_CONFIG", data);
    this.appSettingsSvc.catSchematicConfig = this.getAllAppSettingsAsJson("CATSCHEMATIC_CONFIG", data);
    this.appSettingsSvc.dynamicCharts = this.getAllAppSettingsAsJson("DYNAMIC_CHARTS", data);
    this.appSettingsSvc.analysisCharts = this.getAllAppSettingsAsJson("ANALYSIS_CHARTS", data);
    this.appSettingsSvc.showDynamicChart = this.getAllAppSettingsAsJson("SHOW_DYNAMIC_CHART", data);
    this.appSettingsSvc.findSelectAdv = this.getAllAppSettingsAsJson("FIND_SELECT_ADV", data);
    this.appSettingsSvc.highLightOpts = this.getAllAppSettingsAsJson("HIGHLIGHT_OPTIONS", data);
    this.appSettingsSvc.highLightOptPogTemplete = this.getAllAppsettings("HIGHLIGHT_POGLOAD_TEMPLATE", data.GetAllSettings.data);
    this.appSettingsSvc.logServiceLimit = this.getAllAppsettings("CLIENT_LOGSERVICE_ROW_LIMIT", data.GetAllSettings.data);
    this.appSettingsSvc.libPogMoreDetails = this.getAllAppSettingsAsJson("SEARCH_PROPERTY_DIALOG_DEF", data);
    this.appSettingsSvc.turnOnPegItemLabels = this.getAllAppsettings("TURN_ON_PEG_ITEM_LABELS", data.GetAllSettings.data);

    //Shelf width reducing limit on section width reducing
    this.appSettingsSvc.secWidReducnFixLimit = this.getAllAppsettings("SEC_WID_REDUCN_FIX_LIMIT", data.GetAllSettings.data);

    //Pegboard settings
    this.appSettingsSvc.peg_direction = this.getAllAppsettings("USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_DIRECTION", data.GetAllSettings.data);
    this.appSettingsSvc.horizontal_spacing = this.getAllAppsettings("USER_DEFAULTS.PEGBOARD_AUTO_INSERT.HORIZONTAL_SPACING", data.GetAllSettings.data);
    this.appSettingsSvc.vertical_spacing = this.getAllAppsettings("USER_DEFAULTS.PEGBOARD_AUTO_INSERT.VERTICAL_SPACING", data.GetAllSettings.data);
    this.appSettingsSvc.overhanging_items_beyond_edge = this.getAllAppsettings("USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_OVERHANG_EDGE", data.GetAllSettings.data);
    this.appSettingsSvc.propertygrid_default_view = this.getAllAppsettings("USER_DEFAULTS.POG.PROPERTYGRID_VIEW_SETTING", data.GetAllSettings.data);
    if (this.parentApp.isAllocateApp || this.parentApp.isAssortApp) {
      this.appSettingsSvc.dockToolbar = true;
      this.appSettingsSvc.dockStatusbar = true;
    } else {
      this.appSettingsSvc.dockToolbar = this.getAllAppsettings("DOCK_TOOLBAR", data.GetAllSettings.data);
      this.appSettingsSvc.dockStatusbar = this.getAllAppsettings("DOCK_STATUSBAR", data.GetAllSettings.data);
    }
    
    //Position Movement
    this.appSettingsSvc.StandardShelfPositionMovement = this.getAllAppsettings("USER_DEFAULTS.STANDARDSHELF.POSITION_MOVEMENT", data.GetAllSettings.data);
    this.appSettingsSvc.CoffinPositionMovement = this.getAllAppsettings("USER_DEFAULTS.COFFIN.POSITION_MOVEMENT", data.GetAllSettings.data);

    //set docktoolbar
    if (!this.appSettingsSvc.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }

    this.appSettingsSvc.default_pog_type = this.getAllAppsettings("DEFAULT_POG_TYPE", data.GetAllSettings.data);
    //parameter name will be changed to notAllowEditAssort.
    this.appSettingsSvc.AllowEditAssort = this.getAllAppsettings("NOT_ALLOW_EDIT_ASSORT", data.GetAllSettings.data);
    this.appSettingsSvc.AssortFeatureNoAllow = JSON.parse(this.getAllAppsettings("NOT_ALLOWED_ASSORT_ARRY", data.GetAllSettings.data));
    this.appSettingsSvc.skipStoreViewPreview = this.getAllAppsettings("SKIP_STOREVIEW_PREVIEW", data.GetAllSettings.data);
    this.appSettingsSvc.pegHelperURL = this.getAllAppsettings("PEG_HELPER_URL", data.GetAllSettings.data);
    this.appSettingsSvc.NICIFeatureNoAllow = JSON.parse(this.getAllAppsettings("NICI_FEATURE_NO_ALLOWED", data.GetAllSettings.data));
    this.appSettingsSvc.SHELFAUTOLOADPOG = this.getAllAppsettings("USER_DEFAULTS.POG.SHELF_AUTO_LOAD_POG", data.GetAllSettings.data);
    this.appSettingsSvc.shelfLabelOn = this.getAllAppsettings("TURN_ON_FIXT_LABEL", data.GetAllSettings.data);
    this.appSettingsSvc.maxPOGHierarchyNodes = this.getAllAppsettings("SHOW_MAX_POGHIER_NODE_LEVEL", data.GetAllSettings.data);
    this.sharedService.iSHELF.settings.isReady_planogramSetting++;
    this.sharedService.iSHELF.settings.isReady_allSettings = 1;
    if (!this.appSettingsSvc.SHELFAUTOLOADPOG) {
      this.appSettingsSvc.SHELFAUTOLOADPOG = this.parentApp.isShelfInAutoMode;
    }

    this.DictionaryRecord(); // Why is this called from here?

    this.appSettingsSvc.ProductAuthPattern = {
      "1": "data:image/png;base64,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",
      "2": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAMAAABrrFhUAAAAz1BMVEUAAADgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAbgQAZCLVRLAAAARHRSTlMABAgMEBIUFhgaHiAiJigqLjI2Oj5CRkpOUlZaXmJmam5ydnp+g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+zc7f+4AAA3nSURBVHja5V1rX+I6E0+LcjiIyl2RIsgBlYuAK3QRsNCS7/+Znhe7v/WymSSlmUnxmdfKJNMkM/OfG2MWKJOv1Dyv2/tDXc+rVfIZ9t3ptNLqP803EQco2syf+q3K6TfceqbUHvg7rkk7f9AufZ/zcO4Nl3sem/bLoXd+9JvP304CnoCCyW3+aDfv1gZrboDWg5p7hJe+OQm5MQonzaN6EtzGLOKGKZo1juUclEchR6FwVE7/7rN3K45Iq7tsqrdfGkccmaJxMbXbv15wElpcp/Lh89acjNaek7btdwJOSkEnTTrBaRNvn3POg3ZqTgHl4f90EZqp2H51ya3Rsmp9+4UZt0rTgt23rx9xyxT1Lb6G9Q1PAW3qtqzeyaHvtz8b9Tpeo1qtlvL5YrVabXid3mjmvx34gxMr9rG3jb3QnT/sXJ1LtJdzftUZ6kNnf2jr0X/+mI9ftHhoaL9XhcbDIubjMiU+BFdxPn/00i3HNlqccvcljhC2V5SP/zAOoFU/+Jl263FAtSGZOrh81V3Tay+x71rs6XO7JHr9NAGft3tDnnvxXlM9hBRvoaN3/KOJUe1cn+i9B0N0Bynna338bs44467WMfBzuPsv6fi9fgPlOzgNHeEHJcz932hc/2dED636rPEQ3ODx76rZz5Ahy6KGAda19/zNS/ivcGlu6SnMTJXwRI1GD9eUEMwUIZCWUWHeQYsMo3Naqrd4YVwCuZ+KaP7jCaUvcvK4p1WHOUXAyycP1xQVOnGVI9x/2LGAUDudkEwCiv3Pz+xAUmdzIgnI9x/dWQtQOHcRhQQy0vdvZTVYW5R+G9+ILpDrv7Hl1JXMGFsbOlPbDngSeGKa/HrK7N9NKnIVirLoxBDT/5mnJF0lO8fzjG6soi/a13QkWWYi77gkuV93LEV0J3mnEnioOdjn2DdYqqgB+wbBweaAA5vbYYWljCrwYfUPvauwAgjMZCxe3nR7ve6NGTi/HJhWBR68/wsTCx79WXFgJAX0ApbAQebKZYi5/8oX1TWvYEogPOCQua+I+xcZsAaMalgCr665B8DA/i+EIc/1BaIEYj8DVxhqVfFgG1AtZfDexoyeZ6H4/76Ctn8jEqhA9sA2nt0OuoDJ7Z8zCaIbJMeWGqBjaEQDJrd/HSm88jO5f3FnQBeCF2CUXFf15GBuLzmHUfJLAOW/zZN/n4ICz98nz/x0IO94ovsLdQj/MOD/K2ObMwP4AISQaOZsuMD/hwbwn6I6tmuCC6BnNnrmUN+kQa15P82+M+Aj3te6pQDWPjaB4Wpk+kQmcGYAK450XhjABFiZWFdTJ83HRBlEZnWwMVAFZGcEANZKr56Y4FQEtI06f2eJiQBqlRYFmCjh8sBDOjeCABf08h2NFIFA1oDigjni3NzQTPz3Wk8AZuoiz8S6cC3/lG3xkjro4DUC4N4R/3pbagMFZmHVLzTQE8CjGW4AqB24sYW2NxUCHOsJYGyIHaAJOrEPgKEvQi4A9hj3CIgtyODkWAVwEsS06cUqoMWOVQCsJVYE8bTU0jleATjLWHpWnAtjMP+VXACsJs6cEf9xSWwDsmMWAJvHwBzEyysdtwBK+hyyERJC9U73egLom+QpxOCirLadajQNqqcngJ5JnkVta1sIITyzYxcAE1bZrP7+u/KB+EEcutUTwK1RpmKEp6wHV/pGlyJJuTCOvn4gXwt6dUOcSOAnaugJgILrztX5qzfDmYBVPQEYrrtz3nSkPKOoP6voCcB0z7iuhn4XAvaR6TLUvJ4ATDfRzEXq8EMTDZ/+SP/oCeAf03ynanR0miCWGIP0BGCcbV35eYU64M34QphWe5Sdeb6iZzB0VV5j3/xCtPoObczzvVf5+QN0N0CGOOh568YdgoECC3s1vw72Q0cAPxAYv8qRsTy+SxIDEBgjMO7J1e0t0Q3QAwTuGdEdeHe6JnGg0ySkFRtDKUVZSxVhoHgiaN1BlFK8gSwOf44MBsf0hlB6kAhtoXPJd4lQ+lJd6ggApR+UG0nOmigz/gVjFexURwA4EzZeJDn0SwJP+DdpTJrY43DuwvkymT2BT65vC29wOIswz70Lxg4ipKpQdQsco6Goj7hQBEZ92jT2OGhxfKEnJNYLMF1GpCIfkFbxYMcQhFgPQNgYqzC2rRZAG4l1A4T9d1ipegLSSJTDGh5QgLCXUxpQRuKU4Dth4Ic+BbBqH2sRJ2oBoHWkEl31ChPn0QwZ5WegOXxCg7fFxPURHbRVKBvBLdFYdwDc8yl5mWUMoqgZAugKMDrmEj/RgiHwgMb6HDA7ReY5XnuUti0zgDEXcDwikpCIFJjADUfJgK+IsQylFtSomUAcmSHSgxkhJI73EAkP3JdPQvoA54V20AhxFYpW6a+IrEdCS6hGFBPR1IOYh68nxH49UjtIGRu5R2TdEeKiHhUy/5tu5AJA7IsNbLVLiAZAABxSarIOItAVXgzMAVYZuQAwx2RUhc8dtQCYtAvoin1/AcxsKYEYAkDtlNmjy5PWeH56QrWEOu362gYgyBgT54GITwCqAAqWPIE4AsAdk7CzgYfBV4D8ERTGaVFj0inTAjJQ6OH/QgDXlt5AQADUpjBj/8IC+BeVsdgUpnaGmDhzFxuKg50haneYSWLkE1y+YneYGhBhYG8LdMGLARFqSIxJIqTIzerFkBg1KCoxhXbIbMWgKDEsLnMIseUuhsVFOHWAvJJbiorRv0kcGCEOjcn8IeQx4g4QGqMNjv4icWNlZKZQcJQ2PP6LhP1tHpGZQuHxPr1CFhdpYQ/rgxIkaFNkfl9HQd/eLfbIEihFpmJBD4pskhE2TyhJ6tSCSSLyTKvYPKE0OdJESdgjfMPmCCZKkqbKwo5JD5sjnCo7IMemGGO5L0UK+xw2RzhZmjJd/p2eaJLk3wlOl6csmAB9YvSxbZKCCcqSGQgXmqCzk5TMUBZNAa/yHl3ryIqmCMvmoCOAfwCkZXN0hZOf6H2W9xR/bqe0cPKcOGPz/RY0/+v1/msWCFhJS2fpiqftkbR4mq583h7Jy+fJGihYI0UDBbIWGtZI0UKDrImKNVopLvngm98BZRudGnXaLjEpGylRtdKyRcpWWuKIdf277F/dTI2onZ4tEn7ez+30aBoqWiKdhoo0LTUtkU5LTZqmqnZIr6kqSVtdO6TXVpeksbId0musTNJa2wrpttamaK5uhXSbq1O010+NGyBs2UcwYMEG6Q9YIBix8VXztH5sOd/+aCECsOIqvVGMv52jrc37A0UGeMnJcYas4I/Z+WSefDpwIySTK9aYHfxBSx9pSJGUE3PQEvqoLZl5hmJ0xhy1hT5s7cOn+UvWa4SDFnvYGva4PeltQyiXAcbtSUSNPHARfAFwXoH4AxexR25KHRTjjtchIzeRh66+00act2yUOofkpOOO3SUVwGFjd3EHL1MK4MDBy8ijtwkFcOjobaj9t2FNgC6Aw4eviwfOcL7KHJMAMkCjjqnG/xaAZlfjYxIAMMoi0srG6QNVfd7xCACaY6A3OMcFGoCHxWMRQFGsAflGE3mBev5tsschgOwmaa9CqLrZnDWAKQDIAogR7M1ugZ8wVtayQuyhNAIWv80mf0SM2UPPeCEIcJJNM86vgO2eDAE3XbRQNDjWcxrvHYEuwb5iZJn5vwy1vZnmRZW9gQvAmLjM8pcyNFNJMMaxs8ohtO7YxbBD6JeCCyOq6kvQ/s2Iir0IoFXHT312X3ElUPr0rcIS7v5fDwg+XYa4Erj4oApXF7j7Dw8a3gQPBjMjAbfz+xq8dVzc/cfTgBrPAA8M1VSV271e29Rvwfs/FHAGYFXOOQ/NaEODVAFvbAJQOwcLdZ+y/KkGPMQrSJDuWILFijMX0bj9m1TByNogj1KTReiMJMtM2Kq5K/npeTYd+8/KJpgldjGGkh/fpCKFqigbYZc84uhMJT8fevb370neKT41cE0z0nHR44zd7Weko4wXRlaX8WU8VlavQVHaqNs39HVyUi77O2vawLmTjvBcGat3kEuAz8/s7P9MPr9yZbDeQyGBsOPY+Pwh2f6VEuA++UtQ9Dnh/hnLKfjtH08ot3/yqBjg6xuvd5JrQ8550CK7B04rUCxmgaCdM1MFU76s0ey/ppzZh9OSwhmq+PJ5CX/7JfXs4iHWWewqWfMZ8mtYnKnXgFjtdxOq2T8j1hlVn9X8wxvU8xeoV8D9BsoRdBo/NZgHyLdQpQ5/47xd41oo133T4eyjl/tqPIWccx5Njdae16d7LbZDClXshVpr4W/3hh7E4v2bHsewyUjo8pVr0ms/sQyKfX1ul4yI3CHXpvWgfnDcx60P1vqchi6jo6ut/sJ49NItx76bTrn7EsVgsr1ipJSd8lgULR4a2j3DCo2HRRTv96f0CLW35XFp5w87V+eSw+CeX3WGfhj7h7dNZoGyE34YBf5s1Ot4jWq1WsrnS9VqteF1eqOZHxz4gxNbAYr6hqeANha73bj9yPb2o77LbFJhanf/0wKzTdWlve0v09Hhorm2s/11k6WEnHZAv/2gnaYmP26HWARBx2XpIscjvAhrL5Utnq4XNNtfXLO0UnGEbhdE43Q3tsnerTC3v7rLstRTebTD2f1uVGbHQW5jZvwqRLOGy46IMs1JaG734aSZYUdHbm1gRDOuBzWXHSvlbyeJLKRgcptnx07n3nC5j7/3/XLonbPvQm6pPfC1lcPOH7RLLvt+dFpp9Z/mG1BDRJv5U79VOWXfnTL5Ss3zur0/1PW8WiVv5aH/HyUvJqtDte15AAAAAElFTkSuQmCC",
      "3": "data:image/png;base64,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",
      "4": "data:image/png;base64,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",
    };
    this.appSettingsSvc.pog_profile_applicable = false;

    // Performance manual template
    this.appSettingsSvc.manualPerfTemplate = JSON.parse(this.getAllAppsettings("PERF_MANUAL_TEMPLATE", data.GetAllSettings.data));
    this.appSettingsSvc.isLogAllocations = false;
    this.appSettingsSvc.readOnlyfieldsInAssort = [222, 223, 224, 220, 628, 613, 327, 349, 350, 351, 352, 322, 323, 324, 337, 338, 339, 325];
    this.appSettingsSvc.isProjectProductSearchEnable = this.getAllAppsettings('IS_PROJECT_PRODUCT_SEARCH', data.GetAllSettings.data);
    //Anchoring Falg values
    let anchorSetting: AnchorSettings = JSON.parse(this.getAllAppsettings("ANCHORING_FLAG", data.GetAllSettings.data));
    this.appSettingsSvc.Anchor_settings = anchorSetting;
    this.pogSideNavStateService.setDefaultSideNavProperties(anchorSetting);
    //default unitcapping when user selects merchstyle as Advanced Tray.
    this.appSettingsSvc.defaultUnitCappingForAdvancedTray = this.getAllAppsettings("ADVANCEDTRAY_DEFAULTCAPPING", data.GetAllSettings.data);
    this.appSettingsSvc.isWeightCapacityValidationEnable = this.getAllAppsettings("IsWeightCapacityValidationEnabled", data.GetAllSettings.data);

    // Tooltip delay setting
    const tooltipDelayTime = this.getAllAppsettings("TOOLTIP_DELAY_TIME", data.GetAllSettings.data);
    this.sharedService.tooltipDelayTime = Utils.isNullOrEmpty(tooltipDelayTime) ? 1000 : tooltipDelayTime as number;

    // Notch thickness settings
    this.appSettingsSvc.notchThicknessCalculation = this.getAllAppSettingsAsJson("NotchThicknessCalculation", data);

    // display units within tray/case settings
    this.appSettingsSvc.DisplayUnitsForTrayAndCase = this.getAllAppsettings('DisplayUnitsForTrayAndCase', data.GetAllSettings.data);
    this.appSettingsSvc.CutCaseMarginOfError = this.getAllAppsettings('CutCaseMarginOfError', data.GetAllSettings.data);
    this.appSettingsSvc.DisplayGapForExtraSpaceInTrayAndCase = this.getAllAppsettings('DisplayGapForExtraSpaceInTrayAndCase', data.GetAllSettings.data);

    // save object in store
    this.planogramStore.appSettings = this.appSettingsSvc;
    this.userPermissions.init();

  }

  private getAllAppSettingsAsJson(keyWord: string, data: ApplicationSettings): any { // TODO: type safety
    return JSON.parse(this.getAllAppsettings(keyWord, data.GetAllSettings.data))
  }

  private toBoolean(value: string | boolean): boolean {
    return value == true || value.toString().toLocaleLowerCase() == 'true';
  }

  public getAllAppsettings<T>(entity: string, data: AllSettings[]): T {
    const result = data.find((val) => val.KeyName === entity);
    if (result) {
      // uncomment this line to see the value in console
      // this.log.info(`${entity} = ${result.KeyValue}, type: ${typeof result.KeyValue}`);
      return result.KeyValue as unknown as T;
    }

    // Value not found in data, trying to get default value.
    const defaultValue = this.appSettingsService.getDefaultAppSettingsValue(entity)

    if (defaultValue == null) { // default value can be 0 or -1. hence checked for null.
      this.log.warning(`Settings not found and no predefined default value for settings: '${entity}'. Will use 'null' as fallback.`);
    } else {
      this.log.warning(`Unable to find settings: '${entity}', using predefined defaul value: ${JSON.stringify(defaultValue)}`);
    }

    return defaultValue as unknown as T;
  }

  public DictionaryRecord(): void {
    this.subscriptions.add(
      this.dictConfigService.getAllDictionaryData()
        .subscribe((data: AllDictionaryData) => {
          if (data) {
            this.setupPegLibrary();
            this.setupRequireDataForPlanogram();
            this.log.info('Dictionary Records initialized')
          }
        }));
  }

  private setupPegLibrary() {
    this.pegLibraryService.updatePegLibrary();
  }

  private setupRequireDataForPlanogram(): void {
    if (this.parentApp.isAssortApp && !this.parentApp.isAssortAppInIAssortNiciMode) {
      this.subscriptions.add(
        this.assortService.getShelfScenarioID(this.planogramStore.scenarioId)
          .subscribe((shelfScenarioID) => {
            this.planogramStore.assortResetScenarioId = this.planogramStore.scenarioId;
            this.planogramStore.scenarioId = +shelfScenarioID; //convert to number
            this.getAllPlanogramApis();
          }));
    } else {
      this.getAllPlanogramApis();
    }

    this.dictConfigService.setupCalculatedField();

    const positionLockIddictionary = [{
      IDDictionary: this.appSettingsSvc.positionLockField
    }];
    this.appSettingsSvc.positionLockField = Utils.makeCalculatedFieldFromDict(
      this.dictConfigService.dictionaryConfigCollection(positionLockIddictionary as Dictionary[])[0], true);
    this.pogProfileSetting();
    this.propertyGridService.makePropConfig();
    this.workSheetGridConfigurationService.makeConfigWithDict();
  }

  private getAllPlanogramApis(): void {
    this.subscriptions.add(
      this.saDashboardService.getAllPlanogramApis()
        .subscribe((response: AllPlanogramResponse) => {
          if (response) {
            this.planogramStore.allPlanogramApisData = response;
            this.gridData = response;
            // TODO: @malu - can the mapper be assigned from here as below?
            // this.planogramStore.mappers = response.planogramScenariosPogs.Planograms;
          }
        }));
  }

  private pogProfileSetting(): void {
    try {
      this.shoppingCartService.loadAdditionalColumns();
      this.planogramCommonService.obtainShelfLabelParams(this.appSettingsSvc.allSettingsObj.GetAllSettings.data);
      this.appSettingsSvc.newproductintro = this.planogramCommonService.getSettingsForKey("ADDNPI_ON_ITEMSCAN", this.appSettingsSvc.allSettingsObj.GetAllSettings.data, true);
      this.appSettingsSvc.fixtCallOutOff = this.planogramCommonService.getSettingsForKey("TURN_OFF_FIXT_CALLOUT", this.appSettingsSvc.allSettingsObj.GetAllSettings.data);
      this.appSettingsSvc.posCallOutOff = this.planogramCommonService.getSettingsForKey("TURN_OFF_POS_CALLOUT", this.appSettingsSvc.allSettingsObj.GetAllSettings.data);
      let fObj = this.appSettingsSvc.allSettingsObj.GetAllSettings.data.filter((pObj, pKey) => {
        if (pObj.KeyName == "POG_PROFILE_APPLICABLE") {
          return pObj;
        }
      });
      this.appSettingsSvc.pog_profile_applicable = fObj[0].SelectedValue.value
      // POG profile signature fields preparation
      if (this.appSettingsSvc.pog_profile_applicable) {
        const pogProfileSignature = JSON.stringify(this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data);
        if (pogProfileSignature != '{}' && this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data != null && this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data != undefined) {
          this.sharedService.pog_profile_signature_header_settings.IsUDP = this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data.IsUDP;
          this.sharedService.pog_profile_signature_header_settings.Length = this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data.Length;
          this.sharedService.pog_profile_signature_header_settings.ValueSeperator = this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data.ValueSeperator;

          let obj = this.appSettingsSvc.allSettingsObj.GetPogProfSignature.data.PogProfSignatureDtl;
          if (obj === undefined) {
            this.sharedService.pog_profile_signature_detail_settings = obj
          };
          this.sharedService.pog_profile_signature_detail_settings = obj.sort((a, b) => {
            return a.StackOrder - b.StackOrder;
          });
          this.pogQualifierConfigurationService.makePOGQualifierFields(this.sharedService.pog_profile_signature_detail_settings);
        } else {
          this.log.warning('Pog signature data is null.');
        }
      }
    } catch (e) {
      this.log.warning('Failed to load POG profile settings from appsettings.');
    }
  }

  public updatePogChanges = () => {
    this.gridData[`PlanogramScenariosPogs_GetPlanogramScenariosPogs`].data.Planograms = this.planogramStore.mappers;
  }

  ngOnDestroy() {
    this.dialog?.closeAll();
    this.checkIfAnyPlanogramCheckedOut();
    this.planogramLibService.gridFilter = { filters: [], logic: 'or' }
    this.sharedService.isWorkSpaceActive = false;
    this.subscriptions.unsubscribe();
    window.removeEventListener("unload", this.useFetchToCheckInPogs.bind(this));
  }

  public rowChangeForWebview() {
    if (this.parentApp.isWebViewApp) {
      window.invokePogInShelf = (IdPog, IdStore) => {
        if (IdPog != this.parentApp.pogId || IdStore != this.parentApp.idStore) {
          this.sharedService.unloadplanogramForWebView.next(true);
          this.parentApp.setPogId(IdPog);
          this.parentApp.setIdStore(IdStore);
          this.subscriptions.add(
            this.planogramLibApiService.getPOGInfo([IdPog])
              .subscribe((result: any) => {
                result.Planograms = result.Data;
                this.planogramStore.mappers = [];
                this.planogramLibService.mapper = [];
                this.planogramLibService.markRequestToPin(result.Planograms, false);
                let planogramList: Planograms[] = this.planogramStore.mappers;
                this.planogramLibService.mapperForVmode = cloneDeep(this.planogramLibService.mapper);
                this.gridData = Object.assign({}, this.gridData);
                this.selectedPogObject = Object.assign({}, planogramList[0]);
                this.cd.detectChanges();
                this.sharedService.unloadplanogramForWebView.next(false);
              }));;
        }
      };
    }
  }
  public mouseout() {
    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }
  }

  private checkIfAnyPlanogramIsDirty() {
    for (const planogramMapperValue of this.planogramLibService.mapper) {
      if (this.planogramService.checkIfObjectDirty(planogramMapperValue)) {
        return true;
      }
    };
  }

  private checkIfAnyPlanogramCheckedOut(): void {
    let checkedOutPogs = this.planogramLibService.mapper.filter(m => m.checkedoutManually);
    if (checkedOutPogs?.length) {
      this.planogramService.markRequestToCheckIn(checkedOutPogs);
    }
  }

  private useFetchToCheckInPogs(): void {
    let checkedOutPogs = this.planogramLibService.mapper.filter(m => m.checkedoutManually);
    if (checkedOutPogs?.length) {
      let preparePostObject = this.planogramService.makePreparePostData(checkedOutPogs, 'CheckIn', '');
      this.planogramService.useFetchKeepAliveToCheckInPogs(preparePostObject)
    }
  }

}
