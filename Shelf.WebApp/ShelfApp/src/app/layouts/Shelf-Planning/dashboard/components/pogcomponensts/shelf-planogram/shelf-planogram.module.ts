import { CUSTOM_ELEMENTS_SCHEMA, NgModule, NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShelfRoutingModule } from './shelf-planogram-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { ChildComponentModule } from './childcomponents/childcomponent.module';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { FlexLayoutModule } from '@angular/flex-layout';
import { SideNavModule } from './side-nav/side-nav.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { SpDragDropModule } from 'src/app/shared/drag-drop.module';
import { MatCardModule } from '@angular/material/card';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { TooltipModule } from '@progress/kendo-angular-tooltip';
import { PropertyModule } from './childcomponents/property-grid/property.module';
import { AnnotationModule } from './childcomponents/annotation/annotation.module';
import { ContextMenuModule } from './childcomponents/contextMenus/contextMenu.module';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  OverlayIconsComponent, CreatePlanogramComponent, PlanogramLibraryComponent,
  PogSplitterViewComponent, LegendCardsComponent, MainPanelComponent,
  PanelBodyComponent, PanelSectionComponent, ShelfNestedComponent,
  ShelfDynamicComponent, PanelHeaderComponent, SidebarNavigationComponent,
  PogInfoComponent, ProductLibraryComponent, FixtureGalleryComponent,
  ProductHierarchyComponent, SelectedStoreComponent, StoreHierarchyComponent,
  PlanogramHierarchyTreeComponent, PanelContentComponent, IntersectionChooserPopComponent,
  NgxI2eNotesComponent, DataRendererComponent, PogMaxCountDialogComponent, CreatePegComponent, PegLibraryComponent, ImagePreviewComponent, ShoppingCartUnloadedStateComponent
} from './common';
import { ShelfPlanogramComponent } from './shelf-planogram.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { EditorModule } from '@progress/kendo-angular-editor';
import { AgGridModule } from 'ag-grid-angular';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

const COMPONENTS = [
  ShelfPlanogramComponent,
  OverlayIconsComponent,
  CreatePlanogramComponent,
  PlanogramLibraryComponent,
  PogSplitterViewComponent,
  LegendCardsComponent,
  MainPanelComponent,
  PanelBodyComponent,
  PanelSectionComponent,
  ShelfNestedComponent,
  ShelfDynamicComponent,
  PanelHeaderComponent,
  SidebarNavigationComponent,
  PogInfoComponent,
  ProductLibraryComponent,
  FixtureGalleryComponent,
  ProductHierarchyComponent,
  SelectedStoreComponent,
  StoreHierarchyComponent,
  PlanogramHierarchyTreeComponent,
  PanelContentComponent,
  IntersectionChooserPopComponent,
  NgxI2eNotesComponent,
  DataRendererComponent,
  PogMaxCountDialogComponent,
  CreatePegComponent,
  PegLibraryComponent,
  ImagePreviewComponent,
  ShoppingCartUnloadedStateComponent
];
@NgModule({
  declarations: [...COMPONENTS],
  imports: [
    CommonModule,
    FormsModule,
    ShelfRoutingModule,
    SharedModule,
    TranslateModule,
    MatIconModule,
    MatSidenavModule,
    ChildComponentModule,
    MatTabsModule,
    FlexLayoutModule,
    PropertyModule,
    AnnotationModule,
    ContextMenuModule,
    MatCheckboxModule,
    SideNavModule,
    MatDialogModule,
    MatButtonModule,
    MatMenuModule,
    MatSelectModule,
    SpDragDropModule,
    MatCardModule,
    DragDropModule,
    ScrollingModule,
    TooltipModule,
    MatTooltipModule,
    MatSnackBarModule,
    EditorModule,
    AgGridModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatAutocompleteModule
  ],
  exports: [...COMPONENTS],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA]
})

export class ShelfPlanogramModule { }
