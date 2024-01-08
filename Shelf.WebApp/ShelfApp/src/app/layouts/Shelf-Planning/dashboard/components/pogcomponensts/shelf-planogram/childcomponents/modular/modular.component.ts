import { ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Modular } from 'src/app/shared/classes';
import { ModularStyleMatchingAntItem } from 'src/app/shared/models/shelf-planogram';
import { PlanogramService, SharedService, ModularSvgRenderService } from 'src/app/shared/services';
import { PogComponent } from '../pog.component';
import { AppConstantSpace } from 'src/app/shared/constants';

@Component({
  selector: 'sp-modular',
  templateUrl: './modular.component.html',
  styleUrls: ['./modular.component.scss']
})
export class ModularComponent extends PogComponent implements OnInit, OnDestroy {

  @ViewChild('dataContainer') dataContainer: ElementRef;
  @Input() data: Modular;
  private SVGBlock: string;
  public styleModule={};
  constructor(
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly modularSvgRender: ModularSvgRenderService,
    private readonly cd: ChangeDetectorRef,
  ) { super() }



  public ngOnInit(): void {
    this.renderAgain();
    this.subscriptions.add(
      this.sharedService.updateImageInPOG.subscribe(result => {
        if (result != null && result == AppConstantSpace.MODULAR) {
          this.renderAgain();
          this.updateSvg(this.SVGBlock);
        }
      }));

    this.subscriptions.add(
      this.sharedService.updateValueInPlanogram.subscribe(res => {
        if (res && res != null) {
          this.renderAgain();
          this.updateSvg(this.SVGBlock);
          this.planogramService.updateNestedStyleDirty = true;;
          this.cd.markForCheck();
        }
      }));
  }

  public renderAgain(): void {
    if (this.data?.$sectionID) {
      let scale: number = this.planogramService.convertToScale(this.data.$sectionID);
      this.SVGBlock = this.DOM(this.data, scale);
    }
  }


  public ngAfterViewInit(): void {
    this.styleModule = this.getModularStyleMarchingAntItem(this.data)
    this.subscriptions.add(
      this.sharedService.styleModuleSelect.subscribe(re => {
        if (this.planogramService.rootFlags[this.data.$sectionID].isModularView) {
          this.styleModule = this.getModularStyleMarchingAntItem(this.data);
        }
        else {
          this.styleModule = {};
        }
        this.cd.markForCheck();
      }));

    this.updateSvg(this.SVGBlock);
  }

  private getModularStyleMarchingAntItem(itemData: Modular): ModularStyleMatchingAntItem {
    if (itemData.selected) {
      let borderW = this.planogramService.getBorderWidth(this.planogramService.rootFlags[itemData.$sectionID].scaleFactor);
      return {
        'height': '100%',
        'width': '100%',
        'position': 'absolute',
        'bottom': '0',
        'z-index': '10001',
        'border': borderW + 'px solid',
        'border-image': 'url("/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/ants.gif") 1 repeat',
        '-webkit-border-image': 'url("/Areas/iShelf/ClientApplication/appMaterial/css/themes/default/img/ants.gif") 1 repeat',
        'box-sizing': 'border-box'
      }
    } else {
      if (this.planogramService.rootFlags[itemData.$sectionID].isModularView) {
        return {
          'height': '100%',
          'width': '100%',
          'position': 'absolute',
          'bottom': '0',
          'z-index': '10001'
        };
      } else
        return {};
    }
  }

  private DOM(itemData: Modular, scale: number): string {
    let shelfH: number = scale * itemData.Dimension.Height;
    let shelfW: number = scale * itemData.Dimension.Width;
    let SVGBlock: string = '<svg  version="1.1" width="' + shelfW + '" height="' + shelfH + '" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">';
    SVGBlock += '<g transform="translate(0, ' + shelfH + ') scale(' + scale + ', ' + -scale + ')">';

    SVGBlock += this.modularSvgRender.SVGModularRenderer(itemData, scale);

    SVGBlock += '</g>';
    SVGBlock += '</svg>';
    return SVGBlock;
  };

  public ngOnDestroy(): void {
    this.subscriptions?.unsubscribe();
  }

}

