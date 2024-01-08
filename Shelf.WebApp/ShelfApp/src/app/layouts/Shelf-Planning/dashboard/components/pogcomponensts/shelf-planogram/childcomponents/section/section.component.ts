import { Component, Input, OnChanges, OnDestroy, OnInit, AfterViewInit, SimpleChanges, ViewChild, ElementRef } from '@angular/core';
import { PlanogramService, SharedService, PlanogramRendererService, ConfigService } from 'src/app/shared/services';
import { Section } from 'src/app/shared/classes/section';
import { PogComponent } from '../pog.component';
import { SectionSVG } from 'src/app/shared/services/svg-render/svg-render-common/svg-section';
import { AppConstantSpace } from 'src/app/shared/constants';

@Component({
  selector: 'sp-section',
  templateUrl: './section.component.html',
  styleUrls: ['./section.component.scss']
})
export class SectionComponent extends PogComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {

  @ViewChild('sectionRef') dataContainer: ElementRef;
  @Input() data: Section;
  private SVGBlock: string = null;

  constructor(
    private planogramService: PlanogramService,
    private readonly config: ConfigService,
    private sharedService: SharedService,
  ) { super() }

  public ngOnInit(): void {
    this.drawSection(this.data);
    this.registerEvents();
  }

  public ngAfterViewInit(): void {
    this.updateSvg(this.SVGBlock);
  }

  public ngOnChanges(changes: SimpleChanges): void {
    if (this.data) {
      this.drawSection(this.data);
      this.updateSvg(this.SVGBlock);
    }
  }

  private registerEvents() {
    this.subscriptions.add(
      this.sharedService.updateImageInPOG.subscribe(result => {
        if (result != null && result == AppConstantSpace.SECTIONOBJ) {
          this.drawSection(this.data);
          this.updateSvg(this.SVGBlock);
        }
      }));
    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe(result => {
        if (result) {
          this.drawSection(this.data);
          this.updateSvg(this.SVGBlock);
        }
      }));
  }

  private drawSection(section: Section) {
    this.SVGBlock = this.formSvg(section);
  }

  private formSvg(section: Section): string {
    let sectionDrawer = new SectionSVG();
    const scale = this.planogramService.convertToScale(section.$sectionID);
    const height = scale * section.Dimension.Height;
    const width = scale * section.Dimension.Width;
    const svgBlock = `<svg version='1.1' width='${width}' height='${height}' style='overflow: visible;' xmlns='http://www.w3.org/2000/svg'><g transform='translate(0, ${height}) scale(${scale}, ${-scale})'>${sectionDrawer.renderSection(section, this.config, window)}</g></svg>`;
    return svgBlock;
  }

}






