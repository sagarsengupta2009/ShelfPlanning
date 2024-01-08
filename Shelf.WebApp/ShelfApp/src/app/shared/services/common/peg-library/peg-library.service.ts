import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription } from 'rxjs';
import { IApiResponse, apiEndPoints } from 'src/app/shared/models';
import { ConfigService } from '../configuration/config.service';
import { PegLibrary } from 'src/app/shared/models/peg-library';
import { NotifyService } from '../notify/notify.service';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import { CreatePegComponent, PegLibraryComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/common';
import { PlanogramStoreService } from '../planogram-store.service';

@Injectable({
  providedIn: 'root'
})
export class PegLibraryService {

  public PegLibrary: PegLibrary[] = [];
  public updateGrid: Subject<boolean> = new Subject<boolean>();
  public createPegDialogRef: MatDialogRef<CreatePegComponent, any> = null;
  public pegLibraryDialogRef: MatDialogRef<PegLibraryComponent, any> = null;
  private subscriptions: Subscription = new Subscription();
  constructor(private readonly http: HttpClient,
    private readonly envConfig: ConfigService,
    private readonly notifyService: NotifyService,
    private readonly translate: TranslateService,
    private readonly planogramStore: PlanogramStoreService
    ) { }

  public getPegLibrary(): Observable<IApiResponse<PegLibrary[]>> {
    return this.http.get<IApiResponse<PegLibrary[]>>(`${this.envConfig.shelfapi}${apiEndPoints.getPegLibrary}`);
  }

  public insertUpdatePegLibrary(formData: FormData): Observable<IApiResponse<PegLibrary[]>> {
    return this.http.post<IApiResponse<PegLibrary[]>>(`${this.envConfig.shelfapi}${apiEndPoints.insertUpdatePegLibrary}`, formData);
  }
  public cellValidation(event, field): boolean {
    console.log(event);
    switch (field) {
      case 'TagHeight':
      case 'TagWidth':
      case 'TagYOffset':
      case 'TagXOffset':
        if (!event.event.data.IsPegTag) {
          this.notifyService.warn(event.event.column.colId + ' ' + this.translate.instant('IS_NOT_EDITABLE'));
          return false
        } else {
          return true;
        }
      default:
        return event.event.colDef.editable;
    }
  }

  public save(pegValue: PegLibrary[], selectedfile?: File, selectedfiles?: { pegId: number, file: File, fileName: string }[], loadPegLibrary?: boolean): void {
    let formData = new FormData();
    if (selectedfile) {
      formData.append('file', selectedfile);
    } else if (selectedfiles?.length) {
      selectedfiles.forEach(ele => {
        formData.append('file', ele.file, ele.fileName);
      });
    }
    formData.append('data', JSON.stringify(pegValue));
    this.subscriptions.add(this.insertUpdatePegLibrary(formData).subscribe((response: IApiResponse<PegLibrary[]>) => {
      if (response && !response.Log.Summary.Error && this.createPegDialogRef) {
        this.createPegDialogRef.close();
        this.createPegDialogRef = null;
      }
        this.updatePegLibrary(loadPegLibrary);
    }));
  }

  public updatePegLibrary(loadPegLibrary?: boolean) {
    this.subscriptions.add(
      this.getPegLibrary().subscribe((response: IApiResponse<PegLibrary[]>) => {
        if (response.Data && response.Data.length > 0) {
          this.PegLibrary = response.Data;
          loadPegLibrary && this.updateGrid.next(true);
        }
      }));
  }

  public updatePegLibraryStatus(activeInactive: {"ids": number[],  "isActive": boolean }): void {
    this.subscriptions.add(this.updatePegLibStatus(activeInactive).subscribe((response: IApiResponse<PegLibrary[]>) => {
      if (response) {
        this.updatePegLibrary(true);
      }
    }));
  }

  public updatePegLibStatus(activeInactive: {"ids": number[],  "isActive": boolean }): Observable<IApiResponse<PegLibrary[]>> {
    return this.http.post<IApiResponse<PegLibrary[]>>(`${this.envConfig.shelfapi}${apiEndPoints.updatePegLibraryStatus}`, activeInactive);
  }

}
  //public updatePegLibraryStatus()
