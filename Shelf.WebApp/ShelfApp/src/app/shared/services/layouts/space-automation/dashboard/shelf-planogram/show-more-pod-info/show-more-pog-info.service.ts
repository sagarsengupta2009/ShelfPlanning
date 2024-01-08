import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

import { IApiResponse, PlanogramStore,apiEndPoints } from 'src/app/shared/models';
import { ConfigService } from '../../../../../common/configuration/config.service';


@Injectable({
  providedIn: 'root'
})
export class ShowMorePogInfoService {

  constructor(private readonly http: HttpClient,
              private readonly envConfig: ConfigService) { }

  public getPlanogramProperties(idPog: string): Observable<IApiResponse<PlanogramStore[]>> {
    return this.http.get<IApiResponse<PlanogramStore[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getPogLibraryInfo}${idPog}`
    );
  }

}
