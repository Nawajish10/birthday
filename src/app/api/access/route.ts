import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabase/admin";
import { setScope, clearScope } from "@/lib/session";
import {randomUUID} from "node:crypto";
import {cookies} from "next/headers";
 
export async function POST(req:NextRequest){
  const { code, scope } = await req.json().catch(()=>({}));
  if (typeof code !== "string" || !["birthday","eternalus"].includes(scope)) return NextResponse.json({error:"Invalid request."},{status:400});
  const admin=getAdminClient();
  const {data,error}=await admin.rpc("verify_access_code",{p_scope:scope,p_code:code,p_ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"});
  if(error || !data?.ok) return NextResponse.json({error:"That code could not be verified. Please try again later."},{status:401});
  if(scope==="eternalus" && data.method!=="recovery_code") return NextResponse.json({error:"Live face verification is not configured. Use the private recovery code."},{status:503});
  await setScope(scope==="eternalus"?"eternalus":"birthday");
  const jar=await cookies(); if(!jar.get("meerah_visitor"))jar.set("meerah_visitor",randomUUID(),{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*90});
  return NextResponse.json({ok:true});
}
export async function DELETE(){await clearScope();return NextResponse.json({ok:true});}
