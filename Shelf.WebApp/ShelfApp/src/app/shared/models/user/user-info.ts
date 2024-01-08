export interface UserInfo {
  emailId: string;
  name: string;
  IDCorp: string;
  Tkey: string;
  userId: string;
}

export interface UserSettings {
  emailId: string;
  langugage: string;
  timeZone: string;
  corpId: number;
  timeFormat: boolean;
  time: number;
  languages: any[];
  roles: any[];
  timeZones: any[];
}

export interface apiUserSettings {
  EmailId: string;
  TimeZone: string;
  Langugage: string;
  CorpId: number;
  timeFormat: number;
  TimeZones: any[];
  Languages: any[];
  Roles: any[];
}
