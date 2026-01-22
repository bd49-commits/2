import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, getDoc, doc, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { firebaseConfig } from './config.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

enableIndexedDbPersistence(db).catch((err) => { console.log(err.code); });

let foundCustomer = null;

window.onload = async () => {
    // إذا كان محفوظاً مسبقاً، ادخل مباشرة
    const savedPass = localStorage.getItem('cust_password');
    if(savedPass) {
        document.getElementById('custPassInput').value = savedPass;
        checkCustomerCode(true); // دخول تلقائي
    }
    
    try {
        const settingsSnap = await getDoc(doc(db, "settings", "info"));
        if(settingsSnap.exists() && settingsSnap.data().whatsapp) {
            const wa = settingsSnap.data().whatsapp;
            document.getElementById('financeWaLink').href = `https://wa.me/${wa}`;
        } else {
            document.getElementById('financeWaLink').style.display = 'none';
        }
    } catch(e) { console.log("No settings"); }
    
    if(typeof gsap !== 'undefined') gsap.from(".gsap-target", {y: 20, opacity: 0, stagger: 0.1});
};

// فحص الرمز المدخل
window.checkCustomerCode = async function(isAuto = false) {
    const code = document.getElementById('custPassInput').value.trim();
    const msg = document.getElementById('msg');
    
    if(!code) return msg.innerText = "أدخل الرمز";
    msg.innerText = "جاري البحث...";

    try {
        const q = query(collection(db, "customers"), where("password", "==", code));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            msg.innerText = "الرمز غير صحيح";
            // إذا كان دخول تلقائي وفشل، نمسح المحفوظ
            if(isAuto) localStorage.removeItem('cust_password');
            return;
        }

        foundCustomer = { firebaseId: snapshot.docs[0].id, ...snapshot.docs[0].data() };

        if (isAuto) {
            loadCustomerData(foundCustomer);
        } else {
            // عرض شاشة التأكيد
            document.getElementById('cust-login').classList.add('hidden');
            document.getElementById('confirm-identity').classList.remove('hidden');
            document.getElementById('confirmName').innerText = foundCustomer.name;
        }

    } catch (e) {
        msg.innerText = "خطأ في الاتصال";
        console.error(e);
    }
}

// عند الضغط على "نعم"
window.confirmAndLogin = function() {
    const rememberMe = document.getElementById('rememberMe').checked;
    if (rememberMe) {
        localStorage.setItem('cust_password', foundCustomer.password);
    }
    document.getElementById('confirm-identity').classList.add('hidden');
    loadCustomerData(foundCustomer);
}

// تحميل البيانات النهائية
async function loadCustomerData(customer) {
    document.getElementById('cust-login').classList.add('hidden');
    document.getElementById('cust-view').classList.remove('hidden');
    if(typeof gsap !== 'undefined') gsap.from("#cust-view", { opacity: 0, scale: 0.9 });

    document.getElementById('cName').innerText = customer.name;

    const transQ = query(collection(db, "transactions"), where("customerId", "==", customer.id));
    const transSnap = await getDocs(transQ);
    const trans = transSnap.docs.map(d => d.data());
    
    let balance = 0;
    trans.forEach(t => {
        if (t.type === 'debt' || t.type === 'sale') balance += parseFloat(t.amount);
        else balance -= parseFloat(t.amount);
    });

    document.getElementById('cBalance').innerText = balance.toLocaleString() + ' ' + (customer.currency || 'IQD');
    
    if(trans.length > 0 && balance > 0) {
        trans.sort((a,b)=> new Date(b.date)-new Date(a.date));
        const lastDate = trans[0].date;
        const diff = Math.ceil(Math.abs(new Date() - new Date(lastDate)) / (1000 * 60 * 60 * 24));
        if(diff > (customer.reminderDays || 30)) {
            document.getElementById('paymentAlert').classList.remove('hidden');
            if(typeof gsap !== 'undefined') gsap.from("#paymentAlert", { x: -20, duration: 0.5, ease: "elastic" });
        }
    }

    const list = document.getElementById('cTransList');
    list.innerHTML = '';
    trans.sort((a,b) => new Date(b.date) - new Date(a.date));
    
    if(trans.length === 0) list.innerHTML = '<p style="text-align:center">لا توجد عمليات</p>';

    trans.forEach(t => {
        const div = document.createElement('div');
        div.className = 'trans-item flex flex-between';
        div.style.borderBottom = '1px solid #eee';
        let color = t.type === 'payment' ? 'green' : 'red';
        let typeName = t.type === 'debt' ? 'دين' : (t.type === 'payment' ? 'تسديد' : 'فاتورة');
        
        div.innerHTML = `
            <div><strong>${typeName}</strong> <small>${t.item || ''}</small><br><small style="color:#888">${t.date}</small></div>
            <strong style="color:${color}">${t.amount.toLocaleString()}</strong>
        `;
        list.appendChild(div);
    });
}
