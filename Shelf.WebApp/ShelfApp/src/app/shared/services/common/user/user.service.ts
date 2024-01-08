import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ConsoleLogService } from 'src/app/framework.module';
import { apiEndPoints, UserDetail, UserInfo, UserSettings, apiUserSettings } from 'src/app/shared/models';

/** User service is responsible to provide current user's Email ID and Name across the application
 * This will be populating data as a APP_INITIALIZER
 */
@Injectable({
  providedIn: 'root'
})
export class UserService {

  // To retain API data.
  private userInfo: UserInfo = null;
  private userSettings: UserSettings = null;
  public get emailId(): string {
    if (this.userInfo) {
      return this.userInfo.emailId;
    }
    // Ideally this warning shouldn't fire, as we are hooking this service to APP_INITIALIZER
    this.log.warning(`userService.emailId called before service is ready.`);
    return '';
  }
  public get tkey(): string {
    if (this.userInfo) {
      return this.userInfo.Tkey;
    }
    // Ideally this warning shouldn't fire, as we are hooking this service to APP_INITIALIZER
    this.log.warning(`userService.Tkey called before service is ready.`);
    return '';
  }
  public get iDCorp(): string {
    if (this.userInfo) {
      return this.userInfo.IDCorp;
    }
    // Ideally this warning shouldn't fire, as we are hooking this service to APP_INITIALIZER
    this.log.warning(`userService.IDCorp called before service is ready.`);
    return;
  }

  public get time12or24(): number {
    if (this.userInfo) {
      return this.userSettings.time;
    }
    // Ideally this warning shouldn't fire, as we are hooking this service to APP_INITIALIZER
    this.log.warning(`userService.time called before service is ready.`);
    return 12;
  }

  public get userId(): string {
    if (this.userInfo) {
      return this.userInfo.userId;
    }
    // Ideally this warning shouldn't fire, as we are hooking this service to APP_INITIALIZER
    this.log.warning(`userService.usrId called before service is ready.`);
    return;
  }

  constructor(
    private readonly httpClient: HttpClient,
    private readonly log: ConsoleLogService
  ) { }

  public getUserInfo(): Observable<UserInfo> {
    return this.httpClient
      .get<UserDetail>(apiEndPoints.apiToGetUserDetail)
      .pipe(
        map(response => this.toUserInfo(response)),
        tap(result => this.saveUserInfo(result))
      );
  }

  private toUserInfo(response: UserDetail): UserInfo {
    const userProfile: UserInfo = {
      emailId: response.EmailId,
      name: response.Name,
      IDCorp: response.IDCorp,
      Tkey: response.Tkey,
      userId: response.UserID 
    };
    return userProfile;
  }

  private saveUserInfo(user: UserInfo): void {
    // We can afford to make API call, per application initialization
    this.log.info(`Current logged in user: ${user.name} (${user.emailId})`)
    this.userInfo = user;
  }

  public getUserSettings(): Observable<UserSettings> {
    return this.httpClient
      .get<apiUserSettings>(apiEndPoints.apiToGetUserSettings)
      .pipe(
        map(response => this.toUserSettings(response)),
        tap(result => this.saveUserSettings(result))
      );
  }

  private toUserSettings(response: apiUserSettings): UserSettings {
    const userSetting: UserSettings = {
      emailId: response.EmailId,
      corpId: response.CorpId,
      languages: response.Languages,
      langugage: response.Langugage,
      roles: response.Roles,
      timeZone: response.TimeZone,
      timeFormat: response.timeFormat === 1,
      time: response.timeFormat ? 24 : 12,
      timeZones: response.TimeZones,
    };

    return userSetting;
  }

  private saveUserSettings(userSet: UserSettings): void {
    this.userSettings = userSet;
  }


}
