import { Injectable, NgZone } from '@angular/core';
import {
    HttpInterceptor,
    HttpHandler,
    HttpRequest,
    HttpClient,
    HttpEvent,
    HttpResponse,
    HttpErrorResponse,
} from '@angular/common/http';
import { finalize, catchError, retryWhen, tap, map } from 'rxjs/operators';
import { OnlineOfflineService } from '../services/common/onlineoffline/online-offline.service';
import Dexie from 'dexie';
import { UUID } from 'angular2-uuid';
import { NgxSpinnerService } from 'ngx-spinner';
import { throwError, Observable, Subject, of } from 'rxjs';
import { SharedService } from '../services/common/shared/shared.service';
import { genericRetryStrategy } from './genericRetryStrategy';
import { ConsoleLogService } from 'src/app/framework.module';
import { InformationConsoleLogService, NotifyService, ParentApplicationService } from '../services';
import { SpinnerService, UserService } from '../services/common';
declare const window: any;

// Not exporting, as this interface is added for code readability & it is not used outside this file
interface HttpRequestDetails {
    id: string;
    url: string;
    body: any; // Hanldes varying object types, hence type any.
}

@Injectable({
    providedIn: 'root',
})
export class InterceptorService implements HttpInterceptor {
    private indexDb: any;
    private apiCount: number = 0;
    private ignoreSpinner: boolean = false;
    private requestArray: HttpRequest<any>[] = [];

    constructor(
        private readonly httpClient: HttpClient,
        private readonly notifyService: NotifyService,
        private readonly sharedService: SharedService,
        private readonly onlineOfflineService: OnlineOfflineService,
        private readonly spinner: SpinnerService,
        private readonly zone: NgZone,
        private readonly log: ConsoleLogService,
        private readonly informationConsoleLogService: InformationConsoleLogService,
        private readonly parentApp: ParentApplicationService,
        private readonly userService: UserService
    ) {
        this.registerToEvents(onlineOfflineService);
    }

    public intercept(request: HttpRequest<any>, next: HttpHandler) {
        if (this.onlineOfflineService.isOnline) {
          //let requestQue = request;
          let requestQue = request.clone({
            headers: request.headers
                .set('UserId', this.userService?.userId || '')
                .set('i2eTKey', this.userService?.tkey || '')
                .set('IDCorp', this.userService.iDCorp?.toString() || '')
          });
        this.updateLoader(true, request);

          if (request.method === 'POST') {
              this.requestArray.push(requestQue);
          }
            return next.handle(requestQue).pipe(
                map((event:HttpEvent<any>) => {
                  return this.checkResponse(event);
                }),
                tap((event: HttpEvent<any>) => {
                    return this.responseHandler(event);
                }),
                retryWhen(
                    genericRetryStrategy({
                        scalingDuration: 1000,
                        StatusCodes: [503],
                    }),
                ),

                catchError((error: HttpErrorResponse) => {
                    return this.errorHandler(error);
                }),

                finalize(() => {
                    this.updateLoader(false);
                }),
            );
        } else {
          // TODO @karthik offline mode yet to steup
            // const reqInfo: HttpRequestDetails = {
            //     id: UUID.UUID(),
            //     url: request.url,
            //     body: request.body,
            // };
            // this.createDatabase(reqInfo);
            // this.addToIndexedDb(reqInfo);
        }
    }
    /**
     * The API sends a 200 status even for Failed APIs.
     * Below method checks if there was an failure and updates status accordingly.
     */
    private checkResponse(event): HttpEvent<any> {
      if (event instanceof HttpResponse && event.status === 200 && event.body?.Log?.Summary?.Error > 0) {
        throw new HttpErrorResponse({status: 500, statusText: event.body.Log.Details[0].Message, url: event.url});
      }
      return event;
    }

    private responseHandler(event): HttpEvent<any> | Observable<never> {
        if (event instanceof HttpResponse) {
            const requestIndex = this.requestArray.findIndex((x) => x.url === event.url);
            const reqHeaders = requestIndex > -1 ? this.requestArray[requestIndex].headers : null;
            if (event.status === 200 && reqHeaders && (reqHeaders.get('ignoreLoader') !== 'true' && reqHeaders.get('skipSuccessMsg') !== 'true')) {
                if (!event.body.status || event.body === `Success` || event.body.status === 'Success') {
                    this.zone.run(() => {
                        this.notifyService.success('SAVED_SUCCESSFULLY', 'GOT IT!');
                    });
                }
            }
        }
        return event;
    }

    private errorHandler(error: HttpErrorResponse) {
        let errorMessage = '';
        if (error.error instanceof ErrorEvent) {
            // client-side error
            errorMessage = `Error: ${error.error.message}`;
        }
        else if (error?.error?.['Message'] && error?.status === 500) {

            // client-side generic error
            errorMessage = `Error: ` + error.error['Message'];
        } else {
            // server-side error
            let message = error?.error?.Log?.Details[0]?.Message;
            if (!message && error?.status === 500) {
                message = error?.statusText;
            }
            if (message) {
                errorMessage = `${message} \n`;
            }
        }
          
        if(this.parentApp.isAssortAppInIAssortNiciMode) {
            this.notifyService.error(errorMessage, 'GOT IT!');
        } else {
            this.notifyService.error('GENERIC_API_FAILURE', 'GOT IT!');  
        }

        const requestIndex = this.requestArray.findIndex((x) => error.url.endsWith(x.url));
        let code = requestIndex > -1 ? this.requestArray[requestIndex].headers.get('logCode') : '';
        this.informationConsoleLogService.updateInfomationConsoleLog({
            Type: 'E',
            Code: code,
            Message: errorMessage,
        });
        return throwError(errorMessage);
    }

    private registerToEvents(onlineofflineService: OnlineOfflineService) {
        onlineofflineService.connectionChanged.subscribe((online) => {
            if (online) {
                this.sendItemsFromIndexedDb();
            }
        });
    }

    private createDatabase(reqInfo: HttpRequestDetails) {
        this.indexDb = new Dexie(`ShelfPlanning`);
        const fields = Object.keys(reqInfo);
        this.indexDb.version(1).stores({
            spaceAuto: fields.join(`,`),
        });
    }

    private addToIndexedDb(items) {
        this.indexDb.spaceAuto
            .add(items)
            .then(async () => {
                const allItems: any[] = await this.indexDb.spaceAuto.toArray();
            })
            .catch((e) => {
                this.log.error('Error: ' + (e.stack || e));
            });
    }

    private async sendItemsFromIndexedDb() {
        const allItems: any[] = await this.indexDb?.spaceAuto.toArray();
        allItems?.forEach((item) => {
            this.resendData(item.url, item.body).subscribe(() => {
                // Data posted suceesffully, deleting from indexDB.
                this.indexDb.spaceAuto.delete(item.id).then(() => {
                    this.log.info(`item ${item.id} sent and deleted locally.`);
                });
            });
        });
    }

    // Here data and return type can be varying type
    private resendData(url: string, data: any): Observable<any> {
        return this.httpClient.post(url, data);
    }

    private updateLoader(showLoader: boolean, request?: HttpRequest<any>) {

        if (showLoader) {
            if (request.headers.get('ignoreLoader') !== 'true') {
                if (this.parentApp.isAllocateApp) {
                    window.parent.displayLoader(true);
                } else {
                  this.spinner.show();
                }
            } else {
                this.ignoreSpinner = true;
            }
            this.apiCount++;
        } else {
            /** last API processed */
            if (this.apiCount === 1) {
                this.spinner.hide();
                this.ignoreSpinner = false;
                if (this.parentApp.isAllocateApp) {
                    window.parent.displayLoader(false);
                }
                /** Some API completed, if no API posted to hide loader, show loader. */
            } else if (!this.ignoreSpinner) {
                if (this.parentApp.isAllocateApp) {
                    window.parent.displayLoader(true);
                } else {
                  this.spinner.show();
                }
            } else {
                /** Some API remains to be completed, if there is an API without loader, hide loader.
                 * The Asumption here is for APIs that are hidden are long backend processes.
                 * if in between there is another API triggered, showing the loader is handled in the show loader case,
                 * and this else statement continues to hide loaders untill all APIs are complete.
                 */
                this.spinner.hide();
            }
            this.apiCount--;
            if (this.apiCount === 0) {
                this.requestArray = [];
            }
        }

    }
}
