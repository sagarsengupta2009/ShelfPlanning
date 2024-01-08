import { CommonSVG } from "./svg-common";
import { AppConstantSpace } from "./svg-constants";
import { OrientationBase } from "./svg-orientation";
import { UtilsSVG } from "./svg-utils";



export class PositionSVG {
  planogramStore;
  sectionObj;
  parentItemData;
  planogramService;
  common;
  labelsCommonService;
  config;
  orientation = new OrientationBase();
  strokeWidth = 0.1;
  labelFieldDetails;
  overlapOccured;
  labelFieldObj1;
  labelFieldObj2;
  labelFieldObj3;
  reDrawLabels = { //to redraw label when we do not have overlap but still with middle alignments labels get overlaps
    draw: false,
    label: 0,
    yAlign: 0
  };
  bothVerticelOrientation = false;
  bothHorizontalOrientation = false;
  bothDifferentOrientation = {
    status: false,
    labelHorizontal: 0
  };
  constructor() {
    this.common = new CommonSVG();
  }

  //----------position-----//
  SVGPosition(itemData, scale, params, sectionObj, parentItem, planogSvc, planogStore, labelCommonService, configSvc, window,clipboardparams=null) {
    if (!params) {
      params = {};
    }
    params.Mode = 'SVG';
    var SVGBlock = this.SVGPositionRenderer(itemData, scale, params, false, itemData.$sectionID, sectionObj, parentItem, planogSvc, planogStore, labelCommonService, configSvc, window,clipboardparams);
    return SVGBlock;
  }

  flipHeightDepth(parentItemData, considerDisplayViewsFlag) {
    if (
      parentItemData?.ObjectDerivedType == AppConstantSpace.BASKETOBJ ||
      parentItemData?.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ
    ) {
      return !(this.planogramStore.appSettings.CONSIDER_DISPLAY_VIEW_ONLY
        ? parentItemData.Fixture.DisplayViews
        : (considerDisplayViewsFlag
          ? parentItemData.Fixture.DisplayViews
          : this.sectionObj.containsOnlyCoffinCaseFamily()));
    } else {
      return false;
    }
  }

  SVGPositionRenderer(position, scale, params, considerDisplayViewsFlag, sectionID, sectionObj, parentItem, planogSvc, planogStore, labelCommService, configSvc, window,clipboardparams=null) {
    this.planogramService = planogSvc;
    this.planogramStore = planogStore;
    this.labelsCommonService = labelCommService;
    this.config = configSvc;
    this.sectionObj = sectionObj;
    this.parentItemData = parentItem;
    if (window) {
      window.checkImageerror = (ele) => { //check fallback image in generated svg
        const imgFallback = `${this.config?.fallbackImageUrl}`;
        ele.setAttribute('xlink:href', imgFallback);
        const posId = ele.getAttribute('dataitem-id');
        const currentPos = position;
        currentPos.imageFailed = true;
      };
    } else {
      global.checkImageerror = (ele) => { //check fallback image in generated svg
        const imgFallback = `${this.config?.fallbackImageUrl}`;
        ele.setAttribute('xlink:href', imgFallback);
        const posId = ele.getAttribute('dataitem-id');
        const currentPos = position;
        currentPos.imageFailed = true;
      };
    }
    this.labelsCommonService.fromService = "2D";
    this.overlapOccured = false;
    this.bothVerticelOrientation = false;
    this.bothHorizontalOrientation = false;
    this.bothDifferentOrientation = {
      status: false,
      labelHorizontal: 0
    };
    this.labelFieldDetails = {};
    this.reDrawLabels = {
      draw: false,
      label: 0,
      yAlign: 0
    };
    const currentLabel1 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'];
    const currentLabel2 = this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'];
    this.labelFieldObj1 = this.getLabelCustomizedObject(params, this.planogramService.labelField1, position, currentLabel1, 1);
    this.labelFieldObj2 = this.getLabelCustomizedObject(params, this.planogramService.labelField2, position, currentLabel2, 2);
    this.labelFieldObj3 = this.getLabelCustomizedObject(params, ['Position.attributeObject.WhiteSpaceText'], position, currentLabel1, 0);
    let labelFirst = this.labelsCommonService.getWhichLabelTORender(position, this.labelFieldObj1, this.labelFieldObj2);
    let labelSecond = labelFirst == 1 ? 2 : 1;
    let wide;
    let high;
    let orientation;
    let SKUHeight = position.Dimension.Height;
    let width;
    let height;
    let SVGBlock = '';
    let trayHeight = 0;
    let trayColor = 'black';
    let trayThickness = 1;
    let trayTOffset = trayThickness/2;
    let trayOffsetX = 0;
    let isTray = position.Position.ProductPackage.IdPackageStyle == 1;
    let isCase = position.Position.ProductPackage.IdPackageStyle == 2;
    let dividerWidth = 0;
    const ColorCode = position.getColorForView();
    let authCode = position.getAuthCodeForView();

    let opacity = !params.ghostImgGen && parentItem.ObjectDerivedType == 'StandardShelf' && parentItem.Fixture.ForegroundImage?.Url && (position.Location.X >= 0 && (position.Location.X + position.Dimension.Width) <= parentItem.Dimension.Width) ? 0 : 1;

    if (parentItem.ObjectDerivedType == 'StandardShelf' && position.Position.EdgeImage?.Url) {
      let common = new CommonSVG();
      let posEdgeImageWidth = position.Dimension.Width;
      let posEdgeImageHeight = parentItem.Fixture.Thickness * Math.cos(UtilsSVG.degToRad(parentItem.Rotation.X));
      let posEdgeImage = common.TwoDCreateTiledImage('positionEdgeImage',
      `positionEdgeImage${position.$id}`,
       posEdgeImageWidth,
       posEdgeImageHeight,
       0,
       0,
       position.Position.EdgeImage,
       position.IDPOGObject,
       position.TempId,
       this.config,
       window);
      SVGBlock += `<g transform="translate(0, 0)" opacity="${opacity}">${posEdgeImage}</g>`;
    }
    //let parentItemData = this.sharedService.getObject(position.$idParent, position.$sectionID);

    if (this.parentItemData && !this.parentItemData.Fixture.DisplayViews && considerDisplayViewsFlag) {
      SKUHeight = this.flipHeightDepth(this.parentItemData, considerDisplayViewsFlag)
        ? position.Dimension.Depth
        : position.Dimension.Height;
    }

    const SKUWidth = position.Dimension.Width;
    let baseOrientation = position.Position.IDOrientation;
    params.generateImageRect = params.generateImageRect ?? true;
    params.generateBoxRect = params.generateBoxRect ?? true;
    params.generateSKURect = params.generateSKURect ?? true;
    const invalidPegWeightCap = position.validationForPegRod();
    const customClass = invalidPegWeightCap ? "highlightPosImage" : '';
    if (position.$packageBlocks != undefined && position.$packageBlocks.length) {
      for (let pBlockNum = 0; pBlockNum < position.$packageBlocks.length; pBlockNum++) {
        // loading values into local letiable for clarity and to shorten some of the code below
        const packageBlock = position.$packageBlocks[pBlockNum];
        if ('viewIn2D' in packageBlock && !packageBlock.viewIn2D) {
          continue;
        }

        wide = packageBlock.wide;

        //code for front view display of products in basket
        //parentItemData = this.sharedService.getObject(position.$idParent, position.$sectionID);
        high = packageBlock.high;
        orientation = packageBlock.orientation & 0x1f;
        const flipHeightDepth = this.flipHeightDepth(this.parentItemData, considerDisplayViewsFlag);
        if (flipHeightDepth) {
          high = packageBlock.deep;
          orientation = this.orientation.LayoverOrientationCoffinTypes[packageBlock.orientation] & 0x1f;
        }
        if (pBlockNum == 0) baseOrientation = orientation;
        wide = packageBlock.wide;
        let pgapX = 0;
        let pgapY = 0;
        // view will need to change based on the POV of this POG for now it is just from the Front
        const view = this.orientation.View.Front;

        // the two function "GetDimensions" and "GetImageFaceAndRotation" require Orientation.js and orientaion to be one the enumerations list in Orientations.js
        //@commented by millan for squeeze in x direction
        const dimensions = this.orientation.GetDimensions(
          orientation,
          false,
          view,
          position.Position.ProductPackage.Width,
          position.Position.ProductPackage.Height,
          position.Position.ProductPackage.Depth,

        );
        //Uncommented for squeez to work in 3d as we are getting squeezed value from compute methods@Narendra
        //let dimensions = itemData.GetDimensions(orientation, false, view, itemData.computeWidth(), itemData.computeHeight(), itemData.computeDepth());
        width = packageBlock.isUnitCap ? position.unitDimensions.unitWidth : dimensions.Width + position.getShrinkWidth() + position.getSKUGap(true, dimensions.Width + position.getShrinkWidth());
        height = packageBlock.isUnitCap ? position.unitDimensions.unitHeight : dimensions.Height + position.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);

        //This params is peg information of pegboard over which you are dragging the item. To generate the ghostimage.
        if (params.PegIncrementY !== undefined || params.PegIncrementX !== undefined) {
          if (params.PegIncrementY < 0.01) params.PegIncrementY = 0.01;
          pgapY =
            Math.ceil((height + position.Position.GapY) / params.PegIncrementY) * params.PegIncrementY -
            height;
          if (params.PegIncrementX < 0.01) params.PegIncrementX = 0.01;
          pgapX =
            Math.ceil((width + position.Position.GapX)+position.pegOffsetX / params.PegIncrementX) * params.PegIncrementX -
            (width+position.pegOffsetX); // do we have nesting ?- nesting.Width
        } else {
          pgapY = flipHeightDepth ? packageBlock.gapZ : packageBlock.gapY;
          pgapX = packageBlock.gapX;
        }

        let { x, y } = packageBlock;

        if (packageBlock.type == 'divider') {
          dividerWidth = wide;
          y = SKUHeight - high;
          SVGBlock += `<g transform="translate(${x}, ${0})" ><rect width="${wide}" height="${high}" fill="${packageBlock.color}" opacity="${opacity}" /></g> `;
          continue;
        }
        if (packageBlock.x == dividerWidth && packageBlock.y == 0 && packageBlock.z == 0) {
          trayHeight = height / 2;
          if (parentItem.Fixture.HasDividers &&              position.getDividerInfo(parentItem)?.Type == 1){
            trayOffsetX = dividerWidth;
          }
        }
        const faceAndRotation = this.orientation.GetImageFaceAndRotation(orientation, false, view);
        const face = faceAndRotation.Face;
        const imageRotation = faceAndRotation.Rotation;
        // Need to convert face to imageURL
        // imageURlfromView() is defined after this functions, but should be somewhere else
        const imageUrl = position.getImageURlfromView(face, packageBlock.isUnitCap);
        // The package block should be able to be rendered using:
        // x, y, wide, high, width, height, imageURL, and rotation
        // This is an example using the same div type from before
        // We shoould look at replacing this with something simpler if not SVG
        const imageFallback = this.config?.fallbackImageUrl;
        let symbol = '';
        let useClip = false;
        const com = new CommonSVG();
        const idpog = com.getDataIdPog(position, position.TempId, window);

        let displayUnitsForTrayAndCase = (cssClass) => {
          let displayUnitsForTrayAndCase = this.planogramStore.appSettings.DisplayUnitsForTrayAndCase;
          if (displayUnitsForTrayAndCase && (isTray || isCase) && (packageBlock.type === 'product' && !packageBlock.isUnitCap)) {
            let unitPackageItemInfos = sectionObj.UnitPackageItemInfos.filter((unitDim) => { return unitDim.IDProduct == position.Position.IDProduct; })[0];
            const unitDimensions = this.orientation.GetDimensions(
              orientation,
              false,
              view,
              unitPackageItemInfos.Width,
              unitPackageItemInfos.Height,
              unitPackageItemInfos.Depth,
            );

            let marginOfError = this.planogramStore.appSettings.CutCaseMarginOfError ?? 0;
            let unitsX = Math.floor((width / unitDimensions.Width) + marginOfError);
            let unitsY = Math.floor((height / unitDimensions.Height) + marginOfError);
            let unitWidth = (unitDimensions.Width * unitsX) > width
              ? unitDimensions.Width - (((unitDimensions.Width * unitsX) - width) / unitsX)
              : unitDimensions.Width;
            let unitHeight = (unitDimensions.Height * unitsY) > height
              ? unitDimensions.Height - (((unitDimensions.Height * unitsY) - height) / unitsY)
              : unitDimensions.Height;
            let showGap = this.planogramStore.appSettings.DisplayGapForExtraSpaceInTrayAndCase;
            let unitsXGap = showGap ? (width % unitWidth) / (unitsX + 1) : 0;
            let xLocation = unitsXGap;
            let yLocation = 0;
            for (let y = 0; y < unitsY; y++) {
              for (let x = 0; x < unitsX; x++) {
                symbol += `<rect class="${cssClass} ${customClass}" x="${xLocation}" y="${yLocation}" width="${unitWidth}" height="${unitHeight}" fill="${ColorCode}"/>`;
                xLocation += unitWidth + unitsXGap;
              }
              yLocation += unitHeight;
              xLocation = unitsXGap;
            }
          }
        }
        if (params.generateImageRect) {
          if (imageUrl != null && imageUrl.length > 4) {
            const createImage = (width, height, x, y) =>
              `<image class="posImage" transform="scale(1, -1) translate(${x}, ${y}) ${imageRotation ? `rotate(${imageRotation})` : ''}"
                                preserveAspectRatio="none" width="${width}" height="${height}" data-idpog="${idpog}" dataItem-id="${position.$id}" xlink:href="${imageUrl}" onError="window.checkImageerror(this)"/>
                                ${invalidPegWeightCap ? `<rect class="posImage ${customClass}" width="${width}" height="${height}" fill="none"/>` : ''}`;
            switch (imageRotation) {
              case 0:
                symbol += createImage(width, height, 0, -height);
                break;
              case 90:
                symbol += createImage(height, width, width, -height);
                break;
              case 180:
                symbol += createImage(width, height, width, 0);
                break;
              case 270:
                symbol += createImage(height, width, 0, 0);
                break;
            }
            useClip = true;
          } else {
            if ('shape' in packageBlock && packageBlock.shape == 'CylZ') {
              symbol += `<circle class="posImage ${customClass}" r="${width / 2}" cx="${width / 2}" cy="${width / 2
                }" fill="${ColorCode}"/>`;
            } else {
              symbol += `<rect class="posImage ${customClass}" width="${width}" height="${height}" fill="${ColorCode}"/>`;
              displayUnitsForTrayAndCase("posImage");
            }
          }
        }

        if (params) {
          if (params.highLight === 'highlightOn') {
            const fillcolor = params.highLightPosition.filter((item) => item['idPogObject'] == position.IDPOGObject)[0].backgroundColor;
            if (params.generateImageRect) {
              if (imageUrl != null && imageUrl.length > 4) {
                symbol += `<rect class="highlightRect" width="${width}" height="${height}" fill="${fillcolor}"/>`;
              }
              else {
                symbol += `<rect class="highlightRectWithoutImage" width="${width}" height="${height}" fill="${fillcolor}"/>`;
              }
            }
            else {
              symbol += `<rect class="highlightRectWithoutImage" width="${width}" height="${height}" fill="${fillcolor}"/>`;
            }
          }
        }
        else {
          symbol += `<rect class="highlightRect" width="${width}" height="${height}" fill="${ColorCode}"/>`;
        }

        if (params.generateBoxRect) {
          if ('shape' in packageBlock && packageBlock.shape == 'CylZ') {
            symbol += `<circle class="posBox ${customClass}" r="${width / 2}" cx="${width / 2}" cy="${width / 2
              }" fill="${ColorCode}"/>`;
          } else {
            symbol += `<rect class="posBox ${customClass}"  width="${width}" height="${height}" fill="${ColorCode}"/>`;
            displayUnitsForTrayAndCase("posBox");
          }
        }

        let clippath = '';
        if (useClip && 'shape' in packageBlock && packageBlock.shape == 'CylZ') {
          clippath = " clip-path='url(#clipCircle)'";
          SVGBlock += `<clipPath id='clipCircle'><circle r='${width / 2}' cx='${width / 2}' cy='${width / 2
            }' /></clipPath>`;
        }

        if (
          (this.parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
          this.parentItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
          this.parentItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) && (clipboardparams?.origin!='CB')
        ) {
          let pegInfo = position.getPegInfo();
          let xPegHole = parseFloat(position.Position.ProductPegHole1X) || width*0.1;
          let x2PegHole;
          let isDoubleHole =  pegInfo.FrontBars ==2;
          let yPegHole = parseFloat(position.Position.ProductPegHoleY) || height - 0.25 * 2.54;
          if (this.parentItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ && pegInfo.IsPegTag &&
            !UtilsSVG.isNullOrEmpty(pegInfo.TagXOffset) &&
            !UtilsSVG.isNullOrEmpty(pegInfo.TagYOffset)) {
            if (!(pegInfo.TagXOffset == 0 && pegInfo.TagYOffset == 0)) {
              symbol += `<use href="#${position.$id + '_TagSVG'}" x="${-position.Location.X}" y="${-position.Location.Y}"></use>`
            }
          }
          symbol += `<circle cx="${xPegHole}"
                        cy="${yPegHole}" r="0.250"></circle>`;

          if (isDoubleHole) {
            x2PegHole = position.Position.ProductPegHole2X || width * 0.9;
            symbol += `<circle cx="${parseFloat(x2PegHole)}"
              cy="${yPegHole}" r="0.250"></circle>`;
          }
        }

        let whitespaceWidth = 0;
        let fx;
        let addWhiteSpace = (itemData, val) => {
          whitespaceWidth = itemData.Position.attributeObject.WhiteSpaceWidth - 0.3;
          let fields = [];
          let height = itemData.Dimension.Height;
          fields.push('Position.attributeObject.WhiteSpaceText');
          fx = val == 2 ? 0 : (wide * width) + (--wide * pgapX);
          let currentFixture = this.parentItemData;
          if (currentFixture.Fixture.HasDividers) {
            let dividerInfo = itemData.getDividerInfo(currentFixture);
            if (dividerInfo) fx += dividerInfo.Width;
          }
          // params.xAlignment = 0;
          params.type = AppConstantSpace.WHITESPACE;
          SVGBlock += `<g class="WhiteSpaceLabel" transform="translate(${fx}, ${height})  rotate(0) scale(1, -1)" opacity="${opacity}">
                    <rect class="posImage ${customClass}" width="${whitespaceWidth}" height="${height}"  fill="${ColorCode}" style="stroke-width: 0.3;"/>`;
          let textField1 = this.createLabelCustomized(
            itemData,
            fields,
            'WhiteSpaceLabel',
            params,
            considerDisplayViewsFlag, 1
          )['svgTextObject'].textSVG;
          SVGBlock += textField1;
          SVGBlock += '</g>';

          params.type = '';
        };

        if (
          position.Position.attributeObject.WhiteSpacePosition == 2 &&
          position.Position.attributeObject.WhiteSpaceWidth > 0
        ) {
          addWhiteSpace(position, 2);
        }

        for (let h = 0; h < high; h++) {
          for (let w = 0; w < wide; w++) {
            let fx = w * width + whitespaceWidth;
            if (w > 0) fx += w * pgapX;
            let fy = h * height;
            if (h > 0) fy += h * pgapY;
            SVGBlock += `<g transform="translate(${x + fx}, ${y + fy})" opacity="${opacity}" ${clippath}>${symbol}</g>`;
          }
        }

        if (
          position.Position.attributeObject.WhiteSpacePosition == 1 &&
          position.Position.attributeObject.WhiteSpaceWidth > 0
        ) {
          addWhiteSpace(position, 1);
        }
      }
    }
    else{
      const orientation = position.Position.IDOrientation & 0x1f;
      const view = this.orientation.View.Front;
      const faceAndRotation = this.orientation.GetImageFaceAndRotation(orientation, false, view);
      const imageRotation = faceAndRotation.Rotation;
      const face = faceAndRotation.Face;
      const imageUrl = position.Position.imageUrl = position.getImageURlfromView(face);
      const createImage = (width, height, x, y) =>
          `<image class="posImage" transform="scale(1, -1) translate(${x}, ${y}) ${imageRotation ? `rotate(${imageRotation})` : ''}"
      preserveAspectRatio="none" width="${width}" height="${height}" dataItem-id="${position.$id}" xlink:href="${imageUrl}" onError="window.checkImageerror(this)"/>`;
      const dimensions = this.orientation.GetDimensions(
        orientation,
        false,
        view,
        position.Position.ProductPackage.Width,
        position.Position.ProductPackage.Height,
        position.Position.ProductPackage.Depth,
      );

      if (imageUrl != null && imageUrl.length > 4) {
      SVGBlock += `<g opacity="${opacity}">` + createImage(dimensions.Width, dimensions.Height, 0, -dimensions.Height) + '</g>';
      }
      else {
      SVGBlock += `<g opacity="${opacity}"><rect class="posImage" width="${dimensions.Width}" height="${dimensions.Height}" fill="${ColorCode}"/></g>`;
      }
    }
    //(AuthCode != '' || AuthCode != 'auth-code-pattern0')
    //we dont need posSKU when fully authorized bcz no pattern
    if (params.generateSKURect || params.Mode == 'DOM' || !(authCode == '' || authCode == 'auth-code-pattern0')) {
      let fgClass = opacity == 0 ? "FGFront" : '';
      SVGBlock += `<rect class="posSKU selectionRect ${authCode} ${fgClass}"  width="${SKUWidth}" height="${SKUHeight}" fill="${ColorCode}"/>`;
      if (invalidPegWeightCap) {
        let opacitySKU = 0.75;
        SVGBlock += `<rect class="posSKU ${customClass} ${fgClass}" width="${SKUWidth}" height="${SKUHeight}" fill="none" style="opacity:${opacitySKU}"/>`;
      }
    }
    if (isTray) {
      SVGBlock += `<g class="tray" opacity="${opacity}">
                <line x1="${trayTOffset + trayOffsetX}" y1="${trayTOffset}" x2="${trayTOffset + trayOffsetX}" y2="${trayHeight + trayTOffset}" stroke="${trayColor}" stroke-width="${trayThickness}"></line>
                <line x1="${SKUWidth - trayTOffset}" y1="${trayTOffset}" x2="${SKUWidth - trayTOffset}" y2="${trayHeight + trayTOffset}" stroke="${trayColor}" stroke-width="${trayThickness}"></line>
                <line x1="${trayOffsetX}" y1="${trayTOffset}" x2="${SKUWidth}" y2="${trayTOffset}" stroke="${trayColor}" stroke-width="${trayThickness}"></line>
                </g>`
    }
    const imageSide = ['front', 'left', 'top', 'back', 'right', 'bottom'][
      Math.floor(baseOrientation / 4)
    ];
    const productImage = Boolean(position.Position.ProductPackage.Images[imageSide]);
    //checking Label for peg is enabled
    let showPegLabel2 = this.planogramService.isPegboardLabelEnabled2 && this.parentItemData.ObjectDerivedType.toLowerCase() == AppConstantSpace.PEGBOARD ? true : false;
    let showPegLabel1 = this.planogramService.isPegboardLabelEnabled1 && this.parentItemData.ObjectDerivedType.toLowerCase() == AppConstantSpace.PEGBOARD ? true : false;
    let labelCheckCondition = {};
    labelCheckCondition[labelFirst] = {
      showPegLabel: labelFirst == 1 ? showPegLabel1 : showPegLabel2,
      labelFeildisEnabled: labelFirst == 1 ? this.planogramService.labelFeild1isEnabled : this.planogramService.labelFeild2isEnabled,
      labelField: labelFirst == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2,
      isPegboardLabelEnabled: labelFirst == 1 ? this.planogramService.isPegboardLabelEnabled1 : this.planogramService.isPegboardLabelEnabled2,
      labelNumber: labelFirst == 1 ? 1 : 2
    }
    labelCheckCondition[labelSecond] = {
      showPegLabel: labelSecond == 1 ? showPegLabel1 : showPegLabel2,
      labelFeildisEnabled: labelSecond == 1 ? this.planogramService.labelFeild1isEnabled : this.planogramService.labelFeild2isEnabled,
      labelField: labelSecond == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2,
      isPegboardLabelEnabled: labelSecond == 1 ? this.planogramService.isPegboardLabelEnabled1 : this.planogramService.isPegboardLabelEnabled2,
      labelNumber: labelSecond == 1 ? 1 : 2
    }
    if (productImage) {
      if (labelCheckCondition[labelFirst].showPegLabel) {
        if (labelCheckCondition[labelFirst].labelFeildisEnabled) {//both labels are true
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, 'customizedLabelGroup', labelCheckCondition[labelFirst].labelNumber, labelCheckCondition[labelFirst].labelField)
        }
      }
      if (!labelCheckCondition[labelFirst].isPegboardLabelEnabled) {
        if (labelCheckCondition[labelFirst].labelFeildisEnabled) {//both labels are true
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, 'customizedLabelGroup', labelCheckCondition[labelFirst].labelNumber, labelCheckCondition[labelFirst].labelField)
        }
      }
      if (labelCheckCondition[labelSecond].showPegLabel) {
        if (labelCheckCondition[labelSecond].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, 'customizedLabelGroup', labelCheckCondition[labelSecond].labelNumber, labelCheckCondition[labelSecond].labelField)
        }
      }
      if (!labelCheckCondition[labelSecond].isPegboardLabelEnabled) {
        if (labelCheckCondition[labelSecond].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, 'customizedLabelGroup', labelCheckCondition[labelSecond].labelNumber, labelCheckCondition[labelSecond].labelField)
        }
      }


    }
    if (!productImage || !(authCode == '' || authCode == 'auth-code-pattern0')) {
      let className = 'customizedLabel' + (!(authCode == '' || authCode == 'auth-code-pattern0') ? '-auth-code-pattern' : '') + '';
      if (labelCheckCondition[labelFirst].showPegLabel) {
        if (labelCheckCondition[labelFirst].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, className, labelCheckCondition[labelFirst].labelNumber, labelCheckCondition[labelFirst].labelField)
        }
      } if (!labelCheckCondition[labelFirst].isPegboardLabelEnabled) {
        if (labelCheckCondition[labelFirst].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, className, labelCheckCondition[labelFirst].labelNumber, labelCheckCondition[labelFirst].labelField)
        }
      }
      if (labelCheckCondition[labelSecond].showPegLabel) {
        if (labelCheckCondition[labelSecond].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, className, labelCheckCondition[labelSecond].labelNumber, labelCheckCondition[labelSecond].labelField)
        }
      } if (!labelCheckCondition[labelSecond].isPegboardLabelEnabled) {
        if (labelCheckCondition[labelSecond].labelFeildisEnabled) {
          this.labelCreationMethod(position, params, considerDisplayViewsFlag, className, labelCheckCondition[labelSecond].labelNumber, labelCheckCondition[labelSecond].labelField)
        }
      }
    }

    if (params && params.autoGenPositionLabels) {
      let prefLen = this.planogramService.imageReportLabelField.length;
      for (let k = 0; k < prefLen; k++) {
        const eachAutoPref = this.planogramService.imageReportLabelField[k];
        let authClassName = 'autoGenLabelGroup ' + eachAutoPref.ClassName + '-txt';
        if (labelCheckCondition[labelFirst].showPegLabel) {
          if (labelCheckCondition[labelFirst].labelFeildisEnabled && labelCheckCondition[labelFirst].labelField) {
            this.labelCreationMethod(position, params, considerDisplayViewsFlag, authClassName, labelCheckCondition[labelFirst].labelNumber, eachAutoPref.fields)
          }
        } if (!labelCheckCondition[labelFirst].isPegboardLabelEnabled) {
          if (this.planogramService.labelFeild2isEnabled && labelCheckCondition[labelFirst].labelField) {
            this.labelCreationMethod(position, params, considerDisplayViewsFlag, authClassName, labelCheckCondition[labelFirst].labelNumber, eachAutoPref.fields)
          }
        }
        if (labelCheckCondition[labelSecond].showPegLabel) {
          if (labelCheckCondition[labelSecond].labelFeildisEnabled && labelCheckCondition[labelSecond].labelField) {
            this.labelCreationMethod(position, params, considerDisplayViewsFlag, authClassName, labelCheckCondition[labelSecond].labelNumber, eachAutoPref.fields)
          }
        }
        if (!labelCheckCondition[labelSecond].isPegboardLabelEnabled) {
          if (labelCheckCondition[labelSecond].labelFeildisEnabled && labelCheckCondition[labelSecond].labelField) {
            this.labelCreationMethod(position, params, considerDisplayViewsFlag, authClassName, labelCheckCondition[labelSecond].labelNumber, eachAutoPref.fields)
          }
        }
      }
    }
     if (this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1, this.labelFieldObj2) && !UtilsSVG.isNullOrEmpty(this.labelFieldDetails) && JSON.stringify(this.labelFieldDetails) != '{}' && Object.entries(this.labelFieldDetails).length == 2){
      this.labelsCommonService.checkForLabelHeights(position, this.labelFieldDetails, this.labelFieldObj1, this.labelFieldObj2, this, false)
    }
    if (this.labelFieldDetails[1]?.svgHTML && clipboardparams?.mode!= 'CBSVG') {
      SVGBlock += this.labelFieldDetails[1].svgHTML;
    }
    if (this.labelFieldDetails[2]?.svgHTML && clipboardparams?.mode!= 'CBSVG') {
      SVGBlock += this.labelFieldDetails[2].svgHTML;
    }
    return SVGBlock;
  }

  labelCreationMethod(position, params, considerDisplayViewsFlag, className, LabelNumber, labelField) { // common method to call label creation
    if (labelField.length) {
      this.createLabelCustomized(
        position,
        labelField,
        className,
        params,
        considerDisplayViewsFlag, LabelNumber
      )
    }
    return '';
  }
  createLabelCustomized(
    position,
    labelFields,
    className,
    params,
    considerDisplayViewsFlag, label
  ) {
    //let parentItemData = this.sharedService.getObject(position.$idParent, position.$sectionID);
    const flipHeightDepth = this.flipHeightDepth(this.parentItemData, considerDisplayViewsFlag);
    let ht = flipHeightDepth ? position.Dimension.Depth : position.Dimension.Height;

    let wd = position.Dimension.Width;
    if (params.type === AppConstantSpace.WHITESPACE &&
      position.Position.attributeObject.WhiteSpacePosition > 0 &&
      position.Position.attributeObject.WhiteSpaceWidth > 0
    ) {
      wd = position.Position.attributeObject.WhiteSpaceWidth - 0.8;
    }
    if (ht == 0 || wd == 0 || UtilsSVG.isNullOrEmpty(ht) || UtilsSVG.isNullOrEmpty(wd)) {
      return ''; // as any used to avoid breakin
    }
    //only positions the group according to alignment
    //for now bottom left
    const containerInfo = {
      height: ht,
      width: wd,
      x: 0,
      y: 0,
    };
    const currentLabel = this.planogramService.labelItem['POSITION_LABEL']['LABEL_' + label];
    //For whitespace we need to pass the created label configuration.
    const labelObj = className == 'WhiteSpaceLabel' ? this.labelFieldObj3 :label == 1 ? this.labelFieldObj1 : this.labelFieldObj2;
    const res = this.createShelfGroup(labelObj, className, containerInfo, position, flipHeightDepth, currentLabel, label, params);
    if (this.labelFieldDetails[label]) {
      this.labelFieldDetails[label].parameters = {
        labelFields: labelFields,
        className: className,
        params: params,
        considerDisplayViewsFlag: considerDisplayViewsFlag
      }
    }
    return res;
  }

  // refactoring this function is part of another user story
  getLabelCustomizedObject(params, labelFields, itemData, currentLabel, label) {
    let tempObj = {};
    let tempstr = '';
    let temparr = [];
    let tempword;
    for (let i = 0; i < labelFields.length; i++) {
      tempword = itemData;
      temparr = labelFields[i].split('.');
      try {
        for (let j = 0; j < temparr.length; j++) {
          tempword = tempword[temparr[j]];
        }
        if (tempword === undefined) {
          tempword = UtilsSVG.replaceAll('\xB7', '.', UtilsSVG.replaceAll('\\n', '\n', labelFields[i]));
        }
        tempword = tempword === null ? '' : tempword;
        if (typeof tempword == 'number' && Math.floor(tempword) != tempword) {
          tempword = currentLabel.DECIMALS != -1 ? tempword.toFixed(currentLabel.DECIMALS) : tempword;
        }
        if (typeof tempword != 'string' || tempword.trim() || tempword == '\n') {
          tempstr += tempword + ' ';
        }
      } catch (e) {
        console.error(labelFields[i] + ' could not be found in ' + 'this.ObjectDerivedType');
      }
    }
    tempObj['text'] = tempstr;

    //for font
    tempObj['fontsize'] = currentLabel.FONT_SIZE;
    tempObj['fontcolor'] = currentLabel.FONT_COLOR;
    tempObj['fontfamily'] = currentLabel.FONT_FAMILY;
    tempObj['fontStyle'] = currentLabel.FONT_STYLE;
    if (tempObj['fontfamily'] == undefined || tempObj['fontfamily'].length < 1) {
      tempObj['fontfamily'] = 'Roboto';
    }
    tempObj['backgroundcolor'] = currentLabel.BACKGROUND_COLOR;
    tempObj['opacity'] = currentLabel.TRANSPARENCY / 100;
    tempObj['strokecolor'] = currentLabel.STROKE_COLOR;

    //orientation
    tempObj['orientation'] = currentLabel.LABEL_ORIENTATION;

    //alignments
    tempObj['alignment'] = currentLabel.VERTICAL_ALIGNMENT;
    tempObj['yAlignment'] = currentLabel.HORIZONTAL_ALIGNMENT; // horizontal and vertical are mixed up in the DB and configuration, so need to assign to something logical here
    tempObj['xAlignment'] = currentLabel.VERTICAL_ALIGNMENT; // horizontal and vertical are mixed up in the DB and configuration, so need to assign to something logical here
    tempObj['yAlignment'] = typeof tempObj['yAlignment'] == 'number' ? tempObj['yAlignment'] : parseInt(tempObj['yAlignment']);
    tempObj['xAlignment'] = typeof tempObj['xAlignment'] == 'number' ? tempObj['xAlignment'] : parseInt(tempObj['xAlignment']);

    //decimals
    tempObj['decimals'] = currentLabel.DECIMALS || -1;
    //word wrap
    tempObj['wordwrap'] = currentLabel.WORD_WRAP;

    //shrink to fit
    tempObj['shrinkToFit'] = currentLabel.SHRINK_TO_FIT;

    tempObj['stretchToFacing'] = currentLabel.STRECH_TO_FACING;

    //character width calc mchanism
    tempObj['calcMechanism'] = 'canvas';

    if (params) {
      tempObj = { ...tempObj, ...params };
    }

    return tempObj;
  }

  createShelfGroup(labelObj, className, containerInfo, position,
    flipHeightDepth, currentLabel, label, params) {
    let { width, height, rotation } = this.common.getOrientedContainer(containerInfo, labelObj.orientation);
    let svgTextObject;

    const bckColorId = 'customlabelbackgroundcolor' + label + ''; //'backgroundcolor-' + itemData.$id;
    let borderId = 'customLabelBorder' + label + '';

    let yOffset = 0;
    let xOffset = 0;
    let layovery = 0;
    if (this.labelsCommonService.checkLabelsShrinkFitStatus(this.labelFieldObj1, this.labelFieldObj2)) {
      labelObj.xAlignment = this.labelsCommonService.getXAlignForShrinkFit(label, labelObj, this.labelFieldObj1, this.labelFieldObj2, this);
    }
    let xAlign = rotation == 90 ? 2 - labelObj.yAlignment : labelObj.xAlignment;
    let yAlign = rotation == 90 ? 2 - labelObj.xAlignment : labelObj.yAlignment;
    let svgGHTML = '';
    if (currentLabel.STRECH_TO_FACING == false) {//true for stretchfacings
      let filteredPackageBlocks = position.$packageBlocks?.filter(d => !d.hasOwnProperty('layoverUnder'));
      for (let packageBlock of filteredPackageBlocks) {
        let orientation = packageBlock.orientation & 0x1f;
        const view = this.orientation.View.Front;
        const dimensions = this.orientation.GetDimensions(
          orientation,
          false,
          view,
          position.Position.ProductPackage.Width,
          position.Position.ProductPackage.Height,
          position.Position.ProductPackage.Depth,

        );
        width = dimensions.Width + position.getShrinkWidth() + position.getSKUGap(true, dimensions.Width + position.getShrinkWidth());
        height = flipHeightDepth ? dimensions.Depth + position.getShrinkDepth() : dimensions.Height + position.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);
        let swapWidth = rotation == 90 ? height : width;
        let swapHeight = rotation == 90 ? width : height;
        svgTextObject = this.createShelfText(labelObj, swapWidth, swapHeight, bckColorId, borderId, currentLabel, label, position, params);
        svgTextObject.rotateDeg = rotation;
        yAlign = this.labelsCommonService.checkForHorizontalYalign(yAlign, height, labelObj, this.labelFieldDetails, this, this.labelFieldObj1, this.labelFieldObj2, position, label)

        let high = flipHeightDepth ? packageBlock.deep : packageBlock.high;
        const packageBlockWide = rotation == 90 ? high : packageBlock.wide;
        high = rotation == 90 ? packageBlock.wide : high;
        for (let h = 0; h < high; h++) {
          for (let w = 0; w < packageBlockWide; w++) {
            switch (xAlign) {
              case 0: //Left
                xOffset = this.strokeWidth;
                break;
              case 1: //Center
                xOffset = ((swapWidth - svgTextObject.width) / 2) - this.strokeWidth; //stroke-width value is 0.1
                break;
              case 2: //Right
                xOffset = swapWidth - svgTextObject.width - ((labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2) + this.strokeWidth / 2); // strokewidth/2 is nothing but dx value
                break;
            }
            switch (yAlign) {
              case 0: //Top
                yOffset = swapHeight - svgTextObject.height - 0.25;
                break;
              case 1: //Middle
                yOffset = (swapHeight - svgTextObject.height) / 2;
                break;
              case 2: //Bottom
                yOffset = 0.25;
                break;
            }
            yOffset = yOffset + swapHeight * h;
            xOffset = xOffset + swapWidth * w;
            const xPos = rotation == 90 ? yOffset : xOffset;
            const yPos = rotation == 90 ? xOffset : yOffset + svgTextObject.height;
            let shelfGroup = '';
            if (svgTextObject.textSVG) {
              shelfGroup = `<g class="${className}"  transform="translate(${xPos},${yPos}) rotate(${rotation}) scale(1, -1)">${svgTextObject.textSVG}</g>`;
              if (params?.Mode?.includes('SVG')) {
                shelfGroup = `<svg height="${swapHeight * (h + 1)}" width="${swapWidth * (w + 1)}" >` + shelfGroup + `</svg>`
              }
            }
            svgGHTML += shelfGroup;

          }
        }
        // layovery = swapHeight * packageBlock.high;
      }
    } else {



      svgTextObject = this.createShelfText(labelObj, width, height, bckColorId, borderId, currentLabel, label, position, params);
      svgTextObject.rotateDeg = rotation;
      this.labelFieldDetails[label].yAlign = yAlign;
      yAlign = this.labelsCommonService.checkForHorizontalYalign(yAlign, height, labelObj, this.labelFieldDetails, this, this.labelFieldObj1, this.labelFieldObj2, position, label)
      switch (xAlign) {
        case 0: //Left
          xOffset = this.strokeWidth;
          break;
        case 1: //Center
          xOffset = ((width - svgTextObject.width) / 2) - this.strokeWidth;
          break;
        case 2: //Right
          xOffset = width - svgTextObject.width - ((labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2) + this.strokeWidth / 2);
          break;
      }
      switch (yAlign) {
        case 0: //Top
          yOffset = height - svgTextObject.height - 0.25;
          break;
        case 1: //Middle
          yOffset = (height - svgTextObject.height) / 2;
          break;
        case 2: //Bottom
          yOffset = 0.25;
          break;
      }
      const xPos = rotation == 90 ? yOffset : xOffset;
      const yPos = rotation == 90 ? xOffset - this.strokeWidth : svgTextObject.height + yOffset;
      svgTextObject.xPos = xPos;
      svgTextObject.yPos = yPos;
      svgGHTML = `<g class="${className}" yalign="${yAlign}" Xalign="${xAlign}" transform="translate(${xPos},${yPos}) rotate(${rotation}) scale(1, -1)">${svgTextObject.textSVG}</g>`;
      if (params?.Mode?.includes('SVG')) {
        let swapWidth = rotation == 90 ? height : width;
        let swapHeight = rotation == 90 ? width : height;
        svgGHTML = `<svg height="${swapHeight}" width="${swapWidth}" >` + svgGHTML + `</svg>`
      }
    }
    if (this.labelFieldDetails[label]) {
      this.labelFieldDetails[label]['svgHTML'] = svgGHTML;
    }

    return { svgHTML: svgGHTML, svgTextObject: svgTextObject };
  }

  createTextForWordWrapOff(labelObj, availWidth, availHeight, patternID, borderId, label, params, position) {
    //cusotmized
    const permittedFontSize = labelObj.fontsize / 8;
    const permittedWidth = availWidth - (5 * availWidth) / 100;
    const dx = this.strokeWidth / 2;
    const urlCurrent = ''; //= window.location.pathname + window.location.search;
    let lines = labelObj.text.trim().split(/[\n\r]+/);
    let text = lines.join('')?.trim();
    const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
    const lineDY = permittedFontSize * 1.25;
    let fontWeight = labelObj.fontStyle == 'bold' ? labelObj.fontStyle  : 'normal';
    let width, metricsWidth;
    width = metricsWidth = UtilsSVG.getWidthOfTextByCanvas(text, labelObj.fontfamily, permittedFontSize, fontWeight);

    if (width > permittedWidth) {
        let test = text;
        while (metricsWidth > permittedWidth) {
          // Determine how much of the word will fit
          test = test.substring(0, test.length - 1);
          metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, fontWeight);
        }
        if (test.length < 4) {
          let labelFieldsSelected = label == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2;
          if (labelFieldsSelected.some(f => f === 'Position.PositionNo')) {
            if (label == 1) {
              lines = this.getLabelCustomizedObject(params, ['Position.PositionNo'], position, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1)['text'].trim().split(/[\n\r]+/);
            } else {
              lines = this.getLabelCustomizedObject(params, ['Position.PositionNo'], position, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2)['text'].trim().split(/[\n\r]+/);
            }
            lines.unshift('#');
            text = lines.join('')?.trim();
            width = UtilsSVG.getWidthOfTextByCanvas(text, labelObj.fontfamily, permittedFontSize, fontWeight);
          } else {
            text = '';
          }
        }
      }

      let svgTextHTML = '';

      if (text) {
        let bgColor = this.planogramService.labelItem['POSITION_LABEL']["LABEL_" + label]["BACKGROUND_COLOR"];
        let fontStyleData = labelObj.fontStyle == 'bold' ? `font-weight:${labelObj.fontStyle};` : (labelObj.fontStyle == 'italic' ? `font-style:${labelObj.fontStyle}` : '');
        let strokeColor = this.planogramService.labelItem['POSITION_LABEL']["LABEL_" + label]["STROKE_COLOR"];
        let rectWidth = width + (labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2);

        let tspanSVG = `<tspan x="${dx}" dy="${permittedFontSize * 1}">${UtilsSVG.replacedHTMLEntityString(text)}</tspan>`;

        const textRendering = 'text-rendering:geometricPrecision;';

        svgTextHTML = `<text style="-webkit-font-smoothing: none;${textRendering}${whiteSpaceTransform}
          font-family:${labelObj.fontfamily};${fontStyleData};font-size:${permittedFontSize}px;fill:${labelObj.fontcolor};text-anchor:start;opacity:${labelObj.opacity};user-select:none">${tspanSVG}</text>`;

        svgTextHTML = `<rect width="${rectWidth}" height="${lineDY}" fill="${bgColor}" stroke-width="${this.strokeWidth}" stroke="${strokeColor}" />` + svgTextHTML;
      }

    return {
      textSVG: svgTextHTML,
      height: lineDY,
      width: width,
      fontSize: permittedFontSize * 8
    };
  }

  createShelfText(
    labelObj,
    availWidthIn,
    availHeight,
    patternID, borderId, currentLabel, label, position, params
  ) {
    let availWidth = availWidthIn <= 0 ? 0.01 : availWidthIn;
    let permittedWidth;
    let permittedHeight;
    let permittedHeightnewValue;
    let permittedWidthNewValue;
    if (this.planogramService.labelFeild1isEnabled && this.planogramService.labelFeild2isEnabled && this.labelFieldObj1?.shrinkToFit && this.labelFieldObj2?.shrinkToFit) {
      if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal == label) {
        permittedWidthNewValue = this.labelFieldDetails[label].permittedWidth
      } else if (this.bothHorizontalOrientation) {
        permittedWidthNewValue = this.labelFieldDetails[label].width;
      } else {
        permittedWidthNewValue = availWidth - (5 * availWidth) / 100
      }
      permittedWidth = permittedWidthNewValue;
      if (this.overlapOccured) {
        if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal == label) {
          permittedHeightnewValue = this.labelFieldDetails[label].permittedHeight;
        } else if (this.bothDifferentOrientation?.status && this.bothDifferentOrientation.labelHorizontal != label) {
          permittedHeightnewValue = this.labelFieldDetails[label].permittedWidth
        } else {
          permittedHeightnewValue = this.labelFieldDetails[label].height - (5 * this.labelFieldDetails[label].height) / 100
        }
      }
      permittedHeight = this.overlapOccured ? permittedHeightnewValue : this.bothVerticelOrientation ? this.labelFieldDetails[label].width - (5 * this.labelFieldDetails[label].width) / 100 : availHeight - (5 * availHeight) / 100;//this.overlapOccured ?  this.labelFieldDetails[label].permittedHeight/2:availHeight - (5 * availHeight) / 100;
    } else {
      permittedWidth = availWidth - (5 * availWidth) / 100;
      // Refered in old code, this is the right formulae to calculate permitted height
      permittedHeight = availHeight - (5 * availHeight) / 100;

    }

    //let midPoint = availWidth / 2;
    this.labelFieldDetails[label] = {
      availWidth: availWidth,
      availHeight: availHeight,
      permittedFontSize: labelObj.fontsize / 8,
      shrinkToFit: labelObj.shrinkToFit,
      permittedWidth: permittedWidth,
      permittedHeight: permittedHeight,
      text: labelObj.text,
      fontsize: labelObj.fontsize,
      fontfamily: labelObj.fontfamily,
      calcMechanism: labelObj.calcMechanism,
      svgHTML: '',
      stretchToFacing: labelObj.stretchToFacing
    }
    let permittedFontSize = labelObj.fontsize / 8;
    //for wordwrap off
    if (!currentLabel.WORD_WRAP) {
      return this.createTextForWordWrapOff(labelObj, availWidth, availHeight, patternID, borderId, label, params, position);
    } else {
      let wordWrapObj = this.createTextForWordWrap(permittedHeight, permittedWidth, labelObj);

      if(wordWrapObj.wrappedTextArr.length > 1 && wordWrapObj.wrappedTextArr.every(t => t.trim().length < 4) && label) {
          let labelFieldsSelected = label == 1 ? this.planogramService.labelField1 : this.planogramService.labelField2;
          if (labelFieldsSelected.some(f => f === 'Position.PositionNo')) {
            if (label == 1) {
              labelObj.text = this.getLabelCustomizedObject(params, ['Position.PositionNo'], position, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1)['text'];
            } else {
              labelObj.text = this.getLabelCustomizedObject(params, ['Position.PositionNo'], position, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2)['text'];
            }
            labelObj.text = '#'+labelObj.text;
            wordWrapObj = this.createTextForWordWrap(permittedHeight, permittedWidth, labelObj);
          } else {
            wordWrapObj.svgTspanHTML = wordWrapObj.svgTspanHTML = '';
          }
        }

        wordWrapObj.savePermittedFontSize = wordWrapObj.savePermittedFontSize || permittedFontSize;
        wordWrapObj.rowNum = wordWrapObj.oldRowNum || wordWrapObj.rowNum;
        let tspanSVG = wordWrapObj.oldSvgTspanHTML || wordWrapObj.svgTspanHTML;
        let finalTextSVG = '';

        if (tspanSVG) {
          let bgColor = this.planogramService.labelItem['POSITION_LABEL']["LABEL_" + label]["BACKGROUND_COLOR"];
          let rectWidth = wordWrapObj.maxLineWidth + (labelObj.fontStyle == 'bold' ? this.strokeWidth * 4 : this.strokeWidth * 2);

          const whiteSpaceTransform = labelObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
          let fontStyleData = labelObj.fontStyle == 'bold' ? `font-weight:${labelObj.fontStyle};` : (labelObj.fontStyle == 'italic' ? `font-style:${labelObj.fontStyle}` : '');
          let strokeColor = labelObj.strokecolor;

          const textRendering = 'text-rendering:geometricPrecision;';

          let textSVGForLabel = `<text class="svgText" style="-webkit-font-smoothing: none;${textRendering}${whiteSpaceTransform}
          font-family:${labelObj.fontfamily};${fontStyleData};font-size:${wordWrapObj.permittedFontSize}px;text-anchor:start;opacity:${labelObj.opacity};fill:${labelObj.fontcolor};user-select:none">${tspanSVG}</text>`;

          let x = 0;
          let y = 0;
          let polygonCoords = `${x},${y},`;
          let fontWeight = labelObj.fontStyle == 'bold' ? labelObj.fontStyle  : 'normal';

          for (let i = 0; i < wordWrapObj.wrappedTextArr.length; i++) {
            x = UtilsSVG.getWidthOfTextByCanvas(wordWrapObj.wrappedTextArr[i].trim(), labelObj.fontfamily, wordWrapObj.permittedFontSize, fontWeight) + (wordWrapObj.permittedFontSize * 0.15);
            polygonCoords += `${x},${y},`;
            y = y + (wordWrapObj.permittedFontSize * 1.25);
            polygonCoords += `${x},${y},`;
          }
          polygonCoords += `0,${y}`;

          let polygonSVG = `<polygon points="${polygonCoords}"  fill="${bgColor}" stroke-width="${this.strokeWidth}" stroke="${strokeColor}" />`;

          finalTextSVG = `${polygonSVG}${textSVGForLabel}`;

          this.labelFieldDetails[label].height = labelObj.orientation == 1 || labelObj.orientation == -1 ? rectWidth : wordWrapObj.lineDY * (wordWrapObj.rowNum + 1);
          this.labelFieldDetails[label].width = labelObj.orientation == 1 || labelObj.orientation == -1 ? wordWrapObj.lineDY * (wordWrapObj.rowNum + 1) : rectWidth;
          this.labelFieldDetails[label].permittedHeight = permittedHeight;
          this.labelFieldDetails[label].permittedWidth = permittedWidth;
          this.labelFieldDetails[label].tspanLength = wordWrapObj.wrappedTextArr.length;
          this.labelFieldDetails[label].eachtspanHeight = wordWrapObj.lineDY;
          this.labelFieldDetails[label].orientation = labelObj.orientation;
       }

      return {
        textSVG: finalTextSVG,
        height: wordWrapObj.lineDY * (wordWrapObj.rowNum + 1),
        width: wordWrapObj.maxLineWidth,
        fontSize: wordWrapObj.savePermittedFontSize * 8,
      };
    }
  }
  createTextForWordWrap(permittedHeight, permittedWidth, labelObj, tagLocation = null){
    let permittedFontSize = labelObj.fontsize / 8;
    let rowNum = null;
    let oldWrappedTextArr = [];
    let wrappedTextArr = [];
    let count = 0;
    let svgTspanHTML = '';
    let oldSvgTspanHTML = '';
    let oldRowNum;
    let lineDY;
    let test;
    let maxLineWidth = 0;
    let lines = labelObj.text.trim().split(/[\n\r]+/);
    let tooBig = false;
    let savePermittedFontSize = 0;
    let diff = 8;
    let pos = 0;
    let oldFontSizeForTextTag = 0;
    let fontSizeForTextTag = 0;
    let fontWeight = labelObj.fontStyle == 'bold' ? labelObj.fontStyle  : 'normal';

    do {
       wrappedTextArr = [];
       svgTspanHTML = '';
       lineDY = permittedFontSize * 1.25;
        //const calcTextWidthMechanism = this.common.getTextWidthCalculator(labelObj.calcMechanism);

        for (const lineItem of lines) {
          if (lineDY * (wrappedTextArr.length + 1) > permittedHeight) {
            break;
          }
          let words = lineItem.split(' ');
          let line = '';

          let metricsWidth;
          for (let i = 0; i < words.length; i++) {
            if (lineDY * (wrappedTextArr.length + 1) > permittedHeight) {
              break;
            }

            test = words[i];
            metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, fontWeight);
            while (metricsWidth > permittedWidth) {
              // Determine how much of the word will fit
              test = test.substring(0, test.length - 1);
              metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, fontWeight);
            }
            if (words[i] != test) {
              words.splice(i + 1, 0, words[i].substr(test.length));
              words[i] = test;
            }

            test = line + words[i] + ' ';
            metricsWidth = UtilsSVG.getWidthOfTextByCanvas(test, labelObj.fontfamily, permittedFontSize, fontWeight);

            if (metricsWidth > permittedWidth && i > 0) {
              wrappedTextArr.push(line);
              line = words[i] + ' ';
            } else {
              line = test;
            }
          }

          if (lineDY * (wrappedTextArr.length + 1) <= permittedHeight) {
            wrappedTextArr.push(line);
          }
        }

        wrappedTextArr = wrappedTextArr.filter(txt => txt.trim());

        rowNum = wrappedTextArr.length - 1;
        fontSizeForTextTag = permittedFontSize;
        let dx = this.strokeWidth / 2;
        for (let i = 0; i < wrappedTextArr.length; i++) {
          maxLineWidth = Math.max(
            maxLineWidth,
            UtilsSVG.getWidthOfTextByCanvas(wrappedTextArr[i].trim(), labelObj.fontfamily, permittedFontSize, fontWeight),
          );
          let dy = i == 0 ? permittedFontSize * 1 : lineDY;
          svgTspanHTML += `<tspan x="${dx}" dy="${dy}">${UtilsSVG.replacedHTMLEntityString(
            wrappedTextArr[i].trim(),
          )}</tspan>`;
        }


        if (wrappedTextArr[rowNum] != undefined && test != undefined) {
          tooBig = UtilsSVG.replaceAll(' ', '', wrappedTextArr.join('')) != UtilsSVG.replaceAll(' ', '', lines.join('')) || (wrappedTextArr.length > 1 && wrappedTextArr.every(t => t.trim().length < 4));
          if (count == 0 && !tooBig) {
            oldRowNum = rowNum;
            oldSvgTspanHTML = svgTspanHTML;
            savePermittedFontSize = permittedFontSize;
            oldFontSizeForTextTag = permittedFontSize;
            oldWrappedTextArr = wrappedTextArr;
            break;
          }
        } else {
          tooBig = true;
        }
        if (!tooBig && permittedFontSize > savePermittedFontSize) {
          savePermittedFontSize = permittedFontSize;
          oldSvgTspanHTML = svgTspanHTML;
          oldRowNum = rowNum;
          oldFontSizeForTextTag = permittedFontSize;
          oldWrappedTextArr = wrappedTextArr;
        }
        count++;
        diff /= 2;
        pos = tooBig ? pos + diff : pos - diff;
        permittedFontSize = (labelObj.fontsize / 8) * Math.pow(Math.E, (-pos * Math.LN2) / 3.5);

      } while (labelObj.shrinkToFit && count < 5);

      return {
        permittedFontSize: oldFontSizeForTextTag || fontSizeForTextTag,
        savePermittedFontSize: savePermittedFontSize,
        svgTspanHTML: svgTspanHTML,
        oldSvgTspanHTML: oldSvgTspanHTML,
        maxLineWidth: maxLineWidth,
        lineDY: lineDY,
        rowNum: rowNum,
        oldRowNum: oldRowNum,
        wrappedTextArr: oldWrappedTextArr.length ? oldWrappedTextArr : wrappedTextArr,
      }
  }
  SVGPegBoardHook(position, pegBoard, params) {
    let pegType = position.getPegInfo();
    let orientation;
    let width;
    let height;
    let SVGBlock = '';
    let backHooks = pegType?.BackHooks;
    let backSpacing = pegType?.BackSpacing;
    let hookWidth = 0;
    //if (backHooks > 1) {
    hookWidth = backSpacing * (backHooks - 1);
    if (position.$packageBlocks != undefined) {
      for (let pBlockNum = 0; pBlockNum < position.$packageBlocks.length; pBlockNum++) {
        const packageBlock = position.$packageBlocks[pBlockNum];
        let high;
        let wide;
        if (packageBlock.type == "divider") continue;
        wide = packageBlock.wide;
        high = packageBlock.high;
        orientation = packageBlock.orientation & 0x1f;
        const flipHeightDepth = this.flipHeightDepth(this.parentItemData, false);
        if (flipHeightDepth) {
          high = packageBlock.deep;
          orientation = this.orientation.LayoverOrientationCoffinTypes[packageBlock.orientation] & 0x1f;
        }
        wide = packageBlock.wide;
        const view = this.orientation.View.Front;
        const dimensions = this.orientation.GetDimensions(
          orientation,
          false,
          view,
          position.Position.ProductPackage.Width,
          position.Position.ProductPackage.Height,
          position.Position.ProductPackage.Depth,

        );
        width = packageBlock.isUnitCap ? position.unitDimensions.unitWidth : dimensions.Width + position.getShrinkWidth() + position.getSKUGap(true, dimensions.Width + position.getShrinkWidth());
        height = packageBlock.isUnitCap ? position.unitDimensions.unitHeight : dimensions.Height + position.getShrinkHeight(false, false, packageBlock.layoverUnder, !packageBlock.layoverUnder);

        if (packageBlock.z == 0) {
          for (let h = 1; h <= high; h++) {
            let posLocY = position.Location.Y + ((h - 1) * (packageBlock.gapY + height));
            let hookY = posLocY+position.Position.ProductPegHoleY - position.pegOffsetY ;
            //let frontBarY = posLocY + position.Position.ProductPackage.YPegHole;
            for (let w = 1; w <= wide; w++) {
              let posLocX = position.Location.X + ((w - 1) * (packageBlock.gapX + width));
              let hookX = posLocX + position.Position.ProductPegHole1X - position.pegOffsetX;
              let frontBarX = posLocX + position.Position.ProductPegHole1X;
              let isDoubleHole =  pegType.FrontBars ==2;
              let frontBarX2;
              frontBarX2 = isDoubleHole?posLocX + position.Position.ProductPegHole2X:0;
              if(isDoubleHole){
                if(pegType.FrontSpacing>=width){
                  frontBarX = posLocX+ width*0.1;
                  frontBarX2 = posLocX + width*0.9;
                }
              }
              //drawing hook
              if (pegType.FrontSpacing && pegType.FrontSpacing > hookWidth && isDoubleHole) {
                SVGBlock += `<line x1="${frontBarX}" x2="${frontBarX2}" y1="${hookY}" y2="${hookY}" stroke="black" stroke-width="0.3"></line>`;
              }
              else if (backHooks > 1) {
                SVGBlock += `<line x1="${hookX}" x2="${hookX + hookWidth}" y1="${hookY}" y2="${hookY}" stroke="black" stroke-width="0.3"></line>`;
              }
              //drawing front bars
              SVGBlock += `<line x1="${frontBarX}" x2="${frontBarX}" y1="${hookY}" y2="${hookY + position.pegOffsetY}" stroke="black" stroke-width="0.3"></line>`;
              if (isDoubleHole) {
                SVGBlock += `<line x1="${frontBarX2}" x2="${frontBarX2}" y1="${hookY}" y2="${hookY + position.pegOffsetY}" stroke="black" stroke-width="0.3"></line>`;
              }
              SVGBlock += this.SVGTag(position, pegType, posLocX, posLocY, position.$id+'_TagSVG', params);
            }
          }
        }
      }
    }
    //}
    return SVGBlock;
  }
  SVGTag(position, pegInfo, x, y, id = null, params) {
    let isDoubleHole = pegInfo.FrontBars == 2;
    let tagSVG = '';
    if ( pegInfo.IsPegTag &&
      !UtilsSVG.isNullOrEmpty(pegInfo.TagXOffset) &&
      !UtilsSVG.isNullOrEmpty(pegInfo.TagYOffset)) {
      if (!(pegInfo.TagXOffset == 0 && pegInfo.TagYOffset == 0)) {
        let tagXBase = isDoubleHole ? (pegInfo.OffsetX + pegInfo.Offset2X) / 2 : pegInfo.OffsetX;
        let tagXLoc = x + tagXBase + pegInfo.TagXOffset;
        let tagYLoc = y + pegInfo.OffsetY + pegInfo.TagYOffset - pegInfo.TagHeight;
        let tagObj = { stroke: 'black', background: 'white', fontsize: 10, fontfamily: 'Roboto', fontStyle: 'bold', fontcolor: 'black', opacity: 100, shrinkToFit: true, type: '', text: '' };
        let textObj = this.createTextForWordWrap(pegInfo.TagHeight, pegInfo.TagWidth, tagObj, { X: tagXLoc, Y: tagYLoc });
        let textSVG = '';
        const textRendering = 'text-rendering:geometricPrecision;';
        textSVG = textObj.oldSvgTspanHTML || textObj.svgTspanHTML;
        const whiteSpaceTransform = tagObj.type === AppConstantSpace.WHITESPACE ? 'transform:translate(0.45px,0.05px);' : '';
        let fontStyleData = tagObj.fontStyle == 'bold' ? `font-weight:${tagObj.fontStyle};` : (tagObj.fontStyle == 'italic' ? `font-style:${tagObj.fontStyle}` : '');
        textSVG = `<text class="svgText" style="-webkit-font-smoothing: none;${textRendering}${whiteSpaceTransform}
        font-family:${tagObj.fontfamily};${fontStyleData};font-size:${textObj.permittedFontSize}px;text-anchor:start;opacity:${tagObj.opacity};user-select:none">${textSVG}</text>`;
        let tagIDSVG = id ? `id="${id}"` : '';
        tagSVG = `<g ${tagIDSVG} ><rect height="${pegInfo.TagHeight}" width="${pegInfo.TagWidth}"
    x="${tagXLoc}" y="${tagYLoc}" fill="${tagObj.background}" stroke="${tagObj.stroke}" stroke-width="${0.01}"/>`;
        tagSVG += textSVG + '</g>';

      }
    }
    return tagSVG;
  }
}
