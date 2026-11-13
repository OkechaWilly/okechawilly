"use client";
import { useCart,type ShopCurrency } from "@/components/cart-provider";
export function CurrencySelector({compact=false,dark=false}:{compact?:boolean;dark?:boolean}){
 const {currency,currencyReady,setCurrency,count}=useCart();
 const style=`border px-2 py-2 text-[9px] uppercase tracking-[.12em] outline-none ${dark?"border-white/30 bg-[#242320] text-white":"border-[#d9d4ca] bg-transparent text-[#242320]"}`;
 return <label className="flex items-center gap-2">{!compact&&<span className="text-[9px] uppercase tracking-[.1em] opacity-70">Currency</span>}<select aria-label="Shop currency" disabled={!currencyReady||count>0} value={currency} onChange={e=>setCurrency(e.target.value as ShopCurrency)} className={style}><option value="UGX">UGX</option><option value="USD">USD</option></select></label>;
}
