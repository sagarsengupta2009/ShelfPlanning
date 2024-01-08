import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { each, extend } from 'lodash-es';
import { Observable } from 'rxjs';
import {
    AllSettings,
    apiEndPoints,
    Dictionary,
    HierarchyList,
    IApiResponse,
    PogDecorations,
    PropertyGridParams,
    PropertyGridSettings,
    PropertyStoreList,
} from 'src/app/shared/models';
import { DictConfigService, PlanogramStoreService, AvailableWSConfColService } from 'src/app/shared/services';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { SharedService } from 'src/app/shared/services';
import { ConfigPropertyDisplay, TabChildren } from 'src/app/shared/models/property-grid/settings';
import { ConsoleLogService } from 'src/app/framework.module';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class PropertyGridService {
    private PGLength: number = 0;
    private PGItrCount: number = 0;
    public config: any = {};
    public positionSettings: PropertyGridParams = {
        header: { children: [], template: '', title: '' },
        tab: [],
        listview: { children: [] },
    };
    public fixtureSettings: PropertyGridParams = {
        header: { children: [], template: '', title: '' },
        tab: [],
        listview: { children: [] },
    };
    public sectionSettings: PropertyGridParams = {
        header: { children: [], template: '', title: '' },
        tab: [],
        listview: { children: [] },
    };
    public multiFixSettings: PropertyGridParams = {
        header: { children: [], template: '', title: '' },
        tab: [],
        listview: { children: [] },
    };
    public selectedPropertiesTabIndex: {
        Position: number;
        Fixture: number;
        POG: number;
        Multiple: number;
    } = {
        Position: 0,
        Fixture: 0,
        POG: 0,
        Multiple: 0,
    };

    public allPropertyViewData: ConfigPropertyDisplay[] = [];
    public configPropertyList: ConfigPropertyDisplay[] = [];
    public updatePackageStyle: Subject<boolean> = new Subject<boolean>();
    public updatePropertyGridMetaData: Subject<number> = new Subject<number>();
    constructor(
        private readonly planogramStore: PlanogramStoreService,
        private readonly sharedService: SharedService,
        private readonly dictConfigService: DictConfigService,
        private readonly translate: TranslateService,
        private readonly log: ConsoleLogService,
        private readonly availableWSConfCol: AvailableWSConfColService,
        private readonly http: HttpClient,
        private readonly envConfig: ConfigService
    ) {}

    private generateGUID(): string {
        let d: number = new Date().getTime();
        let uuid: string = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r: number = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
        return uuid;
    }

    private calculateTotalFieldCount(setting: PropertyGridParams): number {
        let fieldsInH: number = setting.header.children.length;
        let fieldsInT: number = 0;
        each(setting.tab, function (tObj, tKey) {
            fieldsInT += tObj.children.length;
            each(tObj.group, function (gObj, gKey) {
                fieldsInT += gObj.children.length;
                //Adding table config to customise the configuration for dropdowns in property grid
                gObj.table?.rows && gObj.table?.rows?.forEach((row) => {
                    fieldsInT += row.children.length;
                });
            });
        });
        const fieldsInL: number = !setting.listview ? 0 : setting.listview.children.length;
        return fieldsInT + fieldsInH + fieldsInL;
    }

    public mergeConfigWithDict(settingObj: { IDDictionary: number, LabelName?: string }, res: Dictionary): void {
        this.PGItrCount++;
        if (typeof res !== 'undefined') {
            extend(settingObj, this.PropconfigFromDict(res, settingObj.LabelName));
            if (this.PGLength == this.PGItrCount) {
                this.sharedService.iSHELF.IDBcount++;
                this.sharedService.iSHELF.settings.isReady_propertyGrid++;
            }
        } else {
            if (this.PGLength == this.PGItrCount) {
                this.sharedService.iSHELF.IDBcount++;
                this.sharedService.iSHELF.settings.isReady_propertyGrid++;
            }
        }
    }

    private getFromGlobal(settingObj: { IDDictionary: number },propertyGridView:string = 'listView' ) {
        let res = this.dictConfigService.findById(settingObj.IDDictionary);
        const propertyGridViewFlag = propertyGridView === 'listView' ? !res?.IsDisAllowUserConfig : true;
        if(propertyGridViewFlag){
            this.mergeConfigWithDict(settingObj, res);
            return res;
        }
    }

    private prepareFromGlobal(setting: PropertyGridParams, type: string = ''): void {
        setting.header.children.forEach((hField) => {
            this.getFromGlobal(hField,'tabView');
        });

        setting.tab.forEach((tabObj) => {
            const uid = `TAB_ID_${this.generateGUID()}`;
            tabObj.localeTitle = this.translate.instant(tabObj.title);
            tabObj.guid = uid;
            tabObj.children.forEach((tField) => {
                this.getFromGlobal(tField, 'tabView');
            });

            tabObj.group.forEach((groupObj) => {
              //Need to prepare data configuration for table fields as well.
              groupObj.table && groupObj.table.rows.forEach((row) => {
                row.children.forEach((tField) => {
                  this.getFromGlobal(tField, 'tabView');
                });
              });
              //Getting translated strings for columns header
              groupObj.table && groupObj.table.columns.forEach((row) => {
                row.localeTitle = row.title != '' ? this.translate.instant(row.title) : '';
              });
                groupObj.localeTitle = groupObj.title != '' ? this.translate.instant(groupObj.title) : '';
                groupObj.children.forEach((gField) => {
                    this.getFromGlobal(gField,'tabView');
                });
            });
        });
        if (type) {
            let listViewIDDictionary = setting.listview.children.filter(x=>x.displayField == true)
                                                .map(({IDDictionary}) => ({IDDictionary }));
            listViewIDDictionary.forEach((obj) => {
                this.getFromGlobal(obj as any)
            });
            listViewIDDictionary = listViewIDDictionary.filter( e => e?.hasOwnProperty('field'));
            this.allPropertyViewData.push({ key: type, value: listViewIDDictionary as any , checked:false});
        }
    }

    public makePropConfig(): void {
        const result: AllSettings = this.planogramStore.allSettings.GetAllSettings.data.find(
            (val) => val.KeyName == 'PROPERTYGRID_SETTINGS',
        );

        const data: PropertyGridSettings = JSON.parse(result.KeyValue as any);
        data.positionSettings = this.filterData(data.positionSettings);
        const listViewSize: number = 3;
        this.PGItrCount = 0;
        this.PGLength =
            this.calculateTotalFieldCount(data.positionSettings) +
            this.calculateTotalFieldCount(data.fixtureSettings) +
            this.calculateTotalFieldCount(data.sectionSettings) +
            this.calculateTotalFieldCount(data.multiFixSettings);
        this.positionSettings = data.positionSettings;
        this.fixtureSettings = data.fixtureSettings;
        this.sectionSettings = data.sectionSettings;
        this.multiFixSettings = data.multiFixSettings;
        this.prepareConfigPropertyListData();

        if (!this.fixtureSettings.listview.listViewOrder || !this.positionSettings.listview.listViewOrder
                || !this.sectionSettings.listview.listViewOrder || !this.multiFixSettings.listview.listViewOrder) {
            for (let i = 0; i <= listViewSize; i++) {
                this.fixtureSettings.listview.listViewOrder === i ? this.prepareFromGlobal(this.fixtureSettings, AppConstantSpace.FIXTUREOBJ)
                    : this.positionSettings.listview.listViewOrder === i ? this.prepareFromGlobal(this.positionSettings, AppConstantSpace.POSITIONOBJECT)
                        : this.sectionSettings.listview.listViewOrder === i ? this.prepareFromGlobal(this.sectionSettings, AppConstantSpace.POG)
                        : this.multiFixSettings.listview.listViewOrder === i ? this.prepareFromGlobal(this.multiFixSettings, AppConstantSpace.MULTIFIXEDIT):null
            }
        }
    }

    private prepareConfigPropertyListData(): void {
        const listViewSize: number = 3;
        this.availableWSConfCol.prepareConfigWithDict();
        let newFixtureFields = this.availableWSConfCol.availableConfiguration.availableFixtureColumnConfig.filter(object1 => {
            return !this.fixtureSettings.listview.children.some(object2 => {
                return object1.IDDictionary === object2.IDDictionary;
            });
        });
        this.fixtureSettings.listview.children = this.fixtureSettings.listview.children.concat(newFixtureFields);

        let newPositionFields = this.availableWSConfCol.availableConfiguration.availableColumnConfig.filter(object1 => {
            return !this.positionSettings.listview.children.some(object2 => {
                return object1.IDDictionary === object2.IDDictionary;
            });
        });
        this.positionSettings.listview.children = this.positionSettings.listview.children.concat(newPositionFields);
        this.positionSettings.listview.children = this.filterDataBasedOnSettings(this.positionSettings.listview.children, 'POSITION');
        let newSectionFields = this.availableWSConfCol.availableConfiguration.availableSectionStatusbarColumnConfig.filter(object1 => {
            return !this.sectionSettings.listview.children.some(object2 => {
                return object1.IDDictionary === object2.IDDictionary;
            });
        });
        this.sectionSettings.listview.children = this.sectionSettings.listview.children.concat(newSectionFields);

        // Needs attention later  TODO: Rajesh Johnson
        // let newMultiFixEditFields = this.availableWSConfCol.availableConfiguration.availableFixtureColumnConfig.filter(object1 => {
        //     return this.multiFixSettings.listview.children.some(object2 => {
        //         return object1.IDDictionary === object2.IDDictionary;
        //     });
        // });
        // this.multiFixSettings.listview.children = this.multiFixSettings.listview.children.concat(newMultiFixEditFields);

        if (!this.fixtureSettings.listview.listViewOrder || !this.positionSettings.listview.listViewOrder
            || !this.sectionSettings.listview.listViewOrder || !this.multiFixSettings.listview.listViewOrder) {
            for (let i = 0; i <= listViewSize; i++) {
                this.configPropertyList.push({
                    key: this.fixtureSettings.listview.listViewOrder === i ? AppConstantSpace.FIXTUREOBJ
                            : this.positionSettings.listview.listViewOrder === i ? AppConstantSpace.POSITIONOBJECT
                                : this.sectionSettings.listview.listViewOrder === i ? AppConstantSpace.POG
                                    : this.multiFixSettings.listview.listViewOrder === i ? AppConstantSpace.MULTIFIXEDIT //have to change to multifix
                                        :null,
                    value: this.fixtureSettings.listview.listViewOrder === i ? this.fixtureSettings.listview.children
                            : this.positionSettings.listview.listViewOrder === i ? this.positionSettings.listview.children
                                : this.sectionSettings.listview.listViewOrder === i ? this.sectionSettings.listview.children
                                    : this.multiFixSettings.listview.listViewOrder === i ? this.multiFixSettings.listview.children
                                        :null,
                    checked: false
                });
            }
        }
        this.configPropertyList = this.configPropertyList.filter(x=> x.key != null);

        for (let obj of this.configPropertyList) {
            for (let fObj of obj.value) {
                this.getFromGlobal(fObj);
            }
        }
        this.configPropertyList = this.configPropertyList.map((element) => {
            return {...element, value: element.value.filter((ele) => ele?.hasOwnProperty('field'))}
          })
    }

    public positionIDDictionaries: TabChildren[] = [];

    private getPositionIDDictionaries(): TabChildren[] {
        if (this.positionIDDictionaries.length > 0) {
            return this.positionIDDictionaries;
        }

        // Loop through and list out all IDDictionaries for position.
        let psettings: PropertyGridParams = this.positionSettings;
        let positionIDDictionaries: TabChildren[] = [];

        psettings.tab.forEach((tObj) => {
            tObj.children.forEach((fObj) => {
                positionIDDictionaries.push(fObj);
            });

            tObj.group.forEach((gObj) => {
                gObj.children.forEach((fObj) => {
                    positionIDDictionaries.push(fObj);
                });
            });
        });

        this.positionIDDictionaries = positionIDDictionaries;
        return this.positionIDDictionaries;
    }
    //Used in worksheet
    checkPropertyApplicablityForPosition(obj: any, objParent: any, fieldName: any) {
        let positionIDDictionaries: TabChildren[] = this.getPositionIDDictionaries();
        let IDFixtureType = '';

        if (obj.ObjectType != AppConstantSpace.POSITIONOBJECT) {
            return;
        }
        IDFixtureType = objParent.Fixture.IDFixtureType;
        let matchingFixField;
        let fixField;
        for (let i = 0; i < positionIDDictionaries.length; i++) {
            fixField = positionIDDictionaries[i];
            if (fixField.field == fieldName) {
                matchingFixField = fixField;
                break;
            }
        }

        let resp = { applicable: true, autocomputeFronts: true, autocomputeDepth: true };

        if (matchingFixField) {
            let applicability = matchingFixField.Applicability;
            let idDic = fixField.IDDictionary;
            if (applicability != null) {
                //need to break the string into arrays
                resp.applicable = false;
                let applicabilityValues = applicability.split(',');
                for (let j = 0; j < applicabilityValues.length; j++) {
                    if (applicabilityValues[j] == IDFixtureType) {
                        resp.applicable = true;
                        break;
                    }
                }
            }

            if ([395, 396, 397, 398].indexOf(idDic) != -1) {
                if (
                    objParent.Fixture.AutoComputeFronts &&
                    (objParent.ObjectDerivedType != AppConstantSpace.PEGBOARDOBJ ||
                        objParent.ObjectDerivedType != AppConstantSpace.SLOTWALLOBJ ||
                        objParent.ObjectDerivedType != AppConstantSpace.CROSSBAROBJ)
                ) {
                    resp.autocomputeFronts = false;
                }
            }

            if ([396].indexOf(idDic) != -1) {
                if (objParent.Fixture.AutoComputeDepth) {
                    resp.autocomputeDepth = true;
                }
            }
        }
        return resp.applicable && resp.autocomputeFronts && resp.autocomputeDepth;
    }

    public PropconfigFromDict(res: Dictionary, customLabelName?: string): any {
        let record: any = {};
        if (res.LkUpGroupName) {
            if (!this.planogramStore.lookUpHolder[res.LkUpGroupName]) {
                this.log.error(`${res.LkUpGroupName} could not be found in lookUpHolder`);
            }
            record.options = this.planogramStore.lookUpHolder[res.LkUpGroupName]?.options;
        } else {
            record.options = '';
        }
        record.field = Utils.makeFieldFromDict(res);
        record.value = !Utils.isNullOrEmpty(customLabelName) ? this.translate.instant(customLabelName) : res.ShortDescription;
        record.type = Utils.typeForPropGrid(res.DataType);
        record.DataType = res.DataType;
        record.IsDialog = res.IsDialog;
        record.Remarks = res.Remarks;
        record.accessType = Utils.getAccessType(res);
        record.MinValue = res.MinValue;
        record.MaxValue = res.MaxValue;
        record.Applicability = res.Applicability;
        record.AttributeType = res.AttributeType;
        record.item = 'this.itemData.' + Utils.makeFieldFromDict(res);
        record.UiViewable = res.UiViewable;
        if(res.IDDictionary == 5530 || res.IDDictionary == 5533 || res.IDDictionary == 5537 || res.IDDictionary == 5538
            || res.IDDictionary == 5539 || res.IDDictionary == 5540 || res.IDDictionary == 5532 || res.IDDictionary == 5535){
                record.UiFormat = res.UiFormat;
            }
        //Once the DB changes are in, we will enable this based on the configuration.
        record.ActionOnChange =
            res.ActionOnChange == 0
                ? {
                      isSectionCalcRequired: true,
                      isFixtureCalcRequired: true,
                      isPositionCalcRequired: true,
                  }
                : {
                      isSectionCalcRequired: true,
                      isFixtureCalcRequired: true,
                      isPositionCalcRequired: true,
                  };
        return record;
    }

    public GetStoreListByPog(idPOG: number): Observable<IApiResponse<PropertyStoreList[]>> {
        return this.http.get<IApiResponse<PropertyStoreList[]>>(
            `${this.envConfig.shelfapi}${apiEndPoints.getStoresByPogCorpIDWithFormat}${idPOG}`,
        );
    }

    public getImagesForFixture(): Observable<IApiResponse<PogDecorations[]>> {
        return this.http.get<IApiResponse<PogDecorations[]>>(
            `${this.envConfig.shelfapi}${apiEndPoints.apiToGetPogDecorations}`,
        );
    }

    public getHierarchyBasedOnCorporationNew(): Observable<IApiResponse<HierarchyList[]>> {
        return this.http.get<IApiResponse<HierarchyList[]>>(
            `${this.envConfig.shelfapi}${apiEndPoints.apiToGetPogDecorations}`,
        );
    }

    public saveSetting(data: AllSettings[]): Observable<IApiResponse<void>> {
      let headers = new HttpHeaders();
      headers = headers.append('skipSuccessMsg', 'true');
      return this.http.post<IApiResponse<void>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathSavePogSettings}`, data, {headers});
    }

    private filterData(setting: PropertyGridParams): PropertyGridParams {
      if (setting) {
        const title = setting['title'];
        setting.tab.forEach((element) => {
          element.children = this.filterDataBasedOnSettings(element.children, title);
          each(element.group, (gObj) => {
            gObj.children = this.filterDataBasedOnSettings(gObj.children, title);
          });
        });
        setting.header.children = this.filterDataBasedOnSettings(setting.header.children, title);
        setting.listview.children = this.filterDataBasedOnSettings(setting.listview.children, title);
      }
      return setting;
    }

    private filterDataBasedOnSettings(settingObject: any[], title: string) {
      //filtering property grid children based on setting values, currently filtering children based on setting key USE_PEGPARTID
      let filterObject = [{ setting: 'USE_PEGPARTID', IDDictionary: 5546, excludeOnFalse: true, parentTitle: 'POSITION' }];
      filterObject.forEach(filt => {
        if (title.toUpperCase() == filt.parentTitle) {
          let settingValue = this.planogramStore.allSettings.GetAllSettings.data.find((val) => val.KeyName == filt.setting)?.KeyValue as boolean;
          if (settingValue == !filt.excludeOnFalse) {
            settingObject = settingObject.filter(child => child.IDDictionary != filt.IDDictionary);
          }
        }
      });
      return settingObject;
    }
}
