// ============================================================
// login.js
// ============================================================

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

function closeAddrPopup() {
  var ab = document.getElementById('addrBackdrop');
  var dl = document.getElementById('daumPostcodeLayer');
  if (ab) ab.classList.add('is-hidden');
  if (dl) dl.innerHTML = '';
}

// ── 초기 실행 ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async function () {
  await userService.init();

  var backdrop           = document.getElementById('modalBackdrop');
  var loginModal         = document.getElementById('loginModal');
  var findModal          = document.getElementById('findModal');
  var findPwNewModal     = document.getElementById('findPwNewModal');
  var kakaoShippingModal = document.getElementById('kakaoShippingModal');

  function openModal(modal) {
    backdrop.classList.add('is-open');
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeAll() {
    [loginModal, findModal, findPwNewModal, kakaoShippingModal].forEach(function(m) {
      if (m) m.classList.remove('is-open');
    });
    backdrop.classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function switchTo(modal) {
    [loginModal, findModal, findPwNewModal, kakaoShippingModal].forEach(function(m) {
      if (m) m.classList.remove('is-open');
    });
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

  // ── 모달 닫기 ───────────────────────────────────────────
  backdrop.addEventListener('click', function () { closeAll(); history.back(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeAll(); history.back(); }
  });
  document.getElementById('loginClose').addEventListener('click', function () { closeAll(); history.back(); });
  document.getElementById('findClose').addEventListener('click', function () { closeAll(); history.back(); });
  document.getElementById('findPwNewClose').addEventListener('click', function () { closeAll(); history.back(); });

  // ── 로그인 ────────────────────────────────────────────
  var loginEmailInput    = document.getElementById('loginEmail');
  var loginPasswordInput = document.getElementById('loginPassword');
  var loginSubmitBtn     = document.getElementById('loginSubmitBtn');

  function checkLoginReady() {
    if (loginSubmitBtn && loginEmailInput && loginPasswordInput) {
      loginSubmitBtn.disabled = !(loginEmailInput.value.trim() && loginPasswordInput.value.trim());
    }
  }
  if (loginEmailInput)    loginEmailInput.addEventListener('input', checkLoginReady);
  if (loginPasswordInput) loginPasswordInput.addEventListener('input', checkLoginReady);

  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (loginSubmitBtn) loginSubmitBtn.disabled = true;
      var email    = loginEmailInput.value.trim();
      var password = loginPasswordInput.value.trim();
      var user     = await userService.login(email, password);
      if (!user) {
        setError('loginError', '이메일 또는 비밀번호가 올바르지 않습니다.');
        if (loginSubmitBtn) loginSubmitBtn.disabled = false;
        return;
      }
      closeAll();
      var returnUrl = sessionStorage.getItem('pip_return_url') || 'homepage.html';
      sessionStorage.removeItem('pip_return_url');
      window.location.href = returnUrl;
    });
  }

  document.getElementById('kakaoBtn').addEventListener('click', async function () {
    await userService.loginWithKakao();
  });

  document.getElementById('goFindBtn').addEventListener('click', function () {
    switchTo(findModal); resetFindModal();
  });

  // ── 카카오 첫 로그인 배송지 모달 ────────────────────────
  document.getElementById('kakaoShippingSkipBtn').addEventListener('click', async function () {
    var meta = userService._currentUser?.user_metadata || {};
    var kakaoName = meta.name || meta.full_name || 'kakao_user';
    await userService.saveKakaoProfile({ name: kakaoName, phone: '_skip_' });
    closeAll();
    var returnUrl = sessionStorage.getItem('pip_return_url') || 'homepage.html';
    sessionStorage.removeItem('pip_return_url');
    window.location.href = returnUrl;
  });

  document.getElementById('kakaoShippingForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var name     = document.getElementById('kakaoName').value.trim();
    var phone    = document.getElementById('kakaoPhone').value.trim();
    var postcode = document.getElementById('kakaoPostcode').value.trim();
    var addr1    = document.getElementById('kakaoAddr1').value.trim();
    var addr2    = document.getElementById('kakaoAddr2').value.trim();

    if (!name)  { setError('kakaoShippingError', '이름을 입력해주세요.'); return; }
    var phoneError = validatePhone(phone);
    if (phoneError) { setError('kakaoShippingError', phoneError); return; }
    if (!addr1) { setError('kakaoShippingError', '주소를 입력해주세요.'); return; }

    var btn = this.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '저장 중...';

    var result = await userService.saveKakaoProfile({
      name:     name,
      phone:    normalizePhone(phone),
      address:  [addr1, addr2].filter(Boolean).join(' '),
      postcode: postcode,
    });

    btn.disabled = false; btn.textContent = '저장하기';

    if (!result.success) {
      setError('kakaoShippingError', '저장에 실패했습니다. 다시 시도해주세요.');
      return;
    }

    closeAll();
    var returnUrl = sessionStorage.getItem('pip_return_url') || 'homepage.html';
    sessionStorage.removeItem('pip_return_url');
    window.location.href = returnUrl;
  });

  document.getElementById('kakaoPostcodeBtn').addEventListener('click', function () {
    function openKakaoAddrPopup() {
      document.getElementById('addrBackdrop').classList.remove('is-hidden');
      new daum.Postcode({
        oncomplete: function (data) {
          var addr = data.roadAddress || data.jibunAddress;
          document.getElementById('kakaoPostcode').value = data.zonecode;
          document.getElementById('kakaoAddr1').value    = addr;
          document.getElementById('kakaoAddr2').focus();
          closeAddrPopup();
        },
        onclose: closeAddrPopup,
        width: '100%', height: '460px',
      }).embed(document.getElementById('daumPostcodeLayer'), { autoClose: false });
    }
    if (typeof daum === 'undefined' || typeof daum.Postcode === 'undefined') {
      var script = document.createElement('script');
      script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
      script.onload = openKakaoAddrPopup;
      document.head.appendChild(script);
    } else { openKakaoAddrPopup(); }
  });

  // ── 비밀번호 찾기 ──────────────────────────────────────
  function resetFindModal() {
    ['findPwPhone','findPwPhoneOtp'].forEach(function(id) {
      var el = document.getElementById(id); if (el) el.value = '';
    });
    var fpw = document.getElementById('findPwPhoneOtpWrap');
    if (fpw) fpw.style.display = 'none';
    var vbtn = document.getElementById('verifyFindPwPhoneBtn');
    if (vbtn) vbtn.disabled = true;
    var sendBtn = document.getElementById('sendFindPwPhoneOtpBtn');
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '인증번호 발송'; }
    clearErrors();
  }

  var sendFindPwPhoneOtpBtn = document.getElementById('sendFindPwPhoneOtpBtn');
  var verifyFindPwPhoneBtn  = document.getElementById('verifyFindPwPhoneBtn');
  var findPwPhoneOtpWrap    = document.getElementById('findPwPhoneOtpWrap');

  sendFindPwPhoneOtpBtn.addEventListener('click', async function () {
    var phone = document.getElementById('findPwPhone').value.trim();
    var phoneError = validatePhone(phone);
    if (phoneError) { setError('findPwPhoneErr', phoneError); return; }

    var normalizedPhone = normalizePhone(phone);
    var rawDigits = phone.replace(/\D/g, '');

    var email = await userService.findByPhone(normalizedPhone);
    if (!email) email = await userService.findByPhone(rawDigits);

    if (!email) {
      setError('findPwPhoneErr', '해당 휴대폰 번호로 가입된 계정이 없습니다.');
      return;
    }

    setError('findPwPhoneErr', '');
    this.disabled = true; this.textContent = '발송 중...';

    try {
      var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
        body: JSON.stringify({ action: 'send', phone: rawDigits }),
      });
      var data = await res.json();
      if (!data.success) {
        this.disabled = false; this.textContent = '인증번호 발송';
        setError('findPwPhoneErr', data.message || 'SMS 발송에 실패했습니다.');
        return;
      }
    } catch (err) {
      this.disabled = false; this.textContent = '인증번호 발송';
      setError('findPwPhoneErr', '네트워크 오류가 발생했습니다.');
      return;
    }

    this.disabled = false; this.textContent = '재발송';
    findPwPhoneOtpWrap.style.display = 'flex';
    verifyFindPwPhoneBtn.disabled = false;
    document.getElementById('findPwPhoneOtp').value = '';
    document.getElementById('findPwPhoneOtp').focus();
    startOtpTimer('findPwPhoneOtpTimer', 180);
    setError('findPwPhoneErr', '인증번호가 발송되었습니다.');
    verifyFindPwPhoneBtn.dataset.email = email;
    verifyFindPwPhoneBtn.dataset.phone = rawDigits;
  });

  document.getElementById('findPwPhoneForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var otp   = document.getElementById('findPwPhoneOtp').value.trim();
    var btn   = document.getElementById('verifyFindPwPhoneBtn');
    var email = btn.dataset.email || '';
    var phone = btn.dataset.phone || document.getElementById('findPwPhone').value.replace(/\D/g, '');

    if (!otp)   { setError('findPwPhoneErr', '인증번호를 입력해주세요.'); return; }
    if (!email) { setError('findPwPhoneErr', '먼저 인증번호를 발송해주세요.'); return; }

    btn.disabled = true; btn.textContent = '확인 중...';

    try {
      var res = await fetch('https://kracfwphcfoxsapwauyh.supabase.co/functions/v1/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtyYWNmd3BoY2ZveHNhcHdhdXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NDI1MzYsImV4cCI6MjA4OTExODUzNn0.RDDU30twemaRzGbhfdEs20BsfRf3jiqv3irRwpE-bi8' },
        body: JSON.stringify({ action: 'verify', phone: phone, code: otp }),
      });
      var data = await res.json();
      if (!data.success) {
        btn.disabled = false; btn.textContent = '인증 확인';
        setError('findPwPhoneErr', data.message || '인증번호가 올바르지 않습니다.');
        return;
      }
    } catch (err) {
      btn.disabled = false; btn.textContent = '인증 확인';
      setError('findPwPhoneErr', '네트워크 오류가 발생했습니다.');
      return;
    }

    btn.disabled = false; btn.textContent = '인증 확인';
    setError('findPwPhoneErr', '');

    btn.disabled = true; btn.textContent = '이메일 발송 중...';
    var resetResult = await userService.sendPasswordResetEmail(email);
    btn.disabled = false; btn.textContent = '인증 확인';

    if (!resetResult.success) {
      setError('findPwPhoneErr', '이메일 발송에 실패했습니다: ' + (resetResult.message || ''));
      return;
    }

    findModal.classList.remove('is-open');
    findPwNewModal.classList.add('is-open');
  });

  document.getElementById('goLoginAfterPwBtn').addEventListener('click', function () {
    switchTo(loginModal);
    resetFindModal();
  });

  document.getElementById('backToLoginFromFindBtn').addEventListener('click', function () {
    switchTo(loginModal);
  });

  var addrPopupCloseBtn = document.getElementById('addrPopupClose');
  if (addrPopupCloseBtn) addrPopupCloseBtn.addEventListener('click', closeAddrPopup);
  var addrBackdropEl = document.getElementById('addrBackdrop');
  if (addrBackdropEl) addrBackdropEl.addEventListener('click', function (e) {
    if (e.target === this) closeAddrPopup();
  });

  // ── 카카오 OAuth 콜백 or 일반 진입 ────────────────────
  var params = new URLSearchParams(window.location.search);

  if (params.get('kakao') === '1' && userService.isLoggedIn()) {
    var isNew = await userService.isKakaoNewUser();
    if (isNew) {
      var meta = userService._currentUser?.user_metadata || {};
      var kakaoName = meta.name || meta.full_name || '';
      var nameEl = document.getElementById('kakaoName');
      if (nameEl && kakaoName) nameEl.value = kakaoName;
      openModal(kakaoShippingModal);
    } else {
      var returnUrl = sessionStorage.getItem('pip_return_url') || 'homepage.html';
      sessionStorage.removeItem('pip_return_url');
      window.location.href = returnUrl;
    }
    return;
  }

  if (userService.isLoggedIn()) {
    window.location.href = 'homepage.html';
    return;
  }

  // ?admin=1 이면 이메일 로그인 섹션 표시
  if (params.get('admin') === '1') {
    var adminSection = document.getElementById('adminLoginSection');
    if (adminSection) adminSection.style.display = 'block';
    var findBtnWrap = document.getElementById('findBtnWrap');
    if (findBtnWrap) findBtnWrap.style.display = 'flex';
  }

  if (loginSubmitBtn) loginSubmitBtn.disabled = true;
  openModal(loginModal);
});
