import { ChangeDetectorRef, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { PlanogramService, SharedService, ToolTipService, MiscSvgRenderService, CommonSvgRenderService} from 'src/app/shared/services';
import { Utils } from 'src/app/shared/constants/utils';
import { BlockFixture } from 'src/app/shared/classes';
import { BlockFixtureStyle } from 'src/app/shared/models';
import { PogComponent } from '../pog.component';



@Component({
  selector: 'sp-block-fixture',
  templateUrl: './block-fixture.component.html',
  styleUrls: ['./block-fixture.component.scss']
})
export class BlockFixtureComponent extends PogComponent implements OnInit{

  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: BlockFixture;
  public SVGBlock: string;
  public styleBlock: BlockFixtureStyle;
  constructor(public translate: TranslateService,
    public planogramService: PlanogramService,
    public sharedService: SharedService,
    public commonSvgRender: CommonSvgRenderService,
    public miscSvgRender: MiscSvgRenderService,
    private tooltipService: ToolTipService,
    private cdr: ChangeDetectorRef,
  ) { super() }


  ngOnInit(): void {
    this.renderAgain();
    this.subscriptions.add(this.sharedService.fixtureEdit.subscribe((response) =>{
      if(response){
        this.renderAgain();
         this.updateSvg(this.SVGBlock);
      }
    }));
    this.subscriptions.add(this.sharedService.updateImageInPOG.subscribe(result => {
      if (result != null && result == 'BlockFixture') {
        this.renderAgain();
         this.updateSvg(this.SVGBlock);
      }
    }));

    this.subscriptions.add(this.sharedService.updateValueInPlanogram.subscribe(res => {
      if(res && res != null){
        this.renderAgain();
        this.updateSvg(this.SVGBlock);
      }
    }));
  }

  ngAfterViewInit() {
    this.styleBlock = this.styleBlockFixture(this.data)

     this.updateSvg(this.SVGBlock);
     this.subscriptions.add(this.sharedService.turnoNOffSub.subscribe(res =>{
      this.cdr.markForCheck();
    }));
  }

  public styleBlockFixture(child): BlockFixtureStyle{
    if (child == undefined) {
      return null;
    }
    let color = (Utils.isNullOrEmpty(child.Fixture.Color)) ? 'grey' : child.Fixture.Color;
    let style = {
      'position': 'absolute',
      'width': this.planogramService.convertToPixel(child.Dimension.Width, child.$sectionID)+ 'px',
      'height': this.planogramService.convertToPixel(child.Dimension.Height, child.$sectionID)+ 'px',
      'top': this.planogramService.convertToPixel(0, child.$sectionID)+ 'px',
      'left': this.planogramService.convertToPixel(0, child.$sectionID)+ 'px'
    }
    return style;
  }

  public renderAgain = () =>{
    if(this.data?.$sectionID){
      let scale = this.planogramService.convertToScale(this.data.$sectionID);
      this.SVGBlock = this.DOM(this.data, scale);
    }
  }

  public DOM = (itemData, scale) =>{
    let shelfH = scale * itemData.Dimension.Height;
    let shelfW = scale * itemData.Dimension.Width;
    const labelHeight = this.commonSvgRender.getLabelHeight(scale); // This is to accomodate the Shelf label.
    let SVGBlock = '<svg  version="1.1" width="' + shelfW + '" height="' + (shelfH + labelHeight) + '" style="position:absolute; overflow: visible;" xmlns="http://www.w3.org/2000/svg">';
    SVGBlock += '<g transform="translate(0, ' + shelfH + ') scale(' + scale + ', ' + -scale + ')">';

    SVGBlock += this.miscSvgRender.renderBlockFixture(itemData, scale);

    SVGBlock += '</g>';
    SVGBlock += '</svg>';
    return SVGBlock;
  }
  public ThreeD = (itemData, parent, doDispose, create3DModel) => {
    const createBlockFixture = (shelfObject, container) => {
      let used3DModel = create3DModel(shelfObject, container);
      if (used3DModel) return null;

      let width;
      let height;
      let depth;

      width = shelfObject.Dimension.Width;
      height = shelfObject.Dimension.Height;
      depth = shelfObject.Dimension.Depth;

      return null;
    }

    createBlockFixture(itemData, parent);
    return true;
  }

  public templateData(object){
     if(this.sharedService.turnoff_tooltip){
    return this.tooltipService.createTemplate(object);
    }
   }

   ToolTipData;


   public getToolTipData() {
     return this.planogramService.getPlanogramToolTipData(this.data);
   }

   public checkplanogram() {
     this.ToolTipData = this.getToolTipData();
     return '';
   }

}
