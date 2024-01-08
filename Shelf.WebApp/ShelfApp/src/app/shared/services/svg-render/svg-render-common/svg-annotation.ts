


import * as THREE from 'three';



import { CommonSVG } from './svg-common';
import { AppConstantSpace } from './svg-constants';
import { UtilsSVG } from './svg-utils';

export class AnnotationSVG {

common;
sharedService;
planogramStore;
planogramService;
    constructor(
        sharedService,
        planogramStore,
        planogramService,

    ) {
      this.common = new CommonSVG();
      this.sharedService = sharedService;
      this.planogramStore = planogramStore;
      this.planogramService = planogramService;
    }

    SVGAnnotation(section, scale, params) {
        let SVGAnnotation = '<defs>';
        let colorsUsed = [];
        let colorsUsedConn = [];
        section.annotations.forEach((annotation, pos) => {
            if (annotation.status != 'deleted' && annotation.LkExtensionType != 6) {
                if (colorsUsed.indexOf(annotation.Attribute.style.lncolor) == -1) {
                    colorsUsed.push(annotation.Attribute.style.lncolor);
                    SVGAnnotation += `<marker id="arrow${annotation.Attribute.style.lncolor.substr(1)}" markerWidth="10" markerHeight="10" refx="0" refy="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L9,3 z" fill="${annotation.Attribute.style.lncolor}" /></marker>`;
                }
            }
        });
        section.annotations.forEach((annotation, pos) => {
          if (annotation.status != 'deleted' && annotation.LkExtensionType == 6) {
              if (colorsUsedConn.indexOf(annotation.Attribute.style.lncolor) == -1) {
                colorsUsedConn.push(annotation.Attribute.style.lncolor);
                  SVGAnnotation += `<marker id="arrowConnector${annotation.Attribute.style.lncolor.substr(1)}" viewBox="0 0 20 20" markerWidth="10" markerHeight="10" refx="5" refy="5" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M 0 0 L 20 5 L 0 10 z" fill="${annotation.Attribute.style.lncolor}" /></marker>`;
              }
          }
      });
        SVGAnnotation += '</defs><g transform="scale(' + scale + ', ' + scale + ')">';
        section.annotations.forEach((annotation, pos) => {
            if (annotation.status != 'deleted') {
                SVGAnnotation += this.SVGRendererAnnotation(annotation, scale, params, section); //Code is not implemented yet
            }
        });
        SVGAnnotation += '</g>';
        return SVGAnnotation;
    }




    SVGRendererAnnotation(itemData, scale, params, section) {
        let SVGBlock = '';
        // const annotationObj =  new Annotation(this.sharedService,this.planogramService);

        const containerInfo = {
            height: itemData.Attribute.location.height,
            width: itemData.Attribute.location.width,
            lx: itemData.left(),
            by: itemData.top() - itemData.Attribute.location.height,
            ty: itemData.top(),
        };

        if (params.leftShiftOfPage) {
            containerInfo.lx = containerInfo.lx - params.leftShiftOfPage;
        }

        const labelObj = {
            calcMechanism: 'canvas',
            text: itemData.Content,
            fontsize: parseInt(itemData.Attribute.style.fontsize) || 12,
            fontfamily: itemData.Attribute.style.fontfamily || 'Roboto',
            color: itemData.Attribute.style.color || 'black',
            bgcolor: itemData.Attribute.style.bgcolor || 'red',
            lncolor: itemData.Attribute.style.lncolor || 'red',
            centerTxt: !itemData.truncateByHeight(),
            truncateByHeight: itemData.truncateByHeight(),
            orientation: 0,
            italic: itemData.Attribute.Font?.italic ? 'italic' : 'normal',
            weight: itemData.Attribute.Font?.weight ? 'bold' : 'normal',
            underline: itemData.Attribute.Font?.underline ? 'underline' : 'none',
            direction: itemData.Attribute.location.direction || 3
        };

        let iw, ih, pW, pH;
        if ([1, 5].includes(itemData.LkExtensionType)) {
          const clipID = UtilsSVG.generateGUID();
          SVGBlock += `<rect class="annotation" height="${containerInfo.height}" width="${containerInfo.width}" y="${containerInfo.by}" x="${containerInfo.lx}" fill="${labelObj.bgcolor}" style="stroke: ${labelObj.lncolor}; stroke-width: .1; stroke-dasharray: none;"/><clipPath xmlns="http://www.w3.org/2000/svg" id="${clipID}"><rect  height="${containerInfo.height}" width="${containerInfo.width}" y="${containerInfo.by}" x="${containerInfo.lx}" /></clipPath ><g clip-path="url(#${clipID})">${this.createTextElement(labelObj, containerInfo, params, scale)}</g>`;
        } else if (itemData.LkExtensionType == 4) {
          SVGBlock += `<rect class="annotation" height="${containerInfo.height}" width="${containerInfo.width}" y="${containerInfo.by}" x="${containerInfo.lx}" fill="${labelObj.bgcolor}" style="stroke: ${labelObj.lncolor}; stroke-width: .4; stroke-dasharray: none;"/>`;
        } else if (itemData.LkExtensionType == 6) {
          SVGBlock += `

          <line style="fill: black; stroke-width: 0.125px; stroke: ${labelObj.lncolor} ;" marker-end="url(#arrowConnector${labelObj.lncolor.substr(1)})"
          x1="${[1,4].includes(labelObj.direction)? (containerInfo.lx + containerInfo.width):containerInfo.lx}"
          y1="${[1,2].includes(labelObj.direction)?containerInfo.by:(containerInfo.by + containerInfo.height)}"
          x2="${[2,3].includes(labelObj.direction)? (containerInfo.lx + containerInfo.width)-0.5:containerInfo.lx+0.5}"
          y2="${[3,4].includes(labelObj.direction)?containerInfo.by+0.5:(containerInfo.by + containerInfo.height)-0.5}"/>`;
        } else {
            const stretchImage = !itemData.Attribute.imgDispType ||
                !itemData.Attribute.imgWidth ||
                !itemData.Attribute.imgHeight ||
                itemData.Attribute.imgDispType == 'stretch';
            // If Disp Type is not set or if image width / height is not known or when disp type is stretch


            const fillVal = stretchImage ? labelObj.bgcolor : 'url(#ipop_' + itemData.$id + ')';

            SVGBlock += `<rect class="annotation" transform="scale(${scale}, ${-scale})" height="${containerInfo.height}" width="${containerInfo.width}" y="${-containerInfo.ty}" x="${containerInfo.lx}" fill="${fillVal}" />`;

            if (stretchImage) {
                SVGBlock += `<image  transform="scale(${scale}, ${-scale}) translate(${containerInfo.lx},${-containerInfo.ty})" preserveAspectRatio="none" width="${containerInfo.width}" height="${containerInfo.height}" xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="${itemData.Attribute.imgUrl}"></image>`;
            } else {
                if (itemData.Attribute.imgWidth && itemData.Attribute.imgHeight) {
                    iw = containerInfo.width / 2;
                    ih = (itemData.Attribute.imgHeight * iw) / itemData.Attribute.imgWidth;
                    (pW = 0.5), (pH = ih / containerInfo.height);
                    if (ih > containerInfo.height) {
                        ih = containerInfo.height / 2;
                        iw = (itemData.Attribute.imgWidth * ih) / itemData.Attribute.imgHeight;
                        (pW = iw / containerInfo.width), (pH = 0.5);
                    }
                } else {
                    iw = '100%';
                    ih = '100%';
                    (pW = 1), (pH = 1);
                }

                SVGBlock += `<defs><pattern id="ipop_${itemData.$id}"  width="${pW}" height="${pH}" ><image preserveAspectRatio="xMidYMid slice" xlink:href="${itemData.Attribute.imgUrl}" x="0" y="0" width="${iw}" height="${ih}" /></pattern></defs>`;
            }
        }
        const coord = this.calcConnectorCoord(itemData, section, null);
        if (params.leftShiftOfPage) {
            coord.x1 = coord.x1 - params.leftShiftOfPage;
            coord.x2 = coord.x2 - params.leftShiftOfPage;
        }
        if (coord && !coord.noCallOut) {
            SVGBlock += `<line x1="${coord.x1}" y1="${section.Dimension.Height - coord.y1}" x2="${coord.x2}" y2="${section.Dimension.Height - coord.y2}" style="stroke:${labelObj.lncolor};stroke-width:.2" marker-end="url(#arrow${labelObj.lncolor.substr(1)})"  />`;
        }
        return SVGBlock;
    };



    calcConnectorCoord(annotation, section, parent) {
        // const annotationObj = new Annotation(this.sharedService,this.planogramService);
        const getBottomPoint = (refObj) => {
            switch (refObj.ObjectDerivedType) {
                case 'StandardShelf':
                    return refObj.Fixture.Thickness + 1;
                default:
                    return refObj.Dimension.Height;
            }
        };

        const coord = { x1: 0, y1: 0, z1: undefined, x2: 0, y2: 0, z2: undefined, noCallOut: false }; // Cord will hold x and y position in relation to top left corner as DOM needs it. For SVG this is converted back to from bottom.

        // Y2 should be based on calloutLocation when available. Else use position location.
        let calloutLocation = annotation.Attribute.calloutLocation;
        let calloutAvailable = true;
        let lowest = 0;

        if (!calloutLocation) {
            const refObj = this.sharedService.getObject(annotation.$belongsToID, section.$id);

            coord.noCallOut = !this.isCalloutRequired(refObj, annotation);

            const refObjParent = refObj ? this.sharedService.getParentObject(refObj, section.$id) : null;
            if (
                !refObj ||
                (refObjParent && refObjParent.ObjectDerivedType == 'ShoppingCart') ||
                (UtilsSVG.checkIfFixture(refObj) &&
                    refObj.IDPOGObject == null &&
                    refObjParent.Children.indexOf(refObj) == -1)
            ) {
                annotation.status = 'deleted';
                return;
            } // If the reference object is not present its as good as the annoation being deleted.

            const refX =
                refObj.ObjectDerivedType != 'Section'
                    ? refObj.getXPosToPog() + refObj.Dimension.Width / 2
                    : annotation.left();

            const refY = refObj.ObjectDerivedType != 'Section' ? refObj.getTopYPosToPog() : 0;
            let refZ =
                refObj.ObjectDerivedType != 'Section'
                    ? refObj.getZPosToPog() + refObj.Dimension.Depth
                    : annotation.Attribute.location.locZ
                        ? annotation.Attribute.location.locZ
                        : section.Dimension.Depth;
            refZ = refObj.ObjectDerivedType == 'Modular' ? refObj.getZPosToPog() : refZ;
            refZ =
                refObjParent &&
                    refObjParent.Rotation &&
                    refObjParent.Rotation.X < 0 &&
                    annotation.Attribute.location.locZ
                    ? annotation.Attribute.location.locZ
                    : refZ;
            refZ =
                refObj.Rotation && refObj.Rotation.X < 0 && annotation.Attribute.location.locZ
                    ? annotation.Attribute.location.locZ
                    : refZ;
            calloutAvailable = false;
            calloutLocation = {} ;

            if (
                parent &&
                refObjParent &&
                (refObjParent.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
                    refObjParent.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ)
            ) {
                const threeDObj = parent.getObjectByName(refObj.$id);
                const bb = new THREE.Box3().setFromObject(threeDObj);
                calloutLocation.locZ = bb.max.z;
                calloutLocation.locY = bb.max.y;
                lowest = bb.max.y - bb.min.y;
            } else {
                calloutLocation.locY = section.Dimension.Height - refY;
                calloutLocation.locZ = refZ;
                lowest = getBottomPoint(refObj);
            }
            calloutLocation.locX = refX;
        }

        coord.x2 = calloutLocation.locX;
        coord.y2 = section.Dimension.Height - calloutLocation.locY;
        coord.z2 = calloutLocation.locZ;

        //check if the annotation is on top, left, right, bottom of the pog and accordingly calculate x1, y1.
        // if on top x1 = mid of width, y1 = bottom of annotatin.
        // if on right x1 = left, y1 = mid of height
        // if on left x1 = right, y1 = mid of height
        // if on bottom x1 = mid of width, y1 = top of annotation.
        let position = '';
        if (annotation.top() > section.Dimension.Height || annotation.bottom() > calloutLocation.locY) {
            position = 'top';
        } else if (annotation.top() < 0 || annotation.top() < calloutLocation.locY) {
            if (!calloutAvailable) coord.y2 += lowest; //refObj.Dimension.Height;
            position = 'bottom';
        } else if (annotation.left() > section.Dimension.Width || annotation.right() > calloutLocation.locX) {
            position = 'right';
        } else if (annotation.left() < 0 || annotation.right() < calloutLocation.locX) {
            position = 'left';
        } else {
            position = 'top';
        }

        switch (position) {
            case 'bottom':
            case 'top':
                // No break after top ensures that code moves over to bottom case.
                if (position == 'bottom') {
                    coord.y1 = -annotation.Attribute.location.height;
                }
                coord.x1 = annotation.left() + annotation.Attribute.location.width / 2;
                coord.y1 += section.Dimension.Height - annotation.bottom();
                break;

            case 'left':
            case 'right':
                if (position == 'left') {
                    coord.x1 = annotation.Attribute.location.width;
                }
                coord.x1 += annotation.left();
                coord.y1 = section.Dimension.Height - annotation.top() + annotation.Attribute.location.height / 2;
                break;
        }
        coord.z1 = coord.z2 + 0.1; //(annotation.Attribute.location.locZ) ? annotation.Attribute.location.locZ : section.Dimension.Depth;
        //annotationObj = null;
        return coord;
    };


    isCalloutRequired(refObj, annotation) {
        const AppSettingsSvc = this.planogramStore.appSettings;
        if (annotation.LkExtensionType == 3) {
            return false;
        }
        return !(
            refObj.ObjectDerivedType == AppConstantSpace.SECTIONOBJ ||
            !annotation.Attribute.callout ||
            (!AppSettingsSvc.fixtCallOutOff && refObj.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT) ||
            (!AppSettingsSvc.posCallOutOff && refObj.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT)
        );
    }

    createTextElement(labelObj, containerInfo, params, scale) {
        const { width, height } = this.common.getOrientedContainer(containerInfo, labelObj.orientation);
        const svgTspanObject = this.wrapText(labelObj, width, height);
        const permittedFontSize = labelObj.fontsize / 8;
        return `<text transform="scale(${scale}, ${-scale}) translate(${containerInfo.lx},${-containerInfo.ty})"
        style="font-size:${permittedFontSize}px; fill:${labelObj.color};font-family:${labelObj.fontfamily};
        font-style:${labelObj.italic};font-weight:${labelObj.weight};text-decoration:${labelObj.underline};">${svgTspanObject.textSVG}</text>`;
    }

    wrapText(labelObj, availWidth, availHeight) {
        if (availWidth < 0.1) availWidth = 0.1;
        if (availHeight < 0.1) availHeight = 0.1;
        //cusotmized
        const permittedFontSize = labelObj.fontsize / 8;
        const permittedWidth = availWidth;
        const midPoint = availWidth / 2;


        const lines = labelObj.text.split(/\r?\n|\r/);

        const wrappedTextArr = [];
        const lineDY = permittedFontSize * 1.1;
        //const calcTextWidthMechanism = this.common.getWidthOfTextByCanvas(labelObj.calcMechanism);


        for (const lineItem of lines) {
            const words = lineItem.split(' ');
            let line = '',
                i,
                test,
                metricsWidth;
            for (i = 0; i < words.length; i++) {
                test = words[i];
                let italicBold = (labelObj?.italic=='italic' ? 'italic ' : '' + labelObj?.weight=='bold' ? 'bold' : '').trim();
                metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, italicBold, true);
                while (metricsWidth > permittedWidth) {
                    if (test.length < 1) break;
                    // Determine how much of the word will fit
                    test = test.substring(0, test.length - 1);
                    metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, italicBold, true);
                }
                if (words[i] != test) {
                    words.splice(i + 1, 0, words[i].substr(test.length));
                    words[i] = test;
                }

                if (i === words.length - 1 && (i !== 0 || words[i] !== '')) {
                    test = line + words[i];
                } else {
                    test = line + words[i] + ' ';
                }
                metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, italicBold, true);

                if (metricsWidth > permittedWidth && i > 0) {
                    wrappedTextArr.push(line);
                    line = words[i] + ' ';
                } else {
                    line = test;
                }
                if (words.length > lineItem.length + 1) break;
            }

            wrappedTextArr.push(line);
            if (wrappedTextArr.length > labelObj.text.length + 1) break;
        }

        //for the wrapping rows
        let svgTextHTML = '';
        for (const wrappedText of wrappedTextArr) {
            svgTextHTML += labelObj.centerTxt
                ? `<tspan xml:space="preserve" x="${midPoint}" dy="${lineDY}" text-anchor="middle">${UtilsSVG.replacedHTMLEntityString(wrappedText)}</tspan>`
                : `<tspan xml:space="preserve" x="0" dy="${lineDY+ (wrappedTextArr.indexOf(wrappedText)==0?0:permittedFontSize/3)}">${UtilsSVG.replacedHTMLEntityString(wrappedText)}</tspan>`;
        }

        return { textSVG: svgTextHTML, height: lineDY * (wrappedTextArr.length + 1), width: permittedWidth };
    }
}
