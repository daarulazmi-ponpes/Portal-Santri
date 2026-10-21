
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from './config.js';

// ========================================
// KONFIGURASI SUPABASE
// ========================================

export const configured =
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_ANON_KEY.startsWith('GANTI_');

export const db = configured
  ? createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    )
  : null;

// ========================================
// FUNGSI UMUM
// ========================================

export const $ = (id) =>
  document.getElementById(id);

export const money = (n) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(n) || 0);

export const date = (d) =>
  d
    ? new Date(`${d}T12:00:00`).toLocaleDateString(
        'id-ID',
        {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        }
      )
    : '—';

// ========================================
// PESAN NOTIFIKASI
// ========================================

export function message(text, type = 'error') {
  const el = $('message');

  if (el) {
    el.textContent = text;
    el.className = 'message ' + type;
  }
}

// ========================================
// AMANKAN TEKS HTML
// ========================================

export function safe(t) {
  return String(t ?? '').replace(
    /[&<>"']/g,
    ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[ch]
  );
}

// ========================================
// PEMERIKSAAN LOGIN
// ========================================

export async function guard() {
  if (!configured || !db) {
    message(
      'Isi config.js dengan Project URL dan publishable/anon key Supabase.'
    );
    return null;
  }

  const {
    data: { user },
    error
  } = await db.auth.getUser();

  if (error || !user) {
    window.location.replace('./index.html');
    return null;
  }

  return user;
}

// ========================================
// PEMERIKSAAN ADMIN SEMENTARA
// ========================================

// Sementara tidak memanggil RPC is_portal_admin
// agar dashboard santri tidak berhenti karena
// fungsi tersebut belum tersedia di Supabase.
//
// Ini BUKAN pemeriksaan hak akses admin permanen.

export async function isAdmin() {
  return false;
}

// ========================================
// LOGOUT
// ========================================

export function bindLogout() {
  const b = $('logout');

  if (b) {
    b.onclick = async () => {
      if (db) {
        await db.auth.signOut();
      }

      window.location.replace('./index.html');
    };
  }
}

// ========================================
// PEMERIKSAAN HASIL DATABASE
// ========================================

export function requireData(result) {
  if (result.error) {
    throw result.error;
  }

  return result.data;
}
