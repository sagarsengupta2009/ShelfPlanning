import { Component, Input, OnDestroy, OnChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { LookUp } from 'src/app/shared/models';
import { ReportandchartsService } from 'src/app/shared/services';

@Component({
    selector: 'sp-report-template',
    templateUrl: './report-template.component.html',
    styleUrls: ['./report-template.component.scss'],
})
export class ReportTemplateComponent implements OnChanges, OnDestroy {
    @Input() selectedReportType;
    private subscriptions: Subscription = new Subscription();
    public reportTemplateData: any[] = [];
    constructor(private readonly reportchartsService: ReportandchartsService) { }

    public ngOnChanges(): void {
        this.getTemplateParams();
    }

    public ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    private getTemplateParams(): void {
        this.subscriptions.add(
            this.reportchartsService
                .getReportTemplateParameters(this.selectedReportType.IDReportTemplate)
                .subscribe((res) => {
                    this.reportTemplateData = JSON.parse(res?.Data.toString());
                    for (let d of this.reportTemplateData) {
                        if (d.ParameterType == 0) {
                            d.dropdown = this.getDropdownArray(d.LookUp);
                        }
                    }
            }),            
        );
    }

    private getDropdownArray(data): LookUp[] {
        let dataArray: LookUp[] = [];
        for (let key in data) {
            let nameValue: LookUp = {
                Name: data[key],
                value: key,
            };

            dataArray.push(nameValue);
        }
        return dataArray;
    }
}
