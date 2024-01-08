import { AfterViewInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';
import { PanelView } from 'src/app/shared/models';
import { AgGridHelperService, PanelService, WorksheetGridService } from 'src/app/shared/services';

const KEY_BACKSPACE = 'Backspace';
const KEY_DELETE = 'Delete';
const KEY_F2 = 'F2';
const KEY_ENTER = 'Enter';
const KEY_TAB = 'Tab';

@Component({
  selector: 'shelf-numeric',
  templateUrl: './numeric.component.html',
  styleUrls: ['./numeric.component.scss']
})
export class NumericComponent implements ICellEditorAngularComp, AfterViewInit {

  private params: ICellEditorParams;
  public value!: number;
  public highlightAllOnFocus = true;
  private cancelBeforeStart = false;

  @ViewChild('input', { read: ViewContainerRef })
  public input!: ViewContainerRef;

  constructor(private readonly worksheetGridService :WorksheetGridService,
              private readonly panelService: PanelService,
              private readonly agGridHelperService: AgGridHelperService){

  }
  public agInit(params: ICellEditorParams): void {
    this.params = params;
    if (this.panelService.ActivePanelInfo.view && this.panelService.ActivePanelInfo.view === PanelView.POSITION) {
      if (this.agGridHelperService.cellValidation(this.params)) {
        this.setInitialState(this.params);
        // only start edit if key pressed is a number, not a letter
        this.cancelBeforeStart = !!(
          params.charPress && '1234567890'.indexOf(params.charPress) < 0
        );
      } else {
        this.cancelBeforeStart = true;
      }
    } else {
      this.setInitialState(this.params);
      this.cancelBeforeStart = !!(
        params.charPress && '1234567890'.indexOf(params.charPress) < 0
      );
    }
  }
  
  private setInitialState(params: ICellEditorParams): void {
    let startValue;
    let highlightAllOnFocus = true;

    if (params.eventKey === KEY_BACKSPACE || params.eventKey === KEY_DELETE) {
      // if backspace or delete pressed, we clear the cell
      startValue = '';
    } else if (params.charPress) {
      // if a letter was pressed, we start with the letter
      startValue = params.charPress;
      highlightAllOnFocus = false;
    } else {
      // otherwise we start with the current value
      startValue = params.value;
      if (params.eventKey === KEY_F2) {
        highlightAllOnFocus = false;
      }
    }
    //Updated to handle startvale as 0 and false
    if (startValue !== null && startValue !== undefined && startValue !== '') {
      switch (this.params.colDef.cellRendererParams.columntype) {
        case 'float':
        case 'floatneg':
          this.value = Number(Number(startValue).toFixed(2));
          break;
        default:
          this.value = Number(startValue);
          break;
      }
    }
    this.highlightAllOnFocus = highlightAllOnFocus;
  }

  public getValue(): number {
    this.value = this.isValidNumber(this.value);
    if (this.value) {
      return Number(this.value);
    } else {
      return this.value;
    }
  }

  private isValidNumber(number: number): number | null {
    if (String(number).match(/^[+-]?([0-9]*\.?[0-9]+|[0-9]+\.?[0-9]*)([eE][+-]?[0-9]+)?$/)) {
      return number;
    } else {
      return null;
    }
  }

  public isCancelBeforeStart(): boolean {
    return this.cancelBeforeStart;
  }
  //Udpated retun type to set new value every time
  public isCancelAfterEnd(): boolean {
    return false;
  }

  public editorInputKeyDown(event: KeyboardEvent): void {
    if (
      !this.finishedEditingPressed(event) &&
      !this.isKeyPressedNumeric(event)
    ) {
      if (event.preventDefault) event.preventDefault();
    }
    if (!this.checkForValidNegativeAndFloatNumber(event)) {
      if (event.preventDefault) event.preventDefault();
    }
    if (this.deleteOrBackspace(event)) {
      event.stopImmediatePropagation();
      event.stopPropagation();
    }
  }

  // dont use afterGuiAttached for post gui events - hook into ngAfterViewInit instead for this
  public ngAfterViewInit(): void {
    window.setTimeout(() => {
      this.input.element.nativeElement.focus();
      if (this.highlightAllOnFocus) {
        this.input.element.nativeElement.select();

        this.highlightAllOnFocus = false;
      } else {
        // when we started editing, we want the caret at the end, not the start.
        // this comes into play in two scenarios:
        //   a) when user hits F2
        //   b) when user hits a printable character
        const length = this.input.element.nativeElement.value
          ? this.input.element.nativeElement.value.length
          : 0;
        if (length > 0) {
          this.input.element.nativeElement.setSelectionRange(length, length);
        }
      }

      this.input.element.nativeElement.focus();
    });
  }

  private checkForValidNegativeAndFloatNumber(event: KeyboardEvent): boolean {
    if ((event.key === '.' && event.target['value'].includes('.')) || (event.key === '-' && (event.target['value'].includes('-')
    ))) {
      return false;
    }
    return true;
  }

  private isNumeric(charStr: string): boolean {
    const colType = this.params.colDef.cellRendererParams.columntype;
    switch (colType) {
      case 'number':
      case 'numeric':
      case 'integer':
        return !!/[0-9]/.test(charStr);
      case 'floatneg':
      case 'float':
        return !!/[0-9,.,-]/.test(charStr);
    }
  }

  private isKeyPressedNumeric(e: KeyboardEvent): boolean {
    const isModifierkeyPressed = (e.metaKey || e.ctrlKey || e.shiftKey);
    const isCursorMoveOrDeleteAction = (['Delete', 'Backspace', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) != -1);
    const vKey = 'v', cKey = 'c', aKey = 'a';
    switch (true) {
      case isCursorMoveOrDeleteAction:
      case isModifierkeyPressed == false && this.isNumeric(e.key):
      case (e.metaKey || e.ctrlKey) && ([vKey, cKey, aKey].indexOf(e.key) != -1):
        return true;
      default:
        return false
    }
  }

  private deleteOrBackspace(event: KeyboardEvent): boolean {
    return [KEY_DELETE, KEY_BACKSPACE].indexOf(event.key) > -1;
  }

  private isLeftOrRight(event: KeyboardEvent): boolean {
    return ['ArrowLeft', 'ArrowRight'].indexOf(event.key) > -1;
  }

  private finishedEditingPressed(event: KeyboardEvent): boolean {
    const key = event.key;
    return key === KEY_ENTER || key === KEY_TAB;
  }
}
