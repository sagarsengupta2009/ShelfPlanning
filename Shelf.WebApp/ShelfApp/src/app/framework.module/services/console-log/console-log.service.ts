import { environmentConfig } from 'src/environments/environment';
import { Injectable } from '@angular/core';

export enum logType {
  debug = 0,
  info = 1,
  success = 2,
  assert = 3,
  warning = 3,
  error = 4,
}

@Injectable({
  providedIn: 'root'
})
export class ConsoleLogService {

  // Set this property to display stack trace on error in dev environment
  public displayStackTrace = false;
  public logLevel: logType = logType.warning;

  private readonly stackTraceLineIdentifier = '    ';

  constructor() {
    this.init();
  }

  /** Make sure to delete all the debug logs */
  public debug(message: string, ...optionalParams: any[]): void {
    this.log(logType.debug, message, optionalParams);
  }

  public info(message: string, ...optionalParams: any[]): void {
    this.log(logType.info, message, optionalParams);
  }

  public success(message: string, ...optionalParams: any[]): void {
    this.log(logType.success, message, optionalParams);
  }

  public warning(message: string, ...optionalParams: any[]): void {
    this.log(logType.warning, message, optionalParams);
  }

  public error(message: string, ...optionalParams: any[]): void {
    this.log(logType.error, message, optionalParams);
  }

  public assert(value: any, message?: string, ...optionalParams: any[]): void {
    console.assert(value, message, optionalParams);
  }

  private init(): void {
    if (this.detailedLoggingEnabled()) {
      this.logLevel = logType.info;
    }
    if (!environmentConfig.production) {
      this.logLevel = logType.debug;
      this.displayStackTrace = true;
    }
  }

  private detailedLoggingEnabled(): boolean {
    // Can't use LocalStorageService and LocalStorageKeys here. (will end up in circular dependency)
    const valueStr = localStorage.getItem('log');
    return valueStr && valueStr.toLocaleLowerCase() === 'true';
  }

  private getColor(type: logType): string {
    switch (type) {
      case logType.error: return 'red';
      case logType.success: return 'green';
      case logType.warning: return 'orange';
      case logType.info: return 'dodgerBlue';
      case logType.debug: return 'grey';
      default: return 'black';
    }
  }

  private getStackTrace() {
    // current stack trace will give
    const err = new Error();

     // Remove the locations in this file.
     let stackTrace = err.stack;
     const parts = stackTrace.split(this.stackTraceLineIdentifier);
     parts.splice(1, 3);
     stackTrace = parts.join(this.stackTraceLineIdentifier);

     return stackTrace;
  }

  private log(type: logType, message: string, params: any[]): void {

    // Based on the logLevel, decide whether to add an entry to console.
    if (type < this.logLevel) { return; }

    // Set the CSS style for log
    let style = 'color: ' + this.getColor(type) + ';';
    if (type === logType.error) {
      style += ' font-weight:bold;';
    }

    // These should be the only console.log() calls in the application.
    if (params.length) {
      // tslint:disable-next-line:no-console
      console.log('%c' + message, style, params);
    } else { // Message log
      // tslint:disable-next-line:no-console
      console.log('%c' + message, style);
    }

    // For error/warning, display stack trace in development mode; if enabled.
    if (this.displayStackTrace && (type === logType.error || type === logType.warning)) {
      // tslint:disable-next-line:no-console
      console.log(this.getStackTrace());
    }
  }

}
