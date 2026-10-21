
import { db } from "./common.js";

const message = document.getElementById("message");
const form = document.getElementById("loginForm");
const submitButton = document.getElementById("submit");
const nameField = document.getElementById("nameField");
const fullNameInput = document.getElementById("fullName");
const confirmPasswordField = document.getElementById("confirmPasswordField");
const confirmPasswordInput = document.getElementById("confirmPassword");
const toggleModeButton = document.getElementById("toggleMode");
const modePrompt = document.getElementById("modePrompt");

let mode = "login";

function showMessage(text, success = false) {
  message.textContent = text;
  message.classList.toggle("success", success);
}

function setMode(nextMode) {
  mode = nextMode;
  const isSignup = mode === "signup";

  nameField.hidden = !isSignup;
  fullNameInput.required = isSignup;
  confirmPasswordField.hidden = !isSignup;
  confirmPasswordInput.required = isSignup;
  document.getElementById("password").autocomplete = isSignup
    ? "new-password"
    : "current-password";
  submitButton.textContent = isSignup ? "Daftar" : "Masuk";
  toggleModeButton.textContent = isSignup ? "Masuk" : "Daftar";
  modePrompt.textContent = isSignup
    ? "Sudah punya akun?"
    : "Belum punya akun?";
  message.textContent = "";
  message.classList.remove("success");
}

toggleModeButton.addEventListener("click", () => {
  setMode(mode === "login" ? "signup" : "login");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!db) {
    showMessage(
      "Konfigurasi Supabase belum benar. Periksa config.js."
    );
    return;
  }

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const fullName = fullNameInput.value.trim();

  if (mode === "signup" && !fullName) {
    showMessage("Nama lengkap wajib diisi.");
    return;
  }

  if (mode === "signup" && password !== confirmPasswordInput.value) {
    showMessage("Konfirmasi password tidak sama.");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = mode === "signup"
    ? "Mendaftarkan akun..."
    : "Memeriksa akun...";
  showMessage("");

  try {
    if (mode === "signup") {
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        window.location.href = "./dashboard.html";
        return;
      }

      showMessage(
        "Pendaftaran berhasil. Periksa email untuk mengonfirmasi akun sebelum masuk.",
        true
      );
      form.reset();
      return;
    }

    const { data, error } = await db.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error("Sesi login tidak berhasil dibuat.");
    }

    const { data: isAdmin, error: roleError } = await db.rpc(
      "is_portal_admin"
    );

    if (roleError) {
      console.warn("Admin role check unavailable; continuing to student dashboard.", roleError);
      window.location.href = "./dashboard.html";
      return;
    }

    window.location.href = isAdmin
      ? "./admin.html"
      : "./dashboard.html";
  } catch (error) {
    console.error("Login error:", error);

    showMessage(
      error.message || "Login gagal. Silakan coba kembali."
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = mode === "signup" ? "Daftar" : "Masuk";
  }
});
