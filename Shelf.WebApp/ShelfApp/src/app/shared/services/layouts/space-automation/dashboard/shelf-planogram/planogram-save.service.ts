import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of, forkJoin, Subject } from 'rxjs';
import { catchError, first, map, mergeMap, tap } from 'rxjs/operators';
import { Section } from 'src/app/shared/classes/section';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import {
    IApiResponse, Planogram, apiEndPoints, Planograms,
    PogCheckinCheckout, SavePlanogramSVG, SavePlanogram,
    PogProfileSignatureSettings, POGLibraryListItem, PogActionTypes
} from 'src/app/shared/models';
import {
    UserPermissionsService, InformationConsoleLogService, PlanogramLibraryService,
    PlanogramRendererService, ParentApplicationService,
    HistoryService, NotifyService, PlanogramService, PlanogramStoreService, SharedService, AllocateNpiService, AllocateSaveService, AllocateFixtureService, AllocateEventService
} from 'src/app/shared/services';
import { ConsoleLogService } from 'src/app/framework.module';
import { SVGObject } from 'src/app/shared/models/planogram/planogram';
import { ConfigService } from '../../../../common/configuration/config.service';
import { TranslateService } from '@ngx-translate/core';
declare const window: any;

@Injectable({
    providedIn: 'root',
})
export class PlanogramSaveService {

    public savePogAndExit: boolean = false;
    public asyncSavePogsStatusMessage: string = ''; //consolidated pogs save status message, used for save all
    public processNextPogInSaveAll: Subject<boolean> = new Subject<boolean>(); // used for save all
    public isSaveDataPrepInProgress: boolean = false; //used for save all, needs to be set to true when save started and to false when data prep complete or save discontinued due to save validation failure
    public saveDataPrepSectionIdsInQueue: string[] = []; //used for save all, this to maintain pogs in queue for data preparation for save post api
    public saveInProgress: boolean = false;

    constructor(
        private readonly http: HttpClient,
        private readonly planogramStore: PlanogramStoreService,
        private readonly planogramService: PlanogramService,
        private readonly sharedService: SharedService,
        private readonly notify: NotifyService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly historyService: HistoryService,
        private readonly userPermission: UserPermissionsService,
        private readonly planogramRender: PlanogramRendererService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly log: ConsoleLogService,
        private readonly allocateNpi: AllocateNpiService,
        private readonly allocateSave: AllocateSaveService,
        private readonly envConfig: ConfigService,
        private readonly translate: TranslateService,
        private readonly allocateFixture: AllocateFixtureService,
        private readonly allocateEventService: AllocateEventService,
    ) { }

    public attemptToAutoSave(dataSource: Section, sectionID: string): Observable<boolean> {
        //autosave is not enabled in settings
        if (!this.planogramStore.appSettings.autoSaveEnableFlag) return of(false);
        let rootFlags = this.planogramService.rootFlags[sectionID];

        if (this.sharedService.asyncSavePogCap >= this.planogramStore.appSettings.asyncSavePogCap) {
            this.resetAutoSave(dataSource, sectionID);
        }

        if (rootFlags.isSaveDirtyFlag && rootFlags.isAutoSaveDirtyFlag) {
            rootFlags.isAutoSaveDirtyFlag = false;

            const observable: Observable<boolean> = this.savePlanogram(dataSource, sectionID);
            observable.pipe(tap(() => {
                this.log.info('AutoSave Completed for ' + dataSource.IDPOG + 'in server');
                rootFlags.isAutoSaveDirtyFlag = false;
            }),
                catchError((err, caught) => {
                    //.error("Error during AutoSave");
                    this.log.error('Error during AutoSave');
                    return caught;
                }),
            );
            return observable;

        }
        return of(false);
    }

    public resetAutoSave(dataSource: Section, sectionID: string): void {
        this.log.info('resetAutoSave timer initiated');
        this.clearAutoSave(sectionID);
        this.sharedService.autoSaveTimerPromise[sectionID] = setInterval(() => {
            this.attemptToAutoSave(dataSource, sectionID).pipe(first()).subscribe();
        }, this.planogramStore.appSettings.autoSaveTimer * 60 * 1000);
        this.log.info(' autosave timer has reset');
    }

    public clearAutoSave(sectionID: string): any {
        this.log.info('clearAutoSave', sectionID);
        if (this.sharedService.autoSaveTimerPromise[sectionID]) {
            clearInterval(this.sharedService.autoSaveTimerPromise[sectionID]);
            this.log.info('resetAutoSave timer cancelled');
        }
    }

    public initiateAutoSave(dataSource: Section, sectionID: string): void {
        if (this.planogramStore.appSettings.autoSaveEnableFlag) {
            this.resetAutoSave(dataSource, sectionID);
        }
    }

    private getGUIDFromIDPOG(IDPOG: number): string | undefined {
        return this.planogramStore.mappers.find(it => it.IDPOG == IDPOG)?.globalUniqueID;
    }


    public savePlanogram(section: Section, sectionID: string, checkinData?: {}): Observable<boolean> {
        let planogramLibObj;
        let tempAutosaveFlag = false;
        let logCode = '';
        if (
            (this.planogramStore.appSettings.asyncSaveToogleFlag &&
                this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress) ||
            (!this.planogramStore.appSettings.asyncSaveToogleFlag && this.saveInProgress && !this.sharedService.isSaveAllInProgress)
        ) {
            this.notifySaveStatus(section, true, 'SAVE_ALREADY_IN_PROGRESS', 'undo');
            return of(false);
        }

        if (
            this.planogramStore.appSettings.asyncSaveToogleFlag &&
            this.sharedService.asyncSavePogCap >= this.planogramStore.appSettings.asyncSavePogCap
        ) {
            this.notifySaveStatus(section, true, 'MAXIMUM_POG_LIMIT_REACHED_TO_SAVE');
            return of(false);
        }

        if (this.parentApp.isAllocateApp && this.allocateNpi.hasNpiUpdated(sectionID)) {
            this.notifySaveStatus(section, true, 'NPI_UPC_CHANGED_RELOAD_POG');
            return of(false);
        }

        let status: {}[] = [];
        let logList = this.informationConsoleLogService.getAllConsoleLog();
        if (section.IDPOG in logList) {
            if (logList[section.IDPOG].Status) {
                logList[section.IDPOG].Status.Details.forEach((val, ky) => {
                    if (val.IsOverridable) {
                        status.push(val);
                    }
                });
            }
        }
        if (!status.length) {
            status = null;
        }

        if (this.sharedService.mode != 'auto') {
            const guid = this.getGUIDFromIDPOG(section.IDPOG);
            planogramLibObj = this.planogramService.getCurrentObject(guid);
            if (planogramLibObj && planogramLibObj.isInvalid) {
                this.notifySaveStatus(section, true, 'PLANOGRAM_INVALID_SAVE_PROMPT');
                return of(false);
            }

            if (this.isPOGLive(sectionID, true)) {
                return of(false);
            }
        }

        let rootFlags = this.planogramService.rootFlags[sectionID];

        if (!this.planogramStore.appSettings.saveEnableFlag) {
            this.notifySaveStatus(section, true, 'SAVE_DISABLED', 'undo');
            return of(false);
        }

        if (!this.userPermission.checkUserPermissionBySectionID(sectionID, PogActionTypes.UPDATE)) {
            this.notifySaveStatus(section, true, 'USER_NOT_AUTHORIZED_TO_UPDATE_POG', 'undo');
            return of(false);
        }

        this.planogramService.rootFlags[sectionID].asyncSaveFlag.SVG = this.planogramRender.SVG(section, 1, {
            annotationFlag: true,
        });

        const dataSource: Section = section;

        if (this.sharedService.mode == 'auto') {
            dataSource.svg = this.planogramService.rootFlags[sectionID].asyncSaveFlag.SVG;
            this.planogramService.rootFlags[sectionID].asyncSaveFlag.SVG = '';
            dataSource.Automation = true;
        } else {
            this.resetAutoSave(dataSource, sectionID);
            tempAutosaveFlag = false;
            if (this.planogramStore.appSettings.autoSaveEnableFlag || this.planogramStore.appSettings.autoSaveEnableFlag.toString() == 'true') {
                this.planogramStore.appSettings.autoSaveEnableFlag = false;
                tempAutosaveFlag = true;
                logCode = `AutoSave-${dataSource.IDPOG}`;
            }
            //bypassing dirty check in auto mode
            //@Priyanka Kumar : Revisit whether this check is needed
            if (!rootFlags.isSaveDirtyFlag && checkinData !== undefined) {
                this.notifySaveStatus(section, true, 'NO_CHANGES_DETECTED_TO_SAVE');
                return of(false);
            }
        }
        //pog qualifier generation
        if (this.sharedService.mode != 'auto') {
            //check the upd flag and prompt section property grid if udp is yes
            //If no
            if (this.planogramStore.appSettings.pog_profile_applicable && this.sharedService.iSHELF.settings.isReady_pogQualifier != 0) {
                let pogQualifier = this.generatePogQualifier(dataSource);
                if (Utils.isNullOrEmpty(pogQualifier)) {
                    this.notifySaveStatus(section, true, 'FAILED_TO_GENERATE_POG_PROFILE_CODE');
                    return of(false);
                }
                dataSource.POGQualifier = dataSource.PogProfile.Code = pogQualifier;
            }
        }
        dataSource.callCalcFields();

        this.planogramService.removeSectionParent(dataSource);
        if (dataSource.annotations.some(ele => ele.IDPOGObject === 0)) {
            this.processAnnotationIfIDPogObjectMissing(dataSource)
        }
        let dataToPost = JSON.parse(JSON.stringify(dataSource));
        dataToPost.PogObjectExtension = Object.assign(dataSource.annotations);
        this.eachRecursive(dataToPost, { IDPerfPeriod: dataSource.IDPerfPeriod });
        dataToPost.Log = status;
        dataToPost.EnableHistory = this.planogramService.rootFlags[sectionID]
            ? this.planogramService.rootFlags[sectionID].LogHistory.enable
            : false;

        this.sharedService.asyncSavePogCap++;
        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = true;
        this.saveInProgress = true;

        if (this.parentApp.isAllocateApp) {
            if (this.sharedService.isSaveAllInProgress) {
                this.isSaveDataPrepInProgress = false;
                if (this.saveDataPrepSectionIdsInQueue.length) {
                    this.processNextPogInSaveAll.next(true);
                }
            }
            return this.allocateSave.saveAllocatePlanogram(dataSource).pipe(
                tap((response) => {
                    if (response) {
                        this.processAfterPASave(dataSource, sectionID);
                    } else {
                        this.sharedService.asyncSavePogCap--;
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                        this.saveInProgress = false;
                        this.checkAndUpdateAsyncSavePogStatus(dataSource, false, "ERROR");
                        this.resetAutoSave(dataSource, sectionID);
                    }
                })
            );
        } else {
            let compressedData = [];
            let index = 0;
            let jsonData = JSON.stringify(dataToPost);
            for (let count = 0; count < jsonData.length; count = count + 500000) {
                let dataarray = jsonData.slice(count, count + 500000);
                compressedData[index] = dataarray;
                index++;
            }

            let checkinData = this.makePreparePostData([planogramLibObj], 'Checkout', '');

            //The purpose of processNextPogInSaveAll subject is to reduce burden of data preparation on browser by processing one by one
            if (this.sharedService.isSaveAllInProgress) {
                this.isSaveDataPrepInProgress = false;
                if (this.saveDataPrepSectionIdsInQueue.length) {
                    this.processNextPogInSaveAll.next(true);
                }
            }

            return this.panelSavePlanogram(
                compressedData,
                checkinData,
                null,
                this.planogramStore.appSettings.asyncSaveToogleFlag,
                logCode
            ).pipe<boolean, any>(
                mergeMap((d: IApiResponse<SavePlanogram>) => {
                    let guid = this.getGUIDFromIDPOG(dataSource.IDPOG);
                    let observable = of(true);
                    if (guid) {
                        let currentObj = this.planogramService.getCurrentObject(guid);
                        // TODO: handle subscription properly when refactoring planogram helper service
                        //Showing loader when async save flag is false and save all in progress
                        let hideLoader = !(!this.planogramStore.appSettings.asyncSaveToogleFlag && this.sharedService.isSaveAllInProgress);
                        observable = this.planogramLibraryService.updateMapperObject([currentObj], null, hideLoader).pipe(
                            map(it => {
                                return true;
                            })), catchError((err) => {
                                console.log(err);
                                return of(false);
                            });
                    }
                    const serverData = d.Data;
                    const pog = this.planogramStore.downloadedPogs.find(x => x.IDPOG === dataSource.IDPOG && x.sectionObject);
                    if (pog && !this.sharedService.isSaveAllInProgress) {
                        this.sharedService.setActiveSectionId((pog.sectionObject as Section).$sectionID);
                    }

                    if (d.Log.Result != -1) {
                        if (d.Data) {
                            if (d.Data && d.Data.Pog && d.Data.Pog.IDPOGLiveOriginal) {
                                this.log.info(d.Data.Pog.IDPOGLiveOriginal);
                                dataSource.IDPOGLiveOriginal = parseInt(d.Data.Pog.IDPOGLiveOriginal);
                            }

                            dataSource.Version = d.Data.Pog.PogVersion;
                            dataSource.ModifiedTs = d.Data.Pog.ModifiedTs;
                            dataSource.ModifiedBy = d.Data.Pog.ModifiedBy;
                            dataSource.RowVersion = d.Data.Pog.RowVersion;
                            this.syncClientData(dataSource, d.Data);
                        }
                        this.historyService.updateSavePoint(
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.temphistorySaveFlag,
                            sectionID,
                        );

                        this.historyService.initBySectionId(sectionID);
                        this.resetAutoSave(dataSource, sectionID);
                        if (this.sharedService.mode === 'auto') {
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave
                                ? ''
                                : (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false);
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave = false;
                            this.saveInProgress = false;
                            this.sharedService.asyncSavePogCap--;
                            this.planogramService.updateSaveDirtyFlag(false);
                            return observable;
                        }
                    } else {
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave = false;
                        this.sharedService.asyncSavePogCap--;
                        this.historyService.updateSaveFlag(
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag,
                            sectionID,
                        );
                        this.saveInProgress = false;
                        tempAutosaveFlag ? (this.planogramStore.appSettings.autoSaveEnableFlag = true) : '';
                        rootFlags.isAutoSaveDirtyFlag = true;
                        this.checkAndUpdateAsyncSavePogStatus(section, false, d.Log.Details[0].Message);
                        return observable.pipe(mergeMap(it => this.attemptToAutoSave(dataSource, sectionID)));
                    }

                    let svgObservable: Observable<boolean> = of(true);

                    if (
                        this.sharedService.mode !== 'auto' &&
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress
                    ) {
                        this.saveInProgress = true;
                        let SVG = this.planogramService.rootFlags[sectionID].asyncSaveFlag.SVG;
                        // Replace Guid with IdPogObject in svg
                        serverData.Positions.forEach((pos) => { 
                            SVG = SVG.replaceAll(pos.Guid, pos.IdPogObject);
                        });
                        svgObservable = this.saveSVG(sectionID, SVG, dataSource as any, serverData).pipe(
                            map((res) => {
                                return true;
                            }), catchError((err) => {
                                console.log(err);
                                return of(false);
                            }));
                        if (d.Log.Result == 1) {
                            this.planogramService.savePog.next(true);
                            if (!this.sharedService.allPogsToSaveInSaveAll.some(id => id === sectionID)) {
                                this.notify.success('PLANOGRAM_SAVED_SUCCESSFULLY', 'Ok');
                            }
                            this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                        }
                        // return resolve(d);
                    }
                    this.saveInProgress = false;
                    tempAutosaveFlag ? (this.planogramStore.appSettings.autoSaveEnableFlag = true) : '';
                    this.checkAndUpdateAsyncSavePogStatus(section, false, d.Log.Details[0].Message);
                    return forkJoin([observable, svgObservable]).pipe(
                        map(it => {
                            return true;
                        }), catchError((err) => {
                            console.log(err);
                            return of(false);
                        }));
                }),
                catchError((d) => {
                    if (this.parentApp.isAssortApp) {
                        window.parent.postMessage('invokePaceFunc:PlanogramSaveError');
                    }
                    if (this.saveInProgress) {
                        this.saveInProgress = false;
                    }
                    if (!tempAutosaveFlag) {
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                        this.sharedService.asyncSavePogCap--;
                        if (!d.trim()) {
                            d = "ERROR";
                        }
                        this.log.error(d);
                        this.checkAndUpdateAsyncSavePogStatus(section, false, d);
                        return of(false);
                    } else {
                        tempAutosaveFlag ? (this.planogramStore.appSettings.autoSaveEnableFlag = true) : '';
                        rootFlags.isAutoSaveDirtyFlag = true;
                        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                        this.sharedService.asyncSavePogCap--;
                        this.resetAutoSave(dataSource, sectionID);
                        return of(false);
                    }
                }),
            );
        }

    }

    public notifySaveStatus(section: Section, resetIsSaveDataPrepInProgress: boolean, message: string, action?: string) {
        if (this.sharedService.isSaveAllInProgress && this.sharedService.allPogsToSaveInSaveAll.some(id => id === section.$sectionID)) {
            this.updateAsyncSavePogStatus(section, resetIsSaveDataPrepInProgress, message);
        } else {
            this.notify.warn(message, action);
        }
    }

    private updateAsyncSavePogStatus(section: Section, resetIsSaveDataPrepInProgress: boolean, message: string) {
        //send true to resetIsSaveDataPrepInProgress if save is discontinued due to any save validation failure before save api call, else false
        let translatedMessage = message ? this.translate.instant(message) : "";
        this.asyncSavePogsStatusMessage = `${this.asyncSavePogsStatusMessage} \n ${section.IDPOG} - ${translatedMessage}`;
        if (resetIsSaveDataPrepInProgress && this.isSaveDataPrepInProgress) {
            this.isSaveDataPrepInProgress = false;
        }
    }

    public checkAndUpdateAsyncSavePogStatus(section: Section, resetIsSaveDataPrepInProgress: boolean, message: string='') {
        if (this.sharedService.allPogsToSaveInSaveAll.some(id => id === section.$sectionID)) {
            this.updateAsyncSavePogStatus(section, resetIsSaveDataPrepInProgress, message);
        }
    }

    public makePreparePostData(collection?: Array<Planograms & { isPinned?: boolean; PogVersion?: string; displayVersion?: number }>, requestTo?: string, comments?: string): { Comments: string; data: any[];[key: string]: any; } {
        const preparePostObject: PogCheckinCheckout = {
            Comments: '',
            IsCheckedOut: false,
            data: []
        };
        const dynamicVar = ['Pin', 'Unpin'].includes(requestTo) ? 'IsPinning' : 'IsCheckedOut';
        preparePostObject[dynamicVar] = ['Pin', 'Checkout'].includes(requestTo),
            preparePostObject.Comments = comments;
        preparePostObject.data = [];

        // tslint:disable-next-line: prefer-for-of
        for (let i = 0; i < collection.length; i++) {
            // filtering already stated then ignore
            let obj: any = {};
            if (!collection[i]) {
                continue;
            }
            if (collection[i].isPinned && requestTo === 'Pin') {
                continue;
            }
            if (!collection[i].isPinned && requestTo === 'Unpin') {
                continue;
            }

            obj.IDPOG = collection[i].IDPOG;
            if (dynamicVar !== 'IsCheckedOut') {
                obj.IDPOGStatus = '2';
                obj.IDProject = this.planogramStore.projectId;
                obj.IDPOGScenario = this.planogramStore.scenarioId;
            } else {
                obj.Version = collection[i].PogVersion || '';
                collection[i].PogVersion = undefined;
            }
            if (this.parentApp.isAllocateApp) {
                obj.displayVersion = collection[i].displayVersion;
            }
            preparePostObject.data.push(obj);
        }
        return preparePostObject;
    }

    public isPOGLive(sectionId: string, required: boolean): boolean {
        const section = this.sharedService.getObjectAs<Section>(sectionId, sectionId);
        if (!section) {
            return false;
        }
        if (this.checkIfSystemCheckout(section.IDPOG)) {
            if (required) {
                this.notifySaveStatus(section, true, 'UPDATE_DISABLED_FOR_SYSTEM_CHECKED_OUT_POGS');
            }
            return true;
        } else if (this.checkIfReadonly(section.IDPOG)) {
            if (required) {
                this.notifySaveStatus(section, true, 'UPDATES_NOT_ALLOWED_FOR_THIS_PLANOGRAM');
            }
            return true;
        }
        return false;
    }

    private checkIfSystemCheckout(IDPOG: number): boolean {
        const obj = this.sharedService.getObjectFromIDPOG(IDPOG);
        return Utils.isNullOrEmpty(obj.CheckoutOwner)
            ? false
            : obj.CheckoutOwner.toLowerCase() === AppConstantSpace.SYSTEM;
    }


    public checkIfReadonly(IDPOG: number): boolean {
        return this.sharedService.getObjectFromIDPOG(IDPOG).IsReadOnly;
    }

    private breakPogProfile(pogProfile) {
        if (Utils.isNullOrEmpty(pogProfile)) return pogProfile;
        let pogProfileArry = pogProfile.split(this.sharedService.pog_profile_signature_header_settings.ValueSeperator);
        if (pogProfileArry.length == this.sharedService.pog_profile_signature_detail_settings.length) {
            this.sharedService.pog_profile_signature_detail_settings.forEach((item, key) => {
                if (Utils.isNullOrEmpty(item.value) && item.IsUDP) {
                    if (item.Prefix) {
                        pogProfileArry[key] = pogProfileArry[key].substr(item.Prefix.length);
                    }
                    if (item.Suffix) {
                        pogProfileArry[key] = pogProfileArry[key].substr(
                            0,
                            pogProfileArry[key].length - item.Suffix.length,
                        );
                    }
                    item.value = pogProfileArry[key];
                }
            });
        }
    }



    private generateConstraintCode(data: {}, item: PogProfileSignatureSettings) {

        let val = data;
        for (const part of item.field.split('.')) {
            val = val[part];
        }

        let value = ((val as number) / item.DividedBy).toFixed(item.RoundOff);
        if (item.IsUDP) {
            value = item.value as string;
        }
        const addPaddings = () => {
            let diff = item.MaxLength - value.length;
            if (item.IsPadBlanks) {
                for (let i = 0; i < diff; i++) {
                    value = (item.PaddingChar || '') + value;
                }
            }
        };
        if (item.MaxLength > value.length) {
            addPaddings();
        } else {
            if (item.MaxLength < Math.round(value as unknown as number).toString().length) {
                value = Math.round(value as unknown as number).toString();
                item.MaxLength = Math.round(value as unknown as number).toString().length;
            } else {
                value = value.substr(0, item.MaxLength);
                if (value != '' && value.lastIndexOf('.') == value.length - '.'.length) {
                    value = value.substr(0, value.lastIndexOf('.'));
                }
                if (item.MaxLength > value.length) {
                    addPaddings();
                }
            }
        }
        return `${item.Prefix || ''}${value}${item.Suffix || ''}`;
    }

    public autoGeneratePogQualifier(data: { $id?: string; POGQualifier?: string; }) {
        let pogQualifier = '',
            canContinue = true;

        if (Utils.isNullOrEmpty(data.$id)) {
            return '';
        }

        if (!Utils.isNullOrEmpty(data.POGQualifier) && !this.sharedService.pog_profile_signature_header_settings.IsUDP) {
            this.breakPogProfile(data.POGQualifier)
        }

        const valueSeparator = this.sharedService.pog_profile_signature_header_settings.ValueSeperator || '';

        this.sharedService.pog_profile_signature_detail_settings.forEach((item) => {
            if (canContinue) {
                let value = '';
                if (item.value && item.IsUDP) {
                    value = this.generateConstraintCode(data, item);
                } else if (!item.IsUDP) {
                    value = this.generateConstraintCode(data, item);
                } else {
                    pogQualifier = '';
                    canContinue = false;
                }
                if (value != '') {
                    pogQualifier += value + valueSeparator;
                }
            }
        }, this);
        if (pogQualifier != '' && pogQualifier.lastIndexOf(valueSeparator) == pogQualifier.length - valueSeparator.length) {
            pogQualifier = pogQualifier.substr(0, pogQualifier.lastIndexOf(valueSeparator));
        }
        return pogQualifier != '' && canContinue ? pogQualifier : data.POGQualifier == null ? '' : data.POGQualifier;
    }


    private generatePogQualifier(data: Section & { POGQualifier?: string }): string {

        if (Utils.isNullOrEmpty(data.$id)) {
            return '';
        }

        if (!Utils.isNullOrEmpty(data.POGQualifier) && !this.sharedService.pog_profile_signature_header_settings.IsUDP) {
            this.breakPogProfile(data.POGQualifier);
        }

        if (!this.sharedService.pog_profile_signature_header_settings.IsUDP) {
            const isUDP = this.sharedService.pog_profile_signature_detail_settings.some(it => it.IsUDP && Utils.isNullOrEmpty(it.value));

            if (isUDP) {
                this.planogramService.removeAllSelection(data.$id);
                this.planogramService.addToSelectionByObject(data, data.$id);
                if (!this.sharedService.allPogsToSaveInSaveAll.some(id => id === data.$sectionID)) {
                    this.notify.warn('ENTER_PLANOGRAM_QUALIFIER_FIELDS');
                }
            } else {
                return this.autoGeneratePogQualifier(data);
            }
        } else {
            if (Utils.isNullOrEmpty(data.POGQualifier)) {
                this.planogramService.removeAllSelection(data.$id);
                this.planogramService.addToSelectionByObject(data, data.$id);
                if (!this.sharedService.allPogsToSaveInSaveAll.some(id => id === data.$sectionID)) {
                    this.notify.warn('ENTER_PLANOGRAM_QUALIFIER_FIELD');
                }
            } else {
                return data.POGQualifier;
            }
        }
        return '';
    }




    public saveSVG(sectionID: string, SVG: string, src: { IDPOG: number; POGGuid: string; Thumbnail: string; }, serverData?: SavePlanogram): Observable<boolean> {
        let planogramLibObj: POGLibraryListItem;

        const data: SVGObject = {
            IDPOG: src.IDPOG.toString(),
            POGGuid: src.POGGuid,
            Thumbnail: src.Thumbnail,
            SVG: serverData ? this.updateSVGWithIdPogObject(serverData, SVG) : undefined,
        };

        this.saveInProgress = true;

        //Showing loader when async save flag is false and save all in progress or in PA (when print triggers svg save).
        let hideLoader = !((!this.planogramStore.appSettings.asyncSaveToogleFlag && this.sharedService.isSaveAllInProgress) || this.parentApp.isAllocateApp);

        return this.panelSaveSVG(data, hideLoader).pipe(
            mergeMap((d: IApiResponse<SavePlanogramSVG>) => {
                try {
                    if (d.Log.Result == 1) {
                        this.planogramStore.mappers
                            .filter(it => it.IDPOG == parseInt(data.IDPOG))
                            .forEach(it => it.Image = d.Data.Thumbnail);

                        this.planogramStore.activeSelectedPog = this.planogramStore.mappers.find((x) => x.IDPOG === parseInt(data.IDPOG));
                    }
                    this.saveInProgress = false;
                    const list = this.planogramStore.downloadedPogs;
                    const pog = list.find((x) => x.IDPOG == (Number(data.IDPOG) as any) && x.sectionObject);
                    if (pog) {
                        sectionID = (pog.sectionObject as Section).$sectionID;
                    }
                    this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave
                        ? (this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = true)
                        : (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false);
                    this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave = false;
                    this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                    this.sharedService.asyncSavePogCap--;
                    this.planogramService.updateSaveDirtyFlag(false, sectionID);
                    if (d.Data) {
                        const dataSource = src as any;
                        dataSource.Version = d.Data.Version;
                        dataSource.RowVersion = d.Data.RowVersion;
                        dataSource.Thumbnail = d.Data.Thumbnail;
                        dataSource.Image = d.Data.Thumbnail;
                        const guid = this.getGUIDFromIDPOG(dataSource.IDPOG);
                        planogramLibObj = this.planogramService.getCurrentObject(guid);
                        planogramLibObj.Image = d.Data.Thumbnail;
                        this.planogramStore.activeSelectedPog = planogramLibObj;
                    }
                    if (this.sharedService.link == 'iAssort') {
                        if (this.savePogAndExit) {
                            window.parent.postMessage('invokePaceFunc:closeIShelf', '*');
                        } else {
                            window.parent.postMessage('invokePaceFunc:PlanogramSaved');
                        }
                    } 
                    if (d.Data) {
                        return this.planogramLibraryService.updateMapperObject([planogramLibObj], null, hideLoader);
                    }
                    return of(true);
                }
                catch (error) {
                    this.log.error(error);
                    if (this.sharedService.link == 'iAssort') {
                        if (this.savePogAndExit) {
                            window.parent.postMessage('invokePaceFunc:closeIShelf', '*');
                        } else {
                            window.parent.postMessage('invokePaceFunc:PlanogramSaved');
                        }
                    } 
                    return of(false);
                }
            }) as any,
            catchError((err, caught) => {
                this.saveInProgress = false;
                this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress = false;
                this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave
                    ? (this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = true)
                    : (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false);
                this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave = false;
                this.sharedService.asyncSavePogCap--;
                this.planogramService.updateSaveDirtyFlag(false);
                this.log.error('ERROR WHILE SAVING SVG');
                // Need to redirect even incase SVG does not save.Else the user cannot revert back to assort
                if (this.sharedService.link == 'iAssort') {
                    if (this.savePogAndExit) {
                        window.parent.postMessage('invokePaceFunc:closeIShelf', '*');
                    } else {
                        window.parent.postMessage('invokePaceFunc:PlanogramSaved');
                    }
                } 
                let message = 'SVG_SAVE_FAILED';
                if (this.sharedService.allPogsToSaveInSaveAll.includes(sectionID) && !this.sharedService.processedPogsInSaveAll.includes(sectionID)) {
                    let section = this.sharedService.getObject(sectionID, sectionID) as Section;
                    this.updateAsyncSavePogStatus(section, false, message);
                } else {
                    this.notify.error(message);
                }
                this.log.error(err);
                return of(false);
            }),
        );
    }

    private updateSVGWithIdPogObject(serverData: SavePlanogram, svg: string): string {
        return [...serverData.Fixture, ...serverData.Positions]
            .reduce((svg, it) => svg.replace(it.Guid, it.IdPogObject), svg);
    }

    private syncClientData(clientData, serverData?: ServerData2) {
        let poslen = serverData.Positions.length,
            fixlen = serverData.Fixture.length,
            packAttrlen = serverData.PackageAttributes.length,
            sectionID = clientData.$id;

        const markObjectAsUpdated = (child, serverData: ServerData2) => {
            if (Utils.checkIfFixture(child)) {
                if (child.Fixture._X04_SHDESCX10.DescData !== undefined && child.Fixture._X04_SHDESCX10.DescData
                ) {
                    for (let i = 0; i < fixlen; i++) {
                        if (child.Fixture._X04_SHDESCX10.DescData == serverData.Fixture[i].Guid) {
                            child.Fixture.IDPOGObject = serverData.Fixture[i].IdPogObject;
                            child.IDPOGObject = serverData.Fixture[i].IdPogObject;

                            let parentData = this.sharedService.getObject(child.$idParent, sectionID);
                            child.IDPOGObjectParent = parentData.IDPOGObject;
                            child.Fixture._X04_SHDESCX10.DescData = null;
                            return;
                        }
                    }
                }

                if (typeof child.TempId !== 'undefined' && child.TempId != null) {
                    for (let i = 0; i < fixlen; i++) {
                        if (child.TempId == serverData.Fixture[i]['Guid']) {
                            child.Fixture.IDPOGObject = serverData.Fixture[i]['IdPogObject'];
                            child.IDPOGObject = serverData.Fixture[i]['IdPogObject'];

                            let parentData = this.sharedService.getObject(child.$idParent, sectionID);
                            child.IDPOGObjectParent = parentData.IDPOGObject;

                            return;
                        }
                    }
                }
            } else if (Utils.checkIfPosition(child)) {
                if (
                    typeof child.Position._X05_POSDESCX10.DescData !== 'undefined' &&
                    child.Position._X05_POSDESCX10.DescData
                ) {
                    for (let i = 0; i < poslen; i++) {
                        if (child.Position._X05_POSDESCX10.DescData == serverData.Positions[i]['Guid']) {
                            child.Position.IDPOGObject = serverData.Positions[i]['IdPogObject'];
                            child.IDPOGObject = serverData.Positions[i]['IdPogObject'];

                            let parentData = this.sharedService.getObject(child.$idParent, sectionID);
                            child.IDPOGObjectParent = parentData.IDPOGObject;
                            child.Position._X05_POSDESCX10.DescData = null;
                            return;
                        }
                    }
                }

                if (typeof child.TempId !== 'undefined' && child.TempId != null) {
                    for (let i = 0; i < poslen; i++) {
                        if (child.TempId == serverData.Positions[i]['Guid']) {
                            child.Position.IDPOGObject = serverData.Positions[i]['IdPogObject'];
                            child.IDPOGObject = serverData.Positions[i]['IdPogObject'];

                            //@asyncsave
                            let parentData = this.sharedService.getObject(child.$idParent, sectionID);
                            child.IDPOGObjectParent = parentData.IDPOGObject;
                            return;
                        }
                    }
                }
            }

            return;
        };
        const makePackAttrAsUpdated = (clientData, serverData) => {
            let newProdPackId, newIdPackAttr;
            for (let i = 0; i < packAttrlen; i++) {
                newProdPackId = serverData['PackageAttributes'][i]['PrdPkg'];
                newIdPackAttr = serverData['PackageAttributes'][i]['IdPackageAttribute'];
                if (clientData['PackageAttributes'][newProdPackId] != undefined) {
                    clientData['PackageAttributes'][newProdPackId]['IdPackageAttribute'] = newIdPackAttr;
                }
            }

            return;
        };
        const eachRecursive = (obj) => {
            if (obj.hasOwnProperty('Children')) {
                obj.Children.forEach((child, key) => {
                    markObjectAsUpdated(child, serverData);
                    eachRecursive(child);
                }, obj);
            }
        };

        makePackAttrAsUpdated(clientData, serverData);
        eachRecursive(clientData);
    }


    private eachRecursive(obj: Section, context: { IDPerfPeriod: number; }): void {
      const uiPositionProperties = ['cachedShrinkWidth','IntersectionLocation','number','minMerchIntersectFlag',
    'hasBackItem','hasAboveItem','baseItem','defaultOrinetation','prevOrinetation','positoinLockFlag',
    '$packageBlocks', 'spredSpanPositionProperties','dragDropSettings', 'minMerchHeight', 'hasAbilityForLocalSearch',
    '_CalcField','imageFailed'];
    const uiSectionProperties = ['Permissions', 'IsSaveBlock', 'SVG', 'adjucentBlocks', '$sectionID', 'globalUniqueID',
          'selected', 'DateRefreshed', 'config', 'Blocks', 'overflowLength', 'UsedSquare', 'PercentageUsedSquare',
          'AvailableSquare', 'isBayPresents', 'dragDropSettings', 'AllLimitingSortedShelves', 'ChildOffset', 'ChildDimension',
          'annotations', 'showAnnotation', 'annotationLoaded', 'anDimension', 'computePositionsFixtureList', 'skipComputePositions',
          'skipShelfCalculateDistribution', 'totalAddSales', 'totalAddMovement', 'totalAddProfit', 'bayObj', 'modularTemplate',
          'modularArr', 'panelID', 'uprightType', 'uprightIntervals'
    ];
    const uiFixtureProperties = ['minMerchHeight', 'selected', 'isLoaded', 'dragDropSettings', 'ObjectDerivedType',
    ];
        Object.entries(obj).forEach(([key, val]) => {
            if (typeof val == 'function') {
                delete obj[key];
            }
        });
        if (obj.ObjectDerivedType == AppConstantSpace.SECTION) {
            uiSectionProperties.forEach((key) => {
                obj[key] && delete obj[key];
            });
        }

        if (obj.hasOwnProperty('Children')) {
            obj.Children.forEach((child, key) => {
                if (child.IDPOGObject == null && child.TempId == null) {
                    let TempId = Utils.generateUID();
                    child.TempId = TempId;
                }
                if (child.ObjectType == AppConstantSpace.POSITIONOBJECT) {
                    uiPositionProperties.forEach((prop) => {
                        if (child[prop]) {
                            delete child[prop];
                        }
                    });
                    ['ProductPackage', 'Product', 'AvailablePackageType', 'inventoryObject', 'attributeObject'].forEach((v) => {
                        if (child.Position._X05_NPI != undefined && !child.Position._X05_NPI.FlagData) {
                            delete child.Position[v];
                        }
                    });
                }
                if (child.ObjectType == AppConstantSpace.FIXTUREOBJ) {
                    let uiProps = [];
                    if (child.uiFixtureProperties.length) {
                        uiProps = child.uiFixtureProperties;
                    } else {
                        uiProps = uiFixtureProperties;
                    }
                    uiProps.forEach((key) => {
                        obj[key] && delete obj[key];
                    });
                    child.uiFixtureProperties && delete child.uiFixtureProperties;
                    child.uiProperties && delete child.uiProperties;
                }
                this.eachRecursive(child, context);
            }, obj);
        }
    };

    private panelSavePlanogram(pogInfo: Array<string>, checkinData: Object, RequestDetails: Object, asyncSaveToogleFlag: boolean = true, logCode: string = ''): Observable<IApiResponse<SavePlanogram>> {
        const data = {
            pog: pogInfo,
            checkinData,
            RequestDetails,
            link: this.parentApp.getCurrentParentApp(),
            IDScenario: null,
            IDAssortScenario: "-1"
        }
        if (this.parentApp.isAssortApp) {
            if (this.parentApp.isAssortAppInIAssortNiciMode) {
                data.IDAssortScenario = this.planogramStore.scenarioId.toString();
            }
            else {
                data.IDScenario = this.planogramStore.assortResetScenarioId.toString();
            }
        }
        else {
            data.IDScenario = this.planogramStore.scenarioId.toString();
        }

        let headers: HttpHeaders = new HttpHeaders();
        if (asyncSaveToogleFlag) {
            headers = headers.append('ignoreLoader', 'true');
        } else {
            headers = headers.append('skipSuccessMsg', 'true');
        }
        if (logCode) {
            headers = headers.append('logCode', logCode);
        }
        return this.http.post<IApiResponse<SavePlanogram>>(`${this.envConfig.shelfapi}${apiEndPoints.apiPathSavePlanogram}`, JSON.stringify(data), { headers });
    }

    private panelSaveSVG(data: SVGObject, hideLoader: boolean = true): Observable<IApiResponse<SavePlanogramSVG>> {
        let headers = new HttpHeaders()
            .append('Content-Type', 'application/json');

        if (hideLoader) {
            headers = headers.append('ignoreLoader', 'true');
        } else {
            headers = headers.append('skipSuccessMsg', 'true');
        }

        return this.http.post<IApiResponse<SavePlanogramSVG>>(`${this.envConfig.shelfapi}${apiEndPoints.apiToSaveSVG}`, JSON.stringify(data), { headers });
    }

    private processAfterPASave(dataSource: Section, sectionId: string): void {
        this.sharedService.asyncSavePogCap--;
        this.historyService.initBySectionId(sectionId);
        this.resetAutoSave(dataSource, sectionId);
        this.saveInProgress = false;
        this.planogramService.updateSaveDirtyFlag(false);
        this.planogramService.rootFlags[sectionId].isSaveDirtyFlag = false;
        this.planogramService.rootFlags[sectionId].asyncSaveFlag.isPOGSavingInProgress = false;
        this.checkAndUpdateAsyncSavePogStatus(dataSource, false, "PLANOGRAM_SAVED_SUCCESSFULLY");
        if (window.parent.currentScreen == 'layouts') {
            window.parent.saveGrid(dataSource.IDPOG.toString());
            if (this.parentApp.isAllocateAppInResetProjectType) {
              this.allocateEventService.originalFixtureData = this.allocateFixture.prepareFixtureData(dataSource);
          }
        }
    }
    private processAnnotationIfIDPogObjectMissing(pogObject: Section): void {
        pogObject.annotations.map((annotation) => {
            if (annotation.IDPOGObject === 0) {
                annotation.IDPOGObject = null;
            }
        });
    }
}

interface ServerData2 {
    PackageAttributes: any;
    Fixture: any;
    Positions: any;

}


