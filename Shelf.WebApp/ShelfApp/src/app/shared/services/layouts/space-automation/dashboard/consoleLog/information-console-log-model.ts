export interface ConsoleLogObjectList {
  [key : string]: {
    Status: {
      Details: {
        SubType: string,
        IdPogLog: number
      }[]
    } | boolean,
    Timestamp: Date
  } | {}
}

type Summary = {
  Error: number,
  Information: number,
  Warning: number
}
type DetailTemplate = {
  Code: string,
  Message: string,
  Source: string,
  StackTrace: string,
  Type: number,
  SubType: number,
  Option: {}
}
type Settings = {
  error: boolean,
  information: boolean,
  warning: boolean,
  count: number
}
export interface ConsoleLog {
  User: string,
  Summary: Summary,
  settings: Settings,
  Result: number,
  Details: DetailTemplate[]
}

