import Dexie, { Table } from "dexie";

export class shelfDb extends Dexie {
  public allFixtureComponents: Table<IallFixtureComponents>

  constructor(){
    super('shelf-planning');
    this.version(1).stores({
      allFixtureComponents:'++id'
    })
  }

  public clearDb():void {
    this.tables.forEach((table)=>{
      table.clear();
    })
  }
}

export const db = new shelfDb();

interface IallFixtureComponents {
  id? : string;
  allFixtureComponents: string;
}