import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { filter } from 'rxjs/operators';
import * as _ from 'lodash';
import { ConsoleLogService, LocalStorageService } from 'src/app/framework.module';
import { AppConstantSpace, COLOR_PALETTE, LocalStorageKeys, UNIQUE_COLOR_PALETTE } from 'src/app/shared/constants';
import { CombinedBlock, BlockConfig, BlockRuleAttributesConfig, BlockColors } from 'src/app/shared/models';
import {
  SharedService, ParentApplicationService, QuadtreeUtilsService,
  PlanogramService,
  HistoryService
} from 'src/app/shared/services';
import { PlanogramCommonService } from '../space-automation/dashboard/shelf-planogram/planogram-common.service';
import { AllocateAPIService } from './allocate-api.service';
import { Block, Modular, Position, Section } from 'src/app/shared/classes';
declare const window: any;

@Injectable({
  providedIn: 'root',
})
export class BlockHelperService {
  public blockAttributes: any;
  private sectionID: any;
  private reBlockInput: any[];
  // TODO @karthik elimiate this
  public manBlkId: number;
  private lastReCtr: number = 2000; // reblock ids start from 2000, manual block ids from 1000
  public isRefresh: boolean = false;
  private ruleAttributes: any;
  // TODO @karthik move this to hashmap
  public savedColors: any = {};
  private manualDeleteMode: boolean;
  private manualBlockId: string = '';
  private blockCounter: number = 0;
  private resetBlockCtr: any;
  private blockArrToUpdate: any = [];
  // TODO @karthik elimiate this
  public manualBlockObj: any;
  public isManualDraw: boolean;
  public manBlockCtr: number = 1000;
  public isReblockMode: boolean;
  public AutoCreateBlock: boolean;
  public blocksUpdated = new Subject();
  constructor(
    private readonly sharedService: SharedService,
    private readonly allocateAPIService: AllocateAPIService,
    private readonly quadTreeUtils: QuadtreeUtilsService,
    private readonly planogramService: PlanogramService,
    private readonly planogramCommonService: PlanogramCommonService,
    private readonly parentApp: ParentApplicationService,
    private readonly localStorage: LocalStorageService,
    private readonly log: ConsoleLogService,
    private readonly historyService: HistoryService,
  ) {
    this.parentApp.onReady
      .pipe(filter(isReady => isReady))
      .subscribe(() => {
        if (!this.parentApp.isAllocateApp) { return; }
        const metaData = this.localStorage.getValue(LocalStorageKeys.PA.META_DATA);
        this.blockAttributes = JSON.parse(JSON.parse(metaData).BlockAttributes);
        window.blockDataFromShelf = () => {
          const sectionID = this.currentSectionId;
          let pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
          var blockData = this.getAllParentBlocksCombined(pogObj);
          let ruleSet = this.blockAttributes.filter((e) => e.IdRuleSet == pogObj.RuleSetId)[0];
          if (ruleSet) {
            blockData['blockType'] = ruleSet.Value;
          }
          return blockData;
        };
      });

    this.historyService.blockHelperService = this;
  }

  private get currentSectionId(): string {
    return this.sectionID ? this.sectionID : this.sharedService.getActiveSectionId();
  }

  private sortBlocks(blocksArr) {
    return blocksArr.sort((a, b) => a.BlockName > b.BlockName ? 1 : -1);
  }

  private getSavedBlockAttr(ruleId) {
    for (let i = 0; i < this.blockAttributes.length; i++) {
      if (this.blockAttributes[i].IdRuleSet == ruleId) {
        return this.blockAttributes[i];
      }
    }
    return [];
  }

  public getAllBlocks(pogObj: Section): Block[] {
    let blocksArr = [];
    let recursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        obj.Children.forEach((child) => {
          if (child.ObjectDerivedType === AppConstantSpace.BLOCKOBJECT) {
            blocksArr.push(child);
          }
          recursive(child);
        });
      }
    };
    recursive(pogObj);
    return blocksArr;
  }

  public getAllBlocksCombined(pogObj: Section): CombinedBlock[]{
    let blocksArr = {};
    let recursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != 'ShoppingCart') {
        obj.Children.forEach((child) => {
          if (child.ObjectDerivedType === 'Block') {
            if (blocksArr[child.attributeValue] == undefined) {
              blocksArr[child.attributeValue] = {
                $idParent: child.$idParent,
                attribute: child.attribute,
                idBlock: child.IdBlock,
                blockColor: child.BlockColor,
                children: child.Position$id,
                blockType: child.blockType,
                BlockName: child.attribute == 'Fixture' && child.blockType != 'Manual' ? child.attributeValueFixture : child.attributeValue,
              };
            } else {
              blocksArr[child.attributeValue].children = [...blocksArr[child.attributeValue].children, ...child.Position$id];
            }
          }
          recursive(child);
        });
      }
    };
    recursive(pogObj);
    return this.sortBlocks(Object.values(blocksArr));
  }

  private getAllParentBlocksCombined(pogObj: Section) {
    let TotalWidth = pogObj.UsedLinear + pogObj.AvailableLinear;
    let blocksArr = [];
    let TotalSales = 0;
    let recursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != 'ShoppingCart') {
        obj.Children.forEach((child) => {
          if (
            child.ObjectDerivedType === 'Block' &&
            child.Order === 'Parent' &&
            typeof child.attributeValue == 'string'
          ) {
            let parentObj = this.sharedService.getParentObject(
              child,
              this.currentSectionId,
            );
            let Width = child.Dimension.Width;
            let LocX = child.getXPosToPog();
            let LocY = parentObj.getYPosToPog();
            let Height = parentObj.Dimension.Height;
            let blockArea = Width * Height;
            let currSales = 0;
            let itemsArray = [];

            let populateblocks = (child, attr) => {
              let currBlock = blocksArr[attr];
              currBlock['BlockColor'] = child['BlockColor'];
              currBlock.fixtureType = obj.ObjectDerivedType;
              currBlock.IdBlock = child.IdBlock;
              currBlock.Order = 'Parent';
              currBlock.ParentBlockName = '';
              currBlock.blockType = child.blockType;
              currBlock.Width = Width;
              currBlock.blockArea = blockArea;
              currBlock.currSales = currSales;
              currBlock.itemsArray = child.Positions;
              currBlock.minLocationX = LocX;
              currBlock.maxLocationX = LocX + Width;
              currBlock.minLocationY = LocY;
              currBlock.maxLocationY = LocY + Height;
            };

            for (let i = 0; i < parentObj.Children.length; i++) {
              if (
                parentObj.Children[i].ObjectDerivedType == 'Position' &&
                parentObj.Children[i].Position.IdBlock == child.IdBlock
              ) {
                currSales = currSales + parentObj.Children[i].Position.attributeObject.CurrSales;
                itemsArray.push(parentObj.Children[i].Position.Product.IDProduct);
              }
            }
            TotalSales += currSales ?? 0;

            // non-standrard fixtures to have single block irrespective of blocking type.
            if (obj.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
              child.attributeValueFixture = obj.ObjectDerivedType + '_' + child.Fixture.FixtureNumber;
              blocksArr[child.attributeValueFixture] = {};
              blocksArr[child.attributeValueFixture].BlockName =
                obj.ObjectDerivedType + '_' + child.Fixture.FixtureNumber;
              blocksArr[child.attributeValueFixture].attributeValueFixture =
                obj.ObjectDerivedType + '_' + child.Fixture.FixtureNumber;
              populateblocks(child, child.attributeValueFixture);
            } else {
              if (
                Object.keys(blocksArr).find((k) => {
                  return k.toLowerCase().trim() == child.attributeValue.toLowerCase().trim();
                }) == undefined
              ) {
                blocksArr[child.attributeValue] = {};
                //Added this condition to update block name as specified in requirment doc
                if (child.attribute == 'Fixture' && child.blockType != 'Manual') {
                  blocksArr[child.attributeValue].BlockName = child.attributeValueFixture;
                  blocksArr[child.attributeValue].blockedBy = child.attribute;
                } else {
                  blocksArr[child.attributeValue].BlockName = child.attributeValue;
                }
                populateblocks(child, child.attributeValue);
              } else {
                let attributeValue = Object.keys(blocksArr).find((k) => {
                  return k.toLowerCase().trim() == child.attributeValue.toLowerCase().trim();
                });
                blocksArr[attributeValue].Width = Width + blocksArr[attributeValue].Width;
                blocksArr[attributeValue].blockArea = blockArea + blocksArr[attributeValue].blockArea;
                blocksArr[attributeValue].currSales = currSales + blocksArr[attributeValue].currSales;
                blocksArr[attributeValue].itemsArray = _.union(
                  child.PositionIDs,
                  blocksArr[attributeValue].itemsArray,
                );
                if (LocX < blocksArr[attributeValue].minLocationX) {
                  blocksArr[attributeValue].minLocationX = LocX;
                }
                if (LocX + Width > blocksArr[attributeValue].maxLocationX) {
                  blocksArr[attributeValue].maxLocationX = LocX + Width;
                }
                if (LocY < blocksArr[attributeValue].minLocationY) {
                  blocksArr[attributeValue].minLocationY = LocY;
                }
                if (LocY + Height > blocksArr[attributeValue].maxLocationY) {
                  blocksArr[attributeValue].maxLocationY = LocY + Height;
                }
              }
            }
          }
          recursive(child);
        });
      }
    };
    recursive(pogObj);
    return {
      pogData: this.sortBlocks(Object.values(blocksArr)),
      TotalWidth: TotalWidth,
      TotalSales: TotalSales,
      isPogDirty: true,
      isNestedBlock: false,
    };
  }

  private compareAndgetBlock(blocks, newBlockArr, currentIndex, startIndex, ctr) {
    let fixtureH = [];
    let sectionID = this.currentSectionId;
    let belowPos = [];
    for (let f = startIndex; f <= currentIndex; f++) {
      fixtureH.push(this.sharedService.getParentObject(blocks[f], sectionID).ChildDimension.Height);
      for (let i = 0; i < blocks[f].Position$id.length; i++) {
        belowPos.push(this.sharedService.getObject(blocks[f].Position$id[i], sectionID));
      }
    }
    let belowTallPos = _.maxBy(belowPos, (obj) => {
      return obj.Position.ProductPackage.Height;
    });
    let cB = blocks[currentIndex];
    let cPos = [];
    for (let i = 0; i < cB.Position$id.length; i++) {
      cPos.push(this.sharedService.getObject(cB.Position$id[i], sectionID));
    }
    let aboveB = blocks[currentIndex + 1];
    if (aboveB) {
      let abovePos = [];
      for (let j = 0; j < aboveB.Position$id.length; j++) {
        abovePos.push(this.sharedService.getObject(aboveB.Position$id[j], sectionID));
      }
      let aboveTallPos = _.maxBy(abovePos, (obj) => {
        return obj.Position.ProductPackage.Height;
      });
      if (
        aboveTallPos.Position.ProductPackage.Height <= Math.min.apply(null, fixtureH) &&
        belowTallPos.Position.ProductPackage.Height <=
        this.sharedService.getParentObject(aboveB, sectionID).ChildDimension.Height
      ) {
        newBlockArr.push(aboveB);
        return this.compareAndgetBlock(blocks, newBlockArr, currentIndex + 1, startIndex, ctr);
      } else {
        for (let blk in newBlockArr) {
          if (newBlockArr.hasOwnProperty(blk)) {
            for (let j = 0; j < newBlockArr[blk].Position$id.length; j++) {
              let pos = this.sharedService.getObject(newBlockArr[blk].Position$id[j], sectionID);
              pos.Position.IdBlock = ctr;
              pos.Position.blockType = 'ReBlock';
            }
            this.reBlockInput[ctr] = {
              name: blocks[currentIndex].attributeValue,
              color: blocks[currentIndex]['BlockColor'],
            };
          }
        }
      }
      return currentIndex;
    } else {
      for (let blk in newBlockArr) {
        if (newBlockArr.hasOwnProperty(blk)) {
          for (let j = 0; j < newBlockArr[blk].Position$id.length; j++) {
            let pos = this.sharedService.getObject(newBlockArr[blk].Position$id[j], sectionID);
            pos.Position.IdBlock = ctr;
            pos.Position.blockType = 'ReBlock';
          }
          this.reBlockInput[ctr] = {
            name: blocks[currentIndex].attributeValue,
            color: blocks[currentIndex]['BlockColor'],
          };
        }
      }
      return currentIndex;
    }
  }

  public reBlockPog(pogObj: Section): void {
    this.reBlockInput = [];
    let sIndex;
    let Blocks = this.getAllBlocks(pogObj);
    let manBlkId = this.manBlkId;
    Blocks = _.filter(Blocks, (obj) => {
      return obj.IdBlock == manBlkId;
    });
    let ctr = this.lastReCtr;
    let sectionID = this.currentSectionId;
    let grouped = Blocks.reduce((r, a) => {
      r[a.attributeValue] = r[a.attributeValue] || [];
      r[a.attributeValue].push(a);
      return r;
    }, Object.create(null));

    for (let key in grouped) {
      let b = _.sortBy(grouped[key], (o) => {
        return o.Fixture.FixtureNumber;
      });
      for (let i = 0; i < b.length; i++) {
        let currentB = b[i];
        let currPos = [];
        for (let j = 0; j < currentB.Position$id.length; j++) {
          currPos.push(this.sharedService.getObject(currentB.Position$id[j], sectionID));
        }
        let currTallPos = _.maxBy(currPos, (obj) => {
          return obj.Position.ProductPackage.Height;
        });
        let newBlockArr = [];
        newBlockArr.push(currentB);
        if (i != b.length - 1) {
          let aboveB = b[i + 1];
          let abovePos = [];
          for (let j = 0; j < aboveB.Position$id.length; j++) {
            abovePos.push(this.sharedService.getObject(aboveB.Position$id[j], sectionID));
          }
          let aboveTallPos = _.maxBy(abovePos, (obj) => {
            return obj.Position.ProductPackage.Height;
          });
          if (
            currTallPos.Position.ProductPackage.Height >=
            this.sharedService.getParentObject(aboveB, sectionID).ChildDimension.Height ||
            aboveTallPos.Position.ProductPackage.Height >=
            this.sharedService.getParentObject(currentB, sectionID).ChildDimension.Height
          ) {
            ctr++;
            for (let blk in newBlockArr) {
              if (newBlockArr.hasOwnProperty(blk)) {
                for (let j = 0; j < newBlockArr[blk].Position$id.length; j++) {
                  let pos = this.sharedService.getObject(newBlockArr[blk].Position$id[j], sectionID);
                  pos.Position.IdBlock = ctr;
                  pos.Position.blockType = 'ReBlock';
                }
                this.reBlockInput[ctr] = { name: b[i].attributeValue, color: b[i]['BlockColor'] };
              }
            }
          } else {
            ctr++;
            sIndex = i;
            i = this.compareAndgetBlock(b, newBlockArr, i, i, ctr);
          }
        } else {
          let fixtureBH = [];
          let belowPos = [];
          for (let f = sIndex; f <= i - 1; f++) {
            fixtureBH.push(this.sharedService.getParentObject(b[f], sectionID).ChildDimension.Height);
            for (let c = 0; c < b[f].Position$id.length; c++) {
              belowPos.push(this.sharedService.getObject(b[f].Position$id[c], sectionID));
            }
          }
          let belowTallPos = _.maxBy(belowPos, (obj) => {
            return obj.Position.ProductPackage.Height;
          });

          if (
            fixtureBH.length > 0 &&
            currTallPos.Position.ProductPackage.Height <= Math.min.apply(null, fixtureBH) &&
            belowTallPos.Position.ProductPackage.Height <=
            this.sharedService.getParentObject(currentB, sectionID).ChildDimension.Height
          ) {
          } else {
            ctr++;
            for (let j = 0; j < currentB.Position$id.length; j++) {
              let pos = this.sharedService.getObject(currentB.Position$id[j], sectionID);
              pos.Position.IdBlock = ctr;
              pos.Position.blockType = 'ReBlock';
            }
            this.reBlockInput[ctr] = { name: currentB.attributeValue, color: currentB['BlockColor'] };
          }
        }
      }
    }
    this.lastReCtr = ctr;

    let inputObj = {
      attr1: 'IdBlock',
      sectionId: sectionID,
      isAutoBlocks: true,
      objId: sectionID,
    };

    this.isRefresh = true;
    let rootObj = <Section>this.sharedService.getObject(sectionID, sectionID);
    this.prepareBlockInputs(this.getAllBlocks(rootObj));
    this.prepareBlockData(inputObj);
  }

  public setRuleSetAttributes(data): void {
    this.ruleAttributes = data ? data.rulesets.attributes : {};
  }

  private getRandomColor(inputString) {
    if (isNaN(inputString)) {
      inputString = this.getHashCode(inputString.toUpperCase()).toString();
    } else {
      return 'grey';
    }
    let count = inputString.length;
    for (let i = 0; i < 8 - count; i++) {
      inputString += String.fromCharCode('A'.charCodeAt(0) + inputString[i].charCodeAt(0));
    }
    let listOfChar = inputString;
    let assciSeries = '';
    let value = 0;
    for (let i = 1; i <= listOfChar.length; i++) {
      assciSeries += this.getHashCode(listOfChar[i - 1]); //.GetHashCode();
      if (i % 3 == 0) {
        assciSeries += ',';
      }
    }
    let data = assciSeries.split(',');
    for (let i = 0; i < data.length; i++) {
      if (data[i] != '') value = value + this.getHashCode(data[i].toString());
    }
    let hexColorCode = value.toString(16);
    while (hexColorCode.length > 6) {
      let splits = Math.floor(hexColorCode.length / 6);
      let list = hexColorCode.match(/.{1,6}/g);
      if (hexColorCode.length - splits * 6 != 0) value = 0;
      for (let i = 0; i < list.length; i++) {
        if (list[i] != '') value = value + parseInt(list[i], 16);
      }
      hexColorCode = value.toString(16);
    }
    let charArray = hexColorCode;
    let blkclr = '#' + charArray;
    return blkclr;
  }

  private getHashCode(str) {
    let hash = 0;
    if (str.length == 0) return hash;
    for (let i = 0; i < str.length; i++) {
      let char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
  }

  private getNewColor() {
    let blockPalette = COLOR_PALETTE;
    let colorArr = this.savedColors;
    for (let key in colorArr) {
      if (blockPalette.indexOf(colorArr[key].color) > -1) {
        blockPalette.splice(blockPalette.indexOf(colorArr[key].color), 1);
      }
    }
    return blockPalette[0];
  }

  private getPrevPosInFixture(idx, posArr) {
    let prevIdx = idx - 1;
    let pos = posArr[prevIdx];
    if (prevIdx < 0 || (prevIdx == 0 && pos.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT)) {
      return undefined;
    } else if (pos && pos.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT) {
      return this.getPrevPosInFixture(prevIdx, posArr);
    }
    return pos;
  }

  // values can of all data types.
  private getDetailsFromPosition(pos: Position): { [key: string]: any } {
    // shallow copy should suffice
    let newObj = {
      $idParent: pos.$idParent,
      $sectionID: pos.$sectionID,
      ChildDimension: Object.assign({}, pos.ChildDimension),
      ChildOffset: Object.assign({}, pos.ChildOffset),
      Children: pos.Children,
      Dimension: Object.assign({}, pos.Dimension),
      Fixture: Object.assign({}, pos.Fixture),
      IDPOGObjectParent: pos.IDPOGObjectParent,
      Location: Object.assign({}, pos.Location),
      selected: pos.selected,
      spreadSpanPosNo: pos.spreadSpanPosNo,
      spredSpanPositionProperties: Object.assign({}, pos.spredSpanPositionProperties),
      IdBlock: pos.Position.IdBlock,
    };
    return newObj;
  }

  private addBlockProperties(blockObj, w, h, stroke, totalpos, order, attr, attrval, type) {
    blockObj.ObjectDerivedType = AppConstantSpace.BLOCKOBJECT;
    blockObj.ObjectType = AppConstantSpace.BLOCKOBJECT;
    blockObj.type = AppConstantSpace.BLOCKOBJECT;
    blockObj.blockType = type ? type : 'Auto';
    blockObj.Block = {};
    blockObj.adjucentBlocks = [];
    blockObj.StrokeWidth = stroke;
    blockObj.Dimension.Height = h;
    blockObj.Dimension.Width = w;
    blockObj.noItems = totalpos;
    blockObj.Order = order;
    blockObj.attribute = attr;
    blockObj.attributeValue = attrval;
    blockObj.attributeValueFixture =
      'F' + blockObj.Fixture.FixtureNumber + '_Block' + blockObj.Fixture.ModularNumber;
    blockObj.dragDropSettings = {};
    blockObj.dragDropSettings.drag = false;
  }

  public prepareBlockInputs(blocksData, sectionID = this.currentSectionId): void {
    let colors = this.savedColors;
    let blockAttr;
    let oldBlockArray = {};
    if (this.isRefresh) {
      blockAttr = 'IdBlock';
    } else {
      blockAttr = 'BlockName';
    }
    let fixtureIds = this.prepareFixtureIds(sectionID);
    blocksData.forEach((obj) => {
      //old allocate backend blocks have fixture type in number, hence checking for both num & string
      if (
        (this.ruleAttributes.Value == 'FixtureNumber' && obj.blockType == 'Auto') ||
        (obj.FixtureType != AppConstantSpace.STANDARDSHELFOBJ &&
          obj.FixtureType != AppConstantSpace.STANDARDSHELFOBJECTMODEL)
      ) {
        if (fixtureIds[obj.BlockName]) {
          oldBlockArray[obj.IdBlock] = obj.IdBlock = fixtureIds[obj.BlockName];
        }
      } else {
        oldBlockArray[obj.IdBlock] = obj.IdBlock;
      }
      colors[obj[blockAttr]] = {};
      colors[obj[blockAttr]].color = obj['BlockColor'];
      colors[obj[blockAttr]].name = obj.BlockName ? obj.BlockName : obj.attributeValue;
      colors[obj[blockAttr]].type = obj.blockType;
    });
    colors['un assigned'] = {};
    colors['un assigned'].color = 'lightgrey';
    colors['un assigned'].type = 'S';
    colors['un assigned'].childBlocks = {};
    colors['un assigned'].childBlocks['un assigned'] = 'lightgrey';
    this.savedColors = colors;
    if (this.manualDeleteMode == true) {
      delete this.savedColors[this.manualBlockId];
      this.manualDeleteMode = false;
    }
  }

  private prepareFixtureIds(sectionID) {
    let pog = this.sharedService.getObject(sectionID, sectionID) as Section;
    let fixtures = pog.getAllFixChildren();
    let fixtureIds = {};
    fixtures.forEach((e) => {
      if (e.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
        fixtureIds[e.ObjectDerivedType + '_' + e.Fixture.FixtureNumber] = e.$id;
      } else {
        fixtureIds['F' + e.Fixture.FixtureNumber + '_Block' + e.Fixture.ModularNumber] = e.$id;
      }
    });
    return fixtureIds;
  }

  public clearBlocks(sectionID: string, resetExisiting?: boolean): void {
    const pogObj = this.sharedService.getObject(sectionID, sectionID);
    let deleteItems = (child) => {
      for (let b = child.Children.length - 1; b >= 0; b--) {
        if (child.Children[b].ObjectDerivedType === AppConstantSpace.BLOCKOBJECT) {
          child.Children.splice(b, 1);
        } else if (resetExisiting && child.Children[b].ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
          child.Children[b].Position.IdBlock = null;
          child.Children[b].Position.blockType = undefined;
        }
      }
    };

    let eachRecursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        obj.Children.forEach((child) => {
          if (
            child.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ ||
            child.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
            child.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
            child.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
            child.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
            child.ObjectDerivedType == AppConstantSpace.BASKETOBJ
          ) {
            deleteItems(child);
          }
          eachRecursive(child);
        });
      }
    };
    pogObj.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ ? deleteItems(pogObj) : eachRecursive(pogObj);
  }

  private prepareNonStandardFixtureData(obj, attr) {
    let positionsArr = [];
    let unassingedArr = [];
    let allPositions = obj.Children;
    let attrGroup = {};

    allPositions.forEach((pos, index) => {
      if (pos.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        //always update non std fix with its parent id
        pos.Position.IdBlock = pos.$idParent;

        let posVal = this.getAttrVal(pos, attr);
        if (posVal == '' || posVal == null || posVal == undefined) {
          unassingedArr.push(pos);
        } else {
          if (!attrGroup[posVal]) {
            attrGroup[posVal] = [];
          }
          attrGroup[posVal].push(pos);

        }

        if (allPositions.length - 1 == index) {
          for (pos in attrGroup) {
            positionsArr.push(attrGroup[pos]);
          }
          if (unassingedArr.length > 0) {
            positionsArr.push(unassingedArr);
            unassingedArr = [];
          }
        }
      }
    });
    return positionsArr;
  }

  private getAttrVal(pos: Position, attr: string): string {
    let val;
    if (pos) {
      if (attr == 'IdBlock') {
        val = pos.Position[attr];
      } else if (attr == 'FixtureNumber') {
        val = pos['ParentKey'];
      } else {
        val = pos.Position.Product[attr];
      }
    }
    return val ? val.toString() : val;
  }

  private filterStandardShelfPositions(child, attr) {
    let blockPositions = [];
    let md;
    let arr = [];
    let unassingedArr = [];
    let allPositions = [];
    child.Children.forEach((child, index) => {
      if (child.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        allPositions.push(child);
      }
    });
    let t = this.ruleAttributes.Value ? this.ruleAttributes.Value.split('>') : 'IdBlock';
    if (child.isSpreadShelf) {
      allPositions = child.getAllSpreadSpanPositions();
    }

    allPositions.forEach((pos, index) => {
      if (pos.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        if (pos.Position.IdBlock === this.manualBlockId) {
          attr = t ? t[0].replace(/ /g, '') : 'IdBlock';
          md = true;
        } else {
          if (this.isRefresh) {
            // item was fixture blocked, but pog is not fixture blocked, then item to be unblocked on movement.
            if (
              pos.Position.IdBlock &&
              pos.Position.IdBlock.toString().length > 5 &&
              this.ruleAttributes.Value != 'FixtureNumber' &&
              (pos.Position.IdBlock != pos.$idParent)
            ) {
              pos.Position.IdBlock = null;
            }
            //check if item was not blocked,but pog is blocked by fixture. check if the item was blocked by fixture
            else if (
              (!pos.Position.IdBlock && this.ruleAttributes.Value == 'FixtureNumber') ||
              (pos.Position.IdBlock && pos.Position.IdBlock.toString().length > 5)
            ) {
              pos.Position.IdBlock = pos.$idParent;
            }
            attr = 'IdBlock';
          } else {
            attr = t ? t[0].replace(/ /g, '') : 'IdBlock';
          }
        }
        let posAttrVal = this.getAttrVal(pos, attr);
        let prevPos = this.getPrevPosInFixture(index, allPositions); //allPositions[index - 1];
        let prevPosAttrVal = this.getAttrVal(prevPos, attr);
        //let x = 0;
        if (md == true) {
          if (posAttrVal == '' || posAttrVal == null || posAttrVal == undefined) {
            unassingedArr.push(pos);
          } else {
            if (
              prevPos &&
              pos.Position.Product[t[0].replace(/ /g, '')] ==
              prevPos.Position.Product[t[0].replace(/ /g, '')]
            ) {
              arr.push(pos);
            } else if (prevPos && prevPosAttrVal == posAttrVal) {
              arr.push(pos);
            } else if (prevPos && prevPosAttrVal != posAttrVal) {
              if (arr.length > 0) {
                blockPositions.push(arr);
                arr = [];
              }
              arr.push(pos);
            } else {
              arr.push(pos);
            }
          }
        } else {
          if (posAttrVal == '' || posAttrVal == null || posAttrVal == undefined) {
            unassingedArr.push(pos);
          } else {
            if (prevPos && prevPosAttrVal == posAttrVal) {
              arr.push(pos);
            } else if (prevPos && prevPosAttrVal != posAttrVal) {
              if (arr.length > 0) {
                blockPositions.push(arr);
                arr = [];
              }
              arr.push(pos);
            } else {
              arr.push(pos);
            }
          }
        }
        if (allPositions.length - 1 == index) {
          if (arr.length > 0) {
            blockPositions.push(arr);
            arr = [];
          }
          if (unassingedArr.length > 0) {
            blockPositions.push(unassingedArr);
            unassingedArr = [];
          }
        }
      }
    });
    md = false;
    return blockPositions;
  }

  private calculateBlocks(innerArr, parentType, attr1, attr2, x, y, order?) {
    let yEndPos = 0,
      xEndPos = 0,
      h = 0,
      w = 0;
    let posDetails = [],
      postionIDArry = [],
      NewPositionIDsArry = [],
      postion$idArry = [],
      noItemIDArry = [],
      postionIDPogArry = [];
    let firstPos = innerArr[0];
    let sectionID = this.currentSectionId;
    let stShelf = this.sharedService.getObject(firstPos.$idParent, sectionID) as Modular;
    for (let j = 0; j < innerArr.length; j++) {
      if (!this.isRefresh) {
        if (attr1 == 'FixtureNumber') {
          innerArr[j].Position.IdBlock = innerArr[j].$idParent;
        } else {
          innerArr[j].Position.IdBlock = this.blockCounter;
        }
      }

      if (innerArr[j].Position.IdBlock == this.manualBlockId) {
        innerArr[j].Position.IdBlock = this.resetBlockCtr;
      }
      let currPos = innerArr[j];
      //Added calculation of blocks width and height for fixture types other than standard shelf
      if (
        parentType === AppConstantSpace.PEGBOARDOBJ ||
        parentType == AppConstantSpace.CROSSBAROBJ ||
        parentType == AppConstantSpace.SLOTWALLOBJ ||
        parentType == AppConstantSpace.COFFINCASEOBJ ||
        parentType == AppConstantSpace.BASKETOBJ
      ) {
        x = x > currPos.Location.X ? currPos.Location.X : x;
        y = y > currPos.Location.Y ? currPos.Location.Y : y;

        if (yEndPos < currPos.Location.Y + currPos.Dimension.Height) {
          yEndPos = currPos.Location.Y + currPos.Dimension.Height;
        }
        if (xEndPos < currPos.Location.X + currPos.Dimension.Width) {
          xEndPos = currPos.Location.X + currPos.Dimension.Width;
        }
        w = xEndPos - x;
        h = yEndPos - y;
      } else {
        if (order != 'nested') {
          h = stShelf.Dimension.Height - stShelf.getBottomThickness();
        } else {
          if (h < currPos.Dimension.Height) {
            h = currPos.Dimension.Height / 2;
          }
        }
        w =
          innerArr[innerArr.length - 1].getXPosToPog() +
          innerArr[innerArr.length - 1].Dimension.Width -
          innerArr[0].getXPosToPog();
      }

      let pObj: any = {};
      pObj.Images = {};

      pObj.Images = currPos.Position.ProductPackage.Images;
      pObj.ProductPackage = {};
      pObj.ProductPackage.width = currPos.Position.ProductPackage.Width;
      pObj.ProductPackage.height = currPos.Position.ProductPackage.Height;
      pObj.ProductPackage.depth = currPos.Position.ProductPackage.Depth;
      pObj.FacingsX = currPos.Position.FacingsX;
      pObj.FacingsY = currPos.Position.FacingsY;
      pObj.FacingsZ = currPos.Position.FacingsZ;
      pObj.xPos = currPos.Location.X; // - prevWidth;
      pObj.yPos = currPos.Location.Y; // - nestedY;
      pObj.CurrSales = currPos.Position.attributeObject.CurrSales;
      pObj.IdProduct = currPos.Position.Product.IDProduct;
      if (currPos.ParentKey != null) {
        postionIDArry.push(currPos.Key);
      }

      postion$idArry.push(currPos.$id);
      noItemIDArry.push(currPos.Position.Product.ProductKey);
      posDetails.push(pObj);
    }
    let retObj = {
      x: x,
      y: y,
      h: h,
      w: w,
      posDetails: posDetails,
      postionIDArry: postionIDArry,
      NewPositionIDsArry: NewPositionIDsArry,
      postion$idArry: postion$idArry,
      noItemIDArry: noItemIDArry,
      postionIDPogArry: postionIDPogArry,
    };
    return retObj;
  }

  public prepareBlockData(configObj): void {
    let sectionId = (this.sectionID = configObj.sectionId
      ? configObj.sectionId
      : this.sharedService.getActiveSectionId());
    let pogObj = this.sharedService.getObject(configObj.objId, sectionId) as Section;
    let rootType = pogObj.ObjectDerivedType;
    this.blockArrToUpdate = [];
    if (!pogObj) {
      return;
    }
    let counter = 0;
    this.blockCounter = 1;
    let reBlockNames = [];
    let parentAdjucentObj = {};
    parentAdjucentObj['un assigned'] = 'lightgrey';
    this.clearBlocks(configObj.objId);
    if (!this.isRefresh) {
      this.savedColors = {};
    }
    let eachRecursive = (obj) => {
      let blockPositions = [];
      let getAttrVal;
      let attr1;
      let attr2;
      let t = this.ruleAttributes.Value ? this.ruleAttributes.Value.split('>') : 'IdBlock';
      if (this.isRefresh) {
        attr1 = 'IdBlock';
        pogObj.IsSaveBlock = true;
      } else {
        attr1 = t ? t[0].replace(/ /g, '') : 'IdBlock';
        attr2 = t && t[1] ? t[1].replace(/ /g, '') : undefined;
      }

      let blockedby = this.ruleAttributes.Name ? this.ruleAttributes.Name : 'IdBlock';
      let blockType;
      let strokeWidth;
      let processBlocks = (child) => {
        // maintaining old params to prevent data mismatch of this inner function being called async with outer loop.
        let old_attr1 = attr1,
          old_attr2 = attr2,
          old_isRefresh = this.isRefresh;
        if (
          configObj.onlyNonStdFixtures &&
          !this.isRefresh &&
          child.ObjectDerivedType == AppConstantSpace.STANDARDSHELFOBJ
        ) {
          return;
        }
        if (child.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ) {
          blockPositions = child.isSpreadShelf
            ? child.spreadSpanProperties.isLeftMostShelf
              ? this.filterStandardShelfPositions(child, attr1)
              : []
            : this.filterStandardShelfPositions(child, attr1);
        }

        //Getting the positions to block for all other fixture types other than standard shelf
        else if (child.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
          // non-std fixtures always to be single blocked by fixture. Hence over-riding these params to always block non-std fix.
          attr1 = 'FixtureNumber';
          attr2 = undefined;
          if (configObj.onlyNonStdFixtures == true) this.isRefresh = false;
          blockPositions = this.prepareNonStandardFixtureData(child, attr1);
        }

        for (let i = 0; i < blockPositions.length; i++) {
          for (let j = 0; j < blockPositions[i].length; j++) {
            if (!this.isRefresh && attr2 == undefined) {
              blockPositions[i][j].Position.NestedBlockId = null;
            }
          }
          let innerArr = blockPositions[i];
          let firstPos = innerArr[0], dimObj;
          let x = firstPos.Location.X,
            y = firstPos.Location.Y;

          dimObj = this.calculateBlocks(innerArr, child.ObjectDerivedType, attr1, attr2, x, y);

          let newBlock = this.getDetailsFromPosition(firstPos);
          newBlock.Location.X = dimObj.x;
          if (!this.isRefresh) {
            if (attr1 == 'FixtureNumber') {
              newBlock.IdBlock = blockPositions[i][0].$idParent;
            } else {
              newBlock.IdBlock = this.blockCounter++;
            }
          }
          if (child.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ) {
            newBlock.Location.Y = dimObj.y;
          }
          if (
            firstPos.Position.blockType == 'Manual' &&
            this.savedColors[newBlock.IdBlock] == undefined &&
            this.isRefresh &&
            !this.manualDeleteMode
          ) {
            getAttrVal = this.manualBlockObj.BlockName;
            blockType = 'Manual';
          } else if (firstPos.Position.blockType == 'ReBlock' && this.isRefresh) {
            if (this.isRefresh && this.savedColors[newBlock.IdBlock]) {
              getAttrVal = this.savedColors[newBlock.IdBlock].name
                ? this.savedColors[newBlock.IdBlock].name
                : this.getAttrVal(firstPos, attr1);
            } else {
              if (reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']] == undefined) {
                reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']] = 1;
              }
              getAttrVal =
                this.reBlockInput[newBlock.IdBlock]['name'] +
                '-' +
                reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']];
              reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']] =
                reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']] + 1;
              this.savedColors[newBlock.IdBlock] = {};
              this.savedColors[newBlock.IdBlock].name = getAttrVal;
              this.savedColors[newBlock.IdBlock].color = this.getNewColor();
              //this.nestedRandomColor(this.manualBlockObj['BlockColor'], (reBlockNames[this.reBlockInput[newBlock.IdBlock]['name']] + 1) * 10);
            }
            blockType = 'Manual';
            for (let inc = 0; inc < innerArr.length; inc++) {
              innerArr[inc].Position.blockType = 'Manual';
            }
          } else {
            if (this.isRefresh && this.savedColors[newBlock.IdBlock]) {
              getAttrVal = this.savedColors[newBlock.IdBlock].name
                ? this.savedColors[newBlock.IdBlock].name
                : this.getAttrVal(firstPos, attr1);
            } else {
              getAttrVal = this.getAttrVal(firstPos, attr1);
            }
            blockType = this.savedColors[newBlock.IdBlock]
              ? this.savedColors[newBlock.IdBlock].type
              : 'Auto';
            //blockType = "Auto";
          }
          if (
            firstPos.Position.blockType == 'Manual' &&
            this.savedColors[newBlock.IdBlock] == undefined &&
            this.isRefresh &&
            !this.manualDeleteMode
          ) {
            strokeWidth = this.manualBlockObj.StrokeWidth;
          } else {
            strokeWidth = '0.5';
          }

          this.addBlockProperties(
            newBlock,
            dimObj.w,
            dimObj.h,
            strokeWidth,
            innerArr.length,
            AppConstantSpace.BLOCKORDERPARENT,
            child.ObjectDerivedType != AppConstantSpace.STANDARDSHELFOBJ ? 'Fixture' : blockedby,
            getAttrVal,
            blockType,
          );
          counter++;
          if (
            newBlock['attributeValue'] == '' ||
            newBlock['attributeValue'] == null ||
            newBlock['attributeValue'] == undefined
          ) {
            newBlock['attributeValue'] = 'un assigned';
            newBlock['BlockColor'] = 'lightgrey';
            newBlock['blockType'] = 'S';
          }
          if (
            firstPos.Position.blockType == 'Manual' &&
            this.savedColors[newBlock.IdBlock] == undefined &&
            this.isRefresh &&
            !this.manualDeleteMode
          ) {
            newBlock['BlockColor'] = this.manualBlockObj['BlockColor'];
          }
          else if (configObj.isAutoBlocks && this.savedColors[newBlock.IdBlock]) {
            newBlock['BlockColor'] = this.savedColors[newBlock.IdBlock].color;
          } else {
            if (parentAdjucentObj[newBlock['attributeValue']] == undefined) {
              //newBlock['BlockColor'] = this.getRandomColor(newBlock['attributeValue']);
              newBlock['BlockColor'] = '#fff';
              this.blockArrToUpdate.push(newBlock['attributeValue']);
              parentAdjucentObj[newBlock['attributeValue']] = newBlock['BlockColor'];
            } else {
              --counter;
              newBlock['BlockColor'] = parentAdjucentObj[newBlock['attributeValue']];
            }
          }
          newBlock.ChildDimension.Width = dimObj.w;
          newBlock.ChildDimension.Height = dimObj.h;
          //newBlock.ChildOffset.X = 0;
          //newBlock.ChildOffset.Y = 0;
          newBlock['blockNumber'] = pogObj.LKTraffic === 1 ? i + 1 : blockPositions.length - i;
          newBlock['parentShelfType'] = child.ObjectDerivedType;
          newBlock['Positions'] = dimObj.posDetails;
          if (dimObj.postionIDArry.length > 0) {
            newBlock['PositionIDs'] = dimObj.postionIDArry;
          } else {
            newBlock['NewPositionIDs'] = dimObj.NewPositionIDsArry;
          }
          newBlock['Position$id'] = dimObj.postion$idArry;
          newBlock['noItemIDs'] = dimObj.noItemIDArry;
          newBlock.selected = false;
          this.manualDeleteMode = false;
          this.planogramCommonService.extend(newBlock, true, newBlock.$sectionID);
          if (newBlock.IdBlock != null && newBlock['attributeValue'] != 'un assigned') {
            if (child.isSpreadShelf) {
              this.sharedService
                .getParentObject(firstPos, this.currentSectionId)
                .Children.push(newBlock);
            } else {
              child.Children.push(newBlock);
            }
          }
          if (i == blockPositions.length - 1) {
            //child.computeBlocksAfterChange();
          }
        }
        // reverting attributes if changed by fixture type
        attr1 = old_attr1;
        attr2 = old_attr2;
        this.isRefresh = old_isRefresh;
      };

      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        if (rootType != AppConstantSpace.SECTIONOBJ) {
          processBlocks(obj);
        } else {
          obj.Children.forEach((child) => {
            if (
              child.ObjectDerivedType === AppConstantSpace.STANDARDSHELFOBJ ||
              child.ObjectDerivedType === AppConstantSpace.PEGBOARDOBJ ||
              child.ObjectDerivedType == AppConstantSpace.CROSSBAROBJ ||
              child.ObjectDerivedType == AppConstantSpace.SLOTWALLOBJ ||
              child.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ ||
              child.ObjectDerivedType == AppConstantSpace.BASKETOBJ
            ) {
              processBlocks(child);
            }
            if (
              child.ObjectDerivedType != AppConstantSpace.POSITIONOBJECT &&
              child.ObjectDerivedType != AppConstantSpace.BLOCKOBJECT
            )
              eachRecursive(child);
          }, obj);
        }
      }
    };

    eachRecursive(pogObj);
    pogObj.IsSaveBlock = true;
    pogObj.RuleSetId = this.ruleAttributes.IdRuleSet;
    this.findAdjucentBlocks('Parent');
    window.parent.isRefresh = this.isRefresh;
    // if new blocks are added, update colors excluding first time pog load.
    if (
      !this.isRefresh ||
      this.blockArrToUpdate.length
    ) {
      let blockNames = [];
      // filter data without the attribute value
      this.blockArrToUpdate = this.blockArrToUpdate.filter((e) => {
        return typeof e == 'string';
      });
      this.blockArrToUpdate = Array.from(
        new Set(
          this.blockArrToUpdate.map((s) => {
            return s.toLowerCase().trim();
          }),
        ),
      );
      this.blockArrToUpdate.forEach((el) => {
        blockNames.push(el);
      });
      this.setBlockColor(blockNames, configObj.onlyNonStdFixtures != true);
    } else {
      if (window.parent.currentScreen == 'layouts') {
        window.parent.updataBlockData();
      }
    }
    this.sectionID = null;
  }

  private findAdjucentBlocks(order) {
    let sectionID = this.currentSectionId;
    let pogObj = this.sharedService.getObject(sectionID, sectionID) as Section;
    let blocks = this.getAllBlocks(pogObj);
    let sectionId = pogObj.$sectionID;

    blocks.sort((a, b) => {
      if (a.attributeValue < b.attributeValue) return -1;
      else if (a.attributeValue > b.attributeValue) return 1;
      else return 0;
    });

    let addadjucents = (tArr) => {
      for (let k = 0; k < tArr.length; k++) {
        let obj = this.sharedService.getObject(tArr[k], sectionId) as Section;
        for (let l = 0; l < tArr.length; l++) {
          if (obj.$id == tArr[l]) continue;
          obj.adjucentBlocks.push(tArr[l]);
        }
      }
    };

    let filterAdjucents = (blocks) => {
      let tArr = [],
        prev;
      for (let i = 0; i < blocks.length; i++) {
        if (blocks[i].Children.length > 0) {
          filterAdjucents(blocks[i].Children);
        }
        prev = blocks[i - 1];
        if (prev && blocks[i].attributeValue == prev.attributeValue && blocks[i].Order == prev.Order) {
          tArr.push(blocks[i].$id);
        } else if (prev && blocks[i].attributeValue != prev.attributeValue) {
          if (tArr.length > 1) {
            addadjucents(tArr);
          }
          tArr = [];
          tArr.push(blocks[i].$id);
        } else {
          tArr.push(blocks[i].$id);
        }
        if (i == blocks.length - 1) {
          if (tArr.length > 1) {
            addadjucents(tArr);
          }
          tArr = [];
        }
      }
    };

    filterAdjucents(blocks);
  }

  private prepareHighlightData() {
    let sectionId = this.currentSectionId;
    if (sectionId != '') {
      let rootObj = <Section>this.sharedService.getObject(sectionId, sectionId);
      let blocks = this.getAllBlocks(rootObj);
      let highlightData = {};
      for (let i = 0; i < blocks.length; i++) {
        if (highlightData[blocks[i].attributeValue] == undefined) {
          highlightData[blocks[i].attributeValue] = blocks[i];
        } else {
          Array.prototype.push.apply(highlightData[blocks[i].attributeValue].Children, blocks[i].Children);
          let list = highlightData[blocks[i].attributeValue].Children;
          let uniqueList = _.uniqBy(list, (item, key, attributeValue) => {
            return item.attributeValue;
          });
          highlightData[blocks[i].attributeValue].Children = uniqueList;
          return highlightData;
        }
      }
    }
  }

  public autoBlockNonStandardFixtures(): void {
    let id = this.currentSectionId;
    const rule: BlockRuleAttributesConfig = {
      IdRuleSet: -1,
      IsSelecetd: false,
      Name: 'Fixture',
      OrderId: 0,
      Value: 'FixtureNumber',
    };
    const config: BlockConfig = {
      attr1: 'FixtureNumber',
      sectionId: id,
      isAutoBlocks: true,
      objId: id,
      onlyNonStdFixtures: true,
    };
    this.isRefresh = false;
    this.ruleAttributes = rule;
    this.prepareBlockData(config);
  }

  private updateSavedColor(blocks) {
    let colors = {};
    blocks.forEach((e) => {
      colors[e.IdBlock] = {};
      colors[e.IdBlock].color = e.BlockColor;
      colors[e.IdBlock].name = e.BlockName ? e.BlockName : e.attributeValue;
      colors[e.IdBlock].type = e.blockType;
    });
    _.extend(this.savedColors, colors);
  }

  private updateItemBlockDetails(blocks, sectionID) {
    let positions = this.sharedService.getAllPositionFromObjectList(sectionID);
    blocks.forEach((x) => {
      positions.forEach((y) => {
        if (x.productKeys.includes(y.Position.Product.ProductKey.toString())) {
          y.Position.IdBlock = x.IdBlock;
        }
      });
    });
  }

  public processPogBlocks(pog: Section): void {
    //delete old blocks
    let recursive = (obj) => {
      if (obj.hasOwnProperty('Children') && obj.ObjectDerivedType != AppConstantSpace.SHOPPINGCARTOBJ) {
        obj.Children = obj.Children.filter((e) => {
          return e.ObjectDerivedType != AppConstantSpace.BLOCKOBJECT;
        });
        obj.Children.forEach((child) => {
          recursive(child);
        });
      }
    };
    recursive(pog);

    // process api blocks
    let count = 3;
    let blocks = [];
    pog.Blocks.forEach((e) => {
      let t: any = {};
      t.IdBlock = t.NestedBlockId = count++;
      t.BlockName = e.blockKey;
      t.Children = [];
      t.FixtureType = e.fixtureType;
      t.blockType = e.type;
      t.IdPog = pog.IDPOG;
      t.IDRuleSet = -1;
      t.BlockColor = e.color;
      t.productKeys = e.productKeys.split('|');
      blocks.push(t);
    });
    pog.Blocks = blocks;
    if (pog.Blocks.length > 0) {
      this.isRefresh = true;
      let configObj = {
        attr1: 'IdBlock',
        sectionId: pog.$id,
        isAutoBlocks: true,
        objId: pog.$id,
      };
      this.ruleAttributes = this.getSavedBlockAttr(pog.RuleSetId);
      this.prepareBlockInputs(pog.Blocks, pog.$id);
      this.updateItemBlockDetails(pog.Blocks, pog.$id);
      this.prepareBlockData(configObj);
      this.quadTreeUtils.createQuadTree(pog.$id);
    } else {
      window.parent.updateBlocks = true;
    }
    if (window.parent.currentScreen == 'layouts') {
      window.parent.planogramdownloaded();
    }
  }

  private setBlockColor(blockNames, randomUpdate = true): void {
    let pog = <Section>this.sharedService.getObject(this.currentSectionId,this.currentSectionId);
    let blocksP = this.getAllBlocks(pog);
    const randomColors = {};
    const random_color_palette = UNIQUE_COLOR_PALETTE.sort(() => 0.5 - Math.random());
    for(let i=0;i<blockNames.length;i++) {
      if(i > random_color_palette.length) {
        randomColors[blockNames[i]] = this.getRandomColor(blockNames[i]);
      } else {
        randomColors[blockNames[i]] = random_color_palette[i];
      }
    }
    this.applyBlockColor(randomColors,blocksP,randomUpdate);
  }

  private applyBlockColor(blockColorsMap: BlockColors,blocks: Block[],randomUpdate: boolean): void {
    try {
      blockColorsMap = _.transform(blockColorsMap, (result, val, key) => {
        result[key.toLowerCase()] = val;
      });
      for (let j = 0; j < blocks.length; j++) {
        if (blockColorsMap[blocks[j].attributeValue.toLowerCase().trim()] != undefined) {
          blocks[j].BlockColor = blockColorsMap[blocks[j].attributeValue.toLowerCase().trim()];
        } else if (randomUpdate) {
          blocks[j].BlockColor = this.getRandomColor(
            blockColorsMap[
              blocks[j].attributeValue
                .toUpperCase()
                .substring(0, blocks[j].attributeValue.toUpperCase().indexOf('-'))
            ].replace(/ /g, ''),
          );
        }
      }
      this.quadTreeUtils.createQuadTree(this.currentSectionId);
      this.prepareHighlightData();
      this.updateSavedColor(blocks);
      this.planogramService.updateNestedStyleDirty = true;
      this.blocksUpdated.next(true); // if blocks are already created, update the color for that block.
      if (window.parent.currentScreen == 'layouts') {
        window.parent.updataBlockData();
      }
    } catch (e) {
      this.log.error(e);
    }
  }

  public createAutoBlocks(attr): void {
    let sectionID = this.currentSectionId;
    this.ruleAttributes = attr;
    this.isRefresh = false;
    let inputObj: any = {};
    inputObj.attr = attr.Value;
    inputObj.sectionId = sectionID;
    inputObj.isAutoBlocks = true;
    inputObj.objId = sectionID;
    //var rootObj = this.sharedService.getObject(sectionID, sectionID);
    //blockHelper.prepareBlockInputs(d.Data.PogBlocks);
    this.prepareBlockData(inputObj);
    this.quadTreeUtils.createQuadTree(sectionID);
    this.planogramService.rootFlags[sectionID].isSaveDirtyFlag = true;
    this.planogramService.updateSaveDirtyFlag(true);
  }


  public selectBlocks(blockAttributeValue: string): void {
    const sectionID = this.currentSectionId;
    const pog = this.sharedService.getObject(sectionID, sectionID);
    this.planogramService.removeAllSelection(sectionID);
    const blocks = this.getAllBlocks(pog as Section);
    blocks.forEach((block) => {
      if ((block.attribute == 'Fixture' && blockAttributeValue === block.attributeValueFixture && block.blockType === 'Auto') ||
        blockAttributeValue === block.attributeValue) {
        this.planogramService.addToSelectionByObject(block, sectionID);
      }
    });
    this.planogramService.updateNestedStyleDirty = true;;
  }

  //TODO @karthik optimize. Need to eliminate getALlBlocks
  public recalculateBlocks(sectionObj: Section): void {
    const blocks = this.getAllBlocks(sectionObj);
    if (blocks.length > 0) {
      this.isRefresh = true;
      let inputObj: BlockConfig = {
        attr1: 'IdBlock',
        isAutoBlocks: true,
        sectionId: sectionObj.$sectionID,
        objId: sectionObj.$sectionID,
      };
      this.prepareBlockInputs(this.getAllBlocks(sectionObj));
      this.prepareBlockData(inputObj);
      this.quadTreeUtils.createQuadTree(sectionObj.$sectionID);
    }
  }

  public updateCurrentBlockType(pog: Section): void {
    this.ruleAttributes = this.getSavedBlockAttr(pog.RuleSetId);
  }

  public changeBlock(idBlock: number | string, sectionId: string, positions: Position[]): void {
    const recordingID = this.historyService.startRecording();
    const oldBlockIds = {};
    positions.forEach((position) => {
      oldBlockIds[position.$id] = {};
      oldBlockIds[position.$id] = position.Position.IdBlock;
    })
    const original = ((idblock, positions) => {
      return () => {
        positions.forEach((position) => {
          position.Position.IdBlock = idblock;
        })
      }
    })(idBlock, positions);
    const revert = ((oldBlockIds, positions) => {
      return () => {
        positions.forEach((position) => {
          position.Position.IdBlock = oldBlockIds[position.Position.IdBlock];
        })
      }
    })(oldBlockIds, positions)
    this.historyService.captureActionExec({
      funoriginal: original,
      funRevert: revert,
      funName: 'ReassignBlock',
    });
    original();
    this.historyService.stopRecording(undefined, undefined, recordingID);
    this.recalculateBlocks(<Section>this.sharedService.getObject(sectionId, sectionId));
    this.planogramService.updateNestedStyleDirty = true;
  }
}
