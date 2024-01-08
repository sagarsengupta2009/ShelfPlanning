import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppConstantSpace, Utils } from 'src/app/shared/constants/';
import {
    AllSettings,
    PrefLabelField,
    IApiResponse,
    ProductAuth,
    ProductPackageType,
    Planogram,
    SectionResponse,
    PositionObjectResponse,
    Dictionary,
    StoreAppSettings,
    PerfData,
    ShoppingcartResponse,
    LabelType,
    LabelTemplate,
    UnitPackageItemInfos
} from 'src/app/shared/models';
import {
    ParentApplicationService,
    NotifyService,
    PlanogramStoreService,
    DragDropUtilsService,
    HistoryService,
    QuadtreeUtilsService,
    PlanogramService,
    InformationConsoleLogService,
    DividersCurdService,
    NewProductInventoryService,
    PanelService,
    DictConfigService,
    SharedService,
    CollisionService,
    UprightService,
    CrunchModeService,
    MoveFixtureService,
    ColorService, _, Render2dService,PropertyGridService, ShelfbumpService,PegLibraryService
} from 'src/app/shared/services';
import { Modular } from 'src/app/shared/classes/modular';
import { Section } from 'src/app/shared/classes/section';
import { ShoppingCart } from 'src/app/shared/classes/shopping-cart';
import { StandardShelf } from 'src/app/shared/classes/standard-shelf';
import { Position } from 'src/app/shared/classes/position';
import { BlockFixture } from 'src/app/shared/classes/block-fixture';
import { Coffincase } from 'src/app/shared/classes/coffincase';
import { PegBoard } from 'src/app/shared/classes/peg-board';
import { SlotWall } from 'src/app/shared/classes/slot-wall';
import { Crossbar } from 'src/app/shared/classes/crossbar';
import { Basket } from 'src/app/shared/classes/basket';
import { Grill } from 'src/app/shared/classes/grill';
import { Annotation } from 'src/app/shared/classes/annotation';
import { Divider } from 'src/app/shared/classes/divider';
import { Block } from 'src/app/shared/classes/blocks';
import { ObjectListItem, PositionParentList } from 'src/app/shared/services/common/shared/shared.service';
import { DataValidationService } from '../../../data-validation/data-validation.service';
import { ShoppingFixturecartResponse } from 'src/app/shared/models/planogram-transaction-api/shoppingcart-response';
import { Context } from 'src/app/shared/classes/context';
import { AllocateNpiService } from '../../../allocate';
import { AllocateUtilitiesService } from '../../../allocate/utilities/allocate-utilities.service';
import { BaseCommon } from 'src/app/shared/services/svg-render/svg-render-common/services/base-common.service';
import { ShrinkService } from '../../../shrink/shrink.service';
import { cloneDeep } from 'lodash';

declare var window: any;

@Injectable({
    providedIn: 'root',
})
export class PlanogramCommonService {
    // TODO: @malu private readonly, camlelCase
    constructor(
        private readonly sharedService: SharedService,
        private readonly translateService: TranslateService,
        private readonly planogramService: PlanogramService,
        private readonly notifyService: NotifyService,
        private readonly panelService: PanelService,
        private readonly newProductInventoryService: NewProductInventoryService,
        private readonly dictConfigService: DictConfigService,
        private readonly planogramStoreService: PlanogramStoreService,
        private readonly QuadtreeUtilsService: QuadtreeUtilsService,
        private readonly historyService: HistoryService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly dragDropUtilsService: DragDropUtilsService,
        private readonly dividerCurdService: DividersCurdService,
        private readonly parentApp: ParentApplicationService,
        private readonly collisionService: CollisionService,
        private readonly uprightService: UprightService,
        private readonly crunchMode: CrunchModeService,
        private readonly dataValidation: DataValidationService,
        public moveFixtureService: MoveFixtureService,
        private readonly colorService: ColorService,
        private readonly render2d: Render2dService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly allocateUtils: AllocateUtilitiesService,
        private readonly propertyGridService: PropertyGridService,
        private readonly shelfBumpService: ShelfbumpService,
        private readonly pegLibraryService: PegLibraryService,
        private readonly shrinkService: ShrinkService
    ) { }

    //Preparing model for planogram
    public prepareModel(data: SectionResponse | Planogram): Section {
        if (data._IsSpanAcrossShelf != undefined) {
            if (data._IsSpanAcrossShelf.FlagData == false || data._IsSpanAcrossShelf.FlagData == null) {
                if (data.LKCrunchMode == 8) {
                    data.LKCrunchMode = 2;
                } else if (data.LKCrunchMode == 9) {
                    data.LKCrunchMode = 1;
                } else if (data.LKCrunchMode == 6) {
                    data.LKCrunchMode = 4;
                }
            } else {
                if (data.LKCrunchMode == 2) {
                    data.LKCrunchMode = 8;
                } else if (data.LKCrunchMode == 4) {
                    data.LKCrunchMode = 6;
                } else if (data.LKCrunchMode == 1) {
                    data.LKCrunchMode = 9;
                }
            }
        }
        data.ObjectDerivedType = AppConstantSpace.SECTIONOBJ;
        this.planogramService.insertRemainingDictionary(data, {includeOnlyPackageAttr: false});
        data.InventoryModel.IDInvModel = -1;
        let sectionID = '';

        Utils.shoppingCartFound = false;

        let leafNode = null;
        let eachRecursive = (obj, parent) => {
            try {
                this.extend(obj, false, sectionID);
                this.setParent(obj, parent);
                if (sectionID == '') {
                    sectionID = data.$id;
                    this.sharedService.sectionId = sectionID;
                }
                leafNode = obj;
            } catch (e) {
                //$log.error(e);
            }
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    if (Utils.checkIfFixture(child)) {
                        this.planogramService.prepareFixtureModel(child, obj);
                    } else if (Utils.checkIfPosition(child)) {
                        this.planogramService.preparePositionModel(child, data, null, null);
                    }
                    eachRecursive(child, obj);
                }, obj);
            }
        };

        eachRecursive(data, null);


        const sectionClass: Section = this.sharedService.getObject(sectionID, sectionID) as Section;
        window.rightMostLeafNode = leafNode.$id;
        Utils.isRubberBandDrag = false;

        sectionClass.applyRenumberingShelfs({ pegPosRenumber: true, Load: true });
        if (!Utils.shoppingCartFound) {
            this.addShoppingCart(sectionClass, this.sharedService.sectionId);
            Utils.shoppingCartFound = true;
        }
        const ctx = new Context(sectionClass);
        if (sectionClass._IsSpanAcrossShelf != undefined && sectionClass._IsSpanAcrossShelf.FlagData) {
            //some we are not getting flagData from planogramDAta
            sectionClass.setSpreadSpanStandardshelfs(ctx);
        }
// TODO @og        sectionClass.getAllLimitingSortedShelves();
        var allPosFromObjectList = this.sharedService.getAllPositionFromObjectList(data.$id);

        for (const item of allPosFromObjectList) {
            if (item.Position.attributeObject.RecADRI == 'A' || item.Position.attributeObject.RecADRI == 'R') {
                sectionClass.totalAddSales += item.Position.attributeObject.RecROSSales || 0;
                sectionClass.totalAddMovement += item.Position.attributeObject.RecROSUnits || 0;
                sectionClass.totalAddProfit += item.Position.attributeObject.RecProfitCash || 0;
            }
            if (!Utils.checkIfPegType(item.parent) && !Utils.checkIfShoppingCart(item.parent)) {
                this.resetPositionPegField(item);
            }
        }

        sectionClass.calculateDistribution(ctx, { reassignFlag: true, recFlag: false });

        sectionClass.computeMerchHeight(ctx, { Load: true, IsCalculationRequired: data.IsCalculationRequired });

        if (!this.planogramStoreService.appSettings.CONSIDER_DISPLAY_VIEW_ONLY) {

            var coffinCases = sectionClass.getAllCoffinCases();

            if (coffinCases.length > 0) {
                let flag = sectionClass.containsOnlyCoffinCaseFamily();

                coffinCases.forEach((val) => {
                    if (flag) {
                        val.Fixture.DisplayViews = 1;
                    } else {
                        val.Fixture.DisplayViews = 0;
                    }
                });
            }
        }
        return sectionClass;
    }

    // Note : Reset position's peg related fields
    public resetPositionPegField(pos: Position): void{
        pos.Position.IDPegLibrary = 1;
        pos.Position.PegType = 1;
        pos.Position._X05_PEGLENGTH.ValData = null;
        this.sharedService.positionPegFields.forEach(field => {
            pos.Position[field] = null;
        });
    }

    // Note : Reset the peg fields while moving position from pegable to non pegable fixture
    public resetPegFields(targetFix: PositionParentList, pos: Position, sourceFix?: PositionParentList, oldPos?: Position): void {
        if (!sourceFix) {
            sourceFix = this.sharedService.getObject(pos.$idParent, pos.$sectionID) as PositionParentList;
        }
        const clonedPos = cloneDeep(pos);
        if (!Utils.checkIfPegType(targetFix)) {
            this.resetPositionPegField(pos);
        } else if (oldPos) {
            pos.Position._X05_PEGLENGTH.ValData = oldPos.Position._X05_PEGLENGTH.ValData;
            [...this.sharedService.positionPegFields, ...['IDPegLibrary', 'PegType']].forEach(field => {
                pos.Position[field] = oldPos.Position[field];
            });
        }

        const original = ((sourceFix, targetFix, pos) => {
            return () => {
                this.resetPegFields(targetFix, pos, sourceFix);
            };
        })(sourceFix, targetFix, pos);
        const revert = ((sourceFix, targetFix, pos, oldPos) => {
            return () => {
                this.resetPegFields(targetFix, pos, sourceFix, oldPos);
            };
        })(targetFix, sourceFix, pos, clonedPos);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'ResetPegFields',
        });
    }

    private addShoppingCart(sectionObj: Section, secId: string): ShoppingCart {
        var child: ShoppingcartResponse = {} as ShoppingcartResponse;
        child.Fixture = {} as ShoppingFixturecartResponse;
        //child:{Fixture: ShoppingFixturecartResponse : {} as ShoppingFixturecartResponse};

        child.ObjectDerivedType = AppConstantSpace.SHOPPINGCARTOBJ;
        child.ObjectType = AppConstantSpace.FIXTUREOBJ;
        child.Fixture.FixtureDerivedType = AppConstantSpace.SHOPPINGCARTOBJ;
        child.Fixture.FixtureType = AppConstantSpace.SHOPPINGCARTOBJ;
        child.Fixture.IsMerchandisable = false;
        child.Fixture.FixtureNumber = -1;
        sectionObj.Children.push(child);
        this.extend(child, false, secId);
        const childClass = child as ShoppingCart;
        this.setParent(childClass, sectionObj);
        return childClass;
    };

    public setParent(obj: ObjectListItem, parent) {
        if (!Utils.isNullOrEmpty(parent)) obj.setParentId(parent.$id);
        else obj.setParentId(null);
    }


    public extend(object: any, isNewInsert: boolean, sectionID: string, rootObj: any = null) {
        if (!object.ObjectDerivedType) {
            return console.warn('plangoram-common.extend called with object ', object);
        }
        let mixin: ObjectListItem | Annotation;
        if (sectionID) {
            object.$sectionID = sectionID;
        }
        //This is to eliminate adding the object derived type before adding mixin classes.
        //@todo keep this code here some changes needed to handle in all the cases.
        //let type = object.ObjectType == AppConstantSpace.FIXTUREOBJ? object.Fixture.FixtureType: object.ObjectType;
        switch (object.ObjectDerivedType) {
            case 'Section':
                mixin = new Section(
                    object as SectionResponse,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.parentApp,
                    this.planogramService,
                    this.newProductInventoryService,
                    this.QuadtreeUtilsService,
                    this.historyService,
                    this,
                    this.panelService,
                    this.informationConsoleLogService,
                    this.dividerCurdService,
                    this.planogramStoreService,
                    this.uprightService,
                    this.crunchMode,
                    this.allocateNpi,
                    this.allocateUtils
                );
                break;

            case 'Modular':
                mixin = new Modular(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.planogramStoreService,
                    this,
                    this.collisionService,
                    this.uprightService,
                );
                break;

            case 'ShoppingCart':
                mixin = new ShoppingCart(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.planogramStoreService,
                    this.collisionService,
                    this.parentApp,
                    this.render2d,
                    this.allocateUtils
                );
                break;

            case 'StandardShelf':
                mixin = new StandardShelf(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this,
                    this.historyService,
                    this.dragDropUtilsService,
                    this.planogramStoreService,
                    this.collisionService,
                    this.crunchMode,
                    this.parentApp,
                    this.moveFixtureService,this.render2d,
                    this.allocateUtils
                );
                break;

            case 'Position':
                mixin = new Position(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.planogramStoreService,
                    this.dataValidation,
                    this.colorService,
                    this.parentApp,
                    this.pegLibraryService,
                    this.allocateUtils
                );
                break;

            case 'BlockFixture':
                mixin = new BlockFixture(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.dragDropUtilsService,
                    this,
                    this.planogramStoreService,
                    this.collisionService,
                    this.moveFixtureService
                );
                break;

            case 'CoffinCase':
                mixin = new Coffincase(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this,
                    this.planogramStoreService,
                    this.collisionService,
                    this.crunchMode,
                    this.moveFixtureService,
                    this.parentApp,this.render2d,
                    this.allocateUtils,
                    this.shelfBumpService,
                    this.shrinkService
                );
                break;

            case 'Pegboard':
                mixin = new PegBoard(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.dragDropUtilsService,
                    this,
                    this.QuadtreeUtilsService,
                    this.planogramStoreService,
                    this.collisionService,
                    this.moveFixtureService,
                    this.parentApp,this.render2d,
                    this.allocateUtils
                );
                break;

            case 'Slotwall':
                mixin = new SlotWall(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.dragDropUtilsService,
                    this,
                    this.QuadtreeUtilsService,
                    this.planogramStoreService,
                    this.collisionService,
                    this.moveFixtureService,
                    this.parentApp,this.render2d,
                    this.allocateUtils
                );
                break;
            case 'Crossbar':
                mixin = new Crossbar(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.dragDropUtilsService,
                    this,
                    this.QuadtreeUtilsService,
                    this.planogramStoreService,
                    this.collisionService,
                    this.moveFixtureService,
                    this.parentApp,this.render2d,
                    this.allocateUtils
                );
                break;

            case 'Basket':
                mixin = new Basket(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this,
                    this.planogramStoreService,
                    this.collisionService,
                    this.crunchMode,
                    this.moveFixtureService,
                    this.parentApp,this.render2d,
                    this.allocateUtils,
                    this.shelfBumpService,
                    this.shrinkService
                );
                break;

            case 'Grill':
                mixin = new Grill(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.planogramStoreService,
                    this.collisionService,
                );
                break;

            case 'Annotation':
                mixin = new Annotation(
                    object,
                    this.sharedService,
                );
                break;
            case 'Divider':
                mixin = new Divider(
                    object,
                    this.notifyService,
                    this.translateService,
                    this.sharedService,
                    this.planogramService,
                    this.historyService,
                    this.planogramStoreService,
                    this.collisionService,
                );
                break;
            case 'Block':
                mixin = new Block(
                    object,
                    this.sharedService,
                    this.planogramService,
                );
                break;
            default:
                break;
        }

        // for the Section object which is the first one to be processed
        if (sectionID == '') {
            sectionID = mixin.$id;
            this.sharedService.sectionId = mixin.$id;

            this.sharedService.objectList[sectionID] = {};
            this.sharedService.objectListByIDPOGObject[sectionID] = {};
        }

        this.sharedService.objectList[sectionID][mixin.$id] = object;
        if (object.IDPOGObject || object.IDPOG)
            this.sharedService.objectListByIDPOGObject[sectionID][object.IDPOGObject || object.IDPOG] = object;
        object.__proto__ = mixin;
        object.uiFixtureProperties = object.uiFixtureProperties?.concat(object.uiProperties);
        //depending
        switch (object.ObjectType) {
            case 'Position':
                if (rootObj != undefined && rootObj != null) {
                    rootObj.PackageInventoryModel[
                        object.Position.Product.IDProduct.toString() +
                        '@' +
                        object.Position.ProductPackage.IDPackage.toString()
                    ].id = object.$id;
                    rootObj.PackageAttributes[
                        object.Position.Product.IDProduct.toString() +
                        '@' +
                        object.Position.ProductPackage.IDPackage.toString()
                    ].id = object.$id;
                    rootObj.PackageInventoryModel[
                        object.Position.Product.IDProduct.toString() +
                        '@' +
                        object.Position.ProductPackage.IDPackage.toString()
                    ].sectionId = object.$sectionID;
                    rootObj.PackageAttributes[
                        object.Position.Product.IDProduct.toString() +
                        '@' +
                        object.Position.ProductPackage.IDPackage.toString()
                    ].sectionId = object.$sectionID;
                }
                object.Position.attributeObject.id = object.$id;
                object.Position.attributeObject.sectionId = object.$sectionID;
                object.Position.inventoryObject.id = object.$id;
                object.Position.inventoryObject.sectionId = object.$sectionID;

                if ('path' in this.sharedService.PositionCalcFields) {
                    object._CalcField = {};
                    let dstObj = object._CalcField;
                    if (!('calcField' in object)) {
                        let path = this.sharedService.PositionCalcFields.path;
                        let n = path.indexOf('_');
                        let pathArray = path.split('.');

                        if (n == -1) {
                            for (let i = 0; i < pathArray.length - 1; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        } else {
                            for (let i = 0; i < pathArray.length - 2; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        }

                        dstObj.id = object.$id;
                        dstObj.sectionId = object.$sectionID;
                    }
                    dstObj.__proto__ = Object.create(this.sharedService.PositionCalcFields);
                }
                break;
            case 'Fixture':
                if ('path' in this.sharedService.FixtureCalcFields) {
                    object._CalcField = {};
                    let dstObj = object._CalcField;
                    if (!('calcField' in object)) {
                        let path = this.sharedService.FixtureCalcFields.path;
                        let n = path.indexOf('_');
                        let pathArray = path.split('.');

                        if (n == -1) {
                            for (let i = 0; i < pathArray.length - 1; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        } else {
                            for (let i = 0; i < pathArray.length - 2; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        }

                        dstObj.id = object.$id;
                        dstObj.sectionId = object.$sectionID;
                    }
                    dstObj.__proto__ = Object.create(this.sharedService.FixtureCalcFields);
                }
                break;
            case 'POG':
                if ('path' in this.sharedService.SectionCalcFields) {
                    object._CalcField = {};
                    let dstObj = object._CalcField;
                    if (!('calcField' in object)) {
                        let path = this.sharedService.SectionCalcFields.path;
                        let n = path.indexOf('_');
                        let pathArray = path.split('.');

                        if (n == -1) {
                            for (let i = 0; i < pathArray.length - 1; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        } else {
                            for (let i = 0; i < pathArray.length - 2; i++) {
                                if (pathArray[i] in dstObj) {
                                    dstObj = dstObj[pathArray[i]];
                                } else {
                                    Object.defineProperty(dstObj, pathArray[i], {
                                        value: {},
                                        enumerable: true,
                                        configurable: true,
                                        writable: true,
                                    });
                                    dstObj = dstObj[pathArray[i]];
                                }
                            }
                        }

                        dstObj.id = object.$id;
                        dstObj.sectionId = object.$sectionID;
                    }
                    dstObj.__proto__ = Object.create(this.sharedService.SectionCalcFields);
                }
                break;
        }
        //window.sharedService = this.objectList;
        //when a new object is created isNewInsert is passed true
        //what is does is create a UID and store in this field
        //finally when saved this value is used to match with the object that comes from server to update POGID of the newly inserted position
        if (isNewInsert != undefined && isNewInsert == true) {
            this.flagObjectAsNew(object);
        }
        return object;
    }

    private flagObjectAsNew(object: ObjectListItem): void {
        const tempId = Utils.generateUID();
        object.TempId = tempId;

        if (object.ObjectType == 'Position') {
            object.Position._X05_POSDESCX10.DescData = tempId;
        }
        if (object.ObjectType == 'Fixture') {
            object.Fixture._X04_SHDESCX10.DescData = tempId;
        }
        // later add for other ObjectType
    };


    //*****************************FixtLabel css service********************** */

    public loadFixtLabelItems() {
      const appSettingsSvc: StoreAppSettings = this.planogramStoreService.appSettings;
      let data = BaseCommon.loadFixtureLabels(appSettingsSvc.allSettingsObj.GetAllSettings.data, this.dictConfigService);
      this.planogramService.labelFixtItem[LabelType.FIXTURE] = data.labelFixtItem[LabelType.FIXTURE];
      this.planogramService.labelFixtAllFields = data.labelFixtAllFields;
      this.planogramService.labelFixtExpression[0] = data.labelFixtExpression[0];
      this.planogramService.labelFixtField[0] = data.labelFixtField[0];
      this.planogramService.labelFixtEnabled[0] = data.labelFixtEnabled[0];
      this.planogramService.labelFixtExpression[1] = data.labelFixtExpression[1];
      this.planogramService.labelFixtField[1] = data.labelFixtField[1];
      this.planogramService.labelFixtEnabled[1] = data.labelFixtEnabled[1];
  }
    public filterIdDictionaries(labelExpr): string{ // showlabel off get only iddictionaries
      return BaseCommon.filterIdDictionaries(labelExpr);
      }
    public getLabelExpr(labelExpr: string, fieldValues: Dictionary[],showLabel:boolean) {
      return BaseCommon.getLabelExpr(labelExpr, fieldValues, showLabel);
    }
    public setDefaultsLabels(labels: string): LabelTemplate {
      return BaseCommon.setDefaultsLabels(labels);
    }
    private obtainLabelParams(key: string, labelName: string, settingsDataObj: AllSettings[]): any {
        let posLabelValues = {};
        const settingsData: AllSettings[] = Array.from(settingsDataObj);
        let getLabelSettings: AllSettings[] = Array.from(settingsData).filter((pObj: any) => {
            if (pObj.KeyName == key) {
                return pObj;
            }
        });
        let labelSettings = JSON.parse(getLabelSettings[0].SelectedValue.value as string);
        labelSettings[labelName].forEach((tObj: any) => {
            tObj.children.forEach((fObj: any) => {
                posLabelValues[fObj.key] = this.getSettingsForKey(fObj.key, settingsData);
            });

            tObj.group.forEach((gObj: any) => {
                gObj.children.forEach((fObj: any) => {
                    posLabelValues[fObj.key] = this.getSettingsForKey(fObj.key, settingsData);
                });
            });
        });

        return posLabelValues;
    };

    /******************Label css service************* */

    public loadLabelItems = () => {
        const appSettingsSvc: StoreAppSettings = this.planogramStoreService.appSettings;
        let data = BaseCommon.loadLabelItems(appSettingsSvc.allSettingsObj.GetAllSettings.data, this.dictConfigService);
        this.planogramService.labelItem['POSITION_LABEL'] = data.labelItem['POSITION_LABEL'];
        this.planogramService.labelItem['USER_DEFAULTS.POSLABEL.LABEL'] = data.labelItem['USER_DEFAULTS.POSLABEL.LABEL'];
        this.planogramService.labelFeild1isEnabled = data.labelFeild1isEnabled;
        this.planogramService.labelFeild2isEnabled = data.labelFeild2isEnabled;
        this.planogramService.isPegboardLabelEnabled2 = data.isPegboardLabelEnabled2;
        this.planogramService.isPegboardLabelEnabled1 = data.isPegboardLabelEnabled1;
        this.planogramService.labelExpression1 = data.labelExpression1;
        this.planogramService.labelField1 = data.labelField1;
        this.planogramService.labelExpression2 = data.labelExpression2;
        this.planogramService.labelField2 = data.labelField2;
        this.planogramService.imageReportLabelField = data.imageReportLabelField;
    };

    private loadDictDetails(eachPref, imageReportLabelDictObs: Dictionary[]): void {
        let eachPrefLabelField: PrefLabelField = { ClassName: eachPref.ClassName, fields: [] };
        let reportLabeldictData = this.dictConfigService.dictionaryConfigCollection(imageReportLabelDictObs);
        reportLabeldictData.forEach((value: any, key) => {
            eachPrefLabelField.fields.push(value.field);
        });
        this.planogramService.imageReportLabelField.push(eachPrefLabelField);

    };

    public obtainShelfLabelParams(settingsData: AllSettings[]): void {
        this.sharedService.shelfLabelProp = {
            fontStyle: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.FONT_STYLE', settingsData),
            fontFamily: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.FONT_FAMILY', settingsData),
            fontColor: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.FONT_COLOR', settingsData),
            labelOrientation: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.LABEL_ORIENTATION', settingsData),
            wordWrap: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.WORD_WRAP', settingsData),
            bgColor: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.BACKGROUND_COLOR', settingsData),
            hAlign: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.HORIZONTAL_ALIGNMENT', settingsData),
            vAlign: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.VERTICAL_ALIGNMENT', settingsData),
            fontSize: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.FONT_SIZE', settingsData),
            opacity: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.BACKGROUND_OPACITY', settingsData),
            label: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.FIXT_LABEL', settingsData, true),
            crossLabelDisplay: this.getSettingsForKey('USER_DEFAULTS.FIXTLABEL.CROSSBAR_LABEL_DISPLAY', settingsData),
        };
    }

    // TODO: @malu split into 2 functions, remove fullObj? param
  public getSettingsForKey(key: string, dataIn: AllSettings[], fullObj?: boolean): any {
    return BaseCommon.getSettingsForKey(key, dataIn, fullObj);
  };

    // PrepareModel.js
    public initPrepareModel(data, dataResource, originalItem?: Position, perfData?: PerfData) {
        let preparePositionModel = [];

        const positionTemplate: PositionObjectResponse = this.planogramStoreService.positionTemplate;

        for (let i = 0; i < data.length; i++) {
            // add skeleton to the object
            let posSkeleton: PositionObjectResponse = _.cloneDeep(positionTemplate);
            preparePositionModel.push(posSkeleton);
            // Enhancement related to copy from clipboard.
            if (!(data[i].temp === undefined) && data[i].temp.copiedFromPos) {
                preparePositionModel[i].Position = Object.assign(data[i].temp.copiedFromPos.Position);
                // update IDProduct for PA since IDProduct and IDPackage can be different when item is pasted from a different corp id.
                if(this.parentApp.isAllocateApp && data[i].IDProduct) {
                  preparePositionModel[i].Position.IDProduct = data[i].IDProduct;
                  preparePositionModel[i].Position.IDPackage = data[i].IDPackage;
                }
            }

            if (!(data[i].Product === undefined)) {
                preparePositionModel[i].Position.Product = Object.assign(data[i].Product);
            }
            if (!(data[i].ProductPackage === undefined)) {
                preparePositionModel[i].Position.ProductPackage = Object.assign(data[i].ProductPackage);
            }

            preparePositionModel[i].Position.AvailablePackageType = false;
            this.setupPositionMixins(preparePositionModel[i], dataResource, originalItem, perfData);
            // Make all the fields which needs to turn floats
            const productFileds = ['IDProduct', 'Size'];
            const prodPackageFields = [
                'Casepack',
                'Depth',
                'FingerSpace',
                'Height',
                'IDMerchStyle',
                'IDPackage',
                'IdPackageStyle',
                'MaxFacingsX',
                'MaxFacingsY',
                'MaxFacingsZ',
                'MaxHeight',
                'MaxLayoversY',
                'MaxLayoversZ',
                'MinFacingsX',
                'MinPKGS',
                'Overhang',
                'OverhangX',
                'OverhangZ',
                'Width',
                'XPegHole',
                'YPegHole',
            ];
            const arraysToConvertFloat: any = [{ ProductPackage: prodPackageFields }];
            arraysToConvertFloat.push({ Product: productFileds });
            // tslint:disable-next-line: prefer-for-of
            for (let l of arraysToConvertFloat) {
                const arry = l;
                const stringName = arry.ProductPackage ? 'ProductPackage' : 'Product';
                // tslint:disable-next-line: prefer-for-of
                for (let arr of arry[stringName]) {
                    const convrtedval: number = parseFloat(preparePositionModel[i].Position[stringName][arr]);
                    preparePositionModel[i].Position[stringName][arr] = isNaN(convrtedval)
                        ? preparePositionModel[i].Position[stringName][arr]
                        : convrtedval;
                }
            }
            if (data[i].temp === undefined) {
                const position = preparePositionModel[i].Position;
                // prepare Model
                preparePositionModel[i].Position.Product.Color = position.Product.Color;
                preparePositionModel[i].Color = position.Product.Color;
                preparePositionModel[i].Position.IDProduct = position.Product.IDProduct;
                preparePositionModel[i].Position.IDPackage = position.ProductPackage.IDPackage;
                preparePositionModel[i].Position.FacingsX = !position.inventoryObject?.FacingsMin
                    ? 1
                    : position.inventoryObject.FacingsMin;
                preparePositionModel[i].Position.FacingsY = 1;
                preparePositionModel[i].Position.FacingsZ = 1;
                preparePositionModel[i].Position.GapX = 0;
                preparePositionModel[i].Position.GapY = 0;
                preparePositionModel[i].Position.GapZ = 0;
                preparePositionModel[i].Position.SKUGapX = 0;
                preparePositionModel[i].Position.LayoversY = 0;
                preparePositionModel[i].Position.LayoversZ = 0;
                preparePositionModel[i].Position.LayundersY = 0;
                preparePositionModel[i].Position.LayundersZ = 0;
                preparePositionModel[i].Position.MaxLayoversY =
                    preparePositionModel[i].Position.ProductPackage.MaxLayoversY;
                preparePositionModel[i].Position.MaxLayoversZ =
                    preparePositionModel[i].Position.ProductPackage.MaxLayoversZ;
                preparePositionModel[i].Position.MaxFacingsY =
                    preparePositionModel[i].Position.ProductPackage.MaxFacingsY;
                preparePositionModel[i].Position.MaxFacingsZ =
                    preparePositionModel[i].Position.ProductPackage.MaxFacingsZ;
                preparePositionModel[i].Position.MaxFacingsX =
                    preparePositionModel[i].Position.ProductPackage.MaxFacingsX;
                preparePositionModel[i].Position.MinFacingsX =
                    preparePositionModel[i].Position.ProductPackage.MinFacingsX;
                preparePositionModel[i].Position.IDOrientation =
                    preparePositionModel[i].Position.ProductPackage.DefaultOrientation;
            }
            preparePositionModel[i].selected = false;
            // giving these to avoid error on footer message
            preparePositionModel[i].Fixture = {};
            preparePositionModel[i].Fixture.FixtureFullPath = '';
            // adding for inventory model
            this.addInvRecforNewPosition(preparePositionModel[i], dataResource,data[i].temp);
            // For PA if there are corp specific packages setup, use it instead of user corp.
            if(this.parentApp.isAllocateApp && data[i]?.AvailablePackages?.length) {
              preparePositionModel[i].Position.AvailablePackageType = data[i].AvailablePackages;
            } 
        }
        //update item in PA Azure and select only items without packages for API getProductAvailablePackageType
        if (this.parentApp.isAllocateApp) {
            this.allocateNpi.updateItemPAAzure(preparePositionModel).subscribe(res => {
              window.parent.refreshAllProducts = true
            });
            this.allocateNpi.updateProductKeys(preparePositionModel, dataResource);
            const positions = preparePositionModel.filter( pos => pos.Position.AvailablePackageType == false);
            if(positions.length) {
              this.makeIdProductArray(positions);
            }

        } else {
          this.makeIdProductArray(preparePositionModel);
        }
        // skip product auth for assort nici and automation.
        if (!this.parentApp.isAssortAppInIAssortNiciMode && !this.parentApp.isAllocateApp) {
            this.addProdAuthToProducts(preparePositionModel, dataResource.IDPOG); // attach product Auth flag to Position
        }
        return preparePositionModel;
    }

    private addInvRecforNewPosition(newPos, data, tempData?): void {
        const packageId = `${newPos.Position.IDProduct.toString()}${'@'}${newPos.Position.IDPackage.toString()}`;
        newPos.Position.inventoryObject.ProductName = newPos.Position.Product.Name;
        newPos.Position.inventoryObject.UPC = newPos.Position.Product.UPC;
        newPos.Position.inventoryObject.IDPackage = newPos.Position.IDPackage;
        newPos.Position.inventoryObject.IDProduct = newPos.Position.IDProduct;
        newPos.Position.inventoryObject.Sales = 0;
        const maxFace = parseInt(newPos.Position.ProductPackage.MaxFacingsX);
        if (maxFace > 0) {
            newPos.Position.inventoryObject.FacingsMax = newPos.Position.ProductPackage.MaxFacingsX;
        }
        const minFace = parseInt(newPos.Position.ProductPackage.MinFacingsX);
        if (minFace > 0) {
            newPos.Position.inventoryObject.FacingsMin = newPos.Position.ProductPackage.MinFacingsX;
            if (tempData === undefined) {
                newPos.Position.FacingsX = !newPos.Position.inventoryObject.FacingsMin ? 1 : newPos.Position.inventoryObject.FacingsMin;
            }
        }
        const minPkg = parseInt(newPos.Position.ProductPackage.MinPKGS);
        if (minPkg > 0) {
            newPos.Position.inventoryObject.CasesMin = newPos.Position.ProductPackage.MinPKGS;
        }
        const maxPkg = parseInt(newPos.Position.ProductPackage.MaxPKGS);
        if (maxPkg > 0) {
            newPos.Position.inventoryObject.CasesMax = newPos.Position.ProductPackage.MaxPKGS;
        }
        delete newPos.Position.inventoryObject.IDInvModel;
        if (!data.PackageInventoryModel[packageId]) {
            data.PackageInventoryModel[packageId] = newPos.Position.inventoryObject;
        }
    };

    private setupPositionMixins(data, dataResource, originalItem, perfData) {
        const child = data;
        if (Utils.checkIfPosition(child)) {
            this.planogramService.prepareModelPosition(child, dataResource, originalItem, perfData);
        }
        originalItem !== undefined
            ? this.extend(child, true, this.sharedService.getActiveSectionId(), dataResource)
            : this.extend(child, true, this.sharedService.getActiveSectionId());
        this.setParent(child, null);
    }

    private makeIdProductArray(selectedProductList): void { // Added subscription back.Need to move initPrepareModel method to positioncomponent or position class
        let ajx: number[] = [];
        const lenProd = selectedProductList.length;
        let selectedIDProdList: any = {};
        if (lenProd > 0) {
            for (let k = 0; k < lenProd; k++) {
                if (!ajx.includes(selectedProductList[k].Position.IDProduct)) {
                    ajx.push(selectedProductList[k].Position.IDProduct);
                    if (selectedIDProdList[selectedProductList[k].Position.IDProduct] == undefined) {
                        selectedIDProdList[selectedProductList[k].Position.IDProduct] = [];
                    }
                    selectedIDProdList[selectedProductList[k].Position.IDProduct].push({
                        ID: selectedProductList[k].$id,
                        sectionID: selectedProductList[k].$sectionID,
                    });

                }
            }
        }
        if(ajx.length > 0){
            this.panelService
                .getProductAvailablePackageType(ajx)
                .subscribe((response: IApiResponse<ProductPackageType[]>) => {
                    if (!response.Data) {
                        this.notifyService.error('NO_PRODUCT_PACKAGE_FOUND');
                        return;
                    }
                    for (let p of response.Data) {
                        for (let product of selectedIDProdList[p.Idproduct]) {
                            const posObject = this.sharedService.getObject(
                                product.ID,
                                product.sectionID,
                            );
                            if (!Utils.isNullOrEmpty(posObject)) {
                            //Adding UnitPackageItemInfo to section for the products which are added from product library for calculating advanced tray capping
                                const dataSource = this.sharedService.getObject(product.sectionID, product.sectionID) as Section;
                                let filterUnitPkgStyle = p.AvailablePackageTypes.filter(
                                    (x)=>{return x.IdPackageStyle == AppConstantSpace.PKGSTYLE_UNIT;
                                    })[0];
                                if(filterUnitPkgStyle){
                                    let unitPackageItemInfos = dataSource.UnitPackageItemInfos.filter((unitDim)=> { return unitDim.IDProduct == p.Idproduct; })[0];
                                    if (!unitPackageItemInfos) {
                                        const pkgItemInfoArr: UnitPackageItemInfos = {
                                            Depth: filterUnitPkgStyle.Depth,
                                            Height: filterUnitPkgStyle.Height,
                                            Width: filterUnitPkgStyle.Width,
                                            IDProduct: p.Idproduct,
                                            PackageImages: filterUnitPkgStyle.Images,
                                            orientation: filterUnitPkgStyle.Orientation,
                                            Weight: filterUnitPkgStyle.Weight ? filterUnitPkgStyle.Weight : 0
                                        }
                                        dataSource.UnitPackageItemInfos.push(pkgItemInfoArr);
                                    }
                                }
                                posObject.Position.AvailablePackageType = p.AvailablePackageTypes;
                            }
                        }
                    }
                    this.propertyGridService.updatePackageStyle.next(true);

                });
        }
    }

    private addProdAuthToProducts(selectedProductList: Position[], IDPOG: number): void {
       this.panelService.getProductAuthForPOG(IDPOG).subscribe((authCollection: IApiResponse<ProductAuth>) => {
                for (let product of selectedProductList) {
                    const dyncID = `${product.Position.Product.IDProduct.toString()}${'@'}${product.Position.ProductPackage.IDPackage.toString()}`;
                    if (product.Position.Product.ProdAuth == undefined) {
                        product.Position.Product.ProdAuth = {AuthFlag: 0, Remarks: ''};
                    }
                    if (authCollection[dyncID] != undefined) {
                        product.Position.Product.ProdAuth.AuthFlag = authCollection[dyncID].AuthFlag;
                        product.Position.Product.ProdAuth.Remarks = authCollection[dyncID].Remarks;
                    }
                }
            });
    }

    public setLabelOn(labelOn: boolean): void {
        this.planogramService.labelOn = labelOn;
    }

    public modelFixture(child, obj) {
        this.planogramService.prepareModelFixture(child, obj);
    }

    public modelPosition(child: Position | PositionObjectResponse, parent: Section | Planogram) {
        this.planogramService.prepareModelPosition(child, parent);
    }
}
