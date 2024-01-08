import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import { of, Subscription } from 'rxjs';
import { cloneDeep, flatten, map, groupBy, sortBy, uniqBy } from 'lodash';
import { SelectionEvent } from '@progress/kendo-angular-grid';
import { TreeItem } from '@progress/kendo-angular-treeview';
import { DragOrigins, IDragDrop } from 'src/app/shared/drag-drop.module';
import { AppConstantSpace } from 'src/app/shared/constants';
import { ProductHierarchyList, SearchProductList } from 'src/app/shared/models';
import {
  ProductlibraryService, AgGridHelperService, PanelService, PlanogramService, SharedService
} from 'src/app/shared/services';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
@Component({
  selector: 'sp-product-hierarchy',
  templateUrl: './product-hierarchy.component.html',
  styleUrls: ['./product-hierarchy.component.scss'],
})
export class ProductHierarchyComponent implements OnInit {
  private readonly subscriptions: Subscription = new Subscription();
  @ViewChild('agHierarachyGrid') agHierarachyGrid: AgGridComponent;
  @Output() productsFromHierarachy = new EventEmitter<any>();
  @Input() isFilterExisting: boolean;
  @Input() isPlanogramLoaded: boolean;
  @Input() state: boolean;
  public gridConfigHierarachy: GridConfig;
  public expandedKeys: number[] = [];
  public parsedData: ProductHierarchyList[] = [];
  public selectedRows: SearchProductList[] = [];
  public productItemsFromHierarachy: SearchProductList[] = [];
  public existingProducts: string[] = [];
  public IdProdHier: number;
  public alertmsg: Boolean = true;

  constructor(public readonly productlibraryService: ProductlibraryService,
    private readonly planogramService: PlanogramService,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly panelService: PanelService,
    private readonly sharedService: SharedService) {
  }

  ngOnInit(): void {
    this.productItemsFromHierarachy = cloneDeep(this.productlibraryService.ProductGallery.hierarchyProducts);
    if (this.productItemsFromHierarachy && this.productItemsFromHierarachy.length) {
      this.reBindProductHierarchy(this.isFilterExisting);
    }
    this.getProductHierarchy();
  }

  public getDragDropDataGrid(): IDragDrop {
    const dropData: IDragDrop = {
      $id: `productlib_grid`,
      ObjectDerivedType: AppConstantSpace.POSITIONOBJECT,
      $sectionID: '',
      dragOriginatedFrom: DragOrigins.ProductLibrary,
      dragDropSettings: { drag: true, drop: false },
    };
    return dropData;
  }

  public reBindProductHierarchy(isFilterExisting: boolean): void {
    this.alertmsg = false;
    this.isFilterExisting = isFilterExisting;
    this.prepareExistingList();
    this.filterExitstingItemsInHierarchyGrid();
    this.bindHierarchyGrid();
  }

  private getProductHierarchy(): void {
    if(this.productlibraryService.productHierarchyList.length){
      this.parsedData = cloneDeep(this.productlibraryService.productHierarchyList);
    }else{
      this.subscriptions.add(this.productlibraryService.getProductHierarchy().subscribe((result: ProductHierarchyList[]) => {
        this.parsedData = result;
        this.productlibraryService.productHierarchyList = result;
      }));
    }
  }

  public fetchChildren = (item: ProductHierarchyList) => of(item.Children);

  public hasChildren = (item: ProductHierarchyList) => item.IsChildrenAvailable || (item.Children && item.Children.length);

  public onNodeSelect(event: TreeItem): void {
    if (event.dataItem.IdProdHier) {
      this.IdProdHier = event.dataItem.IdProdHier;
      this.searchProducts();
      this.productlibraryService.selectedKeys = [this.IdProdHier];
      // after changing node, selected product count should be none
      this.productlibraryService.selectedProductList = [];
    }
  }

  public handleExpand(event: TreeItem) {
    const index = this.expandedKeys.indexOf(event.dataItem.IdProdHier);
    if (index < 0) {
      this.expandedKeys = this.expandedKeys.concat(event.dataItem.IdProdHier);
    }
  }

  public handleCollapse(node: TreeItem) {
    this.expandedKeys.forEach((id, index) => {
      if (id === node.dataItem.IdProdHier) {
        this.expandedKeys.splice(index, 1);
      }
    })
  }

  public backToHome(): void {
    this.productlibraryService.isProductHierarchy.next(false);
  }

  public searchProducts(): void {
    const postObj = {
      idProdHier: this.IdProdHier,
      isAzSearch: false,
      searchText: "",
      searchableColumn: ""
    }
    this.prepareExistingList();
    this.subscriptions.add(this.productlibraryService.getSearchProducts(postObj).subscribe((result) => {
      let sotedResult: SearchProductList[] = sortBy(result.Data, (val) => { return val.LastModifiedDate; })
      const uniqueList = flatten(map(groupBy(sotedResult.reverse(), (val) => {
        return val.ProductPackage.IdPackageStyle
      }), (item) => {
        return uniqBy(item, 'UPC')
      }));
      this.productlibraryService.ProductGallery.hierarchyProducts = cloneDeep(uniqueList);
      this.productItemsFromHierarachy = uniqueList;
      this.productsFromHierarachy.emit(this.productItemsFromHierarachy)
      if (this.isFilterExisting && this.isPlanogramLoaded) {
        this.filterExitstingItemsInHierarchyGrid();
      }
      this.bindHierarchyGrid();
      this.alertmsg = false;
    }));
  }

  public prepareExistingList(): string[] {
    if (this.planogramService.selectedPogPanelID) {
      let exstArr: string[] = [];
      const sectionID = this.panelService.panelPointer[this.planogramService.selectedPogPanelID].sectionID;
      if ((sectionID)) {
        this.isPlanogramLoaded = true;
        let list = this.sharedService.getAllPositionFromObjectList(sectionID);
        list.forEach(obj => {
          exstArr.push(`${obj.Position.IDProduct.toString()}@${obj.Position.IDPackage.toString()}`);
        });
      } else {
        this.isFilterExisting = true;
        this.isPlanogramLoaded = false;
        exstArr = [];
      }
      this.existingProducts = exstArr;
      return exstArr;
    }
  }

  public getStyleForImage(dataItem: SearchProductList): string {
    const idProd = `${dataItem.IDProduct.toString()}@${dataItem.IDPackage.toString()}`;
    if (this.prepareExistingList().length) {
      if (this.existingProducts.indexOf(idProd) > -1 && !this.isFilterExisting && this.isPlanogramLoaded) {
        return "borderLeftPurple";
      } else {
        return "";
      }
    }
  }

  public bindHierarchyGrid(): void {
    this.productItemsFromHierarachy.forEach(obj => {
      obj.filteredStyle = this.getStyleForImage(obj)
    });
    if (this.agHierarachyGrid) {
      this.agHierarachyGrid?.gridApi?.setRowData(this.productItemsFromHierarachy);
    } else {
      let columnDefs = this.agGridHelperService.getAgGridColumns(`shelf_prod_search_details`);
      let imageIndex = columnDefs.findIndex(c => c.field === 'ProductPackage.Images.front');
      columnDefs[imageIndex].filter = false;
      columnDefs[imageIndex].enableRowGroup = false;
      this.gridConfigHierarachy = {
        ...this.gridConfigHierarachy,
        id: `shelf_prod_search_details`,
        columnDefs: columnDefs,
        data: this.productItemsFromHierarachy,
        height: this.state ? 'calc(100vh - 12em)' : 'calc(100vh - 22em)',
        setRowsForSelection: { items: this.productlibraryService.selectedProductList, field: 'IDProduct' }
      }
    }
  }

  public filterExitstingItemsInHierarchyGrid(): void {
    this.productItemsFromHierarachy = cloneDeep(this.productlibraryService.ProductGallery.hierarchyProducts);
    if (this.isFilterExisting) {
      for (let i = this.productItemsFromHierarachy.length - 1; i >= 0; i--) {
        let idProd = `${this.productItemsFromHierarachy[i].IDProduct.toString()}@${this.productItemsFromHierarachy[i].IDPackage.toString()}`;
        if (this.existingProducts.indexOf(idProd) > -1) {
          this.productItemsFromHierarachy.splice(i, 1);
        }
      }
      this.productItemsFromHierarachy = [...this.productItemsFromHierarachy];
    }
  }

  public invokeSelectedRow(): void {
    this.productlibraryService.selectedProductList = [];
    const selectedRows = this.agHierarachyGrid?.gridApi?.getSelectedRows();
    if(selectedRows?.length){
      this.productlibraryService.selectedProductList = [...selectedRows];
    }
  }

  public selectAllProducts(): void {
    this.agHierarachyGrid?.gridApi?.selectAll();
    this.productlibraryService.selectedProductList = this.agHierarachyGrid?.gridApi?.getSelectedRows();
  }

  public unSelectAllProducts(): void {
    this.agHierarachyGrid?.gridApi?.deselectAll();
    this.bindHierarchyGrid();
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

}
