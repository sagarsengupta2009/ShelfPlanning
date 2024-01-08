import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { find } from 'lodash-es';
import { Subscription } from 'rxjs';
import { Fixture, Position, Section } from 'src/app/shared/classes';
import { AppConstantSpace } from 'src/app/shared/constants';
import { FixtureImageSide, PogDecorations } from 'src/app/shared/models';
import { 
  PropertyGridService, 
  HistoryService, 
  SharedService, 
  LanguageService, 
  PropertyFieldService, 
  Planogram_2DService
} from 'src/app/shared/services';

@Component({
  selector: 'sp-imagery',
  templateUrl: './imagery.component.html',
  styleUrls: ['./imagery.component.scss']
})
export class ImageryComponent implements OnInit, OnDestroy {
  private subscription: Subscription = new Subscription();
  public HighLightId: number;
  public imageList: PogDecorations[] = [];
  public selectedImageStorage: PogDecorations[] = [];
  public previousUrl: string;
  public filterText: string = '';
  public skeletonDateTimeFormat: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: Fixture | Section | Position,
    private readonly sharedService: SharedService,
    private readonly dialog: MatDialogRef<ImageryComponent>,
    private readonly historyService: HistoryService,
    private readonly languageService: LanguageService,
    private readonly propertyGridService: PropertyGridService,
    private readonly propertyFieldService: PropertyFieldService,
    private readonly planogram2DService: Planogram_2DService 
  ) {
    this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
};

  public ngOnInit(): void {
    this.openImageAttacher(this.data);
    const side = this.propertyFieldService.getSide(this.data);
    switch (side) {
      case "Front":
        this.previousUrl = this.data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? this.data.FrontImage.Url : this.data.Fixture.FrontImage.Url;
        break;

      case "FarFront":
        this.previousUrl = this.data.Fixture.FrontImage.FarFrontUrl;
        break;

      case "Back":
        this.previousUrl = this.data.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? this.data.BackImage.Url : this.data.Fixture.BackImage.Url;
        break;

      case "Top":
        this.previousUrl = this.data.Fixture.TopImage.Url;
        break;

      case "Bottom":
        this.previousUrl = this.data.Fixture.BottomImage.Url;
        break;

      case "Left":
        this.previousUrl = this.data.Fixture.LeftImage.Url;
        break;

      case "Right":
        this.previousUrl = this.data.Fixture.RightImage.Url;
        break;

      case "Edge":
        this.previousUrl = this.data.Position.EdgeImage.Url;
        break;
      
      default:
        break;
    }
    this.ChildSearchItems();
  };

  public ChildSearchItems(response?: string): void {
    if (this.imageList) {
      this.filterText = response || '';
    }
  }

  private openImageAttacher(objData: Fixture | Section | Position): void {
    this.subscription.add(this.propertyGridService.getImagesForFixture().subscribe(data => {
      this.imageList = data.Data;
      this.imageList.forEach(element => {
        element.imgContent = new Image();
        element.imgContent.src = element.Image;
      });
      const url = objData.ObjectDerivedType === AppConstantSpace.SECTIONOBJ ? objData.FrontImage.Url : (objData.ObjectType === AppConstantSpace.FIXTUREOBJ ? objData.Fixture.FrontImage.Url : objData.Position.EdgeImage.Url);
      if (url != '') {
        const myObj = find(this.imageList, { Image: url });
        this.HighLightId = myObj ? myObj.Id : this.HighLightId;
      }
    }, (error) => {
      console.error("Fixture Images could not be loaded.");
      console.error(error);
    }));
  };

  public selectedImage(imageData: PogDecorations): void {
    this.HighLightId = imageData.Id;
    if (this.selectedImageStorage.length > 0) {
      this.selectedImageStorage.length = 0;
    }
    this.selectedImageStorage.push(imageData)
  }

  public sortByName(): void {
    this.imageList = this.imageList.sort((a, b) => {
      if (a.Name < b.Name) {
        return -1
      }
    })
  }

  public sortByDate(): void {
    this.imageList = this.imageList.sort((a, b) => {
      return new Date(b.CreatedTs).valueOf() - new Date(a.CreatedTs).valueOf();
    })
  }

  public attachImage(): void {
    this.historyService.startRecording();
    const side = this.propertyFieldService.getSide(this.data);
    this.propertyFieldService.attachingToParticularSide(this.data, this.selectedImageStorage[0].Image, side);
    if (this.data != undefined) {
      if (this.data.ObjectDerivedType === "StandardShelf") {
        this.sharedService.updateStandardShelf.next(true);
        if (side == FixtureImageSide.FGFront) {
          this.data.Children.forEach(c => {
            this.sharedService.updatePosition.next(c.$id);
          })
          this.sharedService.updateGrillOnFieldChange.next(true);
        }
      } else if (this.data.ObjectDerivedType === AppConstantSpace.POSITIONOBJECT) {
        this.sharedService.updatePosition.next(this.data.$id);
      }
      else {
        this.sharedService.updateImageInPOG.next(this.data.ObjectDerivedType);
      }
    }
    const funoriginal  = ((sideImageSelected) => {
      return () => {
      this.propertyFieldService.attachingToParticularSide(this.data, this.selectedImageStorage[0].Image, sideImageSelected);
      }
    })(side);
    const funRevert = ((previousUrl, sideImageSelected) => {
      return () => {
      this.propertyFieldService.attachingToParticularSide(this.data, previousUrl, sideImageSelected);
      }
    })(this.previousUrl, side);
    this.historyService.captureActionExec({
      funoriginal,
      funRevert,
      'funName': 'MoveAnnotation'
    });
    this.planogram2DService.updateModularLabelzIndex(this.data.$id); //@Sagar: after attaching modular image update bay label's zIndex
    this.historyService.stopRecording();
    this.dialog.close();
  };

  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  };
}
