import { Component, Input } from '@angular/core';
import { FilterService } from '@progress/kendo-angular-grid';
import { CompositeFilterDescriptor } from '@progress/kendo-data-query';

@Component({
  selector: 'srp-custom-checkbox-template',
  templateUrl: './checkbox-filter-template.component.html',
  styleUrls: ['./checkbox-filter-template.component.scss']
})
export class CheckBoxFilterTemplateComponent {

  @Input() public data: [{
    value: string,
    field: string,
    type: string,
  }];
  @Input() public field: string;
  @Input() public currentFilter: CompositeFilterDescriptor;
  @Input() public filterService: FilterService;

  private filters: String[] = [];
  private applyFilter: String[] = [];
  public appliedCheckedFilter = false;
  public appliedUncheckedFilter = false;

  constructor() {
  }

  ngOnInit() {
    if (this.currentFilter.filters.length > 0) {
      this.setFilters();
    }
  }

  private setFilters(): void {
    this.appliedUncheckedFilter = this.currentFilter.filters.some(x => x['value'].indexOf('assignpog') !== -1);
    this.appliedCheckedFilter = this.currentFilter.filters.some(x => x['value'].indexOf('disabled') !== -1);
    if (this.appliedCheckedFilter) {
      this.applyFilter.push('checked');
    }
    if (this.appliedUncheckedFilter) {
      this.applyFilter.push('unchecked');
    }
  }

  public filterValues(item: string): void {
    this.filters = [];
    if (this.applyFilter.some(x => x === item)) {
      this.applyFilter = this.applyFilter.filter(x => x !== item);
    } else {
      this.applyFilter.push(item);
    }

    for (let i = 0; i < this.applyFilter.length; i++) {
      if ((this.applyFilter[i] === `checked`)) {
        const filterCheckedArr = this.data.filter(x => x.value.indexOf('disabled') !== -1).map(x => x.value);
        if (filterCheckedArr.length > 0) {
          for (let i = 0; i < filterCheckedArr.length; i++) {
            this.filters.push(filterCheckedArr[i]);
          }
        }
      } else {
        const filterUnCheckedArr = this.data.filter(x => x.value.indexOf('assignpog') !== -1).map(x => x.value);
        if (filterUnCheckedArr.length > 0) {
          for (let i = 0; i < filterUnCheckedArr.length; i++) {
            this.filters.push(filterUnCheckedArr[i]);
          }
        }
      }
    }

    this.filterService.filter({
      filters: this.filters.map(value => ({
        field: this.field,
        operator: `eq`,
        value
      })),
      logic: `or`
    });
  }
}
