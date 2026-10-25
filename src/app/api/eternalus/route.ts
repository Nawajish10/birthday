import {NextRequest,NextResponse} from "next/server";
import {readScope} from "@/lib/session";
import {getAdminClient} from "@/lib/supabase/admin";

import { getSupabaseServer } from "@/lib/supabase/server";

const privateHeaders={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};

async function isAuthorized() {
  if (await readScope("eternalus")) return true;
  const sb = await getSupabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return false;
  const db = getAdminClient();
  const [memberRes, adminRes] = await Promise.all([
    db.from("eternalus_members").select("person").eq("user_id", user.id).maybeSingle(),
    db.from("admin_users").select("role").eq("user_id", user.id).maybeSingle(),
  ]);
  return Boolean(memberRes.data || adminRes.data);
}

export async function GET(req:NextRequest){
 if(!await isAuthorized())return NextResponse.json({error:"Private access required. Please sign in with your verified Eternal Us account."},{status:401,headers:privateHeaders});
 const db=getAdminClient();const id=req.nextUrl.searchParams.get("id");
 try{
  if(id){
   const {data,error}=await db.from("eternalus_assets").select("media_path").eq("id",id).eq("is_published",true).single();
   if(error||!data)return new NextResponse("Not found.",{status:404,headers:privateHeaders});
   const {data:file,error:fileError}=await db.storage.from("eternalus-private").download(data.media_path);
   if(fileError||!file)return new NextResponse("Media unavailable.",{status:404,headers:privateHeaders});
   return new NextResponse(file.stream(),{status:200,headers:{...privateHeaders,"Content-Type":file.type||"application/octet-stream","Content-Length":String(file.size),"Content-Disposition":"inline"}});
  }
  const {data,error}=await db.from("eternalus_assets").select("id,caption,alt_text,sort_order").eq("is_published",true).order("sort_order");
  if(error)throw error;
  return NextResponse.json({items:(data??[]).map(x=>({id:x.id,caption:x.caption,alt_text:x.alt_text,url:`/api/eternalus?id=${x.id}`}))},{headers:privateHeaders});
 }catch{return NextResponse.json({error:"Private gallery is not configured yet."},{status:503,headers:privateHeaders})}
}
