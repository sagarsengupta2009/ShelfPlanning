import { Theme } from "./theme"

export const highBrightness: Theme = {
  name: 'high',
  properties: {
    '--consoleBackground': 'rgba(255, 255, 255, 0)'
  }
}
export const mediumBrightness: Theme = {
  name: 'medium',
  properties: {
    '--consoleBackground': 'rgba(255, 255, 255, 0.5)'
  }
}
export const lowBrightness: Theme = {
  name: 'low',
  properties: {
    '--consoleBackground': 'rgba(255, 255, 255, 0.7)'
  }
}
export const noneBrightness: Theme = {
  name: 'none',
  properties: {
    '--consoleBackground': 'rgba(255, 255, 255, 1)'
  }
}
