import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PlanogramService, SharedService, ToolTipService, MiscSvgRenderService } from 'src/app/shared/services';
import { PogComponent } from '../pog.component';
import { Crossbar } from 'src/app/shared/classes';
import { SvgToolTip } from 'src/app/shared/models';

@Component({
  selector: 'sp-crossbar',
  templateUrl: './crossbar.component.html',
  styleUrls: ['./crossbar.component.scss']
})
export class CrossbarComponent extends PogComponent implements OnInit ,OnDestroy{

  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: Crossbar;
  public SVGBlock: string;

  public ToolTipData: SvgToolTip[];
  constructor(private planogramService: PlanogramService, private tooltipService: ToolTipService,
    public readonly sharedService: SharedService,
    private readonly crossbarRenderer: MiscSvgRenderService,
    private readonly cdr: ChangeDetectorRef) {
      super()
     }

  public get turnoffToolTip(): boolean {
    return this.sharedService.turnoff_tooltip
  }
  public ngOnInit(): void {
    if (this.data?.$sectionID) {
      this.crossWallDOM();
    }
    this.subscriptions.add(
      this.sharedService.fixtureEdit.subscribe((response) => {
        if (response) {
          this.crossWallDOM();
          this.updateSvg(this.SVGBlock);
          this.cdr.markForCheck();
        }
      }));

    this.subscriptions.add(
      this.sharedService.pegTypeFixtureRefresh.subscribe((id) => {
        if (id == this.data.$id) {
          this.crossWallDOM();
          this.updateSvg(this.SVGBlock);
          this.cdr.markForCheck();
        }
      }));

    this.subscriptions.add(this.sharedService.updateImageInPOG.subscribe(result => {
      if (result == 'Crossbar') {
        this.crossWallDOM();
        this.updateSvg(this.SVGBlock);
        this.cdr.markForCheck();
      }
    }));

    this.subscriptions.add(this.sharedService.updateValueInPlanogram.subscribe(res => {
      if (res && res != null) {
        this.crossWallDOM();
        this.updateSvg(this.SVGBlock);
        this.cdr.markForCheck();
      }
    }));
    this.subscriptions.add(this.sharedService.turnoNOffSub.subscribe(res => {
      this.cdr.markForCheck();
    }));
  }

  public ngAfterViewInit(): void {
    this.updateSvg(this.SVGBlock);
  }

  private crossWallDOM(): void {
    let scale: number = this.planogramService.convertToScale(this.data.$sectionID);
    this.SVGBlock = this.crossbarRenderer.domPegboard(this.data, scale);
  }

  private getToolTipData(): SvgToolTip[] {
    return this.planogramService.getPlanogramToolTipData(this.data);
  }

  public checkplanogram(): string {
    this.ToolTipData = this.getToolTipData();
    return '';
  }

}
