import { Injectable } from '@angular/core';
import { Observable, of, Subscription } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep } from 'lodash-es'
import { AppConstantSpace } from 'src/app/shared/constants';
import {
    PlanogramStoreService,
    PlanogramRendererService,
    HistoryService,
    NotifyService,
    PlanogramService,
    SharedService,
    InformationConsoleLogService,
    ShelfbumpService,
    PlanogramSaveService,
    MoveFixtureService,
    HighlightService,
    AllocateService,
    ParentApplicationService,
    PlanogramLibraryApiService,
    PlanogramLibraryService,
    PanelService,PlanogramLoaderService,
    UprightService
} from 'src/app/shared/services';
import { Dimension, InventoryConstraints, Location, LogsListItem, POGLibraryListItem, SavePlanogram } from 'src/app/shared/models';
import {
    FixtureList,
    MerchandisableList,
    ObjectListItem,
    PegTypes,
    SelectableList,
} from 'src/app/shared/services/common/shared/shared.service';
import { Utils } from 'src/app/shared/constants/utils';
import {
    Section, Position, Modular,
    StandardShelf, BlockFixture
} from 'src/app/shared/classes';
import { Render2dService } from 'src/app/shared/services/render-2d/render-2d.service';
import { Context } from 'src/app/shared/classes/context';
import { ConfigService, QuadtreeUtilsService, SpinnerService } from 'src/app/shared/services/common';
import { OnlineOfflineService } from 'src/app/shared/services/common/onlineoffline/online-offline.service';
import { ConsoleLogService } from 'src/app/framework.module';


declare const window: any;

@Injectable({
    providedIn: 'root',
})
export class PlanogramHelperService {
    public getAllHistoryId: string[] = [];
    private checkList: CheckList;
    private sequencePosobj: { pos: Position & { sortPlanogram?: boolean }; index: number }[];
    private asyncSavePogIds: number[] = []; //this list to maintain pog ids for consolidated save message
    private asyncSaveSectionIdsInQueue: string[] = []; //this to maintain pogs in queue based on async save pog cap
    private processNextPogInSaveAllSub: Subscription;
    private pogsSaveAllSubscription: Subscription;
    private pogsFromMaxCount ;

    constructor(
        private readonly sharedService: SharedService,
        private readonly shelfBumpService: ShelfbumpService,
        private readonly notify: NotifyService,
        private readonly planogramRender: PlanogramRendererService,
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
        private readonly historyService: HistoryService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly moveFixtureService: MoveFixtureService,
        private readonly render2d: Render2dService,
        private highlightService: HighlightService,
        private readonly parentApp: ParentApplicationService,
        private readonly allocateService : AllocateService,
        private readonly spinner: SpinnerService,
        private readonly onlineOfflineService: OnlineOfflineService,
        private readonly planogramLibraryService:PlanogramLibraryService,
        private readonly panelService:PanelService,
        private readonly planogramLoaderService:PlanogramLoaderService,
        private readonly log: ConsoleLogService,
        private readonly uprightService: UprightService,
        private readonly config: ConfigService,
        private readonly quadtreeUtilsService: QuadtreeUtilsService
    ) { }

    public savePlanogramTemplate(sectionID: string, includeAnnotations?: boolean): Observable<boolean> {
        const pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        let objForSVG: Section = cloneDeep(pogObj);
        const eachRecursive = (obj: Section) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach(child => {
                    if (child.spreadSpanProperties) {
                        child.spreadSpanProperties.isSpreadSpan = false;
                        child.unUsedLinear = child.Dimension.Width;
                        child.Fixture.AvailableLinear = child.Dimension.Width;
                    }
                    if (child.ObjectType == 'Position') {
                        obj.Children = [];
                    }
                    if (child.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || child.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
                        child.allPosInXDirection = {};
                        child.allPosInYDirection = {};
                        child.placed = [];
                    }

                    eachRecursive(child);
                }, obj);
            }
        };
        eachRecursive(objForSVG);
        if (!includeAnnotations) {
          objForSVG.PogObjectExtension = [];
          objForSVG.annotations = [];
        } else {
          objForSVG.PogObjectExtension = objForSVG.PogObjectExtension.filter(ann => {
            let refObj = this.sharedService.getObject(ann.$belongsToID, ann.$sectionID);
            return refObj.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT;
          });
          objForSVG.annotations = objForSVG.annotations.filter(ann => {
            let refObj = this.sharedService.getObject(ann.$belongsToID, ann.$sectionID);
            return refObj.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT;
          });
        }
        if (this.sharedService.checkIfAssortMode('save-planogram-template')) {
            this.notify.warn('FEATURE_IS_DISABLED');
            return of(false);
        } else {
            let SVG = this.planogramRender.SVG(objForSVG, 1, '' as any);

            const POG = { ...objForSVG, SVG: { Value: SVG } } as Section;
            const body = {Pog: POG, IncludeAnnotation: includeAnnotations};
            return this.planogramService.savePlanogramTemplate(body).pipe(
                mergeMap((d) => this.planogramService.getSystemTemplateList()),
                map((response) => {
                    this.planogramStore.allPlanogramApisData.defaultPogFixturesSearch = response;
                    this.notify.success('PLANOGRAM_TEMPLATE_SAVED_SUCCESSFULLY', 'ok');
                    return true;
                }),
                catchError((error) => {
                    console.log('Error While getting Default SYSTEM Templates');
                    console.log(error);
                    return of(false);
                }),
            );
        }
    }

    private validateInputValues(invObj: InvObject, position: Position) {
        if (invObj.overrideInv) {
            if (invObj.useItems) {
                const posInvObj = JSON.parse(JSON.stringify(position.getInventoryConstraints()));
                for (let cons in posInvObj) {
                    if (posInvObj[cons] <= 0) {
                        posInvObj[cons] = invObj.invData[cons];
                    }
                }
                return posInvObj;
            } else {
                return JSON.parse(JSON.stringify(invObj.invData));
            }
        } else {
            return JSON.parse(JSON.stringify(position.getInventoryConstraints()));
        }
    }

    public computeConstraintsValue(this: void, position: Position, daysInMov: number, invData: InventoryConstraints) {
        // This method is to calculate MIN, MAX Constraints along with Target
        const computedValue = {
            MinConstraint: 0,
            MaxConstraint: 0,
            Target: 0,
        };
        const getRelatedConstraint = (constraint: string) => constraint.substr(0, 3);
        const Movement = position.Position.attributeObject.CurrMovt;
        //        const DOS = position.Position.attributeObject.Calc_DOS;

        const CapPerFacing =
            position.Position.attributeObject.Calc_ItemCapacity / position.Position.attributeObject.Calc_ItemFacingsX;
        const constraints = invData ? { ...invData } : position.getInventoryConstraints();

        let MaxConstraint = Number.MAX_VALUE;
        let MinConstraint = Number.MIN_VALUE;
        let Target = 0;
        let MaxUnits = Number.MAX_VALUE;
        let MinUnits = Number.MIN_VALUE;
        let daysInMovement: number;
        let dailyMovement: number;

        if (constraints.MaxFacingsX) {
          MaxConstraint = Math.min(MaxConstraint, constraints.MaxFacingsX);
          Target = MaxConstraint;
        }
        if (constraints.MinFacingsX > 0) {
          MinConstraint = Math.max(MinConstraint, constraints.MinFacingsX);
          Target = MinConstraint;
        }
        if (constraints.MaxUnits) {
          Target = Math.floor(constraints.MaxUnits / CapPerFacing);
          Target = Target < constraints.MinFacingsX ? MinConstraint : Target;
          MaxConstraint = Target == 0 ? MaxConstraint : MaxConstraint == 0 ? Target : Math.min(MaxConstraint, Target);
        }
        if (constraints.MinUnits > 0) {
          Target = Math.ceil(constraints.MinUnits / CapPerFacing);
          MinConstraint = Math.max(MinConstraint, Target);
          MinConstraint = Math.min(MaxConstraint, MinConstraint);
        }
        if (constraints.MaxCases) {
          MaxUnits = constraints.MaxCases * position.Position.ProductPackage.CasePack;
          Target = Math.floor(MaxUnits / CapPerFacing);
          Target = Target < constraints.MinFacingsX ? MinConstraint : Target;
          MaxConstraint = Target == 0 ? MaxConstraint : MaxConstraint == 0 ? Target : Math.min(MaxConstraint, Target);
        }
        if (constraints.MinCases > 0) {
          MinUnits = constraints.MinCases * position.Position.ProductPackage.CasePack;
          Target = Math.ceil(MinUnits / CapPerFacing);
          MinConstraint = Math.max(MinConstraint, Target);
          MinConstraint = Math.min(MaxConstraint, MinConstraint);
        }
        if (constraints.MaxDOS) {
          daysInMovement = Number(daysInMov);
          dailyMovement = Movement / daysInMovement;
          MaxUnits = constraints.MaxDOS * dailyMovement;
          Target = Math.floor(MaxUnits / CapPerFacing);
          Target = Target < constraints.MinFacingsX ? MinConstraint : Target;
          MaxConstraint = Target == 0 ? MaxConstraint : MaxConstraint == 0 ? Target : Math.min(MaxConstraint, Target);
        }
        if (constraints.MinDOS > 0) {
          daysInMovement = Number(daysInMov);
          dailyMovement = Movement / daysInMovement;
          MinUnits = constraints.MinDOS * dailyMovement;
          Target = Math.ceil(MinUnits / CapPerFacing);
          Target = Target < constraints.MinFacingsX ? MinConstraint : Target;
          MinConstraint = Math.max(MinConstraint, Target);
          MinConstraint = Math.min(MaxConstraint, MinConstraint);
        }
        return { MaxConstraint, MinConstraint, Target };
    }

    private modelMethod(invObj: InvObject, sectionId: string, position: Position, infoList: LogsListItem[]): boolean {
        const userInput = this.validateInputValues(invObj, position);

        const computedValues = this.computeConstraintsValue(
            position,
            this.planogramStore.appSettings.daysInMovement,
            userInput,
        ); //All calculations of MIn , max and Target values moved to utils
        let MaxConstraint = computedValues.MaxConstraint;
        let MinConstraint = computedValues.MinConstraint;
        let isAllocated = false;
        const invId =
            position.Position.Product.IDProduct.toString() +
            '@' +
            position.Position.ProductPackage.IDPackage.toString();
        const sectionObj = this.sharedService.getObjectAs<Section>(sectionId, sectionId);
        const allPositions = sectionObj.getAllPositions();
        allPositions.forEach((child) => {
            const allowActionObj = this.sharedService.getPositionLockField(
                this.planogramStore.appSettings.positionLockField,
                child,
            );

            const errorObject: LogsListItem = {
                Message: undefined,
                Code: 'Allocation',
                Type: 1,
                SubType: 'Allocation',
                IsClientSide: true,
                PlanogramID: sectionObj.IDPOG,
                Option: {
                    $id: child.$id,
                    $sectionID: child.$sectionID,
                    Group: 'Allocation',
                },
            };
            if (!(allowActionObj.flag && allowActionObj.list.includes(AppConstantSpace.ACTIONS.ALLOCATION))) {
                const tempID =
                    child.Position.Product.IDProduct.toString() +
                    '@' +
                    child.Position.ProductPackage.IDPackage.toString();
                const errorMessage = (previousValue: number, presentValue: number) => {
                    return (
                        this.translate.instant('INV_INFOLOG_CURR_FACINGS') +
                        presentValue +
                        this.translate.instant('INV_INFOLOG_PREV_FACINGS') +
                        previousValue +
                        this.translate.instant('INV_INFOLOG_FIXTURE') +
                        child.Fixture.FixtureNumber +
                        this.translate.instant('INV_INFOLOG_POS') +
                        child.Position.PositionNo +
                        this.translate.instant('INV_INFOLOG_UPC') +
                        child.Position.Product.UPC
                    );
                };
                if (invId == tempID) {
                    if (child.Position.FacingsX < MinConstraint) {
                        if (MinConstraint <= 0) {
                            MinConstraint = 1;
                        }
                        const previousValue = child.Position.FacingsX;
                        child.changeFacingsTo(MinConstraint);
                        invObj.FacingsX = MinConstraint;
                        errorObject.Message = errorMessage(previousValue, child.Position.FacingsX);
                        infoList.push(errorObject);
                        isAllocated = true;
                    }
                    if (child.Position.FacingsX > MaxConstraint && MaxConstraint > 0) {
                        if (MaxConstraint <= 0) {
                            MaxConstraint = 1;
                        }
                        const previousValue = child.Position.FacingsX;
                        child.changeFacingsTo(MaxConstraint);
                        errorObject.Message = errorMessage(previousValue, child.Position.FacingsX);
                        infoList.push(errorObject);
                        isAllocated = true;
                    }
                }
            } else {
                errorObject.Message = `${this.translate.instant('INV_INFOLOG_UPC')}${child.Position.Product.UPC
                    }; has been locked, can't modify.`;
                infoList.push(errorObject);
            }
        });

        return isAllocated;
    }

    public runInventoryModelFromTools(ctx: Context, val: string, sectionId: string, invObj: InvObject) {
        let sectionObj = this.sharedService.getObject(sectionId, sectionId) as Section;

        let fixtureItemsImpacted = 0;
        let sectionItemsImpacted = 0;
        let count = 0;
        let infoList: LogsListItem[] = [];
        let itemsImpacted = 0;

        const eachRecursive = (obj: ObjectListItem, infoList: LogsListItem[]) => {
            if (obj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
                return;
            }
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child: Position) => {
                    if (child.asPosition() && child.number != -1) {
                        let isAllocated = this.modelMethod(invObj, sectionId, child, infoList);
                        if (isAllocated) {
                            fixtureItemsImpacted++;
                            sectionItemsImpacted++;
                        }
                        count++;
                    }
                    eachRecursive(child, infoList);
                }, obj);
            }
            return {
                countValue: count,
                fixtureChanged: fixtureItemsImpacted,
                sectionChanged: sectionItemsImpacted,
            };
        };
        const selectedObjsList = this.planogramService.getSelectedObject(sectionId);

        switch (val) {
            case 'position':
                (selectedObjsList as Position[]).forEach((obj) => {
                    let isAllocated = this.modelMethod(invObj, sectionId, obj, infoList);
                    if (isAllocated) {
                        itemsImpacted++;
                    }
                    let currentFixtureObj = this.sharedService.getParentObject(obj, sectionId);
                    obj.calculateDistribution(ctx, currentFixtureObj);
                    count++;
                });

                if (this.planogramStore.appSettings.isLogAllocations && infoList.length) {
                    this.informationConsoleLogService.setClientLog(infoList, sectionObj.IDPOG);
                }
                break;
            case 'fixture':
                let fixtureValues;
                (selectedObjsList as FixtureList[]).forEach((obj) => {
                    fixtureValues = eachRecursive(obj, infoList);
                    obj.calculateDistribution(ctx);
                }, fixtureValues);
                if (this.planogramStore.appSettings.isLogAllocations && infoList.length > 0) {
                    this.informationConsoleLogService.setClientLog(infoList, sectionObj.IDPOG);
                }
                break;
            case 'section':
                const sectionValues = eachRecursive(sectionObj, infoList);

                if (this.planogramStore.appSettings.isLogAllocations && infoList.length > 0) {
                    this.informationConsoleLogService.setClientLog(infoList, sectionObj.IDPOG);
                }
                sectionObj.calculateDistribution(ctx);
                break;
            default:
        }
    }

    public isPOGLive(sectionId: string, required: boolean): boolean {
        const section = this.sharedService.getObjectAs<Section>(sectionId, sectionId);
        if (!section) {
            return false;
        }
        if (this.checkIfSystemCheckout(section.IDPOG)) {
            if (required) {
                this.notify.warn('Updates disabled for planograms checkedout by System');
            }
            return true;
        } else if (this.checkIfReadonly(section.IDPOG)) {
            if (required) {
                this.notify.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
            }
            return true;
        }
        return false;
    }

    public doFlip(datasource: Section) {
        // Utility.checkIfAllowedinReadOnlyFeature("doFlip");
        let sectionID = datasource.$sectionID;
        if (true) {
            //UNDO:REDO
            let unqHistoryID = this.historyService.startRecording();
            let selectedObjsList = this.planogramService.getSelectedObject(sectionID);
            let selectedObjsSize = selectedObjsList.length;
            if (selectedObjsSize > 0) {
                const ctx = new Context(datasource);
                if (
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.STANDARDSHELFOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.PEGBOARDOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.SLOTWALLOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.CROSSBAROBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.COFFINCASEOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.BASKETOBJ
                ) {
                    this.fixturesFlip(ctx, selectedObjsList as MerchandisableList[]);
                } else if (
                    this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
                ) {
                    this.positionsFlip(ctx, selectedObjsList as Position[]);
                } else if (this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.MODULAR) {
                    selectedObjsList[0].Children.forEach((item) => {
                        let eachFixture = [];
                        eachFixture.push(item);
                        this.fixturesFlip(ctx, eachFixture);
                    });
                } else if (this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.SECTIONOBJ) {
                    let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
                    sectionObj.setSkipComputePositions();
                    if (datasource.isBayPresents) {
                        this.sectionFlipWithModulars(datasource);
                    } else if (
                        datasource.getAllStandardShelfs().length > 0 ||
                        datasource.getAllPegboards().length > 0 ||
                        datasource.getAllCrobars().length > 0 ||
                        datasource.getAllSlotwalls().length > 0
                    ) {
                        this.sectionFlipWithoutModulars(datasource);
                    }
                    sectionObj.computePositionsAfterChange(ctx);
                }
                // intersectionUtils.insertPogIDs(selectedObjsList, true);
                this.planogramService.insertPogIDs(selectedObjsList, true);
                this.historyService.stopRecording(undefined, undefined, unqHistoryID);
                this.render2d.isDirty = true;
                this.sharedService.updateAnnotationPosition.next(true);
                this.planogramService.updateNestedStyleDirty = true;;
                this.planogramService.rootFlags[datasource.$sectionID].isSaveDirtyFlag = true;
                this.planogramService.updateSaveDirtyFlag(
                    this.planogramService.rootFlags[datasource.$sectionID].isSaveDirtyFlag,
                );
            } else {
                this.notify.success(this.translate.instant('FLIP_ALERT'), 'alert');
            }
        }
    };

    private flipFixtures(ctx: Context, currObj: Section) {
        currObj.Children.forEach((fixture) => {
            if (
                [
                    AppConstantSpace.STANDARDSHELFOBJ,
                    AppConstantSpace.PEGBOARDOBJ,
                    AppConstantSpace.CROSSBAROBJ,
                    AppConstantSpace.SLOTWALLOBJ,
                ].includes(fixture.ObjectDerivedType) &&
                currObj.Dimension.Width != fixture.Dimension.Width
            ) {
                let newXpos = currObj.Dimension.Width - fixture.Location.X - fixture.Dimension.Width;
                fixture.Location.X = newXpos;
            }
        });

        const uprights = currObj.Upright?.split(',') || [];
        if (uprights.length) {
            this.upRightsFlip(uprights, currObj);
        }

        if (currObj._IsSpanAcrossShelf != undefined && currObj._IsSpanAcrossShelf.FlagData) {
            currObj.setSpreadSpanStandardshelfs(ctx);
        }
        currObj.applyRenumberingShelfs();
        currObj.computeMerchHeight(ctx);
    }

    public sectionFlipWithoutModulars(currObj: Section): void {
        this.flipAnnotation(currObj);
        currObj.computeAnnotationDimension();

        const ctx = new Context(currObj);
        this.fixturesFlip(ctx, currObj.Children);
        this.flipFixtureLocation(ctx, currObj);

        const originalOrRevert = () => {
            this.flipAnnotation(currObj);
            currObj.computeAnnotationDimension();
            this.flipFixtures(ctx, undefined);
            this.flipFixtureLocation(ctx, currObj);
        };

        this.historyService.captureActionExec({
            funoriginal: originalOrRevert,
            funRevert: originalOrRevert,
            funName: 'flipFixtures',
        });
    }

    private upRightsFlip(uprights: string[], currObj: Section): void {
        let k = 1;
        let flippedUprights = [0];
        for(let i=uprights.length-1; i>0; i--) {
            flippedUprights[k] = Number(uprights[i]) - Number(uprights[i-1]) + flippedUprights[k-1];
            k++;
        }
        currObj.Upright = flippedUprights.join();
        this.uprightService.updateUpright(currObj, currObj.Upright);
    }

    private flipAnnotation(datasource: Section): void {
        datasource.annotations.forEach((note) => {
            if (note.Attribute && note.Attribute.location) {
                let parentObject = this.sharedService.getObject(
                    note.$belongsToID,
                    this.sharedService.getActiveSectionId(),
                );
                let parentWidth = parentObject.Dimension.Width;
                if (note.Attribute.location.locX != null || note.Attribute.location.locX != undefined)
                    note.Attribute.location.locX =
                        datasource.Dimension.Width - note.Attribute.location.width - note.Attribute.location.locX;
                if (note.Attribute.location.relLocX != null || note.Attribute.location.relLocX != undefined)
                    //note.Attribute.location.relLocX = datasource.Dimension.Width - note.Attribute.location.width - note.Attribute.location.relLocX;
                    note.Attribute.location.relLocX =
                        parentWidth - note.Attribute.location.width - note.Attribute.location.relLocX;
            }
        });
    }

    private flipFixtureLocation(ctx: Context, datasource: Section): void {
        this.flipFixturesL(datasource, datasource, datasource);
        if (datasource.LKTraffic == 1) {
            datasource.LKTraffic = 2;
        } else datasource.LKTraffic = 1;
        let uprights = datasource.Upright ? datasource.Upright.split(',') : [];
        if (uprights.length > 1) {
            this.upRightsFlip(uprights as any, datasource);
        }

        if (datasource._IsSpanAcrossShelf.FlagData) {
            datasource.setSpreadSpanStandardshelfs(ctx);
        }
        datasource.applyRenumberingShelfs();
        datasource.computeMerchHeight(ctx);
    }

    private flipFixturesL(currObj: Section, datasource: Section, bayObj: Section): void {
        for (let i = 1; i <= currObj.Children.length; i++) {
            let fixture = currObj.Children[i - 1];
            datasource.isBayPresents ? (bayObj = this.sharedService.getObject(fixture.$idParent, datasource.$id) as Section) : '';
            if (
                [
                    AppConstantSpace.STANDARDSHELFOBJ,
                    AppConstantSpace.PEGBOARDOBJ,
                    AppConstantSpace.CROSSBAROBJ,
                    AppConstantSpace.SLOTWALLOBJ,
                    AppConstantSpace.BLOCK_FIXTURE,
                    AppConstantSpace.COFFINCASEOBJ,
                    AppConstantSpace.BASKETOBJ,
                ].includes(fixture.ObjectDerivedType)
            ) {
                // @og TODO if bayObj is really a section then it doesn't have location
                if (
                    bayObj.Dimension.Width != fixture.Dimension.Width ||
                    fixture.Location.X != ((bayObj as any).Location ? (bayObj as any).Location.X : 0)
                ) {
                    let newXpos = bayObj.Dimension.Width - fixture.Location.X - fixture.Dimension.Width;
                    fixture.Location.X = newXpos;
                    if (newXpos < 0) {
                        let xPosToPog = fixture.getXPosToPog();
                        for (let j = 0; j < datasource.Children.length; j++) {
                            let obj = datasource.Children[j];
                            if (Utils.checkIfBay(obj)) {
                                let bayXPosToPog = obj.getXPosToPog();
                                let bayXEndPosToPog = bayXPosToPog + obj.Dimension.Width;
                                if (bayXPosToPog <= xPosToPog && bayXEndPosToPog > xPosToPog) {
                                    let dragIndex = bayObj.Children.indexOf(fixture);
                                    let dropIndex = 0;
                                    fixture.IDPOGObjectParent = obj.IDPOGObject;
                                    fixture.setParentId(obj.$id);
                                    fixture.Location.X = xPosToPog - bayXPosToPog;
                                    obj.Children.splice(dropIndex, 0, fixture);
                                    bayObj.Children.splice(dragIndex, 1);
                                    i--;
                                }
                            }
                        }
                    }
                }
            } else {
                if (fixture.Children.length) {
                    this.flipFixturesL(fixture, datasource, datasource);
                }
            }
        }
    }

    private modularFlip(currObj?: Section): void {
        const modularlen = currObj.Children.length;
        let v = modularlen - 1;
        const middlePos = v / 2;
        for (let i = 0; i <= middlePos; i++) {
            const fromIdx = i;
            const toIdx = modularlen - 1 - fromIdx;
            if (fromIdx !== toIdx) {
                let tmp = currObj.Children[fromIdx];
                currObj.Children[fromIdx] = currObj.Children[toIdx];
                currObj.Children[toIdx] = tmp;
            }
        }
        currObj.computeModularPositionAfterChange();
    }

    public sectionFlipWithModulars(currObj: Section): void {
        const ctx = new Context(currObj);
        const originalOrRevert = () => {
            this.flipAnnotation(currObj);
            currObj.computeAnnotationDimension();
            this.modularFlip(currObj);
            this.flipFixtureLocation(ctx, currObj);
        };
        this.historyService.captureActionExec({
            funoriginal: originalOrRevert,
            funRevert: originalOrRevert,
            funName: 'modularFlip',
        });
        const modulars: Modular[] = currObj.Children.filter(
            (it) => it.ObjectDerivedType === AppConstantSpace.MODULAR && it.Children?.length,
        );
        modulars.forEach((it) => this.fixturesFlip(ctx, it.Children));
        originalOrRevert();
    }

    private fixturesFlip(ctx: Context, selectedObjects: MerchandisableList[]): void {
        selectedObjects
            .filter((it) => it.isMerchandisable)
            .forEach((it) => {
                it.fixtureFlip(ctx);
                it.computePositionsAfterChange(ctx);
            });
    }

    private positionsFlip(ctx: Context, selectedObjects: Position[]): void {
        //UNDO:REDO
        const originalOrRevert = () => {
            selectedObjects.forEach((it) => (it.selected = true));
            this.positionsFlip(ctx, selectedObjects);
            selectedObjects.forEach((it) => (it.selected = false));
        };
        this.historyService.captureActionExec({
            funoriginal: originalOrRevert,
            funRevert: originalOrRevert,
            funName: 'positionsFlip',
        });
        /* undo-redo ends here */
        const fixtures = selectedObjects
            .filter((it) => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)
            .reduce((fixtures, posObject) => {
                const fixture = this.sharedService.getParentObject(posObject, posObject.$sectionID);
                fixtures[fixture.$id] = fixtures[fixture.$id] || { fixture, positions: [] };
                fixtures[fixture.$id].positions.push(posObject);
                return fixtures;
            }, {} as { [key: string]: { fixture: MerchandisableList; positions: Position[] } });

        //Check if it is in Spread, whether to allow positoin flip or not
        const rootObject: Section = this.sharedService.getObject(selectedObjects[0].$sectionID, selectedObjects[0].$sectionID) as Section;
        if (rootObject._IsSpanAcrossShelf.FlagData != null && rootObject._IsSpanAcrossShelf.FlagData) {
            const fixArray = Object.values(fixtures);

            fixArray.sort((a, b) => a.fixture.Location.Y - b.fixture.Location.Y);
            //Get the Individual set which have same Y Pos
            let firstShelf = fixArray[0].fixture;
            let fixturesSet = [];
            const totalFixtureSet = [];
            for (let i = 0; i < fixArray.length; i++) {
                if (firstShelf.Location.Y == fixArray[i].fixture.Location.Y) {
                    fixturesSet.push(fixArray[i]);
                    if (i == fixArray.length - 1) {
                        totalFixtureSet.push(fixturesSet);
                    }
                } else {
                    firstShelf = fixArray[i].fixture;
                    totalFixtureSet.push(fixturesSet);
                    fixturesSet = [];
                    fixturesSet.push(fixArray[i]);
                }
            }

            const sortByXPos = (obj: any[]) => obj.sort((a, b) => a.fixture.getXPosToPog() - b.fixture.getXPosToPog());

            for (const eachYFixtureSet of totalFixtureSet) {
                //get which all Fixtures have same Y POS
                const fixtureXStandardShelfs = sortByXPos(eachYFixtureSet);
                for (let j = 0; j < fixtureXStandardShelfs.length - 1; j++) {
                    //check the x pos of selected pos
                    const firstPOS = Utils.sortByXPos(fixtureXStandardShelfs[j].positions)[
                        fixtureXStandardShelfs[j].positions.length - 1
                    ];
                    const nextPOS = Utils.sortByXPos(fixtureXStandardShelfs[j + 1].positions)[0];
                    const firtFixPos = fixtureXStandardShelfs[j].fixture.getAllPosition();
                    const nextFixPos = fixtureXStandardShelfs[j + 1].fixture.getAllPosition();
                    //If firtstPos index is end and nextPos index is zero flip is not possible
                    if (firtFixPos.indexOf(firstPOS) == firtFixPos.length - 1 && nextFixPos.indexOf(nextPOS) == 0) {
                        this.notify.warn('FLIP_OF_POSITIONS_NOT_ALLOWED_PLEASE_TURN_OFF_SPREAD_SPAN', 'OK');
                        return;
                    }
                }
            }
            if (rootObject._IsSpanAcrossShelf.FlagData) {
                rootObject.setSpreadSpanStandardshelfs(ctx);
            }
        }
        Object.values(fixtures).forEach((it) => {
            it.fixture.allPositionsFlip();
            it.fixture.computePositionsAfterChange(ctx);
        });
    }

    public deleteObject(section: Section): boolean {
        const sectionID = section.$sectionID;
        const selectedObjsList = this.planogramService.getSelectedObject(sectionID);

        if (!selectedObjsList.length) {
            return false;
        }

        if (this.sharedService.checkIfAssortMode(selectedObjsList[0].ObjectType + '-delete')) {

            const cannotDelete = selectedObjsList.some(it =>
                it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                it.Position.attributeObject.RecADRI != 'A' &&
                !(it.Position.attributeObject.RecADRI == 'D' && !this.planogramStore.appSettings.disableDeletedScItem)
            );

            if (!cannotDelete) {
                this.notify.warn('FEATURE_IS_DISABLED');
                return false;
            }
        }
        // Utility.checkIfAllowedinReadOnlyFeature("delete");

        const fixtureFlag: boolean = Utils.checkIfFixture(selectedObjsList[0]);

        if (selectedObjsList.some((it: Position) => it.hasBackItem || it.hasAboveItem)) {
            this.notify.warn('BASE_ITEMS_CANT_BE_DELETED');
            return false;
        }

        if (this.checkIfReadonly(section.IDPOG)) {
            this.notify.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
            return false;
        }

        section.setSkipComputePositions();

        const unqHistoryID = this.historyService.startRecording();
        const originalOrRevert = ((fixtureFlag) => {
            return () => {
                if (fixtureFlag) {
                    section.applyRenumberingShelfs();
                }
            };
        })(fixtureFlag);

        this.historyService.captureActionExec({
            funoriginal: originalOrRevert,
            funRevert: originalOrRevert,
            funName: 'Renumbering shelves',
        });
        const cartObj = Utils.getShoppingCartObj(section.Children);
        let ctx = new Context(section);
        let object: SelectableList;
        this.sharedService.deleteSelectedPos = [];
        for (let i = selectedObjsList.length - 1; i >= 0; i--) {
            object = selectedObjsList[i];
            if (object.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                let lockFlag = object._CalcField.Fixture.PositionDesc1; // Commneted due to _CalcField data is not getting here.
                if (lockFlag?.flag) {
                    this.notify.error(object.getLockErrorMsg(lockFlag.list));
                } else if (typeof object.moveSelectedToCart === 'function') {
                    this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                    object.moveSelectedToCart(ctx, cartObj);
                }
            } else if (object.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) {
                this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                if (typeof object.moveSelectedToCart === 'function') {
                    object.moveSelectedToCart(ctx, cartObj);
                }
            } else if (
                object.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                object.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
                object.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ
            ) {
                let lockFlag = object._CalcField.Fixture.PositionDesc1;
                if (lockFlag?.flag) {
                    this.notify.error(object.getLockErrorMsg(lockFlag.list));
                } else if (typeof object.moveSelectedToCart === 'function') {
                    this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                    object.moveSelectedToCart(ctx, cartObj);
                }
            }
            if (object.ObjectDerivedType == AppConstantSpace.MODULAR) {
                let lockFlag = object._CalcField.Fixture.PositionDesc1;
                if (lockFlag?.flag) {
                    this.notify.error(object.getLockErrorMsg(lockFlag.list));
                } else if (typeof object.moveSelectedToCart === 'function') {
                    this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                    this.sharedService.styleModuleSelect.next(true);
                    this.uprightService.deleteModular = true;
                    object.moveSelectedToCart(ctx, cartObj);
                }
            } else if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                if (typeof object.moveSelectedToCart === 'function') {
                    //This subscription is handling position array. So the below line is moved here.
                    const allowActionObj = this.sharedService.getPositionLockField(
                        this.planogramStore.appSettings.positionLockField,
                        object,
                    );
                    if (allowActionObj?.flag && !allowActionObj.list.includes(AppConstantSpace.ACTIONS.DELETE)) {
                        this.notify.error(object.getLockErrorMsg());
                    } else {
                        this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                        object.moveSelectedToCart(ctx, cartObj);
                        this.render2d.isCartDirty = true;
                        // delete Add item from pog in assort
                        if ( this.parentApp.isAssortAppInIAssortNiciMode && object.Position.attributeObject.RecADRI == 'A') {
                          this.planogramService.deleteItemFromShoppingcart.next(object);
                        }
                    }
                }
            } else if (
                object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                object.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                const lockFlag = object._CalcField.Fixture.PositionDesc1;
                if (lockFlag?.flag) {
                    this.notify.error(object.getLockErrorMsg(lockFlag.list));
                } else if (typeof object.moveSelectedToCart === 'function') {
                    this.planogramService.removeFromSelectionByObject(object, object.$sectionID);
                    object.moveSelectedToCart(ctx, cartObj);
                }
            }
            this.sharedService.deleteSelectedPos.push(object as Position);
        }

        if (Utils.checkIfFixture(object)) {
            section.applyRenumberingShelfs();
        }

        this.planogramService.insertPogIDs(selectedObjsList, true, true);
        //@Narendra Need to observe this change here. We need to see if we can delete section.computeMerchHeight and context creation as well.
        section.computePositionsAfterChange(ctx);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);

        ctx = new Context(section);

        section.computeMerchHeight(ctx, { reassignFlag: null, recFlag: true });
        this.render2d.isDirty = true;
        this.sharedService.updateAnnotationPosition.next(true);
        this.highlightService.updateRangeCount.next(true);
        this.planogramService.updateNestedStyleDirty = true;;
    }

    public setToDefaultOrientation(datasource: Section): void {
        let sectionID = datasource.$sectionID;
        let selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        if (
            selectedObjsList.length &&
            this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
        ) {
            let posObject = selectedObjsList[0];
            let rootObject = this.sharedService.getObject(posObject.$sectionID, posObject.$sectionID) as Section;
            let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
            sectionObj.setSkipComputePositions();
            const ctx = new Context(datasource);
            this.shelfBumpService.orientationRoll(
                ctx,
                2,
                selectedObjsList,
                rootObject,
                posObject.Position.ProductPackage.DefaultOrientation,
            );
            sectionObj.computePositionsAfterChange(ctx);
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
    }

    public changeOrientation(datasource: Section, val: {}, selectedFrom: string): void {
        let sectionID = datasource.$sectionID;
        let direction = null;
        //UNDO:REDO
        let unqHistoryID = this.historyService.startRecording();
        let selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (
            selectedObjsSize > 0 &&
            this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
        ) {
            let posObject = selectedObjsList[0];
            let rootObject = this.sharedService.getObject(posObject.$sectionID, posObject.$sectionID) as Section;
            let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
            sectionObj.setSkipComputePositions();
            const ctx = new Context(datasource);
            direction = selectedFrom == 'setDefault' ? 3 : 2;
            this.shelfBumpService.orientationRoll(ctx, direction, selectedObjsList, rootObject, val);
            sectionObj.computePositionsAfterChange(ctx);
        }
        this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
        this.planogramService.insertPogIDs(selectedObjsList, true);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        this.render2d.isDirty = true;
    }

    private getGUIDFromIDPOG(IDPOG: number): string | undefined {
        return this.planogramStore.mappers.find((it) => it.IDPOG == IDPOG)?.globalUniqueID;
    }

    public increaseFacing(datasource: Section, noOfTimes: number, fromcontextMenu?: boolean): void {
        //Utility.checkIfAllowedinReadOnlyFeature("increaseFacing");
        const sectionID = datasource.$sectionID;
        if (true) {
            let selectedObjsList = this.planogramService.getSelectedObject(sectionID);
            let selectedObjsSize = selectedObjsList.length;
            if (
                selectedObjsSize > 0 &&
                this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
            ) {
                let unqHistoryID = this.historyService.startRecording();
                let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
                sectionObj.setSkipComputePositions();
                const ctx = new Context(datasource);
                const changeVal = this.shelfBumpService.increaseFacing(ctx, selectedObjsList, noOfTimes);
                if (changeVal > 0) {
                    sectionObj.computePositionsAfterChange(ctx);
                }
                this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                this.planogramService.insertPogIDs(selectedObjsList, true);
                this.historyService.stopRecording(undefined, undefined, unqHistoryID);
                if (fromcontextMenu) {
                    this.getAllHistoryId.push(unqHistoryID);
                }
            }
        }
    }
    copiedPositions;
    isRemoveItems;

    public checkIfReadonly(IDPOG: number): boolean {
        return this.sharedService.getObjectFromIDPOG(IDPOG).IsReadOnly;
    }

    private checkIfSystemCheckout(IDPOG: number): boolean {
        const obj = this.sharedService.getObjectFromIDPOG(IDPOG);
        return Utils.isNullOrEmpty(obj.CheckoutOwner)
            ? false
            : obj.CheckoutOwner.toLowerCase() === AppConstantSpace.SYSTEM;
    }

    public incrementFacingsByOne(ctx: Context, datasource: { $sectionID: string }): void {
        this.modifyFacings(ctx, datasource, 'increment');
    }

    public DecrementFacingsByOne(ctx: Context, datasource: { $sectionID: string }): void {
        this.modifyFacings(ctx, datasource, 'decrement');
    }

    public decreaseFacing(ctx: Context, datasource: { $sectionID: string }): void {
        this.modifyFacings(ctx, datasource, 'decrease');
    }

    private modifyFacings(ctx: Context, datasource: { $sectionID: string }, op: 'increment' | 'decrement' | 'decrease'): void {
        const sectionID = datasource.$sectionID;
        const selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        if (
            selectedObjsList.length &&
            this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
        ) {
            const unqHistoryID = this.historyService.startRecording();
            const sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
            sectionObj.setSkipComputePositions();
            if (op == 'increment') {
                this.shelfBumpService.incrementFacingsByOne(ctx, selectedObjsList as Position[]);
            } else if (op == 'decrement') {
                this.shelfBumpService.DecrementFacingsByOne(ctx, selectedObjsList);
            } else if (op == 'decrease') {
                const posObject = selectedObjsList[0];
                const rootObject: Section = this.sharedService.getObject(posObject.$sectionID, posObject.$sectionID) as Section;
                this.shelfBumpService.decreaseFacing(ctx, selectedObjsList, rootObject);
            }
            sectionObj.computePositionsAfterChange(ctx);
            this.planogramService.insertPogIDs(selectedObjsList, true);
            this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        }
    }

    public rollUp(ctx: Context, datasource: Section): void {
        let sectionID = datasource.$sectionID;
        let unqHistoryID = this.historyService.startRecording();
        let selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize > 0 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            let posObject = selectedObjsList[0];
            let rootObject = this.sharedService.getObject(posObject.$sectionID, posObject.$sectionID) as Section;
            let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
            sectionObj.setSkipComputePositions();
            this.shelfBumpService.orientationRoll(ctx, 0, selectedObjsList, rootObject);
            sectionObj.computePositionsAfterChange(ctx);
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
        // @karthik not sure why this is triggered. old code does not have this. history takes care of this call.
        //datasource.computeMerchHeight(ctx);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        this.render2d.isDirty = true;
    }

    public rollDown(ctx: Context, datasource: Section): void {
        const sectionID = datasource.$sectionID;
        //UNDO:REDO
        const unqHistoryID = this.historyService.startRecording();
        const selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        if (
            selectedObjsList.length &&
            this.sharedService.lastSelectedObjectDerivedType[sectionID] == AppConstantSpace.POSITIONOBJECT
        ) {
            const posObject = selectedObjsList[0];
            const rootObject = this.sharedService.getObject(posObject.$sectionID, posObject.$sectionID) as Section;
            const sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
            sectionObj.setSkipComputePositions();
            this.shelfBumpService.orientationRoll(ctx, 1, selectedObjsList, rootObject);
            sectionObj.computePositionsAfterChange(ctx);
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
        datasource.computeMerchHeight(ctx);
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        this.render2d.isDirty = true;
    }

    public moveByNotch(datasource: { $sectionID: string }, type: string): void {
        let faildedMove = false;
        let sectionID = datasource.$sectionID;
        const selectedObjsList = this.planogramService.getSelectedObject(sectionID);
        if (selectedObjsList.length) {
            const ifStandardShelf = selectedObjsList[0].asStandardShelf(),
                ifPegboard = Utils.checkIfPegType(selectedObjsList[0] as PegTypes),
                ifCoffincase = selectedObjsList[0].asCoffincase(),
                ifBasket = selectedObjsList[0].asBasket(),
                ifBlockFixture = selectedObjsList[0].asBlockFixture();
            if (ifStandardShelf || ifPegboard || ifBlockFixture || ifCoffincase || ifBasket) {
                if (this.isPOGLive(sectionID, true)) {
                    return;
                }
                let unqHistoryID = this.historyService.startRecording();

                const isMoveUp = type == '38';
                for (const shelfObject of selectedObjsList as MerchandisableList[]) {
                    //shelfObject = shelfObject as MerchandisableList;
                    if (!this.planogramStore.appSettings.isReadOnly) {
                        if (!this.moveFixtureService.moveShelfByNotch(isMoveUp, shelfObject)) {
                            faildedMove = true;
                            break;
                        }
                    }
                }
                this.planogramService.insertPogIDs(selectedObjsList, true);
                this.planogramService.historyUniqueID = null;
                this.historyService.stopRecording(undefined, undefined, unqHistoryID);
                if (faildedMove && !this.planogramService.dialogOpened) {
                    this.historyService.abandonLastCapturedActionInHistory(unqHistoryID);
                    this.planogramService.historyUniqueID = null;
                    this.planogramService.pogIntersectionsCheck = false;
                    this.planogramService.effectedPogObjIds.length = 0;
                }
            }
        }
    }

    public modifyPOGLKFixtureMovement(
        datasource: { LKFixtureMovement: string },
        val?: { LKFixtureMovement: string },
    ): void {
        if (datasource.LKFixtureMovement != (val as any)) {
            this.historyService.startRecording();
            const original = ((val) => {
                return () => {
                    this.modifyPOGLKFixtureMovement(val);
                };
            })(val);
            const revert = ((val) => {
                return () => {
                    this.modifyPOGLKFixtureMovement(val as any);
                };
            })(datasource.LKFixtureMovement);
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'modifyPOGLKFixtureMovement',
            });
            this.historyService.stopRecording();
            datasource.LKFixtureMovement = val as any;
        }
    }

    removeAllPositionsFromFixture(ctx: Context, allModulers) {
        let fixturesList = [],
            fixturePositions,
            prevPos = 0;
        if (allModulers.length) {
            for (let i = 0; i < allModulers.length; i++) {
                fixturesList.length = 0;
                allModulers[i].Children.forEach((item) => {
                    fixturesList.push(item);
                });
                for (let j = 0; j < fixturesList.length; j++) {
                    fixturePositions = fixturesList[j].Children;
                    if (fixturesList[j].ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                        continue;
                    }

                    for (let d = fixturePositions.length - 1; d >= 0; d--) {
                        if (Utils.checkIfPosition(fixturePositions[d])) {
                            let shelfObject = fixturesList[j];
                            let currentPos = fixturePositions[d];
                            let currentIndex = d;

                            if (shelfObject.Fixture.LKCrunchMode == 5) {
                                if (shelfObject.Children.length > 0 && currentIndex != 0) {
                                    if (
                                        shelfObject.Children[currentIndex - 1].ObjectDerivedType !=
                                        AppConstantSpace.DIVIDERS
                                    ) {
                                        prevPos =
                                            shelfObject.Children[currentIndex - 1].linearWidth() +
                                            shelfObject.Children[currentIndex - 1].Location.X;
                                    } else if (
                                        shelfObject.Children[currentIndex - 1].ObjectDerivedType ==
                                        AppConstantSpace.DIVIDERS &&
                                        currentIndex != 0
                                    ) {
                                        prevPos = 0;
                                    }
                                } else if (currentIndex == 0) {
                                    prevPos = 0;
                                }
                            }
                            shelfObject.removePosition(ctx, d);

                            const original = ((index, shelfObject, sectionID) => {
                                return () => {
                                    let curFix = this.sharedService.getObject(shelfObject, sectionID) as StandardShelf;
                                    curFix.removePosition(ctx, index, false);
                                };
                            })(currentIndex, shelfObject.$id, shelfObject.$sectionID);
                            const revert = ((posObj, index, shelfObject, sectionID, prevPos) => {
                                return () => {
                                    let curFix = this.sharedService.getObject(shelfObject, sectionID) as StandardShelf;
                                    let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                                    curFix.addPosition(ctx, currPos, index, undefined, undefined, true, false);
                                    if (curFix.Fixture.LKCrunchMode == 5) {
                                        curFix.setPositionLocationX(currPos, prevPos);
                                    }
                                };
                            })(currentPos.$id, currentIndex, shelfObject.$id, shelfObject.$sectionID, prevPos);
                            this.historyService.captureActionExec({
                                funoriginal: original,
                                funRevert: revert,
                                funName: 'removeSortedPositions',
                            });
                        }
                    }
                }
            }
        }
    }

    positionFitcheckInFixture(currentSequencePos, currentFixture) {
        let fixturePositionsList = currentFixture.Children;
        let FixtureWidth = currentFixture.Dimension.Width,
            PosWidth = 0;
        for (let i = 0; i < fixturePositionsList.length; i++) {
            if (Utils.checkIfPosition(fixturePositionsList[i])) {
                PosWidth = PosWidth + fixturePositionsList[i].linearWidth();
            }
        }
        PosWidth = PosWidth + currentSequencePos.linearWidth();

        if (PosWidth >= FixtureWidth) {
            return false;
        } else {
            return true;
        }
    }

    private moveSelectedToShoppingCart(ctx: Context, posObjList: Position[]) {
        for (const pos of posObjList) {
            const rootObject = this.sharedService.getObject(
                this.sharedService.activeSectionID,
                this.sharedService.activeSectionID,
            ) as Section;
            const shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
            pos.moveSelectedToCart(ctx, shoppingCart, true);
            const currentIndex = shoppingCart.Children.length - 1;
            const funoriginal = () => {
                const rootObject = this.sharedService.getObject(
                    this.sharedService.activeSectionID,
                    this.sharedService.activeSectionID,
                );
                const shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                const currPos = this.sharedService.getObject(pos.$id, shoppingCart.$sectionID) as Position;
                currPos.moveSelectedToCart(ctx, shoppingCart, true);
            };
            const funRevert = () => {
                const rootObject = this.sharedService.getObject(
                    this.sharedService.activeSectionID,
                    this.sharedService.activeSectionID,
                );
                const shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                shoppingCart.removePosition(ctx, currentIndex);
            };
            this.historyService.captureActionExec({
                funoriginal,
                funRevert,
                funName: 'moveSortedPositionstoCart',
            });
        }
    }

    private snakingitemsinSequence(allModulers: Modular[]) {
        for (const modular of allModulers) {
            const fixturesList = [...modular.Children];
            if (this.checkList.sequenceBy == 3) {
                //LefttoRight-BottomtoTop
                fixturesList.sort((a, b) => a.Location.Y - b.Location.Y);
            } else if (this.checkList.sequenceBy == 4) {
                //LeftToRight-topToBottom
                fixturesList.sort((a, b) => b.Location.Y - a.Location.Y);
            }
            const sortedFixtureList: StandardShelf[] = fixturesList.filter(
                (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
            ); // -1 means not present);
            for (let j = 0; j < sortedFixtureList.length; j++) {
                const currentFixture = sortedFixtureList[j];
                // If current row is even, print from left to right
                // If current row is odd, print from right to left
                if (j % 2 !== 0) {
                    currentFixture.Children.reverse();
                    if (currentFixture.Fixture.LKCrunchMode == 5) {
                        this.noCruchReversePositions(currentFixture.Children, currentFixture);
                    } else {
                        this.historyService.captureActionExec({
                            funoriginal: () =>
                                this.sharedService
                                    .getObject(currentFixture.$id, currentFixture.$sectionID)
                                    .Children.reverse(),
                            funRevert: () =>
                                this.sharedService
                                    .getObject(currentFixture.$id, currentFixture.$sectionID)
                                    .Children.reverse(),
                            funName: 'reverseSortedPositions',
                        });
                    }
                }
            }
        }
    }

    private noCruchReversePositions(fixturePositionsList, currentFixture) {
        if (fixturePositionsList.length > 0) {
            let index,
                prevPos,
                shelfObject = currentFixture;
            for (let d = 0; d < fixturePositionsList.length; d++) {
                index = d;
                if (index == 0) {
                    prevPos = 0;
                }
                if (currentFixture.Children.length > 0 && index != 0) {
                    prevPos =
                        currentFixture.Children[index - 1].linearWidth() +
                        currentFixture.Children[index - 1].Location.X;
                }
                currentFixture.setPositionLocationX(fixturePositionsList[d], prevPos);
                let currentPos = fixturePositionsList[d];
                let currentIndex = d;
                let original = ((posObj, index, shelfObject, sectionID) => {
                    return () => {
                        let curFix = this.sharedService.getObject(shelfObject, sectionID);
                        let currPos = this.sharedService.getObject(posObj, sectionID);
                        curFix.Children.reverse();
                        this.noCruchReversePositions(curFix.Children, curFix);
                    };
                })(currentPos.$id, currentIndex, shelfObject.$id, shelfObject.$sectionID);
                let revert = ((posObj, index, shelfObject, sectionID, prevPos) => {
                    return () => {
                        let curFix = this.sharedService.getObject(shelfObject, sectionID) as StandardShelf;
                        let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                        curFix.setPositionLocationX(currPos, prevPos);
                    };
                })(currentPos.$id, currentIndex, shelfObject.$id, shelfObject.$sectionID, prevPos);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'nocrunchSetLocationX',
                });
            }
        }
    }

    private sortBySequenceBy(items: { Location: Location }[]) {
        let copy = [];
        if ([1, 3].includes(this.checkList.sequenceBy)) {
            //LefttoRight-BottomtoTop
            copy = items.sort((a, b) => a.Location.Y - b.Location.Y);
        } else if ([2, 4].includes(this.checkList.sequenceBy)) {
            //LeftToRight-topToBottom
            copy = items.sort((a, b) => b.Location.Y - a.Location.Y);
        }
        return copy;
    }
    private getStandardShelfObject(items: { Location: Location }[]): BlockFixture[] | StandardShelf[] {
        return this.sortBySequenceBy(items).find(
            (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
        );
    }
    rearrangeInSortedOrderInt(ctx: Context, datasource: { sectionID: string }, upcMissedinExcel: Position[]) {
        let fixturesList = [],
            sortedFixtureList,
            setBrkForFixtMod = false,
            exceededSortedList = [],
            currentSequencePos = [];
        let movedItemToCart = false;
        let dropCord,
            prevPos = 0,
            previousFixture = '',
            previousIndex = 0,
            previousMod = 0,
            doesPosFitInPrevFix;

        let rootObject = this.sharedService.getObject(
            this.sharedService.activeSectionID,
            this.sharedService.activeSectionID,
        ) as Section;

        const sortedModularList = [...this.sharedService.getAllModulars(rootObject)];
        sortedModularList.sort((a, b) => a.Location.X - b.Location.X);

        this.removeAllPositionsFromFixture(ctx, sortedModularList);



        const goToNextModular = (previousMod: number) => {
            j = previousMod + 1;
            previousMod = j;
            if (sortedModularList[j]) {
                copyfixturesList2 = copyfixturesList2.concat(sortedModularList[j].Children);
            }
            k = 0;

            return this.getStandardShelfObject(copyfixturesList2); // -1 means not present
        };
        const goTonextFixture = (
            currentFix: string,
            preIndx: number,
            modNum: number,
            myObj,
            ModularList: Modular[],
        ) => {
            let doesPosFitPreFix, indexOfCurntFix;
            let copyfixturesList1 = [];
            let rootObject = this.sharedService.getObject(
                this.sharedService.activeSectionID,
                this.sharedService.activeSectionID,
            ) as Section;
            if (currentFix != '') {
                doesPosFitPreFix = this.doesPositionsValidateFitCheck(
                    [myObj],
                    currentFix,
                    undefined,
                    undefined,
                    undefined,
                    { isFitCheckRequired: rootObject.fitCheck },
                );
            }

            if (ModularList[j]) {
                copyfixturesList1 = copyfixturesList1.concat(ModularList[j].Children);
            }
            let sortedFixtureListCopy1 = this.sortBySequenceBy(copyfixturesList1).filter(
                (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
            );

            if (currentFix != '') {
                indexOfCurntFix = sortedFixtureListCopy1.indexOf(currentFix);
            } else {
                indexOfCurntFix = 0;
            }
            if (currentFix != '' && this.positionFitcheckInFixture(myObj, currentFix) && doesPosFitPreFix) {
                //fit in current fixture

                return currentFix;
            } else {
                let indexOfNextFixture = indexOfCurntFix + 1;

                if (sortedFixtureListCopy1[indexOfNextFixture] == undefined) {
                    return goToNextModular(j);
                }
                k = indexOfNextFixture;

                return sortedFixtureListCopy1[indexOfNextFixture];
            }
        };

        if (this.sequencePosobj.length) {
            for (const sequencePos of this.sequencePosobj) {
                setBrkForFixtMod = false;

                currentSequencePos.length = 0;

                const shelf = this.sharedService.getParentObject(sequencePos.pos, sequencePos.pos.$sectionID);
                if (shelf.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                    continue;
                }
                currentSequencePos.push(sequencePos.pos);
                for (var j = 0; j < sortedModularList.length; j++) {
                    const fixturesList = [...sortedModularList[j].Children];

                    sortedFixtureList = this.sortBySequenceBy(fixturesList).filter(
                        (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
                    ); // -1 means not present

                    for (var k = 0; k < sortedFixtureList.length; k++) {
                        let currentFixture = sortedFixtureList[k];
                        if (currentFixture.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                            continue;
                        }
                        let index = currentFixture.Children.length;
                        if (index == 0) {
                            prevPos = 0;
                        }
                        const doesPosFit = this.doesPositionsValidateFitCheck(
                            [sequencePos.pos],
                            sortedFixtureList[k],
                            undefined,
                            undefined,
                            undefined,
                            { isFitCheckRequired: rootObject.fitCheck },
                        );

                        if (
                            doesPosFit.flag &&
                            this.positionFitcheckInFixture(sequencePos.pos, sortedFixtureList[k]) &&
                            previousFixture == ''
                        ) {
                            if (currentFixture.Fixture.LKCrunchMode == 5) {
                                if (currentFixture.Children.length > 0 && index != 0) {
                                    if (
                                        currentFixture.Children[index - 1].ObjectDerivedType !=
                                        AppConstantSpace.DIVIDERS
                                    )
                                        prevPos =
                                            currentFixture.Children[index - 1].linearWidth() +
                                            currentFixture.Children[index - 1].Location.X;
                                }
                                dropCord = {
                                    left: prevPos,
                                    top: sequencePos.pos.Location.Y,
                                };
                                currentFixture.setPositionLocationX(sequencePos.pos, prevPos);
                            }
                            currentFixture.addPosition(ctx, sequencePos.pos, index, dropCord);
                            previousFixture = currentFixture;
                            previousIndex = k;
                            previousMod = j;
                            sequencePos.pos.sortPlanogram = true;
                            setBrkForFixtMod = true;
                        } else {
                            j = previousMod;
                            var copyfixturesList2 = [];

                            const copyfixturesList1 = [...(sortedModularList[j]?.Children || [])];

                            this.sortBySequenceBy(copyfixturesList1).filter(
                                (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
                            ); // -1 means not present

                            const previousIndexedFixture = goTonextFixture(
                                previousFixture,
                                previousIndex,
                                previousMod,
                                sequencePos.pos,
                                sortedModularList,
                            );
                            if (previousIndexedFixture != undefined) {
                                doesPosFitInPrevFix = this.doesPositionsValidateFitCheck(
                                    [sequencePos.pos],
                                    previousIndexedFixture,
                                    undefined,
                                    undefined,
                                    undefined,
                                    { isFitCheckRequired: rootObject.fitCheck },
                                );
                            }
                            if (
                                previousIndexedFixture &&
                                this.positionFitcheckInFixture(sequencePos.pos, previousIndexedFixture) &&
                                doesPosFitInPrevFix.flag
                            ) {
                                index = previousIndexedFixture.Children.length;
                                if (index == 0) {
                                    prevPos = 0;
                                }
                                currentFixture = previousIndexedFixture;
                                if (currentFixture.Fixture.LKCrunchMode == 5) {
                                    if (currentFixture.Children.length > 0 && index != 0) {
                                        if (
                                            currentFixture.Children[index - 1].ObjectDerivedType !=
                                            AppConstantSpace.DIVIDERS
                                        )
                                            prevPos =
                                                currentFixture.Children[index - 1].linearWidth() +
                                                currentFixture.Children[index - 1].Location.X;
                                    }
                                    dropCord = {
                                        left: prevPos,
                                        top: sequencePos.pos.Location.Y,
                                    };
                                    currentFixture.setPositionLocationX(sequencePos.pos, prevPos);
                                }
                                currentFixture.addPosition(ctx, sequencePos.pos, index, dropCord);
                                previousFixture = currentFixture;
                                previousIndex = k;
                                previousMod = j;
                                setBrkForFixtMod = true;
                            } else {
                                rootObject = this.sharedService.getObject(
                                    this.sharedService.activeSectionID,
                                    this.sharedService.activeSectionID,
                                ) as Section;
                                movedItemToCart = true;
                                let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                                sequencePos.pos.moveSelectedToCart(ctx, shoppingCart, true);
                                setBrkForFixtMod = true;
                            }
                        }
                        let currentIndex = index,
                            currentPos = sequencePos.pos,
                            shelfObject = currentFixture;

                        let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                        let shoppingCarttoIndex = shoppingCart.Children.length - 1;
                        const original = ((posObj, index, shelfObject, sectionID, prevPos) => {
                            return () => {
                                let curFix = this.sharedService.getObject(shelfObject, sectionID) as StandardShelf;
                                let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                                let currFixObj = this.sharedService.getParentObject(currPos, currPos.$sectionID);
                                if (curFix.Fixture.LKCrunchMode == 5) {
                                    curFix.setPositionLocationX(currPos, prevPos);
                                }
                                if (currFixObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
                                    let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);

                                    currPos.moveSelectedToCart(ctx, shoppingCart, true);
                                } else {
                                    curFix.addPosition(ctx, currPos, index, undefined, undefined, true, false);
                                }
                            };
                        })(currentPos.$id, currentIndex, shelfObject.$id, shelfObject.$sectionID, prevPos);
                        const revert = ((posObj, index, shoppingCarttoIndex, shelfObject, sectionID) => {
                            return () => {
                                let curFix = this.sharedService.getObject(shelfObject, sectionID) as StandardShelf;
                                let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                                let currFixObj = this.sharedService.getParentObject(currPos, currPos.$sectionID);
                                if (currFixObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
                                    let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);

                                    shoppingCart.removePosition(ctx, shoppingCarttoIndex);
                                } else {
                                    curFix.removePosition(ctx, index, false);
                                }
                            };
                        })(currentPos.$id, currentIndex, shoppingCarttoIndex, shelfObject.$id, shelfObject.$sectionID);

                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addSortedPositions',
                        });

                        break;
                    }
                    if (j == sortedModularList.length - 1 && setBrkForFixtMod == false) {
                        exceededSortedList.push(sequencePos.pos);
                    }
                    if (setBrkForFixtMod) {
                        break;
                    }
                }
            }
        }

        if (exceededSortedList.length || upcMissedinExcel.length) {
            this.notify.success('REMAINING_PRODUCTS_ARE_MOVED_TO_SHOPPING_CART');
            if (exceededSortedList.length) {
                this.moveSelectedToShoppingCart(ctx, exceededSortedList);
            }
            if (upcMissedinExcel.length) {
                this.moveSelectedToShoppingCart(ctx, upcMissedinExcel);
            }
        }
        if (movedItemToCart && !exceededSortedList.length && !upcMissedinExcel.length) {
            this.notify.success('REMAINING_PRODUCTS_ARE_MOVED_TO_SHOPPING_CART');
        }
        if (this.checkList.sequenceBy == 3 || this.checkList.sequenceBy == 4) {
            //snaking of items
            this.snakingitemsinSequence(sortedModularList);
        }
    } //func

    private rearrangeInSortedOrder(ctx: Context, datasource, upcMissedinExcel) {
        let xPos,
            yPos,
            fixturesList = [],
            sortedFixtureList,
            sortedModularList = [],
            ModularList = [],
            loopedValue = '',
            setBrkForFixtMod = false,
            exceededSortedList = [],
            currentSequencePos = [];
        let sectionID = datasource.sectionID,
            coordinates,
            setBreakFlag = false,
            setBkForFitCheck = false,
            movedItemToCart = false;
        let dropCord,
            prevPos = 0,
            previousFixture = '',
            previousIndex = 0,
            previousMod = 0;
        let doesPosFitInPrevIndexFix: any;

        let rootObject = this.sharedService.getObject(
            this.sharedService.activeSectionID,
            this.sharedService.activeSectionID,
        ) as Section;

        let allModulars = this.sharedService.getAllModulars(rootObject);
        allModulars.forEach((item) => {
            ModularList.push(item);
        });

        sortedModularList = ModularList.sort(function (a, b) {
            return a.Location.X - b.Location.X;
        });

        let shoppingCart;
        this.removeAllPositionsFromFixture(ctx, sortedModularList);
        if (this.sequencePosobj.length > 0) {
            for (let i = 0; i < this.sequencePosobj.length; i++) {
                setBrkForFixtMod = false;
                setBkForFitCheck = false;
                currentSequencePos.length = 0;

                let shelf = this.sharedService.getParentObject(
                    this.sequencePosobj[i].pos,
                    this.sequencePosobj[i].pos.$sectionID,
                );
                if (shelf.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                    continue;
                }
                currentSequencePos.push(this.sequencePosobj[i].pos);
                for (let j = 0; j < sortedModularList.length; j++) {
                    fixturesList.length = 0;

                    sortedModularList[j].Children.forEach((item) => {
                        fixturesList.push(item);
                    });

                    sortedFixtureList = this.sortBySequenceBy(fixturesList).filter(
                        (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
                    ); // -1 means not present

                    for (let k = 0; k < sortedFixtureList.length; k++) {
                        let currentFixture = sortedFixtureList[k];
                        if (currentFixture.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                            continue;
                        }
                        let index = currentFixture.Children.length;
                        if (index == 0) {
                            prevPos = 0;
                        }
                        let doesPosFit = this.doesPositionsValidateFitCheck(
                            [this.sequencePosobj[i].pos],
                            sortedFixtureList[k],
                            undefined,
                            undefined,
                            undefined,
                            { isFitCheckRequired: rootObject.fitCheck },
                        ); //$injector.get('sappDragDropService').doesPositionsValidateFitCheck([sequencePosobj[i].pos], sortedFixtureList[k], undefined, undefined, undefined, { isFitCheckRequired: rootObject.fitCheck }); -- dragdrop service is not present so commented as of now
                        if (doesPosFit.flag) {
                            if (this.positionFitcheckInFixture(this.sequencePosobj[i].pos, sortedFixtureList[k])) {
                                if (currentFixture.Fixture.LKCrunchMode == 5) {
                                    if (currentFixture.Children.length > 0 && index != 0) {
                                        if (
                                            currentFixture.Children[index - 1].ObjectDerivedType !=
                                            AppConstantSpace.DIVIDERS
                                        )
                                            prevPos =
                                                currentFixture.Children[index - 1].linearWidth() +
                                                currentFixture.Children[index - 1].Location.X;
                                    }
                                    dropCord = {
                                        left: prevPos,
                                        top: this.sequencePosobj[i].pos.Location.Y,
                                    };
                                    currentFixture.setPositionLocationX(this.sequencePosobj[i].pos, prevPos);
                                }

                                currentFixture.addPosition(ctx, this.sequencePosobj[i].pos, index, dropCord);
                                previousFixture = currentFixture;
                                previousIndex = k;
                                previousMod = j;
                                this.sequencePosobj[i].pos.sortPlanogram = true;
                                setBrkForFixtMod = true;
                            } else {
                                continue;
                            }
                        } else {
                            let doesPosFitInPrevFix = this.doesPositionsValidateFitCheck(
                                [this.sequencePosobj[i].pos],
                                previousFixture,
                                undefined,
                                undefined,
                                undefined,
                                { isFitCheckRequired: rootObject.fitCheck },
                            );
                            j = previousMod;
                            let copyfixturesList1 = [],
                                copyfixturesList2 = [],
                                sortedFixtureListCopy1,
                                sortedFixtureListCopy2;
                            sortedModularList[j].Children.forEach((item) => {
                                copyfixturesList1.push(item);
                            });

                            sortedFixtureListCopy1 = this.sortBySequenceBy(copyfixturesList1).filter(
                                (it) => it.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ,
                            ); // -1 means not present

                            let previousIndexedFixture = sortedFixtureListCopy1[previousIndex + 1];
                            if (previousIndexedFixture == undefined) {
                                j = previousMod + 1;
                                if (sortedModularList[j] != undefined)
                                    sortedModularList[j].Children.forEach((item) => {
                                        copyfixturesList2.push(item);
                                    });

                                if (this.checkList.sequenceBy == 1 || this.checkList.sequenceBy == 3) {
                                    //LefttoRight-BottomtoTop
                                    sortedFixtureListCopy2 = copyfixturesList2.sort(function (a, b) {
                                        return a.Location.Y - b.Location.Y;
                                    });
                                } else if (this.checkList.sequenceBy == 2 || this.checkList.sequenceBy == 4) {
                                    //LeftToRight-topToBottom

                                    sortedFixtureListCopy2 = copyfixturesList2.sort(function (a, b) {
                                        return b.Location.Y - a.Location.Y;
                                    });
                                }
                                sortedFixtureListCopy2 = sortedFixtureListCopy2.filter(function (item) {
                                    return item.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ; // -1 means not present
                                });
                                previousIndexedFixture = sortedFixtureListCopy2[0];
                            }

                            if (previousIndexedFixture != undefined) {
                                doesPosFitInPrevIndexFix = this.doesPositionsValidateFitCheck(
                                    [this.sequencePosobj[i].pos],
                                    previousIndexedFixture,
                                    undefined,
                                    undefined,
                                    undefined,
                                    { isFitCheckRequired: rootObject.fitCheck },
                                );
                            }

                            if (
                                previousIndexedFixture != undefined &&
                                previousFixture != '' &&
                                this.positionFitcheckInFixture(this.sequencePosobj[i].pos, previousIndexedFixture) &&
                                doesPosFitInPrevIndexFix.flag
                            ) {
                                index = previousIndexedFixture.Children.length;
                                currentFixture = previousIndexedFixture;
                                previousFixture = previousIndexedFixture;
                                if (currentFixture.Fixture.LKCrunchMode == 5) {
                                    if (currentFixture.Children.length > 0 && index != 0) {
                                        if (
                                            currentFixture.Children[index - 1].ObjectDerivedType !=
                                            AppConstantSpace.DIVIDERS
                                        )
                                            prevPos =
                                                currentFixture.Children[index - 1].linearWidth() +
                                                currentFixture.Children[index - 1].Location.X;
                                    }
                                    dropCord = {
                                        left: prevPos,
                                        top: this.sequencePosobj[i].pos.Location.Y,
                                    };
                                    currentFixture.setPositionLocationX(this.sequencePosobj[i].pos, prevPos);
                                }
                                currentFixture.addPosition(ctx, this.sequencePosobj[i].pos, index, dropCord);
                                setBrkForFixtMod = true;
                            } else if (
                                previousIndexedFixture != undefined &&
                                doesPosFitInPrevIndexFix.flag &&
                                this.positionFitcheckInFixture(this.sequencePosobj[i].pos, previousIndexedFixture)
                            ) {
                                index = previousIndexedFixture.Children.length;
                                currentFixture = previousIndexedFixture;
                                previousFixture = previousIndexedFixture;
                                if (currentFixture.Fixture.LKCrunchMode == 5) {
                                    if (currentFixture.Children.length > 0 && index != 0) {
                                        if (
                                            currentFixture.Children[index - 1].ObjectDerivedType !=
                                            AppConstantSpace.DIVIDERS
                                        )
                                            prevPos =
                                                currentFixture.Children[index - 1].linearWidth() +
                                                currentFixture.Children[index - 1].Location.X;
                                    }
                                    dropCord = {
                                        left: prevPos,
                                        top: this.sequencePosobj[i].pos.Location.Y,
                                    };
                                    currentFixture.setPositionLocationX(this.sequencePosobj[i].pos, prevPos);
                                }
                                currentFixture.addPosition(ctx, this.sequencePosobj[i].pos, index, dropCord);
                                setBrkForFixtMod = true;
                            } else {
                                rootObject = this.sharedService.getObject(
                                    this.sharedService.activeSectionID,
                                    this.sharedService.activeSectionID,
                                ) as Section;
                                shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                                this.sequencePosobj[i].pos.moveSelectedToCart(ctx, shoppingCart, true);
                                movedItemToCart = true;
                                setBrkForFixtMod = true;
                            }
                        }
                        let currentIndex = index,
                            currentPos = this.sequencePosobj[i].pos,
                            shelfObject = currentFixture;

                        shoppingCart = Utils.getShoppingCartObj(rootObject.Children);
                        let shoppingCarttoIndex = shoppingCart.Children.length - 1;
                        const original = ((posObj, index, shoppingCarttoIndex, shelfObject, sectionID, prevPos) => {
                            return () => {
                                let curFix = this.sharedService.getObject(shelfObject, sectionID) as MerchandisableList;
                                let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                                let currFixObj = this.sharedService.getParentObject(currPos, currPos.$sectionID);
                                if (curFix.Fixture.LKCrunchMode == 5) {
                                    curFix.setPositionLocationX(currPos, prevPos);
                                }
                                if (currFixObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
                                    let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);

                                    currPos.moveSelectedToCart(ctx, shoppingCart, true);
                                } else {
                                    curFix.addPosition(ctx, currPos, index, undefined, undefined, true, false);
                                }
                            };
                        })(
                            currentPos.$id,
                            currentIndex,
                            shoppingCarttoIndex,
                            shelfObject.$id,
                            shelfObject.$sectionID,
                            prevPos,
                        );
                        const revert = ((posObj, index, shoppingCarttoIndex, shelfObject, sectionID) => {
                            return () => {
                                let curFix = this.sharedService.getObject(shelfObject, sectionID) as MerchandisableList;
                                let currPos = this.sharedService.getObject(posObj, sectionID) as Position;
                                let currFixObj = this.sharedService.getParentObject(currPos, currPos.$sectionID);
                                if (currFixObj.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
                                    let shoppingCart = Utils.getShoppingCartObj(rootObject.Children);

                                    shoppingCart.removePosition(ctx, shoppingCarttoIndex);
                                } else {
                                    curFix.removePosition(ctx, index, false);
                                }
                            };
                        })(currentPos.$id, currentIndex, shoppingCarttoIndex, shelfObject.$id, shelfObject.$sectionID);

                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addSortedPositions',
                        });

                        break;

                        //    continue
                        //}
                    }
                    if (j == sortedModularList.length - 1 && setBrkForFixtMod == false) {
                        exceededSortedList.push(this.sequencePosobj[i].pos);
                    }
                    if (setBrkForFixtMod) {
                        break;
                    }
                }
            }
        }

        if (exceededSortedList.length || upcMissedinExcel.length) {
            this.notify.success('REMAINING_PRODUCTS_ARE_MOVED_TO_SHOPPING_CART');
            if (exceededSortedList.length) {
                this.moveSelectedToShoppingCart(ctx, exceededSortedList);
            }
            if (upcMissedinExcel.length) {
                this.moveSelectedToShoppingCart(ctx, upcMissedinExcel);
            }
        }
        if (movedItemToCart && exceededSortedList.length == 0 && upcMissedinExcel.length == 0) {
            this.notify.success('REMAINING_PRODUCTS_ARE_MOVED_TO_SHOPPING_CART');
        }

        if (this.checkList.sequenceBy == 3 || this.checkList.sequenceBy == 4) {
            //snaking of items
            this.snakingitemsinSequence(sortedModularList);
        }
    } //func

    public sequenceSortPlanogram(
        ctx: Context,
        datasource: { sectionID: string },
        upcList: Array<string | Position>,
        checkList: CheckList,
    ): void {
        return this.sortPlanogram(ctx, datasource, upcList, checkList, false);
    }

    public intelligentSortPlanogram(
        ctx: Context,
        datasource: { sectionID: string },
        upcList: Array<string | Position>,
        checkList: CheckList,
    ): void {
        return this.sortPlanogram(ctx, datasource, upcList, checkList, true);
    }

    private sortPlanogram(
        ctx: Context,
        datasource: { sectionID: string },
        upcList: Array<string | Position>,
        checkList: CheckList,
        intelligent: boolean,
    ): void {
        this.checkList = checkList;
        this.sequencePosobj = [];
        const historyId = this.historyService.startRecording();
        let rootObject = this.sharedService.getObjectAs<Section>(
            this.sharedService.activeSectionID,
            this.sharedService.activeSectionID,
        );
        let allPositions = rootObject.getAllPositions();

        const upcMissedinExcel = [];
        if (this.checkList.excelData == 'excelData') {
            for (const position of allPositions) {
                if (!upcList.includes(position.Position.Product.UPC)) {
                    upcMissedinExcel.push(position);
                } else {
                    this.sequencePosobj.push({
                        pos: position,
                        index: upcList.indexOf(position.Position.Product.UPC),
                    });
                }
            }
            this.sequencePosobj.sort((a, b) => a.index - b.index);
        } else {
            this.sequencePosobj = upcList.map((pos, index) => ({ pos, index })) as any;
        }

        if (intelligent) {
            this.rearrangeInSortedOrderInt(ctx, datasource, upcMissedinExcel);
        } else {
            this.rearrangeInSortedOrder(ctx, datasource, upcMissedinExcel);
        }
        this.sharedService.updateStandardShelf.next(true);

        this.historyService.stopRecording(undefined, undefined, historyId);
    }
    private msgItemExceedsFixtureHeight(item: Position, dropItemHeight: number): { flag: boolean; errmsg: string } {
        const itemH = Math.round(item.Dimension.Height * 100) / 100;
        const itemW = Math.round(item.Dimension.Width * 100) / 100;
        const itemD = Math.round(item.Dimension.Depth * 100) / 100;
        const fixtureHeight = Math.round(dropItemHeight * 100) / 100;
        const translateOneStr = this.translate.instant('ONE');
        const translateMoreHeightStr = this.translate.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT');

        return {
            flag: false,
            errmsg: `${translateOneStr} ${item.Position.inventoryObject.UPC} - ${itemH} x ${itemW} x ${itemD} ${translateMoreHeightStr} ${fixtureHeight}.`
        };
    }
    private doesPositionsValidateFitCheck(
        multiDragableElementsList: Position[],
        dropItemData,
        baseControllerScope,
        dropIndex,
        dropCord,
        params,
    ) {
        // iterate through all items
        // when item dropped into a standardshelf
        // Auto compute ON - 1. dragged item(one frontshigh height) should be less than shelf merch height to qualify fitcheck on item drag
        // Auto compute OFF - 2. dragged item(frontshighs height + layover + layunder height) should be less than shelf merch height to qualify fitcheck on item drag
        try {
            let totalSquareToDrop = 0;
            let availableSquare = 0,
                totalLinear = 0;

            let rootObject = this.sharedService.getObject(
              dropItemData.$sectionID,
              dropItemData.$sectionID,
            ) as Section;



            for (let i = multiDragableElementsList.length - 1; i >= 0; i--) {
                const dragElementItemData = multiDragableElementsList[i];

                const ItemHt = dragElementItemData.computeHeight();
                const ItemDt = dragElementItemData.computeDepth();
                const ItemFullHt = dragElementItemData.Dimension.Height;
                const ItemFullDt = dragElementItemData.Dimension.Depth;
                availableSquare = dropItemData.Fixture.AvailableSquare;
                if (params.isFitCheckRequired && dropItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
                    if (dropItemData.$id != dragElementItemData.$idParent) {
                        totalLinear += dragElementItemData.linearWidth();
                    }
                    if (totalLinear > dropItemData.unUsedLinear) {
                        return { flag: false, errmsg: 'Fit check error required linear is more than Unused Linear' };
                    }
                } else if (
                    params.isFitCheckRequired &&
                    (dropItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        dropItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ)
                ) {
                    if (dropItemData.$id != dragElementItemData.$idParent) {
                        totalSquareToDrop =
                            totalSquareToDrop + dragElementItemData.linearWidth() * dragElementItemData.linearHeight();
                    } else {
                        availableSquare =
                            availableSquare + dragElementItemData.linearWidth() * dragElementItemData.linearHeight();
                    }
                    if (totalSquareToDrop > availableSquare) {
                        return { flag: false, errmsg: 'Fit check error required square is more than available square' };
                    }
                } else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Height < ItemHt &&
                    dropItemData.Fixture.AutoComputeFronts &&
                    (!rootObject.IsVariableHeightShelf ||
                        (dropItemData.Fixture.MaxMerchHeight != null && dropItemData.Fixture.MaxMerchHeight > 0))
                ) {
                    /*When autocomputefronts is on need to check at least one facingY can fit in the available height and variable height should off and max merch height should be null or zero*/
                    return this.msgItemExceedsFixtureHeight(dragElementItemData, dropItemData.ChildDimension.Height);
                } else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Depth + (dragElementItemData.Position.ProductPackage.OverhangZ || 0) <
                    ItemDt &&
                    dropItemData.Fixture.AutoComputeDepth
                ) {
                    /*When autocomputefronts is on need to check at least one facingY can fit in the available height and variable height should off and max merch height should be null or zero*/
                    return this.msgItemExceedsFixtureHeight(dragElementItemData, dropItemData.ChildDimension.Depth);
                } else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Height < ItemFullHt &&
                    !dropItemData.Fixture.AutoComputeFronts
                ) {
                    return this.msgItemExceedsFixtureHeight(dragElementItemData, dropItemData.ChildDimension.Height);
                } else if (
                    params.isFitCheckRequired &&
                    !dropItemData.Fixture.AutoComputeDepth &&
                    dropItemData.ChildDimension.Depth + (dragElementItemData.Position.ProductPackage.OverhangZ || 0) <
                    ItemFullDt
                ) {
                    return this.msgItemExceedsFixtureHeight(dragElementItemData, dropItemData.ChildDimension.Depth);
                } else if (
                    typeof dropIndex != 'undefined' &&
                    Number(dragElementItemData.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE
                ) {
                    const baseItem = dropItemData.Children[dropIndex];
                    if (!baseItem || baseItem.$id == dragElementItemData.$id || baseItem.hasAboveItem) {
                        return { flag: false, errmsg: this.translate.instant('CANT_DROP_ON_THE_SAME_ITEM') };
                    }
                } else if (
                    typeof dropIndex != 'undefined' &&
                    Number(dragElementItemData.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND
                ) {
                    const baseItem = dropItemData.Children[dropIndex];
                    if (!baseItem || baseItem.$id == dragElementItemData.$id || baseItem.hasBackItem) {
                        return { flag: false, errmsg: this.translate.instant('CANT_DROP_ON_THE_SAME_ITEM') };
                    }

                    if (
                        params.isFitCheckRequired &&
                        ((dropItemData.Fixture.AutoComputeDepth &&
                            dragElementItemData.computeDepth() >
                            dropItemData.ChildDimension.Depth +
                            (dragElementItemData.Position.ProductPackage.OverhangZ || 0) -
                            baseItem.linearDepth()) ||
                            (!dropItemData.Fixture.AutoComputeDepth &&
                                dragElementItemData.linearDepth() >
                                dropItemData.ChildDimension.Depth +
                                (dragElementItemData.Position.ProductPackage.OverhangZ || 0) -
                                baseItem.linearDepth()) ||
                            (dropItemData.Fixture.AutoComputeFronts &&
                                dragElementItemData.computeHeight() > dropItemData.ChildDimension.Height) ||
                            (!dropItemData.Fixture.AutoComputeFronts &&
                                dragElementItemData.linearHeight() > dropItemData.ChildDimension.Height) ||
                            baseItem.linearWidth() < dragElementItemData.linearWidth())
                            // || baseItem.linearHeight() < dragElementItemData.linearHeight()) // Note: Behind item can have more height than base item
                    ) {
                        return {
                            flag: false,
                            errmsg: "Fit check error, required linear is more than Base item's Linear",
                        };
                    }
                }
            }
        } catch (e) {
            console.error('Dragdrop fail: doesPositionsValidateFitCheck' + e.stack);
            // Log.log(":AngularDragDrop > Method > doesPositionsValidateFitCheck: params : multiDragableElementsList : ", multiDragableElementsList, ' : dropItemData : ', dropItemData, e);
        }
        return { flag: true };
    }


    public savePlanogramDatasource(section: Section): Observable<boolean> {
        if (section?.$sectionID) {
            if (this.planogramService.rootFlags[section.$sectionID].isSaveDirtyFlag) {
                //  Log.info("POGID=" + $scope.planogramVms[this.sharedService.activeSectionID].IDPOG + " attempt save");
                const allModulars = this.sharedService.getAllModulars(section);
                const totalModularWidth = allModulars.reduce((p, it) => p + it.Dimension.Width, 0);
                if (
                    Utils.preciseRound(section.Dimension.Width, 2) != Utils.preciseRound(totalModularWidth, 2) &&
                    allModulars.length
                ) {
                    this.planogramSaveService.notifySaveStatus(section, true, 'UNUSED_SECTION_SPACE_REDUCE_SECTION_SIZE_OR_INCREASE_MODULAR_WIDTH');
                    return of(false);
                }
                if (this.sharedService.splitChangeStatus) {
                    if (this.sharedService.splitChangePOGId.indexOf(section.IDPOG) > -1) {
                        this.sharedService.splitChangeStatus.state = false;
                        this.sharedService.splitChangePOGId.splice(
                            this.sharedService.splitChangePOGId.indexOf(this.sharedService.splitChangeStatus.IDPOG),
                            1,
                        );
                    }
                }

                if (this.parentApp.isAllocateApp) {
                  return this.allocateService.validatePogData(section).pipe<boolean>(mergeMap(res => {
                      if (res) {
                          return this.planogramSaveService.savePlanogram(section, section.$sectionID);
                        }
                      else {
                          return of(false);
                      }
                  }));
              } else {
                  return this.planogramSaveService.savePlanogram(section, section.$sectionID);
              }
            } else {
                this.planogramSaveService.notifySaveStatus(section, true, 'NO_CHANGES_DETECTED_TO_SAVE');
                return of(false);
            }
        }
        console.log("Section details not found");
        return of(false);
    }
    private filterSectionIdFromPogObj(pogList) {
        let sectionIdList = [];
        pogList?.forEach((item) => {
            let pogRootFlagList = Object.keys(this.planogramService.rootFlags).filter((sectionId) => sectionId == item.sectionID && this.planogramService.rootFlags[item.sectionID]
                && !this.planogramService.rootFlags[item.sectionID].asyncSaveFlag.isPOGSavingInProgress
            );
            sectionIdList.push(pogRootFlagList)
        })
        return sectionIdList;
    }
    public saveAllPlanograms(pogList?): void {
        this.pogsFromMaxCount = pogList? pogList:[];
        if (!this.onlineOfflineService.isOnline) {
            this.notify.warn('INTERNET_DISCONNECTED');
            return;
        }
        if (this.sharedService.isSaveAllInProgress) {
            this.notify.warn('SAVE_ALL_ALREADY_IN_PROGRESS');
            return;
        }
        if (!this.planogramStore.appSettings.asyncSaveToogleFlag && this.planogramSaveService.saveInProgress) {
            this.notify.warn('SAVE_ALREADY_IN_PROGRESS');
            return;
        }


        let dirtyPogs = pogList ? this.filterSectionIdFromPogObj(pogList) : Object.keys(this.planogramService.rootFlags)
            .filter(sectionId => this.planogramService.rootFlags[sectionId].isSaveDirtyFlag
                && !this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGSavingInProgress);

        if (dirtyPogs?.length) {
            this.sharedService.isSaveAllInProgress = true;
            let pogsToSave = this.sharedService.allPogsToSaveInSaveAll = dirtyPogs;
            this.pogsSaveAllSubscription = new Subscription;

            if (!this.planogramStore.appSettings.asyncSaveToogleFlag) {
                this.spinner.show();
            }

            if (this.sharedService.asyncSavePogCap + dirtyPogs.length > this.planogramStore.appSettings.asyncSavePogCap) {
                pogsToSave = dirtyPogs.slice(0, this.planogramStore.appSettings.asyncSavePogCap - this.sharedService.asyncSavePogCap);
                this.asyncSaveSectionIdsInQueue = dirtyPogs.slice(this.planogramStore.appSettings.asyncSavePogCap - this.sharedService.asyncSavePogCap);
            }

            if (pogsToSave.length) {
                setTimeout(() => this.savePlanogram(pogsToSave[0]), 100); //this 100 added to let loader/footer status update first
                this.planogramSaveService.saveDataPrepSectionIdsInQueue = pogsToSave.slice(1);
            }

            this.processNextPogInSaveAllSub = this.planogramSaveService.processNextPogInSaveAll.subscribe(res => {
                if (res && this.planogramSaveService.saveDataPrepSectionIdsInQueue.length) {
                    this.savePlanogram(this.planogramSaveService.saveDataPrepSectionIdsInQueue.pop());
                }
            });

        } else {
            this.notify.warn('NO_CHANGES_DETECTED_TO_SAVE');
        }
    }
    public unloadPlanogram(items: POGLibraryListItem[]): void { //we need to re-use this method in planogramLib componenet also
        for (const item of items) {
          const mapperObj = this.planogramLibraryService.getCurrentObject(item.globalUniqueID);
          try {
            if (item.IDPOG === this.panelService.invokedIdpogApiForPanelID) {
              this.panelService.invokedIdpogApiForPanelID = null;
              this.panelService.skipApiCallForPanel = { panelID: '', flag: false, IDPOG: null };
            }
            this.planogramStore.removePogById(item.IDPOG);
            mapperObj.isLoaded = false;

            this.removePlanogramVm(mapperObj);
            if (this.sharedService.isWorkSpaceActive) {

            if(this.panelService.panelPointer['panelOne'].isLoaded && item.IDPOG == this.panelService.panelPointer['panelOne'].IDPOG){
                this.panelService.panelPointer['panelOne']['sectionID'] = '';
                this.panelService.panelPointer['panelOne']['componentID'] = '' as any;
                this.panelService.panelPointer['panelOne']['isLoaded']= false;

            }
            if(this.panelService.panelPointer['panelTwo'].isLoaded && item.IDPOG == this.panelService.panelPointer['panelTwo'].IDPOG){
                this.panelService.panelPointer['panelTwo']['sectionID'] = '';
                this.panelService.panelPointer['panelTwo']['componentID'] = '' as any;
                this.panelService.panelPointer['panelTwo']['isLoaded']= false;

            }
            this.panelService.updateHeaderIcons.next(true);
        }
          } catch (e) {
            this.log.error(e);
          }
          mapperObj.sectionID = '';
        }
      }
      private removePlanogramVm({ IDPOG, sectionID }: { IDPOG: number, sectionID: string }): void {
        this.planogramLoaderService.removePlanogramVM(IDPOG, sectionID);
        if (!this.sharedService.isWorkSpaceActive) {
        this.planogramService.pogChangesInLibrary.next("updateFromMaxCount");
        }
        this.planogramStore.removePogById(IDPOG);

      }
    private savePlanogram(sectionId: string): void {
        let section = this.sharedService.getObject(sectionId, sectionId) as Section;
        try {
            if (section) {
                this.planogramSaveService.isSaveDataPrepInProgress = true;
                this.pogsSaveAllSubscription.add(this.savePlanogramDatasource(section).subscribe(response => {
                    if (this.sharedService.allPogsToSaveInSaveAll.includes(sectionId) && !this.sharedService.processedPogsInSaveAll.includes(sectionId)) {
                        this.sharedService.processedPogsInSaveAll.push(sectionId);
                    }
                    this.processSaveSectionIdsInQueue();
                }));
                this.asyncSavePogIds.push(section?.IDPOG);

            } else {
                let translatedMessage = this.translate.instant('SECTION_DETAILS_COULD_NOT_BE_RETRIEVED');
                this.planogramSaveService.asyncSavePogsStatusMessage = `${this.planogramSaveService.asyncSavePogsStatusMessage} \n ${sectionId} - ${translatedMessage}`;
                console.log(`Section details could not be retrieved for section id - ${sectionId}`);
                this.sharedService.processedPogsInSaveAll.push(sectionId);
                this.processSaveSectionIdsInQueue();
            }
        } catch (e) {
            let translatedMessage = this.translate.instant('ERROR');
            this.planogramSaveService.asyncSavePogsStatusMessage = `${this.planogramSaveService.asyncSavePogsStatusMessage} \n ${section?.IDPOG ?? sectionId} - ${translatedMessage}`;
            console.log(`${section?.IDPOG ?? sectionId} - Some exception occurred: ${e}`);
            this.sharedService.processedPogsInSaveAll.push(sectionId);
            this.planogramSaveService.isSaveDataPrepInProgress = false;
            this.processSaveSectionIdsInQueue();
        }
    }

    public processSaveSectionIdsInQueue(): void {
        if (this.sharedService.processedPogsInSaveAll.length < this.sharedService.allPogsToSaveInSaveAll.length) {
            if (this.sharedService.asyncSavePogCap < this.planogramStore.appSettings.asyncSavePogCap) {
                if (this.planogramSaveService.saveDataPrepSectionIdsInQueue.length) {
                    this.planogramSaveService.processNextPogInSaveAll.next(true);
                }
                else if (this.asyncSaveSectionIdsInQueue.length) {
                    if (this.planogramSaveService.isSaveDataPrepInProgress) {
                        this.planogramSaveService.saveDataPrepSectionIdsInQueue.push(this.asyncSaveSectionIdsInQueue.pop());
                    } else {
                        this.savePlanogram(this.asyncSaveSectionIdsInQueue.pop());
                    }
                }
            }
        }
        else if (this.sharedService.isSaveAllInProgress) {
            this.processSaveAllComplete();
            this.notify.success("SAVE_ALL_COMPLETED_CHECK_INFO_CONSOLE");
        }
    }

    private processSaveAllComplete(): void {
        let saveStartMessage = this.translate.instant('SAVE_ALL_INITIATED_FOR_FOLLOWING_POGS');
        this.planogramSaveService.asyncSavePogsStatusMessage = `${saveStartMessage} - ${this.asyncSavePogIds.join(', ')} \n ${this.planogramSaveService.asyncSavePogsStatusMessage}`;
        let code = this.translate.instant('SAVE_ALL');
        const logDetails: LogsListItem = {
            Message: this.planogramSaveService.asyncSavePogsStatusMessage,
            Code: code,
            Type: 'I',
            IsClientSide: true
        };
        this.informationConsoleLogService.setClientLog([logDetails], 'G');
        this.planogramSaveService.asyncSavePogsStatusMessage = '';
        this.asyncSavePogIds = [];
        this.sharedService.isSaveAllInProgress = false;
        this.sharedService.allPogsToSaveInSaveAll = [];
        this.sharedService.processedPogsInSaveAll = [];
        this.pogsSaveAllSubscription.unsubscribe();
        if (!this.planogramStore.appSettings.asyncSaveToogleFlag) {
            this.spinner.hide();
        }
        if (this.asyncSaveSectionIdsInQueue.length || this.planogramSaveService.saveDataPrepSectionIdsInQueue.length) {
            console.log(`Either save not processed or tracking not done for following section ids - ${this.asyncSaveSectionIdsInQueue.toString()},${this.planogramSaveService.saveDataPrepSectionIdsInQueue.toString()}`);
            this.asyncSaveSectionIdsInQueue = [];
            this.planogramSaveService.saveDataPrepSectionIdsInQueue = [];
        }
        this.processNextPogInSaveAllSub.unsubscribe();
        if(this.pogsFromMaxCount.length){ //once save unload planograms and update dialog list
            this.unloadPlanogram(this.pogsFromMaxCount);
            this.planogramLibraryService.updatePlanogramList.next(true);
        }

    }

    public checkSaveStatusDuringOffline(): void {
        let inProgressList = Object.keys(this.planogramService.rootFlags)
            .filter(sectionId => this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGSavingInProgress);

        let savePendingList: string[] = inProgressList;

        if (this.sharedService.isSaveAllInProgress)
            savePendingList = savePendingList.concat(this.planogramSaveService.saveDataPrepSectionIdsInQueue, this.asyncSaveSectionIdsInQueue);

        let saveProcessedList = this.sharedService.allPogsToSaveInSaveAll.filter(s => !savePendingList.includes(s) && !this.sharedService.processedPogsInSaveAll.includes(s));
        let svgSaveFailMessage = this.translate.instant('SVG_SAVE_MIGHT_FAILED');

        saveProcessedList.forEach(sectionId => {
            this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGChangedDuringSave
                    ? (this.planogramService.rootFlags[sectionId].isAutoSaveDirtyFlag = true)
                    : (this.planogramService.rootFlags[sectionId].isSaveDirtyFlag = false); //This to mark not dirty when pog saved but svg failed
            this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGChangedDuringSave = false;
            let section = this.sharedService.getObject(sectionId, sectionId) as Section;
            this.planogramSaveService.asyncSavePogsStatusMessage = `${this.planogramSaveService.asyncSavePogsStatusMessage} \n ${section?.IDPOG ?? sectionId} - ${svgSaveFailMessage}`;
        });


        let statusMessage: string = '';
        let translatedInternetStatusMsg = this.translate.instant('SAVE_STOPPED_DUE_TO_INTERNET_DISCONNECT');

        if (savePendingList.length) {
            if (this.sharedService.isSaveAllInProgress) {
                savePendingList.forEach(sectionId => {
                    let section = this.sharedService.getObject(sectionId, sectionId) as Section;
                    statusMessage = `${statusMessage} \n ${section?.IDPOG ?? sectionId} - ${translatedInternetStatusMsg}`;
                    if (!this.asyncSavePogIds.includes(section?.IDPOG))
                        this.asyncSavePogIds.push(section?.IDPOG);
                    this.sharedService.processedPogsInSaveAll.push(sectionId);
                });
            }

            inProgressList.forEach(sectionId => {
                this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGSavingInProgress = false;
                if (this.sharedService.asyncSavePogCap)
                    this.sharedService.asyncSavePogCap--;
            });
        }

        if (this.sharedService.isSaveAllInProgress) {
            let translatedRetryMsg = this.translate.instant('RETRY_WHEN_INTERNET_CONNECTED');
            this.planogramSaveService.asyncSavePogsStatusMessage = `${this.planogramSaveService.asyncSavePogsStatusMessage} \n ${statusMessage} \n\n ${translatedRetryMsg}`;
            this.asyncSaveSectionIdsInQueue = [];
            this.planogramSaveService.saveDataPrepSectionIdsInQueue = [];
            this.sharedService.asyncSavePogCap = 0;
            this.processSaveAllComplete();
            this.notify.error('SAVE_ALL_INTERRUPTED_CHECK_INFO_CONSOLE');
        } else if (inProgressList?.length) {
            this.notify.error(translatedInternetStatusMsg);
        }

        if (!this.planogramStore.appSettings.asyncSaveToogleFlag) {
            this.planogramSaveService.saveInProgress = false;
            this.spinner.hide();
        }
    }

    public generateAndSaveSVG(sectionId: string): Observable<boolean> {
      const pog = <Section>this.sharedService.getObject(sectionId, sectionId);
      const svg = this.planogramRender.SVG(pog, 1, {annotationFlag: true});
      return this.planogramSaveService.saveSVG(sectionId, svg, pog as any,
         {"Fixture" : [], "PackageAttributes" : [], "Positions" : []} as SavePlanogram);
    }

    public get deploymentPath(): string {
        return this.config.deploymentPath;
    }

    public moveFixtureByNotchNumber(data: FixtureList, pogObject: Section, oldValue: number, newValue: number): boolean {
        let isFixtureMoved = true;
        let oldVlaueLocY = data.Location.Y;
        let locationY = 0;
        if (newValue !== 0) {
            const spacing = pogObject.Notch == 0 ? 1 : pogObject.Notch;
            const totalSpace = ((newValue - 1) * spacing) - (data.getNotchThicknes() * (pogObject._Reversenotch.FlagData ? -1 : 1));
            const notchIntervals = pogObject.getNotchInterval();
            locationY = pogObject._Reversenotch.FlagData ? notchIntervals[notchIntervals.length - 1] - totalSpace : pogObject.FirstNotch + totalSpace;
        }

        if (locationY < 0) {
            isFixtureMoved = false;
            this.sharedService.setObjectField(undefined, AppConstantSpace.FIXTURE_NOTCH_NUMBER, oldValue, undefined, data);
            this.notify.warn('LOCATION_Y_CANNOT_BE_NEGATIVE');
        }
        else {
            this.sharedService.setObjectField(undefined, AppConstantSpace.LOCATION_Y, locationY, undefined, data);
            pogObject.applyRenumberingShelfs();
            if (locationY != oldVlaueLocY) {
                let original = ((model, field, value) => {
                    return () => {
                        this.sharedService.setObjectField(undefined, field, value, undefined, model);
                        pogObject.applyRenumberingShelfs();
                    };
                })(data, AppConstantSpace.LOCATION_Y, locationY);
                let revert = ((model, field, value) => {
                    return () => {
                        this.sharedService.setObjectField(undefined, field, value, undefined, model);
                        pogObject.applyRenumberingShelfs();
                    };
                })(data, AppConstantSpace.LOCATION_Y, oldVlaueLocY);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'beforeLocationYUpdate',
                });
            }
        }
        return isFixtureMoved;
    }

    public validateFixtureMovement(pogObject: Section, data: FixtureList, oldVal: number, valueNew: number, field: string): boolean {
        let isvalidMove = true;
        const spacing = pogObject.Notch == 0 ? 1 : pogObject.Notch;
        const totalSpace = ((valueNew - 1) * spacing) - (data.getNotchThicknes() * (pogObject._Reversenotch.FlagData ? -1 : 1));
        const notchIntervals = pogObject.getNotchInterval();
        let locationY = pogObject._Reversenotch.FlagData ? notchIntervals[notchIntervals.length - 1] - totalSpace : pogObject.FirstNotch + totalSpace;
        let parentData = this.sharedService.getParentObject(data, data.$sectionID);
        if (locationY > (parentData.Dimension.Height - data.minMerchHeight) || valueNew > notchIntervals.length) {
            isvalidMove = false;
            this.notify.warn("SHELF_CROSSING_SECTION_HEIGHT_WITH_CHANGED_NOTCH_NUMBER");
            this.sharedService.setObjectField(undefined, field, oldVal, undefined, data) as SelectableList;
        }
        return isvalidMove;
    }

    public checkValidShelfXYChanges(
        data: any,
        field: string,
        valueNew: any,
        valueOld: string | boolean | number | Date,
        isBayPresents: boolean,
    ): boolean {
        let shelfXPos: number = 0;
        let shelfYPos: number = 0;
        let shelfXPosToBay: number = 0;
        let shelfYPosToBay: number = 0;
        let shelfOldXPos: number = 0;
        let shelfOldYPos: number = 0;

        if (field === AppConstantSpace.LOCATION_X) {
            shelfXPos = valueNew;
            shelfOldYPos = shelfYPos = data.Location.Y;
            shelfOldXPos = Number(valueOld);
        } else {
            shelfYPos = valueNew;
            shelfOldXPos = shelfXPos = data.Location.X;
            shelfOldYPos = Number(valueOld);
        }
        shelfXPosToBay = shelfXPos;
        shelfYPosToBay = shelfYPos;
        if (isBayPresents) {
            const bayObj = this.sharedService.getParentObject(data, data.$sectionID); // if Bay is there,Add Bay X pos
            shelfXPosToBay += bayObj.Location.X;
            shelfYPosToBay += bayObj.Location.Y;
        }
        let validMove: any = true;
        if (Utils.checkIfPegboard(data) || Utils.checkIfCoffincase(data) || Utils.checkIfBlock(data)) {
            const merchHt = shelfYPosToBay + data.Dimension.Height;
            validMove = data.isBasicValidMove({
                height: true,
                width: true,
                newHeight: merchHt,
                newWidth: shelfXPosToBay + data.Dimension.Width,
                forSection: true,
                forBoth: false,
                forSelf: false,
            });
            if (!validMove.flag) {
                this.notify.warn(this.translate.instant('FIT_CHECK_ERR') + '. ' + validMove.errMsg);
                validMove = false;
            }
        } else {
            const parentObj = this.sharedService.getObject(data.$idParent, data.$sectionID);
            validMove = data.moveFixture(
                shelfXPosToBay,
                shelfYPos,
                data.Fixture.Width,
                {
                    oldLocY: shelfOldYPos,
                    oldLocX: parentObj.getXPosToPog() + shelfOldXPos,
                    oldWidth: data.Dimension.Width,
                },
                undefined,
            );
        }

        if (!(validMove == undefined) && !validMove) {
            data.Location.X = shelfOldXPos;
            data.Location.Y = shelfOldYPos;

            //DragDropUtils.revertBackItem(data.$id);
        }
        return validMove;
    }

}

interface CheckList {
    sequenceBy: number;
    excelData: string | Position[];
    sortBy: number;
}

interface InvObject {
    FacingsX: number;
    invData: any;
    useItems: boolean;
    overrideInv: boolean;
}
