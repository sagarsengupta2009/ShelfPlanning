import { AfterViewInit, ChangeDetectorRef, Component, ElementRef,
    Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Utils } from 'src/app/shared/constants/utils';
import { PogSettings, StyleGrill } from 'src/app/shared/models';
import { Grill, StandardShelf } from 'src/app/shared/classes';
import { PlanogramService, SharedService } from 'src/app/shared/services';
import { PogComponent } from '../pog.component';

@Component({
    selector: 'sp-grill',
    templateUrl: './grill.component.html',
    styleUrls: ['./grill.component.scss'],
})
export class GrillComponent extends PogComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() data: Grill;
    public svgBlockGrill: string;
    protected subscriptions: Subscription = new Subscription();
    @ViewChild('grillDataContainer') dataContainer: ElementRef;
    private planogramSettings: PogSettings;
    private parentItem: StandardShelf;
    public styleGrill: StyleGrill;
    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly cd: ChangeDetectorRef
    ) { super(); }

    public ngOnInit(): void {
        this.parentItem = this.sharedService.getObject(this.data.$idParent, this.data.$sectionID) as StandardShelf;
        this.planogramSettings = this.planogramService.rootFlags[this.data.$sectionID];
        this.RenderGrillsAgain();
        this.subscriptions.add(this.sharedService.updateGrillOnFieldChange.subscribe((res) => {
            if (res) {
                this.RenderGrillsAgain();
                this.planogramService.updateNestedStyleDirty = true;;
                this.cd.markForCheck();//markforcheck is required here as change is not being detected as expected.
            }
        }));
        this.subscriptions.add(this.sharedService.updateValueInPlanogram.subscribe((res) => {
            if (res && res != null) {
                this.RenderGrillsAgain();
                this.cd.markForCheck();
            }
        }));
    }

    public ngAfterViewInit(): void {
        this.updateSvg(this.svgBlockGrill);
    }

    private getStyleGrill(itemData: StandardShelf): StyleGrill | undefined {
        if (!itemData) {
            return undefined;
        }
        else if (
            itemData.Fixture.FixtureType === AppConstantSpace.STANDARDSHELFOBJ &&
            itemData.Fixture.HasGrills &&
            this.planogramSettings.isGrillView
        ) {
            let GrillInfo = itemData.getGrillEdgeInfo('front');
            if (GrillInfo != null) {
                let grillHeight = GrillInfo.Height;
                if (itemData.Rotation.X != 0) {
                    grillHeight = grillHeight * Math.cos(Utils.degToRad(itemData.Rotation.X));
                }
                if (GrillInfo.Display == true && GrillInfo.Height > 0) {
                    let width =
                        this.planogramService.convertToPixel(itemData.Dimension.Width, itemData.$sectionID) + 'px';
                    let height = this.planogramService.convertToPixel(grillHeight, itemData.$sectionID) + 'px';
                    return {
                        position: 'absolute',
                        bottom: '0px',
                        left: this.planogramService.convertToPixel(-itemData.ChildOffset.X, itemData.$sectionID) + 'px',
                        width: width,
                        height: height,
                        'pointer-events': 'none',
                        opacity: undefined
                    };
                }
            }
        }
        return {
            position: 'absolute',
            width: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            height: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            bottom: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            left: this.planogramService.convertToPixel(0, itemData.$sectionID) + 'px',
            'pointer-events': 'none',
            opacity: 0,
        };
    };

    private RenderGrillsAgain(): void {
        const scale = this.planogramService.convertToScale(this.parentItem.$sectionID);
        this.svgBlockGrill = this.DOMGrill(this.parentItem, scale);
        this.updateSvg(this.svgBlockGrill);
        this.styleGrill = this.getStyleGrill(this.parentItem);
    };

    private DOMGrill(itemData: StandardShelf, scale: number): string {
        let SVGBlock = '';
        let GrillInfo = itemData.getGrillEdgeInfo('front');
        if (GrillInfo != null) {
            let grillHeight = GrillInfo.Height;
            let grillSpacing = GrillInfo.Spacing;
            let grillW = scale * itemData.Dimension.Width;
            let grillH = scale * grillHeight;
            let grillScale = Math.cos(Utils.degToRad(itemData.Rotation.X));
            let opacity = itemData.Fixture.ForegroundImage?.Url ? 0 : 1;
            SVGBlock =
                `<svg  version="1.1" width="${grillW}" height="${grillH}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">
                <g transform="scale(${scale},${-scale}) translate(0,${-grillHeight * grillScale})" opacity="${opacity}">
                ${this.svgGrill(
                    itemData,
                    itemData.Dimension.Width,
                    grillHeight,
                    grillSpacing,
                    scale,
                    GrillInfo.Color,
                )}
                </g>
                </svg>`;
        }


        return SVGBlock;
    };

    private svgGrill(itemData: StandardShelf, width: number, grillHeight: number, grillSpacing: number, scale: number, color: string): string {
        let svgLine = (x1, y1, x2, y2, color, strokeWidth) => {
            return (
                `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`
            );
        };

        let SVGBlock = '';
        let grillScale = Math.cos(Utils.degToRad(itemData.Rotation.X));

        if (itemData.Rotation.X != 0) {
            SVGBlock +=
                `<g  class="fixtureClass"
                data-idpog="${itemData.IDPOGObject == null ? itemData.TempId : itemData.IDPOGObject}"
                transform="scale(${grillScale})">`;
        }
        let wireSize = 0.07;
        let wireColor = color ? color : 'darkslategray';
        let grillTop = svgLine(0, grillHeight, width, grillHeight, wireColor, wireSize);
        SVGBlock += grillTop;
        let grillBottom = svgLine(0, 0, width, 0, wireColor, wireSize);
        SVGBlock += grillBottom;
        if (grillHeight >= grillSpacing * 2) {
            let midHeight = grillHeight - grillSpacing;
            let grillMiddle = svgLine(0, midHeight, width, midHeight, wireColor, wireSize);
            SVGBlock += grillMiddle;
        }
        let grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
        for (let i = 0; i <= width; i += grillSpaceVal) {
            let grillVert = svgLine(i, 0, i, grillHeight, wireColor, wireSize);
            SVGBlock += grillVert;
        }

        if (itemData.Rotation.X != 0) {
            SVGBlock += '</g>';
        }
        return SVGBlock;
    };


    public ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }
}
