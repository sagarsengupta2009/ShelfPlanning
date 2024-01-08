import { UtilsSVG } from "../svg-utils";

export class BaseCommon {
  static loadFixtureLabels(allSettingsObj, dictConfigService) {
    let fixtureLabelItem = this.getSettingsForKey(
      'FIXTURE_LABEL',
      allSettingsObj,
      true,
    );
    let fixtureLabelsRaw = this.getSettingsForKey(
      'USER_DEFAULTS.FIXTLABEL.FIXT_LABEL',
      allSettingsObj,
      true).Values;
    let fixtureLabelValues = dictConfigService
      .dictionaryConfigCollection(fixtureLabelsRaw);
    const activeTemplate = this.setDefaultsLabels(fixtureLabelItem?.KeyValue);
    let expression1 = activeTemplate.LABEL_1.LABEL;
    let expression2 = activeTemplate.LABEL_2.LABEL;
    let resp1 = this.getLabelExpr(expression1, fixtureLabelValues, activeTemplate.LABEL_1.SHOW_LABEL_TITLE);
    let resp2 = this.getLabelExpr(expression2, fixtureLabelValues, activeTemplate.LABEL_2.SHOW_LABEL_TITLE);
    return {
      labelFixtItem: { "FIXTURE_LABEL": activeTemplate },
      labelFixtAllFields: fixtureLabelValues,
      labelFixtExpression: [resp1.labelExpression, resp2.labelExpression],
      labelFixtField: [resp1.labelField, resp2.labelField],
      labelFixtEnabled: [activeTemplate.LABEL_1.ENABLED, activeTemplate.LABEL_2.ENABLED]
    }
  }
  static setDefaultsLabels(labels) {
    const activeTemplate = JSON.parse(labels)?.LABELS.filter(template => template.IS_SELECTED == true)[0];
    const defaultTemplate = JSON.parse(labels)?.LABELS.filter(template => template.TEMPLATE_NAME == 'DefaultTemplate')[0];
    let keysLabel1 = Object.keys(activeTemplate.LABEL_1);
    keysLabel1?.forEach(key => {
      activeTemplate.LABEL_1[key] === null ? activeTemplate.LABEL_1[key] = defaultTemplate.LABEL_1[key] : '';
    });
    let keysLabel2 = Object.keys(activeTemplate.LABEL_2);
    keysLabel2?.forEach(key => {
      activeTemplate.LABEL_2[key] === null ? activeTemplate.LABEL_2[key] = defaultTemplate.LABEL_2[key] : '';
    });
    return activeTemplate;
  }
  static getSettingsForKey(key, dataIn, fullObj = null) {
    let result = dataIn.filter(val => val.KeyName == key);
    const value = result && result.length ? (fullObj ? result[0] : result[0].SelectedValue.value) : '';
    return value;
  };
  static filterIdDictionaries(labelExpr) { // showlabel off get only iddictionaries
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
  static getLabelExpr(labelExpr, fieldValues, showLabel) {
    labelExpr = UtilsSVG.replaceAll('~|~', '', labelExpr).trim();
    let newLabelExpr = '';
    let newLabelFields = [];
    let countOfFps = 0;
    let countOfSds = 0;
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
        if (value && value.indexOf('this') != -1) {
          newLabelExpr += value + '+';
          countOfFps++;
        } else if (value && value.indexOf('this') == -1) {
          newLabelExpr += "'" + value + "'+";
          countOfSds++;
        } else {
          newLabelExpr += "' '" + '+';
        }

        if(countOfFps > countOfSds) {
          newLabelFields.push('');
        }
        let fieldValue = value.replace('this.itemData.', '').trim();
        newLabelFields.push(fieldValue);
      });

      newLabelExpr = newLabelExpr.match(/[^+].*[^+]/g)[0];
      newLabelExpr += '}}';
    }

    return { labelExpression: newLabelExpr, labelField: newLabelFields };
  }
  static loadLabelItems(allSettingsObj, dictConfigService) {
    let imageReportLabelField = [];
    let positionLabel = this.getSettingsForKey(
      'POSITION_LABEL',
      allSettingsObj,
      true,
    );
    let positionLabelsRaw = this.getSettingsForKey(
      'USER_DEFAULTS.POSLABEL.LABEL',
      allSettingsObj,
      true,
    );
    const activeTemplate = this.setDefaultsLabels(positionLabel.KeyValue);
    let expression1 = activeTemplate.LABEL_1.LABEL;
    let expression2 = activeTemplate.LABEL_2.LABEL;
    if(expression1){
      expression1 = UtilsSVG.replaceAll('.', '·',
      UtilsSVG.replaceAll('\n', '\\n',
      UtilsSVG.replaceAll('\\n', '\n',
      UtilsSVG.replaceAll('\\\\n', '\n',
      UtilsSVG.replaceAll('\\\\\\n', '\n', expression1)))));
    }
    if (!activeTemplate.LABEL_1.WORD_WRAP) {
      if(expression1){
        expression1 = UtilsSVG.replaceAll('\n', '\\n',
        UtilsSVG.replaceAll('\\n', '\n',
        UtilsSVG.replaceAll('\\\\n', '\n',
        UtilsSVG.replaceAll('\\\\\\n', '\n', expression1))));
      }
    }
    if(expression2){
      expression2 = UtilsSVG.replaceAll('.', '·',
      UtilsSVG.replaceAll('\n', '\\n',
      UtilsSVG.replaceAll('\\n', '\n',
      UtilsSVG.replaceAll('\\\\n', '\n',
      UtilsSVG.replaceAll('\\\\\\n', '\n', expression2)))));
    }
    if (!activeTemplate.LABEL_2.WORD_WRAP) {
      if(expression2){
        expression2 = UtilsSVG.replaceAll('\n', '\\n',
        UtilsSVG.replaceAll('\\n', '\n',
        UtilsSVG.replaceAll('\\\\n', '\n',
        UtilsSVG.replaceAll('\\\\\\n', '\n', expression2))));
      }
    }

    let dictFieldValuesData = dictConfigService.dictionaryConfigCollection(
      positionLabelsRaw?.Values,
    );

    let resp = this.getLabelExpr(expression1, dictFieldValuesData, activeTemplate?.LABEL_1?.SHOW_LABEL_TITLE);
    let resp2 = this.getLabelExpr(expression2, dictFieldValuesData, activeTemplate?.LABEL_2?.SHOW_LABEL_TITLE);
    let imageReportLabelDictPreferences = this.getSettingsForKey(
      'IMAGE_REPORT_LABEL_DICTIONARY',
      allSettingsObj,
    ); //[247, 246, 389];
    imageReportLabelDictPreferences =
      imageReportLabelDictPreferences &&
      JSON.parse(imageReportLabelDictPreferences)['ImageReportPositionLabelDictionary'];

    let prefLen = imageReportLabelDictPreferences && imageReportLabelDictPreferences.length;
    for (let k = 0; k < prefLen; k++) {
      let eachPref = imageReportLabelDictPreferences[k];
      if (!eachPref.IDDictionary || !eachPref.IDDictionary.length) continue;

      let imageReportLabelDictObs = [];
      eachPref.IDDictionary.forEach((value, key) => {
        imageReportLabelDictObs.push({ IDDictionary: value });
      });

      imageReportLabelField.push(this.loadDictDetails(eachPref, imageReportLabelDictObs, dictConfigService));
    }

    return {
      labelItem: { "POSITION_LABEL": activeTemplate, "USER_DEFAULTS.POSLABEL.LABEL": positionLabelsRaw },
      labelFeild1isEnabled: activeTemplate.LABEL_1.ENABLED,
      labelFeild2isEnabled: activeTemplate.LABEL_2.ENABLED,
      isPegboardLabelEnabled1: activeTemplate.LABEL_1.SHOW_PEGBOARD_LABEL,
      isPegboardLabelEnabled2: activeTemplate.LABEL_2.SHOW_PEGBOARD_LABEL,
      labelExpression1: resp.labelExpression,
      labelExpression2: resp2.labelExpression,
      labelField1: resp.labelField,
      labelField2: resp2.labelField,
      imageReportLabelField: imageReportLabelField
    }

  };
  static loadDictDetails(eachPref, imageReportLabelDictObs, dictConfigService) {
    let eachPrefLabelField = { ClassName: eachPref.ClassName, fields: [] };
    let reportLabeldictData = dictConfigService.dictionaryConfigCollection(imageReportLabelDictObs);
    reportLabeldictData.forEach((value, key) => {
      eachPrefLabelField.fields.push(value.field);
    });
    return eachPrefLabelField;
  };

  static getCurrentEnableFixture(object, labelNo, labelFixtItem) {
    let labelObj = labelFixtItem["FIXTURE_LABEL"];
    if (labelObj['LABEL_' + labelNo]?.StandardShelf && labelObj['LABEL_' + labelNo]?.CoffinCase && labelObj['LABEL_' + labelNo]?.Basket && labelObj['LABEL_' + labelNo]?.Pegboard && labelObj['LABEL_' + labelNo]?.Slotwall && labelObj['LABEL_' + labelNo]?.Crossbar && labelObj['LABEL_' + labelNo]?.BlockFixture) { //all true
      return true;
    } else if (labelObj['LABEL_' + labelNo][object.ObjectDerivedType]) {
      return true;
    } else {
      false;
    }
  }
}
