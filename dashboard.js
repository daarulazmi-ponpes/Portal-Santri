import { db } from './common.js';

const form = document.getElementById('profile-form');
const nameInput = document.getElementById('full-name');
const nisInput = document.getElementById('nis');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const statusEl = document.getElementById('profile-status');
const saveButton = document.getElementById('save-btn');
const logoutButton = document.getElementById('logout-btn');
let currentUser = null;

function setStatus(text, colorClass) {
  statusEl.textContent = text;
  statusEl.className = `mt-3 text-sm font-medium ${colorClass}`;
}

async function loadDashboard() {
  const { data, error: sessionError } = await db.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  if (!data.session?.user) {
    window.location.replace('./index.html');
    return;
  }

  currentUser = data.session.user;

  const { data: profile, error } = await db
    .from('profiles')
    .select('full_name,nis,phone,address')
    .eq('id', currentUser.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (profile) {
    nameInput.value = profile.full_name || '';
    nisInput.value = profile.nis || '';
    phoneInput.value = profile.phone || '';
    addressInput.value = profile.address || '';
  } else {
    nameInput.value = currentUser.user_metadata?.full_name || '';
    setStatus('Lengkapi profil Anda, lalu simpan.', 'text-blue-600');
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!db || !currentUser) {
    setStatus('Sesi login tidak ditemukan. Silakan masuk kembali.', 'text-red-600');
    return;
  }

  saveButton.disabled = true;
  setStatus('Menyimpan perubahan...', 'text-blue-600');

  try {
    const { data, error: sessionError } = await db.auth.getSession();
    if (sessionError) throw sessionError;
    if (!data.session?.user || data.session.user.id !== currentUser.id) {
      window.location.replace('./index.html');
      return;
    }

    const { error } = await db
      .from('profiles')
      .upsert(
        {
          id: currentUser.id,
          full_name: nameInput.value.trim(),
          nis: nisInput.value.trim() || null,
          phone: phoneInput.value.trim() || null,
          address: addressInput.value.trim() || null
        },
        { onConflict: 'id' }
      );

    if (error) throw error;

    setStatus('Profil berhasil diperbarui.', 'text-green-600');
  } catch (error) {
    console.error('Gagal menyimpan profil:', error);
    setStatus(`Gagal menyimpan profil: ${error.message}`, 'text-red-600');
  } finally {
    saveButton.disabled = false;
  }
});

logoutButton.addEventListener('click', async () => {
  logoutButton.disabled = true;
  try {
    const { error } = await db.auth.signOut();
    if (error) throw error;
    window.location.replace('./index.html');
  } catch (error) {
    setStatus(`Gagal keluar: ${error.message}`, 'text-red-600');
    logoutButton.disabled = false;
  }
});

loadDashboard().catch((error) => {
  console.error('Gagal memuat dashboard:', error);
  setStatus(`Gagal memuat profil: ${error.message}`, 'text-red-600');
});
