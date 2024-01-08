/** module as a guid on how to remove lodash */
export module _ {

    /** 
     * _.findIndex(list,{id:5});
     * list.findIndex(it=>it.id==5);
     * 
     * _.find(list,{id:5}); or _.findWhere
     * list.find(it=>it.id==5);
     * 
     * _.filter(list,{id:5});
     * list.filter(it=>it.id==5);
     * 
     * _.forEach(list,it=>it.enabled=true);
     * list.forEach(it=>it.enabled=true);
     * 
     * _.flat(listOfList);
     * listOfList.flat();
     * 
     * _.isUndefined(data);
     * data === undefined
     * 
     * _.isNull(data);
     * data === null
     * 
     * _.indexOf(list,item);
     * list.indexOf(item);
     * 
     * shallow clone
     * _.clone(data)
     * {...data}
     * 
     * _.chain(items).map(it=>it.name)
     * items.map(it=>it.name)
     * 
    */

    export enum Sort {
        Asc = 1,
        Desc = -1,
    }

    /** shoud be avoided whenever possible, see if you can use shalow clone (function clone)
     * inline if possible
    */
    export function cloneDeep<T>(source?: T): T {
        return JSON.parse(JSON.stringify(source));
    }

    /** inline if possible */
    export function uniq<T>(source: T[]): T[] {
        return [...new Set(source)];
    }

    /** _.uniqBy(list,'age')
     * uniqBy(list,it=>it.age);
    */
    export function uniqBy<T>(list: T[], func: (item: T) => any): T[] {
        return Object.values(list.reduce((p, n) => { p[func(n)] = n; return p; }, {}));
    }

    /** same for _.sortBy 
     * _.orderBy(list,'age')
     * list.sort((a,b)=>a.age < b.age ? -1: 1);
    */
    export function orderBy<T>(list: T[], func: (item: T) => number | string, sort = Sort.Asc): T[] {
        return list.sort((a, b) => func(a) < func(b) ? -sort : sort);
    }

    export function maxBy<T>(list: T[], func: (item: T) => number | string): T | undefined {
        return orderBy(list, func).pop();
    }


    export function minBy<T>(list: T[], func: (item: T) => number | string): T | undefined {
        return orderBy(list, func).shift();
    }

    /** inline if possible */
    export function difference<T>(base: T[], remove: T[]): T[] {
        return base.filter(it => !remove.includes(it));
    }

    /** inline if possible */
    export function isEmpty<T>(data?: T): boolean {
        return Boolean(Object.keys(data || {}).length);
    }

    /** _.union(list1,list2,list3);
     * [...new Set([list1,list2,list3].reduce((p,n)=>p.contact(n),[]))]
     *   */
    export function union<T>(...lists: T[][]): T[] {
        return [...new Set(lists.reduce((a, b) => a.concat(b), []))];
    }

    /** should be avoided whenever possible, either by using a simple == operator
     * or simply comparing the relative fields if they are few */
    export function isEqual(data1: any, data2: any): boolean {
        return JSON.stringify(data1) == JSON.stringify(data2);
    }

}