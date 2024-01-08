import { ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild, ViewEncapsulation } from '@angular/core';
import { COLOR_PALETTE } from 'src/app/shared/constants';
import { AnnotationType, PaletteSettings } from 'src/app/shared/models';
import { DataValidationService, ImageValidationConfig } from 'src/app/shared/services/layouts/data-validation/data-validation.service';
import { TranslateService } from '@ngx-translate/core';
import { Annotation, Fixture, Position, Section } from 'src/app/shared/classes';
import { MatDialog } from '@angular/material/dialog';
import { AnnotationImageDialogComponent } from '../annotation-image-dialog/annotation-image-dialog.component';
import { Subscription } from 'rxjs';
import { cloneDeep } from 'lodash';
import { SharedService } from 'src/app/shared/services';
import { MatSelect } from '@angular/material/select';

@Component({
  selector: 'sp-annotation-editor',
  templateUrl: './annotation-editor.component.html',
  styleUrls: ['./annotation-editor.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class AnnotationEditorComponent implements OnInit {
  @ViewChild('annotationText', { static: false }) annotationText: ElementRef<HTMLTextAreaElement>;
  private subscriptions: Subscription = new Subscription();
  public gradientSettings = {
    opacity: false,
  };
  public paletteSettings: PaletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE,
  };
  private selectedFile: File = null;
  public uploadImageText = "CLICK_TO_UPLOAD_AN_IMAGE";
  public selectedFileName: string = '';
  public imageClass: string;
  public fontSizes: number[] = [...Array(17).keys()].map(i => (i + 4)*2);
  public customFont: string = '';
  public annotationTxt: string = '';
  public isDirty: boolean = false;
  public isPogReadonly: boolean = false;
  @Input() originalAnnotation: Partial<Annotation>;
  @Input() annotation: Partial<Annotation>;
  @Input() referenceItem: Position | Fixture | Section;
  @Output() editAnnotation = new EventEmitter();
  @ViewChild('annImage', { static: false }) annImage: ElementRef<HTMLImageElement>;
  @ViewChild('fontSelect', { static: false }) fontSelect: MatSelect;
  constructor(
    private readonly translate: TranslateService,
    private readonly dataValidationService: DataValidationService,
    private readonly dialog: MatDialog,
    private readonly sharedService: SharedService,
    private readonly cd: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.setupAnnotations();
  }

  ngOnChanges(): void {
    this.setupAnnotations();
  }

  public get selectedPogItem(): Position | Fixture | Section {
    return this.referenceItem;
  }

  private setupAnnotations(){
    const section = this.sharedService.getObject(this.referenceItem.$sectionID, this.referenceItem.$sectionID) as Section;
    this.isPogReadonly = this.sharedService.getObjectFromIDPOG(section.IDPOG).IsReadOnly;
    if(this.originalAnnotation.LkExtensionType == AnnotationType.DUMMY_PLACEHOLDER){
      this.originalAnnotation.LkExtensionType = AnnotationType.TEXT_ANNOTATION;
    }
    const normalAnnotation = [AnnotationType.TEXT_ANNOTATION, AnnotationType.IMAGE_POP].includes(this.originalAnnotation.LkExtensionType);
    if (normalAnnotation) {
      this.annotation = cloneDeep(this.originalAnnotation);
      this.newFontSizePush(this.annotation?.Attribute.style.fontsize as any);
      this.imageClass = this.annImage && this.annImage.nativeElement.naturalHeight >= this.annImage.nativeElement.naturalWidth ? 'considerHeight' : 'considerWidth';
    }
  }
  public onFileSelected(event: any): void {
    const file = event.target.files[0] as File;
    if (file) {
      this.selectedFileName = '';
      this.annotation.Attribute.imgUrl = '';
      const imageValConfig: ImageValidationConfig = {
        file,
        supportedFileType: ['image/jpeg', 'image/png'],
        supportedFileTypeErrMsg: this.translate.instant('INCORRECT_FILE_TYPE') + ' ' + this.translate.instant('FILE_SHOULD_BE_JPEG_JPG_PNG'),
        maxFileSizeInKB: 1024,
        maxFileSizeErrMsg: 'FILE_SIZE_NOT_MORE_THAN_1_MB'
      };
      if (file && this.dataValidationService.validateImage(imageValConfig)) {
        this.selectedFile = file;
        this.selectedFileName = file.name;
        this.annotation.Attribute.imgUrl = URL.createObjectURL(file);
        this.uploadImageText = 'CLICK_TO_CHANGE_THE_IMAGE';
        setTimeout(() => {
          this.imageClass = this.annImage.nativeElement.naturalHeight >= this.annImage.nativeElement.naturalWidth ? 'considerHeight' : 'considerWidth';
        }, 150)
      } else {
        this.selectedFile = null;
      }
    }
  }

  public newFontSizePush(newFontSizeS: number, event?): void {
    let newFontSize: number = newFontSizeS as any;
    if (newFontSize && ((event?.key.toLowerCase()=='enter') || !event)) {
      if (event && (newFontSize < 8 || newFontSize > 80)) {
        this.customFont = null;
        return;
      }
      const index = this.fontSizes.findIndex((item) => item == (newFontSize));
      if (index < 0) {
        this.fontSizes.push(newFontSize);
      }
      if (this.annotation.Attribute?.style.fontsize) {
        this.annotation.Attribute.style.fontsize = newFontSizeS;
      }
      if (event) {
        this.fontSelect.close();
      }
    }
    this.checkIfDirty();
  }


  public selectImage(): void {
    const dialog = this.dialog.open(AnnotationImageDialogComponent, {
      height: '70%',
      width: '55%',
      panelClass: 'annotationHeight',
      data: this.referenceItem,
    });
    this.subscriptions.add(
      dialog.afterClosed().subscribe((imgObj) => {
        if (imgObj) {
          this.annotation.Attribute.imgUrl = imgObj.Image;
          this.annotation.Attribute.imgHeight = imgObj.imgContent.height;
          this.annotation.Attribute.imgWidth = imgObj.imgContent.width;
          this.checkIfDirty();
          this.cd.markForCheck();
        }
      }),
    );
  }

  public buttonClick(eventName): void {
    switch (eventName) {
      case 'add_photo':
        this.annotation.LkExtensionType = (this.annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION ? AnnotationType.IMAGE_POP : AnnotationType.TEXT_ANNOTATION);
        if (!this.annotation.Attribute.imgUrl) {
          this.selectImage();
        }
        break;
      case 'add_text':
        this.annotation.LkExtensionType = (this.annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION ? AnnotationType.IMAGE_POP : AnnotationType.TEXT_ANNOTATION);
        break;
      case 'delete':
        this.editAnnotation.emit({ 'action': eventName, 'annotation': this.originalAnnotation });
        this.isDirty = false;
        break;
      case 'save':
        this.editAnnotation.emit({ 'action': eventName, 'annotation': this.annotation });
        this.isDirty = false;
        break;
      case 'weight':
      case 'italic':
      case 'underline':
        this.annotation.Attribute.Font[eventName] = (this.annotation.Attribute.Font[eventName] ? 0 : 1);
        break;
      case 'color':
      case 'bgcolor':
      case 'lncolor':
      case 'fontsize':

        break;
      case 'imgDispType':
        this.annotation.Attribute.imgDispType = this.annotation.Attribute.imgDispType == 'tile' ? 'stretch' : 'tile';
        break;

    }

      setTimeout(() => this.checkIfDirty());

  }

  public checkIfDirty(): void {
    this.isDirty = false;
    if (!this.isPogReadonly) {
      if (this.annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION) {
        let keysStyle = Object.keys(this.originalAnnotation.Attribute.style);
        keysStyle?.forEach(key => {
          this.annotation.Attribute.style[key] != this.originalAnnotation.Attribute.style[key] ? this.isDirty = true : '';
        });
        if (this.annotation.Attribute?.Font) {
          let keysFont = Object.keys(this.originalAnnotation.Attribute?.Font);
          keysFont?.forEach(key => {
            this.annotation.Attribute?.Font[key] != this.originalAnnotation.Attribute?.Font[key] ? this.isDirty = true : '';
          });
        }
        this.annotation.Content != this.originalAnnotation.Content ? this.isDirty = true : '';
        if (!this.annotation.Content) {
          this.isDirty = false;
        }
      }
      else if (this.annotation.LkExtensionType == AnnotationType.IMAGE_POP) {
        this.annotation.Attribute.imgUrl != this.originalAnnotation.Attribute.imgUrl ? this.isDirty = true : '';
        this.annotation.Attribute.imgDispType != this.originalAnnotation.Attribute.imgDispType ? this.isDirty = true : '';
        this.annotation.Attribute.style.bgcolor != this.originalAnnotation.Attribute.style.bgcolor ? this.isDirty = true : '';
      }
      if (this.annotation.LkExtensionType != this.originalAnnotation.LkExtensionType) {
        if (this.annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION) {
          if (this.annotation.Content) {
            this.isDirty = true;
          }
        }
        else if (this.annotation.LkExtensionType == AnnotationType.IMAGE_POP) {
          if (this.annotation.Attribute.imgUrl) {
            this.isDirty = true;
          }
        }
      }
      this.cd.detectChanges();
    }
  }

  public textAreaHeight(content: string): string {
    const lines = content.split(/[\n]/);
    const offset = lines.length > 2 ? 1 : 0;
    const height = (lines.length < 5 ? lines.length : 5) * (19) + offset + 'px';
    return height;
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
