import { Injectable } from '@angular/core';
import { Coffincase, Section } from '../../classes';
import { ParentApplicationService, PlanogramStoreService, SharedService, PlanogramService, ConfigService } from '../common';
import { CommonSvgRenderService } from './common-svg-render.service';
import { CoffinCaseSVG } from './svg-render-common/svg-coffincase';

@Injectable({
  providedIn: 'root'
})
export class CoffincaseSvgRenderService {
  private coffinSvg;
  constructor(
    private common: CommonSvgRenderService,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly parentApp: ParentApplicationService,
    private readonly config: ConfigService,
    private readonly planogramService: PlanogramService
  ) {

    this.coffinSvg = new CoffinCaseSVG();
  }

  public DOMCoffincase(itemData: Coffincase, scale: number): Svg {
    const shelfD = scale * itemData.Dimension.Depth;
    const shelfH = scale * itemData.Dimension.Height;
    const shelfW = scale * itemData.Dimension.Width;
    const labelHeight = this.common.getLabelHeight(scale); // This is to accomodate the Shelf label.
    const translateY = itemData.Fixture.DisplayViews ? shelfD : shelfH;
    return `<svg  version="1.1" width="${shelfW}" height="${translateY + labelHeight}" style="overflow:visible;position:absolute;"
                xmlns="http://www.w3.org/2000/svg"><g transform="translate(0, ${translateY}) scale(${scale}, ${-scale})">
                ${this.svgRendererCoffincase(itemData, scale, '', true)}'</g></svg>`;
  }

  public SVGSeperatorDrawRenderer(coffincase: Coffincase, considerDisplayViewsFlag: boolean): Svg {
    return this.coffinSvg.SVGSeperatorDrawRenderer(coffincase, considerDisplayViewsFlag, this.planogramStore);
  }

  private svgRendererCoffincase(itemData: Coffincase, scale: number, params: Parameters, considerDisplayViewsFlag: boolean): Svg {
    let sectObj = (this.sharedService.getObject(itemData.$sectionID, itemData.$sectionID) as Section);
    return this.coffinSvg.svgRendererCoffincase(itemData, scale, params, considerDisplayViewsFlag, this.planogramService, this.planogramStore, sectObj, this.config, window)
  }

  private svgCoffinLine(x1: number, y1: number, x2: number, y2: number, color: string, strokeWidth: number): Svg {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  }



}

// private

type Svg = string;

interface Info {
  BottomThickness: number;
  SideThickness: number;
  FrontThickness: number;
}

interface Parameters {

}
