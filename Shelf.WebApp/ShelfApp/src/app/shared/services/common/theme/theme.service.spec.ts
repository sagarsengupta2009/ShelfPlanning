import { ThemeService } from './theme.service';
import { TestBed } from '@angular/core/testing';
import { Theme } from 'src/theme';
import { LocalStorageKeys } from 'src/app/shared/constants';

describe('ThemeService', () => {
    let themeService: ThemeService;
    let cachedTheme = localStorage.getItem(LocalStorageKeys.SELECTED_THEME);
    cachedTheme = (cachedTheme == null ? 'Default' : cachedTheme);
    const light: Theme = {
        name: 'light',
        properties: {
            '--foreground-default': '#08090A',
            '--foreground-secondary': '#41474D',
            '--foreground-tertiary': '#797C80',
            '--foreground-quaternary': '#F4FAFF',
            '--foreground-light': '#41474D',

            '--background-default': '#F4FAFF',
            '--background-secondary': '#A3B9CC',
            '--background-tertiary': '#00bcd4',
            '--background-light': '#FFFFFF',

            '--primary-default': '#5DFDCB',
            '--primary-dark': '#24B286',
            '--primary-light': '#B2FFE7',

            '--error-default': '#EF3E36',
            '--error-dark': '#800600',
            '--error-light': '#FFCECC',

            '--background-tertiary-shadow': '0 1px 3px 0 rgba(92, 125, 153, 0.5)'
        }
    };
    const dark: Theme = {
        name: 'dark',
        properties: {
            '--foreground-default': '#5C7D99',
            '--foreground-secondary': '#A3B9CC',
            '--foreground-tertiary': '#F4FAFF',
            '--foreground-quaternary': '#E5E5E5',
            '--foreground-light': '#FFFFFF',

            '--background-default': '#797C80',
            '--background-secondary': '#41474D',
            '--background-tertiary': '#08090A',
            '--background-light': '#41474D',

            '--primary-default': '#5DFDCB',
            '--primary-dark': '#24B286',
            '--primary-light': '#B2FFE7',

            '--error-default': '#EF3E36',
            '--error-dark': '#800600',
            '--error-light': '#FFCECC',

            '--background-tertiary-shadow': '0 1px 3px 0 rgba(8, 9, 10, 0.5)'
        }
    };
    const availableThemes: Theme[] = [light, dark];
    const active = cachedTheme;
    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ThemeService]
        });
        themeService = TestBed.inject(ThemeService);
    });
    it('should be created', () => {
        expect(themeService).toBeTruthy();
    });
    it('should return all available themes', () => {
        const allThems = themeService.getAvailableThemes();
        expect(allThems).toEqual(availableThemes);
    });
    it('should return current active theme', () => {
        const activeTheme = themeService.getCurrentThemeName();
        expect(activeTheme).toEqual(active);
    });
    it('should set selected theme as active theme', () => {
        themeService.setTheme(active);
    });
});
