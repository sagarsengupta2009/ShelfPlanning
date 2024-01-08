import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConsoleLogService, LocalStorageService } from './services';

/**
 * models, components, pipes, directive and services which are independent of application constructs
 *  eg:- All the abstract models and framework services
 * 
 * NOTE: This module will not import any of the application module.
 */
@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    ConsoleLogService,
    LocalStorageService
  ]
})
export class ShelfAppFrameworkModule { }
