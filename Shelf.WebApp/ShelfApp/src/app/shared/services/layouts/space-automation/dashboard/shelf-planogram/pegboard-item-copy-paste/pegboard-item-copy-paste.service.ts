import { Injectable, NgZone } from '@angular/core';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { HistoryService, NotifyService, PlanogramService, PlanogramStoreService, SharedService } from 'src/app/shared/services/common';
import { MerchandisableList } from 'src/app/shared/services/common/shared/shared.service';
import { ConsoleLogService } from 'src/app/framework.module';
import { DragDropCopyPasteCommonService } from 'src/app/shared/services/common/pog-drag-drop-copy-paste-common/drag-drop-copy-paste-common.service';
import { PlanogramCommonService } from '../planogram-common.service';
import { PegDropCord, pegFitCheckObject } from 'src/app/shared/models/planogram/pegboard';
import { Crossbar, PegBoard, Position, Section, SlotWall } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';

@Injectable({
    providedIn: 'root'
})
export class PegboardItemCopyPasteService {

    constructor(private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly historyService: HistoryService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly dragDropCopyPasteCommonService: DragDropCopyPasteCommonService,
        private readonly notifyService: NotifyService,
        private readonly log: ConsoleLogService,
        private readonly zone: NgZone) { }

    public pasteCopiedObjects(target: PegBoard | SlotWall | Crossbar,
        rootObject: Section,
        ctx: Context,
        multiDragableElementsList: Position[],
        dropCord: PegDropCord): boolean {
        let dropContainerItemData = this.getPasteContainerItemdata(target);

        if (
            !this.dragDropCopyPasteCommonService.doesPositionsValidateFitCheck(
                multiDragableElementsList,
                dropContainerItemData,
                true,
            )
        ) {
            return false;
        }

        multiDragableElementsList.forEach(eachPositionItemData => {
            eachPositionItemData['Position'].IDPOGObject = null;
            eachPositionItemData['IDPOGObject'] = null;
            eachPositionItemData['baseItem'] = '';
            eachPositionItemData['hasAboveItem'] = false;
            eachPositionItemData['hasBackItem'] = false;
            this.planogramCommonService.extend(eachPositionItemData, true, eachPositionItemData.$sectionID);
            this.planogramCommonService.setParent(eachPositionItemData, dropContainerItemData);
            eachPositionItemData.selected = false;
        }); // This generates new objects with different id's

        let dropIndex = 0;

        let initialCords = Object.assign({}, dropCord);
        if (
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
            dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
        ) {
            if (dropContainerItemData.ObjectDerivedType != AppConstantSpace.CROSSBAROBJ) {
                let dropFlag = dropContainerItemData.checkIfOffsetArea(dropCord);

                if (!dropFlag) {
                    for (let i = multiDragableElementsList.length - 1; i >= 0; i--) {
                        let eachPositionItemData = multiDragableElementsList[i];
                        this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachPositionItemData);
                        this.planogramService.cleanByID(rootObject.$sectionID, eachPositionItemData.$id);
                    }
                    this.notify('ITEMS_CANT_BE_DROPPED_IN_OFFSET_AREA', 'Ok');
                    return false;
                }
            }
        }

        let calculateDimension = function (pos) {
            pos.Dimension.Height = pos.linearHeight();
            pos.Dimension.Width = pos.linearWidth();
            pos.Dimension.Depth = pos.linearDepth();
        };
        try {
            if (
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ
            ) {
                //Maintain an array of dragging positions if they are present in the pegboard
                let dragginItems = multiDragableElementsList;
                let sortedChildren = dropContainerItemData.sortByYXZPegHoleXAscendingConsideringPegYOffset(dropContainerItemData.Children);
                let exculdedContainerItems = this.dragDropCopyPasteCommonService.fitCheckNeededPos(dragginItems, sortedChildren);
                let  insertedPosArry = [],
                    doesItemCrossedWidth = false;
                for (let i = 0; i < multiDragableElementsList.length; i++) {
                    let eachPositionItemData = multiDragableElementsList[i];
                    calculateDimension(eachPositionItemData);

                    if (eachPositionItemData.getPegInfo().Type && eachPositionItemData.pegOffsetY != 0) {
                        dropCord.top = dropCord.top - eachPositionItemData.Position.ProductPegHoleY + eachPositionItemData.pegOffsetY + eachPositionItemData.linearHeight();
                    }

                    let positionWidth = eachPositionItemData.linearWidth();
                    //Make fronts high as one
                    eachPositionItemData.Position.FacingsY = 1;

                    let fitCheckObj: pegFitCheckObject = { flag: false, left: undefined, top: undefined },
                        revertPos = false;

                    fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCordAutoForPaste(
                        eachPositionItemData,
                        dropCord,
                        exculdedContainerItems,
                    );

                    while (!fitCheckObj.flag) {
                        if (dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
                            if (
                                dropCord.left >
                                dropContainerItemData.Dimension.Width -
                                dropContainerItemData.getPegHoleInfo().PegOffsetRight
                            ) {
                                doesItemCrossedWidth = true;
                            }
                            if (
                                (doesItemCrossedWidth && dropCord.left >= initialCords.left) ||
                                (dropCord.left <= initialCords.left &&
                                    dropCord.left + positionWidth >= initialCords.left)
                            ) {
                                fitCheckObj.flag = true;
                                revertPos = true;
                                continue;
                            }
                        } else {
                            if (dropCord.top - dropContainerItemData.getPegHoleInfo().PegOffsetBottom < 0 ||
                                (eachPositionItemData.pegOffsetY > 0 &&
                                    dropCord.top + eachPositionItemData.Position.ProductPegHoleY - eachPositionItemData.pegOffsetY - eachPositionItemData.linearHeight() < 0)) {
                                fitCheckObj.flag = true;
                                revertPos = true;
                                continue;
                            }
                        }
                        fitCheckObj = dropContainerItemData.checkIfItemFitsAtDropCordAutoForPaste(
                            eachPositionItemData,
                            dropCord,
                            exculdedContainerItems,
                        );
                        if (fitCheckObj.flag) {
                            dropCord.left = fitCheckObj.left;
                            dropCord.top = fitCheckObj.top;
                        }
                    }
                    if (revertPos) {
                        //revert back the changes remove from the history
                        //History.stopRecording();
                        if (insertedPosArry.length > 0) {
                            for (let j = insertedPosArry.length - 1; j >= 0; j--) {
                                let index = insertedPosArry[j].dropIndex;
                                dropContainerItemData.removePosition(ctx, index);
                            }
                        }
                        for (let k = multiDragableElementsList.length - 1; k >= 0; k--) {
                            let eachItem = multiDragableElementsList[k];
                            //Deleting from inventory modal and objectprovider object if item drop fails
                            this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachItem);
                            this.planogramService.cleanByID(rootObject.$sectionID, eachItem.$id);
                        }
                        this.notify('FIT_CHECK_ERROR', 'Ok');
                        return false;
                    }
                    dropContainerItemData.addPosition(ctx, eachPositionItemData, dropIndex, dropCord);

                    exculdedContainerItems.push(eachPositionItemData);
                    exculdedContainerItems = dropContainerItemData.sortByYXZPegHoleXAscendingConsideringPegYOffset(exculdedContainerItems);
                    dropContainerItemData.Children = dropContainerItemData.sortByYXZPegHoleXAscendingConsideringPegYOffset(dropContainerItemData.Children);
                    let toIndex = dropContainerItemData.Children.indexOf(eachPositionItemData);

                    insertedPosArry.push({
                        eachPositionItemData: eachPositionItemData,
                        dropIndex: toIndex,
                    });

                    let me = dropContainerItemData;
                    const original = ((obj, position, index, dropCoord) => {
                        return () => {
                            this.planogramService.addByID(rootObject.$sectionID, position.$id, position);
                            this.planogramService.addPosInvModel(position, rootObject);
                            obj.addPosition(ctx, position, index, dropCoord);
                        };
                    })(me, eachPositionItemData, toIndex, {...dropCord});
                    const revert = ((obj, index, eachPositionItemData) => {
                        return () => {
                            obj.removePosition(ctx, index);
                            this.planogramService.deleteFromInvModel(rootObject.$sectionID, eachPositionItemData);
                            this.planogramService.cleanByID(rootObject.$sectionID, eachPositionItemData.$id);
                        };
                    })(me, toIndex, eachPositionItemData);
                    this.historyService.captureActionExec({
                        funoriginal: original,
                        funRevert: revert,
                        funName: 'addProduct',
                    });
                    if (i == 0 && dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ) {
                        dropCord.nextY =
                            eachPositionItemData.Location.Y -
                            (eachPositionItemData.linearHeight() - eachPositionItemData.getPegInfo().OffsetY) -
                            this.planogramStore.appSettings.vertical_spacing / 2;
                        dropCord.nextX = dropCord.left;
                    }
                    if (
                        (dropContainerItemData.ObjectDerivedType == AppConstantSpace.PEGBOARDOBJ ||
                            dropContainerItemData.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
                            dropContainerItemData.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ) &&
                        i != multiDragableElementsList.length - 1
                    ) {
                        dropCord = dropContainerItemData.findNextDropCord(eachPositionItemData, dropCord, 0);
                    }
                }
            }
        } catch (e) {
            this.log.error('Position cut/copy paste :', e);
            this.log.error('Cut/copy paste fail: Position Dropping' + e.stack);
        }

        console.debug(' ------------------------  Position Paste is Done  -----------------------');
        return true;
    }

    private getPasteContainerItemdata(obj): MerchandisableList {
        return Utils.checkIfPosition(obj) ? this.sharedService.getObject(obj.$idParent, obj.$sectionID) : obj;
    }

    private notify(message: string, action?: string): void {
        this.zone.run(() => {
            if (action) {
                this.notifyService.warn(message, action);
            }
            else {
                this.notifyService.warn(message);
            }
        })
    }

}
