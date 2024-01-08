import { Dictionary } from './sa-dashboard';

export interface ApplicationSettings {
    GetAllSettings: Settings<AllSettings[]>;
    GetInventorySettings: Settings<InventorySetting>;
    GetUserPermissions: Settings<UserPermission>;
    GetPogProfSignature: Settings<PogProfSignature>;
    SupportsLocalStotage: Settings<boolean>;
}

export interface Settings<T> {
    data: T;
    status: number;
}

export interface AllSettings {
    List: boolean;
    KeyName: string;
    KeyValue: boolean | number | string;
    KeyGroup: string;
    Type: string;
    KeyType: string;
    UIType?: string;
    Readonly: boolean;
    LkUp?: string;
    Name: string;
    Values?: SettingsValueOption[] | Dictionary[];
    SelectedValue: SettingsValueOption;
}

export interface SettingsValueOption {
    text: string;
    value: string | number | boolean;
}

interface InventorySetting {
    InventorySettings: {
        User: string;
        KeyGroup: string;
        Values: {
            IDInvModel: number;
            IDCorp: number;
            CasesMin: number;
            CasesMax: number;
            DOSMin: number;
            DOSMax: number;
            FacingsMin: number;
            FacingsMax: number;
            UnitsMin: number;
            UnitsMax: number;
            ReplenishmentMin: number;
            ReplenishmentMax: number;
            PeakSafetyFactor: number;
            BackroomStock: number;
            DeliverySchedule?: number;
            Movement: number;
        };
    };
    HashCode: {
        InventorySettingsHash: string;
    };
}

export interface UserPermission {
    User: string;
    IsAdmin: boolean;
    Modules: UserPermissionModules[];
    Features: UserPermissionFeatures[];
}

export interface UserPermissionModules {
    Name: string;
    IDFeature: number;
    Permissions: Permissions;
}

export interface UserPermissionFeatures {
    Name: string;
    IDFeature: number;
    FeatureCode: string;
    ModuleRef: number;
    ModuleName: string;
    Permissions: Permissions;
}

export interface Permissions {
    Read: boolean;
    Create: boolean;
    Update: boolean;
    Delete: boolean;
}

interface PogProfSignature {
    IdCorp: number;
    IdProfileSignatureHdr: number;
    Name: string;
    IsUDP: boolean;
    Length: number;
    IsDefault: boolean;
    ValueSeperator: string;
    PogProfSignatureDtl: PogProfSignatureDtl[];
}
interface PogProfSignatureDtl {
    IdProfileSignatureDtl: number;
    IdProfileSignatureHdr: number;
    IdCorp: number;
    StackOrder: number;
    IdDictionary: number;
    MaxLength: number;
    IsPadBlanks: boolean;
    PaddingChar: string;
    Prefix?: string;
    Suffix: string;
    IsUDP: boolean;
    DividedBy: number;
    RoundOff: number;
    ActionCode?: string;
    Expression?: string;
    PogProfSignatureHdr?: string;
}

export interface POGSetting {
    FixtLabelSettings: POGSettingParam[];
    POGSettings: POGSettingParam[];
    POSLabelSettings: POGSettingParam[];
    StatusBarSettings: POGSettingParam[];
}

export interface POGSettingParam {
    children: PogSettingParamKey[];
    group?: PogSettingParamGroup[];
    style: { column: number };
    tab: string;
    iscollapsible?: boolean;
}
export interface PogSettingParamKey {
    key: string;
    fieldObj?: AllSettings;
}
export interface PogSettingParamGroup {
    children: PogSettingParamKey[];
    iscollapsible: boolean;
    style: PogSettingStyle;
    title: string;
}

interface PogSettingStyle {
    column: number;
}

export interface StatusSettings {
    fieldObj: AllSettings;
    id: string;
}

export interface SelectedGridType {
    fixture: number[];
    pog: number[];
    position: number[];
}

export enum  PogActionTypes {
    READ = 1,
    CREATE = 2,
    UPDATE = 4,
    DELETE = 8,
}