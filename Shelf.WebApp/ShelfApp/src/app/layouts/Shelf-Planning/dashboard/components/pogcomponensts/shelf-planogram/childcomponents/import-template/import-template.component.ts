import { Component, OnInit, Inject, OnDestroy, ViewChild } from '@angular/core';
import * as XLSX from 'xlsx';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { KendoGridComponent } from 'src/app/shared/components/kendo-grid/kendo-grid.component';
import {
    ImportPog,
    ImportProducts,
    KednoGridConfig,
    PlanogramsAddDelete,
    ProductsAddDelete,
} from 'src/app/shared/models';
import { NotifyService, PlanogramStoreService, AgGridHelperService, InformationConsoleLogService, SharedService } from 'src/app/shared/services';
import { ImportTemplateService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/import_Template/import-template.service';
import { difference } from 'lodash';
import { HeaderMenu } from 'src/app/shared/models/config/application-resources';
import { POGLibraryListItem } from 'src/app/shared/models/planogram-library/planogram-details';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { Utils } from 'src/app/shared/constants/utils';

@Component({
    selector: 'srp-import-template',
    templateUrl: './import-template.component.html',
    styleUrls: ['./import-template.component.scss'],
})
export class ImportTemplateComponent implements OnInit, OnDestroy {
    public pogLibHeaderMenuShowHide: HeaderMenu = {
        displayRadiosInImportTemplate: false,
    };
    public selfile: File = undefined;
    public fileName: string = '';
    public removeInvalidProductsFlag: boolean = false;
    public productsInvalidFlag: boolean = false;
    public displayRadiosInImportTemplate: boolean = false;
    public displayPogListFlag: boolean = true;
    public productgridCntnrHeight: string = '100%';
    public poggridCntnrHeight: string = 'calc(100% - 110px)';
    public toggleClick: boolean = true;
    public toggleName: string = '';
    public importPoggridConfig: GridConfig;
    public productGridConfig: GridConfig;
    private packageType: string[] = [];
    private importPogList: PlanogramsAddDelete[] | ImportPog[] = [];
    private productList: ImportProducts[] = [];
    private planograms: { IdPog: number; Name: string }[] = [];
    private finalProductList: ProductsAddDelete[] = [];
    private invalidProductsList: ProductsAddDelete[] = [];
    private invalidProductsListResult: ProductsAddDelete[] = [];

    private subscriptions: Subscription = new Subscription();
    @ViewChild(`importPoggrid`) importPoggrid: AgGridComponent;
    @ViewChild(`productGrid`) productGrid: AgGridComponent;

    constructor(
        private readonly translate: TranslateService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly importTemplateService: ImportTemplateService,
        private readonly notifyService: NotifyService,
        private readonly agGridHelperService: AgGridHelperService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly dialog: MatDialogRef<ImportTemplateComponent>,
        private readonly sharedService: SharedService,
        @Inject(MAT_DIALOG_DATA) private readonly rowData: POGLibraryListItem[],
    ) { }

    public ngOnInit(): void {
        this.getplackageTypeArray();
        this.createImportPogList();
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    private excelExport(): void {
        if (this.displayPogListFlag) {
            this.importPoggrid.exportToExcel();
        } else {
            this.productGrid.exportToExcel();
        }
    }

    public onFileChange(event): void {
        let data;
        this.productList = [];
        this.fileName = event.target.files[0].name;
        const target: DataTransfer = <DataTransfer>event.target;
        if (target.files.length !== 1) throw new Error('Cannot use multiple files');
        const reader: FileReader = new FileReader();
        reader.onload = (e: any) => {
            /* read workbook */
            const bstr: string = e.target.result;
            const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

            /* grab first sheet */
            const wsname: string = wb.SheetNames[0];
            const ws: XLSX.WorkSheet = wb.Sheets[wsname];

            /* save data */
            data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            data = data.filter((x) => x.length);
            let keys: string = data.shift();
            let keys1: string[] = [];
            for (let d of keys) {
                keys1.push(d.trim());
            }
            let resArr: ImportProducts[];
            resArr = data.map((e) => {
                let obj = {};
                keys1.forEach((key, i) => {
                    obj[key] = e[i] == undefined ? '' : e[i];
                });
                return obj;
            });
            this.productList = resArr;

            this.setProductsList();
        };
        reader.readAsBinaryString(target.files[0]);
    }

    private downloadImportDataTemplate(): void {
        this.sharedService.skipUnloadEvent = true;
        let link = '/Areas/iShelf/ClientApplication/appMaterial/plugins/external/template/ItemsAddDelete.zip';

        let ua = window.navigator.userAgent;
        let msie = ua.indexOf('MSIE ');

        if (msie > 0 || !!navigator.userAgent.match(/Trident.*rv\:11\./)) {
            window.open(link, 'Download');
        } else {
            window.open(link, '_self');
        }
    }

    private createImportPogList(): void {
        this.importPogList = this.rowData;
        for (let pogObj of this.importPogList) {
            if (pogObj.IsReadOnly) {
                pogObj.Result = this.translate.instant('INVALID');
            } else if (pogObj.isLoaded) {
                pogObj.Result = this.translate.instant('INVALID');
            } else {
                pogObj.Result = this.translate.instant('VALID');
                this.planograms.push({ IdPog: pogObj.IDPOG, Name: pogObj.Name });
            }
        }
        let invalidList = this.importPogList.filter((item) => item.Result == this.translate.instant('INVALID'));
        if (invalidList.length) {
            this.poggridCntnrHeight = 'calc(100% - 5px)';
        } else {
            this.poggridCntnrHeight = ' calc(100% - 5px)';
        }
        this.bindpogimportgriddata('ValidPogListGrid', this.importPogList);
    }

    private bindpogimportgriddata(id: string, data: PlanogramsAddDelete[] | ImportPog[]): void {
        this.importPoggridConfig =  {
                ...this.importPoggridConfig,
                id: id,
                columnDefs: this.agGridHelperService.getAgGridColumns(id),
                data,
                height: '100%',
            }
    }

    private bindproductgriddata(id: string, data: ProductsAddDelete[]): void {
        this.productGridConfig = {
                ...this.productGridConfig,
                id: id,
                columnDefs: this.agGridHelperService.getAgGridColumns(id),
                data,
                height: '100%',
            }
    }

    private getFinalProductsList(): ProductsAddDelete[] {
        return difference(this.productList, this.invalidProductsList);
    }

    private setProductsList(): void {
        for (let val of this.productList) {
            val.SKU = !val.SKU ? '' : val.SKU;
            if (isNaN(Number(val.IdPackageStyle))) {
                if (val.IdPackageStyle) {
                    val.IdPackageStyle = this.packageType.indexOf(val.IdPackageStyle.toString().toLowerCase());
                }
            } else if (val.IdPackageStyle === '') {
                val.IdPackageStyle = -1;
            } else {
                val.IdPackageStyle = Number(val.IdPackageStyle);
            }
        }
    }

    public toggelImportTemplate(): void {
        this.toggleName = this.toggleClick
            ? this.translate.instant('SCENARIO_PROD_IMPORT_RES_PRODUCTS')
            : this.translate.instant('SCENARIO_PROD_IMPORT_RES_PLANOGRAMS');
        this.displayPogListFlag = !this.toggleClick;
    }

    private getplackageTypeArray(): void {
        for (let lookUpOptionObj of this.planogramStore.lookUpHolder.PACKAGESTYLE.options) {
            if (lookUpOptionObj.value > -1)
                this.packageType[lookUpOptionObj.value] = lookUpOptionObj.text.toLowerCase();
        }
    }

    private verifyProductsResult(products: ProductsAddDelete[]): number {
        this.invalidProductsListResult = [];
        this.invalidProductsList = [];
        let failedFlag = 0;
        for (let productObj of products) {
            if (productObj.Status == -1) {
                if (!failedFlag) {
                    failedFlag = 1;
                }
                let filter = this.productList.filter((item) => item.UPC == productObj.UPC);
                let index = this.productList.indexOf(filter[0]);
                this.invalidProductsList.push(this.productList[index]);
                this.invalidProductsListResult.push(productObj);
            }
        }
        return failedFlag;
    }

    public applyImportFileData(): void | undefined {
        let data = {
            ProjectId: this.planogramStore.projectId,
            Planograms: this.planograms,
            Products: this.getFinalProductsList(),
        };
        if (this.planograms.length == 0) {
            this.notifyService.warn('ATLEAST_ONE_POG_SHOULD_BE_VALID_TO_PROCESS_REQUEST');
            return;
        }
        if (data.Products.length == 0) {
            this.notifyService.warn('ATLEAST_ONE_ITEM_SHOULD_BE_VALID_TO_PROCESS_REQUEST');
            return;
        }
        for (let productObj of data.Products) {
            if (
                productObj.UPC?.toString() == '' ||
                productObj.UPC?.toString() == undefined ||
                productObj.Action?.toString() == '' ||
                productObj.Action?.toString() == undefined ||
                productObj.IdPackageStyle?.toString() == '' ||
                productObj.IdPackageStyle?.toString() == undefined
            ) {
                this.notifyService.warn('Enter all the mandatory fields to process the request');
                return;
            }
        }
        this.subscriptions.add(
            this.importTemplateService.importItems(data).subscribe((res) => {
                if (res && res.Log.Summary.Error) {
                    this.closeDialog();
                    this.notifyService.error('Error during import items');
                    this.informationConsoleLogService.setClientLog(
                        [
                            {
                                Code: '',
                                Message: res.Log.Details[0].Message,
                                Source: 'Planogram Library line no 420', //check why this sentence added
                                StackTrace: '',
                                Type: -1,
                                SubType: 'Other',
                                IsClientSide: true,
                                PlanogramID: 'G',
                            },
                        ],
                        'G',
                    );
                } else {
                    if (res.Data && !Utils.isNullOrEmpty(res.Data) && Object.entries(res.Data).length) {
                        let failedFlag = this.verifyProductsResult(res.Data.Products);
                        if (failedFlag) {
                            this.productgridCntnrHeight = 'calc(100% - 79px)';
                            this.displayRadiosInImportTemplate = false;
                            this.pogLibHeaderMenuShowHide.displayRadiosInImportTemplate = false;
                            this.displayPogListFlag = false;
                            this.productsInvalidFlag = true;
                            this.finalProductList = this.invalidProductsListResult;
                            for (let d of this.finalProductList) {
                                let obj = this.planogramStore.lookUpHolder.PACKAGESTYLE.options.find(
                                    (item) => item.value == d.IdPackageStyle,
                                );
                                d.IdPackageStyle = obj?.text ? obj.text : '';
                            }
                            this.bindproductgriddata('invalidImportProductGrid', this.finalProductList);
                        } else {
                            this.toggleName = this.translate.instant('SCENARIO_PROD_IMPORT_RES_PRODUCTS');
                            for (let d of res.Data.Products) {
                                let obj = this.planogramStore.lookUpHolder.PACKAGESTYLE.options.find(
                                    (item) => item.value == d.IdPackageStyle,
                                );
                                d.IdPackageStyle = obj?.text ? obj.text : '';
                            }
                            for (let d of res.Data.Planograms) {
                                d.Status =
                                    d.Status == 1
                                        ? this.translate.instant('SUCCESS')
                                        : this.translate.instant('FAILED');
                            }
                            this.poggridCntnrHeight = 'calc(100% - 10px)';
                            this.productgridCntnrHeight = 'calc(100% - 10px)';
                            this.productsInvalidFlag = false;
                            this.displayPogListFlag = false;
                            this.displayRadiosInImportTemplate = true;
                            this.pogLibHeaderMenuShowHide.displayRadiosInImportTemplate = true;
                            this.importPogList = res.Data.Planograms;
                            this.finalProductList = res.Data.Products;
                            this.bindpogimportgriddata('importPogGrid', this.importPogList);
                            this.bindproductgriddata('validImportProductGrid', this.finalProductList);
                        }
                    }
                }
            }),
        );
    }

    public menuButtonClickImportTemplate(response): void {
        let selectedMenu = response.data;
        if (selectedMenu) {
            switch (selectedMenu.key.trim()) {
                case 'pogImportAddDelete_DOWNLOADTEMPLATE':
                    this.downloadImportDataTemplate();
                    break;
                case 'pogImportAddDelete_EXPORT':
                    this.excelExport();
                    break;
                case 'pogImportAddDelete_CLOSE':
                    this.closeDialog();
                    break;
            }
        }
    }
}
