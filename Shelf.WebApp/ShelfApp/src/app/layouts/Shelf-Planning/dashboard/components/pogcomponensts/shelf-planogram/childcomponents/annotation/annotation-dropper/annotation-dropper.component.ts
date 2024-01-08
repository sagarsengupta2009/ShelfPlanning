import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { DragOrigins, IDragDrop } from 'src/app/shared/drag-drop.module';

/**
 * This component renders outside the section allowing annotation to be dropped outside the planogram.
 */
@Component({
  selector: 'shelf-annotation-dropper',
  templateUrl: './annotation-dropper.component.html',
  styleUrls: ['./annotation-dropper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AnnotationDropperComponent implements OnInit {
  @Input() sectionID: string;
  constructor() { }

  ngOnInit(): void {
  }

  public getAnnotationDropData(): IDragDrop {
    const dropData: IDragDrop = {
      $id: `annotation-dropper-${this.sectionID}`,
      ObjectDerivedType: 'Annotation-dropper',
      $sectionID: this.sectionID,
      dragOriginatedFrom: DragOrigins.Planogram,
      dragDropSettings: { drag: false, drop: true },
    };
    return dropData;
  }
}
