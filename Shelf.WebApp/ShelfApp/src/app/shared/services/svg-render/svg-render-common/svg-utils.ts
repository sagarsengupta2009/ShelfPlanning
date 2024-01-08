import { AppConstantSpace } from "./svg-constants";
const { registerFont, createCanvas } = require('canvas');
export class UtilsSVG {
  static textWidthCache = {};

  static getWidthOfTextByCanvas = function (txt, fontname, fontsize, fontweight = null, omitOffset = false) {
    if (!fontweight) {
      fontweight = 'normal';
    }
    const cacheKey = txt + fontname + fontsize + fontweight;
    const cacheValue = UtilsSVG.textWidthCache[cacheKey];
    if (cacheValue !== undefined) {
      return cacheValue;
    }
    if (registerFont) {
      registerFont('./fonts/Roboto-Regular.ttf', {
        family: 'Roboto'
      });
    }
    var ctx = createCanvas(256, 256).getContext('2d');
    ctx.font = fontweight + ' ' + fontsize + 'px ' + fontname;
    var length = ctx.measureText(txt).width;
    if(registerFont && !omitOffset) {
      length = length + (length * 0.05);
    }
    UtilsSVG.textWidthCache[cacheKey] = length;
    return length;
  }
  static degToRad = function (degrees) {
    return (Math.PI / 180.0) * degrees;
  };
  static isNullOrEmpty = function (obj) {
    return obj === undefined || obj == null || obj == 'null' || typeof obj == 'undefined' || obj === '';
  }
  static replacedHTMLEntityString = function (str) {
    const text = str.replace(this.reUnescapedHtml, (chr) => this.htmlEscapes[chr]);
    const regexWhitelist = /[ !#-&\(-\[\]-~]/;
    // Loop over each code unit in the string and escape it
    let index = -1;
    var length = text.length;
    let result = '';
    while (++index < length) {
      var character = text.charAt(index);
      if (regexWhitelist.test(character)) {
        result += character;
        continue;
      }
      var charCode = character.charCodeAt(0);
      var hexadecimal = charCode.toString(16);
      var longhand = hexadecimal.length > 2;
      var escaped = '&#' + (longhand ? 'x' : 'x') + ('0000' + hexadecimal).slice(longhand ? -4 : -2) + ';';
      result += escaped;
    }
    return result;
  }

  // pog-renderer.svc 3d-pog.svc
  static generateProductAuthSVGPattern = function (authPatternImageCollection) {
    let SVG = '<svg height="2" width="2" xmlns="http://www.w3.org/2000/svg" version="1.1"><defs>';
    for (var attr in authPatternImageCollection) {
      SVG += `<pattern id="auth-code-pattern${attr}" patternUnits="userSpaceOnUse" width="2" height="2">
        <rect fill="white" height="100%" width="100%" />
        <image xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${authPatternImageCollection[attr]}"
            x="0" y="0" width="2" height="2" style="transform: rotate(180deg);transform-origin:center;">
            </image></pattern>`;
    }
    SVG += '</defs></svg>';
    return SVG;
  };

  // pog-renderer.svc 3d-pog.svc
  static generateProductAuthCSS = function (authPatternImageCollection, mode) {
    const cdata = mode == 'SVG' ? ['<![CDATA[', ']]>'] : ['', ''];
    let dynCSS = `<style type="text/css">${cdata[0]}`;
    for (const attr in authPatternImageCollection) {
      dynCSS += `.planoDrawMode0 .posSKU.auth-code-pattern${attr},.planoDrawMode1 .posSKU.auth-code-pattern${attr},.planoDrawMode2 .posSKU.auth-code-pattern${attr}{fill: url(#auth-code-pattern${attr}) !important;display: block !important;}`;
    }
    return `${dynCSS}${cdata[1]}</style>`;
  }

  // pog-renderer.svc 3d-pog.svc
  static generateLabelBGSVGPattern = function (labelItem, label) {
    const labelBackground = labelItem['POSITION_LABEL']["LABEL_" + label]["BACKGROUND_COLOR"];
    const labelBorder = labelItem['POSITION_LABEL']["LABEL_" + label]["STROKE_COLOR"];
    return `<svg height="1" width="1" xmlns="http://www.w3.org/2000/svg" version="1.1" class="customlabelbackgroundcolorSVG">
        <defs><filter x="0" y="0" width="1" height="1" id="customlabelbackgroundcolor${label}">
        <feFlood flood-color="${labelBackground}"></feFlood>
        <feComposite in="SourceGraphic"></feComposite></filter></defs><filter id="customLabelBorder${label}">
        <feMorphology in="SourceAlpha" result="expanded" operator="dilate" radius="0.2"/>
        <feFlood flood-color="${labelBorder}"/>
        <feComposite in2="expanded" operator="in"/>
        <feComposite in="SourceGraphic"/>
      </filter></svg>`;
  }
  static generateGUID() {
    let d = new Date().getTime();
    let uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      let r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
    return uuid;
  }
  static checkIfFixture(item) {
    return item !== undefined && item.Fixture !== undefined && item.ObjectType == AppConstantSpace.FIXTUREOBJ;
  }
  static checkIfBay(item) {
    return (
      UtilsSVG.checkIfFixture(item) &&
      item.Fixture.IsMovable &&
      !item.Fixture.IsMerchandisable &&
      item.Fixture.FixtureType === AppConstantSpace.MODULAR
    );
  }
  static replaceAll(search, replace, string) {
    try {
      return string.replaceAll(search, replace);
    } catch (error) {
      return string.split(search).join(replace);
    }
  }

  static reUnescapedHtml = /[&<>"']/g;
  static htmlEscapes = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }


}

