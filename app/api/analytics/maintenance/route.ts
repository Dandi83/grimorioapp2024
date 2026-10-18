import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { purgeAnalytics, exportAnalytics } from "@/lib/analytics";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest) {
  const secret=process.env.CRON_SECRET;
  const expected=Buffer.from(`Bearer ${secret||""}`),actual=Buffer.from(request.headers.get("authorization")||"");
  if(!secret||actual.length!==expected.length||!timingSafeEqual(actual,expected))return NextResponse.json({error:"Non autorizzato"},{status:401});
  try {await purgeAnalytics();await exportAnalytics();return NextResponse.json({ok:true});}
  catch {return NextResponse.json({error:"Sincronizzazione da riprovare"},{status:503});}
}
