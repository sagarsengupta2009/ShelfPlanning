import { Component, OnDestroy, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Location } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { MatDialogRef } from '@angular/material/dialog';
import { ActionId } from 'devexpress-reporting/dx-reportdesigner'
import { IApiResponse } from 'src/app/shared/models/apiResponseMapper';
import { BusinessRulesForReport, ReportDatasources, ReportTemplateList, ReportTemplate } from 'src/app/shared/models';
import { PlanogramStoreService, SharedService } from 'src/app/shared/services';
import { ReportDesignerService } from 'src/app/shared/services/layouts';

declare const window: any;

@Component({
  selector: 'sp-report-designer',
  templateUrl: './report-designer.component.html',
  styleUrls: [
    "./report-designer.component.scss",
  ]
})
export class ReportDesignerComponent implements OnInit, OnDestroy {
  public selectedReportTemplate: ReportTemplateList;
  public selectedNewReport: ReportTemplateList;
  public reportTypeList: ReportTemplateList[] = [];
  public reportDataSource: ReportDatasources[] = [];
  public disabled: boolean = false;
  public iFrameURL: string = '';
  public selectedBusinessRule: BusinessRulesForReport;
  public businessrule: BusinessRulesForReport[] = [];
  public addNewReport: boolean;
  public buttonName: string = ReportTemplate.CREATE;
  public showBusinnessRule: boolean;
  public templateselected: boolean = true;
  public showDesigner: boolean;
  public api: string = '';
  public resourceURL: SafeResourceUrl;
  public currentRoute: string;
  private _subscriptions = new Subscription();
  public safeUrl: string;

  constructor(private readonly translate: TranslateService,
    private readonly reportDesignerService: ReportDesignerService,
    private readonly sanitized: DomSanitizer,
    private readonly router: Router,
    private readonly _location: Location,
    public readonly dialog: MatDialogRef<ReportDesignerComponent>,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
  ) {
    this._subscriptions.add(this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(event => {
      this.currentRoute = (event as NavigationStart).url
    }));
  }

  ngAfterViewInit(): void {
    this._subscriptions.add(this.reportDesignerService.showReportDesigner.subscribe((data: boolean) => {
      this.showDesigner = data;
      if (this.showDesigner === true) {
        window.ReportDesigner = {};
        window.ReportDesigner.closeReport = this.closeReport;
      }
    }))
  }

  ngOnInit(): void {
    this.fetchReportDataScource();
    this.fetchReportList();
    this.fetchBusinessRule();

    //TODO  @Amit reduce subscription from this files
    this._subscriptions.add(this.reportDesignerService.addNewTemplate.subscribe((data: boolean) => {
      this.addNewReport = data;
    }))

    this._subscriptions.add(this.reportDesignerService.showBusinessRule.subscribe((data: boolean) => {
      this.showBusinnessRule = data;
    }))

    this._subscriptions.add(this.reportDesignerService.showReportDesigner.subscribe((data: boolean) => {
      this.showDesigner = data;
    }))

    this._subscriptions.add(this.reportDesignerService.url.subscribe((url: string) => {
      this.safeUrl = url
    }))
    this.sharedService.updateSearchVisibility.next(true);
    this.mouseout();
  }

  public openReport(): void {
    if (this.selectedReportTemplate) {
      if (this.selectedReportTemplate.Name != this.translate.instant(ReportTemplate.ADD_NEW)) {
        this.reportDesignerService.addNewTemplate.next(false);
        this.reportDesignerService.showBusinessRule.next(false);
        this.templateselected = false
        this.buttonName = this.translate.instant(ReportTemplate.EDIT);

      } else {
        this.templateselected = true;
        this.buttonName = this.translate.instant(ReportTemplate.CREATE);
        this.reportDesignerService.addNewTemplate.next(true);
        this.fetchReportDataScource();

        if (this.selectedNewReport?.Name === ReportTemplate.BusinessRuleModel) {
          this.reportDesignerService.showBusinessRule.next(true);
          if (this.selectedBusinessRule.API) {
            this.templateselected = false;
          } else {
            this.templateselected = true;
          }
        } else if (typeof this.selectedNewReport?.API != ReportTemplate.undefined) {
          this.templateselected = false;// if option selected button should not be disabled
        } else {
          this.templateselected = true;
        }

      }
    }

  }

  public openNewReport(): void {
    if (this.selectedNewReport && this.selectedNewReport.Name === ReportTemplate.BusinessRuleModel) {
      this.reportDesignerService.showBusinessRule.next(true);
      this.templateselected = true;
      this.fetchBusinessRule();

    } else {
      this.reportDesignerService.showBusinessRule.next(false);
      this.templateselected = false;
    }
  }

  private fetchReportDataScource(): void {
    if (this.reportDataSource) {
      this._subscriptions.add(this.reportDesignerService.GetReportDatasources().subscribe((result: IApiResponse<ReportDatasources[]>) => {
        this.reportDataSource = result.Data;
      }))
    }
  }


  private fetchReportList(): void {
    const ADD_NEW: string = this.translate.instant(ReportTemplate.ADD_NEW);
    this._subscriptions.add(this.reportDesignerService.getReportType(true).subscribe((data: IApiResponse<ReportTemplateList[]>) => {
      this.sharedService.iSHELF.FetchreportDesignerTemplate = false;
      data.Data.unshift({ Id: -1, Name: ADD_NEW, IsCustom: true, ReportGroup: ReportTemplate.Report, IdCorp: -1, API: '', BrCode: null, CreatedBy: '', IDDataSource: -1, IsBrReport: false, IsDefault: false, ModifiedBy: '' });
      this.reportTypeList = data.Data;
    }))
  }

  private fetchBusinessRule(): void {
    if (this.businessrule.length == 0) {
      this._subscriptions.add(this.reportDesignerService.GetBusinessRuleDatasources().subscribe((data: IApiResponse<BusinessRulesForReport[]>) => {
        this.businessrule = data.Data
      }))
    }
  }


  public create(): void {
    if (this.selectedReportTemplate.API) {
      if (this.selectedReportTemplate.IsBrReport) {
        this.api = this.selectedReportTemplate.API;
      } else {
        this.api = `/Designer/GetReport/${this.selectedReportTemplate.Id}`;
      }
    } else {
      if (this.selectedNewReport.Name === ReportTemplate.BusinessRuleModel) {
        this.api = this.selectedBusinessRule.API;
      } else {
        this.api = this.selectedNewReport.API;
      }
    }

    this.resourceURL = this.sanitized.bypassSecurityTrustResourceUrl(this.api)
    this.reportDesignerService.url.next(this.resourceURL);
    this.reportDesignerService.showReportDesigner.next(true);
    this.reportDesignerService.addNewTemplate.next(false);
    this.reportDesignerService.showBusinessRule.next(false);
  }

  public openBusinessRule(): void {
    if (typeof this.selectedBusinessRule.API != ReportTemplate.undefined) {
      this.templateselected = true;
    }
    this.templateselected = false;
  }

  public closeReport = (): void => { // fat arrow is used as we are loading in an iframe
    this.templateselected = true;
    this.selectedReportTemplate = null;
    this.selectedNewReport = null;
    this.selectedBusinessRule = null;
    this.showDesigner = false;
    this.reportDesignerService.showReportDesigner.next(false);
    this.fetchReportList();
  }

  private back(): void {
    this._location.back();
  }


  public CustomizeMenuActions(event): void {
    const newreportAction = event.args.GetById(ActionId.Exit);
    if (newreportAction)
      newreportAction.visible = false;
  }

  public mouseout(): void {
    if (!this.planogramStore.appSettings.dockToolbar) {
      this.sharedService.mouseoverDockToolbar(false);
    }
  }

  public closeDialog(): void {
    this.dialog.close();
  }

  ngOnDestroy(): void {
    this._subscriptions.unsubscribe();
  }

}