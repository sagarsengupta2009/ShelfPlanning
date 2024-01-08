import { AfterViewInit, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { SharedService, AgGridHelperService } from 'src/app/shared/services';
import { Store } from 'src/app/shared/models/store/stores';
import { SelectionEvent } from '@progress/kendo-angular-grid';
import { GridConfig, GridColumnCustomConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';


@Component({
  selector: 'sp-selected-store',
  templateUrl: './selected-store.component.html',
  styleUrls: ['./selected-store.component.scss']
})
export class SelectedStoreComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(`grid`) grid: AgGridComponent;
  @Input() selectedStore: Store[];
  public selectedGridConfig: GridConfig;
  public copyOfSelectedStore: Store[] = [];
  public changeDate: Date = new Date();
  public selectedStoreSubscription: Subscription;

  constructor(
    private readonly agGridHelperService: AgGridHelperService,
    private readonly sharedService: SharedService,
    private readonly agGridStoreService: AgGridStoreService
  ) { }

  ngOnInit(): void {
    //this.BindSearchEvent();
  }
  ngAfterViewInit(): void {
    this.bindselectedStoreDataGrid(this.selectedStore);
    this.selectedStore.forEach((val: Store) => {
      val.EffectiveTo = null;
      this.copyOfSelectedStore.push(Object.assign({}, val))
    });
  }

  public BindSearchEvent(response: string): void {
    let tempData: Store[];
    if (response) {
      tempData = this.sharedService.runFilter(
        this.agGridStoreService.gridHoldingData.find(x => x.id === this.grid.gridConfig.id).data,
        response
      );
    }
    else {
      tempData = this.selectedStore
    }
    this.bindselectedStoreDataGrid(tempData);
  }

  private bindselectedStoreDataGrid = (data: Store[]): void => {
    if (this.grid) {
      this.grid.gridApi.setRowData(data);
      this.grid.selectMultipleRows('IDStore', this.copyOfSelectedStore.map(x => x.IDStore));
    } else {
      const minDate = new Date();
      minDate.setDate(new Date().getDate() + 1);
      let gridColumnCustomConfig: GridColumnCustomConfig = {
        dateSettings: { minDate: minDate }
    }
      this.selectedGridConfig = {
        id: `shelf_create_new_pog_store_grid_details`,
        columnDefs: this.agGridHelperService.getAgGridColumns(`shelf_create_new_pog_store_grid_details`, gridColumnCustomConfig),
        data: data,
        firstCheckBoxColumn: { show: true, template: `dataItem.IsMarkedAsDelete || dataItem.IsReadOnly || dataItem.isLoaded` },
        height: '65vh',
        isSelectAll: true
      }
    }
  }

  public invokeSelectedstoreRow = (event: SelectionEvent): void => {
    const selectedRows: any = this.grid.gridApi.getSelectedRows();
    this.copyOfSelectedStore = [];
    if (selectedRows.length) {
      selectedRows.forEach((element) => {
        this.copyOfSelectedStore.push(element)
      })
    }
  };

  public deleteSelectedRows(): void {
    this.copyOfSelectedStore.forEach(element => {
      let index = this.selectedStore.findIndex(item => (item.IDStore === element.IDStore && item.StoreNum === element.StoreNum))
      if (index >= 0) {
        this.selectedStore.splice(index, 1)
      }
    });
    this.copyOfSelectedStore.length = 0;
    this.grid.gridApi.deselectAll();
    this.grid.gridApi.setRowData(this.selectedStore);
  }

  public onDateChange = (): void => {
    this.copyOfSelectedStore.forEach(element => {
      let index = this.selectedStore.findIndex(item => (item.IDStore === element.IDStore && item.StoreNum === element.StoreNum))
      if (index >= 0) {
        this.selectedStore[index].EffectiveFrom = this.changeDate
      }
    });
    this.grid.gridApi.setRowData(this.selectedStore);
  };
  public editedValue(event): void {
    let editedDate = new Date(event.event.value)
    let index = this.selectedStore.findIndex(item => (item.IDStore === event.event.data.IDStore && item.StoreNum === event.event.data.StoreNum))
    if (index >= 0) {
      this.selectedStore[index][event.event.colDef.field] = editedDate;
    }
    this.grid.gridConfig.data = this.selectedStore//update grid data
  }
  public exportToExcel = (): void => {
    this.grid.exportToExcel();
  }

  ngOnDestroy(): void {
    this.selectedStoreSubscription ? this.selectedStoreSubscription.unsubscribe() : null;
  }
}
