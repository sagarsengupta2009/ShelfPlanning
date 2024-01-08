import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import {
    PlanogramService,
    SharedService,
    CoffincaseSvgRenderService,
} from 'src/app/shared/services';
import { Coffincase } from 'src/app/shared/classes';
import { StyleCoffineCase, SvgToolTip} from 'src/app/shared/models';
import { PogComponent } from '../pog.component';
@Component({
    selector: 'sp-coffincase',
    templateUrl: './coffincase.component.html',
    styleUrls: ['./coffincase.component.scss'],
})
export class CoffinCaseComponent extends PogComponent implements OnInit, OnDestroy {

    @ViewChild('dataContainer') dataContainer: ElementRef;
    @Input() data: Coffincase;
    public toolTipData:Array<{keyName: string, value: string | number}>;;
    private SVGBlock: string;
    public styleCoffin: StyleCoffineCase;
    constructor(
        private readonly planogramService: PlanogramService,
        public readonly sharedService: SharedService,
        private readonly cdr: ChangeDetectorRef,
        private readonly coffincaseSvgRender: CoffincaseSvgRenderService,
    ) { super()}

    ngOnInit(): void {
        this.renderCoffincaseAgain();
        this.subscriptions.add(
            this.sharedService.fixtureEdit.subscribe((response:boolean) => {
                if (response) {
                    this.renderCoffincaseAgain();
                    this.updateSvg(this.SVGBlock);
                    this.styleCoffin = this.styleCoffinCase(this.data);
                }
            }),
        );
        this.subscriptions.add(
            this.sharedService.updateImageInPOG.subscribe((result:string) => {
                if (result && result == 'CoffinCase') {
                    this.renderCoffincaseAgain();
                    this.updateSvg(this.SVGBlock);
                    this.styleCoffin = this.styleCoffinCase(this.data);
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.updateValueInPlanogram.subscribe((res:object) => {
                if (res) {
                    this.renderCoffincaseAgain();
                    this.updateSvg(this.SVGBlock);
                    this.styleCoffin = this.styleCoffinCase(this.data);
                }
            }),
        );
        this.subscriptions.add(
            this.sharedService.turnoNOffSub.subscribe((res:boolean) => {
                this.cdr.markForCheck();
            }),
        );
    }

    ngAfterViewInit() :void{
        this.styleCoffin = this.styleCoffinCase(this.data);
        this.updateSvg(this.SVGBlock);
        this.cdr.detectChanges();
    }

    private styleCoffinCase(child: Coffincase): StyleCoffineCase {
        if (!child) {
            return;
        }
        const height = child.Fixture.DisplayViews?child.Dimension.Depth:child.Dimension.Height;
        const style = {
            position: 'absolute',
            width: this.planogramService.convertToPixel(child.Dimension.Width, child.$sectionID) + 'px',
            height: this.planogramService.convertToPixel(height, child.$sectionID) + 'px',
            bottom: this.planogramService.convertToPixel(0, child.$sectionID) + 'px',
            left: this.planogramService.convertToPixel(0, child.$sectionID) + 'px',
        };
        if (style.bottom == '0px') {
            delete style.bottom;
        }
        return style;
    }

    private renderCoffincaseAgain ():void {
        if (this.data?.$sectionID) {
            const scale = this.planogramService.convertToScale(this.data.$sectionID);
            this.SVGBlock = this.coffincaseSvgRender.DOMCoffincase(this.data, scale);
        }
    }

    private getToolTipData() :SvgToolTip[]{
        return this.planogramService.getPlanogramToolTipData(this.data);
    }

   public checkplanogram():void {
        this.toolTipData = this.getToolTipData();
    }

    public get showTooltip():boolean{
        return this.sharedService.turnoff_tooltip
    }
}
