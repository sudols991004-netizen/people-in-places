// ============================================================
// userService.js — Supabase Auth + public.users 연동
// OTP 이메일 인증 방식 적용
// ============================================================

const userService = {

  _currentUser: null,
  _currentProfile: null,

  async init() {
  try {
    const { data: { session } } = await _supabase.auth.getSession();
    if (session?.user) {
      this._currentUser = session.user;
      await this._loadProfile(session.user.id);
    }
  } catch (e) {
    // lock 에러 발생 시 잠시 후 재시도
    await new Promise(r => setTimeout(r, 300));
    try {
      const { data: { session } } = await _supabase.auth.getSession();
      if (session?.user) {
        this._currentUser = session.user;
        await this._loadProfile(session.user.id);
      }
    } catch (e2) {
      console.warn('세션 초기화 실패:', e2);
    }
  }

  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      this._currentUser = session.user;
      await this._loadProfile(session.user.id);
    } else {
      this._currentUser    = null;
      this._currentProfile = null;
    }
  });
},

  async _loadProfile(userId) {
    const { data } = await _supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    this._currentProfile = data || null;
  },

  getCurrent() { return this._currentProfile || null; },
  isLoggedIn()  { return !!this._currentUser; },
  isAdmin()     { return this._currentProfile?.role === 'admin'; },

  // ── 로그인 ───────────────────────────────────────────────
  async login(email, password) {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) return null;
    this._currentUser = data.user;
    await this._loadProfile(data.user.id);
    return this._currentProfile;
  },

  // ── 로그아웃 ─────────────────────────────────────────────
  async logout() {
    await _supabase.auth.signOut();
    this._currentUser    = null;
    this._currentProfile = null;
  },

  // ── 회원가입 1단계: OTP 발송 ─────────────────────────────
  // Supabase signUp → 이메일로 6자리 OTP 발송
  async sendRegisterOtp(userData) {
    const { data, error } = await _supabase.auth.signUp({
      email:    userData.email,
      password: userData.password,
      options: {
        data: {
          name:     userData.name     || '',
          phone:    userData.phone    || '',
          address:  userData.address  || '',
          postcode: userData.postcode || '',
        }
      }
    });

    if (error) {
      if (error.message.includes('already registered')) {
        return { success: false, message: '이미 사용 중인 이메일입니다.' };
      }
      return { success: false, message: error.message };
    }

    return { success: true, user: data.user };
  },

  // ── 회원가입 2단계: OTP 검증 + users 테이블 삽입 ─────────
  async verifyRegisterOtp(email, token, userData) {
    const { data, error } = await _supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      if (error.message.includes('expired') || error.message.includes('invalid')) {
        return { success: false, message: '인증번호가 올바르지 않거나 만료되었습니다.' };
      }
      return { success: false, message: error.message };
    }

    // OTP 인증 성공 → public.users에 upsert
    if (data.user) {
      this._currentUser = data.user;
      const { error: upsertError } = await _supabase
        .from('users')
        .upsert({
          id:       data.user.id,
          email:    email,
          name:     userData.name     || '',
          phone:    userData.phone    || '',
          address:  userData.address  || '',
          postcode: userData.postcode || '',
          role:     'user',
        }, { onConflict: 'id' });

      if (upsertError) {
        console.warn('users 테이블 삽입 경고:', upsertError.message);
      }

      await this._loadProfile(data.user.id);
    }

    return { success: true, user: data.user };
  },

  // ── 비밀번호 찾기 1단계: OTP 발송 ───────────────────────
  async sendPasswordResetOtp(email) {
    const { error } = await _supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false }
    });
    if (error) {
      if (error.message.includes('not found') || error.message.includes('No user')) {
        return { success: false, message: '등록된 이메일이 아닙니다.' };
      }
      return { success: false, message: error.message };
    }
    return { success: true };
  },

  // ── 비밀번호 찾기 2단계: OTP 검증 ───────────────────────
  async verifyPasswordResetOtp(email, token) {
    const { data, error } = await _supabase.auth.verifyOtp({
      email,
      token,
      type: 'magiclink',
    });
    if (error) {
      // email 타입도 시도
      const { data: data2, error: error2 } = await _supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error2) {
        return { success: false, message: '인증번호가 올바르지 않거나 만료되었습니다.' };
      }
      if (data2.user) this._currentUser = data2.user;
      return { success: true };
    }
    if (data.user) this._currentUser = data.user;
    return { success: true };
  },

  // ── 비밀번호 변경 ─────────────────────────────────────────
  async updatePassword(newPassword) {
    const { error } = await _supabase.auth.updateUser({ password: newPassword });
    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  // ── 카카오 OAuth ─────────────────────────────────────────
  async loginWithKakao() {
    const { error } = await _supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: window.location.origin + '/login.html?kakao=1' }
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  // 카카오 첫 로그인 여부 확인 (users 테이블에 프로필 없으면 신규)
  async isKakaoNewUser() {
    if (!this._currentUser) return false;
    const { data } = await _supabase
      .from('users').select('id, name, phone').eq('id', this._currentUser.id).maybeSingle();
    // 프로필 없거나 이름/전화번호 미입력이면 신규
    if (!data || !data.name || !data.phone) return true;
    return false;
  },

  // 카카오 유저 배송지 저장 (upsert)
  async saveKakaoProfile(profileData) {
    if (!this._currentUser) return { success: false, message: '로그인 정보가 없습니다.' };
    const kakaoName = this._currentUser.user_metadata?.name || this._currentUser.user_metadata?.full_name || '';
    const kakaoEmail = this._currentUser.email || '';
    const { error } = await _supabase.from('users').upsert({
      id:       this._currentUser.id,
      email:    kakaoEmail,
      name:     profileData.name || kakaoName,
      phone:    profileData.phone || '',
      address:  profileData.address || '',
      postcode: profileData.postcode || '',
      role:     'user',
    }, { onConflict: 'id' });
    if (error) return { success: false, message: error.message };
    await this._loadProfile(this._currentUser.id);
    return { success: true };
  },

  // ── 프로필 수정 ──────────────────────────────────────────
  async update(id, updateData) {
    const { data, error } = await _supabase
      .from('users').update(updateData).eq('id', id).select().single();
    if (error) return null;
    this._currentProfile = data;
    return data;
  },

  // ── 회원 탈퇴 ────────────────────────────────────────────
  async delete(id) {
    const { error } = await _supabase.from('users').delete().eq('id', id);
    if (error) return false;
    await _supabase.auth.signOut();
    this._currentUser = null; this._currentProfile = null;
    return true;
  },

  async getAll() {
    const { data } = await _supabase.from('users').select('*');
    return data || [];
  },

  async findByNameAndPhone(name, phone) {
    const { data, error } = await _supabase
      .from('users').select('email, name, phone').eq('name', name).eq('phone', phone);
    if (error) { console.error('이메일 찾기 오류:', error); return []; }
    return data || [];
  },

  // ── 휴대폰 번호로 이메일 찾기 ────────────────────────────
  async findByPhone(phone) {
    const { data, error } = await _supabase
      .from('users').select('email').eq('phone', phone).maybeSingle();
    if (error) { console.error('전화번호 조회 오류:', error); return null; }
    return data?.email || null;
  },

  // ── 비밀번호 재설정 이메일 발송 ──────────────────────────
  async sendPasswordResetEmail(email) {
    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/login.html?mode=reset',
    });
    if (error) return { success: false, message: error.message };
    return { success: true };
  },

  async getById(id) {
    const { data } = await _supabase
      .from('users').select('*').eq('id', id).single();
    return data || null;
  },

  requireLogin() {
    if (!this.isLoggedIn()) {
      alert('로그인이 필요합니다.');
      window.location.href = 'login.html';
      return null;
    }
    return this.getCurrent();
  },

  requireAdmin() {
    if (!this.isAdmin()) {
      document.body.innerHTML = `
        <div class="admin-guard">
          <h2>관리자만 접근할 수 있습니다.</h2>
          <p>관리자 계정으로 로그인한 뒤 다시 시도해주세요.</p>
        </div>`;
      return false;
    }
    return true;
  },
};
