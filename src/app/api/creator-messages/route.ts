import {NextRequest,NextResponse} from "next/server";
import {cookies} from "next/headers";
import {randomUUID} from "node:crypto";
import {readScope} from "@/lib/session";
import {getSupabaseServer} from "@/lib/supabase/server";
import {getAdminClient} from "@/lib/supabase/admin";
async function admin(){const sb=await getSupabaseServer();const {data:{user}}=await sb.auth.getUser();if(!user)return null;const {data}=await sb.from("admin_users").select("role").eq("user_id",user.id).maybeSingle();return data?user:null;}
export async function GET(req:NextRequest){
 const isAdmin=await admin(); const visitor=(await cookies()).get("meerah_visitor")?.value;
 if(isAdmin&&req.nextUrl.searchParams.get("inbox")==="1"){const {data,error}=await getAdminClient().from("creator_messages").select("*").order("created_at",{ascending:true}).limit(300);if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({messages:data});}
 if(!await readScope("birthday")||!visitor)return NextResponse.json({error:"Birthday access required."},{status:401});
 const {data,error}=await getAdminClient().from("creator_messages").select("id,sender,body,created_at,read_at").eq("visitor_id",visitor).order("created_at",{ascending:true}).limit(100);if(error)return NextResponse.json({error:"Unable to load messages."},{status:500});return NextResponse.json({messages:data});
}
export async function POST(req:NextRequest){const b=await req.json().catch(()=>({}));const db=getAdminClient();const isAdmin=await admin();
 if(isAdmin&&b.sender==="creator"&&typeof b.visitor_id==="string"&&typeof b.body==="string"&&b.body.length>0&&b.body.length<=2000){const {data,error}=await db.from("creator_messages").insert({visitor_id:b.visitor_id,sender:"creator",body:b.body}).select().single();if(error)return NextResponse.json({error:"Unable to send reply."},{status:500});return NextResponse.json({message:data});}
 if(!await readScope("birthday")||typeof b.body!=="string"||b.body.trim().length<1||b.body.length>2000)return NextResponse.json({error:"Birthday access required or message invalid."},{status:401});
 const jar=await cookies();let visitor=jar.get("meerah_visitor")?.value;if(!visitor){visitor=randomUUID();jar.set("meerah_visitor",visitor,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*90});}
 const {data,error}=await db.from("creator_messages").insert({visitor_id:visitor,sender:"recipient",body:b.body.trim()}).select().single();if(error)return NextResponse.json({error:"Unable to send message."},{status:500});return NextResponse.json({message:data});
}
