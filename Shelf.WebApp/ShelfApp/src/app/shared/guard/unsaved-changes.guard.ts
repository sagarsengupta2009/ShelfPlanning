import { Injectable } from '@angular/core';
import { CanDeactivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Observer } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmationDialogComponent } from 'src/app/shared/components/dialogues/confirmation-dialog/confirmation-dialog.component';
import { SharedService } from '../services/common/shared/shared.service';
import { PlanogramService } from '../services';
import { LocalStorageKeys } from '../constants';
import { LocalStorageService } from 'src/app/framework.module';
import { TranslateService } from '@ngx-translate/core';


export interface CanComponentDeactivate {
  canDeactivate: () => Observable<boolean> | Promise<boolean> | boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UnsavedChangesGuard implements CanDeactivate<CanComponentDeactivate> {
  constructor(
    private readonly dialog: MatDialog,
    private readonly sharedService: SharedService,
    private readonly localStorage: LocalStorageService,
    private readonly planogramService: PlanogramService,
    private readonly translate: TranslateService,
    private readonly router: Router
  ) { }

  canDeactivate(
    component: unknown,
    currentRoute: ActivatedRouteSnapshot,
    currentState: RouterStateSnapshot,
    nextState?: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    let isAnyPogDirty = Object.values(this.planogramService.rootFlags).some(e => e.isSaveDirtyFlag);
    if (this.sharedService.isGridEditing || (!isAnyPogDirty && !this.sharedService.isStoreDirty) || this.router.url == '/sp') {
      return true;
    }

    return new Observable((observer: Observer<boolean>) => {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        width: `350px`,
        data: this.translate.instant('UNSAVED_DATA_MOVE')
      });
      dialogRef.beforeClosed().subscribe(result => {
        if (result) {
          this.sharedService.GridValueUpdated(false);
          if(this.sharedService.isStoreDirty){
            this.sharedService.isStoreDirty = false;
          }
          if(isAnyPogDirty){
            for (const key in this.planogramService.rootFlags) {
              if (this.planogramService.rootFlags[key].isSaveDirtyFlag) {
                this.planogramService.rootFlags[key].isSaveDirtyFlag = false;
              }
            }
          }
          observer.next(true);
          observer.complete();
        } else {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
