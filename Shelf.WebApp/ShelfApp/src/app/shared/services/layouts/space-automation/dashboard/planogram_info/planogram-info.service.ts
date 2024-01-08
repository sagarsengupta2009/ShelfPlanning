import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { PlanogramInfoComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/side-nav/planogram-info/planogram-info.component';
import { IApiResponse, PlanogramStore, apiEndPoints, POGLibraryListItem } from 'src/app/shared/models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { LocalStorageService } from 'src/app/framework.module';
import { PogInfoPosition } from 'src/app/shared/models/planogram-library/planogram-details';

@Injectable({
    providedIn: 'root',
})
export class PlanogramInfoService {

    public getLoadedPogInfo = new Subject<POGLibraryListItem>();
    public isPogInfoOpened: boolean = false;
    public pogInfoDialogRef : MatDialogRef<PlanogramInfoComponent> = null ;
    public pogInfoPosition: PogInfoPosition = {
        top: '256px',
        left: '32px'
    };  

    constructor(private readonly http: HttpClient,
                private readonly envConfig: ConfigService,
                private readonly dialog: MatDialog,
                private readonly localStorage: LocalStorageService) { }

    public getPlanogramProperties(idPog: string): Observable<IApiResponse<PlanogramStore[]>> {
        return this.http.get<IApiResponse<PlanogramStore[]>>(`${this.envConfig.shelfapi}${apiEndPoints.getPogLibraryInfo}${idPog}`);
    }
    
    //function to open the pog info when user switched to different tab in same scenario
    public openPlanogramInfo(): void {
        if (this.isPogInfoOpened && (!this.pogInfoDialogRef || !this.pogInfoDialogRef.componentInstance)) {
            this.openPogInfoDialog();
        }
    }

    //saving the last dragged position of pog info
    public onDrag(): void {
        const rect = document.getElementById('planograminformation').getBoundingClientRect();
        this.pogInfoPosition.left = rect.left + window.scrollX + 'px';
        this.pogInfoPosition.top = rect.top + window.scrollY + 'px';
        this.localStorage.set('pogInfoPos', this.pogInfoPosition);
    }

    public openPogInfoDialog(): void {
        let leftPosition = '32px';
        let topPosition = '256px';
        if(this.localStorage.get('pogInfoPos')){
            this.pogInfoPosition = this.localStorage.get('pogInfoPos');
            leftPosition = this.pogInfoPosition.left;
            topPosition = this.pogInfoPosition.top;
        } 
        this.pogInfoDialogRef = this.dialog.open(PlanogramInfoComponent, {
            maxHeight: 'calc(100vh - 19em)',
            width: '25%',
            position: { left: leftPosition, top: topPosition },
            hasBackdrop: false,
            disableClose: true, //used to disable close on pressing esc btn
            id: 'planogram-info-dialog', 
        });
    }
}
