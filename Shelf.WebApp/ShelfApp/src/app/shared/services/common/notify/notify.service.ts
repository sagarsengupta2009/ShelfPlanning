import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef, TextOnlySnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root'
})
export class NotifyService {

  private readonly successConfig: MatSnackBarConfig = {
    duration: 4000,
    verticalPosition: 'bottom',
    panelClass: ['snackbar-success'],
  };

  private readonly warnConfig: MatSnackBarConfig = {
    duration: 4000,
    verticalPosition: 'bottom',
    panelClass: ['snackbar-warn'],
  };

  private readonly errorConfig: MatSnackBarConfig = {
    duration: 4000,
    verticalPosition: 'bottom',
    panelClass: ['snackbar-error'],
  };

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly translate: TranslateService,
  ) { }

  public success(message: string, action?: string, config?: Config): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(
      this.translate.instant(message),
      action ? this.translate.instant(action) : action,
      this.mergeConfig(this.successConfig, config),
    );
  }

  public warn(message: string, action?: string, config?: Config): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(
      this.translate.instant(message),
      action ? this.translate.instant(action) : action,
      this.mergeConfig(this.warnConfig, config),
    );
  }

  public error(message: string, action?: string, config?: Config): MatSnackBarRef<TextOnlySnackBar> {
    return this.snackBar.open(
      this.translate.instant(message),
      action ? this.translate.instant(action) : action,
      this.mergeConfig(this.errorConfig, config),
    );
  }

  private mergeConfig(snackBarConfig: MatSnackBarConfig, config?: Config): MatSnackBarConfig {
    return { ...snackBarConfig, duration: config?.presistent ? 0 : this.errorConfig.duration };
  }

}

interface Config {
  presistent?: boolean;
}