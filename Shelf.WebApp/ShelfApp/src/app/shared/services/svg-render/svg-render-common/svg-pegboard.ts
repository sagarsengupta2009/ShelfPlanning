//Imports used in svg files should always be the ones under scg-render-common folder
import { AppConstantSpace } from "./svg-constants";
import { CommonSVG } from "./svg-common";
import { PositionSVG } from "./svg-position";
import { UtilsSVG } from "./svg-utils";
import { BaseCommon } from "./services/base-common.service";
export class PegboardSVG{


renderPegboard = function(pegboard, scale, params, planogSvc, measurementUnit, config, window) {
    let common = new CommonSVG();
    const color = pegboard.getColor();
    let pegHoleInfo = pegboard.getPegHoleInfo();
    let pegBoardDim = pegboard.Dimension;
    let Utils = new UtilsSVG();
    let startXPos = UtilsSVG.isNullOrEmpty(pegHoleInfo.PegOffsetLeft) ? 0 : pegHoleInfo.PegOffsetLeft;
    let endXPos = pegBoardDim.Width - pegHoleInfo.PegOffsetRight;

    let startYPos = UtilsSVG.isNullOrEmpty(pegHoleInfo.PegOffsetBottom) ? 0 : pegHoleInfo.PegOffsetBottom;
    let endYPos = pegBoardDim.Height - pegHoleInfo.PegOffsetTop;

    let SVGBlock = "<g class='fixtureGroup'>";
    if (pegboard.Fixture.FrontImage?.Url) {
        SVGBlock += common.makeRect(pegboard, 'posSKU', 0, color, pegboard.TempId, window);
        SVGBlock += common.makeRect(pegboard, 'posBox', 0, color, pegboard.TempId, window);
        SVGBlock += common.makeImage(pegboard, 'posImage', 0, -pegboard.Dimension.Height, pegboard.Fixture.FrontImage, config, window);
    } else {
        SVGBlock += common.makeRect(pegboard, '', 0, color, pegboard.TempId, window);
    }

    let PegHoleRadius = 0.125;
    let PegHoleMinSpacing = 0.25;
    if (measurementUnit == 'METRIC') {
        //metric
        PegHoleRadius = PegHoleRadius * 2.54;
        PegHoleMinSpacing = PegHoleMinSpacing * 2.54;
    }
    if (pegHoleInfo.PegIncrementY < PegHoleMinSpacing) pegHoleInfo.PegIncrementY = PegHoleMinSpacing;
    if (pegHoleInfo.PegIncrementX < PegHoleMinSpacing) {
        for (let y1 = startYPos; y1 <= endYPos; y1 += pegHoleInfo.PegIncrementY) {
            SVGBlock += `<line x1="${startXPos}" y1="${y1}" x2="${endXPos}" y2="${y1}" style="stroke:black;stroke-width:${PegHoleRadius}" />`;
        }
    } else {
        for (let y1 = startYPos; y1 <= endYPos; y1 += pegHoleInfo.PegIncrementY) {
            for (let x1 = startXPos; x1 <= endXPos; x1 += pegHoleInfo.PegIncrementX) {
                SVGBlock += `<circle cx="${x1}" cy="${y1}" r="${PegHoleRadius}"/>`;
            }
        }
    }
    SVGBlock +=this.drawHooksforPositions(pegboard, params);
    if (planogSvc.labelFixtEnabled[0] && BaseCommon.getCurrentEnableFixture(pegboard, 1, planogSvc.labelFixtItem)){
      SVGBlock+= common.createShelfLabelCustomized(pegboard, params, scale, 1, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

     }
  if (planogSvc.labelFixtEnabled[1] && BaseCommon.getCurrentEnableFixture(pegboard,2, planogSvc.labelFixtItem)){
      SVGBlock+= common.createShelfLabelCustomized(pegboard, params, scale, 2, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

     }
    return SVGBlock  + '</g>';
};


  drawHooksforPositions(pegboard, params) {
    let SVGHooks = '';
    let positionRenderer = new PositionSVG();
    pegboard?.Children?.forEach((child) => {
      // pegboard can contain blocks as children in PA
      if(child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        SVGHooks += positionRenderer.SVGPegBoardHook(child, pegboard, params);
      }
    });
    return SVGHooks;
  }
}
