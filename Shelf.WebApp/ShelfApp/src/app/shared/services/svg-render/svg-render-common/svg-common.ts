import { UtilsSVG } from "./svg-utils";
import { createCanvas } from 'canvas';
import { AppConstantSpace } from "./svg-constants";
// var altCanvas = require('canvas')
// var expectedCanvas = altCanvas.createCanvas(256, 256);
// var ctx = expectedCanvas.getContext('2d');
export class CommonSVG {
  TwoDCreateTiledImage = function (
    posClass,
    ID,
    width,
    height,
    y,
    translate,
    image,
    IdPogObj,
    guidTmpID,
    config,
    window
  ) {
    const tile = 'LkDisplayType' in image && image.LkDisplayType != null ? image.LkDisplayType : 0;
    const encodedURL = image.Url;

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

    let SVG = `<g transform="scale(1, -1) translate(0, ${translate}) ">
    <filter id="T${ID}" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" >
    <feImage preserveAspectRatio="none" xlink:href="${encodedURL}" x="0" y="0" width="zznewWidthzz" height="zznewHeightzz"/>
    <feTile /></filter><rect class="${posClass} selectionRect"    data-idpog="${IdPogObj ?? guidTmpID}"
      width="${width}" height="${height}" filter="url(#T${ID})" /></g>`;
    let tRatio;
    switch (Number(tile)) {
      case 1:
        const imageHeight = this.getImageHeight(image, height);
        const imageWeight = this.getImageWidth(image, width);
        tRatio = height / width;
        const newWidth = tRatio * imageWeight;
        const repeat = (width / (imageHeight / newWidth)).toString();
        SVG = SVG.replace('zznewWidthzz', repeat);
        SVG = SVG.replace('zznewHeightzz', height.toString());
        break;
      case 2:
        const h = this.getImageHeight(image, height);
        const w = this.getImageWidth(image, width);
        tRatio = width / height;
        const newHeight = tRatio * h;
        const repeatNew = height / (w / newHeight);
        if (w / newHeight < 1) {
          return `<clipPath id="clip-${ID}"><rect x="0" y="0" width="${width}" height="${height}"></rect></clipPath>
                    <image clip-path="url(#clip-${ID})" class="${posClass} selectionRect" data-idpog="${IdPogObj == null ? guidTmpID : IdPogObj}"
                    id="svgFix${ID}" width="${width}" height="${repeatNew}" x="0" y="${height - repeatNew}" preserveAspectRatio="none"
                    transform="scale(1, -1) translate(0, ${translate}) " xlink:href="${encodedURL}" onError="window.checkImageerror(this)"></image>`;
        }
        SVG = SVG.replace('zznewHeightzz', repeatNew.toString());
        SVG = SVG.replace('zznewWidthzz', width.toString());
        break;
      default:
        return `<image class="${posClass} selectionRect"   data-idpog="${IdPogObj == null ? guidTmpID : IdPogObj}"  id="svgFix${ID}"
                 width="${width}" height="${height}" x="0" y="${y}" preserveAspectRatio="none" transform="scale(1, -1)
                 translate(0, ${translate}) " xlink:href="${encodedURL}" onError="window.checkImageerror(this)"></image>`;
    }
    return SVG;
  }
  getImageWidth = function (image, defaultValue) {
    // tslint:disable-next-line: radix
    let Width = parseInt(this.getUrlParameter(image.Url, 'w'));
    if (!(Width > 0)) {
      Width = defaultValue;
    }
    return Width;
  }
  getImageHeight = function (image, defaultValue) {
    let Height = parseInt(this.getUrlParameter(image.Url, 'h'));
    if (!(Height > 0)) {
      Height = defaultValue;
    }
    return Height;
  }
  getUrlParameter = function (url, name) {
    name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
    const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
    const results = regex.exec(url);
    return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
  }
  createShelfLabelCustomized = function (itemData, params, scale, label, labelFixtItem, labelFixtField) {
    //return '';
    //only positions the group according to alignment
    //for now bottom left

    const containerInfo = {
      height: itemData.Dimension.Height,
      width: itemData.Dimension.Width,
      x: 0,
      y: 0,
      type: itemData.ObjectDerivedType,
    };

    const labelObj = this.getShelfLabelObject(params, itemData, "canvas", label, labelFixtItem, labelFixtField);
    if (itemData.ObjectDerivedType == 'StandardShelf' || itemData.ObjectDerivedType == 'BlockFixture') {
      labelObj.yshift = 1.3;
    } else {
      labelObj.yshift = 0;
    }
    return this.createGroup(labelObj, containerInfo, label);
  }
  createGroup = function (labelObj, containerInfo, label) {
    const { width, height, rotation } = this.getOrientedContainer(containerInfo, labelObj.orientation);

    const permittedFontSize = labelObj.fontsize / 8;
    const fontWeight = 500;

    const svgTextObject = this.createText(labelObj, width, permittedFontSize, fontWeight);

    const translateY = containerInfo.type == AppConstantSpace.CROSSBAROBJ && labelObj.crossLabelDisplay == 'Above'
      ? (containerInfo.height + svgTextObject.height)
      : svgTextObject.height * labelObj.yshift;
    //const calcTextWidthMechanism = this.getTextWidthCalculator(labelObj.calcMechanism);

    const svgTextWidth = UtilsSVG.getWidthOfTextByCanvas(labelObj.text, labelObj.fontfamily, permittedFontSize, fontWeight);
    const translateX = (label == 1) ? 0.25 : (width - svgTextWidth - 0.25);
    return `<g class="shelfLabelGroup" transform="translate(${translateX},${rotation == 90 ? 0.25 : translateY})
       rotate(${rotation}) scale(1, -1)">${svgTextObject.textSVG}</g>`;
  }

  createText = function (labelObj, availWidth, permittedFontSize, fontWeight) {
    //cusotmized
    const permittedWidth = availWidth - (5 * availWidth) / 100;

    let bgColor = labelObj.backgroundcolor;
    let rectWidth = UtilsSVG.getWidthOfTextByCanvas(labelObj.text, labelObj.fontfamily, permittedFontSize, fontWeight);
    const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
    const textRendering = 'text-rendering:geometricPrecision;';
    const lineDY = permittedFontSize * 1.25;
    const dx = 0.1;

    let tspanSVG = `<tspan x="${dx}" dy="${permittedFontSize * 1}">${UtilsSVG.replacedHTMLEntityString(labelObj.text)}</tspan>`;

    let textSVG = `<text style="-webkit-font-smoothing: none;${textRendering}${whiteSpaceTransform}
        font-family:${labelObj.fontfamily};font-weight:${fontWeight};font-size:${permittedFontSize}px;fill:${labelObj.fontcolor};text-anchor:start;user-select:none">${tspanSVG}</text>`;

    textSVG = `<rect width="${rectWidth}" height="${lineDY}" fill="${bgColor}" />` + textSVG;

    return { textSVG, height: permittedFontSize, width: permittedWidth };
  }
  getOrientedContainer(container, orientation) {
    // initialize as vertical orientation
    let width = container.height;
    let height = container.width;
    let rotation = 90;

    orientation = Number(orientation); // 0: horizontal, 1: vertical, -1 or else : bestfit
    // check if horizontal of if best fit resolves to horizontal
    if (orientation !== 1
      && (orientation === 0 || container.width > container.height)) {
      width = container.width;
      height = container.height;
      rotation = 0;
    }
    return { width, height, rotation };
  }

  getShelfLabelObject = function (params, data, calcMechanism, label, labelFixtItem, labelDictionary) {
    let tempObj = { "fontsize": 10, "fontfamily": "Verdana", "opacity": 0.3, "alignment": "bottom-left", "text": null, "calcMechanism": null, "orientation": null, "crossLabelDisplay": null, "fontcolor": null, "backgroundcolor": null, "decimals": -1 };
    const labelIndex = label - 1;
    //for text
    let tempstr = '';
    let temparr = [];
    let labelObj = labelFixtItem['FIXTURE_LABEL']['LABEL_' + label];
    let tempword;
    let labelFixtField;
    labelFixtField = this.getLabelExpr(labelObj.LABEL, labelDictionary, labelObj.SHOW_LABEL_TITLE);
    let shortDescsArr = labelFixtField.labelFieldSd;
    let fieldPathArr = labelFixtField.labelFieldFp;

    for (let [i, field] of fieldPathArr.entries()) {
      tempword = data;
      temparr = field.split('.');
      try {
        for (let field of temparr) {
          tempword = tempword[field];
        }
        if (tempword === undefined) {
          tempword = UtilsSVG.replaceAll('\xB7', '.', UtilsSVG.replaceAll('\\n', '\n', field));
        }
        tempword = tempword === null ? '' : tempword;
        if (typeof tempword == 'number' && Math.floor(tempword) != tempword) {
          tempword = labelObj.DECIMALS != -1 ? tempword.toFixed(labelObj.DECIMALS) : tempword;
        }
        tempstr += shortDescsArr[i] + ' ' + tempword + ' ';
      } catch (e) {
        console.log(labelFixtField[i] + ' could not be found in ' + data.ObjectDerivedType);
      }
    }
    tempObj.text = tempstr;

    if (labelObj) {
      //for font
      tempObj.fontsize = labelObj.FONT_SIZE || 10;
      tempObj.fontcolor = labelObj.FONT_COLOR || 'black';
      tempObj.fontfamily = labelObj.FONT_FAMILY || "Roboto";
      tempObj.backgroundcolor = labelObj.BACKGROUND_COLOR || 'white';
      tempObj.opacity = labelObj.TRANSPARENCY || 0.3;
      //alignments
      tempObj.alignment = labelObj.HORIZONTAL_ALIGNMENT || 'bottom-left';
      tempObj.crossLabelDisplay = labelObj.CROSSBAR_LABEL_DISPLAY;
      //decimals
      tempObj.decimals = labelObj.DECIMALS || -1;
    }
    //orientation
    tempObj.orientation = labelObj.VERTICAL_ALIGNMENT || 0; // Shelf labels are horizontal.

    // Word warp not supported in shelf label.
    tempObj.calcMechanism = calcMechanism;

    if (params) {
      // $.extend(tempObj, params);
      tempObj = { ...tempObj, ...params };
    }

    return tempObj;
  }
  getDataIdPog = function (item, defaultId, window) {

    try {
      // in PA need to consider productKey for positions and key for other items.
      if (window && window['application'] === 'allocate') {
        return item.Position ? item.Position.Product.ProductKey : item.Key
      }
      return item.IDPOGObject ?? defaultId;
    }catch(er){}
  }

  getLabelHeight(scale) {
    return scale * 2; // This is to accomodate the Shelf label.
  }
  getLabelExpr = function (labelExpr, fieldValues, showLabel) {
    labelExpr = UtilsSVG.replaceAll('~|~', '', labelExpr);
    let newLabelExpr = '';
    let newLabelFieldsSD = [];
    let newLabelFieldsFP = [];
    if (labelExpr) {

      labelExpr = !showLabel ? this.filterIdDictionaries(labelExpr) : labelExpr;
      fieldValues.forEach((value, key) => {
        if (labelExpr.indexOf(value.IDDictionary) != -1) {
          labelExpr = !showLabel ? labelExpr.replace(value.IDDictionary, '~this.itemData.' + value.field + '~') : labelExpr.replace('~' + value.IDDictionary + '~', '~this.itemData.' + value.field + '~');
        } else {
          labelExpr = !showLabel ? labelExpr.replace(value.IDDictionary, "'" + value.value + "'") : labelExpr.replace('~' + value.IDDictionary + '~', "'" + value.value + "'");
        }
      });
      //The text version of MerchStyle and Orientation are not in the dictionary, so fix then here
      labelExpr = labelExpr.replace('.IDOrientation~', '.IDOrientationtext~');
      labelExpr = labelExpr.replace('.IDMerchStyle~', '.IDMerchStyletext~');
      let x = labelExpr.match(/[^~].*[^~]/g)[0].replace('~~', '~');
      let labelExprArr = x.split('~');
      newLabelExpr = '{{';
      labelExprArr.forEach((value, key) => {
        let fieldValue = value.replace('this.itemData.', '').trim();
        if (value && value.indexOf('this') != -1) {
          newLabelExpr += value + '+';
          if (fieldValue) {
            newLabelFieldsFP.push(fieldValue);
            if(newLabelFieldsSD.length < newLabelFieldsFP.length) {
              newLabelFieldsSD.push('');
            }
          }
        } else if (value && value.indexOf('this') == -1) {
          newLabelExpr += "'" + value + "'+";
          if (fieldValue) {
            newLabelFieldsSD.push(fieldValue);
          }
        } else {
          newLabelExpr += "' '" + '+';
        }
      });
      newLabelExpr = newLabelExpr.match(/[^+].*[^+]/g)[0];
      newLabelExpr += '}}';
    }
    return { labelExpression: newLabelExpr, labelFieldSd: newLabelFieldsSD, labelFieldFp: newLabelFieldsFP };
  }
  filterIdDictionaries = function (labelExpr) { // showlabel off get only iddictionaries
    let IDDictionary = [];
    const regex = new RegExp(/(?<=~)(.*?)(?=~)/g);
    IDDictionary = labelExpr.match(regex);
    let filterIddictionary = [];
    IDDictionary?.forEach((item, key) => {
      if (parseInt(item) == item) {
        filterIddictionary.push(item);
      } else if (item.includes('\\n')) {
        filterIddictionary.push("\\n")
      }
    });
    labelExpr = filterIddictionary.join(' ');
    return labelExpr;
  }
  makeRect = function (pegboard, posClass, y, color, IdPogObjGuid, window) {
    const tooltip= pegboard["tooltipMsg"];
    if(tooltip){
      return `<title>${tooltip}</title><rect  class="${posClass} fixtureClass  selectionRect"   data-idpog="${this.getDataIdPog(pegboard, IdPogObjGuid, window)}"
  id="svgPB${pegboard.$id}" width="${pegboard.Dimension.Width}" height="${pegboard.Dimension.Height}" x="0" y="${y}" stroke-width="0.1" stroke="#000000" fill="${color}"/>`;
    }
    else{
      return `<rect  class="${posClass} fixtureClass  selectionRect"   data-idpog="${this.getDataIdPog(pegboard, IdPogObjGuid, window)}"
      id="svgPB${pegboard.$id}" width="${pegboard.Dimension.Width}" height="${pegboard.Dimension.Height}" x="0" y="${y}" stroke-width="0.1" stroke="#000000" fill="${color}"/>`;
    }
  }

  makeImage = function (pegboard, posClass, y, translate, image, config, window) {
    return this.TwoDCreateTiledImage(
      posClass + ' fixtureClass',
      'svgPB' + pegboard.$id,
      pegboard.Dimension.Width,
      pegboard.Dimension.Height,
      y,
      translate,
      image,
      pegboard.IDPOGObject, null,
      config,
      window
    );
  }


  checkIfFixture = (item) => {
    return item !== undefined && item.Fixture !== undefined && item.ObjectType == AppConstantSpace.FIXTUREOBJ;
  }

}
