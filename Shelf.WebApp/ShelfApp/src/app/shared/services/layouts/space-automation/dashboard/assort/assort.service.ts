import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, of, Subject } from 'rxjs';
import * as _ from 'lodash';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { MerchandisableList, SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { PlanogramHelperService } from '../shelf-planogram/planogram-helper.service';
import { Utils } from 'src/app/shared/constants/utils';
import { PlanogramCommonService } from '../shelf-planogram/planogram-common.service';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { HistoryService } from 'src/app/shared/services/common/history/history.service';
import { QuadtreeUtilsService } from 'src/app/shared/services/common/shelfCommonService/quadtree-utils.service';
import { PropertyGridComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents/property-grid/property-grid.component';
import { AllocateCommonService } from '../../../allocate/allocate-common.service';
import { PanelService, ParentApplicationService, PlanogramLibraryApiService, PlanogramLibraryService, PlanogramStoreService, PogSideNavStateService } from 'src/app/shared/services';
import { ConsoleLogService } from 'src/app/framework.module';
import { PlanogramSaveService } from '../shelf-planogram/planogram-save.service';
import { Position, Section } from 'src/app/shared/classes';
import { PanelSplitterViewType, ZoomType, apiEndPoints } from 'src/app/shared/models';
import { SplitterService } from '../splitter/splitter.service';
import { Context } from 'src/app/shared/classes/context';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

declare const window: any;

/**
 * assort service will have a special use case where the service may subscribe to certain calls, as the service is mainly used for interacting with the parent app.
 * Hence the methods and events may not be associated with any of the components.
 */
@Injectable({
    providedIn: 'root',
})
export class AssortService {
    public triggerPogSave = new BehaviorSubject<boolean>(false);
    public assortOpenWorksheet: boolean = false;
    public triggeredFromAssort: boolean;
    public loadPlanogram: Subject<string> = new Subject<string>();
    private initialTrigger = true;

    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly planogramHelperService: PlanogramHelperService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly httpClient: HttpClient,
        private readonly matDialog: MatDialog,
        private readonly historyService: HistoryService,
        private readonly quadTreeUtils: QuadtreeUtilsService,
        private readonly allocateCommonService: AllocateCommonService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly log: ConsoleLogService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly PogSideNavStateService: PogSideNavStateService,
        private readonly splitterService: SplitterService,
        private readonly panelService: PanelService,
        private readonly planogramLibApiService: PlanogramLibraryApiService,
        private readonly planogramLibrary: PlanogramLibraryService,
        private readonly envConfig: ConfigService,
        private readonly parentApp: ParentApplicationService,
    ) {}

    public initAssortListner(): void {
        if (this.parentApp.isAssortAppInIAssortNiciMode) {
            this.splitterService.setSplitterView(PanelSplitterViewType.Full);
            window.addEventListener('message', this.processFromAssort, false);
        }
        /**
        *  ensure the focus is always on the window when any selections are triggered.
        */
        setTimeout(() => {
            window.focus();
        });      
    }

    public getShelfScenarioID(assortScenarioID: number): Observable<Object> {
        // TODO API does not follow IAPIResponse Standard.
        return this.httpClient.get(`${this.envConfig.shelfapi}${apiEndPoints.getPOGScenarioFrmAsstScenario}${assortScenarioID}`);
    }

    public closeShelf(): Observable<boolean> {
        let sectionID = this.sharedService.getActiveSectionId();
        if (this.planogramService.rootFlags[sectionID]?.isSaveDirtyFlag && sectionID != '') {
            this.planogramSaveService.savePogAndExit = true;
            return this.planogramSaveService.savePlanogram(this.sharedService.planogramVMs[sectionID], sectionID);
        } else {
            window.parent.postMessage('invokePaceFunc:closeIShelf', '*');
            return of(false);
        }
    }

    /** processFromAssort will be an callback to window post message listener,
     * which needs to be arrow funtion to retain context */
    private processFromAssort = (event: MessageEvent): void => {
        try {
            //shelf unloaded
            if (this.sharedService.getActiveSectionId() === '') {
                if (event.data.includes && event.data.includes('savePlanogramFromAssort'))
                    window.parent.postMessage('invokePaceFunc:NoChangesObserved');
                return;
            } else if (event.data?.includes('invokeShelfFunc')) {
                // function to update postion's data, TODO move function outside this scope
                let updatePosition = (newData, child) => {
                    // keys are different from the ones passed and ones to be updated, hence need to check manually
                    if (newData.LoyaltyIndex) child.Position.attributeObject['RecLoyaltyIndex'] = newData.LoyaltyIndex;
                    if (newData.MustStock) child.Position.attributeObject['RecMustStock'] = true;
                    else child.Position.attributeObject['RecMustStock'] = false;
                    if (newData.MustNotStock) child.Position.attributeObject['RecMustNotStock'] = true;
                    else child.Position.attributeObject['RecMustNotStock'] = false;
                    if (newData.Facings) child.Position.attributeObject['RecFacings'] = newData.Facings;
                    if (newData.U_ROS) child.Position.attributeObject['CurrMovt'] = newData.U_ROS;
                    if (newData.VA_ROS) child.Position.ProductPackage['Retail'] = newData.VA_ROS / newData.U_ROS;
                    if (newData.CPI) child.Position.attributeObject['RecCPI'] = newData.CPI;
                    if (newData.Facings) child.Position['FacingsX'] = newData.Facings;
                    if (newData.IDOrientation) {
                        child.Position['IDOrientation'] = newData.IDOrientation;
                        if (this.planogramStore?.lookUpHolder?.Orientation?.options?.length) {
                            let orientation = this.planogramStore.lookUpHolder.Orientation.options.filter((e) => e.value == newData.IDOrientation);
                            child.Position['IDOrientationtext'] = orientation.length > 0 ? orientation[0].text : '';   
                        }
                        child.setOrientation(child.Position['IDOrientation']);
                    };

                };

                // update NPI data
                let updateNPIItem = (newData, child) => {
                    try {
                        //  check if field exists, if exists update with new value, else keep old
                        //attribute object
                        child.Position.attributeObject.AdjustmentFactor = newData.AdjustmentFactor
                            ? newData.AdjustmentFactor
                            : child.Position.attributeObject.AdjustmentFactor;
                        //product package
                        child.Position.ProductPackage.CasePack = newData.CasePack
                            ? newData.CasePack
                            : child.Position.ProductPackage.CasePack;
                        child.Position.ProductPackage.Height = newData.Height
                            ? newData.Height
                            : child.Position.ProductPackage.Height;
                        child.Position.ProductPackage.Depth = newData.Depth
                            ? newData.Depth
                            : child.Position.ProductPackage.Depth;
                        child.Position.ProductPackage.Width = newData.Width
                            ? newData.Width
                            : child.Position.ProductPackage.Width;
                        //product
                        child.Position.Product.Brand = newData.Brand ? newData.Brand : child.Position.Product.Brand;
                        child.Position.Product.Manufacturer = newData.Manufacturer
                            ? newData.Manufacturer
                            : child.Position.Product.Manufacturer;
                        child.Position.Product.UPC = newData.UPC ? newData.UPC : child.Position.Product.UPC;
                        child.Position.Product.L2 = newData.L2 ? newData.L2 : child.Position.Product.L2;
                        child.Position.Product.L3 = newData.L3 ? newData.L3 : child.Position.Product.L3;
                        child.Position.Product.L4 = newData.L4 ? newData.L4 : child.Position.Product.L4;
                        child.Position.Product.L5 = newData.L5 ? newData.L5 : child.Position.Product.L5;
                        child.Position.Product.L6 = newData.L6 ? newData.L6 : child.Position.Product.L6;
                        child.Position.Product.DescSize = newData.DescSize
                            ? newData.DescSize
                            : child.Position.Product.DescSize;
                        child.Position.Product.Name = newData.Name ? newData.Name : child.Position.Product.Name;
                        //apply orientation
                        child.Position.IDOrientationtext = newData.Orientation;
                        child.Position.IDOrientation = this.planogramStore.lookUpHolder.Orientation.options.filter((e) => e.text == newData.Orientation);
                        child.setOrientation(child.Position.IDOrientation);
                    } catch (err) {
                        this.log.error(err);
                    }
                };
                // item selection
                if (event.data.includes('selectCSC')) {
                    let CSC = JSON.parse(event.data.split(':')[2]);
                    this.allocateCommonService.selectObject(CSC, 'Csc_Id');
                }
                // item selection
                else if (event.data.includes('selectPackage')) {
                    let IDPackage = JSON.parse(event.data.split(',')[1])[0];
                    this.allocateCommonService.selectObject(IDPackage, 'IDPackage');
                    //  selectObjectFromAllocate('Position', IDPackage, '', '', 'IDPackage');
                }
                // by sku
                else if (event.data.includes('selectSKU')) {
                    let SKU = JSON.parse(event.data.split(':')[2]);
                    this.allocateCommonService.selectObject(SKU, 'SKU');
                    // selectObjectFromAllocate('Position', SKU, '', '', 'SKU');
                }
                //add item
                else if (event.data.includes('addProduct')) {
                    let data = JSON.parse(event.data.split(':')[2]);
                    //temp fix
                    data[2] = data[2] ? data[2] : 'UNIT';
                    //upc,sku
                    this.addProduct(data[0], data[1], '', data[2]);
                }
                //delete item
                else if (event.data.includes('deleteProduct')) {
                    let IDProduct = JSON.parse(event.data.split(':')[2])[0];
                    this.deleteProduct(IDProduct);
                }
                else if (event.data.includes('swapProduct')) {
                    let data = JSON.parse(event.data.split(':')[2]);
                    let swapFrom = {};
                    swapFrom['IDProduct'] = data[0];
                    // from,to,upc
                    this.swapProducts(swapFrom, data[1], data[2]);
                }

                // load by pog id when iframe is loaded TODO
                else if (event.data.includes('loadPogById')) {
                    let data = JSON.parse(event.data.split(':')[2]);
                    this.planogramStore.loadPogId = data[0];
                    this.loadNewPlanogram(data[0]);
                    this.planogramService.PAPogsUpdate.next([data[0]]);
                } else if (event.data.includes('savePlanogramFromAssort')) {
                    if (
                        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag ==
                        false
                    ) {
                        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
                        this.planogramService.updateSaveDirtyFlag(true);
                        //window.parent.postMessage('invokePaceFunc:NoChangesObserved')
                    }
                    this.triggerPogSave.next(true);
                }
                //scope highlight TODO
                else if (event.data.includes('highlightScope')) {
                    let data = JSON.parse(event.data.split(':')[2]);
                    let itemData = {};
                    itemData['Scope'] = data[3] ? data[3] : 'P';
                    itemData['MoveUp'] = 0;
                    itemData['MoveDown'] = 0;
                    itemData['LPValue'] = data[1];
                    itemData['RPValue'] = data[2];
                    //idproduct
                    this.allocateCommonService.highlightScope(data[0], itemData);
                }

                //Initial shelf load and worksheet
                else if (event.data.includes('syncAssortWorkbook')) {
                    let data = JSON.parse(event.data.split('syncAssortWorkbook:')[1]);
                    let allPositions = this.sharedService.getAllPositionFromObjectList(
                        this.sharedService.activeSectionID,
                    );
                    allPositions.forEach((pos) => {
                        let gridItem = data.filter((e) => e.IDProduct == pos.Position.IDProduct)[0];
                        if (gridItem) {
                            updatePosition(gridItem, pos);
                            // update additional details for npi
                            if (gridItem.isNPI == true) updateNPIItem(gridItem, pos);
                        }
                    });
                    if (this.initialTrigger == false && this.assortOpenWorksheet == true) {
                        this.assortOpenWorksheet = false;
                        this.panelService.loadWorkSheet.next({ componentID: 5, key: "POGLIB_HEADERMENU_1_VIEW_ITEM" });
                    } else {
                        this.initialTrigger = false;
                        this.processADRI(
                            this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID),
                            this.sharedService.activeSectionID,
                            data,
                        );
                    }
                } else if (event.data.includes('updateItemProperty')) {
                    let data = JSON.parse(event.data.split('updateItemProperty:')[1]);
                    let allPositions = this.sharedService.getAllPositionFromObjectList(
                        this.sharedService.activeSectionID,
                    );
                    let item = allPositions.filter((e) => e.Position.Product.Csc_Id == data.CSC)[0];
                    if (item) {
                        updatePosition(data, item);
                    } else {
                        this.log.info('could not find item to update');
                    }
                } else if (event.data.includes('openPropertyGrid')) {
                    let data = JSON.parse(event.data.split('openPropertyGrid:')[1]);
                    let allPositions = this.sharedService.getAllPositionFromObjectList(
                        this.sharedService.activeSectionID,
                    );
                    for (let i = 0; i < allPositions.length; i++) {
                        if (allPositions[i].Position.Product.IDProduct == data.IDProduct) {
                            //update data
                            updatePosition(data, allPositions[i]);
                            this.openPropertyPane(allPositions[i]);
                            break;
                        }
                    }

                } else if (event.data.includes('resizePlanogram')) {
                    this.sharedService.changeZoomView.next(ZoomType.RESET_ZOOM);

                } else if (event.data.includes('clearSearch')) {
                    window.clearTextFromAllocate();
                } else if (event.data.includes('search')) {
                    let data = JSON.parse(event.data.split('search:')[1]);
                    window.triggerShelfSearch(data.value, data.field);
                }
            }
        } catch (err) {
            this.log.error(err);
        }
    }

    private deleteProduct(IDProduct: string): void {
        let pos;
        let allPositions;
        allPositions = this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID);
        pos = this.allocateCommonService.getItem(IDProduct, 'IDProduct');
        if (pos) {
            this.allocateCommonService.selectObject('', '', pos);
            this.planogramService.rootFlags[pos.$sectionID].isActionPerformed++;
            let sectionObj = this.sharedService.getObject(pos.$sectionID, pos.$sectionID) as Section;
            if (Utils.checkIfShoppingCart(pos) && pos.Position.attributeObject.RecADRI != 'A') {
                pos.Position.attributeObject.RecADRI = 'D';
            } else {
                if (pos.Position.attributeObject.RecADRI != 'A') pos.Position.attributeObject.RecADRI = 'D';
                this.planogramHelperService.deleteObject(sectionObj);
            }
        }
    }

    private addProduct(upc, SKU, isRetain, packageType): void {
      const rootObj = <Section>this.sharedService.getObject(this.sharedService.activeSectionID, this.sharedService.activeSectionID);
      const ctx = new Context(rootObj);
        let add = false;
        let allPositions = this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID);
        for (let i = 0; i < allPositions.length; i++) {
            if (allPositions[i].Position.Product.UPC == upc) {
                if (
                    isRetain == true ||
                    (this.sharedService.mode == 'iAssortNICI' &&
                        allPositions[i].Position.attributeObject.RecADRI != 'A' &&
                        allPositions[i].Position.attributeObject.IsNPI !== true)
                )
                    allPositions[i].Position.attributeObject.RecADRI = 'R';
                else allPositions[i].Position.attributeObject.RecADRI = 'A';
                add = true;
            }
        }

        if (!add) {
            this.getProduct(upc).subscribe((response: any) => {
                if (response && response.Data && response.Data.length > 0) {
                    let upc = response.Data[0].UPC;
                    for (let i = response.Data.length - 1; i >= 0; i--) {
                        // hard-coded to add item with package tpye unit only
                        if (
                            response.Data[i].Product.SKU != SKU ||
                            (packageType != undefined &&
                                response.Data[i].ProductPackage.Name.toUpperCase() !== packageType.toUpperCase())
                        ) {
                            response.Data.splice(i, 1);
                        }
                    }
                    if (response.Data == "") {
                        let res = 'Bad Data for item: ${upc}';
                        // Materialize.toast(res, 3000);
                    } else {
                        let rootObject = this.sharedService.getObject(
                            this.sharedService.getActiveSectionId(),
                            this.sharedService.getActiveSectionId(),
                        );
                        let position = this.planogramCommonService.initPrepareModel(response.Data, rootObject);
                        let cartObj = Utils.getShoppingCartObj(rootObject.Children);
                        for (let i = 0; i < position.length; i++) {
                            if (position[i].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                                position[i].Position.attributeObject.RecADRI = 'A';
                                position[i].moveSelectedToCartfromProductSearch(ctx, cartObj);
                            }
                        }
                    }
                } else {
                    // Materialize.toast('Error in adding an product', 2000);
                }
            });
        }
    }

    private openPropertyPane(item): void {
        this.planogramService.removeAllSelection(item.$sectionID);
        this.planogramService.addToSelectionByObject(item, item.$sectionID);
        this.sharedService.fixtureTypeMultiple = false;
        if (!this.PogSideNavStateService.propertiesView.isPinned) {
            const dialogRef = this.matDialog.open(PropertyGridComponent, {
                height: 'fit-content',
                width: '55%',
                id: 'property-grid-dialog'
                // data: item
            });
        }
    }

    private swapProducts(swapFrom, swapTo, upc, initialChange?): void {
        //check product on pog

        let allPositions = this.sharedService.getAllPositionFromObjectList(this.sharedService.activeSectionID);
        this.triggeredFromAssort = true;
        let positionToSwap: Position[] = [];
        let positionToSwapFrom: Position[] = [];
        let rootObject = <Section>this.sharedService.getObject(
            this.sharedService.getActiveSectionId(),
            this.sharedService.getActiveSectionId(),
        );
        const ctx = new Context(rootObject);
        let cartObj = Utils.getShoppingCartObj(rootObject.Children);
        for (let i = 0; i < allPositions.length; i++) {
            if (allPositions[i].Position.Product.IDProduct == swapTo) {
                positionToSwap.push(allPositions[i]);
            }

            if (allPositions[i].Position.Product.IDProduct == swapFrom.IDProduct) {
                positionToSwapFrom.push(allPositions[i]);
            }
        }
        if (positionToSwapFrom.length > 0) {
            if (positionToSwap.length > 0) {
                for (let i = 0; i < positionToSwapFrom.length; i++) {
                    let parent = this.sharedService.getParentObject(
                        positionToSwapFrom[i],
                        this.sharedService.activeSectionID,
                    );
                    let toIndex = parent.Children.indexOf(positionToSwapFrom[i]);
                    let oldPosition = {};
                    oldPosition['left'] = positionToSwapFrom[i].Location.X;
                    oldPosition['top'] = positionToSwapFrom[i].Location.Y;
                    positionToSwapFrom[i].Position.attributeObject.RecADRI = 'D';
                    positionToSwapFrom[i].moveSelectedToCart(ctx,cartObj);
                    let fromIndex = cartObj.Children.indexOf(positionToSwap[i]);
                    cartObj.movePosition(ctx, fromIndex, parent, toIndex, oldPosition);
                    if (initialChange != true)
                        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
                    this.quadTreeUtils.createQuadTree(this.sharedService.getActiveSectionId());
                    this.planogramService.updateSaveDirtyFlag(true);
                }
                rootObject.computeMerchHeight(ctx);
                this.planogramService.updateNestedStyleDirty = true;
            } else {
                this.getProduct(upc).subscribe(
                    (response: any) => {
                        for (let i = 0; i < response.length; i++)
                            if (response.Data[i].ProductPackage.Name.toUpperCase() != 'UNIT') {
                                response.Data.splice(i, 1);
                            }
                        if (response && response.Data && response.Data.length > 0) {
                            let rootObject = this.sharedService.getObject(
                                this.sharedService.getActiveSectionId(),
                                this.sharedService.getActiveSectionId(),
                            ) as  Section;
                            let cartObj = Utils.getShoppingCartObj(rootObject.Children);
                            for (let i = 0; i < positionToSwapFrom.length; i++) {
                                const parent: MerchandisableList = this.sharedService.getParentObject(
                                    positionToSwapFrom[i],
                                    this.sharedService.activeSectionID,
                                );
                                let toIndex = parent.Children.indexOf(positionToSwapFrom[i]);
                                let positions = this.planogramCommonService.initPrepareModel(response.Data, rootObject);
                                let oldPosition = {
                                  'left': positionToSwapFrom[i].Location.X,
                                  'top': positionToSwapFrom[i].Location.Y
                                };
                                positionToSwapFrom[i].Position.attributeObject.RecADRI = 'D';
                                positionToSwapFrom[i].moveSelectedToCart(ctx, cartObj);
                                positions[0].Position.attributeObject.RecADRI = 'A';
                                parent.addPosition(ctx, positions[0], toIndex, oldPosition, undefined, true);
                                positions[0].Location.X = oldPosition['left'];
                                positions[0].Location.Y = oldPosition['top'];
                                if (initialChange != true)
                                    this.planogramService.rootFlags[
                                        this.sharedService.getActiveSectionId()
                                    ].isSaveDirtyFlag = true;
                                parent.calculatePositionDistribution(ctx,positions[0]);
                                this.quadTreeUtils.createQuadTree(this.sharedService.getActiveSectionId());
                                this.planogramService.updateSaveDirtyFlag(true);
                            }
                            rootObject.computeMerchHeight(ctx);
                            this.planogramService.updateNestedStyleDirty = true;
                        }
                    },
                    (response) => {
                        this.log.info('error in retrieving the Product list');
                    },
                );
            }
        }
        this.triggeredFromAssort = false;
    }

    private processADRI(data, sectionID, gridData) {
        let sectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        sectionObj.setSkipComputePositions();
        sectionObj.setSkipShelfCalculateDistribution();

        try {
            let swappedInProducts = [];
            let caseType = 'UNIT';

            //Prepare Swap Data
            for (let i = 0; i < gridData.length; i++) {
                //swap
                if (gridData[i].SwapUPC) {
                    let item = data.filter((e) => e.Position.IDProduct == gridData[i].IDProduct)[0];
                    let parentItem;
                    //check if already swapped
                    if (item) {
                        parentItem = this.sharedService.getParentObject(item, sectionID);
                    }
                    if (parentItem && parentItem.Fixture.FixtureType == 'ShoppingCart') {
                        this.log.info('swap out Item not on shelf');
                    } else {
                        this.swapProducts(gridData[i], gridData[i].UPC, gridData[i].SwapUPC, true);
                        swappedInProducts.push(gridData[i].SwapUPC);
                    }
                }
            }

            // process ADRI
            for (let i = 0; i < gridData.length; i++) {
                if (!gridData[i].SwapUPC) {
                    let item = data.filter((e) => e.Position.IDProduct == gridData[i].IDProduct )[0];
                    //add
                    if (gridData[i].Rec == 'A' && !swappedInProducts.includes(gridData[i].UPC)) {
                        //item exists
                        if (item) {
                            //if npi always add
                            if (gridData[i].IsNPI == true && item.Position.attributeObject.RecADRI != 'A') {
                                this.addProduct(gridData[i].UPC, gridData[i].SKU, '', caseType);
                            } else if (
                                gridData[i].IsNPI != true &&
                                item.Position.attributeObject.RecADRI != 'R' &&
                                item.Position.attributeObject.RecADRI != 'A'
                            ) {
                                this.addProduct(gridData[i].UPC, gridData[i].SKU, true, caseType);
                            } else if (item.Position.attributeObject.RecADRI != 'A')
                                this.addProduct(gridData[i].UPC, gridData[i].SKU, '', caseType);
                        }
                        //item does not exists
                        else {
                            this.addProduct(gridData[i].UPC, gridData[i].SKU, '', caseType);
                        }
                    }
                    //delete
                    else if (gridData[i].Rec == 'D') {
                        if (item && item.Position.attributeObject.RecADRI != 'D')
                            this.deleteProduct(gridData[i].IDProduct);
                    }
                }
            }
            let addItems = data.filter((e) => e.Position.attributeObject.RecADRI == 'A');
            addItems.forEach((npi) => {
                let item = gridData.filter((e) => e.IDProduct == npi.Position.IDProduct);
                if (item.length == 0) {
                    this.deleteProduct(npi.Position.IDProduct);
                }
            });
            //end ADRI loop
        } catch (err) {
            this.log.error(err);
        }
        const ctx = new Context(sectionObj);
        sectionObj.computePositionsAfterChange(ctx);
        sectionObj.clearSkipShelfCalculateDistribution();
        this.historyService.cleanBySectionId(sectionID);
        this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false;
        this.planogramService.updateSaveDirtyFlag(false);
    }

    // TODO @karthik use product interface once setup with planogram object.
    private getProduct(upc: string) {
        const url = `${this.envConfig.shelfapi}${apiEndPoints.getProduct}${upc}`;
        return this.httpClient.get(url);
    }


    private loadNewPlanogram(pogId: string): void {
      this.PogSideNavStateService.closeSideNav.next(true);      
      this.planogramLibApiService.getPlanogramsInfo(pogId).subscribe((result) => {
        // THIS assumes this function is invoked for assort NICI only where at any given time only a single pog is loaded.
        let pogid = this.planogramStore.mappers[0].IDPOG;
        this.planogramLibrary.markRequestToUnpin([{ IDPOG: pogid}]);
        this.planogramLibrary.markRequestToPin(result.Data, false);
        this.loadPlanogram.next(pogId);
      })
    }
}
