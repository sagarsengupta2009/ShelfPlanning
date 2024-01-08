import { AfterViewInit, Component, ViewChild, ViewContainerRef } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ICellEditorAngularComp } from 'ag-grid-angular';
import { ICellEditorParams } from 'ag-grid-community';
import { event } from 'jquery';
import { AgGridHelperService, DataValidationService } from 'src/app/shared/services';
import { ImageValidationConfig } from 'src/app/shared/services/layouts/data-validation/data-validation.service';

const KEY_BACKSPACE = 'Backspace';
const KEY_DELETE = 'Delete';
const KEY_F2 = 'F2';
const KEY_ENTER = 'Enter';
const KEY_TAB = 'Tab';
@Component({
  selector: 'shelf-string',
  templateUrl: './string.component.html',
  styleUrls: ['./string.component.scss']
})
export class StringComponent implements ICellEditorAngularComp, AfterViewInit {

  @ViewChild('input', { read: ViewContainerRef })
  public input!: ViewContainerRef;
  public params: ICellEditorParams;
  public value!: string | any; // For image file upload(for binary content needs to set it as any)
  public highlightAllOnFocus = true;
  private cancelBeforeStart = false;

  constructor(
    private readonly dataValidationService: DataValidationService
  ) { }

  public agInit(params: ICellEditorParams): void {
    this.params = params;
    this.setInitialState(this.params);

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

    this.value = startValue;
    this.highlightAllOnFocus = highlightAllOnFocus;
  }

 public getValue(): string {
    return this.value;
  }

  public isCancelBeforeStart(): boolean {
    return this.cancelBeforeStart;
  }


  public isCancelAfterEnd(): boolean {
    return false;
  }

  public editorInputKeyDown(event: KeyboardEvent): void {
    if (this.finishedEditingPressed(event)) {
      if (event.preventDefault) event.preventDefault();
    }
    if(this.deleteOrBackspace(event)){
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

  private deleteOrBackspace(event: KeyboardEvent): boolean {
    return [KEY_DELETE, KEY_BACKSPACE].indexOf(event.key) > -1;
  }

  private isLeftOrRight(event: KeyboardEvent): boolean {
    return ['ArrowLeft', 'ArrowRight'].indexOf(event.key) > -1;
  }

  private finishedEditingPressed(event: KeyboardEvent) : boolean {
    const key = event.key;
    return  key === KEY_TAB;
  }

  public onFileSelected(event) {
    if (event.target.files.length) {
      let file = event.target.files[0];

      const imageValidation = this.params.colDef.cellRendererParams.imageValidation;
      let isValidImage: boolean = true;
      if (file && imageValidation) {
        const imageValConfig: ImageValidationConfig = {
          file,
          supportedFileType: imageValidation.supportedFileType,
          supportedFileTypeErrMsg: imageValidation.supportedFileTypeErrMsg,
          maxFileSizeInKB: imageValidation.maxFileSizeInKB,
          maxFileSizeErrMsg: imageValidation.maxFileSizeErrMsg
        };
        isValidImage = this.dataValidationService.validateImage(imageValConfig);
        if (!isValidImage) {
          this.input.element.nativeElement.value = null; 
        }
      }
      
      if (file && isValidImage) {
        this.value = { content: '', file: file }
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.value.content = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    }
  }

}
