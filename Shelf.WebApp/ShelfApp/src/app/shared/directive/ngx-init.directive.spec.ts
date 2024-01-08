import { NgxInitDirective } from './ngx-init.directive';

describe('NgxInitDirective', () => {
  let templateRefSpy: jasmine.Spy;
  let viewContainerSpy: jasmine.Spy;
  it('should create an instance', () => {
    const directive = new NgxInitDirective(templateRefSpy as any, viewContainerSpy as any);
    expect(directive).toBeTruthy();
  });
});
