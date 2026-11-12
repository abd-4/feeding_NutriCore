// إعدادات قاعدة البيانات السحابية عبر JSONBin.io
const JSONBIN_CONFIG = {
    binId: "6af5dd62ffd5d16053bc7eb9",
    apiKey: "$2a$10$4E5tRjBAaY8BZGvom1qx7OffYbN3aI5VxFZvBdjqIw5gzEgcjShRy"
};

let DEVELOPER_CONFIG = {
    email: "lionking1111112211@gmail.com",
    passkey: "AHMED_DEVELOPER"
};

// تحميل البيانات محلياً أولاً لضمان الاستجابة الفورية وتجنب الخروج عند التحديث
let db = {
    users: JSON.parse(localStorage.getItem('nutri_cached_users')) || [],
    plans: JSON.parse(localStorage.getItem('nutri_plans')) || [],
    ratings: JSON.parse(localStorage.getItem('nutri_ratings')) || [5, 5, 5, 4]
};

let currentUser = null;
let isSignUpMode = false;
let selectedRating = 0;

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

document.addEventListener('DOMContentLoaded', async () => {
    // 1. التحقق الفوري من الجلسة المحلية لضمان عدم الخروج عند التحديث
    checkInstantAutoLogin();
    
    setupEventListeners();
    updateStatsUI();

    // 2. تحديث البيانات من السحاب في الخلفية بصمت
    await loadCloudDatabaseInBackground();
});

// التحقق الفوري للجلسة بدون انتظار الإنترنت
function checkInstantAutoLogin() {
    const savedUserJson = localStorage.getItem('nutri_logged_user');
    if (savedUserJson) {
        try {
            currentUser = JSON.parse(savedUserJson);
            launchMainApp();
        } catch (e) {
            console.log("خطأ في قراءة الجلسة المحلية");
        }
    }
}

// جلب البيانات من السحاب في الخلفية لتحديث القوائم والبيانات المشتركة
async function loadCloudDatabaseInBackground() {
    try {
        let response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}/latest`, {
            headers: {
                "X-Master-Key": JSONBIN_CONFIG.apiKey
            }
        });
        if (response.ok) {
            let data = await response.json();
            if (data && data.record) {
                db.users = data.record.users || db.users;
                db.plans = data.record.plans || db.plans;
                if (data.record.ratings) db.ratings = data.record.ratings;
                
                // تخزينها مؤقتاً للسرعة الفائقة
                localStorage.setItem('nutri_cached_users', JSON.stringify(db.users));
                localStorage.setItem('nutri_plans', JSON.stringify(db.plans));
                localStorage.setItem('nutri_ratings', JSON.stringify(db.ratings));
                
                // تحديث الواجهة إن كان المطور أو المستخدم في لوحة التحكم
                if (currentUser && currentUser.isDev) {
                    renderAdminUsersTable();
                }
                updateStatsUI();
            }
        }
    } catch (e) {
        console.log('العمل في وضع الاتصال المحلي حالياً');
    }
}

// حفظ وتحديث البيانات في السحاب محلياً وسحابياً
async function syncCloudDatabase() {
    localStorage.setItem('nutri_cached_users', JSON.stringify(db.users));
    localStorage.setItem('nutri_plans', JSON.stringify(db.plans));
    try {
        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_CONFIG.binId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "X-Master-Key": JSONBIN_CONFIG.apiKey
            },
            body: JSON.stringify({
                users: db.users,
                plans: db.plans,
                ratings: db.ratings
            })
        });
    } catch (e) {
        console.log('خطأ في مزامنة السحاب');
    }
}

function setupEventListeners() {
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

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inputVal = emailInput.value.trim();
        const passVal = passwordInput.value.trim();

        if (inputVal === DEVELOPER_CONFIG.email) {
            devModal.classList.remove('hidden');
            return;
        }

        if (isSignUpMode) {
            await handleSignUp(inputVal, usernameInput.value.trim(), passVal);
        } else {
            handleLogin(inputVal, passVal);
        }
    });

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

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.getAttribute('data-tab')).classList.add('active');
        });
    });

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

    document.getElementById('btn-submit-rating').addEventListener('click', async () => {
        if (selectedRating === 0) return alert('الرجاء اختيار النجوم أولاً');
        db.ratings.push(selectedRating);
        await syncCloudDatabase();
        updateStatsUI();
        alert('شكراً على تقييمك التطبيق!');
    });

    document.getElementById('btn-save-plan').addEventListener('click', createNewPlan);
    document.getElementById('btn-update-profile').addEventListener('click', updateProfile);
    document.getElementById('btn-change-pass').addEventListener('click', changePassword);
    document.getElementById('btn-logout').addEventListener('click', logout);
    document.getElementById('btn-delete-account').addEventListener('click', deleteAccount);

    document.getElementById('profile-img-input').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async function(evt) {
                document.getElementById('profile-img-preview').src = evt.target.result;
                if(currentUser) {
                    currentUser.avatar = evt.target.result;
                    await saveUserData();
                }
            };
            reader.readAsDataURL(file);
        }
    });
}

async function handleSignUp(email, username, password) {
    if (!username) return alert('الرجاء كتابة اسم المستخدم (Username)');
    
    // التأكد من جلب أحدث بيانات السحاب قبل التسجيل لمنع التكرار
    await loadCloudDatabaseInBackground();

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
    await syncCloudDatabase();
    alert('تم إنشاء الحساب بنجاح! احتفظ باليوزرنيم جيداً: ' + username);
    setCurrentUser(newUser);
}

function handleLogin(identifier, password) {
    const user = db.users.find(u => (u.email === identifier || u.username === identifier) && u.password === password);
    if (user) {
        setCurrentUser(user);
    } else {
        alert('خطأ في البيانات أو الحساب غير موجود تأكد من اتصالك بالإنترنت أو صحة البيانات');
    }
}

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
        syncCloudDatabase();
    }
    setCurrentUser(devUser);
}

function setCurrentUser(user) {
    currentUser = user;
    // حفظ الجلسة محلياً لضمان عدم الخروج عند التحديث
    localStorage.setItem('nutri_logged_user', JSON.stringify(user));
    launchMainApp();
}

function launchMainApp() {
    authScreen.classList.remove('active');
    authScreen.classList.add('hidden');
    mainApp.classList.remove('hidden');

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

function updateStatsUI() {
    document.getElementById('stat-users').innerText = db.users.length;
    document.getElementById('stat-plans').innerText = db.plans.length;
    if (db.ratings.length > 0) {
        const avg = (db.ratings.reduce((a, b) => a + b, 0) / db.ratings.length).toFixed(1);
        document.getElementById('stat-rating').innerText = avg + ' ★';
    }
}

function renderAdminUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if(!tbody) return;
    tbody.innerHTML = '';
    db.users.forEach(u => {
        if (u.isDev) return;
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

async function adminDeleteUser(userId) {
    if (confirm('هل أنت تأكد من حذف حساب هذا المستخدم؟')) {
        db.users = db.users.filter(u => u.id !== userId);
        await syncCloudDatabase();
        renderAdminUsersTable();
        updateStatsUI();
    }
}

async function createNewPlan() {
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
    await syncCloudDatabase();
    alert('تم إرسال الخطة بنجاح للعميل ' + targetUser);
    
    document.getElementById('plan-target-user').value = '';
    document.getElementById('plan-title').value = '';
    document.getElementById('plan-content').value = '';
    
    renderPlans();
    updateStatsUI();
}

function renderPlans() {
    const container = document.getElementById('plans-list');
    if(!container) return;
    container.innerHTML = '';

    let userPlans = [];
    if (currentUser.isDev) {
        userPlans = db.plans;
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

function loadProfileData() {
    document.getElementById('prof-fullname').value = currentUser.fullName || '';
    document.getElementById('prof-username').value = currentUser.username || '';
    if(currentUser.avatar) {
        document.getElementById('profile-img-preview').src = currentUser.avatar;
    }
}

async function updateProfile() {
    const newName = document.getElementById('prof-fullname').value.trim();
    const newUsername = document.getElementById('prof-username').value.trim();

    if (newUsername !== currentUser.username) {
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
    await saveUserData();
    alert('تم تحديث بيانات البروفايل بنجاح');
}

async function changePassword() {
    const oldP = document.getElementById('pass-old').value;
    const newP = document.getElementById('pass-new').value;

    if (oldP !== currentUser.password) return alert('كلمة المرور القديمة غير صحيحة!');
    if (!newP) return alert('يرجى كتابة كلمة المرور الجديدة');

    currentUser.password = newP;
    await saveUserData();
    alert('تم تغيير كلمة المرور بنجاح');
}

function logout() {
    localStorage.removeItem('nutri_logged_user');
    location.reload();
}

async function deleteAccount() {
    const passConfirm = prompt('لتأكيد حذف الحساب نهائياً، يرجى كتابة كلمة المرور الخاصة بك:');
    if (passConfirm === currentUser.password) {
        db.users = db.users.filter(u => u.id !== currentUser.id);
        await syncCloudDatabase();
        alert('تم حذف حسابك بنجاح.');
        logout();
    } else if(passConfirm !== null) {
        alert('كلمة المرور غير صحيحة، لم يتم حذف الحساب.');
    }
}

async function saveUserData() {
    const idx = db.users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) db.users[idx] = currentUser;
    // تحديث بيانات الجلسة الحالية
    localStorage.setItem('nutri_logged_user', JSON.stringify(currentUser));
    await syncCloudDatabase();
}
