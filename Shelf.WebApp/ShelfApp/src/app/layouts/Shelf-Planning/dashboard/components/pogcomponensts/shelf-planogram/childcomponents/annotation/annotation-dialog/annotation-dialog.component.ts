import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { extend, cloneDeep } from 'lodash-es';
import { COLOR_PALETTE } from 'src/app/shared/constants/colorPalette';
import { AnnotationDirection, AnnotationType } from 'src/app/shared/models';
import {
    HistoryService,
    PlanogramService,
    SharedService,
    PlanogramCommonService,
    PlanogramLibraryService,
    PanelBodyService,
    NotifyService,
    AnnotationSvgRenderService,
    AnnotationService,
} from 'src/app/shared/services';
import { AnnotationImageDialogComponent } from '../annotation-image-dialog/annotation-image-dialog.component';
import { TranslateService } from '@ngx-translate/core';
import { Position, Fixture, Section, Annotation } from 'src/app/shared/classes';
import { AppConstantSpace, Utils } from 'src/app/shared/constants';

interface FontSize {
    text: number;
    value: number;
}

interface ColorPaletteSettings {
    columns: number;
    palette: string[];
}

const fontSizes: FontSize[] = [
    { text: 12, value: 12 },
    { text: 14, value: 14 },
    { text: 16, value: 16 },
    { text: 18, value: 18 },
    { text: 20, value: 20 },
    { text: 24, value: 24 },
    { text: 36, value: 36 },
    { text: 48, value: 48 },
];
const paletteSettings: ColorPaletteSettings = {
    columns: 17,
    palette: COLOR_PALETTE,
};
const gradientSettings: { opacity: boolean } = {
    opacity: false,
};

enum AnnotationBGColor {
    'FC' = 'color',
    'BC' = 'bgColor',
    'LC' = 'lnColor',
}
@Component({
    selector: 'sp-annotation-dialog',
    templateUrl: './annotation-dialog.component.html',
    styleUrls: ['./annotation-dialog.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnnotationDialogComponent implements OnInit, OnDestroy {
    private subscriptions: Subscription = new Subscription();
    public customFontSize: number;

    private section: Section;
    /* TODO @karthik use annotation object class once all params are setup from planogram. */
    public annotation: Partial<Annotation>;
    annotationOrig = null;
    annotationPrevState;
    /* END TODO */
    public isPOGReadOnly: boolean = false;
    public availableFontSizes: FontSize[];
    public imageMode: boolean = false;
    public tileImage: boolean = false;
    public propertyGridType: string;
    public imgUrl: string = '';
    public imgWidth: number;
    public imgHeight: number;
    public annotationUpdated: boolean = false;
    private referenceItem: Position | Fixture | Section;
    public hierarchy: string = 'DUMMY_PLACEHOLDER';
    public dummyTrigger: boolean = false;
    constructor(
        private readonly sharedService: SharedService,
        private readonly planogramService: PlanogramService,
        private readonly planogramLibraryService: PlanogramLibraryService,
        private readonly annotationSvgRender: AnnotationSvgRenderService,
        private readonly planogramCommonService: PlanogramCommonService,
        private readonly historyService: HistoryService,
        private readonly panelBodyService: PanelBodyService,
        private readonly changeDetector: ChangeDetectorRef,
        private readonly dialog: MatDialog,
        private readonly notifyService: NotifyService,
        private readonly translateService: TranslateService,
        @Inject(MAT_DIALOG_DATA) public referenceData: {refObj: Position | Fixture | Section, hierarchy?: string},
        private readonly dialogref: MatDialogRef<AnnotationDialogComponent>,
        private readonly annotationService: AnnotationService,
    ) { }

    ngOnInit(): void {
      this.referenceItem = this.referenceData.refObj;
      this.hierarchy = this.referenceData.hierarchy;
      this.initializeAnnotation();

    }
    ngAfterViewInit(): void {
      this.subscriptions.add(this.planogramService.updateAnnotationDialog.subscribe((res) => {
        if (res) {
          let sectionID = this.sharedService.activeSectionID;
          let selectedObjectLst = this.planogramService.getSelectedObject(sectionID);
          if (selectedObjectLst?.length != 1) {
            this.dialogref.close();
          } else if ( this.hierarchy == 'section' && (res.refObj.$id!=this.referenceItem.$id || res.refObj.$id == sectionID )) {
            this.referenceItem = res.refObj as (Position | Fixture | Section);
            this.initializeAnnotation();
            this.changeDetector.detectChanges();
          } else if (this.hierarchy == 'freeFlow' && res.refObj.$id == sectionID) {
            if (res.annotationID) {
              if (res.annotationID == (this.annotation.IdPogObjectExtn || this.annotation.IdPogObjectExtnLocal).toString()) {
                this.dummyTrigger = this.dummyTrigger ? false : true;
                this.changeDetector.detectChanges();
              }
              return;
            }
            this.referenceItem = res.refObj as (Position | Fixture | Section);
            this.initializeAnnotation();
            this.changeDetector.detectChanges();
          }
        }
      }))
    }
    //TODO @karthik Need to analyze the references of all the annotation data being populated.
    ngOnDestroy(): void {
      // user closed dialog without saving changes, revert to old values before dialog was opened.
      if(this.annotationOrig && !this.annotationUpdated) {
        this.revertAnnotation();
      }
        this.subscriptions.unsubscribe();
    }

    public get selectedPogItem(): Position | Fixture | Section {
        return this.referenceItem;
    }

    public get paletteSettings(): ColorPaletteSettings {
        return paletteSettings;
    }

    public get gradientSettings(): { opacity: boolean } {
        return gradientSettings;
    }

    public fontFilter(value: number): void {
        if (value) {
            this.availableFontSizes = this.sharedService.runFilter(fontSizes, value.toString());
            let count = this.availableFontSizes.filter((x) => x.value == value);
            if (!count.length) {
                const font = {
                    text: value,
                    value,
                };
                this.availableFontSizes.push(font);
            }
        } else {
            this.availableFontSizes = fontSizes;
        }
    }

    public changeFont(fontSize: FontSize): void {
        this.annotation.Attribute.style.fontsize = fontSize.value;
    }

    public switchImageMode(): void {
        if (this.imageMode) {
            this.annotation.LkExtensionType = AnnotationType.IMAGE_POP;
        } else {
            this.annotation.LkExtensionType = AnnotationType.TEXT_ANNOTATION;
        }
    }

    public colorChange(color: string, value: string): void {
        this.annotation.Attribute.style[AnnotationBGColor[value]] = color;
    }

    public getImage(): string {
        const item = this.selectedPogItem as Position;
        if (item?.Position?.ProductPackage.Images.front != null) {
            return item.Position.ProductPackage.Images.front;
        } else {
            return AppConstantSpace.DEFAULT_PREVIEW_SMALL_IMAGE;
        }
    }

    public validAnnotation(): boolean {
        if (
            this.annotation.LkExtensionType == AnnotationType.TEXT_ANNOTATION &&
            (this.annotation.Content == null || this.annotation.Content.length == 0)
        ) {
            this.notifyService.warn(this.translateService.instant('PLEASE_ENTER_THE_ANNOTATION_CONTENT'));
            return false;
        } else if (
            this.annotation.LkExtensionType == AnnotationType.IMAGE_POP &&
            this.annotation.Attribute.imgUrl == null
        ) {
            this.notifyService.warn(this.translateService.instant('ANNOTATION_PLEASE_SELECT_THE_IMAGE'));
            this.annotation.Content = '';
            return false;
        } else {
            return true;
        }
    }
    public editAnnotation(event) {
      this.annotation = this.annotationService.assignAnnotationProperties(event.annotation, this.annotation);
      if (event.action == 'delete') {
        this.deleteAnnotation();
      } else if (event.action == 'save') {
        this.saveAnnotation();
      }
    }
    public deleteAnnotation(): void {
        /****** History Recording ******/
        const isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_TEXT, AnnotationType.FREEFLOW_CONNECTOR].includes(this.annotation.LkExtensionType);
        if (!this.isPOGReadOnly) {
            this.historyService.startRecording();
            let original = ((annotation, laststatus) => {
                return () => {
                    annotation.status = laststatus;
                    annotation.Content = '';
                    annotation.Attribute.imgUrl = null;
                };
            })(this.annotation, 'deleted');
            let revert = ((annotation, laststatus, content, imgUrl) => {
                return () => {
                    annotation.status = laststatus;
                    annotation.Content = content;
                    annotation.Attribute.imgUrl = imgUrl;
                };
            })(
              this.annotation,
              this.annotation.status,
              this.annotation.Content,
              this.annotation.Attribute.imgUrl,
            );
            this.historyService.captureActionExec({
                funoriginal: original,
                funRevert: revert,
                funName: 'DeleteAnnotation',
            }, this.section.$id);
            this.historyService.stopRecording();
        }
        /*** History Recording End ***/
        this.annotation.status = 'deleted';
        this.annotation.Content = '';
        this.annotation.Attribute.imgUrl = null;
        this.section.computeAnnotationDimension();
        this.sharedService.updateAnnotationPosition.next(true);
        this.planogramService.UpdatedSectionObject.next(this.section);
        this.changeDetector.markForCheck();
        if (this.isPOGReadOnly) {
            this.subscriptions.add(
                this.planogramService.saveAnnotationforReadonlyPlanogram(this.annotationOrig).subscribe(
                    (res) => {
                        this.annotation.status = 'deleted';
                    },
                    (error) => {
                        console.error('Annotation could not be deleted.');
                        console.error(error);
                    },
                ),
            );
        }
        this.annotationUpdated = true;
        this.planogramService.updateAnnotationDialog.next({ refObj: this.section, hierarchy: isFreeFlow ? 'freeFlow' : 'section' });
        !isFreeFlow ? this.dialogref.close() : '';
    }

    public saveAnnotation(): void {
        const isFreeFlow = [AnnotationType.FREEFLOW_BOX, AnnotationType.FREEFLOW_TEXT, AnnotationType.FREEFLOW_CONNECTOR].includes(this.annotation.LkExtensionType);
        if ([AnnotationType.TEXT_ANNOTATION].includes(this.annotation.LkExtensionType) && this.annotation.status == 'new') {
          let dim = this.annotationService.getDimensionsByFont(this.annotation.Content, this.annotation.Attribute.Font, this.annotation.Attribute.style, this.annotation.$sectionID);
          this.annotation.Attribute.location.width = this.planogramService.convertToUnit(dim.width, this.annotation.$sectionID);
          this.annotation.Attribute.location.height = this.planogramService.convertToUnit(dim.height, this.annotation.$sectionID);
        }
        if (!this.validAnnotation()) return;
        let isNewAnnotation = false;
        if (this.annotation.status == 'new') {
            this.annotation.status = 'insert';
            isNewAnnotation = true;
            this.addAnnotation();
        } else {
            this.annotation.status = this.annotation.status != 'insert' ? 'update' : 'insert';
            this.annotationOrig = cloneDeep(this.annotation);
            // update the value in object list
            this.planogramService.setSelectedAnnotation(this.annotation.$sectionID, this.annotation);

            if (!this.isPOGReadOnly) {
                this.historyService.startRecording();
                const original = ((state) => {
                    return () => {
                        const annotationData = state;
                        this.panelBodyService.annotationUndoRedo.next(annotationData);
                        this.sharedService.updateAnnotationPosition.next(true);
                    };
                })(cloneDeep(this.annotationOrig));
                const revert = ((state) => {
                    return () => {
                        const annotationData = state;
                        this.panelBodyService.annotationUndoRedo.next(annotationData);
                        this.sharedService.updateAnnotationPosition.next(true);
                    };
                })(this.annotationPrevState);
                this.historyService.captureActionExec({
                    funoriginal: original,
                    funRevert: revert,
                    funName: 'ModifyAnnotation',
                }, this.section.$id);
                this.historyService.stopRecording();
            }
        }

        this.section.PogObjectExtension = this.section.PogObjectExtension.map((element) => {
          // section annotations do not have IDPOGObject
            if (element.IDPOGObject && element.IDPOGObject == this.annotation.IDPOGObject) {
                return (element = this.annotation);
            } else {
                return element;
            }
        });

        this.section.annotations = this.section.annotations.map((element) => {
            if (element.$id == this.annotation.$id) {
                return (element = this.annotation);
            } else {
                return element;
            }
        });

        !isFreeFlow ? this.section.computeAnnotationDimension() : '';
        this.sharedService.updateAnnotationPosition.next(true);
        this.sharedService.saveAnnotationPosition.next(true);
        if (isNewAnnotation) {
            this.sharedService.newAnnotationCreated.next(true);
        }
        this.planogramService.UpdatedSectionObject.next(this.section);
        this.planogramService.updateNestedStyleDirty = true;;
        this.changeDetector.markForCheck();
        if (this.isPOGReadOnly) {
            this.subscriptions.add(
                this.planogramService.saveAnnotationforReadonlyPlanogram(this.annotation).subscribe(
                    (res) => {
                        if (this.annotation) this.annotation.status = 'saved';
                        this.annotation.status = 'saved';
                    },
                    (error) => {
                        console.error('Annotation could not be saved.');
                        console.error(error);
                    },
                ),
            );
        }
        !isFreeFlow ? this.dialogref.close() : '';
        this.annotationUpdated = true;
    }

    public selectImage(): void {
        const dialog = this.dialog.open(AnnotationImageDialogComponent, {
            height: '70%',
            width: '55%',
            panelClass: 'annotationHeight',
            data: this.selectedPogItem,
        });
        this.subscriptions.add(
            dialog.afterClosed().subscribe((imgObj) => {
                if (imgObj) {
                    this.imgUrl = imgObj.Image;
                    this.imgHeight = imgObj.imgContent.height;
                    this.imgWidth = imgObj.imgContent.width;
                    this.changeDetector.markForCheck();
                }
            }),
        );

    }

    public trackByFont(index, item): number {
        return item.value;
    }

    private addAnnotation(): void {
      this.annotationService.addAnnotation(this.annotation as Annotation, this.section, this.referenceItem);
      this.section.showAnnotation =  this.planogramService.rootFlags[this.section.$id].isAnnotationView = 1;
    }

    private initializeAnnotation(): void {
        const annotationList = this.planogramService.getSelectedAnnotation(this.selectedPogItem.$sectionID);
        if (annotationList.length > 0 && this.hierarchy != 'DUMMY_PLACEHOLDER') {
            this.populateAnnotation(true, annotationList[annotationList.length - 1]);
            this.planogramService.removeSelectedAnnotation();
        } else {
            this.populateAnnotation(false);
        }
        this.propertyGridType = this.selectedPogItem.ObjectType;
        if (this.annotation.LkExtensionType == AnnotationType.IMAGE_POP) {
            this.imageMode = true;
        }
        if (this.annotation.Attribute.imgDispType == 'tile') {
            this.tileImage = true;
        }
    }

    private populateAnnotation(annotationClicked, annotationObj?): void {
        const sectionID = this.sharedService.getActiveSectionId();
        this.section = this.sharedService.getObject(sectionID, sectionID) as Section;
        if (annotationClicked || this.selectedPogItem.ObjectDerivedType != 'Section') {
          this.annotation  = annotationObj ? annotationObj : this.section.getAnnotation(this.referenceItem.$id);
          if (this.annotation && !('Font' in this.annotation?.Attribute)) {
            this.annotation.Attribute.Font = { weight: 0, italic: 0, underline: 0 };
          }
          this.annotationOrig = cloneDeep(this.annotation);
        } else {
            // In case of right click on section always create a new annotation.
            this.annotation = null;
            this.annotationOrig = null;
        }
        if (!this.annotation || this.annotation?.status == 'deleted') {
            this.annotation = {
                IdPogObjectExtnLocal: Utils.generateGUID(),
                Content: '',
                LkExtensionType: this.hierarchy == 'freeFlow' ? AnnotationType.FREEFLOW_BOX :
                                (this.hierarchy == 'section' ? AnnotationType.TEXT_ANNOTATION :
                                AnnotationType.DUMMY_PLACEHOLDER),
                $belongsToID: this.referenceItem.$id,
                status: 'new',
                Attribute: {
                    calloutLocation: undefined,
                    location: {
                        width: 10,
                        height: 6,
                        locX: null,
                        locY: null,
                        locZ: null,
                        relLocX: null,
                        relLocY: null,
                        top: null,
                        direction: AnnotationDirection.BOTTOM_RIGHT,
                    },
                    style: { bgcolor: '#ffffff', lncolor: '#FF0000', color: '#000000', fontfamily: 'Roboto', fontsize: 16 },
                    callout: true,
                    imgDispType: 'stretch',
                    iPointSize: false,
                    imgHeight: null,
                    imgUrl: null,
                    imgWidth: null,
                    Font:{weight:0,italic:0,underline:0}
                },
                $sectionID: this.referenceItem.$sectionID,
            };
        }
        this.imgUrl = this.annotation.Attribute.imgUrl;
        this.annotationPrevState = cloneDeep(this.annotation);

        //Check if the section is readonly from the library service.
        for (const planogramMapperValue of this.planogramLibraryService.mapper) {
            let obj = planogramMapperValue;
            if (obj.IDPOG == this.section.IDPOG) {
                this.isPOGReadOnly = obj.IsReadOnly;
                break;
            }
        }
        let currentFontSizeExists = false;
        const currentFontSize = this.annotation.Attribute.style.fontsize = Number(this.annotation.Attribute.style.fontsize);
        this.availableFontSizes = fontSizes;
        for (const fontSizeValue of fontSizes) {
            if (fontSizeValue.value === currentFontSize) {
              currentFontSizeExists = true;
                break;
            }
        }
        if (!currentFontSizeExists) {
            this.availableFontSizes.push({
              text: currentFontSize,
              value: currentFontSize
            });
            this.customFontSize = currentFontSize;
        }
        this.availableFontSizes.sort((a,b) => a.value - b.value);
    }

  /** Function to enter only positive number */
  public onKeypressEvent(event: KeyboardEvent): void {
    let key = event.key.toLowerCase();
        if ( key== 'arrowup' || key == 'arrowdown') {
            event.stopImmediatePropagation();
        }
   }

    // reverting selective data
    private revertAnnotation() :void {
      this.annotation.Content = this.annotationOrig.Content;
      this.annotation.Attribute.location.height = this.annotationOrig.Attribute.location.height;
      this.annotation.Attribute.location.width = this.annotationOrig.Attribute.location.width;
      this.annotation.Attribute.style.color = this.annotationOrig.Attribute.style.color ;
      this.annotation.Attribute.style.fontsize = this.annotationOrig.Attribute.style.fontsize ;
      this.annotation.Attribute.style.bgcolor = this.annotationOrig.Attribute.style.bgcolor;
      this.annotation.Attribute.style.lncolor = this.annotationOrig.Attribute.style.lncolor;
      this.annotation.LkExtensionType = this.annotationOrig.LkExtensionType;
    }
}
