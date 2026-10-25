export type Card = { id:string; title:string; body_en:string; body_ur:string; sort_order:number; is_published:boolean };
export type Post = { id:string; media_path:string; media_kind:"image"|"video"; caption:string; alt_text:string; sort_order:number; is_published:boolean };
export type Story = { id:string; media_path:string; media_kind:"image"|"video"; caption:string; sort_order:number; is_published:boolean };
export type Game = { id:string; title:string; instructions:string; reward_text:string; sort_order:number; is_published:boolean };
