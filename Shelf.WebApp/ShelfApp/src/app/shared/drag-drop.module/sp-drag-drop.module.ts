
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  DndTargetWrapperComponent, DndSourceWrapperComponent,
  DndWrapperComponent
} from './components';
import { DragDropEventsService } from './services';
import { DndLayerWrapperComponent } from './components/dnd-layer-wrapper/dnd-layer-wrapper.component';

@NgModule({
  declarations: [
    DndTargetWrapperComponent,
    DndSourceWrapperComponent,
    DndWrapperComponent,
    DndLayerWrapperComponent
  ],
  imports: [
    CommonModule,
  ],
  providers: [
  ],
  exports: [
    DndWrapperComponent,
    DndLayerWrapperComponent
  ]
})
export class SpDragDropModule { }
