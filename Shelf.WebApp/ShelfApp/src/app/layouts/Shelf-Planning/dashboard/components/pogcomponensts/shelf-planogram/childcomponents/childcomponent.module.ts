
import { CommonModule } from '@angular/common';

import {
  ModularComponent, UprightDrawComponent, BasketComponent,
  BlockComponent, ClipboardComponent, CoffinCaseComponent,
  CrossbarComponent, GrillComponent,
  IntersectionmsgDialogComponent, DisplayMenuComponent,
  PaneltoolsComponent, PegboardComponent, PositionComponent,
  RubberbandSupportDirective, SeparatorDrawComponent,
  StandardShelfComponent, ShoppingCartComponent,
  SlotwallComponent, BlockFixtureComponent,
  PromoteDemoteComponent, ItemWorksheetComponent,
  FixtureWorksheetComponent, InventoryModelWsComponent,
  InventoryWorksheetComponent, PerformanceWorksheetComponent,
  HierarchyComponent, ThreedPlanogramComponent,
  MessageBoardComponent, ProductInventoryComponent,
  NewProductInventoryComponent, ClonePlanogramComponent,
  MultipleCloneComponent, SelectedStoresComponent,
  FeedbackComponent, ImportTemplateComponent,
  NewProductIntroductionComponent, AdvanceSearchComponent,
  ReportDesignerComponent, ShowPogMoreInfoComponent,
  ModularFarfrontComponent, ShoppingCartLabelComponent
} from '.';
import { AnnotationModule } from './annotation/annotation.module';
import { ContextMenuModule } from './contextMenus/contextMenu.module';
import { HighlightModule } from './highlight/highlight.module';
import { PropertyModule } from './property-grid/property.module';
import { SpDragDropModule } from 'src/app/shared/drag-drop.module';
import { PrintModule } from './print/print.module';

import { MatMenuModule } from '@angular/material/menu';
import { TranslateModule } from '@ngx-translate/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from 'src/app/shared/shared.module';
import { MatRadioModule } from '@angular/material/radio';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { SettingsModule } from './settings/setting.module';
import { MatExpansionModule } from '@angular/material/expansion';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { SectionComponent } from './section/section.component';

const COMPONENTS = [
  ModularComponent,
  SectionComponent,
  UprightDrawComponent,
  BasketComponent,
  BlockComponent,
  ClipboardComponent,
  CoffinCaseComponent,
  CrossbarComponent,
  GrillComponent,
  IntersectionmsgDialogComponent,
  DisplayMenuComponent,
  PaneltoolsComponent,
  PegboardComponent,
  PositionComponent,
  RubberbandSupportDirective,
  SeparatorDrawComponent,
  StandardShelfComponent,
  ShoppingCartComponent,
  SlotwallComponent,
  BlockFixtureComponent,
  PromoteDemoteComponent,
  ItemWorksheetComponent,
  FixtureWorksheetComponent,
  InventoryModelWsComponent,
  InventoryWorksheetComponent,
  PerformanceWorksheetComponent,
  HierarchyComponent,
  ThreedPlanogramComponent,
  MessageBoardComponent,
  ProductInventoryComponent,
  NewProductInventoryComponent,
  ClonePlanogramComponent,
  MultipleCloneComponent,
  SelectedStoresComponent,
  FeedbackComponent,
  ImportTemplateComponent,
  NewProductIntroductionComponent,
  AdvanceSearchComponent,
  ReportDesignerComponent,
  ShowPogMoreInfoComponent,
  ModularFarfrontComponent,
  ShoppingCartLabelComponent
];

@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    AnnotationModule,
    ContextMenuModule,
    HighlightModule,
    PropertyModule,
    SharedModule,
    MatTooltipModule,
    MatIconModule,
    MatMenuModule,
    TranslateModule,
    MatTabsModule,
    MatDialogModule,
    MatRadioModule,
    MatCheckboxModule,
    TooltipModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FlexLayoutModule,
    MatButtonModule,
    SpDragDropModule,
    PrintModule,
    ReactiveFormsModule,
    MatListModule,
    MatSlideToggleModule,
    SettingsModule,
    MatExpansionModule,
    DragDropModule
  ],
  exports: [...COMPONENTS, HighlightModule, PrintModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})
export class ChildComponentModule { }
