import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../material-module';
import { TranslateModule } from '@ngx-translate/core';
import { GridModule, ExcelModule, PDFModule } from '@progress/kendo-angular-grid';
import { LayoutModule } from '@progress/kendo-angular-layout';
import { PopupModule } from '@progress/kendo-angular-popup';
import { SafeIframeUrlPipe } from './pipe/safeUrlFilter/safe-iframe-url.pipe';
import { IntlModule } from '@progress/kendo-angular-intl';
import { MatFormFieldModule } from '@angular/material/form-field';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FlexLayoutModule } from '@angular/flex-layout';
//import { NgxAboutUsPackageModule } from 'ngx-about-us-package';
import { NgxI2eAccountsPackageModule } from '@i2ecommonpackages/ngx-i2e-accounts-package';
import { NgxI2eNotificationModule } from '@i2ecommonpackages/ngx-i2e-notification';
import { DialogModule } from '@progress/kendo-angular-dialog';
import { DateInputsModule } from '@progress/kendo-angular-dateinputs';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { InputsModule } from '@progress/kendo-angular-inputs';
import { SelectDropDownModule } from 'ngx-select-dropdown';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatMenuModule } from '@angular/material/menu';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { TreeViewModule } from '@progress/kendo-angular-treeview';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { DropDownsModule } from '@progress/kendo-angular-dropdowns';

import { NouisliderModule } from 'ng2-nouislider';
import { MatSliderModule } from '@angular/material/slider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
    SearchSettingComponent, KendoDetailExpandComponent, SearchComponent,
    CustomHeaderTemplateComponent, DockerLayoutComponent, HelpComponent,
    DimensionDisplayComponent, HeaderComponent, SidebarComponent,
    FooterComponent, KendoGridComponent, KendoSplitterComponent,
    KendoGridContextMenuComponent, CustomFilterTemplateComponent,
    CustomEditTemplateComponent, FabSpeedDialComponent,
    DateRangeFilterTemplateComponent, InformationConsoleComponent,
    KendoGridMultiHeaderComponent, KendoSplitterPlainComponent,
    KendoGridColumnConfigComponent, CustomToolTipComponent,
    CheckBoxFilterTemplateComponent, CustomMenusComponent,
    GridConfigComponent, CustomAgGridModule,
    ConfirmationDialogComponent, PAClonePlanogramComponent,
    AlertDialogComponent, AssignementConfirmationComponent,
    DeleteAlertComponent,
} from './components';
import { AccessDeniedComponent, NotFoundComponent, ServerErrorComponent } from './ErrorComponents';
import { BlockValidationErrorComponent, BlockEditorComponent, ReblockComponent } from './services/layouts/allocate';
import {
    ToolTipRendererDirective,
    FileDragDropDirective,
    MenuToolTipDirective,
    TooltipDirective,
    PanZoom,
    AllowDecimalNumbersDirective,
    NumberOnlyDirective,
    DisableRightClickDirective,
    DisableKeyboardEventsDirective,
    ThreedRenderDirective,
    NgxInitDirective,
    ImgFallbackDirective
} from './directive';
import { DynamicAnchorDirective } from '../layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/common';
import {
    ScenarioService,
    PlanogramSaveService,
    CategoriesService,
    KendoService,
    PlanogramLoaderService
} from '../shared/services';
import {
    GridColumnFormatterPipe,
    ValueAtIndexPipe,
    SafePipe,
    OrderByPipe,
    SearchPipe,
    PlanogramfilterPipe,
    FilterByPipe,
    FilterPipe,
    SortPipe,
    ToArrayPipe,
    RemoveAnnotationPipe,
    ShoppingCartFilterPipe,
    IsActiveMenuPipe
} from './pipe';
import { MatTooltipDefaultOptions, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { ConfirmBaymappingResetComponent } from './services/layouts/allocate/confirm-baymapping-reset/confirm-baymapping-reset.component';
import { SetupItemConfirmationComponent } from './services/layouts/allocate/validation/setup-products/setup-item-confirmation.component';
import { CommonCustomizableDialogComponent } from './components/dialogues/common-customizable-dialog/common-customizable-dialog.component';
import { UniqueDirective } from './directive/unique/unique.directive';

export const matToolTipDefaults: MatTooltipDefaultOptions = {
    showDelay: 0,
    hideDelay: 0,
    touchGestures: 'auto',
    position: 'below',
    touchendHideDelay: 0,
    disableTooltipInteractivity: true,
  }

@NgModule({
    declarations: [
        HeaderComponent,
        SidebarComponent,
        FooterComponent,
        AccessDeniedComponent,
        NotFoundComponent,
        ServerErrorComponent,
        KendoGridComponent,
        KendoSplitterComponent,
        NgxInitDirective,
        ValueAtIndexPipe,
        SafePipe,
        KendoGridContextMenuComponent,
        SafeIframeUrlPipe,
        CustomFilterTemplateComponent,
        GridColumnFormatterPipe,
        CustomEditTemplateComponent,
        OrderByPipe,
        ConfirmationDialogComponent,
        FileDragDropDirective,
        PAClonePlanogramComponent,
        AlertDialogComponent,
        FabSpeedDialComponent,
        SearchPipe,
        IsActiveMenuPipe,
        PlanogramfilterPipe,
        InformationConsoleComponent,
        FilterByPipe,
        DateRangeFilterTemplateComponent,
        KendoGridMultiHeaderComponent,
        KendoSplitterPlainComponent,
        KendoGridColumnConfigComponent,
        AssignementConfirmationComponent,
        ToolTipRendererDirective,
        CustomToolTipComponent,
        CheckBoxFilterTemplateComponent,
        CustomMenusComponent,
        MenuToolTipDirective,
        FilterPipe,
        SortPipe,
        SearchSettingComponent,
        KendoDetailExpandComponent,
        SearchComponent,
        CustomHeaderTemplateComponent,
        DockerLayoutComponent,
        HelpComponent,
        ToArrayPipe,
        ShoppingCartFilterPipe,
        ThreedRenderDirective,
        ImgFallbackDirective,
        TooltipDirective,
        PanZoom,
        DisableRightClickDirective,
        DisableKeyboardEventsDirective,
        AllowDecimalNumbersDirective,
        BlockValidationErrorComponent,
        BlockEditorComponent,
        ReblockComponent,
        DeleteAlertComponent,
        NumberOnlyDirective,
        RemoveAnnotationPipe,
        DynamicAnchorDirective,
        GridConfigComponent,
        DimensionDisplayComponent,
        ConfirmBaymappingResetComponent,
        SetupItemConfirmationComponent,
        CommonCustomizableDialogComponent,
        UniqueDirective,
    ],
    imports: [
        CommonModule,
        RouterModule,
        FormsModule,
        DateInputsModule,
        MaterialModule,
        ReactiveFormsModule,
        TranslateModule,
        GridModule,
        PopupModule,
        LayoutModule,
        ExcelModule,
        PDFModule,
        MatFormFieldModule,
        IntlModule,
        ScrollingModule,
        FlexLayoutModule,
        // Note : Its our custom module so we need wait for PA team to upgrade it.
        //NgxAboutUsPackageModule,
        NgxI2eAccountsPackageModule,
        NgxI2eNotificationModule,
        DialogModule,
        DragDropModule,
        InputsModule,
        SelectDropDownModule,
        NgxDaterangepickerMd.forRoot(),
        NgSelectModule,
        MatMenuModule,
        TooltipModule,
        TreeViewModule,
        AutocompleteLibModule,
        DropDownsModule,
        NouisliderModule,
        MatSliderModule,
        MatProgressSpinnerModule,
        CustomAgGridModule
    ],
    exports: [
        AutocompleteLibModule,
        GridModule,
        ExcelModule,
        LayoutModule,
        KendoGridComponent,
        CustomFilterTemplateComponent,
        HeaderComponent,
        SidebarComponent,
        FooterComponent,
        KendoSplitterComponent,
        ValueAtIndexPipe,
        SafePipe,
        GridColumnFormatterPipe,
        NgxInitDirective,
        ConfirmationDialogComponent,
        FabSpeedDialComponent,
        SearchPipe,
        IsActiveMenuPipe,
        PlanogramfilterPipe,
        KendoGridMultiHeaderComponent,
        KendoSplitterPlainComponent,
        SelectDropDownModule,
        ToolTipRendererDirective,
        CustomToolTipComponent,
        CheckBoxFilterTemplateComponent,
        NgSelectModule,
        CustomMenusComponent,
        DimensionDisplayComponent,
        MenuToolTipDirective,
        TreeViewModule,
        DropDownsModule,
        FilterPipe,
        SortPipe,
        DateInputsModule,
        SafeIframeUrlPipe,
        SearchSettingComponent,
        KendoDetailExpandComponent,
        SearchComponent,
        DockerLayoutComponent,
        HelpComponent,
        ShoppingCartFilterPipe,
        ToArrayPipe,
        InputsModule,
        NouisliderModule,
        ThreedRenderDirective,
        ImgFallbackDirective,
        MatSliderModule,
        TooltipDirective,
        PanZoom,
        DisableRightClickDirective,
        DisableKeyboardEventsDirective,
        AllowDecimalNumbersDirective,
        NumberOnlyDirective,
        RemoveAnnotationPipe,
        DynamicAnchorDirective,
        MatProgressSpinnerModule,
        CustomAgGridModule,
        BlockEditorComponent
    ],
    providers: [
        ValueAtIndexPipe,
        SafePipe,
        GridColumnFormatterPipe,
        DatePipe,
        SearchPipe,
        FilterPipe,
        SortPipe,
        PlanogramfilterPipe,
        SafeIframeUrlPipe,
        CategoriesService,
        KendoService,
        ToArrayPipe,
        ShoppingCartFilterPipe,
        DecimalPipe,
        ScenarioService,
        PlanogramSaveService,
        PlanogramLoaderService,
        {provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: matToolTipDefaults}
    ],
    schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],
})
export class SharedModule { }
