import { Offset } from '@ng-dnd/core';
import { IDragDropData } from './drag-drop-models';

export interface IDropEventArgs {
  targetData: IDragDropData;
  sourceData: IDragDropData;
  clientOffset: Offset;
  differenceFromInitialOffset?: Offset
}

export interface IBeginDragEventArgs {
  dragType: string;
  data: IDragDropData;
  event: MouseEvent;
}

export interface IEndDragEventArgs {
  dragType: string;
  data: IDragDropData;
}

export interface ICanDragArgs {
  data: IDragDropData;
  event: MouseEvent;
}

export interface ICanDropEventArgs {
  targetData: IDragDropData;
  sourceData: IDragDropData;
}
