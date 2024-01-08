export interface Theme {
  name: string;
  properties: any;
}

export const light: Theme = {
  name: 'Default',
  properties: {
    '--foreground-default': '#08090A',
    '--foreground-secondary': '#41474D',
    '--foreground-tertiary': '#797C80',
    '--foreground-quaternary': '#F4FAFF',
    '--foreground-light': '#41474D',
    '--foreground-primary': '#00ACC1',

    '--background-default': '#F4FAFF',
    '--background-secondary': '#A3B9CC',
    '--background-tertiary': '#4E9698',//'#00bcd4', // '#5C7D99',
    '--background-quaternary': '#4E9698',//'#90d3e8',
    '--background-light': '#FFFFFF',
    '--background-primary': '#333333',

    '--primary-default': '#5DFDCB',
    '--primary-dark': '#24B286',
    '--primary-light': '#B2FFE7',

    '--error-default': '#EF3E36',
    '--error-dark': '#800600',
    '--error-light': '#FFCECC',

    '--background-tertiary-shadow': '0 1px 3px 0 rgba(92, 125, 153, 0.5)',
    '--background-icon': 'rgba(0, 188, 212)',
    '--sidebar-background': '#4E9698', //'#39afbf',
    // '--sidebar-background': '#2ec8db',
    '--sidebar-icon': '#fff',
    '--sidebar-icon-background-color': '#b7eaf1',
    '--sidebar-icon-selected-color': '#555758',

    '--icons': '#6F6F6F',
    '--application-background': '#b7eaf1',

    '--menu-data': '#20b7ca',
    '--hover-background-color': '#0b3c5a3d',
    '--selected-item-background-color': '#009dff3d',
    '--selected-row-border-color': '#009dff3d',
    '--selected-row-data-color': '#656565',
    '--isactivecell': '#0000FF',
    '--header-icons-hover': '#06a0b4',
    '--compact-mode-abbr': '#ffffff',
    '--scrollbar-and-border': '#03969c',
    '--footer-selected-button-background': '#029db1',
  }
};

export const dark: Theme = {
  name: 'Dark',
  properties: {
    '--foreground-default': '#5C7D99',
    '--foreground-secondary': '#A3B9CC',
    '--foreground-tertiary': '#F4FAFF',
    '--foreground-quaternary': '#E5E5E5',
    '--foreground-light': '#FFFFFF',
    '--foreground-primary': '#333333',

    '--background-default': '#797C80',
    '--background-secondary': '#41474D',
    '--background-tertiary': '#08090A',
    '--background-quaternary': '#333333',
    '--background-light': '#41474D',
    '--background-primary': '#FFFFFF',

    '--primary-default': '#5DFDCB',
    '--primary-dark': '#24B286',
    '--primary-light': '#B2FFE7',

    '--error-default': '#EF3E36',
    '--error-dark': '#800600',
    '--error-light': '#FFCECC',

    '--background-tertiary-shadow': '0 1px 3px 0 rgba(8, 9, 10, 0.5)',
    '--background-icon': 'rgba(0, 188, 212)',
    '--sidebar-background': '#f9f9f9',
    '--sidebar-icon': '#08090A',
    '--sidebar-icon-background-color': '#808080',
    '--sidebar-icon-selected-color': '#ffffff',

    '--icons': '#08090A',
    '--application-background': '#808080',

    '--menu-data': '#333333',
    '--hover-background-color': '#0b3c5a3d',
    '--selected-item-background-color': '	#C0C0C0',
    '--selected-row-border-color': '#dbd9d9',
    '--selected-row-data-color': '#ffffff',
    '--isactivecell': '#FF0000',
    '--header-icons-hover': '#808080',
    '--compact-mode-abbr': '#08090A',
    '--scrollbar-and-border': '#03969c',
    '--footer-selected-button-background': '#666677',

    '--font-color': '#000'
  }
};

export const assort: Theme = {
  name: 'assort',
  properties: {
    '--foreground-default': '#08090A',
    '--foreground-secondary': '#41474D',
    '--foreground-tertiary': '#797C80',
    '--foreground-quaternary': '#F4FAFF',
    '--foreground-light': '#41474D',
    '--foreground-primary': '#3F51B5',

    '--background-default': '#F4FAFF',
    '--background-secondary': '#A3B9CC',
    '--background-tertiary': '#3F51B5', // '#5C7D99',
    '--background-quaternary': '#3F51B5',
    '--background-light': '#FFFFFF',
    '--background-primary': '#333333',

    '--primary-default': '#5DFDCB',
    '--primary-dark': '#24B286',
    '--primary-light': '#B2FFE7',

    '--error-default': '#EF3E36',
    '--error-dark': '#800600',
    '--error-light': '#FFCECC',

    '--background-tertiary-shadow': '0 1px 3px 0 rgba(92, 125, 153, 0.5)',
    '--background-icon': 'rgba(0, 188, 212)',
    '--sidebar-background': '#3F51B5',
    // '--sidebar-background': '#2ec8db',
    '--sidebar-icon': '#fff',
    '--sidebar-icon-background-color': '#b7eaf1',
    '--sidebar-icon-selected-color': '#555758',

    '--icons': '#6F6F6F',
    '--application-background': '#b7eaf1',

    '--menu-data': '#20b7ca',
    '--hover-background-color': '#0b3c5a3d',
    '--selected-item-background-color': '#009dff3d',
    '--selected-row-border-color': '#009dff3d',
    '--selected-row-data-color': '#656565',
    '--isactivecell': '#0000FF',
    '--header-icons-hover': '#06a0b4',
    '--compact-mode-abbr': '#ffffff',
    '--scrollbar-and-border': '#03969c',
    '--footer-selected-button-background': '#029db1',
  }
};
