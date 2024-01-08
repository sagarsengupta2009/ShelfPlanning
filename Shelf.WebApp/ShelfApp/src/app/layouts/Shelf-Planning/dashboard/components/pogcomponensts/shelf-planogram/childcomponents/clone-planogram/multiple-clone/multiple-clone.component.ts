import { Component, OnInit, Inject, OnDestroy, ViewEncapsulation } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ClonePlanogramService, NotifyService, PlanogramStoreService} from 'src/app/shared/services';
import { ClonedData, IApiResponse, MultiClonePostData, PlanogramType} from 'src/app/shared/models';

@Component({
    selector: 'srp-multiple-clone',
    templateUrl: './multiple-clone.component.html',
    styleUrls: ['./multiple-clone.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class MultipleCloneComponent implements OnInit, OnDestroy {
    public selectedValue: number = 1;
    public radioButtonGroup = [];
    public selectedType = 0;
    public planogramType: PlanogramType[] = [];
    private subscription: Subscription = new Subscription();
    private selectedIDPogs: number[] = [];

    constructor(
        private readonly dialog: MatDialogRef<MultipleCloneComponent>,
        @Inject(MAT_DIALOG_DATA) private readonly rowData: any,
        private readonly planogramStore: PlanogramStoreService,
        private readonly clonePlanogramService: ClonePlanogramService,
        private readonly notifyService: NotifyService,
        private readonly translate: TranslateService,
    ) {}

    public ngOnInit(): void {
        this.radioButtonGroup = [
            { Name: this.translate.instant('RETAIN_STORE_ASSOCIATION'), Value: 1 },
            { Name: this.translate.instant('DISCARD_STORE_ASSOCIATION'), Value: 0 },
        ];
        for (let pogObj of this.rowData) {
            this.selectedIDPogs.push(pogObj.IDPOG);
      }
      this.selectedType = this.planogramStore.appSettings.default_pog_type;
      this.getplanogramTypeArray();

    }

    public ngOnDestroy(): void {
      this.subscription?.unsubscribe();
    }

    private getplanogramTypeArray(): void {
      if (this.planogramStore.lookUpHolder) {
        let data = this.planogramStore.lookUpHolder;
        for (let d of data.POGType.options) {
          if (d.value > -1) this.planogramType.push(d);
        }
        let pogTypeObj = this.planogramType.find((item) => item.value == this.selectedType);
        if (!pogTypeObj) {
          this.selectedType = 0;
        }
      }
    }

    public closeDialog(): void {
        this.dialog.close();
    }

    public clonePlangram(): void {
      let postApiData: MultiClonePostData = {
        cloneStoreLink: this.selectedValue,
        idPogScenario: this.planogramStore.scenarioId,
        pogType: this.selectedType,
        idPogs: this.selectedIDPogs,
      };
      this.subscription.add(
        this.clonePlanogramService.clonePlanograms(postApiData).subscribe((res: IApiResponse<ClonedData[]>) => {
          this.dialog.close(res);//api result should be passed to library component.
        }, (error) => {
          if (error) {
            this.notifyService.error(error, 'GOT IT!');
          }
        }),
      );
    }
}
