import { ColorSVG } from "./svg-color";
import { CommonSVG } from "./svg-common";

export class ModularSVG{
  SVGModularFront = function(itemData, scale, config, window) {
    return `<g><rect  width="${itemData.Dimension.Width}" height="${itemData.Dimension.Height}" fill="transparent" stroke="grey"
     stroke-width=".05" style="pointer-events: none;" />${this.SVGModularFrontRenderer(itemData, scale, config, window)}</g>`;
}

  SVGModularFrontRenderer = function (itemData, scale, config, window) {
    if (window) {
      window.checkImageerror = (ele) => { //check fallback image in generated svg
        const imgFallback = `${config?.fallbackImageUrl}`;
        ele.setAttribute('xlink:href', imgFallback);
      };
    } else {
      global.checkImageerror = (ele) => { //check fallback image in generated svg
        const imgFallback = `${config?.fallbackImageUrl}`;
        ele.setAttribute('xlink:href', imgFallback);
      };
    }
    return itemData.Children
        .filter(child => child.ObjectDerivedType == 'Modular' && child.Fixture.FrontImage?.FarFrontUrl)
        .map(child =>
            `<image class="ModularForegroundImage" data-idpog="undefined" width="${child.Dimension.Width}" height="${child.Dimension.Height}"
            x="${child.Location.X}" y="0" preserveAspectRatio="none" transform="scale(1, -1) translate(0, -${child.Dimension.Height})"
            xlink:href="${child.Fixture.FrontImage.FarFrontUrl}" onError="window.checkImageerror(this)" style="pointer-events: none;"></image>`)
        .join('');
};

  SVGModularRenderer = function (modular, scale, config, window) {
    let SVGBlock = '';
    if (modular.Fixture.FrontImage?.Url) {
      SVGBlock += this.makeImage(modular, 'ModularBgImage', 0, -modular.Dimension.Height, modular.Fixture.FrontImage, config, window);
    }
    return SVGBlock;
  };

  makeImage = (modular, posClass, y, translate, image, config, window) => {
    let common = new CommonSVG();
    return common.TwoDCreateTiledImage(posClass, 'svgMo' + modular.$id, modular.Dimension.Width, modular.Dimension.Height, y, translate, image, null, null, config, window);
  };

}
