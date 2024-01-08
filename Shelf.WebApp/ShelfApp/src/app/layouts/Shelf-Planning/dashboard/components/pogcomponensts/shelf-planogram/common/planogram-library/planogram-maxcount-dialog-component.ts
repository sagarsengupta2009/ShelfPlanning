import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { PlanogramLibraryService, PlanogramHelperService} from 'src/app/shared/services';
import { POGLibraryListItem } from 'src/app/shared/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'sp-pog-max-count-template',
  templateUrl: './planogram-maxcount-dialog-component.html',
  styleUrls: ['./planogram-maxcount-dialog-component.scss']
})
export class PogMaxCountDialogComponent {
  constructor(
    public dialog: MatDialogRef<PogMaxCountDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: any,
     private readonly planogramLibraryService: PlanogramLibraryService, private readonly planogramHelperService: PlanogramHelperService, 
   public readonly translate: TranslateService) { }
  public loadedPlanogram: POGLibraryListItem[] = [];
  private subscriptions = new Subscription();
  public resetCheckbox = false;
  public checkForDirtyPogs: POGLibraryListItem[] = [];
  public checkIsselectedDirtyPog: POGLibraryListItem[] = [];
  task = {
    name: this.translate.instant('SELECT_ALL'),
    completed: false,
    subtasks: this.loadedPlanogram,
  };
  allComplete: boolean = false;
  updateAllComplete() {
    this.allComplete = this.task.subtasks != null && this.task.subtasks.every(t => t.completed as any);
  }

  someComplete(): boolean {
    
    if (this.task.subtasks == null) {
      return false;
    }
    
    return this.task.subtasks.filter(t => t.completed).length > 0 && !this.allComplete;
  }
  changeofSelection(event : boolean,pogList :POGLibraryListItem): void {
    if (event && this.resetCheckbox && pogList?.isSaveDirtyFlag) {
      this.selectSaveandunload(event);
    }
  }

  setAll(completed: boolean) {
    this.allComplete = completed;
    if (this.task.subtasks == null) {
      return;
    }
    this.task.subtasks.forEach((t) => {
      if(t.isLoaded){
        t.completed = completed
      }
    });
  }
  public ngOnInit(): void {

    this.loadedPlanogram = this.planogramLibraryService.mapper?.filter(it => it.isLoaded);
    this.loadedPlanogram.forEach(t => (t['completed'] = false));
    this.task.subtasks = this.loadedPlanogram;
    this.checkForDirtyPogs = this.loadedPlanogram?.filter(it => it.isSaveDirtyFlag);
    this.checkIsselectedDirtyPog = this.checkForDirtyPogs?.filter(it => it.completed);
    this.subscriptions.add(this.planogramLibraryService.updatePlanogramList.subscribe((result) => {
      if (result) {
        this.loadedPlanogram.forEach((item) => {
          let pogData = this.planogramLibraryService.mapper?.filter((x) => x.IDPOG == item.IDPOG);
          item.isLoaded = pogData[0].isLoaded;
        });
      }
    }));

  }
  public closeDialog(): void {
    this.dialog.close();
  }
  public unloadSelectedPogs(pogs?): void {
    let selectedPogsForUnload = this.loadedPlanogram?.filter(it => it.completed);
    selectedPogsForUnload = selectedPogsForUnload?.filter(it => it.isLoaded);
    selectedPogsForUnload = pogs && pogs.length ? pogs : selectedPogsForUnload;
    this.planogramHelperService.unloadPlanogram(selectedPogsForUnload);
  }
  public checkforDirtyPogs(): boolean {
    this.checkForDirtyPogs = this.loadedPlanogram?.filter(it => it.isSaveDirtyFlag);
    return this.checkForDirtyPogs.length ? true : false;
  }

  public selectSaveandunload(event): void {
    if (event) {
      this.resetCheckbox = true;
      let selectedPogsForUnload = this.loadedPlanogram?.filter(it => it.completed);
      selectedPogsForUnload = selectedPogsForUnload?.filter(it => it.isLoaded);
      this.checkForDirtyPogs = this.loadedPlanogram?.filter(it => it.isSaveDirtyFlag);
      let dirtyPogs = selectedPogsForUnload?.filter(it => it.isSaveDirtyFlag);
      if (dirtyPogs?.length) { //from selected pogs
        this.planogramHelperService.saveAllPlanograms(dirtyPogs);
      } else if (this.checkForDirtyPogs.length && !dirtyPogs?.length) { // all modified pogs to save and unload
        this.loadedPlanogram.forEach((item) => {
          if (item.isSaveDirtyFlag) {
            item['completed'] = true;
          }
        });
        this.planogramHelperService.saveAllPlanograms(this.checkForDirtyPogs);
        this.checkforDirtyPogs();
      }

    }else{
      this.resetCheckbox = false;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}