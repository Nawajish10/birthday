import { getSupabaseServer } from "@/lib/supabase/server";
import { Admin } from "@/components/Admin";
export default async function AdminPage(){const sb=await getSupabaseServer();const {data:{user}}=await sb.auth.getUser();if(!user)return <Admin authenticated={false} email=""/>;const {data}=await sb.from("admin_users").select("role").eq("user_id",user.id).maybeSingle();return <Admin authenticated={Boolean(data)} email={user.email??""}/>;}
