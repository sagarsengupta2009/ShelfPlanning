export interface PropertyGridSettings {
  fixtureSettings: PropertyGridParams;
  multiFixSettings: PropertyGridParams;
  positionSettings: PropertyGridParams;
  sectionSettings: PropertyGridParams;
}

export interface PropertyGridParams {
  header: Header;
  tab: TabOptions[];
  listview : ListViewParams;
}

export interface ListViewParams {
  children: TabChildren[];
  listViewOrder?: number;
}
export interface Header {
  children: TabChildren[];
  template: string;
  title: string;
  custom?: boolean;  //Says if the custom fields are to be used? If false/absent the hardcoded header is used
  images?: string[]; //List of product images to display in the image column. Possible values are "front", "back", "left", "right", "top", "bottom"
}

export interface TabOptions {
  children: TabChildren[];
  group: TabOptions[];
  style: { column: number }
  title: string;
  localeTitle?: string;
  guid?: string;
  hideTab?: boolean;
  table?: tableField;
}
interface tableField {
  columns: {title: string, localeTitle?: string}[];
  rows: TabOptions[];
}
export interface TabChildren {
  IDDictionary: number;
  field?: string;
  value?: string;
  type?: string;
  keyGroup?: string;
  changeHierarchy?: any;//TODO: @Menaha - Have to find the type
  AttributeType?: string;
  MinValue?: number;
  MaxValue?: number;
  style?: string;   //(Header) HTML style of the value when displayed in the header
  show?: boolean;   //(Header) If the field is displayed in the header.
  text?: string;    //(Header) Text that is written before the field value. Words surrounded by @ (@FIXTURE@) will be translated
  noLine?: boolean; //(Header) If true a new line is NOT added after the field and the next filed is displayed on the same line
  column?: number;  //(Header) What column of the header the field is in. If 2 the field is placed in the second column any other value will put the field in th first (main) column
  translatedText?: string;  //Holds the translated string from the "text" attribute
  ReadOnly: boolean;
  accessType: boolean;
  IsDialog: boolean;
  displayField?: boolean;
  IDPerfPeriod?: number;
  Checked?: boolean;
  UiFormat?: string;
  placeholder?: string;
  customClass?: string;
  options?: {text: string, value: number}[];
}

export interface ConfigPropertyDisplay {
  key: string;
  value: TabChildren[];
  checked: boolean;
  styleHeight?: string;
}
