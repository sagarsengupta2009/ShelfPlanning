import { ApplicationRef, enableProdMode } from '@angular/core';
import { enableDebugTools } from '@angular/platform-browser';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environmentConfig } from './environments/environment';
declare const window: any;
if (environmentConfig.production) {
  enableProdMode();
}


/** to avoid ngZone change detection, even using runOutsideAngular still trigger some angular redraws */
(window as any).mousemove = [];
(window as any).keydown = [];
window.addEventListener('mousemove',ev=>{
  for(const callback of (window as any).mousemove) {
    callback(ev);
  }
});
document.addEventListener('keydown', ev => {
  //Todo @Priyanka: Revise the keydown check conditions
  (window as any).keydown.push(ev);
  let element = <HTMLElement>ev.target
  if (ev.shiftKey) {
    window.shiftPressed = true;
  }
  if (ev.ctrlKey) {
    window.ctrlPressed = true;
    if (element.nodeName !== 'INPUT' && element.nodeName !== 'TEXTAREA' && ev.key.toLocaleLowerCase() !== 'c') {
      ev.stopImmediatePropagation();
      ev.preventDefault();
      return false;
    } else {
      if (ev.shiftKey) {
        switch (ev.key.toLocaleLowerCase()) {
          case 'r':
            ev.preventDefault();
            return false;
        }
      } else {
        switch (ev.key.toLocaleLowerCase()) {
          case 's':
          case 'r':
          case 'g':
          case 'h':
          case 'd':
          case 'l':
          case 'u':
          case 'k':
            ev.preventDefault();
            return false;
        }
      }
    }
  }
});


platformBrowserDynamic().bootstrapModule(AppModule)
.then(module => enableDebugTools(module.injector.get(ApplicationRef).components[0]))
.catch(err => console.error(err));
