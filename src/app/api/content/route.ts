import { NextResponse } from "next/server";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";

export async function GET(){
  if(!await readScope("birthday")) return NextResponse.json({error:"Passcode required."},{status:401});
  try {
    const db=getAdminClient();
    const [cards,posts,stories,games]=await Promise.all([
      db.from("birthday_cards").select("id,title,body_en,body_ur,sort_order,is_published").eq("is_published",true).order("sort_order"),
      db.from("profile_posts").select("id,media_path,media_kind,caption,alt_text,sort_order,is_published").eq("is_published",true).order("sort_order"),
      db.from("story_items").select("id,media_path,media_kind,caption,sort_order,is_published").eq("is_published",true).order("sort_order"),
      db.from("games").select("id,title,instructions,reward_text,sort_order,is_published").eq("is_published",true).order("sort_order")
    ]);
    for(const r of [cards,posts,stories,games]) if(r.error) throw r.error;
    const postsWithUrls=await Promise.all((posts.data??[]).map(async p=>({ ...p, url:(await db.storage.from("birthday-public").createSignedUrl(p.media_path,3600)).data?.signedUrl??"" })));
    const { getReleaseState } = await import("@/lib/release");
    const release = getReleaseState();
    return NextResponse.json({cards:cards.data??[],posts:postsWithUrls,stories:storiesWithUrls,games:games.data??[],release},{headers:{"Cache-Control":"private, no-store"}});
  } catch { return NextResponse.json({error:"Content service is not configured."},{status:503}); }
}
