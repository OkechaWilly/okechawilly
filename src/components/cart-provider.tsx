"use client";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
export type ShopCurrency = "UGX" | "USD";
export type CartItem = { key:string; productId:string; variantId:string|null; title:string; slug:string; image:string|null; variantLabel:string|null; quantity:number; unitPrice:number; currency:ShopCurrency };
type CartContextValue = { items:CartItem[]; count:number; currency:ShopCurrency; currencyReady:boolean; currencyError:string; addItem:(item:Omit<CartItem,"key"|"quantity">)=>boolean; setCurrency:(currency:ShopCurrency)=>boolean; setQuantity:(key:string,quantity:number)=>void; removeItem:(key:string)=>void; clearCart:()=>void };
const CartContext=createContext<CartContextValue|null>(null);
const STORAGE_KEY="okecha-willy-cart-v1", CURRENCY_KEY="okecha-willy-currency-v1";
export function CartProvider({children}:{children:ReactNode}) {
 const [items,setItems]=useState<CartItem[]>([]),[currency,setCurrencyState]=useState<ShopCurrency>("UGX"),[ready,setReady]=useState(false),[currencyReady,setCurrencyReady]=useState(false),[currencyError,setCurrencyError]=useState("");
 useEffect(()=>{
  let savedItems:CartItem[]=[];
  try { const saved=window.localStorage.getItem(STORAGE_KEY); if(saved){const parsed=JSON.parse(saved);if(Array.isArray(parsed)) savedItems=parsed.filter((i)=>i&&typeof i.productId==="string"&&typeof i.unitPrice==="number"&&(i.currency==="UGX"||i.currency==="USD")&&Number.isInteger(i.quantity));} setItems(savedItems); } catch {window.localStorage.removeItem(STORAGE_KEY);}
  const preferred=window.localStorage.getItem(CURRENCY_KEY);
  if(savedItems.length){const cartCurrency=savedItems[0].currency;setItems(savedItems.filter((item)=>item.currency===cartCurrency));setCurrencyState(cartCurrency);window.localStorage.setItem(CURRENCY_KEY,cartCurrency);document.cookie="okecha-willy-currency="+cartCurrency+"; path=/; max-age=31536000; samesite=lax";setCurrencyReady(true);}
  else if(preferred==="UGX"||preferred==="USD"){setCurrencyState(preferred);document.cookie="okecha-willy-currency="+preferred+"; path=/; max-age=31536000; samesite=lax";setCurrencyReady(true);}
  else {fetch("/api/shop/currency",{cache:"no-store"}).then(r=>r.ok?r.json():Promise.reject()).then(v=>{const next=v.currency==="USD"?"USD":"UGX";setCurrencyState(next);document.cookie="okecha-willy-currency="+next+"; path=/; max-age=31536000; samesite=lax";}).catch(()=>setCurrencyError("We couldn't detect your region. Uganda pricing is selected by default.")).finally(()=>setCurrencyReady(true));}
  setReady(true);
 },[]);
 useEffect(()=>{if(ready)window.localStorage.setItem(STORAGE_KEY,JSON.stringify(items));},[items,ready]);
 const value=useMemo<CartContextValue>(()=>({
  items,count:items.reduce((n,i)=>n+i.quantity,0),currency,currencyReady,currencyError,
  addItem:(item)=>{if(item.currency!==currency)return false;setItems(current=>{const key=item.productId+":"+(item.variantId||"base"),found=current.find(x=>x.key===key);if(found)return current.map(x=>x.key===key?{...x,quantity:Math.min(20,x.quantity+1)}:x);return [...current,{...item,key,quantity:1}];});return true;},
  setCurrency:(next)=>{if(items.length)return false;setCurrencyState(next);window.localStorage.setItem(CURRENCY_KEY,next);document.cookie="okecha-willy-currency="+next+"; path=/; max-age=31536000; samesite=lax";return true;},
  setQuantity:(key,q)=>setItems(current=>current.map(i=>i.key===key?{...i,quantity:Math.max(1,Math.min(20,Math.floor(q)||1))}:i)),
  removeItem:(key)=>setItems(current=>current.filter(i=>i.key!==key)),clearCart:()=>setItems([])
 }),[items,currency,currencyReady,currencyError]);
 return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart(){const value=useContext(CartContext);if(!value)throw new Error("useCart must be used within CartProvider");return value;}
