import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { range } from 'lodash-es';
import { Orientation, Position } from 'src/app/shared/classes';
import { LookUpChildOptions, OrientationsObject, PositionObject, PropertyObject, PropertyType } from 'src/app/shared/models';
import { Section } from 'src/app/shared/classes/section';
import { AppConstantSpace } from 'src/app/shared/constants';
import { SharedService, PlanogramService, PlanogramHelperService, PlanogramStoreService, CrunchModeService, Render2dService, CrunchMode, ConfigService } from 'src/app/shared/services';
import { OrientationService } from 'src/app/shared/services/layouts/space-automation/dashboard/shelf-planogram/3d-planogram/orientation.service';

@Component({
  selector: 'sp-context-model',
  templateUrl: './context-model.component.html',
  styleUrls: ['./context-model.component.scss']
})
export class ContextModelComponent implements OnInit {

  public orientationOptions: LookUpChildOptions[] = [];
  public facingList: number[] = [];
  public currentFacing: number;
  public currentOrientation: number;
  public orientationsObject: OrientationsObject = {orientationsGroups:[], orientationsList:[]};
  public orientationImageFilePath: string;
  public orientationIconFile: string;
  public showIcon: boolean = false;
  public rotateImg: string = '0deg';
  public defaultOrientation: number;
  public allOrientations = this.planogramStore.allOrientationGroups;
  public allowedOrientations: number[];
  public orientationValues = Object.values(AppConstantSpace.ORIENTATION);
  public orientationKeys = Object.keys(AppConstantSpace.ORIENTATION);
  public keyToCompare = Object.keys(AppConstantSpace.ORIENTATION_VIEW);
  private orientation = new Orientation();
  private errorIndex: string[] = [];

  constructor(
    public readonly translate: TranslateService,
    @Inject(MAT_DIALOG_DATA) public rowData: PropertyObject,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly sharedService: SharedService,
    private readonly dialogRef: MatDialogRef<ContextModelComponent>,
    private readonly planogramService: PlanogramService,
    private readonly planogramStore: PlanogramStoreService,
    public crunchMode: CrunchModeService,
    private readonly render2d: Render2dService,
    private readonly orientationService: OrientationService
  ) {
  }

  public ngOnInit(): void {
    switch (this.rowData.property) {
      case PropertyType.Facings:
        this.currentFacing = this.rowData.data.Position.FacingsX;
        const min = Math.max(this.rowData.data.Position.MinFacingsX, 1);
        const max = Math.max(this.rowData.data.Position.MaxFacingsX, 1);
        this.facingList = range(min, max + 1);
        break;
      case PropertyType.Orientation:
        this.orientationService.setOrientationImages();
        this.currentOrientation = this.rowData.data.Position.IDOrientation;
        this.getOrientationCxt();
        break;
      case PropertyType.FixtureCrunchMode:
        this.crunchMode.current = this.rowData.data.Fixture.LKCrunchMode
        this.crunchMode.getCrunchModeMenu(this.rowData.data.ObjectDerivedType);
        break;
      case PropertyType.SectionCrunchMode:
        this.crunchMode.current = this.rowData.data.LKCrunchMode
        this.crunchMode.getCrunchModeMenu(this.rowData.data.ObjectDerivedType, this.rowData.data._IsSpanAcrossShelf.FlagData);
        break;
    }
  }

  private getOrientationCxt(): void {
    this.orientationsObject = this.planogramService.getAvailableOrientations([this.rowData.data as Position]);
    this.allowedOrientations = this.orientationsObject.orientationsList.map(item => item.value);
    this.changeFilePath(this.orientationsObject.orientationsList.find(ori => ori.value == this.currentOrientation));
    this.captureDefaultOrientation();
    if (this.currentOrientation) {
      setTimeout(() => {
        const orientationElSelected = document.getElementById(this.currentOrientation.toString());
        orientationElSelected && this.sharedService.scrollToNext(this.currentOrientation);
      }, 0);
    }
  }

  public changeFixCrunchModeCxt(): void {
    const sectionObj = this.sharedService.getObjectAs<Section>(this.rowData.data.$sectionID, this.rowData.data.$sectionID);
    if (this.planogramHelper.isPOGLive(this.rowData.data.$sectionID, true)) {
      return;
    }
    this.crunchMode.changeCrunchMode(sectionObj, this.crunchMode.current);
    this.planogramService.updateSectionObjectIntoStore(sectionObj.IDPOG, sectionObj);
    setTimeout(() => {
      this.planogramService.updateNestedStyleDirty = true;;
    }, 0);
    this.sharedService.renderDividersAgainEvent.next(true);
    this.dialogRef.close();
  }

  public changeFacingCxt(data: PositionObject): void {
    const sectionObj = this.sharedService.getObjectAs<Section>(this.rowData.data.$sectionID, this.rowData.data.$sectionID);
    if (this.planogramHelper.isPOGLive(this.sharedService.getActiveSectionId(), true)) {
      return;
    }
    this.planogramHelper.increaseFacing(sectionObj, this.currentFacing);
    this.planogramService.updateSectionObjectIntoStore(sectionObj.IDPOG, sectionObj)
    const dObj = { field: "Position.FacingsX", newValue: data.Position.FacingsX, products: data, IDPOGObject: data.IDPOGObject, gridType: "Position", tab: "" }
    this.render2d.isDirty = true,
      this.sharedService.updatePosition.next(this.rowData.data.$id);

    this.sharedService.workSheetEvent.next(dObj); //update in worksheet
    this.sharedService.updatePosPropertGrid.next(true); //update in propertygrid
    this.planogramService.updateNestedStyleDirty = true;
    this.sharedService.renderPositionAgainEvent.next(true);
    this.dialogRef.close();
  }

  public changeOrientationCxt(orientation: LookUpChildOptions): void {
    const sectionObj = this.sharedService.getObject(this.rowData.data.$sectionID, this.rowData.data.$sectionID) as Section;
    if(!this.allowedOrientations.includes(orientation?.value)){
      return;
    }
    if (this.currentOrientation === -1) {
      this.setToDefaultOrientation();
    } else {
      this.changeOrientation(orientation);
    }
    const pog = this.planogramStore.getPogById(sectionObj.IDPOG);
    if (pog) {
      this.planogramService.updateSectionObjectIntoStore(sectionObj.IDPOG, sectionObj)
    }
    this.planogramService.updateNestedStyleDirty = true;
  }

  private setToDefaultOrientation(): void {
    const sectionObj = this.sharedService.getObjectAs<Section>(this.rowData.data.$sectionID, this.rowData.data.$sectionID);
    this.planogramHelper.setToDefaultOrientation(sectionObj);
    this.sharedService.updatePosition.next(this.rowData.data.$id);
  }

  private captureDefaultOrientation() {
    this.defaultOrientation = (this.rowData.data as Position).getDefaultOrientation(this.orientationsObject.orientationsList);
  }

  public switchToNextPreviousOrientation(action: string) {
    let stopExecution = false;
    if (action === 'prev') {
      this.orientationsObject.orientationsGroups.forEach((ele, index) => {
        if (!stopExecution) {
          const currentIndex = ele.findIndex(ori => ori.value === this.currentOrientation);
          if (currentIndex > 0 && currentIndex != -1) {
            this.currentOrientation = ele[currentIndex - 1].value;
            this.changeFilePath(ele[currentIndex - 1]);
            this.sharedService.scrollToNext(ele[currentIndex - 1].value);
            stopExecution = true;
          } else if (index > 0 && currentIndex != -1) {
            const prevGroup = this.orientationsObject.orientationsGroups[index - 1];
            this.currentOrientation = prevGroup[prevGroup.length - 1].value;
            this.changeFilePath(prevGroup[prevGroup.length - 1]);
            stopExecution = true;
          }
        }
      });
    } else {
      this.orientationsObject.orientationsGroups.forEach((ele, index) => {
        if (!stopExecution) {
          const currentIndex = ele.findIndex(ori => ori.value === this.currentOrientation);
          if (currentIndex < ele.length - 1 && currentIndex != -1) {
            this.currentOrientation = ele[currentIndex + 1].value;
            this.changeFilePath(ele[currentIndex + 1]);
            this.sharedService.scrollToNext(ele[currentIndex + 1].value);
            stopExecution = true;
          } else if (index < this.orientationsObject.orientationsGroups.length - 1 && currentIndex != -1) {
            const currGroup = this.orientationsObject.orientationsGroups[index + 1];
            this.currentOrientation = currGroup[0].value;
            this.changeFilePath(currGroup[0]);
            stopExecution = true;
          }
        }
      });
    }
    this.changeOrientation(this.orientationsObject.orientationsList.find(item=>item.value == this.currentOrientation));
  }

  public changeOrientation(orientation: LookUpChildOptions): void {
    if (this.planogramHelper.isPOGLive(this.rowData.data.$sectionID, true)) {
      return;
    }
    this.currentOrientation = orientation.value;
    this.changeFilePath(orientation);
    const sectionObj = this.sharedService.getObjectAs<Section>(this.rowData.data.$sectionID, this.rowData.data.$sectionID);
    this.planogramHelper.changeOrientation(sectionObj, this.currentOrientation,'setSelected');
    this.sharedService.updatePosition.next(this.rowData.data.$id);
    this.planogramService.updateNestedStyleDirty = true;
    this.sharedService.updatePosPropertGrid.next(true);
  }

  public close(): void {
    this.dialogRef.close();
  }

  public changeFilePath(orientation: LookUpChildOptions, insertIntoErrorIndex?: boolean): void {
    const orientationValue = !orientation ? this.rowData.data.Position.IDOrientation : orientation?.value;
    const orientationKey = this.orientationKeys[this.orientationValues.indexOf(orientationValue)];
    const index = this.keyToCompare.find(k => orientationKey?.indexOf(k) === 0)?.toLowerCase();

    if (insertIntoErrorIndex) {
      this.errorIndex.push(index);
    }

    if (this.rowData.data.Position.ProductPackage.Images[index] && !this.errorIndex.includes(index)) {
      this.showIcon = false;
      const faceAndRotation = this.orientation.GetImageFaceAndRotation(orientationValue, false, this.orientation.View.Front);
      this.rotateImg = faceAndRotation.Rotation + 'deg';
      this.orientationImageFilePath = this.rowData.data.Position.ProductPackage.Images[index];
    } else {
      this.rotateImg = '0deg';
      this.showIcon = true;
      this.orientationIconFile = this.orientationService.getOrientationImage(orientation.text, orientationKey);
    }
  }

  public handleImageError() {
    const orientation = this.orientationsObject.orientationsList.find(ori => ori.value == this.currentOrientation);
    this.changeFilePath(orientation, true);
  }
}
