export interface AppSettings {
    AppSettings: IApplicationSettings
}

export interface IApplicationSettings {
    KeyGroup: string;
    User?: string;
    Values: SettingValue[];
}

export interface SettingValue {
    KeyName: string;
    KeyType: string;
    KeyValue: string;
}
