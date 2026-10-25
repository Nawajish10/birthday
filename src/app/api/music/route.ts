import {NextRequest,NextResponse} from "next/server";
import {readScope} from "@/lib/session";
import {getAdminClient} from "@/lib/supabase/admin";
import {getSupabaseServer} from "@/lib/supabase/server";

export const dynamic="force-dynamic";

async function authorized(){
  if(await readScope("birthday"))return {role:"recipient" as const};
  const sb=await getSupabaseServer();const {data:{user}}=await sb.auth.getUser();if(!user)return null;
  const {data}=await sb.from("admin_users").select("role").eq("user_id",user.id).maybeSingle();return data?{role:"admin" as const}:null;
}

export async function GET(){
  if(!await authorized())return NextResponse.json({error:"Birthday passcode required."},{status:401});
  try{
    const db=getAdminClient();
    const [tracksResult,playlistsResult,itemsResult]=await Promise.all([
      db.from("music_tracks").select("id,title,artist,media_path,duration_seconds,sort_order").eq("is_published",true).order("sort_order").order("created_at"),
      db.from("music_playlists").select("id,name,created_by,created_at").eq("is_published",true).order("created_at"),
      db.from("music_playlist_tracks").select("playlist_id,track_id,sort_order").order("sort_order")
    ]);
    for(const r of [tracksResult,playlistsResult,itemsResult])if(r.error)throw r.error;
    const tracks=await Promise.all((tracksResult.data??[]).map(async t=>({...t,url:(await db.storage.from("birthday-public").createSignedUrl(t.media_path,3600)).data?.signedUrl??""})));
    const playlists=(playlistsResult.data??[]).map(p=>({...p,tracks:(itemsResult.data??[]).filter(i=>i.playlist_id===p.id).map(i=>tracks.find(t=>t.id===i.track_id)).filter(Boolean)}));
    return NextResponse.json({tracks,playlists},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({error:"Music library is not configured yet. Apply the music migration first."},{status:503});}
}

export async function POST(req:NextRequest){
  const access=await authorized();if(!access)return NextResponse.json({error:"Birthday passcode required."},{status:401});
  const body=await req.json().catch(()=>null);if(!body)return NextResponse.json({error:"Invalid music request."},{status:400});
  const db=getAdminClient();
  if(body.action==="create_playlist"){
    const name=typeof body.name==="string"?body.name.trim():"";
    if(name.length<1||name.length>60)return NextResponse.json({error:"Playlist names must be 1–60 characters."},{status:400});
    const {data,error}=await db.from("music_playlists").insert({name,created_by:access.role,is_published:true}).select("id,name,created_by,created_at").single();
    if(error)return NextResponse.json({error:"Could not create playlist."},{status:500});
    return NextResponse.json({playlist:{...data,tracks:[]}},{status:201});
  }
  if(body.action==="add_track"){
    if(typeof body.playlist_id!=="string"||typeof body.track_id!=="string")return NextResponse.json({error:"Choose a playlist and song."},{status:400});
    const {data:existing}=await db.from("music_playlist_tracks").select("sort_order").eq("playlist_id",body.playlist_id).order("sort_order",{ascending:false}).limit(1).maybeSingle();
    const {error}=await db.from("music_playlist_tracks").insert({playlist_id:body.playlist_id,track_id:body.track_id,sort_order:(existing?.sort_order??-1)+1});
    if(error)return NextResponse.json({error:error.code==="23505"?"That song is already in this playlist.":"Could not add the song."},{status:error.code==="23505"?409:500});
    return NextResponse.json({ok:true},{status:201});
  }
  if(body.action==="remove_track"){
    if(typeof body.playlist_id!=="string"||typeof body.track_id!=="string")return NextResponse.json({error:"Choose a playlist and song."},{status:400});
    const {error}=await db.from("music_playlist_tracks").delete().eq("playlist_id",body.playlist_id).eq("track_id",body.track_id);
    if(error)return NextResponse.json({error:"Could not remove the song."},{status:500});
    return NextResponse.json({ok:true});
  }
  return NextResponse.json({error:"Unknown music action."},{status:400});
}
