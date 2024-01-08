import { Component, OnInit, Input, SimpleChanges, ViewEncapsulation } from '@angular/core';

@Component({
  selector: 'srp-kendo-grid-multi-header',
  templateUrl: './kendo-grid-multi-header.component.html',
  styleUrls: ['./kendo-grid-multi-header.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class KendoGridMultiHeaderComponent implements OnInit {
  public gridData = [];
  public columns = [];
  public groupedColumns = [];
  @Input() gridConfig: GridConfig;
  public gridHeight = {
    height: 'calc(100vh - 369px)',
  };
  public gridCustomCss = '';
  constructor() { }

  ngOnInit(): void {
  }
  // tslint:disable-next-line: use-lifecycle-interface
  ngOnChanges(changes: SimpleChanges): void {
    if (changes && changes[`gridConfig`]) {
      this.gridData = [];
      this.loadGridData();
    }
  }
  public loadGridData() {
    if (this.gridConfig) {
      this.gridData = this.gridConfig.data;
      this.columns = this.gridConfig.columns;
      this.groupedColumns = this.gridConfig.groupColumns;
      this.gridHeight.height = this.gridConfig.height
        ? this.gridConfig.height
        : this.gridHeight.height;
      this.gridCustomCss = this.gridConfig.class
        ? this.gridConfig.class
        : this.gridCustomCss;
    }
  }
}
export interface GridConfig {
  id: string;
  columns?: any[];
  groupColumns?: any[];
  data: any;
  height?: any;
  hideColumnWhileExport?: any;
  class?: any;
}
// interface ColumnSetting {
//   field?: string;
//   title?: string;
//   width: string;
//   isGroup: boolean;
//   columns?: any;

// }
