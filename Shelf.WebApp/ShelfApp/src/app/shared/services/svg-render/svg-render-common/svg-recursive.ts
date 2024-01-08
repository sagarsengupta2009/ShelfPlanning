import { UtilsSVG } from "./svg-utils";
import { filter, uniq, each, sortBy } from 'lodash';
import { UprightDrawSVG } from "./svg-uprightdraw";
import { ModularSVG } from "./svg-modular";
import { StandardShelfSVG } from "./svg-standardshelf";
import { BlockSVG } from "./svg-block";
import { BlockFixtureSVG } from "./svg-blockfixture";
import { PegboardSVG } from "./svg-pegboard";
import { GrillSVG } from "./svg-grill";
import { AppConstantSpace } from "./svg-constants";
import { CommonSVG } from "./svg-common";
import { CoffinCaseSVG } from "./svg-coffincase";
import { PositionSVG } from "./svg-position";
import { BaseLabelsCommonService } from "./services/base-labels-common.service";
import { AnnotationSVG } from "./svg-annotation";
import { SectionSVG } from "./svg-section";
export class RecursiveSVG {

  SVG = function (itemData, scale, parameters, planogSvc, planogStore, sharedSvc, jquerySvc, config, window) {
    //services
    //     let planogSvc = this.planogramService;
    // let planogStore = this.planogramStore;
    // let sharedSvc = this.sharedService;
    //
    //renderers
    let Utils = new UtilsSVG();
    let sectionDrawer = new SectionSVG();
    let uprightDrawer = new UprightDrawSVG();
    let modularSvgRender = new ModularSVG();
    let annotationSvgRender = new AnnotationSVG(sharedSvc, planogStore, planogSvc);
    let sectionViewMode = planogSvc.rootFlags[itemData.$id]?.mode;
    let ModeCls = `planoDrawMode${sectionViewMode ? sectionViewMode : 0}`;
    let allModularCollection = itemData.Children.filter((obj) => obj.ObjectDerivedType == AppConstantSpace.MODULAR);
    //let allModularCollection = sharedSvc.getAllModulars(itemData);


    //let sectionClassObj = new Section(this.snackBar, this.translate,  this.sharedService, this.planogramService, public newProductInventoryService: NewProductInventoryService, public QuadtreeUtilsService: QuadtreeUtilsService);
    itemData.showAnnotation = parameters ? parameters.annotationFlag : 0; // On save for Thumbnail we do not want annotation. planogramSettings.rootFlags[itemData.$id].isAnnotationView;
    /**
     * Reset static Params calculations everytime the SVG is generated.
     */
    let staticParams = { nextX: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
    let Height = scale * itemData.getHeight();
    let Width = scale * itemData.getWidth();
    let annotationDimensitonLeft = itemData.showAnnotation ? itemData.getAnnotationDimensionLeft() : 0;
    staticParams.maxX = itemData.Dimension.Width + itemData.anDimension.right;
    staticParams.maxY = itemData.Dimension.Height + itemData.anDimension.top;

    if (parameters) {
      if (parameters.generateImageRect) {
        ModeCls = 'planoDrawMode0';
      } else if (parameters.generateBoxRect) {
        ModeCls = 'planoDrawMode1';
      } else if (parameters.generateSKURect) {
        ModeCls = 'planoDrawMode2';
      }
    }
    let highLightCls = 'highlightOff';
    if (parameters) {
      if (parameters.highLight === 'highlightOn') {
        highLightCls = parameters.highLight;
      }
    }
    let customizedLabelCls = 'customizedLabel-on';
    let positionNumLabelCls = 'positionLabel-off';
    let shelfLabelCls = 'shelfLabel-off';
    let imageModeLabelCls = 'imageModeLabel-on';
    let pegboardLableOn = 'pegboardLabel-on';
    if (parameters) {
      if (!parameters.generateImageRect && !parameters.labels) {
        customizedLabelCls = 'customizedLabel-off';
      }
      if (parameters && parameters.autoGenPositionLabels) {
        imageModeLabelCls = 'imageModeLabel-on'; // Ensure that if Image does not exist then User setting based position label is shown.
      }
    }
    if (!planogStore.appSettings.showLabelIfNoPackageImage) {
      imageModeLabelCls = 'imageModeLabel-off';
    }

    planogSvc && !planogSvc.labelOn && (customizedLabelCls = 'customizedLabel-off');
    let SVGAuthPatternDef = UtilsSVG.generateProductAuthSVGPattern(planogStore.appSettings.ProductAuthPattern);
    let SVGAuthPatternCSS = UtilsSVG.generateProductAuthCSS(planogStore.appSettings.ProductAuthPattern, 'SVG');

    let SVGLabelPatternDef1 = UtilsSVG.generateLabelBGSVGPattern(planogSvc.labelItem, 1);
    let SVGLabelPatternDef2 = UtilsSVG.generateLabelBGSVGPattern(planogSvc.labelItem, 2);
    let margin;
    let boxExtension = 0.05;
    let SVGBlock = ''
    SVGBlock = this.SVGElement(itemData, 1, parameters, staticParams, planogSvc, planogStore, sharedSvc,itemData, config, window);
    //        let SVGBlock = (new RecursiveSVG()).SVGElement(itemData, 1, parameters, staticParams, planogSvc, planogStore, sharedSvc);
    staticParams.minX = Math.min(staticParams.minX, -itemData.anDimension.left);
    staticParams.minY = Math.min(staticParams.minY, -itemData.anDimension.bottom);
    let extensionX = staticParams.maxX ? Math.max(staticParams.maxX, Width) * boxExtension : Width * boxExtension;
    let extensionY = staticParams.maxY - staticParams.minY ? Math.max(staticParams.maxY - staticParams.minY, Height) * boxExtension : Height * boxExtension;
    let clipPath = '';
    let clipDefs = '';
    let clipX = 0;
    let clipY = 0;
    let clipW = staticParams.maxX - staticParams.minX ? Math.max(staticParams.maxX - staticParams.minX, Width) : Width;
    let clipH = staticParams.maxY - staticParams.minY ? Math.max(staticParams.maxY - staticParams.minY, Height) : Height;
    let customDefs = '';
    if (parameters) {
      if (parameters.margin) {
        margin = parameters.margin.trim();
        if (margin.slice(-1) == '%') {
          let marginValue = parseFloat(margin.slice(0, -1)) / 100;
          extensionX = Width * marginValue;
          extensionY = Height * marginValue;
        } else {
          let marginValue = parseFloat(margin);
          extensionX = marginValue;
          extensionY = marginValue;
        }
      }
      //we got 2 types of labels, either one can be printed
      if (parameters.labels) {
        if (parameters.labelType == 1) {
          positionNumLabelCls = 'positionLabel-on';
        }

        if (parameters.labelType == 2) {
          customizedLabelCls = 'customizedLabel-on';
        }
      }
      if (parameters.shelfLabelFlag && planogStore.appSettings.shelfLabelOn) {
        shelfLabelCls = 'shelfLabel-on';
      }

      //print by cliping width and points
      if (parameters.byClip) {
        let clipParams = 0;
        if (parameters.clipX) {
          clipX = parameters.clipX;
          clipParams++;
        }
        if (parameters.clipY) {
          clipY = parameters.clipY;
          clipParams++;
        }
        if (parameters.clipWidth) {
          clipW = parameters.clipWidth;
          clipParams++;
        }
        if (parameters.clipHeight) {
          clipH = parameters.clipHeight;
          clipParams++;
        }
        //If any of the Clip params have a value then create a clip path
        if (clipParams > 0) {
          clipPath = ' clip-path="url(#POG-Clip)" ';
          clipDefs = `<defs><clipPath id="POG-Clip"><rect x="${clipX}" y="${clipY}" width="${clipW}" height="${clipH}"/></clipPath></defs>`;
        }
      }
      //print by modular
      if (parameters.byModular && parameters.totalDimension) {
        clipW = parameters.totalDimension.Width;
        clipX = parameters.totalDimension.clipX || 0;

        // In case annotation starts to the left of the Section than first modular should display it. Hence additional width to clip.
        let anLeftClipConsider = !parameters.leftShiftOfPage ? annotationDimensitonLeft : 0;

        clipPath = ' clip-path="url(#POG-Clip)" ';
        clipDefs = `<defs><clipPath id="POG-Clip"><rect x="${clipX - anLeftClipConsider}" y="${clipY}"
                      width="${clipW + anLeftClipConsider}" height="${clipH}"/></clipPath></defs>`;

        let viewBoxXAdditions = itemData.showAnnotation
          ? itemData.getAnnotationDimensionLeft() + itemData.getAnnotationDimensionRight()
          : 0;
        clipW += viewBoxXAdditions;
      }
      customDefs = parameters.customDefs || '';
    }
    let moduleDefs = '';

    for (let j = 0; j < allModularCollection.length; j++) {
      let modular = allModularCollection[j];
      moduleDefs += `<shelf:modular modular='${j + 1}' IDPOGObject='${modular.IDPOGObject}' clipX='${modular.getXPosToPog()}'\
                          width='${modular.Dimension.Width}' />`;
    }
    let viewbox = ` viewBox="${clipX - extensionX + staticParams.minX} ${-extensionY} ${clipW + 2 * extensionX} ${clipH + 2 * extensionY}" `;
    let SVGHeader =
      ` class="${ModeCls} ${highLightCls} ${customizedLabelCls} ${imageModeLabelCls} ${positionNumLabelCls} ${shelfLabelCls} ${pegboardLableOn}"\
          version="1.1" width="100%" height="100%"${viewbox}xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"\
          xmlns:shelf="http://www.symphonyretailsolutions.com/shelf"><defs><shelf:pog IDPOG='${itemData.IDPOG}' />\
          <shelf:modularList>${moduleDefs}</shelf:modularList></defs>${customDefs ? '<defs><shelf:pageList>' + customDefs + '</shelf:pageList></defs>' : ''}\
          ${SVGAuthPatternDef}${SVGLabelPatternDef1}${SVGLabelPatternDef2}${clipDefs}<style type="text/css" >\
          <![CDATA[@font-face { font-family: "Roboto"; font-style: normal; font-weight: 400; src: local("Roboto"), local("Roboto-Regular"),\
          url(https://fonts.gstatic.com/s/roboto/v15/CWB0XYA8bzo0kSThX0UTuA.woff2) format("woff2");\
          unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215, U+E0FF, U+EFFD,\
           U+F000;}\
           text.positionLabel {font-size:1px; text-anchor:start; font-family:Roboto;}rect.positionLabel-background {fill:#ffffff; opacity: .75;}\
           .positionLabel-off g.positionLabelGroup{ display: none; }\
           .positionLabel-on g.positionLabelGroup{ display: block; }\
           g.customizedLabelGroup-auth-code-pattern{ display: block; }\
           g.customizedLabel-auth-code-pattern{ display: block; }\
           .customizedLabel-off g.customizedLabelGroup{ display: none; }\
           .customizedLabel-on g.customizedLabelGroup{ display: block; }\
           .customizedLabel-on g.customizedLabel{ display: block !important; }\
           .imageModeLabel-off g.customizedLabel{ display: none; }\
           .imageModeLabel-on g.customizedLabel{ display: block !important; }\
           .shelfLabel-off g.shelfLabelGroup{ display: none; }\
           .shelfLabel-on g.shelfLabelGroup{ display: block; }\
           .annotation { stroke:#000; stroke-width:0.05; stroke-linecap:round; stroke-dasharray:0.1,0.2,0.1; }\
           rect.posBox, circle.posBox { stroke: Black;stroke-width: 0.1;}\
           image.posImage, rect.posImage, circle.posImage {stroke: Black;stroke-width: 0.1;}\
           image.highlightPosImage, rect.highlightPosImage, circle.highlightPosImage {stroke: red !important;stroke-width: 0.5 !important;}\
           rect.posSKU {stroke: Black;stroke-width: 0.1;}\
           .planoDrawMode0 .posBox {display: none;}\
           .planoDrawMode0 .posSKU {display: none;}\
           .planoDrawMode1 .posImage {display: none;}\
           .planoDrawMode1 .posSKU {display: none;}\
           .planoDrawMode2 .posImage {display: none;}\
           .planoDrawMode2 .posBox {display: none;}\
           .autoGenLabelGroup text {display: none;}`;
   if (planogStore.appSettings.turnOnPegItemLabels) {
      SVGHeader += `.pegboardLabel-on g.svgPegboard .customizedLabelGroup{ display: block; }\
          .pegboardLabel-on g.svgPegboard .customizedLabel{ display: block; }\
          .pegboardLabel-on g.svgSlotwall .customizedLabelGroup{ display: block; }\
          .pegboardLabel-on g.svgSlotwall .customizedLabel{ display: block; }\
          .pegboardLabel-on g.svgCrossbar .customizedLabelGroup{ display: block; }\
          .pegboardLabel-on g.svgCrossbar .customizedLabel{ display: block; }`;
    }
    if (parameters) {
      if (parameters.highLight === 'highlightOn') {
       SVGHeader += `.highlightOn .highlightCls {display: 'block'}\
      .highlightOn.planoDrawMode2 .posSKU {fill: transparent; filter: grayscale(100%);}\
      .highlightOn.planoDrawMode1 .posBox {fill: transparent; filter: grayscale(100%);}\
      .highlightOn.planoDrawMode0 .posImage {fill: transparent; filter: grayscale(100%);}\
      .highlightOn .highlightRect {display: block !important; opacity: 0.4 !important;}\
      .highlightOn .highlightRectWithoutImage {display: block !important;}\
      .planoDrawMode0 .highlightRect {display: none;}\
      .planoDrawMode1 .highlightRect {display: none;}\
      .planoDrawMode2 .highlightRect {display: none;}`;
      }
    }
    
    if (parameters && parameters.autoGenPositionLabels) {
      let prefLen = planogSvc.imageReportLabelField.length;
      for (let k = 0; k < prefLen; k++) {
        let eachAutoPref = planogSvc.imageReportLabelField[k];
        SVGHeader += `.${eachAutoPref.ClassName} .autoGenLabelGroup.${eachAutoPref.ClassName}-txt text {display: block;}`;
      }
    }
    SVGHeader += ']]> </style>';
    SVGHeader += SVGAuthPatternCSS;
    let SVGTail = '</g>';
    SVGTail += '</svg>';
    let SVGSection = sectionDrawer.SVGSection(itemData, config, window);
    let SVGUpright = uprightDrawer.SVGPog(itemData, sharedSvc.measurementUnit);
    let SVGModularFront = modularSvgRender.SVGModularFront(itemData, 1, config, window);
    let SVGAnnotation = annotationSvgRender.SVGAnnotation(itemData, 1, parameters);
    SVGHeader += '<g transform="translate(0, ' + staticParams.maxY + ') scale(1, -1)" ' + clipPath + '>';
    let SVGBlocks = `${SVGHeader}${SVGSection}${SVGUpright}${SVGBlock}${SVGModularFront}`;
    SVGBlocks = SVGBlocks.replace(/\n|\s\s+/g, ' ');/** Converting some strings to template literals have had its side effects of adding extra spaces and new line char.Removing new line charecters and extra spaces from SVGBlock */
    SVGBlock = `<svg minx='${staticParams.minX}' minY='${staticParams.minY}' maxX='${staticParams.maxX}' maxY='${staticParams.maxY}'${SVGBlocks}${SVGAnnotation}${SVGTail}`;
    // Find all the urls in the SVG and make sure all lone ampersands (&) are converted their entity reference (&amp);
    let urlList = [];
    urlList = filter(
      uniq(
        SVGBlock.match(
          /\b((?:https?:\/\/|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/g,
        ),
      ),
      (u) => (u).indexOf('&') > 0,
    );
    each(
      urlList,
      (url) =>
        (SVGBlock = UtilsSVG.replaceAll(url, UtilsSVG.replaceAll('&amp;amp;', '&amp;', UtilsSVG.replaceAll('&', '&amp;', url)), SVGBlock)),
    );
    if ((SVGBlock.match(/svgPegboard|svgCrossbar|svgSlotwall|svgModular/g) || []).length > 0) {
      // commented code is for later removal of jQuery
      // Object assign does not do deep copy so needs replcing
      //const xmlStr = SVGBlock;
      //const parser = new DOMParser();
      //const SVGDoc = parser.parseFromString(xmlStr, "application/xml");
      //let mods = SVGDoc.querySelectorAll(".svgModular");
      //let drawMods = Object.assign(mods);
      ////drawMods.addClass("svgMadularB").removeClass("svgModular");
      ////mods.children(":not(g)").remove();
      ////drawMods.children("g").remove()
      //let zpa = [];
      //let twz = Array.from(SVGDoc.querySelectorAll('.svgFixture')).filter(d => d['zPos'] != '0')
      //twz.forEach(element => {
      //  zpa.push(element.attributes['zPos'].value)
      //});
      //zpa = _.sortBy(_.uniq(zpa), function (val) { return parseFloat(val); });
      //let mods1 = Object.assign(mods);
      //let mods2 = Object.assign(mods);
      //SVGDoc.querySelectorAll('.svgFixture')
      ////mods2.find(".fixtureGroup").remove();
      //SVGBlock = (new XMLSerializer()).serializeToString(SVGDoc);
      var SVGDoc;
      var SvgQ;
      if (!jquerySvc) {
        SVGDoc = $.parseXML(SVGBlock);
        SvgQ = $(SVGDoc);
      } else {
        SVGDoc = jquerySvc.parseXML(SVGBlock);
        SvgQ = jquerySvc(SVGDoc);
      }

      var mods = SvgQ.find('.svgModular');
      var drawMods = mods.clone();
      drawMods.addClass('svgMadularB').removeClass('svgModular');
      mods.children(':not(g)').remove();
      drawMods.children('g').remove();
      var zpa = [];
      var twz = mods.find('.svgFixture').filter("[zPos!='0']");
      twz.each(function (o) {
        zpa.push(twz[o].attributes['zPos'].value);
      });
      zpa = sortBy(uniq(zpa), function (val) {
        return parseFloat(val);
      });
      var mods1 = mods.clone();
      var mods2 = mods.clone();
      mods2.find('.fixtureGroup').remove();
      mods.find('.svgPosition').remove();
      mods1.find('.svgFixture').filter("[zPos='0']").remove();
      mods.find('.svgFixture').filter("[zPos!='0']").remove();
      SvgQ.find('.svgModular').first().before(drawMods);
      SvgQ.find('.svgModular').last().after(mods2);
      each(zpa, function (zPos) {
        var modF = mods1.clone();
        var modP = mods2.clone();
        modF.find('.svgFixture')
          .filter("[zPos!='" + zPos + "']")
          .remove();
        modP.find('.svgFixture')
          .filter("[zPos!='" + zPos + "']")
          .remove();
        SvgQ.find('.svgModular').last().after(modF);
        SvgQ.find('.svgModular').last().after(modP);
      });
      try {
        SVGBlock = new XMLSerializer().serializeToString(SVGDoc);
      } catch (error) {
        SVGBlock = SVGDoc.documentElement.outerHTML;
      }
    }
    return SVGBlock;
  }

  SVGElement = function (element, scale, params, staticParams, planogSvc, planogStore, sharedSvc,sectionObj, config, window, clipboardFixture = null) {
    staticParams.nextX = 0;
    return this.createItems(element, scale, params, staticParams, planogSvc, planogStore, sharedSvc, sectionObj, null, config, window, clipboardFixture);
  }

  createItems = function (object, scale, params, staticParams, planogSvc, planogStore, sharedSvc, sectionObj, parentItemData, config, window, cbFixture = null,clipboardparams=null) {
    //renderers
    let standardshelfSvgRender = new StandardShelfSVG();
    let modularSvgRender = new ModularSVG();
    let blockSvgRender = new BlockSVG();
    let blockFixtureSvgRender = new BlockFixtureSVG();
    let pegSlotCrossSvgRender = new PegboardSVG();
    let grillSvgRender = new GrillSVG();
    let common = new CommonSVG();
    let coffincaseSvgRender = new CoffinCaseSVG();
    let positionSvgRender = new PositionSVG();
    let labelCommonService = new BaseLabelsCommonService(planogSvc);
    //
    //getFrontLocation should check
    let x = 0;
    let y = 0;
    let SVG;
    let ChildOffset;
    let onlyCoffinCase = false;
    //let sectionClassObj = new Section(this.snackBar, this.translate,  this.sharedService, this.planogramService, null);

    if (object.Location) {
      // let fixtureClassObj = new Fixture(this.snackBar, this.translate,  this.sharedService)
      let frontLocation = object.Location;
      if ('getFrontLocation' in object) {
        if (
          object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
          object.ObjectDerivedType == AppConstantSpace.BASKETOBJ
        ) {
          if (planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY) {
            frontLocation = object.getFrontLocation();
          } else {
            //let sectionObj = this.sharedService.getObject(object.$sectionID, object.$sectionID) as Section;
            onlyCoffinCase = sectionObj.containsOnlyCoffinCaseFamily();
            //top view offsets
            frontLocation = object.getFrontLocation(!onlyCoffinCase, onlyCoffinCase);
          }
        } else {
          frontLocation = object.getFrontLocation();
        }
      }
      //This is to distinguish from other SVG generation processes , In clip board SVG process fixtures location needs to zero
      if (params && params.mode == 'CBSVG') {
        params = {};
        clipboardparams = { origin: object.ObjectDerivedType, mode: 'CBSVG'}
      } else {
        x = frontLocation ? frontLocation.X : 0;
      }
      y = frontLocation ? frontLocation.Y : 0;
      if (object.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
        //let parentItemData = this.sharedService.getObject(object.$idParent, object.$sectionID);
        if (
          parentItemData &&
          (parentItemData.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
            parentItemData.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ)
        ) {
          if (planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY) {
            if (!parentItemData.Fixture.DisplayViews) {
              y = frontLocation ? frontLocation.Z : 0;
            }
          } else {
            // let sectionObj = this.sharedService.getObject(
            //     parentItemData.$sectionID,
            //     parentItemData.$sectionID,
            // ) as  Section;
            onlyCoffinCase = sectionObj.containsOnlyCoffinCaseFamily();
            if (!onlyCoffinCase) {
              //front view
              y = frontLocation ? frontLocation.Z : 0;
            }
          }
        }
      }

      //this is for modular print mode for merchandizing report
      //so lets print it on the starting
      if (params && params.byModular && object.ObjectDerivedType == AppConstantSpace.MODULAR) {
        x = staticParams.nextX;
        staticParams.nextX += object.Dimension.Width;
      }
      x = x ?? 0;
      y = y ?? 0;
    }
    if (object.ObjectDerivedType === 'Position') {
      const defaultId = sharedSvc.link == 'allocate' ? object.Position.Product.ProductKey : object.TempId;
      SVG = `<g class="svg${object.ObjectDerivedType}" data-idpog="${common.getDataIdPog(object, defaultId, window)}"
                   transform="translate(${x},${y})" id="svgG${object.$id}">`;
      if (cbFixture) {
        SVG += `<title>${cbFixture ? UtilsSVG.replacedHTMLEntityString(cbFixture["tooltipMsg"]) : undefined}</title>`;
      }

    } else {
      let zPos = object.Location ? 'zPos="' + object.Location.Z + '"' : 'zPos="0"';
      if (object.ObjectDerivedType == 'StandardShelf')
        zPos = object.Location ? 'zPos="' + (object.Location.Z + object.Dimension.Depth) + '"' : 'zPos="0"';
      let fixClass = object.ObjectType == 'Fixture' && object.ObjectDerivedType != 'Modular' ? ' svgFixture ' : '';
      SVG = `<g class="svg${object.ObjectDerivedType}${fixClass}" transform="translate(${x},${y})" id="svgG${object.$id}" ${zPos}>`;
    }

    // rendererName = 'SVG-' + object.ObjectDerivedType + 'Renderer';
    // let l = $injector.get(rendererName);
    //SVG += this.rendererName(object, 1, params);
    switch (object.ObjectDerivedType) {
      case 'StandardShelf':
        SVG += standardshelfSvgRender.SVGShelfRenderer(object, 1, params, planogSvc, config, window);
        break;
      case 'Modular':
        SVG += modularSvgRender.SVGModularRenderer(object, 1, config, window);
        break;
      case 'Position':
        SVG += positionSvgRender.SVGPosition(object, 1, params, sectionObj, parentItemData, planogSvc, planogStore, labelCommonService, config, window,clipboardparams);
        break;
      case 'CoffinCase':
      case 'Basket':
        SVG += coffincaseSvgRender.SVGCoffincase(object, 1, params, planogSvc, planogStore, sectionObj, config, window);
        break;
      case 'Pegboard':
      case 'Slotwall':
      case 'Crossbar':
        SVG += pegSlotCrossSvgRender.renderPegboard(object, 1, params, planogSvc, sharedSvc.measurementUnit, config, window);
        break;
      case 'BlockFixture':
        SVG += blockFixtureSvgRender.renderBlockFixture(object, 1, params, planogSvc, config, window);
        break;
      case 'Block':
        SVG += blockSvgRender.renderBlockSvg(object);
        break;
      default:
        break;
    }

    if (object.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
      object.ObjectDerivedType == AppConstantSpace.BASKETOBJ) {
      if (!planogStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY) {
        ChildOffset = object.getRenderingChildOffsetFor2D(!onlyCoffinCase, onlyCoffinCase); //should check
      }
      else {
        ChildOffset = object.getRenderingChildOffsetFor2D();
      }
    } else {
      ChildOffset = object.ChildOffset;
    }

    SVG += `<g transform="translate(${ChildOffset.X},${ChildOffset.Y})" >`;
    if (object.Children) {
      let array = [];
      array = Array.from(object.Children);
      let cbarray;
      if (cbFixture) {
        cbarray = Array.from(cbFixture);
      }
      if (object.ObjectDerivedType == 'StandardShelf') {
        let filteredArray = array.filter((item) => item['ObjectDerivedType'] == 'Block');
        for (let g = 0; g < array.length; g++) {
          if (array[g]?.ObjectDerivedType === 'Block') {
            delete array[g];
          } else {
            filteredArray.push(array[g]);
          }
        }
        array = filteredArray;
      }
      let length = array.length;
      for (let i = 0; i < length; i++) {
        let newObject = array[i];
        let cbFixturePosition = cbarray ? cbarray[i] : null;
        if (newObject.ObjectDerivedType == 'ShoppingCart') {
          continue;
        }
        if ([AppConstantSpace.DIVIDERS, AppConstantSpace.GRILLOBJ].indexOf(newObject.ObjectDerivedType) == -1) {
          staticParams.minX = Math.min(
            staticParams.minX,
            newObject.getXPosToPog() ? newObject.getXPosToPog() : staticParams.minX,
          );
          staticParams.minY = Math.min(
            staticParams.minY,
            newObject.getYPosToPog() ? newObject.getYPosToPog() : staticParams.minY,
          );
          staticParams.maxX = Math.max(
            staticParams.maxX,
            newObject.getXPosToPog()
              ? newObject.getXPosToPog() + newObject.getRenderingDimensionFor2D().Width
              : staticParams.maxX,
          );
          staticParams.maxY = Math.max(
            staticParams.maxY,
            newObject.getYPosToPog()
              ? newObject.getYPosToPog() + newObject.getRenderingDimensionFor2D().Height
              : staticParams.maxY,
          );
        }
        if (params && params.byModular && object.ObjectDerivedType == AppConstantSpace.SECTIONOBJ) {
          //only recurse through these object
          if (params.idPogObjectArr.indexOf(newObject.IDPOGObject) != -1) {
            SVG += this.createItems(newObject, scale, params, staticParams, planogSvc, planogStore, sharedSvc, sectionObj, object, config, window);
          }
        } else {
          if (
            params ||
            params?.startWidth ||
            !params?.startWidth ||
            newObject.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT ||
            (newObject.getXPosToPog() <= params?.endWidth &&
              newObject.getXPosToPog() + newObject.Dimension.Width >= params?.startWidth)
          ) {
            SVG += this.createItems(newObject, scale, params, staticParams, planogSvc, planogStore, sharedSvc, sectionObj, object, config, window, cbFixturePosition,clipboardparams);
          } else {
            if (newObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
              console.log('Skipped ' + newObject.Position.Product.Name);
            }
          }
        }
      }
    }
    SVG += '</g>';

    //if ($injector.has(rendererName)) {
    //  let renderer = $injector.get(rendererName);
    //  if ('SVGPost' in renderer) {
    //    SVG += renderer.SVGPost(object, 1);
    //  }
    switch (object.ObjectDerivedType) {
      case 'StandardShelf':
        SVG += grillSvgRender.SVGGrill(object, 1, window);
        break;
      default:
        break;
    }

    return SVG + '</g>';
  }
}
