import { Utils } from "../constants";
import { FixtureList } from "../services/common/shared/shared.service";
import { Section } from "./section";


/**  holds a chached ordered list of the fixtures
    IMPORTANT: Context becomes invalid if one of the fixtures Y position changes
*/
export class Context {
  public static numericRangeMinVal: { [key: string]: number } = {};
  public static numericRangeMaxVal: { [key: string]: number } = {};
  public allLimitingShelvesYPosDesc: FixtureList[];
  public allLimitingShelvesYPosAsc: FixtureList[];
  public positionDistributionCalculated: { [key: string]: boolean } = {};
  public distributionCalculated: { [key: string]: boolean } = {};
  public skuCount: {
      pog: number;
      cart: number;
  };
  public static linearWidth: { [key: string]: number } = {};
  public static linearHeight: { [key: string]: number } = {};
  public static cacheShrinkFactors: { [key: string]: { maxAvailableSqueeze: number, requiredLinear: number, canUseShrinkVal: boolean } } = {};
  public isSpanShelfCalculated: boolean = false;
  constructor(public readonly section: Section) {
      this.reset();
  }
  public reset() {
    this.allLimitingShelvesYPosAsc = this.allLimitingShelvesYPosDesc = this.section.getAllLimitingShelves();
      this.allLimitingShelvesYPosDesc = Utils.sortByYPosDesendingOrder(this.allLimitingShelvesYPosDesc);
      this.allLimitingShelvesYPosAsc = Utils.sortByYPos(this.allLimitingShelvesYPosAsc);
      this.distributionCalculated = {};
      this.positionDistributionCalculated = {};
      Context.linearWidth = {};
      Context.linearHeight = {};
      Context.numericRangeMinVal[this.section.$id] = null;
      Context.numericRangeMaxVal[this.section.$id] = null;
      this.isSpanShelfCalculated = false;
  }

}
