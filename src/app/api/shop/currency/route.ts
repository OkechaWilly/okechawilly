import { NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const country=(request.headers.get("x-vercel-ip-country")||request.headers.get("cf-ipcountry")||"").toUpperCase();
 const currency=country==="UG"||!country?"UGX":"USD";
 return NextResponse.json({country:country||null,currency,source:country?"country-detection":"default"},{headers:{"Cache-Control":"private, no-store, max-age=0"}});
}
