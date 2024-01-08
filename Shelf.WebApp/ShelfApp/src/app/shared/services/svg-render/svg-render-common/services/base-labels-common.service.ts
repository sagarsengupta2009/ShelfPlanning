export class BaseLabelsCommonService {
  constructor(planogSvc) {
    this.planogramService = planogSvc;
  }
  fromService = '2D';
  planogramService;
  checkLabelsShrinkFitStatus(labelFieldObj1, labelFieldObj2) { //check for shrinkfit for both labels
    if (this.planogramService.labelFeild1isEnabled && this.planogramService.labelFeild2isEnabled && labelFieldObj1?.shrinkToFit && labelFieldObj2?.shrinkToFit) {
      return true;
    } else {
      return false;
    }
  }
  checkForLabelWidthsVertical(position, labelFieldDetails, service) { //both labels arw vertical and strchfacing off for one
    let strechOffLabel = labelFieldDetails[1]?.stretchToFacing ? 2 : 1;
    const otherLabel = strechOffLabel == 1 ? 1 : 2;
    if (labelFieldDetails[1].width + labelFieldDetails[2].width >= labelFieldDetails[strechOffLabel].permittedHeight) {
      service.bothVerticelOrientation = true;
      let totalWidth = labelFieldDetails[1].width + labelFieldDetails[2].width;
      const diff = totalWidth - labelFieldDetails[strechOffLabel].permittedHeight;
      labelFieldDetails[strechOffLabel].width = labelFieldDetails[strechOffLabel].width - diff / 2;
      labelFieldDetails[otherLabel].width = labelFieldDetails[otherLabel].width - diff / 2;
      if (this.fromService == "3D") {
        service.svgTextObject1 = service.createLabelCustomized(position, this.planogramService['labelField1'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1);
        service.svgTextObject2 = service.createLabelCustomized(position, this.planogramService['labelField2'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2);
      }
      if (this.fromService == "2D") {
        service.createLabelCustomized(
          position,
          labelFieldDetails[1].parameters.labelFields,
          labelFieldDetails[1].parameters.className,
          labelFieldDetails[1].parameters.params,
          labelFieldDetails[1].parameters.considerDisplayViewsFlag, 1
        )
        service.createLabelCustomized(
          position,
          labelFieldDetails[2].parameters.labelFields,
          labelFieldDetails[2].parameters.className,
          labelFieldDetails[2].parameters.params,
          labelFieldDetails[2].parameters.considerDisplayViewsFlag, 2
        )
      }

    }
  }
  permittedHeightToConsider(labelFieldDetails) {
    if (labelFieldDetails[1].permittedHeight == labelFieldDetails[2].permittedHeight) {
      return labelFieldDetails[1].permittedHeight;
    } else if ((labelFieldDetails[1].permittedHeight != labelFieldDetails[2].permittedHeight) && !labelFieldDetails[2].stretchToFacing) {
      return labelFieldDetails[2].permittedHeight;
    } else {
      return labelFieldDetails[1].permittedHeight;
    }
  }
  checklabelsOrientations(labelFieldObj1, labelFieldObj2) {
    if (labelFieldObj1.orientation != labelFieldObj2.orientation) {
      return true;
    } else {
      return false;
    }
  }
  getXAlignForShrinkFit(label, labelObj, labelFieldObj1, labelFieldObj2, service) { // for both vertical combination
    //both labels are vertical
    if (labelFieldObj1.xAlignment == labelFieldObj2.xAlignment && (labelObj.orientation == 1 || labelObj.orientation == -1) && label == 2 && !service.overlapOccured) {
      return labelFieldObj1.xAlignment == 2 ? 0 : 2;
    }
    if (labelFieldObj1.xAlignment == 1 && service.overlapOccured && label == 1) {
      return labelFieldObj2.xAlignment == 0 ? 2 : 0;
    }
    if (labelFieldObj2.xAlignment == 1 && service.overlapOccured && label == 2) {
      return labelFieldObj1.xAlignment == 2 ? 0 : 2;
    }
    if (labelFieldObj1.xAlignment == labelFieldObj2.xAlignment && service.overlapOccured) {
      return labelObj.xAlignment = (label == 1) ? 0 : 2;
    } else {
      return labelObj.xAlignment
    }
  }
  getWhichLabelTORender(itemData, labelFieldObj1, labelFieldObj2) { // get long text label rendered first
    return labelFieldObj1.text.length >= labelFieldObj2.text.length ? 1 : 2;
  }
  checkForLabelWidthsHorizontal(position, labelFieldDetails, service) {//check for width when both are horizontal
    let strechOffLabel = labelFieldDetails[1]?.stretchToFacing ? 2 : 1;
    const otherLabel = strechOffLabel == 1 ? 2 : 1;
    if (labelFieldDetails[1].width + labelFieldDetails[2].width >= labelFieldDetails[strechOffLabel].permittedWidth) {
      service.bothHorizontalOrientation = true;
      service.overlapOccured = true;
      let totalWidth = labelFieldDetails[1].width + labelFieldDetails[2].width;
      const labe1Width = labelFieldDetails[strechOffLabel].width * 100 / totalWidth;
      const labe2Height = labelFieldDetails[otherLabel].height * 100 / totalWidth;
      labelFieldDetails[strechOffLabel].width = labe1Width * labelFieldDetails[strechOffLabel].permittedWidth / 100
      labelFieldDetails[otherLabel].width = labelFieldDetails[strechOffLabel].permittedWidth - labelFieldDetails[strechOffLabel].width;
      if (this.fromService == "3D") {
        service.svgTextObject1 = service.createLabelCustomized(position, this.planogramService['labelField1'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1);
        service.svgTextObject2 = service.createLabelCustomized(position, this.planogramService['labelField2'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2);
      }
      if (this.fromService == "2D") {
        this.redraw2DLabel(service, position, labelFieldDetails)
      }

    }
  }
  redraw2DLabel(service, position, labelFieldDetails, label = null) { //redraw 2d labels
    if (label) {
      service.createLabelCustomized(
        position,
        labelFieldDetails[label].parameters.labelFields,
        labelFieldDetails[label].parameters.className,
        labelFieldDetails[label].parameters.params,
        labelFieldDetails[label].parameters.considerDisplayViewsFlag, label
      )
    } else {
      service.createLabelCustomized(
        position,
        labelFieldDetails[1].parameters.labelFields,
        labelFieldDetails[1].parameters.className,
        labelFieldDetails[1].parameters.params,
        labelFieldDetails[1].parameters.considerDisplayViewsFlag, 1
      )
      service.createLabelCustomized(
        position,
        labelFieldDetails[2].parameters.labelFields,
        labelFieldDetails[2].parameters.className,
        labelFieldDetails[2].parameters.params,
        labelFieldDetails[2].parameters.considerDisplayViewsFlag, 2
      )
    }

  }
  checkForLabelHeights(position, labelFieldDetails, labelFieldObj1, labelFieldObj2, service, fromshoppingcart = null) { // check for overlaps
    if ((labelFieldDetails[1].orientation == 1 || labelFieldDetails[1].orientation == -1) && (labelFieldDetails[2].orientation == 1 || labelFieldDetails[1].orientation == -1) && ((labelFieldDetails[1]?.stretchToFacing == false && labelFieldDetails[2]?.stretchToFacing == true) || (labelFieldDetails[1]?.stretchToFacing == true && labelFieldDetails[2]?.stretchToFacing == false)) && !fromshoppingcart) {

      this.checkForLabelWidthsVertical(position, labelFieldDetails, service);

    } else if (labelFieldDetails[1].orientation == 0 && labelFieldDetails[2].orientation == 0 && ((labelFieldDetails[1]?.stretchToFacing == false && labelFieldDetails[2]?.stretchToFacing == true) || (labelFieldDetails[1]?.stretchToFacing == true && labelFieldDetails[2]?.stretchToFacing == false)) && !fromshoppingcart) {
      this.checkForLabelWidthsHorizontal(position, labelFieldDetails, service);
    } else {
      if (labelFieldDetails[1].height + labelFieldDetails[2].height >= this.permittedHeightToConsider(labelFieldDetails)) {
        service.overlapOccured = true;
        service.reDrawLabels = {
          draw: false,
          label: 0,
          yAlign: 0
        };
        if (!this.checklabelsOrientations(labelFieldObj1, labelFieldObj2)) { //same orientation
          let totalLabelHeight = labelFieldDetails[1].height + labelFieldDetails[2].height;
          const diff = totalLabelHeight - labelFieldDetails[2].permittedHeight;
          //labelFieldDetails[1].height =  labelFieldDetails[1].height - diff/2;
          // labelFieldDetails[2].height =  labelFieldDetails[2].height - diff/2;
          const labe1Height = labelFieldDetails[1].height * 100 / totalLabelHeight;
          const labe2Height = labelFieldDetails[2].height * 100 / totalLabelHeight;
          labelFieldDetails[1].height = labe1Height * labelFieldDetails[1].permittedHeight / 100
          labelFieldDetails[2].height = labelFieldDetails[1].permittedHeight - labelFieldDetails[1].height;
          if (this.fromService == "3D") {
            service.svgTextObject1 = service.createLabelCustomized(position, this.planogramService['labelField1'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1);
            service.svgTextObject2 = service.createLabelCustomized(position, this.planogramService['labelField2'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2);
          }
          if (this.fromService == "2D") {
            this.redraw2DLabel(service, position, labelFieldDetails)
          }
        } else {
          const horzontalLabelNo = labelFieldObj1.orientation == 0 ? 1 : 2;
          const otherLabel = horzontalLabelNo == 1 ? 2 : 1;
          service.bothDifferentOrientation.status = true;
          service.bothDifferentOrientation.labelHorizontal = horzontalLabelNo;
          const horizontalLabel = labelFieldDetails[horzontalLabelNo].height * 100 / labelFieldDetails[horzontalLabelNo].permittedHeight;;
          const verticalLabel = labelFieldDetails[otherLabel].height * 100 / labelFieldDetails[otherLabel].permittedHeight;
          if (horizontalLabel < 17 && verticalLabel > 17) {
            labelFieldDetails[otherLabel].permittedWidth = labelFieldDetails[otherLabel].permittedHeight - labelFieldDetails[horzontalLabelNo].width;
            labelFieldDetails[otherLabel].permittedHeight = labelFieldDetails[otherLabel].permittedWidth - labelFieldDetails[horzontalLabelNo].height;
            if (this.fromService == "3D") {
              const svgText = service.createLabelCustomized(position, this.planogramService['labelField' + otherLabel], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_' + otherLabel], otherLabel);
              otherLabel == 1 ? service.svgTextObject1 = svgText : service.svgTextObject2 = svgText;
            }
            if (this.fromService == "2D") {
              this.redraw2DLabel(service, position, labelFieldDetails, otherLabel)
            }
          } else if (verticalLabel < 17 && horizontalLabel > 17) {
            labelFieldDetails[horzontalLabelNo].permittedWidth = labelFieldDetails[horzontalLabelNo].permittedWidth - labelFieldDetails[otherLabel].height;
            labelFieldDetails[horzontalLabelNo].permittedHeight = labelFieldDetails[horzontalLabelNo].permittedHeight - labelFieldDetails[otherLabel].width;
            if (this.fromService == "3D") {
              const svgText = service.createLabelCustomized(position, this.planogramService['labelField' + horzontalLabelNo], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_' + horzontalLabelNo], horzontalLabelNo);
              horzontalLabelNo == 1 ? service.svgTextObject1 = svgText : service.svgTextObject2 = svgText;
            }
            if (this.fromService == "2D") {
              this.redraw2DLabel(service, position, labelFieldDetails, horzontalLabelNo)
            }
          } else {
            labelFieldDetails[otherLabel].permittedWidth = labelFieldDetails[otherLabel].permittedHeight * 40 / 100;//get  30% of width for vertical
            //labelFieldDetails[otherLabel].height = labelFieldDetails[1].permittedWidth - labelFieldDetails[horzontalLabelNo].width;
            labelFieldDetails[horzontalLabelNo].permittedWidth = labelFieldDetails[horzontalLabelNo].permittedWidth * 45 / 100;
            if (labelFieldDetails[horzontalLabelNo]?.stretchToFacing == false && labelFieldDetails[otherLabel]?.stretchToFacing == true) {
              labelFieldDetails[otherLabel].permittedWidth = (labelFieldDetails[horzontalLabelNo].availWidth - (5 * labelFieldDetails[horzontalLabelNo].availWidth) / 100) - labelFieldDetails[horzontalLabelNo].permittedWidth;
            }
            if (labelFieldDetails[horzontalLabelNo]?.stretchToFacing == true && labelFieldDetails[otherLabel]?.stretchToFacing == false) {
              labelFieldDetails[horzontalLabelNo].permittedWidth = (labelFieldDetails[otherLabel].availHeight - (5 * labelFieldDetails[otherLabel].availHeight) / 100) - labelFieldDetails[otherLabel].permittedWidth;
            }
            if (this.fromService == "3D") {
              service.svgTextObject1 = service.createLabelCustomized(position, this.planogramService['labelField1'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_1'], 1);
              service.svgTextObject2 = service.createLabelCustomized(position, this.planogramService['labelField2'], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_2'], 2);
            }
            if (this.fromService == "2D") {
              this.redraw2DLabel(service, position, labelFieldDetails)
            }

          }
        }

      } else if (service.reDrawLabels?.draw) {//no overlap happened but due to middle alignment overlap can happen
        console.log("redraw")
        if (this.fromService == "3D") {
          service.reDrawLabels?.label == 1 ? service.svgTextObject1 = service.createLabelCustomized(position, this.planogramService['labelField' + service.reDrawLabels?.label], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_' + service.reDrawLabels?.label], service.reDrawLabels?.label) : service.svgTextObject2 = service.createLabelCustomized(position, this.planogramService['labelField' + service.reDrawLabels?.label], "", {}, false, false, this.planogramService.labelItem['POSITION_LABEL']['LABEL_' + service.reDrawLabels?.label], service.reDrawLabels?.label);

          let ret = service.createLabelPositionCanvas(position, false, service.reDrawLabels?.label);
          if (ret) {
            service.addLabelToContainer(service.holdContainer, ret, position, ret?.svgTextObject.xPos, ret?.svgTextObject?.yPos);
          }
        }
        if (this.fromService == "2D") {
          this.redraw2DLabel(service, position, labelFieldDetails, service.reDrawLabels?.label)
        }
      }
    }
  }
  getyAlignValueForShrinkFit(positionHeight, label, labelFieldDetails, service, labelFieldObj1, labelFieldObj2, Position = null) { // change Yalign to top to bottom /bottom to top
    const firtsLabelRendered = this.getWhichLabelTORender(Position, labelFieldObj1, labelFieldObj2);
    const otherLabel = label == 1 ? 2 : 1;
    let otherLabelNo = firtsLabelRendered == 1 ? 2 : 1;
    if (service.overlapOccured) {//where labels height are equal
      if (labelFieldDetails[label].yAlign != labelFieldDetails[otherLabel].yAlign && labelFieldDetails[label].yAlign != 1 && labelFieldDetails[otherLabel].yAlign != 1) {
        return labelFieldDetails[label].yAlign;
      } else {
        labelFieldDetails[otherLabel].yAlign = labelFieldDetails[otherLabel].orientation == 1 || labelFieldDetails[otherLabel].orientation == -1 ? 2 - labelFieldDetails[otherLabel].yAlign : labelFieldDetails[otherLabel].yAlign;
        labelFieldDetails[label].yAlign = labelFieldDetails[label].yAlign == 1 ? labelFieldDetails[otherLabel].yAlign == 0 ? 2 : 0 : labelFieldDetails[label].yAlign;
      }
      return labelFieldDetails[label].yAlign;
    } else if (labelFieldDetails[otherLabelNo]?.yAlign == 1 && labelFieldDetails[firtsLabelRendered]?.height + labelFieldDetails[otherLabelNo]?.height > positionHeight / 2) {
      labelFieldDetails[firtsLabelRendered].yAlign = labelFieldDetails[firtsLabelRendered].orientation == 1 || labelFieldDetails[firtsLabelRendered].orientation == -1 ? 2 - labelFieldDetails[firtsLabelRendered].yAlign : labelFieldDetails[firtsLabelRendered].yAlign;
      labelFieldDetails[otherLabelNo].yAlign = labelFieldDetails[firtsLabelRendered].yAlign == 0 ? 2 : 0;
      labelFieldDetails[firtsLabelRendered].yAlign = labelFieldDetails[otherLabelNo].yAlign == 0 ? 2 : 0;
      if (otherLabel != label) {
        service.reDrawLabels = {
          draw: true,
          label: otherLabel,
          yAlign: labelFieldDetails[otherLabel].yAlign
        };
        //return labelFieldDetails[otherLabel].yAlign
      }
      return labelFieldDetails[otherLabelNo].yAlign;
    } else if (labelFieldDetails[firtsLabelRendered]?.yAlign == 1 && labelFieldDetails[firtsLabelRendered]?.height + labelFieldDetails[otherLabelNo]?.height > positionHeight / 2) {
      labelFieldDetails[otherLabelNo].yAlign = labelFieldDetails[otherLabelNo].orientation == 1 || labelFieldDetails[otherLabelNo].orientation === -1 ? 2 - labelFieldDetails[otherLabelNo].yAlign : labelFieldDetails[otherLabelNo].yAlign;
      labelFieldDetails[firtsLabelRendered].yAlign = labelFieldDetails[otherLabelNo].yAlign == 0 ? 2 : 0;
      labelFieldDetails[otherLabelNo].yAlign = labelFieldDetails[firtsLabelRendered].yAlign == 0 ? 2 : 0;
      //both labels are middle
      if (otherLabel != label) {
        service.reDrawLabels = {
          draw: true,
          label: otherLabel,
          yAlign: labelFieldDetails[otherLabel].yAlign
        };
        // return labelFieldDetails[otherLabel].yAlign
      }
      return labelFieldDetails[firtsLabelRendered].yAlign;
    } else if (labelFieldObj1?.yAlignment == labelFieldObj2?.yAlignment) {
      return labelFieldDetails[label].yAlign = label == 1 ? 0 : 2;
    }
  }

  checkForHorizontalYalign(yAlign, availHeight, labelObj, labelFieldDetails, service, labelFieldObj1, labelFieldObj2, position, labelNo) {
    if (this.checkLabelsShrinkFitStatus(labelFieldObj1, labelFieldObj2)) {
      labelFieldDetails[labelNo].yAlign = yAlign;
      yAlign = service.reDrawLabels.draw ? service.reDrawLabels.yAlign : yAlign;
      if (!service.reDrawLabels.draw) {
        yAlign = this.getyAlignValueForShrinkFit(availHeight, labelNo, labelFieldDetails, service, labelFieldObj1, labelFieldObj2, position);
        return yAlign = yAlign ? yAlign : labelFieldDetails[labelNo].yAlign;
      } else {
        return yAlign;
      }
      //xAlign = this.overlapOccured && rotateDeg == 90 ? this.getXAlignValueForShrinkFit(labelNo) : xAlign;
    } else {
      return yAlign;
    }
  }
}
