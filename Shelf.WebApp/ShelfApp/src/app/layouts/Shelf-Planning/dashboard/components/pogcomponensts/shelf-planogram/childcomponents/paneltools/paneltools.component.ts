import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { isUndefined } from 'lodash-es';
import * as XLSX from 'xlsx';
import { AppConstantSpace, LocalStorageKeys, Utils } from 'src/app/shared/constants';
import { 
  FixtureObjectResponse, 
  AllocateRetainVals, 
  ResizeObject, 
  AllocateObject, 
  ResizeSectionObject, 
  Split, 
  ItemList,
  SplitPreference
} from 'src/app/shared/models';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import {
  HistoryService, 
  PlanogramService, 
  SharedService,
  PlanogramHelperService, 
  PanelService,
  PlanogramStoreService, 
  NotifyService, 
  DictConfigService, 
  Render2dService
} from 'src/app/shared/services';
import { Position, Section } from 'src/app/shared/classes';
import { SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { SortPlanogramOptions } from 'src/app/shared/models/panel-tools/panel-tools';

declare const window: any;
@Component({
  selector: 'app-paneltools',
  templateUrl: './paneltools.component.html',
  styleUrls: ['./paneltools.component.scss']
})
export class PaneltoolsComponent implements OnInit {
  /*Init Tools Menu*/
  public fixtureWidth: number = 0;
  public isAllocateview: boolean = true;
  public isResizeview: boolean = false;
  public isSplitShelfview: boolean = false;
  public isSortPlanogramView: boolean = false;
  private isAdvOptions: boolean = false;
  private sortByValue: Position[];
  public intelligentOption: boolean = false;
  public sortTypeSelected: number = this.translate.instant('CHOOSE_OPTION');
  public sequenceTypeSelected: number = this.translate.instant('CHOOSE_OPTION');
  public sectionWidth: number = 0;
  private addingBay: boolean = false;
  private adjustingSection: boolean = false;
  private appSettingsSvc;
  public sortOptions: Array<{ IDDictionary: number }>;
  public isSelectedItemsDisabled: boolean;
  private activeSectionID: string;
  private excelData: string[] = [];
  public panelID: string;
  public fileName: string = '';
  public isAllocateviewHeader: boolean;
  public isResizeviewHeader: boolean;
  public isSplitShelfviewHeader: boolean;
  public isSortPlanogramViewHeader: boolean;
  public split: Split = {
    isMerge: false,
    noBays: false,
    width: 0
  };
  public resizeObj: ResizeObject = {
    addRightOrLeft: true,
    noOfMoudlars: 0,
    duplicateFixtures: false,
    modularWidth: 0,
    duplicatePositions: false,
    duplicateFacings: false
  };

  public resizeSectionObj: ResizeSectionObject = {
    adjustRightOrLeft: true,
    sectionNewWidth: 0
  };

  public allocate: AllocateObject = {
    useItems: false,
    respectPresent: true,
    itemsMode: -1,
    invData: {
      FacingsMin: 0,
      FacingsMax: 0,
      DOSMin: 0,
      DOSMax: 0,
      UnitsMin: 0,
      UnitsMax: 0,
      CasesMin: 0,
      CasesMax: 0
    },
    logModified: false,
    overrideInv: false
  };

  public sortList: ItemList[] = [{
    "field": this.translate.instant('EXCEL'),
    "value": 1
  }, {
    "field": this.translate.instant('BRAND'),
    "value": 258
  }];

  public sequenceList: ItemList[] = [{
    "field": this.translate.instant('LEFT_TO_RIGHT_BOTTOM_TO_TOP'),
    "value": 1
  }, {
    "field": this.translate.instant('LEFT_TO_RIGHT_TOP_TO_BOTTOM'),
    "value": 2
  }, {
    "field": this.translate.instant('SNAKING_LEFT_TO_RIGHT_BOTTOM_TO_TOP'),
    "value": 3
  }, {
    "field": this.translate.instant('SNAKING_LEFT_TO_RIGHT_TOP_TO_BOTTOM'),
    "value": 4
  }];


  private get modularTemplate(): FixtureObjectResponse {
    return this.planogramStore.modularTemplate;
  }

  constructor(
    private readonly dialogRef: MatDialogRef<PaneltoolsComponent>,
    private readonly translate: TranslateService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly PanelMapper: PanelService,
    private readonly historyService: HistoryService,
    private readonly cd: ChangeDetectorRef,
    private readonly log: ConsoleLogService,
    private readonly notifyService: NotifyService,
    private readonly dictConfigService: DictConfigService,
    private readonly render2d: Render2dService,
    private readonly localStorageService: LocalStorageService
  ) { }

  public ngOnInit(): void {
    this.appSettingsSvc = this.planogramStore.appSettings;
    const result = this.appSettingsSvc.allSettingsObj.GetAllSettings.data.find(val => val.KeyName === "SORT_POG_OPTIONS");
    if (result?.KeyValue) {
      this.sortOptions = JSON.parse(result?.KeyValue);
    } else {
      console.warn('Missing settings SORT_POG_OPTIONS');
    }
    this.paneltoolInitialization();
    this.updateoptionsFromLocalstorage();
  }

  public paneltoolInitialization(): void {
    this.panelID = this.sharedService.iSHELF.showDirective.panelID;
    if (this.sharedService.checkIfAssortMode('tools')) {
      this.isAllocateviewHeader = true;
      this.isResizeviewHeader = false;
    } else {
      this.isAllocateviewHeader = false;
      this.isResizeviewHeader = true;
    }
    this.initToolsMenu();
    this.updateFIXWidth();
    this.onTabChanged(this.translate.instant('PANEL_HEADER_ALLOCATE'));
  }

  public isIassort(): boolean {
    const AssortClass = this.sharedService.checkIfAssortMode('tools') ? true : false;
    return AssortClass
  }

  public keypress($event: KeyboardEvent): boolean {
    const keyCode = ('which' in $event) ? $event.which : $event['keyCode'];
    const key = $event.key.toLocaleLowerCase();
    const isNotWanted = (keyCode > 64 && keyCode < 92) || 
      ((keyCode > 105 && keyCode < 110) || (keyCode > 110 && keyCode < 124)) || 
      (key === '.' && this.isResizeviewHeader); //keycode 190 is for dot (decimal)
    if (isNotWanted) {
      $event.stopPropagation();
      $event.preventDefault();
    }
    return !isNotWanted;
  }

  private initToolsMenu(): void {
    if (this.sharedService.checkIfAssortMode('tools')) {
      this.isAllocateview = true;
      this.isResizeview = false;
      this.isSplitShelfview = false;
      this.isSortPlanogramView = false;
    } else {
      this.isAllocateview = true;
      this.isResizeview = false;
      this.isSplitShelfview = false;
      this.isSortPlanogramView = false;
    }
    const activeSectionID = this.sharedService.getActiveSectionId();
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID);
    this.modularTemplate.Fixture.IsMovable = true;
    this.modularTemplate.Fixture.IsMerchandisable = false;
    this.modularTemplate.ObjectDerivedType = AppConstantSpace.MODULAR;
    this.sectionWidth = Number(rootObject.Dimension.Width.toFixed(2));
    this.resizeSectionObj.sectionNewWidth = this.sectionWidth;
  }

  private initAllocateView(): void {
    if (this.isAllocateview) {
      this.isResizeview = false;
      this.isSplitShelfview = false;
      this.isSortPlanogramView = false;
      const activeSecID = this.sharedService.getActiveSectionId();
      const selectedObjsList: SelectableList[] = this.planogramService.getSelectedObject(activeSecID);
      if (selectedObjsList.length && selectedObjsList[0].ObjectDerivedType != "Section") {
        this.allocate.itemsMode = 1; //selected Item
        this.isSelectedItemsDisabled = false;
      } else {
        this.allocate.itemsMode = 2; //all Items
        this.isSelectedItemsDisabled = true;
      }

      if ((this.activeSectionID !== activeSecID) && Utils.isNullOrEmpty(this.planogramService.rootFlags[activeSecID].allocateRetainVals)) {
        this.activeSectionID = activeSecID;
        let rootObject = this.sharedService.getObject(this.activeSectionID, this.activeSectionID) as Section;
        let sectionInvModel = rootObject.InventoryModel;
        this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals = {} as AllocateRetainVals;
        this.allocate.invData.FacingsMin = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.FacingsMin = sectionInvModel.FacingsMin;
        this.allocate.invData.FacingsMax = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.FacingsMax = sectionInvModel.FacingsMax;
        this.allocate.invData.DOSMin = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.DOSMin = sectionInvModel.DOSMin;
        this.allocate.invData.DOSMax = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.DOSMax = sectionInvModel.DOSMax;
        this.allocate.invData.UnitsMin = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.UnitsMin = sectionInvModel.UnitsMin;
        this.allocate.invData.UnitsMax = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.UnitsMax = sectionInvModel.UnitsMax;
        this.allocate.invData.CasesMin = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.CasesMin = sectionInvModel.CasesMin;
        this.allocate.invData.CasesMax = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.CasesMax = sectionInvModel.CasesMax;
      } else {
        this.activeSectionID = activeSecID;
        this.allocate.overrideInv = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.overrideInv ? true : false;
        this.allocate.useItems = this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.useItems ? true : false;
        this.allocate.invData = {
          FacingsMin: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.FacingsMin,
          FacingsMax: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.FacingsMax,
          DOSMin: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.DOSMin,
          DOSMax: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.DOSMax,
          UnitsMin: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.UnitsMin,
          UnitsMax: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.UnitsMax,
          CasesMin: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.CasesMin,
          CasesMax: this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals.CasesMax
        };
      }
      this.allocate.logModified = true;
      this.appSettingsSvc.isLogAllocations = this.allocate.logModified;
    }
  }

  public toggleAdvOptions(): void {
    this.isAdvOptions = !this.isAdvOptions;
    this.isAdvOptions ? $('#advOptIcon').css({ transform: 'rotate(' + 90 + 'deg)' }) : $('#advOptIcon').css({ transform: 'rotate(' + 0 + 'deg)' });
  }

  //Toggle through the tabs
  public onTabChanged(mode: string): boolean {
    this.resizeObj.duplicateFixtures = false;
    if (this.sharedService.checkIfAssortMode('tools')) {
      return false;
    }
    if (window.parent.currentProjectType == 'NICI' && mode == "Allocate") {
      mode = this.translate.instant('ADJUST_SECTIONS');
    }
    switch (mode) { //TODO @ankita create enum for this
      case this.translate.instant('PANEL_HEADER_ALLOCATE'):
        this.isAllocateview = true;
        this.isResizeview = false;
        this.isSplitShelfview = false;
        this.isSortPlanogramView = false;
        this.initAllocateView();
        this.isAllocateviewHeader = true;
        this.isResizeviewHeader = false;
        this.isSplitShelfviewHeader = false;
        this.isSortPlanogramViewHeader = false;
        break;
      case this.translate.instant('ADJUST_SECTIONS'):
        this.isResizeview = true;
        this.isAllocateview = false;
        this.isSplitShelfview = false;
        this.isSortPlanogramView = false;
        this.isResizeviewHeader = true;
        this.isAllocateviewHeader = false;
        this.isSplitShelfviewHeader = false;
        this.isSortPlanogramViewHeader = false;
        break;
      case this.translate.instant('SPLIT_SHELF'):
        this.isSplitShelfview = true;
        this.isAllocateview = false;
        this.isResizeview = false;
        this.isSortPlanogramView = false;
        this.isResizeviewHeader = false;
        this.isAllocateviewHeader = false;
        this.isSplitShelfviewHeader = true;
        this.isSortPlanogramViewHeader = false;
        break;
      case this.translate.instant('PANEL_HEADER_SORTPLAGRAM'):
        this.updateoptionsFromLocalstorage();
        this.isSortPlanogramView = true;
        this.isSplitShelfview = false;
        this.isAllocateview = false;
        this.isResizeview = false;
        this.isResizeviewHeader = false;
        this.isAllocateviewHeader = false;
        this.isSplitShelfviewHeader = false;
        this.isSortPlanogramViewHeader = true;
        break;
    }
  }

  public onOverrideInvChange(checked: boolean): void {
    this.allocate.useItems = checked;
  }

  //Reset menu
  public resetTools(): void {
    this.resizeObj = {
      addRightOrLeft: true,
      noOfMoudlars: 0,
      duplicateFixtures: false,
      duplicatePositions: false,
      duplicateFacings: false,
    }
    this.resizeSectionObj.adjustRightOrLeft = true;
  }
  //Updating width of the fixture
  public updateFIXWidth(): void {
    const activeSectionID = this.sharedService.getActiveSectionId();
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as Section;
    if (rootObject.isBayPresents) {
      const index = this.resizeObj.addRightOrLeft ? this.sharedService.getAllModulars(rootObject).length - 1 : 0;
      this.fixtureWidth = (rootObject.getModularByIndex(index).Dimension.Width).toFixed(2);
      this.fixtureWidth = Number(this.fixtureWidth);
      this.resizeObj.modularWidth = this.fixtureWidth;
    }
    this.sectionWidth = Number(rootObject.Dimension.Width.toFixed(2));
  }

  private showDataExcel(file: File): void {
    const reader = new FileReader();
    let excelData = [];
    reader.onload = (event) => {
      const workbook = XLSX.read(event.target.result, {
        type: 'binary'
      });
      workbook.SheetNames.forEach((sheetName) => {
        // Here is your object
        const XL_row_object = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        for (const row of XL_row_object) {
         let rowData = typeof(row['UPC']) != 'string' ? String(row['UPC']) : row['UPC'];
         excelData.push(rowData);
        }
        this.excelData = excelData;
        //  this.sortByValue = 'excelData';
      })
    }
    reader.onerror = (ex) => {
      console.log(ex);
    }
    reader.readAsBinaryString(file);
  }

  public getFieldName(IDDictionary: number): string {
    if (IDDictionary == -1) {
      return this.translate.instant('EXCEL');
    } else {
      return this.translate.instant('BRAND');
    }
  }

  getFieldPath = (index) => {
    let dictionaryId = this.sortOptions[index].IDDictionary;
    return Utils.makeFieldFromDict(this.dictConfigService.findById(dictionaryId));
  }

  private getAllPositions(fieldPath: string): Position[] {
    const path = fieldPath.split('.');
    let positionsArray: any[] = [];
    const rootObject = this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId());
    const eachRecursive = (obj) => {
      if (obj.hasOwnProperty('Children')) {
        obj.Children.forEach(child => {
          if (child.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            positionsArray.push(child);
          }
          eachRecursive(child);
        }, obj);
      }
    }
    eachRecursive(rootObject);
    const sortByBrand = (prop1: string, prop2: string, prop3: string, arr: Position[]) => {
      arr.sort((a, b) => {
        if (a[prop1][prop2][prop3] < b[prop1][prop2][prop3]) {
          return -1;
        } else if (a[prop1][prop2][prop3] > b[prop1][prop2][prop3]) {
          return 1;
        } else {
          return 0;
        }
      });
    };
    if (path.length === 3) {
      sortByBrand(path[0], path[1], path[2], positionsArray);
    }
    return positionsArray;
  }

  public onSelectSort(value: number): void {
    this.sortTypeSelected = value;
    if (value === 0) {
      const element: HTMLElement = document.querySelector('input[type="file"]') as HTMLElement;
      element.click();
    }
    if (value === 1) {
      const fieldPath = this.getFieldPath(value);
      this.sortByValue = this.getAllPositions(fieldPath);
    }
  }

  public onFileChange(files: FileList): void {
    this.fileName = files[0].name;
    this.showDataExcel(files[0]);
  }

  private validateConstraints(): void {
    this.allocate.invData.FacingsMin = this.allocate.invData.FacingsMin === 0 ? 1 : this.allocate.invData.FacingsMin,
    this.allocate.invData.DOSMin = this.allocate.invData.DOSMin === 0 ? 1 : this.allocate.invData.DOSMin,
    this.allocate.invData.UnitsMin = this.allocate.invData.UnitsMin === 0 ? 1 : this.allocate.invData.UnitsMin,
    this.allocate.invData.CasesMin = this.allocate.invData.CasesMin === 0 ? 1 : this.allocate.invData.CasesMin
  }

  //Apply allocate
  public runAllocation(): void {
    if (this.planogramHelper.isPOGLive(this.activeSectionID, true)) {
      return;
    }
    if ((this.allocate.invData.FacingsMax != 0 && this.allocate.invData.FacingsMin > this.allocate.invData.FacingsMax) || (this.allocate.invData.DOSMin > this.allocate.invData.DOSMax && this.allocate.invData.DOSMax != 0) || (this.allocate.invData.UnitsMin > this.allocate.invData.UnitsMax && this.allocate.invData.UnitsMax != 0) || (this.allocate.invData.CasesMin > this.allocate.invData.CasesMax && this.allocate.invData.CasesMax != 0)) {
      this.notifyService.warn('MAX_CONSTRAINT_GREATER_MIN_CONSTRAINT');
      return;
    }
    this.validateConstraints();
    const objType = this.sharedService.lastSelectedObjectDerivedType[this.activeSectionID];
    let val = 'section';
    if (this.allocate.itemsMode === 1) {
      if (objType === AppConstantSpace.POSITIONOBJECT) {
        val = 'position';
      } else if (objType === AppConstantSpace.STANDARDSHELFOBJ || objType === AppConstantSpace.PEGBOARDOBJ || objType === AppConstantSpace.CROSSBAROBJ || objType === AppConstantSpace.SLOTWALLOBJ) {
        val = 'fixture';
      }
    }
    this.planogramService.rootFlags[this.activeSectionID].allocateRetainVals = {
      FacingsMin: this.allocate.invData.FacingsMin,
      FacingsMax: this.allocate.invData.FacingsMax,
      DOSMin: this.allocate.invData.DOSMin,
      DOSMax: this.allocate.invData.DOSMax,
      UnitsMin: this.allocate.invData.UnitsMin,
      UnitsMax: this.allocate.invData.UnitsMax,
      CasesMin: this.allocate.invData.CasesMin,
      CasesMax: this.allocate.invData.CasesMax,
      overrideInv: this.allocate.overrideInv,
      useItems: this.allocate.useItems
    }
    const unqHistoryID = this.historyService.startRecording();
    const IC = {
      MaxFacingsX: this.allocate.invData.FacingsMax,
      MinFacingsX: this.allocate.invData.FacingsMin,
      MaxUnits: this.allocate.invData.UnitsMax,
      MinUnits: this.allocate.invData.UnitsMin,
      MaxCases: this.allocate.invData.CasesMax,
      MinCases: this.allocate.invData.CasesMin,
      MaxDOS: this.allocate.invData.DOSMax,
      MinDOS: this.allocate.invData.DOSMin
    }

    let runInvObj = JSON.parse(JSON.stringify(this.allocate));
    runInvObj.invData = IC;

    const rootObject = this.sharedService.getObject(this.activeSectionID, this.activeSectionID) as Section;
    const ctx = new Context(rootObject);
    this.planogramHelper.runInventoryModelFromTools(ctx,val, this.activeSectionID, runInvObj);
    const selectedObjsList: SelectableList[] = this.planogramService.getSelectedObject(this.activeSectionID);
    this.planogramService.insertPogIDs(selectedObjsList, true);
    rootObject.computeMerchHeight(ctx);
    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject);
    this.render2d.isDirty = true,
    this.planogramService.updateNestedStyleDirty = true;;
    this.sharedService.sectionStyleSub.next(true);
    this.cd.markForCheck();
    this.dialogRef.close();
  }

  //Apply resize Modular
  public applyResizeModular(): void {
    //Get the details get the rootscope object
    //if bay is present take appropriate bay
    //clone it make it's id and id parent as null
    //add mixins of modulars
    //take the width of the bay and add it to the width of the planogram
    //add the location x to the bay
    //make all the shelfs id's and id parents null,
    //if positons are copying make those id and id parents null
    //location xs' of the all the shelfs should be changed
    const activeSectionID = this.sharedService.getActiveSectionId();
    this.addingBay = false;
    this.adjustingSection = false;
    if (this.planogramHelper.isPOGLive(activeSectionID, true) || this.sharedService.isNiciFeatureNotAllowed('ADDMODULAR')) {
      this.notifyService.warn('ADDING_MODULARS_NOT_DONE', 'ok');
      return;
    }
    if (this.resizeObj.noOfMoudlars <= 0) {
      this.resizeObj.noOfMoudlars = 0;
    }

    if (this.resizeObj.noOfMoudlars >= 6) {
      this.resizeObj.noOfMoudlars = null;
    }

    if ((this.resizeObj.noOfMoudlars <= 0 || !this.resizeObj.noOfMoudlars) && this.resizeSectionObj.sectionNewWidth === this.sectionWidth) {
      this.addingBay = false;
      this.adjustingSection = false;

      if (Utils.isNullOrEmpty(this.resizeObj.noOfMoudlars)) {
        this.notifyService.warn('NUMBER_OF_MODULARS_SHOULD_BE_BETWEEN_ONE_AND_FIVE');
      } else {
        this.notifyService.warn('NUMBER_OF_MODULARS_SHOULDNT_BE_ZERO_OR_NEGATIVE_VALUE');
      }
      return;
    } else if (this.resizeObj.noOfMoudlars > 0 && this.resizeObj.modularWidth > 0) {
      this.addingBay = true;
    } else if (this.resizeSectionObj.sectionNewWidth !== this.sectionWidth) {
      this.adjustingSection = true;
    }
    if (this.resizeSectionObj.sectionNewWidth <= 0 && this.resizeObj.modularWidth <= 0 || !this.resizeObj.modularWidth) {
      this.notifyService.warn('MODULAR_WIDTH_CANT_ZERO');
      return;
    }
    else if (this.resizeObj.modularWidth <= 0) {
      //Added due to negative value is not checking properly while apply
      this.notifyService.warn(`Modular Width shouldn't be zero or negative value`);
      return;
    }
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as  Section;
    const ctx = new Context(rootObject);

    if (this.addingBay) {
      if (rootObject.isBayPresents) {
        const unqHistoryID = this.historyService.startRecording();
        rootObject.duplicateModulars(this.modularTemplate, this.resizeObj);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        this.dialogRef.close();
        rootObject.computeMerchHeight(ctx, { 'reassignFlag': null, 'recFlag': true });
        this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject);
        this.planogramService.updateSectionFromTool.next(rootObject)
        this.render2d.isDirty = true,
        this.planogramService.updateNestedStyleDirty = true;;

        // DOM is not rendered fully after changeing anything, we need to add timeout
        // added some extra time to check whether is it working for large pogs
        setTimeout(() => {
          this.sharedService.changeZoomView.next(1);
          this.sharedService.changeZoomView.next(null);
        }, 800);

        this.cd.detectChanges();
      } else {
        this.notifyService.warn('MODULAR_NOT_EXISTS', 'ok');
      }
    } else if (this.adjustingSection) {
      const arrayOfValues = rootObject.Upright.split(',');
      if (arrayOfValues.length > 1 && arrayOfValues[1]) {
        this.notifyService.warn('MODULAR_RESIZE_REMOVE_UPRIGHTS');
        this.dialogRef.close();
      } else {
        const result = rootObject.adjustSectionWidth(this.resizeSectionObj.adjustRightOrLeft, this.resizeSectionObj.sectionNewWidth);
        if (result === 'failed') {
          this.notifyService.warn('MODULAR_RESIZE_NOT_MEETING_MIN_WID_CONSTRAINT');
        }
        this.dialogRef.close();
        // We are adding section, so position height should not be recalculated, and its recalculation change position height
        rootObject.computeMerchHeight(ctx);
        this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject);
        this.planogramService.updateSectionFromTool.next(rootObject)
        this.render2d.isDirty = true,
        this.planogramService.updateNestedStyleDirty = true;;
        this.cd.detectChanges();

        // DOM is not rendered fully after changeing anything, we need to add timeout
        // added some extra time to check whether is it working for large pogs
        setTimeout(() => {
          this.sharedService.changeZoomView.next(1);
          this.sharedService.changeZoomView.next(null);
        }, 800);
      }
      //change the section width and fixture widths on the edges
      //adjustRightOrLeft left - false, right - true
    }
    this.planogramService.refreshModularView.next(true);
  }

  //Apply split shelf
  public applySplitShelf(): void {
    //Get the details get the rootscope object
    //if bay is present take appropriate bay
    //clone it make it's id and id parent as null
    //add mixins of modulars
    //take the width of the bay and add it to the width of the planogram
    //add the location x to the bay
    //make all the shelfs id's and id parents null,
    //if positons are copying make those id and id parents null
    //location xs' of the all the shelfs should be changed
    const activeSectionID = this.sharedService.getActiveSectionId();
    if (this.planogramHelper.isPOGLive(activeSectionID, true) || this.sharedService.isNiciFeatureNotAllowed('SPLITSECTION')) {
      this.notifyService.warn('SPLITING_SECTION_CANT_BE_DONE');
      return;
    }
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as  Section;
    const minWidth = this.sharedService.measurementUnit == 'IMPERIAL' ? 2 : 5;
    if (!this.split.width || this.split.width < minWidth) {
      this.notifyService.warn(`${this.translate.instant('THE_SPECIFIED_SPLIT_INTERVAL_IS_NOT_VALID')} ${minWidth}`, 'ok');
      return;
    }

    if (this.split.width > rootObject.Dimension.Width) {
      this.notifyService.warn('THE_SPECIFIED_SPLIT_INTERVAL_IS_NOT_VALID_SECTION_WIDTH', 'ok');
      return;
    }

    if (parseFloat(rootObject.Upright) && Math.floor(Math.abs(parseFloat(rootObject.Upright) - this.split.width)) !== 0) {
      this.notifyService.warn('UPRIGHT_MISMATCH_MESSAGE', 'ok');
      return;
    }


    this.sharedService.splitChangePOGId.push(rootObject.IDPOG);
    this.log.info(String(this.sharedService.splitChangePOGId), '$rootthis.splitChangePOGId');
    rootObject.splitShelf(this.modularTemplate, SplitPreference.splitShelf, this.split);
    const ctx = new Context(rootObject);
    rootObject.computeMerchHeight(ctx, { 'reassignFlag': null, 'recFlag': true });
    this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject);
    this.planogramService.updateSectionFromTool.next(rootObject)
    this.render2d.isDirty = true,
    this.planogramService.updateNestedStyleDirty = true;;
    this.cd.detectChanges();
    this.dialogRef.close();
  }

  public updateLocaleStorage(data: SortPlanogramOptions): void {
    this.localStorageService.set(LocalStorageKeys.SORT_PLANOGRAM, data)
  }
  private updateSortbySelectedValue(value: number): void {
    const fieldPath = this.getFieldPath(value);
    this.sortByValue = this.getAllPositions(fieldPath);
  }
  private updateoptionsFromLocalstorage(): void { //get sort options from localstorage
    let sortPlanogramData = this.localStorageService.get<SortPlanogramOptions>(LocalStorageKeys.SORT_PLANOGRAM);
    if (sortPlanogramData) {
      this.sequenceTypeSelected = sortPlanogramData.sequenceTypeSelected;
      this.sortTypeSelected = sortPlanogramData.sortTypeSelected;
      this.intelligentOption = sortPlanogramData.intelligentOption;
      this.fileName = sortPlanogramData.fileName;
      this.excelData = sortPlanogramData.excelData;
    }
  }
  //Apply sort planogram
  public applySortByPlanogram(): boolean {
    const guid = this.PanelMapper.panelPointer[this.panelID].globalUniqueID;
    if (guid == '') return false;
    const activeSectionID = this.sharedService.getActiveSectionId();
    const rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as  Section;
    if (this.planogramHelper.isPOGLive(activeSectionID, true)) {
      this.notifyService.warn('SORT_PLANOGRAM_CANT_ALLOW');
      return;
    }
    const currObj = this.planogramService.getCurrentObject(guid);
    let constraints = {
      'sortBy': this.sortTypeSelected,
      'sequenceBy': this.sequenceTypeSelected,
      'excelData': this.sortTypeSelected === 0 ? 'excelData' : this.sortByValue
    }
    const ctx = new Context(rootObject);
    if (!isUndefined(this.sortTypeSelected) && !isUndefined(this.sequenceTypeSelected) && this.sortTypeSelected != this.translate.instant('CHOOSE_OPTION') && this.sequenceTypeSelected != this.translate.instant('CHOOSE_OPTION')) {
      if (this.sortTypeSelected == 0) {
        if (this.excelData.length && this.excelData[0])
          if (this.intelligentOption) {
            this.planogramHelper.sequenceSortPlanogram(ctx, currObj, this.excelData, constraints);
          } else {
            this.planogramHelper.intelligentSortPlanogram(ctx,currObj, this.excelData, constraints);
          }

      } else {
        this.sortByValue ? this.sortByValue:this.updateSortbySelectedValue(this.sortTypeSelected);
        if (this.intelligentOption) {
          this.planogramHelper.sequenceSortPlanogram(ctx, currObj, this.sortByValue, constraints);
        } else {
          this.planogramHelper.intelligentSortPlanogram(ctx, currObj, this.sortByValue, constraints);
        }

      }
    }
    this.planogramService.updateSectionObjectIntoStore(rootObject.IDPOG, rootObject)
    this.planogramService.updateNestedStyleDirty = true;;
    this.sharedService.updateAnnotationPosition.next(true);
    const sortData: SortPlanogramOptions = {
      'sortTypeSelected': this.sortTypeSelected,
      'sequenceTypeSelected': this.sequenceTypeSelected,
      'intelligentOption': this.intelligentOption,
      'excelData': this.excelData,
      'fileName': this.fileName
    }
    this.updateLocaleStorage(sortData);
    this.dialogRef.close();
  }

  public trackSequenceList(index: number, item: ItemList): number {
    return item.value;
  }
  public tracksortOption(index: number): number {
    return index;
  }
}
