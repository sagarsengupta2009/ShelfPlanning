import { CommonSVG } from "./svg-common";
import { BaseCommon } from "./services/base-common.service";

export class BlockFixtureSVG {
    renderBlockFixture = function (itemData, scale, params, planogSvc, config, window) {
    let common = new CommonSVG();
    let SVGBlock = "<g class='fixtureGroup'>";
    if (itemData.Fixture.FrontImage?.Url) {
        SVGBlock += common.makeRect(itemData, 'posSKU', 0, itemData.Fixture.Color, itemData.TempId, window);
        SVGBlock += common.makeRect(itemData, 'posBox', 0, itemData.Fixture.Color, itemData.TempId, window);
        SVGBlock += common.makeImage(itemData, 'posImage', 0, -itemData.Dimension.Height, itemData.Fixture.FrontImage, config, window);
    } else {
        SVGBlock += common.makeRect(itemData, '', 0, itemData.Fixture.Color, itemData.TempId, window);
    }
    if (planogSvc.labelFixtEnabled[0] && BaseCommon.getCurrentEnableFixture(itemData, 1, planogSvc.labelFixtItem)) {
        SVGBlock += common.createShelfLabelCustomized(itemData, params, scale, 1, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);
    }
    if (planogSvc.labelFixtEnabled[1] && BaseCommon.getCurrentEnableFixture(itemData, 2, planogSvc.labelFixtItem)) {
        SVGBlock += common.createShelfLabelCustomized(itemData, params, scale, 2, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);
    }
    return SVGBlock + '</g>';
}





    }

