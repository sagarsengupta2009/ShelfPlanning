import { Component, Inject, OnInit, ViewChild, EventEmitter, TemplateRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Utils } from 'src/app/shared/constants/utils';
import {
    SharedService,
    UserPermissionsService,
    NewProductInventoryService,
    ProductsService,
    HistoryService,
    PlanogramService,
    PlanogramCommonService,
    PlanogramStoreService,
    NotifyService,
    AgGridHelperService,
    ParentApplicationService,
    AllocateNpiService,
} from 'src/app/shared/services';
import { Product, ProductType } from 'src/app/shared/models/planogram/product';
import {
    CurrentMovSales,
    GridSourceProduct,
    POGLibraryListItem,
    PogScenerioID,
    ProductInventoryDialogData,
    ProductInventoryForm,
    ProductOptions, Permissions
} from 'src/app/shared/models';
import { PackageAttributes } from 'src/app/shared/models/planogram/planogram';
import { PlanogramObject } from 'src/app/shared/classes/planogram-object';
import { SelectionEvent } from '@progress/kendo-angular-grid';
import { NewProductNPI, PerfData } from 'src/app/shared/models';
import { Position } from 'src/app/shared/classes/position';
import { PositionPosition } from 'src/app/shared/models/planogram';
import { Section } from 'src/app/shared/classes';
import { MerchandisableList } from 'src/app/shared/services/common/shared/shared.service';
import { Context } from 'src/app/shared/classes/context';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { ColDef, Column } from 'ag-grid-community';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';

@Component({
    selector: 'sp-product-inventory',
    templateUrl: './product-inventory.component.html',
    styleUrls: ['./product-inventory.component.scss'],
})
export class ProductInventoryComponent implements OnInit {
    @ViewChild(`productGrid`) productGrid: AgGridComponent;
    @ViewChild('ModalDialog') modalDialog: TemplateRef<unknown>;
    public npiEditForm: UntypedFormGroup;
    public isEditNewProduct: boolean = false;
    public selectedItem: GridSourceProduct;
    public filteredProductOptions: ProductOptions;
    public editNPIGridSource: ProductInventoryForm;
    public dialogTitle: string;
    public dialogRef: MatDialogRef<unknown>;
    public onSave = new EventEmitter();
    private gridSource: GridSourceProduct[];
    private column: ColDef[];
    private dataSource: Section;
    private npigridSource: ProductInventoryForm[];
    private productOptions: ProductOptions;
    private currentGridData: ProductInventoryForm[];
    public searchText: string = '';
    public agGridConfig: GridConfig;
    constructor(
        @Inject(MAT_DIALOG_DATA) data: ProductInventoryDialogData,
        public readonly dialog: MatDialogRef<ProductInventoryComponent>,
        private readonly formBuilder: UntypedFormBuilder,
        private readonly translate: TranslateService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly userPermissions: UserPermissionsService,
        private readonly notifyService: NotifyService,
        private readonly sharedService: SharedService,
        private readonly newProductInventoryService: NewProductInventoryService,
        private readonly products: ProductsService,
        private readonly planogramservice: PlanogramService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly historyService: HistoryService,
        private readonly matDialog: MatDialog,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly parentApp: ParentApplicationService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly agGridStoreService: AgGridStoreService
    ) {
        this.npigridSource = Object.assign([], data.npigridSource);
        this.gridSource = data.gridSource;
        this.column = this.agGridHelperService.getAgGridColumns('inventorynonNPIGrid');
        this.dataSource = data.datasource;
        this.productOptions = data.editDropDownobj;
        this.currentGridData = Object.assign([], data.npigridSource);
        this.editNPIGridSource = data.editNPIGridSource;
        this.dialogTitle = data.dialogTitle;
    }

    ngOnInit(): void {
        this.filteredProductOptions = { ...this.productOptions };
        this.npiEditForm = this.createForm();
        if (!this.editNPIGridSource) {
            this.agGridConfig = this.createGrid(this.gridSource, this.column);
        } else {
            this.isEditNewProduct = true;
            this.editNPIProduct(this.editNPIGridSource);
        }
    }

    public onChildSearch(searchKey: string): void {
        if (this.agGridConfig) {
            const selectedRows = this.productGrid.gridApi.getSelectedRows();
            const options = this.agGridStoreService.gridHoldingData.find((x) => x.id === this.agGridConfig.id).data;
            const tempData = this.sharedService.runFilter(options, searchKey);
            this.productGrid?.gridApi?.setRowData(tempData);
            if (selectedRows.length) {
                this.productGrid.skipTo('UPC', selectedRows[0]['UPC'], 'string');
            }
        }
    }

    private createForm(): UntypedFormGroup {
        return this.formBuilder.group({
            id: [''],
            UPC: [''],
            Name: [''],
            ReferenceUPC: [''],
            AdjustmentFactor: ['', [Validators.min(1)]],
            CPI: ['', [Validators.pattern(/^\d+\.\d{2}$/)]],
            Movt: [''],
            Sales: [''],
            Height: ['', [Validators.min(0)]],
            Width: ['', [Validators.min(0)]],
            Depth: ['', [Validators.min(0)]],
            CasePack: [''],
            DescSize: [''],
            Brand: [''],
            Manufacturer: [''],
            L1: [''],
            L2: [''],
            L3: [''],
            L4: [''],
            MustStock: [''],
            Fixture: [''],
            CSC: [''],
            CIC: [''],
            IDPackage: [''],
            IDProduct: [''],
            IDPackageCurr: [''],
            IDProductCurr: [''],
            Cloned: [false],
            isNPI: [false],
            isEdited: [false],
            isUpdated: [false],
            positionID: [''],
        });
    }

    private createGrid(data: GridSourceProduct[], columns): GridConfig {
        return {
            ...this.agGridConfig,
            id: 'inventorynonNPIGrid',
            data: data,
            columnDefs: columns,
            height: 'calc(100vh - 23em)',
            firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
            rowSelection: 'single',
            hideSelectAll: true
        };
    }

    public onProductSelected(event: SelectionEvent): void {
        const selectedRows = this.productGrid.gridApi.getSelectedRows();
        if (selectedRows.length) {
            this.selectedItem = selectedRows[0];
        }
    }

    private prepareModel(
        data: ProductInventoryForm,
    ): ProductInventoryForm & Partial<PackageAttributes> & { Csc_Id: string; SKU: string } {
        return {
            ...data,
            Csc_Id: data.CSC || data.UPC,
            SKU: data.CIC,
            RecCPI: data.CPI,
            CurrMovt: data.Movt,
            CurrSales: data.Sales,
            RecMustStock: data.MustStock,
        };
    }

    //Fetching additional data from original source which were filtered from rowData from first grid
    private getAdditionalData(
        IdProduct: number,
        ReferenceUPC: string,
    ): { adjustmentFactor?: number; ReferenceUPC?: string } {
        const adjustmentFactor = Object.keys(this.dataSource.PackageAttributes)
            .map((key) => this.dataSource.PackageAttributes[key])
            .find((item) => (item.IdProduct === IdProduct))?.AdjustmentFactor;
        // 0 is valid
        return (![null, undefined].includes(adjustmentFactor) ) ? { adjustmentFactor, ReferenceUPC } : {};
    }

    private getClonedItems(rowData: GridSourceProduct): ProductInventoryForm {
        let { ReferenceUPC: refrenceUpc } = this.getAdditionalData(rowData.IDProduct, rowData.UPC);
        return {
            ...this.roundNumeric(rowData),
            UPC: '',
            Name: this.translate.instant('COPY_OF') + ' ' + rowData.Name,
            Height: rowData.Height || 4,
            Depth: rowData.Depth || 4,
            Width: rowData.Width || 4,
            Fixture: null,
            IDProductCurr: -1,
            IDPackageCurr: -1,
            Cloned: true,
            isEdited: true,
            isUpdated: false,
            positionID: rowData.id,
            AdjustmentFactor: 100,
            MustStock: false,
            ReferenceUPC: `${refrenceUpc} - ${rowData.Name}`,
            CSC: null,
            CIC: '999999',
        };
    }

    private roundNumeric(product: GridSourceProduct): GridSourceProduct {
        for (const key in product) {
            if (typeof product[key] == 'number') {
                product[key] = Number(product[key].toFixed(2));
            }
        }
        return product;
    }

    private checkNPIEditPermission(): boolean {
        const permissions: Permissions = this.userPermissions.getPermissions('ADDUPDATENPI');
        if (!permissions) { return false; }
        if (permissions.Read && !permissions.Update && !permissions.Create) {
            this.notifyService.warn("You Don't have permission to do this operation");
            return false;
        }
        return true;
    }

    public onAddSelectedItemIntoNPIClick(): void {
        const mapper: POGLibraryListItem[] = this.planogramStore.mappers;
        let isReadOnlyFlag = mapper.find((it) => it.IDPOG === this.dataSource.IDPOG)?.IsReadOnly;
        if (isReadOnlyFlag) {
            this.notifyService.warn('UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
            return;
        } else if (this.checkNPIEditPermission()) {
            const npiClonedItem = this.getClonedItems(this.selectedItem);
            this.npigridSource.push(npiClonedItem);
            this.isEditNewProduct = true;
            this.editNPIProduct(npiClonedItem);
        }
    }

    private editNPIProduct(npiClonedItem: ProductInventoryForm): void {
        this.npiEditForm.patchValue({
            ...npiClonedItem,
            AdjustmentFactor: Math.round(npiClonedItem.AdjustmentFactor * 100) / 100,
        });
    }

    private withTPrefix(value?: string): string {
        return value && !value.toUpperCase().startsWith('T') ? 'T' + value : value;
    }

    public onSaveProductClick(): void {
        const formData: ProductInventoryForm = { ...this.npiEditForm.value };

        ['Height', 'Width', 'Depth', 'CasePack'].forEach((field) => {
            formData[field] = Math.round(formData[field] * 100) / 100;
        });

        formData.AdjustmentFactor = Math.round(formData.AdjustmentFactor) / 100;

        if (!this.checkNPIEditPermission()) {
            this.notifyService.warn("You Don't have permission to do this operation");
            return;
        }

        if (this.gridSource.some((it) => it.IDPackage != formData.IDPackageCurr && it.UPC == formData.UPC)) {
            this.notifyService.warn('DUPLICATE_UPC_NOT_ALLOWED');
            return;
        }

        if (formData.ReferenceUPC) {
          // CPI should be considered from the original product.
          const upc = formData.ReferenceUPC.split(' ')[0];
          const sectionId = this.sharedService.getActiveSectionId();
          const pogObject = this.sharedService.getObject(sectionId,sectionId) as Section;
          let allPositions = pogObject.getAllPositions();
          allPositions = allPositions.concat(pogObject.getAllShoppingCartItems());
          const originalItem = allPositions.filter((it) => it.Position.Product.UPC == upc)[0];
          if(originalItem) {
            formData.CPI = this.npiEditForm.value.CPI = originalItem.Position.attributeObject.RecCPI * formData.AdjustmentFactor;
          } else {
            console.log('originalItem not found');
          }
        } else {
            formData.CPI *= formData.AdjustmentFactor;
        }

        formData.CSC = this.withTPrefix(formData.UPC);

        formData.isUpdated = true;
        formData.isEdited = false;

        if (this.isClonedItems(formData)) {
            const childData = this.prepareModel(formData);
            const scenarioPogData = this.getScenarioPogID();
            this.addItemIntoNPI(childData, scenarioPogData, formData.CPI);
            return this.npigridSource
                .filter((it) => it.IDPackage == formData.IDPackage && it.IDProduct == formData.IDProduct)
                .forEach((it) => {
                    it.isUpdated = true;
                    it.isEdited = false;
                });
        } else {
            const positions = this.sharedService
                .getAllPositionFromObjectList(this.sharedService.getActiveSectionId())
                .filter(
                    (it) =>
                        it.Position.IDPackage == formData.IDPackageCurr &&
                        it.Position.IDProduct == formData.IDProductCurr,
                );

            const oldPositionValue = this.oldPositionValue(positions[0].Position);
            const unqHistoryID = this.historyService.startRecording();
            this.changePositionAttributes(positions, formData);
            this.wireUpUndoRedoForNPI(positions, formData, oldPositionValue); //@todo

            const target = this.npigridSource.findIndex((x) => x.UPC === formData.id);
            //copy only for existing keys in this.npigridSource
            Object.keys(target)
                .filter((key) => formData[key] !== undefined)
                .forEach((key) => (target[key] = formData[key]));

            this.historyService.stopRecording(undefined, undefined, unqHistoryID);
            
            if(this.parentApp.isAllocateApp) {
              for (let key of Object.keys(this.npiEditForm.controls)) {
                if (this.npiEditForm.get(key).dirty) {
                  this.allocateNpi.setNpiUpdated(this.sharedService.getActiveSectionId(), true);
                  break;
                }
              }
            }  
            // reset valdaition, dirty.
            this.npiEditForm.reset(this.npiEditForm.value);
        }
    }

    private changePositionAttributes(positionEntities: Position[], value: ProductInventoryForm): void {
        let fixtureObj: { computePositionsAfterChange: (ctx: Context) => void };
        const ctx = new Context(this.dataSource);
        for (const entity of positionEntities) {
            const position = entity.Position;

            ['Height', 'Width', 'Depth', 'CasePack'].forEach((key) => (position.ProductPackage[key] = value[key]));

            ['L1', 'L2', 'L3', 'L4', 'UPC', 'DescSize', 'Brand', 'Manufacturer', 'Name'].forEach(
                (key) => (position.Product[key] = value[key]),
            );

            position.Product.ProdCorpMapping['0'] = position.Product.ProdCorpMapping['0'] || ({} as any);
            position.Product.ProdCorpMapping['0'].DescSize = value.DescSize;

            position.attributeObject.AdjustmentFactor = value.AdjustmentFactor;
            position.Product.Csc_Id = value.CSC;
            position.attributeObject.RecMustStock = value.MustStock;
            position.attributeObject.RecCPI = value.CPI;
            // updating packageattributes
            const id = position.Product.IDProduct.toString() + '@' + position.ProductPackage.IDPackage.toString();
            this.dataSource.PackageAttributes[id].RecCPI = value.CPI ? value.CPI : null;
            this.dataSource.PackageAttributes[id].AdjustmentFactor = value.AdjustmentFactor
                ? value.AdjustmentFactor
                : 1;
            this.dataSource.PackageAttributes[id].RecMustStock = value.MustStock ? value.MustStock : null;
            fixtureObj = this.sharedService.getObject(entity.$idParent, entity.$sectionID) as MerchandisableList;
            fixtureObj?.computePositionsAfterChange(ctx);
        }
        this.updateNPIFactory(positionEntities, value);
        fixtureObj.computePositionsAfterChange(ctx);
    }

    private wireUpUndoRedoForNPI(
        editedPositionItem: Position[],
        newCellValues: ProductInventoryForm,
        oldCellValues: ProductInventoryForm,
    ): void {
        const funoriginal = () => {
            this.changePositionAttributes(editedPositionItem, newCellValues);
            this.updateNPIGrid(editedPositionItem);
        };
        const funRevert = () => {
            this.changePositionAttributes(editedPositionItem, oldCellValues);
            this.updateNPIGrid(editedPositionItem);
        };
        this.historyService.captureActionExec({
            funoriginal,
            funRevert,
            funName: 'changePositionAttributes',
        });
    }

    private updateNPIGrid(entities: Position[]): void {
        const npiPosition = this.newProductInventoryService.getChangedPositionValues(this.dataSource.IDPOG);

        this.npigridSource
            .filter(
                (it) =>
                    it.IDPackageCurr == entities[0].Position.IDPackage &&
                    it.IDProductCurr == entities[0].Position.IDProduct,
            )
            .forEach((it) => Object.assign(it, npiPosition || {}));

        this.newProductInventoryService.setChangedPositionValues(entities, this.dataSource.IDPOG);
        this.onSave.emit(this.npigridSource);
        this.dialog.close();
    }

    private updateNPIFactory(entities: PlanogramObject[], form: ProductInventoryForm): void {
        this.planogramservice.insertPogIDs(entities, true);
        // updating datasouce of the gird
        this.newProductInventoryService.setChangedPositionValues(
            {
                ...form,
                Csc_Id: form.CIC,
                SKU: form.CIC,
                RecMustStock: form.MustStock,
            },
            this.dataSource.IDPOG,
        );
    }

    private oldPositionValue(item: PositionPosition): ProductInventoryForm {
        // TODO: @og for compatibility with an old product field _ReferenceUPCForNPI, check if it is safe to remove it.
        const legacyProduct: { _ReferenceUPCForNPI?: { DescData?: string } } = item.Product as any;

        return {
            ...item.ProductPackage,
            ...item.Product,
            CIC: item.Product.SKU,
            CSC: item.Product.Csc_Id,
            Sales: item.attributeObject.CurrSales,
            Movt: item.attributeObject.CurrMovt,
            MustStock: item.attributeObject.RecMustStock,
            CPI: item.attributeObject.RecCPI,
            AdjustmentFactor: item.attributeObject.AdjustmentFactor,
            ReferenceUPC:
                legacyProduct._ReferenceUPCForNPI?.DescData ??
                item.Product.ReferenceUPCForNPI?.DescData ??
                (item.Product.ReferenceUPCForNPI as any),
        };
    }

    private isClonedItems(item: { Cloned?: boolean; isNPI?: boolean }): boolean {
        return item.Cloned && !item.isNPI;
    }

    private getScenarioPogID(): PogScenerioID {
        return {
            scenarioID: this.planogramStore.scenarioId,
            pogID: this.dataSource.IDPOG,
        };
    }

    // some "as any" are there until the types is clearer on the services side
    private addItemIntoNPI(model: NewProductNPI, pogScenerioID: PogScenerioID, CPI: number): void {
        this.products.addProductNPIWithPerfData(model, pogScenerioID).subscribe(
            ({ item, perfData, key }) => {
                // TODO @og not sure what this code does
                this.npigridSource
                    .filter((it) => it.IDPackage == key && it.IDPackageCurr == -1)
                    .forEach((it) => {
                        Object.assign(it, {
                            ...item.Product,
                            ...item.ProductPackage,
                            CPI,
                            IDPackageCurr: item.IDPackage,
                            IDProductCurr: item.IDProduct,
                            CSC: this.withTPrefix(item.Product.UPC),
                            CIC: item.Product.SKU,
                            MustStock: item.Product.RecMustStock,
                            IsNPI: true,
                            Cloned: false,
                            isEdited: false,
                            ReferenceUPC: item.Product.ReferenceUPCForNPI,
                        });

                        item.Product.RecCPI = CPI;
                        (item.Product as any).CurrSales = it.Sales;
                        (item.Product as any).CurrMovt = it.Movt;
                    });

                // TODO: @og: check what is positionID field 
                this.addToShoppingCart(item, model.positionID, perfData);
                this.notifyService.success('NPI_ADDNPICONFIRM_MESSAGE');
                this.isEditNewProduct = false;
                this.planogramservice.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
                this.onSave.emit(this.npigridSource);
            },
            (err) => {
                this.notifyService.error(err.message);
            },
        );
    }

    private addToShoppingCart(item: ProductType, clonedPositionID: string, perfData: PerfData): void {
        if (!this.sharedService.checkIfAssortMode('NPI')) {
            let activeSectionID = this.sharedService.getActiveSectionId();
            let rootObj = this.sharedService.getObjectAs<Section>(activeSectionID, activeSectionID);
            let cartObj = Utils.getShoppingCartObj(rootObj.Children);
            let originalItem = this.sharedService.getObject(clonedPositionID, activeSectionID) as Position;
            this.historyService.startRecording();
            const itemsToadd: (Position & { Position: { Product: Product & CurrentMovSales } })[] =
                this.planogramCommonService.initPrepareModel([item], rootObj, originalItem, perfData);

            itemsToadd[0].Position.Product.IsNPI = true;
            const ctx = new Context(rootObj);
            itemsToadd
                .filter((it) => it.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)
                .forEach((item) => {
                    item.moveSelectedToCartfromProductSearch(ctx, cartObj);
                    item.Position.Product.RecCPI = null;
                    item.Position.Product.RecMustStock = null;
                    item.Position.Product.CurrMovt = null;
                    item.Position.Product.CurrSales = null;
                });

            this.historyService.stopRecording();
        } else {
            this.notifyService.error('NPI_ADDTOCARTDISABLED_MESSAGE');
        }
    }

    public onGoBackClick(): void {
        this.isEditNewProduct = false;
    }

    public onCloseDialogClick(): void {
        if (this.npiEditForm.dirty && this.isEditNewProduct && this.editNPIGridSource) {
            this.dialogRef = this.matDialog.open(this.modalDialog, {});
        } else {
            this.dialog.close();
        }
    }

    /** Form fields Autocomplete: filters dropdown options based on input */
    public onFieldDropdownKeyup(value: string, type: keyof ProductOptions): void {
        if (this.productOptions[type]) {
            this.filteredProductOptions[type] = this.sharedService.runFilter(this.productOptions[type], value);
        }
    }

    public onInputChanged(event: InputEvent, field: string): void {
        const target = event.target as any;
        this.npiEditForm.value[field] = target.value = Math.round(target.value * 100) / 100;
        this.npiEditForm.get('AdjustmentFactor').markAsTouched();
    }
}
