import { Injectable, NgZone, Renderer2, RendererFactory2 } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { clone, cloneDeep, filter } from 'lodash';
import { ConsoleLogService } from 'src/app/framework.module';
import { AppConstantSpace, Utils } from '../../../constants';
import { FixtureMovement, GhostImage, InterSectionMessage, PanelIds, PegDropCord, PlanogramView, QuardTreeBound, RectangleCoordinates2d, ZoomType } from 'src/app/shared/models';
import {
    PlanogramHelperService,
    PlanogramCommonService,
    PlanogramStoreService,
    ProductlibraryService,
    DragDropUtilsService,
    InformationConsoleLogService,
    SharedService,
    PlanogramService,
    HistoryService,
    IntersectionChooserHandlerService,
    ClipBoardService,
    PanelService,
    FixtureGallaryService,
    ParentApplicationService,
    QuadtreeUtilsService,
    NotifyService,
    AnnotationSvgRenderService,
    ContextMenuService,
    ShoppingCartService
} from 'src/app/shared/services';
import { PlanogramObject } from '../../../classes/planogram-object';
import {
    IDragDrop,
    IDragDropData,
    IDropEventArgs,
    IBeginDragEventArgs,
    DragOrigins,
    ICanDragArgs,
    ICanDropEventArgs,
} from 'src/app/shared/drag-drop.module';
import { FourDirectionValues } from 'src/app/shared/models';
import { AllocateValidationService, CollisionService, CrunchMode, CrunchModeService, PropertyGridPegValidationService, WorksheetGridService } from '../../layouts';
import { DndGhostImageGeneratorService } from './dnd-ghost-image/dnd-ghost-image-generator.service';
import { Annotation, Coffincase, Modular, PegBoard, Position, Section, StandardShelf } from 'src/app/shared/classes';
import { FixtureList, MerchandisableList, ObjectListItem, SelectableList } from '../shared/shared.service';
import { Render2dService } from '../../render-2d/render-2d.service';
import { Context } from 'src/app/shared/classes/context';
import { AnnotationService } from '../planogram/annotation/annotation.service';
import { DragDropCopyPasteCommonService } from '../pog-drag-drop-copy-paste-common/drag-drop-copy-paste-common.service';
import { ITargetInfo } from 'src/app/shared/drag-drop.module/models';
import { each } from 'jquery';
import { error } from 'console';
interface DrawItem {
    left: number,
    bottom: number,
    height: number,
    width: number,
    top: number
};

class DrawList {
    drawItems: DrawItem[] = [];
    itemOffset: { x: number; Y: number };
    maxHeight: number;
}

@Injectable({
    providedIn: 'root',
})
export class PogDragDropService {
    /** drag item wil lbe initialized at the beginDrag method */
    public dragItemData = null;
    public sourceDragItems: any[] =[];
    public sourceDragItemsMap = new Map<string, any>();
    public multiDragableElementsList: any[] = [];
    public multiDraggingObjects = {};
    public dropPoint = {};
    dndData: IDragDropData;
    public previewOffsetY: number = 0;
    public previewOffsetX: number = 0;
    private previewHeight: number = 0;

    offfsetX: any;
    offfsetY: number;
    public get scaleFactor(): number {
        return this.getSourceScaleFactor();
    }
    public dropClientX = 0;
    public dropClientY = 0;
    public cancelDragging = false;

    public isPositionDragging = false;

    // TODO: @malu change to getter as below
    public isShoppingCartItemDragging = false;
    // public isShoppingCartItemDragging(): boolean { return this.isDragOrigin(DragOrigins.ShoppingCart); }
    // TODO: @malu rename to isProductLibraryPositionDragging
    public get isProductPositionDragging(): boolean {
        return this.isDragOrigin(DragOrigins.ProductLibrary);
    }
    public get isGalleryDragging(): boolean {
        return this.isDragOrigin(DragOrigins.FixtureGallary);
    }
    public get isDragFromClipboard(): boolean {
        return this.isDragOrigin(DragOrigins.ClipBoard);
    }

    public get hasItemSelected(): any {
        return this.dragItemData && this.dragItemData.selected;
    }

    public get isBayDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.MODULAR);
    }
    public get isStandShelfDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.STANDARDSHELFOBJ);
    }
    public get isPegBoardDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.PEGBOARDOBJ);
    }
    public get isCrossbarDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.CROSSBAROBJ);
    }
    public get isSlotwallDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.SLOTWALLOBJ);
    }
    public get isCoffinCaseDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.COFFINCASEOBJ);
    }
    public get isBlockFixtureDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.BLOCK_FIXTURE);
    }
    public get isBasketDragging(): boolean {
        return this.isDerivedType(AppConstantSpace.BASKETOBJ);
    }

    public get sectionId(): string {
        if (this.dragItemData && this.dragItemData.$sectionID) {
            return this.dragItemData.$sectionID;
        }
        return this.sharedService.getActiveSectionId();
    }
    public get sectionID(): string {
        return this.sectionId;
    } // TODO delete
    public get sectionIDPOG(): number {
        return this.getSourceSectionObject().IDPOG;
    }

    public threshold = 0.5;
    public isPogObjDragging = false;
    public isModalDragging = false;
    public droppedFlg = true;
    public isdroppedinDiffPOG: boolean = false;
    public isDropfalied = false;
    public contextMenuOpened = false;

    public isAbandonLastAction: InterSectionMessage = {
        message: [],
        revertFlag: false,
        historyUniqueID: ''
    };
    public isCloneMode = false;
    public isShiftMode = false;
    public isUndoRequired = false;
    public isBayDragUsecase = false;
    public imgHTML: GhostImage = {
        imgTagHTML: '',
        pegImgTagHTML: {
            pegImgTagHTML: '',
            pegDIVOffsetX: 0,
            pegDivOffsetY: 0,
        },
        coffinImgTagHTML: '',
    };
    public cursorsStyle = 'auto';
    public selector = '';
    public OffsetX = 0;
    public OffsetY = 0;
    public isFromSameFixture = true;
    public isFromSameParent = true;
    public isFromSamePeg = false;
    public isFromDiffPeg = false;
    public isNotFromPeg = false;
    public isFromSS = true;
    public isFromCoffinCase = true;

    public ctrlDragClonedProducts = [];
    public dragStarted = false;
    public movePoint: {
        left: number;
        top: number;
    };
    private dropTargetSectionId: string = '';
    private renderer: Renderer2;
    public recordHistoryInTargetOnly: boolean = false;
    public skipCopyPositions: boolean = false;
    public hoveringOnCoffincase: boolean = false;

    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramService: PlanogramService,
        private readonly translateService: TranslateService,
        private readonly dragDropUtilsService: DragDropUtilsService,
        private readonly notifyService: NotifyService,
        private readonly historyService: HistoryService,
        private readonly planogramHelperService: PlanogramHelperService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly productlibraryservice: ProductlibraryService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly intersectionChooserHandlerService: IntersectionChooserHandlerService,
        private readonly clipBoardService: ClipBoardService,
        private readonly log: ConsoleLogService,
        private readonly fixtureGallaryService: FixtureGallaryService,
        private readonly rendererFactory: RendererFactory2,
        private readonly panelService: PanelService,
        private readonly propertyGridPegValidationService: PropertyGridPegValidationService,
        private readonly allocateValidation: AllocateValidationService,
        private readonly quadtreeUtils: QuadtreeUtilsService,
        private readonly collision: CollisionService,
        private readonly crunchMode: CrunchModeService,
        private readonly dndGhostImageGeneratorService: DndGhostImageGeneratorService,
        private readonly render2d: Render2dService,
        private readonly zone: NgZone,
        private readonly worksheetGridService: WorksheetGridService,
        private readonly sappAnnotationRendererService: AnnotationSvgRenderService,
        private readonly annotationService: AnnotationService,
        private readonly contextMenuService: ContextMenuService,
        private readonly dragDropCopyPasteCommonService: DragDropCopyPasteCommonService,
        private readonly shoppingCartService: ShoppingCartService
    ) {
        this.renderer = this.rendererFactory.createRenderer(null, null);
        /** attaching self to dnd img gen service. it has lot of dependencies.
         * May need to re-visit on the design change on how these services interact.
         */
        this.dndGhostImageGeneratorService.dragDropService = this;
    }

    /** Checks the current dragItmData's derived type */
    private isDerivedType(derivedType: string): boolean {
        return this.isDerivedTypeOfObject(this.dragItemData, derivedType);
    }
    /** Checks the object's derived type */
    private isDerivedTypeOfObject(obj: IDragDrop, derivedType: string): boolean {
        // TODO: this comparison should be done on an enum (of number type)
        return obj && obj.ObjectDerivedType && obj.ObjectDerivedType === derivedType;
    }

    // Check the parent object's derived type
    private isParentDerivedType(parentDerivedType: string) {
        var parentObj = this.getParentObject();
        return parentObj && this.isDerivedTypeOfObject(parentObj, parentDerivedType);
    }

    private getParentObject() {
        return this.sharedService.getObject(this.dragItemData.$idParent, this.dragItemData.$sectionID) as MerchandisableList;
    }

    private getSourceScaleFactor(): number {
        // TODO: can't we use this.dragItemData.$sectionID instead of this.sectionId directly in below method?
        return this.planogramService.rootFlags[this.sectionId].scaleFactor;
    }
    private get targetSaceleFactor(): number {
      return this.planogramService.rootFlags[this.dropTargetSectionId].scaleFactor;
    }
    private getScaleFactor(sectionId: string): number {
        return this.planogramService.rootFlags[sectionId].scaleFactor;
    }

    private getObject(dndData: IDragDropData): any {
        // Find and return huge object.
        switch (dndData.dragOriginatedFrom) {
            case DragOrigins.ProductLibrary: {
                let iDProductIDPackage = dndData.$id.split('|');
                return this.productlibraryservice.ProductGallery.products.filter(function (product) {
                    return product.IDPackage == iDProductIDPackage[1] && product.IDProduct == iDProductIDPackage[2];
                })[0];
            }
            case DragOrigins.ClipBoard: {
                let clipId = dndData.$id.split('|')[1];
                let item = this.clipBoardService.clipboard.filter((item) => {
                    return item.clipId === Number(clipId);
                })[0];
                if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    return _.cloneDeep(item.productList);
                } else {
                    return _.cloneDeep(item.fixture);
                }
            }
            case DragOrigins.FixtureGallary: {
                let fixTureGalleryId = dndData.$id.split('|')[1];
                return this.fixtureGallaryService.galleryItemDataList.filter((item) => {
                    return item.IDPOG.toString() == fixTureGalleryId;
                })[0];
            }
        }
        return this.sharedService.getObject(dndData.$id, dndData.$sectionID);
    }

    /** Get the section object of current drag item */
    private getSourceSectionObject(): Section {
        const rootObj =
            this.dragItemData && this.dragItemData.$sectionID
                ? this.getSectionObject(this.dragItemData.$sectionID)
                : null;
        return rootObj || {};
    }
    private getSectionObject(sectionId: string): any {
        // TODO: can return type be chaned to Section class, confirm with @narenra /@karthik
        const section = this.sharedService.getObject(sectionId, sectionId) as Section;
        return section || {}; // or condition is added to avoid any null reference
    }

    private isDragOrigin(origin: DragOrigins): boolean {
        return this.isDragOriginOf(this.dndData, origin);
    }
    private isDragOriginOf(obj: IDragDropData, origin: DragOrigins): boolean {
        if (obj && obj.dragOriginatedFrom) {
            return obj.dragOriginatedFrom === origin;
        }
        return false; // default value
    }

    private initGlobalVariables() {
        this.dragItemData = null;

        this.multiDragableElementsList = [];
        this.multiDraggingObjects = {};
        this.dropPoint = {};
        this.dropTargetSectionId = '';
        this.dropClientX = 0;
        this.dropClientY = 0;
        this.cancelDragging = false;
        // this.isPositionDragging = false;
        // set in setDragItem
        // this.isShoppingCartItemDragging = false;
        this.threshold = 0.5;
        this.isPogObjDragging = false;
        //perfomrance tweak, reduces 400ms for 600+item 23Dr planogram.
        document.getElementById('multipleDragItems').innerHTML = '';
        document.getElementById('multiplePegDragItems').innerHTML = '';
        document.getElementById('coffinCaseFixtureImg').innerHTML = '';
        //For ProductList
        this.ctrlDragClonedProducts = [];
        //For Baydragging in SpanAcrossShelfs
        this.isBayDragUsecase = false;

        //For dragging of shopping cart item/ productlist item
        this.dragStarted = true;
        this.isUndoRequired = false;
        this.OffsetX = 0;
        this.OffsetY = 0;

        //Checking items are from same Fixture or not
        this.isFromSameFixture = true;
        this.isFromSameParent = true;
        this.isFromSamePeg = false;
        this.isFromDiffPeg = false;
        this.isNotFromPeg = false;
        this.isFromSS = true;
        this.isFromCoffinCase = true;

        this.isDropfalied = false;
        this.isAbandonLastAction.revertFlag = false;
        this.isPogObjDragging = true;

        //To  check if two drop events are triggering when dropped over intersecting fixtures
        this.droppedFlg = false;
        this.contextMenuOpened = false;
        this.isModalDragging = false;
        this.isCloneMode = false;
        this.skipCopyPositions = false;
        this.isdroppedinDiffPOG = false;
    }

    public getSelectedObjects(dragSourceData) {
        let selectionList = dragSourceData.planogramService.getSelectedObject(dragSourceData.$sectionID);
        let drawListShelf: DrawList = new DrawList();
        let drawListPeg: DrawList = new DrawList();
        let lastXLoc: number = 0;
        let maxHeight: number = 0;
        // was a member of the selections dragged?
        if (selectionList.length > 1 && _.includes(selectionList, dragSourceData)) {
            // drag selection
            switch (selectionList[0].ObjectType) {
                case AppConstantSpace.POSITIONOBJECT:
                    // dragging Positions
                    let twoDDrag = false;
                    let posFixList: any[] = _.uniqBy(selectionList, '$idParent');
                    if (posFixList.length == 1) {
                        var fixtureObj = this.sharedService.getParentObject(posFixList[0], posFixList[0].$sectionID);
                        switch (fixtureObj.ObjectDerivedType) {
                            case AppConstantSpace.PEGBOARDOBJ:
                            case AppConstantSpace.CROSSBAROBJ:
                            case AppConstantSpace.SLOTWALLOBJ:
                                twoDDrag = true;
                                break;
                            default:
                                break;
                        }
                    }
                    // Drag over pegboard
                    if (twoDDrag) {
                        let minX: number = Number.MAX_VALUE;
                        let minY: number = Number.MAX_VALUE;
                        let maxH: number = 0;
                        maxHeight = 0;
                        _.forEach(selectionList, (posObj) => {
                            let height: number = posObj.planogramService.convertToPixel(
                                posObj.Dimension.Height,
                                posObj.$sectionID,
                            );
                            let bottom: number = posObj.planogramService.convertToPixel(
                                posObj.Location.Y,
                                posObj.$sectionID,
                            );
                            let left: number = posObj.planogramService.convertToPixel(
                                posObj.Location.X,
                                posObj.$sectionID,
                            );
                            maxH = Math.max(maxH, bottom + height);
                            minX = Math.min(minX, left);
                            minY = Math.min(minY, bottom);
                        });
                        maxH = maxH - minY;
                        _.forEach(selectionList, (posObj) => {
                            let height: number = posObj.planogramService.convertToPixel(
                                posObj.Dimension.Height,
                                posObj.$sectionID,
                            );
                            let bottom: number = posObj.planogramService.convertToPixel(
                                posObj.Location.Y,
                                posObj.$sectionID,
                            );
                            drawListPeg.drawItems.push({
                                left:
                                    posObj.planogramService.convertToPixel(posObj.Location.X, posObj.$sectionID) - minX,
                                bottom: bottom - minY,
                                width: posObj.planogramService.convertToPixel(
                                    posObj.Dimension.Width,
                                    posObj.$sectionID,
                                ),
                                height: height,
                                top: bottom - minY + height,
                            });
                            maxHeight = Math.max(maxHeight, bottom + height);
                        });
                        drawListPeg.maxHeight = maxHeight;
                    } else {
                        maxHeight = 0;
                        _.forEach(selectionList, (posObj) => {
                            let height: number = posObj.planogramService.convertToPixel(
                                posObj.Dimension.Height,
                                posObj.$sectionID,
                            );
                            drawListPeg.drawItems.push({
                                left: posObj.planogramService.convertToPixel(lastXLoc, posObj.$sectionID),
                                bottom: 0,
                                height: height,
                                width: posObj.planogramService.convertToPixel(
                                    posObj.Dimension.Width,
                                    posObj.$sectionID,
                                ),
                                top: 0,
                            });
                            maxHeight = Math.max(maxHeight, height);
                            lastXLoc += posObj.Dimension.Width;
                        });
                        drawListPeg.maxHeight = maxHeight;
                        _.forEach(drawListPeg.drawItems, (drawitem) => {
                            drawitem.bottom = drawListPeg.maxHeight - drawitem.height;
                        });
                    }
                    // Drag over standard shelf
                    maxHeight = 0;
                    _.forEach(selectionList, (posObj) => {
                        let height: number = posObj.planogramService.convertToPixel(
                            posObj.Dimension.Height,
                            posObj.$sectionID,
                        );
                        drawListShelf.drawItems.push({
                            left: posObj.planogramService.convertToPixel(lastXLoc, posObj.$sectionID),
                            bottom: 0,
                            height: height,
                            width: posObj.planogramService.convertToPixel(posObj.Dimension.Width, posObj.$sectionID),
                            top: height,
                        });
                        maxHeight = Math.max(maxHeight, height);
                        lastXLoc += posObj.Dimension.Width;
                    });
                    drawListShelf.maxHeight = maxHeight;
                    break;
                case AppConstantSpace.FIXTUREOBJ:
                    // dragging Fixtures
                    let minX: number = Number.MAX_VALUE;
                    let minY: number = Number.MAX_VALUE;
                    let maxH: number = 0;
                    maxHeight = 0;
                    _.forEach(selectionList, (posObj) => {
                        let height: number = posObj.planogramService.convertToPixel(
                            posObj.Dimension.Height,
                            posObj.$sectionID,
                        );
                        let bottom: number = posObj.planogramService.convertToPixel(
                            posObj.Location.Y,
                            posObj.$sectionID,
                        );
                        let left: number = posObj.planogramService.convertToPixel(posObj.Location.X, posObj.$sectionID);
                        maxH = Math.max(maxH, bottom + height);
                        minX = Math.min(minX, left);
                        minY = Math.min(minY, bottom);
                    });
                    maxH = maxH - minY;
                    _.forEach(selectionList, (posObj) => {
                        let height: number = posObj.planogramService.convertToPixel(
                            posObj.Dimension.Height,
                            posObj.$sectionID,
                        );
                        let bottom: number = posObj.planogramService.convertToPixel(
                            posObj.Location.Y,
                            posObj.$sectionID,
                        );
                        drawListPeg.drawItems.push({
                            left: posObj.planogramService.convertToPixel(posObj.Location.X, posObj.$sectionID) - minX,
                            bottom: bottom - minY,
                            width: posObj.planogramService.convertToPixel(posObj.Dimension.Width, posObj.$sectionID),
                            height: height,
                            top: bottom - minY + height,
                        });
                        maxHeight = Math.max(maxHeight, bottom + height);
                    });
                    drawListPeg.maxHeight = maxHeight;
                    drawListShelf = drawListPeg;
                    break;
            }
        } else {
            // drag single item
            switch (dragSourceData.ObjectType) {
                case AppConstantSpace.POSITIONOBJECT:
                    maxHeight = dragSourceData.planogramService.convertToPixel(
                        dragSourceData.Dimension.Height,
                        dragSourceData.$sectionID,
                    );
                    drawListShelf.drawItems.push({
                        left: dragSourceData.planogramService.convertToPixel(lastXLoc, dragSourceData.$sectionID),
                        bottom: 0, //dragSourceData.planogramService.convertToPixel(dragSourceData.Location.Y, dragSourceData.$sectionID),
                        height: maxHeight,
                        width: dragSourceData.planogramService.convertToPixel(
                            dragSourceData.Dimension.Width,
                            dragSourceData.$sectionID,
                        ),
                        top: maxHeight,
                    });
                    drawListShelf.maxHeight = maxHeight;
                    drawListPeg.drawItems.push({
                        left: dragSourceData.planogramService.convertToPixel(lastXLoc, dragSourceData.$sectionID),
                        bottom: 0, //dragSourceData.planogramService.convertToPixel(dragSourceData.Location.Y, dragSourceData.$sectionID),
                        height: maxHeight,
                        width: dragSourceData.planogramService.convertToPixel(
                            dragSourceData.Dimension.Width,
                            dragSourceData.$sectionID,
                        ),
                        top: maxHeight,
                    });
                    drawListPeg.maxHeight = maxHeight;
                    break;
                case AppConstantSpace.FIXTUREOBJ:
                    maxHeight = dragSourceData.planogramService.convertToPixel(
                        dragSourceData.Dimension.Height,
                        dragSourceData.$sectionID,
                    );
                    drawListShelf.drawItems.push({
                        left: dragSourceData.planogramService.convertToPixel(lastXLoc, dragSourceData.$sectionID),
                        bottom: 0,
                        height: maxHeight,
                        width: dragSourceData.planogramService.convertToPixel(
                            dragSourceData.Dimension.Width,
                            dragSourceData.$sectionID,
                        ),
                        top: maxHeight,
                    });
                    drawListShelf.maxHeight = maxHeight;
                    drawListPeg = drawListShelf;
                    break;
            }
        }
        return {
            drawList: drawListShelf,
            drawListPeg: drawListPeg,
        };
    }
    private getDroppableObect(droppablesList: QuardTreeBound[], to: FixtureList): SelectableList { //when quad has multiple objects  get droppable object which ignores block fixture
        let droppableArry = { 'Position': [], 'StandardShelf': [], 'Basket': [], 'CoffinCase': [], 'Crossbar': [], 'Pegboard': [], 'Slotwall': [] };
        const intersectionArray = ['Position', 'StandardShelf', 'Basket', 'CoffinCase', 'Crossbar', 'Pegboard', 'Slotwall'];
        let droppable;
        if (droppablesList.length) {
            for (const droppables of droppablesList) {
                droppableArry[droppables.ObjectDerivedType] ? droppableArry[droppables.ObjectDerivedType].push(droppables) : '';
            }
            let mainLoopBreak = false;
            for (let j = 0; j < intersectionArray.length; j++) {
                if (!mainLoopBreak) {
                    if (droppableArry[intersectionArray[j]].length) {
                        for (let k = 0; k < droppableArry[intersectionArray[j]].length; k++) {
                            let temp = droppableArry[intersectionArray[j]][k];
                            if (intersectionArray[j] == 'Position' && this.dragItemData != null && temp.id != this.dragItemData.$id) {
                                let parentObj = this.sharedService.getObject(temp.parentID, this.dropTargetSectionId)
                                if (parentObj.ObjectDerivedType == 'StandardShelf') {
                                    droppable = parentObj;
                                    mainLoopBreak = true;
                                    break;
                                }
                            } else {
                                if (intersectionArray[j] != 'Position' && droppableArry[intersectionArray[j]].length === 1) {
                                    droppable = this.sharedService.getObject(droppableArry[intersectionArray[j]][0]?.id, to.$sectionID);
                                    mainLoopBreak = true;
                                    break;
                                } else if (intersectionArray[j] != 'Position' && droppableArry[intersectionArray[j]].length > 1) {
                                    droppable = to;
                                }

                            }
                        }
                    }
                } else {
                    break;
                }
            }

        }
        return droppable;
    }
    public dropped(from: ObjectListItem, to: FixtureList, x: number, y: number) {
        const rootObject = this.getSectionObject(to.$sectionID);
        const quads = { x: x, y: y, width: 0.1, height: 0.1, id: to.$id };
        let quad = this.quadtreeUtils.findingIntersectionsAtBound(to.$sectionID, quads);
        let droppableObj = this.getDroppableObect(quad, to);
        droppableObj = droppableObj ? droppableObj : to;
        // for Blocks, drop is always on its parents.
        droppableObj = droppableObj && droppableObj.ObjectDerivedType == AppConstantSpace.BLOCKOBJECT ? this.sharedService.getObject(droppableObj.$idParent, to.$sectionID) as Modular : droppableObj;
        let isFitCheckRequired = rootObject.fitCheck;
        let ignoreMerchHeight = droppableObj.Fixture.IgnoreMerchHeight == undefined ? false : droppableObj.Fixture.IgnoreMerchHeight;
        //getting source parent data to chk ignore finger space value
        let sourceParentItemData = this.sharedService.getObject(from.$idParent,from.$sectionID) as MerchandisableList;
        let ignoreFingerSpaceSource = sourceParentItemData?.Fixture?.IgnoreFingerSpace == undefined ? false : sourceParentItemData.Fixture.IgnoreFingerSpace;
        let ignoreFingerSpaceDestination = droppableObj?.Fixture?.IgnoreFingerSpace == undefined ? false : droppableObj.Fixture.IgnoreFingerSpace;
        let isSuppressFingerSpace = rootObject.SuppressFingerSpace;
        let moveAnnotationsWithFixtureOrPosition = (sectionId: string, multiDragableElementsList: any[]) => {
            let section = this.getSectionObject(sectionId);
            for (const eachItemData of multiDragableElementsList) {
                const annotation = section.getAnnotation(eachItemData.$id);
                if (annotation && annotation.LkExtensionType == 3) {
                    this.sappAnnotationRendererService.calculateAnnotationPosition(annotation, eachItemData, section);
                }
            }
        };
        if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            // var getPositionItemData = function (positionScope, isShoppingCartItem) {
            //   if (isShoppingCartItem) {
            //     //its because cart has not itemdata attribute so tweaked
            //     return positionScope.itemData;
            //   } else {
            //     return positionScope.itemData;
            //   }
            // }
            //dragged item detail for only drgged element by jquery(jQuery draggable tweak)
            //var positionScope = draggableScope;
            //var positionItemData = getPositionItemData(positionScope, this.isShoppingCartItemDragging);
            const positionItemData: Position = from as Position;
            //draggable item parent detail
            const parentItemData = this.sharedService.getParentObject(positionItemData, positionItemData.$sectionID);

            //droppable item detail
            let dropContainerItemData = this.getDropContainerItemdata(droppableObj);

            //if force fit is true, disable fitcheck
            if (positionItemData.Position?.attributeObject?.ForceFit == true) isFitCheckRequired = false;
            //when item dropped in coffin case or basket with front view, show fitcheck error
            if ((dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) && !dropContainerItemData.Fixture.DisplayViews) {
                this.planogramService.openIntersectionDialog({ message: [this.translateService.instant('ITEMS_CANNOT_BE_DROPPED_FRONT_VIEW')], revertFlag: false });
                for (let dragItem of this.multiDragableElementsList) {
                    const jQueryPositionObj = $('#' + dragItem.$id);
                    this.revertingBack(jQueryPositionObj, dragItem.Location.X, dragItem.Location.Y, undefined, this.isShoppingCartItemDragging)
                }

                if (this.isShoppingCartItemDragging) {
                    //DialogButtonControl.openShoppingCart();
                    this.planogramService.removeAllSelection(this.sectionId);
                    this.isdroppedinDiffPOG && this.planogramService.removeAllSelection(this.dropTargetSectionId);
                }
                this.isShoppingCartItemDragging = false;
                //baseControllerScope.$apply();
                this.dragDropUtilsService.removePanelBluring();
                this.isDropfalied = true;
                return;
            }

            //@Narendra, 26th April 2016, we can remove this, we are supporting multiple drag and drop
            //we don't support multiple drop into pegboard so let's revert back
            //temp solution until we have multi drag drop for peg board
            //if (dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ) {
            //    if (this.multiDragableElementsList.length > 1) {
            //        for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
            //            var eachPositionItemData = this.multiDragableElementsList[i];
            //            var jQueryPositionObj = $('#' + eachPositionItemData.$id);
            //            this.revertingBack(jQueryPositionObj, eachPositionItemData.Location.X, eachPositionItemData.Location.Y);
            //        }
            //        this.snackBar.open("we don't support multiple drop into pegboard so reverting back", 5000);
            //        this.dragDropUtilsService.removePanelBluring();
            //        return;
            //    }
            //}
            var dropIndex = 0;

            dropIndex = this.fixtureDropIndex(
                dropContainerItemData,
                this.dropClientX,
                this.dropClientY,
                rootObject.IDPOG,
                this.getScaleFactor(rootObject.$id),
                [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                    Number(positionItemData.Position.IDMerchStyle),
                ) != -1,
                droppableObj,
            );
            var dropCord = { left: x, top: y };

            dropCord = this.fixtureDropPoint(
                dropContainerItemData,
                this.dropClientX,
                this.dropClientY,
                rootObject.IDPOG,
                this.getScaleFactor(rootObject.$id),
                undefined,
            );
            //pull data from POG and see if fitcheck is true
            if (true) {
                var canDrop = this.doesPositionsValidateFitCheck(
                    this.multiDragableElementsList,
                    dropContainerItemData,
                    undefined,
                    dropIndex,
                    dropCord,
                    { isFitCheckRequired: isFitCheckRequired },
                    ignoreMerchHeight,
                    isSuppressFingerSpace,
                    ignoreFingerSpaceSource,
                    ignoreFingerSpaceDestination
                );
                if (!canDrop.flag) {
                    for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        // var eachParentItemData = this.sharedService.getParentObject(eachPositionItemData, eachPositionItemData.$sectionID);
                        var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                        //@narendra need action
                        //this.revertingBack(jQueryPositionObj, eachPositionItemData.Location.X, eachPositionItemData.Location.Y, undefined, this.isShoppingCartItemDragging)
                    }
                    if (this.isShoppingCartItemDragging) {
                        //DialogButtonControl.openShoppingCart();
                        this.planogramService.removeAllSelection(this.sectionId);
                        this.isdroppedinDiffPOG && this.planogramService.removeAllSelection(this.dropTargetSectionId);
                    }
                    this.isShoppingCartItemDragging = false;
                    this.isDropfalied = true;
                    //this.snackBar.open(canDrop.errmsg, 5000);
                    this.notifyService.error(canDrop.errmsg, 'Ok');
                    return;
                }
                this.addUnitDimensionsToTargetSection(this.multiDragableElementsList);
            }
            //we get the perfect drop index
            if (
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
            ) {
                var dropFlag = dropContainerItemData.checkIfOffsetArea(dropCord);
                //Fit check if item can be placed at the dropped point or not
                if (!dropFlag) {
                    for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                        this.revertingBack(
                            jQueryPositionObj,
                            eachPositionItemData.Location.X,
                            eachPositionItemData.Location.Y,
                            undefined,
                            this.isShoppingCartItemDragging,
                        );
                    }
                    this.notify('ITEMS_CANT_BE_DROPPED_IN_OFFSET_AREA', 'Ok');
                    this.isDropfalied = true;
                    return false;
                }
            }

            var crunchMode = dropContainerItemData.Fixture.LKCrunchMode;
            var draggableItemIndex = parentItemData.Children.indexOf(positionItemData);


            //const sectionObj = this.sharedService.getObject(this.sectionId, this.sectionId) as Section;
            const ctx = new Context(rootObject);

            var pegboardAutoInsert = () => {

                if (
                    !(dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ)
                ) {
                    return;
                }
                //Maintain an array of dragging positions if they are present in the pegboard
                var exculdedContainerItems = this.isCloneMode
                    ? []
                    : this.dragDropCopyPasteCommonService.fitCheckNeededPos(this.multiDragableElementsList, dropContainerItemData.Children);
                var idArry = [],
                    movedItemsArry = [],
                    allItemSelectors = '',
                    insertedPosArry = [];
                var dropCordClone = clone(dropCord);

                var getPegHoleInfo = dropContainerItemData.getPegHoleInfo();
                var originalPegTypes = [];
                for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                    var eachPositionItemData = this.multiDragableElementsList[i];
                    //Make fronts high as one
                    //revert throws errors in cloned mode i.e. CTRL + drag

                    let adjustablePegType = this.propertyGridPegValidationService.validateAndSetBeforeDropRPaste(eachPositionItemData, getPegHoleInfo);
                    originalPegTypes.push(adjustablePegType);
                    if (!this.isCloneMode && this.sectionID == this.dropTargetSectionId) {
                        //var dragPositionScope = this.dragItemData;
                        //var dragShelfScope = Utils.getParent(dragPositionScope);
                        var parentItemData = this.sharedService.getParentObject(
                            eachPositionItemData,
                            eachPositionItemData.$sectionID,
                        );
                        var dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                        //@Narendra commented to be removed
                        //if the drop containar item is from other than pegboard it should not come here
                        //if (dropContainerItemData.ObjectDerivedType != AppConstantSpace.PEGBOARDOBJ) {
                        //    if (eachPositionItemData.Position.FacingsY > 1) {
                        //        idArry.push({
                        //            'id': eachPositionItemData.$id, 'facings': eachPositionItemData.Position.FacingsY
                        //        });
                        //        eachPositionItemData.Position.FacingsY = 1;
                        //    }
                        //}
                        //var dragIndex = dragShelfScope.itemData.Children.indexOf(eachPositionItemData);
                        //adds next positions' offsetX and offsetY to the top and left
                        // if (!this.isFromSamePeg) { //uncomment when relative distance supported for items from same peg
                            if (i != 0) {
                                var prePosX2 = dropCord.left;
                                //pegholeinfo
                                dropCord.left = dropCord.left + eachPositionItemData.getPegInfo().OffsetX;
                                var intersectFlag = true;
                                //if the item is intersecting with previoud item add peg increment
                                while (intersectFlag) {
                                    var positionXYCords = dropContainerItemData.findXYofPosition(
                                        eachPositionItemData,
                                        dropCord,
                                    );
                                    if (positionXYCords.X1 <= prePosX2) {
                                        dropCord.left += getPegHoleInfo.PegIncrementX;
                                    } else {
                                        intersectFlag = false;
                                    }
                                    if (
                                        dropCord.left + eachPositionItemData.getPegInfo().OffsetX >
                                        dropContainerItemData.Dimension.Width
                                    ) {
                                        intersectFlag = false;
                                    }
                                }
                            }
                        // }  //uncomment when relative distance supported for items from same peg
                        var fitCheckObj = { flag: false },
                            revertPos = {};
                        if (isFitCheckRequired && adjustablePegType) {
                            //If items are from different peg need to consider dropcordinates and if from same pegboard consider relative distances calculate while generating ghostimage
                            // if (!this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                                fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCord(
                                    ctx,
                                    eachPositionItemData,
                                    dropCord,
                                    exculdedContainerItems,
                                    false,
                                );
                            // } else {  //uncomment when relative distance supported for items from same peg
                            //     dropCord = {
                            //         left: dropCordClone.left,
                            //         top: dropCordClone.top,
                            //     };
                            //     fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCord(
                            //         ctx,
                            //         eachPositionItemData,
                            //         dropCord,
                            //         exculdedContainerItems,
                            //         true,
                            //     );
                            // }
                        } else {
                            fitCheckObj.flag = true;
                            // if (this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                            //     dropCord = { left: dropCordClone.left, top: dropCordClone.top };
                            // }
                        }
                        if (!fitCheckObj.flag || !adjustablePegType) {
                            //revert back the changes remove from the history
                            //History.stopRecording();
                            if (idArry.length > 0) {
                                for (var k = 0; k < idArry.length; k++) {
                                    var posObj = this.sharedService.getObject(idArry[k].id, idArry[k].id);
                                    posObj.Position.FacingsY = idArry[k].facings;
                                }
                            }
                            if (movedItemsArry.length > 0) {
                                for (var k = movedItemsArry.length - 1; k >= 0; k--) {
                                    //the end false is passed need to tell that these movement should not be recorded
                                    movedItemsArry[k]['dropContainerItemData'].movePosition(ctx,
                                        movedItemsArry[k]['dropIndex'],
                                        movedItemsArry[k]['parentItemData'],
                                        movedItemsArry[k]['dragIndex'],
                                        movedItemsArry[k]['oldDropCord'],
                                        false,
                                        { actionType: 'DragDrop', drag: true },
                                    );
                                }
                            }
                            if (true) {
                                for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                                    var eachPositionItemData = this.multiDragableElementsList[i];
                                    var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                                    if(originalPegTypes[i]){
                                    this.propertyGridPegValidationService.changePegType(eachPositionItemData, originalPegTypes[i], null, true, true)
                                  };
                                    this.revertingBack(
                                        jQueryPositionObj,
                                        eachPositionItemData.Location.X,
                                        eachPositionItemData.Location.Y,
                                        undefined,
                                        this.isShoppingCartItemDragging,
                                    );
                                }
                            }

                            this.notify('FIT_CHECK_ERROR', 'Ok');
                            this.isUndoRequired = true;
                            this.isDropfalied = true;
                            return;
                        }
                        var oldCord =
                            Utils.checkIfPegboard(parentItemData) ||
                                Utils.checkIfSlotwall(parentItemData) ||
                                Utils.checkIfCrossbar(parentItemData)
                                ? {
                                    left: eachPositionItemData.Location.X + eachPositionItemData.getPegInfo().OffsetX,
                                    top: eachPositionItemData.Location.Y + eachPositionItemData.getPegInfo().OffsetY,
                                }
                                : {
                                    left: eachPositionItemData.Location.X,
                                    top: eachPositionItemData.Location.Y,
                                };
                        oldCord = clone(oldCord);
                        //If the drop index is more than or equal to the children lenth and dropcontainerItemData and dragContainer is same
                        //to avoid location undefined need to reduce the drop index
                        if (
                            dropIndex >= dropContainerItemData.Children.length &&
                            dropContainerItemData == parentItemData
                        ) {
                            dropIndex = dropContainerItemData.Children.length - 1;
                        }
                        dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                        //exculdedContainerItems.push(eachPositionItemData);
                        //exculdedContainerItems = eval('Utils.' + dropContainerItemData.pegSortType() + '(exculdedContainerItems)');
                        //dropIndex = exculdedContainerItems.indexOf(eachPositionItemData);
                        parentItemData.movePosition(ctx, dragIndex, dropContainerItemData, dropIndex, dropCord, undefined, {
                            actionType: 'DragDrop',
                            drag: true,
                        });
                        movedItemsArry.push({
                            id: eachPositionItemData.$id,
                            dragIndex: dragIndex,
                            dropContainerItemData: dropContainerItemData,
                            dropIndex: dropIndex,
                            parentItemData: parentItemData,
                            oldDropCord: oldCord,
                        });
                        exculdedContainerItems.push(eachPositionItemData);
                        // if (!this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                            if (i != this.multiDragableElementsList.length - 1) {
                                dropCord.left = eachPositionItemData.Location.X + eachPositionItemData.linearWidth();
                            }
                        // }  //uncomment when relative distance supported for items from same peg
                        // for No Crunch ,No need to recalculate the item
                        //if (crunchMode == 5) {
                        //    dragPositionScope.itemData.Location.X = dropCord.left;
                        //}
                        //show property grid for first item dropped
                        //if (i == 0) {
                        //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                        //}
                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                        //$('#' + eachPositionItemData.$id).show();
                        //only needed for one dragged element which is actually internally handled by jQuery
                        // this.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);
                    } else {
                      //Remove from shopping cart if it is not clone and move is true
                      if (!this.isCloneMode && !this.sharedService.moveOrCopy) {
                        //Dragsource event
                        if(Utils.checkIfShoppingCart(eachPositionItemData.parent)){
                          let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                          this.shoppingCartService.deleteItemsFromShoppingCart([pos]);
                        } else {
                          const cartObj = Utils.getShoppingCartObj(this.getSourceSectionObject().Children);
                          let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                          pos.moveSelectedToCart(ctx, cartObj);
                        }
                        this.sharedService.changeInCartItems.next(true);
                      }

                      //Cloning the positions and moving them to the new pegboard
                        eachPositionItemData.Position.IDPOGObject = null;
                        eachPositionItemData.IDPOGObject = null;
                        this.isdroppedinDiffPOG && this.planogramService.prepareModelPosition(eachPositionItemData, rootObject);
                        //Setting up mixins
                        this.planogramCommonService.extend(eachPositionItemData, true, dropContainerItemData.$sectionID);
                        this.planogramCommonService.setParent(eachPositionItemData, dropContainerItemData);
                        eachPositionItemData.selected = false;
                        //adds next positions' offsetX and offsetY to the top and left
                        // if (!this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                            if (i != 0) {
                                var prePosX2 = dropCord.left;
                                //pegholeinfo
                                dropCord.left = dropCord.left + eachPositionItemData.getPegInfo().OffsetX;
                                var intersectFlag = true;
                                //if the item is intersecting with previoud item add peg increment
                                while (intersectFlag) {
                                    var positionXYCords = dropContainerItemData.findXYofPosition(
                                        eachPositionItemData,
                                        dropCord,
                                    );
                                    if (positionXYCords.X1 <= prePosX2) {
                                        dropCord.left += getPegHoleInfo.PegIncrementX;
                                    } else {
                                        intersectFlag = false;
                                    }
                                    if (
                                        dropCord.left + eachPositionItemData.getPegInfo().OffsetX >
                                        dropContainerItemData.Dimension.Width
                                    ) {
                                        intersectFlag = false;
                                    }
                                }
                            }
                        // }  //uncomment when relative distance supported for items from same peg
                        (fitCheckObj = { flag: false }), (revertPos = {});
                        if (isFitCheckRequired) {
                            //If items are from different peg need to consider dropcordinates and if from same pegboard consider relative distances calculate while generating ghostimage
                            // if (!this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                                fitCheckObj = (dropContainerItemData as PegBoard).checkIfItemFitsAtDropCord(
                                    ctx,
                                    eachPositionItemData,
                                    dropCord,
                                    exculdedContainerItems,
                                    false,
                                );
                            // } else {  //uncomment when relative distance supported for items from same peg
                            //     dropCord = {
                            //         left: dropCordClone.left,
                            //         top: dropCordClone.top,
                            //     };
                            //     fitCheckObj = (dropContainerItemData as PegBoard).checkIfItemFitsAtDropCord(
                            //         ctx,
                            //         eachPositionItemData,
                            //         dropCord,
                            //         exculdedContainerItems,
                            //         true,
                            //     );
                            // }
                        } else {
                            fitCheckObj.flag = true;
                            // if (this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                            //     dropCord = {
                            //         left: dropCordClone.left,
                            //         top: dropCordClone.top,
                            //     };
                            // }
                        }
                        if (!fitCheckObj.flag) {
                            //revert back the changes remove from the history
                            //History.stopRecording();
                            //if (idArry.length > 0) {
                            //    for (var k = 0; k < idArry.length; k++) {
                            //        var posObj = this.sharedService.getObject(idArry[k].id, idArry[k].id);
                            //        posObj.Position.FacingsY = idArry[k].facings;
                            //    }
                            //}
                            //if (movedItemsArry.length > 0) {
                            //    for (var k = movedItemsArry.length - 1; k >= 0; k--) {
                            //        //the end false is passed need to tell that these movement should not be recorded
                            //        movedItemsArry[k]['dropContainerItemData'].movePosition(movedItemsArry[k]['dropIndex'], movedItemsArry[k]['parentItemData'], movedItemsArry[k]['dragIndex'], movedItemsArry[k]['oldDropCord'], false, { 'actionType': 'DragDrop', 'drag': true });
                            //    }
                            //}
                            //if (true) {
                            //    for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                            //        var eachPositionItemData = this.multiDragableElementsList[i];
                            //        var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                            //        this.revertingBack(jQueryPositionObj, eachPositionItemData.Location.X, eachPositionItemData.Location.Y, undefined, this.isShoppingCartItemDragging);
                            //    }
                            //}

                            //this.snackBar.open("Fit check error ", 5000);
                            //this.isUndoRequired = true;
                            //this.isDropfalied = true;
                            //return;

                            //revert back the changes remove from the history
                            //History.stopRecording();
                            if (insertedPosArry.length > 0) {
                                for (var j = insertedPosArry.length - 1; j >= 0; j--) {
                                    var eachPosItemData = insertedPosArry[j].eachPositionItemData;
                                    var index = insertedPosArry[j].dropIndex;
                                    dropContainerItemData.removePosition(ctx, index);
                                }
                            }
                            for (var k = this.multiDragableElementsList.length - 1; k >= 0; k--) {
                                var eachItem = this.multiDragableElementsList[k];
                                //Deleting from inventory modal and objectprovider object if item drop fails
                                this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachItem);
                                this.planogramService.cleanByID(rootObject.$sectionID, eachItem.$id);
                            }
                            this.notify('FIT_CHECK_ERROR', 'Ok');
                            this.isUndoRequired = true;
                            this.isDropfalied = true;
                            return;
                        }
                        var oldCord =
                            Utils.checkIfPegboard(parentItemData) ||
                                Utils.checkIfSlotwall(parentItemData) ||
                                Utils.checkIfCrossbar(parentItemData)
                                ? {
                                    left: eachPositionItemData.Location.X + eachPositionItemData.getPegInfo().OffsetX,
                                    top: eachPositionItemData.Location.Y + eachPositionItemData.getPegInfo().OffsetY,
                                }
                                : {
                                    left: eachPositionItemData.Location.X,
                                    top: eachPositionItemData.Location.Y,
                                };
                        oldCord = clone(oldCord);
                        //If the drop index is more than or equal to the children lenth and dropcontainerItemData and dragContainer is same
                        //to avoid location undefined need to reduce the drop index
                        //if (dropIndex >= (dropContainerItemData.Children.length) && dropContainerItemData == parentItemData) {
                        //    dropIndex = dropContainerItemData.Children.length - 1;
                        //}
                        //dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                        //exculdedContainerItems.push(eachPositionItemData);
                        //exculdedContainerItems = eval('Utils.' + dropContainerItemData.pegSortType() + '(exculdedContainerItems)');
                        //dropIndex = exculdedContainerItems.indexOf(eachPositionItemData);

                        dropContainerItemData.addPosition(ctx, eachPositionItemData, dropIndex, dropCord);
                        var me = dropContainerItemData;
                        const original = ((obj, position, index, dropCoord) => {
                            return () => {
                                this.planogramService.addByID(me.$sectionID, position.$id, position);
                                this.planogramService.addPosInvModel(position, rootObject);
                                obj.addPosition(ctx, position, index, dropCoord);
                            };
                        })(me, eachPositionItemData, dropIndex, clone(dropCord));
                        const revert = ((obj, index, eachPositionItemData) => {
                            return () => {
                                obj.removePosition(ctx, index);
                                this.planogramService.deleteFromInvModel(me.$sectionID, eachPositionItemData);
                                this.planogramService.cleanByID(me.$sectionID, eachPositionItemData.$id);
                            };
                        })(me, dropIndex, eachPositionItemData);
                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addProduct',
                        }, this.dropTargetSectionId);
                        //parentItemData.movePosition(dragIndex, dropContainerItemData, dropIndex, dropCord, undefined, { 'actionType': 'DragDrop', 'drag': true });
                        insertedPosArry.push({
                            eachPositionItemData: eachPositionItemData,
                            dropIndex: dropIndex,
                        });
                        exculdedContainerItems.push(eachPositionItemData);
                        // if (!this.isFromSamePeg) {  //uncomment when relative distance supported for items from same peg
                            if (i != this.multiDragableElementsList.length - 1) {
                                dropCord.left = eachPositionItemData.Location.X + eachPositionItemData.linearWidth();
                            }
                        // }  //uncomment when relative distance supported for items from same peg
                        // for No Crunch ,No need to recalculate the item
                        //if (crunchMode == 5) {
                        //    dragPositionScope.itemData.Location.X = dropCord.left;
                        //}
                        //show property grid for first item dropped
                        //if (i == 0) {
                        //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                        //}
                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                        //$('#' + eachPositionItemData.$id).show();
                        //only needed for one dragged element which is actually internally handled by jQuery
                        // this.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);

                        ////addClonedPosition() handled everything related to extending the object with object provider and all
                        //dropContainerItemData.addClonedPosition(eachPositionItemData, dropIndex);
                        //dropIndex++;
                    }
                }
                //To avoid flickering issue all items will be displayed in the same diggest loop
                allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                //droppableScope.$evalAsync(function () {
                //  $(allItemSelectors).show();
                //});
            };

            const coffincaseAutoInsert = () => {
                if (dropContainerItemData.ObjectDerivedType !== 'CoffinCase' && dropContainerItemData.ObjectDerivedType !== 'Basket') {
                    return;
                }
                //Maintain an array of dragging positions if they are present in the pegboard
                var idArry = [],
                    allItemSelectors = '';
                const dropCordClone = { ...dropCord };

                dropContainerItemData.dragFlag = true;
                const selectedPosHeight = positionItemData.Position.LayoversY ? positionItemData.linearHeight() - (positionItemData.linearHeight() % positionItemData.Position.ProductPackage.Height) : positionItemData.linearHeight();
                const bottomPosLocation = positionItemData.Location.Y;
                const leftMostPosition = Utils.sortByXPos(this.multiDragableElementsList)[0];
                const leftPosLocationX = leftMostPosition.Location.X;
                const leftPosWidth = leftMostPosition.linearWidth();
                const leftPosID = leftMostPosition.$id;
                const sortedYPositions = Utils.sortByYPos(this.multiDragableElementsList);
                const heightSpan = sortedYPositions[sortedYPositions.length - 1].Location.Y + sortedYPositions[sortedYPositions.length - 1].linearHeight() - sortedYPositions[0].Location.Y;
                const oldChildren = cloneDeep(dropContainerItemData.Children);
                for (const [index, eachPositionItemData] of this.multiDragableElementsList.entries()) {
                    //Make fronts high as one
                    //revert throws errors in cloned mode i.e. CTRL + drag
                    if (!this.isCloneMode && this.sectionID == this.dropTargetSectionId) {
                        var parentItemData = this.sharedService.getParentObject(
                            eachPositionItemData,
                            eachPositionItemData.$sectionID,
                        );
                        var dragIndex = parentItemData.Children.indexOf(eachPositionItemData);

                        if (
                            dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                            dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                        ) {
                            if (eachPositionItemData.Position.FacingsY > 1) {
                                idArry.push({
                                    id: eachPositionItemData.$id,
                                    facings: eachPositionItemData.Position.FacingsY,
                                });
                                if (this.isShoppingCartItemDragging) {
                                    eachPositionItemData.Position.FacingsY = 1;
                                }
                            }
                        }
                        if (crunchMode === 5) {
                            dropCord.left = index === 0 ? dropCordClone.left + eachPositionItemData.linearWidth() :
                                dropCord.left + eachPositionItemData.linearWidth();
                            let positionHeight = eachPositionItemData.Position.LayoversY ? eachPositionItemData.linearHeight() - (eachPositionItemData.linearHeight() % eachPositionItemData.Position.ProductPackage.Height) : eachPositionItemData.linearHeight();
                            dropCord.top = dropCordClone.top + positionHeight - selectedPosHeight;
                        } else {
                            dropCord.left = dropCordClone.left + eachPositionItemData.linearWidth();
                            dropCord.top = dropCordClone.top;
                      }
                      if (this.isFromSamePeg && this.multiDragableElementsList.length > 1) {
                        const isLeftMost = leftPosID === eachPositionItemData.$id;
                        const leftDrop = dropCordClone.left;
                        dropCord.left = dropCordClone.left + leftPosWidth;
                        dropCord.left += isLeftMost ? 0 : (-leftPosWidth + eachPositionItemData.Location.X - leftPosLocationX + eachPositionItemData.linearWidth());
                        dropCord.top += eachPositionItemData.Location.Y - bottomPosLocation - (heightSpan ?? 0);// -selectedPosHeight -this.planogramService.convertToUnit(this.imgHTML?.pegImgTagHTML?.pegDivOffsetY, this.sharedService.getActiveSectionId());
                      }

                        if (this.checkIfPosCrossBoundary(eachPositionItemData, dropContainerItemData, dropCord)) {
                            return;
                        }

                        dropIndex = isNaN(dropIndex) ? dropContainerItemData.Children.length : dropIndex; // In case of No crunch mode add to end of array.
                        parentItemData.movePosition(ctx, dragIndex, dropContainerItemData, dropIndex, dropCord, undefined, {
                            actionType: 'DragDrop',
                            drag: true,
                        });

                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                    } else {
                      if (!this.isCloneMode && !this.sharedService.moveOrCopy) {
                        //Dragsource event
                        if(Utils.checkIfShoppingCart(eachPositionItemData.parent)){
                          let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                          this.shoppingCartService.deleteItemsFromShoppingCart([pos]);
                        }else {
                          const cartObj = Utils.getShoppingCartObj(this.getSourceSectionObject().Children);
                          let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                          pos.moveSelectedToCart(ctx, cartObj);
                        }
                        this.sharedService.changeInCartItems.next(true);
                      }
                      //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                      //addClonedPosition() handled everything related to extending the object with object provider and all
                        (dropContainerItemData as Coffincase).addClonedPosition(ctx, _.cloneDeep(eachPositionItemData), dropIndex);
                        dropIndex++;
                    }
                }
                //To avoid flickering issue all items will be displayed in the same diggest loop
                allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                dropContainerItemData.dragFlag = false;

                for (const eachPositionItemData of this.multiDragableElementsList) {
                    // Need to call rePositionOnCrunch to put dragged position at proper location.
                    const isRecordingOn = this.historyService.isRecordingOn[dropContainerItemData.$sectionID] ;
                    this.historyService.isRecordingOn[dropContainerItemData.$sectionID] = false;
                    this.crunchMode.rePositionOnCrunch(ctx, dropContainerItemData, crunchMode);
                    this.historyService.isRecordingOn[dropContainerItemData.$sectionID]  = isRecordingOn;
                    const response = dropContainerItemData.calculatePositionShrink(eachPositionItemData, oldChildren);
                    if (response && response.revertFlag) {
                        this.notify('FIT_CHECK_ERROR', 'Ok');
                        this.isAbandonLastAction = response;
                        return;
                    }
                }
            };

            var checkIfAssortDrop = () => {
                if (this.parentApp.isNiciMode) {
                    const emptyAreaDrop = this.planogramStore.isNiciFeatureNoAllowed("DROP_EMPTY_AREA_ONLY");
                    if(!emptyAreaDrop) {
                      return dropCord.left;
                    }
                    var me = this;
                    var pogObj = this.getSectionObject(this.sharedService.getActiveSectionId());
                    var w = 0,
                        h = 0;
                    for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        w = w + eachPositionItemData.linearWidth();
                        if (eachPositionItemData.linearHeight() > h) {
                            h = eachPositionItemData.linearHeight();
                        }
                    }
                    var quads = { width: 0, height: 0, x: 0, y: 0, id: '' };
                    quads.width = w - 0.005;
                    quads.height = h;
                    var dropCoordinate,
                        drpContainerQuads = dropContainerItemData.getQuadBounds();
                    dropCoordinate = quads.x = dropCord.left + drpContainerQuads.left;
                    quads.y = drpContainerQuads.top - h;
                    quads.id = pogObj.$id;
                    let quadIntersectionCheck = (
                        quads: any,
                        tolerance: any,
                        isRightIntersect: any,
                        dropCoordinate: any,
                        isLastItr: any,
                    ) => {
                        tolerance = tolerance || 1;
                        var obj = this.quadtreeUtils.findingIntersectionsAtBound(
                            this.sharedService.getActiveSectionId(),
                            quads,
                        );
                        obj = obj.sort(function (a, b) {
                            return true ? a.x - b.x : b.x + b.width - (a.x + a.width);
                        });
                        for (var i = 0; i < obj.length; i++) {
                            if (
                                obj[i].ObjectDerivedType == 'Position' &&
                                obj[i].parentID == dropContainerItemData.$id
                            ) {
                                var ele = obj[i],
                                    xStart = ele.x;
                                var xEnd = xStart + ele.width;
                                var dragdItms = me.multiDragableElementsList.filter(function (itm) {
                                    return itm.$id == ele.id;
                                });
                                if (dragdItms.length > 0) {
                                    continue;
                                }
                                var dragdNxtItms = obj[i + 1]
                                    ? me.multiDragableElementsList.filter(function (itm) {
                                        return itm.$id == obj[i + 1].id;
                                    })
                                    : [];

                                const rect1: RectangleCoordinates2d = {
                                    xstart: quads.x,
                                    xend: quads.x + quads.width * tolerance,
                                    ystart: quads.y,
                                    yend: quads.y + quads.height,
                                };
                                const rect2: RectangleCoordinates2d = {
                                    xstart: xStart,
                                    xend: xEnd,
                                    ystart: ele.y,
                                    yend: ele.y + ele.height
                                };

                                if (
                                    dragdItms.length == 0 &&
                                    (dropCoordinate < ele.x ||
                                        isLastItr ||
                                        !(
                                            dropCoordinate >
                                            (dragdNxtItms.length == 0 && obj[i + 1] ? obj[i + 1].x : 100000)
                                        )) &&
                                    this.collision.isIntersecting2D(rect1, rect2, 0)
                                ) {
                                    return obj[i];
                                }
                            }
                        }
                        return undefined;
                    };
                    var isRightIntersect = true;
                    let obj = quadIntersectionCheck(quads, 1, isRightIntersect, dropCoordinate, undefined);
                    var updateQuadX = (dropCoordinate) => {
                        //tolerance = tolerance ? tolerance : 1;
                        if (dropCoordinate > obj.x) {
                            quads.x = obj.x + obj.width;
                            return false;
                        } else {
                            var parentXPosToPog = this.sharedService
                                .getObject(obj.parentID, me.sectionId)
                                .getXPosToPog();
                            quads.x = obj.x - quads.width;
                            quads.x = parentXPosToPog == 0 ? (quads.x < 0 ? 0 : quads.x) : quads.x;
                            return true;
                        }
                    };

                    if (obj) {
                        isRightIntersect = updateQuadX(dropCoordinate);
                        obj = quadIntersectionCheck(
                            quads,
                            quads.x > obj.x ? 0.25 : 1,
                            isRightIntersect,
                            dropCoordinate,
                            undefined,
                        );
                        if (obj) {
                            isRightIntersect = updateQuadX(dropCoordinate);
                            if (quadIntersectionCheck(quads, 0.25, isRightIntersect, dropCoordinate, true)) {
                                return false;
                            } else return quads.x - drpContainerQuads.left;
                        }
                    }
                    return quads.x - drpContainerQuads.left;
                } else return dropCord.left;
            };
            // Moving all Dragged Items into Drop Fixture.
            //for Cart item dragged
            if (this.isShoppingCartItemDragging) {
                //Issue may come in future, Now we are changing the copied coordinates to original dropcord inside dropitem
                var dropCoord = clone(dropCord);
                try {
                    if (
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
                    ) {
                        pegboardAutoInsert.call(this);
                    } else if (
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                    ) {
                        coffincaseAutoInsert.call(this);
                    } else {
                        let allItemSelectors = '';

                        if ((dropContainerItemData as StandardShelf)) {
                            (dropContainerItemData as StandardShelf).calculateCacheShrinkFactors(this.multiDragableElementsList);
                        }

                        let dropItem = (eachPositionItemData, that) => {
                            let dragIndex = parentItemData.Children.indexOf(eachPositionItemData);

                            // Span Left and Right Spread Span Changes
                            if ('isSpreadShelf' in dropContainerItemData && dropContainerItemData.isSpreadShelf) {
                                var dropContainerObj = that.getDropSpreadSpanshelf(dropContainerItemData, rootObject.IDPOG, that.dropClientX, that.scaleFactor, from, dropIndex, dropCord);
                                dropContainerItemData = dropContainerObj.ItemData;
                                //dropIndex = dropContainerObj.dropIndex;
                            }
                            const baseItem = dropContainerItemData.Children[dropIndex] as Position;
                            if (
                                baseItem &&
                                [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                                    Number(eachPositionItemData.Position.IDMerchStyle),
                                ) != -1
                            ) {
                                let dragBaseItm = this.sharedService.getObject(
                                    eachPositionItemData.baseItem,
                                    eachPositionItemData.$sectionID,
                                ) as Position;
                                dropCord.left = baseItem.Location.X;
                                if (eachPositionItemData.Position.IDMerchStyle == AppConstantSpace.MERCH_ABOVE_TEXT) {
                                    dropCord.top = baseItem.linearHeight();
                                    eachPositionItemData.baseItem && (dragBaseItm.hasAboveItem = false);
                                    baseItem.hasAboveItem = true;
                                    dropIndex = (dropIndex || 0) + 1;
                                } else if (
                                    eachPositionItemData.Position.IDMerchStyle == AppConstantSpace.MERCH_BEHIND_TEXT
                                ) {
                                    dropCord.top = baseItem.Location.Y;
                                    eachPositionItemData.baseItem && (dragBaseItm.hasBackItem = false);
                                    baseItem.hasBackItem = true;
                                    dropIndex = (dropIndex || 0) + (baseItem.hasAboveItem ? 2 : 1);
                                }
                                let prevBaseItm = eachPositionItemData.baseItem
                                    ? this.sharedService.getObject(
                                        eachPositionItemData.baseItem,
                                        eachPositionItemData.$sectionID,
                                    ) as Position
                                    : undefined;
                                eachPositionItemData.baseItem &&
                                    prevBaseItm &&
                                    !(prevBaseItm.hasBackItem || prevBaseItm.hasAboveItem) &&
                                    (prevBaseItm.Position.IDMerchStyle = 100);
                                this.updateMerchStyleFromDragDrop(eachPositionItemData, baseItem);
                            }
                            // for No Crunch ,No need to recalculate the item
                            if (crunchMode == 5) {
                                eachPositionItemData.Location.X = dropCord.left;
                            }
                            //check if source sectionid and target section id is same or not if different then call addposition function on target section
                            //1. if source and target section id is same then call moveposition function
                            //2. if source and target section id is different then call addposition function on target section and remove position from source section if it is move flag is true
                            //3. if source and target section id is different then call addposition function on target section and do not remove position from source section if it is copy flag is true
                            if(this.sectionID == this.dropTargetSectionId){
                              parentItemData.movePosition(ctx,
                                dragIndex,
                                dropContainerItemData,
                                dropIndex,
                                dropCord,
                                undefined,
                                { actionType: 'DragDrop', drag: true },
                              );
                            } else {
                              if (!this.isCloneMode && !this.sharedService.moveOrCopy) {
                                //Dragsource event
                                if(Utils.checkIfShoppingCart(eachPositionItemData.parent)){
                                  let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                                  this.shoppingCartService.deleteItemsFromShoppingCart([pos]);
                                }
                                this.sharedService.changeInCartItems.next(true);
                              }
                              //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                              //Target section event
                              (dropContainerItemData as StandardShelf).addClonedPosition(ctx, _.cloneDeep(eachPositionItemData), dropIndex);
                            }
                            this.render2d.isCartDirty = true;
                            allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                            //show property grid for first item dropped
                            //if (i == 0) {
                            //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                            //}
                            //on drag start we hide selected element dragged, when dropped we again showit
                            //$('#' + eachPositionItemData.$id).show();
                        };
                        var dropLeftAssrt = checkIfAssortDrop.call(this);
                        if (dropLeftAssrt !== false) {
                            dropCord.left = dropLeftAssrt;
                        } else {
                            this.notify('ITEM_CAN_BE_PLACED_EMPTY_AREA_ONLY', 'Ok');
                            $('#' + parentItemData.Children[draggableItemIndex].$id).css({
                                left: 0,
                                top: 'auto',
                                display: 'inline-block',
                            });
                            return false;
                        }
                        if (crunchMode == 5) {

                            rootObject.setSkipComputePositions();
                            rootObject.setSkipShelfCalculateDistribution();
                            for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                                var eachPositionItemData = this.multiDragableElementsList[i];
                                dropItem(eachPositionItemData, this);
                                dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                                dropIndex++;
                            }
                            rootObject.computePositionsAfterChange(ctx);
                            rootObject.clearSkipShelfCalculateDistribution();
                        } else {
                            if ('isSpreadShelf' in dropContainerItemData && dropContainerItemData.isSpreadShelf) {
                                //var dragPositionScope = angular.element('#' + this.multiDragableElementsList[0].$id).scope();
                                //var dropContainerObj = {
                                //  ItemData: dropContainerItemData,
                                //  dropIndex: dropIndex,
                                //  dropCord: dropCord
                                //};//this.getDropSpreadSpanshelf(dropContainerItemData, rootObject.IDPOG, this.dropClientX, this.scaleFactor, dragPositionScope.itemData, dropIndex, dropCord);
                                var dropContainerObj = this.getDropSpreadSpanshelf(
                                    dropContainerItemData,
                                    rootObject.IDPOG,
                                    this.dropClientX,
                                    this.targetSaceleFactor,
                                    this.multiDragableElementsList[0],
                                    dropIndex,
                                    dropCord,
                                );
                                dropContainerItemData = dropContainerObj.ItemData;
                                dropIndex = dropContainerObj.dropIndex;
                            }
                            rootObject.setSkipComputePositions();
                            rootObject.setSkipShelfCalculateDistribution();
                            for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                                dropItem(this.multiDragableElementsList[i], this);
                            }
                            rootObject.computePositionsAfterChange(ctx);
                            rootObject.clearSkipShelfCalculateDistribution();
                        }
                        allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                        $(allItemSelectors).show();
                        //droppableScope.$evalAsync(function () {
                        //  $(allItemSelectors).show();
                        //})
                    }

                    this.planogramService.removeAllSelection(this.dropTargetSectionId);
                    //baseControllerScope.$apply();

                    ////Added to send assort message itemDropped on drop of item from shopping cart
                    //if (UrlQueryStringHolder.link == 'iAssort' && UrlQueryStringHolder.mode == 'iAssortNICI') {
                    //    var items = this.multiDragableElementsList;
                    //    items.forEach((e) => {
                    //        var curFixture = this.sharedService.getParentObject(e, this.sharedService.activeSectionID);
                    //        let item = {};
                    //        let index = curFixture.Children.indexOf(e);
                    //        //first and last item
                    //        if (index == 0)
                    //            item['Left'] = null;
                    //        else
                    //            item['Left'] = curFixture.Children[index - 1].Position.IDProduct;
                    //        if (index == (curFixture.Children.length - 1))
                    //            item['Right'] = null;
                    //        else
                    //            item['Right'] = curFixture.Children[index + 1].Position.IDProduct;

                    //        item['IDProduct'] = curFixture.Children[index].Position.IDProduct;
                    //        item['FixtureNumber'] = curFixture.Fixture.FixtureNumber;
                    //        item['FixtureDesc'] = curFixture.Fixture.FixtureType;
                    //        item['Position'] = curFixture.Children[index].Position.PositionNo;

                    //        window.parent.postMessage('invokePaceFunc:addProduct:["' + item.IDProduct + '"]', '*');
                    //        window.parent.postMessage('invokePaceFunc:itemDropped:"' + JSON.stringify(item) + '"', '*');
                    //    })
                    //}
                } catch (e) {
                    this.log.error('Dragdrop fail: Cart Item Dropping  ' + e.stack);
                    this.log.error(':AngularDragDrop > Cart Item Dropping  ', e);
                }
            } else {
                try {
                    //when single item dragged and it's dropped over the same item
                    //then ignore the drop and revert back
                    // Skip for Crunch Mode (spanLeft/spanright/spreadSpan)
                    if (
                        this.multiDragableElementsList.length == 1 &&
                        ([AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                            Number(positionItemData.Position.IDMerchStyle),
                        ) != -1
                            ? positionItemData === dropContainerItemData.Children[dropIndex + 1] &&
                            positionItemData.baseItem
                            : positionItemData === dropContainerItemData.Children[dropIndex - 1]) &&
                        crunchMode != 5 &&
                        crunchMode != 8 &&
                        crunchMode != 9 &&
                        crunchMode != 6 &&
                        !Utils.checkIfPegType(dropContainerItemData) &&
                        !Utils.checkIfCoffincase(dropContainerItemData) &&
                        !Utils.checkIfBasket(dropContainerItemData)
                    ) {
                        var eachPositionItemData = this.multiDragableElementsList[0];
                        var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                        this.revertingBack(
                            jQueryPositionObj,
                            eachPositionItemData.Location.X,
                            eachPositionItemData.Location.Y,
                            undefined,
                            this.isShoppingCartItemDragging,
                        );
                        this.dragDropUtilsService.removePanelBluring();
                        this.isDropfalied = true;
                        return;
                    }

                    //get Locationx and facings Y
                    //for shelf item dragged
                    if (Utils.checkIfPegType(dropContainerItemData)) {
                        pegboardAutoInsert.call(this);
                    } else if (
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                        dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                    ) {
                        coffincaseAutoInsert.call(this);
                    } else {
                        var allItemSelectors = '';

                        if ((dropContainerItemData as StandardShelf)) {
                            (dropContainerItemData as StandardShelf).calculateCacheShrinkFactors(this.multiDragableElementsList);
                        }

                        var dropItem = (eachPositionItemData, that) => {
                            //revert throws errors in cloned mode i.e. CTRL + drag
                            if (!that.isCloneMode && this.sectionID == this.dropTargetSectionId) {
                                const dragPositionScope = { itemData: from }; //angular.element('#' + eachPositionItemData.$id).scope();
                                // var dragShelfScope = Utils.getParent(dragPositionScope);
                                //var dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                                //var dragIndex = (eachPositionItemData.Position.PositionNo - 1);
                                const parentItemData = that.sharedService.getParentObject(
                                    eachPositionItemData,
                                    eachPositionItemData.$sectionID,
                                ) as MerchandisableList;
                                const dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                                //var dragIndex = dragShelfScope.itemData.Children.indexOf(eachPositionItemData);
                                //Span Left and Right Spread Span Changes
                                if ('isSpreadShelf' in dropContainerItemData && dropContainerItemData.isSpreadShelf) {
                                    var dropContainerObj = that.getDropSpreadSpanshelf(dropContainerItemData, rootObject.IDPOG, that.dropClientX, that.scaleFactor, dragPositionScope.itemData, dropIndex, dropCord);
                                    dropContainerItemData = dropContainerObj.ItemData;
                                    //dropIndex = dropContainerObj.dropIndex;
                                }
                                const baseItem = dropContainerItemData.Children[dropIndex] as Position;
                                if (
                                    baseItem &&
                                    [AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(
                                        Number(eachPositionItemData.Position.IDMerchStyle),
                                    ) != -1
                                ) {
                                    var dragBaseItm = this.sharedService.getObject(
                                        eachPositionItemData.baseItem,
                                        eachPositionItemData.$sectionID,
                                    ) as Position;
                                    dropCord.left = baseItem.Location.X;
                                    if (
                                        eachPositionItemData.Position.IDMerchStyle == AppConstantSpace.MERCH_ABOVE_TEXT
                                    ) {
                                        dropCord.top = baseItem.linearHeight();
                                        eachPositionItemData.baseItem && (dragBaseItm.hasAboveItem = false);
                                        baseItem.hasAboveItem = true;
                                        dropIndex = (dropIndex || 0) + 1;
                                    } else if (
                                        eachPositionItemData.Position.IDMerchStyle == AppConstantSpace.MERCH_BEHIND_TEXT
                                    ) {
                                        dropCord.top = baseItem.Location.Y;
                                        eachPositionItemData.baseItem && (dragBaseItm.hasBackItem = false);
                                        baseItem.hasBackItem = true;
                                        dropIndex = (dropIndex || 0) + (baseItem.hasAboveItem ? 2 : 1);
                                    }
                                    var prevBaseItm = eachPositionItemData.baseItem
                                        ? this.sharedService.getObject(
                                            eachPositionItemData.baseItem,
                                            eachPositionItemData.$sectionID,
                                        ) as Position
                                        : undefined;
                                    eachPositionItemData.baseItem &&
                                        prevBaseItm &&
                                        !(prevBaseItm.hasBackItem || prevBaseItm.hasAboveItem) &&
                                        (prevBaseItm.Position.IDMerchStyle = 100);
                                    
                                    this.updateMerchStyleFromDragDrop(eachPositionItemData, baseItem);
                                }

                                //dragShelfScope.itemData.movePosition(dragIndex, dropContainerItemData, dropIndex, dropCord);
                                parentItemData.movePosition(ctx,
                                    dragIndex,
                                    dropContainerItemData,
                                    dropIndex,
                                    dropCord,
                                    undefined,
                                    { actionType: 'DragDrop', drag: true },
                                );
                                dropIndex = dropContainerItemData.Children.indexOf(eachPositionItemData);
                                //}
                                //dragShelfScope.itemData.movePosition(dragIndex, dropContainerItemData, dropIndex, dropCord);
                                // for No Crunch ,No need to recalculate the item
                                if (crunchMode == 5) {
                                    dragPositionScope.itemData.Location.X = dropCord.left;
                                }
                                allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                                //show property grid for first item dropped
                                //if (i == 0) {
                                //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                                //}
                                //on drag start we hide selected element dragged, when dropped we again showit
                                //$('#' + eachPositionItemData.$id).show();
                                //only needed for one dragged element which is actually internally handled by jQuery
                                // this.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);
                            } else {
                              //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                              //Target section event
                              (dropContainerItemData as StandardShelf).addClonedPosition(ctx, _.cloneDeep(eachPositionItemData), dropIndex);
                              if (!(this.isCloneMode || this.sharedService.moveOrCopy)) {
                                const cartObj = Utils.getShoppingCartObj(this.getSourceSectionObject().Children);
                                let pos = this.sharedService.getObject(eachPositionItemData.$id, eachPositionItemData.$sectionID) as Position;
                                pos.moveSelectedToCart(ctx, cartObj);
                                this.sharedService.changeInCartItems.next(true);
                              }
                              if (crunchMode == 5) {
                                  eachPositionItemData.Location.X = dropCord.left;
                                  //dropIndex++;
                              }
                            }
                        };
                        var dropLeftAssrt = checkIfAssortDrop.call(this);
                        if (dropLeftAssrt !== false) {
                            dropCord.left = dropLeftAssrt;
                        } else {
                            this.notify('ITEM_CAN_BE_PLACED_EMPTY_AREA_ONLY', 'Ok');
                            this.revertingBack(
                                $('#' + from.$id),
                                positionItemData.Location.X,
                                positionItemData.Location.Y,
                                undefined,
                                this.isShoppingCartItemDragging,
                            );
                            return false;
                        }
                        if (crunchMode == 5) {
                            rootObject.setSkipComputePositions();
                            rootObject.setSkipShelfCalculateDistribution();
                            for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                                var eachPositionItemData = this.multiDragableElementsList[i];
                                //var dragPositionScope = angular.element('#' + eachPositionItemData.$id).scope();

                                dropItem(eachPositionItemData, this);
                                dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                            }
                            rootObject.computePositionsAfterChange(ctx);
                            rootObject.clearSkipShelfCalculateDistribution();
                        } else {
                            if (dropContainerItemData.isSpreadShelf) {
                                const dropContainerObj = this.getDropSpreadSpanshelf(dropContainerItemData, rootObject.IDPOG, this.dropClientX, this.targetSaceleFactor, from, dropIndex, dropCord);
                                dropContainerItemData = dropContainerObj.ItemData;
                                dropIndex = dropContainerObj.dropIndex;
                            }
                            rootObject.setSkipComputePositions();
                            rootObject.setSkipShelfCalculateDistribution();
                            for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                                dropItem(this.multiDragableElementsList[i], this);
                            }
                            rootObject.computePositionsAfterChange(ctx);
                            rootObject.clearSkipShelfCalculateDistribution();
                        }

                        //show all items hidden together ONLY after $apply run by angukar
                        //to make sure no flickering issue exists
                        //4th April, 2016
                        //removing off the last comma from the string
                        allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                        $(allItemSelectors).show();
                        //droppableScope.$evalAsync(function () {
                        //  $(allItemSelectors).show();
                        //})
                    }

                    this.removePositionFromShoppingCart(ctx, this.multiDragableElementsList);
                    // Move connected annotations as appropriate.
                    //console.log("Invoking annotation move");
                    //@narendra need action here
                    //moveAnnotationsWithFixtureOrPosition(this.sectionId, this.multiDragableElementsList);

                    //Added to send assort message itemDropped on drop of item from shopping cart
                    //TODO put in a seperate fn
                    //if (UrlQueryStringHolder.mode == 'iAssortNICI') {
                    //    var items = this.multiDragableElementsList;
                    //    items.forEach((e) => {
                    //        var curFixture = this.sharedService.getParentObject(e, this.sharedService.activeSectionID);
                    //        let item = {};
                    //        let index = curFixture.Children.indexOf(e);
                    //        //first and last item
                    //        if (index == 0)
                    //            item['Left'] = null;
                    //        else
                    //            item['Left'] = curFixture.Children[index - 1].Position.IDProduct;
                    //        if (index == (curFixture.Children.length - 1))
                    //            item['Right'] = null;
                    //        else
                    //            item['Right'] = curFixture.Children[index + 1].Position.IDProduct;

                    //        item['IDProduct'] = curFixture.Children[index].Position.IDProduct;
                    //        item['FixtureNumber'] = curFixture.Fixture.FixtureNumber;
                    //        item['FixtureDesc'] = curFixture.Fixture.FixtureType;
                    //        item['Position'] = curFixture.Children[index].Position.PositionNo;

                    //        //window.parent.postMessage('invokePaceFunc:addProduct:["' + item.IDProduct + '"]', '*');
                    //        window.parent.postMessage('invokePaceFunc:itemDropped:"' + JSON.stringify(item) + '"', '*');
                    //    })
                    //}
                } catch (e) {
                    this.log.error('Dragdrop fail: Position Dropping  ' + e.stack);
                }
            }
            if (this.isPositionDragging) {
                this.revertingBack(
                    $('#' + from.$id),
                    positionItemData.Location.X,
                    positionItemData.Location.Y,
                    undefined,
                    this.isShoppingCartItemDragging,
                );
            }
            if (this.isShoppingCartItemDragging && !Utils.isNullOrEmpty(parentItemData.Children[draggableItemIndex])) {
                // Tweak : this is for ESC key while dragging the Item
                //angular.element("#" + parentItemData.Children[draggableItemIndex].$id).css({
                //  'left': 0,
                //  'top': 'auto'
                //});
                this.planogramService.removeAllSelection(this.dropTargetSectionId);
                //baseControllerScope.$apply();
            }
            this.dragDropUtilsService.removePanelBluring();
            return;
        }

        // DRAG ANd DROP OF STANDARD SHELF
        if (
            this.isStandShelfDragging ||
            this.isPegBoardDragging ||
            this.isCrossbarDragging ||
            this.isSlotwallDragging ||
            this.isCoffinCaseDragging ||
            this.isBasketDragging
        ) {
            var revertBack = function (msg, obj) {
                this.dragDropUtilsService.revertBackItem(obj.$id, this.sectionID);
                this.notify(msg, 'Ok');
            };

            /**************************************************************/
            var shelfItemData = this.dragItemData;
            //var rootObject = ObjectProvider.getObject(this.dragItemData.$sectionID, this.dragItemData.$sectionID);
            var isBayPresents = rootObject.isBayPresents;
            var shelfOrizinalXposToPog = shelfItemData.getXPosToPog();

            var dragShelfXPosToPog = (function (that) {
                if (rootObject.LKFixtureMovement == 1) {
                    return shelfItemData.getXPosToPog();
                }
                return that.findFixtureXPosToPog(shelfItemData, rootObject.IDPOG, that.targetSaceleFactor);
            })(this);

            var dragShelfYPosToPog = this.findFixtureYPosToPog(shelfItemData, rootObject.IDPOG, this.targetSaceleFactor);
            dropCord = this.shelfDropPoint(this.dropClientX, this.dropClientY, rootObject.IDPOG, this.targetSaceleFactor);
            if (shelfItemData.Fixture.SnapToLeft && !shelfItemData.Fixture.SnapToRight) {
                proposedX1PosToPog = rootObject.getNearestXCoordinate(dragShelfXPosToPog, 'leftmost'); // nearest xpos to the drop point
                proposedX2PosToPog = proposedX1PosToPog + shelfItemData.Fixture.Width;
            }
            if (shelfItemData.Fixture.SnapToLeft && shelfItemData.Fixture.SnapToRight) {
                proposedX1PosToPog = rootObject.getNearestXCoordinate(dragShelfXPosToPog, 'leftmost'); // nearest xpos to the drop point
                proposedX2PosToPog = rootObject.getNearestXCoordinate(
                    proposedX1PosToPog + shelfItemData.Fixture.Width,
                    'rightmost',
                );
            }
            if (!shelfItemData.Fixture.SnapToLeft && shelfItemData.Fixture.SnapToRight) {
                proposedX2PosToPog = rootObject.getNearestXCoordinate(
                    dragShelfXPosToPog + shelfItemData.Fixture.Width,
                    'rightmost',
                ); // nearest right most xpos to the drop point
                proposedX1PosToPog = proposedX2PosToPog - shelfItemData.Fixture.Width;
            }
            if (!shelfItemData.Fixture.SnapToLeft && !shelfItemData.Fixture.SnapToRight) {
                proposedX1PosToPog = dragShelfXPosToPog; //- Measurement.convertToPixel((this.offfsetX), this.sectionId) * this.scaleFactor; // droppoint Xpos (left - offsetX)
                proposedX2PosToPog = proposedX1PosToPog + shelfItemData.Fixture.Width;
            }
            //There might still be slight difference of 1-2px noted for y position as we update real position to nearest y coordinate
            var proposedYPosToPog = rootObject.getNearestYCoordinate(dragShelfYPosToPog);
            var proposedWidth = Utils.preciseRound(proposedX2PosToPog - proposedX1PosToPog, 2);

            //test case where both x is same, in this case $watch doesn't trigger and shelf floats
            if (shelfItemData.Fixture.SnapToLeft) {
                if (shelfOrizinalXposToPog == proposedX1PosToPog) {
                    this.dragDropUtilsService.revertBackItem(shelfItemData.$id, this.sectionID);
                }
            }
            //validation: if bay present then don't allow fixtures to drop outside bays
            if (isBayPresents) {
                //we check with actual drop area instead of proposed (just assumed it's better!)
                if (!shelfItemData.findIntersectBayAtXpos(dragShelfXPosToPog)) {
                    this.revertingBack(
                        $('#' + from.$id),
                        from.Location.X,
                        from.Location.Y,
                        undefined,
                        this.isShoppingCartItemDragging,
                    );
                    this.notify('BAY_EXIST_NOT_ALLOWED_DROP_FIXTURES_IN_NON_BAY_AREA', 'Ok');
                    this.dragDropUtilsService.removePanelBluring();
                    this.isDropfalied = true;
                    return;
                }
            }
            this.addUnitDimensionsToTargetSection([this.dragItemData]);
            if (this.isPegBoardDragging || this.isCrossbarDragging || this.isSlotwallDragging) {
                shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            } else if (this.isBlockFixtureDragging) {
                shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            } else if (this.isCoffinCaseDragging) {
                shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            } else if (this.isBasketDragging) {
                shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            } else {
                shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            }
            // Move connected annotations as appropriate.
            moveAnnotationsWithFixtureOrPosition.call(this, this.sectionId, this.multiDragableElementsList);
            $('#' + shelfItemData.$id).show();
            rootObject.applyRenumberingShelfs();
            const ctx = new Context(rootObject);
            if (rootObject._IsSpanAcrossShelf.FlagData) {
                rootObject.setSpreadSpanStandardshelfs(ctx);
            }
            $('#coffinCaseFixtureImg').css('display', 'none');
            //To Make assigned top while dragging to Auto need to call revertback method.
            this.revertingBack(
                $('#' + from.$id),
                from.Location.X,
                from.Location.Y,
                undefined,
                this.isShoppingCartItemDragging,
            );
            this.log.info(
                ' ------------------------  StandShelfDropping// Pegboard dropping is Done -----------------------',
            );
            this.dragDropUtilsService.removePanelBluring();
            this.removePositionFromShoppingCart(ctx, shelfItemData.Children);
            return;
        }
        //call addunitdimensions to target section to update the unit dimensions since it is bay dragging after this line so we can directly add unit dimensions.
        this.addUnitDimensionsToTargetSection([this.dragItemData]);
        // DRAG ANd DROP OF STANDARD SHELF
        if (this.isBlockFixtureDragging) {
            var shelfItemData = this.dragItemData;
            var isBayPresents = rootObject.isBayPresents;
            var shelfOrizinalXposToPog = shelfItemData.getXPosToPog();
            let dragShelfXPosToPog = ((that)=> {
                //no notch for block fixtures
                return that.findFixtureXPosToPog(shelfItemData, rootObject.IDPOG, this.targetSaceleFactor);
            })(this);
            var dragShelfYPosToPog = this.findFixtureYPosToPog(shelfItemData, rootObject.IDPOG, this.targetSaceleFactor);
            var proposedX1PosToPog;
            if (shelfItemData.Fixture.SnapToLeft) {
                proposedX1PosToPog = rootObject.getNearestXCoordinate(dragShelfXPosToPog, 'leftmost');
            } else {
                proposedX1PosToPog = dragShelfXPosToPog;
            }
            var proposedX2PosToPog = (()=> {
                return proposedX1PosToPog + shelfItemData.Fixture.Width;
            })();
            proposedYPosToPog = dragShelfYPosToPog; //rootObject.getNearestYCoordinate(dragShelfYPosToPog);
            var proposedWidth = Utils.preciseRound(proposedX2PosToPog - proposedX1PosToPog, 2);
            //only on free form we check threshold
            //test case where both x is same, in this case $watch doesn't trigger and shelf floats
            if (shelfItemData.Fixture.SnapToLeft) {
                if (shelfOrizinalXposToPog == proposedX1PosToPog) {
                    this.dragDropUtilsService.revertBackItem(shelfItemData.$id, this.sectionID);
                }
            }
            //validation: if bay present then don't allow fixtures to drop outside bays
            if (isBayPresents) {
                //we check with actual drop area instead of proposed (just assumed it's better!)
                if (!shelfItemData.findIntersectBayAtXpos(dragShelfXPosToPog)) {
                    this.revertingBack(
                        $('#' + from.$id),
                        from.Location.X,
                        from.Location.Y,
                        undefined,
                        this.isShoppingCartItemDragging,
                    );
                    this.notify('BAY_EXIST_NOT_ALLOWED_DROP_FIXTURES_IN_NON_BAY_AREA', 'Ok');
                    this.dragDropUtilsService.removePanelBluring();
                    this.isDropfalied = true;
                    return;
                }
            }
            shelfItemData.moveFixture(proposedX1PosToPog, proposedYPosToPog, proposedWidth);
            rootObject.applyRenumberingShelfs();
            if (rootObject._IsSpanAcrossShelf.FlagData) {
                const ctx = new Context(rootObject);
                rootObject.setSpreadSpanStandardshelfs(ctx);
            }
            this.log.info(' ------------------------  BlockFixture dropping is Done -----------------------');
            this.dragDropUtilsService.removePanelBluring();
            return;
        }

        // DRAG ANd DROP OF BAYS
        if (this.isBayDragging) {
            this.log.info(' ------------------------  BayDroping is started -----------------------');
            var bayItemData: Modular = this.dragItemData;
            var dragBayXPosToPog = this.findFixtureXPosToPog(bayItemData, rootObject.IDPOG, this.targetSaceleFactor);
            bayItemData.move(dragBayXPosToPog);
            //dt 6th August, not sure why its here. but when commented bays doen't revert back on invalid drop
            this.revertingBack(
                $('#' + from.$id),
                from.Location.X,
                from.Location.Y,
                undefined,
                this.isShoppingCartItemDragging,
            );
            this.log.info(' ------------------------  BayDroping is Done -----------------------');
            if (this.isBayDragUsecase) {
                rootObject._IsSpanAcrossShelf.FlagData = true;
                this.isBayDragUsecase = false;
                const ctx = new Context(rootObject);
                rootObject.setSpreadSpanStandardshelfs(ctx);
            }
            rootObject.applyRenumberingShelfs();
            this.dragDropUtilsService.removePanelBluring();
            this.planogramService.UpdatedSectionObject.next(rootObject);
            //removed code as it not required
            return;
        }
    }

    private updateMerchStyleFromDragDrop(position: Position, baseItem: Position): void {
        const oldBaseItem = position.baseItem;
        const oldIdMerchStyle = baseItem.Position.IDMerchStyle;

        position.baseItem = baseItem.$id;
        baseItem.Position.IDMerchStyle = AppConstantSpace.MERCH_MANUAL;

        const originalOrRevert = ((baseItemId, idMerchStyle) => {
            return () => {
                const currBaseItem = this.sharedService.getObject(position.baseItem, position.$sectionID) as Position;
                const newBaseItem = this.sharedService.getObject(baseItemId, position.$sectionID) as Position;
                if (
                    position.Position.IDMerchStyle == AppConstantSpace.MERCH_ABOVE
                ) {
                    position.baseItem && (currBaseItem.hasAboveItem = false);
                    newBaseItem && (newBaseItem.hasAboveItem = true);
                } else if (
                    position.Position.IDMerchStyle == AppConstantSpace.MERCH_BEHIND
                ) {
                    position.baseItem && (currBaseItem.hasBackItem = false);
                    newBaseItem && (newBaseItem.hasBackItem = true);
                }

                position.baseItem = baseItemId;
                currBaseItem && (currBaseItem.Position.IDMerchStyle = (idMerchStyle == AppConstantSpace.MERCH_MANUAL ? AppConstantSpace.MERCH_DEFAULT : idMerchStyle));
                newBaseItem && (newBaseItem.Position.IDMerchStyle = AppConstantSpace.MERCH_MANUAL)
            };
        });
        const original = originalOrRevert(position.baseItem, baseItem.Position.IDMerchStyle);
        const revert = originalOrRevert(oldBaseItem, oldIdMerchStyle);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'UpdateMerchStyleFromDragDrop',
        });
    }

    public findFixtureXPosToPog(fixtureItemData, pogId, scaleFactor) {
        //this factor we got by several test
        var errorDelta = 0.21;
        var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
        var sectionObject = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
        let shelfoffSetPX = { left: 0, top: 0 };
        try {
            var offsetXDifference = 0;
            shelfoffSetPX = { left: this.dropClientX, top: this.dropClientY };
            //if (this.isGalleryDragging) {
            //  shelfoffSetPX = { left: this.dropClientX, top: this.dropClientY };
            //} else {
            //  shelfoffSetPX = $('#' + fixtureItemData.$id).offset();
            //}
            var offsetXDifference =
                this.planogramService.convertToUnit(
                    (shelfoffSetPX.left - pogOffSetPX.left) / scaleFactor,
                    this.dropTargetSectionId,
                ) - errorDelta;
            offsetXDifference -= sectionObject.showAnnotation ? sectionObject.getAnnotationDimensionLeft() : 0;
            if (offsetXDifference < 0) {
                offsetXDifference = 0;
            }
        } catch (e) {
            console.error('Dragdrop fail: findFixtureXPosToPog' + e.stack);
            this.log.info(':AngularDragDrop > findFixtureXPosToPog  ', e);
        }
        return offsetXDifference;
    }

    //Finding Fixture (Shelf/Bay) Ypos relative to POG
    public findFixtureYPosToPog(fixtureItemData, pogId, scaleFactor) {
        //this factor we got by several test
        //Earlier error delta was subtracted by 0.21, now updated to add 0.675 to offsetYDifference for better positioning
        var errorDelta = 0.675;
        let shelfoffSetPX = { left: 0, top: 0 };
        var realYpos = 0;
        var sectionObject = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
        try {
            var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
            shelfoffSetPX = { left: this.dropClientX, top: this.dropClientY };
            var offsetYDifference =
                this.planogramService.convertToUnit(
                    (shelfoffSetPX.top - pogOffSetPX.top) / scaleFactor,
                    this.dropTargetSectionId,
                ) + errorDelta;
            offsetYDifference -= sectionObject.showAnnotation ? sectionObject.getAnnotationDimensionTop() : 0;
            if (this.isGalleryDragging || this.isDragFromClipboard) {
                realYpos = sectionObject.Dimension.Height - offsetYDifference;
            } else if (
                this.isBasketDragging ||
                this.isPegBoardDragging ||
                this.isCrossbarDragging ||
                this.isSlotwallDragging ||
                this.isBlockFixtureDragging ||
                this.isCoffinCaseDragging ||
                (this.isStandShelfDragging && (this.dragItemData.Fixture.BackgroundFrontImage?.Url || this.dragItemData.Fixture.ForegroundImage?.Url))
            ) {
                realYpos = sectionObject.Dimension.Height - offsetYDifference - this.dragItemData.Dimension.Height;
            } else {
                realYpos = sectionObject.Dimension.Height - offsetYDifference - this.dragItemData.Fixture.Thickness;
            }
        } catch (e) {
            console.error('Dragdrop fail: findFixtureYPosToPog' + e.stack);
            this.log.info(':AngularDragDrop > findFixtureYPosToPog  ', e);
        }
        return realYpos;
    }

    public fixtureDropIndex(
        dropShelfItemData,
        dropClientX,
        dropClientY,
        pogId,
        scaleFactor,
        aboveBehindMerchStyl,
        targetItem,
    ) {
        // Note:- we deal with clientX to compute all relative positionings
        //var shelfRootObject = this.sharedService.getRootObject(dropShelfItemData, dropShelfItemData.$sectionID);
        let itemDropIndex;

        var shelfRootObject = this.sharedService.getObject(dropShelfItemData.$sectionID, dropShelfItemData.$sectionID) as Section;

        var dropShelfChildren = dropShelfItemData.getAllPosition();
        var dropShelfChildrenSize = dropShelfChildren.length;
        var crunchMode = dropShelfItemData.Fixture.LKCrunchMode;
        //left and top from the document for the POG
        var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
        var dropShelfXPosToPog = dropShelfItemData.getXPosToPog();
        var dropShelfYPosToPog = dropShelfItemData.getYPosToPog();
        var itemXPosToPog = this.planogramService.convertToUnit(((dropClientX - pogOffSetPX.left) / this.targetSaceleFactor), this.dropTargetSectionId);
        var itemYPosToPog = this.planogramService.convertToUnit(((dropClientY - pogOffSetPX.top) / this.targetSaceleFactor), this.dropTargetSectionId);
        itemXPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionLeft() : 0;
        itemYPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionTop() : 0;
        //Above variables mainly to get real xPOS of the item relative to the shelf dropped.
        //var itemXPosToParent = (itemXPosToPog - dropShelfXPosToPog - dropShelfItemData.ChildOffset.Y);
        var itemXPosToParent = (itemXPosToPog - dropShelfXPosToPog);
        var itemYPosToParent = (shelfRootObject.Dimension.Height - itemYPosToPog - dropShelfYPosToPog - dropShelfItemData.ChildOffset.Y);
        //When item is dropped
        // 1. Find the relative xPos from the parents.
        // 2. Find the intersection and $index
        var findValidDropIndex = (dropShelfChildren: any[], itemXPosToParent, crunchMode, aboveBehindMerchStyl) => {
            var dropPoint: FourDirectionValues = {
                left: itemXPosToParent,
                right: undefined,
            };
            var child = Utils.sortByXPos(dropShelfChildren);
            var len = child.length;
            if (len > 0) {
                for (var i = 0; i < len; i++) {
                    var item = child[i];
                    if ([AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(Number(item.Position.IDMerchStyle)) != -1) {
                        continue;
                    }
                    if (i + 1 <= len) {
                        var nextItem = child[i + 1];
                    } else {
                        var nextItem: any = null;
                    }
                    if (aboveBehindMerchStyl && item.intersect(dropPoint)) {
                        return i;
                    }
                    if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && (item.intersect(dropPoint) || (i == 0 && dropPoint.left < item.Location.X) || item.inbetween(dropPoint, nextItem))) {
                        return getDropIndexBasedOnCrunchMode(i, crunchMode, item, dropPoint.left);
                    }
                };
            }
            return false;
        }
        var getDropIndexBasedOnCrunchMode = function (index, crunchMode, item, left) {
            switch (Number(crunchMode)) {
                case 0:
                    break;
                case 9:
                case 1:
                case 5:
                    if (left < item.Location.X) {
                        return index;
                    }
                    if (_.isUndefined(item.getSKUGap()) || item.getSKUGap() == 0) {
                        return index + 1;
                    } else {
                        var gap = item.getSKUGap() / 2;
                        var gapLeft = (item.Location.X - gap);
                        var gapRight = (gap + item.Location.X + item.linearWidth());
                        if ((gapLeft <= left) && item.Location.X >= left) {
                            return index;
                        } else {
                            return index + 1;
                        }
                    }
                case 8:
                case 2:
                    if (_.isUndefined(item.getSKUGap()) || item.getSKUGap() == 0) {
                        return index;
                    } else {
                        var gap = item.getSKUGap() / 2;
                        var gapLeft = (item.Location.X - gap);
                        var gapRight = (gap + item.Location.X + item.linearWidth());
                        if ((gapRight >= left) && (item.Location.X + item.linearWidth()) <= left) {
                            return index + 1;
                        } else {
                            return index;
                        }

                    }
                case 3:
                    if (_.isUndefined(item.getSKUGap()) || item.getSKUGap() == 0) {
                        return index;
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    return index+1;
                        //} else {
                        //    return index;
                        //}
                    } else {
                        var gap = item.getSKUGap() / 2;
                        var gapLeft = (item.Location.X - gap);
                        var gapRight = (gap + item.Location.X + item.linearWidth());
                        var posRight = (item.Location.X + item.linearWidth());
                        //usecase1: when item is dropped b/w leftgap and locX of the intersected pos
                        if ((gapLeft <= left) && item.Location.X >= left) {
                            return index;
                        } else {
                            //Usecase2: When item is dropped b/w posRight and Right gap
                            if (posRight <= left && gapRight >= left) {
                                return index + 1;
                            } else {
                                //Usecase3: When item is dropped on the item it should consider traffic flow, it should drop on left
                                return index;
                            }

                        }
                    }
                case 4:
                case 6:
                case 7:
            }
        }
        switch (Number(crunchMode)) {
            case 0:
                break;
            case 9: //  span right
            case 1: // right
                if (dropShelfChildrenSize == 0) {
                    itemDropIndex = 0;
                }
                else if (dropShelfChildrenSize > 0 && itemXPosToParent < dropShelfChildren[0].Location.X) {
                    //if dropped on extreme left(i.e. empty space)
                    itemDropIndex = 0;
                } if (Utils.checkIfPosition(targetItem)) {
                    itemDropIndex = dropShelfItemData.Children.indexOf(targetItem);
                    //dropIndex == -1 ? (dropIndex = this.fixtureDropIndex(dropContainerItemData, this.dropClientX, this.dropClientY, rootObject.IDPOG, this.scaleFactor, ([AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(Number(positionItemData.Position.IDMerchStyle)) != -1))) : '';
                } else {
                    itemDropIndex = findValidDropIndex(dropShelfChildren, itemXPosToParent, crunchMode, aboveBehindMerchStyl);
                }
                break;
            case 5: //no Crunch
            case 8: // span Left
            case 2: //Left
                if (dropShelfChildrenSize == 0) {
                    itemDropIndex = 0;
                }
                else if (dropShelfChildrenSize > 0 && itemXPosToParent > dropShelfChildren[dropShelfChildren.length - 1].Location.X + dropShelfChildren[dropShelfChildren.length - 1].linearWidth()) {
                    //if dropped on extreme right(i.e. empty space)
                    itemDropIndex = dropShelfChildren.length;
                } else {
                    itemDropIndex = findValidDropIndex(dropShelfChildren, itemXPosToParent, crunchMode, aboveBehindMerchStyl);
                }
                break;
            case 3: // center
                //@todo need to check for drag drop index if it has skugap
                if (dropShelfChildrenSize == 0) {
                    itemDropIndex = 0;
                }
                else if (dropShelfChildrenSize > 0 && itemXPosToParent < dropShelfChildren[0].Location.X) {
                    //if dropped on extreme left(i.e. empty space)
                    itemDropIndex = 0;
                } else if (itemXPosToParent > dropShelfChildren[dropShelfChildren.length - 1].Location.X + dropShelfChildren[dropShelfChildren.length - 1].linearWidth() + dropShelfChildren[dropShelfChildren.length - 1].getSKUGap() / 2) {
                    //if dropped on extreme right(i.e. empty space)
                    itemDropIndex = dropShelfChildren.length;
                } else {
                    itemDropIndex = findValidDropIndex(dropShelfChildren, itemXPosToParent, crunchMode, aboveBehindMerchStyl);
                }
                break;
            case 4: // spread
            case 6: // spread span
            case 7: // spread Facing
                //iterate through the items and find whose xPos greater than currect itemXPosToParent
                if (dropShelfChildrenSize > 0) {
                    var dropPoint: FourDirectionValues = {
                        left: itemXPosToParent,
                        top: itemYPosToParent,
                        right: undefined
                    };
                    var len = dropShelfChildren.length;
                    itemDropIndex = len;
                    for (var i = 0; i < len; i++) {
                        var item = dropShelfChildren[i];
                        //if ([AppConstantSpace.MERCH_ABOVE, AppConstantSpace.MERCH_BEHIND].indexOf(Number(item.Position.IDMerchStyle)) != -1) {
                        //    continue;
                        //}
                        if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && (item.Location.X > itemXPosToParent)) {
                            itemDropIndex = i;
                            break;
                        }
                        if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && item.intersect(dropPoint)) {
                            itemDropIndex = i;
                            //if (shelfRootObject.LKTraffic == 1) {
                            //    itemDropIndex = i+1;
                            //} else {
                            //    itemDropIndex = i;
                            //}
                            break;
                        }
                    }
                } else {
                    itemDropIndex = 0;
                }
                break;
            default:
                break;
        }
        return Number(itemDropIndex);
    };

    public shelfDropPoint(dropClientX, dropClientY, pogId, scaleFactor) {
        var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
        var sectionObject = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
        var itemXPosToPog = this.planogramService.convertToUnit(((dropClientX - pogOffSetPX.left) / scaleFactor), this.dropTargetSectionId);
        var itemYPosToPog = this.planogramService.convertToUnit(((dropClientY - pogOffSetPX.top) / scaleFactor), this.dropTargetSectionId);
        itemXPosToPog -= sectionObject.showAnnotation ? sectionObject.getAnnotationDimensionLeft() : 0;
        itemYPosToPog -= sectionObject.showAnnotation ? sectionObject.getAnnotationDimensionTop() : 0;
        var dropPoint = {
            left: itemXPosToPog,
            top: itemYPosToPog
        };
        return dropPoint;
    }

    public doesPositionsValidateFitCheck(multiDragableElementsList, dropItemData, baseControllerScope, dropIndex, dropCord, params,ignoreMerchHeight,isSuppressFingerSpace,ignoreFingerSpaceSource,ignoreFingerSpaceDestination): {flag: boolean,errmsg: string} {
        // iterate through all items
        // when item dropped into a standardshelf
        // Auto compute ON - 1. dragged item(one frontshigh height) should be less than shelf merch height to qualify fitcheck on item drag
        // Auto compute OFF - 2. dragged item(frontshighs height + layover + layunder height) should be less than shelf merch height to qualify fitcheck on item drag
        try {
            let totalSquareToDrop = 0;
            let availableSquare = 0, totalLinear = 0;
            var shelf = filter(dropItemData.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
            var rootObject = this.getSectionObject(this.dropTargetSectionId);
            for (let i = multiDragableElementsList.length - 1; i >= 0; i--) {
                const dragElementItemData = multiDragableElementsList[i];

                // Note: minusing max shrink value to check condition properly while droppping
                const ItemHt = dragElementItemData.computeHeight(undefined, undefined, true) - dragElementItemData.getShrinkY();
                const ItemDt = dragElementItemData.computeDepth(undefined, undefined, true) - dragElementItemData.getShrinkZ();

                let ItemFullHt = dragElementItemData.Dimension.Height;
                const ItemFullDt = dragElementItemData.Dimension.Depth;
                const dropItemActualHeight = dropItemData.Dimension.Height;
                //logic for ignore finger space
                if (!isSuppressFingerSpace &&
                    !ignoreFingerSpaceSource &&
                    ignoreFingerSpaceDestination) {
                    ItemFullHt -= dragElementItemData.Position.ProductPackage.FingerSpace;
                }

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
                }
                else if (
                    params.isFitCheckRequired &&
                    dropItemActualHeight < ItemHt &&
                    dropItemData.Fixture.AutoComputeFronts &&
                    ignoreMerchHeight &&
                    (!rootObject.IsVariableHeightShelf ||
                        (dropItemData.Fixture.MaxMerchHeight != null && dropItemData.Fixture.MaxMerchHeight > 0))
                ) {
                        return {
                            flag: false,
                            errmsg:
                                this.translateService.instant('ONE') +
                                '(' +
                                dragElementItemData.Position.inventoryObject.UPC +
                                ' - ' +
                                Math.round(dragElementItemData.Dimension.Height * 100) / 100 +
                                ' x' +
                                Math.round(dragElementItemData.Dimension.Width * 100) / 100 +
                                'x' +
                                Math.round(dragElementItemData.Dimension.Depth * 100) / 100 +
                                ') ' +
                                this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
                                ' ' +
                                Math.round(dropItemData.ChildDimension.Height * 100) / 100 +
                                '.',
                        };
                } else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Height < ItemHt &&
                    dropItemData.Fixture.AutoComputeFronts &&
                    (!rootObject.IsVariableHeightShelf ||
                        (dropItemData.Fixture.MaxMerchHeight != null && dropItemData.Fixture.MaxMerchHeight > 0))
                ) {
                    /*When ignoremerchheight is true allow the position object to get placed at standardshelf*/
                    if (!ignoreMerchHeight) {
                        /*When autocomputefronts is on need to check at least one facingY can fit in the available height and variable height should off and max merch height should be null or zero*/
                        return {
                            flag: false,
                            errmsg:
                                this.translateService.instant('ONE') +
                                '(' +
                                dragElementItemData.Position.inventoryObject.UPC +
                                ' - ' +
                                Math.round(dragElementItemData.Dimension.Height * 100) / 100 +
                                ' x' +
                                Math.round(dragElementItemData.Dimension.Width * 100) / 100 +
                                'x' +
                                Math.round(dragElementItemData.Dimension.Depth * 100) / 100 +
                                ') ' +
                                this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
                                ' ' +
                                Math.round(dropItemData.ChildDimension.Height * 100) / 100 +
                                '.',
                        };
                    }
                }else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Depth + (dragElementItemData.Position.ProductPackage.OverhangZ || 0) <
                    ItemDt &&
                    dropItemData.Fixture.AutoComputeDepth
                ) {
                    /*When autocomputefronts is on need to check at least one facingY can fit in the available height and variable height should off and max merch height should be null or zero*/
                    return {
                        flag: false,
                        errmsg:
                            this.translateService.instant('ONE') +
                            '(' +
                            dragElementItemData.Position.inventoryObject.UPC +
                            ' - ' +
                            Math.round(dragElementItemData.Dimension.Height * 100) / 100 +
                            ' x' +
                            Math.round(dragElementItemData.Dimension.Width * 100) / 100 +
                            'x' +
                            Math.round(dragElementItemData.Dimension.Depth * 100) / 100 +
                            ') ' +
                            this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
                            ' ' +
                            Math.round(dropItemData.ChildDimension.Depth * 100) / 100 +
                            '.',
                    };
                } else if (
                    params.isFitCheckRequired &&
                    dropItemData.ChildDimension.Height < ItemFullHt 
                ) {
                     /*When ignoremerchheight is true allow the position object to get placed at standardshelf*/
                    if (!ignoreMerchHeight) {
                        return {
                            flag: false,
                            errmsg:
                                this.translateService.instant('ONE') +
                                '(' +
                                dragElementItemData.Position.inventoryObject.UPC +
                                ' - ' +
                                Math.round(dragElementItemData.Dimension.Height * 100) / 100 +
                                ' x' +
                                Math.round(dragElementItemData.Dimension.Width * 100) / 100 +
                                'x' +
                                Math.round(dragElementItemData.Dimension.Depth * 100) / 100 +
                                ') ' +
                                this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
                                ' ' +
                                Math.round(dropItemData.ChildDimension.Height * 100) / 100 +
                                '.',
                        };
                    }
                } else if (
                    params.isFitCheckRequired &&
                    !dropItemData.Fixture.AutoComputeDepth &&
                    dropItemData.ChildDimension.Depth + (dragElementItemData.Position.ProductPackage.OverhangZ || 0) <
                    ItemFullDt
                ) {
                    return {
                        flag: false,
                        errmsg:
                            this.translateService.instant('ONE') +
                            '(' +
                            dragElementItemData.Position.inventoryObject.UPC +
                            ' - ' +
                            Math.round(dragElementItemData.Dimension.Height * 100) / 100 +
                            ' x' +
                            Math.round(dragElementItemData.Dimension.Width * 100) / 100 +
                            'x' +
                            Math.round(dragElementItemData.Dimension.Depth * 100) / 100 +
                            ') ' +
                            this.translateService.instant('OR_MORE_ITEMS_DROPPED_HAD_HEIGHT') +
                            ' ' +
                            Math.round(dropItemData.ChildDimension.Depth * 100) / 100 +
                            '.',
                    };
                }
                else if (
                    shelf && (shelf.Fixture.LKDividerType == 2) && dragElementItemData.Position.ProductPackage.IdPackageStyle == AppConstantSpace.PKGSTYLE_TRAY &&
                    dragElementItemData.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY && dragElementItemData.Position.LKDividerType==AppConstantSpace.INHERIT_FROM_SHELF
                ) {
                    return {
                        flag: false,
                        errmsg:this.translateService.instant('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY'),
                    };
                } else if (
                    typeof dropIndex != 'undefined' &&
                    Number(dragElementItemData.Position.IDMerchStyle) == AppConstantSpace.MERCH_ABOVE
                ) {
                    var baseItem = dropItemData.Children[dropIndex];
                    if (!baseItem || baseItem.$id == dragElementItemData.$id || baseItem.hasAboveItem) {
                        //||!baseItem.Position.Product.isAllowAboveStacking) {
                        return { flag: false, errmsg: this.translateService.instant('CANT_DROP_ON_THE_SAME_ITEM') };
                    }
                    //if (!baseItem || !baseItem.Position.ProductPackage.OtherItemOnTop) {//||!baseItem.Position.Product.isAllowAboveStacking) {
                    //    return { flag: false, errmsg: 'Base item is not supporting above merch style items' }
                    //}

                    //if (params.isFitCheckRequired && ((dropItemData.Fixture.AutoComputeFronts && (dragElementItemData.computeHeight() > (dropItemData.ChildDimension.Height - baseItem.linearHeight()))) ||
                    //    (!dropItemData.Fixture.AutoComputeFronts && (dragElementItemData.linearHeight() > (dropItemData.ChildDimension.Height - baseItem.linearHeight()))) ||
                    //    (dropItemData.Fixture.AutoComputeDepth && dragElementItemData.computeDepth() > (baseItem.layoversLinearDeep() || baseItem.linearDepth())) ||
                    //    (!dropItemData.Fixture.AutoComputeDepth && dragElementItemData.linearDepth() > (baseItem.layoversLinearDeep() || baseItem.linearDepth())) ||
                    //    (baseItem.linearWidth() < dragElementItemData.linearWidth() || baseItem.linearDepth() < dragElementItemData.linearDepth()))) {
                    //    return { flag: false, errmsg: 'Fit check error, required linear is more than Base item"s linear' }
                    //}
                } else if (
                    typeof dropIndex != 'undefined' &&
                    Number(dragElementItemData.Position.IDMerchStyle) == AppConstantSpace.MERCH_BEHIND
                ) {
                    var baseItem = dropItemData.Children[dropIndex];
                    if (!baseItem || baseItem.$id == dragElementItemData.$id || baseItem.hasBackItem) {
                        //||!baseItem.Position.Product.isAllowAboveStacking) {
                        return { flag: false, errmsg: this.translateService.instant('CANT_DROP_ON_THE_SAME_ITEM') };
                    }
                    //if (!baseItem || !baseItem.Position.ProductPackage.OtherItemBehind) {//||!baseItem.Position.Product.isAllowAboveStacking) {
                    //    return { flag: false, errmsg: 'Base item is not supporting behind merch style items' };
                    //}
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
                            //|| baseItem.linearHeight() < dragElementItemData.linearHeight()) // Note: Behind item can have more height than base item
                    ) {
                        return {
                            flag: false,
                            errmsg: "Fit check error, required linear is more than Base item's Linear",
                        };
                    }
                }
            }
        } catch (e) {
            this.log.error('Dragdrop fail: doesPositionsValidateFitCheck' + e.stack);
            this.log.error(
                ':AngularDragDrop > Method > doesPositionsValidateFitCheck: params : multiDragableElementsList : ',
                multiDragableElementsList,
                ' : dropItemData : ',
                dropItemData,
                e,
            );
        }
        return { flag: true,errmsg:'' };
    }

    private revertingBack(draggableObj, xPos, yPos, top, isShoppingCartItem) {
        var that = this;
        //draggableObj.scope().$evalAsync(function () {
        var topAuto = 'auto';
        if (!Utils.isNullOrEmpty(top) && top != null) {
            topAuto = this.planogramService.convertToPixel(top, that.sectionId) + 'px';
        }
        draggableObj.show();
        if (!Utils.isNullOrEmpty(draggableObj)) {
            if (isShoppingCartItem) {
                draggableObj.css({
                    top: '0px',
                    bottom: '0px',
                    left: '0px',
                    'z-index': that.dragItemData && that.dragItemData.getZIndex && that.dragItemData.getZIndex(),
                });
            } else {
                draggableObj.css({
                    top: topAuto,
                    bottom: this.planogramService.convertToPixel(yPos, that.sectionId) + 'px',
                    left: this.planogramService.convertToPixel(xPos, that.sectionId) + 'px',
                    'z-index': that.dragItemData && that.dragItemData.getZIndex && that.dragItemData.getZIndex(),
                });
            }
        } else {
            draggableObj.css({
                top: topAuto,
                bottom: '0px',
                'z-index': that.dragItemData && that.dragItemData.getZIndex && that.dragItemData.getZIndex(),
            });
        }
    }

    private setDragItem(obj: any, event: any) {
        this.dragItemData = obj;
        this.isShoppingCartItemDragging = this.isPositionDragging = false;
        //Need to check if source pog is read only then change it to clone mode true
        this.isShiftMode = event.shiftKey;
        this.isCloneMode = event.ctrlKey || this.planogramHelperService.checkIfReadonly(this.getSourceSectionObject().IDPOG);
        if (_.isUndefined(this.dragItemData.selected)) {
            this.dragItemData.selected = false;
        }
        // TODO: why is isShoppingCartItemDragging and this.isPositionDragging reassigned later?
        if (this.isDerivedType(AppConstantSpace.POSITIONOBJECT)) {
            this.isShoppingCartItemDragging = this.isDragOrigin(DragOrigins.ShoppingCart);
            this.isPositionDragging = !this.isShoppingCartItemDragging;
        }
        if (this.isCloneMode && this.dragItemData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            document.querySelector('body').classList.add('cloneMode');
            this.dragItemData = _.cloneDeep(this.dragItemData);
        }
    }

    private setItemForFixtureGalary(obj, event) {
        var copyItem = cloneDeep(obj);
        this.dragItemData = copyItem;
    }

    private checkIfAllItemsFromSameShelf() {
        const multipleItems = this.multiDragableElementsList;
        const firstItem = multipleItems[0],
            that = this;
        const firstItemParentType = this.sharedService.getObject(
            multipleItems[0].$idParent,
            that.sectionId,
        ).ObjectDerivedType;
        for (let i = 0; i < multipleItems.length; i++) {
            let eachItem = multipleItems[i];
            const eachItemParent = this.sharedService.getObject(eachItem.$idParent, that.sectionId);
            const eachItemParentType = eachItemParent.ObjectDerivedType;
            if (this.isShoppingCartItemDragging) {
                this.isFromSamePeg = false;
                this.isFromSameFixture = true;
                this.isFromDiffPeg = false;
                this.isFromSS = false;
                this.isFromCoffinCase = false;
                break;
            }
            if (eachItemParentType != firstItemParentType) {
                this.isFromSamePeg = false;
                this.isFromSameFixture = false;
            }
            if (firstItem.$idParent != eachItem.$idParent) {
                this.isFromSamePeg = false;
                this.isFromSameParent = false;
            }
            if (!Utils.checkIfPegType(eachItemParent)) {
                this.isFromSamePeg = false;
                this.isFromDiffPeg = false;
            } else if (Utils.checkIfPegType(eachItemParent) && firstItem.$idParent != eachItem.$idParent) {
                this.isFromSamePeg = false;
                this.isFromDiffPeg = true;
            }
            if (!Utils.checkIfstandardShelf(eachItemParent)) {
                this.isFromSS = false;
            }
            if (!Utils.checkIfCoffincase(eachItemParent) && !Utils.checkIfBasket(eachItemParent)) {
                this.isFromCoffinCase = false;
            }
        }
        if (this.isFromCoffinCase && this.isFromSameParent) {
            this.isFromSamePeg = true;
            this.isFromDiffPeg = false;
        }
    }

    public getDisplayMode() {
        if (this.planogramService.rootFlags[this.sectionId]) {
            // temp fix need to remove
            return 'planoDrawMode' + this.planogramService.rootFlags[this.sectionId].mode;
        }
        return 'planoDrawMode' + 0;
    }
    private setProductDragItem = function (obj: IBeginDragEventArgs) {
        this.isPositionDragging = true;
        //this.isProductPositionDragging = true;
        this.dragItemData = this.getObject(obj.data);
    };
    private copyProductItems = function (productList) {
        var productListClone = [];
        for (var i = 0; i < productList.length; i++) {
            let selectedProd = productList[i].firstPosition ? productList[i].firstPosition : productList[i];
            //selectedProd.selected = false;
            //var prodId = '#' + selectedProd.Product.IDProduct;
            //$('.li-image-hover').children('.checkbox-li').css('display', 'none');
            //$('.li-image-hover').find('.small-avatar-image').css('display', 'block');
            productListClone.push(_.cloneDeep(selectedProd));
        }

        return productListClone;
    };

    public canDrag(args: ICanDragArgs): boolean {
        if (!args.data || !args.data.dragOriginatedFrom) {
            this.log.error(`canDrag handler: drag origin not defined.`);
            return false;
        } else if (!this.panelService.ActivePanelInfo?.isLoaded) {
            this.notify('PLEASE_LOAD_THE_PLANOGRAM_FIRST');
            return false;
        }
        else if (this.panelService.panelPointer.panelOne.view !== 'panelView' && this.panelService.panelPointer.panelTwo.view !== 'panelView') {
            this.notify('PLANOGRAM_NOT_IN_VIEW');
            return false;
        }
        this.initGlobalVariables();
        // All the validation logic to cancel has to be added here.
        if (this.contextMenuOpened) {
            return false;
        }
        this.dndData = args.data;

        switch (args.data.dragOriginatedFrom) {
            // TODO: if no validation for a dource, remove that function
            case DragOrigins.Planogram:
                return this.canDragPlanogramItem(args);
            case DragOrigins.FixtureGallary:
                return this.canDragFixtureGallaryItem(args);
            case DragOrigins.ProductLibrary:
                return this.canDragProductLibrary(args);
            case DragOrigins.ShoppingCart:
                return this.canDragPlanogramItem(args);
            case DragOrigins.ClipBoard:
                return this.canDragClipBoard(args);
            default:
                this.log.error(`canDrag handler: drag origin: '${args.data.dragOriginatedFrom}' not identified.`);
                return false;
        }
    }

    private notify(message: string, action?: string): void {
        this.zone.run(() => {
            if (action) {
                this.notifyService.warn(message, action);
            }
            else {
                this.notifyService.warn(message);
            }
        })
    }

    private canDragFixtureGallaryItem(args: ICanDragArgs): boolean {
        this.isShoppingCartItemDragging = this.isPositionDragging = false;
        let fixItemData = this.getObject(args.data);
        if (!fixItemData) {
            // when fixtures data is not loaded yet
            return false;
        }
        var rootObject = this.getSectionObject(this.sectionID);
        // depending on the object type we set it to a variable
        this.setItemForFixtureGalary(fixItemData, args.event);
        if (this.sharedService.checkIfAssortMode('new-fixture-add')) {
            this.notify('DRAG_DROP_FIXTURES_DISABLED', 'Ok');
            return false;
        } else {
            if (this.sharedService.getActiveSectionId() == '') {
                this.notify('PLEASE_LOAD_THE_PLANOGRAM_FIRST', 'Ok');
                return false;
            } else {
                if (this.planogramHelperService.checkIfReadonly(rootObject.IDPOG)) {
                    this.notify('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM', 'Ok');
                    return false;
                } else {
                    if (!fixItemData.isLoaded) {
                        this.notify('DRAG_DROP_NOT_ALLOWED_FIXTURE_IS_LOADING', 'Ok');
                        return false;
                    } else {
                        if (fixItemData.isPOGDataReturnFail) {
                            const notAllowedMsg = 'DRAG_DROP_NOT_ALLOWED_FIXTURE_NOT_LOADED_PROPERLY';
                            this.notify(notAllowedMsg, 'Ok');
                            return false;
                        } else {
                            if (this.panelService.ActivePanelInfo.view != 'panelView') {
                                this.notify('DRAG_DROP_DISABLED', 'Ok');
                                return false;
                            }
                        }
                    }
                }
            }
        }
        return true;
    }

    private canDragProductLibrary(args: ICanDragArgs): boolean {
        var activeSectionID = this.sharedService.getActiveSectionId();

        if (this.sharedService.checkIfAssortMode('new-position-add')) {
            this.notify('DRAG_DROP_PRODUCT_DISABLED', 'Ok');
            return false;
        } else if (args.data.$id.includes('grid') && this.productlibraryservice.selectedProductList.length == 0) {
            this.notify('PLEASE_SELECT_AN_ITEM_FIRST', 'Ok');
            return false;
        } else {
            if (activeSectionID == '') {
                this.notify('PLEASE_LOAD_THE_PLANOGRAM_FIRST', 'Ok');
                return false;
            } else {
                var rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as Section;
                if (this.planogramHelperService.checkIfReadonly(rootObject.IDPOG)) {
                    this.notify('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM', 'Ok');
                    return false;
                }
                // getActiveComponent does not account for side by side, dnd takes care if no planogram is open.
                else {
                    if (this.panelService.ActivePanelInfo.view != 'panelView') {
                        this.notify('DRAG_DROP_DISABLED', 'Ok');
                        return false;
                    }
                }
            }
        }
        return true;
    }

    private canDragClipBoard(args: ICanDragArgs): boolean {
        this.isShoppingCartItemDragging = this.isPositionDragging = false;
        var activeSectionID = this.sharedService.getActiveSectionId();
        var rootObject = this.sharedService.getObject(activeSectionID, activeSectionID) as Section;
        if (this.planogramHelperService.checkIfReadonly(rootObject.IDPOG)) {
            this.notify('DRAG_DROP_DISABLED_IN_READ_ONLY_PLANOGRAM', 'Ok');
            return false;
        }
        if(this.planogramService.rootFlags[this.sectionID].isModularView){
            this.notify('DRAG_DROP_DISABLED_IN_MODULAR_VIEW', 'Ok');
            return false;
        }
        return true;
    }

    private canDragPlanogramItem(args: ICanDragArgs): boolean {
        let objData = this.getObject(args.data);
        // TODO WIP intersection chooser

        /**
         * When a fixture overlaps on top an postion, we check if user is trying to drag the postion, and switch the dragging item to the postion item.
         * If position intersection is detected, then set that position as the dragging item.
         */
        if (args.data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
            this.intersectionChooserHandlerService.initiate(this.sectionId, args.event, this.sectionId);
            let objectsIntersect = this.intersectionChooserHandlerService.rootFlags[this.sectionId].objectIntersecting;
            if (objectsIntersect.length > 0) {
                let positionsIntersect =
                    this.intersectionChooserHandlerService.rootFlags[this.sectionId].storage.Position;
                if (positionsIntersect.length > 0) {
                    // multiple items drag.
                    let selectedPositions = this.planogramService.getSelectedObject(this.sectionID);
                    if (selectedPositions.length <= 1) {
                        this.planogramService.removeAllSelection(this.sectionId);
                        this.planogramService.addToSelectionById(positionsIntersect[0].$id, this.sectionId);
                    }
                    args.data.$id = positionsIntersect[0].$id;
                    args.data.ObjectDerivedType = AppConstantSpace.POSITIONOBJECT;
                    objData = this.getObject(args.data);
                }
            }
        }
        //Need to comment this out
        // if clone mode is on, need to create duplicates of the same item.
        if (this.isCloneMode && args.data.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            objData = _.cloneDeep(objData);
        }
        objData.dragOriginatedFrom = args.data.dragOriginatedFrom;
        // depending on the object type we set it to a variable
        this.setDragItem(objData, args.event);

        const rootObject = this.getSectionObject(args.data.$sectionID);

        const planogramSettingObj = this.planogramService.rootFlags[this.sectionId];
        var blurInfo = this.dragDropUtilsService.findBlurInfo(this.sectionID);
        var inActivePanelInfo = this.panelService.panelPointer[{[PanelIds.One]:PanelIds.Two, [PanelIds.Two]:PanelIds.One}[blurInfo.activePanelId]];
        var modularViewCheck = (this.planogramService.rootFlags[this.sectionID].isModularView && this.planogramService.rootFlags[blurInfo.inactiveSectionId]?.isModularView)
                                || !(this.planogramService.rootFlags[this.sectionID].isModularView || this.planogramService.rootFlags[blurInfo.inactiveSectionId]?.isModularView);
        var canInactivePanelBeDropped = inActivePanelInfo?.IDPOG && !this.planogramHelperService.checkIfReadonly(inActivePanelInfo?.IDPOG)
        &&  inActivePanelInfo?.componentID == PlanogramView.PLANOGRAM
        && modularViewCheck;
        if (this.planogramHelperService.checkIfReadonly(rootObject.IDPOG) && !canInactivePanelBeDropped) {
          if(!modularViewCheck){
            this.notify('DRAG_DROP_NOT_ALLOWED_IF_BOTH_POG_IN_MODULAR_VIEW', 'Ok');
            return false;
          }else
            this.notify('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM', 'Ok');
            return false;
        }
        if (
            rootObject.LKFixtureMovement == FixtureMovement.Lock &&
            !this.isBayDragging &&
            Utils.checkIfFixture(this.dragItemData)
        ) {
            return false;
        }
        if (this.parentApp.isNiciMode) {
            var itemP = objData;
            if (itemP.ObjectType == AppConstantSpace.POSITIONOBJECT) {
                //var p = this.sharedService.getParentObject(itemP, this.sharedService.activeSectionID);
                if (!this.isShoppingCartItemDragging) {
                    if (itemP.Position.attributeObject.RecADRI != 'A') {
                        return false;
                    } else if (this.isShoppingCartItemDragging && !itemP.Position.canDragFlag) { //Need to check with karthik about the condition check !this.isShoppingCartItemDragging
                        return false;
                    }
                }
            } else {
                return false;
            }
        } else {
        }
        //If the item is not selected and if it is multi selection don't allow drag
        if (
            !this.hasItemSelected &&
            this.isPositionDragging &&
            this.planogramService.getSelectionCount(this.sectionId) > 1
        ) {
            return false;
        }
        // Canceling the Dragging
        //1. if shelf key pressed - for panning
        //2. if readonly mode
        //3. if bay is dragging and its not selected
        //4. CTRL + ShoppingCart Dragging
        //5. Rubber Band mode
        if (args.event.ctrlKey && this.isShoppingCartItemDragging) {
            return false;
        }

        if ((args.event.shiftKey && !args.event.ctrlKey) ||
            this.planogramStore.appSettings.isReadOnly ||
            (this.isBayDragging && !this.hasItemSelected)
        ) {
            return false;
        }
        if (
            this.planogramStore.appSettings.disableDeletedScItem &&
            this.isShoppingCartItemDragging && !this.dragItemData.Position.canDragFlag
        ) {
            return false;
        }
        if (planogramSettingObj.isModularView && (this.isStandShelfDragging || this.isPositionDragging)) {
            return false;
        }
        if (Utils.isRubberBandDrag || Utils.isFreeFlowDrag) {
            return false;
        }
        if (
            this.isStandShelfDragging ||
            this.isBayDragging ||
            this.isBlockFixtureDragging ||
            this.isPegBoardDragging ||
            this.isSlotwallDragging ||
            this.isCrossbarDragging ||
            this.isCoffinCaseDragging ||
            this.isBasketDragging
        ) {
            //multiple drag on fixtures not allowed
            if (this.planogramService.getSelectionCount(this.sectionId) > 1) {
                this.notify('MULTIPLE_FIXTURE_DRAG_DROP_NOT_ALLOWED', 'Ok');
                return false;
            }
        }
        if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            //this is when we use jQuery helper to clone the first draggable element
            //this is to ensure the element doesnt get dragged by default
            if (this.isCloneMode) {
                if (
                    (this.multiDragableElementsList.length > 1 &&
                        this.multiDragableElementsList.filter(function (pos) {
                            return pos.baseItem;
                        }).length > 0) ||
                    this.dragItemData.baseItem
                ) {
                    return false;
                }
            }
            if (
                (this.multiDragableElementsList.length > 1 &&
                    this.multiDragableElementsList.filter(function (pos) {
                        return pos.baseItem || pos.hasAboveItem || pos.hasBackItem;
                    }).length > 0) ||
                this.dragItemData.hasBackItem ||
                this.dragItemData.hasAboveItem
            ) {
                return false;
            }
        }
        if (args.data.ObjectDerivedType == AppConstantSpace.ANNOTATION){
            this.sharedService.selectedAnnotation[this.sectionID].forEach(element => {
                this.planogramService.removeSelectedAnnotation(this.sectionID,element);
                this.planogramService.updateAnnotationSelection.next(true);
            });
            this.planogramService.setSelectedAnnotation(this.sectionID, <Annotation>objData);
            this.planogramService.updateAnnotationSelection.next(true);
        }
        return true;
    }
    private beginClipBoardDrag(args: IBeginDragEventArgs): void {
        this.planogramService.removeAllSelection(this.sectionID);
        let selectedItem = this.clipBoardService.clipboard.filter((clipItem) => clipItem.isSelected === true);
        if (args.data.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            this.setProductDragItem(args);
            let prodList = [];
            if (selectedItem.length < 2 && args) {
                let list = this.clipBoardService.clipboard?.filter(elememt => elememt.clipId === Number(args.data.$id.split('|')[1]));
                list.forEach((clipItem) => {
                    clipItem?.productList?.forEach((element) => {
                        prodList.push(element)
                    })
                })
                this.multiDragableElementsList = this.copyProductItems(prodList);
            } else {
                if (selectedItem.length > 1 && !selectedItem.some((element) => element.ObjectDerivedType !== 'Position')) {
                    if (selectedItem.length) {
                        selectedItem.forEach((element) => {
                            element.productList.forEach((element) => {
                                prodList.push(element);
                            })
                        })
                    }
                    this.multiDragableElementsList = this.copyProductItems(prodList);
                } else {
                    this.dragItemData = null;
                    this.notify('MULTIPLE_CLIPITEM_DRAGGING_IS_ALLOWED_ONLY_FOR_POSITIONS', 'Ok');
                }

            }
        } else {
            if (selectedItem?.length == 1 || (selectedItem?.length == 0 && args)) {
                this.dragItemData = this.getObject(args.data);
                this.multiDragableElementsList = this.copyProductItems(this.dragItemData);
            } else {
                this.notify('MULTIPLE_CLIPITEM_DRAGGING_IS_ALLOWED_ONLY_FOR_POSITIONS', 'Ok');
            }
        }
    }
    // TODO: why the false values are returned from this method? no return type expected.
    private beginProdLibDrag(args: IBeginDragEventArgs) {
        this.setProductDragItem(args);
        let elementScope = { itemData: this.dragItemData };
        this.planogramService.removeAllSelection(this.sectionID);
        if (this.productlibraryservice.selectedProductList.length == 0) {
            const draggedPositionData = [];
            if (elementScope.itemData) {
                draggedPositionData.push(elementScope.itemData);
                this.multiDragableElementsList = this.copyProductItems(draggedPositionData);
            }
        } else {
            this.multiDragableElementsList = this.copyProductItems(this.productlibraryservice.selectedProductList);
        }
        this.imgHTML;
        $('#multipleDragItems')
            .html(
                "<div class='cloned-img-holder " +
                this.getDisplayMode() +
                "' style='left:2px'>" +
                this.imgHTML.imgTagHTML +
                '</div>',
            )
            .css({
                'z-index': 9999,
                position: 'fixed',
                padding: 0,
            });
        //$('#multipleDragItems').show();
        $('#coffinCaseFixtureImg').css('display', 'none');
        this.selector = '#multipleDragItems';
        this.OffsetX = 0;
        this.OffsetY = 0;

        //It will gives you active panelId and inactive sectionIds'
        // let blurInfo = this.dragDropUtilsService.findBlurInfo(this.sectionId);
        // this.dragDropUtilsService.addPanelBluring(blurInfo.activePanelId);
    }
    public beginDrag(args: IBeginDragEventArgs) {
      //after starting the dragging no need to check if it is dropping on the same pog or not.
      //if it is side by side then we should allow to drop on the other pog also.
        //Remove context menu
        this.contextMenuService.removeContextMenu();
        if (!args.data) {
            return;
        }
        Utils.objectDrag = true;
        const dragOrigin = args.data.dragOriginatedFrom;
        switch (dragOrigin) {
            case DragOrigins.ClipBoard:
                this.beginClipBoardDrag(args);
                break;
            case DragOrigins.ProductLibrary:
                this.beginProdLibDrag(args); // TODO: rename to beginDragProductLibraryItem(args)
                break;
            case DragOrigins.ShoppingCart:
            case DragOrigins.Planogram:
                this.beginPlanogramItemDrag(args);
                break;

            case DragOrigins.FixtureGallary:
                this.beginFixtureGalleryItemDrag(args);
                break;
        }
    }
    public beginPlanogramItemDrag(args: IBeginDragEventArgs): void {
        const objData = this.sharedService.getObject(args.data.$id, args.data.$sectionID) as SelectableList | Annotation;
        Utils.objectDrag = true; // TODO: what does this static variable do?
        var rootObject: Section = this.sharedService.getObject(this.dragItemData.$sectionID, this.sectionId) as Section;
        var planogramSettingObj = this.planogramService.rootFlags[this.sectionId];
        // annotation has a different selection mechanism.
        if (!objData.selected) {
            this.zone.run(() => {
                this.planogramService.removeAllSelection(this.sectionId);
                if (objData.ObjectDerivedType == AppConstantSpace.ANNOTATION) {
                    this.planogramService.setSelectedAnnotation(this.sectionID, <Annotation>objData);
                    this.planogramService.updateAnnotationSelection.next(true);
                } else {
                    this.planogramService.addToSelectionByObject(<SelectableList>objData, this.sectionId);
                }
            })
        }
        this.multiDragableElementsList = this.planogramService.getSelectedObject(objData.$sectionID);
        if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            //this is when we use jQuery helper to clone the first draggable element
            //this is to ensure the element doesnt get dragged by default
            if (this.isCloneMode) {
                this.multiDragableElementsList = this.ctrlDragClonePositions(
                    this.planogramService.getSelectedObject(this.sectionId),
                );
                this.checkIfAllItemsFromSameShelf();
                //when cloned then we toggle draggable jquery helper clone
                //then we hide the extra cloned div created by jQuery
                //$(ui.helper).hide();
                //$(ui.helper).css('display', 'none');
            } else {
                this.multiDragableElementsList = this.planogramService.getSelectedObject(this.sectionId);
                this.multiDragableElementsList =
                    this.planogramStore.appSettings.disableDeletedScItem && this.isShoppingCartItemDragging
                        ? _.filter(this.multiDragableElementsList, function (o) {
                            return o.Position.canDragFlag;
                        })
                        : this.multiDragableElementsList;
                //Checking all the dragged elements are from same fixture or not, same peg or not
                //This will be used when creating ghostImages,
                this.checkIfAllItemsFromSameShelf();
                planogramSettingObj.ctrlDragClonedPositions = [];
            }
        }
        //no need to use blurInfo as we are allowing to drop from one pog to another pog
        //var blurInfo = this.dragDropUtilsService.findBlurInfo(this.sectionId);
        if (Utils.checkIfPosition(this.dragItemData) && !this.isShoppingCartItemDragging) {
            let position = objData as Position;
            let dragParentItemdata = this.sharedService.getObject(position.$idParent, args.data.$sectionID);
            //args.event = args.event as DragEvent;
            var initDropCords = this.fixtureDropPoint(
                dragParentItemdata,
                args.event.clientX,
                args.event.clientY,
                rootObject.IDPOG,
                this.scaleFactor, //No change in scale factor@Naren
                args.data,
            );
            //isByCoordinate will be known from element scope data
            this.dragDropUtilsService.setOffsets(this, initDropCords, false);
        }
        //setting active planogram
        if (this.sharedService.getActiveSectionId() != this.sectionId) {
            this.informationConsoleLogService.resetAllLog();
            this.informationConsoleLogService.setClientLog([], rootObject.IDPOG);
            this.sharedService.setActiveSectionId(this.sectionId);
        }
        //Bay dragging in Span Across Shelfs, Disable the SpanAcrossShelfs mode and it will set spread span again back after brop
        if (planogramSettingObj.isModularView && this.isBayDragging && rootObject._IsSpanAcrossShelf.FlagData) {
            rootObject._IsSpanAcrossShelf.FlagData = false;
            this.isBayDragUsecase = true;
        }
        if (
            this.isStandShelfDragging ||
            this.isPegBoardDragging ||
            this.isSlotwallDragging ||
            this.isCrossbarDragging ||
            this.isBlockFixtureDragging ||
            this.isCoffinCaseDragging ||
            this.isBasketDragging
        ) {
            //@todo - Commented to be removed
            // this.dragDropUtilsService.toggleChildrenDragIfBay(scope.isModularView, this.sectionId);
            //update x,y axis dragging capability of draggable shelf depnding on "Fixture Movement"
            this.dragDropUtilsService.updateFixtureMovement(rootObject.LKFixtureMovement, this.sectionId);
        }

        if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            //we make sure intersection pop is closed first
            this.intersectionChooserHandlerService.closePop(this.sectionId, true);
            //it will create ghost image need to enable it
            //Multiple ghost images are generating one drgging over SS and other over pegboard
            $('#multipleDragItems')
                .html(
                    "<div class='cloned-img-holder " +
                    this.getDisplayMode() +
                    "' style='left:2px'>" +
                    this.imgHTML.imgTagHTML +
                    '</div>',
                )
                .css({
                    'z-index': 9999,
                    position: 'fixed',
                    padding: 0,
                    display: 'block',
                });
            //$('#multipleDragItems').hide();
            //$('#multipleDragItems').css('display', 'none');
            $('#multiplePegDragItems')
                .html(
                    "<div class='cloned-img-holder " +
                    this.getDisplayMode() +
                    "' style='left:2px'>" +
                    this.imgHTML.pegImgTagHTML.pegImgTagHTML +
                    '</div>',
                )
                .css({
                    'z-index': 9999,
                    position: 'fixed',
                    padding: 0,
                });
            $('#multiplePegDragItems').css('display', 'none');
            $('#coffinCaseFixtureImg').css('display', 'none');
            $('#multipleCoffinCaseDragItems')
                .html(
                    "<div class='cloned-img-holder " +
                    this.getDisplayMode() +
                    "' style='left:2px'>" +
                    this.imgHTML.coffinImgTagHTML +
                    '</div>',
                )
                .css({
                    'z-index': 9999,
                    position: 'fixed',
                    padding: 0,
                });
            $('#multipleCoffinCaseDragItems').css('display', 'none');
            //As if drag is starting from non droppable area normalghost image should be visible
            this.selector = '#multipleDragItems';
            this.OffsetX = 0;
            this.OffsetY = 0;
        }
        //this.callEventCallback(scope, dragSettings.onStart, event, ui);
        //Drag start setcursor based on drag type
        if (this.isBayDragging) {
            //$('body').css('cursor', 'e-resize')
            document.body.style.cursor = 'e-resize';
            this.cursorsStyle = 'e-resize';
        } else if (
            this.isStandShelfDragging ||
            this.isPegBoardDragging ||
            this.isBlockFixtureDragging ||
            this.isGalleryDragging ||
            this.isCrossbarDragging ||
            this.isSlotwallDragging ||
            this.isCoffinCaseDragging ||
            this.isBasketDragging
        ) {
            document.body.style.cursor = 'move !important';
            this.cursorsStyle = 'move !important';
        } else if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            //$('body').css('cursor', 'crosshair !important');
            document.body.style.cursor = 'move !important';
            //window.setTimeout(document.body.style.cursor = 'crosshair', 1);
            this.cursorsStyle = 'move !important';
        }
        /** @karthik Only item remaining is annotation. is this else even required? */
        // else {
        //     this.cursorsStyle = document.body.style.cursor = 'no-drop';
        // }

        //setting cursor value ends here

        //this.dragDropUtilsService.addPanelBluring(blurInfo.activePanelId);
    }

    private ctrlDragClonePositions = function (selectedObjsList: SelectableList[]): Position[] {
        let clonedItems: Position[] = [];
        if (selectedObjsList.length > 0) {
            selectedObjsList.forEach((item) => {
                if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    var copyItem = _.cloneDeep(item);
                    clonedItems.push(copyItem);
                }
            });
        }
        return clonedItems;
    };

    private beginFixtureGalleryItemDrag(args: IBeginDragEventArgs): void {
        Utils.objectDrag = true;
        // Reseting All GlobalVariables
        //var elementScope = angular.element(this).scope();
        // Clipboard related handling.
        var fixItemData = this.getObject(args.data); //elementScope.itemData ? elementScope.itemData : elementScope.clipItem.fixture;
        //elementScope.itemData = fixItemData;

        this.initGlobalVariables();

        // depending on the object type we set it to a variable
        this.setItemForFixtureGalary(fixItemData, event);
        this.planogramService.removeAllSelection(this.sectionID);
        //this.dragDropUtilsService.startFix(ui, this.scaleFactor);

        //angular.element(this).show().css('z-index', this.dragDropUtilsService.getNextZIndex());
        //DialogButtonControl.closeDialogOnDrag('fixt');

        // toggling the Drop Area based on Drag Object Type (Position/Bay/Shelf/shopping Cart)
        //this.dragDropUtilsService.findAndEnableDroppableArea(this);
        //var svg = ui.helper.find("svg");
        //this.dragDropUtilsService.setFixtureGalleryGhostImages(event, this, (svg && svg.length) ? svg[0].outerHTML : null);
        //var planogramSettingObj = planogramSettings.rootFlags[this.sectionId];
        //planogramSettingObj.enableAutoPanning();

        //this.callEventCallback(scope, dragSettings.onStart, event, ui);
    }

    public endDrag() {
        // clear out preview container
        const previewEle = document.querySelector('#preview-image');
        if (previewEle) {
            previewEle.innerHTML = '';
        }
        document.querySelector('body').classList.remove('cloneMode');
        setTimeout(function () {
            Utils.objectDrag = false;
        });
        this.previewOffsetY = this.previewOffsetX = this.previewHeight = 0;
        //TODO @karthik this service should not change cursors on the fly. #127422
        // reset cursor
        this.cursorsStyle = document.body.style.cursor = 'auto';

        //this.dragDropUtilsService.removePanelBluring();
    }

    public hover(hoverTargets: ITargetInfo[], isDragging: boolean): void {
      if (!isDragging || !this.isFromCoffinCase || this.multiDragableElementsList.length == 1) {
        return;
      }
      const fixtureList = [
        AppConstantSpace.STANDARDSHELFOBJ,
        AppConstantSpace.PEGBOARDOBJ,
        AppConstantSpace.BLOCK_FIXTURE,
        AppConstantSpace.SLOTWALLOBJ,
        AppConstantSpace.CROSSBAROBJ,
        AppConstantSpace.COFFINCASEOBJ,
        AppConstantSpace.BASKETOBJ
      ];
      let preview: HTMLElement = document.querySelector('#preview-image');
      let uniqueTargets = [...new Set(hoverTargets.map(item => item.targetData))] as any;
      this.hoveringOnCoffincase = false;
      uniqueTargets = uniqueTargets.filter(fixt => fixtureList.includes(fixt.ObjectDerivedType));
      uniqueTargets?.forEach(target => {
        if (target.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ || target.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ || target.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ) {
          if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            preview.innerHTML = this.imgHTML.imgTagHTML;
            return;
          }
        } else if (target.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ || target.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
          if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            this.hoveringOnCoffincase = true;
            if (this.isFromSS) {
              preview.innerHTML = this.imgHTML.pegImgTagHTML.pegImgTagHTML;
              return;
            } else if (this.isShoppingCartItemDragging || this.isFromDiffPeg || !this.isFromSameFixture || !this.isFromSameParent) {
              preview.innerHTML = this.imgHTML.imgTagHTML;
              return;
            } else {
              preview.innerHTML = this.imgHTML.pegImgTagHTML.pegImgTagHTML;
              return;
            }
          }
        } else {
          if (this.isFromDiffPeg || !this.isFromSameFixture || !this.isFromSS || target?.Fixture?.LKCrunchMode == 5) {
            preview.innerHTML = this.imgHTML.imgTagHTML;
            return;
          }
          if (this.isPositionDragging || this.isShoppingCartItemDragging) {
            preview.innerHTML = this.imgHTML.imgTagHTML;
            return;
          }
        }
      });
      if (this.isFromSamePeg && uniqueTargets.length == 0) {
        this.hoveringOnCoffincase = true;
        preview.innerHTML = this.imgHTML.pegImgTagHTML.pegImgTagHTML;
        return;
      }
    }

    public canDrop(args: ICanDropEventArgs): boolean {
        if (!args || !args.targetData) {
            return false;
        }
        if([DragOrigins.ProductLibrary, DragOrigins.FixtureGallary, DragOrigins.ClipBoard].indexOf(args.sourceData.dragOriginatedFrom) != -1 && this.sharedService.activeSectionID != args.targetData.$sectionID) {
          return false;
        }
        if (this.planogramStore.appSettings.canValidatePeggable) {
            if (AppConstantSpace.PEGBOARDOBJ == args.targetData.ObjectDerivedType ||
              AppConstantSpace.CROSSBAROBJ == args.targetData.ObjectDerivedType ||
              AppConstantSpace.SLOTWALLOBJ == args.targetData.ObjectDerivedType) {
                let errorFlag: boolean = true;
                if (args.sourceData.dragOriginatedFrom == 3 || args.sourceData.dragOriginatedFrom == 5) {
                  for (const item of this.multiDragableElementsList) {
                    const isPeggable = !Utils.isNullOrEmpty(item.ProductPackage?.XPegHole) && item.ProductPackage?.XPegHole > 0
                      && !Utils.isNullOrEmpty(item.ProductPackage?.YPegHole) && item.ProductPackage?.YPegHole > 0
                    if (!isPeggable) {
                      errorFlag = false;
                      this.notifyService.warn('PLEASE_SELECT_ONLY_PEGGABLE_ITEMS');
                      break;
                    }
                  }
                } else {
                    for (const item of this.multiDragableElementsList) {
                        if (!item.Position.IsPeggable) {
                            errorFlag = false;
                            this.notifyService.warn('PLEASE_SELECT_ONLY_PEGGABLE_ITEMS');
                            break;
                        }
                    }
                }
                return errorFlag;
            }
        }
        //get drop target section object
        var dropTargetSection = this.getSectionObject(args.targetData.$sectionID) as Section;
        //Need to check if target pog is readonly or not
        if (this.planogramHelperService.checkIfReadonly(dropTargetSection.IDPOG)) {
          this.notifyService.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
          return false;
        }
        //Check if source section is not in modular and dropped section is in modular mode then return false
        let isInValidHeighDepth = false;
        const activeSection = this.getSourceSectionObject();
        if ((this.planogramService.rootFlags[this.sectionID].isModularView && this.planogramService.rootFlags[args.targetData.$sectionID].isModularView
          && (dropTargetSection.Dimension.Height !== this.dragItemData.Dimension.Height || dropTargetSection.Dimension.Depth !== this.dragItemData.Dimension.Depth) && (isInValidHeighDepth = true))
          || this.planogramService.rootFlags[this.sectionID].isModularView != this.planogramService.rootFlags[args.targetData.$sectionID].isModularView
        ){
          if(isInValidHeighDepth){
            this.notifyService.warn('DROP_FAILED_DUE_TO_BAY_SECTION_DIMENSION_MISMATCH');
          }else
          this.notifyService.warn('BOTH_PLANOGRAM_SHOULD_BE_IN_MODULAR_MODE_TO_DROP');
          return false;
        }
        //const dropTarget: IDragDropData = args.targetData;
        //We should allow to drop on the same pog or other pog
        // if (dropTarget.$sectionID !== this.sharedService.activeSectionID) {
        //     // Can't drop to inactive section
        //     return false;
        // }
        return true;
    }

    public drop(args:IDropEventArgs): void {
      // PA on drop from clipboard or productLibrary validate product if item is setup for the divisions.
      if(this.parentApp.isAllocateApp && [DragOrigins.ClipBoard,DragOrigins.ProductLibrary].includes(args.sourceData.dragOriginatedFrom)) {
        this.allocateValidation.validateProducts(this.multiDragableElementsList).subscribe((response) => {
          if(response) {
            this.dropItems(args);
          }
        })
      } else {
        //validate if the dropped product is already available in cart
        const isRemoveFromCartEnabled = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.find(set => set.KeyName === 'REMOVE_POSITION_FROM_CART')?.KeyValue;
        let duplicateItems = false;
        if(!isRemoveFromCartEnabled && args.sourceData.dragOriginatedFrom != DragOrigins.FixtureGallary && args.sourceData.$sectionID != args.targetData.$sectionID) {
          //get target section
          let targetSection = this.getSectionObject(args.targetData.$sectionID) as Section;
          const cartObj = Utils.getShoppingCartObj(targetSection.Children);
          //create recursive function to loop through the multidragabbleelementlist and check if the product is already present in cart
          let eachRecursive = (dragItems)=> {
            dragItems.forEach((item)=> {
              args.sourceData.dragOriginatedFrom == DragOrigins.ClipBoard && !item.ObjectDerivedType && (item = item.temp?.copiedFromPos);
              if(item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                duplicateItems = cartObj.checkProductPresentInCart(item, this.isProductPositionDragging);
                if(duplicateItems) {
                  this.notifyService.warn('PRODUCT_ALREADY_EXISTS_IN_CART');
                  return;
                }
              }
              if(item.Children && item.Children.length > 0) {
                eachRecursive(item.Children);
              }
            });
          }
          eachRecursive(this.multiDragableElementsList.length > 0 ? this.multiDragableElementsList : [this.dragItemData]);
        }
        !duplicateItems && this.dropItems(args);
      }
    }
    //create a function to add unit dimensions to target section if it is not there
    //if it is there then clone the unit dimensions and add it to target section
    //clone the annotation and add it to target section
    private addUnitDimensionsToTargetSection(pos: Position[], sourceSection?: Section, targetSection?: Section): void{

      if(!this.isdroppedinDiffPOG || this.skipCopyPositions){
        return;
      }
      sourceSection = sourceSection || this.getSectionObject(this.sectionID) as Section;
      targetSection = targetSection || this.getSectionObject(this.dropTargetSectionId) as Section;
      //get source section object
      var eachRecursive = (dragItems)=> {
        dragItems.forEach((item)=> {
          if(item.asPosition()){
            let targetUnitDimensions = item.isPosition && targetSection.UnitPackageItemInfos && targetSection.UnitPackageItemInfos.filter(itm=>itm.IDProduct == (item?.Product?.IDProduct || item.Position.IDProduct))[0];
            if(!targetUnitDimensions){
              //need to check if target section is having same idproduct at UnitPackageItemInfos or not, if it is not there
              //need to clone source unit dimensions and add it to target section UnitPackageItemInfos
              let unitDimensions = sourceSection.UnitPackageItemInfos.filter(itm=>itm.IDProduct == (item?.Product?.IDProduct || item.Position.IDProduct))[0];
              if(unitDimensions){
                let clonedUnitDimensions = _.cloneDeep(unitDimensions);
                targetSection.UnitPackageItemInfos.push(clonedUnitDimensions);
                item.unitPackageItemInfos = clonedUnitDimensions;
              }
            }
          }
          if(item.Children && item.Children.length > 0) {
            eachRecursive(item.Children);
          }
        });
      }
      eachRecursive(pos);
    }
    private cloneAnnotation(): void{
      if(!this.isdroppedinDiffPOG){
        return;
      }
      //get source section object
      var sourceSection = this.getSectionObject(this.sectionID) as Section;
      let targetSection = this.getSectionObject(this.dropTargetSectionId) as Section;
      var eachRecursive = (dragItems)=>{
        dragItems.forEach((item)=>{
          let annotation = item.copiedfrom?.id && this.sourceDragItemsMap.get(item.copiedfrom?.id);
          //this can be removed later once we understood that we cover all the cases.
          this.addUnitDimensionsToTargetSection([item], sourceSection, targetSection);
          if(annotation){
            let clonedAnnotation = _.cloneDeep(annotation);
            clonedAnnotation.IdPogObjectExtn = null;
            clonedAnnotation.status = 'insert';
            this.annotationService.addAnnotation(clonedAnnotation, targetSection, item);
          }
          if(item.Children && item.Children.length > 0){
            eachRecursive(item.Children);
          }
        });
      }
      eachRecursive(this.multiDragableElementsList);
    }
    private dropItems(args: IDropEventArgs): void {
        const dragSource: IDragDropData = args.sourceData;
        const clientOffset = args.clientOffset;
        let dropTarget: IDragDropData = args.targetData;
        let object = this.sharedService.getObject(args.targetData.$id, args.targetData.$sectionID);
        this.dropTargetSectionId = dropTarget.$sectionID;
        //for pegboard,slotwall,crossbar mousepointer snaps properly no need of clientoffset modification
        this.isdroppedinDiffPOG = this.sectionID != this.dropTargetSectionId;
        //TODO check why there is always 6 pts difference while dropping on non std fixtures.
        const dragSourceData =
            (this.isCloneMode || this.isdroppedinDiffPOG) && args.sourceData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
                ? _.cloneDeep(this.getObject(dragSource))
                : this.getObject(dragSource);
        //Need to clone all the items if it is from different pog
        if (this.isdroppedinDiffPOG) {
          this.sourceDragItems = [...this.multiDragableElementsList];
          this.multiDragableElementsList = this.copyProductItems(this.multiDragableElementsList);
          this.sourceDragItemsMap = new Map();
          //get key value pair of all the items with $id and each item. Go thorugh the multidragabbleelementlist recursively
          //and for keyvalue pair, where key is $id and value is item
          var sourceSection = this.getSectionObject(this.sectionID) as Section;
          let eachRecursive = (dragItems)=>{
            dragItems.forEach((item)=>{
                item.copiedfrom = {id: item.$id, IDPOGObject: item.IDPOGObject, tempId: item.tempId}
                let annotation = sourceSection.getAnnotation(item.$id);
              this.sourceDragItemsMap.set(item.$id, annotation);
              if(item.Children && item.Children.length > 0){
                eachRecursive(item.Children);
              }
            });
          }
          eachRecursive(this.multiDragableElementsList);
        }

        var basepos = document.getElementById('sectionContainer_' + this.dropTargetSectionId).getBoundingClientRect();
        let x = this.planogramService.convertToUnit(
            (clientOffset.x - basepos.x) / this.targetSaceleFactor,
            this.dropTargetSectionId,
        );
        let y = this.planogramService.convertToUnit(
            (clientOffset.y - basepos.y) / this.targetSaceleFactor,
            this.dropTargetSectionId,
        );

        //Added this code to get droppable object if two fix are intersecting e.g pegboard and standred shelf
        if (this.isProductPositionDragging || args.sourceData.dragOriginatedFrom == DragOrigins.ClipBoard) {
            const qds = { x: x, y: y, width: 0.1, height: 0.1, id: args.targetData.$id };
            let quad = this.quadtreeUtils.findingIntersectionsAtBound(args.targetData.$sectionID, qds);
            let droppableObj = this.getDroppableObect(quad, object as FixtureList) ? this.getDroppableObect(quad, object as FixtureList) : args.targetData;
            dropTarget.$id = droppableObj.$id
            dropTarget.$sectionID = droppableObj.$sectionID;
            dropTarget.ObjectDerivedType = droppableObj.ObjectDerivedType;
        }
        const dropTargetData = this.getObject(dropTarget);
        //Dragdrop.js code
        this.isPogObjDragging = false;
        $('body').css('cursor', 'auto');
        $('#multipleDragItems').css('display', 'none');
        $('#multiplePegDragItems').css('display', 'none');
        $('#multipleCoffinCaseDragItems').css('display', 'none');
        $('#merchandisingareaSeparator').css('display', 'none');
        $('#coffinCaseFixtureImg').css('display', 'none');

        this.droppedFlg = true;
        this.dropClientX = clientOffset.x;
        this.dropClientY = clientOffset.y;
        // annotation drop
        if (args.sourceData.ObjectDerivedType == AppConstantSpace.ANNOTATION) {
            this.dropAnnotation(args, dragSourceData);
            return;
        }

        //Need to check once autopanning is enabled.
        //var planogramSettingObj = planogramSettings.rootFlags[this.sectionId];
        ////when item dropped disable auto panning
        //planogramSettingObj.disableAutoPanning();
        //if (this.cancelDragging) {
        //  this.cancelDragging = false;
        //  this.dragDropUtilsService.revertBackItems(this);
        //  if (this.isBayDragUsecase) {
        //    //var rootObject = this.sharedService.getRootObject(this.dragItemData, this.sectionId);

        //    rootObject._IsSpanAcrossShelf.FlagData = true;
        //    this.isBayDragUsecase = false;
        //    rootObject.setSpreadSpanStandardshelfs();
        //  }
        //  return;
        //};

        const section = this.getSectionObject(this.dropTargetSectionId) as Section;

        const quads = { x: x, y: y, width: 0.1, height: 0.1, id: dropTarget.$id };
        var obj = this.quadtreeUtils.findingIntersectionsAtBound(this.dropTargetSectionId, quads);
        this.log.info('Dropped on ', quads, obj);
        let historyId, uniqueId;
        this.recordHistoryInTargetOnly = false;
        //skip copiing positions if it is in clone mode and shift mode and origin is not clipboard
         if(this.isdroppedinDiffPOG && args.sourceData.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT && this.isCloneMode && this.isShiftMode && args.sourceData.dragOriginatedFrom != DragOrigins.ClipBoard) {
          this.isCloneMode = false;
          this.skipCopyPositions = true;
        }
        //Below condition will allow start recording only when it is not moving from one pog to other pog and not in clone mode and not in move
        if(this.sectionID == this.dropTargetSectionId || (this.isdroppedinDiffPOG && !(this.isCloneMode || this.sharedService.moveOrCopy))) {
          historyId = this.historyService.startRecording();
          (this.isdroppedinDiffPOG) && (uniqueId = this.historyService.startRecording(undefined, this.dropTargetSectionId));
        } else {
          this.recordHistoryInTargetOnly = true;
          historyId = this.historyService.startRecording(undefined, this.dropTargetSectionId);
        }
        if (
            this.isGalleryDragging ||
            (args.sourceData.dragOriginatedFrom == DragOrigins.ClipBoard &&
              args.sourceData.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT || (args.sourceData.ObjectDerivedType !== AppConstantSpace.POSITIONOBJECT && this.isdroppedinDiffPOG))
        ) {
            this.addUnitDimensionsToTargetSection(this.multiDragableElementsList);
            this.invokeDropForFixtureGallery(args);
        } else if (
            this.isProductPositionDragging ||
            (args.sourceData.dragOriginatedFrom == DragOrigins.ClipBoard &&
                args.sourceData.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)
        ) {
            //this needs to be enabled when dropping from clipboard we need to add unit dimensions of it.
            //this.addUnitDimensionsToTargetSection(this.multiDragableElementsList);
            //means product from product lib dragging
            this.invokeDropForProduct(this.dragItemData, dropTargetData);
            if ($('#productListGridID').data('kendoGrid') != undefined) {
                $('#productListGridID').data('kendoGrid').refresh();
            }

            if ($('#product_hierarchy_grid').data('kendoGrid') != undefined) {
                $('#product_hierarchy_grid').data('kendoGrid').refresh();
            }
        } else {
            //invoking drop passing draggable element and droppable element
            //this.invokeDrop(angular.element(this.dragElement), droppable);
            this.dropped(dragSourceData, dropTargetData, x, y);
        }
        // TODO @og stopRecording is taking 2/3 of the time
        if (this.isUndoRequired) {
            //History.undo();
            //History.abandonCaptureActionExec(History.getLastCaptureActionExecTime());
            // TODO @og
            !this.recordHistoryInTargetOnly && (this.isdroppedinDiffPOG) && this.historyService.stopRecording(undefined,undefined,uniqueId,undefined,this.dropTargetSectionId);
            this.historyService.stopRecording(undefined, true, undefined, undefined,this.recordHistoryInTargetOnly?this.dropTargetSectionId:undefined);
        } else if (this.isAbandonLastAction.revertFlag) {
            // TODO @og
            !this.recordHistoryInTargetOnly && (this.isdroppedinDiffPOG) && this.historyService.stopRecording(undefined,undefined,uniqueId,undefined,this.dropTargetSectionId);
            this.historyService.stopRecording(undefined, undefined, historyId, undefined,this.recordHistoryInTargetOnly?this.dropTargetSectionId:undefined);
            this.isAbandonLastAction.historyUniqueID = uniqueId;
            this.planogramService.openIntersectionDialog(this.isAbandonLastAction);
            this.historyService.abandonLastCapturedActionInHistory(historyId, this.dropTargetSectionId);
        }
        else {
            var rootObject = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
            if (rootObject.fitCheck && !(this.isDropfalied)) {
                var draggableData, dropContainer;
                if (!this.isProductPositionDragging && Utils.checkIfFixture(this.dragItemData)) {
                    draggableData = [this.dragItemData];
                } else {
                    draggableData = this.multiDragableElementsList;
                }
                dropContainer = this.getDropContainerItemdata(dropTargetData);
                (this.isGalleryDragging || this.isdroppedinDiffPOG) ? this.planogramService.insertPogIDs(null, true) : this.planogramService.insertPogIDs(draggableData.concat([dropContainer]), true);
            }
            // TODO @og
            !this.recordHistoryInTargetOnly && (this.isdroppedinDiffPOG) && this.historyService.stopRecording(undefined,undefined,uniqueId,undefined,this.dropTargetSectionId);
            this.historyService.stopRecording(undefined, undefined, historyId, undefined,this.recordHistoryInTargetOnly?this.dropTargetSectionId:undefined);
        }
        if(!this.isDropfalied){

          this.cloneAnnotation();
          this.planogramService.updateInInactivePOG = { flag: this.isdroppedinDiffPOG? true : false, sectionID: this.dropTargetSectionId};
          this.sharedService.updateAnnotationPosition.next(true);
          this.planogramService.updateNestedStyleDirty = true;
          this.sharedService.updatePosPropertGrid.next(true);
          this.sharedService.propertyGridUpdateData.next(true);
          this.sharedService.deleteSubscription.next([this.dragItemData]);
          if(this.isdroppedinDiffPOG){
            const blurInfo = this.dragDropUtilsService.findBlurInfo(this.sectionId);
            this.sharedService.setActiveSectionId(this.dropTargetSectionId)
            this.panelService.updatePanel({[PanelIds.One]: PanelIds.Two, [PanelIds.Two]: PanelIds.One}[blurInfo.activePanelId] ,this.dropTargetSectionId);
          }
        }
        //this.historyService.stopRecording(undefined, undefined, historyId);
        //Annontation needs to change there position with drop item
        if (section.annotations.length > 0) {
            this.sharedService.updateAnnotationPosition.next(true);
        }
        // forcing change detection in shelf nested
        this.planogramService.UpdatedSectionObject.next(section);
        this.worksheetGridService.redrawGrid.next(true);
        this.planogramService.refreshModularView.next(true);
        //Re-render item whenever it drop(added due to if standardshelf drop on position then position is not adjusted)
        this.render2d.isDirty = true;
        // Too intensive task TODO optimize
        if (args.sourceData.dragOriginatedFrom == DragOrigins.ProductLibrary || args.sourceData.dragOriginatedFrom == DragOrigins.ShoppingCart) {
            this.sharedService.addProductAfterDrag.next(true);
        }
        this.planogramService.templateRangeModel.count ? this.planogramService.updateDropCount.next(false) : '';
        this.sharedService.showHighlight.next(true);
    }

    private dropAnnotation(args: IDropEventArgs, dragSourceData) {
        const dropTargetSectionId = args.targetData.$sectionID;
        let targetScaleFactor = this.getScaleFactor(dropTargetSectionId);
        let shelfRootObject = this.sharedService.getObject(dropTargetSectionId, dropTargetSectionId) as Section;
        var pogOffSetPX = $('#innerWebPOG_' + shelfRootObject.IDPOG).offset();
        let leftFromLy = this.planogramService.convertToUnit(
            (args.clientOffset.x - pogOffSetPX.left) / targetScaleFactor,
            dropTargetSectionId,
        );
        let topFromTy = this.planogramService.convertToUnit(
            (args.clientOffset.y - pogOffSetPX.top) / targetScaleFactor,
            dropTargetSectionId,
        );
        var newTop = shelfRootObject.getAnnotationDimensionTop() + shelfRootObject.Dimension.Height - topFromTy;
        var newLeft = leftFromLy - shelfRootObject.getAnnotationDimensionLeft();
        const isPOGReadonly = this.planogramStore.appSettings.isReadOnly;
        if (!isPOGReadonly) {
            var unqHistoryID = this.historyService.startRecording();
            var original = ((annotation, top, left) => {
                return () => {
                    annotation.setTop(top);
                    annotation.setLeft(left);
                };
            })(dragSourceData, newTop, newLeft);
            var revert = ((annotation, top, left) => {
                return () => {
                    annotation.setTop(top);
                    annotation.setLeft(left);
                };
            })(dragSourceData, dragSourceData.top(), dragSourceData.left());
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'MoveAnnotation',
            });
            this.historyService.stopRecording(undefined, undefined, unqHistoryID);
            //*******
        }
        dragSourceData.setTop(newTop);
        dragSourceData.setLeft(newLeft);
        this.annotationService.annotationAreaChanged = shelfRootObject.computeAnnotationDimension();
        this.sharedService.updateAnnotationPosition.next(true);
        if (isPOGReadonly) {
            this.planogramService.saveAnnotationforReadonlyPlanogram(dragSourceData);
        }
    }

    public setupMixins(parentObj, shelfItemData) {
        var fixtureObj = shelfItemData || this.dragItemData,
            that = this;
        var sectionID = parentObj.$sectionID;
        var eachRecursive = function (obj, parent) {
            try {
                if (obj.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                    that.planogramService.prepareModelFixture(obj, parent);
                } else if (Utils.checkIfPosition(obj)) {
                    that.planogramService.prepareModelPosition(obj, parentObj);
                }
                that.planogramCommonService.extend(obj, true, sectionID);
                that.planogramCommonService.setParent(obj, parent);
            } catch (e) {
                console.error('Error while setupmixins in adding new position');
                // $log.error(e);
            }
            if (obj?.hasOwnProperty('Children')) {
                obj.Children.forEach(function (child, key) {
                    //extendingFixture(child);
                    eachRecursive(child, obj);
                }, obj);
            }
        };
        eachRecursive.call(this, fixtureObj, parentObj);
    }
    public invokeDropForFixtureGallery(args: IDropEventArgs) {
        var rootObject = this.getSectionObject(args.targetData.$sectionID) as Section;
        var droppedOverObj = rootObject;
        var isBayPresents = rootObject.isBayPresents;
        var shelfItemData = _.cloneDeep(this.multiDragableElementsList[0] || this.dragItemData);
        if (shelfItemData?.ObjectDerivedType === AppConstantSpace.MODULAR) {
            var dragBayXPosToPog = this.findFixtureXPosToPog(shelfItemData, rootObject.IDPOG, this.targetSaceleFactor);
            var bayTo = shelfItemData.findIntersectBayAtXpos(dragBayXPosToPog, rootObject.Children);
            var toIndex = rootObject.Children.indexOf(bayTo);
            if (
                rootObject.LKCrunchMode == CrunchMode.Right ||
                rootObject.LKCrunchMode == CrunchMode.SpanRight
            ) {
                toIndex++;
            }
            for (var i = 0; i < [shelfItemData].length; i++) {
                var copiedModular = shelfItemData;
                const modularTemplate = this.planogramStore.modularTemplate;
                modularTemplate.Fixture.IsMovable = true;
                modularTemplate.Fixture.IsMerchandisable = false;
                rootObject.duplicateModulars(modularTemplate, {
                    noOfMoudlars: 1,
                    modularWidth: copiedModular.Dimension.Width,
                    duplicateFixtures: true,
                    duplicatePositions: this.skipCopyPositions ? false : true,
                    duplicateFacings: true,
                    toIndex: toIndex,
                    copiedModular: copiedModular,
                });
            }
            let copiedfrom = {id: shelfItemData.$id, IDPOGObject: shelfItemData.IDPOGObject, tempId: shelfItemData.tempId};
            shelfItemData = rootObject.getModularByIndex(toIndex - 1);
            copiedfrom.tempId = shelfItemData.tempId;
            shelfItemData.copiedfrom = copiedfrom;
        } else {
          //check if need to remove/skip the positions from the dropped fixture
          if (this.skipCopyPositions) {
            //check if dragged item is fixture or not then check if it has any positions
            if (Utils.checkIfFixture(shelfItemData) && shelfItemData.Children.length > 0) {
              //remove the positions from the fixture
              shelfItemData.Children = shelfItemData.Children.filter(item => item.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT);
            }
          }
            this.setupMixins(rootObject, shelfItemData);

            //var dropContainerItemData = $droppable.scope().itemData;
            var dragShelfXPosToPog = this.findFixtureXPosToPog(undefined, rootObject.IDPOG, this.targetSaceleFactor);
            var dragShelfYPosToPog = this.findFixtureYPosToPog(undefined, rootObject.IDPOG, this.targetSaceleFactor);
            var proposedX1PosToPog = (function () {
                //no snapping and stretching for Block Fixture
                //if (shelfItemData.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) {
                //    return dragShelfXPosToPog;
                //}
                return rootObject.getNearestXCoordinate(dragShelfXPosToPog, 'leftmost');
            })();
            var proposedX2PosToPog = (function () {
                //no snapping and stretching for Block Fixture
                if (shelfItemData?.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) {
                    return proposedX1PosToPog + shelfItemData.Fixture.Width;
                }

                if (shelfItemData?.Fixture.SnapToLeft && shelfItemData.Fixture.SnapToRight) {
                    return rootObject.getNearestXCoordinate(
                        proposedX1PosToPog + shelfItemData.Fixture.Width,
                        'rightmost',
                    );
                }
                //If both or snapright is false x end will be x1 + width of the fixture.
                return proposedX1PosToPog + shelfItemData.Fixture.Width;
            })();
            var proposedYPosToPog = (function () {
                //no notch for Block Fixture
                if (shelfItemData?.ObjectDerivedType == AppConstantSpace.BLOCK_FIXTURE) {
                    return dragShelfYPosToPog;
                }
                return rootObject.getNearestYCoordinate(dragShelfYPosToPog);
            })();
            var proposedWidth = Utils.preciseRound(proposedX2PosToPog - proposedX1PosToPog, 2);
            if (_.isUndefined(droppedOverObj) || _.isUndefined(droppedOverObj.$sectionID)) {
                this.isDropfalied = true;
                return;
            }

            if (isBayPresents) {
                var dropBay = shelfItemData.findIntersectBayAtXpos(proposedX1PosToPog);
                if (dropBay != null) {
                    droppedOverObj = dropBay;

                    //bug fix
                    //since this was a part of POG so xPosRelative during Fixture.getRelativeXPos will be faulty on bay case, so we temp move it to bay only
                    shelfItemData.setParentId(dropBay.$id);
                } else {
                    //validation: if bay present then don't allow fixtures to drop outside bays
                    //we check with actual drop area instead of proposed (just assumed it's better!)
                    if (!shelfItemData?.findIntersectBayAtXpos(dragShelfXPosToPog)) {
                        var revertBack = function (msg, obj) {
                            this.dragDropUtilsService.revertBackFixtureGallery();
                            this.notify(this.translateService.instant(msg), 'Ok');
                            this.historyService.abandonCaptureActionExec();
                            obj.$sectionID = null;
                            obj.$id = null;
                            return false;
                        };
                        revertBack('Bays exist, we do not allow drop of fixtures in a non-bay area', shelfItemData);
                        this.isDropfalied = true;
                        return;
                    }
                }
            }
            const ctx = new Context(rootObject);
            this.isDropfalied = !shelfItemData?.addFixtureFromGallery(
                ctx,
                droppedOverObj,
                proposedX1PosToPog,
                proposedYPosToPog,
                proposedWidth,
            );
            //if drop is success, then make selection as false
            if(!this.isDropfalied){
              this.planogramService.removeAllSelection(shelfItemData.$sectionID);
              this.planogramService.addToSelectionByObject(shelfItemData, shelfItemData.$sectionID);
            }
            rootObject.setSpreadSpanStandardshelfs(ctx);
            //DialogButtonControl.openDialogOnDragEnd('fixt');
            this.removePositionFromShoppingCart(ctx, shelfItemData.Children);
        }
        if(!this.isDropfalied){
          this.multiDragableElementsList = [shelfItemData];
          if(this.sectionID !=  this.dropTargetSectionId && !this.sharedService.moveOrCopy && !this.isCloneMode){
            //remove the dragitem from it's original section
            let sourceItem = this.sharedService.getObject(args.sourceData.$id, this.sectionID) as MerchandisableList  ;
            const sourceSection = this.getSourceSectionObject();
            const cartObj = Utils.getShoppingCartObj(sourceSection.Children);
            const ctx = new Context(sourceSection);
            sourceItem.moveSelectedToCart(ctx, cartObj);
          }
        }
        this.sharedService.addProductAfterDrag.next(true);
    }
    //Not all the objects are created interfaces for object structures. So keeping any till All the mixin classes created for object
    private getDropContainerItemdata(obj): MerchandisableList {
        return Utils.checkIfPosition(obj) ? this.sharedService.getObject(obj.$idParent, obj.$sectionID) : obj;
    }

    public invokeDropForProduct(source, target) {
        let dropContainerItemData = this.getDropContainerItemdata(target);
        const dropTargetSectionId = target.$sectionID;
        //when item dropped in coffin case or basket with front view, show fitcheck error
        if (
            (dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ) &&
            !dropContainerItemData.Fixture.DisplayViews
        ) {
            this.notify('ITEMS_CANNOT_BE_DROPPED_FRONT_VIEW', 'Ok');
            this.dragDropUtilsService.removePanelBluring();
            // this.isDropfalied = true;
            return false;
        }

        //var rootObject = this.sharedService.getRootObject(dropContainerItemData, this.sectionId);
        var rootObject = this.sharedService.getObject(dropTargetSectionId, dropTargetSectionId) as Section;
        const ctx = new Context(rootObject);
        //this.setupPositionMixins(rootObject);
        var isFitCheckRequired = rootObject.fitCheck;
        //var draggableScope = $draggable.scope();

        var getPositionItemData = function (positionScope, isShoppingCartItem) {
            if (isShoppingCartItem) {
                //its because cart has not itemdata attribute so tweaked
                return positionScope.itemData;
            } else {
                return positionScope.itemData;
            }
        };

        //dragged item detail for only drgged element by jquery(jQuery draggable tweak)

        //draggable item parent detail

        //droppable item detail

        //pull data from POG and see if fitcheck is true
        if (isFitCheckRequired || Utils.checkIfPegType(dropContainerItemData)) {
            if (
                !this.dragDropCopyPasteCommonService.doesPositionsValidateFitCheck(
                    this.multiDragableElementsList,
                    dropContainerItemData,
                    isFitCheckRequired,
                    true
                )
            ) {
                //@Narendra commented to be removed 25th april
                //Items from product library are no need to revert back to it's position
                //for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                //    var eachPositionItemData = this.multiDragableElementsList[i];
                //    var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                //    this.revertingBack(jQueryPositionObj, eachPositionItemData.Location.X, 0);
                //}
                //Need to look into it again
                //DialogButtonControl.openDialogOnDragEnd();
                this.isDropfalied = true;
                return;
            }
        }
        this.multiDragableElementsList = this.planogramCommonService.initPrepareModel(
            this.multiDragableElementsList,
            rootObject,
        );
        //  this.initPrepareModel(this.multiDragableElementsList, rootObject);
        //we get the perfect drop index
        var dropIndex = this.fixtureDropIndex(
            dropContainerItemData,
            this.dropClientX,
            this.dropClientY,
            rootObject.IDPOG,
            this.targetSaceleFactor,
            undefined,
            target,
        );
        var dropCord = this.fixtureDropPoint(
            dropContainerItemData,
            this.dropClientX,
            this.dropClientY,
            rootObject.IDPOG,
            this.targetSaceleFactor,
            undefined,
        );
        //Keeping dropcord for crossbar auto insert
        //to check the total occupied space
        var initialCords = _.cloneDeep(dropCord); //$.copy(dropCord);
        if (
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
        ) {
            if (dropContainerItemData.ObjectDerivedType != AppConstantSpace.CROSSBAROBJ) {
                var dropFlag = dropContainerItemData.checkIfOffsetArea(dropCord);

                if (!dropFlag) {
                    for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        this.planogramService.deleteFromInvModel(eachPositionItemData.$sectionID, eachPositionItemData);
                        this.planogramService.cleanByID(eachPositionItemData.$sectionID, eachPositionItemData.$id);
                        //var eachPositionItemData = this.multiDragableElementsList[i];
                        //var jQueryPositionObj = $('#' + eachPositionItemData.$id);
                        //this.revertingBack(jQueryPositionObj, eachPositionItemData.Location.X, eachPositionItemData.Location.Y);
                    }
                    this.notify('ITEMS_CANT_BE_DROPPED_IN_OFFSET_AREA', 'Ok');
                    this.isDropfalied = true;
                    return false;
                }
            }
        }

        var crunchMode = dropContainerItemData.Fixture.LKCrunchMode;
        //var draggableItemIndex = parentItemData.Children.indexOf(positionItemData);
        var calculateDimension = function (pos) {
            pos.Dimension.Height = pos.linearHeight();
            pos.Dimension.Width = pos.linearWidth();
            pos.Dimension.Depth = pos.linearDepth();
        };
        try {
            //when single item dragged and it's dropped over the same item
            //then ignore the drop and revert back
            // Skip for Crunch Mode (spanLeft/spanright/spreadSpan)
            if (
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
            ) {
                //Maintain an array of dragging positions if they are present in the pegboard
                var dragginItems = this.multiDragableElementsList;

                var exculdedContainerItems = this.dragDropCopyPasteCommonService.fitCheckNeededPos(dragginItems, dropContainerItemData.Children);
                var allItemSelectors = '',
                    insertedPosArry = [],
                    doesItemCrossedWidth = false;
                for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                    var eachPositionItemData = this.multiDragableElementsList[i];
                    calculateDimension(eachPositionItemData);
                    //Make fronts high as one
                    eachPositionItemData.Position.FacingsY = 1;
                    //revert throws errors in cloned mode i.e. CTRL + drag
                    if (!this.isCloneMode) {
                        //var dragPositionScope = angular.element('#' + eachPositionItemData.$id).scope();
                        //var dragShelfScope = Utils.getParent(dragPositionScope);
                        //var dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                        //var dragIndex = (eachPositionItemData.Position.PositionNo - 1);
                        //var parentItemData = this.sharedService.getParentObject(eachPositionItemData, eachPositionItemData.$sectionID);
                        //var dragIndex = parentItemData.Children.indexOf(eachPositionItemData);
                        //var dragIndex = dragShelfScope.itemData.Children.indexOf(eachPositionItemData);
                        //adds next positions' offsetX and offsetY to the top and left
                        if (i != 0) {
                            if (
                                this.planogramStore.appSettings.peg_direction == 1 &&
                                dropContainerItemData.ObjectDerivedType != AppConstantSpace.CROSSBAROBJ
                            ) {
                                dropCord.top =
                                    dropCord.top -
                                    (eachPositionItemData.linearHeight() - eachPositionItemData.getPegInfo().OffsetY) -
                                    this.planogramStore.appSettings.vertical_spacing / 2;
                            } else if (
                                this.planogramStore.appSettings.peg_direction == 0 ||
                                dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ
                            ) {
                                dropCord.left =
                                    dropCord.left +
                                    eachPositionItemData.linearWidth() / 2 +
                                    this.planogramStore.appSettings.horizontal_spacing / 2;
                            }
                        }

                        var fitCheckObj = { flag: false, left: undefined, top: undefined },
                            revertPos = false;
                        //In Auto insert even fit check off we should check for valid drops
                        if (isFitCheckRequired && crunchMode != 5) {
                            fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCordAuto(
                                eachPositionItemData,
                                dropCord,
                                exculdedContainerItems,
                            );
                        } else {
                            fitCheckObj.flag = true;
                        }

                        while (isFitCheckRequired && !fitCheckObj.flag) {
                            if (dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
                                if (
                                    dropCord.left >
                                    dropContainerItemData.Dimension.Width -
                                    dropContainerItemData.getPegHoleInfo().PegOffsetRight
                                ) {
                                    doesItemCrossedWidth = true;
                                }
                                if (
                                    (doesItemCrossedWidth && dropCord.left >= initialCords.left) ||
                                    (dropCord.left <= initialCords.left &&
                                        dropCord.left + eachPositionItemData.linearWidth() >= initialCords.left)
                                ) {
                                    fitCheckObj.flag = true;
                                    revertPos = true;
                                    continue;
                                }
                            } else {
                                if (this.planogramStore.appSettings.peg_direction == 0) {
                                    if (dropCord.top - dropContainerItemData.getPegHoleInfo().PegOffsetBottom < 0) {
                                        fitCheckObj.flag = true;
                                        revertPos = true;
                                        continue;
                                    }
                                } else if (this.planogramStore.appSettings.peg_direction == 1) {
                                    if (
                                        dropCord.left +
                                        (eachPositionItemData.linearWidth() -
                                            (eachPositionItemData.computeWidth() -
                                                eachPositionItemData.getPegInfo().OffsetX)) >
                                        dropContainerItemData.Dimension.Width -
                                        dropContainerItemData.getPegHoleInfo().PegOffsetRight
                                    ) {
                                        fitCheckObj.flag = true;
                                        revertPos = true;
                                        continue;
                                    }
                                }
                            }
                            fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCordAuto(
                                eachPositionItemData,
                                dropCord,
                                exculdedContainerItems,
                            );
                            if (fitCheckObj.flag) {
                                dropCord.left = fitCheckObj.left;
                                dropCord.top = fitCheckObj.top;
                            }
                        }
                        if (revertPos) {
                            //revert back the changes remove from the history
                            //History.stopRecording();
                            if (insertedPosArry.length > 0) {
                                for (var j = insertedPosArry.length - 1; j >= 0; j--) {
                                    var eachPosItemData = insertedPosArry[j].eachPositionItemData;
                                    var index = insertedPosArry[j].dropIndex;
                                    dropContainerItemData.removePosition(ctx, index);
                                }
                            }
                            for (var k = this.multiDragableElementsList.length - 1; k >= 0; k--) {
                                var eachItem = this.multiDragableElementsList[k];
                                //Deleting from inventory modal and objectprovider object if item drop fails
                                this.planogramService.deleteFromInvModel(eachItem.$sectionID, eachItem);
                                this.planogramService.cleanByID(eachItem.$sectionID, eachItem.$id);
                            }
                            this.notify('FIT_CHECK_ERROR', 'Ok');
                            this.isUndoRequired = true;
                            this.isDropfalied = true;
                            return;
                        }
                        dropContainerItemData.addPosition(ctx, eachPositionItemData, dropIndex, dropCord);

                        //Quadtree bounds to draw the item where it is dropping on the fixture
                        //get the estimated dropped item cordinates WRT screen i.e ClinetX
                        //var itemSelector = $('#' + eachPositionItemData.$idParent)[0].getBoundingClientRect();
                        //var parentObj = this.sharedService.getObject(eachPositionItemData.$idParent, eachPositionItemData.$sectionID);
                        //var x = itemSelector.left + Measurement.convertToPixel(eachPositionItemData.Location.X, eachPositionItemData.$sectionID) * this.scaleFactor;
                        //var y = itemSelector.top + Measurement.convertToPixel((parentObj.Dimension.Height - eachPositionItemData.Location.Y - eachPositionItemData.linearHeight()), eachPositionItemData.$sectionID) * this.scaleFactor;
                        //var draggedItemHt = Measurement.convertToPixel((eachPositionItemData.linearHeight()), eachPositionItemData.$sectionID) * this.scaleFactor;
                        //var draggedItemWt = Measurement.convertToPixel((eachPositionItemData.linearWidth()), eachPositionItemData.$sectionID) * this.scaleFactor;
                        //var bounds = { x: x, y: y, width: draggedItemWt, height: draggedItemHt };
                        //$('.yellowClass').remove();
                        //quadTreeUtils.drawQuads([bounds], 'yellow', 'yellowClass');
                        //quadTreeUtils.drawQuads([bounds], 'green', 'greenClass');

                        eachPositionItemData.selected = false;
                        insertedPosArry.push({
                            eachPositionItemData: eachPositionItemData,
                            dropIndex: dropIndex,
                        });
                        exculdedContainerItems.push(eachPositionItemData);
                        var me = dropContainerItemData;
                        const original = ((obj, position, index, dropCoord) => {
                            return () => {
                                this.planogramService.addByID(rootObject.$sectionID, position.$id, position);
                                this.planogramService.addPosInvModel(position, rootObject);
                                obj.addPosition(ctx, position, index, dropCoord);
                            };
                        })(me, eachPositionItemData, dropIndex, _.cloneDeep(dropCord));
                        const revert = ((obj, index, eachPositionItemData) => {
                            return () => {
                                obj.removePosition(ctx, index);
                                this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachPositionItemData);
                                const cartObj = Utils.getShoppingCartObj(rootObject.Children);
                                if (!cartObj.checkProductPresentInCart(eachPositionItemData)) {
                                    this.planogramService.cleanByID(rootObject.$sectionID, eachPositionItemData.$id);
                                }
                            };
                        })(me, dropIndex, eachPositionItemData);
                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addProduct',
                        });
                        if (i == 0 && dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
                            if (this.planogramStore.appSettings.peg_direction == 1) {
                                initialCords.left = eachPositionItemData.Location.X;
                                dropCord.nextX =
                                    eachPositionItemData.Location.X +
                                    eachPositionItemData.linearWidth() +
                                    this.planogramStore.appSettings.horizontal_spacing / 2;
                                dropCord.nextY = dropCord.top;
                            } else if (this.planogramStore.appSettings.peg_direction == 0) {
                                dropCord.nextY =
                                    eachPositionItemData.Location.Y -
                                    (eachPositionItemData.linearHeight() - eachPositionItemData.getPegInfo().OffsetY) -
                                    this.planogramStore.appSettings.vertical_spacing / 2;
                                dropCord.nextX = dropCord.left;
                            }
                        }
                        if (
                            (dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                                dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                                dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ) &&
                            i != this.multiDragableElementsList.length - 1
                        ) {
                            dropCord = dropContainerItemData.findNextDropCord(eachPositionItemData, dropCord, this.planogramStore.appSettings.peg_direction);
                        }
                        //show property grid for first item dropped
                        //if (i == 0) {
                        //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                        //}
                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                        //$('#' + eachPositionItemData.$id).show();
                        //only needed for one dragged element which is actually internally handled by jQuery
                        // this.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);
                    } else {
                        //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                        //addClonedPosition() handled everything related to extending the object with object provider and all
                        (dropContainerItemData as any).addClonedPosition(ctx, eachPositionItemData, dropIndex);
                        dropIndex++;
                    }
                }
                allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                //droppableScope.$evalAsync(function () {
                //  $(allItemSelectors).show();
                //});
            } else if (
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                //Maintain an array of dragging positions if they are present in the coffin case
                //if (crunchMode == 1) {
                //this.multiDragableElementsList.reverse()
                // }
                var dragginItems = this.multiDragableElementsList;
                var fitcheckFlag = true;

                var coffinCaseInfo = dropContainerItemData.getCoffinCaseInfo();
                var exculdedContainerItems = this.dragDropCopyPasteCommonService.fitCheckNeededPos(dragginItems, dropContainerItemData.Children);

                var allItemSelectors = '',
                    insertedPosArry = [],
                    intersectingObj = {};

                //if (crunchMode == 1) {
                //    this.multiDragableElementsList = this.multiDragableElementsList.reverse();
                //}
                const oldChildren = cloneDeep(dropContainerItemData.Children);
                var dropCordClone = _.cloneDeep(dropCord);
                dropContainerItemData.dragFlag = true;
                for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                    var eachPositionItemData = this.multiDragableElementsList[i];
                    calculateDimension(eachPositionItemData);
                    //Make fronts high as one
                    eachPositionItemData.Position.FacingsY = 1;

                    //revert throws errors in cloned mode i.e. CTRL + drag
                    if (!this.isCloneMode) {
                        var diff = 0;
                        var shelfDepth = dropContainerItemData.Dimension.Depth;
                        var shelfHeight = dropContainerItemData.Dimension.Height;
                        //var parentItemData = var parentItemData = this.sharedService.getParentObject(eachPositionItemData, eachPositionItemData.$sectionID);
                        //if (shelfHeight < shelfDepth) {
                        //    diff = shelfDepth - shelfHeight;
                        //}
                        //if no crunch
                        dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                        dropCord.top = dropCordClone.top + eachPositionItemData.linearHeight();

                        if (this.checkIfPosCrossBoundary(eachPositionItemData, dropContainerItemData, dropCord)) {
                            return;
                        }

                        //dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                        //dropCord.top = dropCordClone.top + dropContainerItemData.linearHeightPosition(eachPositionItemData);

                        /*commented by millan*/
                        //var virtualDropCord = {};

                        //if (crunchMode == 5) { //change it to 5 for no crunch mode
                        //    revertPos = dropContainerItemData.checkIfItemCrossesShelfBoundary(eachPositionItemData, dropCord, '');
                        //    if (!revertPos) {
                        //        intersectingObj = dropContainerItemData.checkIfIntersectsAnyPosition(eachPositionItemData, dropCord, exculdedContainerItems);
                        //        revertPos = intersectingObj.Flag;
                        //    }
                        //} else if (crunchMode == 2) { //change it to exact value for left crunch
                        //    //Arrange_items_xpos_in_desc_order()
                        //    exculdedContainerItems = Utils.sortByXPosDesendingOrder(exculdedContainerItems);
                        //    //Getallitems whose xpos less than drop coord
                        //    var filteredArr = _.filter(exculdedContainerItems, function (val) { return val.Location.X + val.linearWidth() < (dropCord.left - eachPositionItemData.linearWidth()) });
                        //    var filteredArrToRight = _.filter(exculdedContainerItems, function (val) { return (val.Location.X + val.linearWidth()) > (dropCord.left - eachPositionItemData.linearWidth()) });

                        //    //retain drop coord for next drop coord in case of multiple drag drop
                        //    virtualDropCord.left = dropCord.left;
                        //    virtualDropCord.top = dropCord.top;

                        //    //Check if it intersects any position
                        //    intersectingObj = dropContainerItemData.getIntersectingPosition(eachPositionItemData, dropCord, filteredArr, 2);

                        //    //Change drop coord to actual drop coord (xpos + linear width)
                        //    if (intersectingObj.Flag) {
                        //        dropCord.left = intersectingObj.Position.Location.X + intersectingObj.Position.linearWidth() + eachPositionItemData.linearWidth();
                        //        exculdedContainerItems = Utils.sortByXPos(exculdedContainerItems);

                        //        overlapObj = dropContainerItemData.checkIfIntersectsAnyPosition(eachPositionItemData, virtualDropCord, exculdedContainerItems);
                        //        if (overlapObj.Flag) {
                        //            dropCord.left = intersectingObj.Position.Location.X + eachPositionItemData.linearWidth();
                        //            // if (eachPositionItemData.Location.X < dropCord.left && parentItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ) {
                        //            // dropCord.left = dropCord.left - eachPositionItemData.linearWidth();
                        //            //}
                        //        }

                        //    } else {
                        //        dropCord.left = 0;
                        //        // overlapObj = dropContainerItemData.checkIfIntersectsAnyPosition(eachPositionItemData, dropCord, filteredArrToRight);
                        //        // revertPos = overlapObj.Flag;
                        //    }
                        //    if (!revertPos) {
                        //        //Check if it crosses shelf width or shelf height
                        //        revertPos = dropContainerItemData.checkIfItemCrossesShelfBoundary(eachPositionItemData, dropCord, '');
                        //    }

                        //} else if (crunchMode == 1) { //change it to exact value for right crunch
                        //    //Arrange_items_xpos_in_desc_order()
                        //    exculdedContainerItems = Utils.sortByXPos(exculdedContainerItems);
                        //    eachPositionItemData.selected = true;
                        //    //Getallitems whose xpos greater than drop coord
                        //    var filteredArr = _.filter(exculdedContainerItems, function (val) { return val.Location.X > dropCord.left - eachPositionItemData.linearWidth() });
                        //    var filteredArrToLeft = _.filter(exculdedContainerItems, function (val) { return val.Location.X < dropCord.left });

                        //    //retain drop coord for next drop coord in case of multiple drag drop
                        //    virtualDropCord.left = Math.abs(dropCord.left - eachPositionItemData.linearWidth());
                        //    virtualDropCord.top = dropCord.top;

                        //    //Check if it intersects any position
                        //    intersectingObj = dropContainerItemData.getIntersectingPosition(eachPositionItemData, dropCord, filteredArr, 2);

                        //    //Change drop coord to actual drop coord (xpos + linear width)
                        //    if (intersectingObj.Flag) {
                        //        dropCord.left = intersectingObj.Position.Location.X;
                        //        //overlapObj = dropContainerItemData.checkIfIntersectsAnyPosition(eachPositionItemData, dropCord, filteredArrToLeft);
                        //        //revertPos = overlapObj.Flag;
                        //    } else {
                        //        dropCord.left = dropContainerItemData.Dimension.Width - (coffinCaseInfo.SideThickness * 2);
                        //        //overlapObj = dropContainerItemData.checkIfIntersectsAnyPosition(eachPositionItemData, dropCord, filteredArrToLeft);
                        //        //revertPos = overlapObj.Flag;
                        //    }

                        //    if (!revertPos) {
                        //        //Check if it crosses shelf width or shelf height
                        //        revertPos = dropContainerItemData.checkIfItemCrossesShelfBoundary(eachPositionItemData, dropCord, '');
                        //    }
                        //}
                        ////if (!revertPos && fitcheckFlag) {
                        ////    var revertPos = dropContainerItemData.checkAllItemsIfCrossesShelfBoundary(this.multiDragableElementsList, dropCord);
                        ////    fitcheckFlag = false;
                        ////}

                        //if (revertPos) {
                        //    //revert back the changes remove from the history
                        //    //History.stopRecording();
                        //    if (insertedPosArry.length > 0) {
                        //        for (var j = insertedPosArry.length - 1; j >= 0; j--) {
                        //            var eachPosItemData = insertedPosArry[j].eachPositionItemData;
                        //            var index = insertedPosArry[j].dropIndex;
                        //            dropContainerItemData.removePosition(ctx,index);
                        //        }
                        //    }
                        //    for (var k = this.multiDragableElementsList.length - 1; k >= 0; k--) {
                        //        var eachItem = this.multiDragableElementsList[k];
                        //        //Deleting from inventory modal and objectprovider object if item drop fails
                        //        this.planogramHelperService.deleteFromInvModel(rootObject.$sectionID, eachItem);
                        //        this.sharedService.cleanByID(rootObject.$sectionID, eachItem.$id);
                        //    }
                        //    this.snackBar.open("Fit check error ", 'Ok', {duration: 5000});
                        //    this.isUndoRequired = true;
                        //    this.isDropfalied = true;
                        //    return;
                        //}
                        //if (crunchMode == 1) {
                        //    dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                        //}
                        /*commented by millan*/
                        dropIndex = isNaN(dropIndex) ? dropContainerItemData.Children.length : dropIndex; // In case of No crunch mode add to end of array.
                        dropContainerItemData.addPosition(ctx, eachPositionItemData, dropIndex, dropCord);
                        //dropContainerItemData.stackOrder(eachPositionItemData, false);

                        //eachPositionItemData.selected = false;
                        //insertedPosArry.push({
                        //    'eachPositionItemData': eachPositionItemData, 'dropIndex': dropIndex
                        //});
                        //exculdedContainerItems.push(eachPositionItemData);
                        var original = ((obj, position, index, dropCoord) => {
                            return () => {
                                this.planogramService.addByID(rootObject.$sectionID, position.$id, position);
                                this.planogramService.addPosInvModel(position, rootObject);
                                obj.addPosition(ctx, position, index, dropCoord);
                            };
                        })(dropContainerItemData, eachPositionItemData, dropIndex, dropCord);
                        var revert = ((obj, index, eachPositionItemData) => {
                            return () => {
                                obj.removePosition(ctx, index);
                                this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachPositionItemData);
                                const cartObj = Utils.getShoppingCartObj(rootObject.Children);
                                if (!cartObj.checkProductPresentInCart(eachPositionItemData)) {
                                    this.planogramService.cleanByID(rootObject.$sectionID, eachPositionItemData.$id);
                                }
                            };
                        })(dropContainerItemData, dropIndex, eachPositionItemData);
                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addProduct',
                        });

                        //if (dropContainerItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ && (i != this.multiDragableElementsList.length - 1)) {
                        //    if (crunchMode == 2 || crunchMode == 1) {
                        //        dropCord = dropContainerItemData.findNextDropCord(eachPositionItemData, virtualDropCord);
                        //        if (crunchMode == 2) {
                        //              dropCord.left = dropCord.left +eachPositionItemData.linearWidth();
                        //        }
                        //    } else {
                        //        //           dropCord.left = dropCord.left - diff;
                        //        dropCord = dropContainerItemData.findNextDropCord(eachPositionItemData, dropCord);
                        //        dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                        //    }
                        //}
                        eachPositionItemData.selected = false;
                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                        //only needed for one dragged element which is actually internally handled by jQuery
                        // this.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);
                    } else {
                      //From prod lib to coffincase.
                      //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                        //addClonedPosition() handled everything related to extending the object with object provider and all
                        dropContainerItemData.addClonedPosition(ctx, eachPositionItemData, dropIndex);
                        dropIndex++;
                    }
                }
                allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                //droppableScope.$evalAsync(function () {
                //  $(allItemSelectors).show();
                //});

                dropContainerItemData.dragFlag = false;

                for (const eachPositionItemData of this.multiDragableElementsList) {
                    // Need to call rePositionOnCrunch to put dragged position at proper location.
                    const isRecordingOn = this.historyService.isRecordingOn[dropContainerItemData.$sectionID];
                    this.historyService.isRecordingOn[dropContainerItemData.$sectionID] = false;
                    this.crunchMode.rePositionOnCrunch(ctx, dropContainerItemData, crunchMode);
                    this.historyService.isRecordingOn[dropContainerItemData.$sectionID] = isRecordingOn;
                    const response = dropContainerItemData.calculatePositionShrink(eachPositionItemData, oldChildren);
                    if (response && response.revertFlag) {
                        this.notify('FIT_CHECK_ERROR', 'Ok');
                        this.isAbandonLastAction = response;
                        return;
                    }
                }
                //dropContainerItemData.stackOrder('', true);
                //var revertPos = dropContainerItemData.checkAllItemsIfCrossesShelfBoundary();
                // if (revertPos) {
                //     this.snackBar.open("Fit check error ", 'Ok', {duration: 4000});
                //     this.isAbandonLastAction = true;
                //     //this.isUndoRequired = true;
                //     //this.isDropfalied = true;
                //     return;
                //  }
            } else {
                //for shelf item dragged
                let allItemSelectors = '';
                const dropItem = (eachPositionItemData) => {
                    //revert throws errors in cloned mode i.e. CTRL + drag
                    if (!this.isCloneMode) {
                        // Span Left and Right Spread Span Changes
                        if ((dropContainerItemData as any).isSpreadShelf) {
                            var dropContainerObj = this.getDropSpreadSpanshelf(
                                dropContainerItemData,
                                rootObject.IDPOG,
                                this.dropClientX,
                                this.targetSaceleFactor,
                                eachPositionItemData,
                                dropIndex,
                                dropCord,
                            );
                            dropContainerItemData = dropContainerObj.ItemData;
                            //dropIndex = dropContainerObj.dropIndex;
                        }
                        //dragShelfScope.itemData.movePosition(dragIndex, dropContainerItemData, dropIndex, dropCord);
                        dropContainerItemData.addPosition(ctx, eachPositionItemData, dropIndex, dropCord);

                        eachPositionItemData.selected = false;
                        const me = dropContainerItemData;
                        const original = ((obj, position, index, dropCoord) => {
                            return () => {
                                this.planogramService.addByID(rootObject.$sectionID, position.$id, position);
                                this.planogramService.addPosInvModel(position, rootObject);
                                obj.addPosition(ctx, position, index, dropCoord);
                            };
                        })(me, eachPositionItemData, dropIndex, dropCord);
                        const revert = ((obj, index, eachPositionItemData) => {
                            return () => {
                                obj.removePosition(ctx, index,true);
                                this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachPositionItemData);
                                const cartObj = Utils.getShoppingCartObj(rootObject.Children);
                                if (!cartObj.checkProductPresentInCart(eachPositionItemData)) {
                                    this.planogramService.cleanByID(rootObject.$sectionID, eachPositionItemData.$id);
                                }
                            };
                        })(me, dropIndex, eachPositionItemData);
                        this.historyService.captureActionExec({
                            funoriginal: original,
                            funRevert: revert,
                            funName: 'addProduct',
                        });
                        //parentItemData.movePosition(dragIndex, dropContainerItemData, dropIndex, dropCord);
                        // for No Crunch ,No need to recalculate the item
                        if (crunchMode == 5) {
                            eachPositionItemData.Location.X = dropCord.left;
                        }
                        //show property grid for first item dropped
                        //if (i == 0) {
                        //    baseControllerScope.$broadcast('positionProperty', eachPositionItemData);
                        //}
                        //on drag start we hide selected element dragged, when dropped we again showit
                        allItemSelectors += '#' + eachPositionItemData.$id + ', ';
                        //$('#' + eachPositionItemData.$id).show();
                        //only needed for one dragged element which is actually internally handled by jQuery
                        // that.dragDropUtilsService.revertBackItem(eachPositionItemData.$id);
                    } else {
                        //addClonedPosition() handled everything related to extending the object with object provider and all
                        //this.addUnitDimensionsToTargetSection([eachPositionItemData]);
                        (dropContainerItemData as any).addClonedPosition(ctx, eachPositionItemData, dropIndex);
                        dropIndex++;
                    }
                };

                if (crunchMode == 5) {
                    var sectionObj = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
                    sectionObj.setSkipComputePositions();
                    sectionObj.setSkipShelfCalculateDistribution();
                    for (var i = 0; i < this.multiDragableElementsList.length; i++) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        calculateDimension(eachPositionItemData);
                        dropItem(eachPositionItemData);
                        dropCord.left = dropCord.left + eachPositionItemData.linearWidth();
                    }
                    sectionObj.computePositionsAfterChange(ctx);
                    sectionObj.clearSkipShelfCalculateDistribution();
                } else {
                    if ('isSpreadShelf' in dropContainerItemData && dropContainerItemData.isSpreadShelf) {
                        //var dragPositionScope = angular.element('#' + this.multiDragableElementsList[0].$id).scope();
                        var dropContainerObj = this.getDropSpreadSpanshelf(
                            dropContainerItemData,
                            rootObject.IDPOG,
                            this.dropClientX,
                            this.targetSaceleFactor,
                            this.multiDragableElementsList[0],
                            dropIndex,
                            dropCord,
                        );
                        dropContainerItemData = dropContainerObj.ItemData;
                        dropIndex = dropContainerObj.dropIndex;
                    }
                    var sectionObj = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
                    sectionObj.setSkipComputePositions();
                    sectionObj.setSkipShelfCalculateDistribution();
                    for (var i = this.multiDragableElementsList.length - 1; i >= 0; i--) {
                        var eachPositionItemData = this.multiDragableElementsList[i];
                        calculateDimension(eachPositionItemData);
                        dropItem(eachPositionItemData);
                    }
                    sectionObj.clearSkipComputePositions();
                    dropContainerItemData.computePositionsAfterChange(ctx);
                    sectionObj.setSkipComputePositions();

                    sectionObj.computePositionsAfterChange(ctx);
                    sectionObj.clearSkipShelfCalculateDistribution();
                }
                allItemSelectors = allItemSelectors.substring(0, allItemSelectors.length - 2);
                //droppableScope.$evalAsync(function () {
                //  $(allItemSelectors).show();
                //});
            }

            this.removePositionFromShoppingCart(ctx, this.multiDragableElementsList);

            this.planogramService.removeAllSelection(this.sectionId);
            this.dropTargetSectionId != this.sectionID && this.planogramService.removeAllSelection(this.dropTargetSectionId);
        } catch (e) {
            this.log.error('Position Dropping  :', e);
            this.log.error('Dragdrop fail: Position Dropping' + e.stack);
        }

        console.debug(' ------------------------  Postion/Shopping Cart Dropping is Done  -----------------------');
        if (this.isPositionDragging) {
            if (this.productlibraryservice.selectedProductList.length > 0) {
                for (var k = 0; k < this.productlibraryservice.selectedProductList.length; k++) {
                    this.productlibraryservice.selectedProductList[k].selected = false;
                }
            }
            $('.li-image-hover').children('.checkbox-li').css('display', 'none');
            $('.li-image-hover').find('.small-avatar-image').css('display', 'block');
            this.productlibraryservice.selectedProductList = [];
            //this.revertingBack(source, this.multiDragableElementsList[0].Location.X, this.multiDragableElementsList[0].Location.Y, undefined, this.isShoppingCartItemDragging);
            this.dropTargetSectionId != this.sectionID && this.planogramService.removeAllSelection(this.dropTargetSectionId);
            //baseControllerScope.$apply();
            //DialogButtonControl.openDialogOnDragEnd();
        }
        return;
    }

    // Note : If position is outside the coffin case boundary then reverting the action
    private checkIfPosCrossBoundary(pos: Position, dropContainerItemData: Coffincase, dropCord: PegDropCord): boolean {
        if (dropContainerItemData.Fixture.LKCrunchMode == CrunchMode.NoCrunch) {
            const locX = Utils.preciseRound(dropCord.left - pos.linearWidth(), 2);
            const locY = Utils.preciseRound(dropCord.top - pos.linearHeight(), 2);
            return locX < 0 || locY < 0 || dropCord.left > dropContainerItemData.ChildDimension.Width || dropCord.top > dropContainerItemData.ChildDimension.Depth;
        }
        return false;
    }

    // Remove position from Shoppin card if its available
    private removePositionFromShoppingCart(ctx: Context, positions: Position[]): void{
        if (!this.isDropfalied) {
            const rootObject = this.sharedService.getObject(this.dropTargetSectionId, this.dropTargetSectionId) as Section;
            const cartObj = Utils.getShoppingCartObj(rootObject.Children);
            cartObj.removePositionWithHistory(ctx, positions);
        }
    }

    public fixtureDropPoint(dropShelfItemData, dropClientX, dropClientY, pogId, scaleFactor, dragItem): PegDropCord {
        //var shelfRootObject = ObjectProvider.getRootObject(dropShelfItemData, dropShelfItemData.$sectionID);
        var itemXPosToParent: number = 0;
        var blurInfo = this.dragDropUtilsService.findBlurInfo(dropShelfItemData.$sectionID);
        let dragItemSelector = dragItem ? $('#' + dragItem.$id + '' + blurInfo.activePanelId) : undefined;
        if (!Utils.isNullOrEmpty(dragItemSelector)) {
            //&& (!dragItemSelector.scope().bycoordinate)
            var popupSelector = $('#position-holder-id');
            var dragItemOffset = dragItemSelector.offset();
            var itemData = this.sharedService.getObject(dragItem.$id, dropShelfItemData.$sectionID);
            var height = itemData.Dimension.Height;
            var itemXPosToPog = this.planogramService.convertToUnit(
                (dropClientX - dragItemOffset.left) / scaleFactor,
                dropShelfItemData.$sectionID,
            );
            var itemYPosToPog = this.planogramService.convertToUnit(
                (dropClientY - dragItemOffset.top) / scaleFactor,
                dropShelfItemData.$sectionID,
            );
            itemXPosToParent = itemXPosToPog;
            var itemYPosToParent = height - itemYPosToPog;
        } else {
            var shelfRootObject = this.sharedService.getObject(
                dropShelfItemData.$sectionID,
                dropShelfItemData.$sectionID,
            ) as Section;
            var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();

            var dropShelfXPosToPog = dropShelfItemData.getXPosToPog();
            var dropShelfYPosToPog = dropShelfItemData.getYPosToPog();
            var itemXPosToPog = this.planogramService.convertToUnit(
                (dropClientX - pogOffSetPX.left) / scaleFactor,
                dropShelfItemData.$sectionID,
            );
            var itemYPosToPog = this.planogramService.convertToUnit(
                (dropClientY - pogOffSetPX.top) / scaleFactor,
                dropShelfItemData.$sectionID,
            );
            itemXPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionLeft() : 0;
            itemYPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionTop() : 0;
            //Above variables mainly to get real xPOS of the item relative to the shelf dropped.
            itemXPosToParent = itemXPosToPog - dropShelfXPosToPog - dropShelfItemData.ChildOffset.X;
            var itemYPosToParent =
                shelfRootObject.Dimension.Height - itemYPosToPog - dropShelfYPosToPog - dropShelfItemData.ChildOffset.Y;
            if (
                dropShelfItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                dropShelfItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                let dropPoint = {
                    left: itemXPosToParent,
                    top: itemYPosToParent ,
                    nextX: 0,
                    nextY: 0,
                };
                if (dropShelfItemData.Dimension.Height > dropShelfItemData.Dimension.Depth) {
                    const diff = dropShelfItemData.Dimension.Height - dropShelfItemData.Dimension.Depth;
                    dropPoint.top = itemYPosToParent - diff;
                }
                return dropPoint;
            }

        }
        return {
            left: itemXPosToParent,
            top: itemYPosToParent,
            nextX: 0,
            nextY: 0,
        };
    }

    public getDropSpreadSpanshelf(
        dropContainerItemData,
        pogId,
        dropClientX,
        scaleFactor,
        dragItemdata,
        dropIndex,
        dropCord,
    ) {
        var dropContainerObj = {
            ItemData: dropContainerItemData,
            dropIndex: dropIndex,
            dropCord: dropCord,
        };
        var allSSPositions = dropContainerItemData.getAllSpreadSpanPositions();
        var crunchMode = dropContainerItemData.Fixture.LKCrunchMode;
        if (allSSPositions.length == 0) {
            //if (!dropContainerItemData.isSpreadShelf || allSSPositions.length == 0) {
            return dropContainerObj;
        }
        var dropContainer = dropContainerItemData;
        var pogOffSetPX = $('#innerWebPOG_' + pogId).offset();
        // Crunch : 9 Means -- Calculation from Right  (Span right)
        // Crunch : 8 Means -- Calculation from left   (Span left)
        var shelfRootObject = this.sharedService.getObject(dropContainerItemData.$sectionID, dropContainerItemData.$sectionID) as Section;
        if (crunchMode == 9) {
            var itemXPosToPog =
                this.planogramService.convertToUnit(
                    pogOffSetPX.left + $('#innerWebPOG_' + pogId).outerWidth(true) * scaleFactor - dropClientX,
                    dropContainerItemData.$sectionID,
                ) / scaleFactor;
            itemXPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionRight() : 0;
        } else {
            itemXPosToPog = this.planogramService.convertToUnit(
                (dropClientX - pogOffSetPX.left) / scaleFactor,
                dropContainerItemData.$sectionID,
            );
            itemXPosToPog -= shelfRootObject.showAnnotation ? shelfRootObject.getAnnotationDimensionLeft() : 0;
        }

        const getDropproperties = (dropContainerObj, allSSPositions, itemXPosToPog) => {
            var itemX = 0;
            var itemEnd = 0;
            var dropfound = false;
            var len = allSSPositions.length;
            //var shelfRootObject = ObjectProvider.getRootObject(dropContainerObj.ItemData, dropContainerObj.ItemData.$sectionID);
            var shelfRootObject = this.sharedService.getObject(
                dropContainerObj.ItemData.$sectionID,
                dropContainerObj.ItemData.$sectionID,
            ) as Section;
            var spanShelfsArry = [];
            for (var i = 0; i < dropContainerObj.ItemData.spanShelfs.length; i++) {
                spanShelfsArry.push(
                    this.sharedService.getObject(
                        dropContainerObj.ItemData.spanShelfs[i],
                        dropContainerObj.ItemData.$sectionID,
                    ),
                );
            }
            if (crunchMode == 9) {
                var gap = 0;
                //var sortModulars = function (obj) {
                //    return obj.sort(function (a, b) { return a.Location.X - b.Location.X; });
                //}
                var getRightMostShelf = function (spanShelfsArryObj: any) {
                    var rightMostShelf: PlanogramObject;
                    for (var q = 0; q < spanShelfsArryObj.length; q++) {
                        if (spanShelfsArryObj[q].spreadSpanProperties.isRightMostShelf) {
                            rightMostShelf = spanShelfsArryObj[q];
                            break;
                        }
                    }
                    return rightMostShelf;
                };
                var drpContainarShelf: PlanogramObject;
                //Utils.sortByXPos(spanShelfsArry)[spanShelfsArry.length - 1];
                if (shelfRootObject.isBayPresents) {
                    drpContainarShelf = getRightMostShelf(spanShelfsArry);
                    var xPosOfSpanShelf =
                        itemXPosToPog -(shelfRootObject.ChildDimension.Width - (drpContainarShelf.getXPosToPog()+ drpContainarShelf.Dimension.Width));
                    //xPosOfSpanShelf = itemXPosToPog - (shelfRootObject.ChildDimension.Width - drpContainarShelf.Location.X + drpContainarShelf.Dimension.Width);
                } else {
                    drpContainarShelf = Utils.sortByXPos(spanShelfsArry)[spanShelfsArry.length - 1];
                    xPosOfSpanShelf =
                        itemXPosToPog -
                        (shelfRootObject.ChildDimension.Width -
                            (drpContainarShelf.Location.X + drpContainarShelf.Dimension.Width));
                }

                for (var j = len - 1; j >= 0; j--) {
                    var positionObj = allSSPositions[j];
                    if (j == len - 1) {
                        itemX = 0;
                        itemEnd = itemX + positionObj.linearWidth();
                        gap = positionObj.getSKUGap() / 2;
                    } else {
                        gap = positionObj.getSKUGap() / 2;
                        itemX = itemEnd + gap;
                        itemEnd = itemX + positionObj.linearWidth();
                    }
                    if ((xPosOfSpanShelf >= itemX && xPosOfSpanShelf <= itemEnd) || xPosOfSpanShelf <= itemX) {
                        var pos = allSSPositions[j];
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    if (j == (len - 1)) {
                        //        pos = allSSPositions[len - 1];
                        //    } else {
                        //        pos = allSSPositions[j - 1];
                        //    }
                        //} else {
                        //    pos = allSSPositions[j];
                        //}
                        dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                        dropContainerObj.dropIndex = dropContainer.Children.indexOf(pos) + 1;
                        //dropContainerObj.dropIndex = (currIndex == dropContainer.Children.length - 1 ? currIndex = currIndex + 1 : currIndex);
                        dropContainerObj.ItemData = dropContainer;
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    if (j == len - 1) {
                        //        dropContainerObj.dropIndex = currIndex;
                        //    } else {
                        //        dropContainerObj.dropIndex = currIndex + 1;
                        //    }
                        //} else {
                        //    dropContainerObj.dropIndex = currIndex;
                        //}
                        dropfound = true;
                        break;
                    }
                    itemEnd = itemEnd + gap;
                }
            } else {
                let gap = 0;
                let getLeftMostShelf = (spanShelfsArryObj) => {
                    let leftMostShelf: PlanogramObject;
                    for (let p = 0; p < spanShelfsArryObj.length; p++) {
                        if (spanShelfsArryObj[p].spreadSpanProperties.isLeftMostShelf) {
                            leftMostShelf = spanShelfsArryObj[p];
                            break;
                        }
                    }
                    return leftMostShelf;
                };
                //Bug fix for drag drop in span shelfs
                if (shelfRootObject.isBayPresents) {
                    let leftMostShelfObj: PlanogramObject = getLeftMostShelf(spanShelfsArry);
                    xPosOfSpanShelf = itemXPosToPog - leftMostShelfObj.getXPosToPog();
                } else {
                    xPosOfSpanShelf = itemXPosToPog - Utils.sortByXPos(spanShelfsArry)[0].Location.X;
                }
                // temporarily calculation Xpos pos if Item,to match Drop Shelf and position.from Spanned Positions from Shelf itemdata (spanShelfPositions)
                for (let i = 0; i < len; i++) {
                    let positionObj = allSSPositions[i];
                    if (i == 0) {
                        itemX = 0;
                        itemEnd = itemX + positionObj.linearWidth();
                        gap = positionObj.getSKUGap() / 2;
                    } else {
                        //if (positionObj.Position.PositionNo != 1) {
                        gap = positionObj.getSKUGap() / 2;
                        //}
                        itemX = itemEnd + gap;
                        itemEnd = itemX + positionObj.linearWidth();
                    }
                    if ((xPosOfSpanShelf >= itemX && xPosOfSpanShelf <= itemEnd) || xPosOfSpanShelf <= itemX) {
                        var pos = allSSPositions[i];
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    if (i == 0) {
                        //        pos = allSSPositions[i];
                        //    } else {
                        //        pos = allSSPositions[i - 1];
                        //    }
                        //} else {
                        //    pos = allSSPositions[i + 1];
                        //}
                        dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                        //Add one index more in crunch mode left
                        dropContainerObj.dropIndex = dropContainer.Children.indexOf(pos);
                        dropContainerObj.ItemData = dropContainer;
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    if (i == 0) {
                        //        dropContainerObj.dropIndex = currIndex;
                        //    } else {
                        //        dropContainerObj.dropIndex = currIndex + 1;
                        //    }
                        //} else {
                        //    dropContainerObj.dropIndex = currIndex;
                        //}
                        dropfound = true;
                        break;
                    }
                    itemEnd = itemEnd + gap;
                }
            }
            // If Drop is not found means : droped on Last position(empty space)
            if (!dropfound) {
                if (crunchMode == 8) {
                    var pos = allSSPositions[len - 1];
                } else {
                    var pos = allSSPositions[0];
                }
                dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                var currIndex = dropContainer.Children.indexOf(pos);
                dropContainerObj.ItemData = dropContainer;
                if (dropContainerObj.ItemData.Fixture.LKCrunchMode == 8) {
                    dropContainerObj.dropIndex = currIndex + 1;
                } else {
                    dropContainerObj.dropIndex = currIndex;
                }
            }
            return dropContainerObj;
        };
        const getSPDropproperties = (dropContainerObj, allSSPositions, itemXPosToPog) => {
            let dropfound = false;
            var pos,
                gap = 0,
                itemX = 0,
                itemEnd = 0;
            let len = allSSPositions.length;
            let offset = dropContainerObj.ItemData.OffSet;
            //var shelfRootObject = ObjectProvider.getRootObject(dropContainerObj.ItemData, dropContainerObj.ItemData.$sectionID);
            let shelfRootObject = this.sharedService.getObject(
                dropContainerObj.ItemData.$sectionID,
                dropContainerObj.ItemData.$sectionID,
            ) as Section;
            let spanShelfsArry = [];
            const getLeftMostShelf = (spanShelfsArryObj) => {
                let leftMostShelf: PlanogramObject;
                for (let p = 0; p < spanShelfsArryObj.length; p++) {
                    if (spanShelfsArryObj[p].spreadSpanProperties.isLeftMostShelf) {
                        leftMostShelf = spanShelfsArryObj[p];
                        break;
                    }
                }
                return leftMostShelf;
            };
            for (var i = 0; i < dropContainerObj.ItemData.spanShelfs.length; i++) {
                spanShelfsArry.push(
                    this.sharedService.getObject(
                        dropContainerObj.ItemData.spanShelfs[i],
                        dropContainerObj.ItemData.$sectionID,
                    ),
                );
            }
            //Bug fix for drag drop in span shelfs
            if (shelfRootObject.isBayPresents) {
                var leftMostShelfObj: PlanogramObject = getLeftMostShelf(spanShelfsArry);
                var xPosOfSpanShelf =
                    itemXPosToPog -
                    this.sharedService.getParentObject(leftMostShelfObj, leftMostShelfObj.$sectionID).Location.X;
            } else {
                xPosOfSpanShelf = itemXPosToPog - Utils.sortByXPos(spanShelfsArry)[0].Location.X;
            }

            // skip if on shelf edge
            if (
                !(
                    crunchMode == 6 &&
                    !_.isUndefined(dropContainerObj.dropCord) &&
                    !_.isUndefined(dropContainerObj.dropCord.top) &&
                    dropContainerObj.dropCord.top <= 0
                )
            ) {
                // temporarily calculation Xpos pos if Item,to match Drop Shelf and position.from Spanned Positions from Shelf itemdata (spanShelfPositions)
                for (var i = 0; i < len; i++) {
                    var positionObj = allSSPositions[i];
                    //if (positionObj.baseItem) {
                    //    continue;
                    //}
                    if (i == 0) {
                        itemX = 0;
                        itemEnd = itemX + positionObj.linearWidth();
                        //gap = positionObj.getSKUGap() / 2;
                    } else {
                        //gap = positionObj.getSKUGap()/ 2;
                        itemX = itemEnd + offset + gap;
                        itemEnd = itemX + positionObj.linearWidth();
                    }
                    //@Dropping left, When dropped on the item, drop to the left of the item
                    if (xPosOfSpanShelf >= itemX && xPosOfSpanShelf <= itemEnd) {
                        pos = allSSPositions[i];
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    if (i == 0) {
                        //        pos = allSSPositions[i];
                        //    } else {
                        //        pos = allSSPositions[i - 1];
                        //    }
                        //} else {
                        //    pos = allSSPositions[i];
                        //}
                        dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                        var currIndex = dropContainer.Children.indexOf(pos);
                        dropContainerObj.ItemData = dropContainer;
                        //if (shelfRootObject.LKTraffic == 1) {
                        //    currIndex = currIndex + 1;
                        //}
                        dropContainerObj.dropIndex = currIndex;
                        dropfound = true;
                        break;
                    }
                    //@Dropping left When dropped b/w the items, No change
                    if (xPosOfSpanShelf <= itemX) {
                        pos = allSSPositions[i];
                        if (shelfRootObject.LKTraffic == 2) {
                            if (i == 0) {
                                pos = allSSPositions[i];
                            } else {
                                pos = allSSPositions[i - 1];
                            }
                        } else {
                            pos = allSSPositions[i];
                        }
                        dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                        var currIndex = dropContainer.Children.indexOf(pos);
                        dropContainerObj.ItemData = dropContainer;
                        if (shelfRootObject.LKTraffic == 2) {
                            currIndex = currIndex + 1;
                        }
                        dropContainerObj.dropIndex = currIndex;
                        dropfound = true;
                        break;
                    }
                    //itemEnd = itemEnd + gap;
                }
            }
            // If Drop is not found means : droped on Last position(empty space)
            if (!dropfound) {
                if (crunchMode == 8) {
                    var pos = allSSPositions[len - 1];
                } else {
                    var pos = allSSPositions[len - 1];
                }
                dropContainer = this.sharedService.getParentObject(pos, pos.$sectionID);
                var currIndex = dropContainer.Children.indexOf(pos);
                dropContainerObj.ItemData = dropContainer;
                dropContainerObj.dropIndex = currIndex + 1;
            }
            return dropContainerObj;
        };
        if (crunchMode == 6) {
            dropContainerObj = getSPDropproperties.call(this, dropContainerObj, allSSPositions, itemXPosToPog);
        } else {
            dropContainerObj = getDropproperties.call(this, dropContainerObj, allSSPositions, itemXPosToPog);
        }
        return dropContainerObj;
    }

    // TODO @karthik this can be moved to a seperate service once the utils dependency is resolved.
    public prepareGhostImage(options: IBeginDragEventArgs, mouseoffset: { x: number, y: number }): void {
        // need to generate ghost image dynamically
        let preview: HTMLElement = document.querySelector('#preview-image');
        if (!preview) {
            return;
        }
        let scale = this.getScaleFactor(this.sectionID);
        switch (options.dragType) {
            case 'Position': {
                let ghostImg: GhostImage = { imgTagHTML: '' };
                if (
                    options.data.dragOriginatedFrom == DragOrigins.ProductLibrary ||
                    options.data.dragOriginatedFrom == DragOrigins.ClipBoard
                ) {
                    ghostImg = this.dndGhostImageGeneratorService.generateGhostImageProductHTML(
                        this.multiDragableElementsList,
                        this.sectionID,
                        0,
                        options.data.dragOriginatedFrom,
                    );
                } else {
                    ghostImg = this.dndGhostImageGeneratorService.generateGhostImageHTML(0, this.getParentObject());
                }
                this.imgHTML = ghostImg;
                preview.innerHTML = this.imgHTML.imgTagHTML;
                let position = document.getElementById(`${options.data.$id}${this.panelService.activePanelID}`);
                // only when source is from planogram.
                if (position) {
                    let positionRect =
                        document.getElementById(`intersectionChooserPop-${this.sectionId}`).style.display != 'none'
                            ? document
                                .getElementById(
                                    `${options.data.$id}${this.panelService.activePanelID}-Children-intersection`,
                                )
                                .getBoundingClientRect()
                            : position.getBoundingClientRect();
                    this.previewOffsetX = positionRect.x - mouseoffset.x;
                    this.previewOffsetY = positionRect.y + positionRect.height - mouseoffset.y;
                    this.previewHeight = positionRect.height;
                }

                //ele.innerHTML = ghostImg.imgTagHTML;
                // let maxHeight = 0;
                // preview.querySelectorAll("svg").forEach((e) => {
                //   if (e.clientHeight > maxHeight) {
                //     maxHeight = e.clientHeight;
                //   }
                // })
                // ghostImageInfo.offset.offsetY = maxHeight;
                break;
            }
            case 'Annotation': {
                let ghostImage = document.getElementById(`${options.data.$id}`).parentElement;
                let wrapper: HTMLElement = this.renderer.createElement('div');
                wrapper.style.transform = `scaleX(${scale}) scaleY(${scale})`;
                wrapper.style.zIndex = '9999';
                wrapper.innerHTML = ghostImage.innerHTML;
                let annotation: HTMLElement = wrapper.querySelector('.annotationcontainer');
                annotation.style.top = '0px';
                annotation.style.left = '0px';
                preview.appendChild(wrapper);
                break;
            }
            // fixtures
            default: {
                if (options.data.dragOriginatedFrom != DragOrigins.Planogram) {
                    let fixtureImage = this.dndGhostImageGeneratorService.getFixtureGalleryGhostImages(options);
                    preview.innerHTML = fixtureImage.outerHTML;
                    let previewFixture: HTMLElement = <HTMLElement>preview.firstChild;
                    this.previewOffsetY -= Number(previewFixture.style.height.split('px')[0]);
                    this.previewHeight = this.previewOffsetY;
                } else {
                    let fixture = document.getElementById(`${options.data.$id}${this.panelService.activePanelID}`);
                    let parentElement = <HTMLElement>fixture.parentElement;
                    //wrapper to scale
                    let wrapper: HTMLElement = this.renderer.createElement('div');
                    if (!this.planogramStore.appSettings.shelfLabelOn) {
                        wrapper.classList.add('shelfLabel-off');
                    }
                    // need to check for offset
                    let planogramOffset = document
                        .querySelector(`#${this.panelService.activePanelID} .pog-workspace`)
                        .getBoundingClientRect();
                    let fixtureOffsetFromPlanogram = fixture.getBoundingClientRect();
                    wrapper.style.transform = `scaleX(${scale}) scaleY(${scale})`;
                    wrapper.style.position = 'absolute';
                    wrapper.style.left = `${planogramOffset.left - fixtureOffsetFromPlanogram.left}px`;
                    wrapper.style.bottom = `${fixtureOffsetFromPlanogram.bottom - planogramOffset.bottom}px`;

                    wrapper.classList.add(this.getDisplayMode());
                    wrapper.innerHTML = parentElement.outerHTML;
                    preview.innerHTML = wrapper.outerHTML;
                    //Considering fixture svg bottom to compute wrapper bottom as svg dimensions are used for offset calculation for below fixtures during mouse down event
                    if (this.isPegBoardDragging ||
                        this.isCrossbarDragging ||
                        this.isSlotwallDragging ||
                        this.isCoffinCaseDragging ||
                        this.isBasketDragging ||
                        this.isBlockFixtureDragging) {
                        let fixtureSvg = document.querySelector(`#${options.data.$id}${this.panelService.activePanelID} svg`).getBoundingClientRect();
                        wrapper.style.bottom = `${fixtureSvg.bottom - planogramOffset.bottom}px`;
                    }
                    if (options.data.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                        let actualFixtureHeight = fixture.querySelector('svg').getBoundingClientRect();
                        this.previewOffsetY = actualFixtureHeight.y + actualFixtureHeight.height - mouseoffset.y;
                        this.previewOffsetX = actualFixtureHeight.x - mouseoffset.x;
                        this.previewHeight = actualFixtureHeight.height;
                        //(positionRect.y + positionRect.height) - mouseoffset.y;
                    } else {
                        let fixtureRect = fixture.getBoundingClientRect();
                        this.previewOffsetY = fixtureRect.y + fixtureRect.height - mouseoffset.y;
                        this.previewOffsetX = fixtureRect.x - mouseoffset.x;
                        this.previewHeight = fixtureRect.height;
                    }
                }
                break;
            }
        }
    }
}
