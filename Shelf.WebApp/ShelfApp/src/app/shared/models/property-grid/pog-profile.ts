export interface PogProfileSignatureSettings {
    ActionCode: string;
    AttributeType: string;
    DataType: number;
    DividedBy: number;
    Expression: string;
    FormatType: string;
    IdCorp: number;
    IdDictionary: number;
    IdProfileSignatureDtl: number;
    IdProfileSignatureHdr: number;
    IsPadBlanks: boolean;
    IsUDP: boolean
    MaxLength: number;
    Owner: string;
    PaddingChar: string;
    PogProfSignatureHdr: string;
    Prefix: string;
    RoundOff: number;
    StackOrder: number;
    Suffix: string;
    UiFormat: string;
    field: string;
    item: string;
    title: string;
    type: string;
    value: string | number;
    name?: string;
}

export interface UdpFields {
    [key: string]: string
}