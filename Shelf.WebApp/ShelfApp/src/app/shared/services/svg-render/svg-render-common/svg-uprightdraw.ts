export class UprightDrawSVG{
  //Pog Renderer -uprights
  svgPogLine = function(x1, y1, x2, y2, color, strokeWidth) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${strokeWidth}" />`;
}
// TODO: @malu change to svg template - https://angular.io/guide/svg-in-templates#svg-as-templates
SVGPogRenderer = function(itemData, measurementUnit) {
    let notchArr = [];
    if (itemData.getNotchInterval()) {
        notchArr = itemData.getNotchInterval();
    }
    let uprightGap = [];
    if (itemData.uprightIntervals) {
        uprightGap = itemData.uprightIntervals;
    }else if (itemData.getUprightInterval()) {
      uprightGap = itemData.getUprightInterval();
  }
    let SVGBlock = '';
    let width = 0.36;
    let height = 0.75;
    let offset = 1;
    if (measurementUnit == 'METRIC') {
        //metric
        width = width * 2.54;
        height = height * 2.54;
        offset = offset * 2.54;
    }

    for (let i = 0; i < uprightGap.length; i++) {
        if (uprightGap[i] - offset >= 0) {
            SVGBlock += this.svgPogLine(
                uprightGap[i] - offset,
                0,
                uprightGap[i] - offset,
                itemData.Dimension.Height,
                'black',
                0.05,
            );
        }
        for (let j = 0; j < notchArr.length; j++) {
            let yPos = notchArr[j];
            const xPosition = uprightGap[i] - width / 2;
            const yPosition = yPos - (height / 2);
            SVGBlock += `<rect width="${width}" height="${height}" x="${xPosition}" y="${yPosition}" fill="slategrey" />`;
        }
        if (notchArr.length == 0) {
            SVGBlock += this.svgPogLine(uprightGap[i], 0, uprightGap[i], itemData.Dimension.Height, 'black', 0.05);
        }
        if (uprightGap[i] + offset <= itemData.Dimension.Width) {
            SVGBlock += this.svgPogLine(
                uprightGap[i] + offset,
                0,
                uprightGap[i] + offset,
                itemData.Dimension.Height,
                'black',
                0.05,
            );
        }
    }
    return SVGBlock;
}

SVGPog = function(itemData, measurementUnit) {
    return `<g><rect width="${itemData.Dimension.Width}" height="${itemData.Dimension.Height}" fill="transparent" stroke="grey" stroke-width=".05" />${this.SVGPogRenderer(itemData, measurementUnit)}</g>`;
}
}
