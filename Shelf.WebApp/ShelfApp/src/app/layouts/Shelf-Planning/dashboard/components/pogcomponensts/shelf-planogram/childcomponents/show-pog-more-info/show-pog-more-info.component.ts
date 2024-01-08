import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { IApiResponse, MoreInfo, PlanogramContext, PlanogramStore, Resource, POGResources } from 'src/app/shared/models';

import { ShowMorePogInfoService, PlanogramStoreService, PanelService } from 'src/app/shared/services';
import { AppConstantSpace } from 'src/app/shared/constants';


@Component({
  selector: 'srp-show-pog-more-info',
  templateUrl: './show-pog-more-info.component.html',
  styleUrls: ['./show-pog-more-info.component.scss']
})
export class ShowPogMoreInfoComponent implements OnInit, OnDestroy {
  public dynamicContent: string = '';
  public popUpTitle: string = '';
  public moreInfoList: MoreInfo[];
  public resourcelistData: POGResources;
  private subscriptions: Subscription = new Subscription();
  public image: boolean = false;
  public noImagePath: string = '';

  constructor(private readonly translate: TranslateService,
    private readonly pogInfoService: ShowMorePogInfoService,
    private readonly planogramStore: PlanogramStoreService,
    private readonly dialog: MatDialogRef<ShowPogMoreInfoComponent>,
    private readonly panelService: PanelService,
    @Inject(MAT_DIALOG_DATA) private readonly rowData: PlanogramContext<PlanogramStore>) { }

  // Public Methods   
  public ngOnInit(): void {
    this.resourcelistData = this.planogramStore.appSettings.libPogMoreDetails;
    this.noImagePath = AppConstantSpace.DEFAULT_PREVIEW_IMAGE;
    this.getPlanogramProperties();     
  }

  public ngOnDestroy(): void {
    if (this.subscriptions)
      this.subscriptions.unsubscribe();
  }

  public closeDialog(): void {
    this.dialog.close();
  }

  private getPlanogramProperties(): void{
    this.subscriptions.add(this.pogInfoService.getPlanogramProperties(this.rowData.data.IDPOG).subscribe((res: IApiResponse<PlanogramStore[]>) => {
      if (res.Data.length) {
        this.openDialog(res.Data[0], this.rowData.product);
      }
    }));
  }

  // Private Methods
  private prepareInfoList(itemObj: PlanogramStore, resourcelist: Resource[]): MoreInfo[] {
    let infoArr: MoreInfo[] = [];
    resourcelist.forEach((obj) => {
      let str: string;
      let moreInfoObj: MoreInfo = { name: '', value: '' };
      if (obj.ResourceKey === 'PP_PLANOGRAM_HIERARCHY') {
        let counter: number = 2;
        let hierarchyLevel: string = 'L' + counter;
        str = itemObj['L1']
        while (itemObj[hierarchyLevel] && itemObj[hierarchyLevel] != null && itemObj[hierarchyLevel] != "") {
          str = str + " --> " + itemObj[hierarchyLevel]
          counter++;
          hierarchyLevel = 'L' + counter;
        }
      } else {
        let endIndex: number;
        let startIndex: number;
        str = obj.ColumnName;
        while (endIndex != -1) {
          startIndex = str.search('{');
          endIndex = str.search('}');
          let substr = str.substring(startIndex + 1, endIndex);
          str = str.replace("{" + substr + "}", (itemObj[substr]) ? itemObj[substr].toString() : "");
        }
      }
      moreInfoObj.name = this.translate.instant(obj.ResourceKey?.toString().toUpperCase());
      moreInfoObj.value = str;
      infoArr.push(moreInfoObj);
    });
    return infoArr;
  }

  // Amit Kasera -- commenting down this fun as we are not using it furthur
  // private getRndInteger(min: number, max: number): number {
  //   const number = Math.floor(Math.random() * (max - min)) + min;
  //   return number * 100000;
  // }


  private openDialog(plnObj: PlanogramStore, product: string): void {
    this.dynamicContent = "";
    this.popUpTitle = (product === "POG" || product === "StoreViewPOG") ? this.translate.instant('PANEL_HEADER_PLANOGRAM') : this.translate.instant('PLANOGRAM_LIBRARY_PRODUCT');
    this.popUpTitle += " " + this.translate.instant('PLANOGRAM_LIBRARY_PROPERTIES');
    this.moreInfoList = this.prepareInfoList(plnObj, this.resourcelistData[product]);
    let fileName = plnObj.ThumbnailFileName;
    this.getPogImage(fileName);
  }

  private getPogImage(fileName: string): void {
    if (fileName) {
      //api call to get svg image
      const thumbnailSvgSub = this.panelService.getThumbnail(fileName).subscribe((response: IApiResponse<string>) => {
        if (response.Data) {
          this.dynamicContent = response.Data;
          this.image = true;
        }
      },
        (error: any) => {
          this.image = false;
        });
      this.subscriptions.add(thumbnailSvgSub);
    }
    else {
      this.image = false;
    }
}
  
}
