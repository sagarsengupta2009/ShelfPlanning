import { SharedService } from '../services/common/shared/shared.service';
import { Basket } from './basket';
import { Coffincase } from './coffincase';
import { Section } from './section';
import { Position } from './position';
import { StandardShelf } from './standard-shelf';
import { Fixture } from './fixture';
import { Grill } from './grill';
import { Divider, Dimension } from '../models';
import { BlockFixture } from './block-fixture';
import { PegBoard } from './peg-board';
import { SlotWall } from './slot-wall';
import { Crossbar } from './crossbar';
import { Block } from './blocks';
import { ShoppingCart } from './shopping-cart';
import { Modular } from './modular';
import { Slotwall } from '../models/planogram/slotwall';


type ClientXFields = '_DeltaSales' | '_DeltaMovement'; // TODO: can delete if no use

/** should be extended by all pog objects except Section */
export class PlanogramBase {
    // TODO: @og when object is dropped initially it doesn't have a $id
    public $id: string;
    public $sectionID: string;
    public readonly Dimension: Dimension;
    // TODO: @og type, if we use a certain type or a ObjectListType,
    // a lot of typing errors will arise in other classes, so we should type those first
    public Children: any[];
    public readonly ObjectType: string;
    public ObjectDerivedType: string;

    public readonly Color: string;
    public readonly _CalcField: {
        id: string;
        sectionId: string;
        Position: any;
        Fixture: any
    };
    protected readonly Fixture: { id: string }
    public readonly ChildDimension: Dimension;

    /*
    [key: `_${string}`]: {
        IDDictionary: number;
        IDPOGObject: number;
        Key: string;
        ValData: number;
    };*/

    constructor(
        public readonly sharedService: SharedService,
        // TODO: @og when object is dropped initially it doesn't have a $sectionID
        data: object,
    ) {
        Object.assign(this, data);
        this.$id = this.sharedService.nextUid();
    }

    public asSection(): Section {
        return undefined;
    }

    public asShoppingCart(): ShoppingCart {
        return undefined;
    }

    public asFixture(): Fixture {
        return undefined;
    }

    public asBasket(): Basket | undefined {
        return undefined;
    }

    public asCoffincase(): Coffincase | undefined {
        return undefined;
    }

    public asPosition(): Position | undefined {
        return undefined;
    }

    public asStandardShelf(): StandardShelf | undefined {
        return undefined;
    }

    public asGrill(): Grill | undefined {
        return undefined;
    }

    public asDivider(): Divider | undefined {
        return undefined;
    }

    public asBlockFixture(): BlockFixture | undefined {
        return undefined;
    }

    public asPegBoard(): PegBoard | undefined {
        return undefined;
    }

    public asSlotwall(): SlotWall | undefined {
        return undefined;
    }

    public asCrossbar(): Crossbar | undefined {
        return undefined;
    }

    public asBlock(): Block | undefined {
        return undefined;
    }

    public asModular(): Modular | undefined {
        return undefined;
    }

    public asPegType(): PegBoard | Slotwall | Crossbar | undefined {
        return undefined;
    }
}