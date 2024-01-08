import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ColDef } from 'ag-grid-community';
import { Observable } from 'rxjs';
import { IApiResponse, apiEndPoints, ShelfPowerBiReport } from 'src/app/shared/models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';

@Injectable({
  providedIn: 'root'
})
export class ShelfPowerbiReportsService {
  public data: ShelfPowerBiReport;
  constructor(private readonly http: HttpClient, private readonly envConfig: ConfigService) { }

  public getPoerbiReportData(): Observable<IApiResponse<Array<ShelfPowerBiReport>>> {
    return this.http.get<IApiResponse<Array<ShelfPowerBiReport>>>(
      `${this.envConfig.shelfapi}${apiEndPoints.apiToGetPowerBiReports}`,
    );
  }
}


