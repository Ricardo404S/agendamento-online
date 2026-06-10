/* ══════════════════════════════════════════
   JACY SALÃO — app.js
   ══════════════════════════════════════════

   REGRAS DO FIRESTORE — cole no Firebase Console
   Firestore → Rules → Edit rules → Publish

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /appointments/{id} {
         allow read: if true;
         allow create: if request.auth != null;
         allow delete: if request.auth != null &&
           request.auth.uid == resource.data.userId;
       }
     }
   }
   ══════════════════════════════════════════ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

/* ══════════════════════════════════════════
   FIREBASE CONFIG
   ══════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            'AIzaSyCC1WQuH-5Xr3NPymK5pb9nLDk6zHoB5Rg',
  authDomain:        'site-jacy.firebaseapp.com',
  projectId:         'site-jacy',
  storageBucket:     'site-jacy.firebasestorage.app',
  messagingSenderId: '529200331564',
  appId:             '1:529200331564:web:14cf67d1f2c522fe174a89',
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

/* ══════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════ */
const SERVICES = [
  { id: 'prog-organica',  name: 'Progressiva Orgânica',   icon: '🌿', desc: 'Alinha e disciplina os fios com fórmula livre de formol. Resultado natural e duradouro por até 6 meses.',      duration: '3h–4h',    price: 'R$ 130' },
  { id: 'prog-formol',    name: 'Progressiva Formol',      icon: '✨', desc: 'Máximo poder de alisamento com resultado intenso e duradouro. Indicada para cabelos muito crespos e volumosos.', duration: '3h–4h',    price: 'R$ 180' },
  { id: 'selagem',        name: 'Selagem',                 icon: '💎', desc: 'Lacra a cutícula dos fios, prolonga a coloração e entrega brilho espelhado sem alterar a estrutura capilar.',  duration: '1h30–2h',  price: 'R$ 90'  },
  { id: 'botox',          name: 'Botox Capilar',           icon: '💫', desc: 'Repõe a massa dos fios, elimina frizz e devolve o volume controlado com maciez e brilho intenso.',             duration: '2h–3h',    price: 'R$ 75'  },
  { id: 'protocolo',      name: 'Protocolo Capilar',       icon: '🌸', desc: '3 sessões completas: Nutrição, Hidratação e Reconstrução. Tratamento profundo para fios extremamente danificados.', duration: '3 sessões', price: 'R$ 200' },
  { id: 'hidratacao',     name: 'Hidratação',              icon: '💧', desc: 'Reposição intensa de água e nutrientes para cabelos secos e sem vida. Fios macios e revitalizados.',           duration: '1h–1h30',  price: 'R$ 60'  },
  { id: 'escova-prancha', name: 'Escova + Prancha',        icon: '🪄', desc: 'Finalização profissional com escova modeladora e prancha. Liso, sedoso e com brilho de salão.',               duration: '45min–1h', price: 'R$ 45'  },
];

const SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
];

const MONTHS_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/* ══════════════════════════════════════════
   HELPERS
   ══════════════════════════════════════════ */

/** Formata uma Date como "YYYY-MM-DD" */
const dateKey = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Formata "YYYY-MM-DD" → "DD de Mmm de YYYY" */
const fmtDate = d => {
  const [y, m, dd] = d.split('-');
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  return `${dd} de ${months[+m - 1]} de ${y}`;
};

/** Formata "YYYY-MM-DD" → data longa em pt-BR */
const fmtDateFull = d => {
  const date = new Date(d + 'T12:00:00');
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
};

/* ══════════════════════════════════════════
   REACT ALIASES
   ══════════════════════════════════════════ */
const { useState, useEffect } = React;
const h = React.createElement;

/* ══════════════════════════════════════════
   TOAST SYSTEM
   ══════════════════════════════════════════ */
let _toastSetters = [];

function addToast(msg, type = 'info') {
  _toastSetters.forEach(fn =>
    fn(prev => [...prev, { id: Date.now() + Math.random(), msg, type }])
  );
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _toastSetters.push(setToasts);
    return () => { _toastSetters = _toastSetters.filter(f => f !== setToasts); };
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts(p => p.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [toasts]);

  return h('div', { className: 'toast-container' },
    toasts.map(t =>
      h('div', { key: t.id, className: `toast ${t.type}` },
        h('span', { className: 'toast-icon' },
          t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'
        ),
        h('span', null, t.msg)
      )
    )
  );
}

/* ══════════════════════════════════════════
   GOOGLE ICON SVG
   ══════════════════════════════════════════ */
const GoogleSVG = () =>
  h('svg', { className: 'google-icon', viewBox: '0 0 48 48' },
    h('path', { fill: '#FFC107', d: 'M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z' }),
    h('path', { fill: '#FF3D00', d: 'M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6.6 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z' }),
    h('path', { fill: '#4CAF50', d: 'M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.8 36 24 36c-5.3 0-9.6-3.3-11.3-8H6.1C9.3 37.9 16.1 44 24 44z' }),
    h('path', { fill: '#1976D2', d: 'M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C41.4 35.8 44 30.3 44 24c0-1.2-.1-2.4-.4-3.5z' })
  );

/* ══════════════════════════════════════════
   AUTH FIELD
   ══════════════════════════════════════════ */
function AuthField({ id, label, type, value, onChange, placeholder, autoComplete }) {
  return h('div', { className: 'field' },
    h('label', { htmlFor: id }, label),
    h('input', {
      id,
      type: type || 'text',
      value,
      onChange: e => onChange(e.target.value),
      placeholder,
      autoComplete,
      spellCheck: false,
    })
  );
}

/* ── Auth error messages ── */
const AUTH_ERRORS = {
  'auth/email-already-in-use':    'Este e-mail já está cadastrado. Tente fazer login.',
  'auth/invalid-email':           'E-mail inválido. Verifique e tente novamente.',
  'auth/weak-password':           'Senha muito fraca. Use ao menos 6 caracteres.',
  'auth/user-not-found':          'E-mail não encontrado. Verifique ou crie uma conta.',
  'auth/wrong-password':          'Senha incorreta. Tente novamente.',
  'auth/invalid-credential':      'E-mail ou senha incorretos.',
  'auth/too-many-requests':       'Muitas tentativas. Aguarde um momento e tente novamente.',
  'auth/popup-closed-by-user':    'Login cancelado. Tente novamente.',
  'auth/popup-blocked':           'Popup bloqueado pelo navegador. Tente novamente.',
  'auth/cancelled-popup-request': 'Login cancelado. Tente novamente.',
  'auth/network-request-failed':  'Sem conexão. Verifique sua internet.',
  'auth/unauthorized-domain':     'DOMAIN_ERROR',
};

const friendlyError = code => {
  if (AUTH_ERRORS[code] === 'DOMAIN_ERROR') return '__DOMAIN__';
  return AUTH_ERRORS[code] || `Ocorreu um erro (${code || 'desconhecido'}). Tente novamente.`;
};

/* ══════════════════════════════════════════
   AUTH MODAL
   ══════════════════════════════════════════ */
function AuthModal({ onClose, initialTab }) {
  const [tab,       setTab]       = useState(initialTab || 'login');
  const [name,      setName]      = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [gLoading,  setGLoading]  = useState(false);
  const [error,     setError]     = useState('');
  const [resetSent, setResetSent] = useState(false);

  const clearForm = () => {
    setName(''); setEmail(''); setPassword(''); setConfirm('');
    setError(''); setResetSent(false);
  };

  const switchTab = t => { setTab(t); clearForm(); };

  /* Google login — tenta popup, cai em redirect se bloqueado */
  const handleGoogle = async () => {
    setGLoading(true); setError('');
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      addToast('Bem-vinda! Login realizado com sucesso. 💕', 'success');
      onClose();
    } catch (e) {
      const blocked = ['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (blocked.includes(e.code)) {
        try {
          await signInWithRedirect(auth, provider);
        } catch (e2) {
          setError(friendlyError(e2.code));
          setGLoading(false);
        }
      } else {
        setError(friendlyError(e.code));
        setGLoading(false);
      }
    }
  };

  const handleLogin = async e => {
    e.preventDefault(); setError('');
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      addToast('Bem-vinda de volta! 💕', 'success');
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async e => {
    e.preventDefault(); setError('');
    if (!name.trim())         { setError('Informe seu nome.'); return; }
    if (!email)               { setError('Informe seu e-mail.'); return; }
    if (password.length < 6)  { setError('A senha deve ter pelo menos 6 caracteres.'); return; }
    if (password !== confirm)  { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      addToast('Conta criada! Bem-vinda ao Jacy Salão 🌸', 'success');
      onClose();
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!email) { setError('Digite seu e-mail acima para redefinir a senha.'); return; }
    setLoading(true); setError('');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return h('div', { className: 'modal-overlay', onClick: e => e.target === e.currentTarget && onClose() },
    h('div', { className: 'modal' },

      h('div', { className: 'modal-logo', style: { marginBottom: '4px' } }, 'Jacy ', h('em', null, 'Salão')),
      h('p', { className: 'modal-sub', style: { marginBottom: '0' } },
        tab === 'login' ? 'Acesse sua conta para agendar' : 'Crie sua conta gratuitamente'
      ),

      /* Tabs */
      h('div', { className: 'auth-tabs' },
        h('button', { className: `auth-tab ${tab === 'login' ? 'active' : ''}`, onClick: () => switchTab('login') }, 'Entrar'),
        h('button', { className: `auth-tab ${tab === 'register' ? 'active' : ''}`, onClick: () => switchTab('register') }, 'Cadastrar')
      ),

      /* Domain error block */
      error === '__DOMAIN__' && h('div', {
        style: {
          background: '#fff8f0', border: '1px solid #f5d5b0', borderRadius: '10px',
          padding: '14px 16px', marginBottom: '14px', textAlign: 'left',
        },
      },
        h('div', { style: { fontWeight: 500, color: '#b06000', fontSize: '.85rem', marginBottom: '6px' } },
          '⚠️ Domínio não autorizado no Firebase'
        ),
        h('div', { style: { fontSize: '.78rem', color: '#7a4800', lineHeight: 1.7 } },
          'Para liberar o login com Google, acesse o ',
          h('strong', null, 'Console do Firebase'),
          ' → Authentication → Settings → ',
          h('strong', null, 'Authorized domains'),
          ' → Add domain, e adicione o domínio deste site.'
        )
      ),

      /* Generic error */
      error && error !== '__DOMAIN__' && h('div', { className: 'auth-error' }, error),

      /* Reset sent confirmation */
      resetSent && h('div', {
        style: {
          background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: '8px',
          padding: '10px 14px', fontSize: '.8rem', color: '#2d6a4f',
          marginBottom: '14px', textAlign: 'left',
        },
      }, '✓ E-mail de redefinição enviado! Verifique sua caixa de entrada.'),

      /* ── Login form ── */
      tab === 'login' && h('form', { onSubmit: handleLogin },
        h(AuthField, { id: 'li-email', label: 'E-mail',  type: 'email',    value: email,    onChange: setEmail,    placeholder: 'seu@email.com', autoComplete: 'email' }),
        h(AuthField, { id: 'li-senha', label: 'Senha',   type: 'password', value: password, onChange: setPassword, placeholder: '••••••••',      autoComplete: 'current-password' }),
        h('button', {
          className: 'btn btn-primary',
          style: { width: '100%', padding: '14px', fontSize: '.88rem', marginTop: '6px' },
          type: 'submit', disabled: loading,
        },
          loading ? h('span', { className: 'spinner' }) : null,
          loading ? 'Entrando…' : 'Entrar'
        ),
        h('button', {
          type: 'button', className: 'auth-footer-link',
          onClick: handleReset, disabled: loading || resetSent,
        }, 'Esqueceu a senha?')
      ),

      /* ── Register form ── */
      tab === 'register' && h('form', { onSubmit: handleRegister },
        h(AuthField, { id: 'rg-nome',  label: 'Seu nome',        type: 'text',     value: name,     onChange: setName,     placeholder: 'Como quer ser chamada?', autoComplete: 'name' }),
        h(AuthField, { id: 'rg-email', label: 'E-mail',          type: 'email',    value: email,    onChange: setEmail,    placeholder: 'seu@email.com',          autoComplete: 'email' }),
        h(AuthField, { id: 'rg-senha', label: 'Senha',           type: 'password', value: password, onChange: setPassword, placeholder: 'Mínimo 6 caracteres',    autoComplete: 'new-password' }),
        h(AuthField, { id: 'rg-conf',  label: 'Confirmar senha', type: 'password', value: confirm,  onChange: setConfirm,  placeholder: 'Repita a senha',         autoComplete: 'new-password' }),
        h('button', {
          className: 'btn btn-primary',
          style: { width: '100%', padding: '14px', fontSize: '.88rem', marginTop: '6px' },
          type: 'submit', disabled: loading,
        },
          loading ? h('span', { className: 'spinner' }) : null,
          loading ? 'Criando conta…' : 'Criar minha conta'
        )
      ),

      /* Google button */
      h('div', { className: 'auth-divider' }, 'ou continue com'),
      h('button', { className: 'google-btn', onClick: handleGoogle, disabled: gLoading, type: 'button' },
        gLoading
          ? h('span', { className: 'spinner', style: { borderColor: 'rgba(0,0,0,.2)', borderTopColor: '#555' } })
          : h(GoogleSVG),
        gLoading ? 'Redirecionando…' : 'Entrar com Google'
      )
    )
  );
}

/* ══════════════════════════════════════════
   CALENDAR
   ══════════════════════════════════════════ */
function Calendar({ selected, onSelect }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [cur, setCur] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const daysInMonth = new Date(cur.y, cur.m + 1, 0).getDate();
  const firstDay    = new Date(cur.y, cur.m, 1).getDay();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const prev = () => setCur(c => c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 });
  const next = () => setCur(c => c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 });

  const todayM = today.getMonth();
  const todayY = today.getFullYear();
  const todayD = today.getDate();

  return h('div', { className: 'calendar-wrap' },
    h('div', { className: 'calendar-nav' },
      h('button', { className: 'cal-nav-btn', onClick: prev }, '‹'),
      h('span', { className: 'cal-month' }, `${MONTHS_PT[cur.m]} ${cur.y}`),
      h('button', { className: 'cal-nav-btn', onClick: next }, '›')
    ),
    h('div', { className: 'cal-grid' },
      DAYS_PT.map(d => h('div', { key: d, className: 'cal-dow' }, d)),
      cells.map((day, i) => {
        if (!day) return h('div', { key: `e${i}`, className: 'cal-day empty' });

        const date = new Date(cur.y, cur.m, day);
        date.setHours(0, 0, 0, 0);
        const isPast   = date < today;
        const isSunday = date.getDay() === 0;
        const key      = `${cur.y}-${String(cur.m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday  = day === todayD && cur.m === todayM && cur.y === todayY;
        const isSel    = selected === key;

        let cls = 'cal-day';
        if (isPast || isSunday) cls += ' past';
        else if (isSel)         cls += ' selected';
        else if (isToday)       cls += ' today';

        return h('div', {
          key: i, className: cls,
          onClick: () => { if (!isPast && !isSunday) onSelect(key); },
        }, day);
      })
    )
  );
}

/* ══════════════════════════════════════════
   TIME SLOTS
   ══════════════════════════════════════════ */
function TimeSlots({ selectedTime, onSelect, bookedSlots }) {
  return h('div', { className: 'time-grid' },
    SLOTS.map(s => {
      const isBooked = bookedSlots.includes(s);
      const isSel    = selectedTime === s;
      let cls = 'time-slot';
      if (isBooked) cls += ' booked';
      else if (isSel) cls += ' selected';

      return h('div', {
        key: s, className: cls,
        onClick: () => { if (!isBooked) onSelect(s); },
      },
        s,
        isBooked ? h('div', { style: { fontSize: '.65rem', marginTop: '2px' } }, 'Ocupado') : null
      );
    })
  );
}

/* ══════════════════════════════════════════
   BOOKING FLOW
   ══════════════════════════════════════════ */
function BookingFlow({ user, onLoginRequest }) {
  const [step,        setStep]      = useState(1);
  const [service,     setService]   = useState(null);
  const [date,        setDate]      = useState('');
  const [time,        setTime]      = useState('');
  const [bookedSlots, setBooked]    = useState([]);
  const [loading,     setLoading]   = useState(false);
  const [confirmed,   setConfirmed] = useState(false);

  /* Listen booked slots for selected date */
  useEffect(() => {
    if (!date) { setBooked([]); return; }
    const q = query(collection(db, 'appointments'), where('date', '==', date));
    const unsub = onSnapshot(q, snap => {
      setBooked(snap.docs.map(d => d.data().time));
    });
    return unsub;
  }, [date]);

  const handleConfirm = async () => {
    if (!user) { onLoginRequest(); return; }
    setLoading(true);
    try {
      await addDoc(collection(db, 'appointments'), {
        userId:       user.uid,
        userName:     user.displayName || user.email,
        userEmail:    user.email,
        userPhone:    user.phoneNumber || '',
        service:      service.id,
        serviceName:  service.name,
        servicePrice: service.price,
        date,
        time,
        status:    'confirmed',
        createdAt: Timestamp.now(),
      });
      addToast('Agendamento confirmado! Até lá 💖', 'success');
      setConfirmed(true);
    } catch (e) {
      console.error('Erro ao agendar:', e);
      if (e.code === 'permission-denied') {
        addToast('Erro de permissão. Veja as instruções no console.', 'error');
      } else {
        addToast('Erro ao agendar: ' + (e.message || 'Tente novamente.'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Confirmed screen ── */
  if (confirmed) return h('div', { className: 'anim-scale-in', style: { textAlign: 'center', padding: '60px 20px' } },
    h('div', { style: { fontSize: '3.5rem', marginBottom: '20px' } }, '🌸'),
    h('div', {
      style: {
        fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 300,
        color: 'var(--text-dark)', marginBottom: '12px',
      },
    }, 'Agendamento Confirmado!'),
    h('p', {
      style: {
        color: 'var(--text-mid)', fontSize: '.9rem', lineHeight: 1.8,
        maxWidth: '360px', margin: '0 auto 32px',
      },
    }, `Seu ${service.name} está marcado para ${fmtDate(date)} às ${time}. Te esperamos! 💕`),
    h('button', {
      className: 'btn btn-primary',
      onClick: () => { setStep(1); setService(null); setDate(''); setTime(''); setConfirmed(false); },
    }, 'Fazer novo agendamento')
  );

  /* ── Step progress bar ── */
  const progressBar = h('div', { style: { display: 'flex', gap: '8px', marginBottom: '36px' } },
    [1, 2, 3].map(n => h('div', {
      key: n,
      style: {
        flex: 1, height: '3px', borderRadius: '4px',
        background: step >= n ? 'var(--rose-deep)' : 'var(--border)',
        transition: 'background .3s',
      },
    }))
  );

  /* ── Step 1 — Choose service ── */
  const step1 = step === 1 && h('div', { className: 'anim-fade-up' },
    h('div', { className: 'booking-step-header' },
      h('div', { className: 'step-num' }, '1'),
      h('div', null,
        h('div', { className: 'step-title' }, 'Escolha o Procedimento'),
        h('div', { className: 'step-sub' }, 'Selecione o serviço desejado')
      )
    ),
    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: '14px' } },
      SERVICES.map(s => h('div', {
        key: s.id,
        className: `service-card ${service?.id === s.id ? 'selected' : ''}`,
        style: { display: 'flex', flexDirection: 'column' },
        onClick: () => setService(s),
      },
        h('span', { className: 'service-icon' }, s.icon),
        h('div', { className: 'service-name' }, s.name),
        h('div', { className: 'service-desc', style: { flex: 1, fontSize: '.8rem' } }, s.desc),
        h('div', {
          style: {
            marginTop: 'auto', paddingTop: '12px',
            borderTop: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          },
        },
          h('div', { className: 'service-duration' }, '⏱ ', s.duration),
          h('div', { className: 'service-price', style: { marginTop: 0, fontSize: '1.2rem' } }, s.price)
        )
      ))
    ),
    service && h('div', { style: { textAlign: 'right', marginTop: '28px' } },
      h('button', { className: 'btn btn-primary', onClick: () => setStep(2) }, 'Escolher Data & Horário →')
    )
  );

  /* ── Step 2 — Pick date & time ── */
  const step2 = step === 2 && h('div', { className: 'anim-fade-up' },
    h('div', { className: 'booking-step-header' },
      h('button', { className: 'btn btn-ghost', style: { marginRight: '4px', padding: '8px', fontSize: '1rem' }, onClick: () => setStep(1) }, '←'),
      h('div', { className: 'step-num' }, '2'),
      h('div', null,
        h('div', { className: 'step-title' }, 'Data & Horário'),
        h('div', { className: 'step-sub' }, `${service?.name} · Domingos não disponíveis`)
      )
    ),
    h(Calendar, { selected: date, onSelect: d => { setDate(d); setTime(''); } }),
    date && h('div', null,
      h('div', { className: 'divider', style: { margin: '28px 0 20px' } }, fmtDate(date)),
      h(TimeSlots, { date, selectedTime: time, onSelect: setTime, bookedSlots })
    ),
    date && time && h('div', { style: { textAlign: 'right', marginTop: '28px' } },
      h('button', { className: 'btn btn-primary', onClick: () => setStep(3) }, 'Revisar Agendamento →')
    )
  );

  /* ── Step 3 — Confirm ── */
  const step3 = step === 3 && h('div', { className: 'anim-fade-up' },
    h('div', { className: 'booking-step-header' },
      h('button', { className: 'btn btn-ghost', style: { marginRight: '4px', padding: '8px', fontSize: '1rem' }, onClick: () => setStep(2) }, '←'),
      h('div', { className: 'step-num' }, '3'),
      h('div', null,
        h('div', { className: 'step-title' }, 'Confirmar Agendamento'),
        h('div', { className: 'step-sub' },
          user ? `Olá, ${user.displayName?.split(' ')[0]}! Tudo certo?` : 'Faça login para confirmar'
        )
      )
    ),
    h('div', { className: 'booking-summary' },
      h('div', { className: 'summary-row' }, h('span', { className: 'summary-label' }, 'Serviço'),     h('span', { className: 'summary-value' }, service?.name)),
      h('div', { className: 'summary-row' }, h('span', { className: 'summary-label' }, 'Valor'),       h('span', { className: 'summary-value', style: { color: 'var(--rose-deep)', fontFamily: 'var(--font-serif)', fontSize: '1.1rem' } }, service?.price)),
      h('div', { className: 'summary-row' }, h('span', { className: 'summary-label' }, 'Data'),        h('span', { className: 'summary-value' }, fmtDate(date))),
      h('div', { className: 'summary-row' }, h('span', { className: 'summary-label' }, 'Horário'),     h('span', { className: 'summary-value' }, time)),
      h('div', { className: 'summary-row' }, h('span', { className: 'summary-label' }, 'Profissional'), h('span', { className: 'summary-value' }, 'Jacy'))
    ),
    !user && h('p', { style: { color: 'var(--text-mid)', fontSize: '.85rem', marginBottom: '16px', lineHeight: 1.7 } },
      'Você precisa estar logada para confirmar o agendamento. Clique abaixo para entrar com sua conta Google.'
    ),
    h('button', {
      className: 'btn btn-primary',
      style: { width: '100%', padding: '16px', fontSize: '.9rem' },
      onClick: handleConfirm, disabled: loading,
    },
      loading ? h('span', { className: 'spinner' }) : null,
      loading ? 'Confirmando…' : user ? '✓ Confirmar Agendamento' : '🔑 Entrar com Google e Confirmar'
    )
  );

  return h('div', null, progressBar, step1, step2, step3);
}

/* ══════════════════════════════════════════
   PROFILE PAGE
   ══════════════════════════════════════════ */
function ProfilePage({ user }) {
  const [appts,      setAppts]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'appointments'), where('userId', '==', user.uid));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
      setAppts(docs);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const cancel = async id => {
    setCancelling(id);
    try {
      await deleteDoc(doc(db, 'appointments', id));
      addToast('Agendamento cancelado. Horário liberado.', 'success');
    } catch {
      addToast('Erro ao cancelar. Tente novamente.', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const upcoming = appts.filter(a => new Date(a.date + 'T12:00:00') >= today);
  const past     = appts.filter(a => new Date(a.date + 'T12:00:00') < today);
  const initials = user.displayName?.split(' ').map(w => w[0]).slice(0, 2).join('') || '?';

  return h('div', { className: 'profile-section anim-fade-up' },
    /* Profile card */
    h('div', { className: 'profile-card' },
      h('div', { className: 'profile-header' },
        h('div', { className: 'avatar' },
          user.photoURL ? h('img', { src: user.photoURL, alt: 'avatar' }) : initials
        ),
        h('div', null,
          h('div', { className: 'profile-name' }, user.displayName || 'Cliente'),
          h('div', { className: 'profile-email' }, user.email)
        )
      ),
      h('div', { className: 'divider' }, 'Informações')
    ),

    h('div', { className: 'section-label', style: { marginBottom: '16px' } }, 'Próximos agendamentos'),

    /* Upcoming appointments */
    loading
      ? h('div', { style: { textAlign: 'center', padding: '40px', color: 'var(--text-light)' } }, 'Carregando…')
      : upcoming.length === 0
        ? h('div', { className: 'empty-state' },
            h('div', { className: 'empty-state-icon' }, '🌸'),
            h('div', { className: 'empty-state-text' }, 'Nenhum agendamento ativo'),
            h('div', { className: 'empty-state-sub' }, 'Faça seu primeiro agendamento e volte aqui para acompanhar!')
          )
        : upcoming.map(a =>
            h('div', { key: a.id, className: 'appt-card' },
              h('div', null,
                h('div', { className: 'appt-service' }, a.serviceName || a.service),
                h('div', { className: 'appt-datetime' }, `${fmtDateFull(a.date)} · ${a.time}`)
              ),
              h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' } },
                h('span', { className: 'appt-badge' }, '✦ Confirmado'),
                h('button', {
                  className: 'btn btn-danger',
                  onClick: () => cancel(a.id),
                  disabled: cancelling === a.id,
                }, cancelling === a.id ? '…' : 'Cancelar')
              )
            )
          ),

    /* Past appointments */
    past.length > 0 && h('div', null,
      h('div', { className: 'section-label', style: { margin: '32px 0 16px' } }, 'Histórico'),
      [...past].reverse().map(a =>
        h('div', { key: a.id, className: 'appt-card', style: { opacity: .6 } },
          h('div', null,
            h('div', { className: 'appt-service' }, a.serviceName || a.service),
            h('div', { className: 'appt-datetime' }, `${fmtDateFull(a.date)} · ${a.time}`)
          ),
          h('span', { style: { fontSize: '.75rem', color: 'var(--text-light)', letterSpacing: '.1em', textTransform: 'uppercase' } }, 'Concluído')
        )
      )
    )
  );
}

/* ══════════════════════════════════════════
   ADMIN PANEL
   ══════════════════════════════════════════ */
const ADMIN_PASSWORD = 'jacy2024'; // senha de acesso ao painel — edite aqui

function AdminPanel({ onLogout }) {
  const [authed,      setAuthed]      = useState(false);
  const [pwd,         setPwd]         = useState('');
  const [pwdErr,      setPwdErr]      = useState('');
  const [appts,       setAppts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filter,      setFilter]      = useState('upcoming');
  const [dateFilter,  setDateFilter]  = useState('');
  const [cancelling,  setCancelling]  = useState(null);

  const handlePwd = e => {
    e.preventDefault();
    if (pwd === ADMIN_PASSWORD) { setAuthed(true); setPwdErr(''); }
    else setPwdErr('Senha incorreta.');
  };

  useEffect(() => {
    if (!authed) return;
    const q = query(collection(db, 'appointments'));
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.date + a.time) < (b.date + b.time) ? -1 : 1);
      setAppts(docs);
      setLoading(false);
    });
    return unsub;
  }, [authed]);

  const cancelAppt = async id => {
    setCancelling(id);
    try {
      await deleteDoc(doc(db, 'appointments', id));
      addToast('Agendamento cancelado.', 'success');
    } catch {
      addToast('Erro ao cancelar.', 'error');
    } finally {
      setCancelling(null);
    }
  };

  const todayKey      = dateKey(new Date());
  const filtered      = appts.filter(a => {
    if (dateFilter)              return a.date === dateFilter;
    if (filter === 'today')      return a.date === todayKey;
    if (filter === 'upcoming')   return a.date >= todayKey;
    return true;
  });
  const todayCount    = appts.filter(a => a.date === todayKey).length;
  const upcomingCount = appts.filter(a => a.date >= todayKey).length;

  const shortDate = d => {
    const [, m, dd] = d.split('-');
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${dd}/${months[+m - 1]}`;
  };

  /* ── Password gate ── */
  if (!authed) return h('div', { className: 'admin-login-wrap anim-fade-up' },
    h('div', { style: { fontSize: '3rem' } }, '🔐'),
    h('div', { style: { fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 300, color: 'var(--text-dark)' } },
      'Painel da ', h('em', { style: { color: 'var(--rose-deep)', fontStyle: 'italic' } }, 'Jacy')
    ),
    h('p', { style: { fontSize: '.85rem', color: 'var(--text-light)', maxWidth: '280px', lineHeight: 1.7 } },
      'Digite a senha de acesso ao painel de agendamentos.'
    ),
    h('form', { onSubmit: handlePwd, style: { width: '100%', maxWidth: '300px' } },
      h('input', {
        type: 'password', value: pwd, onChange: e => setPwd(e.target.value),
        placeholder: 'Senha do painel',
        style: {
          width: '100%', padding: '12px 16px',
          border: '1px solid var(--border)', borderRadius: '12px',
          fontSize: '.9rem', fontFamily: 'var(--font-sans)',
          outline: 'none', marginBottom: '10px',
          textAlign: 'center', letterSpacing: '.2em',
        },
      }),
      pwdErr && h('div', { style: { color: '#c0392b', fontSize: '.8rem', marginBottom: '10px' } }, pwdErr),
      h('button', { className: 'btn btn-primary', style: { width: '100%', padding: '13px' }, type: 'submit' }, 'Entrar no Painel')
    )
  );

  /* ── Admin dashboard ── */
  return h('div', { className: 'admin-wrap anim-fade-up' },
    /* Topbar */
    h('div', { className: 'admin-topbar' },
      h('div', null,
        h('div', { className: 'admin-title' }, 'Painel ', h('em', null, 'Jacy')),
        h('div', { style: { fontSize: '.8rem', color: 'var(--text-light)', marginTop: '4px' } }, 'Todos os agendamentos do salão')
      ),
      h('button', { className: 'btn btn-outline', style: { padding: '9px 20px' }, onClick: onLogout }, 'Sair')
    ),

    /* Stats */
    h('div', { className: 'admin-stats' },
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-value' }, todayCount),    h('div', { className: 'stat-label' }, 'Hoje')),
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-value' }, upcomingCount), h('div', { className: 'stat-label' }, 'Próximos')),
      h('div', { className: 'stat-card' }, h('div', { className: 'stat-value' }, appts.length),  h('div', { className: 'stat-label' }, 'Total geral'))
    ),

    /* Filters */
    h('div', { className: 'admin-filters' },
      h('button', { className: `filter-btn ${filter === 'today'    && !dateFilter ? 'active' : ''}`, onClick: () => { setFilter('today');    setDateFilter(''); } }, 'Hoje'),
      h('button', { className: `filter-btn ${filter === 'upcoming' && !dateFilter ? 'active' : ''}`, onClick: () => { setFilter('upcoming'); setDateFilter(''); } }, 'Próximos'),
      h('button', { className: `filter-btn ${filter === 'all'      && !dateFilter ? 'active' : ''}`, onClick: () => { setFilter('all');      setDateFilter(''); } }, 'Todos'),
      h('input', {
        type: 'date', className: 'admin-date-input', value: dateFilter,
        onChange: e => { setDateFilter(e.target.value); setFilter(''); },
        title: 'Filtrar por data',
      })
    ),

    /* Appointment list */
    loading
      ? h('div', { style: { textAlign: 'center', padding: '40px', color: 'var(--text-light)' } }, 'Carregando agendamentos…')
      : filtered.length === 0
        ? h('div', { className: 'admin-empty' },
            h('div', { className: 'admin-empty-icon' }, '📅'),
            h('div', { className: 'admin-empty-text' }, 'Nenhum agendamento encontrado')
          )
        : filtered.map(a => {
            const svc = SERVICES.find(s => s.id === a.service);
            return h('div', { key: a.id, className: 'admin-card' },
              h('div', { className: 'admin-card-inner' },
                /* Time column */
                h('div', { className: 'admin-time-col' },
                  h('div', { className: 'admin-time' }, a.time),
                  h('div', { className: 'admin-date-tag' }, shortDate(a.date))
                ),
                /* Info column */
                h('div', { className: 'admin-info-col' },
                  h('div', { className: 'admin-client' }, a.userName || 'Cliente'),
                  h('div', { className: 'admin-service-tag' }, svc?.icon || '✦', ' ', a.serviceName || a.service),
                  h('div', { className: 'admin-email' }, a.userEmail)
                ),
                /* Price + cancel column */
                h('div', { className: 'admin-price-col' },
                  h('div', { className: 'admin-price' }, a.servicePrice || svc?.price || '—'),
                  h('button', {
                    className: 'admin-cancel-btn',
                    onClick: () => {
                      if (confirm(`Cancelar agendamento de ${a.userName}?`)) cancelAppt(a.id);
                    },
                    disabled: cancelling === a.id,
                  }, cancelling === a.id ? 'cancelando…' : 'cancelar')
                )
              )
            );
          })
  );
}

/* ══════════════════════════════════════════
   APP (ROOT COMPONENT)
   ══════════════════════════════════════════ */
function App() {
  const [user,         setUser]         = useState(undefined);
  const [page,         setPage]         = useState('home');
  const [showAuth,     setShowAuth]     = useState(false);
  const [adminClicks,  setAdminClicks]  = useState(0);

  useEffect(() => {
    /* Handle redirect result (Google sign-in from mobile/popup-blocked) */
    getRedirectResult(auth)
      .then(result => { if (result?.user) addToast('Bem-vinda! Login com Google realizado. 💕', 'success'); })
      .catch(() => {});

    /* Auth state listener */
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u || null);
      const loader = document.getElementById('root-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.display = 'none'; }, 500);
      }
    });

    return unsub;
  }, []);

  /* Secret click on logo (5×) → admin panel */
  const handleBrandClick = e => {
    e.preventDefault();
    if (page === 'admin') { setPage('home'); setAdminClicks(0); return; }
    const next = adminClicks + 1;
    if (next >= 5) { setPage('admin'); setAdminClicks(0); }
    else setAdminClicks(next);
    if (page !== 'home') setPage('home');
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPage('home');
    addToast('Até logo! 💕', 'success');
  };

  /* Still loading user state */
  if (user === undefined) return null;

  return h('div', null,
    /* ── HEADER ── */
    h('header', null,
      h('div', { className: 'header-inner' },
        h('a', { href: '#', className: 'brand', onClick: handleBrandClick },
          'Jacy ', h('em', null, 'Salão')
        ),
        h('div', { className: 'nav-actions' },
          page !== 'home' && page !== 'admin' &&
            h('button', { className: 'btn btn-ghost', onClick: () => setPage('home') }, 'Início'),
          page === 'admin' &&
            h('button', { className: 'btn btn-ghost', onClick: () => setPage('home') }, '← Voltar ao site'),
          page !== 'admin' && (
            user
              ? h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
                  h('button', { className: 'btn btn-ghost', onClick: () => setPage('profile') },
                    page === 'profile' ? '✦ Meu Perfil' : 'Meu Perfil'
                  ),
                  h('button', { className: 'btn btn-outline', style: { padding: '9px 18px' }, onClick: handleLogout }, 'Sair')
                )
              : h('button', { className: 'btn btn-primary', onClick: () => setShowAuth(true) }, 'Entrar')
          )
        )
      )
    ),

    /* ── ADMIN PAGE ── */
    page === 'admin' && h(AdminPanel, { onLogout: handleLogout }),

    /* ── PROFILE PAGE ── */
    page === 'profile' && user && h(ProfilePage, { user }),

    /* ── HOME PAGE ── */
    page === 'home' && h('div', null,

      /* Hero */
      h('section', { className: 'hero' },
        h('div', { className: 'hero-bg' }),
        h('div', { className: 'hero-pattern' }),
        h('div', { className: 'hero-content' },
          h('p', { className: 'hero-eyebrow' }, '✦ Cuidado que transforma ✦'),
          h('h1', { className: 'hero-title' }, 'Beleza com', h('em', null, 'propósito')),
          h('p', { className: 'hero-sub' },
            'Agende seu procedimento capilar com Jacy e descubra o poder de fios verdadeiramente saudáveis. Sofisticação, cuidado e resultado em cada atendimento.'
          ),
          h('div', { className: 'hero-actions' },
            h('button', {
              className: 'btn btn-primary',
              style: { padding: '14px 36px', fontSize: '.88rem' },
              onClick: () => document.getElementById('agendar')?.scrollIntoView({ behavior: 'smooth' }),
            }, '✦ Agendar Agora'),
            h('button', {
              className: 'btn btn-outline',
              style: { padding: '13px 28px', fontSize: '.88rem' },
              onClick: () => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' }),
            }, 'Ver Serviços')
          ),
          h('div', { className: 'hero-badge' },
            h('div', { className: 'hero-badge-dot' }),
            'Jacy disponível para agendamentos'
          )
        )
      ),

      /* Services section */
      h('section', { className: 'section', id: 'servicos', style: { background: 'var(--cream)' } },
        h('div', { className: 'section-inner' },
          h('div', { className: 'section-header' },
            h('p', { className: 'section-label' }, '✦ Nossos Procedimentos'),
            h('h2', { className: 'section-title' }, 'Tratamentos ', h('em', null, 'exclusivos')),
            h('p', { className: 'section-sub' }, 'Cada procedimento é realizado com produtos premium e técnica personalizada para o seu tipo de fio.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: '20px' } },
            SERVICES.map(s =>
              h('div', { key: s.id, className: 'service-card', style: { display: 'flex', flexDirection: 'column' } },
                h('span', { className: 'service-icon' }, s.icon),
                h('div', { className: 'service-name' }, s.name),
                h('div', { className: 'service-desc', style: { flex: 1 } }, s.desc),
                h('div', {
                  style: {
                    marginTop: 'auto', paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                  },
                },
                  h('div', null, h('div', { className: 'service-duration' }, '⏱ ', s.duration)),
                  h('div', { style: { textAlign: 'right' } },
                    h('div', { className: 'service-price-label' }, 'a partir de'),
                    h('div', { className: 'service-price' }, s.price)
                  )
                )
              )
            )
          )
        )
      ),

      /* Booking section */
      h('section', { className: 'section', id: 'agendar' },
        h('div', { className: 'section-inner' },
          h('div', { className: 'section-header' },
            h('p', { className: 'section-label' }, '✦ Agendamento Online'),
            h('h2', { className: 'section-title' }, 'Marque seu ', h('em', null, 'horário')),
            h('p', { className: 'section-sub' }, 'Simples, rápido e sem precisar ligar. Escolha o procedimento, a data e o horário ideal para você.')
          ),
          h('div', { className: 'booking-panel anim-fade-up' },
            h(BookingFlow, { user, onLoginRequest: () => setShowAuth(true) })
          )
        )
      ),

      /* Why us section */
      h('section', { className: 'section', style: { background: 'var(--rose-pale)', textAlign: 'center' } },
        h('div', { className: 'section-inner' },
          h('div', { className: 'section-header', style: { marginBottom: '40px' } },
            h('p', { className: 'section-label' }, '✦ Por que nos escolher'),
            h('h2', { className: 'section-title' }, 'Uma experiência ', h('em', null, 'única'))
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '24px' } },
            [
              { icon: '💎', title: 'Atendimento Exclusivo', desc: 'Atendimento individual e personalizado com atenção total à sua necessidade.' },
              { icon: '✨', title: 'Produtos Premium',       desc: 'Utilizamos apenas os melhores produtos capilares disponíveis no mercado.' },
              { icon: '🌸', title: 'Resultado Garantido',    desc: 'Técnica refinada e anos de experiência para resultados que encantam.' },
              { icon: '📱', title: 'Agendamento Fácil',      desc: 'Reserve seu horário online em minutos, sem complicação.' },
            ].map(item =>
              h('div', {
                key: item.title,
                style: { background: '#fff', borderRadius: '20px', padding: '32px 24px', border: '1px solid var(--border)' },
              },
                h('div', { style: { fontSize: '2.2rem', marginBottom: '16px' } }, item.icon),
                h('div', { style: { fontFamily: 'var(--font-serif)', fontSize: '1.15rem', marginBottom: '10px', color: 'var(--text-dark)' } }, item.title),
                h('div', { style: { fontSize: '.84rem', color: 'var(--text-mid)', lineHeight: 1.7 } }, item.desc)
              )
            )
          )
        )
      ),

      /* Footer */
      h('footer', null,
        h('div', { className: 'footer-brand' }, 'Jacy ', h('em', null, 'Salão')),
        h('div', { className: 'footer-tagline' }, 'Beleza Capilar de Luxo'),
        h('div', { className: 'footer-copy' }, `© ${new Date().getFullYear()} Jacy Salão · Todos os direitos reservados`)
      )
    ),

    /* ── AUTH MODAL ── */
    showAuth && h(AuthModal, { onClose: () => setShowAuth(false) }),

    /* ── TOASTS ── */
    h(ToastContainer)
  );
}

/* ══════════════════════════════════════════
   MOUNT
   ══════════════════════════════════════════ */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(h(App));