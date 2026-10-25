import {NextRequest,NextResponse} from "next/server";
import {readScope} from "@/lib/session";
import {getAdminClient} from "@/lib/supabase/admin";

const privateHeaders={"Cache-Control":"private, no-store, max-age=0","X-Content-Type-Options":"nosniff"};

export async function GET(req:NextRequest){
 if(!await readScope("eternalus"))return NextResponse.json({error:"Private access required."},{status:401,headers:privateHeaders});
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
