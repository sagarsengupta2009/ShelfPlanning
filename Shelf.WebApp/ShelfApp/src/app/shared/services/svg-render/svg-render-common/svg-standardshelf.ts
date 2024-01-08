import { CommonSVG } from "./svg-common";
import { UtilsSVG } from "./svg-utils";
import { BaseCommon } from "./services/base-common.service";

export class StandardShelfSVG {

// constructor()
//   {

  //}

  SVGShelfRenderer = function(shelf, scale, params, planogSvc, config, window) {
    let Utils = new UtilsSVG();
    let common = new CommonSVG();
    if (shelf.Fixture.Thickness == 0) return '';

    let opacity = shelf.Fixture.ForegroundImage?.Url ? 0 : 1;

    const color = shelf.getColor();

    // rotation adjusted height
    const height = shelf.Fixture.Thickness * Math.cos(UtilsSVG.degToRad(shelf.Rotation.X));

    let SVGBlock = "<g class='fixtureGroup'>";
    if (shelf.Fixture.FrontImage?.Url) {
        SVGBlock +=
            `<g transform="scale(1, ${height / shelf.Fixture.Thickness}) translate(0, ${shelf.Fixture.Thickness})">
            ${this.makeShelfImage(
                'SSEdgeFrontImage',
                shelf.$id,
                shelf,
                shelf.Fixture.Thickness,
                0,
                shelf.Fixture.FrontImage,
                shelf.TempId,
                config,
                window
            )}</g>`;
    } else {
        SVGBlock += this.makeShelfRect('', shelf, height, 0, color, shelf.TempId, window);
    }

    if (shelf.Fixture.BackgroundFrontImage?.Url) {
        let image = shelf.Fixture.BackgroundFrontImage;
        let imageHeight = Math.max(shelf.minMerchHeight, shelf.ChildDimension.Height);
        let yTranslate = height;

        let yScale = (imageHeight * Math.cos(UtilsSVG.degToRad(shelf.Rotation.X))) / imageHeight;
        
        SVGBlock +=
            `<g transform="scale(1, ${yScale}) translate(0, ${yTranslate})">
            ${this.makeShelfImage(
                'SSBgFrontImage',
                'SSBgFront'+shelf.$id,
                shelf,
                imageHeight,
                -imageHeight,
                image,
                shelf.TempId,
                config,
                window
            )}</g>`;
    }

    if (shelf.Fixture.ForegroundImage?.Url) {
        let image = shelf.Fixture.ForegroundImage;
        let imageHeight = shelf.Fixture.Height;
        let yTranslate = 0;

        let yScale = (imageHeight * Math.cos(UtilsSVG.degToRad(shelf.Rotation.X))) / imageHeight;

        SVGBlock +=
            `<g transform="scale(1, ${yScale}) translate(0, ${yTranslate})">
            ${this.makeShelfImage(
                'SSForegroundImage',
                'SSForeground'+shelf.$id,
                shelf,
                imageHeight,
                -imageHeight,
                image,
                shelf.TempId,
                config,
                window
            )}</g>`;
    }

    const colorTopBottom = this.lightenColor(color, 20);

    if (shelf.Rotation.X < 0) {
        const newT = shelf.Dimension.Depth * Math.sin(UtilsSVG.degToRad(shelf.Rotation.X));
        if (shelf.Fixture.TopImage?.Url) {
            SVGBlock +=
                `<g opacity="${opacity}" transform=" translate(0, ${Math.abs(newT) + height}) scale(1, ${Math.abs(newT) / shelf.Dimension.Depth})">
                    ${this.makeShelfImage('SSEdgeTopImage', shelf.$id + 'T', shelf, shelf.Dimension.Depth, 0, shelf.Fixture.TopImage, shelf.TempId,config, window)}
                    </g>`;
        } else {
            SVGBlock += this.makeShelfRect('', shelf, Math.abs(newT), height, colorTopBottom, shelf.TempId, opacity, window);
        }
    }

    if (shelf.Rotation.X > 0) {
        const newT = shelf.Dimension.Depth * Math.sin(UtilsSVG.degToRad(shelf.Rotation.X));
        if (shelf.Fixture.BottomImage?.Url) {
            SVGBlock +=
                `<g transform="translate(0, ${0}) scale(1, ${Math.abs(newT) / shelf.Dimension.Depth})">
                    ${this.makeShelfImage('SSEdgeBottomImage', shelf.$id + 'T', shelf, shelf.Dimension.Depth, 0, shelf.Fixture.BottomImage, shelf.TempId, config, window)}
                    </g>`;
        } else {
            SVGBlock += this.makeShelfRect('', shelf, Math.abs(newT), -newT, colorTopBottom, window);
        }
    }


    if(planogSvc.labelFixtEnabled[0] && BaseCommon.getCurrentEnableFixture(shelf,1, planogSvc.labelFixtItem)){
     SVGBlock+= common.createShelfLabelCustomized(shelf, params, scale, 1, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

    }
    if(planogSvc.labelFixtEnabled[1] && BaseCommon.getCurrentEnableFixture(shelf,2, planogSvc.labelFixtItem)){
     SVGBlock+= common.createShelfLabelCustomized(shelf, params, scale, 2, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

    }
    return SVGBlock + '</g>';
  }
   makeShelfRect = function(posClass, shelf, height, y, color, guidTmpID, opacity = 1, window) {
    const common = new CommonSVG();
    const tooltip= shelf["tooltipMsg"];
    if(tooltip){
        return `<title>${tooltip}</title><rect  class="${posClass} selectionRect fixtureClass" data-idpog="${common.getDataIdPog(shelf, guidTmpID, window)}" width="${shelf.Dimension.Width}" height="${height}"
         x="0" y="${y}" stroke-width="0.1" stroke="#000000" fill="${color}"/>`;
    }
    else{
        return `<rect  class="${posClass} selectionRect fixtureClass" data-idpog="${common.getDataIdPog(shelf, guidTmpID, window)}" width="${shelf.Dimension.Width}" height="${height}"
        x="0" y="${y}" stroke-width="0.1" stroke="#000000" fill="${color}" opacity="${opacity}"/>`;
    }
    
}

 makeShelfImage = function(posClass, ID, shelf, height, translate, image, guidTmpID, config, window) {
  const common = new CommonSVG();
    return common.TwoDCreateTiledImage(
        posClass + ' fixtureClass',
        'svgSS' + ID,
        shelf.Dimension.Width,
        height,
        0,
        translate,
        image,
        shelf.IDPOGObject,
        guidTmpID,
        config,
        window
    );
}
 lightenColor = function(color, percent) {
  color = color.indexOf('#') >= 0 ? color.substring(1, color.length) : color;
  const num = parseInt(color, 16),
      amt = Math.round(2.55 * percent),
      R = (num >> 16) + amt,
      B = ((num >> 8) & 0x00ff) + amt,
      G = (num & 0x0000ff) + amt;

  return `#${(
          0x1000000 +
          (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
          (B < 255 ? (B < 1 ? 0 : B) : 255) * 0x100 +
          (G < 255 ? (G < 1 ? 0 : G) : 255)
      )
          .toString(16)
          .slice(1)
      }`;
}


}
