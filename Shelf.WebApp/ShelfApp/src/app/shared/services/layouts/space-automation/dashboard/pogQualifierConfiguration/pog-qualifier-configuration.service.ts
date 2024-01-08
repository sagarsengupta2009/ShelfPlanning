import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { ConsoleLogService } from 'src/app/framework.module';
import { SharedService, DictConfigService } from 'src/app/shared/services';
import { Utils } from 'src/app/shared/constants';

@Injectable({
  providedIn: 'root'
})
export class PogQualifierConfigurationService {

  public pogQualifierFactory = {};
  public constraintsLen = 0;

  constructor(
    private readonly translate: TranslateService,
    private readonly sharedService: SharedService,
    private readonly dictConfigService: DictConfigService,
    private readonly log: ConsoleLogService
  ) { }

  public mergeConfigWithDict = (settingObj, res) => {
    if (typeof res != "undefined") {
      _.extend(settingObj, this.pogQualifierConfig(res));
    }
  }

  public pogQualifierConfig = (res) => {
    let record: any = {};
    if (res.IdDictionary && res.IdDictionary == -1) {
      record.field = res.ActionCode;
      record.title = this.translate.instant(res.ActionCode);
      record.DataType = 1;
      record.type = Utils.typeForPropGrid(record.DataType);
      record.UiFormat = "#.";
      record.FormatType = "StringType";
      record.Owner = "Planogram";
      record.AttributeType = "Direct";
      record.value = '';
      record.item = 'this.itemData.' + Utils.makeFieldFromDict(res)
    } else {
      record.field = Utils.makeFieldFromDict(res);
      record.title = res.ShortDescription;
      record.DataType = res.DataType;
      record.type = Utils.typeForPropGrid(res.DataType);
      record.UiFormat = res.UiFormat;
      record.FormatType = res.FormatType;
      record.Owner = res.Owner;
      record.AttributeType = res.AttributeType;
      record.value = '';
      record.item = 'this.itemData.' + Utils.makeFieldFromDict(res)
    }
    return record;
  }

  public getFromGlobal = (settingObj) => {
    let res;
    if (settingObj.IdDictionary == -1) {
      res = settingObj;
      this.mergeConfigWithDict(settingObj, res);
    } else {
      res = this.dictConfigService.findById(settingObj.IdDictionary);
      if (res) {
        this.mergeConfigWithDict(settingObj, res);
      }
    }
    return res;
  };

  public makePOGQualifierFields(pogQualfirDetailSettings) {
    let tempConstrLen = 0;
    this.constraintsLen = pogQualfirDetailSettings.length;
    _.each(pogQualfirDetailSettings, (qualifierObj, key) => {
      if (!qualifierObj.IsUDP) {
        if (this.getFromGlobal(qualifierObj)) {
          tempConstrLen++;
          if (this.constraintsLen == tempConstrLen) {
            this.sharedService.iSHELF.settings.isReady_pogQualifier++
            // resolve(pogQualfirDetailSettings);
          }
        }
      } else {
        this.mergeConfigWithDict(qualifierObj, qualifierObj);
        tempConstrLen++;
        if (this.constraintsLen == tempConstrLen) {
          this.sharedService.iSHELF.settings.isReady_pogQualifier++
        }
      }

    });
  };

};
