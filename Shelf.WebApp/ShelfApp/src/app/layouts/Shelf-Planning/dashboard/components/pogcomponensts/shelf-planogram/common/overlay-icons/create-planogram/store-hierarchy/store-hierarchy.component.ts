import { AfterViewInit, Component, Input, OnChanges, OnDestroy, OnInit, SimpleChanges, ViewChild ,EventEmitter} from '@angular/core';
import { of, Subscription } from 'rxjs';
import { SharedService, AgGridHelperService, CreatePlanogramService, PlanogramStoreService } from 'src/app/shared/services';
import { Store, StoreHierarchyView, Stores } from 'src/app/shared/models/store';
import { NodeData } from 'src/app/shared/models';
import { TreeItem } from '@progress/kendo-angular-treeview';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
import { ColDef, RowNode } from 'ag-grid-community';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';

@Component({
  selector: 'sp-store-hierarchy',
  templateUrl: './store-hierarchy.component.html',
  styleUrls: ['./store-hierarchy.component.scss']
})
export class StoreHierarchyComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @ViewChild(`grid`) grid: AgGridComponent;
  @Input() stores:Store[];
  public gridConfig: GridConfig;
  private StoreHierarchyLevels: Subscription;
  private StoreData: Subscription;
  private storeSubscription: Subscription;
  public expandedKeys: number[] = [];
  private storesGridData: Store[] = [];
  public parsedData: StoreHierarchyView[];
  private treeList: StoreHierarchyView[] = [];
  public text: string;
  public selectedStore: Store[] = [];
  private todayDate: Date = new Date();
  private changeDate: Date = new Date();
  private minimunDate: Date = new Date(this.todayDate);
  private gridData: Store[] = [];
  private date:Date;
  private currentNode: number;
  
  constructor(private readonly createPlanogramService: CreatePlanogramService,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly agGridStoreService: AgGridStoreService
  ) { }


  public selectedRows: number[] = [];

  public ngOnChanges(changes: SimpleChanges): void {
    if (changes.stores && changes.stores.currentValue) {
      this.selectedStore = this.stores;
    }
  }

  public ngOnInit(): void {
    this.minimunDate.setDate(this.todayDate.getDate() + 1)
    this.changeDate.setDate(this.todayDate.getDate() + 1)
    this.storeHierarchyTree();
    this.createPlanogramService.updateSelection.subscribe((res: Store[]) => {
      this.selectedRows = res.map(item => item.IDStore);
      this.bindStoreDataGrid(this.storesGridData);
      (!res.length) && (this.grid.gridApi.deselectAll());
    })
  }

  public ngAfterViewInit(): void {
    const scenarioStartDate = this.planogramStore.scenariosPogs.StartDate;
    this.date = new Date(scenarioStartDate);
    let currDate = new Date();
    currDate.setDate(currDate.getDate() + 1);
    let timeDiff = this.date.getTime() - currDate.getTime();
    let diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
    if (diffDays < 0) {
      this.date = currDate;
    };
  }

  public bindSearchEvent(response:string):void {
    let tempData: Store[] = [];
    if (response) {
      tempData = this.sharedService.runFilter(
        this.agGridStoreService.gridHoldingData.find(x => x.id === this.grid.gridConfig.id).data,
        response
      );
    }
    else {
      tempData = this.storesGridData
    }
    this.bindStoreDataGrid(tempData);
  }
  private storeHierarchyTree = ():void => {
    this.StoreHierarchyLevels = this.createPlanogramService.getStoreHierarchyLevels().subscribe((result:StoreHierarchyView[]) => {
      this.parsedData = result;
      this.treeList = result;

    });
  }

  public fetchChildren = (item: NodeData) => of(item.Children);

  public hasChildren = (item: any) => item.IsChildrenAvailable || (item.Children && item.Children.length > 0);


  public onNodeSelect(event) :void{
    if (event.dataItem.IdHierStr) {
      this.StoreData = this.createPlanogramService.getHierarchyStores(event.dataItem.IdHierStr).subscribe((result: Stores) => {
        this.storesGridData = result.Table;
        this.currentNode = event.dataItem.IdHierStr;
        this.storesGridData = this.storesGridData.filter(item => item.IsActive == true);
        this.storesGridData.forEach((item) => {
          if (item.PostalCode == "NULL" || item.PostalCode == null) {
            item.PostalCode = "";
          }

          if (item.Address1 == "NULL" || item.Address1 == null) {
            item.Address1 = "";
          }

          if (item.Address2 == "NULL" || item.Address2 == null) {
            item.Address2 = "";
          }

          if (item.Phone == "NULL" || item.Phone == null) {
            item.Phone = "";
          }

          item.selected = false;
          item.EffectiveFrom = this.date;
        });
        this.gridData = this.storesGridData;
        this.bindStoreDataGrid(this.storesGridData);
      });
    }
  }
  public handleExpand(event:TreeItem):void {
    let index = this.expandedKeys.indexOf(event.dataItem.IdHierStr);
    if (index < 0) {
      this.expandedKeys = this.expandedKeys.concat(event.dataItem.IdHierStr);
    }
  }

  public handleCollapse(node:TreeItem):void {
    for (let i in this.expandedKeys)
      if (this.expandedKeys[i] == node.dataItem.IdHierStr) {
        this.expandedKeys.splice(Number(i), 1)
      }
  }

  public search (items: StoreHierarchyView[], term: string): StoreHierarchyView[] {
    return items.reduce((acc, item) => {
      if (this.contains(item.Name, term)) {
        let index = this.expandedKeys.indexOf(item.IdHierStr);
        if (index < 0) {
          if (item.Children && item.Children.length > 0)
            this.expandedKeys = this.expandedKeys.concat(item.IdHierStr);
        }
        acc.push(item);
      } else if (item.Children && item.Children.length > 0) {
        const newItems = this.search(item.Children, term);
        let index = this.expandedKeys.indexOf(item.IdHierStr);
        if (index < 0) {
          if (item.Children && item.Children.length > 0)
            this.expandedKeys = this.expandedKeys.concat(item.IdHierStr);
        }
        if (newItems.length > 0) {
          acc.push({ Name: item.Name, IdHierStr: item.IdHierStr, Children: newItems });
        }
      }
      return acc;
    }, []);
  }

  public contains(text: string, term: string): boolean {
    return text && text.toLowerCase().indexOf(term.toLowerCase()) >= 0;
  }

  public onkeyup(value:string):void {
    if (value == '') {
      this.expandedKeys = [];
      this.parsedData = this.treeList;
      this.storesGridData = this.gridData;
    } else {
      this.parsedData = this.search(this.treeList, value);
    }
  }

  private bindStoreDataGrid = (data): void => {
    if (this.grid) {
      this.grid?.gridApi?.setRowData(data);
      this.grid.setGridHoldingData(data);
      let allSelectedStores: Store[] = [];
      if(this.createPlanogramService.selectedStores.length){
        this.createPlanogramService.selectedStores.forEach((stores) => {
          allSelectedStores = allSelectedStores.concat(stores.selectedStoes.map((x => x)));
        })
      }
      this.grid?.selectMultipleRows('IDStore', allSelectedStores.map(x => x.IDStore));
      if (allSelectedStores.length && data.length) {      
        this.overrideCheckboxHeaderSelection();
      }
    } else {
      const col: ColDef[] = this.agGridHelperService.getAgGridColumns(`shelf_store_screen_details`);
      this.gridConfig =
      {
        setRowsForSelection: { field: 'IDStore', items: this.selectedStore },
        id: `shelf_store_screen_details`,
        columnDefs: col,
        data: data,
        height: '59vh',
        firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` }
      }
    }
  }

  public invokeSelectedRow = ():void => {
    let selectedRows: Store[] = this.grid.gridApi.getSelectedRows();
    let rowNodes: RowNode[] = [];
    this.grid?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
      rowNodes.push(ele);
    });
    const data = Object.assign([], rowNodes)
    if (rowNodes.length) {
      selectedRows = [];
      data.forEach((ele) => {
        if (ele.selected) {
          selectedRows.push(ele.data);
        }
      })
    }
    const index = this.createPlanogramService.selectedStores.findIndex((el) => el.id === this.currentNode);
    if (this.createPlanogramService.selectedStores.length == 0 || index === -1) {
        this.createPlanogramService.selectedStores.push({ id: this.currentNode, selectedStoes: selectedRows })
    } else {
        this.createPlanogramService.selectedStores.forEach((node) => {
            if (node.id === this.currentNode) {
                node.selectedStoes = selectedRows ? selectedRows : [];;
            }
        })
    }

    let allSelectedStores: Store[]  = []
    this.createPlanogramService.selectedStores.forEach((node) => {
        node.selectedStoes.forEach((item) => {
            allSelectedStores.push(item);
        })
    })
    this.selectedStore = allSelectedStores;
    this.selectedRows = this.selectedStore.map(item => item.IDStore);
  };



  public exportToExcel = ():void => {
    this.grid.exportToExcel();
  }

  public storeIconSearch = (value: string): void => {
    this.parsedData = this.search(this.treeList, value);
  }
  
  //SelectionChangedEvent is not trigerring as we restricted it, so need this css manipulation for header checkbox selection
  private overrideCheckboxHeaderSelection() {
    const checkboxElement = document.querySelector('sp-store-hierarchy shelf-ag-grid .ag-header-cell .ag-checkbox.ag-input-field .ag-checkbox-input-wrapper');
    checkboxElement.classList.add('ag-indeterminate');
  }
  public ngOnDestroy(): void {
    this.StoreHierarchyLevels ? this.StoreHierarchyLevels.unsubscribe() : null;
    this.StoreData ? this.StoreData.unsubscribe() : null;
    this.storeSubscription ? this.storeSubscription.unsubscribe() : null;
    this.createPlanogramService.selectedStores = [];
  }

  public resetSelectedData(): void{
    this.selectedStore = [];
    this.createPlanogramService.selectedStores = [];
    if (this.grid) {
      this.grid.gridApi.deselectAll();
    }
  }

}
