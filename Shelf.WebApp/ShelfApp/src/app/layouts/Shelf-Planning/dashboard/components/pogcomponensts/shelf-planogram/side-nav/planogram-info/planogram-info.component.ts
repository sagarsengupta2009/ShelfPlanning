import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MoreInfo, PlanogramStore, Resource } from 'src/app/shared/models';
import { PanelService, PlanogramInfoService, PlanogramStoreService } from 'src/app/shared/services';

@Component({
    selector: 'shelf-planogram-info',
    templateUrl: './planogram-info.component.html',
    styleUrls: ['./planogram-info.component.scss'],
})
export class PlanogramInfoComponent implements OnInit, OnDestroy {
    private subscriptions: Subscription = new Subscription();
    private resourcelistData: Resource[] = [];
    public pogInfoData: { value: any; name: string }[] = [];  

    constructor(
        private readonly dialog: MatDialogRef<PlanogramInfoComponent>,
        private readonly pogInfoService: PlanogramInfoService,
        private readonly planogramStore: PlanogramStoreService,
        private readonly translate: TranslateService,
        private readonly panelService: PanelService
    ) { }

    ngOnInit(): void {
        this.resourcelistData = this.planogramStore.appSettings.libPogMoreDetails.POG_SIDENAV_INFO;
        const activePogId = this.panelService.ActivePanelInfo.IDPOG;
        activePogId && this.preparePogInfo(activePogId);
        this.getLoadedPogInfo();
    }

    ngOnDestroy(): void {
        this.subscriptions.unsubscribe();
    }

    public closeDialog(): void {
        this.dialog.close();
        this.pogInfoService.isPogInfoOpened = false;
    }

    private preparePogInfo(activePogId): void {
        this.pogInfoService.isPogInfoOpened = true;
        this.subscriptions.add(
            this.pogInfoService.getPlanogramProperties(activePogId.toString()).subscribe((res) => {
                if (res.Data.length) {
                    this.pogInfoData = this.prepareInfoList(
                        res.Data[0],
                        this.resourcelistData,
                    );
                }
            }),
        );
    }

    private prepareInfoList(itemObj: PlanogramStore, resourcelist: Resource[]): MoreInfo[] {
        let infoArr: MoreInfo[] = [];
        resourcelist.forEach((obj) => {
            let str: string;
            let moreInfoObj: MoreInfo = { name: '', value: '' };
            if (obj.ResourceKey === 'PP_PLANOGRAM_HIERARCHY') {
                let counter: number = 2;
                let hierarchyLevel: string = 'L' + counter;
                str = itemObj['L1'];
                while (itemObj[hierarchyLevel] && itemObj[hierarchyLevel] != null && itemObj[hierarchyLevel] != '') {
                    str = str + ' --> ' + itemObj[hierarchyLevel];
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
                    str = str.replace('{' + substr + '}', itemObj[substr] ? itemObj[substr].toString() : '');
                }
            }
            moreInfoObj.name = this.translate.instant(obj.ResourceKey?.toString().toUpperCase());
            moreInfoObj.value = str;
            infoArr.push(moreInfoObj);
        });
        return infoArr;
    }

    private getLoadedPogInfo(): void {
        this.subscriptions.add(
            this.pogInfoService.getLoadedPogInfo.subscribe((pog) => {
                if (pog?.IDPOG && pog?.isLoaded) {
                    this.preparePogInfo(pog.IDPOG);
                }
                else {
                    this.dialog.close();
                }
            })
        )
    }

    //saving the last dragged position of pog info
    public onDrag(): void {  
        this.pogInfoService.onDrag();
    }
}
