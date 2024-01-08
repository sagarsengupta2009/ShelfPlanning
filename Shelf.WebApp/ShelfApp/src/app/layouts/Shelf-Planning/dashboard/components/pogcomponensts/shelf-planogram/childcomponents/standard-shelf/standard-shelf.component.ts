import {
    AfterViewInit,
    ChangeDetectorRef,
    Component,
    ElementRef,
    Input,
    OnDestroy,
    OnInit,
    ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { Divider, StandardShelf } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { PogSettings, StyleStandard, SvgToolTip } from 'src/app/shared/models';
import {
    PlanogramService,
    SharedService,
    ToolTipService,
    StandardshelfSvgRenderService,
    MiscSvgRenderService
} from 'src/app/shared/services';

@Component({
    selector: 'sp-standard-shelf',
    templateUrl: './standard-shelf.component.html',
    styleUrls: ['./standard-shelf.component.scss'],
})
export class StandardShelfComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data: StandardShelf;
    public pogHeight = 0;
    public pogId: string;
    public dropIndex = 0;
    public planogramSettings: PogSettings;
    public svgBlockGrill: string;
    public svgBlockShelf: string;
    public toolTipData: Array<{keyName: string, value: string | number}>;
    private subscriptions: Subscription = new Subscription();
    @ViewChild('shelfDataContainer') shelfDataContainer: ElementRef;
    public styleStandard: StyleStandard;
    public styleGrill: StyleStandard;
    constructor(
        public readonly sharedService: SharedService,
        private readonly tooltipService: ToolTipService,
        public readonly translate: TranslateService,
        public readonly planogramService: PlanogramService,
        private readonly miscSvgRender: MiscSvgRenderService,
        private readonly cd: ChangeDetectorRef,
        private readonly standardshelfSvgRender: StandardshelfSvgRenderService,
    ) {}

    ngOnInit(): void {
        this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];

        this.RenderShelfAgain();
        if (this.planogramSettings.isGrillView) {
            this.RenderGrillsAgain();
        } else {
            this.svgBlockGrill = '';
        }

        this.subscriptions.add(
            this.sharedService.fixtureEdit.subscribe((response) => {
                if (response) {
                    this.RenderShelfAgain();
                    this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];
                    if (this.planogramSettings.isGrillView) {
                        this.RenderGrillsAgain();
                    } else {
                        this.svgBlockGrill = '';
                    }
                    this.updateSVGValue();
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.updateStandardShelf.subscribe((res) => {
                if (res) {
                    if (!this.sharedService.isBlockWatch()) {
                        const ctx = new Context(this.data.section);
                        this.data.computePositionsAfterChange(ctx);
                    }
                    this.RenderShelfAgain();
                    this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];
                    if (this.planogramSettings.isGrillView) {
                        this.RenderGrillsAgain();
                    } else {
                        this.svgBlockGrill = '';
                    }
                    this.updateSVGValue();
                    this.styleStandard = this.styleStandardShelf(this.data);
                    this.styleGrill = this.getStyleGrill(this.data);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.cd.markForCheck();
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.renderDividersAgainEvent.subscribe((res) => {
                if (res) {
                    // if (!this.sharedService.isBlockWatch()) { //Commenting for now to improve performance, as computePositions will anyway get called part of recording
                    //     const ctx = new Context(this.data.section);
                    //     this.data.computePositionsAfterChange(ctx);
                    // }
                    this.RenderShelfAgain();
                    this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];
                    if (this.planogramSettings.isGrillView) {
                        this.RenderGrillsAgain();
                    } else {
                        this.svgBlockGrill = '';
                    }
                    this.updateSVGValue();
                    this.cd.markForCheck();
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.updateValueInPlanogram.subscribe((res) => {
                if (res && res != null) {
                    this.RenderShelfAgain();
                    this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];
                    if (this.planogramSettings.isGrillView) {
                        this.RenderGrillsAgain();
                    } else {
                        this.svgBlockGrill = '';
                    }
                    this.updateSVGValue();
                    this.styleStandard = this.styleStandardShelf(this.data);
                    this.styleGrill = this.getStyleGrill(this.data);
                    this.planogramService.updateNestedStyleDirty = true;;
                    this.cd.markForCheck();
                }
            }),
        );

        this.subscriptions.add(
            this.sharedService.turnoNOffSub.subscribe((res) => {
                this.cd.markForCheck();
            }),
        );
    }

    private lastSvg = '';
    public updateSVGValue(): void {
        if(this.shelfDataContainer && this.svgBlockShelf!==this.lastSvg) {
            this.shelfDataContainer.nativeElement.innerHTML = this.svgBlockShelf;
            this.lastSvg = this.svgBlockShelf;
        }
    };

    ngAfterViewInit(): void {
        this.styleStandard = this.styleStandardShelf(this.data);
        this.styleGrill = this.getStyleGrill(this.data);
        this.updateSVGValue();
    }

    //grill render//

    public getStyleGrill(itemData: StandardShelf): StyleStandard {
        if (itemData.Fixture.FixtureType === AppConstantSpace.STANDARDSHELFOBJ && itemData.Fixture.HasGrills) {
            const GrillInfo = itemData.getGrillEdgeInfo('front');
            if (GrillInfo) {
                let grillHeight = GrillInfo.Height;
                if (itemData.Rotation.X != 0) {
                    grillHeight = grillHeight * Math.cos(Utils.degToRad(itemData.Rotation.X));
                }
                if (GrillInfo.Display && GrillInfo.Height > 0) {
                    const width = this.planogramService.convertToPixel(itemData.Dimension.Width, itemData.$sectionID) + 'px';
                    const height = this.planogramService.convertToPixel(grillHeight, itemData.$sectionID) + 'px';
                    const style = {
                        'z-index': 10,
                        position: 'absolute',
                        bottom:
                            this.planogramService.convertToPixel(itemData.Fixture.Thickness, itemData.$sectionID) +
                            'px',
                        left: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
                        width: width,
                        height: height,
                        'pointer-events': 'none',
                    };

                    return style;
                }
            }
        } else {
            if (!itemData) {
                return;
            }
        }
        const style = {
            bottom: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            height: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            left: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            position: 'absolute',
            width: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
        };
        return style;
    };

    public RenderGrillsAgain(): void {
        const scale = this.planogramService.convertToScale(this.data.$sectionID);
        this.svgBlockGrill = this.DOMGrill(this.data, scale);
    };

    public DOMGrill(itemData: StandardShelf, scale: number): string {
        let SVGBlock: string;
        if (itemData.Fixture.FixtureType == AppConstantSpace.STANDARDSHELFOBJ && itemData.Fixture.HasGrills) {
            const GrillInfo = itemData.getGrillEdgeInfo('front');
            if (GrillInfo != null) {
                const grillHeight = GrillInfo.Height;
                const grillSpacing = GrillInfo.Spacing;
                const grillW = scale * itemData.Dimension.Width;
                const grillH = scale * grillHeight;

                SVGBlock = `<svg  version="1.1" width="${grillW}" height="${grillH}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">`;

                let grillScale = Math.cos(Utils.degToRad(itemData.Rotation.X));
                SVGBlock +=`<g transform="scale(${scale},${-scale}) translate(0, ${-grillHeight} * ${grillScale})">`;

                SVGBlock += this.miscSvgRender.svgRenderGrill(
                    itemData,
                    itemData.Dimension.Width,
                    grillHeight,
                    grillSpacing,
                    scale,
                    GrillInfo.Color,
                );
                SVGBlock += '</g>';
                SVGBlock += '</svg>';
            }
        }
        return SVGBlock;
    };

    //shelf render//

    public styleStandardShelf(child: StandardShelf): StyleStandard {
        if (!child) {
            return;
        }
        const style = {
            //'background': color,
            position: 'absolute',
            width: this.planogramService.convertToPixel(child.Dimension.Width, child.$sectionID) + 'px',
            height: this.planogramService.convertToPixel(child.Fixture.Thickness, child.$sectionID) + 'px',
            bottom: this.planogramService.convertToPixel(0, child.$sectionID) + 'px',
            left: this.planogramService.convertToPixel(0, child.$sectionID) + 'px',
        };
        return style;
    };

    public RenderShelfAgain(): void {
        if (this.data?.$sectionID) {
            const scale = this.planogramService.convertToScale(this.data.$sectionID);
            this.svgBlockShelf = this.DOMShelf(this.data, scale);
        }
    };

    public DOMShelf(itemData: StandardShelf | Divider, scale: number): string {
        let shelfH = scale * itemData.Fixture.Thickness;
        if (itemData.Fixture.BackgroundFrontImage?.Url || itemData.Fixture.ForegroundImage?.Url) {
            shelfH = scale * itemData.Dimension.Height;
        }
        const shelfW = scale * itemData.Dimension.Width;
        let overflow = 'visible';
        if (itemData.Rotation.X != 0) {
            overflow = 'visible';
        }
        let SVGBlock = `<svg  version="1.1" width="${shelfW}" height="${shelfH}" style="overflow:${overflow};position:absolute;bottom:0;" xmlns="http://www.w3.org/2000/svg">`;
        SVGBlock += `<g transform="translate(0, ${shelfH}) scale(${scale}, ${-scale})">`;
        SVGBlock += this.standardshelfSvgRender.SVGShelfRenderer(itemData as StandardShelf, scale);

        const dividerItemData = itemData.Children.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.DIVIDERS)[0];
        if (dividerItemData && dividerItemData.length > 0) {
            for (let i = dividerItemData.Fixture._DividerSlotStart.ValData; i < shelfW; ) {
                SVGBlock += `<line x1="${i}" y1="0" x2="${i}" y2="${itemData.Fixture.Thickness}" style="stroke:rgb(255,0,0);stroke-width:0.05" />`;
                i += dividerItemData.Fixture._DividerSlotSpacing.ValData;
            }
        }

        SVGBlock += '</g>';
        SVGBlock += '</svg>';
        return SVGBlock;
    };

    public templateData(object): string { // @Sagar: this function is not getting called so couldn't derive the type of the param, need to see later
        if (this.sharedService.turnoff_tooltip) {
            if (this.sharedService.turnoff_tooltip) {
                return this.tooltipService.createTemplate(object);
            }
        }
    }

    public getToolTipData(): SvgToolTip[] {
        return this.planogramService.getPlanogramToolTipData(this.data);
    }

    public checkplanogram(): void {
        this.toolTipData = this.getToolTipData();
    }

    ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }
}
