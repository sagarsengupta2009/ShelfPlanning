import { Component, OnInit, Inject, OnDestroy } from '@angular/core';
import { KednoGridConfig } from 'src/app/shared/models/kendoGrid';
import {
  PlanogramHelperService,
  HistoryService,
  SharedService,
  UserPermissionsService,
  AgGridHelperService,
  ReportandchartsService,
  PlanogramStoreService,
  ParentApplicationService,
  NotifyService,
  LanguageService,
} from 'src/app/shared/services';
import { TranslateService } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { filter, find, cloneDeep } from 'lodash-es';
import { FeedbackData, HistoryFeedbackData } from 'src/app/shared/models';
import { ExecStatusValue } from 'src/app/shared/models/MessageBoard';
import { Section } from 'src/app/shared/classes';
import { IntlService } from '@progress/kendo-angular-intl';
import { AppConstantSpace } from 'src/app/shared/constants';
import { GridConfig } from 'src/app/shared/components/ag-grid/models';
declare const window;

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.component.html',
  styleUrls: ['./feedback.component.scss'],
})
export class FeedbackComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription = new Subscription();
  public pogName: string;
  public pogid: number;
  public feedbackData: FeedbackData;
  public isStoreAvailable: boolean = true;
  private status = { doNotExecute: false };
  private feedbackHistory: HistoryFeedbackData[];
  public feedbackSelectedStore: number;
  public storeEffectiveDate: string;
  public selectedTrafficFlow: string;
  public executionStatus: number;
  public rejectionStatus: string;
  public ExecNote: string;
  public RejectReasonPermission: boolean = false;
  public disableExecDropDown: boolean = false;
  public disableRejectDropdown: boolean = false;
  public SchematicRequestEnabled: number;
  private IsSendEmail: boolean;
  public disableFeedbackPermission: boolean;
  public changeExecStatusPermission: boolean;
  public isTFPermission: boolean;
  public trafficFlowSettings: boolean = false;
  public rejectReasonBlock: boolean;
  public ShowHistory = false;
  public reportGridConfig: GridConfig;
  private skeletonFormat: string;
  private skeletonHourFormat: string;

  constructor(
    private readonly planogramStore: PlanogramStoreService,
    private readonly planogramHelper: PlanogramHelperService,
    private readonly history: HistoryService,
    private readonly sharedService: SharedService,
    private readonly parentApp: ParentApplicationService,
    private readonly userPermissions: UserPermissionsService,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly translate: TranslateService,
    private readonly reportService: ReportandchartsService,
    private readonly notifyService: NotifyService,
    private readonly dialog: MatDialogRef<FeedbackComponent>,
    private readonly intl: IntlService,
    private readonly languageService: LanguageService,
    @Inject(MAT_DIALOG_DATA) private readonly data,
  ) { }

  public ngOnInit(): void {
    this.skeletonHourFormat = " " + this.languageService.getTimeFormat();
    this.skeletonFormat = this.languageService.getDateFormat() + this.skeletonHourFormat;
    this.checkRejectReasonPermission();
    this.getPogSettings();
    this.checkFeedbackPermission();
    this.checkExecStatus();
    this.getFeedbackData();
  }

  public ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  public get checkvmode(): string {
    return this.sharedService.vmode;
  }

  private createGrid(): void {
    this.bindgriddata(this._prepareModel());
  }

  private bindgriddata(data: HistoryFeedbackData[]): void {
    this.reportGridConfig = {
      ...this.reportGridConfig,
      id: 'feedback_Grid',
      columnDefs: this.agGridHelperService.getAgGridColumns('feedback_Grid'),
      data,
      height: 'calc(100vh - 35em)',
      rowHeight: 60
    };
  }

  private _prepareModel(): HistoryFeedbackData[] {
    let preparedData = [];
    this.feedbackHistory.forEach((value, key) => {
      if (value.ExecStatus == ExecStatusValue.Incomplete) {
        this.feedbackHistory[key].executionStatusName = 'Incomplete';
      } else if (value.ExecStatus == ExecStatusValue.Pending) {
        this.feedbackHistory[key].executionStatusName = 'Pending';
      } else {
        this.feedbackHistory[key].executionStatusName = 'Implemented';
      }
      if (value.IdStore == this.feedbackSelectedStore) {
        preparedData.push(value);
      }
    });
    return preparedData;
  }

  public changeTrafficFlow(): void {
    let sectionId;
    let currObj;
    if (!sectionId) {
      let sectionId = this.sharedService.getActiveSectionId();
      if (sectionId && sectionId != '') currObj = this.sharedService.getObject(sectionId, sectionId);
    }
    let dataToPost = {
      IDPOG: this.pogid,
      IdStore: this.feedbackSelectedStore,
      TrafficFlow: this.selectedTrafficFlow,
    };
    let modulars = this.sharedService.getAllModulars(currObj);
    if (currObj?.LKTraffic != this.selectedTrafficFlow) {
      this.subscriptions.add(
        this.reportService.UpdateStorePogTrafficFlow(dataToPost).subscribe((res) => {
          this.history.startRecording();
          if (modulars.length) {
            this.planogramHelper.sectionFlipWithModulars(currObj);
          } else if (
            currObj.getAllStandardShelfs().length ||
            currObj.getAllPegboards().length ||
            currObj.getAllCrobars().length ||
            currObj.getAllSlotwalls().length
          ) {
            this.planogramHelper.sectionFlipWithoutModulars(currObj);
          }
          currObj.LKTraffic = parseInt(this.selectedTrafficFlow);
          this.planogramStore.appSettings.StoreTF = this.selectedTrafficFlow;
          currObj.applyRenumberingShelfs();
          this.history.stopRecording();
          this.closeTrafficFlowEditor();
        }),
      );
    }
  }

  public postFeedback(): void {
    if (!this.ExecNote) {
      this.notifyService.warn('FB_FEEDBACK_COMMENTS');
      return;
    }
    if (this.executionStatus != -1 || !this.RejectReasonPermission) {
      this.rejectionStatus = '';
    }
    let dataToPost = {
      IdPog: this.pogid,
      IdStore: this.feedbackSelectedStore,
      ExecStatus: this.executionStatus,
      DoNotExecute: this.status.doNotExecute,
      RejReason: this.rejectionStatus,
      ExecNote: this.ExecNote,
      IsSendEmail: this.IsSendEmail,
      ScenarioId: this.planogramStore.scenarioId,
    };
    this.subscriptions.add(
      this.reportService.CreateFeedback(dataToPost).subscribe((res) => {
        if (res && res.Log.Summary.Error) {
          this.notifyService.error(res.Log.Details[0].Message);
        } else {
          this.notifyService.success('FB_FEEDBACK_POSTED_SUCCESSFULLY');
          this.dialog.close();
        }
        if (this.sharedService.vmode) {
          window.parent.insertFeedback();
        }
      }),
    );
  }

  public closeTrafficFlowEditor(): void {
    this.trafficFlowSettings = false;
    this.ShowHistory = false;
  }

  public showHistoryFeedback(): void {
    this.createGrid();
    this.ShowHistory = true;
  }

  public changeRejectReason(): void {
    this.setSchematicRequest();
  }

  public resetStoreFeedback(): void {
    let dataToPost = {
      IdPog: this.pogid,
      IdStore: this.feedbackSelectedStore,
    };
    this.subscriptions.add(
      this.reportService.ResetFeedback(dataToPost).subscribe((res) => {
        if (res && res.Log.Summary.Error) {
          this.notifyService.error(res.Log.Details[0].Message);
        } else {
          this.feedbackData.Feedbacks.forEach((value, key) => {
            if (value.IdStore == this.feedbackSelectedStore) {
              this.feedbackData.Feedbacks[key].ExecBy = null;
              this.feedbackData.Feedbacks[key].ExecStatus = 0;
              this.feedbackData.Feedbacks[key].ExecutedOn = null;
              this.feedbackData.Feedbacks[key].RejReason = null;
            }
          });
          this.executionStatus = this.setExecutionSatus();
          this.rejectionStatus = this.setRejectionStatus();
          this.ExecNote = this.setExecNote();
        }
      }),
    );
  }

  // TODO: convert to field
  public get permissionToReset(): boolean {
    return this.userPermissions.hasReadPermission('POGFEEDBACKSTSRESET');
  }

  public get ShowReset(): boolean {
    let showReset = false;
    if (this.feedbackData) {
      this.feedbackData.Feedbacks.forEach((value) => {
        if (value.IdStore == this.feedbackSelectedStore) {
          let status = value.ExecStatus;
          if (status == 1 || status == -1) {
            showReset = true;
          }
        }
      });
    }
    return showReset;
  }

  public get disableTraficFlowDropDown(): string {
    this.isTFPermission = this.userPermissions.hasUpdatePermission('POGFEEDBACKTF');
    return (this.sharedService.vmode && this.isTFPermission) ? '' : 'disabled';
  }

  public showTrafficFlowEditor(): void {
    if (this.sharedService.vmode && this.isTFPermission) {
      this.trafficFlowSettings = true;
    }
  }

  public changeStore(): void {
    this.feedbackData.Store.forEach((value) => {
      if (value.IdStore == this.feedbackSelectedStore) {
        const effectiveDate = new Date(new Date(value.EffectiveDate).toDateString());
        this.storeEffectiveDate = this.intl.formatDate(effectiveDate, this.skeletonFormat);
      }
    });
    this.executionStatus = this.setExecutionSatus();
    this.rejectionStatus = this.setRejectionStatus();
    this.ExecNote = this.setExecNote();
    this.status.doNotExecute = false;
  }

  public changeExecution(): void {
    if (this.executionStatus == -1 && this.RejectReasonPermission) {
      this.rejectReasonBlock = true;
    } else {
      this.rejectReasonBlock = false;
    }
  }

  private setSchematicRequest(): void {
    this.feedbackData.RejectStatus.forEach((item) => {
      if (this.rejectionStatus == item.value) {
        this.SchematicRequestEnabled = item.intschreq;
        if (this.SchematicRequestEnabled == null) {
          this.SchematicRequestEnabled = 0;
        }
      }
    });
  }

  private setExecNote(): string {
    let message = '';
    this.feedbackData.Feedbacks.forEach((value) => {
      if (value.IdStore == this.feedbackSelectedStore) {
        message = value.ExecNote;
        if (message == null) {
          message = '';
        }
      }
    });
    return message;
  }

  private setRejectionStatus(): string {
    let status = '';
    this.feedbackData.Feedbacks.forEach((value) => {
      if (value.IdStore == this.feedbackSelectedStore) {
        status = value.RejReason;
        if (status == null || status == '') {
          status = this.feedbackData.RejectStatus[0].value;
        }
      }
    });
    return status;
  }

  private setExecutionSatus(): number {
    let status: number;
    this.feedbackData.Feedbacks.forEach((value) => {
      if (value.IdStore == this.feedbackSelectedStore) {
        status = value.ExecStatus;

        if (status == -1 && this.RejectReasonPermission) {
          this.rejectReasonBlock = true;
        } else {
          this.rejectReasonBlock = false;
        }
        if (status == 1 || status == -1) {
          this.disableExecDropDown = true;
          this.disableRejectDropdown = true;
        } else {
          this.disableExecDropDown = false;
          this.disableRejectDropdown = false;
        }
      }
    });
    return status;
  }

  private getFeedbackData(): void {
    this.pogName = this.data.pogName;
    this.pogid = this.data.idpog;
    this.subscriptions.add(
      this.reportService.GetFeedbackData(this.data.idpog).subscribe((res) => {
        if (res && res.Log.Summary.Error) {
          this.notifyService.error(res.Log.Details[0].Message);
        } else {
          let feedbackObject: FeedbackData = res.Data;
          if (feedbackObject.Store.length) {
            this.isStoreAvailable = true;
            this.status.doNotExecute = false;
            this.feedbackData = feedbackObject;
            this.feedbackData.ExecStatus.splice(0, 0, {
              idExec: 0,
              name: this.translate.instant('SELECT_STATUS'),
            });
            this.feedbackHistory = feedbackObject.HistoryFeedback;
            if (this.sharedService.vmode) {
              this.feedbackSelectedStore = this.parentApp.idStore;
              this.feedbackData.Store.forEach((value) => {
                if (value.IdStore == this.parentApp.idStore) {
                  const effectiveDate = new Date(new Date(value.EffectiveDate).toDateString());
                  this.storeEffectiveDate = this.intl.formatDate(effectiveDate, this.skeletonFormat);
                }
              });
            } else {
              this.feedbackSelectedStore = this.feedbackData.Store[0].IdStore;
              const effectiveDateTime = this.feedbackData.Store[0].EffectiveDate;
              const effectiveDate = new Date(new Date(effectiveDateTime).toDateString());
              this.storeEffectiveDate = this.intl.formatDate(effectiveDate, this.skeletonFormat);
            }
            if (this.planogramStore.appSettings.StoreTF) {
              this.selectedTrafficFlow = this.planogramStore.appSettings.StoreTF.toString();
            } else {
              let activeSectionId = this.sharedService.getActiveSectionId();
              if (activeSectionId && activeSectionId != '') {
                let selectedObj = this.sharedService.getObject(activeSectionId, activeSectionId) as Section;
                this.selectedTrafficFlow = selectedObj.LKTraffic.toString();
              } else {
                this.selectedTrafficFlow = '1';
              }
            }
            this.executionStatus = this.setExecutionSatus();
            this.rejectionStatus = this.setRejectionStatus();
            this.ExecNote = this.setExecNote();
            this.setSchematicRequest();
          } else {
            this.isStoreAvailable = false;
          }
        }
      }),
    );
  }

  private checkRejectReasonPermission(): void {
    this.RejectReasonPermission = this.userPermissions.hasUpdatePermission('POG_FEEDBACK_REJ_REASON');
  }

  public getPogSettings = (): void => {
    this.IsSendEmail = find(this.planogramStore.appSettings.allSettingsObj.GetAllSettings.data, {
      KeyName: 'TURN_ON_SEND_EMAIL',
    }).KeyValue;
  };

  private checkFeedbackPermission(): void {
    this.disableFeedbackPermission = !this.userPermissions.hasUpdatePermission('POGFEEDBACK');
  }

  private checkExecStatus(): void {
    this.changeExecStatusPermission = !this.userPermissions.hasUpdatePermission('POG_EXEC_STATUS');
  }

  public closeDialog(): void {
    this.dialog.close();
  }
}
