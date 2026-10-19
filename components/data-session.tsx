"use client";
import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import type { Inspection } from '@/lib/data-import';
export type Dataset=Inspection & {id:string;name:string;bytes:number;source:'sample'|'upload'|'public';};
export const MAX_SESSION_BYTES = 20 * 1024 * 1024;
const Context=createContext<{datasets:Dataset[];add:(d:Dataset[])=>void;remove:(id:string)=>void;clear:()=>void}|null>(null);
export function DataSession({children}:{children:ReactNode}) {
 const [datasets,setDatasets]=useState<Dataset[]>([]),current=useRef<Dataset[]>([]);
 function update(items:Dataset[]){current.current=items;setDatasets(items);}
 function add(items:Dataset[]){
  const next=[...current.current,...items];
  if(next.length>40)throw new Error('This session supports 40 files. Remove some before importing.');
  if(new Blob([JSON.stringify(next)]).size>MAX_SESSION_BYTES)throw new Error('Parsed data exceeds the 20 MiB session limit. Remove files or import a smaller subset.');
  update(next);
 }
 return <Context.Provider value={{datasets,add,remove:id=>update(current.current.filter(d=>d.id!==id)),clear:()=>update([])}}>{children}</Context.Provider>;
}
export function useDataSession(){const context=useContext(Context);if(!context)throw new Error('DataSession is required');return context;}
