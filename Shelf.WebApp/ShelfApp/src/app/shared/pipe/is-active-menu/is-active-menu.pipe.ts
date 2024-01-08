import { Pipe, PipeTransform } from '@angular/core';
import { IsActiveMatchOptions, Router } from '@angular/router';
import { MenuItem } from '../../models';

const routeMatchOption: IsActiveMatchOptions = {
  paths: 'exact',
  queryParams: 'subset',
  fragment: 'ignored',
  matrixParams: 'ignored'
};

/**
 * This pipe is added to avoid recalculation of menu isActive untill the menu item changes
 * Refer to: https://medium.com/showpad-engineering/why-you-should-never-use-function-calls-in-angular-template-expressions-e1a50f9c0496
 */
@Pipe({
  name: 'isActiveMenu'
})
export class IsActiveMenuPipe implements PipeTransform {

  constructor(
    private readonly router: Router,
  ) { }

  public transform(value: MenuItem, ...args: any[]): boolean {
    if (!value.template) { return false; }
    return this.router.isActive(value.template, routeMatchOption);
  }

}
