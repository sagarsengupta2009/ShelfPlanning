import { Section, StandardShelf } from '.';
import { AppConstantSpace } from '../constants';
import { Utils } from '../constants/utils';
import { Location } from '../models';
import { PlanogramService, SharedService } from '../services';
import { FixtureList, MerchandisableList } from '../services/common/shared/shared.service';
import { PlanogramObject } from './planogram-object';

export class Block extends PlanogramObject {

    public ObjectDerivedType: 'Block';
    public selected: boolean = false;
    // TODO @karthik eliminate order, needs analysis #121324
    public Order: string;
    public adjucentBlocks: Block[];
    public IdBlock: number;
    public BlockColor: string;
    public StrokeWidth: string;
    public blockType: string;
    public attributeValueFixture: string;
    public attribute: string;
    public attributeValue: string;
    public Rotation:Location = {'X':0, 'Y':0, 'Z':0};
    public Position$id: string[];

    constructor(data: object, public sharedService: SharedService, public planogramService: PlanogramService) {
        super(sharedService,data);
    }

    public get parent(): MerchandisableList {
        return this.sharedService.getParentObject(this, this.$sectionID);
    }

    // TODO @karthik selectNextBlock,getNextBlockItemFixture,selectPreviousBlock,getPreviousPositionFixture needs to be moved outside the class.
    public selectNextBlock(): void {
        if (!this) {
            return;
        }
        const currentFixtureObj = this.parent;
        let nextBlock: Block;
        let childern_arr = currentFixtureObj.Children as Block[];
        let next_arr = [];
        if (currentFixtureObj.asStandardShelf()?.isSpreadShelf) {
            childern_arr = currentFixtureObj.asStandardShelf()?.getAllSpreadSpanBlocks();
        }
        const currentBlockIndex = childern_arr.indexOf(this);
        if (this.Order === 'Parent' && currentBlockIndex === childern_arr.length - 1) {
            const nextFixture = this.getNextBlockItemFixture(currentFixtureObj.asStandardShelf(), this);
            if (nextFixture) {
                let curindex = 0;
                next_arr = nextFixture.Children;
                if (nextFixture.asStandardShelf()?.isSpreadShelf) {
                    next_arr  = nextFixture.getAllSpreadSpanBlocks() as Block[];
                }
                for (const [i, element] of next_arr.entries()) {
                    if (element.asBlock()) {
                        curindex = i;
                        break;
                    }
                }

                nextBlock = next_arr[curindex];
            }
        } else {
            nextBlock = childern_arr[currentBlockIndex + 1];
        }
        if (nextBlock) {
            this.planogramService.removeAllSelection(this.$sectionID);
            this.planogramService.addToSelectionByObject(nextBlock, this.$sectionID);
            this.selectAdjucents(nextBlock);
        }
    }

    public getNextBlockItemFixture(currentFixtureObj: StandardShelf, currentObj: Block): StandardShelf {
        const rootObj = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
        const fixtureFullPathCollection:MerchandisableList[] = rootObj.getFixtureFullPathCollection() as any;
        const currentObjectIndex = fixtureFullPathCollection.indexOf(currentFixtureObj);
        if (currentObjectIndex == fixtureFullPathCollection.length - 1) {
            return;
        }
        let nextFixture = fixtureFullPathCollection[currentObjectIndex + 1];
        if (
            !Utils.isNullOrEmpty(nextFixture) &&
            Utils.isNullOrEmpty(nextFixture.Children) &&
            nextFixture.Children.length > 0 &&
            nextFixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ
        ) {
            return nextFixture;
        } else {
            if (nextFixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ && nextFixture.isSpreadShelf) {
                return this.sharedService.getObject(nextFixture.spanShelfs[0], nextFixture.$sectionID) as StandardShelf;
            }
            return this.getNextBlockItemFixture(nextFixture as any, currentObj);
        }
    }

    public selectPreviousBlock(): void {
        const currentFixtureObj = this.parent;
        let childern_arr = currentFixtureObj.Children;
        if (currentFixtureObj.asStandardShelf()?.isSpreadShelf) {
            childern_arr = currentFixtureObj.asStandardShelf().getAllSpreadSpanBlocks();
        }
        const currentIndex = childern_arr.indexOf(this as any);
        let nextPosition;

        if (this.Order === 'Parent' && childern_arr[currentIndex - 1].asPosition()) {
            const nextFixture = this.getPreviousPositionFixture(currentFixtureObj, this);
            if (nextFixture) {
                let next_arr = nextFixture.Children;
                if (nextFixture.asStandardShelf()?.isSpreadShelf) {
                    next_arr = nextFixture.getAllSpreadSpanBlocks();
                }
                nextPosition = next_arr[next_arr.length - 1];
            }
        } else {
            nextPosition =
                childern_arr[currentIndex - 1] && childern_arr[currentIndex - 1].asBlock()
                    ? childern_arr[currentIndex - 1]
                    : {};
        }

        if (nextPosition) {
            this.planogramService.removeAllSelection(this.$sectionID);
            this.planogramService.addToSelectionByObject(nextPosition, this.$sectionID);
            this.selectAdjucents(nextPosition);
        }
    }

    public getPreviousPositionFixture(currentFixtureObj: FixtureList, currentObj: Block): StandardShelf {
        const rootObj = this.sharedService.getObject(currentFixtureObj.$sectionID, currentObj.$sectionID) as Section;
        const fixtureFullPathCollection = rootObj.getFixtureFullPathCollection();

        const currentObjectIndex = fixtureFullPathCollection.indexOf(currentFixtureObj);

        if (currentObjectIndex == 0) {
            return;
        }
        let nextFixture = fixtureFullPathCollection[currentObjectIndex - 1];
        if (nextFixture?.Children?.length > 0 && nextFixture.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ) {
            return nextFixture;
        } else {
            return this.getPreviousPositionFixture(nextFixture, currentObj);
        }
    }

    public selectHomeItem(): void {
        let homeItem;
        const currentFixtureObj = this.parent as StandardShelf;
        let childern_arr = currentFixtureObj.Children as Block[];
        if (currentFixtureObj.asStandardShelf()?.isSpreadShelf) {
            childern_arr = currentFixtureObj.getAllSpreadSpanBlocks();
        }
        let curindex = 0;
        for (const [i, child] of childern_arr.entries()) {
            if (child.asBlock()) {
                curindex = i;
                break;
            }
        }
        homeItem = childern_arr[curindex];
        if (homeItem) {
            this.planogramService.removeAllSelection(this.$sectionID);
            this.planogramService.addToSelectionByObject(childern_arr[curindex], childern_arr[curindex].$sectionID);
            this.selectAdjucents(childern_arr[curindex]);
        }
    }

    public selectEndItem(): void {
        let endItem: Block;
        const currentFixtureObj = this.parent;
        const currentfixtureSize = currentFixtureObj.Children.length;
        let lastPosObj = currentFixtureObj.Children[currentfixtureSize - 1] as  Block;
        if (currentFixtureObj.asStandardShelf()?.isSpreadShelf) {
            const allBlocks = currentFixtureObj.asStandardShelf().getAllSpreadSpanBlocks();
            lastPosObj = allBlocks[allBlocks.length - 1];
        }
        endItem = lastPosObj;
        if (endItem) {
            this.planogramService.removeAllSelection(this.$sectionID);
            this.planogramService.addToSelectionByObject(lastPosObj, lastPosObj.$sectionID);
            this.selectAdjucents(lastPosObj);
        }
    }

    public selectAdjucents(block: Block): void {
        if (block.adjucentBlocks.length > 0) {
            for (const adjucentBlocks of block.adjucentBlocks) {
                this.planogramService.addToSelectionById(adjucentBlocks.$id, block.$sectionID);
            }
        }
    }

    /** TODO @karthik Below methods may not be required. need to confirm */

    public getZIndexTooltip(): number {
        return 0;
    }

    public isChildAreaRequired(): boolean {
        return false;
    }

    public isRecurseObject(): boolean {
        return true;
    }

    public isRecurseChildObject(): boolean {
        return true;
    }

    public getXPosToPog(): number {
        const parentObj: MerchandisableList = this.parent;
        return parentObj.getXPosToPog() + this.Location.X;
    }

    public getYPosToPog(): number {
        const parentObj: MerchandisableList = this.parent;
        return parentObj.getYPosToPog() + parentObj.getBottomThickness() + this.Location.Y;
    }

    public getZPosToPog(): number {
        const parentObj: MerchandisableList = this.parent;
        return parentObj.getZPosToPog() + this.Location.Z;
    }

    public getRectDimension(): { height: number; width: number; depth: number } {
        return { height: this.Dimension.Height, width: this.Dimension.Width, depth: this.Dimension.Depth };
    }

    public getBottomThickness(): number {
        //By defalut to get the bottom thickness of any fixture.
        return 0;
    }

    public getChildOffsetX(): number {
        const parentObj: MerchandisableList = this.parent;
        return parentObj.getChildOffsetX();
    }

    public asBlock(): Block {
        return this;
    }
}
