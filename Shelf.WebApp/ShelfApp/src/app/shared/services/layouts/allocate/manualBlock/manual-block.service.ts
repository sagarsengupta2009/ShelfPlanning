import { ApplicationRef, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import * as _ from 'lodash';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { PlanogramService } from '../../../common/planogram/planogram.service';
import { SharedService } from '../../../common/shared/shared.service';
import { QuadtreeUtilsService } from '../../../common/shelfCommonService/quadtree-utils.service';
import { TranslateService } from '@ngx-translate/core';
import { BlockEditorComponent } from '../block-editor/block-editor.component';
import { BlockHelperService } from '../block-helper.service';
import { BlockValidationErrorComponent } from './block-validation-error/block-validation-error.component';
import { ReblockComponent } from './reblock/reblock.component';
import { ConsoleLogService } from 'src/app/framework.module';
import { NotifyService } from '../../../common/notify/notify.service';
import { Position, Section } from 'src/app/shared/classes';
declare const window: any;

/**
 * This will be a speical service manual blocks are triggered from parent app and not handled in any components in shelf
 * Hence may contain subscriptions.
 */
@Injectable({
    providedIn: 'root',
})
export class ManualBlockService {
    constructor(
        private sharedService: SharedService,
        private planogramService: PlanogramService,
        private quadTreeUtils: QuadtreeUtilsService,
        private blockhelperService: BlockHelperService,
        private readonly ref: ApplicationRef,
        private readonly notifyService: NotifyService,
        private readonly translateService: TranslateService,
        private matDialog: MatDialog,
        private readonly log: ConsoleLogService,
    ) {}

    initDraw(canvas) {
        if (!this.runPreInits()) {
            return false;
        }
        document.getElementById('pog-drawspace').style.display = 'Block';
        this.planogramService.removeAllSelection(this.sharedService.getActiveSectionId());
        canvas.style.cursor = 'crosshair';
        let mouse = {
            x: 0,
            y: 0,
            startX: 0,
            startY: 0,
        };
        let w, h, l, t;
        let sectionID = this.sharedService.getActiveSectionId();
        let scaleFactor = this.planogramService.rootFlags[sectionID].scaleFactor;
        let pogOffset = document.getElementById('pog-drawspace').getBoundingClientRect();
        let win = document.getElementById('pog-drawspace').ownerDocument.defaultView;
        let pogOffSetPX: any = {
            top: pogOffset.top + win.pageYOffset,
            left: pogOffset.left + win.pageXOffset,
        };
        let setMousePosition = (e) => {
            var ev = e || window.event;
            mouse.x = ev.pageX + window.pageXOffset;
            mouse.y = ev.pageY + window.pageYOffset;
            mouse.x = this.planogramService.convertToUnit((e.clientX - pogOffSetPX.left) / scaleFactor, sectionID);
            mouse.y = this.planogramService.convertToUnit((e.clientY - pogOffSetPX.top) / scaleFactor, sectionID);
        };

        let element = null;
        canvas.onmousemove = (e) => {
            setMousePosition(e);
            if (element !== null) {
                w = Math.abs(mouse.x - mouse.startX);
                h = Math.abs(mouse.y - mouse.startY);
                l = mouse.x - mouse.startX;
                t = mouse.y - mouse.startY;
                element.style.width = this.planogramService.convertToPixel(w, sectionID) + 'px';
                element.style.height = this.planogramService.convertToPixel(h, sectionID) + 'px';
                element.style.left =
                    this.planogramService.convertToPixel(l, sectionID) < 0
                        ? this.planogramService.convertToPixel(mouse.x, sectionID) + 'px'
                        : this.planogramService.convertToPixel(mouse.startX, sectionID) + 'px';
                element.style.top =
                    this.planogramService.convertToPixel(t, sectionID) < 0
                        ? this.planogramService.convertToPixel(mouse.y, sectionID) + 'px'
                        : this.planogramService.convertToPixel(mouse.startY, sectionID) + 'px';
            }
        };

        canvas.onclick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            if (element !== null) {
                element.remove();
                canvas.style.cursor = 'default';
                canvas.style.display = 'none';
                let quads: any = {};
                quads.width = w;
                quads.height = h;
                quads.x = l < 0 ? mouse.x : mouse.startX;
                quads.y = t < 0 ? mouse.y : mouse.startY;
                quads.id = sectionID;
                var obj = this.quadTreeUtils.findingIntersectionsAtBound(sectionID, quads);
                let positionObj = [];
                for (let i = 0; i < obj.length; i++) {
                    if (obj[i].ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
                        let pObj = this.sharedService.getObject(obj[i].id, sectionID) as  Position;
                        positionObj.push(pObj);
                        this.planogramService.addToSelectionByObject(pObj, sectionID);
                    }
                }

                /*   ****************   validation ****************/
                var shelfs, dupShelfs;
                shelfs = Array.from(
                    new Set(
                        positionObj.map((e) => {
                            return e.$idParent;
                        }),
                    ),
                );
                dupShelfs = shelfs.slice();
                var fixtures = [];

                // merge every shelves of same y-offset into a single shelf
                for (let i = 0; i < shelfs.length; i++) {
                    let shelf = this.sharedService.getObject(shelfs[i], sectionID);
                    //check non standard fixture types
                    if (shelf.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
                        this.showBlockError(shelf);
                        return;
                    }

                    //get fixtures co ordinates
                    let loc: any = {};
                    loc.x = shelf.getXPosToPog();
                    loc.y = shelf.getYPosToPog();
                    let shelfDetails = { loc: loc, dimension: _.cloneDeep(shelf.Dimension), id: shelf.$id, sameY: [] };
                    for (let j = i + 1; j < shelfs.length; j++) {
                        let nextShelf = this.sharedService.getObject(shelfs[j], this.sharedService.activeSectionID);
                        if (nextShelf.getYPosToPog() == shelfDetails.loc.y) {
                            if (nextShelf.getXPosToPog() < shelfDetails.loc.x)
                                shelfDetails.loc.x = nextShelf.getXPosToPog();
                            shelfDetails.dimension.Width += nextShelf.Dimension.Width;
                            shelfDetails.sameY.push(shelfs.splice(j, 1));
                            j--;
                        }
                    }
                    fixtures.push(shelfDetails);
                }
                // if any fixture is on a different x-axis its an invalid block
                if (fixtures.length > 0) {
                    let invalid = false,
                        locX = fixtures[0].loc.x;

                    fixtures.forEach((e) => {
                        if (locX != e.loc.x) invalid = true;
                    });

                    if (invalid) {
                        this.showBlockError();
                        return;
                    }

                    /* ************* validation end *************** */
                    this.blockhelperService.isManualDraw = true;
                    //this.blockOrder = 'PARENT';
                    this.openManualBlockDialog();
                }
            } else {
                mouse.startX = mouse.x;
                mouse.startY = mouse.y;
                element = document.createElement('div');
                element.className = 'rectangle';
                element.style.left = mouse.x + 'px';
                element.style.top = mouse.y + 'px';
                element.style.background = '#606060';
                element.style.opacity = 0.7;
                element.style.position = 'absolute';
                canvas.appendChild(element);
                canvas.style.cursor = 'crosshair';
            }
        };
    }

    public openManualBlockDialog(): void {
      let blockEditor = this.matDialog.open(BlockEditorComponent, {
        data: { manualBlock: true },
      });
      blockEditor.afterOpened().subscribe((res) => {
        window.parent.expandFrame(true);
      });
      blockEditor.afterClosed().subscribe((response) => {
        if (response) {
          this.createManualBlock(response);
        }
        window.parent.expandFrame(false);
      });
    }

    showBlockError(shelf?) {
        this.matDialog.open(BlockValidationErrorComponent);
        this.planogramService.removeAllSelection(this.sharedService.getActiveSectionId());
    }

    createManualBlock(manualBlock) {
        this.blockhelperService.manualBlockObj = manualBlock;
        let positionObj;
        let sectionID = this.sharedService.getActiveSectionId();
        this.blockhelperService.manBlockCtr++;
        if (this.blockhelperService.isManualDraw) {
            this.blockhelperService.isManualDraw = false;
        }
        positionObj = this.planogramService.getSelectedObject(sectionID);

        for (var j = 0; j < positionObj.length; j++) {
            positionObj[j].Position.IdBlock = this.blockhelperService.manBlockCtr;
            positionObj[j].Position.blockType = 'Manual';
        }
        this.blockhelperService.manBlkId = this.blockhelperService.manBlockCtr;
        let inputObj: any = {};
        inputObj.attr1 = 'IdBlock';
        inputObj.attr2 = undefined;
        inputObj.sectionId = sectionID;
        inputObj.isAutoBlocks = true;
        inputObj.objId = sectionID;
        this.blockhelperService.isRefresh = true;
        this.blockhelperService.isReblockMode = false;
        this.blockhelperService.AutoCreateBlock = false;
        var rootObj = this.sharedService.getObject(sectionID, sectionID);
        try {
            this.blockhelperService.prepareBlockInputs(this.blockhelperService.getAllBlocks(rootObj as Section));
            this.blockhelperService.prepareBlockData(inputObj);
        } catch (e) {
            this.log.error('error in parsing/creating block', e.stackTrace);
        }
        this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
        this.planogramService.updateSaveDirtyFlag(true);
        this.checkReBlocking(rootObj, sectionID);
        this.planogramService.removeAllSelection(sectionID);
        
    }

    checkReBlocking(rootObj, sectionID) {
        let blocks = this.blockhelperService.getAllBlocks(rootObj);
        const manBlkId = this.blockhelperService.manBlkId;
        blocks = _.filter(blocks, (obj) => {
            return obj.IdBlock == manBlkId;
        });
        if (blocks.length > 1) {
            var fixtureHList = [];
            var allPos = [];
            for (const block in blocks) {
                if (blocks.hasOwnProperty(block)) {
                    fixtureHList.push(
                        this.sharedService.getParentObject(blocks[block], sectionID).ChildDimension.Height,
                    );
                    for (var j = 0; j < blocks[block].Position$id.length; j++) {
                        allPos.push(this.sharedService.getObject(blocks[block].Position$id[j], sectionID));
                    }
                }
            }
            let currTallPos = _.maxBy(allPos, (obj) => {
                return obj.Position.ProductPackage.Height;
            });

            if (currTallPos.Position.ProductPackage.Height > Math.min.apply(null, fixtureHList)) {
                this.matDialog
                    .open(ReblockComponent)
                    .afterClosed()
                    .subscribe((response) => {
                        if (response) {
                            this.blockhelperService.reBlockPog(rootObj);
                            this.updateQuadTree(sectionID);
                        }
                    });
            } else {
                this.updateQuadTree(sectionID);
            }
            this.planogramService.removeAllSelection(sectionID);
        } else {
          this.updateQuadTree(sectionID);
        }
    }

    private runPreInits(): Boolean {
        const sectionID = this.sharedService.getActiveSectionId();
        const pog = this.sharedService.getObject(sectionID, sectionID) as Section;
        const blocks = this.blockhelperService.getAllBlocks(pog);

        if (pog.getAllStandardShelfs().length < 1) {
            this.notifyService.warn('ERR_NO_STD_FIXTURES_TO_CREATE_MANUAL_BLOCKS');
            return false;
        }
        // when no blocks exists, autoblock non-std fixtures first.
        if (blocks.length < 1) {
            this.blockhelperService.autoBlockNonStandardFixtures();
            this.blockhelperService.setRuleSetAttributes(null);
            this.updateQuadTree(sectionID);
        }
        return true;
    }

    private updateQuadTree(sectionId: string): void {
      this.quadTreeUtils.createQuadTree(sectionId);
      this.planogramService.updateNestedStyleDirty = true;
    }
}
