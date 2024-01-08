import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { IApiResponse } from '../../../../../../models/apiResponseMapper';
import {
  ReportData, ReportList, ReportStoreList,
  AttachmentList,  FeedbackData, NewMessageData, DisscussionData,
  Planograms, apiEndPoints
} from 'src/app/shared/models';
import { ConfigService } from 'src/app/shared/services/common/configuration/config.service';
import { GetReportTemplateParameters } from 'src/app/shared/models/print';

@Injectable({
  providedIn: 'root'
})
export class ReportandchartsService {
  public currentPlanogramData: any;
  public selectedIndex = 0;
  constructor(private http: HttpClient,
              private readonly envConfig: ConfigService) { }

  public getReport = (id): Observable<IApiResponse<ReportData[]>> => {
    return this.http.get<IApiResponse<ReportData[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.refreshList}${id}`
    );
  }

  public getReportList = (): Observable<IApiResponse<ReportList[]>> => {
    return this.http.get<IApiResponse<ReportList[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getReportList}`
    );
  }

  public getStoreList = (pogID): Observable<IApiResponse<ReportStoreList[]>> => {
    return this.http.get<IApiResponse<ReportStoreList[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getStoreList}${pogID}`
    );
  }

  public getReportTemplateParameters = (reportId: number): Observable<IApiResponse<GetReportTemplateParameters[]>> => {
    return this.http.get<IApiResponse<GetReportTemplateParameters[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getReportTemplateParameter}${reportId}`
    );
  }

  public deleteReport = (reportId: number): Observable<IApiResponse<any>> => {
    return this.http.get<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${apiEndPoints.deleteReport}${reportId}`
    );
  }

  public refreshReportRow = (reportId: number): Observable<IApiResponse<ReportData>> => {
    return this.http.get<IApiResponse<ReportData>>(
      `${this.envConfig.shelfapi}${apiEndPoints.apiToGetReportInfo}${reportId}`
    );
  }

  public reportGenerate = (postObj): Observable<IApiResponse<ReportData[]>> => {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<ReportData[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.generate}`, postObj, {headers}
    );
  }



  // for attachment screen

  public getAttachmentList = (pogId: number): Observable<IApiResponse<AttachmentList[]>> => {
    return this.http.get<IApiResponse<AttachmentList[]>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getAttachment}${pogId}`
    );
  }

  public deleteAttachment = (postObj): Observable<IApiResponse<any>> => {
    return this.http.post<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${apiEndPoints.attachmentMarkedAsDelete}`, postObj
    );
  }

  public uploadAttachment = (form): Observable<IApiResponse<AttachmentList>> => {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<AttachmentList>>(`${this.envConfig.shelfapi}${apiEndPoints.postAttachment}`, form, {headers});
  }


  // for feedback screen
  public GetFeedbackData = (id: number): Observable<IApiResponse<FeedbackData>> => {
    return this.http.get<IApiResponse<FeedbackData>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getFeedbackData}${id}`
    );
  }
  public ResetFeedback = (postObj): Observable<IApiResponse<any>> => {
    return this.http.post<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${apiEndPoints.resetFeedback}`, postObj
    );
  }
  public UpdateStorePogTrafficFlow = (postObj): Observable<IApiResponse<any>> => {
    return this.http.post<IApiResponse<any>>(
      '/api/planogram/UpdateStorePogTrafficFlow', postObj
    );
  }
  public CreateFeedback = (postObj): Observable<IApiResponse<any>> => {
    return this.http.post<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${apiEndPoints.createFeedback}`, postObj
    );
  }

  //appendScreen

  public SendAppendSectionPog = (postObj): Observable<IApiResponse<Planograms[]>> => {
  return this.http.post<IApiResponse<Planograms[]>>(
      'api/planogram/AppendPogs', postObj
    );
  }


  public prepareColumnsList(columns) {
    return columns.map(item => {
      return {
        iconName: item['iconName'] ? item['iconName'] : '',
        headerType: item['headerType'] ? item['headerType'] : '',
        field: item['field'],
        title: item['title'],
        width: item[8] ? item[8] : 100,
        format: item[10] === `number | float` ? `{0:n}` : null,
        type: item['type'] ? item['type'] : 'string',
        editable: false,
        filterable: {
          multi: true,
          search: true
        },
        groupable: false,
        groupOrder: item[6] ? item[7] : 0,
        hidden: false,
        isactive: true,
        locked: false,
        orderIndex: item[2],
        description: item[11] ? item[11] : ``,
        sortable: { initialDirection: item[12] !== `` ? item[12] : null },
        style: '',
        sortorder: item[12] !== `` ? item[16] : 0,
        columnMenu: item[`columnMenu`] ? item[`columnMenu`] : true,
        templateDummy: item['templateDummy'] ? item['templateDummy'] : '',
        IsMandatory: item[`IsMandatory`] !== undefined ? item[`IsMandatory`] : true,
        ProjectType: item[`ProjectType`] ? item[`ProjectType`].split(`,`) : [`*`]
      };


    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class DiscussionService {

  public rootFlags: any = {}
  constructor(private http: HttpClient,
    private readonly envConfig: ConfigService
    ) { }

  initByPogId = (pogid) => {
    this.rootFlags[pogid] = {};
    this.rootFlags[pogid].isApiCalled = false;
    this.rootFlags[pogid].commentData = [];
  }

  public getDiscussionThread = (PogID: number): Observable<IApiResponse<DisscussionData>> => {
    return this.http.get<IApiResponse<DisscussionData>>(
      `${this.envConfig.shelfapi}${apiEndPoints.getDiscussion}` + '?idpog=' + PogID
    );
  }
  public createDiscussionThread = (formData): Observable<IApiResponse<NewMessageData>> => {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<NewMessageData>>(
      `${this.envConfig.shelfapi}${apiEndPoints.createDiscussion}`, formData, {headers}
    );
  }
  public updateDiscussionThread = (postObj): Observable<IApiResponse<any>> => {
    let headers = new HttpHeaders();
    headers = headers.append('skipSuccessMsg', 'true');
    return this.http.post<IApiResponse<any>>(
      `${this.envConfig.shelfapi}${apiEndPoints.updateDiscussionLike}`, postObj, {headers}
    );
  }

}
