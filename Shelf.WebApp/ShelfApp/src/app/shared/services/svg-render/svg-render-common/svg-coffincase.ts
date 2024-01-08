
import { prototype } from "events";
import { isEmpty } from "lodash";
import { CommonSVG } from "./svg-common";
import { AppConstantSpace } from "./svg-constants";
import { UtilsSVG } from "./svg-utils";
import { BaseCommon } from "./services/base-common.service";

export class CoffinCaseSVG{

  SVGCoffincase = function(itemData, scale, params, planogSvc, planogStore, sectionObj, config, window) {
      return this.svgRendererCoffincase(itemData, scale, params, false, planogSvc, planogStore, sectionObj, config, window)
      + this.svgSeperatorDraw(itemData, planogStore, sectionObj);
  }

  svgSeperatorDraw = function(itemData, planogStore, sectionObj) {
      const info = itemData.getCoffinCaseInfo();
      const frontFlag = planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY
          ? itemData.Fixture.DisplayViews
          : sectionObj.containsOnlyCoffinCaseFamily();
      return `<g class="svgSeparator" transform="translate(${info.SideThickness}, ${frontFlag ? info.FrontThickness : info.BottomThickness})">
          ${this.SVGSeperatorDrawRenderer(itemData, false, planogStore)}</g>`;
  }
  SVGSeperatorDrawRenderer = function(coffincase, considerDisplayViewsFlag, planogStore) {
    const divider = coffincase.Children.find((x) => x.ObjectDerivedType == AppConstantSpace.DIVIDERS);

    if (isEmpty(divider)) return;

    const dividerWidth = divider.Fixture.Thickness;
    const coffincaseHeight = coffincase.getRenderingDimensionFor2D().Height;
    const dividerGap = JSON.parse(coffincase.Fixture.SeparatorsData);
    if (dividerGap == null) return;

    const useY = planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY
        ? coffincase.Fixture.DisplayViews
        : (considerDisplayViewsFlag && coffincase.Fixture.DisplayViews);

    let SVGBlock = '';
    for (const vertical of dividerGap.vertical) {
      if (vertical.x + dividerWidth <= coffincase.ChildDimension.Width) {
        SVGBlock += `<rect width="${dividerWidth}" height="${coffincaseHeight}" x="${vertical.x}"  fill="slategrey"/>`;
      }
    }
    for (const horizontal of dividerGap.horizontal) {
        if (useY) {
          if (horizontal.y + dividerWidth <= coffincase.ChildDimension.Depth) {
            SVGBlock += `<rect width="${coffincase.ChildDimension.Width}" height="${dividerWidth}" y="${horizontal.y}"  fill="slategrey"/>`;
          }
        } else {
            SVGBlock += `<rect width="${coffincase.ChildDimension.Width}" height="${coffincase.ChildDimension.Height}"  fill="slategrey"/>`;
        }
    }
    return SVGBlock;
}
  svgRendererCoffincase = function(itemData, scale, params, considerDisplayViewsFlag, planogSvc, planogStore, sectionObj, config, window) {
  let common = new CommonSVG();
  const useTopView = planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY
            ? itemData.Fixture.DisplayViews
            : (considerDisplayViewsFlag
                ? itemData.Fixture.DisplayViews
                : sectionObj.containsOnlyCoffinCaseFamily());
        let labelBlock = '';
        if(planogSvc.labelFixtEnabled[0] && BaseCommon.getCurrentEnableFixture(itemData,1, planogSvc.labelFixtItem)){
          labelBlock+= common.createShelfLabelCustomized(itemData, params, scale, 1, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

         }
         if(planogSvc.labelFixtEnabled[1] && BaseCommon.getCurrentEnableFixture(itemData,2, planogSvc.labelFixtItem)){
          labelBlock+= common.createShelfLabelCustomized(itemData, params, scale, 2, planogSvc.labelFixtItem, planogSvc.labelFixtAllFields);

         }
        return `<g class='fixtureGroup'>${this.view(itemData, useTopView ? 'top' : 'front', config, window)}
        ${labelBlock}</g>`;
}
view = function(coffincase, view, config, window) {

  const color = coffincase.getColor();
  const info = coffincase.getCoffinCaseInfo();

  const height = view == 'front' ? coffincase.Dimension.Height : coffincase.Dimension.Depth;
  const childHeight = view == 'front' ? coffincase.ChildDimension.Height : coffincase.ChildDimension.Depth;
  const yThickness = view == 'front' ? info.BottomThickness : info.FrontThickness;

  const makeRect = (posClass, color, info, itemData, window) => {
    let com = new CommonSVG();
      const idpog = com.getDataIdPog(itemData, itemData.TempId, window);
      const tooltip= coffincase["tooltipMsg"];
      if(tooltip){
        return `<title>${tooltip}</title><rect class="${posClass} selectionRect fixtureClass" data-idpog="${idpog}"
        height="${height}" width="${itemData.Dimension.Width}" y="0" x="0" stroke-width="0.2" stroke="#000000" fill="${color}" opacity="0.3"/>
        <rect class="${posClass} fixtureClass" data-idpog="${idpog}"
        height="${childHeight}" width="${itemData.ChildDimension.Width}" y="${yThickness}" x="${info.SideThickness}"
        stroke-width="0.1" stroke="#000000" fill="${color}" />`;
      }
      else{
        return `<rect class="${posClass} selectionRect fixtureClass" data-idpog="${idpog}"
        height="${height}" width="${itemData.Dimension.Width}" y="0" x="0" stroke-width="0.2" stroke="#000000" fill="${color}" opacity="0.3"/>
        <rect class="${posClass} fixtureClass" data-idpog="${idpog}"
        height="${childHeight}" width="${itemData.ChildDimension.Width}" y="${yThickness}" x="${info.SideThickness}"
        stroke-width="0.1" stroke="#000000" fill="${color}" />`;
      }
      
  };

  const makeImage = (posClass, ID, y, translate, image, config, window) => {
    let com = new CommonSVG();
      return com.TwoDCreateTiledImage(
          posClass + ' fixtureClass',
          'svgSS' + ID,
          coffincase.Dimension.Width,
          height,
          y,
          translate,
          image,
          view == 'top' ? coffincase.IDPOGObject : undefined,null,
          config,
          window
      );
  };
const  svgCoffinLine=(x1, y1, x2, y2, color, strokeWidth) =>{
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
}
  const showImage = view == 'front' ? coffincase.Fixture.FrontImage : coffincase.Fixture.TopImage;

  let SVGBlock = '';
  if (showImage) {
      if (showImage.Url) {
          SVGBlock += makeRect('posSKU', color, info, coffincase, window);
          SVGBlock += makeRect('posBox', color, info, coffincase, window);
          SVGBlock += '<g transform="scale(1, 1) translate(0, ' + height + ')">';
          SVGBlock += makeImage(
              'posImage',
              coffincase.$id,
              0,
              0,
              showImage,
              config,
              window
          );
          SVGBlock += '</g>';
      } else {
          SVGBlock += makeRect('', color, info, coffincase, window);
      }
  } else {
      SVGBlock += makeRect('', color, info, coffincase, window);
  }

  if (view == 'front') {
    let com = new CommonSVG();
      SVGBlock += `<rect class="selectionRect fixtureClass" data-idpog="${com.getDataIdPog(coffincase, coffincase.TempId, window)}"
      height="${coffincase.Dimension.Height}" width="${coffincase.Dimension.Width}" y="0" x="0" stroke-width="0.2" fill="#fff" stroke="#000000" opacity="0.3"/>`;
    if (coffincase.ObjectDerivedType === 'Basket') {
      const grillHeight = coffincase.ChildDimension.Height;
      const width = coffincase.ChildDimension.Width;
      const wireSize = 0.07;
      const wireColor = 'darkslategray';
      const grillSpaceVal = 2;
      for (let i = 0; i <= width; i += grillSpaceVal) {
        SVGBlock += svgCoffinLine(i, 0, i, grillHeight, wireColor, wireSize);
      }

      for (let i = 0; i <= grillHeight; i += grillSpaceVal) {
        SVGBlock += svgCoffinLine(0, i, width, i, wireColor, wireSize);
      }
    }
  } else {
      // view is top
      if (coffincase.Dimension.Height > coffincase.Dimension.Depth) {
          const patternH = coffincase.Dimension.Height - coffincase.Dimension.Depth;
          SVGBlock += `<defs> <pattern id="crosshatch" patternUnits="userSpaceOnUse" width="1.5" height="1.5">
          <image xmlns:xlink="http://www.w3.org/1999/xlink"
          xlink:href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc4JyBoZWlnaHQ9JzgnPgogIDxyZWN0IHdpZHRoPSc4JyBoZWlnaHQ9JzgnIGZpbGw9JyNmZmYnLz4KICA8cGF0aCBkPSdNMCAwTDggOFpNOCAwTDAgOFonIHN0cm9rZS13aWR0aD0nMC41JyBzdHJva2U9JyNhYWEnLz4KPC9zdmc+Cg==" x="0" y="0" width="1.5" height="1.5">
          </image> </pattern> </defs><rect height="${patternH}" width="${coffincase.Dimension.Width}" y="-${patternH}" x="0" fill="url(#crosshatch)"  />`;
      }

  }
  return SVGBlock;
}
}
