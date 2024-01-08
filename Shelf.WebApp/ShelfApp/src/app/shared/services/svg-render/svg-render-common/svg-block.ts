/**
 * THIS FILE IS USED IN NODEJS WHICH DOES NOT SUPPORT TYPES
 */
export class BlockSVG {
  renderBlockSvg = function (block) {
    const width = block.Dimension.Width;
    const height = block.Dimension.Height;
    const colorCode = block.BlockColor;
    const strokeWidth = block.StrokeWidth;

    const svgBlock = `<rect id="block-rect" class="block-rect" width="${width}" height="${height}" fill="${colorCode}" stroke="#333" stroke-width="${strokeWidth}"/> `;
    return svgBlock;
  }

  renderBlockElement = function (itemData, scale) {
    const height = scale * itemData.Dimension.Height;
    const width = scale * itemData.Dimension.Width;

    const styleStr = 'position:absolute;left:0px;right:0px;bottom:0px;top:0px;';
    let svgHeader = `<svg style="${styleStr}" version="1.1" height="${height}" width="${width}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`;
    svgHeader += `<g transform="translate(0, ${height}) scale(${scale} , ${-scale})">`;
    const svgTail = '</g></g></svg>';
    let svgBlock = this.renderBlockSvg(itemData);
    svgBlock = svgHeader + svgBlock + svgTail;

    return svgBlock;
  }
}
