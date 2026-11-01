// بيانات المطور الرئيسية (تُمكّن من بيع التطبيق بتغيير البريد والرمز هنا)
let DEVELOPER_CONFIG = {
    email: "lionking1111112211@gmail.com",
    passkey: "AHMED_DEVELOPER"
};

// قواعد البيانات المخزنة محلياً (المحاكاة الهيكلية)
let db = {
    users: JSON.parse(localStorage.getItem('nutri_users')) || [],
    plans: JSON.parse(localStorage.getItem('nutri_plans')) || [],
    ratings: JSON.parse(localStorage.getItem('nutri_ratings')) || [5, 5, 5, 4]
};

let currentUser = null;
let isSignUpMode = false;
let selectedRating = 0;

// عناصر الواجهة
const authScreen = document.getElementById('auth-screen');
const mainApp = document.getElementById('main-app');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('auth-email');
const usernameGroup = document.getElementById('username-field-group');
const usernameInput = document.getElementById('auth-username');
const passwordInput = document.getElementById('auth-password');
const btnSubmitAuth = document.getElementById('btn-submit-auth');
const btnToggleMode = document.getElementById('btn-toggle-mode');
const rememberMeCheck = document.getElementById('remember-me');
const devModal = document.getElementById('dev-modal');

// عند التحميل الفوري للواجهة
document.addEventListener('DOMContentLoaded', () => {
    checkAutoLogin();
    setupEventListeners();
    updateStatsUI();
});

// إعداد الاستماعات
function setupEventListeners() {
    // تبديل بين الدخول وإنشاء الحساب
    btnToggleMode.addEventListener('click', () => {
        isSignUpMode = !isSignUpMode;
        if (isSignUpMode) {
            usernameGroup.classList.remove('hidden');
            btnSubmitAuth.innerText = 'إنشاء الحساب';
            btnToggleMode.innerText = 'لديك حساب بالفعل؟ تسجيل دخول';
        } else {
            usernameGroup.classList.add('hidden');
            btnSubmitAuth.innerText = 'تسجيل دخول';
            btnToggleMode.innerText = 'إنشاء حساب جديد';
        }
    });

    // تقديم نموذج الدخول / التسجيل
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputVal = emailInput.value.trim();
        const passVal = passwordInput.value.trim();

        // التحقق من هوية المطور أولاً
        if (inputVal === DEVELOPER_CONFIG.email) {
            devModal.classList.remove('hidden');
            return;
        }

        if (isSignUpMode) {
            handleSignUp(inputVal, usernameInput.value.trim(), passVal);
        } else {
            handleLogin(inputVal, passVal);
        }
    });

    // تأكيد المطور
    document.getElementById('btn-dev-confirm').addEventListener('click', () => {
        const inputPass = document.getElementById('dev-pass-input').value;
        if (inputPass === DEVELOPER_CONFIG.passkey) {
            devModal.classList.add('hidden');
            loginAsDev();
        } else {
            alert('الكلمة السرية للمطور غير صحيحة!');
        }
    });

    document.getElementById('btn-dev-cancel').addEventListener('click', () => {
        devModal.classList.add('hidden');
    });

    // التنقل بين التبويبات
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });

    // النجوم والتقييم
    const stars = document.querySelectorAll('#stars-wrapper .star');
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'));
            stars.forEach((s, idx) => {
                if (idx < selectedRating) s.classList.add('active');
                else s.classList.remove('active');
            });
        });
    });

    document.getElementById('btn-submit-rating').addEventListener('click', () => {
        if (selectedRating === 0) return alert('الرجاء اختيار النجوم أولاً');
        db.ratings.push(selectedRating);
        localStorage.setItem('nutri_ratings', JSON.stringify(db.ratings));
        updateStatsUI();
        alert('شكراً على تقييمك التطبيق!');
    });

    // إنشاء خطة (للمطور)
    document.getElementById('btn-save-plan').addEventListener('click', createNewPlan);

    // تغيير بيانات البروفايل
    document.getElementById('btn-update-profile').addEventListener('click', updateProfile);
    document.getElementById('btn-change-pass').addEventListener('click', changePassword);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-delete-account').addEventListener('click', deleteAccount);

    // معالجة صورة البروفايل
    document.getElementById('profile-img-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(evt) {
                document.getElementById('profile-img-preview').src = evt.target.result;
                if(currentUser) {
                    currentUser.avatar = evt.target.result;
                    saveUserData();
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

// إنشاء حساب جديد
function handleSignUp(email, username, password) {
    if (!username) return alert('الرجاء كتابة اسم المستخدم (Username)');
    
    // التحقق من التكرار
    const exist = db.users.find(u => u.email === email || u.username === username);
    if (exist) return alert('البريد أو اليوزرنيم مستخدم مسبقاً!');

    const newUser = {
        id: Date.now(),
        email,
        username,
        password,
        fullName: username,
        isDev: false,
        lastUsernameChange: null,
        avatar: 'https://via.placeholder.com/100'
    };

    db.users.push(newUser);
    saveUserData();
    alert('تم إنشاء الحساب بنجاح! احتفظ باليوزرنيم جيداً: ' + username);
    
    // تسجيل الدخول بالجديد
    setCurrentUser(newUser);
}

// تسجيل الدخول العادي
function handleLogin(identifier, password) {
    const user = db.users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
    if (user) {
        setCurrentUser(user);
    } else {
        alert('خطأ في البيانات أو الحساب غير موجود');
    }
}

// دخول المطور
function loginAsDev() {
    let devUser = db.users.find(u => u.email === DEVELOPER_CONFIG.email);
    if (!devUser) {
        devUser = {
            id: 'dev_01',
            email: DEVELOPER_CONFIG.email,
            username: 'Developer',
            password: '***',
            fullName: 'أحمد الهوى (المطور)',
            isDev: true,
            avatar: 'https://via.placeholder.com/100'
        };
        db.users.push(devUser);
        saveUserData();
    }
    setCurrentUser(devUser);
}

// تعيين الجلسة الحالية
function setCurrentUser(user) {
    currentUser = user;
    if (rememberMeCheck.checked) {
        localStorage.setItem('nutri_remembered_user', JSON.stringify(user.id));
    }
    launchMainApp();
}

// التذكر التلقائي عند الرجوع للتطبيق
function checkAutoLogin() {
    const savedId = localStorage.getItem('nutri_remembered_user');
    if (savedId) {
        const found = db.users.find(u => u.id == savedId || u.id === savedId);
        if (found) {
            currentUser = found;
            launchMainApp();
        }
    }
}

// تشغيل الواجهة الرئيسية بعد الدخول
function launchMainApp() {
    authScreen.classList.remove('active');
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

    // إعداد واجهة المطور أم المستخدم
    const plansNavBtn = document.getElementById('nav-plans-btn');
    const plansTitle = document.getElementById('plans-tab-title');
    const devCreatePlanBox = document.getElementById('dev-create-plan');
    const devAdminPanel = document.getElementById('dev-admin-panel');

    if (currentUser.isDev) {
        plansNavBtn.innerText = 'خطط العملاء';
        plansTitle.innerText = 'خطط العملاء المنشأة';
        devCreatePlanBox.classList.remove('hidden');
        devAdminPanel.classList.remove('hidden');
        renderAdminUsersTable();
    } else {
        plansNavBtn.innerText = 'خطتي';
        plansTitle.innerText = 'خطتي الغذائية';
        devCreatePlanBox.classList.add('hidden');
        devAdminPanel.classList.add('hidden');
    }

    loadProfileData();
    renderPlans();
    updateStatsUI();
}

// تحديث الإحصائيات بالواجهة
function updateStatsUI() {
    document.getElementById('stat-users').innerText = db.users.length;
    document.getElementById('stat-plans').innerText = db.plans.length;
    
    // التقييم المتوسط
    if (db.ratings.length > 0) {
        const avg = (db.ratings.reduce((a, b) => a + b, 0) / db.ratings.length).toFixed(1);
        document.getElementById('stat-rating').innerText = avg + ' ★';
    }
}

// عرض قائمة أعضاء السجل المخصص للمطور
function renderAdminUsersTable() {
    const tbody = document.getElementById('users-table-body');
    tbody.innerHTML = '';
    db.users.forEach(u => {
        if (u.isDev) return; // عدم حذف الحساب الرئيسي
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td>${u.password}</td>
            <td><button class="btn-small danger-btn" onclick="adminDeleteUser(${u.id})">حذف</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function adminDeleteUser(userId) {
    if (confirm('هل أنت تأكد من حذف حساب هذا المستخدم؟')) {
        db.users = db.users.filter(u => u.id !== userId);
        saveUserData();
        renderAdminUsersTable();
        updateStatsUI();
    }
}

// إضافة خطة غذائية للعميل
function createNewPlan() {
    const targetUser = document.getElementById('plan-target-user').value.trim();
    const title = document.getElementById('plan-title').value.trim();
    const content = document.getElementById('plan-content').value.trim();

    if (!targetUser || !title || !content) return alert('الرجاء تعبئة كامل الحقول');

    const newPlan = {
        id: Date.now(),
        targetUser,
        title,
        content,
        date: new Date().toLocaleDateString('ar-EG')
    };

    db.plans.push(newPlan);
    localStorage.setItem('nutri_plans', JSON.stringify(db.plans));
    alert('تم إرسال الخطة بنجاح للعميل ' + targetUser);
    
    document.getElementById('plan-target-user').value = '';
    document.getElementById('plan-title').value = '';
    document.getElementById('plan-content').value = '';
    
    renderPlans();
    updateStatsUI();
}

// عرض الخطط
function renderPlans() {
    const container = document.getElementById('plans-list');
    container.innerHTML = '';

    // تصفية الخطط
    let userPlans = [];
    if (currentUser.isDev) {
        userPlans = db.plans; // المطور يرى كل الخطط
    } else {
        userPlans = db.plans.filter(p => p.targetUser === currentUser.username);
    }

    if (userPlans.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#888;">لا توجد خطط متاحة حالياً.</p>';
        return;
    }

    userPlans.forEach(plan => {
        const card = document.createElement('div');
        card.className = 'glass-card';
        card.style.marginBottom = '15px';
        card.innerHTML = `
            <h4>${plan.title} ${currentUser.isDev ? `(إلى: ${plan.targetUser})` : ''}</h4>
            <p style="font-size: 0.85rem; color:#bbb; margin: 8px 0;">${plan.content}</p>
            <small style="color:#a7f3d0;">تاريخ: ${plan.date}</small>
            <div style="margin-top:10px;">
                <button class="btn-small" onclick="exportPlanPDF('${plan.title}', '${plan.content}')">تصدير ملف الخطة (PDF)</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// تصدير الخطة بملف PDF
function exportPlanPDF(title, content) {
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.color = '#000';
    element.innerHTML = `
        <h1 style="text-align:center; color:#6b21a8;">NUTRICORE</h1>
        <h3 style="text-align:center;">خطة غذائية: ${title}</h3>
        <hr><br>
        <p><strong>المستفيد:</strong> ${currentUser.fullName} (${currentUser.username})</p>
        <p><strong>التفاصيل والتوصيات:</strong></p>
        <p style="white-space: pre-line;">${content}</p>
        <br><br>
        <p style="text-align:center; font-size: 12px; color: #555;">جميع الحقوق محفوظة لـِ أحمد الهوى 2026 ©</p>
    `;
    
    html2pdf().from(element).save(`${title}.pdf`);
}

// إدارة البروفايل
function loadProfileData() {
    document.getElementById('prof-fullname').value = currentUser.fullName || '';
    document.getElementById('prof-username').value = currentUser.username || '';
    if(currentUser.avatar) {
        document.getElementById('profile-img-preview').src = currentUser.avatar;
    }
}

function updateProfile() {
    const newName = document.getElementById('prof-fullname').value.trim();
    const newUsername = document.getElementById('prof-username').value.trim();

    if (newUsername !== currentUser.username) {
        // فحص قيد التغيير مرة كل أسبوع
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        if (currentUser.lastUsernameChange && (now - currentUser.lastUsernameChange < oneWeek)) {
            alert('عذراً، لن تتمكن من تغيير اليوزر إلا مرة في الأسبوع!');
            return;
        }
        currentUser.username = newUsername;
        currentUser.lastUsernameChange = now;
    }

    currentUser.fullName = newName;
    saveUserData();
    alert('تم تحديث بيانات البروفايل بنجاح');
}

function changePassword() {
    const oldP = document.getElementById('pass-old').value;
    const newP = document.getElementById('pass-new').value;

    if (oldP !== currentUser.password) {
        return alert('كلمة المرور القديمة غير صحيحة!');
    }
    if (!newP) return alert('يرجى كتابة كلمة المرور الجديدة');

    currentUser.password = newP;
    saveUserData();
    alert('تم تغيير كلمة المرور بنجاح');
}

function logout() {
    localStorage.removeItem('nutri_remembered_user');
    location.reload();
}

function deleteAccount() {
    const passConfirm = prompt('لتأكيد حذف الحساب نهائياً، يرجى كتابة كلمة المرور الخاصة بك:');
    if (passConfirm === currentUser.password) {
        db.users = db.users.filter(u => u.id !== currentUser.id);
        saveUserData();
        alert('تم حذف حسابك بنجاح.');
        logout();
    } else if(passConfirm !== null) {
        alert('كلمة المرور غير صحيحة، لم يتم حذف الحساب.');
    }
}

function saveUserData() {
    // تحديث العضو في المصفوفة الرئيسية
    const idx = db.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) db.users[idx] = currentUser;
    localStorage.setItem('nutri_users', JSON.stringify(db.users));
}
