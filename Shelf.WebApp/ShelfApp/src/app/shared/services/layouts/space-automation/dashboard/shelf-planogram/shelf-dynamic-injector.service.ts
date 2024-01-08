import { ComponentFactoryResolver, ComponentRef, Injectable } from '@angular/core';
import { StandardShelfComponent, ModularComponent, PositionComponent, BlockFixtureComponent, CoffinCaseComponent, PegboardComponent, SlotwallComponent, CrossbarComponent, BasketComponent, BlockComponent, GrillComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/childcomponents';
import { ShelfNestedComponent } from 'src/app/layouts/Shelf-Planning/dashboard/components/pogcomponensts/shelf-planogram/common';

@Injectable({
  providedIn: 'root'
})
export class ShelfDynamicInjectorService {

  private templates: any = {};
  private factories: any = {};
  private viewRef: any;

  constructor(private resolver: ComponentFactoryResolver) {
    // load factory templates
    this.factories = {
      ShelfNestedComponent,
      StandardShelfComponent,
      ModularComponent,
      PositionComponent,
      BlockFixtureComponent,
      CoffinCaseComponent,
      PegboardComponent,
      SlotwallComponent,
      CrossbarComponent,
      BasketComponent,
      BlockComponent,
      GrillComponent
    };
  }

  render(view: any, component: any, properties: any, elRefId: any) {
    this.viewRef = view;
    if (this.viewRef && component) {
      const template = {
        name: component,
        properties
      };
      if (!this.templates[template.name]) {
        const factoryClass = this.factories[template.name];
        if (factoryClass) {
          const factory = this.resolver.resolveComponentFactory(factoryClass);
          this.templates[template.name] = factory;
          this.loadComponent(this.templates[template.name], template.properties);
        }
      } else {
        this.loadComponent(this.templates[template.name], template.properties);
      }

      // prepare content view and manage overlapping
      const dynamicElements = document.getElementById(elRefId);
      if (dynamicElements && dynamicElements.childElementCount) {
        const count = dynamicElements.childElementCount;
        for (let i = 0; i < count; i++) {
          const child = dynamicElements.firstElementChild;
          child.insertAdjacentHTML('beforeend', '<div class="clearfix"></div>');
          child.setAttribute('style', 'margin-bottom: 10px; display: block;');
        }
      }
    }
  }

  private loadComponent(factory: any, properties: any) {
    properties = properties || [];
    const compRef: ComponentRef<any> = this.viewRef.createComponent(factory);
    factory.inputs.forEach((param) => {
      const propName = param.propName;
      const propValue = properties[propName];
      if (propValue) {
        compRef.instance[param.propName] = propValue;
      }
    });
  }
}
