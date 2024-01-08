import { Injectable, ElementRef } from '@angular/core';
import { cloneDeep, indexOf, filter, groupBy } from 'lodash-es';
import { Observable, merge, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { AppConstantSpace, LocalStorageKeys, Utils } from 'src/app/shared/constants';
import { ClipBoardItem, DisplayInfo, IApiResponse, AnnotationResponse, ZoomType, AnnotationType } from 'src/app/shared/models';
import {
    PanelService,
    HistoryService,
    QuadtreeUtilsService,
    NotifyService,
    PlanogramStoreService,
    PlanogramService,
    PlanogramHelperService,
    ClipBoardService,
    PlanogramCommonService,
    PlanogramLibraryService,
    HighlightService,
    ColorService,
    AnnotationSvgRenderService,
    Render2dService,
    ShoppingCartService,
    PegboardItemCopyPasteService,
    ParentApplicationService
} from 'src/app/shared/services';
import { CrunchMode, CrunchModeService } from '../../../../crunch-mode/crunch-mode.service';
import { Modular, Section, Annotation, Position, StandardShelf, Block, PegBoard, SlotWall, Crossbar } from 'src/app/shared/classes';
import {
    FixtureList,
    SharedService,
    SelectableList,
    ObjectListItem,
    MerchandisableList,
    PegTypes,
    CoffinTypes,
} from 'src/app/shared/services/common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { LabelNumber } from 'src/app/shared/models/planogram-enums';
import { E } from '@angular/cdk/keycodes';

@Injectable({
    providedIn: 'root',
})
export class Planogram_2DService {
    public sectionID: string;
    public mousePosition: MouseEvent;
    public consicutiveLongPressCount: number = 0;
    public selectionMode: number = 0;
    public copiedPositions: Position[] = [];
    public copiedFixture: FixtureList[] | Modular[] = [];
    public copiedAnnotations: Annotation[] = [];
    public longPressedStatus: boolean = false;
    public componentNumber: number;
    public panelId: string;
    public datasource: Section = null;
    public isRemoveItems: boolean;
    public scaleFactor: number;
    public el: ElementRef;
    modularColorMap: { [key: string]: string } = {};

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
        private readonly planogramHelper: PlanogramHelperService,
        private readonly highlightService: HighlightService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly clipBoardService: ClipBoardService,
        private readonly quadtreeUtilsService: QuadtreeUtilsService,
        private readonly HistoryService: HistoryService,
        private readonly panelService: PanelService,
        private readonly localStorage: LocalStorageService,
        private readonly log: ConsoleLogService,
        private readonly color: ColorService,
        private readonly crunchMode: CrunchModeService,
        private readonly annotationSvgRender: AnnotationSvgRenderService,
        private readonly render2d: Render2dService,
        private readonly shoppingCartService: ShoppingCartService,
        private readonly pegboardItemCopyPasteService: PegboardItemCopyPasteService,
        private readonly parentApp: ParentApplicationService
    ) { }

    public activate(): void {
        const app = document.querySelectorAll('.svgPatterns')[0];

        if (app != null || app != undefined) {
            app.innerHTML = Utils.generateProductAuthSVGPattern(this.planogramStore.appSettings.ProductAuthPattern);
            app.innerHTML += Utils.generateProductAuthCSS(this.planogramStore.appSettings.ProductAuthPattern, 'DOM');

            // for labels for performance we have to put at one place the defs
            let addLabelPattern = (o, n) => {
                app.classList.contains('.customlabelbackgroundcolorSVG')
                    ? app.classList.remove('.customlabelbackgroundcolorSVG')
                    : '';

                app.innerHTML += Utils.generateLabelBGSVGPattern(this.planogramService, LabelNumber.LABEL1);//label1
                app.innerHTML += Utils.generateLabelBGSVGPattern(this.planogramService, LabelNumber.LABEL2);//label2
            };

            addLabelPattern(1, 2);
        }
    }

    public objectClicked(object: any, $event: MouseEvent): void {
        this.sectionID = this.sharedService.getActiveSectionId();

        var lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(this.sectionID);

        if ($event.which == 1 || $event.type == 'tap') {
            var parentObj = this.sharedService.getObject(object.$idParent, this.sectionID);
            //first we check if the object exists in selection
            //if yes then unselect it, else procced selection on this

            if (
                this.planogramService.checkSelectedByObject(object, this.sectionID) != -1 &&
                this.sharedService.link != 'allocate' &&
                $event.ctrlKey === false &&
                $event.shiftKey === false &&
                $event.type != 'tap'
            ) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionByObject(object, this.sectionID);
                return;
            } else if (
                this.planogramService.rootFlags[this.sectionID].selectionCount > 1 &&
                this.planogramService.checkSelectedByObject(object, this.sectionID) != -1 &&
                this.sharedService.link != 'allocate'
            ) {
                this.planogramService.removeFromSelectionByObject(object, this.sectionID);
                return;
            }

            //this means definitely remove all selection
            if ($event.type == 'tap' || ($event.ctrlKey === false && $event.shiftKey === false)) {
                if (
                    this.planogramService.rootFlags[this.sectionID].selectionCount <= 1 ||
                    this.sharedService.link == 'allocate'
                ) {
                    this.planogramService.removeAllSelection(this.sectionID);
                    this.planogramService.addToSelectionByObject(object, this.sectionID);
                    if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                        //RubberBanding.rbManageAnchors(sectionObj, object, $scope.rubberBandingSelection);
                    }
                } else {
                    //In multi selection mode
                    //if different object clicked
                    if (
                        (lastSelectedType != '' && object.ObjectDerivedType != lastSelectedType) ||
                        (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                            this.sharedService.getLastSelectedParentDerievedType(
                                this.sharedService.getActiveSectionId(),
                            ) == AppConstantSpace.SHOPPINGCARTOBJ &&
                            parentObj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ)
                    ) {
                        return;
                    }
                    if ($event.type != 'tap') {
                        this.planogramService.removeAllSelection(this.sectionID);
                    }
                    this.planogramService.addToSelectionByObject(object, this.sectionID);
                }

                if (object.ObjectDerivedType == 'Block') {
                    for (var p = 0; p < object.Position$id.length; p++) {
                        $('#' + object.Position$id[p]).addClass('block-selected');
                    }
                    if (object.adjucentBlocks && object.adjucentBlocks.length > 0) {
                        for (var i = 0; i < object.adjucentBlocks.length; i++) {
                            var bObj = this.sharedService.getObject(object.adjucentBlocks[i] as any, this.sectionID) as Block; //@salma temp fix added as any adjacent block is a block object but need to pass id
                            for (var p = 0; p < bObj.Position$id.length; p++) {
                                $('#' + bObj.Position$id[p]).addClass('block-selected');
                            }
                            this.planogramService.addToSelectionById(object.adjucentBlocks[i].$id, this.sectionID);
                        }
                    }
                }
            }
        }

        //right click and it's NOT applicable in multi select mode
        if (this.sharedService.link == 'allocate' && this.sharedService.mode == 'manual') {
            if ($event.which == 3 && this.planogramService.rootFlags[this.sectionID].selectionCount >= 1) {
                //check if you right clicked on already selected items
                if (this.planogramService.checkSelectedByObject(object, this.sectionID) == -1) {
                    this.planogramService.removeAllSelection(this.sectionID);
                    this.planogramService.addToSelectionByObject(object, this.sectionID);
                }
            }
        } else if ($event.which == 3 && this.planogramService.rootFlags[this.sectionID].selectionCount <= 1) {
            //check if you right clicked on already selected items
            if (this.planogramService.checkSelectedByObject(object, this.sectionID) == -1) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionByObject(object, this.sectionID);
            }
        }

        this.sharedService.setActiveSectionId(this.sectionID);
        if (this.sharedService.isItemScanning) {
            let ele = document.getElementById('search') as HTMLInputElement;
            if (ele) {
                ele.focus();
            }
        }
    }

    public objectLongPressed(object: SelectableList): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let lastSelectedType = this.planogramService.getLastSelectedObjectDerivedType(this.sectionID);
        this.longPressedStatus = true;
        if (
            object.ObjectDerivedType != lastSelectedType &&
            this.planogramService.rootFlags[this.sectionID].selectionCount <= 1
        ) {
            this.planogramService.removeAllSelection(this.sectionID);
            this.planogramService.addToSelectionByObject(object, this.sectionID);
            this.sharedService.setActiveSectionId(this.sectionID);
            this.sharedService.setActiveComponentNumber(this.componentNumber);
            if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            }
            return;
        }
        if (
            object.ObjectDerivedType != lastSelectedType &&
            this.planogramService.rootFlags[this.sectionID].selectionCount > 1
        ) {
            return;
        }
        if (
            object.ObjectDerivedType == lastSelectedType &&
            this.planogramService.rootFlags[this.sectionID].selectionCount > 1
        ) {
            this.planogramService.addToSelectionByObject(object, this.sectionID);
            this.sharedService.setActiveSectionId(this.sectionID);
            this.sharedService.setActiveComponentNumber(this.componentNumber);
            return;
        }
        if (
            object.ObjectDerivedType == lastSelectedType &&
            this.planogramService.rootFlags[this.sectionID].selectionCount <= 1
        ) {
            if (this.planogramService.checkSelectedByObject(object, this.sectionID) == -1) {
                this.planogramService.addToSelectionByObject(object, this.sectionID);
            }
            this.sharedService.setActiveSectionId(this.sectionID);
            this.sharedService.setActiveComponentNumber(this.componentNumber);
            return;
        }
    }

    public showModular(): Boolean | void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (!this.datasource.isBayPresents) return false;
        this.planogramService.removeAllSelection(this.sectionID);
        this.sharedService.RemoveSelectedItemsInWS.next({ view: 'removeSelectionInWS' });
        this.planogramService.rootFlags[this.sectionID].isModularView =
            !this.planogramService.rootFlags[this.sectionID].isModularView;
        this.showModularNext();
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    private showModularNext() {
        let panelId = this.planogramService.selectedPogPanelID;
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        const storedMode = this.planogramStore.splitterViewMode;
        if (
            storedMode.displayMode !== 0 &&
            storedMode.syncMode &&
            this.panelService.panelPointer.panelOne.view == 'panelView' &&
            this.panelService.panelPointer.panelTwo.view == 'panelView'
        ) {
            this.modularView('panelOne');
            this.modularView('panelTwo');
        } else {
            this.modularView(panelId);
        }
    }

    public modularView(panelId: string): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (this.planogramService.rootFlags[this.sectionID].isModularView) {
            for (let i = 0; i < this.datasource.Children.length; i++) {
                let currentObject = this.datasource.Children[i];
                if (currentObject.ObjectDerivedType == AppConstantSpace.MODULAR) {
                    let jQueryObj = document.getElementById(currentObject.$id + panelId);
                    if (jQueryObj != null) {
                        let bayWidth = parseInt(jQueryObj.style.width);
                        let sideLength = bayWidth / 4;
                        let fontSize = sideLength / 3;
                        if (Object.keys(this.modularColorMap).includes(currentObject.$id)) {
                            jQueryObj.style.backgroundColor = this.modularColorMap[currentObject.$id];
                        } else {
                            const color = this.color.generateRandomRgbColor();
                            jQueryObj.style.backgroundColor = color;
                            this.modularColorMap[currentObject.$id] = color;
                        }
                        let iDiv = document.getElementById('bayhighLightCircle' + currentObject.$id + panelId);
                        if (iDiv == null) {
                            iDiv = document.createElement('div');
                            iDiv.className = 'bayhighLightCircle z-index-5';
                            iDiv.textContent = 'M' + currentObject.Fixture.FixtureNumber;
                            iDiv.id = 'bayhighLightCircle' + currentObject.$id + panelId;
                            jQueryObj.appendChild(iDiv);
                            jQueryObj.style.opacity = '0.6';
                            let childNew = document.getElementById('bayhighLightCircle' + currentObject.$id + panelId);
                            if (childNew) {
                                childNew.style.textAlign = 'center';
                                const modularsCount = this.sharedService.getModularsCount(this.datasource);
                                const bayHighLighterZIndex = modularsCount + AppConstantSpace.bayHighLighterZIndex;
                                childNew.style.zIndex = bayHighLighterZIndex.toString();
                                childNew.style.color = 'rgb(255, 255, 255)';
                                childNew.style.backgroundColor = 'rgb(23, 1, 1)';
                                childNew.style.borderRadius = '2px';
                            }
                        } else {
                            iDiv.textContent = 'M' + currentObject.Fixture.FixtureNumber;
                            jQueryObj.appendChild(iDiv);
                        }
                        const sideLengthPx = sideLength + 'px';
                        const fontSizePx = fontSize + 'px';
                        const topPx = parseInt(jQueryObj.style.height) / 2 - sideLength / 2 + 'px';
                        const leftPx = parseInt(jQueryObj.style.width) / 2 - sideLength / 2 + 'px';
                        iDiv.style.top = topPx;
                        iDiv.style.height = sideLengthPx;
                        iDiv.style.width = sideLengthPx;
                        iDiv.style.lineHeight = sideLengthPx;
                        iDiv.style.left = leftPx;
                        iDiv.style.fontSize = fontSizePx;
                        jQueryObj.style.zIndex = this.getMaxZIndex();
                        //@Sagar: check and update the bay label's zIndex after turning off and again turning on the segment mode
                        iDiv.style.zIndex = Number(jQueryObj.style.zIndex) > Number(iDiv.style.zIndex) ? jQueryObj.style.zIndex + 1 : iDiv.style.zIndex;
                        jQueryObj.style.opacity = '0.6';
                    }
                }
            }
        } else {
            this.planogramService.removeAllSelection(this.sharedService.activeSectionID);
            //Added for modular stylying
            this.sharedService.styleModuleSelect.next(true);
            for (let i = 0; i < this.datasource.Children.length; i++) {
                let currentObject = this.datasource.Children[i];
                if (currentObject.ObjectDerivedType == AppConstantSpace.MODULAR) {
                    document.getElementById(currentObject.$id + panelId).style.zIndex = '0'; //@Sagar: To make zIndex 0 of each bay, so that children of modular can be visible when segment mode is on or off
                    document.getElementById(currentObject.$id + panelId).classList.remove('selectedAntFixture');
                    let jQueryObj = document.getElementById(currentObject.$id + panelId);
                    jQueryObj.style.backgroundColor = '';
                    jQueryObj.style.opacity = '1';
                    let bayHighlightObj = document.querySelector(`[id*="bayhighLightCircle${currentObject.$id}"]`);
                    bayHighlightObj?.parentNode.removeChild(bayHighlightObj);
                }
            }
        }
    }

    //@Sagar: to update particular Bay's label(zIndex of the label) after attaching modular image
    public updateModularLabelzIndex(id: string): void {
        const panelId = this.planogramService.selectedPogPanelID;
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        for (let currentObject of this.datasource.Children) {
            let jQueryObj = document.getElementById(currentObject.$id + panelId);
            if (currentObject.ObjectDerivedType == AppConstantSpace.MODULAR && currentObject.$id === id) {
                let iDiv = document.getElementById('bayhighLightCircle' + currentObject.$id + panelId);
                iDiv.style.zIndex = jQueryObj.style.zIndex + 1;
            }
        };
    }

    public dismissBay(bay: Modular) {
        let bayObj = document.querySelector(`[id*="${bay.$id}"]`) as HTMLElement;
        bayObj.style.zIndex = bay.getZIndex().toString();
        bayObj.classList.remove('selectedAntFixture');
        bayObj.style.backgroundColor = '';
        bayObj.style.opacity = '1';
        let bayHighlightObj = document.querySelector(`[id*="bayhighLightCircle${bay.$id}"]`);
        bayHighlightObj.parentNode.removeChild(bayHighlightObj);
    }

    private getMaxZIndex(): string {
        return Math.max(
            ...Array.from(document.querySelectorAll('shelf-panel-section *'), el =>
                parseFloat(window.getComputedStyle(el).zIndex),
            ).filter(zIndex => !Number.isNaN(zIndex)),
            0,
        ).toString();
    }

    public toggleLabelMode(): void {
        this.planogramService.labelOn = !this.planogramService.labelOn;
        var clOff = $('div.customizedLabel-off');
        var clOn = $('div.customizedLabel-on');
        if (clOn.length > 0) clOn.removeClass('customizedLabel-on').addClass('customizedLabel-off');
        else if (clOff.length > 0) clOff.removeClass('customizedLabel-off').addClass('customizedLabel-on');
        this.shoppingCartService.checkForChangeInCart.next(false);
    }

    public toggleDisplayMode(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.planogramService.rootFlags[this.sectionID].mode =
            (this.planogramService.rootFlags[this.sectionID].mode + 1) % 3; // Toggles the Display mode
        this.sharedService.toggleDisplayMode.next({ toggleDisplayMode: 'shoppingCart' });
    }
    public toggleAnnotations(bayData?: Section, onLoad?: boolean): Observable<void> {
        this.planogramService.rootFlags[bayData.$id].isAnnotationView =
            this.planogramService.rootFlags[bayData.$id].isAnnotationView < 3
                ? this.planogramService.rootFlags[bayData.$id].isAnnotationView
                : 0;
        var section = this.sharedService.getObject(bayData.$id, bayData.$id) as Section;
        let observable: Observable<void> = of();
        if ((this.planogramService.rootFlags[bayData.$id].isAnnotationView && !section.annotationLoaded) || onLoad) {
            section.annotationLoaded = true;
            observable = this.planogramService.getAnnotationsForPlanogram(section.IDPOG).pipe(
                map((res) => {
                    this.processAnnotations(section, res);
                    this.planogramService.UpdatedSectionObject.next(section);
                    setTimeout(() => {
                        this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);
                    }, 400)
                }),
                catchError((err, caught) => {
                    section.annotationLoaded = false;
                    return caught;
                }),
            );
        }
        return observable;
    }

    public processAnnotations(data: Section, annotations: IApiResponse<AnnotationResponse[]>): Section {
        var sectionID = data.$id;
        if (!annotations.Data || annotations.Data.length == 0) {
            return data;
        }
        try {
            annotations.Data.forEach((child, key) => {
                var refId = child.IDPOGObject || child.IDPOG;
                var refPogObject = this.sharedService.getObjectByIDPOGObject(refId, sectionID);
                child.ObjectDerivedType = 'Annotation';

                // In case of load from auto saved version, attribute will be an object. Hence do not need Json parse.
                if (typeof child.Attribute === 'string') {
                    child.Attribute = JSON.parse(child.Attribute);
                }

                var actualIDPOGObject = child.IDPOGObject;
                child.IDPOGObject = child.IDPOGObject
                    ? 'ANO' + child.IDPOGObject + child.IdPogObjectExtn
                    : 'ANO' + child.IDPOG + child.IdPogObjectExtn;
                this.planogramCommonService.extend(child, false, sectionID, data);
                child.IDPOGObject = actualIDPOGObject;

                if (refPogObject) {
                    child.$belongsToID = refPogObject.$id;
                    child.status = 'existing';
                } else {
                    child.status = 'deleted';
                }
            });

            data.annotations = annotations.Data;
            data.PogObjectExtension = data.annotations;
            // let annotationObj =  new Annotation(this.sharedService,this.planogramservice);
            data.computeAnnotationDimension();
            //  annotationObj = null;
        } catch (e) {
            this.log.error('Error!! while processing annotations. refer planogramViewModel ', e);
        }

        return data;
    }

    public toggleItemScanning(): void {
        this.sharedService.isItemScanning = !this.sharedService.isItemScanning;
    }

    public switchBlockDisplayMode(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.planogramService.rootFlags[this.sectionID].blockview =
            (this.planogramService.rootFlags[this.sectionID].blockview + 1) % 4; // Toggles the Block Display mode
        this.quadtreeUtilsService.createQuadTree(this.sharedService.getActiveSectionId());
    }

    public selectNextPositionWithShift(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList: any = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (
            selectedObjsSize > 0 &&
            selectedObjsList[selectedObjsSize - 1].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
        ) {
            let posObject = selectedObjsList[selectedObjsSize - 1];
            let shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            // checking fixture has Items are not
            if (
                !Utils.isNullOrEmpty(shelfObject) &&
                !Utils.isNullOrEmpty(shelfObject.Children) &&
                shelfObject.Children.length > 0 &&
                !shelfObject.spreadSpanProperties.isSpreadSpan
            ) {
                if (Utils.checkIfShoppingCart(shelfObject)) {
                    return;
                }
                let shelfObjectPositions = shelfObject.getAllPosition();
                let curremtItem = shelfObjectPositions.indexOf(posObject);
                if (curremtItem < shelfObjectPositions.length - 1) {
                    if (selectedObjsSize > 1) {
                        let beforeObject = selectedObjsList[selectedObjsSize - 2];
                        let beforeItem = shelfObjectPositions.indexOf(beforeObject);
                        if (curremtItem < beforeItem) {
                            this.planogramService.removeFromSelectionByObject(
                                shelfObjectPositions[curremtItem],
                                this.sectionID,
                            );
                        } else {
                            this.planogramService.addToSelectionByObject(
                                shelfObjectPositions[curremtItem + 1],
                                this.sectionID,
                            );
                        }
                    } else {
                        this.planogramService.addToSelectionByObject(
                            shelfObjectPositions[curremtItem + 1],
                            this.sectionID,
                        );
                    }
                }
            } else {
                let selectingPositoins = shelfObject.getAllSpreadSpanPositions();
                let curremtItem = selectingPositoins.indexOf(posObject);
                if (curremtItem < selectingPositoins.length - 1) {
                    if (selectedObjsSize > 1) {
                        let beforeObject = selectedObjsList[selectedObjsSize - 2];
                        let beforeItem = selectingPositoins.indexOf(beforeObject);
                        if (curremtItem < beforeItem) {
                            this.planogramService.removeFromSelectionByObject(
                                selectingPositoins[curremtItem],
                                this.sectionID,
                            );
                        } else {
                            this.planogramService.addToSelectionByObject(
                                selectingPositoins[curremtItem + 1],
                                this.sectionID,
                            );
                        }
                    } else {
                        this.planogramService.addToSelectionByObject(
                            selectingPositoins[curremtItem + 1],
                            this.sectionID,
                        );
                    }
                }
            }
        }
    }

    public selectPreviousPositionWithShift(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList: any = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (
            selectedObjsSize > 0 &&
            selectedObjsList[selectedObjsSize - 1].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT
        ) {
            let posObject: any = selectedObjsList[selectedObjsSize - 1];
            let shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            if (Utils.checkIfShoppingCart(shelfObject)) {
                return;
            }
            // checking fixture has Items are not
            if (
                !Utils.isNullOrEmpty(shelfObject) &&
                !Utils.isNullOrEmpty(shelfObject.Children) &&
                shelfObject.Children.length > 0 &&
                !shelfObject.spreadSpanProperties.isSpreadSpan
            ) {
                let shelfObjectPositions: any = shelfObject.getAllPosition();
                let curremtItem: any = shelfObjectPositions.indexOf(posObject);
                if (curremtItem > 0) {
                    if (selectedObjsSize > 1) {
                        let beforeObject = selectedObjsList[selectedObjsSize - 2];
                        let beforeItem = shelfObjectPositions.indexOf(beforeObject);
                        if (curremtItem > beforeItem) {
                            this.planogramService.removeFromSelectionByObject(
                                shelfObjectPositions[curremtItem],
                                this.sectionID,
                            );
                        } else {
                            this.planogramService.addToSelectionByObject(
                                shelfObjectPositions[curremtItem - 1],
                                this.sectionID,
                            );
                        }
                    } else {
                        this.planogramService.addToSelectionByObject(
                            shelfObjectPositions[curremtItem - 1],
                            this.sectionID,
                        );
                    }
                }
            } else {
                let selectingPositoins = shelfObject.getAllSpreadSpanPositions();
                let curremtItem = selectingPositoins.indexOf(posObject);
                if (curremtItem > 0) {
                    if (selectedObjsSize > 1) {
                        let beforeObject = selectedObjsList[selectedObjsSize - 2];
                        let beforeItem = selectingPositoins.indexOf(beforeObject);
                        if (curremtItem > beforeItem) {
                            this.planogramService.removeFromSelectionByObject(
                                selectingPositoins[curremtItem],
                                this.sectionID,
                            );
                        } else {
                            this.planogramService.addToSelectionByObject(
                                selectingPositoins[curremtItem - 1],
                                this.sectionID,
                            );
                        }
                    } else {
                        this.planogramService.addToSelectionByObject(
                            selectingPositoins[curremtItem - 1],
                            this.sectionID,
                        );
                    }
                }
            }
        }
    }

    public selectNextPosition(fixture?: ObjectListItem, selectedItem?: Position): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        if (typeof fixture != 'undefined' && fixture.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
            let positions = fixture.Children;
            let position = filter(positions, function (val) {
                return val.Position.Product.IDProduct == selectedItem.Position.Product.IDProduct;
            })[0];
            let selectedItemIndex = indexOf(positions, position);
            let nextItemIndex = selectedItemIndex + 1;
            if (nextItemIndex >= 0 && nextItemIndex < positions.length) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionById(fixture.Children[nextItemIndex].$id, this.sectionID);
            }
        } else {
            let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
            let selectedObjsSize = selectedObjsList.length;
            if (selectedObjsSize == 1 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                let posObject = selectedObjsList[0];
                posObject.selectNextPosition();
            }
        }
    }

    public selectNextFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as FixtureList[];
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize == 1 && selectedObjsList[0].ObjectType == AppConstantSpace.FIXTUREOBJ) {
            let fixtureObject: FixtureList = selectedObjsList[0];
            this.planogramService.selectNextFixture(fixtureObject);
        }
    }
    public selectItemsWithShiftKey(currentPosition: Position): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList: any = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize == 0) {
            this.planogramService.addToSelectionByObject(currentPosition, this.sectionID);
            return;
        }
        let lastItem = selectedObjsList[selectedObjsList.length - 1];
        let positionRectCood = currentPosition.getRectCoordinates(lastItem);
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let allPositions = rootObject.getAllPositions();
        let selectionArray = [];
        for (let i = 0; i < allPositions.length; i++) {
            let parentObj = this.sharedService.getParentObject(allPositions[i], allPositions[i].$sectionID);
            if (parentObj.ObjectDerivedType !== AppConstantSpace.SHOPPINGCARTOBJ) {
                if (allPositions[i].doesIntersectWithBox(positionRectCood)) {
                    this.planogramService.addToSelectionByObject(allPositions[i], this.sectionID, false);
                    selectionArray.push(allPositions[i]);
                }
            }
        }
        this.planogramService.openPropertyGrid(selectionArray[selectionArray.length - 1]);

        this.sharedService.itemSelection.next({
            pogObjectArray: selectionArray,
            view: 'shift',
        });
    }

    public selectPreviousPosition(fixture?: ObjectListItem, selectedItem?: Position): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        if (typeof fixture != 'undefined' && fixture.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
            let positions = fixture.Children;
            let position = filter(positions, function (val) {
                return val.Position.Product.IDProduct == selectedItem.Position.Product.IDProduct;
            })[0];
            let selectedItemIndex = indexOf(positions, position);
            let previousItemIndex = selectedItemIndex - 1;
            if (previousItemIndex >= 0) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionById(fixture.Children[previousItemIndex].$id, this.sectionID);
            }
        } else {
            let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
            let selectedObjsSize = selectedObjsList.length;
            if (selectedObjsSize == 1 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                selectedObjsList[0].selectPreviousPosition();
            }
        }
    }

    public selectPreviousFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList: FixtureList[] = this.planogramService.getSelectedObject(this.sectionID) as FixtureList[];
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize == 1 && selectedObjsList[0].ObjectType == AppConstantSpace.FIXTUREOBJ) {
            let fixtureObject: FixtureList = selectedObjsList[0];
            this.planogramService.selectPreviousFixture(fixtureObject);
        }
    }

    public isPartofMultiPos(obj: Position): boolean {
        if (!Utils.isNullOrEmpty(obj.baseItem)) {
            this.notifyService.warn(this.translate.instant('ITEMS_CAN_NOT_MOVE'), 'ok');
            return true;
        } else if (Utils.checkIfPosition(obj) && (obj.hasBackItem || obj.hasAboveItem)) {
            this.notifyService.warn(this.translate.instant('BASE_ITEM_CAN_NOT_MOVE'), 'ok');
            return true;
        }
        return false;
    }

    public moveNextPositionWithCtrl(ctx: Context, datasource: Section, movementType: string): boolean {
        this.sectionID = this.sharedService.getActiveSectionId();
        if (true) {
            let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
            let selectedObjsSize = selectedObjsList.length;
            let fixturePositionMovement: number = 0.5;//setting default value
            if (selectedObjsSize > 0) {
                selectedObjsList = Utils.sortByXPos(selectedObjsList);
                let posObject = selectedObjsList[0];
                let currentFixtureObj = this.sharedService.getParentObject(posObject, posObject.$sectionID);
                if (
                    currentFixtureObj.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                    currentFixtureObj.ObjectDerivedType == AppConstantSpace.BASKETOBJ
                ) {
                    // allow move only during no crunch mode and top view for coffincase and basket
                    if (currentFixtureObj.Fixture.LKCrunchMode !== 5 || !currentFixtureObj.Fixture.DisplayViews) {
                        return;
                    }
                    fixturePositionMovement = this.planogramStore.appSettings.CoffinPositionMovement;
                }
                else if (currentFixtureObj.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                    fixturePositionMovement = this.planogramStore.appSettings.StandardShelfPositionMovement;
                }

                for (let i = 0; i < selectedObjsSize; i++) {
                    let pogObject = selectedObjsList[i];
                    if (this.isPartofMultiPos(pogObject)) {
                        return false;
                    }
                    let parentFixture = this.sharedService.getParentObject(pogObject, pogObject.$sectionID);
                    if (!Utils.isNullOrEmpty(parentFixture)) {
                        let nextIndex = parentFixture.Children.indexOf(pogObject) + 1;
                        if (parentFixture.Children.length > nextIndex) {
                            if (this.isPartofMultiPos(parentFixture.Children[nextIndex])) {
                                return false;
                            }
                        }
                    }
                }
                if (selectedObjsList[0].asPosition() && !selectedObjsList[selectedObjsSize - 1].isValidRightMovement()) {
                    return;
                }
                if (currentFixtureObj.Fixture.LKCrunchMode == 5) {
                    let X = currentFixtureObj.getNextLocX(selectedObjsList[selectedObjsSize - 1], { left: false }, fixturePositionMovement);
                    if (X > currentFixtureObj.getChildDimensionWidth()) {
                        return;
                    }
                }
                let historyId = this.HistoryService.startRecording(); //--commented
                datasource.setSkipComputePositions();
                for (let i = selectedObjsSize - 1; i >= 0; i--) {
                    let pogObject = selectedObjsList[i];
                    pogObject.moveSelectedItemToRight(fixturePositionMovement,movementType);
                }
                datasource.clearSkipComputePositions();
                this.planogramService.insertPogIDs(selectedObjsList, true);
                this.HistoryService.stopRecording(undefined, undefined, historyId); //--commented
                this.render2d.isDirty = true;
            }
        }
    }

    public movePreviousPositionWithCtrl(ctx: Context, datasource: Section,movementType:string): boolean {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        let selectedObjsSize = selectedObjsList.length;
        let fixturePositionMovement: number = 0.5;//setting default value
        if (selectedObjsSize > 0) {
            selectedObjsList = Utils.sortByXPos(selectedObjsList);
            let posObject = selectedObjsList[0];
            let currentFixtureObj = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            if (
                currentFixtureObj.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
                currentFixtureObj.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
                // allow move only during no crunch mode and top view for coffincase and basket
                if (currentFixtureObj.Fixture.LKCrunchMode !== 5 || !currentFixtureObj.Fixture.DisplayViews) {
                    return;
                }
                fixturePositionMovement = this.planogramStore.appSettings.CoffinPositionMovement;
            } else if (currentFixtureObj.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                fixturePositionMovement = this.planogramStore.appSettings.StandardShelfPositionMovement;
            }
            for (let i = 0; i < selectedObjsSize; i++) {
                let pogObject = selectedObjsList[i];
                if (this.isPartofMultiPos(pogObject)) {
                    return false;
                }
                let parentFixture = this.sharedService.getParentObject(pogObject, pogObject.$sectionID);
                if (!Utils.isNullOrEmpty(parentFixture)) {
                    let prevIndex = parentFixture.Children.indexOf(pogObject) - 1;
                    if (prevIndex >= 0) {
                        if (this.isPartofMultiPos(parentFixture.Children[prevIndex])) {
                            return false;
                        }
                    }
                }
            }
            if (selectedObjsList[0].asPosition() && !selectedObjsList[0].isValidLeftMovement()) {
                return;
            }
            if (currentFixtureObj.Fixture.LKCrunchMode == 5) {
                let X = currentFixtureObj.getNextLocX(selectedObjsList[0], { left: true }, fixturePositionMovement);
                if (X < 0) {
                    return;
                }
            }
            let historyId = this.HistoryService.startRecording(); //--commented
            datasource.setSkipComputePositions();
            for (let i = 0; i < selectedObjsSize; i++) {
                let pogObject = selectedObjsList[i];
                pogObject.moveSelectedItemToLeft(fixturePositionMovement,movementType);
            }
            datasource.clearSkipComputePositions();
            this.planogramService.insertPogIDs(selectedObjsList, true);
            this.HistoryService.stopRecording(undefined, undefined, historyId);
            this.render2d.isDirty = true;
        }
    }

    public movePositionUpWithCtrl(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        let selectedObjsSize = selectedObjsList.length;
        let historyId = this.HistoryService.startRecording();
        for (let i = 0; i < selectedObjsSize; i++) {
            let pogObject = selectedObjsList[i];
            pogObject.moveSelectedItemToUp();
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
        this.HistoryService.stopRecording(undefined, undefined, historyId);
    }

    public movePositionDownWithCtrl(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        let selectedObjsSize = selectedObjsList.length;
        let historyId = this.HistoryService.startRecording();
        for (let i = 0; i < selectedObjsSize; i++) {
            let pogObject = selectedObjsList[i];
            pogObject.moveSelectedItemToDown();
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
        this.HistoryService.stopRecording(undefined, undefined, historyId);
    }

    public selectDirectionWiseObject(ctx: Context, direction: string): boolean {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        let selectedObjsSize = selectedObjsList.length;
        let lastSelectdObject = selectedObjsList[selectedObjsSize - 1];
        if (Utils.checkIfBay(lastSelectdObject) || lastSelectdObject.ObjectDerivedType == AppConstantSpace.SECTION) {
            return false;
        }
        let yMedian = lastSelectdObject.getYPosToPog() + lastSelectdObject.Dimension.Height / 2;
        let selectedXStart = lastSelectdObject.getXPosToPog();
        let selectedXEnd = lastSelectdObject.getXPosToPog() + lastSelectdObject.Dimension.Width;
        let aboveObject = this.getDirectionWiseObject(ctx, selectedXStart, selectedXEnd, yMedian, direction, lastSelectdObject);
        if (aboveObject) {
            if (Utils.checkIfFixture(lastSelectdObject)) {
                this.planogramService.removeAllSelection(this.sectionID);
                this.planogramService.addToSelectionByObject(aboveObject, this.sectionID);
            } else if (aboveObject.Children.length > 0) {
                this.planogramService.removeAllSelection(this.sectionID);
                let index = 0;
                if ((aboveObject.ObjectDerivedType.toLowerCase() === AppConstantSpace.CROSSBAR)) {
                    index = aboveObject.Children.length - 1;
                }
                if (aboveObject.Children &&
                    aboveObject.ObjectDerivedType.toLowerCase() === AppConstantSpace.PEGBOARD ||
                    aboveObject.ObjectDerivedType.toLowerCase() === AppConstantSpace.SLOTWALL ||
                    aboveObject.ObjectDerivedType.toLowerCase() === AppConstantSpace.CROSSBAR
                ) {
                    index = this.getPegboardObjectToSelect(aboveObject.Children as Position[]);
                }
                this.planogramService.addToSelectionByObject(aboveObject.Children[index], this.sectionID);
            }
            return true;
        }
    }

    // getting the position with Minx and Max Y
    private getPegboardObjectToSelect(childrens: Position[]): number {
        let minX = Math.min(...childrens.map(item => item.Location.X))
        let result = childrens.filter(item => item.Location.X === minX);
        let maxY = Math.max(...result.map(item => item.Location.Y));
        let res = childrens.filter(item => item.Location.Y === maxY && item.Location.X === minX);
        return childrens.findIndex((ele) => ele.$id == res[0].$id);
    }

    private getDirectionWiseObject(
        ctx: Context,
        selectedXStart: number,
        selectedXEnd: number,
        yMedian: number,
        direction: string,
        lastSelectdObject: Position | FixtureList
    ): FixtureList | Position {
        let allObjects = ctx.allLimitingShelvesYPosAsc;
        let parent = this.sharedService.getParentObject(lastSelectdObject, lastSelectdObject.$sectionID);
        allObjects = allObjects.filter((obj) => {
            const xStart = obj.getXPosToPog();
            const xEnd = xStart + obj.Dimension.Width;
            if (!(xEnd - 0.005 < selectedXStart || xStart - 0.005 > selectedXEnd)) {
                const yStart = obj.getYPosToPog();
                let yEnd: number;
                yEnd = yStart + obj.Dimension.Height;
                if (parent.ObjectDerivedType.toLowerCase() === AppConstantSpace.CROSSBAR) {
                    yEnd = yStart + obj.getRectDimension().height;
                }
                if (direction === AppConstantSpace.UP) {
                    return yStart > yMedian;
                } else {
                    return yEnd < yMedian;
                }
            }
        });
        let objWithChild = Utils.sortByYPos(allObjects.filter((x) => x.Children.length > 0));
        if (lastSelectdObject.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT &&
            parent.ObjectDerivedType.toLowerCase() === AppConstantSpace.CROSSBAR &&
            objWithChild) {
            let index = objWithChild.findIndex(ele => ele.$id === parent.$id);
            if (index !== -1) {
                objWithChild.splice(index, 1);
            }
        }
        let nextFixture = [];   // TODO @Vishal/@amit  -  type : can store array of position or diffrent fixture object FixtureList/ Fixture not working
        if (lastSelectdObject.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            objWithChild.forEach((ele) => {
                if (ele.Children && ele.Children.find(e => e.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT)) {
                    nextFixture.push(ele);
                }
            })
        } else {
            nextFixture = objWithChild.map(e => e)
        }
        if (direction === AppConstantSpace.UP) {
            return Utils.sortByXPos(allObjects.filter((x) => x.getYPosToPog() == nextFixture[0]?.getYPosToPog()))[0];
        } else {
            nextFixture.reverse();
            return Utils.sortByXPos(
                allObjects.filter((x) => x.getYPosToPog() == nextFixture[0]?.getYPosToPog()),
            )[0];
        }
    }

    public increaseFacing(noOfTimes: number, data: Section): void {
        // TODO: @salma many other services  also  have same method need to check
        this.datasource = data;
        if (this.planogramHelper.isPOGLive(data.$id, true)) {
            return;
        }
        this.planogramHelper.increaseFacing(this.datasource, noOfTimes);
    }

    public incrementFacingsByOne(ctx: Context, sectionObj: Section): void {
        // TODO: @salma many other services  also  have same method need to check
        if (this.planogramHelper.isPOGLive(sectionObj.$id, true)) {
            return;
        }
        this.planogramHelper.incrementFacingsByOne(ctx, sectionObj);
    }

    public decrementFacingsByOne(ctx: Context, sectionObj: Section): void {
        // TODO: @salma many other services  also  have same method need to check
        if (this.planogramHelper.isPOGLive(sectionObj.$id, true)) {
            return;
        }
        this.planogramHelper.DecrementFacingsByOne(ctx, sectionObj);
    }

    public decreaseFacing(ctx: Context): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        this.planogramHelper.decreaseFacing(ctx, this.datasource);
    }

    public doFlip(sectionObj: Section): void {
        this.datasource = sectionObj;
        if (this.planogramHelper.isPOGLive(this.datasource.$sectionID, true)) {
            return;
        }
        this.planogramHelper.doFlip(this.datasource);
    }

    public rollUp(ctx: Context, sectionObj: Section): void {
        this.datasource = sectionObj;
        if (this.planogramHelper.isPOGLive(this.datasource.$sectionID, true)) {
            return;
        }
        this.planogramHelper.rollUp(ctx, this.datasource);
    }

    public rollDown(ctx: Context, sectionObj: Section) {
        this.datasource = sectionObj;
        if (this.planogramHelper.isPOGLive(this.datasource.$sectionID, true)) {
            return;
        }
        this.planogramHelper.rollDown(ctx, this.datasource);
    }

    public changeOrientation(val: number, data: Section, selectedFrom: string): void {
        this.datasource = data;
        if (this.planogramHelper.isPOGLive(this.datasource.$sectionID, true)) {
            return;
        }
        this.planogramHelper.changeOrientation(this.datasource, val, selectedFrom);
    }

    public setToDefaultOrientation(sectionObj: Section): void {
        this.datasource = sectionObj;
        this.planogramHelper.setToDefaultOrientation(this.datasource);
    }

    public selectItemsTillEnd(sectionObj: Section): void {
        this.datasource = sectionObj;
        this.sectionID = this.datasource.$id;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize == 1 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            selectedObjsList[0].selectAllLeftItems();
        }
    }

    public selectItemsTillHome(sectionObj: Section): void {
        this.datasource = sectionObj;
        this.sectionID = this.datasource.$id;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        if (selectedObjsSize == 1 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            selectedObjsList[0].selectAllRightItems();
        }
    }

    public selectHomeItem(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        this.planogramService.removeAllSelection(this.sectionID);
        if (selectedObjsSize > 0 && selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
            let posObject = selectedObjsList[0];
            let currentFixtureObj = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            let lastPosObj = currentFixtureObj.Children[0];
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
        }
    }

    public selectHomeItemFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        this.planogramService.removeAllSelection(this.sectionID);
        let currentfixtureSize: any = [];
        let currentFixtureObj = [];
        let pogSettings = this.planogramService.rootFlags[this.sectionID];
        if (pogSettings.isModularView) {
            currentFixtureObj = Utils.getAllTypeShelves([AppConstantSpace.MODULAR], this.datasource) as Modular[];
            currentfixtureSize = currentFixtureObj.length;
        } else {
            let posObject = selectedObjsList[0];
            currentFixtureObj = this.sharedService.getParentObject(posObject, this.sectionID).Children;
            currentfixtureSize = currentFixtureObj.length;
        }
        if (selectedObjsSize > 0 && selectedObjsList[0].ObjectType == AppConstantSpace.FIXTUREOBJ) {
            let lastPosObj = currentFixtureObj[0];
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
        }
    }

    public selectEndItem(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        let itemIndex = 0;
        this.planogramService.removeAllSelection(this.sectionID);
        if (selectedObjsSize > 0 && selectedObjsList[0].ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
            let posObject = selectedObjsList[itemIndex];
            let currentFixtureObj = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            let currentFixturePosList = currentFixtureObj.getAllPosition();
            let lastPosObj = currentFixturePosList[currentFixturePosList.length - 1];
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
        }
    }

    public selectEndItemFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        this.planogramService.removeAllSelection(this.sectionID);
        let currentfixtureSize: any = [];
        let currentFixtureObj: any = [];
        let pogSettings = this.planogramService.rootFlags[this.sectionID];
        if (pogSettings.isModularView) {
            currentFixtureObj = Utils.getAllTypeShelves([AppConstantSpace.MODULAR], this.datasource) as Modular[];
            currentfixtureSize = currentFixtureObj.length;
        } else {
            let posObject = selectedObjsList[0];
            currentFixtureObj = this.sharedService.getParentObject(posObject, this.sectionID).Children;
            currentfixtureSize = currentFixtureObj.length;
        }
        if (selectedObjsSize > 0 && selectedObjsList[0].ObjectType === AppConstantSpace.FIXTUREOBJ) {
            let lastPosObj = currentFixtureObj[currentfixtureSize - 1];
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
        }
    }

    public selectSectionLastItem(fixture?: ObjectListItem): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (typeof fixture != 'undefined' && fixture.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
            this.planogramService.removeAllSelection(this.sectionID);
            this.planogramService.addToSelectionById(fixture.Children[fixture.Children.length - 1].$id, this.sectionID);
        } else {
            this.planogramService.removeAllSelection(this.sectionID);
            let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            let positions = rootObject.getAllPositions();
            let positionLength = positions.length;
            this.planogramService.addToSelectionByObject(
                positions[positionLength - 1],
                positions[positionLength - 1].$sectionID,
            );
        }
    }

    public selectSectionLastItemFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        let fixtureCollection = this.datasource.getFixtureFullPathCollection();
        let fixture = fixtureCollection[fixtureCollection.length - 1];
        this.planogramService.removeAllSelection(this.sectionID);
        if (selectedObjsSize > 0) {
            this.planogramService.addToSelectionByObject(fixture, fixture.$sectionID);
        }
    }

    public selectSectionFirstItem(fixture?: ObjectListItem): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (typeof fixture != 'undefined' && fixture.ObjectDerivedType == AppConstantSpace.SHOPPINGCARTOBJ) {
            this.planogramService.removeAllSelection(this.sectionID);
            this.planogramService.addToSelectionById(fixture.Children[0].$id, this.sectionID);
        } else {
            let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
            let selectedObjsSize = selectedObjsList.length;
            this.planogramService.removeAllSelection(this.sectionID);
            if (selectedObjsSize > 0) {
                let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
                let positions = rootObject.getAllPositions();
                this.planogramService.addToSelectionByObject(positions[0], positions[0].$sectionID);
            }
        }
    }

    public selectSectionFirstItemFixture(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        let fixtureCollection = this.datasource.getFixtureFullPathCollection();
        this.planogramService.removeAllSelection(this.sectionID);
        if (selectedObjsSize > 0) {
            let lastPosObj = fixtureCollection[0];
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
        }
    }

    public selectAllPosition($sectionID: string): void {
        this.sectionID = $sectionID;
        let lastselectedDerivedType = this.sharedService.lastSelectedObjectDerivedType[this.sectionID];
        let sectionID = this.sectionID;
        if (
            lastselectedDerivedType == AppConstantSpace.SECTIONOBJ ||
            lastselectedDerivedType == AppConstantSpace.POSITIONOBJECT
        ) {
            this.planogramService.removeAllSelection(sectionID);
            let rootObject = this.sharedService.getObject(sectionID, sectionID) as Section;
            let positions = rootObject.getAllPositions();
            positions.forEach((item, key) => {
                if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    this.planogramService.addToSelectionByObject(item, sectionID, false);
                }
            });
            this.planogramService.openPropertyGrid(positions[positions.length - 1]);
            this.sharedService.itemSelection.next({
                pogObject: null,
                view: AppConstantSpace.SELECTALL
            });
        }
        if (
            lastselectedDerivedType == AppConstantSpace.STANDARDSHELFOBJ ||
            lastselectedDerivedType == AppConstantSpace.PEGBOARDOBJ ||
            lastselectedDerivedType == AppConstantSpace.CROSSBAROBJ ||
            lastselectedDerivedType == AppConstantSpace.SLOTWALLOBJ ||
            lastselectedDerivedType == AppConstantSpace.MODULAR ||
            lastselectedDerivedType == AppConstantSpace.COFFINCASEOBJ ||
            lastselectedDerivedType == AppConstantSpace.BASKETOBJ
        ) {
            let selectedFixtureIdArr = this.planogramService.getSelectedId(sectionID);
            this.planogramService.removeAllSelection(sectionID);
            let positions: Position[] = [];
            for (let i = 0; i < selectedFixtureIdArr.length; i++) {
                let standardShelf = this.sharedService.getObject(selectedFixtureIdArr[i], sectionID) as
                    | MerchandisableList
                    | Modular;
                positions.push(...standardShelf.getAllPosition());
            }
            positions.forEach((item, key) => {
                if (item.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    this.planogramService.addToSelectionByObject(item, sectionID, false);
                }
            });
            this.planogramService.openPropertyGrid(positions[positions.length - 1]);
        }
    }

    public doCapping(eventName: string): Observable<any[]> {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        const ctx = new Context(this.datasource);
        let positionObjs = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        let counter = positionObjs.length;
        if (counter == 0) {
            return;
        }
        //we need to check if it is having advanced tray position merch style selected and
        let unitPackageItemInfos = this.datasource.UnitPackageItemInfos.filter((unitDim) => { return unitDim.IDProduct == positionObjs[0].Position.IDProduct; })[0];
        if (!unitPackageItemInfos) {
            this.notifyService.warn('PLEASE_CHECK_THE_SELECTED_PRODUCT_HAVE_UNIT_DATA_OR_NOT');
            return;
        }
        let historyId = this.HistoryService.startRecording();
        let finishUP = (counter) => {
            if (counter == 0) {
                this.HistoryService.stopRecording(undefined, undefined, historyId);
                this.planogramService.updateNestedStyle.next(true);
                this.sharedService.updatePosPropertGrid.next(true);
                positionObjs.forEach(positionObj => {
                    this.sharedService.updatePosition.next(positionObj.$id);
                });
            }
        };

        let observableArray = [];
        // Tray or Case
        for (let itm = 0; itm < positionObjs.length; itm++) {
            let pkgStyle = positionObjs[itm].Position.ProductPackage.IdPackageStyle;
            if (pkgStyle == 1 || pkgStyle == 2) {
                let positionObj = positionObjs[itm];
                let shelfObject = this.sharedService.getParentObject(positionObj, positionObj.$sectionID);
                if (eventName != 'unit-capping-remove') {
                    if (eventName == AppConstantSpace.REMOVE_ADVANCED_CAPPING) {
                        positionObj.changeAdvanceTrayCapping(positionObj, null);
                        counter--;
                        finishUP(counter);
                    }
                    else if (eventName == AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_FRONTS ||
                        eventName == AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_DEPTHS ||
                        eventName == AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_BOTH) {
                        positionObj.changeAdvanceTrayCapping(positionObj, {
                            [AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_FRONTS]: 1,
                            [AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_DEPTHS]: 2,
                            [AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_BOTH]: 3
                        }[eventName]);
                        counter--;
                        finishUP(counter);
                    } else {
                        const observable = shelfObject.unitCapPosition(ctx, positionObj, eventName).pipe(
                            map((x) => {
                                if (x) {
                                    counter--;
                                    finishUP(counter);
                                }
                            }),
                        );
                        observableArray.push(observable);
                    }
                } else {
                    shelfObject.removeUnitCapPosition(ctx, positionObj, eventName);
                    counter--;
                    finishUP(counter);
                }
            } else {
                counter--;
                finishUP(counter);
            }
        }
        for (let itm = 0; itm < positionObjs.length; itm++) {
            if ([AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_FRONTS,
            AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_DEPTHS,
            AppConstantSpace.ADVANCEDTRAYCAPPING.CAP_TRAY_BOTH,
            AppConstantSpace.REMOVE_ADVANCED_CAPPING].includes(eventName)) {
                let positionObj = positionObjs[itm];
                let shelfObject = this.sharedService.getParentObject(positionObj, positionObj.$sectionID);
                shelfObject.computePositionsAfterChange(ctx, true);
            }
        }
        return merge<any>(...observableArray);
    }

    public doPegAlign(action: string): string {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let positionObjs = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        positionObjs = filter(positionObjs, (p) => {
            let type = this.sharedService.getObject(p.$idParent, p.$sectionID).ObjectDerivedType.toLowerCase();
            return type == 'pegboard' || type == 'slotwall';
        });
        if (positionObjs.length < 2) {
            return;
        }
        let selectedGroups = groupBy(positionObjs, function (p) {
            return p.$idParent;
        });
        for (let key in selectedGroups) {
            let group = selectedGroups[key];
            let shelf = this.sharedService.getObject(group[0].$idParent, group[0].$sectionID) as PegTypes;
            if (shelf.alignPegs) {
                shelf.alignPegs(group, action);
            }
        }
    }

    public delete(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        this.planogramService.rootFlags[this.sectionID].isActionPerformed++;
        if (this.planogramService.rootFlags[this.sectionID].isModularView) {
            let object = this.planogramService.getSelectedObject(this.sectionID)[0];
            if (Utils.checkIfBay(object)) {
                let lockFlag = object?._CalcField?.Fixture?.PositionDesc1;
                !lockFlag?.flag && this.dismissBay(object);
            }
        }
        this.planogramHelper.deleteObject(this.datasource);
        this.sharedService.deleteSubscription.next(this.sharedService.deleteSelectedPos);
    }

    public copyObjects(action: string, $sectionID: string) {
        this.datasource = this.sharedService.getObject($sectionID, $sectionID) as Section;
        this.sectionID = $sectionID;
        if (action == 'Cut') {
            this.isRemoveItems = true;
            if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
                return;
            }
        }
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
        let selectedObjsSize = selectedObjsList.length;
        for (let itm = 0; itm < selectedObjsSize; itm++) {
            let selectedPos = selectedObjsList[itm] as Position;
            if (selectedPos.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                if (!Utils.isNullOrEmpty(selectedPos.baseItem)) {
                    this.notifyService.warn(
                        "Item(s) can't be copied if the merchandising style is Above or Behind",
                        'ok',
                    );
                    return false;
                } else if (action == 'Cut' && (selectedPos.hasBackItem || selectedPos.hasAboveItem)) {
                    this.notifyService.warn("Base Item(s) can't be removed if it has Above or Behind item(s)", 'ok');
                    return false;
                }
            }
        }

        this.copiedPositions = []; // Empty the copied array before copying
        this.copiedFixture = [];
        this.copiedAnnotations = [];
        this.planogramService.rootFlags[this.sectionID].isItemCopied = false;
        this.planogramService.rootFlags[this.sectionID].isFixtureCopied = false;
        this.planogramService.rootFlags[this.sectionID].isAnnotationCopied = false;
        let selectedAnnotation = this.planogramService.getSelectedAnnotation(this.sectionID);
        if (selectedObjsSize == 0 && selectedAnnotation.length == 0) {
            return;
        }
        if (selectedAnnotation.length > 0) {
            this.copiedAnnotations = cloneDeep(selectedAnnotation);
        } else {
            if (this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.POSITIONOBJECT) {
                this.copiedPositions = cloneDeep(selectedObjsList as Position[]);
            }
            if (
                this.planogramService.getSelectionCount(this.sectionID) == 1 &&
                (this.sharedService.lastSelectedObjectDerivedType[this.sectionID] ==
                    AppConstantSpace.STANDARDSHELFOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.PEGBOARDOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.SLOTWALLOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.CROSSBAROBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] ==
                    AppConstantSpace.BLOCK_FIXTURE ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] ==
                    AppConstantSpace.COFFINCASEOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.BASKETOBJ ||
                    this.sharedService.lastSelectedObjectDerivedType[this.sectionID] == AppConstantSpace.MODULAR)
            ) {
                this.copiedFixture = cloneDeep(selectedObjsList as FixtureList[]);
                //if the selected fixture is modular should we skip coping positions?

                this.copiedFixture[0].Children = filter(this.copiedFixture[0].Children, function (obj) {
                    return obj.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT;
                });
            }
        }
        if (this.copiedPositions.length > 0) {
            this.planogramService.rootFlags[this.sectionID].isItemCopied = true;
            this.notifyService.warn(
                (this.copiedPositions.length == 1 ? '1 Item ' : this.copiedPositions.length + ' Items ') +
                (this.isRemoveItems ? 'moved' : 'copied') +
                ' to clipboard',
                'ok',
            );
        }

        if (this.copiedFixture.length > 0) {
            this.planogramService.rootFlags[this.sectionID].isFixtureCopied = true;

            this.notifyService.warn(
                (this.copiedFixture.length == 1
                    ? '1 ' + this.translate.instant('FIXTURE')
                    : this.copiedFixture.length + ' ' + this.translate.instant('FIXTURES')) +
                (this.isRemoveItems ? 'moved' : ' ' + this.translate.instant('COPIED')) +
                ' ' +
                this.translate.instant('TO_CLIPBOARD'),
                'ok',
            );
        }
        if (this.copiedAnnotations.length > 0) {
            this.planogramService.rootFlags[this.sectionID].isAnnotationCopied = true;
            this.notifyService.warn(
                (this.copiedAnnotations.length == 1
                    ? this.translate.instant('ANNOTATION')
                    : this.copiedAnnotations.length + ' ' + this.translate.instant('ANNOTATIONS') + ' ') +
                (' ' + this.translate.instant('COPIED') + ' ')
                ,
                'ok',
            );
        }
        // Copy to clipboard too.
        this.clipBoardService.copyObjects(this.sharedService.getActiveSectionId());
    }

    public removeCopyObjects(ctx: Context, copiedPositions: Position[]): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        Object.entries(copiedPositions).forEach(([key, value]) => {
            let posObject: any = value;
            let fromIndex;
            let shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            if (shelfObject.ObjectDerivedType === AppConstantSpace.SHOPPINGCARTOBJ) {
                return;
            }
            fromIndex = shelfObject.Children.findIndex((x) => x.Position.PositionNo === value.Position.PositionNo);
            shelfObject.removePosition(ctx, fromIndex);
            let original = (function (obj, fromIndex) {
                return function () {
                    obj.removePosition(ctx, fromIndex);
                };
            })(shelfObject, fromIndex);
            let revert = (function (obj, item, toIndex) {
                return function () {
                    obj.addPosition(ctx, item, fromIndex);
                };
            })(shelfObject, posObject, fromIndex);
            this.HistoryService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'removeCopyObjects',
            });
        });
    }

    public moveByNotch(ctx: Context, type: number, movementType?: string): boolean {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (true) {
            let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);
            let fixturePositionMovement: number = 0.5;//setting default value
            if (Utils.checkIfPosition(selectedObjsList[0])) {
                let func = type == 40 ? 'moveSelectedItemToDown' : 'moveSelectedItemToUp';
                let selectedObjsSize = selectedObjsList.length;
                for (let i = 0; i < selectedObjsSize; i++) {
                    let pogObject = selectedObjsList[i];
                    let currentObj = this.sharedService.getObject(pogObject.$idParent, pogObject.$sectionID);
                    if (Utils.checkIfCoffincase(currentObj) ||
                        Utils.checkIfBasket(currentObj)) {
                        // allow move only during no crunch mode, top view and no fitcheck for coffincase and basket
                        if (currentObj.Fixture.LKCrunchMode !== 5 || !currentObj.Fixture.DisplayViews || this.datasource.fitCheck) {
                            return false;
                        }
                        fixturePositionMovement = this.planogramStore.appSettings.CoffinPositionMovement;
                    }
                    else if (!(Utils.checkIfPegboard(currentObj) || Utils.checkIfSlotwall(currentObj))) {
                        return false;
                    }
                }
                let historyId = this.HistoryService.startRecording();
                for (let i = 0; i < selectedObjsSize; i++) {
                    let pogObject = selectedObjsList[i];
                    pogObject[func](fixturePositionMovement,movementType);
                }
                this.planogramService.insertPogIDs(selectedObjsList, true);
                this.HistoryService.stopRecording(undefined, undefined, historyId);
            } else {
                this.planogramHelper.moveByNotch(this.datasource, type as any);
            }
            this.datasource.computeMerchHeight(ctx);
            this.render2d.isDirty = true;
            this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
            this.planogramService.updateNestedStyleDirty = true;;
        }
    }

    private pastePositionObjects(ctx: Context, copyedPosition: Position[], selectedObjsList: SelectableList[]): void {
        let pastingObj = cloneDeep(copyedPosition);
        let cloneCopiedObj = Object.assign({}, copyedPosition);
        let selectedObjsSize = selectedObjsList.length;
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let parentObject = this.sharedService.getParentObject(selectedObjsList[0], selectedObjsList[0].$sectionID);
        let isItemPasted: boolean = false;
        if (selectedObjsList[0].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT && !Utils.checkIfPegType(parentObject)) {
            let maxHeightPos = 0;
            let maxWidthPos = 0;
            let heightFlag = false;
            let widthFlag = false;
            let forSectionFlg = false;
            let forSelfFlg = false;
            let forBothFlg = false;
            pastingObj.forEach((item) => {
                if (maxHeightPos < item.computeHeight()) maxHeightPos = item.computeHeight();
                if (maxWidthPos < item.linearWidth()) maxWidthPos = item.linearWidth();
            });
            // }
            let posObject = selectedObjsList[0];
            let shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
            if (shelfObject.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
                //for self for width
                heightFlag = true;
                widthFlag = false;
                forSectionFlg = false;
                forSelfFlg = true;
                forBothFlg = false;
            }
            if (Utils.checkIfPegType(shelfObject)) {
                //for section for height
                heightFlag = true;
                widthFlag = false;
                forSectionFlg = true;
                forSelfFlg = false;
                forBothFlg = false;
            } else if (Utils.checkIfCoffincase(shelfObject) || Utils.checkIfBasket(shelfObject)) {
                //for self for height and width
                heightFlag = true;
                widthFlag = true;
                forSectionFlg = false;
                forSelfFlg = true;
                forBothFlg = false;
            }
            // if fitcheck is turned off for the section, then ignore fitcheck validation.
            let isValidPaste: any = {};
            if (rootObject.fitCheck == false) isValidPaste['flag'] = true;
            else
                isValidPaste = shelfObject.isBasicValidMove({
                    height: heightFlag,
                    width: widthFlag,
                    newHeight: maxHeightPos,
                    newWidth: maxWidthPos,
                    forSection: forSectionFlg,
                    forBoth: forBothFlg,
                    forSelf: forSelfFlg,
                });
            if (selectedObjsSize == 0 || selectedObjsSize >= 2) {
                this.notifyService.warn(this.translate.instant('PASTE_FIXTURE_ALERT'));
            } else if (!isValidPaste.flag) {
                this.notifyService.error(isValidPaste.errMsg, 'ok');
            }
            if (isValidPaste.flag || rootObject.IsVariableHeightShelf) {
                if (!Utils.isNullOrEmpty(this.isRemoveItems) && this.isRemoveItems) {
                    this.removeCopyObjects(ctx, cloneCopiedObj);
                    this.isRemoveItems = false;
                } // First Remove items
                let selectedIndexforPaste = posObject.Position.PositionNo - 1;
                pastingObj.forEach((item) => {
                    item['Position'].IDPOGObject = null;
                    item['IDPOGObject'] = null;
                    item['IDPOGObjectParent'] = shelfObject.IDPOGObject;
                    item['baseItem'] = '';
                    item['hasAboveItem'] = false;
                    item['hasBackItem'] = false;

                    this.planogramCommonService.resetPegFields(shelfObject, (item as Position));
                    this.planogramCommonService.extend(item, true, shelfObject.$sectionID);
                    this.planogramCommonService.setParent(item, shelfObject);

                    //linking to PackageInventoryModel or PackageAttributes Object Reference
                    let prodPackID =
                        item['Position'].IDProduct.toString() + '@' + item['Position'].IDPackage.toString();
                    item['Position'].inventoryObject = this.datasource.PackageInventoryModel[prodPackID];
                    item['Position'].attributeObject = this.datasource.PackageAttributes[prodPackID];
                }); // This generates new objects with different id's
                let index;
                if (this.datasource.LKTraffic == 1) {
                    shelfObject.addCopiedPositions(ctx, pastingObj, (index = selectedIndexforPaste + 1));
                } else {
                    selectedIndexforPaste = shelfObject.Children.length - selectedIndexforPaste;
                    shelfObject.addCopiedPositions(ctx, pastingObj, (index = selectedIndexforPaste)); // posLength - pos No
                }
                this.sharedService.copyPasteSubscription.next(pastingObj); //add position to worksheet
                let original = (function (obj, copiedItemsToInsert, index) {
                    return function () {
                        obj.addCopiedPositions(ctx, copiedItemsToInsert, index);
                    };
                })(shelfObject, pastingObj, index);
                let revert = (function (obj, copiedItemsToInsert, index) {
                    return function () {
                        let howMany = copiedItemsToInsert.length;
                        obj.Children.splice(index, howMany);
                        obj.computePositionsAfterChange(ctx);
                    };
                })(shelfObject, pastingObj, index);
                this.HistoryService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'CopiedPosition',
                });

                this.planogramService.removeAllSelection(this.sectionID);
                pastingObj.forEach((value, key) => {
                    this.planogramService.addToSelectionById(value.$id, value.$sectionID, false);
                }, selectedObjsList); // This is required to deselect items functionality after pasting
                this.planogramService.openPropertyGrid(pastingObj[pastingObj.length - 1]);
                isItemPasted = true;
            }
        } else if (selectedObjsList[0].ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
            //copy standardShelf logic
            let maxHeightPos: any = 0;
            pastingObj.forEach((item) => {
                if (maxHeightPos < item.computeHeight()) maxHeightPos = item.computeHeight();
            });
            let shelfObject = selectedObjsList[0];
            let isValidPaste = shelfObject.isBasicValidMove({
                height: true,
                width: false,
                newHeight: maxHeightPos,
                newWidth: undefined,
                forSection: false,
                forBoth: false,
                forSelf: true,
            });
            if (selectedObjsSize == 0 || selectedObjsSize >= 2) {
                this.notifyService.warn(this.translate.instant('PASTE_FIXTURE_ALERT'));
            } else if (!isValidPaste.flag) {
                this.notifyService.error(isValidPaste.errMsg, 'ok');
            }
            if (isValidPaste.flag || rootObject.IsVariableHeightShelf) {
                if (!Utils.isNullOrEmpty(this.isRemoveItems) && this.isRemoveItems) {
                    this.removeCopyObjects(ctx, cloneCopiedObj);
                    this.isRemoveItems = false;
                }
                Object.entries(pastingObj).forEach(([key, item]) => {
                    item['Position'].IDPOGObject = null;
                    item['IDPOGObject'] = null;
                    item['IDPOGObjectParent'] = shelfObject.IDPOGObject;
                    item['baseItem'] = '';
                    item['hasAboveItem'] = false;
                    item['hasBackItem'] = false;

                    this.planogramCommonService.resetPegFields(shelfObject, (item as Position));
                    this.planogramCommonService.extend(item, true, shelfObject.$sectionID);
                    this.planogramCommonService.setParent(item as any, shelfObject);
                }); // This generates new objects with different id's
                let index = shelfObject.Children.length;
                shelfObject.addCopiedPositions(ctx, pastingObj, index);
                this.sharedService.copyPasteSubscription.next(pastingObj); //add to worksheet
                let original = (function (obj, copiedItemsToInsert, index) {
                    return function () {
                        obj.addCopiedPositions(ctx, copiedItemsToInsert, index);
                    };
                })(shelfObject, pastingObj, index);
                let revert = (function (obj, copiedItemsToInsert, index) {
                    return function () {
                        let howMany = copiedItemsToInsert.length;
                        obj.Children.splice(index, howMany);
                        obj.computePositionsAfterChange(ctx);
                    };
                })(shelfObject, pastingObj, index);
                this.HistoryService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'CopiedPosition',
                });
                this.planogramService.removeAllSelection(this.sectionID);
                pastingObj.forEach((value) => {
                    this.planogramService.addToSelectionByObject(value, value.$sectionID, false);
                }, selectedObjsList); // This is required to deselect items functionality after pasting
                this.planogramService.openPropertyGrid(pastingObj[pastingObj.length - 1]);
                isItemPasted = true;
            }
        } else if (
            selectedObjsList[0].ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
            selectedObjsList[0].ObjectDerivedType === AppConstantSpace.SLOTWALLOBJ ||
            selectedObjsList[0].ObjectDerivedType === AppConstantSpace.CROSSBAROBJ ||
            Utils.checkIfPegType(parentObject)
        ) {
            if (this.planogramStore.appSettings.canValidatePeggable) {
                for (const item of pastingObj) {
                    if (!item.Position.IsPeggable) {
                        this.notifyService.warn('PLEASE_SELECT_ONLY_PEGGABLE_ITEMS');
                        return;
                    }
                }
            }

            let sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;

            let ctx = new Context(sectionObj);
            let rootObject = sectionObj;

            let targetParentItemData: any = Utils.checkIfPegType(parentObject) ? parentObject : selectedObjsList[0];
            let pegHoleInfo = targetParentItemData.getPegHoleInfo();
            let pegInfo = pastingObj[0].getPegInfo();

            let leftCoord = pegHoleInfo.PegOffsetLeft + pegInfo.OffsetX + (targetParentItemData.Dimension.Width % pegHoleInfo.PegIncrementX);
            let topCoord = targetParentItemData.Dimension.Height - pegHoleInfo.PegOffsetTop - (targetParentItemData.Dimension.Height % pegHoleInfo.PegIncrementY);

            let dropCoords = { left: leftCoord, top: topCoord };

            let positionXYCords = targetParentItemData.findXYConsideringPegType(pastingObj[0], dropCoords);
            let isItemExceedingSectionOnLeftSide = targetParentItemData.checkIfItemExceedSection(targetParentItemData, positionXYCords) && (targetParentItemData.getXPosToPog() + positionXYCords.X1 < 0);
            if (isItemExceedingSectionOnLeftSide) {
                dropCoords.left = dropCoords.left + pegHoleInfo.PegIncrementX;
            }
            let isItemExceedingSectionOnTopSide = targetParentItemData.checkIfItemExceedSection(targetParentItemData, positionXYCords) && (targetParentItemData.getYPosToPog() + positionXYCords.Y2 > rootObject.Dimension.Height);
            if (isItemExceedingSectionOnTopSide) {
                dropCoords.top = dropCoords.top - pegHoleInfo.PegIncrementY;
            }

            if (!Utils.isNullOrEmpty(this.isRemoveItems) && this.isRemoveItems) {
                this.removeCopyObjects(ctx, cloneCopiedObj);
                this.isRemoveItems = false;
            }

            if (!this.pegboardItemCopyPasteService.pasteCopiedObjects(targetParentItemData, rootObject, ctx, pastingObj, dropCoords)) {
                return;
            }

            this.sharedService.copyPasteSubscription.next(pastingObj); //add to worksheet

            this.planogramService.removeAllSelection(this.sectionID);

            pastingObj.forEach((value) => {
                this.planogramService.addToSelectionByObject(value, value.$sectionID, false);
            }, selectedObjsList); // This is required to deselect items functionality after pasting

            this.sharedService.pegTypeFixtureRefresh.next(targetParentItemData.$id);
            isItemPasted = true;
        } else if (
            selectedObjsList[0].ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ ||
            selectedObjsList[0].ObjectDerivedType === AppConstantSpace.BASKETOBJ
        ) {
            //copy standardShelf logic
            this.notifyService.warn(
                this.translate.instant('PASTING_ITEMS_INTO') +
                ' ' +
                selectedObjsList[0].ObjectDerivedType +
                ' ' +
                this.translate.instant('IS_CURRENTLY_DISABLED'),
                'ok',
            );
            return;
        } else {
            this.notifyService.warn(this.translate.instant('SELECT_FIXTURE_POSITION_TO_PASTE'), 'ok');
        }

        // Remove position from Shoppin card if its available
        if (isItemPasted) {
            const sectionObj = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            const cartObj = Utils.getShoppingCartObj(sectionObj.Children);
            cartObj.removePositionWithHistory(ctx, copyedPosition);
        }
    }

    private pasteFixtureObjects(
        ctx: Context,
        selectedObjsList: SelectableList[],
    ): void {
        let pastingObj = cloneDeep(this.copiedFixture[0]);
        if (pastingObj.ObjectDerivedType == AppConstantSpace.MODULAR) {
            if (!this.planogramService.rootFlags[this.sectionID].isModularView || (selectedObjsList[0].ObjectDerivedType != AppConstantSpace.MODULAR)) {
                this.notifyService.warn(this.translate.instant('SELECT_BAY_TO_DROP'), 'ok');
                return;
            }
            let toIndex;
            this.datasource
                .sortModulars(this.sharedService.getAllModulars(this.datasource))
                .forEach(function (child, index) {
                    child.$id == selectedObjsList[selectedObjsList.length - 1].$id ? (toIndex = index + 1) : '';
                });
            if (
                this.datasource.LKCrunchMode == CrunchMode.Right ||
                this.datasource.LKCrunchMode == CrunchMode.SpanRight
            ) {
                toIndex++;
            }
            for (let i = 0; i < this.copiedFixture.length; i++) {
                let copiedModular = this.copiedFixture[i];
                let modularTemplate = this.planogramStore.modularTemplate;
                modularTemplate.Fixture.IsMovable = true;
                modularTemplate.Fixture.IsMerchandisable = false;
                this.datasource.duplicateModulars(modularTemplate, {
                    noOfMoudlars: 1,
                    modularWidth: copiedModular.Dimension.Width,
                    duplicateFixtures: true,
                    duplicatePositions: true,
                    duplicateFacings: true,
                    toIndex: toIndex,
                    copiedModular: copiedModular,
                });
                setTimeout(() => {
                    // forcing change detection in shelf nested
                    this.planogramService.UpdatedSectionObject.next(this.datasource);
                    this.selectSectionFirstItemFixture();
                });
            }
        } else {
            if (selectedObjsList[0].ObjectType == 'POG') {
                let selectedSectionObj = selectedObjsList[0] as Section;
                if (selectedSectionObj.isBayPresents) {
                    this.notifyService.warn(this.translate.instant('SELECT_BAY_TO_DROP'), 'ok');
                    return;
                }
                this.datasource.addCopiedFixtureToTop(ctx, pastingObj);
            }
            if (selectedObjsList[0].ObjectType == 'Fixture') {
                if (selectedObjsList[0].ObjectDerivedType == AppConstantSpace.MODULAR) {
                    selectedObjsList[0].addCopiedFixtureToTop(ctx, pastingObj);
                } else {
                    let selectedFixtureObj = selectedObjsList[0] as FixtureList;
                    selectedFixtureObj.addCopiedFixtureToTopORBottom(ctx, pastingObj);
                }
            }
        }
        this.datasource.applyRenumberingShelfs();
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        rootObject.computeMerchHeight(ctx, { reassignFlag: null, recFlag: true });
        this.planogramService.refreshModularView.next(true);
        this.sharedService.gridReloadSubscription.next(true);
        this.render2d.isDirty = true;
    }
    private pasteAnnotationObjects(selectedObjsList: SelectableList[]): boolean {
        let rootObject = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let lastSelObject = this.planogramService.getLastSelectedObjectType(this.sectionID);
        let multipleAnnPogObjs: boolean;
        if (this.copiedAnnotations.length > 1 && selectedObjsList.length == 0) {
            this.notifyService.warn(this.translate.instant('SELECT_SECTION_ANY_FIXTURE_POSITION'), 'ok');
            return false;
        }
        if (
            this.copiedAnnotations.length > 1 &&
            (lastSelObject == AppConstantSpace.FIXTUREOBJ || lastSelObject == AppConstantSpace.POSITIONOBJECT)
        ) {
            this.notifyService.warn(this.translate.instant('PASTE_MULTPLE_ANNOTATIONS'), 'ok');
            return false;
        }
        for (const item of selectedObjsList) {
            multipleAnnPogObjs =
                rootObject.annotations.filter(function (ann) {
                    return ann.$belongsToID == item.$id && ann.status !== 'deleted';
                }).length > 0;
        }

        if (selectedObjsList[0].ObjectType != AppConstantSpace.POG && multipleAnnPogObjs) {
            this.notifyService.warn('PASTE_OPERATION_CANT_BE_DONE', 'ok');
            return false;
        }

        let mapperObj = this.planogramLibraryService.getObjectFromIDPOG(rootObject.IDPOG);
        for (const selectedObj of selectedObjsList) {
            for (const [j, annotation] of this.copiedAnnotations.entries()) {
                // every pasted item should be clone of the clipboard item.
                const isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_CONNECTOR, AnnotationType.FREEFLOW_TEXT].includes(annotation.LkExtensionType);
                let selectedPogObj = isFreeFlow? rootObject: selectedObj;
                const copiedAnnotations = cloneDeep(annotation);
                copiedAnnotations.IDPOGObject = null;
                copiedAnnotations.status = 'insert';
                copiedAnnotations.IdPogObjectExtn = null;
                copiedAnnotations.$belongsToID = null;
                copiedAnnotations.selected = false;
                copiedAnnotations.IDPOG = rootObject.IDPOG;
                copiedAnnotations.$sectionID = rootObject.$sectionID;
                copiedAnnotations.IdPogObjectExtnLocal = Utils.generateGUID();
                let actualIDPOGObject = selectedPogObj.IDPOGObject;
                copiedAnnotations.TempId = selectedPogObj.TempId;
                copiedAnnotations.IDPOGObject = copiedAnnotations.IDPOGObject
                    ? 'ANO' + copiedAnnotations.IDPOGObject + copiedAnnotations.IdPogObjectExtn
                    : (('ANO' + copiedAnnotations.IDPOG + copiedAnnotations.IdPogObjectExtn) as any);
                this.planogramCommonService.extend(copiedAnnotations, false, this.sectionID);
                copiedAnnotations.IDPOGObject = actualIDPOGObject;

                this.annotationSvgRender.calculateAnnotationPosition(
                    copiedAnnotations,
                    selectedPogObj as Position,
                    rootObject,
                );
                copiedAnnotations.$belongsToID = selectedPogObj.$id;
                rootObject.addAnnotation(copiedAnnotations, mapperObj.isPOGReadOnly);
                this.planogramService.rootFlags[this.sectionID].isAnnotationView = 1;
                (selectedPogObj as Section) ? (copiedAnnotations.Attribute.callout = true) : '';
                isFreeFlow ?  (copiedAnnotations.Attribute.callout = false) : '';
                this.sharedService.updateAnnotationPosition.next(true);

                if (mapperObj.isPOGReadOnly) {
                    // TODO: @salma unable to test this as paste objects feature not working
                    this.planogramService.saveAnnotationforReadonlyPlanogram(copiedAnnotations).subscribe((res) => {
                        copiedAnnotations.status = 'saved';
                    });
                }
            }
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
    }
    public pasteObjectHistoryRecord(annotationCopied: boolean) {
        let historyId: string;
        historyId = this.HistoryService.startRecording();
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID);


        const ctx = new Context(this.sharedService.getObjectAs(this.sectionID, this.sectionID));

        //position pasting logic goes here
        if (this.copiedPositions && this.copiedPositions.length > 0 && !annotationCopied) {
            this.pastePositionObjects(ctx, this.copiedPositions, selectedObjsList);
        }
        //fixture pasting logic goes here
        if (this.copiedFixture && this.copiedFixture.length > 0 && !annotationCopied) {
            this.pasteFixtureObjects(ctx, selectedObjsList);
        }
        //Pasting annotations goes here
        if (this.copiedAnnotations && this.copiedAnnotations.length > 0 && annotationCopied) {
            //Selected objects should not have more than one annotation.
            this.pasteAnnotationObjects(selectedObjsList);
            this.sharedService.updateValueInPlanogram.next(selectedObjsList);
        }
        this.planogramService.insertPogIDs(selectedObjsList, true);
        this.HistoryService.stopRecording(undefined, undefined, historyId);
    }
    public pasteObjects($sectionID: string): boolean {
        this.datasource = this.sharedService.getObject($sectionID, $sectionID) as Section;
        this.sectionID = $sectionID;
        let annotationCopied: boolean = false;
        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        let lastSelObject: ClipBoardItem = this.clipBoardService.clipboard[0];
        if (lastSelObject && lastSelObject.ObjectDerivedType == 'Annotation') {
            this.copiedAnnotations == this.clipBoardService.clipboard[0]['annotations'];

            annotationCopied = true;
        }
        // If the last copied item is from a different Section then show Clipboard.
        else if (this.clipBoardService.showClipboardIfApplicable('Paste')) {
            return false;
        }
        this.pasteObjectHistoryRecord(annotationCopied);
    }

    public centerViewPanZoom = (event?) => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:center');
    };

    public fitToWindowPanZoom = (event?) => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:reset');
    };

    public fitToHeightPanZoom = (event?) => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:height');
    };

    public upPanZoom = () => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:up');
    };

    public leftPanZoom = () => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:left');
    };

    public downPanZoom = () => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:down');
    };

    public rightPanZoom = () => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:right');
    };

    public zoomInPanZoom = (flag?) => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:zoomin', flag);
    };

    public zoomOutPanZoom = (flag?) => {
        //<directive>:<feature>
        //$scope.$broadcast('panZoom:zoomout', flag);
    };

    public doUndo() {
        this.HistoryService.undo();
    }

    public doRedo() {
        this.HistoryService.redo();
    }

    public changeCrunchMode(val: number): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        let historyID = this.HistoryService.startRecording();
        this.crunchMode.changeCrunchMode(this.datasource, val);
        this.HistoryService.stopRecording(undefined, undefined, historyID);
    }

    public toggleHighlightTool(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.highlightService.toggleHighlightTool(this.sectionID);
    }

    public moveModular(ctx: Context, action: string): void {
        this.sectionID = this.sharedService.getActiveSectionId();

        if (this.planogramHelper.isPOGLive(this.sectionID, true)) {
            return;
        }
        let selectedObjsList = this.planogramService.getSelectedObject(this.sectionID) as Modular[];
        let selectedObjsSize = selectedObjsList.length;

        if (selectedObjsSize > 0) {
            let modularObj = selectedObjsList[0];
            let rootObj: Section = this.sharedService.getObject(modularObj.$sectionID, this.sectionID) as Section;
            let fromIndex = rootObj.Children.indexOf(modularObj);
            let toIndex = 0;
            let nextModularObj;
            if (action == 'arrowleft') {
                toIndex = fromIndex - 1;
            } else {
                toIndex = fromIndex + 1;
            }
            if (rootObj.Children.length > toIndex) {
                nextModularObj = rootObj.Children[toIndex];
            }
            if (nextModularObj != undefined && nextModularObj.ObjectDerivedType !== AppConstantSpace.SHOPPINGCARTOBJ) {
                modularObj.interchangeFixture(fromIndex, toIndex);
            }

            rootObj.computeMerchHeight(ctx);
            rootObj.applyRenumberingShelfs();
            this.sharedService.updateAnnotationPosition.next(true);
        }
    }

    //Change display mode input coming from Display dialog
    public changeDisplayMode(event: MouseEvent, displayObject: DisplayInfo): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        let displayObj: any = displayObject;
        if (displayObj.zoom != undefined) {
            switch (parseInt(displayObj.zoom)) {
                case 0:
                    break;
                case 1: {
                    this.fitToWindowPanZoom(event);
                    break;
                }
                case 2: {
                    this.centerViewPanZoom(event);
                    break;
                }
                case 3: {
                    this.fitToHeightPanZoom(event);
                    break;
                }
            }
        }
        if (displayObj.view != this.planogramService.rootFlags[this.sectionID].mode && displayObj.view != undefined) {
            this.planogramService.rootFlags[this.sectionID].mode = Number(displayObj.view);
        }

        if (this.planogramService.rootFlags[this.sectionID].isGrillView != displayObj.grillView) {
            this.planogramService.rootFlags[this.sectionID].isGrillView = displayObj.grillView;
            this.sharedService.updateGrillOnFieldChange.next(true);
        }
        if (
            this.planogramService.rootFlags[this.sectionID].isModularView != displayObj.modularView &&
            displayObj.modularView != undefined
        ) {
            this.showModular();
        }
    }

    public selectPositionTillNextSelection(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
    }

    //This method actually resizes the anchors on rubberbanding items
    //on any change
    public reArrangeRubberBandingAnchors(): void {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;

        setTimeout(() => {
            let sectionObj = this.datasource;
            let selectedCount = this.planogramService.getSelectionCount(sectionObj.$id);
            if (selectedCount > 1 || selectedCount == 0) {
                //RubberBanding.rbHideAnchors(sectionObj);--commented
            } else {
                if (
                    this.planogramService.getLastSelectedObjectDerivedType(sectionObj.$id) ==
                    AppConstantSpace.POSITIONOBJECT
                ) {
                    //RubberBanding.rbMoveAnchors(sectionObj, selectedList[0]);--commented
                }
            }
        }, 100);
    }

    public multiFixtureAllignToLeft(sectionObj: Section) {
        this.datasource = sectionObj;
        let sectionID = sectionObj.$id;
        let selectedCount = this.planogramService.getSelectionCount(sectionID);
        if (
            this.planogramService.getLastSelectedObjectDerivedType(sectionID) == AppConstantSpace.STANDARDSHELFOBJ &&
            selectedCount > 1
        ) {
            let selectedObjects = this.planogramService.getSelectedObject(sectionID) as StandardShelf[];
            let firstObj = selectedObjects[0];
            let historyID = this.HistoryService.startRecording();
            selectedObjects.forEach((value) => {
                value.moveFixture(
                    value.getXPosToPog(),
                    firstObj.getYPosToPog(),
                    value.Fixture.Width,
                    null,
                    '"' + value.Fixture.FixtureDesc + '" couldnot be aligned due to fitcheck errors',
                );
            });
            this.planogramService.insertPogIDs(selectedObjects, true);
            this.HistoryService.stopRecording(undefined, undefined, historyID);
        }
    }

    public doCoffinAlign(action: string): string {
        this.sectionID = this.sharedService.getActiveSectionId();
        this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
        let positionObjs = this.planogramService.getSelectedObject(this.sectionID) as Position[];
        if (positionObjs.length < 2) {
            return;
        }
        let selectedGroups = groupBy(positionObjs, function (pos) {
            return pos.$idParent;
        });
        for (let key in selectedGroups) {
            let group = selectedGroups[key];
            let coffins = this.sharedService.getObject(group[0].$idParent, group[0].$sectionID) as CoffinTypes;
            if (coffins.alignCoffins && group.length > 1) {
                coffins.alignCoffins(group, action);
            }
        }
    }
}

