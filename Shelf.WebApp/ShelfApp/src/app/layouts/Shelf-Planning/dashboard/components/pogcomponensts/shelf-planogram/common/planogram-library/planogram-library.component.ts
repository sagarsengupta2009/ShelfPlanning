import {
  AfterViewInit, Component, EventEmitter, Input, NgZone, OnChanges, OnDestroy,
  OnInit, Output, SimpleChanges, ViewChild, ViewEncapsulation, ChangeDetectorRef
} from '@angular/core';
import { uniqBy, cloneDeep, difference } from 'lodash-es';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog } from '@angular/material/dialog';
import { process } from '@progress/kendo-data-query';
import {
  HierarchyComponent, PromoteDemoteComponent, MultipleCloneComponent,
  ClonePlanogramComponent, ShowPogMoreInfoComponent, ImportTemplateComponent
} from '../../childcomponents';
import { SearchSettingComponent } from 'src/app/shared/components/search-setting/search-setting.component';
import { ConfirmationDialogComponent } from 'src/app/shared/components/dialogues/confirmation-dialog/confirmation-dialog.component';
import { SyncAuthCodeWithVM } from 'src/app/shared/classes/sync-auth-code-with-vm';
import { AppConstantSpace } from 'src/app/shared/constants';
import { BatchPrintComponent } from '../../childcomponents/print';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import {
  AzureSearchPogs, ExportOptions, GetSuggestPogs, SectionResponse, Planograms, ProductAuth,
  POGLibraryListItem, ScenarioStatusCode, NonEdiatbleScenarioStatuses,
  AllPlanogramResponse, SearchTypeName, Menu, Pinned, MenuItemSummary
} from 'src/app/shared/models';
import { Section } from 'src/app/shared/classes';
import {
  SharedService, PlanogramService, AgGridHelperService,
  AllocateService, PanelService, ParentApplicationService,
  HistoryService, PlanogramLoaderService,
  PlanogramLibraryService, Planogram_2DService,
  IntersectionChooserHandlerService, SearchSettingService,
  BlockHelperService, PlanogramCommonService, LanguageService,
  NotifyService, PlanogramStoreService, PlanogramLibraryApiService,
  PogSideNavStateService, SelectedScenarioService,
  UserPermissionsService,
  PaBroadcasterService, ShoppingCartService, ConfigService, PlanogramSaveService, PlanogramInfoService, AnnotationService
} from 'src/app/shared/services';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { RowNode } from 'ag-grid-community';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';
import { PogMaxCountDialogComponent } from './planogram-maxcount-dialog-component'
import { Router } from '@angular/router';

declare const window;

@Component({
  selector: 'shelf-planogram-library',
  templateUrl: './planogram-library.component.html',
  styleUrls: ['./planogram-library.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class PlanogramLibraryComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {

  @Input() gridData: AllPlanogramResponse; // TODO @karthik rename this to planogramAPI. This does not represent grid data.
  @Input() exportoptions: ExportOptions;
  @Input() planogramStatusList: { IDPOGStatus: number; IsPriorityReportRequired: boolean; }[];

  @Output() updateState: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() selectedPogChange: EventEmitter<object> = new EventEmitter<object>();

  public gridConfig: GridConfig;
  public searchPlanogramGridConfig: GridConfig;
  public pogList: POGLibraryListItem[] = [];
  private selectedRows: number[] = [];
  public selectedPlanograms: POGLibraryListItem[] = [];
  public data: Planograms[];
  public showHierarchy: boolean = false;
  public lastRowIndex: number;
  public pogLibHeaderMenu2ShowHide = {
    isSearchFocus: false,
    displayedPlanogramsOnSearch: false,
    showHierarchyIcon: true,
    isPinned: false,
    exportoptions: {},
    failedPogCount: false,
    ischecked: true,
    isLoaded: false,
    selectedPogs: [],
    poghierarchy: [],
    multipleClone: true
  }

  public searchText: string;
  public selectedSearchplanogram: Planograms[] = [];
  public displayedPlanogramsOnSearch: Planograms[] = [];
  public planogram = {
    id: 'planogram',
    searchType: 'Planogram',
    selectedField: '',
    isAzSearch: true,
    selectedType: '*'
  };

  private subscriptions: Subscription = new Subscription();
  private scenarioStatus: number;
  private failedIdPogs: Planograms[] = [];
  private pogRowsSelected: Planograms[] = [];
  private lastSearchText: string = '';
  private selectedSearchRows: POGLibraryListItem[] = [];
  private filteredPogs: Planograms[];
  private tempSection: Section;
  private removeSelectionOnActionIcon = { IDPOG: -1, isClickOnActionIcon: false }
  private pageNumber: number = 1;
  private showMoreClicked: boolean = false;

  @ViewChild(`planogramLibgrid`) planogramLibgrid: AgGridComponent;
  @ViewChild(`searchPlanogramGrid`) searchPlanogramGrid: AgGridComponent;
  @ViewChild(`hieraryGrid`) hieraryGrid: HierarchyComponent;

  public get canShow(): boolean {
    return this.language.isReady
      && !this.parentApp.isAllocateApp
      && !this.parentApp.isWebViewApp
      && !this.parentApp.isShelfInAutoMode;
  }

  constructor(
    private readonly sharedService: SharedService,
    private readonly panelService: PanelService,
    private readonly notify: NotifyService,
    private readonly zone: NgZone,
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramService: PlanogramService,
    private readonly translate: TranslateService,
    private readonly language: LanguageService,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly parentApp: ParentApplicationService,
    private readonly historyService: HistoryService,
    private readonly intersectionChooserHandler: IntersectionChooserHandlerService,
    private readonly planogramLibService: PlanogramLibraryService,
    private readonly dialog: MatDialog,
    private readonly blockHelperService: BlockHelperService,
    private readonly allocateService: AllocateService,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly planogram2DService: Planogram_2DService,
    private readonly cd: ChangeDetectorRef,
    private readonly searchSetting: SearchSettingService,
    private readonly log: ConsoleLogService,
    private readonly PogSideNavStateService: PogSideNavStateService,
    private readonly planogramLibApiService: PlanogramLibraryApiService,
    private readonly localStorage: LocalStorageService,
    private readonly planogramLoaderService: PlanogramLoaderService,
    private readonly selectedScenarioService: SelectedScenarioService,
    private readonly userPermissions: UserPermissionsService,
    private readonly paBroadcaster: PaBroadcasterService,
    private readonly agGridStoreService: AgGridStoreService,
    private readonly shoppingCartService: ShoppingCartService,
    private readonly config: ConfigService,
    private readonly planogramSaveService: PlanogramSaveService,
    private readonly planogramInfoService: PlanogramInfoService,
    private readonly notifyService: NotifyService,
    private readonly router: Router,
    private readonly annotationService: AnnotationService,
  ) { }

  public ngOnChanges(changes: SimpleChanges): void {
    this.pogLibHeaderMenu2ShowHide.isPinned = this.localStorage.getBoolean(AppConstantSpace.PLANOGRAM_LIBRARY_PIN_STATUS);

    if (!this.planogramLibService.mapper.length && this.selectedScenarioService.scenarioPogDataLoaded) {
      this.getPlanogramList();
    } else {
      this.selectedRows = this.planogramLibService.savedSelection;
      this.pogList = this.planogramLibService.mapper;
      this.bindPlanogramLibGrid(this.pogList);
      this.cd.detectChanges();
      if (this.planogramLibgrid) {
        setTimeout(() => {
          this.onRowSelected();
          this.cd.detectChanges();
        })
      }
    }
    this.pogLibHeaderMenu2ShowHide.exportoptions = this.exportoptions;
  }

  public ngOnInit(): void {
    this.sharedService.editPlanogramTemplate.next(false);
    this.PogSideNavStateService.showSideNavigation.next(true);

    this.sharedService.isShelfLoaded = true;
    if (this.parentApp.isAllocateApp || this.parentApp.isAssortApp) {
      this.subscriptions.add(this.planogramService.PAPogsUpdate.subscribe((pogs) => {
        if (pogs != null) {
          this.loadNewPogs();
        }
      }));

      /** only in assort RESET projects, sidebar needs to have scenario name from response.  */
      if (this.parentApp.isAssortAppInAutoMode) {
        this.selectedScenarioService.selectedScenarioNameChangeEvent.next(this.gridData.planogramScenariosPogs.ScenarioName);
      }
    }

    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }
    const clonePermission = this.userPermissions.getPermissions('POGCLONE');
    this.pogLibHeaderMenu2ShowHide.multipleClone = !(clonePermission?.Read || clonePermission?.Create);
    this.scenarioStatus = this.planogramStore.scenariosPogs?.Status;
    this.updateIconVisible(this.pogList);
    this.subscriptions.add(this.planogramService.unloadPlanograms.subscribe((pogs) => {
      if(pogs){
          this.requestToUnloadMultiple(pogs);
          this.planogramLibService.updatePlanogramList.next(true);
      }
    }));
  }

  ngAfterViewInit(): void {
    this.bindSearchEvent();

    this.subscriptions.add(this.planogramService.pogChangesInLibrary.subscribe((res) => {
      if (res === 'saveAppendSectionData' || res === 'updateFromMaxCount') {
        this.pogList = this.planogramLibService.mapper;
        this.bindPlanogramLibGrid(this.pogList);
      }
    }));

    if (this.planogramLibgrid && this.planogramStore.activeSelectedPog.IDPOG) {
      this.cd.detectChanges();
    }
  }
  private isReadonlyPlanogram(currentStatus: ScenarioStatusCode): boolean {
    return NonEdiatbleScenarioStatuses.includes(currentStatus)
  }
  public addPogToScenarioFromHierarchy(dataItem: { IDPOG: number; }): void {
    if (dataItem) {
      const exists = this.pogList.some(item => item.IDPOG === dataItem.IDPOG);

      if (exists)
        return;

      const selectedPogData = [{
        IDPOG: dataItem.IDPOG,
        IDPOGScenario: this.planogramStore.scenarioId,
        IDProject: this.planogramStore.projectId,
        IDPOGStatus: '2'
      }];

      const postObj = { IsPinning: true, Comments: "", data: selectedPogData }
      const subscription = this.planogramLibApiService.pogPinningUnpinning(postObj).subscribe(res => {
        if (res && res.Log.Summary.Error > 0) {
          this.notify.error(res.Log.Details[0].Message);
        } else {
          const idsQueryString = res.Data.map(it => it.IDPOG).join('&ids=');
          const subscription = this.planogramLibApiService.getPlanogramsInfo(idsQueryString).subscribe((result) => {
            this.planogramLibService.markRequestToPin(result.Data, false);
            // Change not detected in child component(HierarchyComponent) when array is mutated, hence creating new array
            this.pogList = [...this.planogramLibService.mapper];
            this.notify.success('PLANOGRAM_ADDED_TO_SCENARIO');
          })
          this.subscriptions.add(subscription);
        }
      })
      this.subscriptions.add(subscription);
    }
  }

  private getPlanogramList(): void {
    if (Object.keys(this.gridData || {}).length) {
      const scenarioPogs = this.planogramStore.scenariosPogs
      if (scenarioPogs) {
        this.scenarioStatus = scenarioPogs.Status
        this.selectedScenarioService.setSelectedScenarioName(scenarioPogs.ScenarioName);
      }

      if (this.parentApp.isAllocateApp
        || this.parentApp.isAssortAppInIAssortNiciMode
        || this.parentApp.isWebViewApp
        || (this.parentApp.isAssortApp && this.planogramStore.loadPogId)
        || this.parentApp.isShelfInAutoMode
      ) {
        this.loadNewPogs();
      } else if(scenarioPogs.Planograms) { //If the Planograms list is null, it redirects to the scenario screen.
        this.nowProcessData(scenarioPogs.Planograms);
      } else{
        this.router.navigate(['sp']);
      }
      this.selectedScenarioService.scenarioPogDataLoaded = false;
    }
  }

  private getSearchData(): void {
    this.onDisplayHeaderClick();

    const keys = this.searchSetting.getSearchSettingsNames(SearchTypeName.PLANOGRAM);
    const mode = this.searchSetting.getSearchSetting<'Enterprise' | 'DB'>(keys.ModeKey);
    const field = this.searchSetting.getSearchSetting<string>(keys.FieldKey);

    this.planogram.isAzSearch = mode === 'Enterprise';
    this.planogram.selectedType = field;

    if (field === '*') {
      this.planogram.selectedField = this.translate.instant('PLANOGRAM_LIBRARY_SEARCH');
    } else {
      const fieldDesc = this.translate.instant(this.searchSetting.getFieldDescription(SearchTypeName.PLANOGRAM, field));
      this.planogram.selectedField = `${this.translate.instant('SEARCH_BY')} <${fieldDesc}>`;
    }
  }

  private loadNewPogs(): void {
    switch (true) {
      case this.parentApp.isAssortApp:
        this.planogramLibApiService.getPlanogramsInfo(this.planogramStore.loadPogId.toString()).subscribe((result) => {
          if (this.planogramStore.readOnlyMode) {
            result.Data.forEach(pog => {
              pog.IsReadOnly = true;
            });
          }
          this.nowProcessData(result.Data);
        });
        break;
      case this.parentApp.isWebViewApp:
      case this.parentApp.isShelfInAutoMode:
        const pogId = this.parentApp.pogId
        if (pogId) {
          this.planogramLibApiService.getPOGInfo([pogId]).subscribe(result => {
            this.nowProcessData(result.Data);
          });
        }
        break;
      default:
        this.allocateService.getAllPAPlanograms().subscribe((planograms) => {
          if (planograms.length < 1) {
            window.parent.showNoPlanogramMsg("NP");
            return;
          }
          this.nowProcessData(planograms);
        })
        break;
    }
  }

  private updateIconVisible(planograms: Planograms[]): void {
    switch (this.scenarioStatus) {
      case ScenarioStatusCode.SUBMITTED_FOR_APPROVAL:
      case ScenarioStatusCode.PROCESSING:
      case ScenarioStatusCode.COMPLETED:
        this.pogLibHeaderMenu2ShowHide.showHierarchyIcon = false;
        break;
      case ScenarioStatusCode.APPROVE_FAILED:
        this.failedIdPogs = planograms.filter((item) => !item.IsApproved);
        this.pogLibHeaderMenu2ShowHide.failedPogCount = this.failedIdPogs.length ? true : false;
        break;
      default:
        break;
    }
  }

  private nowProcessData(planograms: Planograms[]): void {
    if (
      this.scenarioStatus === ScenarioStatusCode.SUBMITTED_FOR_APPROVAL ||
      this.scenarioStatus === ScenarioStatusCode.PROCESSING || (this.parentApp.isAssortApp && this.planogramStore.readOnlyMode)
    ) {
      planograms = planograms.map((planogram) => ({ ...planogram, IsReadOnly: true }));
    }
    this.updateIconVisible(planograms);
    this.prepareDateForGrid(planograms);
    //gets polist from mapperobj if planogram Template edit
    const subscription = this.sharedService.editPlanogramTemplate.subscribe(res => {
      switch(true) {
        case this.parentApp.isAssortApp:
        case this.parentApp.isAllocateApp:
          this.requestToBack("toHome");
          const index = this.parentApp.isAllocateApp ? planograms.findIndex(e => e.IDPOG === window.parent.activeIDPOG) : 0;
          this.sharedService.tabChangeEvent.next({ index });
          break;
        case this.parentApp.isWebViewApp:
        case this.parentApp.isShelfInAutoMode:
          this.selectedPogChange.emit(this.pogList[this.pogList.length - 1]);
          this.updateState.emit(false);
          break;
        default:
          if (this.planogramStore.appSettings.SHELFAUTOLOADPOG) {
            if (this.pogList.length) {
              this.selectedPogChange.emit(this.pogList[this.pogList.length - 1]);
              this.updateState.emit(false);
            }
            else {
              this.notify.warn('PLANOGRAM_LIBRARY_NO_PLANOOGRAM_FOUND');
            }
          }
          break;
      }
    });
    this.subscriptions.add(subscription);

  }

  public onSelectedItem(data: { data: any, fieldName?: string, classList?: DOMTokenList, node?: RowNode, iconName?: string, value: string }): void {
    // TODO @og check if the deep clone is actually needed
    this.planogramLibService.prepareGridStatus();
    if (data?.data) this.planogramStore.activeSelectedPog = data?.data;
    this.selectedPogChange.emit(data?.data);
    if(this.planogramLibService.tempMultipleSections.length > 1) {
      this.planogramLibService.tempMultipleSections.forEach((item: Section) => {
        if(item?.IDPOG === data.data?.IDPOG) {
          this.sharedService.setActiveSectionId(item.$id);
        }
      });
    }
    if (data.classList.contains('favorite' || 'load' || 'unload' || 'pLibRow')) {
      this.removeSelectionOnActionIcon = {
        IDPOG: data.data?.IDPOG,
        isClickOnActionIcon: true
      }
    }
    if (data.value && data.data) {
      switch (data.value) {
        case this.translate.instant('UNPINNED'):
          if (data.classList.contains('favorite')) {
            this.requestToFavorite(data.data, null, "no");
          }
          break;
        case this.translate.instant('PINNED'):
          if (data.classList.contains('favorite')) {
            this.requestToUnFavorite(data.data);
          }
          break;
        case this.translate.instant('UNLOADED'):
          if (data.classList.contains('load')) {
            this.requestToDownload(data.data);
          }
          break;
        case this.translate.instant('LOADED'):
          if (data.classList.contains('unload')) {
            data.data.isLoaded = false;
            this.markRequestToUnload([data.data]);
          }
          break;
        default:
          // Deslected the row when clicking on idpog :  Requirement from Laurie
          if (this.planogramLibgrid?.gridApi) {
            this.planogramLibgrid.gridApi.deselectAll();
          }
          if (data.classList.contains('pLibRow')) {
            this.onFilterChange(true);
            this.updateState.emit(false);
          }
          break;
      }
      this.onRowSelected();
    }
  }
  private prepareDateForGrid(planograms: Planograms[]): void {
    this.planogramStore.mappers = [];
    this.planogramLibService.mapper = [];
    this.planogramLibService.markRequestToPin(planograms, false);
    this.pogList = this.planogramLibService.mapper;
    if (this.sharedService.vmode) {
      this.planogramLibService.mapperForVmode = JSON.parse(JSON.stringify(this.planogramLibService.mapper));
    }
    this.bindPlanogramLibGrid(this.pogList);
    this.cd.detectChanges();
    if (this.pogLibHeaderMenu2ShowHide.isPinned != undefined || this.pogLibHeaderMenu2ShowHide.isPinned != null) {
      if (this.planogramLibgrid) {
        this.changeViewBasedOnPinIcon(this.pogLibHeaderMenu2ShowHide.isPinned);
        this.cd.detectChanges();
      }
    }
  }

  private bindPlanogramLibGrid(data: POGLibraryListItem[]): void {
    if (this.planogramLibgrid) {
      this.planogramLibgrid?.gridApi?.setRowData(data);
      this.planogramLibgrid?.selectMultipleRows('IDPOG', this.selectedPlanograms.map(x => x.IDPOG));
      this.planogramLibgrid?.setGridHoldingData(data);
    } else {
      let gridContextMenus: Menu[] = this.config.getGridMenus(`pogScenario-grid`);
      const columns = this.agGridHelperService.getAgGridColumns(`pogScenario-grid`)
        .filter(item => item.field !== 'SelectPOGCheckbox');
      this.gridConfig = {
        ...this.gridConfig,
        id: `pogScenario-grid`,
        columnDefs: columns,
        data: data,
        firstCheckBoxColumn: { show: true, template: `` },
        height: 'calc(100vh - 141px)',
        setRowsForSelection: { field: 'IDPOG', items: this.selectedRows },
        actionFields: ['IDPOG', 'isPinned', 'IsLoaded'],
        filterActionRequired: true,
        isHeaderCheckboxSelectionOverrideRequired :true,
        menuItems: gridContextMenus,
        suppressClickEdit: true,
      };
    }
    this.planogramInfoService.getLoadedPogInfo.next(null);//closing the pog info screen
    this.annotationService.refreshAnnotationDialog(null, null, null, true);
  }


  public onRowSelected(): void {
    let selectedRows = this.planogramLibgrid?.gridApi?.getSelectedRows();
    let rowNodes: RowNode[] = [];
    const checkboxElement = document.querySelector(
      `shelf-ag-grid ag-grid-angular#${this.gridConfig.id} .ag-header-cell .ag-checkbox.ag-input-field .ag-checkbox-input-wrapper`,
    );
    this.planogramLibgrid?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
      rowNodes.push(ele);
    });
    const data = Object.assign([], rowNodes)
    if (rowNodes.length) {
      selectedRows = [];
      data.forEach((ele) => {
        if (ele.selected) {
          selectedRows.push(ele.data);
        }
      })
    }
    if (selectedRows.length && selectedRows.length !== this.gridConfig.data.length) {
      checkboxElement?.classList?.add('ag-indeterminate');
    } else if (!selectedRows.length) {
      checkboxElement?.classList?.remove('ag-indeterminate');
    }
    if (!this.removeSelectionOnActionIcon.isClickOnActionIcon) {
      this.selectedPlanograms = [];
      if (selectedRows && selectedRows.length > 0) {
        this.selectedRows = [...selectedRows];
        selectedRows.forEach((element) => {
          const obj = this.pogList.find(item => item.IDPOG === element.IDPOG)
          if (obj)
            this.selectedPlanograms.push(obj)
        })
        if (this.pogLibHeaderMenu2ShowHide.isPinned) {
          this.selectedPlanograms = this.selectedPlanograms.filter(it => it.IsFavorite);
        }
        this.pogLibHeaderMenu2ShowHide.selectedPogs = this.selectedPlanograms;
      }
      else {
        this.selectedPlanograms = [];
        this.selectedRows = [];
      }
    } else {
      this.removeSelectionOnActionIcon.isClickOnActionIcon = false;
      let data = [];
      if (this.selectedPlanograms.length) {
        this.selectedPlanograms.forEach((element) => {
          data.push(element);
        });

        this.planogramLibgrid?.setSelectedRows(data, 'IDPOG');
      }
      this.selectedRows = [...data.map((ele) => ele.IDPOG)];
    }
  }

  private changeViewBasedOnPinIcon(value: boolean, pinClick?: boolean): void {
    let filteredData: POGLibraryListItem[] = [];
    if (value) {
      const filterModel = { isPinned: { filterModels: [{ filterType: "set", values: [this.translate.instant("PINNED")] }], filterType: "multi" } }
      const columnstate = this.planogramLibgrid?.params?.columnApi
        .getColumnState();
      const group = columnstate?.findIndex((element) => element.rowGroup == true);
      this.planogramLibgrid?.gridApi?.setFilterModel(filterModel);
      filteredData = this.pogList.filter(ele => (ele.IsFavorite) as boolean === true);
      let index = this.agGridStoreService.gridState.findIndex(e => e.gridId == this.planogramLibgrid.gridConfig.id);
      if(filteredData === undefined || filteredData?.length == 0){
        filteredData = this.planogramLibgrid.gridConfig.data.length ? this.planogramLibgrid.gridConfig.data : filteredData;
      }
      if (this.agGridStoreService.gridState.length && index !== -1) {
        this.agGridStoreService.gridState[index] = { filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId: this.planogramLibgrid?.gridConfig?.id }
      } else {
        this.agGridStoreService.gridState.push({ filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId: this.planogramLibgrid?.gridConfig?.id });
      }
    } else if (pinClick) {
      if (this.planogramLibgrid)
      this.planogramLibgrid?.gridApi?.setFilterModel(null);
      this.agGridStoreService.gridState.push({ filtermodel: null, colSortState: null, isGroup: -1, data: this.pogList, gridId: this.planogramLibgrid?.gridConfig?.id });
      this.bindPlanogramLibGrid(this.pogList);
    }
    this.pogLibHeaderMenu2ShowHide.isPinned = value;
    this.localStorage.setBoolean(AppConstantSpace.PLANOGRAM_LIBRARY_PIN_STATUS, value);
  }
  public clearFilter(event: boolean) {
    this.pogLibHeaderMenu2ShowHide.isPinned = false;
  }
  public onFilterChange(event: boolean): void {
    if (event) {
      let filteredData: POGLibraryListItem[] = [];
      const filterModel = this.planogramLibgrid?.gridApi?.getFilterModel();
      const columnstate = this.planogramLibgrid?.params?.columnApi
        .getColumnState();
      const group = columnstate?.findIndex((element) => element.rowGroup == true);
      this.planogramLibgrid?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
        filteredData.push(ele.data);
      });
      if(filteredData === undefined || filteredData?.length == 0){
        filteredData = this.planogramLibgrid.gridConfig.data.length ? this.planogramLibgrid.gridConfig.data : filteredData;
      }
      let index = this.agGridStoreService.gridState.findIndex(e => e.gridId == this.planogramLibgrid?.gridConfig?.id)
      if (this.agGridStoreService.gridState.length && index !== -1) {
        this.agGridStoreService.gridState[index] = { filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId: this.planogramLibgrid?.gridConfig?.id };
      } else {
        this.agGridStoreService.gridState.push({ filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId: this.planogramLibgrid?.gridConfig?.id });
      }
    }
  }
  private bindSearchEvent(): void {
    const subscription = this.sharedService.filterSearch.subscribe(
      (response) => {
        if (this.planogramLibgrid) {
          this.planogramLibgrid.gridConfig.data = this.sharedService.runFilter(
            this.agGridStoreService.gridHoldingData.find(x => x.id === this.planogramLibgrid.gridConfig.id)[`data`],
            response
          );
          this.agGridStoreService.isGlobalSearch = response ? true : false;
        }
      }
    );
    this.subscriptions.add(subscription);
  }

  public menuButtonClickPogLibMenu2({ data: selectedMenu }: { data: { key: string; } }): void {
    if (selectedMenu) {
      switch (selectedMenu.key.trim()) {
        case 'pogshowHierarchy_SEARCH':
          this.sharedService.setSerachView('ps')
          this.getPlanogramSearchView();
          break;
        case 'pogLibHeaderMenu_2_SEARCH':
          const view = this.sharedService.getSerachView();
          if (view === 'ps' || !this.pogLibHeaderMenu2ShowHide.showHierarchyIcon) {
            this.getPlanogramSearchView();
          } else {
            this.showhierarchy();
          }
          break;
        case 'pogLibHeaderMenu_2_PIN':
        case 'pogLibHeaderMenu_2_PINSELECTED':
          this.changeViewBasedOnPinIcon(!this.pogLibHeaderMenu2ShowHide.isPinned, true);
          break;
        case 'pogLibHeaderMenu_2_POGHIRARCHY':
          this.showhierarchy()
          break;
        case 'pogLibHeaderMenu_2_REFRESH':
          this.refreshPogLibrary()
          break;
        case 'pogLibHeaderMenu_2_EXPORTEXCEL':

          this.exportToExcel()
          break;
        case 'pogLibHeaderMenu_2_FILTERLIST':
          this.onActionedChangeforfilter()
          break;
        case 'pogLibHeaderMenu_2_ADD':
          this.triggerAzureSearchBasedOnPage()
          break;
        case 'pogLibHeaderMenu_2_SETTINGS':
          this.onSetting()
          break;
        case 'pogLibHeaderMenu_2_CLOSE':
          this.requestToBack('toHome')


          break;
        case 'pogLibHeaderMenu_2_GETAAPP':
          this.excelExportforsearchPlanogramGrid()
          break;
        case 'pogLibHeaderMenu_2_PROMOTE_DEMOTE':
          this.showFailedPogLogs()
          break;
      }
    }
  }

  public menuButtonClickPogLibMenu3({ data: selectedMenu }: { data: { key: string; } }): void {
    if (selectedMenu) {
      switch (selectedMenu.key.trim()) {
        case 'pogshowHierarchy_CLOSE':
          const view = this.sharedService.getSerachView();
          if (view === 'ph') {
            this.showHierarchy = false;
            this.sharedService.updateSearchVisibility.next(true);
          }
          break;
        case 'pogshowHierarchy_SEARCH':
          this.showHierarchy = false;
          this.sharedService.setSerachView('ps')
          this.getPlanogramSearchView();
          break;
        case 'pogLibHeaderMenu_3_CLEAR':
          this.requestToBack('toDefault')
          break;
        case 'pogLibHeaderMenu_3_EXPORTPOG_XML':
          this.exportPlanogram('XML')
          break;
        case 'pogLibHeaderMenu_3_EXPORTPOG_XMZ':
          this.exportPlanogram('XMZ')
          break;
        case 'pogLibHeaderMenu_3_EXPORTPOG_PLN':
          this.exportPlanogram('PLN')
          break;
        case 'pogLibHeaderMenu_3_EXPORTPOG_PSA':
          this.exportPlanogram('PSA')
          break;
        case 'pogLibHeaderMenu_3_EXPORTPOG_PSA_FLOATINGSHELVES':
          this.exportPlanogram('PSA', this.shoppingCartService.floatingShelvesConfig?.ExportOptionName);
          break;
        case 'pogLibHeaderMenu_3_CLONEPOG':
          this.cloneMultiplePlanograms()
          break;
        case 'pogLibHeaderMenu_3_IMPORTADDDELETE':
          this.openImportTemplateDialog()
          break;
        case 'pogLibHeaderMenu_3_PROMOTEDEMOTE':
          this.promoteMultiple()
          break;
        case 'pogLibHeaderMenu_3_UPLOAD':
          this.requestToUnloadMultiple();
          break;
        case 'pogLibHeaderMenu_3_DOWNLOAD':
          this.toggleDownloadPog();
          break;
        case 'pogLibHeaderMenu_3_LOCATIONON':
          this.requestToPinUnpin();
          break;
        case 'pogLibHeaderMenu_3_LOCATIONOFF':
          this.requestToUnFavoriteMultiple()
          break;
        case 'pogLibHeaderMenu_3_DELETE':
          this.deleteMultiplePogs()
          break;
        case 'pogLibHeaderMenu_3_REMOVEPOG':
          this.removeSelectedRows()
          break;
        case 'pogshowHierarchy_EXPORT':
          this.exportToExcelhierarchy()
          break;
        case 'pogshowHierarchy_ADD':
          this.addPogToScenario()
          break;
        case 'pogLibHeaderMenu_3_CLOSE':
          this.requestToBack('toHome')
          break;
        case 'pogLibHeaderMenu_3_BATCHPRINT':
          this.triggerBatchPrint();
      }
    }
  }

  private addPogToScenario(): void {

    if (this.pogRowsSelected.length > 0) {
      const selectedPogData = [];
      for (const pogItem of this.pogRowsSelected) {
        const pog = this.pogList.find(item => item.IDPOG === pogItem.IDPOG)
        if (!pog) {
          const newPog = {
            IDPOG: pogItem.IDPOG,
            IDPOGScenario: this.planogramStore.scenarioId,
            IDProject: this.planogramStore.projectId,
            IDPOGStatus: '2'
          }
          selectedPogData.push(newPog)
        }
      }

      if (selectedPogData.length > 0) {
        const postObj = { IsPinning: true, Comments: "", data: selectedPogData }
        const subscription = this.planogramLibApiService.pogPinningUnpinning(postObj).subscribe(res => {
          if (res && res.Log.Summary.Error > 0) {
            this.notify.error(res.Log.Details[0].Message);
          }
          else {
            const idsQueryString = res.Data.map(it => it.IDPOG).join('&ids=');
            this.notify.success('PLANOGRAM_ADDED_TO_SCENARIO');
            const subscription = this.planogramLibApiService.getPlanogramsInfo(idsQueryString).subscribe(result => {
              this.planogramLibService.markRequestToPin(result.Data, false);
              this.pogList = this.planogramLibService.mapper;
              this.bindPlanogramLibGrid(this.pogList);
              this.showHierarchy = false;
              this.sharedService.updateSearchVisibility.next(true);
              this.pogLibHeaderMenu2ShowHide.poghierarchy = [];
            })
            this.subscriptions.add(subscription);
          }
        })
        this.subscriptions.add(subscription);
      }
    }

  }

  private removeSelectedRows(): void {

    if (this.isReadonlyPlanogram(this.scenarioStatus)) {
      this.notify.warn('Removing planogram is not allowed in current Scenario Status');
      return;
    }

    const lockedPogs = this.selectedPlanograms.filter(it => it.IsLocked).map(it => it.IDPOG);
    if (lockedPogs.length) {
      this.notify.warn(`${lockedPogs} Pogs are in locked State, cannot be removed from Scenario`);
      return;
    }

    if (this.sharedService.checkIfAssortMode('pin-unpin')) {
      return;
    }

    for (const pog of this.selectedPlanograms.filter(it => it.isLoaded)) {
      if (pog.sectionID && this.planogramService.rootFlags[pog.sectionID].asyncSaveFlag.isPOGSavingInProgress) {
        this.notify.warn(`Can not Unpin  POG# ${pog.IDPOG} . As Save is still in progress`);
        return;
      }

      if (this.checkIfObjectDirty(pog)) {
        this.notify.warn("PLEASE_SAVE_MODIFIED_PLANOGRAMS_UNLOAD_UNPIN");
        return;
      } else {
        pog.isLoaded = false;
        this.markRequestToUnload([pog]);
      }
    }

    const selectedPogData = this.selectedPlanograms.map(it => ({
      IDPOG: it.IDPOG,
      IDPOGScenario: this.planogramStore.scenarioId,
      IDProject: this.planogramStore.projectId,
      IDPOGStatus: '2'
    }));

    if (this.sharedService.checkIfAssortMode('pin-unpin')) {
      this.notify.warn("Removing disabled");
      return;
    }

    const postObj = { IsPinning: false, Comments: "", data: selectedPogData }
    const subscription = this.planogramLibApiService.pogPinningUnpinning(postObj).subscribe((res) => {
      if (res && res.Log.Summary.Error > 0) {
        this.notify.error(res.Log.Details[0].Message);
      } else {
        this.planogramLibService.markRequestToUnpin(this.selectedPlanograms);
        this.selectedPlanograms = [];
        this.selectedRows = [];
        this.planogramLibgrid.gridApi.deselectAll();
        this.pogList = this.planogramLibService.mapper;
        this.bindPlanogramLibGrid(this.pogList);
        this.notify.success('POG_REMOVE_SUCCESS');
      }
    });
    this.subscriptions.add(subscription)

  }

  private checkIfObjectDirty(selected: POGLibraryListItem): boolean {
    return selected.sectionID && selected.isLoaded && this.planogramService.rootFlags[selected.sectionID]?.isSaveDirtyFlag;
  }


  private deleteMultiplePogs(): void {
    if (!this.checkPogsVersion()) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: this.translate.instant('DELETE_PLANOGRAM_CONFIRM_MSG')
      });
      const subscription = dialogRef.afterClosed().subscribe(result => {
        if (result) {
          const ids = this.selectedPlanograms.map(it => it.IDPOG);
          const subscription = this.planogramLibApiService.deletePlanogram(ids).subscribe((res) => {
            if (res && res.Log.Summary.Error > 0) {
              this.notify.error(res.Log.Details[0].Message);
            } else {
              this.notify.success('POG_DELETE_SUCCESS');
              this.refreshPogLibrary();
              this.planogramLibService.markRequestToUnpin(this.selectedPlanograms);
              this.planogramLibgrid.gridApi.deselectAll();
              this.selectedRows = [];
              this.selectedPlanograms = [];
              this.pogChangesInLibrary('delete');
            }
          },
          (error) => {
            if (error) {
              this.notifyService.error(error, 'GOT IT!');
            }
          });
          this.subscriptions.add(subscription);
        }
      });
      this.subscriptions.add(subscription);
    }
  }


  private checkPogsVersion(): boolean {
    return this.selectedPlanograms.some(it => it.IDPogStatus > 3 || it.isLoaded);
  }


  private openImportTemplateDialog(): void {
    this.dialog.open(ImportTemplateComponent, {
      width: '125vw',
      height: '75vh',
      data: this.selectedPlanograms
    });
  }

  private markRequestToFavUnfav(selectedPlanograms: POGLibraryListItem[], IsFavorite: boolean, skip?: number): void {
    const postData = {
      IdPogScenario: this.planogramStore.scenarioId,
      IsFavorite,
      PogIDs: selectedPlanograms.map(it => ({ IDPOG: it.IDPOG })),
    };
    const subscription = this.planogramLibApiService.requestToFavUnfav(postData).subscribe(res => {
      this.planogramLibService.markRequestToFavUnfav(res.Data, IsFavorite);
      this.pogList = this.planogramLibService.mapper;
      if (this.planogramLibgrid && this.planogramLibgrid.gridApi.getSelectedRows().length == 0) {
        this.planogramLibgrid?.gridApi?.setRowData(this.pogList);
      } else {
        this.planogramLibgrid?.gridApi?.setRowData(this.planogramLibgrid.gridConfig.data);
        this.planogramLibgrid?.setSelectedRows(this.planogramLibgrid.gridConfig.data.filter(el => {
          return postData.PogIDs.find(element => {
             return element.IDPOG === el.IDPOG;
          });
       }), 'IDPOG');
      }
    });
    this.subscriptions.add(subscription);
  }

  private requestToUnFavorite(selectedPlanogram: POGLibraryListItem): void {
    if (selectedPlanogram.isLoaded && selectedPlanogram.sectionID) {
      if (this.planogramService.rootFlags[selectedPlanogram.sectionID].asyncSaveFlag.isPOGSavingInProgress) {
        this.notify.warn(`Can not Unpin  POG# ${selectedPlanogram.IDPOG}. As Save is still in progress`);
        return;
      }
    }

    if (selectedPlanogram.IsFavorite) {
      this.markRequestToFavUnfav([selectedPlanogram], false);
    }
  }

  private requestToFavorite(selectedPlanogram: POGLibraryListItem, event?: Event, fromMenu?: string): void {
    if (fromMenu != "menu" && event != null) {
      event?.stopPropagation();
    }
    if (!selectedPlanogram.IsFavorite) {
      this.markRequestToFavUnfav([selectedPlanogram], true);  // TODO Amit imp
    }
  }


  private requestToUnFavoriteMultiple(): void {
    if (this.selectedPlanograms.length > 0) {
      this.markRequestToFavUnfav(this.selectedPlanograms, false);
    }
  }

  private requestToFavoriteMultiple(): void {
    if (this.selectedPlanograms.length > 0) {
      this.markRequestToFavUnfav(this.selectedPlanograms, true);
    }
  }

  private triggerBatchPrint(): void {
    if (!this.selectedPlanograms.length) {
      return;
    }
    const IdPogCollection = this.selectedPlanograms.map(it => ({ IDPog: it.IDPOG, IDStore: -1 }));
    const noBatchArr = this.selectedPlanograms.filter(it => {
      const IDPogStatus = it.IDPogStatus ? it.IDPogStatus : it.POGStatus;
      const currentObject = this.planogramStatusList.find(item => item.IDPOGStatus === IDPogStatus);
      return currentObject && !currentObject.IsPriorityReportRequired;
    });

    if (noBatchArr.length > 0) {
      this.notify.warn('PRINT_MESSAGE_FOR_READ_ONLY_POGS');
    } else {
      this.zone.runOutsideAngular(() => {
        const dialogRef = this.dialog.open(BatchPrintComponent, {
          width: '125vw',
          height: '80vh',
          data: { IdPogCollection, idStore: undefined }
        });
      });
    }
  }

  private exportPlanogram(type: string, option = ''): void {
    this.sharedService.skipUnloadEvent = true;
    const idPogs = this.selectedPlanograms.map(it => it.IDPOG);
    let options = [];
    if (option && option.length > 0) options.push(option);
    const data = { id: 0, isExportByProject: 0, exportType: type, idPogs, options: options };
    const subscription = this.planogramLibApiService.exportPlanogram(data)
      .subscribe(res => this.forceDownload(`${res.Data}`));
    this.subscriptions.add(subscription);
  }

  /** downloads the link by opening a new window */
  private forceDownload(link: string): void {
    const ua = window.navigator.userAgent;
    const msie = ua.indexOf('MSIE ');
    if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
      window.open(link, 'Download');
    } else {
      window.open(link, '_self');
    }
  }

  private cloneMultiplePlanograms(dataItem?: {}): void {
    if (!this.isReadonlyPlanogram(this.scenarioStatus)) {
      if (this.selectedPlanograms.length > 1) {
        const dialogRef = this.dialog.open(MultipleCloneComponent, {
          width: '40vw',
          data: this.selectedPlanograms
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
            this.pogList = result.Data ? this.pogList.concat(result.Data) : this.pogList;
            this.planogramLibService.markRequestToPin(result.Data, false);
            this.pogList = this.planogramLibService.mapper;
            this.bindPlanogramLibGrid(this.pogList);
            this.notify.success('CLONE_SUCCESS_MESSAGE');
          }
        })
      } else {
        if (dataItem)
          this.openClonePlanogramPopUp(dataItem);
        else
          this.openClonePlanogramPopUp(this.selectedPlanograms[0]);
      }
    }
  }

  private openClonePlanogramPopUp(dataItem: {}): void {
    let checkDirty = this.planogramService.checkIfObjectDirty(dataItem as POGLibraryListItem);
    if (checkDirty) {
      this.notify.warn('SAVE_TEMP_DIRTY_CHECK');
      return;
    }

    if (this.isReadonlyPlanogram(this.scenarioStatus)) {
      return;
    }
    this.zone.runOutsideAngular(() => {
      const dialogRef = this.dialog.open(ClonePlanogramComponent, {
        width: '125vw',
        height: '80vh',
        data: { pogData: dataItem, selectedStores: [], fromPanel: false },
        panelClass: 'mat-dialog-move-cursor'
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result && result.Data) {
          this.planogramLibService.markRequestToPin(result.Data, false);
          this.pogList = this.planogramLibService.mapper;
          this.bindPlanogramLibGrid(this.pogList);
          this.notify.success('CLONE_SUCCESS_MESSAGE');
        }
      })
    });
  }

  private showhierarchy(): void {
    this.pogLibHeaderMenu2ShowHide.isSearchFocus = false;
    this.showHierarchy = true;
    this.sharedService.updateSearchVisibility.next(false);
  }

  public getSelectedRows(event: Planograms[]): void {
    this.pogRowsSelected = [...event];
    this.pogLibHeaderMenu2ShowHide.poghierarchy = this.pogRowsSelected;
  }

  public requestToBack(back: string): void {
    let filteredData: POGLibraryListItem[] = [];
    if (this.planogramLibgrid) {
    }
    switch (back) {
      case 'toHome':
        if (this.planogramLibgrid) {
          const filterModel = this.planogramLibgrid?.gridApi?.getFilterModel();
          const columnstate = this.planogramLibgrid?.params?.columnApi
            .getColumnState();
          const group = columnstate?.findIndex((element) => element.rowGroup == true);
          this.planogramLibgrid?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
            filteredData.push(ele.data);
          });
          if(filteredData === undefined || filteredData?.length == 0){ // keeping undefined check as this needs more testing
            filteredData = this.planogramLibgrid.gridConfig.data.length ? this.planogramLibgrid.gridConfig.data : filteredData;
          }
          let index = this.agGridStoreService.gridState.findIndex( e => e.gridId == this.planogramLibgrid?.gridConfig?.id);
          if(this.agGridStoreService.gridState.length && index !== -1){
            this.agGridStoreService.gridState[index] = { filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId :this.planogramLibgrid?.gridConfig?.id };
          } else {
            this.agGridStoreService.gridState.push({ filtermodel: filterModel, colSortState: columnstate, isGroup: group, data: filteredData, gridId: this.planogramLibgrid?.gridConfig?.id });
          }
        }
        const activePog = this.planogramStore.activeSelectedPog;
        if (Object.keys(activePog || {}).length) {
          const list = this.checkForGrouping();
          if (list.some(x => x.IDPOG === activePog.IDPOG)) {
            this.selectedPogChange.emit(activePog);
          } else {
            this.selectedPogChange.emit(list[0]);
          }
        } else {
          this.selectedPogChange.emit(this.pogList[0]);
        }
        this.updateState.emit(false);
        break;
      case 'default':
        this.pogLibHeaderMenu2ShowHide.isSearchFocus = false;
        break;

      case 'toDeselect':
        this.selectedRows = [];
        this.planogramLibgrid.gridApi.deselectAll();
        this.selectedPlanograms = [];
        break;

      case 'toDefault':
        this.selectedRows = [];
        this.planogramLibgrid.gridApi.deselectAll();
        this.selectedPlanograms = [];
        this.pogLibHeaderMenu2ShowHide.isSearchFocus = false;
        this.bindPlanogramLibGrid(this.pogList)
        break;
    }
    if (!this.showHierarchy)
      this.sharedService.updateSearchVisibility.next(true);
  }

  private checkForGrouping(): POGLibraryListItem[] {
    const planogramList = this.planogramLibService.mapper;
    if (this.planogramLibService.planogramLibGridState.group?.length === 1) {
      let mergedArr: POGLibraryListItem[] = [];
      let list = cloneDeep(planogramList);
      list = process(planogramList, this.planogramLibService.planogramLibGridState).data;
      for (const d of list) {
        mergedArr = mergedArr.concat(d.items)
      }
      return mergedArr;
    } else if (this.planogramLibService.planogramLibGridState?.sort.length > 1 || Object.keys(this.planogramLibService.planogramLibGridState?.filter || {}).length) {
      return process(planogramList, { sort: this.planogramLibService.planogramLibGridState.sort, filter: this.planogramLibService.planogramLibGridState.filter }).data;
    }
    else
      return planogramList;
  }

  private refreshPogLibrary(): void {
    if (this.planogramStore.scenarioId === -1) return;
    const subscription = this.planogramLibApiService.fetchPLIBDefaultResult(this.planogramStore.scenarioId).subscribe((res) => {

      //some pogs removed.
      if (res.Data.Planograms.length < this.planogramLibService.mapper.length) {
        for (let [i, pog] of this.planogramLibService.mapper.entries()) {
          if (!res.Data.Planograms.filter(it => it.IDPOG === pog.IDPOG).length) {
            this.planogramLibService.mapper.splice(i, 1);
          }
        }
      }
      for (const searchObj of res.Data.Planograms) {
        const result = this.planogramLibService.mapper.find(it => it.IDPOG === searchObj.IDPOG);
        const last = this.planogramLibService.mapper.filter(it => it.IDPOG === searchObj.IDPOG).pop();
        if (!result) {
          this.planogramLibService.markRequestToPin([searchObj], false);
        }
        if (!result || !last) {
          break;
        }
        if (result.IsLocked != searchObj.IsLocked) {
          last.IsLocked = searchObj.IsLocked;
          last.IDPogStatus = searchObj.IDPogStatus;
          last.POGStatus = searchObj.POGStatus;
          last.Version = searchObj.Version;
          last.POGTypeSymbol = searchObj.POGTypeSymbol;
          last.PogStatusSymbol = searchObj.PogStatusSymbol;
        } else {
          last.NoOfProducts = searchObj.NoOfProducts;
          last.NoOfStores = searchObj.NoOfStores;
          last.Dimension = searchObj.Dimension;
          last.POGLastModifiedBy = searchObj.POGLastModifiedBy;
          last.POGLastModifiedDate = searchObj.POGLastModifiedDate;
          last.EffectiveFrom = searchObj.EffectiveFrom;
          last.Version = searchObj.Version;
          last.L1 = searchObj.L1;
          last.L2 = searchObj.L2;
          last.L3 = searchObj.L3;
          last.L4 = searchObj.L4;
          last.L5 = searchObj.L5;
          last.L6 = searchObj.L6;
          last.L7 = searchObj.L7;
          last.L8 = searchObj.L8;
          last.L9 = searchObj.L9;
          last.L10 = searchObj.L10;
          last.IDPogStatus = searchObj.IDPogStatus;
          last.POGStatus = searchObj.POGStatus;
          last.Version = searchObj.Version;
        }
      }

      this.pogList = this.planogramLibService.mapper;
      this.planogramLibgrid.gridApi.deselectAll();
      this.planogramStore.mappers = this.planogramLibService.mapper;
      this.bindPlanogramLibGrid(this.pogList)
    });
    this.subscriptions.add(subscription);
  }

  private exportToExcel(): void {
    this.planogramLibgrid.exportToExcel();
  }

  private excelExportforsearchPlanogramGrid(): void {
    this.searchPlanogramGrid.exportToExcel();
  }

  private exportToExcelhierarchy(): void {
    this.hieraryGrid.exportAsExcel();
  }

  private onActionedChangeforfilter(): void {
    this.pogLibHeaderMenu2ShowHide.ischecked = !this.pogLibHeaderMenu2ShowHide.ischecked;
    if (this.pogLibHeaderMenu2ShowHide.ischecked) {
      this.displayedPlanogramsOnSearch = difference(this.displayedPlanogramsOnSearch, this.filteredPogs)
      this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch)
    } else {
      this.displayedPlanogramsOnSearch = this.filteredPogs.concat(this.displayedPlanogramsOnSearch);
      this.displayedPlanogramsOnSearch = this.prepareDisplayedPlanogramsOnSearch(this.displayedPlanogramsOnSearch)
      this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch);
    }
  }

  public triggerAzureSearchBasedOnPage(): void {
    this.showMoreClicked = true;
    this.pageNumber++;
    const postObj: AzureSearchPogs = {
      searchText: this.searchText,
      searchableColumn: this.planogram.selectedType,
      isAzSearch: this.planogram.isAzSearch,
      pageNumber: this.pageNumber
    };
    const subscription = this.planogramLibApiService.fetchPLIBAzureResultPage(postObj).subscribe((res) => {
      this.filteredPogs = res.Data.filter(it => this.pogList.some(item => item.IDPOG === it.IDPOG));
      this.displayedPlanogramsOnSearch = this.prepareDisplayedPlanogramsOnSearch(this.displayedPlanogramsOnSearch.concat(res.Data))
      if (this.pogLibHeaderMenu2ShowHide.ischecked) {
        this.displayedPlanogramsOnSearch = difference(this.displayedPlanogramsOnSearch, this.filteredPogs)
      }
      this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch);
    })
    this.subscriptions.add(subscription);
  }

  public triggerAzureSearch(value: { Name: string } | string): void {
    const val: string = typeof (value) === 'object' ? value?.Name : value;

    this.lastSearchText = val;
    this.searchText = val;

    this.filteredPogs = [];
    this.displayedPlanogramsOnSearch = [];
    if (!val) {
      return;
    }
    const postObj: AzureSearchPogs = {
      searchText: val,
      searchableColumn: this.planogram.selectedType,
      isAzSearch: this.planogram.isAzSearch
    };
    const subscription = this.planogramLibApiService.fetchPLIBAzureResult(postObj).subscribe(response => {
      this.filteredPogs = [];
      for (const d of this.pogList) {
        const pog = response.Data.find(item => item.IDPOG === d.IDPOG);
        if (pog) {
          this.filteredPogs.push(pog);
        }
      }
      this.displayedPlanogramsOnSearch = this.prepareDisplayedPlanogramsOnSearch(response.Data);
      if (this.pogLibHeaderMenu2ShowHide.ischecked) {
        this.displayedPlanogramsOnSearch = difference(this.displayedPlanogramsOnSearch, this.filteredPogs)
      }
      this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch);
      this.pogLibHeaderMenu2ShowHide.displayedPlanogramsOnSearch = response.Data.length > 0 ? true : false;
    });
    this.subscriptions.add(subscription);
  }

  private prepareDisplayedPlanogramsOnSearch(planograms: Planograms[]): POGLibraryListItem[] {
    this.displayedPlanogramsOnSearch = [];
    const uniqueList: POGLibraryListItem[] = uniqBy(planograms, "IDPOG");
    uniqueList.forEach(obj => {
      obj.IDPOG = obj.IDPOG;
      obj.isPinned = (this.planogramLibService.checkIfFlag(obj, 'isPinned'));
      obj.isCheckedOut = (this.planogramLibService.checkIfFlag(obj, 'isCheckedOut'));
      obj.isLoaded = (this.planogramLibService.checkIfFlag(obj, 'isLoaded'));
      obj.isSelected = false;
    })
    return uniqueList;
  }

  private bindSearchPlanogramGridConfig(data: Planograms[], pogsAddedToLibrary?: Planograms[]): void {
    if (this.searchPlanogramGrid) {
      if (pogsAddedToLibrary?.length) {
        pogsAddedToLibrary.forEach(p => {
          let rowIndex = data.findIndex(d => d.IDPOG === p.IDPOG);
          if (rowIndex !== -1) {
            let selectedNode: RowNode = this.searchPlanogramGrid?.gridApi?.getRowNode(rowIndex.toString());
            if (selectedNode?.data?.IDPOG === p.IDPOG) {
              let pogData: Planograms = data[rowIndex];
              selectedNode.setData(pogData);
            }
          }
        });
      }
      else {
        this.searchPlanogramGrid?.gridApi?.setRowData(data);
      }
      this.searchPlanogramGrid?.setGridHoldingData(data);
      if (this.showMoreClicked) {
        this.showMoreClicked = false;
        this.searchPlanogramGrid?.params?.api.ensureIndexVisible(this.lastRowIndex);
      }
      this.lastRowIndex = data.length - 1;
    } else {
      this.lastRowIndex = data.length - 1;
      let columnDefs = this.agGridHelperService.getAgGridColumns('pogSearch_Grid');

      //TODO: @Priyanka Kumar - Move sortable configuration to sp_settings
      let actionColIndex = columnDefs.findIndex(c => c.field === 'Action');
      if (actionColIndex) {
        columnDefs[actionColIndex].sortable = false;
      }
      let gridContextMenus: Menu[] = this.config.getGridMenus(`pogSearch_Grid`);
      this.searchPlanogramGridConfig = {
        ...this.searchPlanogramGridConfig,
        id: `pogSearch_Grid`,
        columnDefs: columnDefs,
        data: data,
        firstCheckBoxColumn: { show: true, template: `dataItem.isPinned` },
        setRowsForSelection: { items: this.selectedSearchRows, field: 'IDPOG' },
        height: 'calc(100vh - 141px)',
        actionFields: ['Action'],
        hideColumnWhileExport: ['Action'],
        menuItems: gridContextMenus
      };
    }
  }

  private onSetting(): void {
    const dialogRef = this.dialog.open(SearchSettingComponent, {
      width: '500px',
      data: { planogram: this.planogram, type: this.planogram.searchType, id: this.planogram.id }
    });
    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.planogram.selectedField = `${this.translate.instant(result.selectedField)}`;
        this.planogram.id = result.id;
        this.planogram.searchType = result.searchType;
        this.planogram.isAzSearch = result.isAzSearch;
        this.planogram.selectedType = result.selectedType;
      };
    })
  }

  private pogChangesInLibrary(id: string): void {
    this.planogramService.pogChangesInLibrary.next(id);
  }

  public getServerResponse(query: string): void {
    this.searchText = query;
    if (this.searchText === this.lastSearchText) {
      return;
    }
    if (!query) {
      return;
    }
    this.lastSearchText = query;
    if (!this.planogram.isAzSearch) {
      this.triggerAzureSearch(query)
    } else {
      const postObj: GetSuggestPogs = {
        query: query,
        mode: this.planogram.isAzSearch
      };
      const subscription = this.planogramLibApiService.getSuggestPogs(postObj).subscribe((response) => {
        this.data = [];
        this.data.push(response);
        this.data = uniqBy(this.data[0], 'IDPOG');
        this.data.map((data) => {
          return {
            Name: data.Name,
            IDPOG: data.IDPOG,
            POGStatus: data.POGStatus,
            StoreName: (data.StoreName) ? 'Store: ' + data.StoreName : ''
          }
        })
        if (this.data.length === 0) {
          this.triggerAzureSearch(query);
        }
      });
      this.subscriptions.add(subscription);
    }
  }

  public searchCleared(): void {
    this.filteredPogs = [];
    this.lastSearchText = '';
    this.searchText = '';
    this.data = [];
    this.displayedPlanogramsOnSearch = [];
    this.pageNumber = 1;
    this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch);
    this.pogLibHeaderMenu2ShowHide.displayedPlanogramsOnSearch = false;
  }

  private showPogMoreInfo(data: {}, menu: string, product: string): void {
    this.dialog.open(ShowPogMoreInfoComponent, {
      width: '55vw',
      height: '75vh',
      data: { data, product, menu },
    });
  }

  public onContextMenuSelect(event: { menu: MenuItemSummary, data?: any, rowIndex?: number }): void {
    switch (event?.menu?.key) {
      case "pogScenario-grid_CONTEXT_MENU_PIN":
        this.requestToFavorite(event.data);
        break;
      case "pogScenario-grid_CONTEXT_MENU_UNPIN":
        this.requestToUnFavorite(event.data);
        break;
      case "pogScenario-grid_CONTEXT_MENU_CLONEPOG":
        this.cloneMultiplePlanograms(event.data);
        break;
      case "pogScenario-grid_CONTEXT_MENU_PROPERTIES":
        this.showPogMoreInfo(event.data, "context_menu", "POG");
        break;
      case "pogScenario-grid_CONTEXT_MENU_LOAD":
        this.requestToDownload(event.data);
        break;
      case "pogScenario-grid_CONTEXT_MENU_UNLOAD":
        event.data.isLoaded = false;
        this.markRequestToUnload([event.data]);
        break;
      case "pogScenario-grid_CONTEXT_MENU_RENAME_POG":
        this.renamePlanogram(event.data, event.rowIndex);
        break;
    }
  }

  public onSelectedSearchItem(data: { data: POGLibraryListItem, fieldName: string, iconName: string }): void {
    switch (data?.iconName) {
      case 'add_circle':
        this.requestToPinUnPin([data.data])
        break;
      case 'info':
        this.showPogMoreInfo(data.data, "list", "POG");
        break;
    }
  }

  public onDisplayHeaderClick(): void {
    this.selectedSearchplanogram = [];
    this.selectedSearchRows = [];
    if (this.searchPlanogramGrid) {
      this.searchPlanogramGrid.gridApi.deselectAll();
    }
  }

  private requestToPinUnPin(pogs: Planograms[]): void {
    if (!this.isReadonlyPlanogram(this.scenarioStatus)) {
      const newFilteredPogs = pogs.filter(it => !this.pogList.some(elm => elm.IDPOG === it.IDPOG));
      const data = newFilteredPogs.map(it => ({
        IDPOG: it.IDPOG,
        IDPOGScenario: this.planogramStore.scenarioId,
        IDPOGStatus: "2",
        IDProject: this.planogramStore.projectId,
      }));
      if (data.length) {
        const subscription = this.planogramLibApiService.pogPinningUnpinning({
          Comments: "",
          IsPinning: true, data,
        }).subscribe((res) => {
          if (res && res.Log.Summary.Error > 0) {
            this.notify.error(res.Log.Details[0].Message);
          } else {
            this.onDisplayHeaderClick();
            this.filteredPogs = this.filteredPogs.concat(newFilteredPogs);
            this.planogramLibService.markRequestToPin(newFilteredPogs, true, res.Data);
            this.pogList = this.planogramLibService.mapper;
            this.bindPlanogramLibGrid(this.pogList);
            this.pogChangesInLibrary('addplanogram');
            this.displayedPlanogramsOnSearch = this.prepareDisplayedPlanogramsOnSearch(this.displayedPlanogramsOnSearch)
            this.bindSearchPlanogramGridConfig(this.displayedPlanogramsOnSearch, newFilteredPogs);
            this.notify.success('PLANOGRAM_ADDED_TO_SCENARIO');
          }
        })
        this.subscriptions.add(subscription);
      }
    }
    else {
      this.notify.warn('ADD_POG_NOT_ALLOWED');
    }
  }

  public onAddMultiplePlanograms(): void {
    this.requestToPinUnPin(this.selectedSearchplanogram);
  }

  public onSaveSelectedRow(): void {
    this.selectedSearchplanogram = [];
    this.selectedSearchRows = this.searchPlanogramGrid.params.api.getSelectedRows();
    if (this.selectedSearchRows && this.selectedSearchRows.length > 0) {
      this.selectedSearchRows.forEach((element) => {
        const obj = this.displayedPlanogramsOnSearch.find(item => item.IDPOG === element.IDPOG)
        if (obj)
          this.selectedSearchplanogram.push(obj)
      })
    }
  }

  public onMenuSelect(event: { menu: Menu, data: POGLibraryListItem }): void {
    switch (event?.menu?.key) {
      case 'pogSearch_Grid_CONTEXT_MENU_ADDPLANOGRAM':
        this.requestToPinUnPin([event.data])
        break;
      case 'pogSearch_Grid_CONTEXT_MENU_PROPERTIES':
        this.showPogMoreInfo(event.data, "list", "POG");
        break;
    }
  }

  private promoteMultiple(): void {
    for (const selectedPlanogram of this.selectedPlanograms) {
      if (selectedPlanogram.isLoaded && selectedPlanogram.sectionID) {
        if (this.planogramService.rootFlags[selectedPlanogram.sectionID].asyncSaveFlag.isPOGSavingInProgress) {
          this.notify.warn(`Can not Promote  POG# ${selectedPlanogram.IDPOG} . As Save is still in progress`);
          return;
        }
      }
      if (this.checkIfObjectDirty(selectedPlanogram)) {
        this.notify.warn('PROMOTE_SAVE_PENDING_CHANGES');
        return;
      }
    }

    const dialogRef = this.dialog.open(PromoteDemoteComponent, {
      width: '85vw',
      height: '65vh',
      maxWidth: '90vw',
      data: { rowData: this.selectedPlanograms, failedFlag: false }
    });
    const subscription = dialogRef.componentInstance.promoteDemot.subscribe((result) => {
      if (result) {
        this.pogList = this.planogramLibService.mapper;
        this.bindPlanogramLibGrid(this.pogList);
      }
    });
    this.subscriptions.add(subscription);

    const closeSubscription = dialogRef.afterClosed().subscribe((result) => {
      this.pogList = this.planogramLibService.mapper;
      this.bindPlanogramLibGrid(this.pogList);
    })

    this.subscriptions.add(closeSubscription);


  }

  private showFailedPogLogs(): void {
    // TODO @og revisit the logic here
    let isDirty = false;
    let keepGoing = true;
    for (const failedPog of this.failedIdPogs) {

      this.planogramLibService.mapper
        .filter(it => it.IDPOG === failedPog.IDPOG)
        .forEach(it => failedPog.isLoaded = it.isLoaded);

      if (keepGoing) {
        isDirty = this.planogramService.checkIfObjectDirty(failedPog as POGLibraryListItem);
        if (isDirty) {
          keepGoing = false;
        }
      }
    }

    if (isDirty) {
      this.notify.warn('PROMOTE_SAVE_PENDING_CHANGES');
      return;
    }

    const dialogRef = this.dialog.open(PromoteDemoteComponent, {
      width: '85vw',
      height: '65vh',
      maxWidth: '90vw',
      data: { rowData: this.failedIdPogs, failedFlag: true }
    });

    const openSubscription = dialogRef.componentInstance.promoteDemot.subscribe((result) => {
      if (result) {
        this.pogList = this.planogramLibService.mapper;
        this.bindPlanogramLibGrid(this.pogList);
      }
    });
    this.subscriptions.add(openSubscription);

    const closeSubscription = dialogRef.afterClosed().subscribe((result) => {
      this.pogList = this.planogramLibService.mapper;
      this.bindPlanogramLibGrid(this.pogList);
    });
    this.subscriptions.add(closeSubscription);

  }

  public onSelect(item: { Name?: string }): void {
    // do something with selected item
    this.searchText = item.Name;
    if (item.Name) {
      this.triggerAzureSearch(item.Name);
    }
  }


  private requestToUnloadMultiple(globalUnloadList?:POGLibraryListItem[]): void {
   let selectedPlanograms =  globalUnloadList? globalUnloadList:this.selectedPlanograms;
    for (const obj of selectedPlanograms) {
      this.markRequestToUnload([obj]);
    }
  }

  private markRequestToUnload(items: POGLibraryListItem[]): void {
    for (const item of items) {
      const libraryPog = this.planogramLibService.mapper.find(it => it.IDPOG === item.IDPOG);
      if (libraryPog) {
        libraryPog.isSaveDirtyFlag = false;
        libraryPog.isLoaded = false;
        libraryPog.IsAutoSaved = false;
        libraryPog.IsLoaded = this.translate.instant('UNLOADED');
      }
    }
    this.planogramStore.mappers = this.planogramLibService.mapper;
    this.unloadPlanogram(items);
  }

  private renamePlanogram(pog: Planograms,rowIndex: number) : void {
    let pogStatuses = this.planogramStore.appSettings.renamePlanogramAllowed.split(',').map(id => {
      return Number(id);
    });
    if(pogStatuses.includes(pog.IDPogStatus) && !pog.isLoaded) {
      this.planogramLibgrid.gridApi.startEditingCell({
        rowIndex: rowIndex,
        colKey: 'Name'
      });
    } else {
      pog.IsReadOnly ? this.notify.error(this.translate.instant('RENAMING_READ_ONLY_POG_IS_NOT_POSSIBLE')) : '';
      pog.isLoaded ? this.notify.error(this.translate.instant('RENAMING_LOADED_POG_IS_NOT_POSSIBLE')) : '';
    }
  }

  public editedValue(params): void {
    const postData = {
      idPog: params.event.data.id,
      planogramName: params.event.newValue
    };

    if(postData.planogramName !== '') {
      this.planogramLibApiService.renamePlanogram(postData).subscribe((result) => {
        //After planogram renaming, the grid will be refreshed.
       this.bindPlanogramLibGrid(this.pogList);
        this.notify.success('PLANOGRAM_RENAMED_SUCCESSFULLY');
      },error => {
        this.planogramLibgrid.gridApi.undoCellEditing();
         this.notify.error(error,'GOT_IT');
        });
    } else {
      this.notify.error(this.translate.instant('PLANOGRAM_NAME_CANT_BE_EMPTY'));
      this.planogramLibgrid.gridApi.undoCellEditing();
      this.planogramLibgrid.gridApi.startEditingCell({
        rowIndex: params.event.rowIndex,
        colKey: 'Name'
      });
    }

  }

  private unloadPlanogram(items: POGLibraryListItem[]): void {
    for (const item of items) {
      if (this.planogramStore.appSettings.isAppOnline) {
        if (!this.parentApp.isAllocateApp) {
          const subscription = this.planogramLibApiService.cleareAutoSavedData(item.IDPOG).subscribe();
          this.subscriptions.add(subscription);
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
        this.pogLibHeaderMenu2ShowHide.isLoaded = false;
      } catch (e) {
        this.log.error(e);
      }
      mapperObj.sectionID = '';
    }
  }

  private removePlanogramVm({ IDPOG, sectionID }: { IDPOG: number, sectionID: string }): void {
    this.planogramLoaderService.removePlanogramVM(IDPOG, sectionID);

    this.pogList = this.planogramStore.mappers;
    this.bindPlanogramLibGrid(this.pogList);

    this.planogramStore.removePogById(IDPOG);
  }

  private requestToDownloadMultiple(): void {
    const maxPogCount = this.planogramStore.appSettings.maxPogCount;
    const loadedCount = this.planogramLibService.mapper.filter(it => it.isLoaded).length;
    const unloadedPogs = this.selectedPlanograms?.filter(it => !it.isLoaded).length;
    const totalCount = loadedCount + unloadedPogs;
    if ((this.selectedPlanograms.length <= maxPogCount && totalCount <= maxPogCount) || maxPogCount == -1) {
      for (const item of this.selectedPlanograms) {
        this.requestToDownload(item);
      }
    } else if (loadedCount == maxPogCount) {
      const dialogRef = this.dialog.open(PogMaxCountDialogComponent, {
        width: '50vw',
        data: { data: this.selectedPlanograms },
        autoFocus: false
      });
      dialogRef.afterClosed().subscribe((result) => {
        if (result) {
        }
      });
      this.notify.warn(`${maxPogCount} ${this.translate.instant('POG_ALREADY_LOADED')}`);
    } else {
      this.notify.warn(`${this.translate.instant('POGS_MORE_THAN_MAX_LIMIT')}`);
    }

  }

  private requestToDownload(obj: POGLibraryListItem): void {
    const pogCounts = this.planogramLibService.getLoadCount();
    if (!obj.isLoaded) {
      if (pogCounts.canDownload) { //checking POG count before creating a new planogram

        const pog = this.planogramStore.getPogById(obj.IDPOG);
        if (!pog) {
          const subscription = this.panelService.getPlanogramData(obj.IDPOG).subscribe(result => {
            if (result.Data != null) {
              this.processPlanogramData(result.Data, obj);
              this.pogLibHeaderMenu2ShowHide.isLoaded = true;
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
          this.subscriptions.add(subscription);
        }
      } else {
        const dialogRef = this.dialog.open(PogMaxCountDialogComponent, {
          width: '50vw',
          data: { data:this.selectedPlanograms},
          autoFocus: false
        });
        dialogRef.afterClosed().subscribe((result) => {
          if (result) {
           console.log("dialogClose")
          }
        });
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
    this.prepareData(data);
    this.tempSection.globalUniqueID = obj.globalUniqueID;
    if (authData) {
      this.planogramService.syncAuthCodeWithVM = new SyncAuthCodeWithVM(authData, this.tempSection);
    }  //authcode
    obj.sectionID = this.tempSection.$sectionID;
    obj.isLoaded = true;
    const index = this.planogramStore.mappers
      .filter(it => it.IDPOG == obj.IDPOG)
      .reduce((_, it, index) => {
        it.isLoaded = true;
        it.sectionID = this.tempSection.$sectionID;
        return index;
      }, -1);

    this.planogramLibService.markAlreadyLoaded({ IDPOG: data.IDPOG, isLoaded: true, sectionID: this.tempSection.$sectionID });
    this.pogList = this.planogramLibService.mapper;
    this.panelService.panelPointer = {
      ...this.panelService.panelPointer,
      [this.panelService.activePanelID]: {
        ...this.panelService.ActivePanelInfo,
        sectionID: this.tempSection.$sectionID,
        componentID: 1,
        IDPOG: obj.IDPOG,
        isLoaded: true,
        index,
        view: 'panelView'
      }
    }
    this.bindPlanogramLibGrid(this.pogList)  // Removed skip need to check with Keerthi/Pranay
    const pog = this.planogramStore.downloadedPogs.find(it => it.IDPOG === data.IDPOG);
    if (pog) {
      pog.sectionObject = this.tempSection;
      pog.sectionID = this.tempSection.$sectionID;
    } else {
      this.planogramStore.downloadedPogs.push({
        IDPOG: data.IDPOG,
        sectionObject: this.tempSection,
        sectionID: this.tempSection.$sectionID,
      });
    }

    if (this.parentApp.isAllocateApp) {
      this.paBroadcaster.updatePogDownload(data.IDPOG, true);
    }else if (this.parentApp.isAssortApp) {
      window.parent.postMessage('invokePaceFunc:shelfLoaded', '*');
      window.parent.postMessage('invokePaceFunc:syncAssortWorkbook:[" ' + obj.IDPOG + '"]', '*');
    }

    this.planogramSaveService.initiateAutoSave(this.tempSection, this.tempSection.$sectionID);
  }

  // TODO: @malu alreadyLoaded is always false.
  private prepareData(data: SectionResponse, alreadyLoaded?: boolean): void {
    const sorted = this.panelService.sortChildrens(data);
    if (!alreadyLoaded) {
      this.tempSection = this.planogramCommonService.prepareModel(sorted); // Section class
      this.sharedService.planogramVMs[this.tempSection.$id] = this.tempSection;
      this.sharedService.NewIsSaveDirtyFlag[this.tempSection.$id] = false;
      this.sharedService.OldIsSaveDirtyFlag[this.tempSection.$id] = false;
      this.planogramService.initBySectionIdByCommunicator(this.tempSection.$id);
      this.planogramService.initBySectionIdMeasurment(this.tempSection.$id);
      this.planogramService.initBySectionIdByPlanogramsetting(this.tempSection.$id);
      this.planogramService.initBySectionIdByHighlight(this.tempSection.$id);
    }
    this.sharedService.setActiveSectionId(this.tempSection.$id);
    this.planogramLibService.tempMultipleSections.push(this.tempSection);
    this.sharedService.setActiveComponentNumber(1);
    this.intersectionChooserHandler.initBySectionId(this.tempSection.$id);

    const pogObj = sorted as unknown as Section;

    if (this.parentApp.isAllocateApp) {
      this.blockHelperService.processPogBlocks(pogObj);
    }

    this.renderPlanogramData();
    this.historyService.historyStack[this.tempSection.$id] === undefined ? this.historyService.initBySectionId(this.tempSection.$id) : null;
    this.planogramService.addToSelectionByObject(this.tempSection, this.tempSection.$id);

  }

  private renderPlanogramData(): void {
    if (this.tempSection.ObjectDerivedType === 'Section' && !this.tempSection.annotations.length) {
      this.tempSection.annotationLoaded = false;
      this.tempSection.annotations = [];
      this.planogram2DService.toggleAnnotations(this.tempSection).subscribe();
    }
  }

  private requestToPinUnpin(): void {
    const pins = this.selectedPlanograms.filter(it => !it.IsFavorite).length;
    const unpins = this.selectedPlanograms.filter(it => it.IsFavorite).length;
    if (pins >= unpins) {
      this.requestToFavoriteMultiple();
    } else {
      this.requestToUnFavoriteMultiple();
    }
  }

  private toggleDownloadPog(): void {
    const unloads = this.selectedPlanograms.filter(it => !it.isLoaded).length;
    const downloads = this.selectedPlanograms.filter(it => it.isLoaded).length;
    if (unloads >= downloads) {
      this.requestToDownloadMultiple();
    } else {
      this.requestToUnloadMultiple();
    }
  }

  private getPlanogramSearchView(): void {
    this.getSearchData();
    this.pogLibHeaderMenu2ShowHide.isSearchFocus = true;
    this.sharedService.updateSearchVisibility.next(false);
  }

  ngOnDestroy(): void {
    this.planogramLibService.savedSelection = this.selectedRows;
    //Called once, before the instance is destroyed.
    //Add 'implements OnDestroy' to the class.
    this.subscriptions.unsubscribe();
  }


}
