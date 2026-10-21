
import { createClient } from
  "https://esm.sh/@supabase/supabase-js@2";

import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
} from "./config.js";

const message = document.getElementById("message");
const form = document.getElementById("loginForm");
const submitButton = document.getElementById("submit");

const supabaseUrl = SUPABASE_URL.trim().replace(/\/+$/, "");
const supabaseKey = SUPABASE_ANON_KEY.trim();

let supabase = null;

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

try {
  if (
    !supabaseUrl.startsWith("https://") ||
    !supabaseUrl.endsWith(".supabase.co") ||
    !supabaseKey ||
    supabaseKey.includes("TEMPELKAN_")
  ) {
    throw new Error("Konfigurasi Supabase belum benar.");
  }

  supabase = createClient(supabaseUrl, supabaseKey);
} catch (error) {
  showMessage(error.message);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!supabase) {
    showMessage(
      "Konfigurasi Supabase belum benar. Periksa config.js."
    );
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  submitButton.disabled = true;
  submitButton.textContent = "Memeriksa akun...";
  showMessage("");

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("Sesi login tidak berhasil dibuat.");
    }

    window.location.href = "./dashboard.html";
  } catch (error) {
    console.error("Login error:", error);

    showMessage(
      error.message || "Login gagal. Silakan coba kembali."
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Masuk";
  }
});
