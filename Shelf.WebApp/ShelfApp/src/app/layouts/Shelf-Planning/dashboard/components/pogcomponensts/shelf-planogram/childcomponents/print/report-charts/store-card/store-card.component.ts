import { Component, OnInit, OnDestroy, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { POGLibraryListItem, PogInfo, ReportStoreList } from 'src/app/shared/models';
import { ParentApplicationService, ReportandchartsService, SharedService } from 'src/app/shared/services';

@Component({
    selector: 'shelf-store-card',
    templateUrl: './store-card.component.html',
    styleUrls: ['./store-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StoreCardComponent implements OnInit, OnDestroy {
    @Input() storeCard;
    public storeList: ReportStoreList[] = [];
    public selectedStore: number;
    private currentSelectedPog: POGLibraryListItem;
    public storeReportsCompareArray: PogInfo[] = [];
    public selectedPlanogram3: number;
    private subscriptions: Subscription = new Subscription();

    constructor(
        private readonly sharedService: SharedService,
        private readonly parentApp: ParentApplicationService,
        private readonly reportchartsService: ReportandchartsService,
        private readonly cdr: ChangeDetectorRef,
    ) {}

    public ngOnInit(): void {
        this.currentSelectedPog = this.reportchartsService.currentPlanogramData;
        this.fetchStoreList();
    }

    public ngOnDestroy(): void {
        this.subscriptions?.unsubscribe();
    }

    public get isStoreView(): string {
        return this.sharedService.vmode;
    }

    public onStoreFieldChange(): void {
        this.fetchStorePlanogramList(this.selectedStore);
    }

    private fetchStorePlanogramList(storeId: number): void {
        let selectedStoreArray: ReportStoreList = this.storeList.find((item) => item.IDStore == storeId);
        this.storeReportsCompareArray = selectedStoreArray.Planograms;
        this.selectedPlanogram3 = this.storeReportsCompareArray[0] ? this.storeReportsCompareArray[0].IDPOG : undefined;
        this.cdr.detectChanges();
    }

    private fetchStoreList(): void {
        this.currentSelectedPog = this.reportchartsService.currentPlanogramData;
        this.storeList = [];
        if (this.currentSelectedPog) {
            this.subscriptions.add(
                this.reportchartsService.getStoreList(this.currentSelectedPog.IDPOG).subscribe((res) => {
                    if (res.Data) {
                        this.storeList = res.Data;
                        if (this.sharedService.vmode) {
                            this.selectedStore = this.parentApp.idStore;
                        } else {
                            if (this.storeList.length) {
                                this.selectedStore = this.storeList[0].IDStore;
                            }
                        }
                        if (this.storeList.length) {
                            this.fetchStorePlanogramList(this.selectedStore);
                        }
                    }
                }),
            );
        }
    }

    public trackByInfo(index: number, item: ReportStoreList): number {
        return item.IDStore;
    }
}
