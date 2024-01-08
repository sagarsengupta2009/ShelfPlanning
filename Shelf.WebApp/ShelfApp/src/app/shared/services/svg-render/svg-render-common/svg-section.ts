import { CommonSVG } from "./svg-common";

export class SectionSVG {
    renderSection = function (itemData, config, window) {
        let common = new CommonSVG();
        let SVGBlock = '';
        if (itemData.FrontImage?.Url) {
            SVGBlock += common.makeImage(itemData, 'sectionImage', 0, -itemData.Dimension.Height, itemData.FrontImage, config, window);
        }
        return SVGBlock;
    }

    SVGSection = function(itemData, config, window) {
        return `<g><rect width="${itemData.Dimension.Width}" height="${itemData.Dimension.Height}" fill="transparent" stroke="grey" stroke-width=".05" />${this.renderSection(itemData, config, window)}</g>`;
    }
}