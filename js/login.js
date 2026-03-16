// ============================================================
// login.js
// 회원가입: 약관 → 휴대폰인증 → 계정설정 → 배송지 → 완료 (5단계)
// 비밀번호찾기: 휴대폰인증 → 새비밀번호 → 완료 (3단계)
// ============================================================

const backdrop        = document.getElementById('modalBackdrop');
const loginModal      = document.getElementById('loginModal');
const regModal        = document.getElementById('registerModal');
const findModal       = document.getElementById('findModal');
const findPwNewModal  = document.getElementById('findPwNewModal');

function openModal(modal) {
  backdrop.classList.add('is-open');
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}
function closeAll() {
  [loginModal, regModal, findModal, findPwNewModal].forEach(function(m) { if(m) m.classList.remove('is-open'); });
  backdrop.classList.remove('is-open');
  document.body.style.overflow = '';
}
function switchTo(modal) {
  [loginModal, regModal, findModal, findPwNewModal].forEach(function(m) { if(m) m.classList.remove('is-open'); });
  modal.classList.add('is-open');
  clearErrors();
}
function clearErrors() {
  document.querySelectorAll('.modal-error').forEach(function(el) { el.textContent = ''; });
}
function setError(id, msg) {
  var el = document.getElementById(id);
  if (el) el.textContent = msg;
}

function validatePassword(pw) {
  if (pw.length < 10)    return '비밀번호는 10자 이상이어야 합니다.';
  if (!/[A-Z]/.test(pw)) return '영문 대문자를 1자 이상 포함해야 합니다.';
  if (!/[a-z]/.test(pw)) return '영문 소문자를 1자 이상 포함해야 합니다.';
  if (!/[0-9]/.test(pw)) return '숫자를 1자 이상 포함해야 합니다.';
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pw))
                         return '특수문자를 1자 이상 포함해야 합니다.';
  return null;
}

function normalizePhone(phone) {
  var digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('010')) {
    return digits.slice(0,3) + '-' + digits.slice(3,7) + '-' + digits.slice(7);
  }
  return phone;
}

function validatePhone(phone) {
  if (!phone) return '휴대폰 번호를 입력해주세요.';
  var normalized = normalizePhone(phone);
  if (!/^010-\d{4}-\d{4}$/.test(normalized)) {
    return '휴대폰 번호 형식이 올바르지 않습니다. (예: 01012345678)';
  }
  return null;
}

// OTP 타이머
function startOtpTimer(timerId, seconds) {
  var el = document.getElementById(timerId);
  if (!el) return;
  var remaining = seconds;
  if (el._timer) clearInterval(el._timer);
  el.style.color = '#e85c5c';
  function update() {
    var m = String(Math.floor(remaining / 60)).padStart(2, '0');
    var s = String(remaining % 60).padStart(2, '0');
    el.textContent = m + ':' + s;
    if (remaining <= 0) { clearInterval(el._timer); el.textContent = '만료됨'; }
    remaining--;
  }
  update();
  el._timer = setInterval(update, 1000);
}

// 모달 닫기
backdrop.addEventListener('click', function () { closeAll(); history.back(); });
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') { closeAll(); history.back(); }
});
document.getElementById('loginClose').addEventListener('click',       function () { closeAll(); history.back(); });
document.getElementById('registerClose').addEventListener('click',    function () { closeAll(); history.back(); });
document.getElementById('findClose').addEventListener('click',        function () { closeAll(); history.back(); });
document.getElementById('findPwNewClose').addEventListener('click',   function () { closeAll(); history.back(); });

// ── 로그인 ──────────────────────────────────────────────────
var loginEmailInput    = document.getElementById('loginEmail');
var loginPasswordInput = document.getElementById('loginPassword');
var loginSubmitBtn     = document.getElementById('loginSubmitBtn');

function checkLoginReady() {
  loginSubmitBtn.disabled = !(loginEmailInput.value.trim() && loginPasswordInput.value.trim());
}
loginEmailInput.addEventListener('input', checkLoginReady);
loginPasswordInput.addEventListener('input', checkLoginReady);

document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  loginSubmitBtn.disabled = true;
  var email    = loginEmailInput.value.trim();
  var password = loginPasswordInput.value.trim();
  var user     = await userService.login(email, password);
  if (!user) {
    setError('loginError', '이메일 또는 비밀번호가 올바르지 않습니다.');
    loginSubmitBtn.disabled = false;
    return;
  }
  closeAll();
  var returnUrl = sessionStorage.getItem('pip_return_url') || 'homepage.html';
  sessionStorage.removeItem('pip_return_url');
  window.location.href = returnUrl;
});

document.getElementById('kakaoBtn').addEventListener('click', async function () {
  await userService.loginWithKakao();
});
document.getElementById('goRegisterBtn').addEventListener('click', function () {
  switchTo(regModal); showRegStep(0); resetTerms();
});
document.getElementById('goFindBtn').addEventListener('click', function () {
  switchTo(findModal); resetFindModal();
});

// ── 이용약관 ────────────────────────────────────────────────
function resetTerms() {
  ['termsAll','terms1','terms2','terms3'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.checked = false;
  });
  document.querySelectorAll('.terms-content').forEach(function(el) { el.classList.add('is-hidden'); });
  document.querySelectorAll('.terms-view-btn').forEach(function(btn) { btn.textContent = '보기'; });
  updateTermsAgreeBtn();
}
function updateTermsAgreeBtn() {
  var required   = document.querySelectorAll('.terms-checkbox[data-required="true"]');
  var allChecked = Array.from(required).every(function(el) { return el.checked; });
  var btn = document.getElementById('termsAgreeBtn');
  if (btn) btn.disabled = !allChecked;
}
function syncTermsAll() {
  var all        = document.querySelectorAll('.terms-checkbox[data-required]');
  var allChecked = Array.from(all).every(function(el) { return el.checked; });
  var termsAllEl = document.getElementById('termsAll');
  if (termsAllEl) termsAllEl.checked = allChecked;
}
document.getElementById('termsAll').addEventListener('change', function () {
  var self = this;
  document.querySelectorAll('.terms-checkbox[data-required]').forEach(function(el) { el.checked = self.checked; });
  updateTermsAgreeBtn();
});
document.querySelectorAll('.terms-checkbox[data-required]').forEach(function(checkbox) {
  checkbox.addEventListener('change', function () { syncTermsAll(); updateTermsAgreeBtn(); });
});
document.querySelectorAll('.terms-view-btn').forEach(function(btn) {
  btn.addEventListener('click', function () {
    var panel = document.getElementById(btn.dataset.terms + 'Content');
    if (!panel) return;
    var isHidden = panel.classList.contains('is-hidden');
    panel.classList.toggle('is-hidden', !isHidden);
    btn.textContent = isHidden ? '닫기' : '보기';
  });
});
document.getElementById('termsAgreeBtn').addEventListener('click', function () {
  var required   = document.querySelectorAll('.terms-checkbox[data-required="true"]');
  var allChecked = Array.from(required).every(function(el) { return el.checked; });
  if (!allChecked) { setError('reg0Error', '필수 약관에 모두 동의해주세요.'); return; }
  setError('reg0Error', '');
  showRegStep(1);
});

// ── 회원가입 (5단계: 0~4) ───────────────────────────────────
var regDraft = {};
var regPhoneVerified = false;

// showRegStep: 0~4
function showRegStep(step) {
  [0,1,2,3,4].forEach(function(n) {
    var panel  = document.getElementById('regStep' + n);
    var stepEl = document.querySelector('.modal-step[data-step="' + n + '"]');
    if (panel)  panel.classList.toggle('is-hidden', n !== step);
    if (stepEl) {
      stepEl.classList.toggle('is-active', n === step);
      stepEl.classList.toggle('is-done', n < step);
    }
  });
}

// step1: 휴대폰 인증
var sendPhoneOtpBtn = document.getElementById('sendPhoneOtpBtn');
var verifyPhoneBtn  = document.getElementById('verifyPhoneBtn');
var phoneOtpWrap    = document.getElementById('phoneOtpWrap');

sendPhoneOtpBtn.addEventListener('click', async function () {
  var name  = document.getElementById('regName').value.trim();
  var phone = document.getElementById('regPhone').value.trim();
  if (!name) { setError('reg1Error', '이름을 입력해주세요.'); return; }
  var phoneError = validatePhone(phone);
  if (phoneError) { setError('reg1Error', phoneError); return; }

  setError('reg1Error', '');
  this.disabled = true; this.textContent = '발송 중...';

  try {
    var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
      body: JSON.stringify({ action: 'send', phone: phone.replace(/\D/g, '') }),
    });
    var data = await res.json();
    if (!data.success) {
      this.disabled = false; this.textContent = '인증번호 발송';
      setError('reg1Error', data.message || 'SMS 발송에 실패했습니다.');
      return;
    }
  } catch (err) {
    this.disabled = false; this.textContent = '인증번호 발송';
    setError('reg1Error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    return;
  }

  this.disabled = false; this.textContent = '재발송';
  phoneOtpWrap.style.display = 'flex';
  verifyPhoneBtn.disabled = false;
  document.getElementById('regPhoneOtp').value = '';
  document.getElementById('regPhoneOtp').focus();
  startOtpTimer('regPhoneOtpTimer', 180);
  setError('reg1Error', '휴대폰으로 인증번호가 발송되었습니다.');
});

document.getElementById('regPhoneForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var otp   = document.getElementById('regPhoneOtp').value.trim();
  var phone = document.getElementById('regPhone').value.trim();
  var btn   = document.getElementById('verifyPhoneBtn');

  if (!otp) { setError('reg1Error', '인증번호를 입력해주세요.'); return; }

  btn.disabled = true; btn.textContent = '확인 중...';

  try {
    var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
      body: JSON.stringify({ action: 'verify', phone: phone.replace(/\D/g, ''), code: otp }),
    });
    var data = await res.json();

    if (!data.success) {
      btn.disabled = false; btn.textContent = '인증 확인';
      setError('reg1Error', data.message || '인증번호가 올바르지 않습니다.');
      return;
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = '인증 확인';
    setError('reg1Error', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    return;
  }

  btn.disabled = false; btn.textContent = '인증 확인';
  regDraft.name  = document.getElementById('regName').value.trim();
  regDraft.phone = normalizePhone(phone);
  regPhoneVerified = true;
  setError('reg1Error', '');
  showRegStep(2);
});

document.getElementById('backToTermsBtn').addEventListener('click', function () { showRegStep(0); });
document.getElementById('backToStep1Btn').addEventListener('click', function () { showRegStep(1); });

// step2: 계정 설정
document.getElementById('regForm1').addEventListener('submit', function (e) {
  e.preventDefault();
  var email    = document.getElementById('regEmail').value.trim();
  var password = document.getElementById('regPassword').value.trim();
  var confirm  = document.getElementById('regPasswordConfirm').value.trim();

  if (!email) { setError('reg2Error', '이메일을 입력해주세요.'); return; }
  var pwError = validatePassword(password);
  if (pwError) { setError('reg2Error', pwError); return; }
  if (password !== confirm) { setError('reg2Error', '비밀번호가 일치하지 않습니다.'); return; }

  regDraft.email    = email;
  regDraft.password = password;
  setError('reg2Error', '');
  showRegStep(3);
});

document.getElementById('backToStep2Btn').addEventListener('click', function () { showRegStep(2); });

// step3: 배송지 + 가입 완료
document.getElementById('regForm2').addEventListener('submit', async function (e) {
  e.preventDefault();
  var postcode = document.getElementById('regPostcode').value.trim();
  var addr1    = document.getElementById('regAddr1').value.trim();
  var addr2    = document.getElementById('regAddr2').value.trim();
  regDraft.address  = [addr1, addr2].filter(Boolean).join(' ');
  regDraft.postcode = postcode;

  var btn = this.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.textContent = '처리 중...'; }

  var result = await userService.sendRegisterOtp(regDraft);

  if (btn) { btn.disabled = false; btn.textContent = '가입 완료'; }

  if (!result.success) { setError('reg3Error', result.message); return; }

  // OTP 발송 성공 시 바로 완료 화면으로 (이메일 OTP 입력 불필요)
  // Supabase가 이메일 인증 없이 가입을 허용하는 경우:
  // - Supabase 대시보드 > Auth > Settings > "Enable email confirmations" 비활성화 필요
  setError('reg3Error', '');
  showRegStep(4);
});

// 배송지 건너뛰기
document.getElementById('skipAddrBtn').addEventListener('click', async function () {
  regDraft.address  = '';
  regDraft.postcode = '';
  this.disabled = true; this.textContent = '처리 중...';
  var result = await userService.sendRegisterOtp(regDraft);
  this.disabled = false; this.textContent = '배송지 나중에 입력';
  if (!result.success) { setError('reg3Error', result.message); return; }
  setError('reg3Error', '');
  showRegStep(4);
});

// step4: 완료
document.getElementById('goLoginAfterRegBtn').addEventListener('click', function () {
  switchTo(loginModal);
  showRegStep(0);
  resetTerms();
  regDraft = {};
  regPhoneVerified = false;
});

document.getElementById('backToLoginBtn').addEventListener('click', function () {
  switchTo(loginModal);
});

// ── 아이디/비밀번호 찾기 ────────────────────────────────────

// 휴대폰 인증 완료 여부 플래그 (이게 true여야만 비밀번호 변경 가능)
var findPwPhoneVerified = false;

function resetFindModal() {
  document.querySelectorAll('.modal-tab').forEach(function(t) { t.classList.remove('is-active'); });
  var firstTab = document.querySelector('.modal-tab[data-tab="findId"]');
  if (firstTab) firstTab.classList.add('is-active');
  document.querySelectorAll('.modal-tab-panel').forEach(function(p) { p.classList.add('is-hidden'); });
  var idPanel = document.getElementById('findIdPanel');
  if (idPanel) idPanel.classList.remove('is-hidden');

  // 비밀번호 찾기 초기 상태로
  var fpwStep1 = document.getElementById('findPwStep1');
  if (fpwStep1) fpwStep1.style.display = 'block';

  // 입력값 전부 초기화
  ['findPwPhone','findPwPhoneOtp','findPwNew','findPwNewConfirm','findIdName','findIdPhone'].forEach(function(id) {
    var el = document.getElementById(id); if (el) el.value = '';
  });
  // 인증번호 입력창 숨기기
  var fpw = document.getElementById('findPwPhoneOtpWrap');
  if (fpw) fpw.style.display = 'none';
  // 인증 확인 버튼 비활성화
  var vbtn = document.getElementById('verifyFindPwPhoneBtn');
  if (vbtn) vbtn.disabled = true;
  // 발송 버튼 텍스트 초기화
  var sendBtn = document.getElementById('sendFindPwPhoneOtpBtn');
  if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '인증번호 발송'; }
  // 완료 화면 숨기기
  var completeEl = document.getElementById('findPwComplete');
  if (completeEl) completeEl.style.display = 'none';
  // 아이디 찾기 결과 숨기기
  var resultEl = document.getElementById('findIdResult');
  if (resultEl) resultEl.classList.add('is-hidden');
  // 인증 플래그 초기화
  findPwPhoneVerified = false;
}

// step 표시 제어 (1단계만 — 2단계는 별도 모달)
function showFindPwStep(step) {
  if (step === 2) {
    // 2단계: 새 비밀번호 모달로 전환
    findModal.classList.remove('is-open');
    findPwNewModal.classList.add('is-open');
    // 새 비밀번호 입력창 초기화
    var step2El = document.getElementById('findPwStep2');
    var completeEl = document.getElementById('findPwComplete');
    if (step2El)    step2El.style.display = 'block';
    if (completeEl) completeEl.style.display = 'none';
    setError('findPwNewErr', '');
    var newPwEl = document.getElementById('findPwNew');
    var confirmEl = document.getElementById('findPwNewConfirm');
    if (newPwEl)   newPwEl.value = '';
    if (confirmEl) confirmEl.value = '';
    return;
  }
  // step1 표시 (findModal 내)
  var el = document.getElementById('findPwStep1');
  if (el) el.style.display = 'block';
  var completeEl = document.getElementById('findPwComplete');
  if (completeEl) completeEl.style.display = 'none';
}

// 완료 화면만 표시
function showFindPwComplete() {
  var step2El = document.getElementById('findPwStep2');
  var completeEl = document.getElementById('findPwComplete');
  if (step2El)    step2El.style.display = 'none';
  if (completeEl) completeEl.style.display = 'block';
}

// 탭 전환
document.querySelectorAll('.modal-tab').forEach(function(tab) {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.modal-tab').forEach(function(t) { t.classList.remove('is-active'); });
    this.classList.add('is-active');
    document.querySelectorAll('.modal-tab-panel').forEach(function(p) { p.classList.add('is-hidden'); });
    var target = document.getElementById(this.dataset.tab + 'Panel');
    if (target) target.classList.remove('is-hidden');
  });
});

// 아이디 찾기
document.getElementById('findIdForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var name  = document.getElementById('findIdName').value.trim();
  var phone = document.getElementById('findIdPhone').value.trim();
  var btn   = this.querySelector('button[type="submit"]');
  var resultEl = document.getElementById('findIdResult');

  if (!name || !phone) { setError('findIdError', '이름과 휴대폰 번호를 모두 입력해주세요.'); return; }

  btn.disabled = true; btn.textContent = '조회 중...';
  try {
    var users = await userService.findByNameAndPhone(name, normalizePhone(phone));
    resultEl.classList.remove('is-hidden');
    if (users && users.length > 0) {
      var found = users[0];
      var parts = found.email.split('@');
      var local = parts[0]; var domain = parts[1];
      var masked = local.slice(0, 2) + '*'.repeat(Math.max(local.length - 2, 3)) + '@' + domain;
      resultEl.innerHTML = '가입된 이메일: <strong>' + masked + '</strong>';
    } else {
      resultEl.innerHTML = '일치하는 회원 정보를 찾을 수 없습니다.';
    }
  } catch (err) {
    resultEl.classList.remove('is-hidden');
    resultEl.innerHTML = '조회 중 오류가 발생했습니다.';
  }
  btn.disabled = false; btn.textContent = '아이디 찾기';
});

// ── 비밀번호 찾기 step1: 휴대폰 인증 ──────────────────────────
var sendFindPwPhoneOtpBtn = document.getElementById('sendFindPwPhoneOtpBtn');
var verifyFindPwPhoneBtn  = document.getElementById('verifyFindPwPhoneBtn');
var findPwPhoneOtpWrap    = document.getElementById('findPwPhoneOtpWrap');

sendFindPwPhoneOtpBtn.addEventListener('click', async function () {
  var phone = document.getElementById('findPwPhone').value.trim();
  var phoneError = validatePhone(phone);
  if (phoneError) { setError('findPwPhoneErr', phoneError); return; }

  setError('findPwPhoneErr', '');
  this.disabled = true; this.textContent = '발송 중...';

  try {
    var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
      body: JSON.stringify({ action: 'send', phone: phone.replace(/\D/g, '') }),
    });
    var data = await res.json();
    if (!data.success) {
      this.disabled = false; this.textContent = '인증번호 발송';
      setError('findPwPhoneErr', data.message || 'SMS 발송에 실패했습니다.');
      return;
    }
  } catch (err) {
    this.disabled = false; this.textContent = '인증번호 발송';
    setError('findPwPhoneErr', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    return;
  }

  this.disabled = false; this.textContent = '재발송';
  findPwPhoneOtpWrap.style.display = 'flex';
  verifyFindPwPhoneBtn.disabled = false;
  document.getElementById('findPwPhoneOtp').value = '';
  document.getElementById('findPwPhoneOtp').focus();
  startOtpTimer('findPwPhoneOtpTimer', 180);
  setError('findPwPhoneErr', '휴대폰으로 인증번호가 발송되었습니다.');
});

document.getElementById('findPwPhoneForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  var otp   = document.getElementById('findPwPhoneOtp').value.trim();
  var phone = document.getElementById('findPwPhone').value.trim();
  var btn   = document.getElementById('verifyFindPwPhoneBtn');

  if (!otp) { setError('findPwPhoneErr', '인증번호를 입력해주세요.'); return; }

  btn.disabled = true; btn.textContent = '확인 중...';

  try {
    var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
      body: JSON.stringify({ action: 'verify', phone: phone.replace(/\D/g, ''), code: otp }),
    });
    var data = await res.json();

    if (!data.success) {
      btn.disabled = false; btn.textContent = '인증 확인';
      setError('findPwPhoneErr', data.message || '인증번호가 올바르지 않습니다.');
      return;
    }
  } catch (err) {
    btn.disabled = false; btn.textContent = '인증 확인';
    setError('findPwPhoneErr', '네트워크 오류가 발생했습니다. 다시 시도해주세요.');
    return;
  }

  btn.disabled = false; btn.textContent = '인증 확인';
  setError('findPwPhoneErr', '');

  // ── 휴대폰 번호로 이메일 조회 후 재설정 링크 발송 ──
  var normalizedPhone = normalizePhone(phone);
  var email = await userService.findByPhone(normalizedPhone);

  if (!email) {
    setError('findPwPhoneErr', '해당 휴대폰 번호로 가입된 계정을 찾을 수 없습니다.');
    return;
  }

  var resetResult = await userService.sendPasswordResetEmail(email);
  if (!resetResult.success) {
    setError('findPwPhoneErr', '이메일 발송에 실패했습니다: ' + resetResult.message);
    return;
  }

  // 성공 → 이메일 발송 완료 모달로 전환
  findModal.classList.remove('is-open');
  findPwNewModal.classList.add('is-open');
});

// 완료 후 로그인으로
document.getElementById('goLoginAfterPwBtn').addEventListener('click', function () {
  switchTo(loginModal);
  resetFindModal();
});

document.getElementById('backToLoginFromFindBtn').addEventListener('click', function () {
  switchTo(loginModal);
});

// ── 주소 검색 ────────────────────────────────────────────────
function openAddrPopup() {
  document.getElementById('addrBackdrop').classList.remove('is-hidden');
  new daum.Postcode({
    oncomplete: function (data) {
      var addr = data.roadAddress || data.jibunAddress;
      document.getElementById('regPostcode').value = data.zonecode;
      document.getElementById('regAddr1').value    = addr;
      document.getElementById('regAddr2').focus();
      closeAddrPopup();
    },
    onclose: closeAddrPopup,
    width: '100%', height: '460px',
  }).embed(document.getElementById('daumPostcodeLayer'), { autoClose: false });
}
function closeAddrPopup() {
  document.getElementById('addrBackdrop').classList.add('is-hidden');
  document.getElementById('daumPostcodeLayer').innerHTML = '';
}
document.getElementById('postcodeBtn').addEventListener('click', function () {
  if (typeof daum === 'undefined' || typeof daum.Postcode === 'undefined') {
    var script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.onload = openAddrPopup;
    document.head.appendChild(script);
  } else { openAddrPopup(); }
});
document.getElementById('addrPopupClose').addEventListener('click', closeAddrPopup);
document.getElementById('addrBackdrop').addEventListener('click', function (e) {
  if (e.target === this) closeAddrPopup();
});

// ── 초기 실행 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  if (userService.isLoggedIn()) {
    window.location.href = 'homepage.html';
    return;
  }
  loginSubmitBtn.disabled = true;
  openModal(loginModal);
});
