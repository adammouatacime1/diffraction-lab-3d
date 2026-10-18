import { useEffect, useState } from 'react';
export function NumericInput({value,min,max,step,onChange,label}:{value:number;min:number;max:number;step:number;onChange:(v:number)=>void;label:string}) {
  const [text,setText]=useState(String(Number(value.toFixed(5))));
  useEffect(()=>setText(String(Number(value.toFixed(5)))),[value]);
  const commit=()=>{const n=Number(text.replace(',','.')); if(text.trim() && Number.isFinite(n)) onChange(Math.max(min,Math.min(max,n))); else setText(String(value));};
  return <input aria-label={label} type="number" min={min} max={max} step={step} value={text} onChange={e=>setText(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter') e.currentTarget.blur();}}/>;
}
export function ParameterControl({label,symbol,unit,value,min,max,step,onChange,hint}:{label:string;symbol:string;unit:string;value:number;min:number;max:number;step:number;onChange:(v:number)=>void;hint?:string}) {
  return <div className="parameter-control"><div className="parameter-label"><label title={hint}>{label} <i>{symbol}</i></label><div className="number-unit"><NumericInput value={value} min={min} max={max} step={step} onChange={onChange} label={label}/><span>{unit}</span></div></div><input aria-label={`${label} — curseur`} type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/></div>;
}
