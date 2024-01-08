import { CommonSVG } from './svg-common';
import { AppConstantSpace } from './svg-constants';
import {UtilsSVG} from './svg-utils'
export class GrillSVG{

  SVGGrill = function(itemData, scale, window) {
    let SVGBlock = '';
    let Utils = new UtilsSVG();
    if (itemData.Fixture.FixtureType == AppConstantSpace.STANDARDSHELFOBJ && itemData.Fixture.HasGrills) {
        let GrillInfo = itemData.getGrillEdgeInfo('front');
        if (GrillInfo != null) {
            let grillHeight = GrillInfo.Height;
            let grillSpacing = GrillInfo.Spacing;
            let grillScale = Math.cos(UtilsSVG.degToRad(itemData.Rotation.X));
            SVGBlock += '<g transform="translate(0,' + itemData.Fixture.Thickness * grillScale + ')">';
            SVGBlock += this.svgRenderGrill(
                itemData,
                itemData.Dimension.Width,
                grillHeight,
                grillSpacing,
                scale,
                GrillInfo.Color,
                window
            );
            SVGBlock += '</g>';
        }
    }

    return SVGBlock;
}

svgRenderGrill= function(itemData, width, grillHeight, grillSpacing, scale, color, window) {
    let svgLine = (x1, y1, x2, y2, color, strokeWidth) => {
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
  };
let Utils = new UtilsSVG();
let common = new CommonSVG();
  let SVGBlock = '';

  if (itemData.Fixture.ForegroundImage?.Url) {
    SVGBlock += `<g opacity="0">`;
  }

  let grillScale = Math.cos(UtilsSVG.degToRad(itemData.Rotation.X));

  if (itemData.Rotation.X != 0) {
      SVGBlock +=
          `<g  class="fixtureClass" data-idpog="${common.getDataIdPog(itemData, itemData.TempId, window)}" transform="scale(${grillScale})">`;
  }
  let wireSize = 0.07;
  let wireColor = color ? color : 'darkslategray';
  let grillTop = svgLine(0, grillHeight, width, grillHeight, wireColor, wireSize);
  SVGBlock += grillTop;
  let grillBottom = svgLine(0, 0, width, 0, wireColor, wireSize);
  SVGBlock += grillBottom;
  if (grillHeight >= grillSpacing * 2) {
      let midHeight = grillHeight - grillSpacing;
      let grillMiddle = svgLine(0, midHeight, width, midHeight, wireColor, wireSize);
      SVGBlock += grillMiddle;
  }
  let grillSpaceVal = grillSpacing == 0 ? wireSize : grillSpacing;
  for (let i = 0; i <= width; i += grillSpaceVal) {
      let grillVert = svgLine(i, 0, i, grillHeight, wireColor, wireSize);
      SVGBlock += grillVert;
  }

  if (itemData.Rotation.X != 0) {
      SVGBlock += '</g>';
  }
  if (itemData.Fixture.ForegroundImage?.Url) {
    SVGBlock += '</g>';
  }
  return SVGBlock;
  };

}
