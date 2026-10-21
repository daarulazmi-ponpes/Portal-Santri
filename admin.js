import {db,$,guard,bindLogout,requireData,isAdmin,money,safe,message} from './common.js';
let students=[],classes=[],rooms=[],invoices=[],payments=[];
const options=(items,label,empty='Pilih...')=>'<option value="">'+safe(empty)+'</option>'+items.map(x=>`<option value="${safe(x.id)}">${safe(label(x))}</option>`).join('');
function formAction(id,run){$(id).onsubmit=async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;try{await run();message('Data berhasil disimpan.','success');await load();}catch(err){message(err.message);}finally{button.disabled=false;}};}
async function load(){
 const result=await Promise.all([db.from('profiles').select('*').order('full_name'),db.from('classes').select('*').order('name'),db.from('rooms').select('*').order('name'),db.from('invoices').select('*').order('created_at',{ascending:false}).limit(500),db.from('payments').select('invoice_id,amount').limit(5000)]);
 [students,classes,rooms,invoices,payments]=result.map(requireData);
 const eligible=students.filter(s=>!!s.full_name && s.full_name.trim());
 $('countStudents').textContent=students.length;$('countInvoices').textContent=invoices.length;
 const studentName=id=>students.find(x=>x.id===id)?.full_name||'Akun tanpa nama';
 const sOpts=options(students,x=>(x.nis?x.nis+' · ':'')+(x.full_name||x.id));
 $('profileStudent').innerHTML=sOpts;
 for(const id of ['invoiceStudent','savingStudent'])$(id).innerHTML=sOpts;
 $('studentClass').innerHTML=options(classes,x=>x.name,'— Tanpa kelas —');
 $('studentRoom').innerHTML=options(rooms,x=>x.name,'— Tanpa kamar —');
 const paid=new Map();payments.forEach(p=>paid.set(p.invoice_id,(paid.get(p.invoice_id)||0)+Number(p.amount)));
 $('paymentInvoice').innerHTML=options(invoices.filter(x=>Number(x.amount)>(paid.get(x.id)||0)),x=>`${studentName(x.student_id)} | ${x.description} | Sisa ${money(Number(x.amount)-(paid.get(x.id)||0))}`);
 $('adminInvoices').innerHTML=invoices.length?invoices.map(x=>`<tr><td>${safe(studentName(x.student_id))}</td><td>${safe(x.description)}</td><td>${money(x.amount)}</td><td>${money(Number(x.amount)-(paid.get(x.id)||0))}</td></tr>`).join(''):'<tr><td colspan="4">Belum ada tagihan</td></tr>';
 fillProfile();
}
function fillProfile(){const p=students.find(x=>x.id===$('profileStudent').value);for(const [id,key] of [['nis','nis'],['fullName','full_name'],['guardian','guardian_name'],['phone','phone'],['address','address'],['studentClass','class_id'],['studentRoom','room_id']])$(id).value=p?.[key]||'';}
(async()=>{try{const user=await guard();if(!user)return;if(!await isAdmin()){location.replace('./dashboard.html');return;}bindLogout();$('profileStudent').onchange=fillProfile;$('paidAt').valueAsDate=new Date();$('savingDate').valueAsDate=new Date();await load();
 formAction('classForm',async()=>{requireData(await db.from('classes').insert({name:$('className').value.trim()}));$('className').value='';});
 formAction('roomForm',async()=>{requireData(await db.from('rooms').insert({name:$('roomName').value.trim()}));$('roomName').value='';});
 formAction('profileForm',async()=>{const id=$('profileStudent').value;if(!id)throw Error('Pilih akun.');requireData(await db.from('profiles').update({nis:$('nis').value.trim()||null,full_name:$('fullName').value.trim(),guardian_name:$('guardian').value.trim()||null,phone:$('phone').value.trim()||null,address:$('address').value.trim()||null,class_id:$('studentClass').value||null,room_id:$('studentRoom').value||null}).eq('id',id));});
 formAction('invoiceForm',async()=>{const amount=Number($('invoiceAmount').value);if(!Number.isSafeInteger(amount)||amount<0)throw Error('Nominal tidak valid.');requireData(await db.from('invoices').insert({student_id:$('invoiceStudent').value,description:$('description').value.trim(),amount,due_date:$('dueDate').value||null}));});
 formAction('paymentForm',async()=>{const invoice=invoices.find(x=>x.id===$('paymentInvoice').value);if(!invoice)throw Error('Pilih tagihan.');const amount=Number($('paymentAmount').value),totalPaid=payments.filter(x=>x.invoice_id===invoice.id).reduce((a,x)=>a+Number(x.amount),0);if(!Number.isSafeInteger(amount)||amount<=0||amount>Number(invoice.amount)-totalPaid)throw Error('Pembayaran melebihi sisa tagihan atau nominal tidak valid.');requireData(await db.from('payments').insert({invoice_id:invoice.id,amount,paid_at:$('paidAt').value,note:$('paymentNote').value.trim()||null}));});
 formAction('savingForm',async()=>{const amount=Number($('savingAmount').value);if(!Number.isSafeInteger(amount)||amount<=0)throw Error('Nominal tidak valid.');requireData(await db.from('savings_transactions').insert({student_id:$('savingStudent').value,amount:$('savingType').value==='withdraw'?-amount:amount,note:$('savingNote').value.trim(),transacted_at:$('savingDate').value}));});
}catch(err){message('Admin gagal memuat: '+err.message);}})();
