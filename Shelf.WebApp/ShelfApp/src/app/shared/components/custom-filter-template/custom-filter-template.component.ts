import { Component, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CompositeFilterDescriptor, FilterDescriptor } from '@progress/kendo-data-query';
import { FilterService } from '@progress/kendo-angular-grid';
import { IntlService } from '@progress/kendo-angular-intl';
import { LanguageService } from 'src/app/shared/services';

@Component({
    selector: 'srp-custom-filter-template',
    templateUrl: './custom-filter-template.component.html',
    styleUrls: ['./custom-filter-template.component.scss'],
})
export class CustomFilterTemplateComponent implements AfterViewInit {
  constructor(private intl: IntlService, private readonly languageService: LanguageService) {
    this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
  }


    @Input() public isPrimitive: boolean;
    @Input() public currentFilter: CompositeFilterDescriptor;
    @Input() public data;
    @Input() public textField;
    @Input() public valueField;
    @Input() public filterService: FilterService;
    @Input() public field: string;
    @Input() public columnType: string;
    @Output() public valueChange = new EventEmitter<number[]>();

    public skeletonDateTimeFormat: string;
    public selectedAll = false;

    @ViewChild('itemElement') itemElement: ElementRef;

    public currentData: any;
    public showFilter = true;
    private value: any[] = [];

    public textAccessor = (dataItem: any) => (this.isPrimitive ? dataItem : dataItem[this.textField]);
    public valueAccessor = (dataItem: any) => (this.isPrimitive ? dataItem : dataItem[this.valueField]);

    public ngAfterViewInit() {
        if (this.data && this.data.length > 0) {
            this.currentData = this.data.sort(this.compare);
            this.currentData = this.currentData.map((obj) => ({ ...obj, filter: true }));
            if (this.currentFilter.filters.length > 0) {
                if (this.currentFilter.filters.some((x) => x['field'])) {
                    this.value = this.currentFilter.filters.map((f: FilterDescriptor) => f.value);
                } else {
                    const tempFilter = this.currentFilter.filters.find((x) => x['filters'][0]['field'] === this.field);
                    this.value = tempFilter ? tempFilter['filters'].map((f: FilterDescriptor) => f.value) : this.value;
                }
            }

            if (this.currentData.length === this.value.length) {
                this.selectedAll = true;
            }
            const typeOfData = typeof this.textAccessor(this.currentData[0]['value']);
            this.showFilter = typeOfData === 'string' || typeOfData === 'number';
        }
    }
    public compare(a, b) {
        if (typeof a.value !== 'string') {
            return Number(a.value) - Number(b.value);
        } else {
            if (a.value && b.value) {
                if (a.value.toUpperCase() < b.value.toUpperCase()) {
                    return -1;
                }
                if (a.value.toUpperCase() > b.value.toUpperCase()) {
                    return 1;
                }
            }
            return 0;
        }
    }
    public isItemSelected(item) {
        if (item && this.columnType === 'date') {
          const val = this.intl.formatDate(new Date(this.valueAccessor(item)), { skeleton: this.skeletonDateTimeFormat });
            return this.value.some(
                (x) =>
                this.intl.formatDate(new Date(this.valueAccessor(x)), { skeleton: this.skeletonDateTimeFormat }) === val,
            );
        }
        return this.value.some((x) => x === this.valueAccessor(item));
    }
    public selectAllChecked = () => {
        this.selectedAll = !this.selectedAll;
        if (this.selectedAll) {
            this.value = [];
            this.currentData.forEach((element) => {
                this.onSelectionChange(this.valueAccessor(element.field), this.itemElement);
            });
        } else {
            this.value = [];
        }
    };
    public onSelectionChange(item, li) {
        const ind = this.value.findIndex((x) => {
            if (item && this.columnType === 'date') {
                return (
                  this.intl.formatDate(new Date(this.valueAccessor(x)), { skeleton: this.skeletonDateTimeFormat }) ===
                  this.intl.formatDate(new Date(this.valueAccessor(item)), { skeleton: this.skeletonDateTimeFormat })
                );
            }
            return x === item;
        });
        if (ind !== -1) {
            this.value = this.value.filter((x, i) => i !== ind);
            this.selectedAll = false;
        } else {
            this.value.push(item);
            if (this.value.length === this.currentData.length) {
                this.selectedAll = true;
            }
        }

        this.filterService.filter({
            filters: this.value.map((value) => ({
                field: this.field,
                operator: 'eq',
                value: this.setValue(value),
            })),
            logic: 'or',
        });
        //this.onFocus(li);
    }

    private setValue = (value) => {
        let retVal = value;
        if (retVal === null) {
            retVal = 'NULL';
        } else if (retVal === undefined) {
            retVal = 'UNDEFINED';
        } else if (retVal === '') {
            retVal = 'EMPTY';
        }
        return retVal;
    };

    public onInput(e: any) {
        if (e.target.value && e.target.value !== '') {
            if (typeof this.textAccessor(this.data[0].value) === 'number') {
                this.currentData = this.data.filter(
                    (x) =>
                        x['value'] &&
                        x['value']?.toString()?.toUpperCase().indexOf(e.target.value.toUpperCase()) !== -1,
                );
            } else {
                this.currentData = this.data.filter(
                    (x) => x['value'] && x['value']?.toUpperCase()?.indexOf(e.target.value.toUpperCase()) !== -1,
                );
            }
        } else {
            this.currentData = this.data.sort(this.compare);
        }
    }
    //Commented as we dont need focus effect
    // public onFocus(li: any): void {
    //   li = li.nativeElement == undefined ? li : li.nativeElement;
    //   const ul = li.parentNode;
    //   const below = ul.scrollTop + ul.offsetHeight < li.offsetTop + li.offsetHeight;
    //   const above = li.offsetTop < ul.scrollTop;

    //   // Scroll to focused checkbox
    //   if (below || above) {
    //     ul.scrollTop = li.offsetTop;
    //   }
    // }
}
