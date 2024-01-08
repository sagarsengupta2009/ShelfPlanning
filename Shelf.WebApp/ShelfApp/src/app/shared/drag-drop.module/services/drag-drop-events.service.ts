
import { Injectable } from '@angular/core';
import { IEvent, Event } from 'src/app/framework.module';
import { IDropEventArgs, IDragDrop, IBeginDragEventArgs, IEndDragEventArgs } from './../models';

@Injectable({
  providedIn: 'root'
})
export class DragDropEventsService {

  private readonly itemDroppedEvent: IEvent<IDropEventArgs> = new Event<IDropEventArgs>();
  private readonly beginDragEvent: IEvent<IBeginDragEventArgs> = new Event<IBeginDragEventArgs>();
  private readonly endDragEvent: IEvent<IEndDragEventArgs> = new Event<IEndDragEventArgs>();

  constructor() { }

  public get itemDropped(): IEvent<IDropEventArgs> {
    return this.itemDroppedEvent;
  }

  /** Any component need to respond to beginDrag can subscribe to this. */
  public get beginDrag(): IEvent<IBeginDragEventArgs> {
    return this.beginDragEvent;
  }

  /** Any component need to respond to endDrag can subscribe to this. */
  public get endDrag(): IEvent<IEndDragEventArgs> {
    return this.endDragEvent;
  }

}
