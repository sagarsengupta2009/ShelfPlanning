import { Injectable } from '@angular/core';
import { HistoryService } from '../../common';
import { Position } from 'src/app/shared/classes/position';
import { Coffincase, Divider } from 'src/app/shared/classes';
import { cloneDeep, groupBy } from 'lodash';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';
import { CrunchMode, CrunchModeService, CrunchRect, PositionRect } from '../crunch-mode/crunch-mode.service';
import { RectangleCoordinates2d } from 'src/app/shared/models';
import { CollisionService } from '../collision/collision.service';

@Injectable({
  providedIn: 'root'
})
export class ShrinkService {

  constructor(
    public readonly historyService: HistoryService,
    private readonly crunchMode: CrunchModeService,
    public readonly collision: CollisionService
  ) { }

  public coffincase: Coffincase;
  public allCalculatedPosition: string[] = [];

  public calcShrinkForCoffinPositions(coffincaseObj: Coffincase, selPos: Position, oldChildren?: (Position | Divider)[], onlyShrink?: { X: boolean, Y: boolean }): { err?: string; message: string[]; revertFlag: boolean } | undefined {
    this.coffincase = coffincaseObj;
    const isRecordingOn = this.historyService.isRecordingOn[coffincaseObj.$sectionID];
    this.historyService.isRecordingOn[coffincaseObj.$sectionID] = false;
    this.coffincase.doNotCalWH = true;
    oldChildren = oldChildren ?? cloneDeep(this.coffincase.Children);
    const oldShrinkValues: { [key: string]: { [key: string]: number } } = {};
    oldChildren.forEach(oc => {
      if (Utils.checkIfPosition(oc)) {
        oldShrinkValues[oc.$id] = cloneDeep(oc.calculatedShrinkValues);
      }
    });
    const rects = this.crunchMode.getRects(this.coffincase, this.coffincase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    this.setAllPositionsForShrink(this.coffincase, rects as PositionRect[]);

    // if (onlyShrink && onlyShrink.X) {
    //     this.calculatePositionShrinkX(selPos, rects);
    // } else
    if (onlyShrink && onlyShrink.Y) {
      this.calculatePositionShrinkY(selPos);
      this.coffincase.doNotCalWH = true;
      this.calculatePositionShrinkX(selPos, this.coffincase.placed);
    } else {
      this.calculatePositionShrinkX(selPos, rects);
      this.coffincase.doNotCalWH = true;
      this.calculatePositionShrinkY(selPos);
    }

    const response = this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode);
    if (response && response.revertFlag) {
      this.revertPosDimAndLoc(oldChildren, oldShrinkValues);
    } else {
      this.posShrinkHistory(coffincaseObj, cloneDeep(this.coffincase.Children), oldChildren);
    }
    this.historyService.isRecordingOn[coffincaseObj.$sectionID] = isRecordingOn;
    return response;
  }

  // Note : Capture history for undo-redo
  private posShrinkHistory(coffincaseObj: Coffincase, newChildren: (Position | Divider)[], oldChildren: (Position | Divider)[], calculateDetails?: boolean, isRedo?: boolean): void {
    this.historyService.isRecordingOn[coffincaseObj.$sectionID] = true;
    if (calculateDetails) {
      coffincaseObj.Children.forEach(po => {
        const oldPos = oldChildren.find(lp => lp.$id == po.$id);
        if (oldPos && Utils.checkIfPosition(po) && Utils.checkIfPosition(oldPos)) {
          po.Dimension.Width = oldPos.Dimension.Width;
          po.Dimension.Height = oldPos.Dimension.Height;
          po.Dimension.Depth = oldPos.Dimension.Depth;
          po.Location = cloneDeep(oldPos.Location);
          po.Position.IDOrientation = oldPos.Position.IDOrientation;
          po.Position.SKUGapX = oldPos.Position.SKUGapX;
          po.Position.SKUGapY = oldPos.Position.SKUGapY;
          const usePos = isRedo ? oldPos : po;
          const posWidth = usePos.linearWidth(true);
          const shrinkX = (posWidth - oldPos.Dimension.Width) / usePos.Position.FacingsX;
          const posHeight = usePos.linearHeight(true);
          const shrinkY = (posHeight - oldPos.Dimension.Height) / usePos.Position.FacingsY;
          po.calculatedShrinkValues = { 'ShrinkX': shrinkX, 'ShrinkY': shrinkY };
        }
      });
      coffincaseObj.doNotCalWH = true;
      const rects = this.crunchMode.getRects(coffincaseObj, coffincaseObj.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
      this.crunchMode.rePositionCoffinCaseOnCrunch(coffincaseObj, coffincaseObj.Fixture.LKCrunchMode, undefined, rects);
      coffincaseObj.doNotCalWH = false;
      coffincaseObj.placed = coffincaseObj.placed.filter(cp => oldChildren.find(lp => lp.$id == cp.ref.$id) != undefined);
      this.setAllPositionsForShrink(this.coffincase, coffincaseObj.placed as PositionRect[], true, true);
    }

    const original = ((coffincaseObj, newChildren, oldChildren) => {
      return () => {
        this.posShrinkHistory(coffincaseObj, newChildren, oldChildren, true, true);
      };
    })(coffincaseObj, oldChildren, newChildren);
    const revert = ((coffincaseObj, newChildren, oldChildren) => {
      return () => {
        this.posShrinkHistory(coffincaseObj, newChildren, oldChildren, true);
      };
    })(coffincaseObj, newChildren, oldChildren);
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'CoffinCasePositionShrink',
    });
    this.historyService.isRecordingOn[coffincaseObj.$sectionID] = false;
  }

  // Note : Revert changes if there is any error
  private revertPosDimAndLoc(oldChildren: (Position | Divider)[], oldShrinkValues: { [key: string]: { [key: string]: number } }): void {
    this.coffincase.Children.forEach(po => {
      const oldPos = oldChildren.find(lp => lp.$id == po.$id);
      if (oldPos && Utils.checkIfPosition(po)) {
        po.Dimension.Width = oldPos.Dimension.Width;
        po.Dimension.Height = oldPos.Dimension.Height;
        po.Dimension.Depth = oldPos.Dimension.Depth;
        po.Location = cloneDeep(oldPos.Location);
        po.calculatedShrinkValues = oldShrinkValues[po.$id];
        po.Position.IDOrientation = oldPos.Position.IDOrientation;
        po.Position.SKUGapX = oldPos.Position.SKUGapX;
        po.Position.SKUGapY = oldPos.Position.SKUGapY;
      }
    });
    this.coffincase.doNotCalWH = true;
    const rects = this.crunchMode.getRects(this.coffincase, this.coffincase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);
    this.coffincase.doNotCalWH = false;
    this.coffincase.placed = this.coffincase.placed.filter(cp => oldChildren.find(lp => lp.$id == cp.ref.$id) != undefined);
    this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true, true);
  }

  //#region Shrink X

  // Note : Calculate shrink x for left or right crunch mode
  private calculatePositionShrinkX(selPos: Position, rects: CrunchRect[], doNotCallCalcY?: boolean): void {
    // Note: Skip other calculations if all position do not have shrink factor
    const hasContainShrinkX = this.coffincase.getAllPosition().find(p => p.getShrinkX() > 0) != undefined;
    if (!hasContainShrinkX || this.coffincase.Fixture.ForceApplyShrinkX) {
      this.coffincase.getAllPosition().forEach(p => { 
        p.Dimension.Width = p.linearWidth(true);
      });
      this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);
      this.coffincase.doNotCalWH = false;
      this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
      return;
    }

    if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.NoCrunch) {
      this.calcShrinkXForNoCrunch(selPos, rects, doNotCallCalcY);
      return;
    }

    this.allCalculatedPosition = [];
    let calculatedPositions: Position[] = [];
    const allPos = this.coffincase.getAllPosInXDirWithNearest(selPos).sort((a, b) => a.Location.X - b.Location.X);

    // first Set selected position
    this.calculateWidth(selPos);
    calculatedPositions.push(selPos);
    allPos.filter(p => p.$id != selPos.$id).forEach(position => {
      this.calculateWidth(position);
      calculatedPositions.push(position);
    });

    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);

    this.calcParallelPositionsWidth(calculatedPositions);

    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);

    const mainPos = this.getParellelPositionsInXDir(this.coffincase, selPos)[0];
    if (mainPos.$id != selPos.$id) {
      calculatedPositions = [];
      this.setAllPositionsInDir(this.coffincase.placed as PositionRect[], true);
      const allPos: Position[] = this.coffincase.getAllPosInXDirWithNearest(mainPos).sort((a, b) => a.Location.X - b.Location.X);
      this.calculateWidth(mainPos);
      calculatedPositions.push(mainPos);
      allPos.filter(p => p.$id != mainPos.$id).forEach(position => {
        this.calculateWidth(position);
        calculatedPositions.push(position);
      });
      this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);

      this.calcParallelPositionsWidth(calculatedPositions);

      this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);
    }

    this.calculateWidthForRemainPos();

    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);

    this.coffincase.doNotCalWH = false;

    if (this.coffincase.Fixture.LKCrunchMode == CrunchMode.Right) {
      // Code block to correct width of the pos which has minus loc x in right crunch mode
      this.setAllPositionsInDir(this.coffincase.placed as PositionRect[], true, true);
      this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode);
      this.coffincase.placed.forEach(rect => {
        if (Utils.checkIfPosition(rect.ref) && rect.lx < 0) {
          const shrinkedWidth = rect.ref.linearWidth(true) - rect.ref.getShrinkX();
          rect.ref.Dimension.Width = rect.rx > shrinkedWidth ? rect.rx : shrinkedWidth;
        }
      });
    }
    this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
  }

  // Note : Calculate shrink x for no crunch mode
  private calcShrinkXForNoCrunch(selPos: Position, rects: CrunchRect[], doNotCallCalcY?: boolean): void {
    const rect1: RectangleCoordinates2d = {
      xstart: Utils.preciseRound(selPos.Location.X, 2),
      xend: Utils.preciseRound(selPos.Location.X + selPos.linearWidth(true) + (selPos.Position.SKUGapX / 2), 2),
      ystart: Utils.preciseRound(selPos.Location.Y, 2),
      yend: Utils.preciseRound(selPos.Location.Y + selPos.Dimension.Height + (selPos.Position.SKUGapY / 2), 2)
    }
    const intersectedPositions = this.coffincase.getIntersectedPosition(rects, rect1).filter(p => p.$id != selPos.$id).sort((a, b) => a.Location.X - b.Location.X);
    const rightDivider = this.coffincase.getNearestDividerRight(selPos);
    let endLocX = intersectedPositions.length > 0 ? intersectedPositions[0].Location.X : this.coffincase.ChildDimension.Width;
    endLocX = (rightDivider && endLocX > rightDivider.Location.X) ? rightDivider.Location.X : endLocX;
    const totalAvailLinear = endLocX - selPos.Location.X;
    const maxSqueeze = Utils.preciseRound(selPos.getShrinkX(), 2);
    const posWidth = this.coffincase.linearWidthPosition(selPos, undefined, undefined, true) + (selPos.Position.SKUGapX / 2);
    const requiredLinear = posWidth - totalAvailLinear;
    const shrinkValue = requiredLinear > 0 ? (requiredLinear > maxSqueeze ? maxSqueeze : requiredLinear) : 0;
    selPos.Dimension.Width = Utils.preciseRound(totalAvailLinear < posWidth ? posWidth - shrinkValue : posWidth, 2);

    if (!doNotCallCalcY) {
      this.calculatePositionShrinkY(selPos, true);
      return;
    }

    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);
    this.coffincase.doNotCalWH = false;
    this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
  }

  // Note : Calculate position width which is parallel to selected position for proper shrink x
  private calcParallelPositionsWidth(positions: Position[]): void {
    if (positions.length) {
      positions.forEach(pos => {
        const parallelPositions = this.getParellelPositionsInXDir(this.coffincase, pos);
        const mainPos = parallelPositions[0];
        parallelPositions.forEach(p => {
          if (p.$id != pos.$id && p.$id != mainPos.$id && p.getShrinkX() > 0 && !this.checkIfSinglePositionForWidth(this.coffincase, p)) {
            const allPos: Position[] = this.coffincase.getAllPosInXDirWithNearest(p).sort((a, b) => a.Location.X - b.Location.X);
            this.calculateWidth(p);
            allPos.filter(po => po.$id != p.$id).forEach(position => {
              this.calculateWidth(position);
            });
            this.allCalculatedPosition.push(p.$id);
            this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);
          }
        });
      });
    }
  }

  // Note : Calculate selected position's width for shrink x
  private calculateWidth(pos: Position): void {
    const dimension = pos.getDimByOrientation(pos.Position.ProductPackage.ShrinkPctX, pos.Position.ProductPackage.ShrinkPctY, pos.Position.ProductPackage.ShrinkPctZ);
    if (dimension.X > 0) {
      const allPos: Position[] = this.coffincase.getAllPosInXDirWithNearest(pos).sort((a, b) => a.Location.X - b.Location.X);
      const requiredLinear = this.coffincase.getRequiredLinear(pos);
      const posWidth = pos.linearWidth(true);
      const posSkuGap = pos.getSKUGap() / 2;

      const hasOnlyCurrentPos = allPos.filter(p => p.$id != pos.$id).length == 0;
      if (hasOnlyCurrentPos && allPos.length > 0) {
        const maxSqueeze = Utils.preciseRound(pos.getShrinkX(), 2);
        const shrinkValue = requiredLinear > 0 ? (requiredLinear > maxSqueeze ? maxSqueeze : requiredLinear) : 0;
        const totalAvailLinear = this.coffincase.getTotalAvailLinear(pos);
        pos.Dimension.Width = Utils.preciseRound(totalAvailLinear < (posWidth + posSkuGap) ? posWidth - shrinkValue : posWidth, 2);
      } else {
        const shrinkValues = { X: 0 };
        if (this.coffincase.setCanUseShrinkVal(pos)) {
          let percentageRequiredLinear = 100;
          const maxAvailableSqueeze = allPos.reduce((p, n) => p + n.getShrinkX(), 0);
          if (maxAvailableSqueeze > requiredLinear) {
            percentageRequiredLinear = this.coffincase.percentageRequiredLinear(requiredLinear, maxAvailableSqueeze);
          }
          shrinkValues.X = pos.getRequiredShrinkX(percentageRequiredLinear);
        }
        pos.Dimension.Width = Utils.preciseRound(this.coffincase.linearWidthPosition(pos, undefined, undefined, undefined, undefined, shrinkValues), 2);
      }

      const shrinkedWidth = Utils.preciseRound(posWidth + posSkuGap - pos.getShrinkX(), 2);
      if (pos.Dimension.Width < shrinkedWidth) {
        pos.Dimension.Width = shrinkedWidth;
      }
    } else {
      pos.Dimension.Width = Utils.preciseRound(this.coffincase.linearWidthPosition(pos, undefined, undefined, undefined, undefined, { X: 0 }), 2);
    }
    this.allCalculatedPosition.push(pos.$id);
  }

  // Note : Calculate width of the remaining positions for shrink x
  private calculateWidthForRemainPos(): void {
    this.coffincase.getAllPosition().forEach(p => {
      const dimension = p.getDimByOrientation(p.Position.ProductPackage.ShrinkPctX, p.Position.ProductPackage.ShrinkPctY, p.Position.ProductPackage.ShrinkPctZ);
      if (!this.allCalculatedPosition.includes(p.$id) && dimension.X > 0) {

        const allPos: Position[] = this.coffincase.getAllPosInXDirWithNearest(p).sort((a, b) => a.Location.X - b.Location.X);
        this.calculateWidth(p);
        allPos.filter(po => po.$id != p.$id).forEach(position => {
          this.calculateWidth(position);
        });
        this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, this.coffincase.placed);

        // const posWidth = Utils.preciseRound(p.linearWidth(true) + this.coffincase.getSKUGapXBaseOnCrunch(p, p.Dimension.Width), 2);
        // let xStart = p.Location.X;
        // let xEnd = p.Location.X + posWidth;
        // if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
        //   const newLocX = Utils.preciseRound(p.Location.X - (posWidth - p.Dimension.Width), 2);
        //   xStart = newLocX >= 0 ? newLocX : 0;
        //   xEnd = p.Location.X + p.Dimension.Width;
        // }
        // const leftDivider = this.coffincase.getNearestDividerLeft(p);
        // const rightDivider = this.coffincase.getNearestDividerRight(p);
        // xStart = leftDivider && (leftDivider.Location.X + leftDivider.Fixture.Thickness) > xStart ? Utils.preciseRound(leftDivider.Location.X + leftDivider.Fixture.Thickness, 2) : xStart;
        // xEnd = rightDivider && rightDivider.Location.X < xEnd ? rightDivider.Location.X : xEnd;

        // const rect1: RectangleCoordinates2d = {
        //   xstart: Utils.preciseRound(xStart, 2),
        //   xend: Utils.preciseRound(xEnd, 2),
        //   ystart: Utils.preciseRound(p.Location.Y, 2),
        //   yend: Utils.preciseRound(p.Location.Y + p.Dimension.Height, 2)
        // }
        // const collidedPosition = this.coffincase.getIntersectedPosition(this.coffincase.placed, rect1).filter(ip => ip.$id != p.$id);

        // if (collidedPosition.length <= 0) {
        //   if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
        //     const calcWidth = Utils.preciseRound(xEnd - (leftDivider ? leftDivider.Location.X + leftDivider.Fixture.Thickness : 0), 2);
        //     p.Dimension.Width = calcWidth > posWidth ? posWidth : calcWidth;
        //   } else {
        //     const calcWidth = Utils.preciseRound((rightDivider ? rightDivider.Location.X : this.coffincase.ChildDimension.Width) - xStart, 2);
        //     p.Dimension.Width = calcWidth > posWidth ? posWidth : calcWidth;
        //   }
        // } else {
        //   if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
        //     const leftcoliPosition = collidedPosition.filter(ip => ip.Location.X < p.Location.X).sort((a, b) => b.Location.X - a.Location.X);
        //     p.Dimension.Width = leftcoliPosition.length ? Utils.preciseRound(xEnd - (leftcoliPosition[0].Location.X + leftcoliPosition[0].Dimension.Width), 2) : posWidth;
        //   } else {
        //     const rightcoliPosition = collidedPosition.filter(ip => ip.Location.X > p.Location.X).sort((a, b) => a.Location.X - b.Location.X);
        //     p.Dimension.Width = rightcoliPosition.length ? Utils.preciseRound(rightcoliPosition[0].Location.X - xStart, 2) : posWidth;
        //   }
        // }

        // const shrinkedWidth = Utils.preciseRound(posWidth - p.getShrinkX(), 2);
        // if (p.Dimension.Width < shrinkedWidth) {
        //   p.Dimension.Width = shrinkedWidth;
        // }
      }
    });
  }

  //#endregion

  //#region Shrink Y

  // Note : Calculate shrink y for left or right crunch mode
  private calculatePositionShrinkY(selPos: Position, doNotCallCalcX?: boolean): void {
    // Note: Skip other calculations if all position do not have shrink factor
    const hasContainShrinkY = this.coffincase.getAllPosition().find(p => p.getShrinkY() > 0) != undefined;
    if (!hasContainShrinkY) {
      this.coffincase.getAllPosition().forEach(p => {
        p.Dimension.Height = p.linearHeight(true);
      });
      const rects = this.crunchMode.getRects(this.coffincase, this.coffincase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
      this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);
      this.coffincase.doNotCalWH = false;
      this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
      return;
    }

    if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.NoCrunch) {
      this.calcShrinkYForNoCrunch(selPos, doNotCallCalcX);
      return;
    }

    this.allCalculatedPosition = [];
    let calculatedPositions: Position[] = [];
    const allPos = this.coffincase.getAllPosInYDirWithNearest(selPos).sort((a, b) => a.Location.Y - b.Location.Y);

    // first Set selected position
    this.calculateHeight(selPos);
    calculatedPositions.push(selPos);
    allPos.filter(p => p.$id != selPos.$id).forEach(position => {
      this.calculateHeight(position);
      calculatedPositions.push(position);
    });

    this.updateLocationYForShrink(allPos);
    this.calcParallelPositionsHeight(calculatedPositions);

    const mainPos = this.getParellelPositionsInYDir(this.coffincase, selPos)[0];
    if (mainPos.$id != selPos.$id) {
      calculatedPositions = [];
      this.setAllPositionsInDir(this.coffincase.placed as PositionRect[], false);
      const allPos: Position[] = this.coffincase.getAllPosInYDirWithNearest(mainPos).sort((a, b) => a.Location.Y - b.Location.Y);
      this.calculateHeight(mainPos);
      calculatedPositions.push(mainPos);
      allPos.filter(p => p.$id != mainPos.$id).forEach(position => {
        this.calculateHeight(position);
        calculatedPositions.push(position);
      });

      this.updateLocationYForShrink(allPos);
      this.calcParallelPositionsHeight(calculatedPositions);
    }

    this.calculateHeightForRemainPos();

    const rects = this.crunchMode.getRects(this.coffincase, this.coffincase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);

    this.coffincase.doNotCalWH = false;
    this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
  }

  // Note : Calculate shrink y for no crunch mode
  private calcShrinkYForNoCrunch(selPos: Position, doNotCallCalcX?: boolean): void {
    const rect1: RectangleCoordinates2d = {
      xstart: Utils.preciseRound(selPos.Location.X, 2),
      xend: Utils.preciseRound(selPos.Location.X + selPos.Dimension.Width + (selPos.Position.SKUGapX / 2), 2),
      ystart: Utils.preciseRound(selPos.Location.Y, 2),
      yend: Utils.preciseRound(selPos.Location.Y + selPos.linearHeight(true) + (selPos.Position.SKUGapY / 2), 2)
    }
    const rects = this.crunchMode.getRects(this.coffincase, this.coffincase.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    const intersectedPositions = this.coffincase.getIntersectedPosition(rects, rect1).filter(p => p.$id != selPos.$id).sort((a, b) => a.Location.Y - b.Location.Y);
    const topDivider = this.coffincase.getNearestDividerTop(selPos);
    let endLocY = intersectedPositions.length > 0 ? intersectedPositions[0].Location.Y : this.coffincase.ChildDimension.Depth;
    endLocY = (topDivider && endLocY > topDivider.Location.Y) ? topDivider.Location.Y : endLocY;
    const totalAvailLinear = endLocY - selPos.Location.Y;
    const maxSqueeze = Utils.preciseRound(selPos.getShrinkY(), 2);
    const posHeight = this.coffincase.linearHeightPosition(selPos, undefined, undefined, true) + (selPos.Position.SKUGapY / 2);
    const requiredLinear = posHeight - totalAvailLinear;
    const shrinkValue = requiredLinear > 0 ? (requiredLinear > maxSqueeze ? maxSqueeze : requiredLinear) : 0;
    selPos.Dimension.Height = Utils.preciseRound(totalAvailLinear < posHeight ? posHeight - shrinkValue : posHeight, 2);

    if (!doNotCallCalcX) {
      this.calculatePositionShrinkX(selPos, rects, true);
      return;
    }
    this.crunchMode.rePositionCoffinCaseOnCrunch(this.coffincase, this.coffincase.Fixture.LKCrunchMode, undefined, rects);
    this.coffincase.doNotCalWH = false;
    this.setAllPositionsForShrink(this.coffincase, this.coffincase.placed as PositionRect[], true);
  }

  // Note : Update Loc Y based on newly calculated height
  private updateLocationYForShrink(allPos: Position[]): void {
    let prevPos: Position = undefined;
    allPos.forEach(p => {
      if (prevPos) {
        p.Location.Y = prevPos.Location.Y + prevPos.Dimension.Height;
      }
      prevPos = p;
    });
  }

  // Note : Calculate position height which is parallel to selected position for proper shrink y
  private calcParallelPositionsHeight(positions: Position[]): void {
    if (positions.length) {
      positions.forEach(pos => {
        const parallelPositions = this.getParellelPositionsInYDir(this.coffincase, pos);
        const mainPos = parallelPositions[0];
        parallelPositions.forEach(p => {
          if (p.$id != pos.$id && p.$id != mainPos.$id && p.getShrinkY() > 0 && !this.checkIfSinglePositionForHeight(this.coffincase, p)) {
            const allPos: Position[] = this.coffincase.getAllPosInYDirWithNearest(p).sort((a, b) => a.Location.Y - b.Location.Y);
            this.calculateHeight(p);
            allPos.filter(po => po.$id != p.$id).forEach(position => {
              this.calculateHeight(position);
            });
            this.updateLocationYForShrink(allPos);
            this.allCalculatedPosition.push(p.$id);
          }
        });
      });
    }
  }

  // Note : Calculate selected position's height for shrink y
  private calculateHeight(pos: Position): void {
    const dimension = pos.getDimByOrientation(pos.Position.ProductPackage.ShrinkPctX, pos.Position.ProductPackage.ShrinkPctY, pos.Position.ProductPackage.ShrinkPctZ);
    if (dimension.Y > 0) {
      const allPos: Position[] = this.coffincase.getAllPosInYDirWithNearest(pos).sort((a, b) => a.Location.Y - b.Location.Y);
      const requiredLinearY = this.coffincase.getRequiredLinearY(pos);
      const posHeight = pos.linearHeight(true);

      const hasOnlyCurrentPos = allPos.filter(p => p.$id != pos.$id).length == 0;
      if (hasOnlyCurrentPos && allPos.length > 0) {
        const maxSqueeze = Utils.preciseRound(pos.getShrinkY(), 2);
        const shrinkValue = requiredLinearY > 0 ? (requiredLinearY > maxSqueeze ? maxSqueeze : requiredLinearY) : 0;
        const totalAvailLinear = this.coffincase.getTotalAvailLinearY(pos);
        pos.Dimension.Height = Utils.preciseRound(totalAvailLinear < (posHeight + (pos.Position.SKUGapY / 2)) ? posHeight - shrinkValue : posHeight, 2);
      } else {
        const shrinkValues = { Y: 0 };
        if (this.coffincase.canUseShrinkValInY(pos)) {
          let percentageRequiredLinear = 100;
          const maxAvailableSqueeze = allPos.reduce((p, n) => p + n.getShrinkY(), 0);
          if (maxAvailableSqueeze > requiredLinearY) {
            percentageRequiredLinear = this.coffincase.percentageRequiredLinear(requiredLinearY, maxAvailableSqueeze);
          }
          shrinkValues.Y = pos.getRequiredShrinkY(percentageRequiredLinear);
        }
        pos.Dimension.Height = Utils.preciseRound(this.coffincase.linearHeightPosition(pos, undefined, undefined, undefined, undefined, shrinkValues), 2);
      }

      const shrinkedHeight = Utils.preciseRound(posHeight + (pos.Position.SKUGapY / 2) - pos.getShrinkY(), 2);
      if (pos.Dimension.Height < shrinkedHeight) {
        pos.Dimension.Height = shrinkedHeight;
      }
    } else {
      pos.Dimension.Height = Utils.preciseRound(this.coffincase.linearHeightPosition(pos, undefined, undefined, undefined, undefined, { Y: 0 }), 2);
    }
    this.allCalculatedPosition.push(pos.$id);
  }

  // Note : Calculate height of the remaining positions for shrink y
  private calculateHeightForRemainPos(): void {
    this.coffincase.getAllPosition().forEach(p => {
      const dimension = p.getDimByOrientation(p.Position.ProductPackage.ShrinkPctX, p.Position.ProductPackage.ShrinkPctY, p.Position.ProductPackage.ShrinkPctZ);
      if (!this.allCalculatedPosition.includes(p.$id) && dimension.Y > 0) {

        const allPos: Position[] = this.coffincase.getAllPosInYDirWithNearest(p).sort((a, b) => a.Location.Y - b.Location.Y);
        this.calculateHeight(p);
        allPos.filter(po => po.$id != p.$id).forEach(position => {
          this.calculateHeight(position);
        });
        this.updateLocationYForShrink(allPos);

        // const posHeight = Utils.preciseRound(p.linearHeight(true) + (p.Position.SKUGapY / 2), 2);
        // let yStart = p.Location.Y;
        // let yEnd = p.Location.Y + posHeight;

        // const bottomDivider = this.coffincase.getNearestDividerBottom(p);
        // const topDivider = this.coffincase.getNearestDividerTop(p);
        // yStart = bottomDivider && (bottomDivider.Location.Y + bottomDivider.Fixture.Thickness) > yStart ? Utils.preciseRound(bottomDivider.Location.Y + bottomDivider.Fixture.Thickness, 2) : yStart;
        // yEnd = topDivider && topDivider.Location.Y < yEnd ? topDivider.Location.Y : yEnd;

        // const rect1: RectangleCoordinates2d = {
        //   xstart: Utils.preciseRound(p.Location.X, 2),
        //   xend: Utils.preciseRound(p.Location.X + p.Dimension.Width, 2),
        //   ystart: Utils.preciseRound(yStart, 2),
        //   yend: Utils.preciseRound(yEnd, 2)
        // }
        // const collidedPosition = this.coffincase.getIntersectedPosition(this.coffincase.placed, rect1).filter(ip => ip.$id != p.$id);
        // if (collidedPosition.length <= 0) {
        //   const calcHeight = Utils.preciseRound((topDivider ? topDivider.Location.Y : this.coffincase.ChildDimension.Depth) - yStart, 2);
        //   p.Dimension.Height = calcHeight > posHeight ? posHeight : calcHeight;
        // } else {
        //   const topColiPosition = collidedPosition.filter(ip => ip.Location.Y > p.Location.Y).sort((a, b) => a.Location.Y - b.Location.Y);
        //   p.Dimension.Height = topColiPosition.length ? Utils.preciseRound(topColiPosition[0].Location.Y - yStart, 2) : posHeight;
        // }

        // const shrinkedHeight = Utils.preciseRound(posHeight - p.getShrinkY(), 2);
        // if (p.Dimension.Height < shrinkedHeight) {
        //   p.Dimension.Height = shrinkedHeight;
        // }
      }
    });
  }

  //#endregion

  //#region Create position chain for shrinking

  // Note : Create all possible position chain based on selected position
  public setAllPositionsForShrink(coffincaseObj: Coffincase, rects: PositionRect[], getExactMatch?: boolean, doNotCalcShrink?: boolean): void {
    this.coffincase = coffincaseObj;
    // Set for X Direction
    this.setAllPositionsInDir(rects, true, getExactMatch, doNotCalcShrink);

    // Set for Y Direction
    this.setAllPositionsInDir(rects, false, getExactMatch, doNotCalcShrink);
  }

  // Note : Set position chain based on direction, like X or Y
  private setAllPositionsInDir(rects: PositionRect[], inXDir: boolean, getExactMatch?: boolean, doNotCalcShrink?: boolean): void {
    inXDir ? this.coffincase.allPosInXDirection = {} : this.coffincase.allPosInYDirection = {};
    if (inXDir && this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
      rects.forEach(re => re.lx = (re.lx < 0 ? 0 : re.lx));
    }
    // Created shallow copy to prevent changing order of the array
    const clonedRects = [...rects];
    clonedRects.forEach((rect: PositionRect) => {
      if (Utils.checkIfPosition(rect.ref)) {
        const pos = rect.ref;
        const nextRects = inXDir ? this.getRelatedNextRectsForXDir(rects, rect, getExactMatch) : this.getRelatedNextRectsForYDir(rects, rect, getExactMatch);
        const newNode = { pos: pos, children: [] };
        const posTree: PosTreeNode[] = [newNode];
        if (nextRects.length) {
          this.createPosTree(rects, nextRects, newNode, pos.$id, getExactMatch, inXDir);
        }
        posTree.forEach(pt => {
          inXDir ? this.coffincase.allPosInXDirection[pt.pos.$id] = this.convertTreeToArray(pt) : this.coffincase.allPosInYDirection[pt.pos.$id] = this.convertTreeToArray(pt);
        });

        if (!doNotCalcShrink) {
          const dimension = pos.getDimByOrientation(pos.Position.ProductPackage.ShrinkPctX, pos.Position.ProductPackage.ShrinkPctY, pos.Position.ProductPackage.ShrinkPctZ);
          if (inXDir) {
            // Note: Calculate shrink and save it for later use in getShrinkWidth func
            let shrinkX = 0;
            if (dimension.X > 0) {
              const posWidth = pos.linearWidth(true);
              const totalShrink = posWidth - pos.Dimension.Width;
              shrinkX = totalShrink / pos.Position.FacingsX;
            }
            pos.calculatedShrinkValues['ShrinkX'] = shrinkX;
          } else {
            // Note: Calculate shrink and save it for later use in getShrinkHeight func
            let shrinkY = 0;
            if (dimension.Y > 0) {
              const posHeight = pos.linearHeight(true);
              const totalShrink = posHeight - pos.Dimension.Height;
              shrinkY = totalShrink / pos.Position.FacingsY;
            }
            pos.calculatedShrinkValues['ShrinkY'] = shrinkY;
          }
        }
      }
    });
  }

  private createPosTree(rects: PositionRect[], childRects: PositionRect[], parentNode: PosTreeNode, id: string, getExactMatch: boolean, inXDir: boolean): void {
    childRects.forEach(p => {
      if (Utils.checkIfPosition(p.ref)) {
        const node = { pos: p.ref as Position, children: [] };
        parentNode.children.push(node);
        const nextRects = inXDir ? this.getRelatedNextRectsForXDir(rects, p, getExactMatch) : this.getRelatedNextRectsForYDir(rects, p, getExactMatch);
        if (nextRects.length) {
          this.createPosTree(rects, nextRects, node, p.ref.$id, getExactMatch, inXDir);
        }
      }
    });
  }

  private getRelatedNextRectsForXDir(rects: PositionRect[], rect: PositionRect, getExactMatch: boolean): PositionRect[] {
    let relatedPosRects: PositionRect[] = this.findRelatedPositionsForXDir(rects, rect, getExactMatch);
    relatedPosRects = relatedPosRects.sort((a, b) => a.lx - b.lx);

    let groupByLocX = undefined;
    if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
      groupByLocX = Object.entries(groupBy(relatedPosRects, (val) => val.rx)).sort((a, b) => Number(b[0]) - Number(a[0]));
    } else {
      groupByLocX = Object.entries(groupBy(relatedPosRects, (val) => val.lx)).sort((a, b) => Number(a[0]) - Number(b[0]));
    }

    return groupByLocX.length ? groupByLocX[0][1] : [];
  }

  private getRelatedNextRectsForYDir(rects: PositionRect[], rect: PositionRect, getExactMatch: boolean): PositionRect[] {
    let relatedPosRects: PositionRect[] = this.findRelatedPositionsForYDir(rects, rect, getExactMatch);
    relatedPosRects = relatedPosRects.sort((a, b) => a.by - b.by);
    let groupByLocY = Object.entries(groupBy(relatedPosRects, (val) => val.by)).sort((a, b) => Number(a[0]) - Number(b[0]));
    return groupByLocY.length ? groupByLocY[0][1] : [];
  }

  private convertTreeToArray(node: PosTreeNode): Position[][] {
    if (node.children.length === 0) {
      return [[node.pos]];
    }
    let result: Position[][] = [];
    for (const child of node.children) {
      const childArrays = this.convertTreeToArray(child);
      for (const childArray of childArrays) {
        result.push([node.pos, ...childArray]);
      }
    }
    return result;
  }

  private findRelatedPositionsForXDir(posRects: PositionRect[], pos: PositionRect, getExactMatch: boolean): PositionRect[] {
    if (getExactMatch) {
      if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
        return posRects.filter(re => Utils.checkIfPosition(re.ref) && pos.lx == re.rx);
      } else {
        let xEnd = this.coffincase.ChildDimension.Width;
        const rightDivider = this.coffincase.getNearestDividerRight(pos.ref);
        if (rightDivider) {
          xEnd = rightDivider.Location.X;
        } else {
          const highestRx = posRects.sort((a, b) => b.rx - a.rx)[0]?.rx;
          xEnd = xEnd > highestRx ? xEnd : highestRx;
        }
        return posRects.filter(re => Utils.checkIfPosition(re.ref) && pos.rx == re.lx && re.lx <= xEnd);
      }
    } else {
      const startY = Utils.preciseRound(pos.by, 2);
      const endY = Utils.preciseRound(pos.ty, 2);
      let xEnd = this.coffincase.ChildDimension.Width;
      let xStart = pos.rx;

      if (this.coffincase.Fixture.LKCrunchMode === CrunchMode.Right) {
        xStart = 0;
        const leftDivider = this.coffincase.getNearestDividerLeft(pos.ref);
        if (leftDivider) {
          xStart = leftDivider.Location.X + leftDivider.Fixture.Thickness;
        }
        xEnd = pos.lx;
      } else {
        const rightDivider = this.coffincase.getNearestDividerRight(pos.ref);
        if (rightDivider) {
          xEnd = rightDivider.Location.X;
        } else {
          const highestRx = posRects.sort((a, b) => b.rx - a.rx)[0]?.rx;
          xEnd = xEnd > highestRx ? xEnd : highestRx;
        }
      }

      const rect1: RectangleCoordinates2d = {
        xstart: xStart,
        xend: xEnd,
        ystart: startY,
        yend: endY
      }
      return posRects.filter(p => {
        if (!Utils.checkIfPosition(p.ref)) {
          return false;
        }
        const pStartY = Utils.preciseRound(p.by, 2);
        const pEndY = Utils.preciseRound(p.ty, 2);
        const rect2: RectangleCoordinates2d = {
          xstart: Utils.preciseRound(p.lx, 2),
          xend: Utils.preciseRound(p.rx, 2),
          ystart: pStartY,
          yend: pEndY
        }
        return this.collision.isIntersecting2D(rect1, rect2, 0);
      });
    }
  }

  private findRelatedPositionsForYDir(posRects: PositionRect[], pos: PositionRect, getExactMatch: boolean): PositionRect[] {
    let endY = this.coffincase.ChildDimension.Depth;
    const topDivider = this.coffincase.getNearestDividerTop(pos.ref);
    if (topDivider) {
      endY = topDivider.Location.Y;
    } else {
      const highestTy = posRects.sort((a, b) => b.ty - a.ty)[0]?.ty;
      endY = endY > highestTy ? endY : highestTy;
    }
    if (getExactMatch) {
      return posRects.filter(re => Utils.checkIfPosition(re.ref) && pos.ty == re.by && re.ty <= endY);
    } else {
      const xEnd = Utils.preciseRound(pos.rx, 2);
      const xStart = Utils.preciseRound(pos.lx, 2);
      let startY = Utils.preciseRound(pos.ty, 2);

      const rect1: RectangleCoordinates2d = {
        xstart: xStart,
        xend: xEnd,
        ystart: startY,
        yend: endY
      }
      return posRects.filter(p => {
        if (!Utils.checkIfPosition(p.ref)) {
          return false;
        }
        const pStartY = Utils.preciseRound(p.by, 2);
        const pEndY = Utils.preciseRound(p.ty, 2);
        const rect2: RectangleCoordinates2d = {
          xstart: Utils.preciseRound(p.lx, 2),
          xend: Utils.preciseRound(p.rx, 2),
          ystart: pStartY,
          yend: pEndY
        }
        return this.collision.isIntersecting2D(rect1, rect2, 0);
      });
    }
  }

  //#endregion

  // Note : Get parallel position in X direction for passed position in params
  public getParellelPositionsInXDir(coffincaseObj: Coffincase, pos: Position): Position[] {
    // Note: If its single position then do not go for parallel positions
    if (this.checkIfSinglePositionForWidth(coffincaseObj, pos)) {
      return [pos];
    }

    // check for which position has smallest shrink percentage while having position with same width and same location X but diff location Y, like above position.
    let parallelPos: Position[] = [];
    if (coffincaseObj.Fixture.LKCrunchMode === CrunchMode.Right) {
      const posRX = Utils.preciseRound(pos.Location.X + coffincaseObj.getPosWidthForRect(pos, true), 2);
      parallelPos = coffincaseObj.getAllPosition().filter(p => p.$id != pos.$id && Utils.preciseRound(p.Location.X + coffincaseObj.getPosWidthForRect(p, true), 2) == posRX);
    } else {
      parallelPos = coffincaseObj.getAllPosition().filter(p => p.$id != pos.$id && Utils.preciseRound(p.Location.X, 2) == Utils.preciseRound(pos.Location.X, 2));
    }

    if (parallelPos.length <= 0) {
      return [pos];
    }

    let mainPos = pos;
    const allPos = coffincaseObj.getAllPosInXDirection(pos);
    let selPosWithHighLocX = undefined;
    if (coffincaseObj.Fixture.LKCrunchMode == CrunchMode.Right) {
      const selRightPositions = allPos.filter(po => po.$id != pos.$id && po.Location.X > pos.Location.X).sort((a, b) => b.Location.X - a.Location.X);
      selPosWithHighLocX = selRightPositions.length ? selRightPositions[0].$id : 'FIRSTORLAST';
    } else {
      const selLeftPositions = allPos.filter(po => po.$id != pos.$id && po.Location.X < pos.Location.X).sort((a, b) => b.Location.X - a.Location.X);
      selPosWithHighLocX = selLeftPositions.length ? selLeftPositions[0].$id : 'FIRSTORLAST';
    }

    let selPosTotalWidth = allPos.reduce((ac: number, po: Position) => {
      const poWidth = po.linearWidth(true);
      return Utils.preciseRound(ac + poWidth + coffincaseObj.getSKUGapXBaseOnCrunch(po, poWidth) - po.getShrinkX(), 2);
    }, 0);
    const sameDimParallelPositions = [pos];
    for (let p of parallelPos) {
      const positions = coffincaseObj.getAllPosInXDirection(p);

      const positionsId = positions.filter(po => po.$id != p.$id).map(po => po.$id);
      const selPositionsId = allPos.filter(po => po.$id != pos.$id).map(po => po.$id);
      if (selPositionsId.find(spi => positionsId.includes(spi)) == undefined) {
        continue;
      }

      let pPosWithHighLocX = undefined;
      if (coffincaseObj.Fixture.LKCrunchMode == CrunchMode.Right) {
        const pRightPositions = allPos.filter(po => po.$id != p.$id && po.Location.X > p.Location.X).sort((a, b) => b.Location.X - a.Location.X);
        pPosWithHighLocX = pRightPositions.length ? pRightPositions[0].$id : 'FIRSTORLAST';
      } else {
        const pLeftPositions = positions.filter(po => po.$id != p.$id && po.Location.X < p.Location.X).sort((a, b) => b.Location.X - a.Location.X);
        pPosWithHighLocX = pLeftPositions.length ? pLeftPositions[0].$id : 'FIRSTORLAST';
      }

      let isSame = selPosWithHighLocX === pPosWithHighLocX;

      if (!isSame && pPosWithHighLocX != 'FIRSTORLAST' && selPosWithHighLocX != 'FIRSTORLAST') {
        const pPosChain = coffincaseObj.allPosInXDirection[pPosWithHighLocX];
        for (const chain of pPosChain) {
          if (chain.find(c => c.$id === pos.$id)) {
            isSame = true;
            break;
          }
        }
        const selPosChain = coffincaseObj.allPosInXDirection[selPosWithHighLocX];
        for (const chain of selPosChain) {
          if (isSame || chain.find(c => [pos.$id, p.$id].includes(c.$id))) {
            isSame = true;
            break;
          }
        }
      }

      if (isSame) {
        sameDimParallelPositions.push(p);
        const posTotalWidth = positions.reduce((ac: number, po: Position) => {
          const poWidth = po.linearWidth(true);
          return Utils.preciseRound(ac + poWidth + coffincaseObj.getSKUGapXBaseOnCrunch(po, poWidth) - po.getShrinkX(), 2);
        }, 0);
        if (selPosTotalWidth < posTotalWidth) {
          mainPos = p;
          selPosTotalWidth = posTotalWidth;
        } else if (selPosTotalWidth == posTotalWidth) {  // To do : May be this below code block is not require for any direction as we are getting width/height with shrink.
          const pShrinkWidth = Utils.preciseRound(p.getSingleFacingShrinkWidth(), 2);
          const posShrinkWidth = Utils.preciseRound(pos.getSingleFacingShrinkWidth(), 2);
          if (posShrinkWidth < pShrinkWidth) {
            mainPos = p;
          }
        }
      }
    }
    const mainPosIndex = sameDimParallelPositions.findIndex(p => p.$id == mainPos.$id);
    sameDimParallelPositions.splice(mainPosIndex, 1);
    return [mainPos, ...sameDimParallelPositions];
  }

  // Note : Check if position is not associate with any other position
  private checkIfSinglePositionForWidth(coffincaseObj: Coffincase, pos: Position): boolean {
    const oldDoNotCalWH = coffincaseObj.doNotCalWH;
    coffincaseObj.doNotCalWH = true;
    const rects = this.crunchMode.getRects(coffincaseObj, coffincaseObj.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    coffincaseObj.doNotCalWH = oldDoNotCalWH;

    let fixtureWidth = coffincaseObj.ChildDimension.Width;
    if (coffincaseObj.Fixture.HasDividers && coffincaseObj.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
      fixtureWidth = coffincaseObj.getDividerBlockWidth(pos);
    }
    const rect1: RectangleCoordinates2d = {
      xstart: 0,
      xend: Utils.preciseRound(fixtureWidth, 2),
      ystart: Utils.preciseRound(pos.Location.Y, 2),
      yend: Utils.preciseRound(pos.Location.Y + pos.Dimension.Height + pos.getSKUGapY(), 2)
    }
    const intersectedPositions = coffincaseObj.getIntersectedPosition(rects, rect1).filter(p => p.$id != pos.$id);
    return intersectedPositions.length == 0;
  }

  // Note : Get parallel position in Y direction for passed position in params
  public getParellelPositionsInYDir(coffincaseObj: Coffincase, pos: Position): Position[] {
    // Note: If its single position then do not go for parallel positions
    if (this.checkIfSinglePositionForHeight(coffincaseObj, pos)) {
      return [pos];
    }

    // check for which position has smallest shrink percentage while having position with same heigh and same location Y but diff location X, like side position.
    let parallelPos: Position[] = coffincaseObj.getAllPosition().filter(p => p.$id != pos.$id && Utils.preciseRound(p.Location.Y, 2) == Utils.preciseRound(pos.Location.Y, 2));
    if (parallelPos.length <= 0) {
      return [pos];
    }

    let mainPos = pos;
    const allPos = coffincaseObj.getAllPosInYDirection(pos);
    const selPositions = allPos.filter(po => po.$id != pos.$id && po.Location.Y < pos.Location.Y).sort((a, b) => b.Location.Y - a.Location.Y);
    let selPosWithHighLocY = selPositions.length ? selPositions[0].$id : 'FIRSTORLAST';

    let selPosTotalHeight = allPos.reduce((ac: number, po: Position) => {
      return Utils.preciseRound(ac + po.linearHeight(true) + po.getSKUGapY() - po.getShrinkY(), 2);
    }, 0);
    const sameDimParallelPositions = [pos];
    for (let p of parallelPos) {
      const positions = coffincaseObj.getAllPosInYDirection(p);

      const positionsId = positions.filter(po => po.$id != p.$id).map(po => po.$id);
      const selPositionsId = allPos.filter(po => po.$id != pos.$id).map(po => po.$id);
      if (selPositionsId.find(spi => positionsId.includes(spi)) == undefined) {
        continue;
      }

      const pPositions = positions.filter(po => po.$id != p.$id && po.Location.Y < p.Location.Y).sort((a, b) => b.Location.Y - a.Location.Y);
      let pPosWithHighLocY = pPositions.length ? pPositions[0].$id : 'FIRSTORLAST';

      let isSame = selPosWithHighLocY === pPosWithHighLocY;

      if (!isSame && pPosWithHighLocY != 'FIRSTORLAST' && selPosWithHighLocY != 'FIRSTORLAST') {
        const pPosChain = coffincaseObj.allPosInYDirection[pPosWithHighLocY];
        for (const chain of pPosChain) {
          if (chain.find(c => c.$id === pos.$id)) {
            isSame = true;
            break;
          }
        }
        const selPosChain = coffincaseObj.allPosInYDirection[selPosWithHighLocY];
        for (const chain of selPosChain) {
          if (isSame || chain.find(c => [pos.$id, p.$id].includes(c.$id))) {
            isSame = true;
            break;
          }
        }
      }

      if (isSame) {
        sameDimParallelPositions.push(p);
        const posTotalHeight = positions.reduce((ac: number, po: Position) => {
          return Utils.preciseRound(ac + po.linearHeight(true) + po.getSKUGapY() - po.getShrinkY(), 2);
        }, 0);
        if (selPosTotalHeight < posTotalHeight) {
          mainPos = p;
          selPosTotalHeight = posTotalHeight;
        }
      }
    }
    const mainPosIndex = sameDimParallelPositions.findIndex(p => p.$id == mainPos.$id);
    sameDimParallelPositions.splice(mainPosIndex, 1);
    return [mainPos, ...sameDimParallelPositions];
  }

  // Note : Check if position is not associate with any other position
  private checkIfSinglePositionForHeight(coffincaseObj: Coffincase, pos: Position): boolean {
    const oldDoNotCalWH = coffincaseObj.doNotCalWH;
    coffincaseObj.doNotCalWH = true;
    const rects = this.crunchMode.getRects(coffincaseObj, coffincaseObj.Fixture.LKCrunchMode, { lx: 0, rx: 0, ty: 0 });
    coffincaseObj.doNotCalWH = oldDoNotCalWH;

    let fixtureDepth = coffincaseObj.ChildDimension.Depth;
    if (coffincaseObj.Fixture.HasDividers && coffincaseObj.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
      fixtureDepth = coffincaseObj.getDividerBlockHeight(pos);
    }

    const rect1: RectangleCoordinates2d = {
      xstart: Utils.preciseRound(pos.Location.X, 2),
      xend: Utils.preciseRound(pos.Location.X + coffincaseObj.getPosWidthForRect(pos, true), 2),
      ystart: 0,
      yend: Utils.preciseRound(fixtureDepth, 2)
    }
    const intersectedPositions = coffincaseObj.getIntersectedPosition(rects, rect1).filter(p => p.$id != pos.$id);
    return intersectedPositions.length == 0;
  }
}

interface PosTreeNode {
  pos: Position;
  children: PosTreeNode[];
}
