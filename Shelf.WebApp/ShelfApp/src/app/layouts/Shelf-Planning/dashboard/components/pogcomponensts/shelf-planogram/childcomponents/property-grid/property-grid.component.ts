import {
    Component,
    EventEmitter,
    Inject,
    Input,
    OnDestroy,
    OnInit,
    Optional,
    Output,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { DatePipe } from '@angular/common';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { each, cloneDeep, find, isUndefined, has, indexOf, filter } from 'lodash-es';
import { Subscription } from 'rxjs';
import {
    AppConstantSpace,
    Utils,
    PosIntersectionArray,
    FixtureIntersectionArray,
    PogIntersectionArray,
} from 'src/app/shared/constants';
import {
    Dictionary,
    PogSideNaveView,
    IApiResponse,
    PropertyStoreList,
    Performance,
    PogProfileSignatureSettings,
    FixtureImageSide,
    UprightType,
    PropertyGridParams,
    LookUpRecords,
    LookUpChildOptions,
    StoreAppSettings,
    AllSettings,
    PropertyPaneType,
    ProductPackageSummary,
} from 'src/app/shared/models';
import {
    PlanogramSaveService,
    PlanogramStoreService,
    PogSideNavStateService,
    HistoryService,
    PlanogramService,
    SharedService,
    PropertyGridService,
    PropertyFieldService,
    Planogram_2DService,
    PlanogramPerformanceService,
    PlanogramHelperService,
    PlanogramLibraryService,
    UserPermissionsService,
    QuadtreeUtilsService,
    AllocateService,
    NotifyService,
    ParentApplicationService,
    CollisionService,
    DictConfigService,
    Render2dService,
    UprightService,
    LanguageService,
    PropertyGridPegValidationService,
} from 'src/app/shared/services';
import { PogProfileEditorComponent } from '../property-grid/pog-profile-editor/pog-profile-editor.component';
import { UprightEditorComponent } from '../property-grid/upright-editor/upright-editor.component';
import { DividerEditorComponent } from '../property-grid/divider-editor/divider-editor.component';
import { GrillEditorComponent } from '../property-grid/grill-editor/grill-editor.component';
import { ImageryComponent } from '../property-grid/imagery/imagery.component';
import { ChangeHierarchyComponent } from '../property-grid/change-hierarchy/change-hierarchy.component';
import { AllocateNpiService, CrunchMode, CrunchModeService, DataValidationService, PlanogramCommonService, ShoppingCartService } from 'src/app/shared/services/layouts';
import { FixtureList, MerchandisableList, SelectableList } from 'src/app/shared/services/common/shared/shared.service';
import { Modular, Position, Section, ShoppingCart } from 'src/app/shared/classes';
import { TabChildren, ConfigPropertyDisplay, PropertyGridSettings, TabOptions } from 'src/app/shared/models/property-grid/settings';
import { Context } from 'src/app/shared/classes/context';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { ActivatedRoute, Params } from '@angular/router';
import { AllocateUtilitiesService } from 'src/app/shared/services/layouts/allocate/utilities/allocate-utilities.service';
import { PropertyGridTemplateComponent } from './property-grid-template/property-grid-template.component';
import { SortPipe } from 'src/app/shared/pipe';
import { PegLibraryService, SpinnerService } from 'src/app/shared/services/common';
import { FixtureType } from 'src/app/shared/models/planogram';
@Component({
    selector: 'shelf-property-grid',
    templateUrl: './property-grid.component.html',
    styleUrls: ['./property-grid.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class PropertyGridComponent implements OnInit, OnDestroy {
    @Input('state') state: boolean = false;
    @Input('isPin') isPin: boolean;
    @Output() onPinUnpintoggle: EventEmitter<boolean> = new EventEmitter();
    @Output() viewComponentInSideNav: EventEmitter<boolean> = new EventEmitter();
    @Output() getWidth: EventEmitter<number> = new EventEmitter();

    uprightTypeSelection: boolean = false;
    public uprightsPositionsArr: number[] = [];
    public fixedUpright: number;
    public absKeyGroup = AppConstantSpace.ABSKEYGROUP;
    private sectionID: string;
    public propertyGridType: string = '';
    public tabList: PropertyGridParams;
    private fieldObj: any = {}; //TODO: @Menaha - fieldObj is using crunchOptions is pushed to LookUpChildOptions items. Have to check its type
    private lookUpHolder: LookUpRecords;
    private ABSFiledsList = {};
    private fixtureIDDictionaries: any = [];
    private selectedFixtures: SelectableList[] = [];
    private selectedMultiPositions: SelectableList[] = [];
    public isMultiFixMode: boolean;
    public MULTIPLE_VALUES: string;
    public get AppSettingsSvc(): StoreAppSettings {
        return this.planogramStore.appSettings;
    }
    private oldValue: string | number | boolean | Date = null;
    public itemData: SelectableList = null;
    private idFixTypesList: string[] = [];
    private newIDPackageAttribute;
    private originalData: any = {};
    private dictRecordsCache = {};
    private dialogIdDictionary = [];
    private datasource: Section;
    public sideNavWidth: number;
    private isUndoRequiredLibrary: boolean;
    public ABSStoreNumber: PropertyStoreList[] = [];
    private isMultiple: boolean = false;
    private skeletonDateTimeFormat: string;
    public headerName: string;
    public imageSrc: string;
    public changedValue: string | boolean | number | Date;
    public isListViewSetting: boolean = false;
    public showSearchBox: boolean = false;
    public imageSrcs: { front?: string; back?: string; right?: string; left?: string; top?: string; bottom?: string } =
        {};
    @ViewChild('propertyTabGroup') propertyTabGroup;
    @ViewChild("pGTemplate") pGTemplate: PropertyGridTemplateComponent;
    private subscriptions: Subscription = new Subscription();
    public allPropertyListViewData: ConfigPropertyDisplay[] = [];
    public configList: ConfigPropertyDisplay[] = [];
    public searchText: string = '';
    public translationObj = {};
    public expandCount: number = 4;
    public listClientHeight: number = 0;
    private isAutomationMode: boolean = false;
    private isMovement: boolean = false;
    private isDefaultMovement: boolean = false;
    private multiFixArray: string[] = ['MULTIFIXEDIT', 'Multiple'];
    public issettingsloaded: boolean;
    private isPegTag: boolean = false;
    private isFrontSpacingReadonly = false;
    private sortPipe: SortPipe;
    // TODO: ctor params - private readonly
    // remove references from HTML
    private positionIDDictionaries: any = [];
    private multiPositionHeaderFields: { totalCapacity: number, UPC: string[], UPCOnTooltip: string } = {
        totalCapacity: 0,
        UPC: [],
        UPCOnTooltip: ''
    };
    private IDFixtureTypesApplicable: number[] = [];
    public avilablePkgStyleList: ProductPackageSummary[] = [];
    public selectedPkgStyle: number;
    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly propertyGridService: PropertyGridService,
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly translate: TranslateService,
        private readonly planogramService: PlanogramService,
        public readonly propertyFieldService: PropertyFieldService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly userPermissions: UserPermissionsService,
        @Optional() private readonly matDialog: MatDialog,
        @Optional() private readonly dialogRef: MatDialogRef<PropertyGridComponent>,
        private readonly planogram_2DService: Planogram_2DService,
        private readonly quadtreeUtilsService: QuadtreeUtilsService,
        private readonly historyService: HistoryService,
        private readonly notifyService: NotifyService,
        private readonly datePipe: DatePipe,
        private readonly allocateService: AllocateService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly planogramPerformanceService: PlanogramPerformanceService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly collection: CollisionService,
        private readonly dataValidation: DataValidationService,
        private readonly crunchMode: CrunchModeService,
        private readonly dictConfigService: DictConfigService,
        private readonly render2d: Render2dService,
        private readonly languageService: LanguageService,
        @Optional() @Inject(MAT_DIALOG_DATA) public data: any,
        private readonly uprightService: UprightService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly activeRoute: ActivatedRoute,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly allocateUtils: AllocateUtilitiesService,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly spinner: SpinnerService,
        private readonly propertyGridPegValidationService: PropertyGridPegValidationService,
        private readonly pegLibraryService: PegLibraryService,
        private readonly planogramHelperService: PlanogramHelperService
    ) {
        this.isMultiple = data == true ? true : false;
        this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
        this.sortPipe = new SortPipe();
    }
    get isListView(): boolean{
      return this.planogramStore.appSettings.propertygrid_default_view === 2;
    }

    public ngOnInit(): void {
        this.isMultiple = this.sharedService.fixtureTypeMultiple;
        this.sideNavWidth = this.PogSideNavStateService.propertiesView.width;
        this.MULTIPLE_VALUES = this.translate.instant('...');
        this.sectionID = this.sharedService.getActiveSectionId();
        this.isListViewSetting = this.sharedService.isListViewSetting;
        this.lookUpHolder = this.planogramStore.lookUpHolder;
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (this.planogramService.rootFlags[this.sectionID]?.selectionCount == 0) {
            this.planogramService.addToSelectionByObject(this.datasource, this.sectionID);
        }
        this.sharedService.pog_profile_signature_detail_settings.forEach((item: PogProfileSignatureSettings) => {
            if (item.IsUDP) {
                item.value = '';
            }
        });
        let allCrunchOptions: LookUpChildOptions<any>[] = this.lookUpHolder.CrunchMode.options;

        this.fieldObj.crunchOptions = [];
        //commented For Adjacent shelves having span left is considered as a single shelf.
        allCrunchOptions.forEach((item, key) => {
            this.fieldObj.crunchOptions.push(item);
        });
        this.setupWithData();
        this.getPropertyGridTemplate();
        this.registerEvents();
        this.translationObj = {
            POG: 'SECTION',
            Fixture: 'PANEL_HEADER_FIXTURE',
            Position: this.selectedMultiPositions.length > 1 ? 'MULTIPLE_POSITION_EDIT' : 'PANEL_HEADER_POSITION',
            MULTIFIXEDIT: 'MULTIPLE_FIXTURE_EDIT'
        };

        this.subscriptions.add(
            this.activeRoute.queryParams.subscribe((params: Params) => {
                this.isAutomationMode = params.mode === "Automation";
            })
        );
        this.subscriptions.add(
            this.propertyGridService.updatePackageStyle.subscribe((result: boolean) => {
                this.tabList.tab.forEach((tObj) => {
                    tObj.children.forEach((fObj) => {
                        if(fObj.IDDictionary === 392){//to update packageStyle dropdown
                            this.pGTemplate.prepareFieldArray(fObj);
                        }

                    });
                });
            }),
        );
        //to update property grid dropdowns
        this.subscriptions.add(
          this.propertyGridService.updatePropertyGridMetaData.subscribe((dictionary: number) => {
              this.tabList.tab.forEach((tObj) => {
                  tObj.children.forEach((fObj) => {
                      if(fObj.IDDictionary === dictionary){
                          this.pGTemplate.prepareFieldArray(fObj);
                      }

                  });
              });
          }),
      );
    }

    public ngAfterViewChecked(): void {
        this.listClientHeight = document.getElementById('propertyListView')?.clientHeight;
        this.matListHeight();
    }

    private registerEvents(): void {
        this.subscriptions.add(
            this.sharedService.propertyGridUpdateData.subscribe((respose: boolean) => {
                if (respose) {
                    this.sectionID = this.sharedService.getActiveSectionId();
                    this.isMultiple = this.sharedService.fixtureTypeMultiple;
                    this.tabList;
                    this.fixtureIDDictionaries.length = 0;
                    this.setupWithData();
                    this.getPropertyGridTemplate();
                    this.openTab(this.propertyGridService.selectedPropertiesTabIndex[this.propertyGridType]);
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.updatePosPropertGrid.subscribe((response) => {
                if (response) {
                    if (this.sharedService.getSelectedId(this.sectionID).length > 1 && this.propertyGridType === PropertyPaneType.Position){
                        this.itemData = this.getItemDataForMultiPositionEdit();
                        this.multiPositionHeaderFields.totalCapacity = 0;
                        this.selectedMultiPositions.forEach(item => {
                            this.multiPositionHeaderFields.totalCapacity = item.Position.Capacity + this.multiPositionHeaderFields.totalCapacity;
                        });
                        this.setSelectedPkgStyle();
                    }
                    this.updateValue(this.itemData);
                    this.updateListValue(this.itemData);
                    this.getPropertyGridTemplate();
                }
            }),
        );
    }

    private getPropertyGridTemplate(): void {
        let settings: PropertyGridParams;
        switch (this.propertyGridType) {
            case PropertyPaneType.Position:
                settings = this.propertyGridService.positionSettings;
                this.headerName = this.selectedMultiPositions.length > 1 ? this.translate.instant('MULTIPLE_POSITION') : this.translate.instant('POSITION');
                break;
            case PropertyPaneType.Fixture:
                settings = this.propertyGridService.fixtureSettings;
                this.headerName = this.translate.instant('FIXTURE');
                break;
            case PropertyPaneType.POG:
                settings = this.propertyGridService.sectionSettings;
                this.headerName = this.translate.instant('SECTION');
                break;
            case PropertyPaneType.Multiple:
                settings = this.propertyGridService.multiFixSettings;
                this.headerName = this.translate.instant('MULTIPLE_FIXTURE');
                break;
        }
        this.IDFixtureTypesApplicable = [];
        let selectedObjType = this.selectedMultiPositions?.length ? AppConstantSpace.POSITIONOBJECT : this.selectedFixtures?.length ? this.selectedFixtures[0].ObjectType : AppConstantSpace.SECTIONOBJ;
        if (selectedObjType == AppConstantSpace.FIXTUREOBJ) {
          this.IDFixtureTypesApplicable = [... new Set(this.selectedFixtures.map(fixture => fixture.Fixture.IDFixtureType))];
        } else if (selectedObjType == AppConstantSpace.POSITIONOBJECT) {
          this.selectedMultiPositions.forEach(pos => {
            if (!this.IDFixtureTypesApplicable.includes(pos.Fixture.FixtureDerivedType || pos['parent'].Fixture.FixtureDerivedType)) {
              this.IDFixtureTypesApplicable.push(FixtureType[(pos.Position._FixtureDerivedType.DescData || pos['parent'].Fixture.FixtureDerivedType) as keyof typeof FixtureType]);
            }
          })
        }
        this.tabList = cloneDeep(settings);
        if (settings != undefined) {
          this.tabList.tab.forEach((element) => {
            element.hideTab = true;
            element.children = this.filterApplicableProperties([...element.children]);
            each(element.group, (gObj) => {
              gObj.children = this.filterApplicableProperties([...gObj.children]);
              if(gObj.children.length > 0){
                element.hideTab = false;
              }
            });
            element.hideTab = element.hideTab && element.children.length > 0 ? false : element.hideTab;
          });
          this.tabList.header.children = this.filterApplicableProperties([...this.tabList.header.children]);
          this.tabList.tab.forEach((element) => {
            this.createSection(element.children, this.propertyGridType, this.itemData);
            each(element.group, (gObj) => {
              this.createSection(gObj.children, this.propertyGridType, this.itemData);
              each(gObj.table?.rows, (tablChild)=>{
                this.createSection(tablChild.children, this.propertyGridType, this.itemData);
              });
            });
          });
          this.createSection(this.tabList.header.children, this.propertyGridType, this.itemData);
        }
        this.listViewDataCreation(this.propertyGridService.allPropertyViewData, true, true);
        this.configList = JSON.parse(JSON.stringify(this.propertyGridService.configPropertyList));
        this.listViewDataCreation(this.configList, false);
    }

    public getFilteredTabs() {
        return this.tabList.tab.filter(tb => !tb.hideTab);
    }

    private filterApplicableProperties(obj, key?: string) {
      if (!key) {
        key = this.propertyGridType;
      }
      let overridableDictionaries = {};
      if (key == PropertyPaneType.Position) {
        overridableDictionaries = this.propertyGridService.positionSettings['overrideApplicability'];
      } else if ([PropertyPaneType.Fixture.toString(), PropertyPaneType.Multiple.toString()].includes(key)) {
        overridableDictionaries = this.propertyGridService.fixtureSettings['overrideApplicability'];
      }
      obj && obj.length && this.IDFixtureTypesApplicable.forEach(IDFixtureType => {
        obj = obj.filter(item => {
          let fObj = item as any;
          if (!fObj.Applicability) {
            return true;
          } else if (!Utils.isNullOrEmpty(IDFixtureType)) {
            let overrideList = overridableDictionaries ? overridableDictionaries[IDFixtureType] : [];
            if (overrideList && overrideList.includes(fObj.IDDictionary)) {
              return true;
            }
            return fObj.Applicability.split(',').includes(IDFixtureType.toString());
          } else {
            return true;
          }
        });
      });
      return obj;
    }
    private createSection(
        obj: TabChildren[],
        objType: string,
        fieldData: SelectableList,
        verifyreadOnly: boolean = true,
    ): void {
        for (const fObj of obj) {
            fObj.keyGroup == AppConstantSpace.ABSKEYGROUP && (this.ABSFiledsList['' + fObj.IDDictionary + ''] = fObj);
            if (fObj.text) {
                fObj.translatedText = this.strTranslate(fObj.text);
            }
            if (fObj.field != 'Position.attributeObject.Color') {
                let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, fieldData);
                if ((this.propertyGridType === PropertyPaneType.Multiple ||
                    this.propertyGridType === PropertyPaneType.Fixture ||
                    this.propertyGridType === PropertyPaneType.Position) && value === '<multiple values>') {
                    fObj[fObj.field] = '';
                } else if (fObj.AttributeType === 'Calculated' && fObj.placeholder === '<multiple values>') {
                    fObj[fObj.field] = this.selectedMultiPositions.length > 1 ? '' : value;
                } else {
                    if (fObj.type == 'bool' && this.selectedFixtures.length === 1) {
                        fObj.customClass = '';
                    }
                    fObj[fObj.field] =
                        fObj.type == 'date' && value
                            ? this.datePipe.transform(new Date(value as any) as Date, this.skeletonDateTimeFormat)
                            : value;
                }
            }
            //// Note : This condition will never satisfied as if field is _IsSpanAcrossShelf then first if will automatically true.
            // else if (fObj.field === '_IsSpanAcrossShelf') {
            //     const field: string = `${fObj.field}.FlagData`;
            //     fObj[field] = this.sharedService.getObjectField(undefined, field, undefined, fieldData);
            // }
            else {
                fObj[fObj.field] = this.sharedService.getObjectField(
                    undefined,
                    `${fObj.field}_color`,
                    undefined,
                    fieldData,
                );
            }
            if (verifyreadOnly) {
                if (fObj.IsDialog) {
                    if (fObj.field == 'Position.IDPackage') {
                    } else if (fObj.keyGroup == AppConstantSpace.ABSKEYGROUP && fObj.changeHierarchy) {
                        fObj[`changeHierarchy`] = fObj.changeHierarchy;
                    } else {
                        fObj[`changeHierarchy`] = false;
                        this.dialogIdDictionary.push(fObj.IDDictionary);
                    }
                }
                fObj.ReadOnly = false;
                if (this.selectedMultiPositions.length > 1 && this.propertyGridType === PropertyPaneType.Position) {
                    this.setUpReadOnlyFieldsForMulitiPositionEdit(fObj, objType);
                } else {
                    this.setUpReadOnlyFields(fObj, objType, fieldData);
                }
            }
            fObj.placeholder = Utils.isNullOrEmpty(fObj.placeholder) ? '' : fObj.placeholder;
        }
    }

    //Postion
    public selectSectionFirstItem(): void {
        const parent: SelectableList = this.sharedService.getObject(
            this.itemData.$idParent,
            this.itemData.$sectionID,
        ) as SelectableList;
        if (Utils.checkIfShoppingCart(parent)) {
            let fixture = cloneDeep(parent);
            fixture.Children = this.sortPipe.transform(fixture.Children, {'col':fixture.orderBy.predicate,'sortReverse':fixture.orderBy.reverse,'orders':fixture.orderBy.orders});
            this.planogram_2DService.selectSectionFirstItem(fixture);
            this.shoppingCartService.checkForChangeInCart.next(false);
        } else {
            this.planogram_2DService.selectSectionFirstItem();
            this.sharedService.itemSelection.next({
                pogObject: this.itemData,
                view: '',
            });
        }
        this.setupWithData();
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
    }

    public selectSectionLastItem(): void {
        const parent = this.sharedService.getObject(
            this.itemData.$idParent,
            this.itemData.$sectionID,
        ) as SelectableList;
        if (Utils.checkIfShoppingCart(parent)) {
            let fixture = cloneDeep(parent);
            fixture.Children = this.sortPipe.transform(fixture.Children, {'col':fixture.orderBy.predicate,'sortReverse':fixture.orderBy.reverse,'orders':fixture.orderBy.orders});
            this.planogram_2DService.selectSectionLastItem(fixture);
            this.shoppingCartService.checkForChangeInCart.next(false);
        } else {
            this.planogram_2DService.selectSectionLastItem();
            this.sharedService.itemSelection.next({
                pogObject: this.itemData,
                view: '',
            });
        }
        this.setupWithData();
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
    }

    //Getting Obect model for grills
    public selectNextPosition(): void {
        const parent = this.sharedService.getObject(this.itemData.$idParent, this.itemData.$sectionID) as
            | MerchandisableList
            | ShoppingCart;
        if (Utils.checkIfShoppingCart(parent)) {
            let fixture = cloneDeep(parent);
            fixture.Children = this.sortPipe.transform(fixture.Children, {'col':fixture.orderBy.predicate,'sortReverse':fixture.orderBy.reverse,'orders':fixture.orderBy.orders});
            this.planogram_2DService.selectNextPosition(fixture, this.itemData as Position);
            this.shoppingCartService.checkForChangeInCart.next(false);
        } else {
            this.planogram_2DService.selectNextPosition();
            this.sharedService.itemSelection.next({
                pogObject: this.itemData,
                view: '',
            });
        }
        this.setupWithData();
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
    }

    public selectPreviousPosition(): void {
        const parent = this.sharedService.getObject(this.itemData.$idParent, this.itemData.$sectionID) as
            | MerchandisableList
            | ShoppingCart;
        if (Utils.checkIfShoppingCart(parent)) {
            let fixture = cloneDeep(parent);
            fixture.Children = this.sortPipe.transform(fixture.Children, {'col':fixture.orderBy.predicate,'sortReverse':fixture.orderBy.reverse,'orders':fixture.orderBy.orders});
            this.planogram_2DService.selectPreviousPosition(fixture, this.itemData as Position);
            this.shoppingCartService.checkForChangeInCart.next(false);
        } else {
            this.planogram_2DService.selectPreviousPosition();
            this.sharedService.itemSelection.next({
                pogObject: this.itemData,
                view: '',
            });
        }
        this.setupWithData();
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
    }

    public selectHomeItem(): void {
        this.planogram_2DService.selectHomeItem();
        this.applyOnGrid();
    }

    public selectEndItem(): void {
        this.planogram_2DService.selectEndItem();
        this.applyOnGrid();
    }

    //Fixture
    public selectNextFixture(): void {
        this.planogram_2DService.selectNextFixture();
        this.applyOnGrid();
    }

    public selectPreviousFixture(): void {
        this.planogram_2DService.selectPreviousFixture();
        this.applyOnGrid();
    }

    public selectSectionFirstItemFixture(): void {
        this.planogram_2DService.selectSectionFirstItemFixture();
        this.applyOnGrid();
    }

    public selectSectionLastItemFixture(): void {
        this.planogram_2DService.selectSectionLastItemFixture();
        this.applyOnGrid();
    }

    public selectHomeItemFixture(): void {
        this.planogram_2DService.selectHomeItemFixture();
        this.applyOnGrid();
    }

    public selectEndItemFixture(): void {
        this.planogram_2DService.selectEndItemFixture();
        this.applyOnGrid();
    }
    private applyOnGrid(): void {
        this.setupWithData();
        this.getPropertyGridTemplate();
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
        this.sharedService.itemSelection.next({
            pogObject: this.itemData,
            view: '',
        });
        this.sharedService.styleModuleSelect.next(true);
    }

    public selectedItemInvoked(): string {
        if (this.sectionID == '' || isUndefined(this.sectionID)) return '';
        const len: number = this.planogramService.rootFlags[this.sectionID].selectionCount;
        return this.sharedService.getSelectedId(this.sectionID)[len - 1];
    }

    private setupWithData(): void {
        if (this.sectionID) {
            const selectedIDs: string[] = this.sharedService.getSelectedId(this.sectionID);
            const lastID: string = this.selectedItemInvoked();
            if (lastID != '' && !isUndefined(lastID)) {
                this.itemData = this.sharedService.getObject(lastID, this.sectionID) as SelectableList;
                //checking for multi position edit
                this.selectedMultiPositions = [];
                this.multiPositionHeaderFields.UPC = [];
                this.multiPositionHeaderFields.totalCapacity = 0;
                this.multiPositionHeaderFields.UPCOnTooltip = '';
                this.selectedMultiPositions = this.itemData.ObjectDerivedType == 'Position' ? this.sharedService.selectedID[this.sectionID].map((itm) => this.sharedService.getObject(itm, this.sectionID)) : [];
                this.translationObj[PropertyPaneType.Position] = this.selectedMultiPositions.length > 1 ? this.translate.instant('MULTIPLE_POSITION_EDIT') : this.translate.instant('POSITION');
                this.avilablePkgStyleList = this.itemData.ObjectDerivedType == 'Position' ? this.itemData.Position.AvailablePackageType : [];
                if (this.selectedMultiPositions.length > 1 && this.itemData.ObjectDerivedType == 'Position') {
                    this.setSelectedPkgStyle();
                    this.itemData = this.getItemDataForMultiPositionEdit();
                    this.setUpAvailablePackageStyleList();
                    this.propertyGridType = this.itemData.ObjectType;
                    this.selectedMultiPositions.forEach(item => {
                        this.multiPositionHeaderFields.totalCapacity = item.Position.Capacity + this.multiPositionHeaderFields.totalCapacity;
                        this.multiPositionHeaderFields.UPC.push(item.Position.Product.UPC);
                    });
                    this.multiPositionHeaderFields.UPCOnTooltip = this.multiPositionHeaderFields.UPC.join(', ');
                } else {
                    if (this.selectedMultiPositions.length === 1) {
                        // To reset the placeholder and checkbox
                        this.getItemDataForMultiPositionEdit();
                    }
                    this.setupDataForSelectedObject(lastID, selectedIDs);
                }
            }
        }
    }

    private setSelectedPkgStyle(): void{
        const selectedPkgStyle = this.selectedMultiPositions[0].Position.AvailablePackageType.find(x => x.IDPackage == this.selectedMultiPositions[0].Position.IDPackage);
        this.selectedPkgStyle = selectedPkgStyle?.IdPackageStyle;
        for (const pos of this.selectedMultiPositions) {
            const posPkgStyle = pos.Position.AvailablePackageType.find(x => x.IDPackage == pos.Position.IDPackage);
            if (posPkgStyle.IdPackageStyle != selectedPkgStyle.IdPackageStyle) {
                this.selectedPkgStyle = undefined;
                break;
            }
        }
    }

    private setUpAvailablePackageStyleList() {
        for (const positionItem of this.selectedMultiPositions) {
            if (this.avilablePkgStyleList.length > 0) {
                this.avilablePkgStyleList = positionItem.Position.AvailablePackageType.filter(ps => this.avilablePkgStyleList.some(fps => fps.IdPackageStyle === ps.IdPackageStyle));
                const tempAvilablePkgStyleList = [];
                this.avilablePkgStyleList.forEach(item => {
                    const latestStyle = this.getLatestAvailablePkgStyle(this.avilablePkgStyleList, item.IdPackageStyle);
                    if (!tempAvilablePkgStyleList.find(x => x.IdPackageStyle === latestStyle.IdPackageStyle)) {
                        tempAvilablePkgStyleList.push(latestStyle);
                    }
                });
                this.avilablePkgStyleList = tempAvilablePkgStyleList;
            }
        }
    }

    private getLatestAvailablePkgStyle(avilablePkgStyleList: ProductPackageSummary[], idPackageStyle: number): ProductPackageSummary {
        let samePkgStyle = avilablePkgStyleList.filter(ps => ps.IdPackageStyle === idPackageStyle);
        if (samePkgStyle.length > 1) {
            return samePkgStyle.reduce((a, b) => {
                return new Date(a.ModifiedTs).getTime() > new Date(b.ModifiedTs).getTime() ? a :
                    (new Date(a.ModifiedTs).getTime() == new Date(b.ModifiedTs).getTime() && a.IDPackage > b.IDPackage ? a : b);
            });
        } else {
            return samePkgStyle[0];
        }
    }

    private setupDataForSelectedObject(lastID: string, selectedIDs: string[]): void {
        this.isMultiFixMode = false;
        this.selectedFixtures.length = 0;
        this.selectedFixtures[0] = this.sharedService.getObject(lastID, this.sectionID) as SelectableList;
        this.itemData = this.sharedService.getObject(lastID, this.sectionID) as SelectableList;
        if (this.isMultiple) {
            this.propertyGridType = PropertyPaneType.Multiple;
            this.selectedFixtures = (
                this.sharedService.getObject(this.sectionID, this.sectionID) as Section
            ).getAllLimitingShelves();
            if (this.selectedFixtures.length == 1) {
                //remove all selection
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionByObject(this.selectedFixtures[0], this.sectionID);
                this.itemData = this.selectedFixtures[0] as SelectableList;
                this.isMultiple = false;
            }
        }
        this.propertyGridType = this.itemData.ObjectType;

        if (
            (this.itemData.ObjectType == AppConstantSpace.FIXTUREOBJ && selectedIDs.length > 1) ||
            this.isMultiple || this.itemData.ObjectType == AppConstantSpace.MULTIFIXEDIT
        ) {
            this.isMultiple
                ? (this.propertyGridType = PropertyPaneType.Multiple)
                : (this.selectedFixtures = selectedIDs.map(
                    (itm) => this.sharedService.getObject(itm, this.sectionID) as SelectableList,
                ));
            this.isMultiFixMode = true;
            this.itemData = this.getItemDataForMultiFix(this.selectedFixtures) as FixtureList;
        }
        // //@LOG ADDED
        // //Log.info('Property Grid shown for $id:' + lastID + ', ObjectType: ' + $public propertyGridType + ', IDPOG:' + this.itemData.IDPOGObject);
        if (this.itemData.ObjectDerivedType == AppConstantSpace.SECTIONOBJ || this.isListView) {
            this.datasource.PogProfile.Code = this.datasource.POGQualifier =
                this.planogramSaveService.autoGeneratePogQualifier(this.datasource);
        }
        if (
            this.itemData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
            this.itemData.Position.IDMerchStyle == null
        ) {
            this.setUpIDMerchStyle();
        }
        this.imageSrc = this.getImage();
        this.imageSrcs.front = this.getImage('front');
        this.imageSrcs.back = this.getImage('back');
        this.imageSrcs.right = this.getImage('right');
        this.imageSrcs.left = this.getImage('left');
        this.imageSrcs.top = this.getImage('top');
        this.imageSrcs.bottom = this.getImage('bottom');
    }

    private getItemDataForMultiFix(multiFixs: any): FixtureList {
        let fsetting: PropertyGridParams = this.propertyGridService.fixtureSettings;
        var itemData: FixtureList = cloneDeep(multiFixs[0]);
        this.fixtureIDDictionaries.length = 0;
        fsetting.tab.forEach((tObj) => {
            tObj.children.forEach((fObj) => {
                this.fixtureIDDictionaries.push(fObj);
            });
            tObj.group.forEach((gObj) => {
                gObj.children.forEach((fObj) => {
                    this.fixtureIDDictionaries.push(fObj);
                });
            });
        });
        for (const fixIdDic of this.fixtureIDDictionaries) {
            let fixDic = fixIdDic;
            if (fixDic.IDDictionary == 341) continue;
            let fieldPath = fixDic.field,
                newVal = null,
                val = null;
            for (const mFix of multiFixs) {
                const fixtureItm = mFix;
                this.idFixTypesList[fixtureItm.Fixture.IDFixtureType] = fixtureItm.ObjectDerivedType;
                newVal = this.sharedService.getObjectField(undefined, fieldPath, undefined, fixtureItm);
                fixDic.type == 'bool' &&
                    $(`.field-${fixDic.IDDictionary}.input-component-body input`).prop({
                        indeterminate: false,
                    });
                $(`.field-${fixDic.IDDictionary}.input-component-body input`).attr('placeholder', '');
                //For hasDividers and HasGrills values need to check if types also same or not.
                fixDic.IDDictionary == 3668 && newVal && (newVal = fixtureItm.Fixture.LKDividerType);
                if (val != null && val != newVal) {
                    if (fixDic.IDDictionary == 3668) {
                        var shelf = filter(itemData.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
                        shelf && ((shelf.Fixture.LKDividerType = 0), (itemData.Fixture.LKDividerType = 0));
                        val = false;
                        break;
                    } else if (fixDic.IDDictionary == 640) {
                        var grillItemData = filter(itemData.Children, {
                            ObjectDerivedType: AppConstantSpace.GRILLOBJ,
                        })[0];
                        grillItemData && (grillItemData.Fixture._GrillPlacement.ValData = 1);
                        itemData.Fixture.Grills &&
                            itemData.Fixture.Grills[0] &&
                            (itemData.Fixture.Grills[0].Fixture._GrillPlacement.ValData = 1);
                        val = false;
                        break;
                    }
                    val = '<multiple values>';
                    setTimeout(() => {
                        $(`.field-${fixDic.IDDictionary} .disable-active .input-component-body input`).attr('placeholder', val);
                        $(`.field-${fixDic.IDDictionary} .input-component-body input`).attr('placeholder', val);
                        fixDic.type == 'bool' &&
                            $(`.field-${fixDic.IDDictionary} .input-component-body mat-checkbox`).addClass(
                                'mat-checkbox-indeterminate',
                            );
                        $(`.field-${fixDic.IDDictionary} .input-component-body mat-checkbox`).addClass(
                            'mat-checkbox-checked',
                        );
                    });
                    break;
                }
                val = newVal;
            }
            fixDic.AttributeType != 'Calculated' &&
                this.sharedService.setObjectField(undefined, fieldPath, val, undefined, itemData);
        }
        return itemData;
    }

    private setUpReadOnlyFieldsForMulitiPositionEdit(fieldObj: TabChildren, objType) {
        for (const positionItem of this.selectedMultiPositions) {
            if (fieldObj.field === 'Position.IDPackage' && this.avilablePkgStyleList.length === 0) {
                fieldObj.ReadOnly = true;
                break;
            }
            this.setUpReadOnlyFields(fieldObj, objType, positionItem);
            if (fieldObj.ReadOnly) {
                break;
            }
        }
    }

    private setUpReadOnlyFields(fieldObj: TabChildren, objType: string, fieldData: SelectableList): void {
        this.isDefaultMovement = fieldObj.field === 'IDPerfPeriod' ? fieldObj.IDPerfPeriod === -1 ? true : false : this.isDefaultMovement;
        //we keep an array for all accessType false to be disabled later
        //TODO Rajesh Johnson , Have to change this logic in future release
        fieldObj.ReadOnly = fieldObj.IDDictionary !== 0 && !fieldObj.ReadOnly ? !fieldObj.accessType : fieldObj.ReadOnly;
        //set up readOnly fields for Assort app
        if (!fieldObj.ReadOnly && this.sharedService.checkIfAssortMode('propertygrid-edit')) {
            fieldObj.ReadOnly =
                this.planogramStore.appSettings.readOnlyfieldsInAssort.indexOf(fieldObj.IDDictionary) > -1
                    ? true
                    : false;
        }
        if (objType === PropertyPaneType.Position) {
            if ((this.isMovement || this.isDefaultMovement) && (fieldObj.field?.toLowerCase() === 'position.attributeobject.currmovt')) {
                fieldObj.ReadOnly = false;
            }
        }
        if (!fieldObj.ReadOnly) {
            if (
                this.planogramHelper.isPOGLive(this.sectionID, false) ||
                (this.sharedService.isNiciFeatureNotAllowed('POSITION_PROPERTY_GRID', [fieldData]) &&
                    objType == AppConstantSpace.POSITIONOBJECT) ||
                (this.sharedService.isNiciFeatureNotAllowed('SECTION_PROPERTY_GRID') &&
                    objType == AppConstantSpace.POG) ||
                (this.sharedService.isNiciFeatureNotAllowed('FIXTURE_PROPERTY_GRID') &&
                    objType == AppConstantSpace.FIXTUREOBJ)
            ) {
                fieldObj.ReadOnly = fieldObj.changeHierarchy ? true : false;
                this.isPogLive(objType, fieldObj);
                this.parentApp.isNiciMode ? this.allowNICIEditFields(objType, fieldObj) : '';
            } else {
                fieldObj.ReadOnly = false;
                fieldData && this.checkApplicability(fieldData, objType, fieldObj);
            }
            if (fieldData && !fieldObj.ReadOnly) {
                this.applyDependentAccessType(fieldObj, fieldData);
            }
            if (objType === 'POG' && fieldObj.field?.toLowerCase() === 'color') {
                fieldObj.ReadOnly = true;
            }
        }
        if (objType === 'POG' && fieldObj.IDDictionary === 5578) {
            this.uprightService.setUprightsToBayChecked = fieldObj[fieldObj.field];
        }
        if (fieldObj.AttributeType?.toLowerCase() === 'calculated') {
            fieldObj.ReadOnly = true;
        }
        if (this.isMultiple) {
            if (!this.multiFixArray.includes(objType)) {
                fieldObj.ReadOnly = true;
            }
        } else {
            if (this.multiFixArray.includes(objType)) {
                fieldObj.ReadOnly = true;
            }
        }

        if (fieldData && fieldObj.field === 'Position.IDPackage' && (fieldData['hasBackItem'] || fieldData['hasAboveItem'])) {
            fieldObj.ReadOnly = true;
        }
        if(fieldObj.field === 'Position.UnitCapping' && fieldData?.Position && (fieldData?.Position?.ProductPackage?.IdPackageStyle != 1 || fieldData.Position.IDMerchStyle != AppConstantSpace.MERCH_ADVANCED_TRAY)){
          fieldObj.ReadOnly = true;
        }
        if (fieldObj.field === 'Position.IsPegTag') {
            this.isPegTag = fieldObj['Position.IsPegTag'] === true ? true : false;
        }
        if (fieldObj.field === 'Position.TagHeight') {
            fieldObj.ReadOnly = !this.isPegTag;
        }
        if (fieldObj.field === 'Position.TagWidth') {
            fieldObj.ReadOnly = !this.isPegTag;
        }
        if (fieldObj.field === 'Position.TagXOffset') {
            fieldObj.ReadOnly = !this.isPegTag;
        }
        if (fieldObj.field === 'Position.TagYOffset') {
            fieldObj.ReadOnly = !this.isPegTag;
        }
        if(fieldObj?.field?.includes("OpticalResemblance.FlagData")){
            var sec = this.sharedService.getObject(this.sectionID,this.sectionID) as Section;
            if(fieldObj.field == '_PegBoardOpticalResemblance.FlagData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.PEGBOARDOBJ]
            else if(fieldObj.field == '_SlotwallOpticalResemblance.FlagData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.SLOTWALLOBJ]
            else if(fieldObj.field == '_CoffinCaseOpticalResemblance.FlagData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.COFFINCASEOBJ]
            else if(fieldObj.field == '_BasketOpticalResemblance.FlagData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.BASKETOBJ]
        }
        let overrideSectionPos= [5549,5550,5551,5552,5553,5554,5555,5556,5557,5558,5559]
        if(overrideSectionPos.includes(fieldObj.IDDictionary)){
            var sec = this.sharedService.getObject(this.sectionID,this.sectionID) as Section;
            if(fieldObj.field == '_StandardShelfLKTraffic.ValData' || fieldObj.field == '_StandardShelfStackOrder.ValData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.STANDARDSHELFOBJ]
            else if(fieldObj.field == '_PegboardLKTraffic.ValData' || fieldObj.field == '_PegboardStackOrder.ValData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.PEGBOARDOBJ]
            else if(fieldObj.field == '_CoffinCaseLKTraffic.ValData' || fieldObj.field == '_CoffinCaseStackOrder.ValData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.COFFINCASEOBJ]
            else if(fieldObj.field == '_BasketLKTraffic.ValData' || fieldObj.field == '_BasketStackOrder.ValData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.BASKETOBJ]
            else if(fieldObj.field == '_SlotwallLKTraffic.ValData' || fieldObj.field == '_SlotwallStackOrder.ValData')
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.SLOTWALLOBJ]
            else if(fieldObj.field == '_CrossbarLKTraffic.ValData' )
                fieldObj.ReadOnly = !sec.hasFixtureType?.[AppConstantSpace.CROSSBAROBJ]
        }
    }

    private isPogLive(propertyGridType: string, fieldObj?: TabChildren) {
        switch (propertyGridType) {
            case PropertyPaneType.Multiple:
            case AppConstantSpace.POSITIONOBJECT:
            case AppConstantSpace.FIXTUREOBJ: {
                fieldObj.ReadOnly = true;
                break;
            }
            case AppConstantSpace.POG: {
                fieldObj.ReadOnly = true;
                if (fieldObj.IDDictionary === 3942) {
                    fieldObj.ReadOnly = false;
                }
                break;
            }
        }
    }

    private allowNICIEdits(property, fieldObj: TabChildren): void {
        if (property.indexOf(fieldObj.IDDictionary) > -1) {
            fieldObj.ReadOnly = false;
        }
    }

    private allowNICIEditFields(propertyGridType: string, fieldObj: TabChildren): void {
        switch (propertyGridType) {
            case PropertyPaneType.Multiple:
            case AppConstantSpace.FIXTUREOBJ: {
                this.allowNICIEdits(AppConstantSpace.PROPERTYGRID_ALLOWED_DICTIONARIES.FIXTURE_PROPERTIES, fieldObj);
                break;
            }
            case AppConstantSpace.POG: {
                this.allowNICIEdits(AppConstantSpace.PROPERTYGRID_ALLOWED_DICTIONARIES.SECTION_PROPERTIES, fieldObj);
                break;
            }
            case AppConstantSpace.POSITIONOBJECT: {
                this.allowNICIEdits(AppConstantSpace.PROPERTYGRID_ALLOWED_DICTIONARIES.POSITION_PROPERTIES, fieldObj);
                break;
            }
        }
    }

    //added by Ashish to check permission
    private checkPerformanceChangePermission(): boolean {
        return this.userPermissions.hasReadPermission('POGPERFCHANGE');
    }

    private checkApplicability(obj: any, propertyGridType: string, fixIdDicObj): void {
        switch (propertyGridType) {
            case PropertyPaneType.Multiple:
            case AppConstantSpace.MULTIFIXEDIT:
            case AppConstantSpace.FIXTUREOBJ: {
                this.checkForApplicablity(obj, fixIdDicObj);
                if (!Utils.isNullOrEmpty(obj?.fieldObj?.options)) {
                    if (
                        obj.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                        obj.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                    ) {
                        obj.fieldObj.options = this.fieldObj.crunchOptions;
                    } else {
                        obj.fieldObj.options = this.fieldObj.crunchOptions;
                        //commented For Adjacent shelves having span left is considered as a single shelf.
                    }
                }
                break;
            }
            case AppConstantSpace.POG: {
                if (fixIdDicObj == 'IDPerfPeriod' && this.checkPerformanceChangePermission() == false) {
                    fixIdDicObj.ReadOnly = true;
                }
                break;
            }
            case AppConstantSpace.POSITIONOBJECT: {
                this.checkForApplicablity(obj, fixIdDicObj);
                break;
            }
        }
    }
    private checkForApplicablity(obj: SelectableList, fixIdDic) {
        let IDFixtureType: string = '';
        if (obj.ObjectType == AppConstantSpace.FIXTUREOBJ) {
            IDFixtureType = obj.Fixture.IDFixtureType;
        } else {
            if (obj.ObjectType == AppConstantSpace.POSITIONOBJECT) {
                //get the parent  fixture type and apply
                IDFixtureType = this.sharedService.getParentObject(obj, obj.$sectionID).Fixture.IDFixtureType;
            }
        }
        if (fixIdDic.Applicability != null) {
            //need to break the string into arrays
            let fixFlag: boolean = false;
            const applicabilityValues = fixIdDic.Applicability.split(',');
            if (this.propertyGridType == PropertyPaneType.Multiple || this.propertyGridType == AppConstantSpace.MULTIFIXEDIT) {
                fixFlag = true;
                for (let fixIDType in this.idFixTypesList) {
                    if (applicabilityValues.indexOf(fixIDType) == -1) {
                        fixFlag = false;
                        break;
                    }
                }
            } else {
                for (const apVal of applicabilityValues) {
                    if (apVal == IDFixtureType) {
                        fixFlag = true;
                        break;
                    }
                }
            }

            if ((this.sharedService.getObject(obj.$sectionID, obj.$sectionID) as Section).LKFixtureMovement == 2) {
                if (fixIdDic.IDDictionary == 325 || fixIdDic.IDDictionary == 326 || fixIdDic.IDDictionary == 327) {
                    fixFlag = false;
                }
            }
            if (!fixFlag) {
                fixIdDic.ReadOnly = true;
            }
        }
    }

    private getImage(view: string = 'front'): string {
        let ret: string = null;
        switch (view) {
            case 'front':
            default:
                ret = this.itemData.Position?.ProductPackage?.Images?.front;
                break;
            case 'back':
                ret = this.itemData.Position?.ProductPackage?.Images?.back;
                break;
            case 'right':
                ret = this.itemData.Position?.ProductPackage?.Images?.right;
                break;
            case 'left':
                ret = this.itemData.Position?.ProductPackage?.Images?.left;
                break;
            case 'top':
                ret = this.itemData.Position?.ProductPackage?.Images?.top;
                break;
            case 'bottom':
                ret = this.itemData.Position?.ProductPackage?.Images?.bottom;
                break;
        }
        // image can be null or empty string
        if (!ret && view === 'front') {
            return AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
        } else {
            return ret;
        }
    }

    public openTab(index: number): void {
        this.propertyGridService.selectedPropertiesTabIndex[this.propertyGridType] = index;
        if (this.sharedService.getSelectedId(this.sectionID).length > 1 && this.propertyGridType == PropertyPaneType.Position) {
            this.getItemDataForMultiPositionEdit();
        }
    }

    private updateValue(itemData: SelectableList, valueNew?: any): void {
        if (this.tabList.header.custom) {
            this.tabList.header.children.forEach((fObj) => {
                let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData);
                fObj[fObj.field] = value;
            });
        }
        this.tabList.tab.forEach((tObj) => {
            tObj.children.forEach((fObj) => {
                if (fObj.field != 'Position.attributeObject.Color') {
                    let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData);
                    if ((this.propertyGridType === PropertyPaneType.Multiple ||
                        this.propertyGridType === PropertyPaneType.Fixture ||
                        this.propertyGridType === PropertyPaneType.Position) && value === '<multiple values>') {
                        fObj[fObj.field] = '';
                    }else if(fObj.AttributeType === 'Calculated' && fObj.placeholder === '<multiple values>'){
                        fObj[fObj.field] = this.selectedMultiPositions.length > 1 ? '' : value ;
                    } else {
                        if (fObj.type == 'bool') {
                            if (itemData.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                                fObj.customClass = this.selectedMultiPositions.length > 1 ? fObj.customClass : '';
                            } else {
                                fObj.customClass = this.selectedFixtures.length > 1 ? fObj.customClass : '';
                            }
                        }
                        fObj[fObj.field] =
                            fObj.type == 'date' && value ? this.datePipe.transform(new Date(value as any) as Date, this.skeletonDateTimeFormat) : value;

                    }
                } else {
                    fObj[fObj.field] = this.sharedService.getObjectField(
                        undefined,
                        `${fObj.field}_color`,
                        undefined,
                        itemData,
                    );
                }
            });
            tObj.group.forEach((gObj) => {
              let rowChild = [];
              //need to concatinate row children of gObj with children of gobj
              gObj?.table?.rows.forEach((fObj) => {
                rowChild = rowChild.concat(fObj.children);
              });
                (gObj.children).concat(rowChild).forEach((fObj) => {
                    if (fObj.field != 'Position.attributeObject.Color') {
                        let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData);
                        if ((this.propertyGridType === PropertyPaneType.Multiple ||
                            this.propertyGridType === PropertyPaneType.Fixture ||
                            this.propertyGridType === PropertyPaneType.Position) && value === '<multiple values>') {
                            fObj[fObj.field] = '';
                        } else if (fObj.AttributeType === 'Calculated' && fObj.placeholder === '<multiple values>'){
                            fObj[fObj.field] = this.selectedMultiPositions.length > 1 ? '' : value ;
                        } else if(fObj.field === AppConstantSpace.UPRIGHT) {
                            fObj.ReadOnly = this.datasource.uprightType === UprightType.None || this.uprightService.setUprightsToBayChecked;
                            this.datasource.uprightType === UprightType.Variable ? 
                                    fObj[fObj.field] = this.sortVariableUprights() : 
                                    fObj[fObj.field] = this.datasource.Upright = Number(this.datasource.Upright).toFixed(2);
                            if(this.uprightTypeSelection) {
                                this.updateUprightOnType(fObj);
                                this.uprightTypeSelection = false;
                            }
                        } else if(fObj.field === AppConstantSpace.SET_UPRIGHT_TO_BAY_WIDTH) {
                            fObj.ReadOnly = this.datasource.uprightType === UprightType.None;
                        } else if(fObj.field === AppConstantSpace.UPRIGHT_DESC_DATA) {
                            fObj[fObj.field] = this.datasource.uprightType;
                            fObj.ReadOnly = this.uprightService.setUprightsToBayChecked;
                            this.sharedService.setObjectField(
                                undefined,
                                fObj.field,
                                this.datasource.uprightType ?? fObj.value,
                                undefined,
                                this.datasource,
                            ) as SelectableList;
                        } else {
                            fObj.type == 'bool' ? fObj.customClass = '' : '';
                            fObj[fObj.field] =
                                fObj.type == 'date' && value ? this.datePipe.transform(new Date(value as any) as Date, this.skeletonDateTimeFormat) : value;
                        }
                    } else {
                        fObj[fObj.field] = this.sharedService.getObjectField(
                            undefined,
                            `${fObj.field}_color`,
                            undefined,
                            itemData,
                        );
                    }
                });
            });
        });
    }
    private updateListValue(itemData: SelectableList): void {
        this.allPropertyListViewData.forEach((tObj) => {
            itemData = this.getSelectedPropertyData(tObj.key);
            tObj.value.forEach((fObj) => {
                if (fObj.field != 'Position.attributeObject.Color') {
                    let value = this.sharedService.getObjectField(undefined, fObj.field, undefined, itemData);
                    if ((this.propertyGridType === PropertyPaneType.Multiple ||
                        this.propertyGridType === PropertyPaneType.Fixture ||
                        this.propertyGridType === PropertyPaneType.Position) && value === '<multiple values>') {
                        fObj[fObj.field] = '';
                    } else if (fObj.AttributeType === 'Calculated' && fObj.placeholder === '<multiple values>'){
                        fObj[fObj.field] = this.selectedMultiPositions.length > 1 ? '' : value ;
                    } else {
                        fObj.type == 'bool' ? fObj.customClass = '' : '';
                        fObj[fObj.field] =
                            fObj.type == 'date' && value ? this.datePipe.transform(new Date(value as any), this.skeletonDateTimeFormat) : value;
                    }
                } else {
                    fObj[fObj.field] = this.sharedService.getObjectField(
                        undefined,
                        `${fObj.field}_color`,
                        undefined,
                        itemData,
                    );
                }
            });
        });
    }
    //normal input
    public inputOnChange(fieldObjChange): void {
        this.datasource = this.getActiveSection();
        const oldUprightVal = this.datasource.Upright;
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        let fieldObj = fieldObjChange.fieldData;
        let newValue = fieldObjChange.type === 'date' ? fieldObjChange.event.target.value : fieldObjChange.event;
        let oldValue = this.sharedService.getObjectField(undefined, fieldObj.field, undefined, itemData);
        itemData = this.sharedService.setObjectField(
            undefined,
            fieldObj.field,
            newValue,
            undefined,
            itemData,
        ) as SelectableList;
        let data = itemData;
        if (oldValue != newValue) {
            if (fieldObj.field === 'Name') {
                this.planogramService.getCurrentObject((itemData as Section).globalUniqueID).Name = newValue;
                this.isUndoRequiredLibrary = true;
            }
            if (fieldObjChange.type == 'text') {
                if (itemData) {
                    if (data.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
                        if (fieldObj.field == 'Name') {
                            //updateing  name in  pogLibrary
                            this.planogramLibraryService.updateName(data.IDPOG, newValue);
                        } else if(fieldObj.field === AppConstantSpace.UPRIGHT) {
                            this.updateModel(fieldObj[fieldObj.field], fieldObj, oldUprightVal);
                        }
                        this.beforeFieldUpdate(data, fieldObj, oldValue, newValue, undefined, true);
                    }
                }
            }
            if (data.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                let unqHistoryID: string = this.historyService.startRecording();
                for (const selcFix of this.selectedFixtures) {
                    data = selcFix as SelectableList;
                    let oldVal =
                        this.selectedFixtures.length > 1
                            ? this.sharedService.getObjectField(undefined, fieldObj.field, undefined, data)
                            : oldValue;
                    this.sharedService.setObjectField(undefined, fieldObj.field, newValue, undefined, data);
                    if (oldVal != newValue) {
                        this.beforeFieldUpdate(data, fieldObj, oldVal, newValue);
                        this.sharedService.setObjectField(undefined, fieldObj.field, newValue, undefined, data);
                        this.planogramService.insertPogIDs([data], true);
                    }
                }
                this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj);
                return;
            }
            if (data.ObjectType == AppConstantSpace.POSITIONOBJECT) {
                let unqHistoryID: string = this.historyService.startRecording();
                for (const selcPos of this.selectedMultiPositions) {
                    data = selcPos as SelectableList;
                    let oldVal =
                        this.selectedMultiPositions.length > 1
                            ? this.sharedService.getObjectField(undefined, fieldObj.field, undefined, data)
                            : oldValue;
                    this.sharedService.setObjectField(undefined, fieldObj.field, newValue, undefined, data);
                    if (oldVal != newValue) {
                        this.beforeFieldUpdate(data, fieldObj, oldVal, newValue);
                        this.planogramService.insertPogIDs([data], true);
                    }
                }
                this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj);
                this.updatePOG_VM(itemData, fieldObj.field, newValue);
                return;
            }
        }
    }

    public setColorCode(fieldObjChange): void {
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        let fieldObj = fieldObjChange.fieldData;
        let oldValue = this.sharedService.getObjectField(
            undefined,
            'Position.attributeObject.Color_color',
            undefined,
            itemData,
        );
        let unqHistoryID: string = this.historyService.startRecording();
        for (const selcPos of this.selectedMultiPositions) {
            itemData = selcPos as SelectableList;
            let oldVal =
                this.selectedMultiPositions.length > 1
                    ? this.sharedService.getObjectField(undefined, 'Position.attributeObject.Color_color', undefined, itemData)
                    : oldValue;
            itemData.Position.attributeObject.Color_color = fieldObjChange.event;
            if (itemData != null) {
                if (typeof itemData.Position.attributeObject.Color_color == 'undefined') {
                    itemData.Position.attributeObject.Color_color = this.propertyFieldService.getColorCode(
                        itemData as Position,
                    );
                }
                let newValue: string = fieldObjChange.event;
                let colorCode = cloneDeep(itemData.Position.attributeObject.Color_color).replace('#', '');
                let colorCodeNum: number = parseInt(colorCode, 16);
                itemData.Position.attributeObject.Color = parseInt(colorCode, 16);
                const datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
                const packageID: string = itemData.Position.IDProduct + '@' + itemData.Position.IDPackage;
                datasource.PackageAttributes[packageID].Color = parseInt(colorCode, 16).toString();
                const positions: Position[] = datasource.getAllPositions();
                //positions with same product id
                let filteredPositions = filter(positions, (val) => {
                    return val.Position.IDProduct == itemData.Position.IDProduct;
                });

                filteredPositions.forEach((item) => {
                    item.Position.attributeObject.Color = colorCodeNum;
                    item.Position.attributeObject.Color_color = itemData.Position.attributeObject.Color_color;
                });
                //undo redo
                //unqHistoryID = this.historyService.startRecording();
                let field: string = 'Position.attributeObject.Color_color';

                let original = ((sharedService, filteredPositions, field, value, sectionId) => {
                    return () => {
                        let colorCode = cloneDeep(value);
                        colorCode = parseInt(colorCode.replace('#', ''), 16);
                        filteredPositions.forEach((item) => {
                            sharedService.setObjectField(item.$id, field, value, sectionId);
                            sharedService.setObjectField(item.$id, 'Position.attributeObject.Color', colorCode, sectionId);
                        });
                    };
                })(this.sharedService, filteredPositions, field, newValue, this.sectionID);
                let revert = ((sharedService, $id, field, value, sectionId) => {
                    return () => {
                        let colorCode = cloneDeep(value);
                        colorCode = parseInt(colorCode.replace('#', ''), 16);
                        filteredPositions.forEach((item) => {
                            sharedService.setObjectField(item.$id, field, value, sectionId);
                            sharedService.setObjectField(item.$id, 'Position.attributeObject.Color', colorCode, sectionId);
                        });
                    };
                })(this.sharedService, filteredPositions, field, oldVal, this.sectionID);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'beforeFieldUpdate',
                });
                //this.historyService.stopRecording(undefined, undefined, unqHistoryID, fieldObj);
                this.eventEmit(field, itemData, this.datasource, newValue);
                this.changedValue = newValue;
            }
        }
        this.historyService.stopRecording(undefined, undefined, unqHistoryID, fieldObj);
        this.updatePOG_VM(itemData, fieldObj.field, fieldObjChange.event);
    }

    public applyColorChange(fieldObjChange): void {
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        const event = fieldObjChange.event;
        let fieldObj = fieldObjChange.fieldData;
        if (itemData != null) {
            let newValue: string = event;
            //undo redo
            let unqHistoryID: string = this.historyService.startRecording();
            let field: string = 'Fixture.Color';
            this.selectedFixtures.forEach((item) => {
                let oldValue = item.Fixture.Color;
                const original = () => {
                    this.sharedService.setObjectField(
                        item.$id,
                        field,
                        newValue,
                        this.sectionID,
                        item,
                    ) as SelectableList;
                };
                const revert = () => {
                    this.sharedService.setObjectField(
                        item.$id,
                        field,
                        oldValue,
                        this.sectionID,
                        item,
                    ) as SelectableList;
                };
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'beforeFieldUpdate',
                });
                item.Fixture.Color = newValue;
            });

            this.historyService.stopRecording(undefined, undefined, unqHistoryID, fieldObj);
            this.eventEmit(field, itemData, this.datasource, newValue);
        }
    }

    //normal checkbox
    public checkboxOnChange(fieldObjChange): void {
        this.datasource = this.getActiveSection();
        const event = fieldObjChange.event;
        let fieldObj = fieldObjChange.fieldData;
        this.isPegTag = fieldObj['Position.IsPegTag'] == true ? true : false;
        fieldObj.type == 'bool' ? fieldObj.customClass = '' : '';
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        this.oldValue = this.sharedService.getObjectField(undefined, fieldObj.field, undefined, itemData);
        itemData = this.sharedService.setObjectField(
            undefined,
            fieldObj.field,
            event.checked,
            undefined,
            itemData,
        ) as SelectableList;
        let data = itemData;
        let oldValue = this.oldValue;
        let field = fieldObj.field;
        let newValue = event.checked;
        let rootObject: Section = this.sharedService.getObject(data.$sectionID, data.$sectionID) as Section;
        const ctx = new Context(rootObject);
        if (data.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
          if(field == 'OverrideSectionPosNumbering' &&
          (data?.hasFixtureType[AppConstantSpace.PEGBOARDOBJ] || data?.hasFixtureType[AppConstantSpace.SLOTWALLOBJ] || data?.hasFixtureType[AppConstantSpace.CROSSBAROBJ])){
            data.getAllPegFixtures().forEach((pegFix) => {
              pegFix.Children = pegFix.pegPositionSort(pegFix);
            });
          }
          if((field == '_PegBoardOpticalResemblance.FlagData' || field == '_SlotwallOpticalResemblance.FlagData') &&
          (data?.hasFixtureType[AppConstantSpace.PEGBOARDOBJ] || data?.hasFixtureType[AppConstantSpace.SLOTWALLOBJ])){
                data.getAllPegFixtures().forEach((pegFix) => {
                    pegFix.Children=pegFix.pegPositionSort(pegFix);
                });
          }
          if(field == '_CoffinCaseOpticalResemblance.FlagData' || field == '_BasketOpticalResemblance.FlagData'){
                data.getAllCoffinCases().forEach((coffincaseFix) => {
                    coffincaseFix.coffincasePositionSort(coffincaseFix,coffincaseFix.Dimension.Width,coffincaseFix.Dimension.Height);
                });
          }
          if (field == 'IsVariableHeightShelf' && newValue == false) {
                if (this.quadtreeUtilsService.minMerchCheckFixtures && data.fitCheck) {
                    this.notifyService.warn('SOME_ITEMS_UTILIZING_VARIABLE_SHELF_HEIGHT');
                    data.IsVariableHeightShelf = oldValue as boolean;
                    newValue = oldValue;
                }
           }
            if (field == '_IsSpanAcrossShelf.FlagData') {
                this.planogramService.hasCacheShrinkFactors = true;
                Context.cacheShrinkFactors = {};
                data.changeCrunchIsSpanAcrossShelf(ctx);
            }
            if(field === AppConstantSpace.SET_UPRIGHT_TO_BAY_WIDTH) {
                fieldObj[field] ? this.setUprightsToBayWidth(data as Section, newValue) : this.unSetUprights(newValue);
            }
            if (field == '_Reversenotch.FlagData') {
                data.applyRenumberingShelfs();
                this.sharedService.gridReloadSubscription.next(true);
            }
        }

        if (data.ObjectType == AppConstantSpace.POSITIONOBJECT) {
            let unqPosHistoryID: string = this.historyService.startRecording();
            for (const selcPos of this.selectedMultiPositions) {
                data = selcPos as SelectableList;
                let oldPosVal =
                    this.selectedMultiPositions.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : oldValue;
                if (oldPosVal != newValue) {
                    this.sharedService.setObjectField(undefined, field, newValue, undefined, data);
                    this.beforeFieldUpdate(data, fieldObj, oldPosVal, newValue);
                    this.planogramService.insertPogIDs([data], true);
                }
            }
            this.historyService.stopRecording([1, 2, 3], undefined, unqPosHistoryID, fieldObj);
            this.updatePOG_VM(data, field, newValue);
            return;
        }

        if (data.ObjectType == AppConstantSpace.FIXTUREOBJ) {
            if (Utils.checkIfPegType(data)) {
                if (field == 'Fixture.AutoComputeDepth') {
                    const positionFields = this.allPropertyListViewData.find(x => x.key === 'Position');
                    const pegLengthField = positionFields.value.find(p => p.field === 'Position._X05_PEGLENGTH.ValData');
                    pegLengthField.ReadOnly = newValue;
                }
            }

            //condition to revert ignore merch height checkbox when items are there on standard shelf
            if (field === AppConstantSpace.FIXTURE_IGNORE_MERCH_HEIGHT && data.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ && newValue === false) {
                if (data.minMerchHeight > data.ChildDimension.Height && rootObject.fitCheck) {
                    this.notifyService.warn('IGNORE_MERCH_HEIGHT_CANNOT_TURNED_OFF');
                    data.Fixture.IgnoreMerchHeight = oldValue as boolean;
                    newValue = oldValue;
                    this.updatePOG_VM(data, field, oldValue);
                    this.sharedService.setObjectField(undefined, field, oldValue, undefined, data);
                }
            }

            //condition to avoid position to go beyond shelf height for first shelf
            if (field === AppConstantSpace.FIXTURE_IGNORE_FINGER_SPACE && data.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
                let isValidMove = true;
                if (itemData.Children.length > 0 && rootObject.fitCheck)
                    itemData.Children.every((pos) => {
                        let func = "linearHeight";
                        if (pos[func] + pos.Position.ProductPackage.FingerSpace > itemData.Dimension.Height) {
                            isValidMove = false;
                        }
                        return isValidMove;
                    });
                if (!isValidMove) {
                    this.notifyService.warn('ITEM_CROSSING_HEIGHT');
                    data.Fixture.IgnoreFingerSpace = oldValue as boolean;
                    newValue = oldValue;
                    this.updatePOG_VM(data, field, oldValue);
                    this.sharedService.setObjectField(undefined, field, oldValue, undefined, data);
                }
            }

            let unqHistoryID: string = this.historyService.startRecording();
            for (const selcFix of this.selectedFixtures) {
                data = selcFix as SelectableList;
                let oldVal =
                    this.selectedFixtures.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : oldValue;
                this.sharedService.setObjectField(undefined, field, newValue, undefined, data);
                if (field == 'Fixture.SnapToLeft' && newValue == true) {
                    this.snapToLeftShelf(data, rootObject);
                    if (data.Fixture.SnapToRight) {
                        this.snapToRightShelf(data, rootObject, undefined, data.Fixture.Width);
                    }
                }

                if (field == 'Fixture.SnapToRight' && newValue == true) {
                    if (data.Fixture.SnapToLeft) {
                        this.snapToLeftShelf(data, rootObject);
                    }
                    this.snapToRightShelf(data, rootObject, undefined, data.Fixture.Width);
                }

                if (
                    data.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                    data.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
                    data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ
                ) {
                    if (field == 'Fixture.ForceApplyShrinkX' && (Utils.checkIfCoffincase(data) || Utils.checkIfBasket(data))) {
                        const oldChildren = cloneDeep(data.Children);
                        for (const child of data.Children) {
                            if (Utils.checkIfPosition(child)) {
                                const response = data.calculatePositionShrink(child, oldChildren);
                                if (response && response.revertFlag) {
                                    this.sharedService.setObjectField(undefined, field, oldValue, undefined, data);
                                    this.notifyService.warn(response.message.toString());
                                    this.updatePOG_VM(data, field, oldValue);
                                    break;
                                }
                            }
                        }
                    }
                    if (field == 'Fixture.AutoComputeDepth') {
                        data.computePositionsAfterChange(ctx);
                    }
                }

                if (oldVal != newValue) {
                    this.beforeFieldUpdate(data, fieldObj, oldVal, newValue);
                    this.sharedService.setObjectField(undefined, field, newValue, undefined, data);
                    this.planogramService.insertPogIDs([data], true);
                }
            }
            this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj);
            return;
        }

        if (oldValue != newValue) {
            this.beforeFieldUpdate(data, fieldObj, oldValue, newValue);
            this.planogramService.hasCacheShrinkFactors = false;
        }
    }

    private snapToLeftShelf(shelfItemData, rootObject): void {
        let proposedX1PosToPog: number = shelfItemData.getXPosToPog();
        let proposedYPosToPog: number = shelfItemData.getYPosToPog(true);
        let proposedWidth = shelfItemData.Fixture.Width;
        proposedX1PosToPog = rootObject.getNearestXCoordinate(proposedX1PosToPog, 'leftmost');
        proposedWidth = shelfItemData.Fixture.Width;
        shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
    }

    //Added debounce to reduce frequent triggers and to get proper user input
    public changeInNumericInput = this.debounceForNumericInput((fieldObjChanges) =>
        this.kendoNumericOnChange(fieldObjChanges),
    );

    public changeInTextInput = this.debounceForNumericInput((fieldObjChanges) =>
        this.inputOnChange(fieldObjChanges),
    );

    private debounceForNumericInput(callback, wait = 1000) {
        let timeout;
        return (...args) => {
            const context = this;
            clearTimeout(timeout);
            wait = this.isAutomationMode ? this.getAutomationDebounceTime() : wait;
            timeout = setTimeout(() => callback.apply(context, args), wait);
        };
    }

    //kendo numeric textbox
    public kendoNumericOnChange(fieldObjChange): void {
        let value = fieldObjChange.event;
        let fieldObj = fieldObjChange.fieldData;
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        /* Handling min and max check here
    as kendo-numerictextbox appends 0 if max is greater than 10 and first digit entered is less than min value */
        //Need to support negative values for overhang fields
        if ([1664, 1665, 1666, 1667].indexOf(fieldObj.IDDictionary) < 0) {
            let minValue = +fieldObj.MinValue;
            let maxValue = +fieldObj.MaxValue;
            if (fieldObj.type == 'int') {
                minValue = minValue ? minValue : 0;
                maxValue = maxValue ? maxValue : 2000;
            }
            if ((minValue || minValue === 0) && value < minValue) {
                value = minValue;
                fieldObj[fieldObj.field] = minValue;
            }

            if (maxValue && value > maxValue) {
                value = maxValue;
                fieldObj[fieldObj.field] = maxValue;
            }
        }
        value = Math.round(value * 100) / 100;
        let valueNew = value != '' ? parseFloat(value) : value;
        this.oldValue = this.sharedService.getObjectField(undefined, fieldObj.field, undefined, itemData);
        if (
        fieldObj.field != 'Position.BackSpacing' &&
        fieldObj.field != 'Position.FrontSpacing' &&
        fieldObj.field != 'Position._X05_PEGLENGTH.ValData') {
        itemData = this.sharedService.setObjectField(
            undefined,
            fieldObj.field,
            valueNew,
            undefined,
            itemData,
        ) as SelectableList;
                  }
        let data: SelectableList = itemData;
        let field: string = fieldObj.field;
        let valueOld = this.oldValue;
        let parentData = this.sharedService.getParentObject(data, data.$sectionID);
        let pogObject = this.sharedService.getObject(data.$sectionID, data.$sectionID) as Section;
        const ctx = new Context(pogObject);

        let isAllowToUpdate: boolean = true;
        if (this.propertyGridType == AppConstantSpace.FIXTUREOBJ || this.propertyGridType == PropertyPaneType.Multiple
            || this.propertyGridType == AppConstantSpace.MULTIFIXEDIT) {
            for (const selFixt of this.selectedFixtures) {
                data = selFixt;
                let oldVal =
                    this.selectedFixtures.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : valueOld;
                this.oldValue = valueOld = oldVal;
                if (data.ObjectDerivedType == AppConstantSpace.MODULAR && data.validateField) {
                    let validationObj = data.validateField(field, valueNew);
                    if (validationObj.error) {
                        this.notifyService.error(validationObj.msg);
                        this.updatePOG_VM(data, field, valueOld);
                        this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
                        isAllowToUpdate = false;
                        return;
                    }
                }
                if (field === 'Fixture.MaxMerchHeight') {
                    if (valueNew !=0 && valueNew < (data as any).minMerchHeight && !data.Fixture.IgnoreMerchHeight) {
                        this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
                        this.updatePOG_VM(data, field, valueOld);
                        isAllowToUpdate = false;
                        this.notifyService.warn('MAX_MERCH_HEIGHT_CANT_BE_LESS_THAN_MIN_MERCH_HEIGHT');
                        return;
                    }

                    let maxHeight: number = (itemData.Dimension.Height - (itemData.Fixture.Thickness || 0));//need to substract the thickness for getting max height of fixture
                    if (valueNew < 0 || valueNew > maxHeight.toFixed(2) && data.Fixture.IgnoreMerchHeight && pogObject.fitCheck) {
                        this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
                        this.updatePOG_VM(data, field, valueOld);
                        isAllowToUpdate = false;
                        let msg = this.translate.instant('MAX_MERCH_HEIGHT_SHOULD_BETWEEN_0_AND') + ' ' + maxHeight.toFixed(2);
                        this.notifyService.warn(msg);
                        return;
                    }
                }
                // If fixture Drag is Lock mode
                if (
                    !(parentData == undefined) &&
                    !(parentData.LKFixtureMovement == undefined) &&
                    data.ObjectType == AppConstantSpace.FIXTUREOBJ &&
                    parentData.LKFixtureMovement == 2
                ) {
                    this.updatePOG_VM(data, field, oldVal);
                    return;
                }
                if (
                    data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ &&
                    data.computeMerchHeight &&
                    field === 'Rotation.X'
                ) {
                    data.computeMerchHeight(ctx);
                    //Checking rotation of shelf with regard to top most shef to check if it is crossing shelf height
                    //Check shelf rotation of shelf is colliding with above or below shelfs and with block fixtures (shelf which is above block fixture)
                    if (
                        data.minMerchHeight +
                        data.getYPosToPog() +
                        data.Dimension.Depth * Math.sin(Utils.degToRad(data.Rotation.X)) +
                        data.Fixture.Thickness >
                        pogObject.Dimension.Height
                    ) {
                        this.notifyService.warn(
                            'Sloped shelf {' +
                            data.Fixture.FixtureFullPath +
                            '} exceeding planogram height {' +
                            pogObject.Dimension.Height +
                            '}',
                        );
                        data.Rotation.X = oldVal as number;
                        valueNew = oldVal;
                        this.sharedService.setObjectField(undefined, field, oldVal, undefined, itemData);
                        data.computeMerchHeight(ctx);
                        this.sharedService.renderDividersAgainEvent.next(true);
                        isAllowToUpdate = false;
                        break;
                    } else if (valueNew > 0) {
                        let aboveShelf = Utils.sortByYPos(data.getAboveShelfs(ctx));

                        if (
                            !pogObject.IsVariableHeightShelf &&
                            aboveShelf.length > 0 &&
                            data.getFrontLocation().Y + data.Fixture.Thickness + data.minMerchHeight >
                            aboveShelf[0].getFrontLocation().Y
                        ) {
                            this.notifyService.warn('SLOPED_SHELF_COLLIDING_WITH_FIXTURE_ABOVE');
                            data.Rotation.X = oldVal as number;
                            valueNew = oldVal;
                            this.sharedService.setObjectField(undefined, field, oldVal, undefined, itemData);
                            isAllowToUpdate = false;
                            break;
                        }
                    } else if (valueNew < 0) {
                        let belowShelfList = data.getImmediateBelowShelfs(ctx);
                        for (const belowShelf of belowShelfList) {
                            const shelf = belowShelf;
                            shelf.computeMerchHeight(ctx);
                            if (
                                !pogObject.IsVariableHeightShelf &&
                                shelf.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ &&
                                this.collection.doSlopedShelvesCollide(data, shelf)
                            ) {
                                this.notifyService.warn('SLOPED_SHELF_COLLIDING_WITH_FIXTURE_BELOW');
                                data.Rotation.X = oldVal as number;
                                valueNew = oldVal;
                                this.sharedService.setObjectField(undefined, field, oldVal, undefined, itemData);
                                isAllowToUpdate = false;
                                break;
                            } else if (shelf.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) {
                                let movedY: number =
                                    data.getYPosToPog() +
                                    data.Dimension.Depth * Math.sin(Utils.degToRad(data.Rotation.X));
                                if (movedY < shelf.Location.Y + shelf.Fixture.Height) {
                                    this.notifyService.warn('SLOPED_SHELF_COLLIDING_WITH_FIXTURE_BELOW');
                                    data.Rotation.X = oldVal as number;
                                    valueNew = oldVal;
                                    this.sharedService.setObjectField(undefined, field, oldVal, undefined, itemData);
                                    isAllowToUpdate = false;
                                    break;
                                }
                            }
                        }
                    }
                }
                if (this.parentApp.isAllocateApp) {
                    let parent = this.sharedService.getObject(data.$sectionID, data.$sectionID) as Modular;
                    this.allocateUtils.updatePAFixtureKey(data as FixtureList, parent);
                }
                isAllowToUpdate = this.dataValidation.validate(pogObject, data, field, valueNew, oldVal);
                if (!isAllowToUpdate) {
                    this.sharedService.setObjectField(undefined, field, oldVal, undefined, itemData);
                    pogObject.reassignLocationXofBays();
                    pogObject.computeMerchHeight(ctx);
                    break;
                }
            }
        } else {
            if (data.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
                let validationObj = data.validateField(field, valueNew);
                if (validationObj.error) {
                    this.notifyService.error(validationObj.msg);
                    this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
                    this.updatePOG_VM(data, field, valueOld);
                    return;
                }
            }
        }


        if (data.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            for (const selectPos of this.selectedMultiPositions) {
                data = selectPos as Position;
                const parentObj = this.sharedService.getParentObject(data, data.$sectionID);
                const oldValue = this.selectedMultiPositions.length > 1
                    ? this.sharedService.getObjectField(undefined, field, undefined, data) : valueOld;
                this.sharedService.setObjectField(undefined, fieldObj.field, valueNew, undefined, data) as SelectableList;
                isAllowToUpdate = this.dataValidation.validate(pogObject, data, field, valueNew, oldValue);
                if (!isAllowToUpdate) {
                    this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data) as SelectableList;
                    this.updatePOG_VM(itemData, field, this.oldValue);
                    return;
                }
                if (field === 'Position.TagHeight' && this.isPegTag) {
                    if (!this.propertyGridPegValidationService.validateTagHeight(data, valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field === 'Position.TagWidth' && this.isPegTag) {
                    if (!this.propertyGridPegValidationService.validateTagWidth(data, valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field === 'Position.TagXOffset' && this.isPegTag) {
                    if (!this.propertyGridPegValidationService.validateTagXOffset(data,valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field === 'Position.TagYOffset' && this.isPegTag) {
                    if (!this.propertyGridPegValidationService.validateTagYOffset(data,valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field === 'Position.FrontSpacing') {
                    if (!this.propertyGridPegValidationService.validateFrontSpacing(data,valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field === 'Position.HeightSlope') {
                    if (this.propertyGridPegValidationService.checkForNullZero(valueNew)) {
                        this.updatePOG_VM(itemData, field, 0);
                    }
                    if (!this.propertyGridPegValidationService.validateHeightSlope(data,valueNew)) {
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (field == 'Position._X05_PEGLENGTH.ValData') {
                  if (!this.propertyGridPegValidationService.validatePegLength(data, valueNew)) {
                    this.updatePOG_VM(itemData, field, this.oldValue);
                    return;
                  }
              }
                if (field === 'Position.SKUGapX' || field === 'Position.SKUGapY') {
                    if (parentObj.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || parentObj.ObjectDerivedType === AppConstantSpace.BASKETOBJ) {
                        this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data);
                        const oldChildren = cloneDeep(parentObj.Children);
                        this.sharedService.setObjectField(undefined, fieldObj.field, valueNew, undefined, data);
                        const onlyShrink = field === 'Position.SKUGapY' ? { X: false, Y: true } : undefined;
                        const response = parentObj.calculatePositionShrink(data, oldChildren, onlyShrink);
                        if (response && response.revertFlag) {
                            this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data);
                            this.notifyService.warn(response.message.toString());
                            this.updatePOG_VM(itemData, field, this.oldValue);
                            return;
                        }
                    } else if (field === 'Position.SKUGapX' && itemData.Position.SKUGapX < 0 && data.computeWidth() <= 0) {
                        this.notifyService.warn('ITEM_GAP_CURRENT_PRODUCT_WIDTH');
                        this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data);
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if ((parentObj.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || parentObj.ObjectDerivedType === AppConstantSpace.BASKETOBJ) &&
                    (field === 'Position.GapX' || field === 'Position.GapY')) {
                    const onlyShrink = field === 'Position.GapX' ? { X: true, Y: false } : { X: false, Y: true };
                    let response = parentObj.calculatePositionShrink(data, undefined, onlyShrink);
                    if (response && response.revertFlag) {
                        this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data);
                        this.notifyService.warn(response.message.toString());
                        this.updatePOG_VM(itemData, field, this.oldValue);
                        return;
                    }
                }
                if (
                    data.Position.FacingsX ||
                    data.Position.MaxFacingsX ||
                    data.Position.FacingsY ||
                    data.Position.FacingsZ ||
                    data.Position.GapX ||
                    data.Position.GapY ||
                    data.Position.GapZ ||
                    data.Position.SKUGapX ||
                    data.Position.SKUGapY ||
                    data.Position.SKUGapZ
                ) {
                    if (field == 'Position.FacingsX' || field == 'Position.FacingsY') {
                        let response = undefined;
                        if (parentObj.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || parentObj.ObjectDerivedType === AppConstantSpace.BASKETOBJ) {
                            const onlyShrink = field === 'Position.FacingsX' ? { X: true, Y: false } : { X: false, Y: true };
                            response = parentObj.calculatePositionShrink(data, undefined, onlyShrink);
                        } else {
                            response = this.crunchMode.rePositionOnCrunch(ctx, parentObj);
                        }
                        if (response && response.revertFlag) {
                            field == 'Position.FacingsX' ? data.changeFacingsTo(parseFloat(valueOld as string)) : data.Position.FacingsY = parseFloat(valueOld as string);
                            this.notifyService.warn(response.message.toString());
                            this.updatePOG_VM(itemData, field, this.oldValue);
                            return;
                        }
                        if (field == 'Position.FacingsX' && parentObj.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ && this.propertyGridPegValidationService.checkIfPegHooksOverlap(data)) {
                            this.updatePOG_VM(itemData, field, this.oldValue);
                            return;
                        }
                        field == 'Position.FacingsX' ? data.changeFacingsTo(parseFloat(valueNew as string)) : data.Position.FacingsY = parseFloat(valueNew as string);
                    }
                }

                if (field == 'Position.MaxFacingsX' || field == 'Position.MinFacingsX') {
                    if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
                        const oldFacingsX = data.Position.FacingsX;
                        if ((field == 'Position.MaxFacingsX' && data.Position.FacingsX > valueNew) || (field == 'Position.MinFacingsX' && data.Position.FacingsX < valueNew)) {
                            data.Position.FacingsX = valueNew;
                            const response = parentObj.calculatePositionShrink(data);
                            data.Position.FacingsX = oldFacingsX;
                            if (response && response.revertFlag) {
                                this.sharedService.setObjectField(undefined, field, oldValue, undefined, data)
                                this.notifyService.warn(response.message.toString());
                                this.updatePOG_VM(itemData, field, this.oldValue);
                                return;
                            }
                        }
                    }
                }

                if (field == 'Position.MaxFacingsY' || field == 'Position.MinFacingsY') {
                    if (Utils.checkIfCoffincase(parentObj) || Utils.checkIfBasket(parentObj)) {
                        const oldFacingsY = data.Position.FacingsY;
                        if ((field == 'Position.MaxFacingsY' && data.Position.FacingsY > valueNew) || (field == 'Position.MinFacingsY' && data.Position.FacingsY < valueNew)) {
                            data.Position.FacingsY = valueNew;
                            const response = parentObj.calculatePositionShrink(data, undefined, { X: false, Y: true });
                            data.Position.FacingsY = oldFacingsY;
                            if (response && response.revertFlag) {
                                this.sharedService.setObjectField(undefined, field, oldValue, undefined, data)
                                this.notifyService.warn(response.message.toString());
                                this.updatePOG_VM(itemData, field, this.oldValue);
                                return;
                            }
                        }
                    }
                }

                this.sharedService.setObjectField(undefined, fieldObj.field, oldValue, undefined, data) as SelectableList;
            }

            let unqPosHistoryID = this.historyService.startRecording();
            this.multiPositionHeaderFields.totalCapacity = 0;
            for (const selectPos of this.selectedMultiPositions) {
                let oldPosVal;
                data = selectPos as Position;
                oldPosVal =
                    this.selectedMultiPositions.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : valueOld;

                if (
                  field == 'Position.BackSpacing' ||

                  field == 'Position.FrontSpacing' ||
                  field == 'Position._X05_PEGLENGTH.ValData') {
                  let newVal = this.propertyGridPegValidationService.changePegFields(data, field, valueNew);
                  valueNew = newVal;
                }
                this.sharedService.setObjectField(undefined, fieldObj.field, valueNew, undefined, data)
                data.checkAndCalcIfContrainUpdated(field, valueNew, valueOld);
                unqPosHistoryID = this.historyService.startRecording();
                const parentItemData = this.sharedService.getParentObject(data, data.$sectionID);
                parentItemData.computePositionsAfterChange(ctx);
                pogObject.computeMerchHeight(ctx);

                let userEnteredValue = valueNew;
                /*valueNew is updated to get latest value after some validations that may happen in computePositionsAfterChange
                for cases like facingsX update in calculatePositionDistribution */
                valueNew = this.sharedService.getObjectField(undefined, field, undefined, data);
                if (oldPosVal != valueNew) {
                    this.beforeFieldUpdate(data, fieldObj, oldPosVal, valueNew);
                    this.planogramService.insertPogIDs([data], true);
                    this.multiPositionHeaderFields.totalCapacity = this.multiPositionHeaderFields.totalCapacity + data.Position.Capacity;
                } else if (userEnteredValue != valueNew) { // this is done to revert user entered value to valid value
                    if (!this.isListView) {
                        this.updateValue(itemData);
                    }
                    else {
                        this.updateListValue(itemData);
                    }
                }
                let original = ((model, field, value) => {
                    return () => {
                        this.updatePOG_VM(model, field, value);
                        // this.sharedService.setObjectField(undefined, field, value, undefined, model);
                    };
                })(itemData, field, valueNew);
                let revert = ((model, field, value) => {
                    return () => {
                        //this.sharedService.setObjectField(undefined, field, value, undefined, model);
                        this.updatePOG_VM(model, field, value);
                    };
                })(itemData, field, valueOld);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'beforeFieldUpdate',
                });
            }
            this.historyService.stopRecording([1, 2, 3], undefined, unqPosHistoryID, fieldObj);
            return;
        }

        isAllowToUpdate = this.dataValidation.validate(pogObject, data, field, valueNew, valueOld);
        if (isAllowToUpdate) {
            let oldVal;
            if (data.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                let unqHistoryID = this.historyService.startRecording();
                for (const selFix of this.selectedFixtures) {
                    data = selFix;
                    oldVal =
                        this.selectedFixtures.length > 1
                            ? this.sharedService.getObjectField(undefined, field, undefined, data)
                            : valueOld;
                    if (
                        Utils.checkIfPegboard(data) &&
                        (field == 'Fixture._X04_XINC.ValData' || field == 'Fixture._X04_YINC.ValData')
                    ) {
                        unqHistoryID = this.historyService.startRecording();
                    }

                    // checking Shelf Fitcheck and Valid X/Y changes : @Ravindra
                    if (
                        (data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
                            Utils.checkIfPegboard(data) ||
                            Utils.checkIfBlock(data) ||
                            Utils.checkIfCrossbar(data) ||
                            Utils.checkIfBasket(data) ||
                            Utils.checkIfSlotwall(data) ||
                            Utils.checkIfCoffincase(data)) &&
                        (field === AppConstantSpace.LOCATION_X || field === AppConstantSpace.LOCATION_Y)
                    ) {
                        if(field === AppConstantSpace.LOCATION_Y &&  valueNew > (parentData.Dimension.Height - data.minMerchHeight)){
                            valueNew = oldVal;
                            this.notifyService.warn("SHELF_CROSSING_SECTION_HEIGHT_WITH_CHANGED_LOCATION_Y");
                            this.sharedService.setObjectField(undefined, fieldObj.field, oldVal, undefined, data) as SelectableList;
                            this.updatePOG_VM(itemData, field, this.oldValue);
                            return;
                        }
                        if (!this.planogramHelper.checkValidShelfXYChanges(data, field, valueNew, oldVal, pogObject.isBayPresents)) {
                            valueNew = oldVal;
                        }
                        pogObject.applyRenumberingShelfs();
                    }

                    // condition to move fixture's by changing notch no.
                    if (
                        (data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
                            Utils.checkIfPegboard(data) ||
                            Utils.checkIfBlock(data) ||
                            Utils.checkIfCrossbar(data) ||
                            Utils.checkIfBasket(data) ||
                            Utils.checkIfSlotwall(data) ||
                            Utils.checkIfCoffincase(data)) &&
                        (field === AppConstantSpace.FIXTURE_NOTCH_NUMBER)
                    ) {
                        let isValidMove = value === 0 || this.planogramHelperService.validateFixtureMovement(pogObject, data, oldVal, value, field);
                        if (!isValidMove) {
                            valueNew = oldVal;
                            this.updatePOG_VM(itemData, field, oldVal);
                        } else {
                            let isFixtureMoved = this.planogramHelperService.moveFixtureByNotchNumber(itemData as FixtureList, pogObject, oldVal, valueNew);
                            if (!isFixtureMoved) {
                                valueNew = oldVal;
                            }
                        }
                    }

                    //Commented on 8th Jan, don't know why this is required
                    //uncomment and put appropriate condition if any issue is there in future.
                    else if (data.Fixture.SnapToRight && !data.Fixture.SnapToLeft && field == 'Fixture.Width') {
                        this.snapToRightShelf(data, pogObject, data.Dimension.Width, valueNew);
                    }
                    pogObject.computeMerchHeight(ctx);
                    if (oldVal != valueNew) {
                        if (field !== AppConstantSpace.FIXTURE_NOTCH_NUMBER) {
                            this.sharedService.setObjectField(undefined, field, valueNew, undefined, data);
                        }
                        this.beforeFieldUpdate(data, fieldObj, oldVal, valueNew);
                        this.planogramService.insertPogIDs([data], true);
                        if (field === 'Fixture.Height' || field === 'Fixture.Thickness') {
                            pogObject.applyRenumberingShelfs();
                        }
                    }
                }
                if (oldVal != valueNew) {
                    let original = ((model, field, value) => {
                        return () => {
                            this.sharedService.setObjectField(undefined, field, value, undefined, model);
                        };
                    })(itemData, field, valueNew);
                    let revert = ((model, field, value) => {
                        return () => {
                            this.sharedService.setObjectField(undefined, field, value, undefined, model);
                        };
                    })(itemData, field, valueOld);
                    if (
                      fieldObj.field != 'Position.BackSpacing' &&
                      fieldObj.field != 'Position.FrontSpacing' &&
                      fieldObj.field != 'Position._X05_PEGLENGTH.ValData') {
                    this.historyService.captureActionExec({
                        funoriginal: original,
                        funRevert: revert,
                        funName: 'beforeFieldUpdate',
                    });
                  }
                    this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj);
                }
                pogObject.computeMerchHeight(ctx);
                if (!this.isListView) {
                    this.updateValue(this.itemData);
                }
                else {
                    this.updateListValue(this.itemData);
                }
                return;
            }
            if (valueOld != valueNew) {
                this.beforeFieldUpdate(data, fieldObj, valueOld, valueNew);
            }
            if (this.sharedService.link == 'allocate') {
            }
        } else {
            this.updatePOG_VM(data, field, valueOld);
            return;
        }
        //2019.3 Performance
        // turn off Calculate Distribution during update because it has alreadt been run
        // this.sectionobjectstore.SecObject = pogObject;
        pogObject.setSkipShelfCalculateDistribution();
        pogObject.clearSkipShelfCalculateDistribution();
    }

    public kendoDropDownOnChange(fieldObjChange): boolean {
        this.datasource = this.getActiveSection();
        const event = fieldObjChange.event;
        const fieldObj = fieldObjChange.fieldData;
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        this.oldValue = this.sharedService.getObjectField(undefined, fieldObj.field, undefined, itemData);
        if (fieldObj.field != 'Position.PegType' &&
        fieldObj.field != 'Position.FrontBars' &&
        fieldObj.field != 'Position.BackHooks' &&
        fieldObj.field != 'Position.IDOrientation' ) {
        itemData = this.sharedService.setObjectField(
            undefined,
            fieldObj.field,
            event.value ?? fieldObjChange.value,
            undefined,
            itemData,
        ) as SelectableList;
                  }
        let selectedPegType, canPegChange;
        let calDistributionFlag: boolean = false;
        let data = itemData;
        let field: string = fieldObj.field;
        let valueNew = event.value ?? fieldObjChange.value;
        let valueOld = this.oldValue;
        let pogObj = this.sharedService.getObject(data.$sectionID, data.$sectionID) as Section;
        const ctx = new Context(pogObj);
        let undoredoVal: any = {};
        const packageStyleNew: { id: string; idPackage: number; }[] = [];

        //revalidate with Ravindra
        if (data.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            let valPosChangeFlg = false;
            for (const selectPos of this.selectedMultiPositions) {
                const data = selectPos as Position;
                const parentItemData = this.sharedService.getParentObject(data, data.$sectionID);
                let errorFlag = false;
                switch (field) {
                    case 'Position.UnitCapping': {
                      if(data.Position.ProductPackage.IdPackageStyle != 1 || data.Position.IDMerchStyle != AppConstantSpace.MERCH_ADVANCED_TRAY){
                        errorFlag = true;
                        this.notifyService.warn('UNIT_CAPPING_CANT_BE_CHANGED_NOT_IN_TRAY');
                      }
                      break;
                    }
                    case 'Position.IDPackage': {
                        if (data.hasBackItem || data.hasAboveItem) {
                            errorFlag = true;
                            this.notifyService.warn('CANT_CHANGE_PACKAGE_ABOVE_BEHIND_ITEMS');
                        }
                        if (this.sharedService.getSelectedId(this.sectionID).length > 1) {
                            if (valueNew != 1 && data.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY) {
                                errorFlag = true;
                                this.selectedPkgStyle = undefined;
                                this.notifyService.warn('PKG_STYLE_CAN_NOT_BE_CHANGED_WHEN_ADVANCED_TRAY');
                            } else {
                                this.selectedPkgStyle = valueNew;
                                const latestPkgStyle = this.getLatestAvailablePkgStyle(data.Position.AvailablePackageType, valueNew);
                                packageStyleNew.push({ id: data.$id, idPackage: latestPkgStyle.IDPackage });
                            }
                        } else {
                            if (data.Position.AvailablePackageType.filter((AvailablePkgs) => { return AvailablePkgs.IDPackage == valueNew; })[0].IdPackageStyle != 1 &&
                                data.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY) {
                                errorFlag = true;
                                this.notifyService.warn('PKG_STYLE_CAN_NOT_BE_CHANGED_WHEN_ADVANCED_TRAY');
                            }
                            else if (data.Position.AvailablePackageType.filter((AvailablePkgs) => { return AvailablePkgs.IDPackage == valueNew; })[0].IdPackageStyle == AppConstantSpace.PKGSTYLE_TRAY &&
                                data.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY && data.Position.LKDividerType==AppConstantSpace.DIVIDER_FACINGS_LEFT) {
                                errorFlag = true;
                                this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
                            }
                        }
                        break;
                    }
                    case 'Position.IDOrientation': {
                      let valueToCheck = valueNew;
                        if (valueNew == -1) {
                              valueToCheck = data.getDefaultOrientation();
                        }
                        if (!(Utils.checkIfBasket(parentItemData) || Utils.checkIfCoffincase(parentItemData)) && !(!pogObj.fitCheck || data.isValidFitChange(valueToCheck, field))) {
                          errorFlag = true;
                          this.notifyService.warn('FIT_CHECK_ERROR');
                        }
                        else if(Utils.checkIfstandardShelf(parentItemData)) {
                          parentItemData.computePositionsAfterChange(ctx);
                          const response = this.crunchMode.rePositionOnCrunch(ctx, parentItemData);
                          if (response && response.revertFlag) {
                            data.Position.IDOrientation = Number(valueOld);
                            const rollBefore = data.getOrientation();
                            data.setOrientation(rollBefore);
                            this.notifyService.warn(response.message.toString());
                            errorFlag = true;
                          }
                        } else if (Utils.checkIfBasket(parentItemData) || Utils.checkIfCoffincase(parentItemData)) {
                            const response = parentItemData.checkShrinkForOrientation(valueToCheck, data);
                            if (response && response.revertFlag) {
                                data.Position.IDOrientation = Number(valueOld);
                                this.notifyService.warn(response.message.toString());
                                errorFlag = true;
                            }
                        }
                        break;
                    }
                    case 'Position.IDMerchStyle': {
                        const oldPosVal = this.selectedMultiPositions.length > 1 ? selectPos.Position.IDMerchStyle : valueOld;
                        if (valueNew == AppConstantSpace.MERCH_MANUAL_TEXT || oldPosVal == AppConstantSpace.MERCH_MANUAL_TEXT) {
                            if (data.hasBackItem || data.hasAboveItem) {
                                errorFlag = true;
                                this.notifyService.warn('CANT_CHANGE_THE_MERCH_STYLE_IF_IT_HAS_ABOVE_BEHIND_ITEMS');
                            }
                        }
                        if (valueNew == AppConstantSpace.MERCH_ADVANCED_TRAY) {
                            var shelf = filter(data.parent.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
                            if (data.Position.ProductPackage.IdPackageStyle != 1) {
                                errorFlag = true;
                                this.notifyService.warn('SELECT_TRAY_PKG_STYLE_ADVANCED_TRAY');
                            }
                            else if(data.Position.ProductPackage.IdPackageStyle == AppConstantSpace.PKGSTYLE_TRAY && data.Position.LKDividerType==AppConstantSpace.DIVIDER_FACINGS_LEFT){
                                errorFlag = true;
                                this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
                            }
                            else if(shelf && (shelf.Fixture.LKDividerType == 2) && data.Position.ProductPackage.IdPackageStyle == AppConstantSpace.PKGSTYLE_TRAY && data.Position.LKDividerType==AppConstantSpace.INHERIT_FROM_SHELF){
                                errorFlag = true;
                                this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
                            }
                        }
                        break;
                    }
                    case 'Position.PegType': {
                        selectedPegType = this.pegLibraryService.PegLibrary.filter((x) => {
                            if (x.IDPegLibrary == valueNew && x.IsActive) {
                                return x;
                            }
                        })[0];
                        canPegChange = this.propertyGridPegValidationService.validatePegTypeChange(data, valueNew, selectedPegType);
                        if (!canPegChange.flag) {
                            errorFlag = true;
                            if(!canPegChange.cause || (canPegChange.cause !== 'PegLength')){
                              this.notifyService.warn('PEG_TYPE_CANT_CHANGED_PLEASE_CHECK_NUMBER_OF_FRONT_BARS_AND_PEGHOLES_OF_PRODUCT');
                            }
                        } else {
                            this.isPegTag = selectedPegType.IsPegTag;
                        }
                        break;
                    }
                    case 'Position.BackHooks': {
                        errorFlag = !this.propertyGridPegValidationService.validateBackHooks(data, valueNew);
                        if (!errorFlag) {
                            if (itemData.Position.BackHooks == 1) {
                                itemData.Position.BackSpacing = null;
                            }
                        }
                        break;
                    }
                    case 'Position.FrontBars': {
                        errorFlag = !this.propertyGridPegValidationService.validateFrontBars(data, valueNew);
                        if (!errorFlag) {
                            if (itemData.Position.FrontBars == 1) {
                                 itemData.Position.FrontSpacing = null;
                            }
                        }
                        break;
                    }
                    case 'Position.UnitCapping': {
                        //we need to check if it is having advanced tray position merch style selected and
                        let unitPackageItemInfos = pogObj.UnitPackageItemInfos.filter((unitDim) => { return unitDim.IDProduct == data.Position.IDProduct; })[0];
                        if (!unitPackageItemInfos) {
                            errorFlag = true;
                            this.notifyService.warn('PLEASE_CHECK_THE_SELECTED_PRODUCT_HAVE_UNIT_DATA_OR_NOT');
                        }
                        break;
                    }
                    case AppConstantSpace.POS_LKDIVIDERTYPE: {
                        //we need to check if it is having advanced tray Dividers doesn't make Dividers Left
                        var shelf = filter(data.parent.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
                        if(data.Position.ProductPackage.IdPackageStyle === AppConstantSpace.PKGSTYLE_TRAY && data.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY && valueNew== AppConstantSpace.DIVIDER_FACINGS_LEFT){
                            errorFlag = true;
                            this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
                          }
                        else if(shelf && (shelf.Fixture.LKDividerType == 2) && data.Position.ProductPackage.IdPackageStyle === AppConstantSpace.PKGSTYLE_TRAY && data.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY && valueNew== AppConstantSpace.INHERIT_FROM_SHELF){
                            errorFlag = true;
                            this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
                          }
                          break;
                    }
                }
                if (errorFlag) {
                    this.updatePOG_VM(itemData, field, this.oldValue);
                    parentItemData.computePositionsAfterChange(ctx);
                    return;
                }
            }
            if (field == 'Position.IDPackage') {
                let unqPosHisID = this.historyService.startRecording();
                // To skip unchanged position
                const changedMultiplePosition = this.selectedMultiPositions.filter(selectPos => {
                    const newPackage = packageStyleNew.find(pos => pos.id === selectPos.$id);
                    const newPackageId = this.selectedMultiPositions.length > 1 ? newPackage.idPackage : valueNew;
                    return this.selectedMultiPositions.length == 1 || selectPos.Position.IDPackage !== newPackageId;
                });
                let pkgResponseCount = 1;
                for (const selectPos of changedMultiplePosition) {
                    const newPackage = packageStyleNew.find(pos => pos.id === selectPos.$id);
                    const newPackageId = this.selectedMultiPositions.length > 1 ? newPackage.idPackage : valueNew;
                    this.subscriptions.add(
                        this.planogramService.getPackageTypeInfo(newPackageId).subscribe((res) => {
                            this.originalData = selectPos;
                            this.sharedService.setObjectField(undefined, field, newPackageId, undefined, this.originalData);
                            this.applyChanges(res.Data);
                            this.eventEmit(field, selectPos, pogObj, newPackageId);
                            this.imageSrc = this.getImage();

                            this.updatePOG_VM(data, field, newPackageId);
                            if (pkgResponseCount === changedMultiplePosition.length) {
                                this.historyService.stopRecording([1, 2, 3], undefined, unqPosHisID, fieldObj);
                            }
                            pkgResponseCount++;
                        })
                    );
                }
                return;
            }
            let unqPosHistoryID = this.historyService.startRecording();
            for (const selectPos of this.selectedMultiPositions) {
                data = selectPos as Position;
                let oldPosVal =
                    this.selectedMultiPositions.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : valueOld;
                if (field == 'Position.PegType') {
                    this.propertyGridPegValidationService.changePegType(data, selectedPegType, canPegChange);
                }
                if (field == 'Position.BackHooks' ||
                  field == 'Position.FrontBars') {
                  this.propertyGridPegValidationService.changePegFields(data, field, valueNew);
                }
                if (field == 'Position.IDMerchStyle') {
                    if (valueNew == '302' && data.Position.FacingsY > data.Position.FacingsX) {
                        this.updatePOG_VM(data, 'Position.FacingsY', data.Position.FacingsX);
                    }
                    if (valueNew == AppConstantSpace.MERCH_MANUAL_TEXT || valueOld == AppConstantSpace.MERCH_MANUAL_TEXT) {
                        this.applyDependentAccessType(fieldObj, data);
                    }
                    if(valueNew == AppConstantSpace.MERCH_ADVANCED_TRAY && Utils.isNullOrEmpty(data.Position.UnitCapping)){
                        let cappingDefaultVal=this.planogramStore.appSettings.defaultUnitCappingForAdvancedTray;
                        data.changeAdvanceTrayCapping(data,cappingDefaultVal);
                    }
                    if (valueNew != valueOld &&
                        ([AppConstantSpace.MERCH_ABOVE_TEXT, AppConstantSpace.MERCH_BEHIND_TEXT].indexOf(
                            valueNew.toString(),
                        ) != -1 ||
                            [AppConstantSpace.MERCH_ABOVE_TEXT, AppConstantSpace.MERCH_BEHIND_TEXT].indexOf(
                                valueOld.toString(),
                            ) != -1)
                    ) {
                        undoredoVal.baseItem = data.baseItem;
                        data.baseItem &&
                            (this.sharedService.getObject(data.baseItem, data.$sectionID)[
                                Number(valueOld) == AppConstantSpace.MERCH_BEHIND
                                    ? 'hasBackItem'
                                    : Number(valueOld) == AppConstantSpace.MERCH_ABOVE
                                        ? 'hasAboveItem'
                                        : 'hasAboveItem'
                            ] = false);
                        data.baseItem = '';
                    }
                }
                if (field == 'Position.IDOrientation') {
                  data.setOrientation(valueNew, { oldVal: valueOld as number });
                } else {
                    if (valueOld != valueNew) {
                        const lookUpData = this.planogramStore.lookUpHolder;
                        const FieldArray = field.split('.');
                        const DictObj = this.getFromDict(FieldArray[1]); // findWhere(DictRecords.records, { 'DictionaryName': key });
                        if (DictObj != undefined && DictObj.LkUpGroupName != null && DictObj.LkUpGroupName != '') {
                            const LkValues = lookUpData[DictObj.LkUpGroupName].options;
                            const LkSelected: any = find(LkValues, { value: Number(valueNew) });
                            data.Position[FieldArray[1] + 'text'] = LkSelected ? LkSelected.text : '';
                        }
                    }
                }
                //2019.3 Performance
                if (
                  field != 'Position.IDOrientation' &&
                    (data.Position.FacingsX ||
                        data.Position.FacingsY ||
                        data.Position.FacingsZ ||
                        data.Position.GapX ||
                        data.Position.GapY ||
                        data.Position.GapZ ||
                        data.Position.SKUGapX ||
                        data.Position.SKUGapY ||
                        data.Position.SKUGapZ)
                ) {
                    calDistributionFlag = true;
                }
                let valueNewUpdated = valueNew;
                if(field == 'Position.IDOrientation' && valueNew == -1){
                  valueNewUpdated = data.getDefaultOrientation();
                }
                if (oldPosVal != valueNewUpdated) {
                    valPosChangeFlg = true;
                    this.sharedService.setObjectField(undefined, field, valueNewUpdated, undefined, data);
                    this.beforeFieldUpdate(data, fieldObj, oldPosVal, valueNewUpdated, undoredoVal);
                    this.planogramService.insertPogIDs([data], true);
                }

                if (!valPosChangeFlg) {
                    this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
                }
                if (calDistributionFlag) {
                    const parentItemData = this.sharedService.getParentObject(data, data.$sectionID);
                    parentItemData.computePositionsAfterChange(ctx);
                }
                let original = ((model, field, value) => {
                    return () => {
                        this.updatePOG_VM(model, field, value);
                    };
                })(itemData, field, valueNewUpdated);
                let revert = ((model, field, value) => {
                    return () => {
                        this.updatePOG_VM(model, field, value);
                    };
                })(itemData, field, valueOld);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'beforeFieldUpdate',
                });

            }
            let valueNewUpdated = valueNew;
            if(field == 'Position.IDOrientation' && valueNew == -1){
              valueNewUpdated = data.getDefaultOrientation();
            }
            this.historyService.stopRecording([1, 2, 3], undefined, unqPosHistoryID, fieldObj);
            this.updatePOG_VM(data, field, valueNewUpdated);
            return;
        }

        //revalidate with Ravindra
        if (data.ObjectType == AppConstantSpace.FIXTUREOBJ || this.propertyGridType == PropertyPaneType.Multiple
            || this.propertyGridType == AppConstantSpace.MULTIFIXEDIT) {
            let unqHistoryID,
                valChangeFlg = false;
            for (const selFix of this.selectedFixtures) {
                data = selFix as SelectableList;
                let oldVal =
                    this.selectedFixtures.length > 1
                        ? this.sharedService.getObjectField(undefined, field, undefined, data)
                        : valueOld;
                // checking Shelf Fitcheck and Valid X/Y changes : @Ravindra
                if (
                    data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ &&
                    (field === AppConstantSpace.LOCATION_X || field === AppConstantSpace.LOCATION_Y)
                ) {
                    if (!this.planogramHelper.checkValidShelfXYChanges(data, field, valueNew, valueOld, pogObj.isBayPresents)) {
                        valueNew = oldVal;
                        //break;
                    }
                }
                if (oldVal != valueNew) {
                    valChangeFlg = true;
                    unqHistoryID ? '' : (unqHistoryID = this.historyService.startRecording());
                    if (
                        (data.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                            data.ObjectDerivedType == AppConstantSpace.BASKETOBJ) &&
                        field == 'Fixture.DisplayViews'
                    ) {
                        data.Fixture.DisplayViews = Number(valueNew);
                    }
                    this.sharedService.setObjectField(undefined, field, valueNew, undefined, data);
                    this.beforeFieldUpdate(data, fieldObj, oldVal, valueNew, undoredoVal);
                    this.planogramService.insertPogIDs([data], true);
                } else {
                    this.sharedService.setObjectField(undefined, field, oldVal, undefined, data);
                }
            }
            unqHistoryID ? this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj) : '';
            if (!valChangeFlg) {
                this.sharedService.setObjectField(undefined, field, valueOld, undefined, itemData);
            }
            pogObj.computeMerchHeight(ctx);
            return;
        }

        //revalidate with Ravindra
        if (data.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
            if (field == AppConstantSpace.MOVEMENT) {
                data.LKFixtureMovement = Number(valueNew);
                data.applyRenumberingShelfs();
                this.isUndoRequiredLibrary = true;
            }
            if(field == '_PegboardStackOrder.ValData' || field == '_PegboardLKTraffic.ValData'){
              data.getAllPegboards().forEach((pegFix) => {
                pegFix.Children = pegFix.pegPositionSort(pegFix);
              });
            }
            if(field == '_SlotwallStackOrder.ValData' || field == '_SlotwallLKTraffic.ValData'){
              data.getAllSlotwalls().forEach((pegFix) => {
                pegFix.Children = pegFix.pegPositionSort(pegFix);
              });
            }
            if(field == '_CorssbarLKTraffic.ValData'){
              data.getAllCrobars().forEach((pegFix) => {
                pegFix.Children = pegFix.pegPositionSort(pegFix);
              });
            }
            if (field == 'shelfStackOrder' || field == 'LKTraffic') {
                data[field] = Number(valueNew);
                data.getAllPegFixtures().forEach((pegFix) => {
                  pegFix.Children = pegFix.pegPositionSort(pegFix);
                });
                data.applyRenumberingShelfs();
            }

            if (field === 'LKCrunchMode') {
                data.LKCrunchMode = Number(valueNew);
                data.applyCrunchmode();
            }
            if (field == 'IDPOGStatus') {
                const versionList = this.planogramStore.lookUpHolder.PlanogramVersion.options;
                let version = find(versionList, { value: Number(valueNew) });

                if (Number(valueNew) >= 3 && version) {
                    this.notifyService.warn(version.text + ' can not be selected');
                    data.IDPOGStatus = Number(valueOld);
                    return false;
                } else if (version) {
                    data.IDPOGStatus = valueNew;
                    this.isUndoRequiredLibrary = true;
                }
            }
            let dicName = field.split('.')[0];
            if (
                [
                    '_X03_SEDESCX49',
                    '_X03_SEMEASX50',
                    '_X07_SEEXTDESC13',
                    '_X16_SEEXTDESC15',
                    '_X08_SEEXTDESC14',
                ].indexOf(dicName) != -1
            ) {
                //POG Classifier Code - _X03_SEMEASX50 _X03_SEDESCX49 Fixture Type - _X07_SEEXTDESC13 Door Count - _X03_SEDESCX50
                if (['_X03_SEMEASX50'].indexOf(dicName) != -1 && valueNew != 3) {
                    undoredoVal.storeNumber = this.sharedService.getObjectField(
                        undefined,
                        '_X03_SEDESCX49.DescData',
                        undefined,
                        data,
                    );
                    this.sharedService.setObjectField(undefined, '_X03_SEDESCX49.DescData', '', undefined, data);
                    this.isUndoRequiredLibrary = true;
                } else if (['_X07_SEEXTDESC13'].indexOf(dicName) != -1) {
                    const fixtureType = this.AppSettingsSvc.FIXTURE_TYPE_LOOKUP.find((it) => it.Value == valueNew);
                    const flag = fixtureType?.Options?.HasDoors;
                    if (!flag) {
                        undoredoVal.doorCount = this.sharedService.getObjectField(
                            undefined,
                            '_X03_SEDESCX50.DescData',
                            undefined,
                            data,
                        );
                        this.sharedService.setObjectField(undefined, '_X03_SEDESCX50.DescData', '', undefined, data);
                        this.isUndoRequiredLibrary = true;
                    }
                }
                for (let i = 0; i < Object.keys(this.ABSFiledsList).length; i++) {
                    this.applyDependentABSFields(data, this.ABSFiledsList[Object.keys(this.ABSFiledsList)[i]]);
                }
            }

            if (field == 'IDPerfPeriod') {
                this.subscriptions.add(
                    this.planogramPerformanceService
                        .getPerformanceData(data.$sectionID, valueNew)
                        .subscribe((performanceData: IApiResponse<Performance[]>) => {
                            if (performanceData) {
                                this.planogramPerformanceService.applyPerformanceData(
                                    data.$sectionID,
                                    valueNew,
                                    performanceData.Data,
                                );
                            }
                        }),
                );
                this.isMovement = valueNew == -1 ? true : false;
            }

            if (field === AppConstantSpace.UPRIGHT_DESC_DATA) {
                this.updateUprightType(valueNew);
            }
        }

        if (valueOld != valueNew && field != 'Position.IDPackage') {
            this.beforeFieldUpdate(data, fieldObj, valueOld, valueNew, undoredoVal);
        }
        //2019.3 Performance
        // turn off Calculate Distribution during update because it has alreadt been run
        pogObj.setSkipShelfCalculateDistribution();
        // setTimeout(() => {    // commented by Amit
        pogObj.clearSkipShelfCalculateDistribution();
        if (this.selectedMultiPositions.length > 1) {
            this.itemData = this.getItemDataForMultiPositionEdit();
            !this.isListView ? this.updateValue(this.itemData) : this.updateListValue(this.itemData);
        }
    }

    private updatePOG_VM(
        oldVM_Entity: SelectableList,
        fieldPathStr: string,
        newValue: boolean | number | string | Date,
    ): void {
        //lets update POG as well as kendo grid datasource
        if (this.selectedMultiPositions.length == 1) {
            this.sharedService.setObjectField(oldVM_Entity.$id, fieldPathStr, newValue, this.sectionID);
        }
        this.itemData = this.selectedMultiPositions.length > 1 ? this.getItemDataForMultiPositionEdit() : oldVM_Entity;
        this.updateValue(this.itemData);
        this.updateListValue(this.itemData);
    }

    private snapToRightShelf(shelfItemData, rootObject, valueOld, proposedWidth): void {
        let proposedX1PosToPog = shelfItemData.getXPosToPog();
        let proposedYPosToPog = shelfItemData.getYPosToPog(true);
        let proposedX2PosToPog = proposedX1PosToPog + proposedWidth;
        proposedX2PosToPog = Utils.isNullOrEmpty(valueOld) ? proposedX2PosToPog : proposedX1PosToPog + valueOld;
        proposedX2PosToPog = (function () {
            return rootObject.getNearestXCoordinate(proposedX2PosToPog, 'rightmost');
        })();
        if (shelfItemData.Fixture.SnapToLeft) {
            proposedWidth = proposedX2PosToPog - proposedX1PosToPog;
            proposedX1PosToPog = proposedX2PosToPog - proposedWidth;
        } else {
            proposedX1PosToPog = proposedX2PosToPog - proposedWidth;
        }
        //var unqHistoryID = History.startRecording();
        shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth, {
            oldWidth: Utils.isNullOrEmpty(valueOld) ? proposedWidth : valueOld,
            oldLocY: shelfItemData.Location.Y,
        });
    }

    //handles undo/redo
    private beforeFieldUpdate(model, fieldObj, oldValue, newValue, undoredoValues?, isHistoryRec?): void {
        let unqHistoryID: string = this.historyService.startRecording();
        let field = fieldObj.field;
        //(model.ObjectType != AppConstantSpace.FIXTUREOBJ || isHistoryRec) && (unqHistoryID = History.startRecording());
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let oldUprights = rootObject.Upright;
        let newLoc: any = { X: 0, Y: 0 };
        let oldLoc: any = {};
        //only works for constrain updates
        //i.e. MinFacingsX, MaxFacingsX, MaxFacingsY, MaxLayoversY
        if (model.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            model.checkAndCalcIfContrainUpdated(field, newValue, oldValue);
        }
        let modularOldValue = oldValue;
        if (
            (field == 'Dimension.Width' && model.ObjectType == AppConstantSpace.POG) ||
            (field == 'Fixture.Width' && model.ObjectDerivedType == AppConstantSpace.MODULAR)
        ) {
            if (rootObject.uprightType === UprightType.Variable) {
                let modular = model, modularNewValue = newValue;
                let widthGettingIncreased = oldValue > newValue ? false : true;
                if (model.ObjectType == AppConstantSpace.POG) {
                    modular = model.getLastModular();
                    modularOldValue = modular.Dimension.Width;
                    modularNewValue = modular.Dimension.Width + (newValue - oldValue);
                    modular.Fixture.Width = modularNewValue;
                    modular.Dimension.Width = modularNewValue;
                }
                const removeUprt = rootObject.removeUpright(modular, modularOldValue);
                removeUprt.removeUprights.splice(0, 1);
                for (let [i, itm] of removeUprt.removeUprights.entries()) {
                    if (modular.Location.X + modular.Fixture.Width < removeUprt.removeUprights[i]) {
                        removeUprt.removeUprights.splice(i, 1);
                        i--;
                    }
                }
                removeUprt.sum = removeUprt.sum + (modularNewValue - modularOldValue);
                removeUprt.removeUprights[removeUprt.removeUprights.length] =
                    modular.Location.X + modular.Fixture.Width;
                rootObject.addUprightOnSecWidthChange(modular, removeUprt, rootObject.Dimension.Width, widthGettingIncreased);
                if (model.ObjectType == AppConstantSpace.POG) {
                    modular.Fixture.Width = modularOldValue;
                    modular.Dimension.Width = modularOldValue;
                }
            }
            this.uprightService.updateUpright(rootObject, rootObject.Upright);
            rootObject.checkSnapFixtures();
            const ctx = new Context(rootObject);
            rootObject.computeMerchHeight(ctx);
            this.isUndoRequiredLibrary = true;
        } else if (field == 'Position.FacingsY') {
            let parent: SelectableList = this.sharedService.getObject(
                model.$idParent,
                model.$sectionID,
            ) as SelectableList;
            if (Utils.checkIfPegboard(parent) || Utils.checkIfSlotwall(parent)) {
                const oldLinearHt = parent.linearHeightPosition(model, oldValue, field),
                    newLinearHt = model.linearHeight();
                const diffHt = newLinearHt - oldLinearHt;
                newLoc = model.Location.Y - diffHt;
                newLoc = parent.getPosXY(model, model.Location.X, newLoc);
                oldLoc.X = model.Location.X;
                oldLoc.Y = model.Location.Y;
                parent.setPositionLocationX(model, newLoc.X);
                parent.setPositionLocationY(model, newLoc.Y);
                this.isUndoRequiredLibrary = true;
            }
        } else if (field == 'Position.attributeObject.RecMustStock') {
            model.Position.attributeObject.RecMustNotStock = false;
            this.isUndoRequiredLibrary = true;
            if (this.parentApp.isAllocateApp) {
                this.allocateService.updatePlacementRules(model);
            }
        } else if (field == 'Position.attributeObject.RecMustNotStock') {
            model.Position.attributeObject.RecMustStock = false;
            this.isUndoRequiredLibrary = true;
            if (this.parentApp.isAllocateApp) {
                this.allocateService.updatePlacementRules(model);
            }
        } else if (field == 'Position.attributeObject.ForceFit' && this.parentApp.isAllocateApp) {
            this.allocateService.updatePlacementRules(model);
        }

        if (field == 'Dimension.Height' && model.ObjectType == AppConstantSpace.POG) {
            this.undoRedoLibraryToBase(field, newValue, model.globalUniqueID, rootObject, model);
            this.isUndoRequiredLibrary = true;
        }

        // move fixture by changing the first notch
        if (field === AppConstantSpace.FIRST_NOTCH && model.ObjectType === AppConstantSpace.POG) {
            rootObject.applyRenumberingShelfs(newValue);
            this.sharedService.gridReloadSubscription.next(true);
        }

        // move fixture by changing the notch space
        if (field === AppConstantSpace.NOTCH_SPACE && model.ObjectType === AppConstantSpace.POG) {
            rootObject.applyRenumberingShelfs();
            this.sharedService.gridReloadSubscription.next(true);
        }

        // Regenerate dividers to show properly in SVG
        if ((field == 'Fixture.Width' || field == 'Fixture.Depth' || field == 'Fixture.Height' ||
            field === 'Fixture.SnapToLeft' || field === 'Fixture.SnapToRight') &&
            Utils.checkIfCoffincase(model)) {
            const hasAnyDivider = model.Children.find(ch => ch.ObjectDerivedType === AppConstantSpace.DIVIDERS);
            hasAnyDivider ? this.crunchMode.regenerateDividers(model) : undefined;
        }

        if (model.ObjectDerivedType == AppConstantSpace.SECTIONOBJ && field == 'fitCheck' && model.fitCheck) {
            model.getAllCoffinCases().forEach(coffin => {
                if (coffin.Fixture.LKCrunchMode === CrunchMode.NoCrunch) {
                    this.crunchMode.rePositionCoffinCaseOnCrunch(coffin, coffin.Fixture.LKCrunchMode);
                }
            });
        }

        //unqHistoryID = this.historyService.startRecording();
        const original = ((
            sharedService,
            $id,
            field,
            value,
            sectionId,
            guiId,
            isUndoRequired,
            oldUprights,
            LocXY,
            undoredoValues,
            fieldObj
        ) => {
            return () => {
                this.sharedService.setObjectField($id, field, value, sectionId);
                let model = this.sharedService.getObject($id, sectionId) as SelectableList;
                this.applyDependentAccessType(fieldObj, model);
                const rootObject = this.sharedService.getObject(sectionId, sectionId) as Section;
                if (isUndoRequired) {
                    this.undoRedoLibraryToBase(
                        field,
                        value,
                        guiId,
                        rootObject,
                        model,
                        oldUprights,
                        LocXY,
                        undoredoValues,
                    );
                }
                this.eventEmit(field, model, rootObject, value);
                if (field == 'LKTraffic') {
                    //data.LKTraffic = Number(valueNew);
                    rootObject.applyRenumberingShelfs();
                }
                if (field == 'shelfStackOrder' || field == 'FirstNotch' || field == 'Notch' || field == '_Reversenotch.FlagData') {
                    //data.shelfStackOrder = Number(valueNew);
                    rootObject.applyRenumberingShelfs();
                }
                if(field === AppConstantSpace.UPRIGHT_DESC_DATA) {
                    this.updateUprightType(Number(newValue));
                }
                if(field === AppConstantSpace.UPRIGHT) {
                    this.updateUprightOnUndoRedo(fieldObj, newValue);
                }
            };
        })(
            this.sharedService,
            model.$id,
            field,
            newValue,
            this.sectionID,
            model.globalUniqueID,
            this.isUndoRequiredLibrary,
            rootObject.Upright,
            newLoc,
            undoredoValues,
            fieldObj
        );
        const revert = ((
            sharedService,
            $id,
            field,
            value,
            sectionId,
            guiId,
            isUndoRequired,
            oldUprights,
            LocXY,
            undoredoValues,
            fieldObj
        ) => {
            return () => {
                this.sharedService.setObjectField($id, field, value, sectionId);
                const model = this.sharedService.getObject($id, sectionId) as SelectableList;
                this.applyDependentAccessType(fieldObj, model);
                const rootObject: Section = this.sharedService.getObject(sectionId, sectionId) as Section;
                if (isUndoRequired) {
                    this.undoRedoLibraryToBase(
                        field,
                        value,
                        guiId,
                        rootObject,
                        model,
                        oldUprights,
                        LocXY,
                        undoredoValues,
                    );
                }
                this.eventEmit(field, model, rootObject, value);
                if (field == 'LKTraffic') {
                    //data.LKTraffic = Number(valueNew);
                    rootObject.applyRenumberingShelfs();
                }
                if (field == 'shelfStackOrder' || field == 'FirstNotch' || field == 'Notch' || field == '_Reversenotch.FlagData') {
                    //data.shelfStackOrder = Number(valueNew);
                    rootObject.applyRenumberingShelfs();
                }
                if(field === AppConstantSpace.UPRIGHT_DESC_DATA) {
                    this.updateUprightType(Number(oldValue));
                }
                if(field === AppConstantSpace.UPRIGHT) {
                    this.updateUprightOnUndoRedo(fieldObj, oldValue);
                }
            };
        })(
            this.sharedService,
            model.$id,
            field,
            oldValue,
            this.sectionID,
            model.globalUniqueID,
            this.isUndoRequiredLibrary,
            oldUprights,
            oldLoc,
            undoredoValues,
            fieldObj
        );
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'beforeFieldUpdate',
        });
        if ((model.ObjectType != AppConstantSpace.FIXTUREOBJ && this.selectedMultiPositions.length < 1) || isHistoryRec) {
            if (
                PosIntersectionArray.indexOf(field) != -1 ||
                FixtureIntersectionArray.indexOf(field) != -1 ||
                PogIntersectionArray.indexOf(field) != -1
            ) {
                this.planogramService.insertPogIDs([model], true);
            }
            this.historyService.stopRecording([1, 2, 3], undefined, unqHistoryID, fieldObj);
        }
        this.isUndoRequiredLibrary = false;

        if (oldValue != newValue && field != 'Position.IDPackage') {
            this.eventEmit(field, model, rootObject, newValue);
            this.changedValue = newValue;
        }
    }

    private undoRedoLibraryToBase(
        field: string,
        val,
        guiId,
        rootObject,
        model,
        oldUprights?: string,
        LocXY?,
        undoredoValues?,
    ): void {
        if (field == 'IDPOGStatus') {
            let versionList: LookUpChildOptions<any>[] = this.planogramStore.lookUpHolder.PlanogramVersion.options;
            let version: any = filter(versionList, { value: Number(val) });

            if (version) {
                val = version.text;
            }
            field = 'POGStatus';
        } else if (field == AppConstantSpace.MOVEMENT) {
            rootObject.applyRenumberingShelfs();
        }
        if (
            (field == 'Fixture.Width' && model.ObjectDerivedType == AppConstantSpace.MODULAR) ||
            (field == 'Dimension.Width' && model.ObjectType == AppConstantSpace.POG)
        ) {
            const ctx = new Context(rootObject);
            rootObject.Upright = oldUprights;
            this.uprightService.updateUpright(rootObject, rootObject.Upright);
            model.computeMerchHeight(ctx);
            rootObject.reassignLocationXofBays();
        } else {
            //LibraryToBase.getCurrentObject(guiId)[field] = val;
        }
        if (field == 'Position.FacingsY') {
            model.Location.X = LocXY.X;
            model.Location.Y = LocXY.Y;
        }
        if (field == 'Position.IDMerchStyle') {
            model.baseItem = undoredoValues.baseItem;
            model.baseItem &&
                (this.sharedService.getObject(model.baseItem, model.$sectionID)[
                    Number(val) == AppConstantSpace.MERCH_BEHIND
                        ? 'hasBackItem'
                        : Number(val) == AppConstantSpace.MERCH_ABOVE
                            ? 'hasAboveItem'
                            : 'hasAboveItem'
                ] = true);
        }
        if (field == 'Dimension.Height' && model.ObjectType == AppConstantSpace.POG) {
            //reduce the height of the modulars if changed height is valid
            let modularList: Modular[] = this.sharedService.getAllModulars(rootObject);
            for (const modular of modularList) {
                modular.Fixture.Height = val;
            }
        }
        if (field == 'Position.attributeObject.RecMustStock') {
            model.attributeObject.RecMustNotStock = !val;
        }
        if (field == 'Position.attributeObject.RecNotMustStock') {
            model.attributeObject.RecMustStock = !val;
        }
        if (field == 'Name' && model.ObjectType == AppConstantSpace.POG) {
            this.subscriptions.add(
                this.planogramLibraryService
                    .updateMapperObject([this.sharedService.getObjectFromIDPOG(rootObject.IDPOG)], true)
                    .subscribe(),
            );
        }
        let dicName = field.split('.')[0];
        if (['_X03_SEMEASX50'].indexOf(dicName) != -1 && val == 3) {
            //undoredoVal.storeNumber = this.sharedService.getObjectField(undefined, '_X03_SEDESCX49.DescData', undefined, data);
            this.sharedService.setObjectField(
                undefined,
                '_X03_SEDESCX49.DescData',
                undoredoValues.storeNumber,
                undefined,
                model,
            );
        } else if (['_X03_SEMEASX50'].indexOf(dicName) != -1 && val != 3) {
            //undoredoVal.storeNumber = this.sharedService.getObjectField(undefined, '_X03_SEDESCX49.DescData', undefined, data);
            this.sharedService.setObjectField(undefined, '_X03_SEDESCX49.DescData', '', undefined, model);
        } else if (['_X07_SEEXTDESC13'].indexOf(dicName) != -1) {
            const fixtureLookup = this.AppSettingsSvc.FIXTURE_TYPE_LOOKUP.find((it) => it.Value == val);
            let flag = fixtureLookup?.Options?.HasDoors;
            this.sharedService.setObjectField(
                undefined,
                '_X03_SEDESCX50.DescData',
                flag ? undoredoValues.doorCount : '',
                undefined,
                model,
            );
        }
    }
    private eachRecursive(obj: any, data: any): void {
        if (obj.hasOwnProperty('Children')) {
            obj.Children.forEach((child, key) => {
                if (Utils.checkIfPosition(child)) {
                    const selectedItemIndex = indexOf(obj.Children, data);
                    if (selectedItemIndex != -1) {
                        obj.Children[selectedItemIndex] = data;
                        return;
                    }
                }
                this.eachRecursive(child, data);
            }, obj);
        }
    }

    private eventEmit(field: string, data: SelectableList, pogObject?: Section, valueNew?: any): void {
        let itemData = data;
        this.eachRecursive(pogObject, data);
        const productlist = data.ObjectType == 'Fixture' ? data.Children : data.ObjectType == 'Position' ? [data] : [];
        const dObj = {
            field: field,
            newValue: valueNew,
            IDPOGObject: itemData.IDPOGObject,
            products: productlist,
            gridType: data.ObjectType,
            tab: this.translate.instant(
                this.tabList.tab[this.propertyGridService.selectedPropertiesTabIndex[this.propertyGridType]].title,
            ),
        };
        this.planogram_2DService.reArrangeRubberBandingAnchors();
        if (!this.isListView) {
            this.updateValue(itemData, valueNew);
        }
        else {
            this.updateListValue(itemData);
        }
        const parent = this.sharedService.getObject(itemData.$idParent, itemData.$sectionID);
        if (Utils.checkIfShoppingCart(parent)) {
            this.sharedService.changeInCartItems.next(true);
        } else {
            this.render2d.setDirty(dObj);
            this.sharedService.workSheetEvent.next(dObj);
            this.sharedService.updateGrillOnFieldChange.next(true);
            this.planogramService.refreshModularView.next(true);
            this.planogramService.updateNestedStyle.next(true);
            this.sharedService.updateValueInPlanogram.next(dObj);
            setTimeout(() => {
                this.sharedService.renderSeparatorAgainEvent.next(true);
                if(field === 'Position.IDPackage'){
                  this.propertyGridService.updatePropertyGridMetaData.next(416);//416 orientation
                }
            });
        }
        this.planogramService.updateNestedStyleDirty = true;
        if (
            this.propertyGridType == 'POG' &&
            (field == 'Dimension.Height' || field == 'Dimension.Width' || field == 'Dimension.Depth')
        ) {
            setTimeout(() => {
                this.sharedService.changeZoomView.next(1);
            }, 800);
        }
    }

    private applyChanges(currentPackage): void {
        this.newIDPackageAttribute = '' + this.originalData.Position.IDProduct + '@' + currentPackage.IDPackage;
        const section_$id = this.originalData.$sectionID;
        const itemData = this.sharedService.getObject(this.originalData.$id, section_$id);
        // TODO: @malu rootObj is Section (the mixin class) but there is no prop called InventoryModel!
        let rootObj = this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section;
        const hasPackageAttribute = has(rootObj.PackageAttributes, this.newIDPackageAttribute);
        const hasInventoryrootObject = has(rootObj.PackageInventoryModel, this.newIDPackageAttribute);
        const containsInventoryObject = has(this.originalData.Position, 'InventoryModel');

        if (!hasPackageAttribute) {
            let packageAttrDefaultTemp = cloneDeep(this.planogramStore.packageAttrDefaultTemplate);
            packageAttrDefaultTemp.IdPackage = currentPackage.IDPackage;
            packageAttrDefaultTemp.IdProduct = this.originalData.Position.IDProduct;
            rootObj.PackageAttributes[this.newIDPackageAttribute] = packageAttrDefaultTemp;
            rootObj.PackageAttributes[this.newIDPackageAttribute].RecADRI = this.originalData.Position.attributeObject.RecADRI;
        }
        if (!hasInventoryrootObject) {
            const newInventoryModel = Object.assign({},rootObj.InventoryModel);
            newInventoryModel.IDPackage = currentPackage.IDPackage;
            newInventoryModel.IDProduct = this.originalData.Position.IDProduct;
            rootObj.PackageInventoryModel[this.newIDPackageAttribute] = newInventoryModel;
        }
        if (!containsInventoryObject) {
            this.originalData.Position.InventoryModel = rootObj.InventoryModel;
        }
        let modifiedOrientation = this.originalData.IDOrientation;
        const availableNewOrientations = this.originalData.Position.AvailablePackageType.find(pkg => pkg.IdPackageStyle == currentPackage.IdPackageStyle && pkg.IDPackage == currentPackage.IDPackage)?.AvailablePackageOrientations;
        if (availableNewOrientations?.length && !availableNewOrientations.includes(modifiedOrientation)) {
          modifiedOrientation = currentPackage.DefaultOrientation;
        }
        this.wireUpUndoRedo(this.originalData.Position.ProductPackage, currentPackage, this.originalData.Position.IDOrientation, modifiedOrientation);
        this.originalData.Position.IDPackage = currentPackage.IDPackage;
        this.originalData.Position.ProductPackage = currentPackage;
        this.originalData.defaultOrinetation.XPegHole = this.originalData.Position.ProductPackage.XPegHole;
        this.originalData.defaultOrinetation.ProductPegHole2X = this.originalData.Position.ProductPackage.ProductPegHole2X;
        this.originalData.defaultOrinetation.YPegHole = this.originalData.Position.ProductPackage.YPegHole;
        this.originalData.Position.IsPeggable = !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.XPegHole) && this.originalData.defaultOrinetation.XPegHole > 0
            && !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.YPegHole) && this.originalData.defaultOrinetation.YPegHole > 0
        rootObj.PackageAttributes[this.newIDPackageAttribute].IdPackageAttribute = 0;
        //resetting when package change
        //@todo revalidate later
        this.originalData.Position.FacingsX = currentPackage.MinFacingsX;
        this.originalData.Position.FacingsY = 1;
        this.originalData.Position.LayoversY = 0;
        this.originalData.Position.LayoversZ = 0;
        this.originalData.Position.LayundersY = 0;
        this.originalData.Position.LayundersZ = 0;
        this.originalData.Position.ProductPackage.IDPackageStyle =
            this.originalData.Position.ProductPackage.IdPackageStyle = currentPackage.IdPackageStyle;
        if(this.originalData.hasRestrictedOrientation()){
          this.originalData.Position.IDOrientation = this.originalData.Position.ProductPackage.DefaultOrientation || 0;
        }
        this.planogramService.lookupText(this.originalData.Position.ProductPackage);
        let parentFixture = this.sharedService.getParentObject(this.originalData, this.originalData.$sectionID);
        const ctx = new Context(itemData.section);
        parentFixture.computePositionsAfterChange(ctx);
        if (this.parentApp.isAllocateApp) {
            this.allocateNpi.updateProductKeys([this.originalData], rootObj);
        }
    }

    private applyDependentABSFields(itemData: any, dictionary: TabChildren): void {
        switch (dictionary.IDDictionary) {
            case 0: {
                dictionary.ReadOnly = false;
                break;
            }
            case 5051: {
                //POG Classifier Code - _X03_SEMEASX50 _X03_SEDESCX49 Fixture Type - _X07_SEEXTDESC13 Door Count - _X03_SEDESCX50
                let val = this.sharedService.getObjectField(undefined, dictionary.field, undefined, itemData);
                if (!val || val == 0) {
                    let defaultVal = (val = this.AppSettingsSvc.POG_CLASSIFIER_LOOKUP.find((itm) => itm.Default).Value);
                    this.sharedService.setObjectField(itemData.$id, dictionary.field, defaultVal, itemData.$id);
                    dictionary[dictionary.field] = defaultVal;
                }
                if (val == 1) {
                    dictionary.ReadOnly = true;
                } else {
                    dictionary.ReadOnly = false;
                }
                break;
            }
            case 5202: {

                let POGClassifierDic = this.ABSFiledsList['5051'];

                let setStoreNumDataSource = (data) => {
                    this.ABSStoreNumber = data.map((item) => {
                        item.Value = item.Value.toString();
                        return item;
                    });
                    dictionary.ReadOnly = false;
                };
                dictionary.ReadOnly = true;
                if (this.sharedService.getObjectField(undefined, POGClassifierDic.field, undefined, itemData) == 3) {
                    if (
                        this.sharedService.storeListByPog[itemData.IDPOG] == undefined ||
                        this.sharedService.storeListByPog[itemData.IDPOG].length == 0
                    ) {
                        this.subscriptions.add(
                            this.propertyGridService.GetStoreListByPog(itemData.IDPOG).subscribe((data: any) => {
                                this.sharedService.storeListByPog[itemData.IDPOG] = data.Data;
                                setStoreNumDataSource(data.Data);
                            }),
                        );
                    } else {
                        setStoreNumDataSource(this.sharedService.storeListByPog[itemData.IDPOG]);
                    }
                }
                break;
            }
            case 1002103: {
                //Section Configuration - _X16_SEEXTDESC15
                let val = this.sharedService.getObjectField(undefined, dictionary.field, undefined, itemData);
                if (Utils.isNullOrEmpty(val)) {
                    let defaultVal = (val = this.AppSettingsSvc.SECTION_CONFIGURATION_LOOKUP.find(
                        (itm) => itm.Default,
                    )?.Value);
                    this.sharedService.setObjectField(itemData.$id, dictionary.field, defaultVal, itemData.$id);
                    dictionary[dictionary.field] = defaultVal;
                }
                dictionary.ReadOnly = false;
                break;
            }
            case 1002049: {
                //Fixture Type - _X07_SEEXTDESC13
                let val = this.sharedService.getObjectField(undefined, dictionary.field, undefined, itemData);
                if (Utils.isNullOrEmpty(val)) {
                    let defaultVal = (val = this.AppSettingsSvc.FIXTURE_TYPE_LOOKUP.find((itm) => itm.Default)?.Value);
                    this.sharedService.setObjectField(itemData.$id, dictionary.field, defaultVal, itemData.$id);
                    dictionary[dictionary.field] = defaultVal;
                }
                dictionary.ReadOnly = false;
                break;
            }
            case 5203: {
                //Door Count - _X03_SEDESCX50
                const fixTypeDic = this.ABSFiledsList['1002049'];
                const fixType = this.sharedService.getObjectField(undefined, fixTypeDic.field, undefined, itemData);
                const fixtureTypeLookupVal = this.AppSettingsSvc.FIXTURE_TYPE_LOOKUP.find((it) => it.Value == fixType);
                const flag = fixtureTypeLookupVal?.Options?.HasDoors;
                if (flag) {
                    dictionary.ReadOnly = false;
                } else {
                    dictionary.ReadOnly = true;
                }
                break;
            }
            case 1002050: {
                //Fixture Type Supplement  - _X08_SEEXTDESC14
                let val = this.sharedService.getObjectField(undefined, dictionary.field, undefined, itemData);
                if (Utils.isNullOrEmpty(val)) {
                    const defaultVal = (val = this.AppSettingsSvc.FIXTURE_TYPE_SUPPLEMENTS_LOOKUP.filter(function (
                        itm,
                    ) {
                        return itm.Default;
                    })[0].Value);
                    this.sharedService.setObjectField(itemData.$id, dictionary.field, defaultVal, itemData.$id);
                    dictionary[dictionary.field] = defaultVal;
                }
                dictionary.ReadOnly = false;
                break;
            }
        }
    }
    private getFromDict(key: string): Dictionary {
        if (!this.dictRecordsCache[key]) {
            const DictObj = this.dictConfigService.findByName(key);
            this.dictRecordsCache[key] = { searched: true, actualData: DictObj };
        }
        return this.dictRecordsCache[key].actualData;
    }

    public applyDependentAccessType(fieldObj: TabChildren, itemData: SelectableList): void {
        switch (itemData.ObjectType) {
            case PropertyPaneType.Multiple:
            case AppConstantSpace.FIXTUREOBJ:
                this.applyForFixture(fieldObj, itemData as FixtureList);
                break;

            case AppConstantSpace.POG:
                this.applyForSection(fieldObj, itemData as Section);
                break;

            case AppConstantSpace.POSITIONOBJECT:
                this.applyForPosition(fieldObj, itemData as Position);
                break;
            default:
                break;
        }
        return;
    }
    private wireUpUndoRedo(oldProductPackage: any, newProductPackage: any, originalOrientation?: number, modifiedOrientation?: number): void {
        //undo redo logic starts here
        let unqHistoryID: string = this.historyService.startRecording();
        let obj_$id = this.originalData.$id;
        let section_$id = this.originalData.$sectionID;
        const original = (($id, $sectionID, productPackage, orientation) => {
            return () => {
                let itemData = this.sharedService.getObject($id, $sectionID) as Position;
                itemData.Position.IDPackage = productPackage.IDPackage;
                itemData.Position.ProductPackage = productPackage;
                itemData.defaultOrinetation.XPegHole = itemData.Position.ProductPackage.XPegHole;
                itemData.defaultOrinetation.ProductPegHole2X = itemData.Position.ProductPackage.ProductPegHole2X;
                itemData.defaultOrinetation.YPegHole = itemData.Position.ProductPackage.YPegHole;
                itemData.Position.IsPeggable = !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.XPegHole) && this.originalData.defaultOrinetation.XPegHole > 0
                                          && !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.YPegHole) && this.originalData.defaultOrinetation.YPegHole > 0
                itemData.Position.ProductPackage.IDPackageStyle = itemData.Position.ProductPackage.IdPackageStyle = productPackage.IdPackageStyle;
                this.planogramService.lookupText(itemData.Position.ProductPackage);
                !Utils.isNullOrEmpty(orientation) ? itemData.Position.IDOrientation = orientation : '';
                let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
                const ctx = new Context(itemData.section);
                parentFixture.computePositionsAfterChange(ctx);
            };
        })(obj_$id, section_$id, newProductPackage, modifiedOrientation);
        const revert = (($id, $sectionID, productPackage, oldOrient) => {
            return () => {
                let itemData = this.sharedService.getObject($id, $sectionID) as Position;
                itemData.Position.IDPackage = productPackage.IDPackage;
                itemData.Position.ProductPackage = productPackage;
                itemData.defaultOrinetation.XPegHole = itemData.Position.ProductPackage.XPegHole;
                itemData.defaultOrinetation.ProductPegHole2X = itemData.Position.ProductPackage.ProductPegHole2X;
                itemData.defaultOrinetation.YPegHole = itemData.Position.ProductPackage.YPegHole;
                itemData.Position.IsPeggable = !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.XPegHole) && this.originalData.defaultOrinetation.XPegHole > 0
                                          && !Utils.isNullOrEmpty(this.originalData.defaultOrinetation.YPegHole) && this.originalData.defaultOrinetation.YPegHole > 0
                itemData.Position.ProductPackage.IDPackageStyle =
                itemData.Position.ProductPackage.IdPackageStyle = productPackage.IdPackageStyle;
                itemData.Position.IDOrientation = oldOrient;
                this.planogramService.lookupText(itemData.Position.ProductPackage);
                let parentFixture = this.sharedService.getParentObject(itemData, itemData.$sectionID);
                const ctx = new Context(itemData.section);
                parentFixture.computePositionsAfterChange(ctx);
            };
        })(obj_$id, section_$id, oldProductPackage, originalOrientation);
        this.propertyGridService.updatePropertyGridMetaData.next(416);//orientation dropdown update
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'PackageChange',
        });
        //@naren On package change we need to trigger the calculations so not handling the calculation part here.
        if(this.selectedMultiPositions.length < 1){
            this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        }
    }

    private applyForPosition(fieldObj: TabChildren, itemData: Position) {
        const parentItemData = this.sharedService.getParentObject(itemData, itemData.$sectionID);
        const rootObj = this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section;
        const allowEdit = this.sharedService.getPositionLockField(
            this.AppSettingsSvc.positionLockField,
            itemData as Position,
        );
        let fieldVerified: boolean = false;
        let allowEditField: boolean = false;
        if ([395, 397].indexOf(fieldObj.IDDictionary) != -1) {
            if (
                ([397].indexOf(fieldObj.IDDictionary) != -1 &&
                    (parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        parentItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
                        parentItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ)) ||
                parentItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                (itemData.Position.IDMerchStyle != AppConstantSpace.MERCH_MANUAL &&
                    parentItemData.Fixture.AutoComputeFronts &&
                    !(
                        parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        parentItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
                    ))
            ) {
                fieldVerified = true;
                allowEditField = false;
            } else {
                if (allowEdit.flag && allowEdit.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1) {
                    fieldVerified = true;
                    allowEditField = false;
                } else {
                    fieldVerified = true;
                    allowEditField = true;
                }
            }
        }
        //for autocompute depth
        if ([396, 398].indexOf(fieldObj.IDDictionary) != -1) {
            if (
                ([398].indexOf(fieldObj.IDDictionary) != -1 &&
                    (parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        parentItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
                        parentItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ)) ||
                (itemData.Position.IDMerchStyle != AppConstantSpace.MERCH_MANUAL &&
                    parentItemData.Fixture.AutoComputeDepth)
            ) {
                fieldVerified = true;
                allowEditField = false;
            } else {
                if (allowEdit.flag && allowEdit.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1) {
                    fieldVerified = true;
                    allowEditField = false;
                } else {
                    fieldVerified = true;
                    allowEditField = true;
                }
            }
        }

        if (
            [395].indexOf(fieldObj.IDDictionary) != -1 &&
            (parentItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                parentItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ)
        ) {
            if (allowEdit.flag && allowEdit.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1) {
                fieldVerified = true;
                allowEditField = false;
            } else {
                fieldVerified = true;
                allowEditField = true;
            }
        }
        if (
            Utils.performanceColumns.indexOf(fieldObj.IDDictionary) !== -1 ||
            fieldObj.IDDictionary == 3807 ||
            fieldObj.IDDictionary == 3805 ||
            fieldObj.IDDictionary == 3837
        ) {
            if (rootObj.IDPerfPeriod == -1 && fieldObj.AttributeType !== 'Calculated') {
                fieldVerified = true;
                allowEditField = true;
                fieldObj.ReadOnly = false;
            } else {
                fieldObj.ReadOnly = true;
            }
        }
        if (allowEdit?.flag && !fieldVerified) {
            if (
                ([394].indexOf(fieldObj.IDDictionary) != -1 &&
                    allowEdit.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) != -1) ||
                ([416].indexOf(fieldObj.IDDictionary) != -1 &&
                    allowEdit.list.indexOf(AppConstantSpace.ACTIONS.ORIENTATION) != -1)
            ) {
                fieldVerified = true;
                allowEditField = true;
            } else {
                fieldVerified = true;
                allowEditField = false;
            }
        }
        if (fieldVerified) {
            if (allowEditField) {
                fieldObj.ReadOnly = false;
            } else {
                fieldObj.ReadOnly = true;
            }
        } else {
            fieldObj.ReadOnly = false;
        }
        if (
            this.sharedService.link == 'allocate' &&
            this.sharedService.mode == 'manual' &&
            new RegExp('Position.inventoryObject').test(fieldObj.field)
        ) {
            fieldObj.ReadOnly = true;
        }
    }

    private applyForFixture(fieldObj: TabChildren, itemData: FixtureList): void {
        const fixImagryDict: number[] = [5341, 5347, 5343, 5349, 5338, 5344, 5339, 5345, 5340, 5346, 5342, 5348, 5508];
        if (
            this.isMultiFixMode &&
            ((fieldObj.IDDictionary == 3668 && (Utils.checkIfCoffincase(itemData) || Utils.checkIfBasket(itemData))) ||
                fixImagryDict.indexOf(fieldObj.IDDictionary) != -1)
        ) {
            fieldObj.ReadOnly = true;
        } else if (
            (!this.isMultiFixMode &&
                fieldObj.IDDictionary == 3668 &&
                (Utils.checkIfCoffincase(itemData) || Utils.checkIfBasket(itemData))) ||
            (this.isMultiFixMode &&
                fieldObj.IDDictionary == 3668 &&
                !(Utils.checkIfCoffincase(itemData) || Utils.checkIfBasket(itemData))) ||
            (!this.isMultiFixMode && fixImagryDict.indexOf(fieldObj.IDDictionary) != -1)
        ) {
            fieldObj.ReadOnly = false;
        } else if (
            Utils.performanceColumns.indexOf(fieldObj.IDDictionary) !== -1 ||
            fieldObj.IDDictionary == 3807 ||
            fieldObj.IDDictionary == 3805
        ) {
            if (
                (this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section).IDPerfPeriod == -1
            ) {
                fieldObj.ReadOnly = false;
            } else {
                fieldObj.ReadOnly = true;
            }
        }
    }

    private applyForSection(fieldObj: TabChildren, itemData: Section): void {
        if (
            Utils.performanceColumns.indexOf(fieldObj.IDDictionary) !== -1 ||
            fieldObj.IDDictionary == 3807 ||
            fieldObj.IDDictionary == 3805 ||
            fieldObj.IDDictionary == 3837
        ) {
            if ((this.sharedService.getObject(itemData.$sectionID, itemData.$id) as Section).IDPerfPeriod !== -1) {
                fieldObj.ReadOnly = true;

            }
        } else if (fieldObj.keyGroup == AppConstantSpace.ABSKEYGROUP) {
            this.applyDependentABSFields(itemData, fieldObj);
        }
    }

    // Top Icon Event
    public changeSideNavWidth(action: string, event: MouseEvent): void {
        this.sideNavWidth = this.PogSideNavStateService.changeSideNavWidth(action, this.sideNavWidth);
        event.stopPropagation();
    }

    public openInSideNav(): void {
        const parent = this.sharedService.getObject(this.itemData.$idParent, this.itemData.$sectionID);
        if (!Utils.checkIfShoppingCart(parent)) {
            this.dialogRef.close();
            this.sharedService.openSelectedComponentInSideNav.next({ activeScreen: 'PG', isPin: true });
        }
    }

    public OnpinUnpin(): void {
        this.isPin = !this.isPin;
        this.onPinUnpintoggle.emit(this.isPin);
    }

    public openDialog(): void {
        this.Onclose();
        this.allocateService.resizeParentWindow(true);
        const dialogRef = this.matDialog.open(PropertyGridComponent, {
            height: 'fit-content',
            width: '55%',
            data: this.isMultiple,
            panelClass: 'mat-dialog-move-cursor',
            id: 'property-grid-dialog'
        });
        dialogRef.afterClosed().subscribe((result) => {
            this.allocateService.resizeParentWindow(false);
            this.itemData = result;
        });
    }
    public close(): void {
        this.dialogRef.close();
    }
    public Onclose(): void {
        let gettxt = document.getElementById('PG');
        gettxt.style.fontWeight = '500';
        this.PogSideNavStateService.activeVeiw =
            this.PogSideNavStateService.activeVeiw == PogSideNaveView.PROPERTYGRID ? null : ('' as any);
        this.viewComponentInSideNav.emit(false);
    }

    public style(obj: object): number {
        return 12 / obj[`style`].column;
    }

    public findIndex(fieldObj: TabChildren): boolean {
        return [1002049, 1002050, 1002103, 5051, 5202].indexOf(fieldObj.IDDictionary) != -1;
    }

    public checkSelectInput(fieldObj: TabChildren): boolean {
        if (
            fieldObj.field == 'Fixture.LKCrunchMode' ||
            fieldObj.field == 'Position.IDPackage' ||
            (fieldObj.keyGroup == AppConstantSpace.ABSKEYGROUP && fieldObj.IDDictionary == 5202) ||
            (fieldObj.keyGroup == AppConstantSpace.ABSKEYGROUP && fieldObj.IDDictionary == 5051)
        ) {
            return true;
        } else {
            return false;
        }
    }

    public openEditors(fieldObjChange): void {
        const fieldObj = fieldObjChange.fieldData;
        let itemData = this.getSelectedPropertyData(fieldObjChange.fixType);
        if (fieldObj.changeHierarchy) {
            const dialogRef = this.matDialog.open(ChangeHierarchyComponent, {
                height: '70%',
                width: '40%',
                data: itemData,
            });
            dialogRef.afterClosed().subscribe((result) => {
                this.updateValue(itemData);
                this.updateListValue(itemData);
            });
        } else {
            let component;
            let height: string;
            let width: string;
            let minHeight: string = '';
            switch (fieldObj.field) {
                case `Fixture.HasGrills`:
                    component = GrillEditorComponent;
                    height = '60%';
                    width = '30%';
                    break;
                case `Fixture.HasDividers`:
                    component = DividerEditorComponent;
                    height = '77%';
                    width = '35%';
                    break;
                case `Upright`:
                    component = UprightEditorComponent;
                    height = '67%';
                    width = '40%';
                    break;
                case `POGQualifier`:
                    component = PogProfileEditorComponent;
                    height = 'fit-content';
                    width = '35%';
                    itemData;
                    break;
                case `Fixture.LeftImage.Url`:
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.Left;
                    break;
                case `Fixture.TopImage.Url`:
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.Top;
                    break;
                case `Fixture.BottomImage.Url`:
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.Bottom;
                    break;
                case `Fixture.RightImage.Url`:
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.Right;
                    break;
                case `Fixture.FrontImage.Url`:
                case 'FrontImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? itemData.side = FixtureImageSide.Front : itemData.Fixture.side = FixtureImageSide.Front;
                    break;
                case 'Position.EdgeImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Position.side = FixtureImageSide.Edge;
                    break;
                case 'Fixture.ForegroundImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.FGFront;
                    break;
                case 'Fixture.BackgroundFrontImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.BGFront;
                    break;
                case `Fixture.FrontImage.FarFrontUrl`:
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.FarFront;
                    break;
                case `Fixture.BackImage.Url`:
                case 'BackImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? itemData.side = FixtureImageSide.Back : itemData.Fixture.side = FixtureImageSide.Back;
                    break;
                case 'Fixture.BackgroundBackImage.Url':
                    component = ImageryComponent;
                    height = '80%';
                    width = '70%';
                    itemData.Fixture.side = FixtureImageSide.BGBack;
                    break;
                default:
                    break;
            }
            if (component != undefined) {
                const dialogRef = this.matDialog.open(component, {
                    minHeight: minHeight,
                    height: height,
                    width: width,
                    data: itemData,
                    autoFocus: false,
                });
                dialogRef.afterClosed().subscribe((result) => {
                    this.updateValue(itemData);
                    this.updateListValue(itemData);
                    this.sharedService.updateFooterNotification.next(true);
                });
            }
        }
    }

    public imposeMinMax(event): void {
        if ((event.which >= 48 && event.which <= 57) || (event.which >= 96 && event.which <= 105)) {
            if (
                parseInt(event.target[`value`]) <= parseInt(event.target[`min`]) ||
                parseInt(event.target[`value`]) >= parseInt(event.target[`max`])
            ) {
                event.preventDefault();
            }
        }
    }

    public scrollTabs(event): void {
        if (event.target.id == 'maintab') {
            const children = this.propertyTabGroup._tabHeader._elementRef.nativeElement.children;
            const back = children[0];
            const forward = children[2];
            if (event.deltaY > 0) {
                forward.click();
            } else {
                back.click();
            }
        }
    }

    private setUpIDMerchStyle(): void {
        let MerchStyleList = this.lookUpHolder.MERCHSTYLE.options;
        let MerchStyleListArry = MerchStyleList.slice(0);
        MerchStyleListArry.sort(function (a, b) {
            return a.value - b.value;
        });
        this.itemData.Position.IDMerchStyle = MerchStyleListArry[0].value;
    }

    public get selectedIndex(): string {
        return this.propertyGridService.selectedPropertiesTabIndex[this.propertyGridType];
    }

    public getFromPropertyFieldService(field: string): boolean {
        return this.propertyFieldService[field];
    }

    private strTranslate(text: string): string {
        if (!text || text.length < 1) return '';
        let strings: string[] = text.match(/@([\w,\.]+)@/g);
        if (strings) {
            strings.forEach((o) => {
                let os = this.translate.instant(o.replace(/^@+/, '').replace(/@+$/, ''));
                text = text.replaceAll(o, os);
            });
        } else {
            return this.translate.instant(text);
        }
        return text;
    }

    public changeGridView(): void {
        this.spinner.show();
        window.setTimeout(() => {
            this.positionIDDictionaries.length = 0;
            this.expandCount = 4;
            this.planogramStore.appSettings.propertygrid_default_view = !this.isListView ? 2 : 1;
            let result: AllSettings = this.planogramStore.allSettings.GetAllSettings.data.find(
                (val) => val.KeyName == 'USER_DEFAULTS.POG.PROPERTYGRID_VIEW_SETTING',
            );
            result.SelectedValue.value = this.planogramStore.appSettings.propertygrid_default_view
            this.subscriptions.add(this.propertyGridService.saveSetting([result]).subscribe(() => { }));
            if (this.selectedFixtures.length > 1) {
                this.getItemDataForMultiFix(this.selectedFixtures);
            }
            if (this.sharedService.getSelectedId(this.sectionID).length > 1 && this.propertyGridType === PropertyPaneType.Position) {
                this.getItemDataForMultiPositionEdit();
            }
            this.matListHeight();
            this.spinner.hide();
            if (!this.isListView) {
                this.updateValue(this.itemData);
            }
            else {
                this.updateListValue(this.itemData);
            }
        }, 100);
    }
    public evaluateExpression(gObjTable): boolean{
      if(gObjTable.expression){
        return eval(gObjTable.expression)(this);
      }
      return true;
    }
    public fieldChange(fieldObjChange): void {
        switch (fieldObjChange.type) {
            case 'list':
                this.kendoDropDownOnChange(fieldObjChange);
                break;
            case 'editors':
                this.openEditors(fieldObjChange);
                break;
            case 'text':
            case 'date':
                this.changeInTextInput(fieldObjChange);
                break;
            case 'float':
            case 'int':
                this.changeInNumericInput(fieldObjChange);
                break;
            case 'bool':
                this.checkboxOnChange(fieldObjChange);
                break;
            case 'color':
                if (fieldObjChange.fieldData.field != 'Position.attributeObject.Color') {
                    this.applyColorChange(fieldObjChange);
                } else {
                    this.setColorCode(fieldObjChange);
                }
                break;
        }
        if (this.isListView) {
            for (let obj of this.tabList.tab) {
                let index = obj.children.findIndex(field => field.IDDictionary == fieldObjChange.fieldData.IDDictionary)
                if (index > -1) {
                    obj.children[index][obj.children[index].field] = this.changedValue
                }
                for (let gObj of obj.group) {
                    //need to concatinate row children of gObj with children of gobj
                    let rowChild = [];
                    gObj?.table?.rows.forEach((fObj) => {
                      rowChild = rowChild.concat(fObj.children);
                    });
                    let configChild = rowChild.concat(gObj.children);
                    let index2 = configChild.findIndex(field => field.IDDictionary == fieldObjChange.fieldData.IDDictionary)
                    if (index2 > -1) {
                      configChild[index2][configChild[index2].field] = this.changedValue
                    }
                }
            }
        }
        else {
            for (let obj of this.allPropertyListViewData) {
                let index = obj.value.findIndex(field => field.IDDictionary == fieldObjChange.fieldData.IDDictionary)
                if (index > -1) {
                    obj.value[index][obj.value[index].field] = this.changedValue
                }
            }

        }
        this.updateReadonlyFields();
    }

    private updateReadonlyFields(): void {
        if(this.isListView){
            this.PropertyGridTabListView("value", this.allPropertyListViewData);
        }else{
            this.tabList.tab.forEach((element) => {
               this.PropertyGridTabListView("children", element.group);

            });
        }
    }

    private PropertyGridTabListView(readProperty: string, source: TabOptions[] | ConfigPropertyDisplay[]): void {
        for (let obj of source) {
            let isPegTag = false;
            let isPegTag1 = obj[readProperty].findIndex(field => field.IDDictionary == 5536);
            if (isPegTag1 > -1) {
                isPegTag = obj[readProperty].find(x => x.IDDictionary == 5536)['Position.IsPegTag'];
                obj[readProperty][isPegTag1].Checked = isPegTag;
            }
            let tagWidth = obj[readProperty].findIndex(field => field.IDDictionary == 5538);
            if (tagWidth > -1) {
                obj[readProperty][tagWidth].ReadOnly = !isPegTag
            }
            let tagHeight = obj[readProperty].findIndex(field => field.IDDictionary == 5537);
            if (tagHeight > -1) {
                obj[readProperty][tagHeight].ReadOnly = !isPegTag
            }
            let tagYOffset = obj[readProperty].findIndex(field => field.IDDictionary == 5539);
            if (tagYOffset > -1) {
                obj[readProperty][tagYOffset].ReadOnly = !isPegTag
            }
            let tagXOffset = obj[readProperty].findIndex(field => field.IDDictionary == 5540);
            if (tagXOffset > -1) {
                obj[readProperty][tagXOffset].ReadOnly = !isPegTag
            }
            let unitCapping = obj[readProperty].findIndex(field => field.IDDictionary == 5519);
            if (unitCapping > -1) {
                obj[readProperty][unitCapping].ReadOnly = this.itemData?.Position?.ProductPackage?.IdPackageStyle != 1 || this.itemData.Position.IDMerchStyle != AppConstantSpace.MERCH_ADVANCED_TRAY;
            }
        }
    }

    public listViewDataCreation(allPropertyList: ConfigPropertyDisplay[], checkReadOnlyField: boolean, filterApplicable?: boolean): void {

        for (let obj of allPropertyList) {
            let parentFixtureData = this.getSelectedPropertyData(obj.key);
            this.createSection(obj.value, obj.key, parentFixtureData, checkReadOnlyField);
            this.displayfieldChange(obj.key);
        }
        if(filterApplicable){
          this.allPropertyListViewData = [];
          allPropertyList.forEach(part => {
            let partClone = Object.assign({}, part);
            partClone.value = this.filterApplicableProperties([...partClone.value], partClone.key);
            this.allPropertyListViewData.push(partClone);
          });
        }
    }

    public getSelectedPropertyData(type): SelectableList {
        if (type === this.propertyGridType || type === AppConstantSpace.MULTIFIXEDIT) {
            return this.itemData;
        } else if (type === AppConstantSpace.POG) {
            return this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        } else if (type === AppConstantSpace.FIXTUREOBJ) {
            return this.sharedService.getParentObject(this.itemData);
        }
    }

    public ngOnDestroy(): void {
        this.uprightService.lastSelectedFixedUpright = '';
        this.uprightService.lastSelectedVariableUpright = '';
        this.subscriptions.unsubscribe();
    }

    public onCancel(): void {
        this.spinner.show();
        window.setTimeout(() => {
            this.isListViewSetting = false;
            this.sharedService.isListViewSetting = false;
            this.showSearchBox = false;
            this.expandCount = 4;
            this.listViewDataCreation(this.configList, false);
            this.matListHeight();
            this.spinner.hide();
        }, 100);
    }

    public onApply(): void {
        this.spinner.show();
        let allPropertyListViewDataNew =[];
        window.setTimeout(() => {
            let result: AllSettings = this.planogramStore.allSettings.GetAllSettings.data.find(
                (val) => val.KeyName == 'PROPERTYGRID_SETTINGS',
            );
            let data: PropertyGridSettings = JSON.parse(result.KeyValue as any);
            allPropertyListViewDataNew = [];
            let fixturePos = this.configList.findIndex(x => x.key === 'Fixture');
            let sectionPos = this.configList.findIndex(x => x.key === 'POG');
            let positionPos = this.configList.findIndex(x => x.key === 'Position');
            let multiFixPos = this.configList.findIndex(x => x.key === 'MULTIFIXEDIT');
            for (let obj of this.configList) {
                let displayValue = obj.value.filter((fObj) => fObj.displayField === true);
                allPropertyListViewDataNew.push({ key: obj.key, value: displayValue, checked: false });
                switch (obj.key) {
                    case AppConstantSpace.POG:
                        data.sectionSettings.listview.children = obj.value.map((a) => Object.assign({}, { IDDictionary: a.IDDictionary, displayField: a.displayField })) as any;
                        data.sectionSettings.listview.listViewOrder = sectionPos;
                        break;
                    case AppConstantSpace.FIXTUREOBJ:
                        data.fixtureSettings.listview.children = obj.value.map((a) => Object.assign({}, { IDDictionary: a.IDDictionary, displayField: a.displayField })) as any;
                        data.fixtureSettings.listview.listViewOrder = fixturePos;
                        break;
                    case AppConstantSpace.POSITIONOBJECT:
                        data.positionSettings.listview.children = obj.value.map((a) => Object.assign({}, { IDDictionary: a.IDDictionary, displayField: a.displayField })) as any;
                        data.positionSettings.listview.listViewOrder = positionPos;
                        break;
                    case AppConstantSpace.MULTIFIXEDIT:
                        data.multiFixSettings.listview.children = obj.value.map((a) => Object.assign({}, { IDDictionary: a.IDDictionary, displayField: a.displayField })) as any;
                        data.multiFixSettings.listview.listViewOrder = multiFixPos;
                        break;
                }
            }
            this.propertyGridService.allPropertyViewData = allPropertyListViewDataNew;
            this.listViewDataCreation(this.propertyGridService.allPropertyViewData, true, true);
            this.propertyGridService.configPropertyList = this.configList;
            result.SelectedValue.value = JSON.stringify(data);
            this.subscriptions.add(this.propertyGridService.saveSetting([result]).subscribe(() => { }));
            this.onCancel();
            this.spinner.hide();
        }, 100);
    }

    public ShowPropertyListSettings(): void {
        this.spinner.show();
        window.setTimeout(() => {
            this.isListViewSetting = true;
            this.sharedService.isListViewSetting = true;
            this.expandCount = 4;
            this.issettingsloaded = true;
            this.spinner.hide();
        }, 100);
    }

    public searchPropertyList(): void {
        this.showSearchBox = !this.showSearchBox;
    }

    public isAllSelected(event, key: string): void {
        for (let obj of this.configList) {
            if (obj.key === key) {
                for (let fieldObj of obj.value) fieldObj.displayField = event.checked;
            }
        }
    }

    public drop(event: CdkDragDrop<string[]>, dataObject, key = '') {
        if (event.previousContainer === event.container) {
            moveItemInArray(dataObject, event.previousIndex, event.currentIndex);
        } else transferArrayItem(event.previousContainer.data, dataObject, event.previousIndex, event.currentIndex);
    }

    public expandCollapse(expanded: boolean): void {
        expanded ? this.expandCount++ : this.expandCount--;
        this.matListHeight();
    }

    public matListHeight(): void {
        let extrHeight: any[] = [];
        let listViewHeight: any[] = [];
        if (this.listClientHeight == 0) {
            this.listClientHeight = document.getElementById('propertyListView')?.clientHeight;
        }
        const clientheight = this.listClientHeight;
        this.allPropertyListViewData.forEach((grpobj) => {
            listViewHeight.push({ key: grpobj.key, value: grpobj.value.length * 17 });
        });
        const listHeight = (clientheight - 55) / this.expandCount;
        for (let obj of listViewHeight) {
            if (obj.value <= listHeight) {
                extrHeight.push({ key: obj.key, value: listHeight - obj.value });
            }
        }
        const extraTotal = extrHeight.reduce((accumulator, obj) => {
            return accumulator + obj.value;
        }, 0);

        for (let obj of listViewHeight) {
            if (!extrHeight.some((a) => a.key == obj.key) && this.expandCount === 4) {
                if ((listHeight + extraTotal / (this.expandCount - extrHeight.length)) <= obj.value) {
                    obj.value = listHeight + extraTotal / (this.expandCount - extrHeight.length);
                }
            } else if (!extrHeight.some((a) => a.key == obj.key) && (this.expandCount === 3)) {
                obj.value = listHeight + extraTotal /
                    (this.expandCount - extrHeight.length === 0 ? 1 : this.expandCount - extrHeight.length);
                if (obj.value >= listHeight) {
                    obj.value = (clientheight - 55) / this.expandCount;
                }
            } else if (!extrHeight.some((a) => a.key == obj.key) && (this.expandCount === 2)) {
                obj.value = listHeight + extraTotal /
                    (this.expandCount - extrHeight.length === 0 ? 1 : this.expandCount - extrHeight.length);
                //TODO Rajesh Johnson split check other than multifixedit
            } else if (!extrHeight.some((a) => a.key == obj.key) && this.expandCount === 1) {
                obj.value = listHeight;
            }
        }
        this.allPropertyListViewData.forEach(x => {
            x.styleHeight = listViewHeight.filter((obj) => obj.key === x.key)[0].value + 'px';
        });
    }
    public displayfieldChange(key) {
        let count = 0;
        for (let obj of this.configList) {
            if (obj.key === key) {
                count = obj.value.filter((fObj) => fObj.displayField === true).length;
                if (count === obj.value.length) {
                    obj.checked = true;
                } else obj.checked = false;
            }
        }
    }
    public get matConfigListHeight(): string {
        const clientheight = document.getElementById('propertyListView')?.clientHeight;
        if (clientheight) return (clientheight - (this.showSearchBox ? 93 : 68)) / this.expandCount + 'px';
    }

    public get propertyListViewHeight(): string {
        if (this.state) {
            return 'calc(100vh - 10.1em)';
        }
        return 'calc(95vh - 14.8em)';
    }

    public get configureListViewHeight(): string {
        if (this.state) {
            return 'calc(99vh - 11.5em)';
        }
        return 'calc(91vh - 9.8em)';
    }

    private getAutomationDebounceTime(): number {
        let debounceTime: number = 1000;
        const automationConfig: string = this.planogramCommonService.getSettingsForKey("AUTOMATION_CONFIGURATION", this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data);
        if (automationConfig !== '') {
            debounceTime = JSON.parse(automationConfig).debounce_time;
        }
        return debounceTime;
    }

    public isDisabled(e: HTMLElement): boolean {
        if (this.issettingsloaded) {
            return e.scrollWidth <= e.clientWidth;
        }
        return false;
    }

    public getItemDataForMultiPositionEdit() {
        let itemData: Position = cloneDeep(this.selectedMultiPositions[0]);
        if (!this.positionIDDictionaries.length) {
            if (this.isListView) {
                const index = this.allPropertyListViewData.findIndex((element) => element.key == "Position");
                index != -1 ? this.allPropertyListViewData[index].value.forEach(obj => { this.positionIDDictionaries.push(obj); }) : '';
            } else {
                this.propertyGridService.positionSettings.tab.forEach((tObj) => {
                    tObj.children.forEach((fObj) => {
                        this.positionIDDictionaries.push(fObj);
                    });
                    tObj.group.forEach((gObj) => {
                        gObj.children.forEach((fObj) => {
                            this.positionIDDictionaries.push(fObj);
                        });
                    });
                });
            }
        }
        this.positionIDDictionaries.map(element => {
            let newValue = null;
            let field: string = element.field == 'Position.attributeObject.Color' ? `${element.field}_color` : element.field;
            let value: any = this.sharedService.getObjectField(undefined, field, undefined, itemData);
            for (const positionItem of this.selectedMultiPositions) {
                newValue = this.sharedService.getObjectField(undefined, field, undefined, positionItem);
                element.type == 'bool' &&
                    $(`.field-${element.IDDictionary}.input-component-body input`).prop({
                        indeterminate: false,
                    });

                element.placeholder = '';
                if (element.type == 'bool') {
                    element.customClass = '';
                }
                if (value != newValue) {
                    value = element.field == 'Position.attributeObject.Color' ? '' : '<multiple values>';
                    element.placeholder = value;
                    if (element.type == 'bool') {
                        element.customClass = 'mat-checkbox-indeterminate';
                    }
                    break;
                }
                value = newValue;
            }
            element.AttributeType != 'Calculated' ? this.sharedService.setObjectField(undefined, field, value, undefined, itemData) : '';
        });
        this.itemData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT ? this.itemData.Position.IDMerchStyle == null : this.setUpIDMerchStyle();
        return itemData;
    }

    public checkFieldVisibility(fieldObj: TabChildren): boolean {
        switch (fieldObj.IDDictionary) {
            case 5582:
                return this.itemData?.Position?.IDMerchStyle == 101 && this.itemData?.Position?.UnitCapping;
            default:
                return true;
        }
    }

    public updateUprightType(type: number) {
        const oldVal = this.datasource.Upright;
        const newVal= "";
        this.uprightService.uprightObj.uprightType = type;
        switch (type) {
            case UprightType.None:
                this.datasource.Upright = newVal;
                this.uprightService.uprightObj.uprightValues = this.getUprightValues(this.datasource.Upright);
                this.datasource.uprightType = UprightType.None;
                this.datasource.uprightIntervals = this.uprightService.calculateUprightIntervals(this.datasource);
                this.sharedService.uprightEvent.next(true);
                break;
            case UprightType.Fixed:
                this.datasource.uprightType = UprightType.Fixed;
                break;
            case UprightType.Variable:
                this.datasource.uprightType = UprightType.Variable;
                break;
            default:
                break;
        }
        this.uprightTypeSelection = true;
    };

    public updateModel(newVal: string, fieldObj: any, oldUprightVal?: string): void {
        let canChangeIntervals = true;
        const oldVal = oldUprightVal;
        switch(this.datasource.uprightType) {
            case UprightType.Fixed:
                if(Number(newVal) > this.datasource.Dimension.Width || Number.isNaN(Number(newVal))) {
                    this.notifyService.warn(`INCORRECT_UPRIGHT_VALUE`);
                    canChangeIntervals = false;
                    this.datasource.Upright = this.uprightService.lastSelectedFixedUpright;
                } else {
                    this.uprightService.lastSelectedFixedUpright = Number(newVal).toFixed(2);
                }
                break;
            case UprightType.Variable:
                const variableIntervals = newVal.split(',').map(interval => Number(interval));
                variableIntervals.sort((a, b) => {
                    if(a < b) {
                        return -1;
                    }
                });
                if(variableIntervals.includes(NaN) || !variableIntervals.includes(0) ||
                    !variableIntervals.includes(this.datasource.Dimension.Width) ||
                    (variableIntervals[variableIntervals.length-1] > this.datasource.Dimension.Width)) {
                    const msg = this.translate.instant(`INVALID_UPRIGHT_VALUES_UPRIGHT_VALUES_SHOULD_BE_BETWEEN_0_TO`);
                    this.notifyService.warn( `${msg} ${this.datasource.Dimension.Width}`);
                    fieldObj[fieldObj.field] = this.datasource.Upright = oldUprightVal;
                    canChangeIntervals = false;
                } else {
                    this.uprightService.lastSelectedVariableUpright = this.datasource.Upright = this.allowDecimal(variableIntervals);
                }
                break;
            default:
                break;
        }
        if(canChangeIntervals) {
            this.uprightService.updateUprightForPropGrid(this.datasource, newVal);
            if (oldVal != newVal) {
                this.sharedService.uprightEvent.next(true);
            }
            this.uprightService.uprightObj = {
                uprightType: this.datasource.uprightType,
                uprightValues: this.datasource.Upright.split(',').map(num => Number(num))
            };
        }
    }

    getUprightValues(uprightVal: string): number[] {
        return uprightVal.split(',').map(num => Number(num));
    }

    setUprightsToBayWidth(data: Section, isChecked: boolean): void {
        this.uprightService.setUprightsToBayChecked = isChecked;
        const oldValue = data.Upright;
        let modulars = data.Children.filter(child => {
            return child.ObjectDerivedType === AppConstantSpace.MODULAR;
        });
        let modularLocations = [];
        modulars.forEach(modular => {
            modularLocations.push(modular.Location.X);
        });

        modularLocations.push(data.Dimension.Width);
        let firstModularWidth: number, bayWidhtsAreSame: boolean = true;
        if(modularLocations.length > 1) {
            firstModularWidth = modularLocations[1] - modularLocations[0];
            for(let i=1; i<modularLocations.length; i++) {
                if(!((modularLocations[i] - modularLocations[i-1]) === firstModularWidth)) {
                    bayWidhtsAreSame = false;
                }
            }
        }

        if(!bayWidhtsAreSame) {
            this.datasource.uprightType = UprightType.Variable;
        }

        switch(this.datasource.uprightType) {
            case UprightType.Fixed:
                data.Upright = (data.Dimension.Width / modulars.length).toString();
                this.updateModel(data.Upright, oldValue);
                break;
            case UprightType.Variable:
                data.Upright = modularLocations.join(',');
                this.updateModel(data.Upright, oldValue);
                break;
            default:
                break;
        }
    }

    unSetUprights(isChecked: boolean): void {
        this.uprightService.setUprightsToBayChecked = isChecked;
    }

    updateUprightOnType(fieldObj: TabChildren): void {
        if(this.uprightService.isPogChanged) {
            this.uprightService.lastSelectedFixedUpright = '';
            this.uprightService.lastSelectedVariableUpright = '';
        }
        switch(this.datasource.uprightType) {
            case UprightType.None:
                fieldObj[fieldObj.field] = '';
                break;
            case UprightType.Fixed:
                const modulars = this.datasource.Children.filter(child => child.ObjectDerivedType === AppConstantSpace.MODULAR);
                const defaultFixedUpright = this.uprightService.lastSelectedFixedUpright ? this.uprightService.lastSelectedFixedUpright : this.datasource.Dimension.Width / modulars.length;
                fieldObj[fieldObj.field] = defaultFixedUpright.toString();
                this.updateModel(defaultFixedUpright.toString(), fieldObj);
                break;
            case UprightType.Variable:
                const defaultVariableUpright = this.uprightService.lastSelectedVariableUpright ? this.uprightService.lastSelectedVariableUpright : `0, ${this.datasource.Dimension.Width}`;
                fieldObj[fieldObj.field] = defaultVariableUpright;
                this.updateModel(defaultVariableUpright, fieldObj);
                break;
            default:
                break;
        }
        this.uprightService.isPogChanged = false;
    }

    updateUprightOnUndoRedo(fieldObj: TabChildren, value: any): void {
        fieldObj[fieldObj.field] = value;
        this.updateModel(value, fieldObj);
    }

    sortVariableUprights(): string {
        const variableIntervals = this.datasource.Upright.split(',')
            .map(interval => Number(interval))
            .sort((a, b) => {
                if(a < b) {
                    return -1;
                }
            });
        this.datasource.Upright = this.allowDecimal(variableIntervals);;
        return this.datasource.Upright;
    }

    getActiveSection(): Section {
        this.sectionID = this.sharedService.getActiveSectionId();
        return this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
    }

    allowDecimal(intervals: number[]): string {
        intervals.forEach((itm, idx) => {
            if(itm%1 > 0) {
                intervals[idx] = Number(itm.toFixed(2));
            }
        })
        let filteredIntervals: any = intervals.filter((item, idx) => {
            return idx === intervals.indexOf(item);
        });
        filteredIntervals = filteredIntervals.join();
        return filteredIntervals;
    }
}
