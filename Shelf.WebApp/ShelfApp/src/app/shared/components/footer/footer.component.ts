import { Component, OnInit, Input, AfterViewInit, ViewChild, OnDestroy } from '@angular/core';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { IntlService } from '@progress/kendo-angular-intl';
import { InformationConsoleComponent } from './information-console/information-console.component';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    SharedService, PanelService, ParentApplicationService, PlanogramStoreService,
    PlanogramService, DictConfigService, PlanogramSaveService, AppSettingsService, LanguageService, PropertyGridService
} from '../../services';
import { AppSettings, Dictionary, PanelIds, StoreAppSettings } from '../../models';
import { Section } from '../../classes';
import { NavigationEnd, Router, RouterEvent } from '@angular/router';
import { SelectableList } from '../../services/common/shared/shared.service';

declare const window: any;

@Component({
    selector: 'srp-footer',
    templateUrl: './footer.component.html',
    styleUrls: ['./footer.component.scss'],
})
export class FooterComponent implements OnInit, AfterViewInit, OnDestroy {
    @Input() Detail: string;
    @Input() Path: string;
    @ViewChild('infoConsole') infoConsole: InformationConsoleComponent;
    public infoLogCount: number = 0;
    public earliarinfoLogCount: number = 0;
    public footerMsg: string = ' ';
    public showHideStatusBarMsg: boolean = false;
    public statusConfigStr: any;
    public customStatusBarFields: any = {
        2660: '',
        2663: '',
        3769: '',
        3763: '',
        3770: '',
        3759: '',
        3941: '',
        3761: '',
    };
    public pogStatus = {
        '1': 'POG_STATUS_EXPERIMENT',
        '2': 'POG_STATUS_DRAFT',
        '3': 'POG_STATUS_ACTIONABLE',
        '4': 'POG_STATUS_PENDING',
        '5': 'POG_STATUS_LIVE',
        '6': 'POG_STATUS_RETIRED',
    };
    public interval: number;
    public isAutoSave: boolean;
    public isSaveAllInProgress: boolean;
    public autoSaveTitle: string;
    public translateAutoSaveOn: string;
    public translateAutoSaveOff: string;
    public translateMinute: string;
    public translateSaving: string;
    public translateSaveInProgress: string;
    public translateSaveAllInProgress: string;
    public translateSaved: string;
    public translateSaveAllInProgressStatus: string;
    public pogSavingMessage: string;
    public pogSavingMessageTooltip: string;

    private subscriptions = new Subscription();
    private isScenarioPage: boolean = false;
    public skeletonDateTimeFormat: string;

    asynSaveStatus: boolean = false;
    autoSaveEnableFlag: boolean = false;
    showAutoSaveProcessingGif = false;
    public console = {
        Summary: {
            Error: 0,
            Information: 0,
            Warning: 0,
        },
        result: 0,
        settings: {
            error: true,
            information: false,
            warning: false,
            count: 0,
        },
        earlier: true,
        icon: 'block',
    };

    public get isShelfLoaded(): boolean {
        return this.sharedService.isShelfLoaded || !this.parentApp.isAllocateApp;
    }
    public get isAutoSaveEnabled(): boolean {
        return (this.parentApp.isShelfApp || this.parentApp.isWebViewApp || !this.parentApp.isAllocateApp) && !this.isScenarioPage;
    }
    public get canShow(): boolean {
        return this.parentApp.isReady
            && !this.parentApp.isAllocateApp
            && !this.parentApp.isAssortAppInIAssortNiciMode;
    }
   public get hideStatusBarMsg(): boolean {
        switch(this.panelService.activePanelID){
            case PanelIds.One:
                return (this.panelService.panelPointer?.panelOne?.view === 'PrintAndReport');
            case PanelIds.Two:
                return (this.panelService.panelPointer?.panelOne?.view === 'PrintAndReport');
                default: return false;
        }
   }
    constructor(
        private readonly intl: IntlService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly planogramService: PlanogramService,
        private readonly sharedService: SharedService,
        private readonly dictConfigService: DictConfigService,
        private readonly panelService: PanelService,
        private readonly planogramSaveService: PlanogramSaveService,
        private readonly propertyGridService: PropertyGridService,
        private readonly parentApp: ParentApplicationService,
        private readonly appSettingsService: AppSettingsService,
        private readonly languageService: LanguageService,
        private readonly router: Router
    ) {
        this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
        this.subscriptions.add(this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: NavigationEnd): void => {
            let currentUrl = event.url
            this.isScenarioPage = currentUrl === '/' || currentUrl === '/sp';
            if (currentUrl === '/' || currentUrl === '/sp') {
                this.footerMsg = '';
            }
        }));
    }

    ngOnInit() {
        this.translateSaving = this.translate.instant('POG_SAVING');
        this.translateSaved = this.translate.instant('POG_SAVED');
        this.translateAutoSaveOn = this.translate.instant('FOOTER_AUTOSAVE_ON');
        this.translateAutoSaveOff = this.translate.instant('FOOTER_AUTOSAVE_OFF');
        this.translateMinute = this.translate.instant('TIME_MINUTE');
        this.translateSaveAllInProgressStatus = this.translate.instant('SAVING_ALL_AND_PROCESSED_COUNT');
        this.translateSaveInProgress = this.translate.instant('FOOTER_ASYNC_SAVE');
        this.translateSaveAllInProgress = this.translate.instant('SAVE_ALL_IN_PROGRESS');

        this.init();
        this.changeIcon();
        this.subscriptions.add(
            this.sharedService.footerStatusBarUpdate.subscribe((res: any) => {
                if (res) {
                    this.init();
                }
            })
        );
        this.subscriptions.add(
            this.dictConfigService.onReady
                .pipe(filter(isReady => isReady))
                .subscribe(() => this.init()));
        this.subscriptions.add(
            this.sharedService.updateFooterNotification.subscribe((res) => {
                this.footerMsg = this.selectedStatusMsg();
            }));
        // update footer message when there are changes on pog values.
        this.subscriptions.add(
            this.sharedService.updateValueInPlanogram.subscribe((res) => {
                this.footerMsg = this.selectedStatusMsg();
            }));
    }

    public ngOnDestroy() {
        this.subscriptions.unsubscribe();
    }

    public init() {
        if (
            this.dictConfigService.isReady &&
            this.planogramStore.appSettings &&
            this.planogramStore.appSettings.statusBarConfig
        ) {
            this.statusConfigStr = _.cloneDeep(this.planogramStore.appSettings.statusBarConfig);
            Object.keys(this.statusConfigStr).map(i => {
                const options = this.statusConfigStr[i].map((a) => ({
                    IDDictionary: a
                }));
                this.statusConfigStr[i] = this.dictConfigService.dictionaryConfigCollection(options as Dictionary[]);
            });

            const options = Object.keys(this.customStatusBarFields).map((ele) => ({
                IDDictionary: parseInt(ele)
            }));
            const dictDeatils: Dictionary[] = this.dictConfigService.dictionaryConfigCollection(options as Dictionary[]);
            dictDeatils.forEach(dictObj => {
                this.customStatusBarFields[dictObj.IDDictionary] = dictObj.value;
            });
        }
    }
    ngAfterViewInit(): void {
        // TODO: @malu why is this updated in ngAfterViewInit?
        let autoSaveSub = this.planogramService.setAutoSave.subscribe((res) => {
            this.changeIcon();
            if (res) {
                this.initializeAutoSave();
            } else {
                this.initializeAutoSave(true);
            }
        });
        this.subscriptions.add(autoSaveSub);
    }

    public checkDirty(): boolean {
        let sectionID = this.sharedService.activeSectionID;
        const selectedObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        if(selectedObj){
            const currObj = this.planogramService.getCurrentObject(selectedObj.globalUniqueID);
            return this.planogramService.checkIfObjectDirty(currObj);
        }
        return false;
    }

    private initializeAutoSave(clearInterval?: boolean) {
        let loadedPogs = this.planogramStore.mappers.filter(it => it.isLoaded);
        loadedPogs.forEach(loadedPog => {
            const pog = this.planogramStore.getPogById(loadedPog.IDPOG);
            if (pog) {
                const sectionObject = pog.sectionObject as Section;
                if (clearInterval) {
                    this.planogramSaveService.clearAutoSave(sectionObject.$id);
                    return;
                }
                this.planogramSaveService.resetAutoSave(sectionObject, sectionObject.$id);
            }
        });
    }

    public OpenInformationConsole = () => {
        let box = document.querySelector('.errorIndicator');
        if (box) box.classList.remove('blinker');
        if (this.infoConsole.isOpenInfoConsole) {
            this.infoConsole.closeInformationConsole();
        } else {
            this.infoConsole.openInformationConsole();
        }
    };

    public UpdateInfoLogsBadge = (data: any) => {
        this.console = data?.consoleInfo ? data.consoleInfo : {};
        if (Object.keys(this.console).length === 0 || !this.console.settings) {
            this.console = {
                Summary: {
                    Error: 0,
                    Information: 0,
                    Warning: 0,
                },
                result: 0,
                settings: {
                    error: true,
                    information: false,
                    warning: false,
                    count: 0,
                },
                earlier: true,
                icon: 'block',
            };
        }
        if (
            (this.console?.settings?.information == false && this.console?.settings?.warning == false) ||
            data.count == 0
        ) {
            this.console.settings.error = true;
            this.console.settings.information = false;
            this.console.settings.warning = false;
        }
        this.console.icon = this.console?.settings?.error
            ? 'block'
            : this.console?.settings?.warning
                ? 'warning'
                : this.console?.settings?.information
                    ? 'info'
                    : 'block';
        //Count of information console should show individual count based on priority
        switch (this.console.icon) {
            case 'block':
                this.infoLogCount = data.logs.filter((item) => item['Type'] == 'E').length;
                break;
            case 'warning':
                this.infoLogCount = data.logs.filter((item) => item['Type'] == 'W').length;
                break;
            case 'info':
                this.infoLogCount = data.logs.filter((item) => item['Type'] == 'I').length;
                break;
            default:
                this.infoLogCount = 0;
                break;
        }
        if (this.earliarinfoLogCount != this.infoLogCount) {
            //count in information console changes i.e inc/dec, then only blink should start else it should stay in same state
            let box = document.querySelector('.errorIndicator');
            if (box) {
                box.classList.add('blinker');
            }
            this.earliarinfoLogCount = this.infoLogCount;
        }
    }


    private convertToLocaleValue(numValue: number): string {
        if (!isNaN(numValue) && numValue != null && numValue != undefined && typeof numValue != 'boolean') {
            if (numValue % 1 == 0) {
                numValue = Math.round(numValue); //kendo.toString(numValue, "n0");
            } else {
                numValue = Math.round(numValue * 100) / 100; //kendo.toString(numValue, "n");
            }
        }
        return numValue.toString();
    };

    public mergeObjWithMetadata = (obj, objectType, statusMsgTemplate) => {

        let settigns = JSON.parse(JSON.stringify(this.propertyGridService.fixtureSettings));
        settigns.tab.forEach((singleTab) => {
            singleTab.children.forEach((child) => {
                if (this.checkForApplicablity(obj, child)) {
                    let index = statusMsgTemplate.fixture.findIndex((ele) => ele.IDDictionary === child.IDDictionary);
                    if (index !== -1) {
                        statusMsgTemplate.fixture.splice(index, 1); // Here deleting IDDictionary objects that don't want to display in status bar(in footer) if object field ReadOnly === true
                    }
                }
            });
        });

        let msg = '';
        if (objectType == 'block') {
            msg = `Name: ${obj.attribute === 'Fixture' ? obj.attributeValueFixture : obj.attributeValue} Type: ${obj.blockType} Attribute: ${obj.attribute}`;
            return msg;
        }
        this.skeletonDateTimeFormat = `${this.languageService.getDateFormat()} ${this.languageService.getTimeFormat()}`;
        statusMsgTemplate[objectType]?.forEach((item, key) => {
            if (!Utils.isNullOrEmpty(item.field)) {
                var itemArr = item.field.split('.');
                if (itemArr.length == 1) {
                    item.value = obj[itemArr[0]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                } else if (itemArr.length == 2) {
                    item.value = obj[itemArr[0]][itemArr[1]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                } else if (itemArr.length == 3) {
                    item.value = obj[itemArr[0]][itemArr[1]][itemArr[2]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                } else if (itemArr.length == 4) {
                    item.value = obj[itemArr[0]][itemArr[1]][itemArr[2]][itemArr[3]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                } else if (itemArr.length == 5) {
                    item.value = obj[itemArr[0]][itemArr[1]][itemArr[2]][itemArr[3]][itemArr[4]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                } else if (itemArr.length == 6) {
                    item.value = obj[itemArr[0]][itemArr[1]][itemArr[2]][itemArr[3]][itemArr[4]][itemArr[5]];
                    item.value = item.value && this.convertToLocaleValue(item.value);
                }
                item.value =
                    item.LkUpGroupName != null
                        ? (
                            this.planogramStore.lookUpHolder[item.LkUpGroupName]?.options.filter(function (itm) {
                                return itm.value == item.value;
                            }, this)[0] || {}
                        ).text
                        : item.value;
                if (item.value != undefined && item.value != 'NaN%' && item.value != 'NaN') {
                    if (item.title == this.customStatusBarFields[2660]) {
                        msg +=
                            this.translate.instant('LINIEAR_USED_PERCENT') +
                            ':' +
                            ' ' +
                            item.value +
                            ' ';
                    } else if (
                        item.title == this.customStatusBarFields[3759] ||
                        item.title == this.customStatusBarFields[3763] ||
                        item.title == this.customStatusBarFields[3761]
                    ) {
                        msg += item.value + ' ';
                    } else if (
                        item.title == this.customStatusBarFields[3770] ||
                        item.title == this.customStatusBarFields[3769] ||
                        item.title == this.customStatusBarFields[3941]
                    ) {
                        msg += item.title + ':' + ' ' + item.value + ' ';
                    } else if (
                        item.title == this.customStatusBarFields[2663] &&
                        objectType == AppConstantSpace.SECTIONOBJ
                    ) {
                        msg += item.value + ' ';
                    } else {
                        item.value =
                            item.FormatType == 'date'
                                ? this.intl.formatDate(this.intl.parseDate(item.value), this.skeletonDateTimeFormat)
                                : item.value;
                        msg += item.title + ': ' + item.value + ' ';
                    }
                }
            }
        });
        //this.footerMsg = msg;
        return msg;
    };

    public selectedStatusMsg(): string {
        let sectionID = this.sharedService.activeSectionID;
        let activeSectionObj = this.sharedService.getObject(sectionID, sectionID);

        let componentNumber: any = this.sharedService.getActiveComponentNumber();
        if (componentNumber == 15 || componentNumber == 16) return '';

        if (!activeSectionObj) return '';

        let statusMsgTemplate = this.planogramStore.appSettings.statusBarConfig;
        statusMsgTemplate = JSON.parse(JSON.stringify(this.statusConfigStr));

        let lastClickedObj;
        if (activeSectionObj && this.planogramService.rootFlags[activeSectionObj.$id] != undefined) {
            lastClickedObj = this.planogramService.getSelectedObject(activeSectionObj.$id)[
                this.planogramService.rootFlags[activeSectionObj.$id].selectionCount - 1
            ];
        }
        if (lastClickedObj == undefined) return '';
        else if (lastClickedObj.ObjectDerivedType == AppConstantSpace.ANNOTATION) {
            lastClickedObj = activeSectionObj;
        }

        if (this.sharedService.link == 'allocate') {
            let msg = this.mergeObjWithMetadata(
                lastClickedObj,
                lastClickedObj.ObjectType.toLowerCase(),
                statusMsgTemplate,
            );
            if (msg !== window.footerStatusItemID) {
                window.footerStatusItemID = msg;
                window.parent.ALCTfooteramsg(msg);
            } else return;
        } else if (this.sharedService.mode == 'iAssortNICI' && lastClickedObj.$id !== window.footerStatusItemID) {
            window.footerStatusItemID = lastClickedObj.$id;
            let res = {};
            let text = this.mergeObjWithMetadata(
                lastClickedObj,
                lastClickedObj.ObjectType.toLowerCase(),
                statusMsgTemplate,
            );
            res['IDPackage'] = lastClickedObj.Position ? lastClickedObj.Position.IDPackage : '';
            res['FooterMsg'] = text;
            res['CSC'] = lastClickedObj.Position ? lastClickedObj.Position.Product.Csc_Id : '';

            window.parent.postMessage('invokePaceFunc:selectPackage,' + JSON.stringify(res) + ' ', '*');
        } else {
            if (lastClickedObj.ObjectDerivedType != 'Annotation') {
                return this.mergeObjWithMetadata(
                    lastClickedObj,
                    lastClickedObj.ObjectType.toLowerCase(),
                    statusMsgTemplate,
                );
            }
        }
    }

    public actionStatusMsg(): string {
        return '';
    }

    public activeSectionLongDesc(): string {
        let sectionID = this.sharedService.activeSectionID;
        let activeSectionObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        let componentNumber: any = this.sharedService.getActiveComponentNumber();
        if (activeSectionObj) {
            let footerStatus = '';
            switch (componentNumber) {
                case 2:
                    footerStatus = this.translate.instant('PANEL_HEADER_POSITION');
                    break;
                case 3:
                    footerStatus = this.translate.instant('PANEL_HEADER_FIXTURE');
                    break;
                case 5:
                    footerStatus = this.translate.instant('PANEL_HEADER_ITEM');
                    break;
                case 6:
                    footerStatus = this.translate.instant('TRANSLATE_INVENTORY');
                    break;
                case 7:
                    footerStatus = this.translate.instant('PANEL_HEADER_PERFORMANCE');
                    break;
                default:
                    footerStatus =
                        activeSectionObj.Name +
                        ' [ ' +
                        this.translate.instant(this.pogStatus[activeSectionObj.IDPOGStatus]) +
                        ' ] ';
            }
            return footerStatus;
        }
        return '';
    }

    public toggleAutoSave() {
        this.isAutoSave = !this.isAutoSave;
    }

    public checkIfSaveInProgress() {
        this.isSaveAllInProgress = false;
        this.pogSavingMessage = this.translateSaving;
        this.pogSavingMessageTooltip = this.translateSaveInProgress;
        this.changeIcon();
        let AppSettingsSvc = this.planogramStore.appSettings;
        if (this.sharedService.isSaveAllInProgress) {
            this.isSaveAllInProgress = true;
            this.pogSavingMessage = `${this.translateSaveAllInProgressStatus}-${this.sharedService.processedPogsInSaveAll.length}/${this.sharedService.allPogsToSaveInSaveAll.length}`;
            this.pogSavingMessageTooltip = this.translateSaveAllInProgress;
            return true;
        }
        if (this.sharedService.getActiveSectionId() != '' && this.sharedService.getActiveSectionId() != undefined) {
            return (
                this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].asyncSaveFlag
                    .isPOGSavingInProgress && AppSettingsSvc.asyncSaveToogleFlag
            );
        }
    }

    public changeIcon() {
        this.autoSaveEnableFlag = this.planogramStore.appSettings.autoSaveEnableFlag;
        this.interval = this.planogramStore.appSettings.autoSaveTimer;
        this.autoSaveTitle = this.autoSaveEnableFlag ? `${this.translateAutoSaveOn} (${this.interval} ${this.translateMinute})` : `${this.translateAutoSaveOff}`;
    }

    private prepareDataForAppSetttingsSave(keyGroup: string, keyName: string, keyValue: string, keyType: string): AppSettings {
        return {
            AppSettings: {
                User: null,
                KeyGroup: keyGroup,
                Values: [
                    {
                        KeyName: keyName,
                        KeyType: keyType,
                        KeyValue: keyValue,
                    },
                ],
            },
        };
    }

    public toggleAutoSaveEnable = () => {
        let AppSettingsSvc = this.planogramStore.appSettings;
        AppSettingsSvc.autoSaveEnableFlag = !AppSettingsSvc.autoSaveEnableFlag;
        this.planogramStore.appSettings.autoSaveEnableFlag = AppSettingsSvc.autoSaveEnableFlag;


        if (this.planogramStore.appSettings.autoSaveEnableFlag) {
            this.initializeAutoSave();
        } else {
            this.initializeAutoSave(true);
        }

        var settingObj = this.prepareDataForAppSetttingsSave(
            'POG',
            'AUTOSAVE_IS_ENABLE',
            AppSettingsSvc.autoSaveEnableFlag.toString(),
            'boolean',
        );
        AppSettingsSvc.allSettingsObj.GetAllSettings.data.forEach((item) => {
            if (item.KeyName == 'AUTOSAVE_IS_ENABLE') {
                item.SelectedValue.value = AppSettingsSvc.autoSaveEnableFlag;
            }
        });

        this.appSettingsService.saveSettings(settingObj).subscribe((res) => {
            this.changeIcon();
        });
    };

    public mouseoverDockToolbar(hover: boolean): void {
        if (this.sharedService.isShelfLoaded && !this.planogramStore.appSettings.dockToolbar) {
            this.sharedService.mouseoverDockToolbar(hover);
        }
    }

    private checkForApplicablity(obj: SelectableList, fixIdDic: any): boolean {
        // Function which takes 1st argument ==> selected Fixture object and 2nd argument ==> IDDictionary object
        // This function calculates the IDDictionary object `ReadOnly` property return true or false depending on the value of `ReadOnly` property
        let IDFixtureType: string = '';
        if (obj.ObjectType == AppConstantSpace.FIXTUREOBJ) {
            IDFixtureType = obj.Fixture.IDFixtureType;
        } else {
            if (obj.ObjectType == AppConstantSpace.POSITIONOBJECT) {
                //get the parent  fixture type and apply
                IDFixtureType = this.sharedService.getParentObject(obj, obj.$sectionID).Fixture.IDFixtureType;
            }
        }
        if (fixIdDic.Applicability != null) {
            //need to break the string into arrays
            let fixFlag: boolean = false;
            const applicabilityValues = fixIdDic.Applicability.split(',');
            for (const apVal of applicabilityValues) {
                if (apVal == IDFixtureType) {
                    fixFlag = true;
                    break;
                }
            }
            if ((this.sharedService.getObject(obj.$sectionID, obj.$sectionID) as Section).LKFixtureMovement == 2) {
                if (fixIdDic.IDDictionary == 325 || fixIdDic.IDDictionary == 326 || fixIdDic.IDDictionary == 327) {
                    fixFlag = false;
                }
            }
            if (!fixFlag) {
                fixIdDic.ReadOnly = true;
            } else {
                fixIdDic.ReadOnly = false;
            }
        }
        return fixIdDic.ReadOnly ? true : false;
    }
}
