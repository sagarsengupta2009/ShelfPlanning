import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { find, cloneDeep } from 'lodash-es';
import { Subscription } from 'rxjs';
import { Utils, SettingNames as SETTINGS, AppConstantSpace } from 'src/app/shared/constants'
import { Dictionary, IApiResponse, POGSetting, POGSettingParam, Settings, AllSettings, ResponseLogError, PogSideNaveView, PanelView, LabelTemplate } from 'src/app/shared/models';
import { StatusSettings, SelectedGridType, PogSettingParamKey, AllDictionaryData } from 'src/app/shared/models/sa-dashboard';
import {
    SharedService,
    PlanogramService,
    PlanogramCommonService,
    DictConfigService,
    AvailableWSConfColService,
    Planogram_2DService,
    PlanogramStoreService,
    NotifyService,
    Render2dService,ShoppingCartService,PogSideNavStateService,PanelService,ThreedPlanogramService, SettingsService
} from 'src/app/shared/services';
import { Section } from 'src/app/shared/classes';
import { LabelType, DisplaySetting } from 'src/app/shared/models';
import { LabelEditType } from 'src/app/shared/models/enums';
import { LabelTemplateComponent } from './label-template/label-template/label-template.component';
@Component({
    selector: 'sp-settings',
    templateUrl: './settings.component.html',
    styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit, OnDestroy {
    private appSettingData: Settings<AllSettings[]> = { data: [], status: -1 };
    private pogSettingData: POGSetting;
    private subscriptions: Subscription = new Subscription();
    public POGSettingstabData: POGSettingParam[] = [];
    public StatusSettingstabData: POGSettingParam[] = [];
    public showUserSetting: boolean = true;
    public showFixtureSettings: boolean = false;
    public showPositionSettings: boolean = false;
    public showStatusbarSettingsVisibility: boolean = false;
    public statusbarSelectedVal: SelectedGridType;
    public FixtureSettingstabData: POGSettingParam[];
    public PositionSettingstabData: POGSettingParam[];
    public PositionTemplates: AllSettings;
    public FixtureTemplates: AllSettings;
    public labelFiltersFixture: Dictionary[];
    public labelFiltersPosition: Dictionary[];
    public availableLabelPosition: Dictionary[];
    public availableLabelFixture: Dictionary[];
    public fixturegridSelection: string;
    public positiongridSelection: string = '';
    public StatusgridSelection: SelectedGridType;
    public labelExpr: string = '';
    public labelValues: Settings<AllSettings[]>;
    public gridId: string;

    constructor(
        private readonly dictConfigService: DictConfigService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly availableWSConfColService: AvailableWSConfColService,
        private readonly dialog: MatDialogRef<SettingsComponent>,
        private readonly planogramService: PlanogramService,
        private readonly sharedService: SharedService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly cd: ChangeDetectorRef,
        private readonly planogram2DService: Planogram_2DService,
        private readonly notifyService: NotifyService,
        private readonly render2d: Render2dService,
        private readonly shoppingCartService:ShoppingCartService,
        private readonly pogSideNavStateService:PogSideNavStateService,
        private readonly panelService:PanelService,
        private readonly threedPlanogramService:ThreedPlanogramService,
        private readonly settingsService:SettingsService
    ) { }

    public getPogSettingGrid(): void {
        const appSettings: Settings<AllSettings[]> = cloneDeep(
            this.planogramStore.appSettings.allSettingsObj.GetAllSettings,
        );
        this.appSettingData.data = appSettings.data.map((obj) => Object.assign({}, obj));
        if (this.appSettingData.data) {
            const getPogSettings = this.appSettingData.data
                .filter((item: AllSettings) => item['KeyName'] == 'USERPREFSETUP')
                .map((a) => Object.assign({}, a));
            this.pogSettingData = JSON.parse(getPogSettings[0].SelectedValue.value as string);
            this.pogSettings();
            this.FixtLabelSettings();
            this.statusBarSettings();
            this.POSLabelSettings();
        }
    }

    public fixtureChange(event): void {
        this.fixturegridSelection = event.labelExpression;
    }

    public labelChange(event: { keyName: string, keyValue: string, apply: boolean, isDefault: boolean, displaySetting?: DisplaySetting }): void {
      let labelSetting = cloneDeep(this.appSettingData.data.filter(set => set.KeyName == event.keyName && set.KeyGroup == 'POG'));
      labelSetting[0].KeyValue = event.keyValue;
      labelSetting[0].SelectedValue.value = event.keyValue;
      if (event.isDefault) {
        if (event.apply) {
          if (event.keyName == LabelType.POSITION) {
            this.PositionTemplates = labelSetting[0];
          } else if (event.keyName == LabelType.FIXTURE) {
            this.FixtureTemplates = labelSetting[0];
          }
          this.updateLabelSettingsPOG(event.keyName ,labelSetting[0].KeyValue);
          this.render2d.isDirty = true;
          this.planogram2DService.activate();
          if (this.pogSideNavStateService.shoppingCartView.isPinned || this.pogSideNavStateService.activeVeiw == PogSideNaveView.SHOPPING_CART || this.pogSideNavStateService.shoppingCartView.pos === PogSideNaveView.SHOPPING_CART_TOP) {
            this.shoppingCartService.updateLabelsInCart.next(true);
          }
          this.showGeneralSettings(event?.displaySetting);
        }
      }
      else {
        this.savePogSettings(labelSetting, false, event.apply,event?.displaySetting);
      }

    }
    public statusBarChanges(event): void {
        this.StatusgridSelection = event;
    }

    public pogSettings(): void {
        this.POGSettingstabData = this.pogSettingData.POGSettings.map((a) => Object.assign({}, a));
        for (let tab of this.POGSettingstabData) {
            for (let obj of tab.children) {
                obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
            }
            if (tab.group) {
                for (let d of tab.group) {
                    for (let obj of d.children) {
                        obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                    }
                }
            }
        }
    }

    public statusBarSettings(): void {
        this.StatusSettingstabData = this.pogSettingData.StatusBarSettings.map((a) => Object.assign({}, a));
        for (let tab of this.StatusSettingstabData) {
            for (let obj of tab.children) {
                obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                this.statusbarSelectedVal = obj['fieldObj'].SelectedValue.value
                    ? Object.assign({}, JSON.parse(obj['fieldObj'].SelectedValue.value as string))
                    : { fixture: [], pog: [], position: [] };
                for (let i in this.statusbarSelectedVal) {
                    let options = this.statusbarSelectedVal[i].map((a) => ({
                        IDDictionary: a,
                    }));
                    this.statusbarSelectedVal[i] = this.dictConfigService.dictionaryConfigCollection(options);
                }
                if (obj['fieldObj'].KeyName == 'STATUSBAR_SETTINGS') {
                    obj['fieldObj'].UIType = 'textarea';
                }
            }
        }
    }

    public POSLabelSettings(): void {
      this.PositionTemplates = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.filter(set=>(set.KeyName==LabelType.POSITION && set.KeyGroup=='POG'))[0];
        this.PositionSettingstabData = this.pogSettingData.POSLabelSettings.map((a) => Object.assign({}, a));
        if (this.appSettingData.data) {
            for (let tab of this.PositionSettingstabData) {
                for (let obj of tab.children) {
                    obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                    if (obj['fieldObj'].KeyName == 'USER_DEFAULTS.POSLABEL.LABEL') {
                        this.subscriptions.add(
                            this.dictConfigService.getAllDictionaryData()
                                .subscribe((data: AllDictionaryData) => {
                                    this.availableLabelPosition = data.Dictionary;
                                })
                        );
                        let posLablDictionary = obj['fieldObj'].Values as Dictionary[]
                        obj['fieldObj'].Values = posLablDictionary.filter(object1 => {
                            return this.availableLabelPosition.some(object2 => {
                                return object1.IDDictionary === object2.IDDictionary;
                            });
                        });
                        let data = this.dictConfigService
                            .dictionaryConfigCollection(obj['fieldObj'].Values as Dictionary[]);
                        obj['fieldObj'].Values = data;
                        this.labelFiltersPosition = data;
                        obj['fieldObj'].UIType = 'textarea';
                    }
                }
                for (let gObj of tab.group) {
                  for (let obj of gObj.children) {
                    if (obj.key == 'USER_DEFAULTS.POSLABEL.FONT_SIZE') {
                      const templates: LabelTemplate[] = JSON.parse(this.PositionTemplates.KeyValue as string).LABELS;
                      this.addCustomizedFontSizes(obj, templates);
                    } else {
                      obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                    }
                  }
                }
            }
        }
    }

    public FixtLabelSettings(): void {
      this.FixtureTemplates = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.filter(set=>(set.KeyName==LabelType.FIXTURE && set.KeyGroup=='POG'))[0];
        this.FixtureSettingstabData = this.pogSettingData.FixtLabelSettings.map((a) => Object.assign({}, a));
        if (this.appSettingData.data) {
            for (let tab of this.FixtureSettingstabData) {
                for (let obj of tab.children) {
                    obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                    if (obj['fieldObj'].KeyName == 'USER_DEFAULTS.FIXTLABEL.FIXT_LABEL') {
                        this.subscriptions.add(
                            this.dictConfigService.getAllDictionaryData()
                                .subscribe((data: AllDictionaryData) => {
                                    this.availableLabelFixture = data.Dictionary;
                                })
                        );
                        let fixtureLablDictionary = obj['fieldObj'].Values as Dictionary[]
                        obj['fieldObj'].Values = fixtureLablDictionary.filter(object1 => {
                            return this.availableLabelFixture.some(object2 => {
                                return object1.IDDictionary === object2.IDDictionary;
                            });
                        });
                        let data = this.dictConfigService
                            .dictionaryConfigCollection(obj['fieldObj'].Values as Dictionary[]);
                        data = [...new Map(data.map(item => [item['IDDictionary'], item])).values()];
                        obj['fieldObj'].Values = data;
                        this.labelFiltersFixture = data;

                        obj['fieldObj'].UIType = 'textarea';
                    }
                }
                for (let gObj of tab.group) {
                    for (let obj of gObj.children) {
                        if (obj.key == 'USER_DEFAULTS.FIXTLABEL.FONT_SIZE') {
                          const templates: LabelTemplate[] = JSON.parse(this.FixtureTemplates.KeyValue as string).LABELS;
                          this.addCustomizedFontSizes(obj, templates);
                        } else {
                            obj['fieldObj'] = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
                        }
                    }
                }
            }
        }
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    ngOnInit(): void {
        this.availableWSConfColService.makeAvailableConfigWithDict();
        this.getPogSettingGrid();
    }

    public showGeneralSettings(event?: DisplaySetting ): void {
        if(this.showStatusbarSettingsVisibility){
            this.statusBarSettings();
            this.settingsService.selectedPogLabelData = '';
            this.settingsService.selectedPositionLabelData = '';
            this.settingsService.selectedFixtureLabelData = '';
        }
        this.showStatusbarSettingsVisibility = false;
        this.showFixtureSettings = false;
        if (event?.type === LabelType.POSITION && [LabelEditType.CLONE, LabelEditType.SAVE, LabelEditType.DELETE].includes( event?.fromCloneDeleteSave)) {
            this.showPositionSettings = true;
            this.showUserSetting = false;
        } else if (event?.type === LabelType.FIXTURE && [LabelEditType.CLONE, LabelEditType.SAVE, LabelEditType.DELETE].includes( event?.fromCloneDeleteSave)) {
            this.showFixtureSettings = true;
            this.showUserSetting = false;
        } else {
            this.showPositionSettings = false;
            this.showUserSetting = true;
        }
    }

    public selectionChange(event: StatusSettings): void {
        this.showUserSetting = false;
        this.gridId = event.id;
        switch (event.id) {
            case 'STATUSBAR_SETTINGS':
                this.showStatusbarSettingsVisibility = true;
                this.showFixtureSettings = false;
                this.showPositionSettings = false;
                break;
            case 'TURN_ON_FIXT_LABEL':
                this.showStatusbarSettingsVisibility = false;
                this.showFixtureSettings = true;
                this.showPositionSettings = false;
                break;
            case 'TURN_ON_LABEL':
                this.showStatusbarSettingsVisibility = false;
                this.showFixtureSettings = false;
                this.showPositionSettings = true;
                break;
            default:
                break;
        }
    }

    public ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public applyPogSettings(): void {
        let postData: any[] = [];
        this.POGSettingstabData.forEach((obj) => {
            obj.children.forEach((childObj) => {
                if (childObj.key != 'STATUSBAR_SETTINGS') {
                    let data = Object.assign(
                        {},
                        find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                            KeyName: childObj.key,
                        }),
                    );
                    if (data.SelectedValue.value != childObj['fieldObj'].SelectedValue.value)
                        postData.push(childObj['fieldObj']);
                }
            });
            if (obj.group) {
                obj.group.forEach((grpobj) => {
                    grpobj.children.forEach((childObj) => {
                        let data = Object.assign(
                            {},
                            find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                                KeyName: childObj.key,
                            }),
                        );
                        if (data.SelectedValue.value != childObj['fieldObj'].SelectedValue.value) {
                            //Added for pegboard overhange edge
                            var isValid = this.isValidChange(childObj['fieldObj'].SelectedValue.value as number, childObj['key']);
                            if (isValid && isValid.flag) {
                                data.SelectedValue.value = childObj['key'];
                                if (data.List == true && data.Type == 'string') {
                                    data.SelectedValue.text = childObj['key'];
                                }
                                postData.push(childObj['fieldObj']);
                            } else {
                                //revert back the value and display toaster
                                this.revertBack({ key: childObj['key'], errMsg: isValid.errMsg });
                            }
                        }
                    });
                });
            }
        });
        this.savePogSettings(postData, true);
    }

    public applyFixtLabelSettings(): void {
        let postData: any[] = [];
        this.FixtureSettingstabData.forEach((obj) => {
            obj.children.forEach((childObj) => {
                if (childObj['fieldObj'].KeyName == 'USER_DEFAULTS.FIXTLABEL.FIXT_LABEL') {
                    let data = Object.assign(
                        {},
                        find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                            KeyName: childObj.key,
                        }),
                    );
                    if (data.SelectedValue.value != this.fixturegridSelection) {
                        data.SelectedValue.value = this.fixturegridSelection;
                        childObj.fieldObj.SelectedValue.value = this.fixturegridSelection;
                        data.Values = data.Values.map((x) => {
                            return {
                                IDDictionary: x.IDDictionary,
                                RefName: x.RefName,
                            };
                        });
                        postData.push(data);
                    }
                }
            });
            obj.group.forEach((grpobj) => {
                grpobj.children.forEach((childObj) => {
                    let data = Object.assign(
                        {},
                        find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                            KeyName: childObj.key,
                        }),
                    );
                    if (data.SelectedValue.value != childObj['fieldObj'].SelectedValue.value)
                        postData.push(childObj['fieldObj']);
                });
            });
        });
        this.savePogSettings(postData);
    }
    public applyPostLabelSettings(): void {
        let postData: any[] = [];
        this.PositionSettingstabData.forEach((obj) => {
            obj.children.forEach((childObj) => {
                if (childObj['fieldObj'].KeyName == 'USER_DEFAULTS.POSLABEL.LABEL') {
                    let data = Object.assign(
                        {},
                        find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                            KeyName: childObj.key,
                        }),
                    );
                    if (data.SelectedValue.value != this.positiongridSelection) {
                        data.SelectedValue.value = this.positiongridSelection;
                        childObj.fieldObj.SelectedValue.value = this.positiongridSelection
                            .replaceAll('\\\\\\n', '\n')
                            .replaceAll('\\\\n', '\n')
                            .replaceAll('\\n', '\n')
                            .replaceAll('\n', '\\n')
                            .replaceAll('.', '·');

                        data.Values = data.Values.map((x) => {
                            return {
                                IDDictionary: x.IDDictionary,
                                RefName: x.RefName,
                            };
                        });
                        postData.push(data);
                    }
                }
            });
            obj.group.forEach((grpobj) => {
                grpobj.children.forEach((childObj) => {
                    let data = Object.assign(
                        {},
                        find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
                            KeyName: childObj.key,
                        }),
                    );
                    if (data.SelectedValue?.value != childObj['fieldObj'].SelectedValue?.value)
                        postData.push(childObj['fieldObj']);
                });
            });
        });
        this.savePogSettings(postData);
    }

    public applyStatusBarSettings(): void {
        let postData: any[] = [];
        for (let i in this.StatusgridSelection) {
            this.StatusgridSelection[i] = this.StatusgridSelection[i].map((obj) => obj.IDDictionary);
        }
        let postgridData = JSON.stringify(this.StatusgridSelection);
        let data = Object.assign(
            {},
            find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, { KeyName: 'STATUSBAR_SETTINGS' }),
        );
        if (data.SelectedValue.value != postgridData) {
            data.SelectedValue.value = postgridData;
            postData.push(data);
        }
        this.savePogSettings(postData);
    }

    private savePogSettings(postObj: AllSettings[], evt?: boolean, labelsApply?: boolean,displaySetting?: DisplaySetting): void {
        let obs = this.availableWSConfColService.savePogSettings(postObj).subscribe((res: IApiResponse<void>) => {
            if (res.Log.Summary.Error == ResponseLogError.OCCURRED) {
                //this.notifyService.error(res.Log.Details[0].Message); // Message coming from backend is not proper
            } else {
                this.showStatusbarSettingsVisibility = false;
                this.showFixtureSettings = false;
                if (displaySetting) {
                  if (displaySetting.fromCloneDeleteSave == LabelEditType.DELETE) {
                    this.notifyService.success('DELETED_TEMPLATE_SUCCESSFULLY');
                  } else if (displaySetting.fromCloneDeleteSave == LabelEditType.CLONE) {
                    this.notifyService.success('CLONED_TEMPLATE_SUCCESSFULLY');
                  } else if (displaySetting.fromCloneDeleteSave == LabelEditType.SAVE) {
                    this.notifyService.success('SAVED_TEMPLATE_SUCCESSFULLY');
                  } else if (displaySetting.fromCloneDeleteSave == LabelEditType.APPLY) {
                    this.notifyService.success('APPLIED_TEMPLATE_SUCCESSFULLY');
                  }
                }
                this.showGeneralSettings(displaySetting);
            }

            for (let dObj of postObj) {
                const index = this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.findIndex(
                    (obj) => obj.KeyName == dObj.KeyName,
                );
                this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data[index].SelectedValue.value =
                    dObj.SelectedValue.value;

                switch (dObj.KeyName) {
                    case 'USER_DEFAULTS.POG.VIEW_MODE_DEFAULT':
                        this.planogramService.rootFlags[this.sharedService.activeSectionID].mode =
                        this.planogramStore.appSettings.defaultViewMode =
                            dObj.SelectedValue.value as number;
                            this.render2d.isDirty = true;
                        break;
                    case 'USER_DEFAULTS.POG.PROPERTYGRID_VIEW_SETTING':
                        this.planogramStore.appSettings.propertygrid_default_view = dObj.SelectedValue.value as number;
                        break;

                    case 'TURN_ON_FIXT_LABEL':
                        this.planogramStore.appSettings.shelfLabelOn = dObj.SelectedValue.value as boolean;
                        this.planogramCommonService.obtainShelfLabelParams(
                            this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data,
                        );
                        this.planogramCommonService.loadFixtLabelItems();
                        this.render2d.isDirty = true;
                        break;

                    case 'TURN_ON_LABEL':
                        this.planogramService.labelOn = Boolean(dObj.SelectedValue.value);
                        this.planogramCommonService.loadLabelItems();
                        this.render2d.isDirty = true;
                        break;

                    case 'TURN_ON_ANNOTATION':
                        this.planogramService.annotationON = Boolean(dObj.SelectedValue.value);
                        let activeSecID = this.sharedService.activeSectionID;
                        let rootObject = this.sharedService.getObject(activeSecID, activeSecID) as Section;
                        if (!this.planogramService.annotationON) {
                          activeSecID && (this.planogramService.rootFlags[activeSecID].isAnnotationView = 0);
                        } else {
                          activeSecID && (this.planogramService.rootFlags[activeSecID].isAnnotationView = 1);
                        }
                        if (activeSecID) {
                          this.planogram2DService.toggleAnnotations(rootObject).subscribe();
                          rootObject.showAnnotation = this.planogramService.rootFlags[activeSecID].isAnnotationView;
                          this.sharedService.updateAnnotationPosition.next(true);
                        }
                        this.render2d.isDirty = true;
                          break;

                    case SETTINGS.IsTooltipOff:
                        this.planogramStore.appSettings.turnoff_tooltip = dObj.SelectedValue.value as boolean;
                        this.sharedService.turnoNOffSub.next(Boolean(dObj.SelectedValue.value));
                        break;

                    case 'TURN_OFF_POS_CALLOUT':
                        this.planogramStore.appSettings.posCallOutOff = dObj.SelectedValue.value as boolean;
                        this.sharedService.updateAnnotationPosition.next(true);
                        break;

                    case 'TURN_OFF_FIXT_CALLOUT':
                        this.planogramStore.appSettings.fixtCallOutOff = dObj.SelectedValue.value as boolean;
                        this.sharedService.updateAnnotationPosition.next(true);
                        break;

                    case 'USER_DEFAULTS.POG.SHELF_AUTO_LOAD_POG':
                        this.planogramStore.appSettings.SHELFAUTOLOADPOG = dObj.SelectedValue.value as string;
                        break;

                    case 'SHOWLABEL_IF_NOPACKAGEIMAGE':
                        this.planogramStore.appSettings.showLabelIfNoPackageImage = dObj.SelectedValue.value as string;
                        //If images are not available, a position label should be displayed; this flag is added for rendering components after settings are applied.
                        this.render2d.isDirty = true;
                        break;

                    case 'STATUSBAR_SETTINGS':
                        this.applyStatusbarSettings(dObj.SelectedValue.value as string);
                        break;

                    case 'AUTOSAVE_IS_ENABLE':
                        this.planogramStore.appSettings.autoSaveEnableFlag = dObj.SelectedValue.value as boolean;
                        this.planogramService.setAutoSave.next(true);
                        break;

                    case 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_DIRECTION':
                        this.planogramStore.appSettings.peg_direction = dObj.SelectedValue.value as number;
                        break;
                    case 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.HORIZONTAL_SPACING':
                        this.planogramStore.appSettings.horizontal_spacing = dObj.SelectedValue.value as number;
                        break;
                    case 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.VERTICAL_SPACING':
                        this.planogramStore.appSettings.vertical_spacing = dObj.SelectedValue.value as number;
                        break;
                    case 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_OVERHANG_EDGE':
                        this.planogramStore.appSettings.overhanging_items_beyond_edge = dObj.SelectedValue.value as boolean;
                        break;
                    case 'USER_DEFAULTS.STANDARDSHELF.POSITION_MOVEMENT':
                        this.planogramStore.appSettings.StandardShelfPositionMovement = dObj.SelectedValue.value as number;
                        break;
                    case 'USER_DEFAULTS.COFFIN.POSITION_MOVEMENT':
                        this.planogramStore.appSettings.CoffinPositionMovement = dObj.SelectedValue.value as number;
                        break;
                    case 'DOCK_TOOLBAR':
                        this.planogramStore.appSettings.dockToolbar = dObj.SelectedValue.value as boolean;
                        this.dockToolbar(dObj);
                        break;
                    case 'DOCK_STATUSBAR':
                        this.planogramStore.appSettings.dockStatusbar = dObj.SelectedValue.value as boolean;
                        break;
                    default:
                        break;
                }

                if ([LabelType.POSITION, LabelType.FIXTURE].includes(dObj.KeyName as LabelType)) {
                  if (dObj.KeyName == LabelType.POSITION) {
                    this.PositionTemplates = dObj;
                  } else if (dObj.KeyName == LabelType.FIXTURE) {
                    this.FixtureTemplates = dObj;
                  }
                  this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data.forEach(set => {
                    if (set.KeyName == dObj.KeyName && set.KeyGroup == 'POG') {
                      set.KeyValue = dObj.KeyValue;
                      set.SelectedValue.value = dObj.KeyValue;
                    }
                  });
                  if (labelsApply || displaySetting.fromCloneDeleteSave == LabelEditType.DELETE) {
                    this.updateLabelSettingsPOG(dObj.KeyName, dObj.KeyValue as string);
                    this.render2d.isDirty = true;
                    this.planogram2DService.activate();
                    if(this.panelService?.panelPointer[this.panelService.activePanelID]?.view === PanelView.THREED){
                        this.threedPlanogramService.threedReRender.next(true);
                    }
                    if (this.pogSideNavStateService.shoppingCartView.isPinned || this.pogSideNavStateService.activeVeiw == PogSideNaveView.SHOPPING_CART || this.pogSideNavStateService.shoppingCartView.pos === PogSideNaveView.SHOPPING_CART_TOP) {
                      this.shoppingCartService.updateLabelsInCart.next(true);
                    }
                  }
                }

                if (this.pogSideNavStateService.shoppingCartView.isPinned || this.pogSideNavStateService.activeVeiw == PogSideNaveView.SHOPPING_CART || this.pogSideNavStateService.shoppingCartView.pos === PogSideNaveView.SHOPPING_CART_TOP) {
                    this.shoppingCartService.checkForChangeInCart.next(false);
                }
                this.planogramService.updateNestedStyleDirty = true;;
                this.cd.markForCheck();
            }
            setTimeout(() => {
                this.sharedService.updateFooterNotification.next(true);
            });
            if (evt) {
                this.dialog.close();
            }
        });

        this.subscriptions.add(obs);
    }

    private dockToolbar(dObj): void {
        this.sharedService.mouseoverDockToolbar(dObj.SelectedValue.value, true);
    }


    private updateLabelSettingsPOG(keyName: string, keyVal: string): void {
        const activeTemplate = this.planogramCommonService.setDefaultsLabels(keyVal);
        if (keyName == LabelType.POSITION) {
        this.planogramService.labelItem['POSITION_LABEL'] = activeTemplate;
        this.planogramService.labelFeild1isEnabled = this.planogramService.labelItem['POSITION_LABEL'].LABEL_1.ENABLED;
        this.planogramService.labelFeild2isEnabled = this.planogramService.labelItem['POSITION_LABEL'].LABEL_2.ENABLED;
        this.planogramService.isPegboardLabelEnabled2 = this.planogramService.labelItem['POSITION_LABEL'].LABEL_2.SHOW_PEGBOARD_LABEL;
        this.planogramService.isPegboardLabelEnabled1 = this.planogramService.labelItem['POSITION_LABEL'].LABEL_1.SHOW_PEGBOARD_LABEL;
        let expression1: string = this.planogramService.labelItem['POSITION_LABEL'].LABEL_1.LABEL;


        let expression2: string = this.planogramService.labelItem['POSITION_LABEL'].LABEL_2.LABEL;
        expression1 = expression1?.replaceAll('\\\\\\n', '\n')
          .replaceAll('\\\\n', '\n')
          .replaceAll('\\n', '\n')
          .replaceAll('\n', '\\n')
          .replaceAll('.', '·');
        if (!this.planogramService.labelItem['POSITION_LABEL'].LABEL_1.WORD_WRAP) {
          expression1?.replaceAll('\\\\\\n', '')
            .replaceAll('\\\\n', '')
            .replaceAll('\\n', '')
            .replaceAll('\n', '');
        }

        expression2 = expression2?.replaceAll('\\\\\\n', '\n')
          .replaceAll('\\\\n', '\n')
          .replaceAll('\\n', '\n')
          .replaceAll('\n', '\\n')
          .replaceAll('.', '·');
        if (!this.planogramService.labelItem['POSITION_LABEL'].LABEL_2.WORD_WRAP) {
          expression2?.replaceAll('\\\\\\n', '')
            .replaceAll('\\\\n', '')
            .replaceAll('\\n', '')
            .replaceAll('\n', '');
        }
        let resp = this.planogramCommonService.getLabelExpr(expression1, this.labelFiltersPosition, activeTemplate?.LABEL_1?.SHOW_LABEL_TITLE);
        this.planogramService.labelExpression1 = resp.labelExpression;
        this.planogramService.labelField1 = resp.labelField;
        let resp2 = this.planogramCommonService.getLabelExpr(expression2, this.labelFiltersPosition, activeTemplate?.LABEL_2?.SHOW_LABEL_TITLE);
        this.planogramService.labelExpression2 = resp2.labelExpression;
        this.planogramService.labelField2 = resp2.labelField;
      }
      else if (keyName == LabelType.FIXTURE) {
        this.planogramService.labelFixtItem[LabelType.FIXTURE] = activeTemplate;

        let expression1 = activeTemplate.LABEL_1.LABEL;
        let expression2 = activeTemplate.LABEL_2.LABEL;

        let resp1 = this.planogramCommonService.getLabelExpr(expression1, this.planogramService.labelFixtAllFields, activeTemplate?.LABEL_1?.SHOW_LABEL_TITLE);
        this.planogramService.labelFixtExpression[0] = resp1.labelExpression;
        this.planogramService.labelFixtField[0] = resp1.labelField;
        this.planogramService.labelFixtEnabled[0] = activeTemplate.LABEL_1.ENABLED;
        let resp2 = this.planogramCommonService.getLabelExpr(expression2, this.planogramService.labelFixtAllFields, activeTemplate?.LABEL_2?.SHOW_LABEL_TITLE);
        this.planogramService.labelFixtExpression[1] = resp2.labelExpression;
        this.planogramService.labelFixtField[1] = resp2.labelField;
        this.planogramService.labelFixtEnabled[1] = activeTemplate.LABEL_2.ENABLED;
      }

    }


    public applyStatusbarSettings(dObj: string): void {
        let obj: any = dObj
            ? Object.assign({}, JSON.parse(dObj))
            : { fixture: [], pog: [], position: [] };
        Object.keys(obj)
            .filter((key) => ['pog', 'position', 'fixture'].includes(key))
            .forEach((key) => (this.planogramStore.appSettings.statusBarConfig[key] = obj[key]));
        this.sharedService.footerStatusBarUpdate.next(true);
    }

    private isPegOverhanging(pogObject: Section): boolean {
        return pogObject.getAllPegFixtures()
            .some(pegFixture => pegFixture.doesOverhangItemsExist());
    }

    private isValidChange(value: number, key: string): { flag: boolean; errMsg: string } {
        let flag = true,
            errMsg = '';
        //Validation check of overhang to the edge of the pegboard
        if (key == 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_OVERHANG_EDGE' && !value) {
            const activeSecID = this.sharedService.getActiveSectionId();
            let rootObject;
            Utils.isNullOrEmpty(activeSecID)
                ? ''
                : (rootObject = this.sharedService.getObject(activeSecID, activeSecID));
            if (rootObject && this.isPegOverhanging(rootObject)) {
                flag = false;
                errMsg = 'ITEMS_OVERHAND_ON_PEG_CANT_OFF_OVERHANG';
            }
        }
        // validation for standardshelf , Coffin position movement
        if (key == AppConstantSpace.STANDARDSHELFPOSTION.POSITION_MOVEMENT || key == AppConstantSpace.COFFINPOSTION.POSITION_MOVEMENT) {
            if (value < 0.5) {
                flag = false;
                errMsg = 'POSITION_MOVEMENT_VALUE_SHOULD_BE_BETWEEN_0.5_AND_9';
            }
            if (value > 9) {
                flag = false;
                errMsg = 'POSITION_MOVEMENT_VALUE_SHOULD_BE_BETWEEN_0.5_AND_9';
            }
        }
        return { flag: flag, errMsg: errMsg };
    }

    public revertBack(revrtObj): void {
        let AppSettingsSvc = this.planogramStore.appSettings.allSettingsObj.GetAllSettings;
        var oldValue = '';
        switch (revrtObj.key) {
            case 'USER_DEFAULTS.PEGBOARD_AUTO_INSERT.PEG_OVERHANG_EDGE': {
                oldValue = (AppSettingsSvc as any).overhanging_items_beyond_edge;
                break;
            }
        }
        // this.item[revrtObj.key] = oldValue;
        this.notifyService.error(revrtObj.errMsg);
    }

  private addCustomizedFontSizes(obj: PogSettingParamKey, templates: LabelTemplate[]): void {
    let fontsizeVal = Object.assign({}, find(this.appSettingData.data, { KeyName: obj.key }));
    templates?.forEach(currTemplate => {
      if (!fontsizeVal.Values.find(v => v.value == currTemplate.LABEL_1.FONT_SIZE)) {
        fontsizeVal.Values.push({
          text: currTemplate.LABEL_1.FONT_SIZE.toString(),
          value: Number(currTemplate.LABEL_1.FONT_SIZE),
        });
      }
      if (!fontsizeVal.Values.find(v => v.value == currTemplate.LABEL_2.FONT_SIZE)) {
        fontsizeVal.Values.push({
          text: currTemplate.LABEL_2.FONT_SIZE.toString(),
          value: Number(currTemplate.LABEL_2.FONT_SIZE),
        });
        obj['fieldObj'] = fontsizeVal;
      } else {
        obj['fieldObj'] = fontsizeVal;
      }
    });
  }
}
