import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { IApiResponse, NewProductInventory, apiEndPoints } from 'src/app/shared/models';
import { AllocateNpiService, ParentApplicationService } from 'src/app/shared/services';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
    providedIn: 'root',
})
export class NewProductInventoryService {
    public positionsChangedInNPI = {};
    constructor(
      private readonly http: HttpClient,
      private readonly parentApp: ParentApplicationService,
      private readonly allocateNpi: AllocateNpiService,
      private readonly envConfig: ConfigService) {}

    //npiItems
    public setChangedPositionValues = (data, pogid: number) => {
        this.positionsChangedInNPI[pogid] = data;
    };
    public getChangedPositionValues = (pogid: number) => {
        return this.positionsChangedInNPI[pogid];
    };

    public insertNewTempProduct = (updateData, ids?): Observable<IApiResponse<NewProductInventory>> => {
        let headers = new HttpHeaders().append('Content-Type', 'application/json');
        let callingApp = '';
        if(this.parentApp.isAllocateApp) {
          callingApp = 'PA';
        } else if(this.parentApp.isShelfApp) {
          callingApp = 'SHELF';
        }
    
        let data = JSON.stringify({ data: updateData, pogScenerioID: ids, 'CallingApp': callingApp });
        return this.http.post<IApiResponse<NewProductInventory>>(`${this.envConfig.shelfapi}${apiEndPoints.addProductsNPIs}`, data, { headers })
        .pipe(
          tap(res => {
            if(this.parentApp.isAllocateApp) {
              let items = [];
              for (const key in res.Data) {
                  if (key != "PerfData") {
                      items.push(res.Data[key]);
                  }
              }
              this.allocateNpi.updateItemPAAzure(items).subscribe();
            } 
          }  
        ))
    };
}
