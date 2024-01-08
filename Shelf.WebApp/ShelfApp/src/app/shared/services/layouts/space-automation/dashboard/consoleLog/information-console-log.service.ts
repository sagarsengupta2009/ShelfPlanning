import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LocalStorageService } from 'src/app/framework.module';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { LogsDataObject, PromoteLog, LogsListItem, LogStatus } from 'src/app/shared/models';
import { PaBroadcasterService, ParentApplicationService } from 'src/app/shared/services';

declare const window: any;

@Injectable({
  providedIn: 'root'
})
export class InformationConsoleLogService {

  public infoConsoleLogEvent: BehaviorSubject<object> = new BehaviorSubject<object>(null);
  public logUpdatedEvent: BehaviorSubject<object> = new BehaviorSubject<object>(null);

  private logObjectList: LogsDataObject = {};
  public log: any = {};
  constructor(
    private readonly localStorage: LocalStorageService,
    private readonly paBroadcast: PaBroadcasterService,
    private readonly parentApp: ParentApplicationService
  ) { }

  // using this method to set both client and sever log
  public setClientLog(detail: LogsListItem[], group: number | string): void {
    if (detail.length > 0) {
      if (detail[0].noLogs) {
        if (this.logObjectList.hasOwnProperty(group)) {
          this.deleteLogs(group, detail[0].SubType)
        }
      } else {
        if (this.logObjectList.hasOwnProperty(group)) {
          this.resetGroup(detail, group);
        } else {
          this.setGroup(group);
        }
        this.logError();

        //when empty array is not passed
        detail.forEach((item) => {
          this.setLog(item);
          if (this.logObjectList[group].Status.hasOwnProperty("Details")) {
            this.logObjectList[group].Status.Details.push(item);
          }
        });
        if (!(this.logObjectList[group].Status.hasOwnProperty("Details"))) {
          this.logObjectList[group].Status = Object.assign({}, this.log);
        }
        if (this.log.Result == -1) {
        }
        this.logUpdatedEvent.next({ obj: 'autoOpen' })
      }

      if (this.parentApp.isAllocateApp) {
       this.paBroadcast.updateInfoConsole(this.logObjectList);
      }
    }
  }

  public resetAllLog() {
    this.logObjectList = {};
  }

  //fetch all log stored in the logList Object
  public getAllConsoleLog(): LogsDataObject {
    return this.logObjectList;
  }

  public getSavedBrightness(): string {
    return this.localStorage.getValue(LocalStorageKeys.CONSOLE_BRIGHTNESS) || 'none';
  }
  public savedBrightness(value: string): void {
    this.localStorage.setValue(LocalStorageKeys.CONSOLE_BRIGHTNESS, value);
  }


  //update isoverrideable Br logs
  public updateLog(data: PromoteLog, checked: boolean): void {
    if (data.IdPog in this.logObjectList) {
      this.logObjectList[data.IdPog].Status.Details.forEach((item, ky) => {
        if (data.Code == item.Code) {
          this.logObjectList[data.IdPog].Status.Details[ky].IsCheck = checked;
        }
      });
    }
  }

  public deleteLog(log: LogsListItem): void {
    const index = this.logObjectList[log.PlanogramID].Status?.Details?.findIndex(item =>
      item.Message === log.Message &&
      item.Option.$id === log.Option.$id &&
      item.Option.$sectionID === log.Option.$sectionID &&
      item.Option.Group === log.Option.Group);
    this.logObjectList[log.PlanogramID].Status?.Details?.splice(index);
  }

  //calculate the difference between Log time and current Time
  public calculateTimeElapsed(logTime: Date): number {
    let now = new Date();
    let past = new Date(logTime);
    let timeDiff = Math.abs(now.getTime() - past.getTime());
    timeDiff = timeDiff / (1000 * 60)
    return timeDiff;
  }

  public updateInfomationConsoleLog(param: LogsListItem): void {
    this.infoConsoleLogEvent.next(param);
    if (this.parentApp.isAllocateApp) {
      this.paBroadcast.updateInfoConsole(param);
    }
  }
  //creating new group
  private setGroup(group: number | string): void {
    this.logObjectList[group] = {
      Status: <LogStatus>{},
      Timestamp: new Date().getTime()
    };
  }

  private deleteLogs(group: number | string, subType: string | number): void {
    let ischanged = false;
    for (let key in this.logObjectList) {
      let item = this.logObjectList[key];
      if (key == group) {
        if (item.Status) {
          for (let i = item.Status.Details.length - 1; i >= 0; i--) {
            if (item.Status.Details[i].SubType == subType) {
              item.Status.Details.splice(i, 1);
              ischanged = true;
            }
          }
        }
      }
    };
    if (ischanged) {
      this.logUpdatedEvent.next({ obj: false })
    }
  }

  // replace log of same subType and group
  private resetGroup(detail: LogsListItem[], group: number | string): void {
    let deleteBr = false;
    detail.forEach((value) => {
      if (!value.IsClientSide) {
        deleteBr = true;
      }
    });
    for (let key in this.logObjectList) {
      if (key == group) {
        if (detail.length > 0) {
          if (this.logObjectList[key].Status) {
            for (let i = this.logObjectList[key].Status.Details.length - 1; i >= 0; i--) { //TODO: why we are looping in reverse order, is there any specific reason?
              let keepGoing = true;

              const duplicateLog = detail.filter(itm => this.logObjectList[key].Status.Details[i].Option?.$id == itm.Option?.$id);
              if (duplicateLog.length > 0) {
                duplicateLog[0].earlier = true;
              }

              if (this.logObjectList[key].Status.Details[i].Type == 3) {
                if (deleteBr) {
                  this.logObjectList[key].Status.Details.splice(i, 1);
                }
              } else {
                detail.forEach((value) => {
                  if (keepGoing) {
                    if (this.logObjectList[key].Status.Details[i].SubType == value.SubType) {
                      this.logObjectList[key].Status.Details.splice(i, 1);
                      keepGoing = false;
                    }
                  }
                });
              }
            }
          }
        }
      }
    }
  }

  private logError(): void {
    this.log.User = '';
    this.log.Summary = {
      'Error': 0,
      'Information': 0,
      'Warning': 0
    };
    this.log.settings = {
      'error': true,
      'information': false,
      'warning': false,
      'count': 0
    };
    this.log.Result = -1;
    this.log.Details = [];
  }

  private setLog(config: LogsListItem): void {
    let detailTemplate = {
      'Code': '',
      'Message': '',
      'Source': '',
      'StackTrace': '',
      'Type': '',
      'Option': {}
    };

    let detail = Object.assign(detailTemplate, config);
    this.log.Details.push(detail);
    this.setSummary();
  }

  private setSummary(): void {
    let infoC = 0;
    let warnC = 0;
    let errorC = 0;
    this.log.Details.forEach((item) => {
      switch (item.Type) {
        case -1:
          errorC++;
          break;
        case 0:
          warnC++;
          break;
        case 1:
          infoC++;
          break;
      }
      if (item.SubType) {
        if (item.SubType == 6) {
          errorC++;
        }
      }
    });

    this.log.Summary.Error = errorC;
    this.log.Summary.Information = infoC;
    this.log.Summary.Warning = warnC;
    if (errorC > 0) {
      this.log.Result = -1;
    } else if (warnC > 0) {
      this.log.Result = 0;
    } else if (infoC > 0) {
      this.log.Result = 1;
    }
  }

  public clearPlanogramLog(idPog: number):void {
    delete this.logObjectList[idPog?.toString()];
  }

}
