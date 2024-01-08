import { Component, Inject, OnInit, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { IntlService } from '@progress/kendo-angular-intl';
import { Subscription } from 'rxjs';
import { ConsoleLogService } from 'src/app/framework.module';
import { Fixture, Position, Section } from 'src/app/shared/classes';
import { PogDecorations } from 'src/app/shared/models';
import { PlanogramService } from 'src/app/shared/services/common/planogram/planogram.service';
import { SharedService } from 'src/app/shared/services/common/shared/shared.service';
import { LanguageService } from 'src/app/shared/services';

@Component({
  selector: 'sp-annotation-image-dialog',
  templateUrl: './annotation-image-dialog.component.html',
  styleUrls: ['./annotation-image-dialog.component.scss']
})
export class AnnotationImageDialogComponent implements OnInit {
  private subscription: Subscription;
  public imageList: PogDecorations[] = [];
  public searchText: string;
  public skeletonDateTimeFormat: string;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Section | Position | Fixture,
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    public readonly intl: IntlService,
    private readonly log: ConsoleLogService,
    private readonly languageService: LanguageService,
    @Optional() public dialog: MatDialogRef<AnnotationImageDialogComponent>,
  ) {
    this.skeletonDateTimeFormat = this.languageService.getDateFormat() + ' ' + this.languageService.getTimeFormat();
  }

  public ngOnInit(): void {     
    this.searchImages(); 
    this.bindSearchEvent();
  }

  public sortByName(): void {
    this.imageList = this.imageList.sort((a, b) => { if (a.Name < b.Name) { return -1 } });
  }

  public sortByDate(): void {
    this.imageList = this.imageList.sort((a, b) => { return new Date(b.CreatedTs).valueOf() - new Date(a.CreatedTs).valueOf(); })
  }


  private searchImages(): void {
    this.planogramService.getAnnotationImages(this.searchText || '*').subscribe(
      (data) => {
        const imgList = data.Data;
        imgList.forEach(item=>{
          item.imgContent = new Image();
          item.imgContent.src = item.Image;
        });
        this.imageList = imgList;
        this.searchText = null;
        },
      (error) => {
            this.log.error("Annotation Images could not be loaded.");
            this.log.error(error);
        });
  }
  private bindSearchEvent(): void {
    this.subscription = this.sharedService.filterSearch.subscribe(
      (response) => {
        this.searchText = response;
      }
    );
  }
  
  public ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

}
