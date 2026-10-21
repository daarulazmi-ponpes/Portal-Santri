import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const configured = SUPABASE_URL.startsWith('https://') && !SUPABASE_ANON_KEY.startsWith('GANTI_');
export const db = configured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}}) : null;
export const $ = (id) => document.getElementById(id);
export const money = (n) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(Number(n)||0);
export const date = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}) : '—';
export function message(text, type='error') { const el=$('message'); if(el){el.textContent=text;el.className='message '+type;} }
export function safe(t){return String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));}
export async function guard() {
 if(!configured){ message('Isi portal/config.js dengan Project URL dan publishable/anon key Supabase.'); return null; }
 const {data:{user},error}=await db.auth.getUser();
 if(error || !user){location.replace('./index.html');return null;} return user;
}
export async function isAdmin(){ const {data,error}=await db.rpc('is_portal_admin'); if(error) throw error; return data===true; }
export function bindLogout(){const b=$('logout'); if(b)b.onclick=async()=>{await db.auth.signOut();location.replace('./index.html');};}
export function requireData(result){if(result.error)throw result.error;return result.data;}
