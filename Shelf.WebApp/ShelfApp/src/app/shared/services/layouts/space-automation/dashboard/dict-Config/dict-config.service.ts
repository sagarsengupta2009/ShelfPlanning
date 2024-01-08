import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ConsoleLogService, LocalStorageService, OnReady } from 'src/app/framework.module';
import { AppConstantSpace, LocalStorageKeys } from 'src/app/shared/constants';
import { Utils } from 'src/app/shared/constants/utils';
import { AllDictionaryData, Dictionary, FieldSearchVM, IApiResponse } from 'src/app/shared/models';
import { ColorService, PlanogramStoreService } from 'src/app/shared/services/';
import { SharedService } from 'src/app/shared/services/common';
import { DictionaryFunctionService } from 'src/app/shared/services/common/dictionary/dictionary-function.service';
import { ConfigService } from '../../../../common/configuration/config.service'
declare const window: any;
@Injectable({
  providedIn: 'root',
})
export class DictConfigService extends OnReady {
  public searchFields: FieldSearchVM;
  public synchronizeMode: number;
  // TODO: @malu Why can't this be saved as an array, rather than keeping 2 copies?
  private records: { [key: number]: Dictionary } = {}; // Based on IdDictionary
  private recordsMap: { [key: string]: Dictionary } = {}; // Based on dictionary name
  public configurableDataDictionary: Dictionary[] = [];
  public dictionaryData: Dictionary;
  private packageAttributes: { path: string } = { path: '' };
  private packageInventoryModel: { path: string } = { path: '' };

  constructor(
    private readonly httpClient: HttpClient,
    private readonly planogramStoreService: PlanogramStoreService,
    private readonly sharedService: SharedService,
    private readonly log: ConsoleLogService,
    private readonly localStorage: LocalStorageService,
    private readonly color: ColorService,
    private readonly dictionaryFunctionService: DictionaryFunctionService,
    private readonly envConfig: ConfigService
  ) { super(); }

  public get packageAttributesCalcFields(): { [key: string]: string, path: string } {
    return this.packageAttributes;
  }
  public get packageInventoryModelCalcFields(): { [key: string]: string, path: string } {
    return this.packageInventoryModel;
  }
  public dictionaryConfigCollection(dictIDlist: Dictionary[]): Dictionary[] {
    this.prepareFromGlobal(dictIDlist);
    return dictIDlist;
  }

  public getRecords(): Dictionary[] {
    // Convert the mapping object to dictionary.
    return Object.keys(this.records)
      .map(key => this.records[key]);
  }

  public findById(id: number): Dictionary | undefined {
    if (!this.isReady) { this.log.warning('DictConfigService records accessed before data load.'); }
    return this.records[id];
  }
  public findByName(name: string): Dictionary | undefined {
    if (!this.isReady) { this.log.warning('DictConfigService recordsMap accessed before data load.'); }
    return this.recordsMap[name];
  }

  public prepareLocalSearchCollection(searchFields: FieldSearchVM): FieldSearchVM {
    this.prepareFromGlobalForLocalSearch(searchFields);
    return searchFields;
  }

  private prepareFromGlobal(dictIDlist: Dictionary[]): void {
    dictIDlist.forEach((fieldObj) => {
      this.getFromGlobal(fieldObj, true);
    });
  }

  private prepareFromGlobalForLocalSearch(searchFields: FieldSearchVM): void {
    searchFields.FieldSearch.forEach((fieldObj) => {
      this.getFromGlobal(fieldObj as any, false);
    });
    searchFields.Expression.forEach((fieldObj) => {
      this.getFromGlobal(fieldObj as any, false);
    });
  }

  private getFromGlobal(settingObj: Dictionary, isCallFromDictConfig: boolean): void {
    const dictionary = this.records[settingObj.IDDictionary];
    this.mergeConfigWithDict(settingObj, dictionary, isCallFromDictConfig);
  }

  private mergeConfigWithDict(settingObj: Dictionary, res: Dictionary, isCallFromDictConfig: boolean): void {
    if (res) {
      Object.assign(settingObj, this.PropconfigFromDict(res, isCallFromDictConfig));
    } else {
      this.log.warning(`Something went wrong with local Search translation, ID= ${settingObj.IDDictionary}`);
    }
  }

  private PropconfigFromDict(res: Dictionary, isCallFromDictConfig: boolean): Dictionary {
    const dictRecord: Dictionary = <Dictionary>{};
    if (!res) {
      return dictRecord;
    }
    if (res.LkUpGroupName) {
      dictRecord.options = this.planogramStoreService.getLookupdata()[res.LkUpGroupName]?.options;
    } else {
      dictRecord.options = null;
    }
    if (res.Expression) {
      dictRecord.Expression = res.Expression;
    }

    //common
    dictRecord.field = Utils.makeFieldFromDict(res);
    dictRecord.value = res.ShortDescription;
    dictRecord.IsDialog = res.IsDialog;
    dictRecord.Remarks = res.Remarks;
    dictRecord.accessType = Utils.getAccessType(res);
    dictRecord.MinValue = res.MinValue;
    dictRecord.MaxValue = res.MaxValue;
    dictRecord.Applicability = res.Applicability;
    dictRecord.LkUpGroupName = res.LkUpGroupName;
    if (!isCallFromDictConfig) {
      dictRecord.type = Utils.typeForPropGrid(res.DataType);
    }
    if (isCallFromDictConfig) {
      dictRecord.ShortDescription = res.ShortDescription;
      dictRecord.title = res.ShortDescription;
      dictRecord.Owner = res.Owner;
      dictRecord.IDDictionary = res.IDDictionary;
      dictRecord.DictionaryName = res.DictionaryName;
      dictRecord.AttributeType = res.AttributeType;
      dictRecord.FormatType = Utils.makeFormatType(res.FormatType);
      dictRecord.DataTypeDesc = Utils.typeForPropGrid(res.DataType);
      dictRecord.DataType = res.DataType;   
      dictRecord.Expression = res.Expression ? res.Expression : '';
    }
    return dictRecord;
  }

  public getAllDictionaryData(): Observable<AllDictionaryData> {
    const localData = this.getLocalData(); // from localStorage

    this.log.info(`Dictionary Records data from ${localData ? 'localStorage' : 'API'}`);

    const dictionaryData$ = localData
      ? of(localData)
      : this.loadAllDictionaryDataFromApi();

    return dictionaryData$.pipe(
      tap(data => this.updateDictConf(data)));
  }

  private loadAllDictionaryDataFromApi(): Observable<AllDictionaryData> {
    const url = `${this.envConfig.shelfapi}/api/Dictionary/GetDataDictionary`;
    return this.httpClient.get<IApiResponse<AllDictionaryData>>(url)
      .pipe(
        map(res => res.Data),
        tap(data => this.saveDataLocally(data))
      );
  }

  private getLocalData(): AllDictionaryData {
    return this.localStorage.get<AllDictionaryData>(LocalStorageKeys.DICTIONARY_DATA);
  }
  private saveDataLocally(dictionaryData: AllDictionaryData): void {
    // new data available, save in local storage and process
    this.localStorage.set<AllDictionaryData>(LocalStorageKeys.DICTIONARY_DATA, dictionaryData);
  }

  private updateDictConf(dictionaryData: AllDictionaryData): void {
    this.configurableDataDictionary = dictionaryData.Dictionary.filter((n) => !n.IsDisAllowUserConfig);

    const colorCodingNeededItems = [
      AppConstantSpace.FIXTUREOBJ,
      AppConstantSpace.POSITIONOBJECT,
      'Product',
      'ProductPackage',
      'PackageAttributes',
      'PackageInventoryModel'
    ];
    dictionaryData.Dictionary.forEach((value) => {
      this.records[value.IDDictionary] = value;
      this.recordsMap[value.DictionaryName] = value;
      if (value && !value.IsDisAllowUserConfig) {
        if (colorCodingNeededItems.includes(value.Owner)) {
          this.color.addColorCode(value);
        }
      }
    });
    this.notifySubscribers();
  }

  public setupCalculatedField() {
    const records = Object.keys(this.records).map(key => this.records[key]);
    this.dictionaryFunctionService.setupInitData(records);

    records.forEach((value) => {
      if (value.AttributeType == 'Calculated' && value.Expression != null) {
        let expression = this.preProcessCalculatedFields(value.Expression);
        const regExp = /{{\s*([^}]+)\s*}}/g;
        const matches: any = [];
        let match;
        let dstObj: { [key: string]: string, path: string } = { path: '' };
        let extendText: string = '';
        while ((match = regExp.exec(expression))) {
          matches.push(match[1]);
          if (this.records[match[1]]) {
            const field = Utils.makeCalculatedFieldFromDict(this.records[match[1]], true);
            if (value.Owner == 'Position') {
              if (field.indexOf('Position') > -1 || field.indexOf('Dimension') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.that.${field}`);
              } else if (field.indexOf('Fixture') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.parent.${field}`);
              } else {
                expression = expression.replace(`{{${match[1]}}}`, `dr.SuperParent.${field}`);
              }
            } else if (value.Owner == 'Fixture') {
              if (field.indexOf('Position') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.that.${field}`);
              } else if (field.indexOf('Fixture') > -1 || field.indexOf('Dimension') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.that.${field}`);
              } else {
                expression = expression.replace(`{{${match[1]}}}`, `dr.SuperParent.${field}`);
              }
            } else if (value.Owner == 'PackageInventoryModel' || value.Owner == 'PackageAttributes') {
              if (field.indexOf('Position') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.that.${field}`);
              } else if (field.indexOf('Fixture') > -1) {
                expression = expression.replace(`{{${match[1]}}}`, `dr.parent.${field}`);
              } else {
                expression = expression.replace(`{{${match[1]}}}`, `dr.SuperParent.${field}`);
              }
            } else {
              expression = expression.replace(`{{${match[1]}}}`, `dr.that.${field}`);
            }
          }
        }

        switch (value.Owner) {
          case 'Position':
            dstObj = this.sharedService.PositionCalcFields;
            break;
          case 'Fixture':
            dstObj = this.sharedService.FixtureCalcFields;
            break;
          case 'Planogram':
            dstObj = this.sharedService.SectionCalcFields;
            break;
          case 'PackageInventoryModel':
            dstObj = this.packageInventoryModelCalcFields;
            extendText = 'Calc_';
            break;
          case 'PackageAttributes':
            dstObj = this.packageAttributesCalcFields;
            extendText = 'Calc_';
            break;
        }
        const path = Utils.makeCalculatedFieldFromDict(value, false);
        dstObj.path = path;

        this.setupGetterFn(dstObj, extendText, value, expression, path);
      }
    });
  }

  /**
   * Attaches a get function for dictionary passed in.
   */
  private setupGetterFn(
    dstObj: { path: string },
    extendText: string,
    value: Dictionary,
    expression: string,
    path: string
  ) {
    //TODO: Add Measurement and AppSettingsSvc in dictionary-function.service and add replacer

    // These are getters used for the dynamic scripts. These are needed eventhough not be referenced within the code.
    var Measurement = this.sharedService;
    let AppSettingsSvc = this.planogramStoreService.appSettings;

    const expressionWithoutSpaces = expression.replaceAll(' ', '');
    if (!expressionWithoutSpaces.includes('(function(dr)')) {
      expression = `(function(dr){return  (${expression});})`;;
    }
    const fieldList = path.split('.');
    const lastField = fieldList.pop();


    Object.defineProperty(dstObj, `${extendText}${value.DictionaryName}`, {

      get: function () {
        const dr: any = {};
        let dataType: number;

        try {
          const sectionId = window.dictionaryFunctionService.getActiveSectionId();
          dataType = value.DataType;
          let roundOff: any;
          if (value.RoundOff) {
            roundOff = parseInt(value.RoundOff);
          } else {
            const tempRoundOffvalue = window.dictionaryFunctionService.roundoff;
            if (tempRoundOffvalue) {
              roundOff = tempRoundOffvalue.replace('n', '');
            }
            roundOff = parseInt(roundOff);
          }
          let Measurement: any = {};
          Measurement.measurementUnit = window.dictionaryFunctionService.measurementUnit;
          if (this.sectionId) {
            let that: any;
            if (this.sectionId || window.dictionaryFunctionService.isSaveInProgress(this.sectionId)) {
              if (this.id && this.sectionId) {
                that = window.dictionaryFunctionService.getObject(this.id, this.sectionId);
                if (that) {
                  dr.parent = window.dictionaryFunctionService.getParentObject(that);
                  dr.SuperParent = window.dictionaryFunctionService.getRootObject(that);
                }
              } else {
                that = this;
              }
              if (that) {
                dr.that = that;
                window.dictionaryFunctionService.expressionEvaluationCounter++;
                let result = eval(expression)(dr);
                window.dictionaryFunctionService.expressionEvaluationCounter--;

                switch (dataType) {
                  case 4: {
                    if (isNaN(result) || result == Infinity) {
                      result = 0;
                    } else {
                      if (dataType == 4 && result != null) {
                        result = parseFloat(window.dictionaryFunctionService.expressionEvaluationCounter ? result : result.toFixed(roundOff));
                      }
                    }
                    result = parseFloat(result);
                    break;
                  }
                  case 7: {
                    if (isNaN(result) || result == Infinity) {
                      result = 0;
                    } else {
                      if (dataType == 7 && result != null) {
                        result = Math.ceil(result);
                      }
                    }
                    result = parseInt(result);
                    break;
                  }
                  case 1: {
                    if (Utils.isNullOrEmpty(result)) {
                      result = '';
                    }
                    break;
                  }
                }

                for (const field of fieldList) {
                  if (that[field] == undefined) {
                    that[field] = {};
                  }
                  that = that[field];
                }
                that[lastField] = result;

                return result;
              }
            }
          }
        } catch (e) {
          console.log(e);
        }
      },
      enumerable: true
    });
  }

  /**
   * One time setup to replace old functions in expressions with newer references.
   * This is done in order to support old and new app without breaking any functionality.
   * Once old app is completely depriciated, this setup can be removed by updating the expressions in the dictionaries.
   */
  private preProcessCalculatedFields(exp: string): string {
    exp.includes('ObjectProvider') ? (exp = exp.replaceAll('ObjectProvider', 'window.dictionaryFunctionService')) : exp;
    exp.includes('AppSettingsSvc') ? (exp = exp.replaceAll('AppSettingsSvc', 'window.dictionaryFunctionService.appSettingsSvc')) : exp;
    exp.includes('EYC.utils') ? (exp = exp.replaceAll('EYC.utils', ' window.dictionaryFunctionService')) : exp;
    exp.includes('angular.forEach')
      ? (exp = exp.replaceAll(
        'angular.forEach(obj.Children, function (child, key) {',
        'obj.Children.forEach((child, key) => {'
      ))
      : exp;

    return exp;
  }
}
