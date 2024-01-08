import { POGLibraryListItem } from '../planogram-library';

export interface PostMessageObjectEmit {
    pogName: string;
    idpog: number;
}

export interface SelectedObjectEmit {
    worksheetName: string;
    selectedObject: POGLibraryListItem;
    isPogDownloaded?: boolean;
}
