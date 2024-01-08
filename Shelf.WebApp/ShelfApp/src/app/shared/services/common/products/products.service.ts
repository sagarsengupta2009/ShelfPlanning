import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, first } from 'rxjs/operators';
import { AddNPIResponse, AddProductNPIRequest, IApiResponse, NewProductNPI, PogScenerioID, apiEndPoints } from 'src/app/shared/models';
import { PerfData } from 'src/app/shared/models/new-product-inventory/new-product-inventory';
import { ProductType } from 'src/app/shared/models/planogram/product';
import { FormattingService } from '../formatting/formatting.service';
import { ParentApplicationService } from '../parent-app/parent-application.service';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

export { ProductType };
@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  constructor(
    private http: HttpClient,
    private formatting: FormattingService,
    private readonly parentApp: ParentApplicationService,
    private readonly envConfig: ConfigService
  ) { }


  private addProductsNPIs(data: NewProductNPI[], pogScenerioID: PogScenerioID): Observable<IApiResponse<AddNPIResponse>> {
    let callingApp = '';
    if(this.parentApp.isAllocateApp) {
      callingApp = 'PA';
    } else if(this.parentApp.isShelfApp) {
      callingApp = 'SHELF';
    }

    data.forEach(this.formatting.removeNullFields);
    return this.http.post<IApiResponse<AddNPIResponse>>(`${this.envConfig.shelfapi}${apiEndPoints.addProductsNPIs}`,
      { data, pogScenerioID, 'CallingApp': callingApp } as AddProductNPIRequest,
      { headers: { 'Content-Type': 'application/json' } },
    ).pipe(first());
  }

  public addProductNPI(data: NewProductNPI, pogScenerioID: PogScenerioID): Observable<ProductType> {
    return this.addProductsNPIs([data], pogScenerioID)
      .pipe(map(({ Data, Log }) => {
        const item = Object.keys(Data).filter(key => Data[key].UPC).map(key => Data[key])[0];
        if (!item) {
          if (Log.Summary.Error > 0) {
            throw new Error(Log.Details[0].Message);
          } else {
            throw new Error('Unknown Error');
          }
        }
        return item;
      }))
  }

  public addProductNPIWithPerfData(data: NewProductNPI, pogScenerioID: PogScenerioID): Observable<{ item: ProductType, perfData: PerfData[], key: any }> {
    return this.addProductsNPIs([data], pogScenerioID)
      .pipe(map(({ Data, Log }) => {
        const item = Object.keys(Data).filter(key => Data[key].UPC).map(key => ({ key, item: Data[key] }))[0];
        if (!item) {
          if (Log.Summary.Error > 0) {
            throw new Error(Log.Details[0].Message);
          } else {
            throw new Error('Unknown Error');
          }
        }
        return { ...item, perfData: Data.PerfData };
      }))
  }


}
