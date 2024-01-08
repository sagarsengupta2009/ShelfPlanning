import { AfterViewInit, Component, OnDestroy, OnInit, ViewChild, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA ,MatDialog} from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { HistoryService, PlanogramService, SharedService, PlanogramLibraryService, PanelService, CreatePlanogramService, NotifyService, Render2dService } from 'src/app/shared/services/';
import { PlanogramHierarchyTreeComponent } from './planogram-hierarchy-tree/planogram-hierarchy-tree.component';
import { SelectedStoreComponent } from './selected-store/selected-store.component';
import { StoreHierarchyComponent } from './store-hierarchy/store-hierarchy.component';
import { SearchComponent } from 'src/app/shared/components/search/search.component';
import { Utils } from 'src/app/shared/constants/utils';
import { Planogram, PogTemplate, PogTemplateRequestVM } from 'src/app/shared/models/planogram/';
import { Store } from 'src/app/shared/models/store/stores';
import { PlanogramStoreService } from 'src/app/shared/services/common/planogram-store.service';
import { ConsoleLogService } from 'src/app/framework.module';
import { IApiResponse, Planograms, POGLibraryListItem, SectionResponse } from 'src/app/shared/models';
import { PlanogramLibraryApiService, UprightService } from 'src/app/shared/services/layouts';
import { Section } from 'src/app/shared/classes';
import { PogMaxCountDialogComponent } from '../../planogram-library/planogram-maxcount-dialog-component';


@Component({
  selector: 'sp-create-planogram',
  templateUrl: './create-planogram.component.html',
  styleUrls: ['./create-planogram.component.scss']
})
export class CreatePlanogramComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild(`store`) store: StoreHierarchyComponent;
  @ViewChild(`selectedStore`) selectedStore: SelectedStoreComponent;
  @ViewChild(`phierarchy`) phierarchy: PlanogramHierarchyTreeComponent;
  @ViewChild(`searchDetail`) searchDetail: SearchComponent;

  public pogTemplatesList: PogTemplate[] = [];
  public selectedTemplate: PogTemplate;
  public hierarchyView: boolean = false;
  public storeHierarchyView: boolean = false;
  public StoreGridData: Store[];
  public displayMode: number = 1;
  public selectedStoreView: boolean = false;
  public changeDate: Date = new Date();

  private systemSectionTemplates: PogTemplate[] = [];
  private planogramHierarchyId: number;
  private CreatePlanogramPogType: number;
  private sectionID: string;

  constructor(private readonly translate: TranslateService,
    private readonly createPlanogramService: CreatePlanogramService,
    private readonly notifyService: NotifyService,
    private readonly planogramLibraryService: PlanogramLibraryService,
    private readonly sharedService: SharedService,
    private readonly planogramStore: PlanogramStoreService,
    public readonly dialog: MatDialogRef<CreatePlanogramComponent>,
    public readonly matdialog: MatDialog,
    @Inject(MAT_DIALOG_DATA) public readonly data: any,
    private readonly historyService: HistoryService,
    private readonly panelService: PanelService,
    private readonly planogramService: PlanogramService,
    private readonly log: ConsoleLogService,
    private readonly planogramLibApiService: PlanogramLibraryApiService,
    private readonly render2d: Render2dService,
    private readonly uprightService: UprightService,
    ) {
  }

  public ngOnInit(): void {
    this.getSystemSectionTemplateList();
  }
  public ngAfterViewInit(): void {
    this.selectedTemplate = null;
  }

  public disabledDates(date: Date): boolean {
    const todayDate = new Date();
    return date < todayDate
  }

  public ChildSearchItems(searchKey: string): void {
    if (this.systemSectionTemplates && searchKey && !this.hierarchyView && !this.storeHierarchyView) {
      this.pogTemplatesList = this.sharedService.runFilter(this.systemSectionTemplates, searchKey);
    } else {
      this.pogTemplatesList = [...this.systemSectionTemplates];
    }
    if (this.hierarchyView && !this.storeHierarchyView) {
      this.phierarchy.BindSearchEvent(searchKey)
    }
    if (!this.hierarchyView && this.storeHierarchyView && !this.selectedStoreView) {
      this.store.bindSearchEvent(searchKey)
    }
    if (this.selectedStoreView) {
      this.selectedStore.BindSearchEvent(searchKey)
    }
  }

  public closeDialogheader(): void {
    this.dialog.close();
  }
  public clickedItemSelection(itemData: PogTemplate): void {
    this.selectedTemplate = null;
    this.selectedTemplate = itemData;
  }

  public isDataAvailable(): boolean {
    if (this.pogTemplatesList.length > 0) {
      return true;
    } else
      return false;
  }

  public checkifTemplateSelected(): boolean {
    let templateselected = true;
    if (this.selectedTemplate != undefined && this.selectedTemplate !== null) {
      templateselected = false;
    }
    return templateselected;
  }

  public showHierarchyTree(): void {
    this.searchDetail.clearsText();
    if (this.selectedTemplate != null) {
      this.hierarchyView = true;
      this.storeHierarchyView = false;
    } else {
      this.notifyService.warn('PLEASE_TEMP');
    }
  }

  public showTemplateView(): void {
    this.hierarchyView = false;
    this.storeHierarchyView = false;
  }

  public isSystemTemplate(itemData: PogTemplate): boolean {
    if (itemData.PogType == -2) {
      return true;
    }
    return false;
  }

  public showStoreHierarchyTree(): void {
    this.planogramHierarchyId = this.phierarchy.planogramHierarchyId;
    this.CreatePlanogramPogType = this.phierarchy.pogTypeSelect;
    if (this.planogramHierarchyId) {
      this.hierarchyView = false;
      this.storeHierarchyView = true;
    } else {
      this.notifyService.warn('PLEASE_HIER');
    }
  }

  public showSelectedStore(): void {
    this.StoreGridData = this.store.selectedStore;
    this.selectedStoreView = true;
  }

  public storeView(): void {
    this.StoreGridData = this.selectedStore.selectedStore;
    this.createPlanogramService.updateSelection.next(this.StoreGridData)
    this.selectedStoreView = false;
  }


  public showHideAppend(): boolean {
    return !this.hierarchyView && !this.storeHierarchyView && !Utils.isNullOrEmpty(this.sharedService.getActiveSectionId());
  }
  //Get the planogram template data for selected IDPOG
  public getSectionTemplate(): boolean {
    if (this.sharedService.checkIfAssortMode('create-new-pog')) {
      this.notifyService.warn('FEATURE_DISABLED');
      return false;
    } else {
      //Should check for module level permissions
      if (this.selectedTemplate !== null) {
        const pogCounts = this.planogramLibraryService.getLoadCount(); // getting max POG count and loaded POG count
        if (pogCounts.canDownload) { //checking POG count before creating a new planogram
          const selectedTemplates = [];
          selectedTemplates.push(this.selectedTemplate);
          //Create new planogram , Need to do client side pinning here
          const dataToPost = this.getTemplateAjax();
          this.createPlanogramService.getSectionTemplate(dataToPost).subscribe((response: IApiResponse<SectionResponse>) => {
            if (response && response.Log.Summary.Error > 0) {
              this.notifyService.error(response.Log.Details[0].Message);
              this.resetDialog();
            }
            else {
              this.closeDialog(response);
            }
          });
        } else {
          const dialogRef = this.matdialog.open(PogMaxCountDialogComponent, {
            width: '50vw',
            data: { data: []},
            autoFocus: false
          });
          dialogRef.afterClosed().subscribe((result) => {
            if (result) {
            }
          });
          this.notifyService.warn(`${pogCounts.maxPogCount} ${this.translate.instant('POG_ALREADY_LOADED')}`);
        }
      } else {
        this.notifyService.warn('Please Select a Template');
      }
    }
  }

  public appendToSection(): boolean {
    this.sectionID = this.sharedService.getActiveSectionId();
    const pogStatusIdToAppend = (this.sharedService.getObject(this.sharedService.getActiveSectionId(), this.sharedService.getActiveSectionId()) as Section).IDPOGStatus;
    if (pogStatusIdToAppend != 5 && pogStatusIdToAppend != 4 && pogStatusIdToAppend != 6) {
      if (Utils.isNullOrEmpty(this.sharedService.getActiveSectionId())) {
        this.notifyService.warn('Please load the planogram');
        return false;
      }
      if (Utils.isNullOrEmpty(this.selectedTemplate)) {
        this.notifyService.warn('Please select one template to append');
        return false;
      }
      if (this.sharedService.checkIfAssortMode('create-new-pog-append')) {
        this.notifyService.warn('FEATURE_DISABLED');
        return false;
      } else {
        const dataToPost: PogTemplateRequestVM = this.getTemplateAjax();
        this.createPlanogramService.getSectionTemplateData(dataToPost).subscribe((response: IApiResponse<Planogram>) => {
          if (response.Data != null) {
            const toDataSource = this.sharedService.getObject(this.sectionID, this.sectionID) as Section;
            const unqHistoryID = this.historyService.startRecording();
            this.createPlanogramService.appendSection(toDataSource, response.Data);
            this.render2d.isDirty = true;
            this.planogramService.UpdatedSectionObject.next(toDataSource);
            this.uprightService.updateUpright(toDataSource, toDataSource.Upright);
            this.notifyService.warn('APPENDING_SECTION_SUCCESSFULL');
            this.planogramService.insertPogIDs(null, true);
            this.historyService.stopRecording(undefined, undefined, unqHistoryID);
          } else {
            this.notifyService.error('Error while getting template data. Append section failed.');
          }
        }, () => {
          this.notifyService.error('Error while getting template data. Append section failed.');
          this.resetDialog();
        });
      }
    }
    else {
      this.notifyService.warn("Can't append, it's a read only pog.");
    }
  }


  public editPogTemplate(itemData: PogTemplate): void {
    let mapperobj: POGLibraryListItem[] = this.planogramStore.mappers;
    let obj: POGLibraryListItem = this.sharedService.getObjectFromIDPOG(Number(itemData.IDPOG));
    if (!obj) {
      let data = [];
      data.push(itemData.IDPOG);
      this.planogramLibApiService.getPOGInfo(data).subscribe((response: IApiResponse<Planograms[]>) => {
        if (response && response.Data) {
          const sendObj = response.Data[0] as POGLibraryListItem;
          obj = Object.assign(true, {}, sendObj);
          obj.sectionID = '';

          this.planogramLibraryService.markRequestToPin([obj], false);
          let counts = {};
          let pogCount: boolean = false;
          for (const mpObj of mapperobj) {
            const num = mpObj.IDPOG;
            counts[num] = counts[num] ? counts[num] + 1 : 1;
            if (counts[num] > 1) {
              pogCount = true;
            }
          }

          if (!pogCount) {
            this.sharedService.editPlanogramTemplate.next(true);
            this.closeDialogheader();
            this.panelService.view = 'planogram';
          }
        }
      }, () => {
        this.log.error('Error while retriving the data for SectionTemplatesList');
      });
    } else {
      this.closeDialogheader();
      this.notifyService.warn(this.translate.instant('SELECTED_PLANOGRAM_TEMPLATE_ALREADY_PRESENT') +' .' + obj.IDPOG);
    }
  }

  public deletePogTemplate(idPog: number): void {
    let data = [];
    data.push(idPog);
    this.createPlanogramService.deletePogTemplates(data).subscribe(() => {
      //updating the planogram List
      const index = this.pogTemplatesList.findIndex(pogObj => pogObj.IDPOG === idPog);
      if(index > -1){
        this.pogTemplatesList.splice(index, 1);
      }
    });
  }


  public exportToExcel(): void {
    this.selectedStore.exportToExcel();
  }
  public deleteSelectedRows(): void {
    this.selectedStore.deleteSelectedRows();
  }
  public onDateChange(): void {
    this.selectedStore.changeDate = this.changeDate;
    this.selectedStore.onDateChange();
  }
  public exportToExcelStore(): void {
    this.store.exportToExcel();
  }
  //Getting System Section Templates
  private getSystemSectionTemplateList(): void {
    this.createPlanogramService.getAllTemplateList().subscribe((response: IApiResponse<Array<PogTemplate>>) => {
      this.systemSectionTemplates = response.Data;
      this.pogTemplatesList = response.Data;
    }, () => {
      this.log.error('Error While getting Default SYSTEM Templates');
    });
  }

  private getTemplateAjax(): PogTemplateRequestVM {
    let dataToPost: PogTemplateRequestVM;
    try {
      let StoreGridData = this.selectedStore.selectedStore;
      StoreGridData.forEach((item) => {
        item.EffectiveFrom = item.EffectiveFrom.toDateString();
      })
      dataToPost = {
        IdPog: this.selectedTemplate.IDPOG,
        IdScenario: this.planogramStore.scenarioId,
        IdHierarchy: this.planogramHierarchyId,
        StoreData: StoreGridData,
        pogType: this.CreatePlanogramPogType
      }
    } catch (e) {
      this.log.error('Error in getTemplateAjax');
      dataToPost = {
        IdPog: this.selectedTemplate.IDPOG,
        IdScenario: this.planogramStore.scenarioId,
        IdHierarchy: this.planogramHierarchyId,
        pogType: this.CreatePlanogramPogType
      }
    }
    return dataToPost;
  }
  private resetDialog(): void {
    this.hierarchyView = false;
    this.storeHierarchyView = false;
    this.selectedStoreView = false;
    this.selectedTemplate = null;
    this.planogramHierarchyId = null;
  }
  private closeDialog(data): void {
    this.dialog.close(data);
  }
  ngOnDestroy(): void {
  }
}


