import { DragOrigins } from "./drag-drop-enums";

/** This is the minimum data which will be passed for drag-drop operation */
export interface IDragDropData {
    $id: string;
    ObjectDerivedType: string;
    /** empty value when coming from library */
    $sectionID?: string;
    dragOriginatedFrom?: DragOrigins;
}

export interface ITargetInfo {
    targetData: IDragDropData;
    allowedDropTypes: string[];
}

/**
 * Any class / interface which needs to be dragged and or dropped
 * need to implement this interface.
 * Thus we can make sure IDragDropData can be formed
 */
export interface IDragDrop extends IDragDropData {
    $id: string;
    ObjectDerivedType: string;
    $sectionID: string;

    // Additional props listed below.
    dragDropSettings: IDragDropSettings;
    dragOriginatedFrom?: DragOrigins;
}

export interface IDragDropSettings {
    drag: boolean;
    drop: boolean;
}
