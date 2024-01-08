import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'underscore';
import { ActionExecItem, HistoryItem } from 'src/app/shared/models/history';
import {
    PlanogramService,
    SharedService,
    NotifyService,
    QuadtreeUtilsService,
    UserPermissionsService,
    IntersectionChooserHandlerService,
    ParentApplicationService,
    BlockHelperService,
} from 'src/app/shared/services';
import { Section } from 'src/app/shared/classes';
import { Render2dService } from '../../render-2d/render-2d.service';
import { Context } from 'src/app/shared/classes/context';
@Injectable({
    providedIn: 'root',
})
export class HistoryService {
    public actionExecStack: {[key: string]:ActionExecItem[]} = {}; // actionExecStack - holds the low level action execution closure function
    public historyStack: HistoryItem = {
        actionExecStack: [],
        isAuto: false,
        saveDirtyFlag: false,
        unqHistoryID: '',
    }; // historyStack - holds one single UNIT(which may or maynot be multiple actions executed per user action)
    public undoStack: HistoryItem = {
        actionExecStack: [],
        isAuto: false,
        saveDirtyFlag: false,
        unqHistoryID: '',
    }; // undoStack - holds UNITs moved from historyStack when undo() is triggered, used for redo()
    public flagUndoRedoExec: {[key: string]: boolean} = {};; // flagUndoRedoExec - History executes actions - > it turns to true. user executes action - > it turns false
    public isAuto: boolean;
    public unqHistoryID: {[key:string]: string} = {}; //If history recording is already started it will give you previous unique history id
    public isRecordingOn: {[key:string]: boolean} = {}; // isRecordingOn tells when to start and stop history recording. between the time it is used to get all actions executed and group them into one unit
    public blockHelperService: BlockHelperService; // TODO @karthik. The problem here is histrory service -> blockhelperService -> planogramCommonService -> history service. Need to move the extend(mixin) process to a seperate service.
    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly translate: TranslateService,
        private readonly notifyService: NotifyService,
        public readonly userPermissions: UserPermissionsService,
        public readonly QuadtreeUtilsService: QuadtreeUtilsService,
        public readonly IntersectionChooserHandlerService: IntersectionChooserHandlerService,
        private readonly render2d: Render2dService,
        private readonly parentApp: ParentApplicationService
    ) { }

    public isUndoRedoOn(sectionID?: string): boolean {
        return this.flagUndoRedoExec[sectionID || this.sharedService.activeSectionID];
    }

    public initBySectionId(sectionID: string) {
        this.actionExecStack[sectionID] = [];
        this.historyStack[sectionID] = [];
        this.undoStack[sectionID] = [];
        this.flagUndoRedoExec[sectionID] = false;
        this.isRecordingOn[sectionID] = false;
        this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag = -1;
    }

    public cleanBySectionId(sectionId: string) {
        this.historyStack[sectionId] = [];
        this.undoStack[sectionId] = [];
    }

    public undo(sectionID?: string): boolean {
        try {
            const undoArry = [];
            sectionID = sectionID || this.sharedService.activeSectionID;
            let histryLen = this.historyStack[sectionID].length;
            if (histryLen > 0) {
                if (this.flagUndoRedoExec[sectionID]) return false; //we stop multiple undo trigger if one undo is still processing
                let undoObj = this.historyStack[sectionID].pop();
                undoArry.push(undoObj);
                this.flagUndoRedoExec[sectionID] = true;
                if (undoObj.isAuto) {
                    undoArry.push(this.historyStack[sectionID].pop());
                }
                const sectionObj = this.sharedService.getObject(
                    sectionID,
                    sectionID,
                ) as Section;
                sectionObj.setSkipComputePositions();
                for (const undo of undoArry) {
                    undoObj = undo.actionExecStack;
                    for (let i = undoObj.length - 1; i >= 0; i--) {
                        undoObj[i].funRevert();
                    }
                    this.undoStack[sectionID].push(undo);
                }
                const ctx = new Context(sectionObj)
                sectionObj.computePositionsAfterChange(ctx);
                this.sharedService.setBlockWatch(true);
                setTimeout(() => {
                    this.sharedService.setBlockWatch(false);
                }, 0);
                this.flagUndoRedoExec[sectionID] = false;
                this.someChangesObserved(ctx, sectionID);
                sectionObj.computeMerchHeight(ctx);
                this.render2d.isDirty = true;
                // added for reRender components after undo.
                this.sharedService.updateStandardShelf.next(true);
                this.planogramService.updateSectionFromTool.next(sectionObj);
                this.planogramService.refreshModularView.next(true);
                this.sharedService.updateAnnotationPosition.next(true); //undo annotation
                this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                histryLen = this.historyStack[sectionID].length;
                const saveDirtyFlag =
                    histryLen > 0
                        ? this.historyStack[sectionID][histryLen - 1].saveDirtyFlag
                        : false;
                if (
                    (this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag <
                        0 &&
                        histryLen === 0) ||
                    saveDirtyFlag
                ) {
                    this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false;
                    this.planogramService.updateSaveDirtyFlag(false);

                    this.planogramService.rootFlags[sectionID].asyncSaveFlag //@asyncsavechange
                        .isPOGSavingInProgress
                        ? ''
                        : (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false);
                    this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = false;
                }
                this.sharedService.gridReloadSubscription.next(true);
            } else {
                this.notifyService.warn(this.translate.instant('UNDO_MSG'));
            }
        } catch (e) {
            this.notifyService.error('Error: <b>undo</b> ' + e);
            console.error(e);
        }
    }

    public isUndoVisible(): boolean {
        if (this.sharedService.activeSectionID && this.sharedService.activeSectionID !== '') {
            if (this.historyStack[this.sharedService.activeSectionID].length > 0) {
                return true;
            }
        }
        return false;
    }

    public redo(sectionID?: string): boolean {
        try {
          sectionID = sectionID || this.sharedService.activeSectionID;
            let isAutoFlag = false;
            const redoArry = [];
            if (this.undoStack[sectionID].length > 0) {
                //we stop the undo trigger if one event of undo is still processing
                if (this.flagUndoRedoExec[sectionID]) return false;
                const undoStackLength = this.undoStack[sectionID].length;
                if (undoStackLength > 1) {
                    if (this.undoStack[sectionID][undoStackLength - 2].isAuto) {
                        isAutoFlag = true;
                    }
                }
                let redoObj = this.undoStack[sectionID].pop();
                redoArry.push(redoObj);
                if (isAutoFlag) {
                    redoArry.push(this.undoStack[sectionID].pop());
                }
                this.flagUndoRedoExec[sectionID] = true;
                const sectionObj = this.sharedService.getObject(
                    sectionID,
                    sectionID,
                ) as Section;
                sectionObj.setSkipComputePositions();
                for (const redo of redoArry) {
                    redoObj = redo.actionExecStack;
                    for (let i = 0; i <= redoObj.length - 1; i++) {
                        redoObj[i].funoriginal();
                    }

                    this.historyStack[sectionID].push(redo);
                }
                const ctx = new Context(sectionObj);
                sectionObj.computePositionsAfterChange(ctx);
                this.sharedService.setBlockWatch(true);
                setTimeout(() => {
                    this.sharedService.setBlockWatch(false);
                }, 500);
                this.flagUndoRedoExec[sectionID] = false;
                sectionObj.computeMerchHeight(ctx);
                this.render2d.isDirty = true; // added for reRender components after undo.
                this.sharedService.updateAnnotationPosition.next(true); //undo annotation
                this.planogramService.updateSectionFromTool.next(sectionObj);
                this.planogramService.refreshModularView.next(true);
                this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
                this.someChangesObserved(ctx, sectionID);
                const histryLen = this.historyStack[sectionID].length;
                const saveDirtyFlag =
                    histryLen > 0
                        ? this.historyStack[sectionID][histryLen - 1].saveDirtyFlag
                        : false;
                if (saveDirtyFlag) {
                    this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false;
                    this.planogramService.updateSaveDirtyFlag(false);

                    this.planogramService.rootFlags[sectionID].asyncSaveFlag //@asyncsavechange
                        .isPOGSavingInProgress
                        ? ''
                        : (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false);
                    this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = false;
                }
                this.historyStack[sectionID].length > 0
                    ? (this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true)
                    : false;
                this.sharedService.gridReloadSubscription.next(true);
            } else {
                this.notifyService.warn(this.translate.instant(`REDO_MSG`));
            }
        } catch (e) {
            this.notifyService.error('Error: <b>redo</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public isRedoVisible(): boolean {
        if (
            this.sharedService.activeSectionID &&
            this.sharedService.activeSectionID !== '' &&
            this.sharedService.activeSectionID !== null
        ) {
            if (this.undoStack[this.sharedService.activeSectionID].length > 0) {
                return true;
            }
        }
        return false;
    }

    public updateSaveFlag(histryLen: number, sectionID: string): number {
        if (histryLen > 0) {
            this.historyStack[sectionID][histryLen].saveDirtyFlag = false;
            this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag > 0
                ? (this.historyStack[sectionID][
                    this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag
                ].saveDirtyFlag = true)
                : '';
        } else {
            histryLen = this.historyStack[sectionID].length;
            this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag > 0
                ? (this.historyStack[sectionID][
                    this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag
                ].saveDirtyFlag = false)
                : '';
            if (histryLen > 0) {
                this.historyStack[sectionID][histryLen - 1].saveDirtyFlag = true;
            }
            histryLen = histryLen - 1;
        }
        return histryLen;
    }

    public updateSavePoint(savePoint: number, sectionID: string) {
        return (this.planogramService.rootFlags[sectionID].asyncSaveFlag.historySaveFlag = savePoint);
    }

    public moveToHistoryStack(triggerReloadArray: number[], unqHistoryID: string, reloadFlag: boolean, sectionID: string) {
        try {
          sectionID = sectionID || this.sharedService.activeSectionID;
            if (this.actionExecStack[sectionID].length > 0) {
                //auto triggers after a stopRecording() to group actions together(multiitem move) at a single unit for execution
                this.historyStack[sectionID].push({
                    actionExecStack: this.actionExecStack[sectionID], //check if at all we have recorded actions
                    isAuto: this.isAuto,
                    unqHistoryID: unqHistoryID,
                    saveDirtyFlag: false,
                });
                this.clearUndoStack(sectionID); //lets clear the undoStack and actionExecStack
                this.clearActionExecStack(sectionID);
                this.isAuto = false;
                unqHistoryID ? this.planogramService.insertHistoryID(unqHistoryID) : '';
                this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
                const ctx = new Context(this.sharedService.getObjectAs(sectionID, sectionID));
                this.someChangesObserved(ctx, sectionID, reloadFlag);

            }
        } catch (e) {
            this.notifyService.error('Error: <b>moveToHistoryStack</b> ' + e, 'undo');
            console.error(e);
            this.stopRecording();
        }
    }

    public captureActionExec(actionConfig: any, sectionID?: string): void { //@Sagar: TODO, adding this type needs several changes in many other files, so need to discuss first and then I'll make the change
        try {
          sectionID = sectionID || this.sharedService.activeSectionID;
            if (this.isHistoryProcessing(sectionID)) return; //check if its User/History who executes an action. ONLY capture if User has initiated the action
            if (!this.isRecordingOn[sectionID]) return; //Only record if we have manually started recording else ignore
            actionConfig.timeStamp = new Date().getTime();
            this.actionExecStack[sectionID].push(actionConfig);
            this.clearUndoStack(sectionID);
        } catch (e) {
            this.notifyService.error('Error: <b>captureActionExec</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public abandonCaptureActionExec(timeStamp?: number, sectionID?: string): boolean {
        try {
          sectionID = sectionID || this.sharedService.activeSectionID;
            if (!this.actionExecStack[sectionID].length) {
                return false;
            }
            if (timeStamp === undefined) {
                this.actionExecStack[sectionID].pop(); //no timestamp provided just flag off/remove the last action executed
                return true;
            } else {
                for (const [i, element] of this.actionExecStack[sectionID].entries()) {
                    if (element.timeStamp === timeStamp) {
                        //lets iterate through and remove the matched actionExe through timestamp
                        this.actionExecStack[sectionID].splice(i, 1);
                        return true;
                    }
                }
            }
        } catch (e) {
            this.notifyService.error('Error: <b>abandonCaptureActionExec</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public abandonLastCapturedActionInHistory(unqHistoryID: string, sectionID?: string): void {
        let uniqueID: string;
        sectionID = sectionID || this.sharedService.activeSectionID;
        if (
            _.filter(this.historyStack[sectionID], { unqHistoryID: unqHistoryID }).length === 0
        ) {
            return;
        }

        do {
            this.undo(sectionID);
            uniqueID =
                this.undoStack[sectionID][
                    this.undoStack[sectionID].length - 1
                ].unqHistoryID;
            const undoStackLength = this.undoStack[sectionID].length;
            if (undoStackLength > 1) {
                if (this.undoStack[sectionID][undoStackLength - 2].isAuto) {
                    this.undoStack[sectionID].pop();
                }
            }
            if (undoStackLength > 0) {
                this.undoStack[sectionID].pop();
            }
            if (undoStackLength === 0) {
                break;
            }
        } while (uniqueID !== unqHistoryID);
    }
    //@Naren TODO: Need to check if this is used anywhere
    // public getLastCaptureActionExecTime(): number {
    //     try {
    //         if (!this.actionExecStack[this.sharedService.activeSectionID].length) {
    //             return;
    //         }
    //         return this.actionExecStack[this.sharedService.activeSectionID][this.actionExecStack[this.sharedService.activeSectionID].length - 1].timeStamp;
    //     } catch (e) {
    //         this.notifyService.error('Error: <b>getLastCaptureActionExecTime</b> ' + e, 'undo');
    //         console.error(e);
    //     }
    // }
    //@Naren TODO: Need to check if this is used anywhere
    // public getLastCaptureActionExec(): boolean | ActionExecItem {
    //     if (!this.actionExecStack[this.sharedService.activeSectionID].length) {
    //         return false;
    //     }
    //     return this.actionExecStack[this.sharedService.activeSectionID][this.actionExecStack[this.sharedService.activeSectionID].length - 1];
    // }

    public clearUndoStack(sectionID?: string): void {
        try {
            this.undoStack[sectionID || this.sharedService.activeSectionID] = [];
        } catch (e) {
            this.notifyService.error('Error: <b>clearUndoStack</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public clearActionExecStack(sectionID?: string): void {
        try {
            this.actionExecStack[sectionID || this.sharedService.activeSectionID] = [];
        } catch (e) {
            this.notifyService.error('Error: <b>clearActionExecStack</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public isHistoryProcessing(sectionID?: string): boolean {
        try {
            return this.flagUndoRedoExec[sectionID || this.sharedService.activeSectionID];
        } catch (e) {
            this.notifyService.error('Error: <b>isHistoryProcessing</b> ' + e, 'undo');
            console.error(e);
        }
    }

    public uniqueHistoryId(): string {
        let d = new Date().getTime();
        const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
        });
        return uuid;
    }

    public startRecording(isAutoTrue?: boolean, sectionID?: string): string {
      sectionID = sectionID || this.sharedService.activeSectionID;
        if (this.isRecordingOn[sectionID]) {
            return this.unqHistoryID[sectionID];
        }

        if (!this.isRecordingOn[sectionID]) {
            this.isRecordingOn[sectionID] = true;
        }
        if (isAutoTrue) {
            this.isAuto = true;
            this.sharedService.isStartedRecording = true;
        }

        return (this.unqHistoryID[sectionID] = this.uniqueHistoryId());
    }

    public stopRecording(
        triggerReloadComponentArray?: number[],
        clearstack?: boolean,
        unqHistoryID?: string,
        reloadFlag?: any,
        sectionID?: string,
    ): void {
        const triggerReloadComponentArr = _.isUndefined(triggerReloadComponentArray)
            ? [1, 2, 3, 5, 6]
            : triggerReloadComponentArray;
        if (this.isRecordingOn[sectionID || this.sharedService.activeSectionID]) {
          this.isRecordingOn[sectionID || this.sharedService.activeSectionID] = false; //close the recording
            this.sharedService.isStartedRecording = false;

            if (_.isUndefined(clearstack)) {
                this.moveToHistoryStack(triggerReloadComponentArr, unqHistoryID, reloadFlag, sectionID);
            } else {
                this.clearActionExecStack(sectionID); //move the actions captured into the "historyStack" as single unit. close the auto
            }
        }
    }

    public someChangesObserved(ctx: Context, sectionID: string, isRecursive?: any): void {
        const rootObj = this.sharedService.getObject(sectionID, sectionID) as Section;
        if (rootObj.IDPOGStatus === 5) {
            const livePogEditPermission =
                this.userPermissions.hasUpdatePermission(`WEB_VIEW_LIVE_POG_EDIT`); //live pogs
            if (this.sharedService.vmode && livePogEditPermission) {
                this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
                this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = true;
            } else {
                this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = false;
                this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = false;
            }
        } else {
            this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
            this.planogramService.rootFlags[sectionID].isAutoSaveDirtyFlag = true;
        }
        this.planogramService.updateSaveDirtyFlag(this.planogramService.rootFlags[sectionID].isSaveDirtyFlag, sectionID);
        this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGSavingInProgress
            ? (this.planogramService.rootFlags[sectionID].asyncSaveFlag.isPOGChangedDuringSave = true)
            : '';
        this.QuadtreeUtilsService.createQuadTree(sectionID);
        // @og this is causing a performance issue on drop, if this breaks something please notify me
        (isRecursive == undefined || isRecursive?.ActionOnChange?.isSectionCalcRequired) && rootObj.computeMerchHeight(ctx, { reassignFlag: true, recFlag: true });
        this.IntersectionChooserHandlerService.closePop(sectionID);

        if(this.parentApp.isAllocateApp) {
          this.blockHelperService.recalculateBlocks(rootObj);
        }
    }
}
