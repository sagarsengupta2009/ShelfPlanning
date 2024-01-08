import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { ConsoleLogService } from 'src/app/framework.module';
import { IDragDropData, IDragDrop, ITargetInfo } from '../../models';
import { DragDropUtilsService } from '../../../services';

@Component({
  selector: 'app-dnd-wrapper',
  templateUrl: './dnd-wrapper.component.html',
  styleUrls: ['./dnd-wrapper.component.scss']
})
export class DndWrapperComponent implements OnInit, OnDestroy {

  @Input() public data: IDragDrop = null;

  // Derived properties from the input. Used in HTML
  public canRender = false;

  public isDraggable = false;

  public isDroppable = false;
  public targetInfo: ITargetInfo = null;

  private get hasData(): boolean { // min data check
    return this.data && this.data.$id
      && this.data.ObjectDerivedType
      && this.data.dragOriginatedFrom
      && !!this.data.dragDropSettings;
  }

  public get dragData(): IDragDropData {
    return {
      $id: this.data.$id,
      ObjectDerivedType: this.data.ObjectDerivedType,
      $sectionID: this.data.$sectionID,
      dragOriginatedFrom: this.data.dragOriginatedFrom,
    };
  }

  constructor(
    private readonly log: ConsoleLogService,
    private readonly dragDropUtil: DragDropUtilsService,
  ) { }

  public ngOnInit(): void {
    this.initializeDragAndDrop();
  }

  public ngOnDestroy() { }

  private initializeDragAndDrop() {
    if (this.hasData) {
      const isValidSource = this.initializeDrag();
      const isValidTarget = this.initializeDrop();
      if(isValidSource && isValidTarget) {

      }
      this.canRender = isValidSource && isValidTarget;
      return;
    }
    this.restDragDropStates()
    this.log.error(`dnd-wrapper: 'data' doesn't have min details defined. Will not render:`, this.data)
  }

  private initializeDrag(): boolean {
    if (!this.data.dragDropSettings.drag) { return true; } // default values are valid.

    const sourceType = this.data.ObjectDerivedType;
    if (sourceType) {
      this.isDraggable = true;
      return true;
    }

    // invalid setting
    this.log.warning('data is draggable according to setting. But sourceType not resolved for draggable object', this.data);
    return false;
  }

  private initializeDrop(): boolean {
    if (!this.data.dragDropSettings.drop) { return true; } // default values are valid.

    // data is droppable according to setting
    this.targetInfo = this.getTargetInfo();

    if (this.targetInfo) { // target info resolved from
      this.isDroppable = true;
      return true;
    }

    // invalid setting
    this.log.warning('TargetInfo not resolved for droppble object', this.data);
    return false;
  }

  private restDragDropStates() {
    this.canRender = false;

    this.isDraggable = false;

    this.isDroppable = false;
    this.targetInfo = null;
  }

  private getTargetInfo(): ITargetInfo {

    const dropTypes: string[] = this.dragDropUtil.getTargetTypes(this.data);

    if (!dropTypes || !dropTypes.length) { return null; }

    const targetInfo: ITargetInfo = {
      targetData: this.data,
      allowedDropTypes: dropTypes,
    };
    return targetInfo;
  }
}
