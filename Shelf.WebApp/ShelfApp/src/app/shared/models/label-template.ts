import { LabelEditType } from "./enums";
import { Dictionary } from "./sa-dashboard"

export interface LabelTemplate {
  TEMPLATE_NAME: string,
  IS_SELECTED: boolean,
  LABEL_1: Label,
  LABEL_2: Label,
  labelFiltersSelected?: [Dictionary[], Dictionary[]],
  labelFiltersAutoComplete?: [Dictionary[], Dictionary[]]
}
export interface Label {
  FONT_FAMILY: string,
  FONT_SIZE: number,
  FONT_STYLE?: string,
  FONT_COLOR: string,
  VERTICAL_ALIGNMENT?: number,
  LABEL_ORIENTATION?: number,
  HORIZONTAL_ALIGNMENT?: number,
  STRECH_TO_FACING?: boolean,
  WORD_WRAP?: boolean,
  SHRINK_TO_FIT?: boolean,
  BACKGROUND_COLOR: string,
  STROKE_COLOR?: string,
  TRANSPARENCY?: number,
  LABEL: string,
  ENABLED: boolean,
  SHOW_LABEL_TITLE?: boolean,
  CROSSBAR_LABEL_DISPLAY?: string,
  Crossbar?:boolean,
  Slotwall?:boolean,
  Pegboard?:boolean,
  Basket?:boolean,
  CoffinCase?:boolean,
  StandardShelf?:boolean
}

export interface DisplaySetting {
  type: string;
  fromCloneDeleteSave: LabelEditType
}
