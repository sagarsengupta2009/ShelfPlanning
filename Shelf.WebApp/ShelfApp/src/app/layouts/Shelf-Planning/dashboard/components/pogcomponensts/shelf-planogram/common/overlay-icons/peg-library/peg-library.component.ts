import { AfterViewInit, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { GridColumnCustomConfig, GridConfig } from 'src/app/shared/components/ag-grid/models';
import { AgGridComponent } from 'src/app/shared/components/ag-grid';
import { MatDialog } from '@angular/material/dialog';
import { AgGridHelperService, NotifyService, PegLibraryService, PlanogramStoreService, SharedService, UserPermissionsService } from 'src/app/shared/services';
import { CreatePegComponent } from './create-peg/create-peg.component';
import { ColDef } from 'ag-grid-community/dist/lib/entities/colDef';
import { Subscription } from 'rxjs';
import { ImagePreviewComponent } from './image-preview/image-preview.component';
import { Utils } from 'src/app/shared/constants';
import { PegLibrary } from 'src/app/shared/models/peg-library';
import { ExcelExportParams, RowNode } from 'ag-grid-community';
import { TranslateService } from '@ngx-translate/core';
import { ConfirmationDialogComponent } from 'src/app/shared/components';
import { IApiResponse, WorksheetEventData } from 'src/app/shared/models';
import { AgGridStoreService } from 'src/app/shared/components/ag-grid/services/ag-grid-store.service';

declare const window: any;
@Component({
  selector: 'shelf-peg-library',
  templateUrl: './peg-library.component.html',
  styleUrls: ['./peg-library.component.scss']
})
export class PegLibraryComponent implements OnInit, AfterViewInit {
  private column: ColDef[];
  private data: PegLibrary[] = [];
  private datatoUpdate: PegLibrary[] = [];
  public selectedActivePegLibrarys: PegLibrary[] = [];
  public selectedInActivePegLibrarys: PegLibrary[] = [];
  public pegGridConfig: GridConfig;
  @ViewChild('agGrid') gridComp: AgGridComponent;
  private selectedFile: File = null;
  private uploadImageText = "CLICK_TO_UPLOAD_AN_IMAGE";
  public selectedFileName: string = this.uploadImageText;
  private subscriptions: Subscription = new Subscription();
  public createDisabled: boolean = true;
  public saveEnabled: boolean = false;
  public uploadedImages: { pegId: number, file: File, fileName: string }[] = [];
  public isToggleOn: boolean = false;
  public toggleDisabled: boolean = true;
  private selectedRows: number[] = [];
  private removeSelectionOnActionIcon = { PegGuid: -1, isClickOnActionIcon: false }
  constructor(private readonly sharedService: SharedService,
    private readonly dialog: MatDialog,
    private readonly agGridHelperService: AgGridHelperService,
    private readonly pegLibraryService: PegLibraryService,
    private readonly notifyService: NotifyService,
    private readonly userPermissions: UserPermissionsService,
    private readonly translate: TranslateService,
    private elementRef: ElementRef,
    private readonly agGridStoreService: AgGridStoreService,
    private readonly planogramStore: PlanogramStoreService
  ) {
    //   this.gridSource = data.gridSource;
  }
  ngAfterViewInit(): void {
    this.subscriptions.add(this.pegLibraryService.updateGrid.subscribe((result) => {
      if (result) {
        this.setupPegLibrary();
        this.saveEnabled = false;
      }
    }));
    this.sharedService.workSheetEvent.subscribe((response: WorksheetEventData) => {
      if (response && response.gridType == 'PegLibrary') {
          this.gridComp.updateValue(response, 'IDPegLibrary', response.field);
      }
  })
  }

  ngOnInit(): void {
    this.setupPegLibrary();
    this.datatoUpdate = [];
    this.saveEnabled = false;
  }

  @HostListener('document:mousedown', ['$event.target'])
  clickedOutside(targetElement) {
    const clickedInside = this.elementRef.nativeElement.parentElement.parentElement.contains(targetElement);
    const isOtherDialogsOpen = this.dialog.openDialogs.filter(dialogRef => dialogRef.componentInstance !== this.pegLibraryService.pegLibraryDialogRef.componentInstance).length > 0;

    if (!isOtherDialogsOpen && !clickedInside) {
      this.checkUnsavedChanges();
    }
  }

  @HostListener('document:keydown.escape')
  clickedESC() {
    this.checkUnsavedChanges();
  }

  private checkUnsavedChanges(): void{
    if (this.saveEnabled) {
      const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
        data: this.translate.instant('SAVEALERT'),
        disableClose: true
      });
      const subscription = dialogRef.afterClosed().subscribe(result => {
        if (result) {
          this.onSave();
        }
        this.pegLibraryService.pegLibraryDialogRef.close();
      });
      this.subscriptions.add(subscription);
    } else {
      this.pegLibraryService.pegLibraryDialogRef.close();
    }
  }

  public setupPegLibrary() {
      this.pegLibraryService.updatePegLibrary();
      this.initPegLibGrid();
  }

  private bindPegLibraryDataGrid(data: PegLibrary[]): void {
    this.pegGridConfig = {
      ...this.pegGridConfig,
      id: `pegLibrary-grid`,
      columnDefs: this.column,
      data: data,
      height: 'calc(100% - 8vh)',
      firstCheckBoxColumn: { show: true, template: `[1,2].includes(dataItem.IDPegLibrary)` },
      menuItems: [
        {
          order: 1,
          key: 'preview_peg_image',
          menuId: 0,
          icon: 'remove_red_eye',
          description: 'Click to View Image',
          text: 'View Image',
          colId: 'PegImage'
        }
      ]
    };
  }

  public createPegItem() {
    this.pegLibraryService.createPegDialogRef = this.dialog.open(CreatePegComponent, {
      height: 'auto',
      width: '75%',
    });
    this.pegLibraryService.createPegDialogRef.afterClosed().subscribe((result) => {
    });
    this.pegLibraryService.createPegDialogRef.beforeClosed().subscribe((result) => {
      if (this.sharedService.link == 'allocate') {
        window.parent.expandFrame(false);
      }
    });
  }

  public initPegLibGrid(): void{
    const permission = this.userPermissions.getPermissions('PEG_LIBRARY');
    const readPermission = this.userPermissions.hasReadPermission('PEG_LIBRARY');
    const updatePermission = this.userPermissions.hasUpdatePermission('PEG_LIBRARY');
    const createPermission = this.userPermissions.hasCreatePermission('PEG_LIBRARY');
    this.data = this.pegLibraryService.PegLibrary;
    let gridColumnCustomConfig: GridColumnCustomConfig = {
      editableCallbacks: [
        {
          isEditableCallbackRequired: true,
          fieldsToValidateForCallback: ['TagHeight', 'TagWidth', 'TagYOffset', 'TagXOffset'],
          editableCallbackTemplate: 'params.data.IsPegTag ? true : false'
        },
        {
          isEditableCallbackRequired: true,
          fieldsToValidateForCallback: ['BackSpacing'],
          editableCallbackTemplate: 'params.data.BackHooks > 1 ? true : false'
        },
        {
          isEditableCallbackRequired: true,
          fieldsToValidateForCallback: ['FrontSpacing'],
          editableCallbackTemplate: 'params.data.FrontBars > 1 ? true : false'
        }
      ],
      isImageColEditable: { fields: ['PegImage'] },
      imageValidation: {
        field: 'PegImage',
        maxFileSizeInKB: 1024,
        supportedFileType: ['image/jpeg', 'image/png'],
        supportedFileTypeErrMsg: this.translate.instant('INCORRECT_FILE_TYPE') + ' ' + this.translate.instant('FILE_SHOULD_BE_JPEG_JPG_PNG'),
        maxFileSizeErrMsg: 'FILE_SIZE_NOT_MORE_THAN_1_MB'
      },
      dirtyCheckCol: {
        field: 'IDPegLibrary'
      }
    }
    this.column = this.agGridHelperService.getAgGridColumns('pegLibrary-grid', gridColumnCustomConfig);
    if (!this.planogramStore.appSettings.allowPegPartID) {
      this.column = this.column.filter(col=>col?.field != 'PegPartID');
      this.column?.forEach((col) => {
        col.field == 'PegPartID' ? col.hide = true: '';
      });
    }
    if ((readPermission && !updatePermission) || permission === undefined) {
      this.column?.forEach((col) => {
        col.editable = false
      })
    }
    if (!createPermission) {
      this.createDisabled = false;
    }
    this.bindPegLibraryDataGrid(this.data);
  };

  public cellClickHandler(event): boolean {
    return this.pegLibraryService.cellValidation(event, event.event.column.colId)
  }

  public updateValue(event): void {
   if (this.validateFields(event?.event?.colDef?.field, event.event.value, event.event.data) && this.validateMaxValue(event.event.value, event?.event?.colDef?.cellRendererParams.columntype)) {
      let index = this.datatoUpdate.findIndex(e => e.PegGuid === event.event.data.PegGuid);
      if (index === -1) {
        this.datatoUpdate.push(JSON.parse(JSON.stringify(event.event.data)));
      } else {
        this.datatoUpdate[index] = JSON.parse(JSON.stringify(event.event.data));
      }
      // Only update last edited image
      if (event?.event?.colDef?.field === 'PegImage') {
        const indexInDataToUpdate = this.datatoUpdate.findIndex(e => e.PegGuid === event.event.data.PegGuid);
        this.datatoUpdate[indexInDataToUpdate].PegImage = '';

        this.selectedFile = event.event.value.file ?? null;
        this.selectedFileName = this.selectedFile?.name ?? this.uploadImageText;

        const imageExistanceIndex = this.uploadedImages.findIndex(ele => ele.pegId === event.event.data.IDPegLibrary);
        if (imageExistanceIndex !== -1) {
          this.uploadedImages.splice(imageExistanceIndex, 1);
        }
        let fileToUpload = {
          pegId: event.event.data.IDPegLibrary,
          file: event.event.value.file,
          fileName: event.event.data.IDPegLibrary + '_' + this.selectedFile?.name
        }
        this.uploadedImages.push(fileToUpload);
      }
      this.saveEnabled = true;
      this.agGridStoreService.editedCellList.push(event.event.data.IDPegLibrary);
      event?.event?.api?.refreshCells({
        rowNodes: [event.event.node]
      });
    } else {
      event.event.node.setDataValue(`${event?.event?.colDef?.field}`, event.event.oldValue);
    }

    if (![1, 2].includes(event.event.data?.IDPegLibrary) && event?.event?.colDef?.field === 'IsActive') {
      if (event.event.oldValue !== event.event.newValue) {
        const formatdata = { "ids": [event.event?.data?.IDPegLibrary], "isActive": event.event.data.IsActive }
        if (formatdata) {
          this.pegLibraryService.updatePegLibraryStatus(formatdata)
          this.isToggleOn = !this.isToggleOn;
          if (this.agGridStoreService.editedCellList.length) {
              this.agGridStoreService.editedCellList = [];
          }
        }
      }
    }
  }

  private validateMaxValue(data: number, type: string): boolean {
    if (type === 'number' || type === 'float') {
      if (data < 99.9999) {
        return true;
      } else {
        this.notifyService.warn('VALUE_SHOULD_BE_LESS_THAN_99.9999');
        return false
      }
    }
    return true;
  }

  public onMenuSelect(event): void {
    if (event && event.menu && event.data) {
      switch (event.menu.key) {
        case 'preview_peg_image':
          this.dialog.open(ImagePreviewComponent, {
            height: '500px',
            width: '500px',
            data: { PegImage: event.data.PegImage },
          });
          break;
      }
    }
  }

  private validateFields(fieldName: string, data: number, pegLibdata?: PegLibrary): boolean {
    if([1,2].includes(pegLibdata?.IDPegLibrary)){
      this.notifyService.warn('UPDATES_ARE_NOT_ALLOWED_FOR_DEFAULT_PEG_TYPES_1_AND_2');
      return false;
    }
    switch (fieldName) {
      case 'PegName':
      case 'PegVendor':
      case 'PegDescription':
      case 'PegPartID':
      case 'PegType':
        return this.validateStringLength(fieldName, pegLibdata);
      case 'TagHeight':
      case 'TagWidth':
        return this.validateTagHeightORTagWidth(data);
      case 'PegLength':
        return this.validatePegLength(data);
      case 'BackYOffset':
        return this.validateBackYOffset(data);
      case 'HeightSlope':
        return this.validateHeightSlope(data);
      case 'FrontSpacing':
        return this.validateFrontSpacing(data, pegLibdata);
      case 'FrontBars':
        return this.validateFrontBars(data, pegLibdata);
      case 'BackSpacing':
        return this.validateBackSpacing(data, pegLibdata);
      case 'TagYOffset':
        return this.validateTagYOffset(data, pegLibdata);
      case 'TagXOffset':
        return this.validateTagXOffset(data, pegLibdata);
      default:
        return true;
    }

  }

  private validateStringLength(field: string, data: PegLibrary) {
    switch (field) {
      case 'PegName':
      case 'PegVendor':
        if (data[field].length > 50) {
          this.notifyService.warn('LENGTH_CANT_BE_MORE_THAN_50');  // translation
          return false;
        }
        return true;
      case 'PegDescription':
        if (data[field].length > 150) {
          this.notifyService.warn('LENGTH_CANT_BE_MORE_THAN_150');  // translation
          return false;
        }
        return true;
      case 'PegPartID':
      case 'PegType':
        if (data[field].length > 30) {
          this.notifyService.warn('LENGTH_CANT_BE_MORE_THAN_30');  // translation
          return false;
        }
        if(field=='PegPartID'){
          if(this.isDuplicatePegPartID(data[field], data.IDPegLibrary)){
            this.notifyService.warn('PEGPARTID_SHOULD_BE_UNIQUE');
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  }

  private isDuplicatePegPartID(pegPartID: string, pegID: number): boolean{
    let pegPartIDs=[]
    this.pegLibraryService.PegLibrary.forEach(pegLib => {
      if (pegLib.PegPartID) {
        pegPartIDs.push(pegLib.PegPartID.toUpperCase());
      }
    });
    this.gridComp?.gridConfig?.data?.forEach(pegLib => {
      if (pegLib.PegPartID && !pegPartIDs.includes(pegLib.PegPartID.toUpperCase()) && pegLib.IDPegLibrary!=pegID) {
        pegPartIDs.push(pegLib.PegPartID.toUpperCase());
      }
    });
    return pegPartIDs.includes(pegPartID.toUpperCase());
  }

  public changeFillUpDownDataEvent(data){
    const isPegPartID = data.field == 'PegPartID';
    const restrictedUpdates = data.updatedRows.some(peg=>[1,2].includes(peg.IDPegLibrary));
    if (isPegPartID || restrictedUpdates) {
      data.updatedRows.forEach((peg, index) => {
        let oldValue = data.oldValues.find(oldPeg => oldPeg.IDPegLibrary == peg.IDPegLibrary);
        const dObj = {
          field: data.field,
          newValue: oldValue.oldValue,
          IDPegLibrary: peg.IDPegLibrary,
          gridType: 'PegLibrary',
          tab: null,
        };
        if (isPegPartID || restrictedUpdates && [1, 2].includes(peg.IDPegLibrary)) {
          this.sharedService.workSheetEvent.next(dObj);
        }
      });
      if (isPegPartID) {
        this.notifyService.warn('PEGPARTID_SHOULD_BE_UNIQUE');
      }
      else if (restrictedUpdates) {
        this.notifyService.warn('UPDATES_ARE_NOT_ALLOWED_FOR_DEFAULT_PEG_TYPES_1_AND_2');
      }
      return false;
    }
    return true;
  }

  private validateTagYOffset(value: number, data: PegLibrary): boolean {
    return true;
  }

  private validateTagXOffset(value: number, data: PegLibrary): boolean {
    return true;
  }

  private validateBackSpacing(value: number, data: PegLibrary): boolean {
    if (data.BackHooks === 1) {
      this.notifyService.warn('BACKSPACING_CANT_BE_APPLIED_WHEN_BACKHOOK_IS_ONE');  // translation
      return false;
    }
    if (Utils.isNullOrEmpty(value)) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    }
    return true;
  }

  private validateIsNullOrEmpty(data: number): boolean {
    if (Utils.isNullOrEmpty(data) || data === 0) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    } else {
      return true;
    }
  }

  private validateHeightSlope(data: number): boolean {
    if (Utils.isNullOrEmpty(data)) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    } else {
      if (data > Number(-45) && data < Number(45)) {
        return true;
      } else {
        this.notifyService.warn('HEIGHT_SLOPE_IS_NOT_UNDER-PERMISSIBLE_VALUE_OF_PEGBOARD');
        return false;
      }
    }
  }

  private validatePegLength(data: number): boolean {
    if (!data) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    }
    return true;
  }

  private validateBackYOffset(data: number): boolean {
    if (Utils.isNullOrEmpty(data)) {
      this.notifyService.warn('VALUE_CANNOT_BE_NULL');
      return false;
    } else {
      if (data > 10) {
        this.notifyService.warn('BACK_YOFFSET_SHOULD_NOT_BE_GREATER_THAN_TEN');
        return false;
      }
      return true;
    }
  }

  private validateTagHeightORTagWidth(data: number): boolean {
    if (Utils.isNullOrEmpty(data)) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    } else if (this.checkGtrThanZeroLesThan100(data)) {
      return true;
    } else {
      this.notifyService.warn('VALUE_SHOULD_GREATERTHANZERO_LESSTHAN100');
      return false;
    }
  }

  private checkGtrThanZeroLesThan100(value: number): boolean {
    const pattern = /^(?=.*[1-9])\d{0,2}(?:\.\d{0,2})?$/; ///^(?=.*[0-9])\d{1,2}(?:[.,]\d{1,4})?$/;
    return pattern.test(value.toString());
  }

  private validateFrontSpacing(value: number, data: PegLibrary): boolean {

    const frontBarLimit = (value - 1) * data.FrontSpacing;
    const backHookLimit = (data.BackHooks - 1) * data.BackSpacing;
    if (frontBarLimit <= backHookLimit) {
      return true;
    } else if (Utils.isNullOrEmpty(value) || value === 0) {
      this.notifyService.warn('VALUE_CANNOT_BE_ZERO/NULL');
      return false;
    } else if (Utils.isNullOrEmpty(data.FrontBars) || data.FrontBars <= 1) {
      this.notifyService.warn('FRONT_BARS_SHOULD_BE_MORE_THAN_1');
      return false;
    } else if (!isNaN(frontBarLimit) && !isNaN(backHookLimit)) {
      return true;
    } else {
      this.notifyService.warn('FRONTSPACING_IS_NOT_UNDER_PERMISSIBLE_VALUE_OF_PEGBOARD');
      return false;
    }
  }

  private validateFrontBars(value: number, data: PegLibrary): boolean {
    const fronBarLimit = (value - 1) * data.FrontSpacing;
    const backHookLimit = (data.BackHooks - 1) * data.BackSpacing;
    if (fronBarLimit <= backHookLimit) {
      return true;
    } else {
      this.notifyService.warn('FRONTBARS_IS_NOT_UNDER_PERMISSIBLE_VALUE_OF_PEGBOARD');
      return false;
    }
  }


  public onSave(): void {
    // commented temp as only single save is working
    this.pegLibraryService.save(this.datatoUpdate, null, this.uploadedImages, true);
    this.saveEnabled = false;
    if (this.agGridStoreService.editedCellList.length) {
        this.agGridStoreService.editedCellList = [];
    }
  }

  public exportToExcel(): void {
    if (this.gridComp) {
      let params: ExcelExportParams = {};
      params.fileName = this.translate.instant('PEG_LIBRARY');
      this.gridComp.exportToExcel(params);
    }
  }

  public onToggleState(): boolean {
     const idPegLibrarys: number[] =[];
    if (this.selectedActivePegLibrarys && this.selectedActivePegLibrarys.length > 0) {
      this.selectedActivePegLibrarys.forEach((element) => {
        this.pegLibraryService.PegLibrary.find(item => item.PegGuid === element.PegGuid).IsActive = false;
        idPegLibrarys.push(this.data.find(item => item.PegGuid === element.PegGuid).IDPegLibrary);
      });
      const formatdata = { "ids": idPegLibrarys, "isActive": false }
      if (formatdata) {
        this.pegLibraryService.updatePegLibraryStatus(formatdata)
      }
    }
    if (this.selectedInActivePegLibrarys && this.selectedInActivePegLibrarys.length > 0) {
      this.selectedInActivePegLibrarys.forEach((element) => {
        this.pegLibraryService.PegLibrary.find(item => item.PegGuid === element.PegGuid).IsActive = true;
        idPegLibrarys.push(this.data.find(item => item.PegGuid === element.PegGuid).IDPegLibrary);
      });
      const formatdata = { "ids": idPegLibrarys, "isActive": true }
      if (formatdata) {
        this.pegLibraryService.updatePegLibraryStatus(formatdata)
      }
    }
    this.initPegLibGrid();
    this.isToggleOn = !this.isToggleOn;
    this.gridComp?.gridApi?.deselectAll();
    return this.isToggleOn;
  }

  public onRowSelected(): void {
    let selectedRows = this.gridComp?.gridApi?.getSelectedRows();
    let rowNodes: RowNode[] = [];
    this.gridComp?.gridApi?.forEachNodeAfterFilterAndSort(ele => {
      rowNodes.push(ele);
    });
    const data = Object.assign([], rowNodes)
    if (rowNodes.length) {
      selectedRows = [];
      data.forEach((ele) => {
        if (ele.selected) {
          selectedRows.push(ele.data);
        }
      })
    }
    this.selectedActivePegLibrarys = [];
    this.selectedInActivePegLibrarys = [];
    if (selectedRows && selectedRows.length > 0) {
      this.selectedRows = [...selectedRows];
      selectedRows.forEach((element) => {
        const objActive = this.data.find(item => item.PegGuid === element.PegGuid && element.IsActive == true)
        if (objActive) {
          this.selectedActivePegLibrarys.push(objActive)
        }
        const objInActive = this.data.find(item => item.PegGuid === element.PegGuid && element.IsActive == false)
        if (objInActive) {
          this.selectedInActivePegLibrarys.push(objInActive)
        }
      })
      if (this.selectedActivePegLibrarys.length > 0 && this.selectedInActivePegLibrarys.length == 0) {
        this.isToggleOn = false;
        this.toggleDisabled = false;
      }
      if (this.selectedInActivePegLibrarys.length > 0 && this.selectedActivePegLibrarys.length == 0) {
        this.isToggleOn = true;
        this.toggleDisabled = false;
      }
      if ((this.selectedInActivePegLibrarys.length == 0 && this.selectedActivePegLibrarys.length == 0)
        || (this.selectedInActivePegLibrarys.length > 0 && this.selectedActivePegLibrarys.length > 0)) {
        this.isToggleOn = false;
        this.toggleDisabled = true;
      }
    }
    else {
      this.selectedActivePegLibrarys = [];
      this.selectedInActivePegLibrarys = [];
      this.selectedRows = [];
      this.toggleDisabled = true;
    }

  }
}
