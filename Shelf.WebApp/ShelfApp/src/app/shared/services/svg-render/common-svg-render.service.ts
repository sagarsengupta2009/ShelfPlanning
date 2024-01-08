import { Injectable } from '@angular/core';
import { AppConstantSpace, Utils } from '../../constants';
import { LabelObject, LabelOrientation } from '../../models';
import { ParentApplicationService, PlanogramService } from '../common';
import { ObjectListItem } from '../common/shared/shared.service';

@Injectable({
    providedIn: 'root'
})
export class CommonSvgRenderService {


    public bckColorId = 'shelflabelbackgroundcolor'; //'backgroundcolor-' + itemData.$id;

    constructor(
        private readonly planogramService: PlanogramService,
        private readonly parentApp: ParentApplicationService
    ) { }

    public getLabelHeight(scale: number): number {
        return scale * 2; // This is to accomodate the Shelf label.
    }

    getOrientedContainer(container: { width: number, height: number }, orientation: LabelOrientation) {
        // initialize as vertical orientation
        let width: number = container.height;
        let height: number = container.width;
        let rotation: number = 90;

        orientation = Number(orientation); // 0: horizontal, 1: vertical, -1 or else : bestfit
        // check if horizontal of if best fit resolves to horizontal
        if (orientation !== LabelOrientation.Vertical
            && (orientation === LabelOrientation.Horizontal || container.width > container.height)) {
            width = container.width;
            height = container.height;
            rotation = 0;
        }
        return { width, height, rotation };
    }

    public getTextWidthCalculator(mechanism: 'canvas' | 'd3') {
        switch (mechanism) {
            case 'canvas':
                return this.getWidthOfTextByCanvas.bind(this);
            case 'd3':
                return this.getWidthOfTextByD3;
            default:
                return () => 0;
        }
    }

    public TwoDCreateTiledImage(
        posClass: string,
        ID: string,
        width: number,
        height: number,
        y: number,
        translate: number,
        image: { Url: any; LkDisplayType?: any; },
        IdPogObj?: number,
        guidTmpID?: string,
    ): Svg {
        const tile = 'LkDisplayType' in image && image.LkDisplayType != null ? image.LkDisplayType : 0;
        const encodedURL = image.Url;

        let SVG = `<g transform="scale(1, -1) translate(0, ${translate}) ">
        <filter id="T${ID}" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" >
        <feImage preserveAspectRatio="none" xlink:href="${encodedURL}" x="0" y="0" width="zznewWidthzz" height="zznewHeightzz"/>
        <feTile /></filter><rect class="${posClass} selectionRect"    data-idpog="${IdPogObj ?? guidTmpID}"
          transform="translate(0 ${height}) scale(1 -1)" width="${width}" height="${height}" filter="url(#T${ID})" /></g>`;
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
                        transform="scale(1, -1) translate(0, ${translate}) " xlink:href="${encodedURL}"></image>`;
                }
                SVG = SVG.replace('zznewHeightzz', repeatNew.toString());
                SVG = SVG.replace('zznewWidthzz', width.toString());
                break;
            default:
                return `<image class="${posClass} selectionRect"   data-idpog="${IdPogObj == null ? guidTmpID : IdPogObj}"  id="svgFix${ID}"
                     width="${width}" height="${height}" x="0" y="${y}" preserveAspectRatio="none" transform="scale(1, -1)
                     translate(0, ${translate}) " xlink:href="${encodedURL}"></image>`;
        }
        return SVG;
    }


    public createShelfLabelCustomized(itemData: ObjectListItem, params: Parameters, scale: number, label): Svg {
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

        const labelObj = this.planogramService.getShelfLabelObject(params, itemData,"canvas", label);
        if (this.planogramService.getType(itemData) == 'StandardShelf') {
            labelObj.yshift = 0;
        } else {
            labelObj.yshift = -1;
        }

        return this.createGroup(labelObj, containerInfo, itemData, label);
    }


    public createGroup(labelObj: LabelObject, containerInfo: ContainerInfo, itemData: ObjectListItem, label): Svg {

        const { width, height, rotation } = this.getOrientedContainer(containerInfo, labelObj.orientation);

        const svgTextObject = this.createText(labelObj, width, height, this.bckColorId+label, itemData);

        const svgBackgroundColorDef = `<defs><filter x="0" y="0" width="1" height="1" id="${this.bckColorId+label}">
            <feFlood flood-color="${labelObj.backgroundcolor}" ></feFlood><feComposite in="SourceGraphic"></feComposite></filter></defs>`;

        const translateY = containerInfo.type == AppConstantSpace.CROSSBAROBJ && labelObj.crossLabelDisplay == 'Above'
            ? containerInfo.height + svgTextObject.height / 4
            : svgTextObject.height * labelObj.yshift;
            const calcTextWidthMechanism = this.getTextWidthCalculator(labelObj.calcMechanism);
            const permittedFontSize = labelObj.fontsize / 8;
            const svgTextWidth = calcTextWidthMechanism(labelObj.text, labelObj.fontfamily, permittedFontSize);
            const translateX = (label == 1)? 0.25 : (width - svgTextWidth - 0.25);
            return `<g class="shelfLabelGroup" transform="translate(${translateX},${rotation == 90 ? 0.25 : translateY})
             rotate(${rotation}) scale(1, -1)">${svgTextObject.textSVG}</g>${svgBackgroundColorDef}`;
    }

    public createText(labelObj: LabelObject, availWidth: number, availHeight: number, patternID: string, itemData: ObjectListItem): SvgText {
        //cusotmized
        const permittedFontSize = labelObj.fontsize / 8;
        const permittedWidth = availWidth - (5 * availWidth) / 100;
        const clipPathId = 'flc' + itemData.IDPOGObject;

        const textSVG =
            `<clipPath id= "${clipPathId}"><rect x="-0.25" y="${-(2 * permittedFontSize)}" width="${permittedWidth}" height="${4 * permittedFontSize}" />
            </clipPath><text clip-path= "url(#${clipPathId})" style="-webkit-font-smoothing: none;font-weight:800;font-family:${labelObj.fontfamily};
            font-size:${permittedFontSize}px;fill:${labelObj.fontcolor};text-anchor:start;"  filter="url(#${patternID})">
            ${Utils.replacedHTMLEntityString(labelObj.text)}</text>`;

        return { textSVG, height: permittedFontSize, width: permittedWidth };
    }


    // @og TODO add TTL to avoid memory leaks
    private textWidthCache:{[key:string]:number} = {};

    private getWidthOfTextByCanvas(txt: string, fontname: string, fontsize: number): number {
        const cacheKey = txt+fontname+fontsize;
        const cacheValue = this.textWidthCache[cacheKey];
        if(cacheValue !== undefined) {
            return cacheValue;
        }
        // Create a dummy canvas (render invisible with css)
        const c = document.createElement('canvas');
        // Get the context of the dummy canvas
        const ctx = c.getContext('2d');
        // Set the context.font to the font that you are using
        ctx.font = fontsize + 'px ' + fontname;
        // Measure the string
        let length = ctx.measureText(txt).width;
        if (parseFloat(ctx.font) != fontsize) {
            length = (length * fontsize) / parseFloat(ctx.font);
        }
        // Return width
        //delete ctx;
        // Return width
        this.textWidthCache[cacheKey] = length;
        return length;
    };

    private getWidthOfTextByD3(txt: string, fontname: string, fontsize: number): number {
        const text = txt;

        const plotWidth = 400;

        let plot;
        // = d3.select('#d3-basedcalclabel-temp')
        //     .insert("svg")
        //     .attr('width', plotWidth)
        //     .attr('height', 50);

        // plot.append("text")
        //     .attr("x", plotWidth)
        //     .attr("y", 28)
        //     .attr("font-size", fontsize)
        //     .text(text)

        const text_element = plot.select('text');

        const textWidth = text_element.node().getBBox().width;

        return textWidth;
    }


    public getImageWidth(image: { Url: any; LkDisplayType?: any; }, defaultValue: number) {
        // tslint:disable-next-line: radix
        let Width = parseInt(this.getUrlParameter(image.Url, 'w'));
        if (!(Width > 0)) {
            Width = defaultValue;
        }
        return Width;
    }
    public getImageHeight(image: { Url: any; LkDisplayType?: any; }, defaultValue: number) {
        let Height = parseInt(this.getUrlParameter(image.Url, 'h'));
        if (!(Height > 0)) {
            Height = defaultValue;
        }
        return Height;
    }

    public getUrlParameter(url: string, name: string) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        const regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
        const results = regex.exec(url);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    public getDataIdPog(item: ObjectListItem , defaultId: string): number | string {
      // in PA need to consider productKey for positions and key for other items.
      if(this.parentApp.isAllocateApp) {
        return item.Position ? item.Position.Product.ProductKey : item.Key
      }
      return item.IDPOGObject ?? defaultId;
    }
}

// private

export type Svg = string;

interface Info {
    BottomThickness: number;
    SideThickness: number;
    FrontThickness: number;
}

export interface Parameters {
    idPogObjectArr?: string;
    startWidth?: string;
    endWidth?: string;
    mode?: string;
    customDefs?: string;
    leftShiftOfPage?: number;
    byModular?: boolean;
    totalDimension?: {Width:number;Height:number;clipX:number;};
    annotationFlag?: boolean;
    margin?: string;
    labels?: boolean;
    labelType?: number;
    clipHeight?: number;
    clipY?: number;
    clipWidth?: number;
    clipX?: number;
    byClip?: number;
    shelfLabelFlag?: boolean;
    autoGenPositionLabels?: boolean;
    type?: string;
    generateBoxRect?: any;
    generateSKURect?: boolean;
    generateImageRect?: boolean;
    PegIncrementX?: number;
    PegIncrementY?: number;
    Mode?: string;
    ghostImgGen?: boolean;
}


interface SvgText {
    textSVG: Svg;
    width: number;
    height: number;
}

export interface ContainerInfo {
    type?: string;
    ty?: number;
    lx?: number;
    height: number;
    width: number;
}

