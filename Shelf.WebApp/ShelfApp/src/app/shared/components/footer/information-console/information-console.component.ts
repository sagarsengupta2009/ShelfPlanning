import { animate, style, transition, trigger } from '@angular/animations';
import { Clipboard } from '@angular/cdk/clipboard';
import {
  Component,
  ElementRef,
  EventEmitter,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { cloneDeep, isEmpty } from 'lodash';
import { Subscription } from 'rxjs';
import {
  ConsoleInfoType,
  ConsoleObject,
  LogDataSubType,
  LogDataType,
  LogsDataObject,
  LogsInfoObject,
  LogsListItem,
  LogsListItemOption,
} from 'src/app/shared/models';
import { WorkspaceInfo } from 'src/app/shared/models/enums';
import { LogsGroupName } from 'src/app/shared/models/information-console/informationconsole';
import {
  AllocateService,
  InformationConsoleLogService,
  PanelService,
  ParentApplicationService,
  PlanogramLibraryService,
  PlanogramService,
  SharedService
} from 'src/app/shared/services';
import { ObjectListItem } from 'src/app/shared/services/common/shared/shared.service';
import { highBrightness, lowBrightness, mediumBrightness, noneBrightness } from 'src/brightness';
import { Theme } from 'src/theme';
@Component({
  selector: 'srp-information-console',
  templateUrl: './information-console.component.html',
  styleUrls: ['./information-console.component.scss'],
  encapsulation: ViewEncapsulation.None,
  animations: [
    trigger('infoConsole', [
      transition('void => *', [style({ transform: 'translateY(100%)' }), animate('300ms ease-out')])
    ])
  ]
})
export class InformationConsoleComponent implements OnInit, OnDestroy {
  @Output() countInfoLogs = new EventEmitter<LogsInfoObject>();
  @ViewChild('canvas') canvasCircle: ElementRef;
  @ViewChild('errorIndicator') errIndicatorCls: ElementRef;

  public isOpenInfoConsole: boolean;
  public logList: LogsListItem[] = [];
  public infoLogs: LogsListItem[] = [];
  public brightness: string;
  public itemViewFilter = [];
  public selectedInfoView: string = '';
  private activeBrightness: Theme = highBrightness;
  private console: ConsoleObject = {
    result: 0,
    Summary: {
      Error: 0,
      Information: 0,
      Warning: 0
    },
    settings: {
      error: true,
      information: false,
      warning: false,
      count: 0
    },
    earlier: true
  };
  private infoConsoleLogHistoryFlag: boolean;
  private selectedSectionIDPOG: number;
  private availableBrightness: Theme[] = [highBrightness, mediumBrightness, lowBrightness, noneBrightness];
  private cloneInfoLogs: LogsListItem[] = [];
  private subscriptions: Subscription = new Subscription();
  public isRunningInAllocate = false;
  constructor(
    private readonly sharedService: SharedService,
    private readonly planogramService: PlanogramService,
    private readonly translate: TranslateService,
    private readonly informationConsoleLogService: InformationConsoleLogService,
    private readonly planogramLibraryService: PlanogramLibraryService,
    private readonly clipboard: Clipboard,
    private readonly panelService: PanelService,
    private readonly allocateService: AllocateService,
    private readonly parentApp: ParentApplicationService
  ) { }


  public ngOnInit(): void {
    this.brightness = this.informationConsoleLogService.getSavedBrightness();
    this.setBrightness(this.brightness);
    this.subrcribeEvents();

    this.itemViewFilter = [
      { Type: ConsoleInfoType.ALL, Value: this.translate.instant('ALL') },
      { Type: ConsoleInfoType.ERROR, Value: this.translate.instant('ERROR') },
      { Type: ConsoleInfoType.WARNING, Value: this.translate.instant('WARNING') },
      { Type: ConsoleInfoType.INFORMATION, Value: this.translate.instant('INFORMATION') }
    ];

    if(this.parentApp.isAllocateApp) {
      this.isRunningInAllocate = true;
    }
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private subrcribeEvents(): void {
    this.subscriptions.add(
      this.informationConsoleLogService.infoConsoleLogEvent.subscribe((response: LogsListItem) => {
        if (response) {
          this.infoLogs.push(response);
          this.cloneInfoLogs.push(response);
          this.updateInfoLogsCount(this.infoLogs.length);
        }
      })
    );
    this.subscriptions.add(
      this.informationConsoleLogService.logUpdatedEvent.subscribe((result) => {
        if (result) {
          this.selectedSectionIDPOG = this.sharedService.getSelectedIDPOG();
          if (!isEmpty(this.informationConsoleLogService.getAllConsoleLog())) {
            this.setLog(this.informationConsoleLogService.getAllConsoleLog());
          }
        }
      })
    );

    this.subscriptions.add(
      this.planogramLibraryService.pogChangesInworkspace.subscribe((res) => {
        if (res && res === WorkspaceInfo.UNLOAD) {
          //clearing all type of errors , information for the specific pog after unload operation
          this.infoLogs = this.infoLogs.filter((item) => item.PlanogramID !== this.sharedService.selectedIDPOG);
          this.informationConsoleLogService.clearPlanogramLog(this.sharedService.selectedIDPOG);
          this.updateInfoLogsCount(this.infoLogs.length);
        }
      })
    );

    this.subscriptions.add(
      this.sharedService.isNavigatedToPogLib.subscribe((res: boolean) => {
        if (res) {
          this.clearInfoLogs();
        }
      })
    );

    this.subscriptions.add(
      this.allocateService.selectLog.subscribe((log) => {
        if (log) {
          this.showIndicatorIn2DPlanogram(log);
        }
      })
    );
  }

  public copyMessageTOClipboard(item): void {
    let typeText: string;
    switch (item.Type) {
      case ConsoleInfoType.ERROR:
        typeText = `Error`;
        break;
      case ConsoleInfoType.WARNING:
        typeText = `Warning`;
        break;
      default:
        typeText = `Information`;
        break;
    }
    const Code = item.Code ? ` CODE:${item.Code},` : '';
    this.clipboard.copy(`TYPE:${typeText},${Code} MESSAGE:${item.Message}`);
  }

  public openInformationConsole(): void {
    this.isOpenInfoConsole = true;
  }

  public closeInformationConsole(): void {
    this.isOpenInfoConsole = false;
    this.stopAnimate();
  }

  private updateInfoLogsCount(value: number): void {
    const logsDataObject = {
      count: value > 99 ? `99+` : `${value}`,
      consoleInfo: this.console,
      logs: this.infoLogs
    };
    this.countInfoLogs.emit(logsDataObject);
  }

  public clearInfoLogs(): void {
    this.infoLogs = [];
    this.cloneInfoLogs = [];
    this.updateInfoLogsCount(this.infoLogs.length);
    this.informationConsoleLogService.clearPlanogramLog(this.sharedService.selectedIDPOG);
  }

  public selectLog(item: LogsListItem): void {
    const logOption = item.Option;
    const type = item.Type;
    if (logOption) {
      if (
        logOption.Group === LogsGroupName.FitCheck ||
        logOption.Group === LogsGroupName.SpreadFacings ||
        logOption.Group === LogsGroupName.Allocation ||
        logOption.Group === LogsGroupName.Orientation
      ) {
        logOption.Type = type;
        this.showIndicatorIn2DPlanogram(logOption);
      }
    }
  }

  public setBrightness(brightnessMode: string): void {
    this.brightness = brightnessMode;
    this.activeBrightness = this.availableBrightness.find((x) => x.name === brightnessMode);
    Object.keys(this.activeBrightness.properties).forEach((property) => {
      document.documentElement.style.setProperty(property, this.activeBrightness.properties[property]);
    });
    this.informationConsoleLogService.savedBrightness(brightnessMode);
  }

  private setLog(log: LogsDataObject): void {
    this.logList = [];
    this.infoLogs.length = 0;
    this.cloneInfoLogs.forEach((val) => this.infoLogs.push(val));
    this.console = this.informationConsoleLogService.log;
    this.console.Summary.Error = 0;

    this.console.Summary.Information = 0;

    this.console.Summary.Warning = 0;
    this.console.earlier = true;
    let sortByTimestamp = function (a, b) {
      return a.runOnTimeStamp - b.runOnTimeStamp;
    };
    let logsObjList: LogsDataObject = cloneDeep(log);
    const sectionID = this.sharedService.getActiveSectionId();
    if (sectionID != '') {
      this.infoConsoleLogHistoryFlag = this.planogramService.rootFlags[sectionID].LogHistory.enable;
    }

    for (let key in logsObjList) {
      let item = logsObjList[key];
      if (key === 'G' || Number(key) === this.selectedSectionIDPOG) {
        if (item.Status) {
          item.Status.Details.forEach((itm, ky) => {
            itm.runOnTimeStamp = new Date(itm.RunOn).getTime();
            if (this.informationConsoleLogService.calculateTimeElapsed(itm.RunOn) < 5) {
              item.Status.Details[ky].Executed = 'Now';
            } else {
              item.Status.Details[ky].Executed = 'Earlier';
            }
            itm.TypeCode = 'dummy' + itm.Type;
            (itm.earlier === undefined || itm.earlier) &&
              this.console.earlier &&
              (this.console.earlier = itm.earlier ? true : false);
            // adding log count for Br

            if (itm.Message) {
              if (this.infoConsoleLogHistoryFlag) {
                this.logList.push(itm);
                this.displayLogs(itm);
              } else {
                if (itm.Executed === 'Now' || itm.SubType === LogsGroupName.FitCheck || itm.IsClientSide) {
                  this.logList.push(itm);
                  this.displayLogs(itm);
                }
              }
            }
            switch (itm.Type) {
              case LogDataType.ERROR:
                itm.Type = 'E';
                break;
              case LogDataType.WARNING:
                itm.Type = 'W';
                break;
              case LogDataType.INFORMATION:
                itm.Type = 'I';
                break;
            }
          }, item);
        }
      }
    }
    //we need to sort by timestamp
    this.logList.sort(sortByTimestamp);
    if (this.console.Summary.Error > 0) {
      this.console.result = -1;
    } else if (this.console.Summary.Warning > 0) {
      this.console.result = 0;
    } else if (this.console.Summary.Information > 0) {
      this.console.result = 1;
    }
    this.updateFooterIcon();

    this.logList.forEach((element) => {
      this.infoLogs.push(element);
    });
    this.updateInfoLogsCount(this.infoLogs.length);
  }

  private displayLogs(logData: LogsListItem): void {
    if (logData.Type === LogDataType.OTHERS) {
      if (logData.SubType === LogDataSubType.ERROR) {
        this.console.Summary.Error++;
      } else if (logData.SubType === LogDataSubType.WARNING) {
        this.console.Summary.Warning++;
      } else if (logData.SubType === LogDataSubType.INFORMATION) {
        this.console.Summary.Information++;
      }
    } else if (logData.Type === LogDataType.ERROR) {
      this.console.Summary.Error++;
    } else if (logData.Type === LogDataType.WARNING) {
      this.console.Summary.Warning++;
    } else if (logData.Type === LogDataType.INFORMATION) {
      this.console.Summary.Information++;
    }
  }

  private updateFooterIcon(): void {
    this.console.settings.error = false;
    this.console.settings.information = false;
    this.console.settings.warning = false;
    this.console.settings.count = 0;
    if (this.console.result === -1) {
      this.console.settings.error = true;
      this.console.settings.count = this.console.Summary.Error;
    }

    if (this.console.result === 0) {
      this.console.settings.warning = true;
      this.console.settings.count = this.console.Summary.Warning;
    }
    if (this.console.result === 1) {
      this.console.settings.information = true;
      this.console.settings.count = this.console.Summary.Information;
    }
    if (this.console.settings.count === 0) {
      this.console.settings.error = true;
      this.console.settings.warning = false;
      this.console.settings.information = false;
    }
  }

  private showIndicatorIn2DPlanogram(groupOpt: LogsListItemOption): void {
    if (
      groupOpt.Group === LogsGroupName.FitCheck ||
      groupOpt.Group === LogsGroupName.SpreadFacings ||
      groupOpt.Group === LogsGroupName.Allocation ||
      groupOpt.Group === LogsGroupName.Orientation
    ) {
      const objItemData: ObjectListItem = this.sharedService.getObject(groupOpt.$id, groupOpt.$sectionID);
      //saveing zIndex value need to assign back
      const zIndices = new Map();
      if (document.getElementById(objItemData.$id + this.panelService.activePanelID) !== null) {
        //fixture and items should come over others dynamically
        zIndices.set(objItemData.$id, this.getZIndex(objItemData.$id));
        this.setZindex(objItemData.$id, '9999');
        if (objItemData.ObjectType === 'Fixture') {
          for (let position of objItemData.Children) {
            zIndices.set(position.$id, this.getZIndex(position.$id));
            //positions should come over fixture
            this.setZindex(position.$id, '99999');
          }
        }
        this.removeZIndex(objItemData, zIndices);
        this.stopAnimate();
        this.startAnimate(groupOpt);
      }
    }
  }

private removeZIndex(pogObjectInfo: ObjectListItem, zIndexValues): void {
    setTimeout(() => {
        this.setZindex(pogObjectInfo.$id, zIndexValues.get(pogObjectInfo.$id));
        if (pogObjectInfo.ObjectType === 'Fixture') {
            for (let position of pogObjectInfo.Children) {
                this.setZindex(position.$id, zIndexValues.get(position.$id));
            }
        }
    }, 5000);
}

private getZIndex(id: string): string {
  return document.getElementById(id + this.panelService.activePanelID).style.zIndex;
}

private setZindex(id: string, zIndex: string): void {
  document.getElementById(id + this.panelService.activePanelID).style.zIndex = zIndex;
}

  startAnimate(groupOpt: LogsListItemOption) {
    let count = 0;
    let canvas = document.getElementById(groupOpt.$id + this.planogramService.getSelectedIDPOGPanelID());
    //create circle
    if (canvas && this.canvasCircle) {
      canvas.appendChild(this.canvasCircle.nativeElement);
      const HOfPosition = document.getElementById(
        groupOpt.$id + this.planogramService.getSelectedIDPOGPanelID()
      ).offsetHeight;
      const WOfPosition = document.getElementById(
        groupOpt.$id + this.planogramService.getSelectedIDPOGPanelID()
      ).offsetWidth;
      this.canvasCircle.nativeElement.style.display = 'none';
      this.canvasCircle.nativeElement.style.left = (WOfPosition / 2 - 120 / 2).toString() + 'px';
      this.canvasCircle.nativeElement.style.top = (HOfPosition / 2 - 120 / 2).toString() + 'px';
      let c = this.canvasCircle.nativeElement as HTMLCanvasElement;
      let ctx = c.getContext('2d');
      ctx.beginPath();
      ctx.arc(60, 60, 57, 0, 2 * Math.PI);
      ctx.lineWidth = 3;
      ctx.stroke();
      this.canvasCircle.nativeElement.style.display = 'block';
      this.canvasCircle.nativeElement.animate(
        [
          { transform: 'scale(2.00)' },
          { transform: 'scale(1.25)' },
          { transform: 'scale(0.75)' },
          { transform: 'scale(0.25)' },
          { transform: 'scale(0.01)' },
          { transform: 'scale(0)' }
        ],
        { duration: 500 }
      );
      this.canvasCircle.nativeElement.style.transform = 'scale(0)';
    }
    // create underline
    if (canvas && this.errIndicatorCls) {
      this.errIndicatorCls.nativeElement.className = 'error-indicator '+'errorType-' + ((groupOpt.Type == -1) ? 'error' : 'warning');
      canvas.appendChild(this.errIndicatorCls.nativeElement);
    }
    //blink underline
    const blinkTimerId = setInterval(() => {
      count++;
      if (count === 20) {
        clearInterval(blinkTimerId);
        this.stopAnimate();
      }
      let toggleerror = this.errIndicatorCls?.nativeElement;
      if (toggleerror) {
        toggleerror.classList.toggle('errorType-' + ((groupOpt.Type == -1) ? 'error' : 'warning'));
      }
    }, 150);
  }

  private stopAnimate() {
    this.errIndicatorCls?.nativeElement?.remove();
    this.canvasCircle?.nativeElement?.remove();
  }

  public deleteLog(log: LogsListItem): void {
      this.infoLogs = this.infoLogs.filter(logObj => logObj !== log);
      this.informationConsoleLogService.deleteLog(log);
      this.updateInfoLogsCount(this.infoLogs.length);
  }
}
