import { Injectable } from '@angular/core';
import { BlockFixture, PegBoard, StandardShelf } from '../../classes';
import { AppConstantSpace, Utils } from '../../constants';
import { ConfigService, SharedService } from '../common';
import { CommonSvgRenderService, Svg, Parameters } from './common-svg-render.service';
import { PlanogramService } from '../common';
import { PegboardSVG } from './svg-render-common/svg-pegboard';
import { BlockFixtureSVG } from './svg-render-common/svg-blockfixture';
import { GrillSVG } from './svg-render-common/svg-grill';


@Injectable({
  providedIn: 'root'
})
export class MiscSvgRenderService {

  constructor(
    private readonly common: CommonSvgRenderService,
    private readonly sharedService: SharedService,
    private readonly config: ConfigService,
    private readonly planogramService: PlanogramService,

  ) { }

  public domPegboard(itemData: PegBoard, scale: number): Svg {
    const shelfH = scale * itemData.Dimension.Height;
    const shelfW = scale * itemData.Dimension.Width;
    const labelHeight = this.common.getLabelHeight(scale); // This is to accomodate the Shelf label.
    return `<svg  version="1.1" width="${shelfW}" height="${shelfH + labelHeight}" style="overflow: visible;" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(0, ${shelfH}) scale(${scale}, ${-scale})">${this.renderPegboard(itemData, scale)}</g></svg>`
  }

  public renderPegboard(pegboard: PegBoard, scale: number, params?: Parameters): Svg {
    let pegSlotCrossSvgRender = new PegboardSVG();
    let SVGBlock = pegSlotCrossSvgRender.renderPegboard(pegboard, scale, params, this.planogramService, this.sharedService.measurementUnit, this.config, window);
    return SVGBlock;
  }

  public renderBlockFixture(itemData: BlockFixture, scale: number, params?: Parameters) {
    let blockFixtSVG = new BlockFixtureSVG();
    return blockFixtSVG.renderBlockFixture(itemData, scale, params, this.planogramService, this.config, window);
  }



  public svgRenderGrill(itemData: StandardShelf, width: number, grillHeight: number, grillSpacing: number, scale: number, color): Svg {
    let grillSvg = new GrillSVG();
    return grillSvg.svgRenderGrill(itemData, width, grillHeight, grillSpacing, scale, color, window);
  };

  public SVGGrill(itemData: StandardShelf, scale: number): Svg {
    let SVGBlock = '';
    if (itemData.Fixture.FixtureType == AppConstantSpace.STANDARDSHELFOBJ && itemData.Fixture.HasGrills) {
      let GrillInfo = itemData.getGrillEdgeInfo('front');
      if (GrillInfo != null) {
        let grillHeight = GrillInfo.Height;
        let grillSpacing = GrillInfo.Spacing;
        let grillScale = Math.cos(Utils.degToRad(itemData.Rotation.X));
        SVGBlock += '<g transform="translate(0,' + itemData.Fixture.Thickness * grillScale + ')">';
        SVGBlock += this.svgRenderGrill(
          itemData,
          itemData.Dimension.Width,
          grillHeight,
          grillSpacing,
          scale,
          GrillInfo.Color,
        );
        SVGBlock += '</g>';
      }
    }

    return SVGBlock;
  }


}
