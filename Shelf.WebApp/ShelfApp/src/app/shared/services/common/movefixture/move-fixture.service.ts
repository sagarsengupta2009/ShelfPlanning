import { Injectable } from '@angular/core';
import { Modular, Position, Section } from 'src/app/shared/classes';
import { FromPropertyGrid } from 'src/app/shared/models';
import { HistoryService } from '../history/history.service';
import { DragDropUtilsService } from '../pog-drag-drop/drag-drop-utils.service';
import { FixtureList, SharedService } from '../shared/shared.service';
import { TranslateService } from '@ngx-translate/core';
import { NotifyService } from '../notify/notify.service';
import { Context } from 'src/app/shared/classes/context';
import { ParentApplicationService } from '../parent-app/parent-application.service';
import { PlanogramService } from '../planogram/planogram.service';
import { AllocateUtilitiesService } from '../../layouts/allocate/utilities/allocate-utilities.service';
import { AppConstantSpace } from 'src/app/shared/constants';
@Injectable({
    providedIn: 'root',
})
export class MoveFixtureService {
    constructor(
        private readonly sharedService: SharedService,
        private readonly historyService: HistoryService,
        private readonly dragDropUtilsService: DragDropUtilsService,
        private readonly translate: TranslateService,
        private readonly notifyService: NotifyService,
        private readonly parentApp: ParentApplicationService,
        private readonly planogramService: PlanogramService,
        private readonly allocateUtils: AllocateUtilitiesService
    ) {}

    public moveShelfByNotch(isMoveUp: boolean, fixtureObject: FixtureList): boolean {
        const section = fixtureObject.section;
        const draggedshelfXPosToPog = fixtureObject.getXPosToPog();
        let draggedshelfYPosToPog = fixtureObject.asCoffincase()
            ? fixtureObject.getYPosToPog(true)
            : fixtureObject.getYPosToPog();

        const thickness = fixtureObject.getNotchThicknes();
        if (this === undefined || (draggedshelfYPosToPog <= 0 && !isMoveUp) || (isMoveUp && draggedshelfYPosToPog + thickness + 0.5 > section.Dimension.Height)) {
            return false;
        }

        // Note : In move by notch movement, based on the current notch, will get new loc Y
        if (section.LKFixtureMovement == AppConstantSpace.FIXTURE_MOVEMENT.MOVE_BY_NOTCH) {
            const notchIntervals = section.getNotchInterval();
            const currentNotchNumber = fixtureObject.Fixture.NotchNumber;
            let nextNotchNumber = (section._Reversenotch.FlagData && isMoveUp) || (!section._Reversenotch.FlagData && !isMoveUp) ? currentNotchNumber - 1 : currentNotchNumber + 1;
            if (currentNotchNumber === 0 && section._Reversenotch.FlagData) {
                nextNotchNumber = isMoveUp ? notchIntervals.length : 0;
            }

            if (nextNotchNumber <= 0 || nextNotchNumber > notchIntervals.length) {
                return false;
            }

            const firstNotch = section.FirstNotch > 0 ? section.FirstNotch : 0
            const spacing = section.Notch == 0 ? 1 : section.Notch;
            const totalSpace = ((nextNotchNumber - 1) * spacing) - (fixtureObject.getNotchThicknes() * (section._Reversenotch.FlagData ? -1 : 1));
            draggedshelfYPosToPog = section._Reversenotch.FlagData ? notchIntervals[notchIntervals.length - 1] - totalSpace : firstNotch + totalSpace;   
        } else {
            if (isMoveUp) {
                draggedshelfYPosToPog += 0.5;
            } else {
                draggedshelfYPosToPog -= 0.5;
            }
            if (draggedshelfYPosToPog < 0) draggedshelfYPosToPog = 0;
        }

        const merchHt = draggedshelfYPosToPog + fixtureObject.minHeightRequired();

        const isValidMove =
            isMoveUp
                ? fixtureObject.isBasicValidMove({
                      height: true,
                      width: false,
                      newHeight: merchHt,
                      forSection: true,
                      forBoth: fixtureObject.asStandardShelf() ? undefined : false,
                      forSelf: fixtureObject.asStandardShelf() ? undefined : false,
                      LocX: fixtureObject.asStandardShelf() ? draggedshelfXPosToPog : undefined,
                      LocY: fixtureObject.asStandardShelf() ? draggedshelfYPosToPog : undefined,
                  }):{ flag: true, errMsg: undefined };

        if (!isValidMove.flag) {
            this.notifyService.error(fixtureObject.translate.instant('FIT_CHECK_ERR') + '. ' + isValidMove.errMsg);
            return false;
        }

        fixtureObject.asStandardShelf()
            ? this.moveForStandardShelf(
                  draggedshelfXPosToPog,
                  draggedshelfYPosToPog,
                  fixtureObject.Fixture.Width,
                  fixtureObject,
              )
            : this.move(draggedshelfXPosToPog, draggedshelfYPosToPog, fixtureObject.Fixture.Width, fixtureObject);

        return true;
    }

    public move(xPosToPog: number, yPosToPog: number, proposedWidth: number, fixtureObject: FixtureList): void {
        const rootObj = this.sharedService.getObject(fixtureObject.$sectionID, fixtureObject.$sectionID) as Section;
        const oldXPosToPog = fixtureObject.getXPosToPog();
        const oldYPosToPog = fixtureObject.asCoffincase()
            ? fixtureObject.getYPosToPog(true)
            : fixtureObject.getYPosToPog();
        const oldWidth = fixtureObject.Fixture.Width;

        const original = ((xPosToPog, yPosToPog, proposedWidth, fixtureObject) => {
            return () => {
                this.move(xPosToPog, yPosToPog, proposedWidth, fixtureObject);
            };
        })(xPosToPog, yPosToPog, proposedWidth, fixtureObject);
        const revert = ((oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject) => {
            return () => {
                this.move(oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject);
            };
        })(oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject);

        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtures',
        });

        fixtureObject.Location.Y = fixtureObject.getYPosRelative(yPosToPog);
        fixtureObject.Location.X = fixtureObject.getXPosRelative(xPosToPog);
        fixtureObject.Fixture.Width = proposedWidth;
        const ctx = new Context(rootObj);
        rootObj.computeMerchHeight(ctx);
        rootObj.applyRenumberingShelfs();
    }

    public moveForStandardShelf(
        xPosToPog: number,
        yPosToPog: number,
        proposedWidth: number,
        fixtureObject: FixtureList,
    ): void {
        const rootObj = this.sharedService.getObject(fixtureObject.$sectionID, fixtureObject.$sectionID) as Section;
        const oldXPosToPog = fixtureObject.getXPosToPog();
        const oldYPosToPog = fixtureObject.getYPosToPog();
        const oldWidth = fixtureObject.Fixture.Width;
        const original = ((xPosToPog, yPosToPog, proposedWidth, fixtureObject) => {
            return () => {
                this.moveForStandardShelf(xPosToPog, yPosToPog, proposedWidth, fixtureObject);
            };
        })(xPosToPog, yPosToPog, proposedWidth, fixtureObject);
        const revert = ((oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject) => {
            return () => {
                this.moveForStandardShelf(oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject);
            };
        })(oldXPosToPog, oldYPosToPog, oldWidth, fixtureObject);
        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtures',
        });
        fixtureObject.Location.Y = fixtureObject.getYPosRelative(yPosToPog);
        fixtureObject.Location.X = fixtureObject.getXPosRelative(xPosToPog);
        fixtureObject.Fixture.Width = proposedWidth;
        fixtureObject.Dimension.Width = proposedWidth;
        if (this.parentApp.isAllocateApp) {
            const parent = this.sharedService.getObject(fixtureObject.$idParent, fixtureObject.$sectionID) as Modular;
            this.allocateUtils.updatePAFixtureKey(fixtureObject, parent);
        }
        rootObj.applyRenumberingShelfs();
    }

    public moveBetweenBays(
        xPosToPog: number,
        yPosToPog: number,
        fixtureObject: FixtureList,
        proposedWidth?: number,
        fromPropGrid?: FromPropertyGrid,
    ): void {
        let oldXPosToPog = fixtureObject.getXPosToPog();
        let oldYPosToPog = fixtureObject.asCoffincase()
            ? fixtureObject.getYPosToPog(true)
            : fixtureObject.getYPosToPog();
        let oldWidth = fromPropGrid ? fromPropGrid.oldWidth : fixtureObject.Fixture.Width;
        const original = ((xPosToPog, yPosToPog, fixtureObject, proposedWidth) => {
            return () => {
                this.moveBetweenBays(xPosToPog, yPosToPog, fixtureObject, proposedWidth);
            };
        })(xPosToPog, yPosToPog, fixtureObject, proposedWidth);

        const revert = ((oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth) => {
            return () => {
                this.moveBetweenBays(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth);
            };
        })(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth);

        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtureBetweenBays',
        });
        /*undo-redo ends here*/

        let rootObject= <Section>this.sharedService.getObject(
            fixtureObject.$sectionID,
            fixtureObject.$sectionID,
        );
        let bayFrom = this.sharedService.getParentObject(fixtureObject, fixtureObject.$sectionID);
        let bayTo = fixtureObject.findIntersectBayAtXpos(xPosToPog);
        let intersectShelf = fixtureObject.findIntersectShelfAtYpos(yPosToPog, bayTo.Children);
        let xPosRelativeForBayTo = xPosToPog - bayTo.Location.X; //this.findRelativeXposToBay(xPosToPog, rootObject.Children);

        if (bayFrom.$id !== bayTo.$id) {
            let dragIndex = bayFrom.Children.indexOf(fixtureObject);
            let dropIndex = bayTo.Children.indexOf(intersectShelf);
            dropIndex = dropIndex == -1 ? 0 : dropIndex;
            fixtureObject.IDPOGObjectParent = bayTo.IDPOGObject;
            fixtureObject.setParentId(bayTo.$id);
            bayTo.Children.splice(dropIndex, 0, fixtureObject);
            bayFrom.Children.splice(dragIndex, 1);
        }
        fixtureObject.Location.Y = yPosToPog;
        fixtureObject.Location.X = xPosRelativeForBayTo;
        fixtureObject.Fixture.Width = proposedWidth;
        if (this.parentApp.isAllocateApp) {
            this.allocateUtils.updatePAFixtureKey(fixtureObject, bayTo)
        }
        const ctx = new Context(rootObject);
        rootObject.computeMerchHeight(ctx);
        rootObject.applyRenumberingShelfs();
    }

    public moveBetweenBaysStandardShelf(
        xPosToPog: number,
        yPosToPog: number,
        fixtureObject: FixtureList,
        proposedWidth: number,
        fromPropGrid: FromPropertyGrid
    ): void {
        const rootObj = this.sharedService.getObject(fixtureObject.$sectionID, fixtureObject.$sectionID) as Section;
        const oldXPosToPog = fromPropGrid ? fromPropGrid.oldLocX :  fixtureObject.getXPosToPog();
        const oldYPosToPog = fromPropGrid ? fromPropGrid.oldLocY : fixtureObject.getYPosToPog();
        const oldWidth = fromPropGrid ? fromPropGrid.oldWidth : fixtureObject.Fixture.Width;
        const original = ((xPosToPog, yPosToPog, fixtureObject, proposedWidth,fromPropGrid) => {
            return () => {
                this.moveBetweenBaysStandardShelf(xPosToPog, yPosToPog, fixtureObject, proposedWidth, fromPropGrid);
                this.planogramService.updateNestedStyleDirty = true;
            };
        })(xPosToPog, yPosToPog, fixtureObject, proposedWidth,fromPropGrid);

        const revert = ((oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth,fromPropGrid) => {
            return () => {
                this.moveBetweenBaysStandardShelf(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth, fromPropGrid);
                this.planogramService.updateNestedStyleDirty = true;
            };
        })(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth,fromPropGrid);

        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtureBetweenBays',
        });
        /*undo-redo ends here*/
        const bayFrom = this.sharedService.getObject(fixtureObject.$idParent, fixtureObject.$sectionID) as Modular;
        const bayTo: Modular = fixtureObject.findIntersectBayAtXpos(xPosToPog);
        const intersectShelf = fixtureObject.findIntersectShelfAtYpos(yPosToPog, bayTo.Children);
        const xPosRelativeForBayTo = Number((xPosToPog - bayTo.Location.X).toFixed(2));
        if (bayFrom.$id !== bayTo.$id) {
            const dragIndex = bayFrom.Children.indexOf(fixtureObject);
            let dropIndex = bayTo.Children.indexOf(intersectShelf);
            dropIndex = dropIndex == -1 ? 0 : dropIndex;
            //refactored the code dt 31th July, 2015
            fixtureObject.IDPOGObjectParent = bayTo.IDPOGObject;
            fixtureObject.setParentId(bayTo.$id);

            bayTo.Children.splice(dropIndex, 0, fixtureObject);
            bayFrom.Children.splice(dragIndex, 1);
        }
        fixtureObject.Location.Y = yPosToPog;
        fixtureObject.Location.X = xPosRelativeForBayTo;
        fixtureObject.Fixture.Width = proposedWidth;
        fixtureObject.Dimension.Width = proposedWidth;
        this.sharedService.updateGrillOnFieldChange.next(true);
        //perforamance fix: Nov, 2015
        if (this.parentApp.isAllocateApp) {
          const parent = this.sharedService.getObject(fixtureObject.$idParent, fixtureObject.$sectionID) as Modular;
          this.allocateUtils.updatePAFixtureKey(fixtureObject, parent);
        }
        rootObj.applyRenumberingShelfs();
    }

    public moveBetweenBaysPegBoard(
        xPosToPog: number,
        yPosToPog: number,
        fixtureObject: FixtureList,
        proposedWidth: number,
        fromPropGrid?: FromPropertyGrid,
    ): void {
        /*feature undo-redo: Abhishek -
         dt. 16th Oct, 2014*/
        const oldXPosToPog = fixtureObject.getXPosToPog();
        const oldYPosToPog = fixtureObject.getYPosToPog();
        const oldWidth = fromPropGrid?.oldWidth ? fromPropGrid.oldWidth : fixtureObject.Fixture.Width;
        const original = ((xPosToPog, yPosToPog, fixtureObject, proposedWidth) => {
            return () => {
                this.moveBetweenBaysPegBoard(xPosToPog, yPosToPog, fixtureObject, proposedWidth);
            };
        })(xPosToPog, yPosToPog, fixtureObject, proposedWidth);

        const revert = ((oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth) => {
            return () => {
                this.moveBetweenBaysPegBoard(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth);
            };
        })(oldXPosToPog, oldYPosToPog, fixtureObject, oldWidth);

        this.historyService.captureActionExec({
            funoriginal: original,
            funRevert: revert,
            funName: 'MoveFixtureBetweenBays',
        });
        /*undo-redo ends here*/

        const rootObject: Section = this.sharedService.getObject(
            fixtureObject.$sectionID,
            fixtureObject.$sectionID,
        ) as Section;
        const bayFrom = this.sharedService.getParentObject(fixtureObject, fixtureObject.$sectionID);
        const bayTo = fixtureObject.findIntersectBayAtXpos(xPosToPog);
        if (bayTo != null) {
            const intersectShelf = fixtureObject.findIntersectShelfAtYpos(yPosToPog, bayTo.Children);

            const xPosRelativeForBayTo = xPosToPog - bayTo.Location.X;

            if (bayFrom.$id !== bayTo.$id) {
                const dragIndex = bayFrom.Children.indexOf(fixtureObject);
                let dropIndex = bayTo.Children.indexOf(intersectShelf);
                dropIndex = dropIndex == -1 ? 0 : dropIndex;

                fixtureObject.IDPOGObjectParent = bayTo.IDPOGObject;
                fixtureObject.setParentId(bayTo.$id);

                bayTo.Children.splice(dropIndex, 0, fixtureObject);
                bayFrom.Children.splice(dragIndex, 1);
            }

            fixtureObject.Location.Y = yPosToPog;
            fixtureObject.Location.X = xPosRelativeForBayTo;
            if (this.parentApp.isAllocateApp) {
                this.allocateUtils.updatePAFixtureKey(fixtureObject, bayTo);
            }
        }
        fixtureObject.Fixture.Width = proposedWidth;
        const ctx = new Context(rootObject);
        rootObject.computeMerchHeight(ctx);
        rootObject.applyRenumberingShelfs();
    }

    public moveFixtureType(
        proposedXPosToPog: number,
        proposedYPosToPog: number,
        fixtureObject: FixtureList,
        proposedWidth: number,
        propertygird?: FromPropertyGrid,
        validityErrorMsg?:string,
    ): boolean {
        const rootObj = this.sharedService.getObject(fixtureObject.$sectionID, fixtureObject.$sectionID) as Section;
        // TODO
        // const fitcheckMsg = validityErrorMsg ? validityErrorMsg : this.translate.instant('FIT_CHECK_ERROR');
        const revertBack = (msg, obj) => {
            if (!fixtureObject.asCoffincase) this.dragDropUtilsService.revertBackItem(obj.$id, obj.$sectionID);
            this.notifyService.success(msg);
        };

        let initiateMove = () => {
            if (rootObj.isBayPresents) {
                //1. accross bay we splice shelf object and push to the other bay object.
                //2. within bay we just change the yPos
                switch (fixtureObject) {
                    case fixtureObject.asPegType():
                        this.moveBetweenBaysPegBoard(
                            proposedXPosToPog,
                            proposedYPosToPog,
                            fixtureObject,
                            proposedWidth,
                            propertygird,
                        );
                        break;
                    case fixtureObject.asStandardShelf():
                        this.moveBetweenBaysStandardShelf(
                            proposedXPosToPog,
                            proposedYPosToPog,
                            fixtureObject,
                            proposedWidth,
                            propertygird
                        );
                        break;
                    case fixtureObject.asBlockFixture():
                    case fixtureObject.asCoffincase():
                        this.moveBetweenBays(
                            proposedXPosToPog,
                            proposedYPosToPog,
                            fixtureObject,
                            proposedWidth,
                            propertygird,
                        );
                        break;
                }
            } else {
                this.move(proposedXPosToPog, proposedYPosToPog, proposedWidth, fixtureObject);
            }
        };

        const merchHt = fixtureObject.asStandardShelf()
            ? proposedYPosToPog + fixtureObject.Fixture.Thickness + fixtureObject.minMerchHeight
            : proposedYPosToPog + fixtureObject.Dimension.Height;
        const isValidMove = fixtureObject.isBasicValidMove({
            height: true,
            width: true,
            newHeight: merchHt,
            newWidth: proposedWidth + proposedXPosToPog,
            forSection: true,
            forBoth: fixtureObject.asStandardShelf() ? undefined : false,
            forSelf: fixtureObject.asStandardShelf() ? undefined : false,
            LocX: fixtureObject.asStandardShelf() ? proposedXPosToPog : undefined,
            LocY: fixtureObject.asStandardShelf() ? proposedYPosToPog : undefined,
        });
        if (!isValidMove.flag) {
            revertBack(this.translate.instant('FIT_CHECK_ERR') + '. ' + isValidMove.errMsg, this);
            return false;
        }
        initiateMove();
        return true;
    }

}
