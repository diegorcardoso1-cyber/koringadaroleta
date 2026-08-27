// ===== AUTENTICAÇÃO SUPABASE — KORINGA =====
// Usa o mesmo projeto/tabela de acesso do Megamente.
const KORINGA_SUPABASE_URL = 'https://jqgkndzlbajtbzwvdaog.supabase.co';
const KORINGA_SUPABASE_KEY = 'sb_publishable_f9-6kz8ywlLtNV27Sslb0A_At0Dib7P';
const koringaSB = window.supabase.createClient(KORINGA_SUPABASE_URL, KORINGA_SUPABASE_KEY);

function authMsg(texto, tipo = 'wait') {
  const el = document.getElementById('authMessage');
  if (!el) return;
  el.className = 'auth-message ' + tipo;
  el.textContent = texto;
}

function trocarAuthTab(tab) {
  const login = tab === 'login';
  document.getElementById('loginForm').classList.toggle('auth-hidden', !login);
  document.getElementById('cadastroForm').classList.toggle('auth-hidden', login);
  document.getElementById('tabLogin').classList.toggle('active', login);
  document.getElementById('tabCadastro').classList.toggle('active', !login);
  authMsg(
    login
      ? 'Informe seu e-mail e senha para entrar.'
      : 'Crie sua conta. Após o cadastro, o acesso ficará aguardando aprovação do administrador.',
    'wait'
  );
}

async function fazerLogin(ev) {
  ev.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginSenha').value;
  authMsg('Validando acesso...', 'wait');

  const { error } = await koringaSB.auth.signInWithPassword({ email, password });
  if (error) {
    authMsg('Não foi possível entrar. Confira e-mail e senha.', 'danger');
    return;
  }
  await validarAcessoAtual();
}

async function fazerCadastro(ev) {
  ev.preventDefault();
  const nome = document.getElementById('cadNome').value.trim();
  const email = document.getElementById('cadEmail').value.trim();
  const password = document.getElementById('cadSenha').value;
  authMsg('Criando seu cadastro...', 'wait');

  const { data, error } = await koringaSB.auth.signUp({
    email,
    password,
    options: { data: { nome } }
  });

  if (error) {
    authMsg('Não foi possível criar o cadastro: ' + error.message, 'danger');
    return;
  }

  if (data.session) {
    await validarAcessoAtual();
  } else {
    authMsg('✅ Cadastro criado. Se a confirmação de e-mail estiver habilitada, confirme seu e-mail. Depois, aguarde a aprovação do administrador.', 'ok');
  }
}

function formatarValidade(dataISO) {
  if (!dataISO) return 'Sem vencimento';
  const d = new Date(dataISO);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function bloquearComMensagem(texto, tipo = 'wait') {
  document.getElementById('appRoot').classList.add('auth-hidden');
  document.getElementById('authGate').classList.remove('auth-hidden');
  document.getElementById('authFormsArea').classList.add('auth-hidden');
  document.getElementById('authSubtitle').textContent = 'Status do acesso';
  authMsg(texto, tipo);
}

function mostrarLogin() {
  document.getElementById('appRoot').classList.add('auth-hidden');
  document.getElementById('authGate').classList.remove('auth-hidden');
  document.getElementById('authFormsArea').classList.remove('auth-hidden');
  document.getElementById('authSubtitle').textContent = 'Acesso ao sistema';
  trocarAuthTab('login');
}

function liberarPainel(user, profile) {
  document.getElementById('authGate').classList.add('auth-hidden');
  document.getElementById('appRoot').classList.remove('auth-hidden');

  const admin = profile.role === 'admin';
  const validade = admin ? 'Sem vencimento' : formatarValidade(profile.expires_at);
  document.getElementById('accountInfo').innerHTML = `<strong>${profile.nome || user.email}</strong> • ${admin ? 'ADMIN' : 'USUÁRIO'} • validade: ${validade}`;
  document.getElementById('accountBadge').textContent = admin ? '👑 ADMIN' : '✅ ATIVO';
}

async function validarAcessoAtual() {
  const { data: { session } } = await koringaSB.auth.getSession();
  if (!session) {
    mostrarLogin();
    return;
  }

  const user = session.user;
  const { data: profile, error } = await koringaSB
    .from('profiles')
    .select('id,nome,role,status,expires_at,created_at')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    bloquearComMensagem('Não foi possível validar seu perfil. Tente sair e entrar novamente.', 'danger');
    return;
  }

  if (profile.status === 'pending') {
    bloquearComMensagem('⏳ Cadastro realizado. Seu acesso está AGUARDANDO APROVAÇÃO do administrador.', 'wait');
    return;
  }
  if (profile.status === 'blocked') {
    bloquearComMensagem('🔒 Seu acesso está BLOQUEADO. Entre em contato com o administrador.', 'danger');
    return;
  }
  if (profile.status === 'expired') {
    bloquearComMensagem('⌛ Seu acesso está EXPIRADO. Entre em contato com o administrador para renovar.', 'danger');
    return;
  }

  const admin = profile.role === 'admin';
  if (profile.status !== 'active') {
    bloquearComMensagem('Acesso não liberado. Entre em contato com o administrador.', 'danger');
    return;
  }

  if (!admin) {
    if (!profile.expires_at) {
      bloquearComMensagem('⏳ Seu cadastro foi aprovado, mas ainda não possui uma validade definida.', 'wait');
      return;
    }
    if (new Date(profile.expires_at).getTime() <= Date.now()) {
      bloquearComMensagem('⌛ Seu período de acesso venceu em ' + formatarValidade(profile.expires_at) + '. Entre em contato com o administrador para renovar.', 'danger');
      return;
    }
  }

  liberarPainel(user, profile);
}

async function sairKoringa() {
  await koringaSB.auth.signOut();
  mostrarLogin();
}

koringaSB.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') mostrarLogin();
});

window.addEventListener('DOMContentLoaded', () => {
  validarAcessoAtual();
});
