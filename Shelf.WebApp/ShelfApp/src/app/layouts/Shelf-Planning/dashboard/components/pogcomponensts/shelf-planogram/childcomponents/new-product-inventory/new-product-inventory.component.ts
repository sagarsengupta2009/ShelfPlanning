import { Component, OnDestroy, OnInit, ViewChild, EventEmitter, Output } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import * as _ from 'lodash';
import { ProductInventoryComponent } from '../product-inventory/product-inventory.component';
import { SharedService, SaDashboardService, AgGridHelperService } from 'src/app/shared/services';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { Product } from 'src/app/shared/models';
import { TranslateService } from '@ngx-translate/core';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';
@Component({
  selector: 'sp-new-product-inventory',
  templateUrl: './new-product-inventory.component.html',
  styleUrls: ['./new-product-inventory.component.scss']
})
export class NewProductInventoryComponent implements OnInit, OnDestroy {
  @ViewChild(`NPIGrid`) NPIGrid: AgGridComponent;
  @Output() onClose = new EventEmitter();
  public gridConfigNewProductGrid: GridConfig;
  private readonly subscriptions: Subscription = new Subscription();
  public npiSubscription: Subscription;
  public sectionID: string;
  public datasource: any;
  public npigridSource: any[] = [];
  public brand: { Brand: string }[];
  public manufacturer: { Manufacturer: string }[];
  public L1: { L1: string }[];
  public L2: { L2: string }[];
  public L3: { L3: string }[];
  public L4: { L4: string }[];
  public gridSource = [];
  public editDropDownobj: {
    brand: string[],
    manufacturer: string[],
    L1: string[],
    L2: string[],
    L3: string[],
    L4: string[]
  }
  public editNPIGridSource;
  constructor(private readonly sharedService: SharedService,
    private readonly dialog: MatDialog,
    private readonly saDashboardService: SaDashboardService,
    private readonly translate: TranslateService,
    private readonly agGridStoreService: AgGridStoreService,
    private readonly agGridHelperService: AgGridHelperService
    ) { }


  ngOnInit(): void {
    this.sectionID = this.sharedService.getActiveSectionId();
    this.datasource = this.sharedService.getObject(this.sectionID, this.sectionID);
    this.createGrid(this.datasource);
    this.subscriptions.add(this.sharedService.updateNPIGrid.subscribe((res: any) => {
      if (res != null && res.reloadNPI) {
        this.createGrid(this.datasource);
      }
    }));
  }

  public closeNPI(): void {
    this.onClose.emit(false);
  }

  public BindSearchEvent(): void {
    this.subscriptions.add(this.sharedService.filterSearch.subscribe(
      (response) => {
        if (response != '' && (this.gridConfigNewProductGrid)) {
          this.NPIGrid.gridConfig.data = this.sharedService.runFilter(
            this.agGridStoreService.gridHoldingData.find(x => x.id === this.NPIGrid.gridConfig.id)[`data`],
            response
          );
        }
      }
    ));
  }

  private createGrid(rawData: any): void {
    this.gridSource = this.getAllItems(rawData);
    this.createNPIGrid(this.npigridSource);
  }

  private createNPIGrid(data: Product[]): void {
    let col = this.agGridHelperService.getAgGridColumns(`inventoryNPIGrid`);
    this.gridConfigNewProductGrid = {
      ...this.gridConfigNewProductGrid,
      id: 'inventoryNPIGrid',
      data: data,
      columnDefs: col,
      actionFields: ['Edit']
    };
  };

  private getAllItems(rawData: any): any[] {
    let itemsArray = [];
    this.npigridSource = [];
    let brand = [];
    let manufacturer = [];
    let L1 = [];
    let L2 = [];
    let L3 = [];
    let L4 = [];
    if (rawData.PackageInventoryModel !== undefined) {
      for (let [key, item] of Object.entries(rawData.PackageInventoryModel)) {
        let temp = {};
        let IDProduct = item['IDProduct'];
        let IDPackage = item['IDPackage'];
        let itemObject = this.sharedService.getObject(item['id'], this.sectionID);
        if (itemObject !== undefined) {
          temp['id'] = itemObject.$id;
          let positionObject = itemObject.Position;
          const isNPI: boolean = positionObject.Product["IsNPI"];
          let fixtureObj = itemObject.Fixture;
          let itempd = positionObject.Product;
          let _itempd = positionObject.ProductPackage;
          // temp['_X05_NPI', '&oplus;';
          if (itempd.Brand != "")
            brand.push({ "Brand": itempd.Brand });
          if (itempd.Manufacturer != "")
            manufacturer.push({ "Manufacturer": itempd.Manufacturer });
          if (itempd.L1 != "")
            L1.push({ "L1": itempd.L1 });
          if (itempd.L2 != "")
            L2.push({ "L2": itempd.L2 });
          if (itempd.L3 != "")
            L3.push({ "L3": itempd.L3 });
          if (itempd.L4 != "")
            L4.push({ "L4": itempd.L4 });
          if (positionObject.Product.ObjectType == 'Product') {
            temp['L1'] = itempd.L1;
            temp['L2'] = itempd.L2;
            temp['L3'] = itempd.L3;
            temp['L4'] = itempd.L4;
            if (itempd.ProdCorpMapping[0]) {
              temp['DescSize'] = itempd.ProdCorpMapping[0].DescSize;
            }
            else {
              temp['DescSize'] = itempd.DescSize;
            }
            temp['UPC'] = itempd.UPC;
            temp['Name'] = itempd.Name;
            temp['Brand'] = itempd.Brand;
            temp['Manufacturer'] = itempd.Manufacturer;
            temp['CIC'] = itempd.SKU;
            temp['CSC'] = itempd.Csc_Id;
          }
          if (positionObject.ProductPackage.ObjectType == 'ProductPackage') {
            temp['Height'] = _itempd.Height;
            temp['Depth'] = _itempd.Depth;
            temp['Width'] = _itempd.Width;
            temp['CasePack'] = _itempd.CasePack;
          }
          if (positionObject.PositionNo) {
            temp['Pos'] = positionObject.PositionNo;
            temp['Fixture'] = fixtureObj != null ? `${fixtureObj.FixtureFullPath} Pos ${positionObject.PositionNo}` : '';
          } else {
            temp['Fixture'] = "Shopping Cart";
          }
          temp["IDProduct"] = IDProduct;
          temp["IDPackage"] = IDPackage;
          temp["UniqueProdPkg"] = itempd.UniqueProdPkg;

          if (!positionObject.attributeObject.RecMustStock && positionObject.Product.RecMustStock) {
            temp['MustStock'] = positionObject.Product.RecMustStock 
            ? positionObject.Product.RecMustStock : false;

            temp['CPI'] = positionObject.Product.RecCPI;
            temp['Movt'] = positionObject.Product.CurrMovt;
            temp['Sales'] = positionObject.Product.CurrSales;
          }
          else {
            temp['MustStock'] = positionObject.attributeObject.RecMustStock 
            ? positionObject.attributeObject.RecMustStock : false;
            temp['CPI'] = positionObject.attributeObject.RecCPI;
            temp['Movt'] = positionObject.attributeObject.CurrMovt;
            temp['Sales'] = positionObject.attributeObject.CurrSales;
          }
          if (!isNPI) {
            temp['isNPI'] = false;
            itemsArray.push(temp);
          }
          else if (isNPI) {
            temp["IDProductCurr"] = IDProduct;
            temp["IDPackageCurr"] = IDPackage;
            temp["Cloned"] = false;
            temp['isNPI'] = true;
            temp['AdjustmentFactor'] = positionObject.attributeObject.AdjustmentFactor * 100;
            if (itempd._ReferenceUPCForNPI && itempd._ReferenceUPCForNPI.DescData) {
              temp['ReferenceUPC'] = itempd._ReferenceUPCForNPI.DescData;
            }
            else {
              temp['ReferenceUPC'] = itempd.ReferenceUPCForNPI;
            }
            this.npigridSource.push(temp)
          }
        }
      };
    }
    //list for dropdown while adding NPI

    this.editDropDownobj = {
      'brand': _.uniqBy(brand, 'Brand'),
      'manufacturer': _.uniqBy(manufacturer, 'Manufacturer'),
      'L1': _.uniqBy(L1, 'L1'),
      'L2': _.uniqBy(L2, 'L2'),
      'L3': _.uniqBy(L3, 'L3'),
      'L4': _.uniqBy(L4, 'L4')
    }
    return itemsArray;
  }


  public onDialog = (id?): void => {
    let column = this.saDashboardService.GetGridColumns(`inventorynonNPIGrid`);
    const dialogRef = this.dialog.open(ProductInventoryComponent, {
      height: '80vh',
      width: '100%',
      data: {
        'datasource': this.datasource,
        'npigridSource': this.npigridSource,
        'col': column,
        'editDropDownobj': this.editDropDownobj,
        'gridSource': this.gridSource,
        'editNPIGridSource': this.editNPIGridSource,
        'dialogTitle': id ? this.translate.instant('EDIT_NPI') : this.translate.instant('EDIT_SELECTED_PRODUCT')
      }
    });
    this.subscriptions.add(dialogRef.componentInstance.onSave.subscribe(npigridSource => {
      this.npigridSource = npigridSource; 
      this.createGrid(this.datasource)
    }));

    dialogRef.afterClosed().subscribe(result => {
      this.editNPIGridSource = '';
    });
  }

  public editSelectedRow(event: { data: any, fieldName: string, classList: DOMTokenList }): void  {
    const classList = Object.values(event.classList);
    const isEdit = classList.includes('btn-npi-edit');
    if (event.data.id !== undefined && isEdit) {
      this.editNPIGridSource = event.data;
      this.editNPIGridSource.positionID = this.editNPIGridSource.id;
      this.editNPIGridSource.isEdited = true;
      this.onDialog('fromGrid');
    }
  }

  ngOnDestroy(): void {
    if (this.subscriptions) {
      this.subscriptions.unsubscribe();
    }
  }
}
