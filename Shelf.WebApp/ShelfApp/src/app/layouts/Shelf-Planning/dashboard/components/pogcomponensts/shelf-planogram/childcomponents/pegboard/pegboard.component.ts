import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { PegBoard } from 'src/app/shared/classes';
import { StylePeg, SvgToolTip } from 'src/app/shared/models';
import {
  PlanogramService,
  SharedService,
  MiscSvgRenderService,
  ToolTipService
} from 'src/app/shared/services';
import { PogComponent } from '../pog.component';
@Component({
  selector: 'sp-pegboard',
  templateUrl: './pegboard.component.html',
  styleUrls: ['./pegboard.component.scss']
})
export class PegboardComponent extends PogComponent implements OnInit, OnDestroy{

  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: PegBoard;
  public toolTipData: Array<{keyName: string, value: string | number}>;
  public svgBlock: string;
  constructor(
    private readonly planogramService: PlanogramService,
    private readonly tooltipService: ToolTipService,
    private readonly cdr: ChangeDetectorRef,
    private readonly miscSvgRender : MiscSvgRenderService,
    public readonly sharedService: SharedService,
  ) { super() }

  ngOnInit(): void {
    this.renderPegboardAgain();
    this.subscriptions.add( this.sharedService.fixtureEdit.subscribe((response: boolean) =>{
      if(response){
        this.renderPegboardAgain();
         this.updateSvg(this.svgBlock);
         this.cdr.markForCheck();
      }
    }));

    this.subscriptions.add(this.sharedService.pegTypeFixtureRefresh.subscribe((id: string) => {
      if (id == this.data.$id) {
        this.renderPegboardAgain();
        this.updateSvg(this.svgBlock);
        this.cdr.markForCheck();
      }
    }));

    this.subscriptions.add(this.sharedService.updateImageInPOG.subscribe((result: string) => {
      if (result && result === 'Pegboard') {
        this.renderPegboardAgain();
         this.updateSvg(this.svgBlock);
         this.cdr.markForCheck();
      }
    }));

    this.subscriptions.add(this.sharedService.updateValueInPlanogram.subscribe(res => {
      if(res){
        this.renderPegboardAgain();
        this.updateSvg(this.svgBlock);
        this.planogramService.updateNestedStyleDirty = true;;
        this.cdr.markForCheck();
      }
    }));

    this.subscriptions.add(this.sharedService.turnoNOffSub.subscribe(() =>{
      this.cdr.markForCheck();
    }));
  }

  public renderPegboardAgain(): void {
    if(this.data?.$sectionID){
      const scale = this.planogramService.convertToScale(this.data.$sectionID);
      this.svgBlock = this.miscSvgRender.domPegboard(this.data, scale);
    }
  }

  ngAfterViewInit(): void {
    this.updateSvg(this.svgBlock);
  }

  public templateData(object): string { // @Sagar: this function is not getting called so couldn't derive the type of the param, need to see later
    if(this.sharedService.turnoff_tooltip){
      return this.tooltipService.createTemplate(object);
    }
  }

  public getToolTipData(): SvgToolTip[] {
    return this.planogramService.getPlanogramToolTipData(this.data);
  }

  public checkplanogram(): void {
    this.toolTipData = this.getToolTipData();
  }

}
