import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Coffincase, Position, Section, StandardShelf } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { Orientation } from 'src/app/shared/classes/orientation';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Utils } from 'src/app/shared/constants/utils';

import {
    HistoryService,
    NotifyService,
    PlanogramStoreService,
    PropertyGridPegValidationService,
    SharedService,
} from 'src/app/shared/services';
import { MerchandisableList } from 'src/app/shared/services/common/shared/shared.service';
import { CrunchModeService, CrunchRect } from '../../../crunch-mode/crunch-mode.service';

@Injectable({
    providedIn: 'root',
})
export class ShelfbumpService {
    OrientNS = new Orientation();
    isAbandonLastAction;

    constructor(
        private planogramStore: PlanogramStoreService,
        private sharedService: SharedService,
        private translate: TranslateService,
        private readonly notifyService: NotifyService,
        private readonly crunchMode: CrunchModeService,
        private readonly propertyGridPegValidationService: PropertyGridPegValidationService,
        private readonly historyService: HistoryService
    ) {}

    increaseFacing(ctx: Context, selectedObjects, noOftimes, field?: string) {
        if (!field) {
            field = 'FacingsX';
        }

        let AppSettingsSvc = this.planogramStore.appSettings;
        var facingsChanged = 0;
        selectedObjects.forEach((posObject) => {
            if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                var allowAction = this.sharedService.getPositionLockField(
                    AppSettingsSvc.positionLockField,
                    posObject,
                );
                const allowActionResult = allowAction.flag && allowAction.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1;
                if (!allowActionResult) {
                    var shelfObject = this.sharedService.getObject(
                        posObject.$idParent,
                        posObject.$sectionID,
                    ) as MerchandisableList;
                    var rootObject = this.sharedService.getObject(
                        posObject.$sectionID,
                        posObject.$sectionID,
                    ) as Section;
                    //var modeType = Utils.getMode(shelfObject);
                    if (
                        !rootObject.fitCheck ||
                        this.checkIfCanBump(shelfObject, posObject, 'Position.' + field, noOftimes) ||
                        posObject.Position.attributeObject.ForceFit == true
                    ) {
                        //var availableSpace = this.consultParentForLinearSpace(shelfObject, posObject.computeWidth());
                        const oldVal = posObject.Position[field];
                        posObject.Position[field] = noOftimes;
                        if (field == 'FacingsX' && shelfObject.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ && this.propertyGridPegValidationService.checkIfPegHooksOverlap(posObject)) {
                            posObject.Position[field] = oldVal;
                            return;
                        } else if (Utils.checkIfCoffincase(shelfObject) || Utils.checkIfBasket(shelfObject)) {
                            const onlyShrink = field === 'FacingsX' ? { X: true, Y: false } : { X: false, Y: true };
                            const response = shelfObject.calculatePositionShrink(posObject, undefined, onlyShrink);
                            posObject.Position[field] = oldVal;
                            if (response && response.revertFlag) {
                                this.notifyService.warn(response.message.toString(), 'ok');
                                return;
                            }
                        } else {
                            posObject.Position[field] = oldVal;
                        }
                        var oldFacings = posObject.Position[field];
                        if (!Utils.isNullOrEmpty(shelfObject)) {
                            if (!Utils.isNullOrEmpty(noOftimes)) {
                                if (posObject.changeFacingsTo(noOftimes, undefined, field)) {
                                    facingsChanged++;
                                }
                            } else {
                                if (posObject.bumpUpFacingValue()) {
                                    facingsChanged++;
                                }
                            }
                            shelfObject.computePositionsAfterChange(ctx);
                            if (Utils.checkIfstandardShelf(shelfObject)) {
                                const response = this.crunchMode.rePositionOnCrunch(ctx, shelfObject as StandardShelf);
                                if (response && response.revertFlag) {
                                    // History.abandonCaptureActionExec();
                                    posObject.changeFacingsTo(oldFacings, undefined, field);
                                    // History.abandonCaptureActionExec();
                                    this.notifyService.warn(response.message.toString(), 'ok');
                                    // Materialize.toast(this.translate.instant(response.message.toString()), 5000);
                                    // this.isAbandonLastAction = response;
                                    return;
                                }
                            }

                            //commented dt 5th March, 2015
                            //var parentObject = this.sharedService.getParentObject(shelfObject, shelfObject.$sectionID);
                            //if (!Utils.isNullOrEmpty(parentObject.Fixture)) {
                            //    if (parentObject.Fixture.IsMerchandisable) {
                            //        parentObject.computePositionsAfterChange(ctx);
                            //     }
                            // }
                        } else {
                            var effected = false;
                        }
                    } else {
                        effected = false;
                        this.notifyService.error('FIT_CHECK_ERROR');
                    }
                } else {
                    effected = false;
                    // Materialize.toast(posObject.getLockErrorMsg(), 4000);
                    this.notifyService.error(posObject.getLockErrorMsg(), 'ok');
                }
            }
        }, this);
        return facingsChanged;
    }

    //To check,If there are any obstructions beside,if so cannot bump... // need to rewite an dre write the logic
    checkIfCanBump(shelfObject, posObject, field, value) {
        var shelfToBump = shelfObject;
        //while (shelfToBump) {
        if (
            (Utils.checkIfstandardShelf(shelfToBump) ||
                Utils.checkIfPegType(shelfToBump) ||
                Utils.checkIfCoffincase(shelfToBump) ||
                Utils.checkIfBasket(shelfToBump)) &&
            shelfToBump.Location.Y + shelfToBump.Dimension.Height > posObject.Location.Y + posObject.computeHeight() &&
            posObject.isValidFitChange(value, field)
        ) {
            return true;
        }
        //shelfToBump = this.sharedService.getParentObject(shelfToBump, shelfToBump.$sectionID);
        //}
    }

    orientationRoll(ctx: Context, direction, selectedObjects, rootObject: Section, orientationVal?){
        let AppSettingsSvc = this.planogramStore.appSettings;
        var rollBefore;
        var widthBefore;
        var widthAfter;
        var heightBefore;
        var heightAfter;
        var orientationCancelled = false;
        selectedObjects.forEach((posObject) => {
            if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                var allowAction = this.sharedService.getPositionLockField(
                    AppSettingsSvc.positionLockField,
                    posObject,
                );
                 const allowActionResult = allowAction.flag && allowAction.list.indexOf(AppConstantSpace.ACTIONS.ORIENTATION) == -1;
                //if (this.sharedService.link != 'allocate' || (this.sharedService.link == 'allocate' && posObject.Position.attributeObject.RecADRI == 'A')) {
                if (!allowActionResult) {
                    const shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
                    if (Utils.checkIfBasket(shelfObject) || Utils.checkIfCoffincase(shelfObject)) {
                        return;
                    }
                    var tempOrinetation = orientationVal;
                    if (direction === 1) {
                        tempOrinetation = posObject.getPreviousOrientation();
                    } else if (direction === 0) {
                        tempOrinetation = posObject.getNextOrientation();
                    } else if (direction === 3) {
                        tempOrinetation = posObject.getDefaultOrientation();
                    }
                    // orientation change ignore force fit items
                    if (
                        !rootObject.fitCheck ||
                        this.checkIfCanBump(shelfObject, posObject, 'Position.IDOrientation', tempOrinetation) ||
                        posObject.Position.attributeObject.ForceFit == true
                    ) {
                        if (shelfObject.asCoffincase()) {
                            const posCrunchRect: CrunchRect = {
                                name: 'Position',
                                lx: posObject.Location.X,
                                rx: posObject.Location.X + shelfObject.linearWidthPosition(posObject, tempOrinetation, 'Position.IDOrientation'),
                                by: posObject.Location.Y,
                                ty: posObject.Location.Y + shelfObject.linearHeightPosition(posObject, tempOrinetation, 'Position.IDOrientation'),
                                ref: posObject,
                                inserted: 0,
                                setLx: undefined,
                                setBy: undefined
                            };
                            if (this.crunchMode.isCurrentPosOverlapsDivider(shelfObject, posCrunchRect)) {
                                this.notifyService.warn('DIVIDER_OVERLAP_DETECTED');
                                orientationCancelled = true;
                            }
                        }
                        //if (!posObject.isValidFitChange(orientationVal, 'Position.IDOrientation')) {
                        //    Materialize.toast("(" + posObject.Position.inventoryObject.UPC + " - " + Math.round(posObject.Dimension.Height * 100) / 100 + " x" + Math.round(posObject.Dimension.Width * 100) / 100 + "x" + Math.round(posObject.Dimension.Depth * 100) / 100 + ") Item orientation change has caused Fitcheck error. Please verify.", 5000);
                        //    orientationCancelled = true;
                        //}
                    } else {
                        this.notifyService.warn(
                            this.translate.instant('FIT_CHECK_ERROR') +
                                '. ' +
                                this.translate.instant('ROTATION_OF_POSITION') +
                                ' ' + posObject.Position.Product.UPC +
                                ' ' +
                                this.translate.instant('IS_FAILED'),
                            'Error',
                        );

                        orientationCancelled = true;
                    }
                } else {
                    orientationCancelled = true;
                    this.notifyService.error(posObject.getLockErrorMsg());
                }
            } else {
                orientationCancelled = true;
            }
        }, this);
        if (!orientationCancelled) {
            selectedObjects.forEach((posObject) => {
                if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                    var shelfObject = this.sharedService.getParentObject(posObject, posObject.$sectionID);
                    rollBefore = posObject.getOrientation();
                    widthBefore = posObject.linearWidth();
                    heightBefore = posObject.linearHeight();
                    if (direction === 1) {
                        orientationVal = posObject.getPreviousOrientation();
                    } else if (direction === 0) {
                        orientationVal = posObject.getNextOrientation();
                    } else if (direction === 3) {
                        orientationVal = posObject.getDefaultOrientation();
                    }

                    if (direction === 0) {
                        posObject.incrementOrientation();
                    } else if (direction === 1) {
                        posObject.decrementOrientation();
                    } else if (!Utils.isNullOrEmpty(orientationVal) && direction === 2) {
                        posObject.setOrientation(orientationVal);
                    } else if (direction === 3) {
                        posObject.setOrientation(posObject.getDefaultOrientation());
                    }

                    if (Utils.checkIfBasket(shelfObject) || Utils.checkIfCoffincase(shelfObject)) {
                        const newValue = posObject.getOrientation();
                        posObject.Position.IDOrientation = rollBefore;
                        const response = shelfObject.checkShrinkForOrientation(newValue, posObject);
                        if (response && response.revertFlag) {
                            posObject.setOrientation(rollBefore);
                            this.notifyService.warn(response.message.toString());
                            this.isAbandonLastAction = response;
                            if (this.historyService.unqHistoryID[posObject.$sectionID]) {
                                this.historyService.stopRecording(undefined, undefined, this.historyService.unqHistoryID[posObject.$sectionID]);
                                this.historyService.abandonLastCapturedActionInHistory(this.historyService.unqHistoryID[posObject.$sectionID]);
                            }
                            return;
                        }
                    }

                    shelfObject.computePositionsAfterChange(ctx);
                    posObject.calculateDistribution(ctx, shelfObject);
                    if (Utils.checkIfstandardShelf(shelfObject)) {
                        const response = this.crunchMode.rePositionOnCrunch(ctx, shelfObject);
                        if (response && response.revertFlag) {
                            // History.abandonCaptureActionExec();
                            posObject.setOrientation(rollBefore);
                            // History.abandonCaptureActionExec();
                            this.notifyService.warn(response.message.toString());
                            this.isAbandonLastAction = response;
                            return;
                        }
                    }
                }
            }, this);
        }
    };

    public incrementFacingsByOne(ctx: Context,selectedObjects: Position[]) {
        let effected: any;
        let facingsChanged = 0;
        selectedObjects.forEach((posObject, key) => {
            if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                let noOftimes = posObject.Position.FacingsX + 1;
                let allowAction = this.sharedService.getPositionLockField(
                    this.planogramStore.appSettings.positionLockField,
                    posObject,
                );
                const allowActionResult = allowAction.flag && allowAction.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1;
                if (!allowActionResult) {
                    let shelfObject = this.sharedService.getObject(
                        posObject.$idParent,
                        posObject.$sectionID,
                    ) as MerchandisableList;
                    let rootObject = this.sharedService.getObject(
                        posObject.$sectionID,
                        posObject.$sectionID,
                    ) as Section;
                    if (
                        !rootObject.fitCheck ||
                        this.checkIfCanBump(shelfObject, posObject, 'Position.FacingsX', noOftimes) ||
                        posObject.Position.attributeObject.ForceFit == true
                    ) {
                        if (Utils.checkIfCoffincase(shelfObject) || Utils.checkIfBasket(shelfObject)) {
                            const oldVal = posObject.Position.FacingsX;
                            posObject.Position.FacingsX = noOftimes;
                            const response = shelfObject.calculatePositionShrink(posObject, undefined, { X: true, Y: false });
                            posObject.Position.FacingsX = oldVal;
                            if (response && response.revertFlag) {
                                this.notifyService.warn(response.message.toString(), 'ok');
                                return;
                            }
                        }

                        var oldFacings = posObject.Position.FacingsX;
                        if (!Utils.isNullOrEmpty(shelfObject)) {
                            if (!Utils.isNullOrEmpty(noOftimes)) {
                                if (posObject.changeFacingsTo(noOftimes)) {
                                    facingsChanged++;
                                }
                            } else {
                                if (posObject.bumpUpFacingValue()) {
                                    facingsChanged++;
                                }
                            }
                            shelfObject.computePositionsAfterChange(ctx);
                            if (Utils.checkIfstandardShelf(shelfObject)) {
                                const response = this.crunchMode.rePositionOnCrunch(ctx, shelfObject as StandardShelf);
                                if (response && response.revertFlag) {
                                    posObject.changeFacingsTo(oldFacings);
                                    this.notifyService.warn(response.message.toString(), 'ok');
                                    return;
                                }
                            }
                        } else {
                            effected = false;
                        }
                    } else {
                        effected = false;
                    }
                } else {
                    effected = false;
                    this.notifyService.error(posObject.getLockErrorMsg());
                }
            }
        }, this);
        return facingsChanged;
    };

    public DecrementFacingsByOne(ctx: Context,selectedObjects) {
        let effected: any;
        let facingsChanged: any = 0;
        selectedObjects.forEach((posObject, key) => {
            let noOftimes: any;
            if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                if (posObject.Position.FacingsX > 1) {
                    noOftimes = posObject.Position.FacingsX - 1;
                } else {
                    noOftimes = posObject.Position.FacingsX;
                }
                let allowAction = this.sharedService.getPositionLockField(
                    this.planogramStore.appSettings.positionLockField,
                    posObject,
                );
                const allowActionResult = allowAction.flag && allowAction.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1;
                if (!allowActionResult) {
                    let shelfObject = this.sharedService.getObject(
                        posObject.$idParent,
                        posObject.$sectionID,
                    ) as MerchandisableList;
                    let rootObject = this.sharedService.getObject(
                        posObject.$sectionID,
                        posObject.$sectionID,
                    ) as Section;
                    if (
                        !rootObject.fitCheck ||
                        this.checkIfCanBump(shelfObject, posObject, 'Position.FacingsX', noOftimes) ||
                        posObject.Position.attributeObject.ForceFit == true
                    ) {
                        if (Utils.checkIfCoffincase(shelfObject) || Utils.checkIfBasket(shelfObject)) {
                            const oldVal = posObject.Position.FacingsX;
                            posObject.Position.FacingsX = noOftimes;
                            const response = shelfObject.calculatePositionShrink(posObject, undefined, { X: true, Y: false });
                            posObject.Position.FacingsX = oldVal;
                            if (response && response.revertFlag) {
                                this.notifyService.warn(response.message.toString(), 'ok');
                                return;
                            }
                        }

                        //var availableSpace = this.consultParentForLinearSpace(shelfObject, posObject.computeWidth());
                        if (!Utils.isNullOrEmpty(shelfObject)) {
                            if (!Utils.isNullOrEmpty(noOftimes)) {
                                if (posObject.changeFacingsTo(noOftimes)) {
                                    facingsChanged++;
                                }
                            } else {
                                if (posObject.bumpUpFacingValue()) {
                                    facingsChanged++;
                                }
                            }
                            shelfObject.computePositionsAfterChange(ctx);
                        } else {
                            effected = false;
                        }
                    } else {
                        effected = false;
                    }
                } else {
                    effected = false;
                    this.notifyService.error(posObject.getLockErrorMsg());
                }
            }
        }, this);
        return facingsChanged;
    };

    public decreaseFacing(ctx: Context,selectedObjects, rootObject) {
        selectedObjects.forEach((posObject, key) => {
            if (posObject.ObjectDerivedType == AppConstantSpace.POSITIONOBJECT) {
                let allowAction: any = this.sharedService.getObjectField(
                    undefined,
                    this.planogramStore.appSettings.positionLockField,
                    undefined,
                    posObject,
                );
                allowAction = allowAction.flag && allowAction.list.indexOf(AppConstantSpace.ACTIONS.FACINGS) == -1;
                if (!allowAction) {
                    posObject.bumpDownFacingValue();
                    let shelfObject = this.sharedService.getObject(
                        posObject.$idParent,
                        posObject.$sectionID,
                    ) as MerchandisableList;
                    shelfObject.computePositionsAfterChange(ctx);
                } else {
                    this.notifyService.error(posObject.getLockErrorMsg());
                }
            }
        }, this);
    };
}
