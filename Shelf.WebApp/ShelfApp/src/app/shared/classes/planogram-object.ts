import { AppConstantSpace } from '../constants/appConstantSpace';
import { ObjectListItem } from '../services/common/shared/shared.service';
import * as _ from 'lodash';
import { Section } from './section';
import { PlanogramBase } from './planogram-base';
import {
    PogObjectResponse, QuadBounds, Size3,
    Location, Dimension2
} from '../models';
import { Utils } from '../constants';

export class PlanogramObject extends PlanogramBase implements PogObjectResponse {
    public readonly $idParent: string;
    public IDPOGObject: number;
    public Location: Location;
    public Fixture: any; // different from class to class, it's not readonly in case of Position.
    public readonly RotationOrigin: Location;
    public readonly Rotation: Location;
    public readonly ChildOffset: Location;
    public IDPOGObjectParent: number;
    public TempId: string;
    public readonly TempParentId: string;
    IdPog: number;
    IDPOG?: number;
    Planogram: any;
    ParentPogObject: PogObjectResponse;
    IDCorp: number;
    Position: any;
    public Key?: string;
    public minMerchIntersectFlag: boolean;
    /** TODO: @og remove after getQuadBounds is typed in other classess, used only in StandardShelf,Pegboard,Crossbar */
    protected minMerchHeight: number;

    private _parent?: ObjectListItem;

    public setParentId(parentId:string) {
        this._parent = undefined;
        (this as any).$idParent = parentId;
    }

    protected get parent(): ObjectListItem {
        if(!this._parent) {
            this._parent = this.sharedService.getObject(this.$idParent, this.$sectionID);
        }
        return this._parent;
    }

    public get section(): Section {
        return this.sharedService.getObject(this.$sectionID, this.$sectionID) as Section;
    }

    protected flipHeightDepth(ignoreView = false): boolean {
        const parent = this.parent;
        const parrentCoffincaseOrBasked = parent.asBasket() || parent.asCoffincase();
        if (ignoreView && parrentCoffincaseOrBasked) {
            return true
        }
        return parrentCoffincaseOrBasked && !parrentCoffincaseOrBasked.Fixture.DisplayViews;
    }

    protected getRenderingDimensionFor2D(): Dimension2 {
        return {
            Width: this.Dimension.Width,
            Height: this.flipHeightDepth() ? this.Dimension.Depth : this.Dimension.Height,
        };
    }

    protected getRenderingChildDimensionFor2D(): Dimension2 {
        return {
            Width: this.ChildDimension.Width,
            Height: this.flipHeightDepth() ? this.ChildDimension.Depth : this.ChildDimension.Height,
        }
    }

    public getTopYPosToPog(): number {
        return (this.section.ChildDimension.Height - (this.getFrontYToPog(true) + this.getRectDimension().height));
    }
    protected getBackTopYPosToPog(): number {
        return (this.section.ChildDimension.Height - (this.getYPosToPog(true)));
    }
    protected getSelectTopYPosToPog(): number {
        let rootObj = this.sharedService.getObject(this.$sectionID, this.$sectionID);
        return (rootObj.ChildDimension.Height - (this.getSelectFrontYToPog() + this.getSelectRectDimension().height));
    }
    protected getSelectRectDimension() {
        return { height: this.Dimension.Height, width: this.Dimension.Width, depth: this.Dimension.Depth };
    }
    protected getFrontYToPog(ignoreView): number {
        return this.getYPosToPog(ignoreView);
    }
    public getSelectFrontYToPog(): number {
        return this.getYPosToPog();
    }

    protected getRotation(): number {
        return this.Rotation.X;
    }

    public getQuadBounds(): QuadBounds {
        //overhang left should not effect the location of the fixture so same with quad locations too. so Commenting below line. 14th May 2019.
        //left: this.getXPosToPog() + this.getChildOffsetX(),
        return {
            left: this.getXPosToPog(),
            top: this.getTopYPosToPog(),
            back: this.getZPosToPog(),
            ...this.getRectDimension(),
            selectTop: this.getSelectTopYPosToPog(),
            selectHeight: this.getSelectRectDimension().height,
            minMerchHeight: this.minMerchHeight,
            rotationx: this.getRotation(),
            backtop: this.getBackTopYPosToPog()
        };
    }

    protected isChildAreaRequired(): boolean {
        return true;
    }

    protected isRenderingAllowed(): boolean {
        return true;
    }
    protected isRecurseObject(): boolean {
        return true;
    }
    protected isRecurseChildObject(): boolean {
        return true;
    }

    protected isObjectSupportsSpreadLocation(): boolean {
        return false;
    }

    protected getRectDimension(): Size3 {
        return { width: 0, height: 0, depth: 0 };
    }

    protected getLocationX(): number {
        return this.Location.X;
    }
    protected getLocationY(): number {
        return this.Location.Y;
    }
    protected getLocationZ(): number {
        return this.Location.Z;
    }
    protected getPosEndX(): number {
        return Number((this.Location.X + this.Dimension.Width).toFixed(2));
    }
    protected getPosEndY(): number {
        return Number((this.Location.Y + this.linearHeight()).toFixed(2));
    }

    //It's unique method from the list so same name given
    protected sortByXEndPos(wd: number): number {
        return (wd - (this.getXPosToPog() + this.Dimension.Width))
    }
    protected getPosPOGEndX(): number {
        return this.getXPosToPog() + this.Dimension.Width
    }
    public getPegholeYLoc(): number {
        return this.Location.Y + (this.linearHeight() - (this.computeHeight() - this.getPegInfo().OffsetY));
    }

    public getPegholeXLoc(): number {
        return this.Location.X + this.getPegInfo().OffsetX;
    }
    protected getFixtureNumber(): number {
        return this.Fixture.FixtureNumber;
    }


    protected getOpacity(): number {
        return 1;
    }
    //@todo :- to be removed after bays has capability to calculate its width
    //dt. 8th July, 2014 - Abhishek
    //its uses just ObjectType Fixture to get minWidth Required recursively
    protected checkMinWidthTemp(val: number, edgeDirecToAdjust?: boolean): { flag: boolean; minObjFix: { bayNo: number; fixNo: number; }; } {
        edgeDirecToAdjust == undefined ? edgeDirecToAdjust = true : '';
        let minWidthRequired = edgeDirecToAdjust ? this.sharedService.secWidReducnFixLimit + this.getXPosToPog() : -this.sharedService.secWidReducnFixLimit + this.getXPosToPog() + this.Dimension.Width;
        let minObjFix;
        if ((this.Fixture || {}).FixtureType == AppConstantSpace.MODULAR) {
            minObjFix = { bayNo: ((this.Fixture || {}).FixtureFullPath), fixNo: this.Fixture.FixtureFullPath };
        } else {
            let modularKid = _.filter(this.Children, { ObjectDerivedType: AppConstantSpace.MODULAR });
            if (modularKid.length == 1) {
                minObjFix = { bayNo: ((modularKid[0].Fixture || {}).FixtureFullPath), fixNo: modularKid[0].Fixture.FixtureFullPath };
            }
        }
        //let innerContext:any = this;
        let logMinWidthAccross = (innerContext) => {
            innerContext.Children.forEach((child, key) => {
                //dt. 8th July, 2014 - Abhishek
                //@todo see the comments
                //For now we use bay/standardshelf as same for width validation, since bays widths are not calculated based on standard shelf inside it.
                //if(child.ObjectType == 'Fixture' && child.IDFixtureType != -1 /*&& child.Fixture.FixtureType == 'StandardShelf'*/) {
                if (child.ObjectType == 'Fixture' && (child.Fixture.FixtureType == AppConstantSpace.MODULAR || child.Fixture.FixtureType == AppConstantSpace.STANDARDSHELFOBJ || child.Fixture.FixtureType == 'Fixture' || child.Fixture.FixtureType == AppConstantSpace.PEGBOARDOBJ || child.Fixture.FixtureType == AppConstantSpace.COFFINCASEOBJ || child.Fixture.FixtureType == AppConstantSpace.BASKETOBJ || child.Fixture.FixtureType == AppConstantSpace.SLOTWALLOBJ || child.Fixture.FixtureType == AppConstantSpace.CROSSBAROBJ || child.Fixture.FixtureType == AppConstantSpace.BLOCK_FIXTURE)) {
                    let tempWidth = this.sharedService.secWidReducnFixLimit + child.getXPosToPog(); //.getXPosFromPOG
                    if (tempWidth > minWidthRequired) {
                        let childParent = this.sharedService.getObject(child.$idParent, child.$sectionID);
                        minObjFix = { bayNo: ((childParent.Fixture || {}).FixtureFullPath), fixNo: child.Fixture.FixtureFullPath }
                        minWidthRequired = tempWidth;
                    }
                }
                logMinWidthAccross(child)
            });
            return;
        }

        //recursively call
        logMinWidthAccross(this);

        if ((edgeDirecToAdjust && val < minWidthRequired) || (!edgeDirecToAdjust && val > minWidthRequired)) {
            return { flag: false, minObjFix: minObjFix };
        }
        return { flag: true, minObjFix: minObjFix };
    }


    // will be overriden by child classes functions
    protected getPegInfo(): { OffsetX: number; OffsetY: number; } {
        throw new Error("Method not implemented.");
    }

    protected computeHeight(): number {
        throw new Error("Method not implemented.");
    }

    protected linearHeight(arg?: any): number {
        throw new Error("Method not implemented.");
    }

    public getXPosToPog(): number {
        throw new Error("Method not implemented.");
    }

    public getYPosToPog(arg?: any): number {
        throw new Error("Method not implemented.");
    }

    public getZPosToPog(): number {
      let zPos = 0;
      let parentObj = this.sharedService.getParentObject(this, this.$sectionID);
      if (parentObj?.ObjectType != AppConstantSpace.POG) {
          zPos = parentObj.Location.Z;
      }
      return (zPos + this.Location.Z);
    }

    public calculateWeightCapacity(): void {
        throw new Error("Method not implemented.");
    }
}
