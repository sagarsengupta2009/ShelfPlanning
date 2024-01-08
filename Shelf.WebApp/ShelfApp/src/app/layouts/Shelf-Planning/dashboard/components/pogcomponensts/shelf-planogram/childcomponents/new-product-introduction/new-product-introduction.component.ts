import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import {
    LocalSearchService,
    SharedService,
    FormattingService,
    ProductsService,
    NotifyService,
    DictConfigService,
} from 'src/app/shared/services';
import { PlanogramStoreService } from 'src/app/shared/services';
import { NewProductNPI, PogScenerioID } from 'src/app/shared/models';
import { ProductType } from 'src/app/shared/models/planogram/product';

class NewProductForm  implements NewProductNPI {
    UPC = '';
    Name = '';
    CasePack: number;
    Size: number;
    UOM = '';
    Brand = '';
    Manufacturer = '';
    Height: number;
    Width: number;
    Depth: number;
    L1 = '';
    L2 = '';
    L3 = '';
    L4 = '';
    L5 = '';
    L6 = '';
    IDPackage?: number;
    IDProduct?: number;
    IDPackageCurr?: number;
    IDProductCurr?: number;
    // Cloned?: boolean;
    // IsEdited?: boolean;
    // TODO: is this necessary ?
    IsItemScanned = true;
    IsNPI = true;
}

@Component({
    selector: 'app-new-product-introduction',
    templateUrl: './new-product-introduction.component.html',
    styleUrls: ['./new-product-introduction.component.scss'],
})
export class NewProductIntroductionComponent implements OnInit, OnDestroy {
    public npiEditForm!: UntypedFormGroup;
    public shownpi = false;
    private subscriptions: Subscription = new Subscription();
    private busy = false;
    private dictList = [{ key: 'L1', value: 3684 }, { key: 'L2', value: 3685 }, { key: 'L3', value: 3686 }, { key: 'L4', value: 3687 }, { key: 'L5', value: 3688 }, { key: 'L6', value: 3689 }];

    constructor(
        private readonly products: ProductsService,
        private readonly fb: UntypedFormBuilder,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
        private readonly sharedService: SharedService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dialog: MatDialogRef<NewProductIntroductionComponent>,
        private readonly localSearchService: LocalSearchService,
        private readonly formatting: FormattingService,
        private readonly dictConfigService: DictConfigService,
        @Inject(MAT_DIALOG_DATA) private readonly upc: string,
    ) {}

    public ngOnInit(): void {
        this.npiEditForm = this.createForm({ UPC: this.upc, IsItemScanned: true, IsNPI: true });
        this.shownpi = this.planogramStore.appSettings.newproductintro.SelectedValue.value;

        this.subscriptions.add(
            this.localSearchService.cloneProduct.subscribe((result: { itemData?: ProductType }) => {
                if (result?.itemData) {
                    const newProductForm = this.cloneProductData(result.itemData);
                    // create form from cloned data
                    this.npiEditForm = this.createForm(newProductForm);
                }
            }),
        );
    }

    private createForm(data: Partial<NewProductForm>): UntypedFormGroup {
        return this.fb.group({
            UPC: [data.UPC, Validators.required],
            Name: [data.Name, Validators.required],
            CasePack: [data.CasePack, Validators.required],
            Size: [data.Size, Validators.required],
            UOM: [data.UOM, Validators.required],
            Brand: [data.Brand, Validators.required],
            Manufacturer: [data.Manufacturer, Validators.required],
            Height: [data.Height, Validators.required],
            Width: [data.Width, Validators.required],
            Depth: [data.Depth, Validators.required],
            L1: [data.L1, Validators.required],
            L2: [data.L2, Validators.required],
            L3: [data.L3, Validators.required],
            L4: [data.L4, Validators.required],
            L5: [data.L5 || ''],
            L6: [data.L6 || ''],
            IsNPI: [data.IsNPI],
            IDPackage: [data.IDPackage],
            IDProduct: [data.IDProduct],
            IDPackageCurr: [data.IDPackageCurr],
            IDProductCurr: [data.IDProductCurr],
            IsItemScanned: [data.IsItemScanned],
        });
    }

    //// EVENT HANDLERS
    public onAddItemIntoNPIClick(): Promise<void> {
        if (this.busy || !this.isValid()) {
            return;
        }
        this.busy = true;
        this.products.addProductNPI({ ...this.npiEditForm.value }, this.getScenarioPogID()).subscribe(
            (res) => {
                // populate current data
                const npi = {
                    ...this.productItemToNewProductForm(res),
                    IDProductCurr: res.IDProduct,
                };
                // close add product dialog
                this.dialog.close({
                    npi,
                    res,
                    addproduct: true,
                });
            },
            (err) => {
                this.notifyService.error(err.Message);
                this.dialog.close();
            },
            () => (this.busy = false),
        );
    }

    public onCloseDialogClick(): void {
        this.dialog.close();
    }

    public onOpenProductsSearchListClick(): void {
        this.localSearchService.openProductLib.next(true);
    }

    /**  filters forbidden characters */
    public onUpcKeyPress(e: KeyboardEvent): boolean {
        //Regex for Valid Characters i.e. Alphabets and Numbers excluding E
        const regex = /^[A-DF-Za-dfz0-9]+$/;
        //Validate TextBox value against the Regex.
        return regex.test(String.fromCharCode(parseInt(e.code)));
    }

    private productItemToNewProductForm(this: void, itemData: ProductType): NewProductForm {
        return {
            ...itemData.ProductPackage, // CasePack Height Width Depth
            ...itemData.Product,
            IDPackage: itemData.IDPackage,
            IDProduct: itemData.IDProduct,
            IsNPI: true,
            IDPackageCurr: itemData.IDPackage,
            IDProductCurr: itemData.IDProduct,
            IsItemScanned: true,
        };
    }

    public cloneProductData(itemData: ProductType): NewProductForm {
        // copy data
        const npi = {
            ...this.productItemToNewProductForm(itemData),
            UPC: this.upc,
            Name: 'copy of ' + itemData.Product.Name,
            IDPackageCurr: -1,
            IDProductCurr: -1,
        };
        // clean type , could be removed if the coming data is ensured to be in correct type
        this.formatting.parseInts(npi, 'Size', 'CasePack');
        this.formatting.parseFloats(npi, 'Height', 'Width', 'Depth');

        return npi;
    }

    public getScenarioPogID(): PogScenerioID {
        return {
            scenarioID: this.planogramStore.scenarioId,
            pogID: this.sharedService.getSelectedIDPOG(),
        };
    }

    private showValidationSnackBar(message: string): void {
        this.notifyService.warn(message);
    }

    private isValid(): boolean {
        for (const field in this.npiEditForm.controls) {
            if (!this.npiEditForm.controls[field].valid) {
                const customFieldsRegex = /^[L][0-9]$/;
                if (customFieldsRegex.test(field)) {
                    this.showValidationSnackBar(
                        `${this.translate.instant('PLEASE_ENTER_THE')} ${this.getCustomFieldName(this.dictList.find(x => x.key == field)?.value)}`,
                    );
                } else {
                    this.showValidationSnackBar(this.translate.instant(`PLEASE_ENTER_THE_${field.toUpperCase()}`));
                }
                return false;
            }
        }
        return true;
    }

    /** resolves custom field name */
    public getCustomFieldName(idDictionary: number): string {
        const dict = this.dictConfigService.findById(idDictionary);
        return dict.ShortDescription;
    }

    // TODO: @og know what it does and cleanup
    public toggleShowNPI(): void {
        this.planogramStore.appSettings.newproductintro.SelectedValue.value = this.shownpi;
    }

       /** Function to enter only positive number */
    public onKeypressEvent(event: KeyboardEvent): boolean {
        if (event.key >= '0' && event.key <= '9') {
            return true;
        } else {
            event.preventDefault();
            return false;
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions ? this.subscriptions.unsubscribe() : null;
    }
}
