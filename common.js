
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

export function bindSectionNavigation() {
  document.querySelectorAll('nav a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = decodeURIComponent(link.hash.slice(1));
      const target = document.getElementById(targetId);

      if (!target) {
        return;
      }

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });

      if (window.location.hash !== link.hash) {
        window.history.pushState(null, '', link.hash);
      }
    });
  });
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

  if (error) {
    throw error;
  }

  if (!user) {
    window.location.replace('./index.html');
    return null;
  }

  return user;
}

export async function isAdmin() {
  if (!db) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const { data, error } = await db.rpc('is_portal_admin');

  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      console.warn('Admin role check unavailable; treating user as a student.', error);
      return false;
    }
    throw error;
  }

  return data === true;
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
