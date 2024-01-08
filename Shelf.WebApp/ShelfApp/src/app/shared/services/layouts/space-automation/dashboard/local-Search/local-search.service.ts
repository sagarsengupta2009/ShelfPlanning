import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { TranslateService } from '@ngx-translate/core';
import { isEmpty, find } from 'lodash-es';
import {
    PlanogramStoreService,
    SharedService,
    HistoryService,
    PlanogramService,
    PanelService,
    PlanogramCommonService,
    DictConfigService,
    NotifyService,
} from 'src/app/shared/services';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    AllSettings, apiEndPoints, PlanogramView, IApiResponse,
    AppSettings, SearchAction, FieldSearchVM, SavedSearch, PanelView, PanelSplitterViewType
} from 'src/app/shared/models';
import { Position, Section } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';

@Injectable({
    providedIn: 'root',
})
export class LocalSearchService {
    public openNewProdInv = new Subject();
    public openProductLib = new Subject();
    public cloneProduct = new Subject();
    public isNumField = new BehaviorSubject(false);
    public itemlistEmpty = new BehaviorSubject(false);
    public searchFieldsFrmDb: FieldSearchVM;
    public placeHolderValue: string = this.translate.instant('LOCAL_SEARCH_FIND_AND_SELECT');
    public search: string = '';
    public actionFlag: boolean = false;
    public searchAllfields: FieldSearchVM;
    public selectedSearchFields: FieldSearchVM;
    public actionsObj: SearchAction;
    public searchAction: string = '';
    public localSearchStatus: boolean = false;
    public noOfBlock: number = -1;
    public selectedQueryBlockId: number = -1;
    public compExpression: string[] = [];
    public comp: boolean = false;
    public savedSearchOptions: SavedSearch[] = [];
    public expressionsearch: string = '';
    public selectedOp: string = '';
    public itemsearch: string = '';
    public itemscanerror: boolean = false;
    public count: string[] = [];
    public savedNames: SavedSearch[] = [];
    public value: [number, number];
    public expressiontable = false;
    //For Expression
    public expressionTooltip: string = '';
    public expressionFlag: boolean = false;
    public queryContent: Array<Array<ExpressionQueryContentVM>> = [];
    public expressionbuilderload = false;
    public selectedType = 'UPC';
    public posRef: { sectionId: string; indexToAdd: number; selectedObj: any }; // TODO: @Pranita add data type
    public scanRegEx: RegExp;
    // itemList can be any type of array respective to property
    // Used in childcomponents\advance-search\advance-search.component.html
    public itemList: any[] = [];
    public minValue: number = 0;
    public maxValue: number = 0;
    public largeStep: number = 0;
    public smallStep: number = 0;
    public minSlider: number = 0;
    public maxSlider: number = 0;
    public compValue: string;
    public min: number;
    public max: number;
    public andOrSelect = ['OR', 'AND'];
    public selectedAndOR: string[] = [];
    public filter: string = '';
    public hideForNumerictypes : boolean = true;
    public numbericComparisons = {
        BETWEEN: '-',
        EQUAL: '=',
        NOT_EQUAL: '!=',
        GREATER: '>',
        GREATER_EQUAL: '>=',
        LESS: '<',
        LESS_EQUAL: '<=',
    };
    private includeShoppingCartFlag: boolean = false;
    private selectedSearchOption: string = '';
    private addBlockDiv: number = 0;
    private expressionQueryContent: Array<Array<ExpressionQueryContentVM>> = [];
    private expressionCondition: string[] = [];
    private expressionContentLoaded: boolean = false;
    private planogramCount: number = 0;
    private pogItemDetails: Array<{ attr: string; val: any[]; type: string }> = [];

    constructor(
        private readonly http: HttpClient,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dictConfigService: DictConfigService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly notifyService: NotifyService,
        private readonly sharedService: SharedService,
        private readonly panelServie: PanelService,
        private readonly historyService: HistoryService,
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
        private readonly panelService: PanelService
    ) { }

    private getSelectedSearchField(type: string): AllSettings[] {
        return this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.filter(
            (pObj) => pObj.KeyName == type,
        );
    }
    // init search field
    public initFields(): void {
        if (
            this.dictConfigService.isReady &&
            this.planogramStore.appSettings &&
            this.planogramStore.appSettings.statusBarConfig
        ) {
            const promiseFieldOptions = this.getSelectedSearchField('POG_LOCALSEARCH_SETUP');
            const searchFieldsList = JSON.parse(promiseFieldOptions[0].SelectedValue.value as string);

            this.searchFieldsFrmDb = this.dictConfigService.prepareLocalSearchCollection(searchFieldsList);
            this.searchFieldsFrmDb.Expression.forEach((element) => {
                //The search expressions that have lookup data(multiple options), should always be changed to text to support data display in UI
                if (element.options && element.options.length > 0) {
                    element.type = 'text';
                }
            });

            this.createSearchFilter();
            if (!this.expressionContentLoaded) {
                this.showExpressionContent();
            }
        }
    }

    public showExpressionContent(): void {
        const activeSectionId = this.sharedService.getActiveSectionId() || '';
        if (activeSectionId == '') {
            return;
        }
        const dataSource = this.sharedService.getAllPositionFromObjectList(activeSectionId);
        this.pogItemDetails = [];
        //Pushing Pog atrribute content into individual variable
        for (let data of dataSource) {
            if (data.Position.PositionNo != null) {
                if (this.pogItemDetails.length == 0) {
                    this.searchFieldsFrmDb.Expression.forEach((subFieldObj) => {
                        this.pogItemDetails.push({ attr: subFieldObj.value, val: [], type: subFieldObj.type });
                    });
                }
                let j = 0;
                this.searchFieldsFrmDb.Expression.forEach((subFieldObj) => {
                    if ((subFieldObj.LkUpGroupName === '' || subFieldObj.LkUpGroupName === null) && subFieldObj.options == null) {
                        this.pogItemDetails[j].val.push(this.getPropertyByString(data, subFieldObj.field));
                    } else {
                        let result = this.getPropertyByString(data, subFieldObj.field);
                        subFieldObj.options?.forEach((option) => {
                            if (option.value == result) {
                                this.pogItemDetails[j].val.push(option.text);
                            }
                        });
                    }
                    j += 1;
                });
            }
        }

        this.pogItemDetails.forEach((attr) => {
            attr.val = [...new Set(attr.val)];
            attr.val = attr.val.filter((n) => n);
            attr.val.sort();
        });

        this.showTable();

        if (!this.expressionbuilderload) {
            this.addQueryBlock(true);
        }
    }

    public doLocalSearch(): void {
        let searchfields: FieldSearchVM;
        if (isEmpty(this.searchAllfields) && isEmpty(this.selectedSearchFields)) {
            searchfields = <FieldSearchVM>{};
        } else if (!isEmpty(this.searchAllfields)) {
            searchfields = this.searchAllfields;
        } else if (!isEmpty(this.selectedSearchFields)) {
            searchfields = this.selectedSearchFields;
        }
        if (searchfields.FieldSearch?.length) {
            this.getModifiedPlanogramVM(this.search, searchfields, this.actionsObj, this.actionFlag, false);
        } else {
            this.notifyService.warn('No search field selected');

        }
    }

    public selectQueryBlock(divId: number): void {
        this.selectedQueryBlockId = divId;
    }

    public removeQueryBlock(index: number): void {
        this.queryContent.splice(index, 1);
        this.selectedAndOR.splice(index, 1);

        if (this.count.length > index) {
            this.selectedQueryBlockId = index + 1;
        } else if (this.count.length > 0) {
            this.selectedQueryBlockId = index - 1;
            this.noOfBlock = index - 1;
        } else {
            this.selectedQueryBlockId = 0;
        }
        this.count.splice(index - 1, 1);
    }

    // TODO: @pranita for actionsObj passing value as {}, confirm data type
    public getModifiedPlanogramVM(
        search: string,
        searchFields: FieldSearchVM,
        actionsObj: any,
        actionFlag: boolean,
        includeShoppingCartItems: boolean,
    ): void {
        let isPlanogramLoaded = false;
        let isRecordFound = false;
        const isInvSearch = false;
        this.localSearchStatus = search || actionFlag ? true : false;

        let setSearchFlag = (child) => {
            if (search) {
                if (this.isPresentInList(child, search, searchFields, isInvSearch)) {
                    child.localSearchFlag = true;
                    if (this.sharedService.getActiveSectionId() == child.$sectionID) {
                        this.planogramService.addToSelectionByObject(child, child.$sectionID);
                    }
                    isRecordFound = true;
                } else {
                    child.localSearchFlag = false;
                }
            } else {
                child.localSearchFlag = false;
            }
        };
        let eachRecursive = (obj) => {
            if (obj.hasOwnProperty('Children')) {
                for (let key in obj.Children) {
                    if (this.includeShoppingCartFlag) {
                        if (obj.Children[key].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                            setSearchFlag(obj.Children[key]);
                        }
                    } else {
                        if (
                            obj.Children[key].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                            this.sharedService.getParentObject(obj.Children[key], obj.Children[key].$sectionID)
                                .ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ
                        ) {
                            setSearchFlag(obj.Children[key]);
                        }
                    }
                    eachRecursive(obj.Children[key]);
                }
            }
        };
        let UPCCollection = [];
        let makeUPCCollection = (obj) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child) => {
                    if (Utils.checkIfPosition(child)) {
                        let UPC = child['Position']['Product']['UPC'];
                        if (typeof UPCCollection[child.$sectionID][UPC] == 'undefined') {
                            UPCCollection[child.$sectionID][UPC] = [];
                        }
                        UPCCollection[child.$sectionID][UPC].push(child);
                    }
                    makeUPCCollection(child);
                }, obj);
            }
        };
        //to be continued
        if (!isEmpty(actionsObj) && actionFlag) {
            for (let panelObj in this.panelServie.panelPointer) {
                if (typeof this.panelServie.panelPointer[panelObj].sectionID != 'undefined') {
                    let sectionId = this.panelServie.panelPointer[panelObj].sectionID;
                    if (sectionId) {
                        if (
                            this.sharedService.getActiveSectionId() == sectionId &&
                            !isEmpty(this.planogramService.getLastSelectedObjectType(sectionId))
                        ) {
                            this.planogramService.removeAllSelection(sectionId);
                        }
                        UPCCollection[sectionId] = {};
                        makeUPCCollection(this.sharedService.planogramVMs[sectionId]);
                        isPlanogramLoaded = true;
                        switch (actionsObj.FunctionRef) {
                            case 'findDuplicateUPC':
                                this.findDuplicateUPC(UPCCollection);
                        }
                        isPlanogramLoaded = true;
                    }
                }
            }
        } else {
            if (search) {
                for (let panelObj in this.panelServie.panelPointer) {
                    if (typeof this.panelServie.panelPointer[panelObj].sectionID != 'undefined') {
                        let sectionId = this.panelServie.panelPointer[panelObj].sectionID;
                        if (sectionId) {
                            if (
                                this.sharedService.getActiveSectionId() == sectionId &&
                                !isEmpty(this.planogramService.getLastSelectedObjectType(sectionId))
                            ) {
                                this.planogramService.removeAllSelection(sectionId);
                            }

                            //logic for inventory model search
                            this.filterInventoryModel(search, searchFields, this.sharedService.planogramVMs[sectionId]);
                            if (
                                includeShoppingCartItems &&
                                this.panelServie.panelPointer[panelObj].componentID == PlanogramView.POSITION
                            ) {
                                this.includeShoppingCartFlag = true;
                            }
                            eachRecursive(this.sharedService.planogramVMs[sectionId]);
                            if (!isRecordFound) {
                                this.notifyService.warn('NO_RECORD_FOUND_WITH_THIS_MATCH');
                            }

                            isPlanogramLoaded = true;
                            if (this.planogramCount == 0) {
                                this.planogramCount++;
                            }
                        }
                    }
                }
            } else {
                for (const panelObj in this.panelServie.panelPointer) {
                    if (typeof this.panelServie.panelPointer[panelObj].sectionID != 'undefined' && !isPlanogramLoaded) {
                        const sectionId = this.panelServie.panelPointer[panelObj].sectionID;
                        if (sectionId) {
                            isPlanogramLoaded = true;
                        }
                    }
                }
            }
        }
        if (!isPlanogramLoaded) {
            this.notifyService.warn('NO_PLANOGRAM_LOADED');
            this.planogramCount++;
        }
        this.planogramService.selectionEmit.next(true);
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    public applyExpressionFilters(): void {
        let flag = this.queryContent.some((ele) => ele.length > 0);
        if (flag) {
            this.actionFlag = true;
            this.expressionFlag = true;
            this.searchAction = '';
            for (var i = 0; i < this.queryContent.length; i++) {
                if (this.queryContent[i].length > 0 && this.searchAction != '') {
                    this.searchAction += ' ' + this.selectedAndOR[i] + ' ';
                }

                this.queryContent[i].forEach((item, key) => {
                    if (this.searchAction != '' && key > 0) {
                        this.searchAction += ' and ';
                    }
                    this.searchAction += ' ' + item.attr + ':';
                    item.val.forEach((eachItem, index) => {
                        if (index == 0) {
                            this.searchAction += eachItem;
                        } else {
                            this.searchAction += ', ' + eachItem;
                        }
                    });
                });
            }
            this.expressionTooltip = this.searchAction;
            if (this.searchAction.length > 20) {
                this.searchAction = this.searchAction.substring(0, 20);
                this.searchAction += '...';
            }
            this.searchAllfields = this.searchFieldsFrmDb;
            this.expressionQueryContent = this.queryContent;
            this.expressionCondition = this.selectedAndOR;
            this.getModifiedPlanogramForExpression(
                this.expressionFlag,
                this.searchAllfields,
                this.expressionQueryContent,
                this.expressionCondition,
            );
        } else {
            this.notifyService.warn('NO_FIELDS_SELECTED');
        }
    }

    public clearFilter(): void {
        this.queryContent = [];
        this.noOfBlock = -1;
        this.selectedAndOR = [];
        $('#queryBlock1').remove();
        this.count = [];
        this.selectQueryBlock(0);
        this.expressionbuilderload = false;
        this.addQueryBlock(true);
        this.selectedOp = '';
        this.expressionsearch = '';
        this.filter = '';
        this.savedSearchOptions = [...this.savedNames];
        this.expressionTooltip = '';
    }

    public getModifiedPlanogramForExpression(
        expressionFlag: boolean,
        searchFields: FieldSearchVM,
        expressionQueryContent: Array<Array<ExpressionQueryContentVM>>,
        expressionCondition: string[],
    ): void {
        let isPlanogramLoaded = false;
        const isInvSearch = false;
        this.localSearchStatus = expressionFlag;

        let eachRecursive = (obj) => {
            if (obj.hasOwnProperty('Children')) {
                for (let key in obj.Children) {
                    if (
                        obj.Children[key].ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                        this.sharedService.getParentObject(obj.Children[key], obj.Children[key].$sectionID)
                            .ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ
                    ) {
                        this.setSearchFlag(
                            obj.Children[key],
                            expressionQueryContent,
                            expressionCondition,
                            searchFields,
                            isInvSearch,
                            patternComp,
                        );
                    }
                    eachRecursive(obj.Children[key]);
                }
            }
        };
        //Build the pattern with longest string forst to make sure of proper match success
        let patternComp = this.numbericComparisons.GREATER_EQUAL + '|';
        patternComp += this.numbericComparisons.LESS_EQUAL + '|';
        patternComp += this.numbericComparisons.NOT_EQUAL + '|';
        patternComp += this.numbericComparisons.GREATER + '|';
        patternComp += this.numbericComparisons.LESS + '|';
        patternComp += this.numbericComparisons.EQUAL + '|';
        patternComp += this.numbericComparisons.BETWEEN;
        if (expressionQueryContent) {
            for (let panelObj in this.panelServie.panelPointer) {
                if (typeof this.panelServie.panelPointer[panelObj].sectionID != 'undefined') {
                    let sectionId = this.panelServie.panelPointer[panelObj].sectionID;

                    if (sectionId) {
                        if (
                            this.sharedService.getActiveSectionId() == sectionId &&
                            !isEmpty(this.planogramService.getLastSelectedObjectType(sectionId))
                        ) {
                            this.planogramService.removeAllSelection(sectionId);
                        }
                        eachRecursive(this.sharedService.planogramVMs[sectionId]);
                        if (this.planogramService.getSelectionCount(sectionId) == 0) {
                            this.notifyService.warn('NO_RECORD_FOUND_WITH_THIS_MATCH');
                        }
                        isPlanogramLoaded = true;
                        if (this.planogramCount == 0) {
                            this.planogramCount++;
                        }
                    }
                }
            }
        }

        if (!isPlanogramLoaded) {
            this.notifyService.warn('NO_PLANOGRAM_LOADED');
            this.planogramCount++;
        }
        this.planogramService.selectionEmit.next(true);
        this.planogramService.updateNestedStyleDirty = true;;
        this.planogramService.highlightPositionEmit.next(true);
    }

    // local search component
    // ToDo: @pranita data type of input parameter
    public addProductFromNewProdIntro(data): void {
        if (data && data.addproduct) {
            if (data.res) {
                const sectionId = this.posRef.sectionId;
                const rootObject = this.sharedService.getObject(sectionId, sectionId) as Section;
                const ctx = new Context(rootObject)
                let position = this.planogramCommonService.initPrepareModel([data.res], rootObject);
                position[0].Position.Product['IsNPI'] = true;
                const validMove = this.posRef.selectedObj.isBasicValidMove({
                    height: true,
                    width: true,
                    newHeight: parseInt(data.res.Height) + this.posRef.selectedObj.Location.Y,
                    newWidth: parseInt(data.res.Width) + this.posRef.selectedObj.Location.X,
                    forSection: true,
                    forBoth: false,
                    forSelf: false,
                });
                if (validMove.flag) {
                    this.addToFixture(ctx, this.posRef.selectedObj, position[0], this.posRef.indexToAdd);
                    this.planogramService.insertPogIDs(position, true, undefined, 'npiInItemScanned');
                } else {
                    this.notifyService.warn('NPI_ADDNPIFAILED_MESSAGE');
                }
            } else {
                this.notifyService.warn('Could not save New Product.');
            }
        }
    }

    public onSelect(name: string): void {
        if (this.selectedOp != undefined) {
            const index = this.savedSearchOptions.findIndex((x) => x.name == name);
            this.selectedSearchOption = this.savedSearchOptions[index].search;
            this.setSavedSearch(this.selectedSearchOption);
            this.noOfBlock = -1;
            this.count = [];
            for (var i = 0; i < this.queryContent.length; i++) {
                if (this.noOfBlock != -1) {
                    this.count.push('');
                }
                this.addQueryBlock(false);
            }
            this.expressionsearch = name;
        }
    }

    // advance search
    public showTable(): void {
        const item = this.pogItemDetails.find(it => it.attr == this.selectedType);

        if (item && item.val.length) {
            this.itemList = item.val;
            if (['int', 'float'].includes(item.type)) {
                this.minValue = item.val[0];
                this.maxValue = 0;
                this.compValue = this.numbericComparisons.BETWEEN;
                this.compExpression = Object.keys(this.numbericComparisons).map((index) => {
                    const expression = this.numbericComparisons[index];
                    return expression;
                });

                // Find min and max
                const numberValues = item.val.filter(it => typeof it !== 'string') as number[];
                this.minValue = Math.min(...numberValues);
                this.maxValue = Math.max(...numberValues);
                if (this.minValue == this.maxValue) {
                    this.minValue = 0;
                }

                this.min = this.minValue;
                this.max = this.maxValue;
                this.minSlider = Math.floor(this.minValue);
                this.maxSlider = Math.ceil(this.maxValue);
                this.value = [this.min, this.max];
                this.selectedCompValue();
                this.isNumField.next(true);
                this.createKendoSlider();
            } else {
                this.isNumField.next(false);
            }
        } else {
            this.itemList = [];
            this.isNumField.next(false);

        }
        this.hideForNumerictypes  = ['int', 'float'].includes(item?.type)? false: true ;
        this.itemlistEmpty.next(!this.itemList.length);
        this.expressiontable = true;
    }

    public QueryBlock(): void {
        if (this.addBlockDiv == 0) {
            this.addBlockDiv = 1;
        } else {
            this.addBlockDiv = this.addBlockDiv + 1;
        }
        this.noOfBlock = this.noOfBlock + 1;
        this.queryContent[this.noOfBlock] = [];
        this.selectedAndOR[this.noOfBlock] = 'OR';
        this.count.push('');
        this.selectQueryBlock(this.count.length);
    }

    public addQueryContent(val: string, attr: string): void {
        if (this.queryContent.length <= 0) {
            this.queryContent[this.selectedQueryBlockId] = this.arrUnique([], val, attr);
        } else {
            this.queryContent[this.selectedQueryBlockId] = this.arrUnique(
                this.queryContent[this.selectedQueryBlockId],
                val,
                attr,
            );
        }
        this.queryContent[this.selectedQueryBlockId].sort((a, b) => {
            if (a['attr'] > b['attr']) {
                return 1;
            } else if (a['attr'] < b['attr']) {
                return -1;
            }
            return 0;
        });
    }

    // TODO: @pranita move to component
    public selectedCompValue() {
        if (this.compValue != '-') {
            this.min = null;
            this.comp = true;
        } else {
            this.min = this.minValue;
            this.comp = false;
        }
    }

    public createKendoSlider(): void {
        if (this.max - this.min < 50 && this.max - this.min > 20) {
            this.smallStep = 1;
            this.largeStep = 5;
        } else if (this.max - this.min < 20) {
            this.smallStep = 1;
            this.largeStep = Math.floor(this.max / 5);
        } else if (this.max - this.min > 50 && this.max - this.min < 100) {
            this.smallStep = 10;
            this.largeStep = Math.floor(((this.max / 5) / this.smallStep));
        } else if (this.max - this.min > 100 && this.max - this.min < 500) {
            this.smallStep = 20;
            this.largeStep = Math.floor(((this.max / 5) / this.smallStep));
        } else if (this.max - this.min > 500) {
            this.smallStep = 100;
            this.largeStep = Math.floor(((this.max / 5) / this.smallStep));
        }
        if (this.smallStep < 0) {
            this.smallStep = 0;
        }
        if (this.largeStep < 0) {
            this.largeStep = 0;
        }
    }

    private setSavedSearch(savedSearch: string): void {
        let search = JSON.parse(savedSearch);
        this.queryContent = search.queryContent;
        this.selectedAndOR = search.andOrSelect;
    }

    //TODO: @pranita Data types for input parameter
    public addToFixture(ctx: Context, toFixture: any, position: any, indexToAdd: number, availableInCart?: boolean): void {
        let rootObject = this.sharedService.getObject(toFixture.$sectionID, toFixture.$sectionID);
        const toIndex = indexToAdd || toFixture.Children.length;
        const dropCoord = { left: toFixture.Dimension.Width, top: toFixture.Dimension.Height };
        if (availableInCart) {
            const cartObj = Utils.getShoppingCartObj(rootObject.Children);
            const fromIndex = cartObj.Children.indexOf(position);
            cartObj.movePosition(ctx, fromIndex, toFixture, indexToAdd, dropCoord);
        } else toFixture.addPosition(ctx, position, toIndex, dropCoord);
        this.planogramService.removeAllSelection(toFixture.$sectionID);
        this.planogramService.addToSelectionByObject(position, toFixture.$sectionID);
        let unqHistoryID = this.historyService.startRecording();
        let original = ((obj, position, index, dropCoord) => {
            return () => {
                this.planogramService.addByID(obj.$sectionID, position.$id, position);
                this.planogramService.addPosInvModel(position, rootObject);
                obj.addPosition(ctx, position, index, dropCoord);
            };
        })(toFixture, position, toIndex, dropCoord);
        let revert = ((obj, index, pos) => {
            return () => {
                obj.removePosition(ctx, index);
                this.planogramService.deleteFromInvModel(obj.$sectionID, pos);
                this.planogramService.cleanByID(obj.$sectionID, pos.$id);
            };
        })(toFixture, toIndex, position);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'addProduct',
        });
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    }

    public handleItemScannedNotFound(upc: string): void {
        if (
            !(
                this.planogramStore.appSettings.newproductintro &&
                this.planogramStore.appSettings.newproductintro.SelectedValue.value
            )
        ) {
            upc = '';
            this.notifyService.warn('SCANNED_ITEM_NOT_FOUND');
        }
        this.itemscanerror = true;
        this.openNewProdInv.next(upc);
    }

    // TODO: @pranita sectionobj data type
    private filterInventoryModel(search: string, searchFields: FieldSearchVM, sectionObj: any): void {
        let inventoryModelArr = sectionObj.PackageInventoryModel;
        let isInvSearch = true;
        for (let key in inventoryModelArr) {
            if (this.isPresentInList(inventoryModelArr[key], search, searchFields, isInvSearch)) {
                inventoryModelArr[key].InvLocalSearchFlag = true;
            } else {
                inventoryModelArr[key].InvLocalSearchFlag = false;
            }
        }
    }

    // TODO:  @pranita data type
    private findDuplicateUPC(UPCCollection): void {
        let selectedObj = [];
        this.sharedService.duplicateProducts = [];
        for (let [, obj] of Object.entries(UPCCollection)) {
            for (let [, fieldObj] of Object.entries(obj)) {
                if (fieldObj.length > 1) {
                    fieldObj.forEach((pObj) => {
                        if (
                            pObj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT &&
                            this.sharedService.getParentObject(pObj, pObj.$sectionID).ObjectDerivedType !=
                            AppConstantSpace.SHOPPINGCARTOBJ
                        ) {
                            pObj.localSearchFlag = true;

                            if (this.sharedService.getActiveSectionId() == pObj.$sectionID) {
                                selectedObj.push(pObj);
                                this.sharedService.duplicateProducts.push(pObj);
                            }
                        }
                    });
                } else {
                    fieldObj[0].localSearchFlag = false;
                }
            }
        }
        this.sharedService.duplicateProducts = [...new Set(selectedObj)];
        if (this.panelService.panelPointer[this.panelService.activePanelID].view === PanelView.ITEM && this.planogramStore.splitterViewMode.displayMode == PanelSplitterViewType.Full) {
            this.sharedService.duplicateProducts = this.sharedService.duplicateProducts.filter((test, index, array) =>
                index === array.findIndex((findTest) =>
                    findTest.Position.Product.UPC === test.Position.Product.UPC
                )
            );
        }
        this.sharedService.duplicateProducts.forEach((element) => {
            this.planogramService.addToSelectionByObject(element, element.$sectionID);
        })
        this.sharedService.selectedDuplicateProducts.next(this.sharedService.duplicateProducts);
    }

    private arrUnique(arr: ExpressionQueryContentVM[], value: string, attr: string) {
        let unique = true;
        let newField = true;
        if (!arr) {
            arr = [];
        }
        arr.forEach((arrObject) => {
            if (arrObject.attr === attr) {
                newField = false;
                if (arrObject.attr !== 'Size' && arrObject.attr !== 'Sales' && arrObject.attr !== 'Movement') {
                    unique = !arrObject.val.includes(value)
                    if (unique) arrObject.val.push(value);
                } else {
                    arrObject.val = [value];
                }
            }
        });
        if (newField) {
            arr.push({ val: [value], attr: attr });
        }
        return arr;
    }

    private createSearchFilter(): void {
        for (let d of this.searchFieldsFrmDb.FieldSearch) {
            d.selected = true;
        }
        for (let d of this.searchFieldsFrmDb.Actions) {
            d.selected = false;
        }
        this.searchAllfields = this.searchFieldsFrmDb;
    }

    /**
     *
     * @param obj : object is POsition type from which we have to find property value based on propString
     * @param propString : property string mention property hierarchy like 'Position.Product.UOM'
     * @returns return the value of child from property string, it can be any
     */
    private getPropertyByString(obj: Position, propString: string): any {
        if (!propString) return obj;
        let prop: any;
        let props: any = propString.split('.');

        for (var i = 0, iLen = props.length - 1; i < iLen; i++) {
            prop = props[i];

            let candidate = obj[prop];
            if (candidate != undefined) {
                obj = candidate;
            } else {
                break;
            }
        }
        return obj[props[i]];
    }

    private isPresentInList(pObj, search: string, searchFields: FieldSearchVM, isInvSearch: boolean): boolean {
        let flag = false;
        searchFields.FieldSearch.forEach((fieldObj) => {
            if (flag == false) {
                if (isInvSearch && (fieldObj.value == 'UPC' || fieldObj.value == 'Name')) {
                    let fieldValue: any;
                    if (fieldObj.value == 'UPC') {
                        fieldValue = pObj.UPC;
                    } else {
                        fieldValue = pObj.ProductName;
                    }
                    if (typeof fieldValue != 'undefined' && fieldValue != 0 && fieldValue != null) {
                        if (
                            (typeof fieldValue == 'string' &&
                                fieldValue.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
                            (typeof fieldValue == 'number' && fieldValue.toString() == search)
                        ) {
                            flag = true;
                        }
                    }
                } else {
                    if (fieldObj.options) {
                        fieldObj.options.forEach((item, key) => {
                            fieldObj.options[key].text = fieldObj.options[key].text.toLowerCase();
                        });
                        let lowercaseText = search.toLowerCase();
                        let newFieldObj = find(fieldObj.options, { text: lowercaseText });
                        let fieldValue = this.getPropertyByString(pObj, fieldObj.field);
                        if (typeof newFieldObj != 'undefined' && newFieldObj.value == fieldValue) {
                            flag = true;
                        }
                    } else {
                        let fieldValue = this.getPropertyByString(pObj, fieldObj.field);
                        if (typeof fieldValue != 'undefined' && fieldValue != 0 && fieldValue != null) {
                            if (
                                (typeof fieldValue == 'string' &&
                                    fieldValue.toLowerCase().indexOf(search.toLowerCase()) > -1) ||
                                (typeof fieldValue == 'number' && fieldValue.toString() == search)
                            ) {
                                flag = true;
                            }
                        }
                    }
                }
            }
        });
        return flag;
    }

    private addQueryBlock(clear: boolean): void {
        this.addBlockDiv += 1;
        this.noOfBlock += 1;
        if (!this.expressionbuilderload) {
            if (clear) {
                this.selectedAndOR[this.noOfBlock] = 'AND';
            }
            this.expressionbuilderload = true;
        } else {
            if (clear) {
                this.selectedAndOR[this.noOfBlock] = 'OR';
            }

            this.selectQueryBlock(this.noOfBlock);
        }
        this.selectQueryBlock(this.noOfBlock);
    }

    //TODO: @pranita: data type for child
    private setSearchFlag(
        child: any,
        expressionQueryContent: Array<Array<ExpressionQueryContentVM>>,
        expressionCondition: string[],
        searchFields: FieldSearchVM,
        isInvSearch: boolean,
        patternComp: string,
    ): void {
        child.localSearchFlag = false;
        let localFlag = true;
        let subLocalFlag = false;
        for (let i = 0; i < expressionQueryContent.length; i++) {
            if (
                (expressionCondition[i] == 'AND' && localFlag == true) ||
                (expressionCondition[i] == 'OR' && subLocalFlag == false)
            ) {
                if (expressionCondition[i] == 'OR' && expressionQueryContent[i].length > 0) {
                    localFlag = true;
                }
                for (let j = 0; j < expressionQueryContent[i].length; j++) {
                    //For FieldSets
                    if (localFlag == true) {
                        let queryContentSubChild = expressionQueryContent[i][j];
                        if (this.isPresent(child, queryContentSubChild, searchFields, isInvSearch, patternComp)) {
                            child.localSearchFlag = true;
                            if (this.sharedService.getActiveSectionId() == child.$sectionID) {
                                this.planogramService.addToSelectionByObject(child, child.$sectionID);
                            }
                        } else {
                            child.localSearchFlag = false;
                            if (this.sharedService.getActiveSectionId() == child.$sectionID) {
                                this.planogramService.removeFromSelectionByObject(child, child.$sectionID);
                            }
                            localFlag = false;
                        }
                    }
                }
                if (child.localSearchFlag == true) {
                    subLocalFlag = true;
                }
            }
        }
    }

    //TODO: @pranita: data type for child
    private isPresent(
        child: any,
        queryContentSubChild: ExpressionQueryContentVM,
        searchFields: FieldSearchVM,
        isInvSearch: boolean,
        patternComp: string,
    ) {
        let searchField = searchFields.Expression.find((ele) => ele.value == queryContentSubChild.attr);
        let flag = false;
        if (isInvSearch && (searchField.value == 'UPC' || searchField.value == 'Name')) {
            let fieldValue: any;
            if (searchField.value == 'UPC') {
                fieldValue = child.UPC;
            } else {
                fieldValue = child.ProductName;
            }

            if (typeof fieldValue != 'undefined' && fieldValue != 0 && fieldValue != null) {
                queryContentSubChild.val.forEach((searchItem) => {
                    if (
                        (typeof fieldValue == 'string' &&
                            fieldValue.toLowerCase().indexOf(searchItem.toLowerCase()) > -1) ||
                        (typeof fieldValue == 'number' && fieldValue == searchItem)
                    ) {
                        flag = true;
                    }
                });
            }
        } else {
            if (searchField.LkUpGroupName && searchField.options) {
                let fieldValue = this.getPropertyByString(child, searchField.field);
                queryContentSubChild.val.forEach((searchItem) => {
                    let data = find(searchField.options, { text: searchItem });
                    if (typeof data != 'undefined') {
                        if (data.value == fieldValue) {
                            flag = true;
                        }
                    }
                });
            } else {
                if (searchField.type == 'int' || searchField.type == 'float') {
                    let fieldValue = this.getPropertyByString(child, searchField.field);
                    fieldValue = fieldValue !== null ? fieldValue : 0;
                    queryContentSubChild.val.forEach((searchItem) => {
                        let compFound = searchItem.match(patternComp);
                        let beforeComp = compFound.input.substr(0, compFound.index);
                        let afterComp = compFound.input.substr(compFound.index + compFound[0].length);
                        let second = +afterComp;
                        if (compFound != null && compFound.length > 0 && compFound[0].length > 0) {
                            switch (compFound[0]) {
                                case this.numbericComparisons.GREATER_EQUAL:
                                    if (fieldValue >= second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.LESS_EQUAL:
                                    if (fieldValue <= second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.NOT_EQUAL:
                                    if (fieldValue != second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.GREATER:
                                    if (fieldValue > second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.LESS:
                                    if (fieldValue < second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.EQUAL:
                                    if (fieldValue == second) {
                                        flag = true;
                                    }
                                    break;
                                case this.numbericComparisons.BETWEEN:
                                    if (fieldValue >= +beforeComp && fieldValue <= second) {
                                        flag = true;
                                    }
                                    break;
                            }
                        }
                    });
                } else {
                    let fieldValue = this.getPropertyByString(child, searchField.field);
                    if (typeof fieldValue != 'undefined' && fieldValue != 0 && fieldValue != null) {
                        queryContentSubChild.val.forEach((searchItem) => {
                            if (
                                (typeof fieldValue == 'string' &&
                                    fieldValue.toLowerCase().indexOf(searchItem.toLowerCase()) > -1) ||
                                (typeof fieldValue == 'number' && fieldValue == searchItem)
                            ) {
                                flag = true;
                            }
                        });
                    }
                }
            }
        }
        return flag;
    }

}

export interface ExpressionQueryContentVM {
    attr: string;
    val: any[];
}
