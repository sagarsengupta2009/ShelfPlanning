import { Component, Inject, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Section, StandardShelf } from 'src/app/shared/classes';
import { Context } from 'src/app/shared/classes/context';
import { Grill, LookUpChildOptions } from 'src/app/shared/models';
import { HistoryService, PlanogramService, SharedService, PlanogramHelperService, GrillsCurdService, NotifyService, PlanogramStoreService } from 'src/app/shared/services';

@Component({
  selector: 'sp-grill-editor',
  templateUrl: './grill-editor.component.html',
  styleUrls: ['./grill-editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GrillEditorComponent implements OnInit {
  public minFixHt: number = 0;
  public minFixWd: number = 0;
  public minFixDp: number = 0;
  public selectedFixtures;
  public isMultiFixMode: boolean;
  public HasGrills: boolean;
  public minGrillThickness: number;
  public isReadonly: boolean;
  public grillPlacementList: LookUpChildOptions[] = [];
  public grill: Grill = {
    selectedGrillPlacement: 1,
    GrillThickness: 0,
    GrillHeight: 0,
    GrillSpacing: 0,
    grillPartNumber: null
  }

  constructor(private readonly sharedService: SharedService,
    private readonly planogramHelperService: PlanogramHelperService,
    private readonly dialog: MatDialogRef<GrillEditorComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: StandardShelf,
    private readonly historyService: HistoryService,
    public readonly translate: TranslateService,
    private readonly grillsCurdService: GrillsCurdService,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly notifyService: NotifyService) {}

  public ngOnInit(): void {
    this.isMultiFixMode = this.planogramService.getSelectionCount(this.data.$sectionID) > 1;
    this.selectedFixtures = this.isMultiFixMode ? this.planogramService.getSelectedObject(this.data.$sectionID) : this.data;
    this.openGrillEditor();
    this.isReadonly = this.planogramHelperService.isPOGLive(this.data.$sectionID, false);
  }

  public blurring(obj: Grill, field: string): void {
    obj[field] = Math.round(obj[field] * 100) / 100;
    if (obj.GrillHeight > this.minFixHt) {
      obj.GrillHeight = this.minFixHt;
      this.notifyService.warn(this.translate.instant('MAX_GRILL_HEIGHT'));
    }
    if (obj.GrillSpacing > this.minFixWd) {
      obj.GrillSpacing = this.minFixWd;
      this.notifyService.warn('Grill Spacing should not exceed Shelf width');
    }
    if (obj.GrillThickness > this.minFixDp) {
      obj.GrillThickness = this.minFixDp;
      this.notifyService.warn('Grill Thickness should not exceed the minimum merchandising depth');
    }
  };
  public grillPlacementSelect(): void {
    if (this.grill.selectedGrillPlacement === 1) {
      this.HasGrills = false;
    } else {
      this.HasGrills = true;
      this.grillsCurdService.addGrillsToShelf([this.data].concat(this.selectedFixtures));
    }
  }

  public applyCustom(): void {
    let grillObject: Grill = { ...this.grill }
    grillObject.HasGrills = this.HasGrills;
    grillObject.PartNumber = this.grill.grillPartNumber;
    this.historyService.startRecording();
    this.grillsCurdService.applyGrills([this.data].concat(this.selectedFixtures), grillObject);
    const datasource = this.sharedService.getObject(this.data.$sectionID, this.data.$sectionID) as Section;
    const ctx = new Context(datasource);
    datasource.computeMerchHeight(ctx);
    this.historyService.stopRecording();
    this.sharedService.updateGrillOnFieldChange.next(true);
    //Grill are not immediatly reflected so updateNestedStyle is added
    //TODO @keerthi remove updateNestedStyle later
    this.planogramService.updateNestedStyleDirty = true;;
    this.sharedService.gridReloadSubscription.next(true);
    this.dialog.close();
  };

  public openGrillEditor(): void {
    this.grillPlacementList = this.planogramStore.lookUpHolder.GrillPlacement.options;
    if (this.isMultiFixMode) {
      //get the min ht, wd and dpt values
      this.minFixHt = this.selectedFixtures.reduce((a, b) => { return (a.Dimension ? (a.Dimension.Height - a.Fixture.Thickness) : a) > (b.Dimension.Height - b.Fixture.Thickness) ? (b.Dimension.Height - b.Fixture.Thickness) : a }, (this.selectedFixtures[0].Dimension.Height - this.selectedFixtures[0].Fixture.Thickness));
      this.minFixWd = this.selectedFixtures.reduce((a, b) => { return (a.ChildDimension ? a.ChildDimension.Width : a) > b.ChildDimension.Width ? b.ChildDimension.Width : a }, this.selectedFixtures[0].ChildDimension.Width);
      this.minFixDp = this.selectedFixtures.reduce((a, b) => { return (a.ChildDimension ? a.ChildDimension.Depth : a) > b.ChildDimension.Depth ? b.ChildDimension.Depth : a }, this.selectedFixtures[0].ChildDimension.Depth)
      this.minGrillThickness = 0.07;
    }
    if (this.data.Fixture.HasGrills && typeof this.data.Fixture.Grills && this.data.Fixture.Grills?.length) {
      const grillHeight = !this.data.Fixture.Grills[0].Fixture.Height ? (this.data.Dimension.Height - this.data.Fixture.Thickness) : this.data.Fixture.Grills[0].Fixture.Height;
      if (!this.isMultiFixMode) {
        this.minFixHt = this.data.Dimension.Height - this.data.Fixture.Thickness;
        this.minFixWd = this.data.ChildDimension.Width;
        this.minFixDp = this.data.ChildDimension.Depth;
        this.minGrillThickness = !this.data.Fixture.Grills[0].Fixture.Thickness ? 0.07 : this.data.Fixture.Grills[0].Fixture.Thickness;
      }
      this.grill.selectedGrillPlacement = this.data.Fixture.Grills ? this.data.Fixture.Grills[0].Fixture._GrillPlacement.ValData : this.data.Fixture.Grills[0].Fixture._GrillPlacement.ValData;
      if (this.grill.selectedGrillPlacement === 1) {
        this.HasGrills = false;
        this.grill.GrillThickness = 0.07;
        this.grill.GrillHeight = this.minFixHt;
        this.grill.GrillSpacing = 2;
        this.grill.grillPartNumber = null;
      } else {
        this.grill.selectedGrillPlacement = 4;
        this.HasGrills = true;
        this.grill.GrillThickness = this.minGrillThickness;
        this.grill.GrillHeight = grillHeight;
        this.grill.GrillSpacing = (!this.data.Fixture.Grills[0].Fixture._GrillSpacing.ValData ? 0 : this.data.Fixture.Grills[0].Fixture._GrillSpacing.ValData);
        this.grill.grillPartNumber = this.data.Fixture.Grills[0].Fixture.PartNumber;
      }
    } else {
      this.grill.selectedGrillPlacement = 1;
      this.grill.GrillThickness = 0.07;
      this.minFixHt = this.minFixHt == 0 ? (this.data.Dimension.Height - this.data.Fixture.Thickness) : this.minFixHt;
      this.grill.GrillHeight = this.minFixHt;
      this.grill.GrillSpacing = 2;
      this.grill.grillPartNumber = null;
      this.minFixWd = this.data.ChildDimension.Width;
      this.minFixDp = this.data.ChildDimension.Depth;
    }
  };
}
