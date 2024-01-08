import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PegBoard } from 'src/app/shared/classes';
import { SvgToolTip } from 'src/app/shared/models';
import { MiscSvgRenderService, PlanogramService, SharedService } from 'src/app/shared/services';
import { PogComponent } from '../pog.component';

@Component({
  selector: 'sp-slotwall',
  templateUrl: './slotwall.component.html',
  styleUrls: ['./slotwall.component.scss']
})
export class SlotwallComponent extends PogComponent implements OnInit, OnDestroy {

  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: PegBoard;
  svgBlock: string;
  itemData: PegBoard;
  toolTipData: SvgToolTip[];
  turnOffTooltip: boolean;

  constructor(
    public readonly sharedService: SharedService,
    private readonly miscSvgRender: MiscSvgRenderService,
    private readonly planogramService: PlanogramService,
    private readonly cdr: ChangeDetectorRef
  ) { super() }

  ngOnInit(): void {
    this.itemData = this.data;
    this.turnOffTooltip = this.sharedService.turnoff_tooltip;
    if (this.itemData?.$sectionID) {
      this.slotwallDOM();
    }
    this.subscriptions.add(
      this.sharedService.fixtureEdit.subscribe((response) => {
        if (response) {
          this.slotwallDOM();
          this.updateSvg(this.svgBlock);
        }
      })
    );
    this.subscriptions.add(
      this.sharedService.pegTypeFixtureRefresh.subscribe((id) => {
        if (id == this.data.$id) {
          this.slotwallDOM();
          this.updateSvg(this.svgBlock);
        }
      })
    );
    this.subscriptions.add(
      this.sharedService.updateImageInPOG.subscribe((result) => {
        if (result != null && result == 'Slotwall') {
          this.slotwallDOM();
          this.updateSvg(this.svgBlock);
        }
      })
    );

    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe((res) => {
        if (res && res != null) {
          this.slotwallDOM();
          this.updateSvg(this.svgBlock);
        }
      })
    );

    this.subscriptions.add(
      this.sharedService.turnoNOffSub.subscribe((res) => {
        this.cdr.markForCheck();
      })
    );
  }

  ngAfterViewInit(): void {
    this.updateSvg(this.svgBlock);
  }

  private slotwallDOM(): void {
    const scale = this.planogramService.convertToScale(this.itemData.$sectionID);
    this.svgBlock = this.miscSvgRender.domPegboard(this.itemData, scale);
  }

  public checkPlanogram(): void {
    this.toolTipData = this.planogramService.getPlanogramToolTipData(this.data);
  }

}
