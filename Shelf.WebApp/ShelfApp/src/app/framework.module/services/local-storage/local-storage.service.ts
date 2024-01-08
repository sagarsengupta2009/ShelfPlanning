import { Injectable } from '@angular/core';
import { ConsoleLogService } from 'src/app/framework.module';
import { LocalStorageKeys } from 'src/app/shared/constants';

/**
 * localStorage access should be regulated through this service.
 * This service will act as a localStorage proxy service
 * with additional application logging.
 *
 * NOTE:
 * This service is not intended to be used in components. Should be used in a service.
 */
@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor(private readonly _log: ConsoleLogService) { }

  //#region Object

  /** get object type */
  public get<T>(key: string): T | null {
    // get data
    const data = localStorage.getItem(key);

    // validate and parse
    if (data) {
      var obj = JSON.parse(data) as T;
      return obj;
    }

    // local storage entry missing
    this._log.info(`${key} missing in localStorage.`);
    return null;
  }

  /** set object type */
  public set<T>(key: string, data: T): void {
    if (!data) {
      this._log.info(`Trying to set empty data to localStorage for key: ${key}.`);
      this.remove(key);
      return;
    }

    // save data
    localStorage.setItem(key, JSON.stringify(data));
  }

  //#endregion Object

  //#region string

  /** Get value string */
  public getValue(key: string): string {
    return localStorage.getItem(key);
  }

  /** Set value string */
  public setValue(key: string, data: string): void {
    localStorage.setItem(key, data);
  }

  //#endregion string

  //#region number

  public getNumber(key: string): number | undefined {
    const value = localStorage.getItem(key);
    if(value) { return +value;}
    return null
  }

  public setNumber(key: string, value: number): void {
    localStorage.setItem(key, value.toString());
  }

  //#endregion number

  //#region boolean

  /** Get flag */
  public getBoolean(key: string): boolean {
    const value = localStorage.getItem(key);
    return value && value == 'true';
  }

  /** Set flag */
  public setBoolean(key: string, value: boolean): void {
    localStorage.setItem(key, value.toString());
  }

  //#endregion boolean

  public remove(key: string): void {
    localStorage.removeItem(key);
    this._log.info(`Removed ${key} from localStorage.`)
  }

  public clear(): void{
    localStorage.clear();
  }

  clearParticulars(): void {
    localStorage.removeItem(LocalStorageKeys.VERSION);
    localStorage.removeItem(LocalStorageKeys.SP_APPLICATION_MENUS);
    localStorage.removeItem(LocalStorageKeys.LANGUAGE);
    localStorage.removeItem(LocalStorageKeys.SPLITTER_VIEW);
    localStorage.removeItem(LocalStorageKeys.DICTIONARY_DATA);
  }
}
