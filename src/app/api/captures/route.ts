import {NextRequest,NextResponse} from "next/server";
import {readScope} from "@/lib/session";
import {cookies} from "next/headers";
import {randomUUID} from "node:crypto";
import {getAdminClient} from "@/lib/supabase/admin";

export async function POST(req:NextRequest){
 if(!await readScope("birthday"))return NextResponse.json({error:"Birthday access required."},{status:401});
 const jar=await cookies();const visitor=jar.get("meerah_visitor")?.value;if(!visitor)return NextResponse.json({error:"Unable to identify this session."},{status:401});
 const form=await req.formData().catch(()=>null);const file=form?.get("file");const caption=String(form?.get("caption")||"").slice(0,280);
 if(!(file instanceof File)||file.size<1||file.size>12*1024*1024||!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type))return NextResponse.json({error:"Choose an image up to 12 MB."},{status:400});
 const db=getAdminClient();const path=`recipient/${visitor}/${randomUUID()}.${file.type.split('/')[1].replace('jpeg','jpg')}`;
 const {error:uploadError}=await db.storage.from("birthday-public").upload(path,file,{contentType:file.type,upsert:false});if(uploadError)return NextResponse.json({error:"Could not save this photo."},{status:500});
 const {data,error}=await db.from("profile_posts").insert({media_path:path,media_kind:"image",caption:caption||"A new birthday memory",alt_text:"Photo added by the birthday recipient",is_published:true,sort_order:Date.now()}).select("id,media_path,caption,alt_text,sort_order,is_published").single();
 if(error){await db.storage.from("birthday-public").remove([path]);return NextResponse.json({error:"Could not add this photo to the profile."},{status:500});}
 const {data:signed}=await db.storage.from("birthday-public").createSignedUrl(path,3600);return NextResponse.json({post:{...data,url:signed?.signedUrl??""}},{headers:{"Cache-Control":"private, no-store"}});
}
