import { db, date, money, safe } from './common.js';

const status = document.getElementById('dashboard-status');
const emptyRow = (message, columns) =>
  `<tr><td colspan="${columns}">${safe(message)}</td></tr>`;

async function loadPortal() {
  if (!db) {
    throw new Error('Konfigurasi Supabase belum benar. Periksa config.js.');
  }

  const { data: sessionData, error: sessionError } = await db.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user;
  if (!user) {
    window.location.replace('./index.html');
    return;
  }

  document.getElementById('logout-btn').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const { error } = await db.auth.signOut();
      if (error) throw error;
      window.location.replace('./index.html');
    } catch (error) {
      status.textContent = `Gagal keluar: ${error.message}`;
      status.className = 'portal-status is-error';
      button.disabled = false;
    }
  });

  const [profileResult, invoiceResult, paymentResult, savingsResult] =
    await Promise.all([
      db.from('profiles')
        .select('full_name,nis,class_id,room_id')
        .eq('id', user.id)
        .maybeSingle(),
      db.from('invoices')
        .select('id,description,amount,due_date,created_at')
        .order('created_at', { ascending: false }),
      db.from('payments')
        .select('invoice_id,amount,paid_at,note,created_at')
        .order('paid_at', { ascending: false }),
      db.from('savings_transactions')
        .select('amount,note,transacted_at,created_at')
        .order('transacted_at', { ascending: false })
    ]);

  for (const result of [profileResult, invoiceResult, paymentResult, savingsResult]) {
    if (result.error) throw result.error;
  }

  const profile = profileResult.data;
  const invoices = invoiceResult.data || [];
  const payments = paymentResult.data || [];
  const savings = savingsResult.data || [];
  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const paidByInvoice = new Map();

  for (const payment of payments) {
    paidByInvoice.set(
      payment.invoice_id,
      (paidByInvoice.get(payment.invoice_id) || 0) + Number(payment.amount)
    );
  }

  const outstanding = invoices.reduce(
    (total, invoice) =>
      total + Math.max(0, Number(invoice.amount) - (paidByInvoice.get(invoice.id) || 0)),
    0
  );
  const paidTotal = payments.reduce((total, payment) => total + Number(payment.amount), 0);
  const savingsTotal = savings.reduce((total, transaction) => total + Number(transaction.amount), 0);

  document.getElementById('student-name').textContent =
    profile?.full_name?.trim() || user.user_metadata?.full_name || 'Santri';
  document.getElementById('student-nis').textContent = `NIS: ${profile?.nis || '—'}`;
  document.getElementById('student-class').textContent = 'Kelas: —';
  document.getElementById('student-room').textContent = 'Kamar: —';
  document.getElementById('outstanding-total').textContent = money(outstanding);
  document.getElementById('payment-total').textContent = money(paidTotal);
  document.getElementById('savings-total').textContent = money(savingsTotal);

  document.getElementById('invoice-list').innerHTML = invoices.length
    ? invoices.map((invoice) => {
        const paid = paidByInvoice.get(invoice.id) || 0;
        const remaining = Math.max(0, Number(invoice.amount) - paid);
        return `<tr>
          <td>${safe(invoice.description)}</td>
          <td>${safe(date(invoice.due_date))}</td>
          <td>${money(invoice.amount)}</td>
          <td>${money(paid)}</td>
          <td><span class="portal-badge ${remaining ? '' : 'is-paid'}">${money(remaining)}</span></td>
        </tr>`;
      }).join('')
    : emptyRow('Belum ada tagihan.', 5);

  document.getElementById('payment-list').innerHTML = payments.length
    ? payments.map((payment) => {
        const invoice = invoiceById.get(payment.invoice_id);
        return `<tr>
          <td>${safe(date(payment.paid_at))}</td>
          <td>${safe(invoice?.description || 'Pembayaran')}</td>
          <td>${safe(payment.note || '—')}</td>
          <td>${money(payment.amount)}</td>
        </tr>`;
      }).join('')
    : emptyRow('Belum ada riwayat pembayaran.', 4);

  document.getElementById('savings-list').innerHTML = savings.length
    ? savings.map((transaction) => `<tr>
        <td>${safe(date(transaction.transacted_at))}</td>
        <td>${safe(transaction.note || 'Transaksi tabungan')}</td>
        <td>${Number(transaction.amount) > 0 ? 'Setoran' : 'Penarikan'}</td>
        <td>${money(Math.abs(Number(transaction.amount)))}</td>
      </tr>`).join('')
    : emptyRow('Belum ada riwayat tabungan.', 4);

  status.textContent = 'Informasi akun berhasil dimuat.';
  status.className = 'portal-status is-success';

  if (profile?.class_id || profile?.room_id) {
    const [classResult, roomResult] = await Promise.all([
      profile.class_id
        ? db.from('classes').select('name').eq('id', profile.class_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      profile.room_id
        ? db.from('rooms').select('name').eq('id', profile.room_id).maybeSingle()
        : Promise.resolve({ data: null, error: null })
    ]);
    if (classResult.error) throw classResult.error;
    if (roomResult.error) throw roomResult.error;
    document.getElementById('student-class').textContent =
      `Kelas: ${classResult.data?.name || '—'}`;
    document.getElementById('student-room').textContent =
      `Kamar: ${roomResult.data?.name || '—'}`;
  }

}

loadPortal().catch((error) => {
  console.error('Gagal memuat portal santri:', error);
  status.textContent = `Gagal memuat informasi: ${error.message}`;
  status.className = 'portal-status is-error';
  for (const [id, columns] of [
    ['invoice-list', 5],
    ['payment-list', 4],
    ['savings-list', 4]
  ]) {
    document.getElementById(id).innerHTML = emptyRow('Informasi gagal dimuat.', columns);
  }
});
