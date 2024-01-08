import { Section, Fixture, Position } from '../../classes';
import { AllFixtureList, FixtureList } from '../../services/common/shared/shared.service';

export type GridData = number | string | boolean;
export type PogObject = AllFixtureList | Position;

export enum WorksheetType {
    PositionWS = 1,
    FixtureWS = 2,
    InventoryWS = 3
}

export interface SelectedRow<T> {
    ctrlKey: boolean;
    deselectedRows: DataItem<T>[];
    selectedRows: DataItem<T>[];
    shiftKey: boolean;
}



/** represnets the row object */
export interface DataItem<T> {
    dataItem: T;
    index: number;
}

export interface SelectedItem<T> {
    element: string;
    dataItem: T;
}

export interface SelectedFixtureRow extends SelectedRow<FixtureList> { }

export interface SelectedItemRow extends SelectedRow<Position> { }

export interface EditedCellData<T extends Fixture | Position> {
    data: T;
    event: EditedCellEvent;
}

export interface EditedCellEvent {
    field: string;
    value: GridData;
}

export interface FixtureFillDownUPData {
    field: string;
    selectedData: GridData;
    selectedcols: AllFixtureList[];
}

export interface WorksheetEventData {
    field: string;
    newValue: GridData;
    IDPOGObject?: number;
    gridType: string;
    tab: string;
    products?: any; //ToDO   @Amit  confirm the type of proucts
    IDPegLibrary?: number;
}

export interface ItemWSSaveHandler {
    Position: Position;
    id: string;
    newValue: GridData;
    oldvalue: GridData;
    unqHistoryID: string;
}

export interface PositionFillDownUPData {
    field: string;
    selectedData: GridData;

    selectedcols: Position[];
}

export interface PositionOldVal {
    child: Position
    oldval: GridData
}
export interface PositionFilldownObject {
    position: Position;
    id: string;
    value: GridData;
    unqHistoryID: string;
    oldvalues: PositionOldVal[];
    positions: Position[];
    isfilldowninprocess: boolean;
    sectionID: string;
    fieldName: string;
    preValue: GridData
}

export interface UndoRedoData {
    oldVM_Entity: Position;
    fieldPathStr: string
    newValue: GridData
    oldValue: GridData
    model: Position
    unqHistoryID: string

}

export interface PositionOldVal {
    child: Position
    oldval: GridData
}
export interface PositionFilldownObject {
    position: Position;
    id: string;
    value: GridData;
    unqHistoryID: string;
    oldvalues: PositionOldVal[];
    positions: Position[];
    isfilldowninprocess: boolean;
    sectionID: string;
    fieldName: string;
    preValue: GridData
}

export interface UndoRedoData {
    oldVM_Entity: Position;
    fieldPathStr: string
    newValue: GridData
    oldValue: GridData
    model: Position
    unqHistoryID: string
}

export interface WorksheetColumnsSettings {
    IDDictionary: number
    attributes: Attribute
    color: string
    editable: boolean
    encoded: boolean
    field: string
    fieldConfig: FieldConfig
    format: string
    headerAttributes: HeaderAttributes
    title: string
    type: string
    width: number
}

interface Attribute {
    class: string
    style: string

}

interface FieldConfig {
    validation: Validation
}

interface Validation {
    editable: boolean
}

interface HeaderAttributes {
    class: string
}
