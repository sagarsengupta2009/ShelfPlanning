import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Basket } from 'src/app/shared/classes';
import { SvgToolTip } from 'src/app/shared/models';
import { CoffincaseSvgRenderService, PlanogramService, SharedService, ToolTipService } from 'src/app/shared/services';
import { PogComponent } from '../pog.component';

@Component({
  selector: 'sp-basket',
  templateUrl: './basket.component.html',
  styleUrls: ['./basket.component.scss']
})
export class BasketComponent extends PogComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: Basket;
  public svgBlock: string;
  public toolTipData: SvgToolTip[];
  public turnOffTooltip: boolean;

  constructor(
    private readonly planogramService: PlanogramService,
    private readonly tooltipService: ToolTipService,
    public readonly sharedService: SharedService,
    private readonly coffincaseSvgRender: CoffincaseSvgRenderService
  ) {
    super();
  }

  ngOnInit(): void {
    this.render();
    this.turnOffTooltip = this.sharedService.turnoff_tooltip;
    this.subscriptions.add(
      this.sharedService.fixtureEdit.subscribe((response: boolean) => {
        if (response) {
          this.render();
        }
      })
    );

    this.subscriptions.add(
      this.sharedService.updateImageInPOG.subscribe((result: string) => {
        if (result != null && result == 'Basket') {
          this.render();
        }
      })
    );

    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe((res: object) => {
        if (res && res != null) {
          this.render();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    this.updateSvg(this.svgBlock);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private renderSvg(): string {
    const scale = this.planogramService.convertToScale(this.data.$sectionID);
    return (this.svgBlock = this.coffincaseSvgRender.DOMCoffincase(this.data, scale));
  }

  private render(): void {
    this.renderSvg();
    this.updateSvg(this.svgBlock);
  }

  public templateData(object): string {
    if (this.turnOffTooltip) {
      return this.tooltipService.createTemplate(object);
    }
  }

  public checkPlanogram(): string {
    this.toolTipData = this.planogramService.getPlanogramToolTipData(this.data);
    return '';
  }
}
