import { NextRequest,NextResponse } from "next/server";
import OpenAI from "openai";
import { readScope } from "@/lib/session";
import { getAdminClient } from "@/lib/supabase/admin";

export async function POST(req:NextRequest){
 if(!await readScope("birthday")) return NextResponse.json({error:"Passcode required."},{status:401});
 const {message,mode}=await req.json().catch(()=>({}));
 if(typeof message!=="string"||message.length<1||message.length>1000) return NextResponse.json({error:"Please send a message up to 1000 characters."},{status:400});
 if(!process.env.OPENAI_API_KEY) return NextResponse.json({reply:"I'm Noah, your birthday guide. Chat is being set up; you can explore the birthday book, profile, stories, and gift game for now."});
 try {
  const db=getAdminClient();
  let systemPrompt:string;
  if(mode==="general"){
   systemPrompt=`You are Noah, a warm, kind AI birthday companion for him. Be supportive, cheerful, and concise. You can chat about anything that lifts the mood. Never reveal private couple photos (Eternalus), camera data, or personal secrets.`;
  } else {
   const {data}=await db.from("noah_knowledge").select("topic,approved_text").eq("is_enabled",true).limit(40);
   systemPrompt=`You are Noah, a clearly disclosed AI birthday guide for him. Be warm, light, and concise. Answer only from the approved birthday notes below and basic site navigation. Never invent personal memories. If unsure, say so. You cannot access private couple photos in Eternalus, camera captures, biometric data, or private conversations.\n\nApproved notes:\n${(data??[]).map((x:{topic:string;approved_text:string})=>`[${x.topic}] ${x.approved_text}`).join("\n")}`;
  }
  const ai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const response=await ai.responses.create({model:process.env.OPENAI_MODEL||"gpt-4o-mini",store:false,input:[{role:"system",content:systemPrompt},{role:"user",content:message}]});
  return NextResponse.json({reply:response.output_text||"I'm not sure about that one, but I can help you explore the birthday pages."},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({reply:"I can't reach my birthday notes right now. You can still explore the rest of the site."});}
}
