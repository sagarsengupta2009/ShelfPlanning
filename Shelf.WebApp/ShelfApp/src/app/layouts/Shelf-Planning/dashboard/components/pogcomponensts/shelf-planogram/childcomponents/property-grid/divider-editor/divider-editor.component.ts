import { Component, Inject, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { filter, uniq } from 'lodash-es';
import { AppConstantSpace } from 'src/app/shared/constants/appConstantSpace';
import { Basket, Coffincase, Section, StandardShelf } from 'src/app/shared/classes';
import { Divider, DividerGap, DividerResponse } from 'src/app/shared/models';
import { SeparatorEditorComponent } from '../separator-editor/separator-editor.component';
import { HistoryService, PlanogramService, SharedService, PlanogramHelperService, DividersCurdService, PlanogramStoreService, NotifyService, CrunchModeService } from 'src/app/shared/services';
import { Context } from 'src/app/shared/classes/context';
import { cloneDeep } from 'lodash';

@Component({
  selector: 'sp-divider-editor',
  templateUrl: './divider-editor.component.html',
  styleUrls: ['./divider-editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DividerEditorComponent implements OnInit {
  @ViewChild(`separatorEditor`) separatorEditor: SeparatorEditorComponent;
  private isMultiFixMode: boolean = false;
  private minFixHt: number = 0;
  private minFixWd: number = 0;
  private minFixDp: number = 0;
  public allowData: boolean = false;
  private HasDividers: boolean;
  private saveHasDividers: boolean;
  private saveLKDividerType: number;
  public isReadonly: boolean;
  public clonedDividerValues: Divider;
  public selectedFixtures; //TODO : ankita add data type later
  public dividerPlacementList: string[] = [];
  public dividers: Divider = {
    selectedDividerPlacement: 0,
    dividerHeight: 0,
    dividerWidth: 0,
    dividerDepth: 0,
    dividerSlotStart: 0,
    dividerSlotSpacing: 0,
    partNumber: null
  }
  constructor(private readonly planogramHelper: PlanogramHelperService,
    private readonly planogramStore: PlanogramStoreService,
    @Inject(MAT_DIALOG_DATA) private readonly data: StandardShelf | Basket | Coffincase,
    private readonly historyService: HistoryService,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly dividersCurdService: DividersCurdService,
    private readonly notifyService: NotifyService,
    private readonly crunchModeService:CrunchModeService,
    private readonly dialog: MatDialogRef<DividerEditorComponent>) {
  }

  public ngOnInit(): void {
    this.openDividerEditor();
  }

  public openDividerEditor(): void {
    this.dividerPlacementList = Object.assign([], this.planogramStore.lookUpHolder.DividerType.options);
    this.dividerPlacementList.shift();
    this.isMultiFixMode = this.planogramService.getSelectionCount(this.data.$sectionID) > 1;
    this.selectedFixtures = this.isMultiFixMode ? this.planogramService.getSelectedObject(this.data.$sectionID) : this.data;
    if (this.isMultiFixMode) {
      //get the min ht, wd and dpt values
      this.minFixHt = this.selectedFixtures.reduce((a, b) => { return (a.ChildDimension ? a.ChildDimension.Height : a) > b.ChildDimension.Height ? b.ChildDimension.Height : a }, this.selectedFixtures[0].ChildDimension.Height);
      this.minFixWd = this.selectedFixtures.reduce((a, b) => { return (a.ChildDimension ? a.ChildDimension.Width : a) > b.ChildDimension.Width ? b.ChildDimension.Width : a }, this.selectedFixtures[0].ChildDimension.Width);
      this.minFixDp = this.selectedFixtures.reduce((a, b) => { return (a.ChildDimension ? a.ChildDimension.Depth : a) > b.ChildDimension.Depth ? b.ChildDimension.Depth : a }, this.selectedFixtures[0].ChildDimension.Depth)
    } else {
      this.minFixHt = this.data.ChildDimension.Height;
      this.minFixWd = this.data.ChildDimension.Width;
      this.minFixDp = this.data.ChildDimension.Depth;
    }
    this.isMultiFixMode && this.selectedFixtures.forEach(pos => this.initDividerData(pos)) || this.initDividerData(this.data);
    this.isReadonly = this.planogramHelper.isPOGLive(this.data.$sectionID, false);
  }

  private initDividerData(data: StandardShelf | Basket | Coffincase): void {
    const hasAnyDivider = data.Children.find(it=> it.ObjectDerivedType === AppConstantSpace.DIVIDERS);
    if (data.Fixture.HasDividers && hasAnyDivider) {
      this.allowData = hasAnyDivider.Fixture.LKDividerType === 0 ? true : false;
      this.HasDividers = true;
      this.dividers.selectedDividerPlacement = hasAnyDivider.Fixture.LKDividerType;
      this.dividers.dividerHeight = hasAnyDivider.Fixture.Height;
      this.dividers.dividerWidth = hasAnyDivider.Fixture.Width;
      this.dividers.dividerDepth = hasAnyDivider.Fixture.Depth;
      this.dividers.dividerSlotStart = hasAnyDivider.Fixture._DividerSlotStart.ValData;
      this.dividers.dividerSlotSpacing = hasAnyDivider.Fixture._DividerSlotSpacing.ValData;
      this.dividers.partNumber = hasAnyDivider.Fixture.PartNumber;
    } else {
      //get the Divider Object Model
      this.dividers.selectedDividerPlacement = 0;
      this.dividers.dividerSlotStart = 0;
      this.dividers.dividerSlotSpacing = 0;
      this.dividers.dividerHeight = this.minFixHt;
      this.dividers.dividerWidth = 2;
      this.dividers.dividerDepth = this.minFixDp;
      this.dividers.partNumber = null;
      this.allowData = true;
      this.HasDividers = false;
    }
    this.clonedDividerValues = cloneDeep(this.dividers);
    this.saveHasDividers = this.HasDividers;
    this.saveLKDividerType = 0;
    if (hasAnyDivider) {
      if (this.data.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
        this.saveLKDividerType = this.data.Fixture.LKDividerType;
      } else {
        this.saveLKDividerType = hasAnyDivider.Fixture.LKDividerType;
      }
    }
  }


  public cancel(): void {
    const shelf = filter(this.data.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
    if (shelf) {
      if (this.data.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ) {
        this.data.Fixture.LKDividerType = this.saveLKDividerType;
      } else {
        shelf.Fixture.LKDividerType = this.saveLKDividerType;
      }
    }
    this.HasDividers = this.saveHasDividers;
    this.dialog.close();
  };

  public blurring(obj: Divider, field: string): void {
    if (['dividerWidth', 'dividerDepth', 'dividerHeight'].includes(field) && obj[field]<=0) {
      this.notifyService.warn('DIVIDERS_DIMENSIONS_SHOULD_BE_GREATER_THAN_ZERO');
      obj[field] = this.clonedDividerValues[field];
      return;
    }
    obj[field] = Math.round(obj[field] * 100) / 100;
    if (obj.dividerHeight > this.minFixHt) {
      obj.dividerHeight = this.minFixHt;
    }

    if (obj.dividerWidth > this.minFixWd) {
      obj.dividerWidth = this.minFixWd;
    }

    if (obj.dividerDepth > this.minFixDp) {
      obj.dividerDepth = this.minFixDp;
    }
    if (obj.dividerSlotStart > this.minFixWd) {
      obj.dividerSlotStart = this.minFixWd;
    }
    if (obj.dividerSlotSpacing > this.minFixWd) {
      obj.dividerSlotSpacing = this.minFixWd;
    }
  };

  public dividerPlacementSelect(): void {
    if (!this.dividers.selectedDividerPlacement) {
      this.HasDividers = false;
      this.allowData = true;
    } else {
      this.HasDividers = true;
      this.allowData = false;
      const selecFixtures = [this.data].concat(this.selectedFixtures);
      selecFixtures.forEach(element => {
        const dividerItemData = filter(element.Children, { ObjectDerivedType: AppConstantSpace.DIVIDERS })[0];
        if (!dividerItemData) {
          if (element.ObjectDerivedType == AppConstantSpace.COFFINCASEOBJ) {
            this.dividersCurdService.addSeparatorToShelf(element);
          } else {
            this.dividersCurdService.addDividerToShelf(element as StandardShelf | Basket, { LKDividerType: this.dividers.selectedDividerPlacement });
          }
        }
      })
    }
  };

  public dividersApply(): void {
    const unqHistoryID = this.historyService.startRecording();
    if (this.data.ObjectDerivedType !== AppConstantSpace.COFFINCASEOBJ) {
      let errorFlag: boolean=false ;
      this.data.Children.forEach((fObj)=>{
        if(fObj.ObjectDerivedType=='Position' && fObj.Position.ProductPackage.IDPackageStyle == AppConstantSpace.PKGSTYLE_TRAY && fObj.Position.IDMerchStyle == AppConstantSpace.MERCH_ADVANCED_TRAY && fObj.Position.LKDividerType== AppConstantSpace.INHERIT_FROM_SHELF){
          errorFlag=true;
        }
      });
      if ((this.dividers.dividerHeight <= 0 || this.dividers.dividerWidth <= 0 || this.dividers.dividerDepth <= 0) && this.dividers.selectedDividerPlacement != 0) {
        this.notifyService.warn('DIVIDERS_DIMENSIONS_SHOULD_BE_GREATER_THAN_ZERO');
      }
      else if(this.dividers.selectedDividerPlacement==2 && errorFlag){
        this.notifyService.warn('DIVIDERS_FACINGS_LEFT_CANT_BE_APPLIED_TO_ADVANCED_TRAY');
      }
      else {
        const dividerData: DividerResponse = <DividerResponse>{
          HasDividers: this.HasDividers,
          selectedDividerPlacement: this.dividers.selectedDividerPlacement,
          Fixture: {
            Height: this.dividers.dividerHeight,
            Width: this.dividers.dividerWidth,
            Depth: this.dividers.dividerDepth,
            PartNumber: this.dividers.partNumber,
            _DividerSlotStart: {
              ValData: this.dividers.dividerSlotStart
            },
            _DividerSlotSpacing: {
              ValData: this.dividers.dividerSlotSpacing
            }
          }
        }
        this.dividersCurdService.applyDividers(uniq([this.data].concat(this.selectedFixtures)), dividerData);
        this.planogramService.insertPogIDs(this.selectedFixtures, false);
      }
    } else {

      const separatorsData = this.separatorEditor.separatorsApply();
      if (!separatorsData) return;
      const dividerData: DividerResponse = <DividerResponse>{
        HasDividers: this.HasDividers,
        selectedDividerPlacement: this.separatorEditor.separatorDir,
        Fixture: {
          Thickness: this.separatorEditor.separatorThickness,
          PartNumber: this.dividers.partNumber,
          _DividerSlotStart: {
            ValData: null
          },
          _DividerSlotSpacing: {
            ValData: null
          }
        }
      }
      this.dividersCurdService.applySeparators(this.data, dividerData, separatorsData as DividerGap);
      // To check if dividers are overlapped with position or not.
      const interSectionMsg = this.crunchModeService.checkPositionsOverlapsDivider(this.data);
      if (interSectionMsg.message.length) {
        const datasource = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
        datasource.setSkipComputePositions();
        this.historyService.stopRecording(undefined, undefined, unqHistoryID);
        datasource.clearSkipComputePositions();
        this.dialog.close();
        this.planogramService.historyUniqueID = unqHistoryID
        this.planogramService.openIntersectionDialog(interSectionMsg);
        return;
      }
      this.sharedService.renderSeparatorAgainEvent.next(true);
    }
    const datasource = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    const ctx = new Context(datasource);
    datasource.computeMerchHeight(ctx);
    this.sharedService.gridReloadSubscription.next(true);
    this.historyService.stopRecording(undefined, undefined, unqHistoryID);
    if (this.data.ObjectDerivedType !== AppConstantSpace.COFFINCASEOBJ) { 
      this.sharedService.renderPositionAgainEvent.next(true);
    }
    this.dialog.close();
  };

  public isCoffinCase(): boolean {
    return (this.data.ObjectDerivedType === AppConstantSpace.COFFINCASEOBJ);
  };


};

