import { Component, Input, OnInit } from '@angular/core';
import {
    BaseFilterCellComponent,
    FilterService
} from '@progress/kendo-angular-grid';
import * as moment from 'moment';
import {
    FilterDescriptor,
    CompositeFilterDescriptor
} from '@progress/kendo-data-query/dist/es/main';
import { Collision } from '@progress/kendo-angular-popup';
@Component({
    selector: 'srp-date-range-filter-template',
    templateUrl: './date-range-filter-template.component.html',
    styleUrls: ['./date-range-filter-template.component.scss']
})
export class DateRangeFilterTemplateComponent extends BaseFilterCellComponent implements OnInit {
    constructor(filterService: FilterService) {
        super(filterService);
    }

    public get start(): Date {
        const first = this.findByOperator('gte');

        return (first || ({} as FilterDescriptor)).value;
    }

    public get end(): Date {
        const end = this.findByOperator('lte');
        return (end || ({} as FilterDescriptor)).value;
    }

    public get hasFilter(): boolean {
        return this.filtersByField(this.field).length > 0;
    }
    @Input()
    public filter: CompositeFilterDescriptor;
    @Input()
    public field: string;
    @Input() grid: any;

    public selected: any;
    public alwaysShowCalendars: boolean;
    public ranges: any = {
        Today: [moment(), moment()],
        Yesterday: [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
        'Last 7 Days': [moment().subtract(6, 'days'), moment()],
        'Last 30 Days': [moment().subtract(29, 'days'), moment()],
        'This Month': [moment().startOf('month'), moment().endOf('month')],
        'Last Month': [
            moment()
                .subtract(1, 'month')
                .startOf('month'),
            moment()
                .subtract(1, 'month')
                .endOf('month')
        ]
    };
    ngOnInit(): void {
        if (this.filter?.filters?.length > 0) {
            const filterItem = this.filter.filters.filter(x => x['operator'] === 'gte' || x['operator'] === 'lte');
            if (filterItem?.length > 1) {
                this.selected = {
                    ...this.selected,
                    start: this.filter.filters.find(x => x['operator'] === 'gte')
                    ['value'],
                    end: this.filter.filters.find(x => x['operator'] === 'lte')
                    ['value'],
                }
            }
        }
    }
    public clearFilter(): void {
        this.filterService.filter(this.removeFilter(this.field));
    }

    //   public filterRange(start: Date, end: Date): void {
    //     this.filter = this.removeFilter(this.field);

    //     const filters = [];

    //     if (start) {
    //       filters.push({
    //         field: this.field,
    //         operator: 'gte',
    //         value: start
    //       });
    //     }

    //     if (end) {
    //       filters.push({
    //         field: this.field,
    //         operator: 'lte',
    //         value: end
    //       });
    //     }

    //     const root = this.filter || {
    //       logic: 'and',
    //       filters: []
    //     };

    //     if (filters.length) {
    //       root.filters.push(...filters);
    //     }

    //     this.filterService.filter(root);
    //   }
    public filterRange(start: Date, end: Date): void {
        Object.assign(this.filter, this.grid.filter);

        const filters = [];

        if (this.selected && this.selected.start) {
            filters.push({
                field: this.field,
                operator: 'gte',
                value: new Date(this.selected.start)
            });
        }

        if (this.selected && this.selected.end) {
            filters.push({
                field: this.field,
                operator: 'lte',
                value: new Date(this.selected.end)
            });
        }

        const root = this.filter || {
            logic: 'and',
            filters: []
        };

        if (filters.length) {
            root.filters.push(...filters);
        }

        this.filterService.filter(root);
    }

    private findByOperator(op: string): FilterDescriptor {
        return this.filtersByField(this.field).filter(
            ({ operator }) => operator === op
        )[0];
    }
}
