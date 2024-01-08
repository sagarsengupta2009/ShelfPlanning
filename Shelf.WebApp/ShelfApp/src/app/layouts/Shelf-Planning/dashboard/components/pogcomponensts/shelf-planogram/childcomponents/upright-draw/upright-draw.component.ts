import { Component, Input, OnChanges, OnDestroy, OnInit, AfterViewInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { PlanogramService, SharedService, PlanogramRendererService } from 'src/app/shared/services';
import { Section } from 'src/app/shared/classes/section';
import { PogComponent } from '../pog.component';
import { UprightDrawSVG } from 'src/app/shared/services/svg-render/svg-render-common/svg-uprightdraw';

@Component({
  selector: 'sp-upright-draw',
  templateUrl: './upright-draw.component.html',
  styleUrls: ['./upright-draw.component.scss']
})
export class UprightDrawComponent extends PogComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('uprightRef') dataContainer: ElementRef;
  @Input() data: Section;
  private SVGBlock: string = null;

  constructor(
    private planogramService: PlanogramService,
    private planogramRedender: PlanogramRendererService,
    private sharedService: SharedService,
  ) { super() }

  public ngOnInit(): void {
    this.drawUpright(this.data);
    this.registerEvents();
  }

  public ngAfterViewInit(): void {
    this.updateSvg(this.SVGBlock);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.data) {
      this.drawUpright(this.data);
      this.updateSvg(this.SVGBlock);
    }
  }


  private registerEvents() {
    this.subscriptions.add(
      // rename event to uprightChangedEvent
      this.sharedService.uprightEvent.subscribe(result => {
        if (result) {
          this.drawUpright(this.data);
          this.updateSvg(this.SVGBlock);
        }
      }));
    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe(result => {
        if (result) {
          this.drawUpright(this.data);
          this.updateSvg(this.SVGBlock);
        }
      }));
  }

  private drawUpright(section: Section) {
    this.SVGBlock = this.formSvg(section);
  }

  private formSvg(section: Section): string {
    let uprightDrawer = new UprightDrawSVG();
    const scale = this.planogramService.convertToScale(section.$sectionID);
    const height = scale * section.Dimension.Height;
    const width = scale * section.Dimension.Width;
    const svgBlock = `<svg version='1.1' width='${width}' height='${height}' style='overflow: visible;' xmlns='http://www.w3.org/2000/svg'><g transform='translate(0, ${height}) scale(${scale}, ${-scale})'>${uprightDrawer.SVGPogRenderer(section, this.sharedService.measurementUnit)}</g></svg>`;
    return svgBlock;
  }

}






