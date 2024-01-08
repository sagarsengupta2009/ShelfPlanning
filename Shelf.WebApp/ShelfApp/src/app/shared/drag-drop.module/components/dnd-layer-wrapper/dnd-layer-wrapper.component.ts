import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'shelf-dnd-layer-wrapper',
  templateUrl: './dnd-layer-wrapper.component.html',
  styleUrls: ['./dnd-layer-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DndLayerWrapperComponent {

  constructor() { }



}
