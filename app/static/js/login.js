document.addEventListener('DOMContentLoaded', () => {
  clearStoredUser();

  const form = document.getElementById('loginForm');
  const messageEl = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    clearStoredUser();

    const user_id = document.getElementById('user_id').value.trim();
    const password = document.getElementById('password').value.trim();

    messageEl.className = 'form-message';
    messageEl.textContent = '';

    if (!user_id || !password) {
      messageEl.classList.add('error');
      messageEl.textContent = '아이디와 비밀번호를 입력하세요.';
      return;
    }

    const user = await safeFetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id, password }),
    });

    if (!user) {
      messageEl.classList.add('error');
      messageEl.textContent = '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인하세요.';
      return;
    }

    setStoredUser(user);
    messageEl.classList.add('success');
    messageEl.textContent = '로그인 성공. 대시보드로 이동합니다.';

    setTimeout(() => {
      location.href = APP_ROUTES.dashboard;
    }, 400);
  });
});