import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Coffincase } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { SharedService,PlanogramService,CoffincaseSvgRenderService } from 'src/app/shared/services';

@Component({
  selector: 'sp-separator-draw',
  templateUrl: './separator-draw.component.html',
  styleUrls: ['./separator-draw.component.scss']
})
export class SeparatorDrawComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() itemData: Coffincase;
  public initializing: boolean;
  public svgBlockSeparatorDraw: string
  public subscription: Subscription = new Subscription();
  public styleDraw: { left: string; bottom: string; position: string };
  @ViewChild('dataContainer') dataContainer: ElementRef;
  constructor(
    private readonly planogramService: PlanogramService,
    private readonly sharedService: SharedService,
    private readonly cdr: ChangeDetectorRef,
    private readonly coffincaseSvgRender: CoffincaseSvgRenderService,
  ) { }

  ngOnInit(): void {
    if (this.itemData.ObjectDerivedType !== AppConstantSpace.COFFINCASEOBJ)
      return;
    this.initializing = true;
    this.drawSeparator();
    this.subscription.add(this.sharedService.renderSeparatorAgainEvent.subscribe((res: boolean) => {
      if (res) {
        this.drawSeparator();
        this.dataContainer ? this.dataContainer.nativeElement.innerHTML = this.svgBlockSeparatorDraw : '';
        this.styleDraw = this.styleSeperator();
        this.planogramService.updateNestedStyleDirty = true;;
        this.cdr.markForCheck();
      }
    }));
  }

  ngAfterViewInit(): void {
    this.dataContainer ? this.dataContainer.nativeElement.innerHTML = this.svgBlockSeparatorDraw : '';
    this.styleDraw = this.styleSeperator();
  }

  private drawSeparator(): void {
    if (!this.initializing) {
      this.initializing = false;
      return;
    }
    const scale = this.planogramService.convertToScale(this.itemData.$sectionID);
    this.svgBlockSeparatorDraw = this.DOM(scale);
  }

  private DOM(scale: number): string {
    let dimension = this.itemData.getRenderingDimensionFor2D();
    const H = scale * dimension.Height;
    const W = scale * this.itemData.ChildDimension.Width;
    let svgBlockSeparatorDraw = `<svg  version="1.1" width="${W}" height="${H}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">`;
    svgBlockSeparatorDraw += `<g transform="translate(0,${H}) scale(${scale}, ${-scale})">`;
    svgBlockSeparatorDraw += `${this.coffincaseSvgRender.SVGSeperatorDrawRenderer(this.itemData, true)}</g></svg>`
    return svgBlockSeparatorDraw;
  }

  private styleSeperator(): { left: string; bottom: string; position: string } {
    const loc = this.itemData.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ || this.itemData.ObjectDerivedType === AppConstantSpace.BASKETOBJ
      ? this.itemData.getRenderingChildOffsetFor2D()
      : this.itemData.ChildOffset;

    return {
      left: this.planogramService.convertToPixel(loc.X, this.itemData.$sectionID) + 'px',
      bottom: this.planogramService.convertToPixel(loc.Y, this.itemData.$sectionID) + 'px',
      position: 'absolute'
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }
}

