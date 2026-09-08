"use client";
import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Inspection } from '@/lib/data-import';
export type Dataset=Inspection & {id:string;name:string;bytes:number;source:'sample'|'upload';};
const Context=createContext<{datasets:Dataset[];add:(d:Dataset[])=>void;remove:(id:string)=>void;clear:()=>void}|null>(null);
export function DataSession({children}:{children:ReactNode}) {
 const [datasets,setDatasets]=useState<Dataset[]>([]);
 return <Context.Provider value={{datasets,add:items=>setDatasets(old=>[...old,...items]),remove:id=>setDatasets(old=>old.filter(d=>d.id!==id)),clear:()=>setDatasets([])}}>{children}</Context.Provider>;
}
export function useDataSession(){const context=useContext(Context);if(!context)throw new Error('DataSession is required');return context;}
