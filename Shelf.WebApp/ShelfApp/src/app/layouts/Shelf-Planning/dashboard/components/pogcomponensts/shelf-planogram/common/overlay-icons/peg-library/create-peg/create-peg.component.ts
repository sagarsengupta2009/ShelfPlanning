import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatTooltip } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { checkIfDuplicate } from 'src/app/shared/directive';
import { PegLibrary } from 'src/app/shared/models/peg-library';
import { DataValidationService, PegLibraryService, PlanogramStoreService } from 'src/app/shared/services';
import { ImageValidationConfig } from 'src/app/shared/services/layouts/data-validation/data-validation.service';

@Component({
  selector: 'shelf-create-peg',
  templateUrl: './create-peg.component.html',
  styleUrls: ['./create-peg.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CreatePegComponent implements OnInit, AfterViewInit, OnDestroy {
  private selectedFile: File = null;
  public uploadImageText = "CLICK_TO_UPLOAD_AN_IMAGE";
  private subscriptions: Subscription = new Subscription();

  public pegCreateForm: UntypedFormGroup;
  public selectedFileName: string = '';
  public numberDropdown = Array.from({ length: 5 }, (_, i) => i + 1);
  public frontBarDropdown = [1, 2];
  public frontSpaceLabelDisabled: boolean = true;
  public pegTagFieldsAsterisk: boolean = true;
  private pegTypes: string[] = [];
  public filteredPegTypes: Observable<string[]>;
  private pegNames: string[] = [];
  public filteredPegNames: Observable<string[]>;
  private pegVendors: string[] = [];
  public filteredPegVendors: Observable<string[]>;
  private pegPartIDs: string[] = [];
  public backSpaceLabelDisabled: boolean = true;
  public pegTypeMaxLength: number = 30;
  public pegNameMaxLength: number = 50;
  public pegVendorMaxLength: number = 50;
  public pegPartIDMaxLength: number = 30;
  public pegDescriptionMaxLength: number = 150;
  public isResizingTextarea: boolean = false;
  public rowSize: number = 2;
  public imageURL: string;
  public imageClass: string;
  public allowPegPartID: boolean = false;
  @ViewChild('PegDescription') pegDescription: ElementRef;
  @ViewChild('pegImage', { static: false }) pegImage: ElementRef<HTMLImageElement>;
  constructor(private readonly formBuilder: UntypedFormBuilder,
    private readonly pegLibraryService: PegLibraryService,
    private readonly translate: TranslateService,
    private readonly dataValidationService: DataValidationService,
    private readonly planogramStore: PlanogramStoreService
  ) { }

  ngOnInit(): void {
    this.allowPegPartID = this.planogramStore.appSettings.allowPegPartID;
    this.pegLibraryService.PegLibrary.forEach(pegLib => {
      this.pegTypes.push(pegLib.PegType);
      this.pegNames.push(pegLib.PegName);
      if (pegLib.PegVendor) {
        this.pegVendors.push(pegLib.PegVendor);
      }
      if (pegLib.PegPartID) {
        this.pegPartIDs.push(pegLib.PegPartID);
      }
    });
    this.pegCreateForm = this.createForm();

    this.filteredPegTypes = this.pegCreateForm.controls.PegType.valueChanges
      .pipe(
        startWith(''),
        map(pegType => pegType.length >= 1 ? this.pegTypes.filter(pt => pt.toLowerCase().indexOf(pegType.toLowerCase()) !== -1) : [])
    );

    this.filteredPegNames = this.pegCreateForm.controls.PegName.valueChanges
      .pipe(
        startWith(''),
        map(pegName => pegName.length >= 1 ? this.pegNames.filter(pt => pt.toLowerCase().indexOf(pegName.toLowerCase()) !== -1) : [])
    );

    this.filteredPegVendors = this.pegCreateForm.controls.PegVendor.valueChanges
      .pipe(
        startWith(''),
        map(pegVendor => pegVendor.length >= 1 ? this.pegVendors.filter(pt => pt.toLowerCase().indexOf(pegVendor.toLowerCase()) !== -1) : [])
      );

  }

  @HostListener('document:mousedown', ['$event'])
  onMouseDown(event: MouseEvent): void {
    this.isResizingTextarea = event.target === this.pegDescription.nativeElement;
  }

  @HostListener('document:mousemove')
  onMouseMove(): void {
    if (this.isResizingTextarea) {
      const textarea = this.pegDescription.nativeElement;
      const lineHeight = parseInt(getComputedStyle(textarea).lineHeight, 10);
      const textareaRows = textarea.scrollHeight / lineHeight;
      if (textareaRows > 5) {
        this.rowSize = 5;
        textarea.style.height = '60px';
        textarea.style.resize = 'none';
      }
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    this.isResizingTextarea = false;
    const textarea = this.pegDescription.nativeElement;
    if (textarea.style.resize === 'none') {
      textarea.style.resize = 'vertical';
    }
  }

  ngAfterViewInit() {
    this.listenToFieldChanges();
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0] as File;
    if (file) {
      this.selectedFileName = '';
      this.imageURL = '';
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
        this.imageURL = URL.createObjectURL(file);
        this.uploadImageText = 'CLICK_TO_CHANGE_THE_IMAGE';
        setTimeout(() => {
          this.imageClass = this.pegImage.nativeElement.naturalHeight >= this.pegImage.nativeElement.naturalWidth ? 'considerHeight' : 'considerWidth';
        }, 150)
      } else {
        this.selectedFile = null;
      }
    }
  }

  private createForm(): UntypedFormGroup {
    return this.formBuilder.group({
      PegGuid: [''],
      PegType: ['', [Validators.required, Validators.maxLength(this.pegTypeMaxLength)]],
      PegName: ['', [Validators.required, Validators.maxLength(this.pegNameMaxLength)]],
      PegVendor: ['', [Validators.maxLength(this.pegVendorMaxLength)]],
      PegPartID: ['', [Validators.maxLength(this.pegPartIDMaxLength), checkIfDuplicate(this.pegPartIDs)]],
      PegDescription: ['', [Validators.maxLength(this.pegDescriptionMaxLength)]],
      PegLength: ['', [Validators.pattern(/^(?=.*[1-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required]],
      HeightSlope: [0, [Validators.pattern(/^-?(?:0*(?:[0-9]|[1-3][0-9]|4[0-4])(?:\.\d{1,4})?|45(?:\.0{1,4})?)$/), Validators.required]],
      MaxPegWeight: ['', [Validators.pattern(/^(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/)]],
      PegWeight: ['', [Validators.pattern(/^(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/)]],
      BackHooks: ['', [Validators.required]],
      BackSpacing: [{ value: '', disabled: true }, [Validators.pattern(/^(?=.*[1-9])\d{1,2}(?:[.,]\d{1,4})?$/)]],
      BackYOffset: ['', [Validators.pattern(/^(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required, Validators.max(10)]],
      FrontBars: ['', [Validators.required]],
      FrontSpacing: [{ value: '', disabled: true }, [Validators.pattern(/^(?=.*[1-9])\d{1,2}(?:[.,]\d{1,4})?$/)]],
      IsPegTag: [true, Validators.required],
      TagHeight: ['', [Validators.pattern(/^(?=.*[1-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required]],
      TagWidth: ['', [Validators.pattern(/^(?=.*[1-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required]],
      TagYOffset: ['', [Validators.pattern(/^-?(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required]],
      TagXOffset: ['', [Validators.pattern(/^-?(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/), Validators.required]],
      PegImage: [''],
    });
  }


  private listenToFieldChanges(): void {
    this.subscriptions.add(this.pegCreateForm.get('BackHooks').valueChanges
      .pipe(distinctUntilChanged())
      .subscribe((newValue: number) => {
        if (newValue > 1) {
          this.pegCreateForm.controls['BackSpacing'].enable();
          this.backSpaceLabelDisabled = false;
        } else {
          this.pegCreateForm.controls['BackSpacing'].disable();
          this.backSpaceLabelDisabled = true;
          this.pegCreateForm.controls['BackSpacing'].reset();
        }
      }));
    this.subscriptions.add(this.pegCreateForm.get('FrontBars').valueChanges
    .pipe(distinctUntilChanged())
    .subscribe((newValue: number) => {
      if (newValue > 1) {
        this.pegCreateForm.controls['FrontSpacing'].enable();
        this.frontSpaceLabelDisabled = false;
      } else {
        this.disableAndResetFrontSpacing();
      }
    }));
    this.subscriptions.add(this.pegCreateForm.get('IsPegTag').valueChanges
    .pipe(distinctUntilChanged())
    .subscribe((newValue: boolean) => {
      if (newValue) {
        this.pegCreateForm.controls['TagHeight'].enable();
        this.pegCreateForm.controls['TagWidth'].enable();
        this.pegCreateForm.controls['TagYOffset'].enable();
        this.pegCreateForm.controls['TagXOffset'].enable();
        this.pegTagFieldsAsterisk = true;
      } else {
        this.pegCreateForm.controls['TagHeight'].disable();
        this.pegCreateForm.controls['TagHeight'].reset();

        this.pegCreateForm.controls['TagWidth'].disable();
        this.pegCreateForm.controls['TagWidth'].reset();

        this.pegCreateForm.controls['TagYOffset'].disable();
        this.pegCreateForm.controls['TagYOffset'].reset();

        this.pegCreateForm.controls['TagXOffset'].disable();
        this.pegCreateForm.controls['TagXOffset'].reset();

        this.pegTagFieldsAsterisk = false;
      }
    }));
  }

  public getPatternErrorTooltip(tooltip: MatTooltip, controlName: string): string {
    if (this.pegCreateForm.controls[controlName].errors && (this.pegCreateForm.controls[controlName].errors.pattern || this.pegCreateForm.controls[controlName].errors.max || this.pegCreateForm.controls[controlName].errors.isDuplicate)) {
      tooltip.show();
      let message = this.translate.instant('SHOULD_BETWEEN_1_TO_99');
      let tagOffsetMessage = this.translate.instant('SHOULD_BETWEEN_-99_TO_99');
      switch (controlName) {
        case 'PegLength':
          message = this.translate.instant('PEG_LENGTH') + ' ' + message;
          break;
        case 'BackSpacing':
          message = this.translate.instant('PEG_BACK_SPACING') + ' ' + message;
          break;
        case 'BackYOffset':
          message = this.translate.instant('BACK_YOFFSET_SHOULD_NOT_BE_GREATER_THAN_TEN');
          break;
        case 'FrontSpacing':
          message = this.translate.instant('PEG_FRONT_SPACING') + ' ' + message;
          break;
        case 'TagHeight':
          message = this.translate.instant('PEG_TAG_HEIGHT') + ' ' + message;
          break;
        case 'TagWidth':
          message = this.translate.instant('PEG_TAG_WIDTH') + ' ' + message;
          break;
        case 'TagYOffset':
          message = this.translate.instant('PEG_TAG_Y_OFFSET') + ' ' + tagOffsetMessage;
          break;
        case 'TagXOffset':
          message = this.translate.instant('PEG_TAG_X_OFFSET') + ' ' + tagOffsetMessage;
          break;
        case 'HeightSlope':
          message = this.translate.instant('HEIGHT_SLOPE_SHOULD_BETWEEN_-45_TO_45');
          break;
        case 'MaxPegWeight':
          message = this.translate.instant('PEG_MAX_WEIGHT') + ' ' + this.translate.instant('SHOULD_BETWEEN_0_TO_99');
          break;
        case 'PegWeight':
          message = this.translate.instant('PEG_WEIGHT') + ' ' + this.translate.instant('SHOULD_BETWEEN_0_TO_99');
          break;
        case 'PegPartID':
          message = this.translate.instant('PEG_PART_ID') + ' ' + this.translate.instant('SHOULD_BE_UNIQUE');
          break;
      }
      return message;
    }
  }

  public toggleTooltip(control: MatTooltip, show: boolean): void {
    control.tooltipClass = !show ? 'hide-tooltip' : '';
  }

  private disableAndResetFrontSpacing() {
    this.pegCreateForm.controls['FrontSpacing'].disable();
    this.pegCreateForm.controls['FrontSpacing'].reset();
    this.frontSpaceLabelDisabled = true;
  }

  onSave() {
    const pegLibrary: PegLibrary = { ...this.pegCreateForm.value };
    this.pegLibraryService.save([pegLibrary], this.selectedFile, undefined, true);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }
}
