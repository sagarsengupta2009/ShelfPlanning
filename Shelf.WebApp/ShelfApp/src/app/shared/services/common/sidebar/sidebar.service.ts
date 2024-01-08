import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { apiEndPoints, IApiResponse } from 'src/app/shared/models';
import { SidebarMenu } from 'src/app/shared/models/sidebarmenu';
import { CorpDetail } from 'src/app/shared/models/sa-dashboard/corp-detail';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {

  constructor(private readonly httpClient: HttpClient) { }

  public appMenu():Observable<IApiResponse<SidebarMenu>>{
    return this.httpClient.get<IApiResponse<SidebarMenu>>(apiEndPoints.apiToGetSideMenu);
  }

  public getCorpDetails():Observable<CorpDetail>  {
    return this.httpClient.get<CorpDetail>(apiEndPoints.apiToGetCorpDetail);
  }
}
