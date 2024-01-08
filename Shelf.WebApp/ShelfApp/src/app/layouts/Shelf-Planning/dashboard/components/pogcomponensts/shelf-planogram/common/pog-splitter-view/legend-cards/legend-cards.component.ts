import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { RangeModel } from 'src/app/shared/models/highlight';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { HighlightService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/highlight_Setting/highlight.service';

@Component({
    selector: 'shelf-legend-cards',
    templateUrl: './legend-cards.component.html',
    styleUrls: ['./legend-cards.component.scss'],
})
export class LegendCardsComponent implements OnInit, OnDestroy {
    @Output() showLegend = new EventEmitter();
    public colorPalette: RangeModel[] = [];
    public startValue: string = '';
    public midValue: string = '';
    public endValue: string = '';
    public eachColorDivWidth: number = 10;
    public legendDisplay: boolean = false;
    private subscription = new Subscription();
    constructor(
        private readonly highlightService: HighlightService,
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
    ) {}

    public ngOnInit(): void {
        this.subscription.add(
            this.highlightService.showLegend.subscribe((res) => {
                this.legendDisplay = res;
                    this.colorPalette = [];
                    this.startValue = '';
                    this.midValue = '';
                    this.endValue = '';
                    this.initPalette();
                }),
        );
    }

    public ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    public initPalette(): void {
        if (this.planogramService.templateRangeModel.rangeModel?.length) {
            this.colorPalette = this.planogramService.templateRangeModel.rangeModel;
        }
        if (this.highlightService.colorScaleValues) {
            this.startValue = this.highlightService.colorScaleValues.modelSP_startval;
            this.midValue = this.highlightService.colorScaleValues.modelSP_middleval;
            this.endValue = this.highlightService.colorScaleValues.modelSP_endval;
        }
        this.renderPalette();
        this.showLegend.emit(this.legendDisplay);
    }

    public get showSpectrumPaletteLegend(): boolean {
        let highlightType: string;
        if (
            this.planogramService.templateRangeModel.highlightType === this.translate.instant('COLOR_SCALE') ||
            this.planogramService.templateRangeModel.highlightType === 'COLOR_SCALE'
        ) {
            highlightType = 'COLOR_SCALE';
        }
        if (highlightType !== 'COLOR_SCALE') {
            return false;
        }
        return this.planogramService.templateRangeModel.spectrumAttr.modelSP_legend;
    }

    public renderPalette(): void {
        this.eachColorDivWidth = window.innerWidth / this.colorPalette.length;
    }
}
