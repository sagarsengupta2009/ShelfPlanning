import { Injectable } from '@angular/core';
import { LocalStorageService } from 'src/app/framework.module';
import { LocalStorageKeys } from 'src/app/shared/constants';
import { Theme, light, dark, assort } from 'src/theme';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  private active: Theme = light;
  private availableThemes: Theme[] = [light, dark, assort];

  constructor(private readonly localStorage: LocalStorageService) { }

  public getAvailableThemes(): Theme[] {
    return this.availableThemes;
  }


  public setTheme(themeName): void {
    this.active = this.availableThemes.find(x => x.name == themeName);
    Object.keys(this.active.properties).forEach(property => {
      document.documentElement.style.setProperty(
        property,
        this.active.properties[property]
      );
    });
    if (this.active.name != 'assort') {
      this.localStorage.setValue(LocalStorageKeys.SELECTED_THEME, themeName);
    }
  }

  public getCurrentThemeName(): string {
    let cachedTheme = this.localStorage.getValue(LocalStorageKeys.SELECTED_THEME);
    cachedTheme = this.active.name == 'assort' ? 'assort' : cachedTheme;
    cachedTheme = (cachedTheme == null ? 'Default' : cachedTheme);
    return cachedTheme;
  }
}
