import { ChangeDetectorRef, Component, Inject, Input, OnChanges, OnDestroy, OnInit, Optional, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Block, Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { COLOR_PALETTE } from 'src/app/shared/constants/colorPalette';
import { NotifyService, PlanogramService, SharedService } from '../../../common';
import { BlockHelperService } from '../block-helper.service';
import { PaBroadcasterService } from '../pa-broadcaster.service';
declare const window: any;

@Component({
  selector: 'app-block-editor',
  templateUrl: './block-editor.component.html',
  styleUrls: ['./block-editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class BlockEditorComponent implements OnInit, OnChanges, OnDestroy {
  public paletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE
  };
  public gradientSettings = {
    opacity: false
  };
  public selectedColor: string = '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0');
  public blockName: string = "";
  public borderSize: string = "0.5";
  public isManualBlock: boolean = false;
  public itemsCount: number;
  public blockCreation: boolean = false;
  private blockPositions: string[] = [];
  private block: Block;
  public blockNameUpdate = new Subject<string>();
  public invalidBlockName: boolean = false;
  public oldBlockName: string = "";
  @Input() private blockData: Block;
  @Input() public isPropertyPane: boolean = false;
  // all block names except the current block
  private allBlockNames: string[];
  private _subscriptions = new Subscription();
  constructor(@Optional() @Inject(MAT_DIALOG_DATA) public data: any,
    @Optional() private readonly dialogRef: MatDialogRef<BlockEditorComponent>,
    private readonly ref: ChangeDetectorRef,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly paBroadcast: PaBroadcasterService,
    private readonly notify: NotifyService,
    private readonly blockHelperService: BlockHelperService) { }

  ngOnInit(): void {
    this.setupEvents();
    this.setupData();
    setTimeout(() => {
      this.ref.detectChanges();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.blockData) {
      this.setupData();
    }
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

  private setupEvents(): void {
    //add debouncer to block name input
    this._subscriptions.add(this.blockNameUpdate.pipe(
      debounceTime(2000),
      distinctUntilChanged())
      .subscribe(value => {
        this.updateBlock();
      }));
    // remove existsing colors from color palette
    const colorArr = this.blockHelperService.savedColors;
    for (const key in colorArr) {
      if (this.paletteSettings.palette.indexOf(colorArr[key].color) > -1) {
        this.paletteSettings.palette.splice(this.paletteSettings.palette.indexOf(colorArr[key].color), 1);
      }
    }
  }

  private setupData(): void {
    this.blockPositions = [];
    if (this.blockData) {
      this.data = {};
      this.data.block = this.blockData;
    }
    this.blockCreation = this.data.manualBlock;
    const sectionID = this.sharedService.getActiveSectionId();
    const pog = <Section>this.sharedService.getObject(sectionID, sectionID);
    this.allBlockNames = this.blockHelperService.getAllBlocks(pog).map(block => {
      if (block.attribute === 'Fixture' && block.blockType !== 'Manual') {
        return block.attributeValueFixture;
      } else {
        return block.attributeValue;
      }
    });
    if (!this.blockCreation) {
      this.block = this.data.block;
      this.isManualBlock = this.data.block.blockType === 'Manual';
      if (this.block.attribute === 'Fixture' && !this.isManualBlock) {
        this.blockName = this.block.attributeValueFixture;
      }
      else {
        this.blockName = this.block.attributeValue;
      }
      this.oldBlockName = this.blockName;
      // remove current block name from the list.
      this.allBlockNames = this.allBlockNames.filter(block => block != this.blockName);
      const blocks = this.getBlocks();
      blocks.forEach((block) => {
        if (this.block.attributeValue === block.attributeValue) {
          this.blockPositions.push(...block.Position$id)
        }
      })
      this.borderSize = this.block.StrokeWidth;
      this.selectedColor = this.block.BlockColor;
      this.itemsCount = this.blockPositions.length;
    }
  }
  public cancelBlock() {
    const sectionID = this.sharedService.getActiveSectionId();
    this.planogramService.removeAllSelection(sectionID);
    this.dialogRef?.close();
  }

  public onChangeColor(color) {
    this.selectedColor = color;
    this.updateBlock();
  }

  public updateBlock(closeDialog = false): void {
    if (this.isBlockNameValid) {
      this.oldBlockName = this.blockName;
      this.processBlockData(closeDialog);
      if (!this.blockCreation) {
        this.paBroadcast.updateBlockData();
        this.blockHelperService.blocksUpdated.next(true);
        this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
      }
    } else {
      this.blockName = this.oldBlockName;
    }
  }

  public processBlockData(closeDialog = false): void {
    if (!this.blockCreation) {
      // fixture blocks cannot have same block on multilple locations.
      if (this.block.attribute === 'Fixture' && this.block.blockType === "Auto") {
        this.block.attributeValueFixture = this.blockName;
      }
      else {
        const blocks = this.getBlocks();
        blocks.forEach((block) => {
          if (this.block.attributeValue === block.attributeValue) {
            block.attributeValue = this.blockName;
            block.StrokeWidth = this.borderSize;
            block.BlockColor = this.selectedColor;
          }
        })
        this.block.attributeValue = this.blockName;
      }
      this.block.StrokeWidth = this.borderSize;
      this.block.BlockColor = this.selectedColor;
    }
    if (closeDialog) {
      this.dialogRef?.close({
        BlockColor: this.selectedColor,
        BlockName: this.blockName,
        StrokeWidth: this.borderSize,
        delete: false
      })
    }

  }

  public deleteBlock(): void {
    const sectionID = this.sharedService.getActiveSectionId();
    const pog = <Section>this.sharedService.getObject(sectionID, sectionID);
    const positions = pog.getAllPositions();
    const blocks = this.blockHelperService.getAllBlocks(pog);
    // clear block details for position
    positions.forEach((position) => {
      if (this.blockPositions.includes(position.$id)) {
        position.Position.IdBlock = null;
        position.Position.blockType = null;
      }
    });
    // delete blocks with same attribute.
    blocks.forEach((block) => {
      if (this.block.attributeValue === block.attributeValue) {
        let ind = block.parent.Children.findIndex((pos) => { return pos.ObjectDerivedType === AppConstantSpace.BLOCKOBJECT });
        block.parent.Children.splice(ind, 1);
      }
    })
    this.blockHelperService.recalculateBlocks(pog);
    this.planogramService.removeAllSelection(sectionID);
    this.planogramService.addToSelectionById(sectionID, sectionID);
    this.paBroadcast.updateBlockData();
    this.planogramService.rootFlags[this.sharedService.getActiveSectionId()].isSaveDirtyFlag = true;
    this.dialogRef?.close();
  }

  // value can be of any data type. Type casting can be done once block types are established.
  private getBlocks(): { [key: string]: any }[] {
    const sectionID = this.sharedService.getActiveSectionId()
    const pog = this.sharedService.getObject(sectionID, sectionID) as Section;
    const blocks = this.blockHelperService.getAllBlocks(pog);
    return blocks;
  }

  private get isBlockNameValid(): boolean {
    if (this.allBlockNames.includes(this.blockName)) {
      this.notify.warn("BLOCK_NAME_SHOULD_BE_UNIQUE");
      return false;
    } else if(this.blockName.length < 1) {
      return false;
    }
    return true;
  }

}
