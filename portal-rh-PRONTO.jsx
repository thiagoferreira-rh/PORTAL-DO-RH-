import { useState, useEffect, useCallback } from "react";

// ── SUPABASE CONFIG ────────────────────────────────────────────────────────────
// ⚠️  SUBSTITUA pelos seus dados do Supabase:
//     Dashboard → Settings → API → Project URL e anon key
const SUPABASE_URL = "https://ntxjkvuuklbmncvymucx.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_DQuCdmnQiNJOLfhQ8KyckA_XP2kAjwI";

// Cliente Supabase simples (sem instalar biblioteca)
const supabase = {
  _url: SUPABASE_URL,
  _key: SUPABASE_ANON_KEY,
  _session: null,

  async signIn(email, password) {
    const res = await fetch(`${this._url}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: this._key },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.access_token) {
      this._session = data;
      localStorage.setItem("rh_session", JSON.stringify(data));
    }
    return data;
  },

  async signOut() {
    if (this._session?.access_token) {
      await fetch(`${this._url}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: this._key, Authorization: `Bearer ${this._session.access_token}` },
      });
    }
    this._session = null;
    localStorage.removeItem("rh_session");
  },

  getSession() {
    if (this._session) return this._session;
    const saved = localStorage.getItem("rh_session");
    if (saved) {
      this._session = JSON.parse(saved);
      return this._session;
    }
    return null;
  },

  // Busca perfil do usuário na tabela user_profiles
  async getProfile(userId) {
    const session = this.getSession();
    const res = await fetch(
      `${this._url}/rest/v1/user_profiles?user_id=eq.${userId}&select=*`,
      {
        headers: {
          apikey: this._key,
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "application/json",
        },
      }
    );
    const data = await res.json();
    return data?.[0] || null;
  },

  // Documentos
  async listDocuments() {
    const session = this.getSession();
    const res = await fetch(`${this._url}/rest/v1/rh_documents?select=*&order=created_at.desc`, {
      headers: {
        apikey: this._key,
        Authorization: `Bearer ${session?.access_token}`,
      },
    });
    return res.json();
  },

  async uploadDocument(file, metadata) {
    const session = this.getSession();
    const filename = `${Date.now()}_${file.name}`;
    // Upload no Storage
    const storageRes = await fetch(
      `${this._url}/storage/v1/object/rh-documents/${filename}`,
      {
        method: "POST",
        headers: {
          apikey: this._key,
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": file.type,
        },
        body: file,
      }
    );
    if (!storageRes.ok) throw new Error("Falha no upload do arquivo");

    const publicUrl = `${this._url}/storage/v1/object/public/rh-documents/${filename}`;

    // Salva metadados na tabela
    const metaRes = await fetch(`${this._url}/rest/v1/rh_documents`, {
      method: "POST",
      headers: {
        apikey: this._key,
        Authorization: `Bearer ${session?.access_token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        titulo: metadata.titulo,
        categoria: metadata.categoria,
        tipo: metadata.tipo,
        desc: metadata.desc,
        filename,
        url: publicUrl,
        size: file.size,
        mime_type: file.type,
        uploaded_by: session?.user?.email,
      }),
    });
    return metaRes.json();
  },

  async deleteDocument(id, filename) {
    const session = this.getSession();
    // Remove do storage
    await fetch(`${this._url}/storage/v1/object/rh-documents/${filename}`, {
      method: "DELETE",
      headers: { apikey: this._key, Authorization: `Bearer ${session?.access_token}` },
    });
    // Remove da tabela
    await fetch(`${this._url}/rest/v1/rh_documents?id=eq.${id}`, {
      method: "DELETE",
      headers: { apikey: this._key, Authorization: `Bearer ${session?.access_token}` },
    });
  },
};

// ── PALETA & TEMA ──────────────────────────────────────────────────────────────
const theme = {
  bg: "#0A0C10",
  surface: "#111318",
  surfaceHover: "#1A1D25",
  border: "#1E2130",
  borderLight: "#252840",
  accent: "#4F6EF7",
  accentHover: "#6B85FF",
  accentSoft: "rgba(79,110,247,0.12)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.12)",
  yellow: "#F59E0B",
  yellowSoft: "rgba(245,158,11,0.12)",
  red: "#EF4444",
  redSoft: "rgba(239,68,68,0.12)",
  orange: "#F97316",
  orangeSoft: "rgba(249,115,22,0.12)",
  textPrimary: "#F1F3F9",
  textSecondary: "#8B91A8",
  textMuted: "#4A5068",
};

// ── ESTILOS GLOBAIS ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      background: ${theme.bg};
      color: ${theme.textPrimary};
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      line-height: 1.6;
      overflow-x: hidden;
    }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: ${theme.bg}; }
    ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 2px; }

    .syne { font-family: 'Syne', sans-serif; }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .animate-in { animation: fadeIn 0.35s ease forwards; }
    .spin { animation: spin 0.8s linear infinite; }

    .badge {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 2px 10px; border-radius: 99px;
      font-size: 11px; font-weight: 500; letter-spacing: 0.02em;
    }
    .badge-green { background: ${theme.greenSoft}; color: ${theme.green}; }
    .badge-red { background: ${theme.redSoft}; color: ${theme.red}; }
    .badge-yellow { background: ${theme.yellowSoft}; color: ${theme.yellow}; }
    .badge-orange { background: ${theme.orangeSoft}; color: ${theme.orange}; }
    .badge-blue { background: ${theme.accentSoft}; color: ${theme.accent}; }
    .badge-gray { background: rgba(139,145,168,0.1); color: ${theme.textSecondary}; }

    input, select, textarea {
      background: ${theme.bg};
      border: 1px solid ${theme.border};
      color: ${theme.textPrimary};
      border-radius: 8px;
      padding: 9px 13px;
      font-family: 'DM Sans', sans-serif;
      font-size: 14px;
      width: 100%;
      outline: none;
      transition: border-color 0.2s;
    }
    input:focus, select:focus, textarea:focus { border-color: ${theme.accent}; }
    input::placeholder, textarea::placeholder { color: ${theme.textMuted}; }
    select option { background: ${theme.surface}; }

    table { width: 100%; border-collapse: collapse; }
    th {
      text-align: left; padding: 10px 14px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${theme.textMuted}; border-bottom: 1px solid ${theme.border};
    }
    td { padding: 12px 14px; border-bottom: 1px solid ${theme.border}; color: ${theme.textSecondary}; font-size: 13px; }
    tr:hover td { background: ${theme.surfaceHover}; color: ${theme.textPrimary}; }
    tr:last-child td { border-bottom: none; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 8px; border: none;
      font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.18s; white-space: nowrap;
    }
    .btn-primary { background: ${theme.accent}; color: #fff; }
    .btn-primary:hover { background: ${theme.accentHover}; transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${theme.textSecondary}; border: 1px solid ${theme.border}; }
    .btn-ghost:hover { background: ${theme.surfaceHover}; color: ${theme.textPrimary}; }
    .btn-danger { background: ${theme.redSoft}; color: ${theme.red}; border: none; }
    .btn-success { background: ${theme.greenSoft}; color: ${theme.green}; border: none; }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

    .card {
      background: ${theme.surface};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 20px;
    }

    .modal-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 20px;
    }
    .modal-box {
      background: ${theme.surface};
      border: 1px solid ${theme.borderLight};
      border-radius: 16px;
      padding: 28px;
      width: 100%; max-width: 560px;
      max-height: 90vh; overflow-y: auto;
      animation: fadeIn 0.25s ease;
    }

    .progress-bar { height: 4px; background: ${theme.border}; border-radius: 99px; overflow: hidden; }
    .progress-fill {
      height: 100%; border-radius: 99px;
      background: linear-gradient(90deg, ${theme.accent}, #7C3AED);
      transition: width 0.6s ease;
    }

    .stat-card {
      background: ${theme.surface};
      border: 1px solid ${theme.border};
      border-radius: 12px;
      padding: 18px 20px;
      transition: border-color 0.2s;
    }
    .stat-card:hover { border-color: ${theme.borderLight}; }

    .sidebar-item {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 8px;
      cursor: pointer; transition: all 0.15s;
      color: ${theme.textSecondary}; font-size: 13px; font-weight: 500;
      white-space: nowrap;
    }
    .sidebar-item:hover { background: ${theme.surfaceHover}; color: ${theme.textPrimary}; }
    .sidebar-item.active { background: ${theme.accentSoft}; color: ${theme.accent}; }

    .form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .form-label { font-size: 12px; font-weight: 500; color: ${theme.textSecondary}; letter-spacing: 0.03em; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr; } }

    .tag {
      display: inline-flex; align-items: center;
      padding: 3px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 500;
      background: ${theme.accentSoft}; color: ${theme.accent};
    }

    .divider { height: 1px; background: ${theme.border}; margin: 20px 0; }

    .kanban-col {
      background: ${theme.surface}; border: 1px solid ${theme.border};
      border-radius: 12px; padding: 16px; min-width: 220px; flex: 1;
    }
    .kanban-card {
      background: ${theme.bg}; border: 1px solid ${theme.border};
      border-radius: 10px; padding: 14px; margin-top: 10px;
      transition: border-color 0.2s; cursor: pointer;
    }
    .kanban-card:hover { border-color: ${theme.accent}; }

    .dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; }
    .dot-green { background: ${theme.green}; }
    .dot-red { background: ${theme.red}; }
    .dot-yellow { background: ${theme.yellow}; }
    .dot-blue { background: ${theme.accent}; }
    .dot-gray { background: ${theme.textMuted}; }

    .drop-zone {
      border: 2px dashed ${theme.border};
      border-radius: 12px;
      padding: 32px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .drop-zone:hover, .drop-zone.drag-over {
      border-color: ${theme.accent};
      background: ${theme.accentSoft};
    }

    /* LOGIN */
    .login-wrap {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: ${theme.bg};
      background-image:
        radial-gradient(ellipse 80% 50% at 50% -20%, rgba(79,110,247,0.15), transparent),
        radial-gradient(ellipse 60% 40% at 80% 80%, rgba(124,58,237,0.08), transparent);
    }
    .login-card {
      background: ${theme.surface};
      border: 1px solid ${theme.borderLight};
      border-radius: 20px;
      padding: 40px;
      width: 100%; max-width: 400px;
      animation: fadeIn 0.4s ease;
    }
  `}</style>
);

// ── DADOS MOCK ─────────────────────────────────────────────────────────────────
const mockColaboradores = [
  { id: 1, nome: "Ana Paula Ferreira", cargo: "Analista de RH", setor: "RH", status: "Ativo", admissao: "2023-03-15", salario: 4800, tipo: "CLT", gestor: "Alessandra Lima" },
  { id: 2, nome: "Carlos Eduardo Souza", cargo: "Coordenador Comercial", setor: "Comercial", status: "Ativo", admissao: "2022-07-01", salario: 7200, tipo: "CLT", gestor: "Anderson Costa" },
  { id: 3, nome: "Mariana Oliveira", cargo: "Estagiária Adm", setor: "Administrativo", status: "Ativo", admissao: "2024-01-10", salario: 1200, tipo: "Estágio", gestor: "Emily Santos" },
  { id: 4, nome: "Roberto Almeida", cargo: "Técnico de TI", setor: "Tecnologia", status: "Férias", admissao: "2021-11-20", salario: 5500, tipo: "CLT", gestor: "Anderson Costa" },
  { id: 5, nome: "Fernanda Costa", cargo: "Assistente Financeiro", setor: "Financeiro", status: "Ativo", admissao: "2023-09-05", salario: 3800, tipo: "CLT", gestor: "Alessandra Lima" },
];

const mockContratos = [
  { id: 1, nome: "Limpeza Predial — CleanMax", fornecedor: "CleanMax Serviços", categoria: "Facilities", valor: 3200, inicio: "2024-01-01", vencimento: "2025-01-01", status: "Ativo", pagamento: "Boleto", responsavel: "Kleyton Souza" },
  { id: 2, nome: "Software CRM — Salesforce", fornecedor: "Salesforce Inc", categoria: "Sistema/Software", valor: 2800, inicio: "2023-06-01", vencimento: "2025-06-01", status: "Ativo", pagamento: "Cartão", responsavel: "Emily Santos" },
  { id: 3, nome: "Segurança Patrimonial — SecurPro", fornecedor: "SecurPro", categoria: "Operacional", valor: 5100, inicio: "2022-03-01", vencimento: "2024-03-01", status: "Vencido", pagamento: "TED", responsavel: "Kleyton Souza" },
  { id: 4, nome: "Contabilidade — ContaFácil", fornecedor: "ContaFácil Assessoria", categoria: "Jurídico", valor: 1900, inicio: "2023-01-01", vencimento: "2025-12-31", status: "Ativo", pagamento: "PIX", responsavel: "Alessandra Lima" },
  { id: 5, nome: "Internet Fibra — NetVeloce", fornecedor: "NetVeloce", categoria: "Facilities", valor: 890, inicio: "2024-04-01", vencimento: "2025-04-15", status: "Ativo", pagamento: "Débito", responsavel: "Kleyton Souza" },
];

const mockVagas = [
  { id: 1, titulo: "Analista de Marketing", cargo: "Analista", tipo: "Contratação", salario: 5200, motivo: "Aumento de Quadro", gestor: "Alessandra Lima", setor: "Marketing", solicitacao: "2025-04-10", status: "3️⃣ Aguardando Aprovação — Anderson", prioridade: "Alta", cienciaRH: true, aprovAlessa: true, aprovAnderson: false },
  { id: 2, titulo: "Assistente Operacional", cargo: "Assistente", tipo: "Substituição", salario: 2800, motivo: "Substituição", gestor: "Carlos Souza", setor: "Operacional", solicitacao: "2025-04-15", status: "5️⃣ Seletivo em Andamento", prioridade: "Alta", cienciaRH: true, aprovAlessa: true, aprovAnderson: true },
  { id: 3, titulo: "Coordenador de TI", cargo: "Coordenador", tipo: "Promoção", salario: 8500, motivo: "Promoção", gestor: "Anderson Costa", setor: "Tecnologia", solicitacao: "2025-05-02", status: "2️⃣ Aguardando Aprovação — Alessandra", prioridade: "Média", cienciaRH: true, aprovAlessa: false, aprovAnderson: false },
  { id: 4, titulo: "Recepcionista", cargo: "Recepcionista", tipo: "Contratação", salario: 2200, motivo: "Aumento de Quadro", gestor: "Emily Santos", setor: "Administrativo", solicitacao: "2025-05-10", status: "1️⃣ Aguardando Registro RH", prioridade: "Baixa", cienciaRH: false, aprovAlessa: false, aprovAnderson: false },
];

const mockCotacoes = [
  { id: 1, titulo: "Cadeiras ergonômicas — 10 unid", categoria: "Mobiliário", solicitante: "Emily Santos", valor1: 4800, fornecedor1: "OfficeMax", valor2: 5200, fornecedor2: "ErgoBR", valor3: 4600, fornecedor3: "MobiliaBH", valorAprovado: 4600, statusCompra: "Aprovada", statusPag: "Pago", faixa: "Médio Valor" },
  { id: 2, titulo: "Notebook Dell Inspiron — 3 unid", categoria: "TI", solicitante: "Roberto Almeida", valor1: 12500, fornecedor1: "Dell Direta", valor2: 13200, fornecedor2: "TechStore", valor3: 11900, fornecedor3: "InfoMax", valorAprovado: 11900, statusCompra: "Em Pedido", statusPag: "Pendente", faixa: "Alto Valor" },
];

const mockManutencoes = [
  { id: 1, titulo: "Manutenção Preventiva — Ar-condicionado Sala A", tipo: "Preventiva", categoria: "Ar-Condicionado", unidade: "Matriz", fornecedor: "FrioCerto", valor: 850, ultimaExec: "2025-02-10", proxima: "2025-05-10", recorrencia: "Trimestral", status: "Agendada", garantia: "90 dias" },
  { id: 2, titulo: "Reparo elétrico — Painel Térreo", tipo: "Corretiva", categoria: "Elétrica", unidade: "Matriz", fornecedor: "EletroFix", valor: 1200, ultimaExec: "2025-04-20", proxima: "2025-10-20", recorrencia: "Semestral", status: "Concluída", garantia: "6 meses" },
  { id: 3, titulo: "Pintura Fachada — Bloco B", tipo: "Preventiva", categoria: "Pintura", unidade: "Filial SP", fornecedor: "PintaBem", valor: 4500, ultimaExec: "2023-01-15", proxima: "2025-01-15", recorrencia: "Anual", status: "Atrasada", garantia: "1 ano" },
];

const onboardingEtapas = [
  { id: 1, titulo: "Boas-Vindas", icon: "👋", desc: "Carta de boas-vindas do CEO, história da empresa e primeiros passos.", tempo: 15, status: "Concluído" },
  { id: 2, titulo: "Cultura Organizacional", icon: "🏛️", desc: "Missão, visão, valores, pilares culturais e como trabalhamos.", tempo: 25, status: "Concluído" },
  { id: 3, titulo: "Regras Internas", icon: "📋", desc: "Política de ponto, dress code, uso de espaços e normas de convivência.", tempo: 20, status: "Em Andamento" },
  { id: 4, titulo: "O que pode e não pode", icon: "⚖️", desc: "Limites e responsabilidades do colaborador dentro da empresa.", tempo: 20, status: "Não Iniciado" },
  { id: 5, titulo: "Código de Ética", icon: "🤝", desc: "Princípios éticos, conflito de interesses e conduta profissional.", tempo: 30, status: "Não Iniciado" },
  { id: 6, titulo: "Compliance", icon: "🔒", desc: "Legislação aplicável, políticas antisuborno e canal de denúncias.", tempo: 35, status: "Não Iniciado" },
  { id: 7, titulo: "Segurança da Informação", icon: "🛡️", desc: "Política de dados, uso de sistemas e LGPD.", tempo: 25, status: "Não Iniciado" },
  { id: 8, titulo: "Ferramentas Utilizadas", icon: "🛠️", desc: "Sistemas, softwares e plataformas utilizadas no dia a dia.", tempo: 40, status: "Não Iniciado" },
  { id: 9, titulo: "Política de RH", icon: "👥", desc: "Benefícios, férias, avaliação de desempenho e desenvolvimento.", tempo: 30, status: "Não Iniciado" },
  { id: 10, titulo: "Benefícios", icon: "🎁", desc: "VT, VR, plano de saúde, odonto e demais benefícios.", tempo: 15, status: "Não Iniciado" },
  { id: 11, titulo: "Integração do Setor", icon: "🤝", desc: "Apresentação da equipe, processos do setor e primeiras tarefas.", tempo: 60, status: "Não Iniciado" },
  { id: 12, titulo: "Assinatura de Ciência", icon: "✍️", desc: "Assinatura eletrônica confirmando ciência de todos os documentos.", tempo: 10, status: "Não Iniciado" },
];

// ── HELPERS ────────────────────────────────────────────────────────────────────
const diasParaVencer = (dataStr) => {
  const hoje = new Date();
  const data = new Date(dataStr);
  return Math.floor((data - hoje) / (1000 * 60 * 60 * 24));
};
const statusContrato = (dias) => {
  if (dias < 0) return { label: "Vencido", cls: "badge-red", dot: "dot-red" };
  if (dias <= 30) return { label: `${dias}d`, cls: "badge-orange", dot: "dot-yellow" };
  return { label: "Ativo", cls: "badge-green", dot: "dot-green" };
};
const fmt = (v) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmtDate = (s) => { if (!s) return "—"; const [y, m, d] = s.split("-"); return `${d}/${m}/${y}`; };
const fmtSize = (bytes) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── COMPONENTES BASE ───────────────────────────────────────────────────────────
const Icon = ({ name, size = 16 }) => {
  const icons = {
    home: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z M9 22V12h6v10",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    contract: "M9 12h6 M9 16h6 M9 8h2 M19 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V5a2 2 0 00-2-2z",
    briefcase: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2",
    cart: "M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z M3 6h18 M16 10a4 4 0 01-8 0",
    tool: "M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z",
    chart: "M18 20V10 M12 20V4 M6 20v-6",
    book: "M4 19.5A2.5 2.5 0 016.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z",
    rocket: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z",
    plus: "M12 5v14 M5 12h14",
    check: "M20 6L9 17l-5-5",
    x: "M18 6L6 18 M6 6l12 12",
    alert: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z M12 9v4 M12 17h.01",
    eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z",
    logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4 M16 17l5-5-5-5 M21 12H9",
    search: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0",
    calendar: "M3 9h18 M8 2v4 M16 2v4 M3 4h18a1 1 0 011 1v16a1 1 0 01-1 1H3a1 1 0 01-1-1V5a1 1 0 011-1z",
    arrow: "M5 12h14 M12 5l7 7-7 7",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
    lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2z M7 11V7a5 5 0 0110 0v4",
    person: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2 M12 11a4 4 0 100-8 4 4 0 000 8z",
    docs: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {(icons[name] || "").split(" M").map((d, i) => (
        <path key={i} d={i === 0 ? d : "M" + d} />
      ))}
    </svg>
  );
};

const StatCard = ({ icon, label, value, sub, color = theme.accent }) => (
  <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <div style={{ padding: 8, borderRadius: 8, background: color + "18", color, width: "fit-content" }}>
      <Icon name={icon} size={18} />
    </div>
    <div>
      <div className="syne" style={{ fontSize: 26, fontWeight: 700, color: theme.textPrimary, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 2 }}>{sub}</div>}
    </div>
  </div>
);

const SectionHeader = ({ title, sub, action }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
    <div>
      <h2 className="syne" style={{ fontSize: 18, fontWeight: 700, color: theme.textPrimary }}>{title}</h2>
      {sub && <p style={{ color: theme.textMuted, fontSize: 13, marginTop: 3 }}>{sub}</p>}
    </div>
    {action}
  </div>
);

// ── TELA DE LOGIN ──────────────────────────────────────────────────────────────
const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    setLoading(true);
    setError("");
    try {
      const data = await supabase.signIn(email, password);
      if (data.access_token) {
        // Busca o perfil para saber o role
        const profile = await supabase.getProfile(data.user.id);
        onLogin({ ...data.user, role: profile?.role || "colaborador", nome: profile?.nome || data.user.email });
      } else {
        setError(data.error_description || data.msg || "E-mail ou senha incorretos.");
      }
    } catch {
      setError("Erro ao conectar. Verifique sua conexão.");
    }
    setLoading(false);
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 48, height: 48, background: theme.accent, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
            <Icon name="shield" size={24} />
          </div>
          <div className="syne" style={{ fontSize: 20, fontWeight: 800, color: theme.textPrimary }}>PORTAL RH</div>
          <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 4 }}>& ADMINISTRAÇÃO</div>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">E-mail corporativo</label>
            <input
              type="email"
              placeholder="seu@empresa.com.br"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group" style={{ marginBottom: 6 }}>
            <label className="form-label">Senha</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div style={{ background: theme.redSoft, color: theme.red, borderRadius: 8, padding: "10px 14px", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="alert" size={14} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 10, padding: "11px 16px", fontSize: 14 }}
            disabled={loading}
          >
            {loading ? <span className="spin" style={{ display: "inline-block" }}>⟳</span> : <Icon name="lock" size={16} />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div style={{ marginTop: 24, padding: 16, background: theme.bg, borderRadius: 10, border: `1px solid ${theme.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: theme.textMuted, marginBottom: 10, letterSpacing: "0.06em" }}>NÍVEIS DE ACESSO</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textSecondary }}>
              <span className="badge badge-blue" style={{ fontSize: 10 }}>RH</span>
              Portal Interno + Portal do Colaborador
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: theme.textSecondary }}>
              <span className="badge badge-green" style={{ fontSize: 10 }}>Colaborador</span>
              Apenas Portal do Colaborador
            </div>
          </div>
        </div>

        {/* Instrução Supabase */}
        <div style={{ marginTop: 16, fontSize: 11, color: theme.textMuted, textAlign: "center", lineHeight: 1.6 }}>
          Configure seu Supabase URL e chave no topo do arquivo
        </div>
      </div>
    </div>
  );
};

// ── MÓDULO DOCUMENTOS ──────────────────────────────────────────────────────────
const Documentos = ({ isRH }) => {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({ titulo: "", categoria: "Contrato", tipo: "Modelo", desc: "" });
  const [msg, setMsg] = useState(null);

  const categorias = ["Todos", "Contrato", "Holerite", "Admissão", "Rescisão", "Benefícios", "Política"];
  const tipoBadge = { Modelo: "badge-blue", Preenchido: "badge-green", Política: "badge-orange", Formulário: "badge-yellow" };

  const loadDocs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await supabase.listDocuments();
      setDocs(Array.isArray(data) ? data : []);
    } catch {
      setMsg({ type: "error", text: "Erro ao carregar documentos." });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedFile(file); setShowForm(true); }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file) { setSelectedFile(file); setShowForm(true); }
  };

  const handleUpload = async () => {
    if (!selectedFile || !form.titulo) { setMsg({ type: "error", text: "Preencha o título e selecione um arquivo." }); return; }
    setUploading(true);
    try {
      await supabase.uploadDocument(selectedFile, form);
      setMsg({ type: "success", text: "Documento enviado com sucesso!" });
      setShowForm(false);
      setSelectedFile(null);
      setForm({ titulo: "", categoria: "Contrato", tipo: "Modelo", desc: "" });
      await loadDocs();
    } catch (err) {
      setMsg({ type: "error", text: err.message || "Erro no upload." });
    }
    setUploading(false);
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Excluir "${doc.titulo}"?`)) return;
    try {
      await supabase.deleteDocument(doc.id, doc.filename);
      setDocs(docs.filter(d => d.id !== doc.id));
      setMsg({ type: "success", text: "Documento excluído." });
    } catch {
      setMsg({ type: "error", text: "Erro ao excluir." });
    }
  };

  const handleDownload = (doc) => {
    const a = document.createElement("a");
    a.href = doc.url;
    a.download = doc.filename || doc.titulo;
    a.target = "_blank";
    a.click();
  };

  const filtered = filtro === "Todos" ? docs : docs.filter(d => d.categoria === filtro);

  const fileIcon = (mime) => {
    if (!mime) return "📄";
    if (mime.includes("pdf")) return "📕";
    if (mime.includes("word") || mime.includes("doc")) return "📘";
    if (mime.includes("sheet") || mime.includes("excel") || mime.includes("xls")) return "📗";
    if (mime.includes("image")) return "🖼️";
    return "📄";
  };

  return (
    <div className="animate-in">
      <SectionHeader
        title="Documentos de RH"
        sub="Modelos de contratos, holerites e documentos de admissão"
        action={isRH && (
          <label className="btn btn-primary" style={{ cursor: "pointer" }}>
            <Icon name="upload" size={14} /> Enviar Documento
            <input type="file" style={{ display: "none" }} accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" onChange={handleFileInput} />
          </label>
        )}
      />

      {/* Notificação */}
      {msg && (
        <div style={{ background: msg.type === "success" ? theme.greenSoft : theme.redSoft, color: msg.type === "success" ? theme.green : theme.red, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13 }}>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit" }}><Icon name="x" size={14} /></button>
        </div>
      )}

      {/* Drop Zone — só para RH */}
      {isRH && (
        <div
          className={`drop-zone ${dragOver ? "drag-over" : ""}`}
          style={{ marginBottom: 20 }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
          <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: 4 }}>Arraste arquivos aqui</div>
          <div style={{ fontSize: 12, color: theme.textMuted }}>PDF, Word, Excel — até 50 MB</div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {categorias.map(c => (
          <button key={c} className={`btn ${filtro === c ? "btn-primary" : "btn-ghost"}`} style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setFiltro(c)}>{c}</button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: theme.textMuted }}>
          <div className="spin" style={{ display: "inline-block", fontSize: 24, marginBottom: 12 }}>⟳</div>
          <div>Carregando documentos...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, color: theme.textPrimary, marginBottom: 6 }}>Nenhum documento encontrado</div>
          <div style={{ fontSize: 13, color: theme.textMuted }}>
            {isRH ? "Envie o primeiro documento usando o botão acima ou arrastando um arquivo." : "Aguarde o RH publicar documentos."}
          </div>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Tipo</th>
                <th>Enviado por</th>
                <th>Tamanho</th>
                <th>Data</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(doc => (
                <tr key={doc.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>{fileIcon(doc.mime_type)}</span>
                      <div>
                        <div style={{ fontWeight: 500, color: theme.textPrimary, fontSize: 13 }}>{doc.titulo}</div>
                        {doc.desc && <div style={{ fontSize: 11, color: theme.textMuted }}>{doc.desc}</div>}
                      </div>
                    </div>
                  </td>
                  <td><span className="tag" style={{ fontSize: 11 }}>{doc.categoria}</span></td>
                  <td><span className={`badge ${tipoBadge[doc.tipo] || "badge-gray"}`}>{doc.tipo}</span></td>
                  <td style={{ fontSize: 12 }}>{doc.uploaded_by}</td>
                  <td style={{ fontSize: 12 }}>{fmtSize(doc.size)}</td>
                  <td style={{ fontSize: 12 }}>{doc.created_at ? fmtDate(doc.created_at.split("T")[0]) : "—"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="btn btn-ghost" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleDownload(doc)}>
                        <Icon name="download" size={12} /> Baixar
                      </button>
                      {isRH && (
                        <button className="btn btn-danger" style={{ padding: "4px 10px", fontSize: 11 }} onClick={() => handleDelete(doc)}>
                          <Icon name="trash" size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de upload */}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Enviar Documento</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => { setShowForm(false); setSelectedFile(null); }}><Icon name="x" size={14} /></button>
            </div>

            {selectedFile && (
              <div style={{ background: theme.bg, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 24 }}>{fileIcon(selectedFile.type)}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: theme.textPrimary }}>{selectedFile.name}</div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{fmtSize(selectedFile.size)}</div>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Título do Documento *</label>
              <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Contrato de Trabalho — Modelo CLT" />
            </div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {["Contrato", "Holerite", "Admissão", "Rescisão", "Benefícios", "Política", "Outros"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}>
                  {["Modelo", "Preenchido", "Política", "Formulário"].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descrição</label>
              <input value={form.desc} onChange={e => setForm({ ...form, desc: e.target.value })} placeholder="Breve descrição do documento" />
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => { setShowForm(false); setSelectedFile(null); }}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? <span className="spin" style={{ display: "inline-block" }}>⟳</span> : <Icon name="upload" size={14} />}
                {uploading ? "Enviando..." : "Enviar Documento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── MÓDULOS (mantidos do original) ────────────────────────────────────────────

const Dashboard = () => {
  const ativos = mockColaboradores.filter(c => c.status === "Ativo").length;
  const contratosAtivos = mockContratos.filter(c => c.status === "Ativo").length;
  const vagasAbertas = mockVagas.filter(v => !v.status.includes("Concluída")).length;
  const manutAtraso = mockManutencoes.filter(m => m.status === "Atrasada").length;
  const custoMensal = mockContratos.filter(c => c.status === "Ativo").reduce((a, c) => a + c.valor, 0);
  const onbProgresso = Math.round((onboardingEtapas.filter(e => e.status === "Concluído").length / onboardingEtapas.length) * 100);

  return (
    <div className="animate-in">
      <div style={{ marginBottom: 28, padding: "24px 28px", borderRadius: 16, background: `linear-gradient(135deg, ${theme.accent}22, ${theme.bg})`, border: `1px solid ${theme.accent}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ padding: 10, borderRadius: 10, background: theme.accentSoft, color: theme.accent }}><Icon name="chart" size={20} /></div>
          <div>
            <h1 className="syne" style={{ fontSize: 22, fontWeight: 800 }}>Dashboard Executivo</h1>
            <p style={{ color: theme.textMuted, fontSize: 13 }}>Portal Corporativo RH & Administração • Atualizado agora</p>
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 28 }}>
        <StatCard icon="users" label="Colaboradores Ativos" value={ativos} sub="↑ 2 este mês" color={theme.accent} />
        <StatCard icon="contract" label="Contratos Ativos" value={contratosAtivos} sub={`${fmt(custoMensal)}/mês`} color={theme.green} />
        <StatCard icon="briefcase" label="Vagas em Aberto" value={vagasAbertas} sub="2 aguardando aprovação" color={theme.yellow} />
        <StatCard icon="tool" label="Manutenções Atrasadas" value={manutAtraso} sub="Ação necessária" color={theme.red} />
        <StatCard icon="rocket" label="Onboarding Ativo" value="1" sub={`${onbProgresso}% concluído`} color="#7C3AED" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <SectionHeader title="Vagas Recentes" sub="Fluxo de aprovação" />
          {mockVagas.slice(0, 3).map(v => (
            <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
              <div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{v.titulo}</div>
                <div style={{ fontSize: 11, color: theme.textMuted }}>{v.setor} • {fmt(v.salario)}</div>
              </div>
              <span className={`badge ${v.aprovAnderson ? "badge-green" : v.aprovAlessa ? "badge-yellow" : "badge-gray"}`}>
                {v.aprovAnderson ? "Aprovada" : v.aprovAlessa ? "Dir. ✓" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
        <div className="card">
          <SectionHeader title="Alertas de Contratos" sub="Vencimentos próximos e vencidos" />
          {mockContratos.map(c => {
            const dias = diasParaVencer(c.vencimento);
            const st = statusContrato(dias);
            if (dias > 60) return null;
            return (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${theme.border}` }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{c.nome}</div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{fmtDate(c.vencimento)} • {fmt(c.valor)}/mês</div>
                </div>
                <span className={`badge ${st.cls}`}>{dias < 0 ? "Vencido" : `${dias}d`}</span>
              </div>
            );
          }).filter(Boolean)}
        </div>
      </div>
      <div className="card">
        <SectionHeader title="Progresso de Onboarding" sub="Colaboradores em integração" />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 13 }}>Ana Paula Ferreira — Integração Inicial</span>
            <span style={{ fontSize: 13, color: theme.accent, fontWeight: 600 }}>{onbProgresso}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${onbProgresso}%` }} /></div>
          <div style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>
            {onboardingEtapas.filter(e => e.status === "Concluído").length} de {onboardingEtapas.length} etapas concluídas
          </div>
        </div>
      </div>
    </div>
  );
};

const Colaboradores = () => {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [colaboradores, setColaboradores] = useState(mockColaboradores);
  const [form, setForm] = useState({ nome: "", cargo: "", setor: "", status: "Ativo", tipo: "CLT", admissao: "", salario: "" });
  const filtered = colaboradores.filter(c => c.nome.toLowerCase().includes(search.toLowerCase()) || c.cargo.toLowerCase().includes(search.toLowerCase()));
  const handleAdd = () => {
    if (!form.nome) return;
    setColaboradores([...colaboradores, { ...form, id: Date.now(), salario: Number(form.salario), gestor: "—" }]);
    setForm({ nome: "", cargo: "", setor: "", status: "Ativo", tipo: "CLT", admissao: "", salario: "" });
    setShowForm(false);
  };
  const statusBadge = (s) => ({ Ativo: "badge-green", Férias: "badge-blue", Afastado: "badge-yellow", Desligado: "badge-red" }[s] || "badge-gray");
  return (
    <div className="animate-in">
      <SectionHeader title="Colaboradores" sub={`${filtered.length} colaboradores cadastrados`} action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> Novo Colaborador</button>} />
      <div className="card">
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: theme.textMuted }}><Icon name="search" size={14} /></span>
            <input style={{ paddingLeft: 32 }} placeholder="Buscar colaborador..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
        <table>
          <thead><tr><th>Colaborador</th><th>Cargo</th><th>Setor</th><th>Tipo</th><th>Admissão</th><th>Salário</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: theme.accentSoft, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>
                      {c.nome.split(" ").map(n => n[0]).slice(0, 2).join("")}
                    </div>
                    <div>
                      <div style={{ fontWeight: 500, color: theme.textPrimary, fontSize: 13 }}>{c.nome}</div>
                      <div style={{ fontSize: 11, color: theme.textMuted }}>{c.gestor}</div>
                    </div>
                  </div>
                </td>
                <td>{c.cargo}</td><td>{c.setor}</td>
                <td><span className="tag">{c.tipo}</span></td>
                <td>{fmtDate(c.admissao)}</td>
                <td style={{ color: theme.green }}>{fmt(c.salario)}</td>
                <td><span className={`badge ${statusBadge(c.status)}`}><span className={`dot ${c.status === "Ativo" ? "dot-green" : "dot-gray"}`} /> {c.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Novo Colaborador</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Nome Completo *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome do colaborador" /></div>
              <div className="form-group"><label className="form-label">Cargo</label><input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Setor</label><input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>CLT</option><option>Estágio</option><option>PJ</option><option>Autônomo</option></select></div>
              <div className="form-group"><label className="form-label">Status</label><select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option>Ativo</option><option>Férias</option><option>Afastado</option><option>Desligado</option></select></div>
              <div className="form-group"><label className="form-label">Admissão</label><input type="date" value={form.admissao} onChange={e => setForm({ ...form, admissao: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Salário (R$)</label><input type="number" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><Icon name="check" size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Contratos = () => {
  const [contratos, setContratos] = useState(mockContratos);
  const [showForm, setShowForm] = useState(false);
  const [filtro, setFiltro] = useState("Todos");
  const [form, setForm] = useState({ nome: "", fornecedor: "", categoria: "Facilities", valor: "", inicio: "", vencimento: "", status: "Ativo", pagamento: "Boleto", responsavel: "" });
  const filtered = contratos.filter(c => filtro === "Todos" ? true : c.status === filtro);
  const handleAdd = () => {
    if (!form.nome) return;
    setContratos([...contratos, { ...form, id: Date.now(), valor: Number(form.valor) }]);
    setShowForm(false);
    setForm({ nome: "", fornecedor: "", categoria: "Facilities", valor: "", inicio: "", vencimento: "", status: "Ativo", pagamento: "Boleto", responsavel: "" });
  };
  return (
    <div className="animate-in">
      <SectionHeader title="Contratos Ativos" sub="Gestão de contratos com fornecedores e prestadores" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> Novo Contrato</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard icon="contract" label="Total Ativos" value={contratos.filter(c => c.status === "Ativo").length} color={theme.green} />
        <StatCard icon="alert" label="Vencidos" value={contratos.filter(c => c.status === "Vencido").length} color={theme.red} />
        <StatCard icon="calendar" label="Vencendo (30d)" value={contratos.filter(c => { const d = diasParaVencer(c.vencimento); return d >= 0 && d <= 30; }).length} color={theme.yellow} />
        <StatCard icon="chart" label="Custo Mensal" value={fmt(contratos.filter(c => c.status === "Ativo").reduce((a, c) => a + c.valor, 0))} color={theme.accent} />
      </div>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["Todos", "Ativo", "Vencido", "Inativo"].map(f => (
            <button key={f} className={`btn ${filtro === f ? "btn-primary" : "btn-ghost"}`} style={{ padding: "6px 14px", fontSize: 12 }} onClick={() => setFiltro(f)}>{f}</button>
          ))}
        </div>
        <table>
          <thead><tr><th>Contrato</th><th>Fornecedor</th><th>Categoria</th><th>Valor/mês</th><th>Vencimento</th><th>Dias</th><th>Responsável</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(c => {
              const dias = diasParaVencer(c.vencimento);
              const st = statusContrato(dias);
              return (
                <tr key={c.id}>
                  <td style={{ color: theme.textPrimary, fontWeight: 500 }}>{c.nome}</td>
                  <td>{c.fornecedor}</td>
                  <td><span className="tag" style={{ fontSize: 11 }}>{c.categoria}</span></td>
                  <td style={{ color: theme.green }}>{fmt(c.valor)}</td>
                  <td>{fmtDate(c.vencimento)}</td>
                  <td><span className={`badge ${st.cls}`}>{dias < 0 ? `${Math.abs(dias)}d atraso` : `${dias}d`}</span></td>
                  <td>{c.responsavel}</td>
                  <td><span className={`badge ${st.cls}`}><span className={`dot ${st.dot}`} /> {c.status === "Ativo" && dias < 0 ? "Vencido" : c.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Novo Contrato</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Nome do Contrato *</label><input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Limpeza Predial — CleanMax" /></div>
              <div className="form-group"><label className="form-label">Fornecedor</label><input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Categoria</label>
                <select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>
                  {["Prestador", "Facilities", "Sistema/Software", "Fornecedor", "Operacional", "Jurídico", "Seguro", "Manutenção"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Valor Mensal (R$)</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Pagamento</label>
                <select value={form.pagamento} onChange={e => setForm({ ...form, pagamento: e.target.value })}>
                  {["Boleto", "PIX", "TED", "Cartão", "Débito"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Data de Início</label><input type="date" value={form.inicio} onChange={e => setForm({ ...form, inicio: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Data de Vencimento</label><input type="date" value={form.vencimento} onChange={e => setForm({ ...form, vencimento: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Responsável Interno</label><input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} /></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><Icon name="check" size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Vagas = () => {
  const [vagas, setVagas] = useState(mockVagas);
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ titulo: "", cargo: "", tipo: "Contratação", salario: "", motivo: "Aumento de Quadro", gestor: "", setor: "", prioridade: "Média" });
  const aprovar = (id, nivel) => {
    setVagas(vagas.map(v => {
      if (v.id !== id) return v;
      const u = { ...v };
      if (nivel === "rh") { u.cienciaRH = true; u.status = "2️⃣ Aguardando Aprovação — Alessandra"; }
      if (nivel === "alessa") { u.aprovAlessa = true; u.status = "3️⃣ Aguardando Aprovação — Anderson"; }
      if (nivel === "anderson") { u.aprovAnderson = true; u.status = "4️⃣ Aprovada — Iniciar Recrutamento"; }
      if (nivel === "seletivo") { u.status = "5️⃣ Seletivo em Andamento"; }
      return u;
    }));
    setSelected(null);
  };
  const handleAdd = () => {
    if (!form.titulo) return;
    setVagas([...vagas, { ...form, id: Date.now(), salario: Number(form.salario), solicitacao: new Date().toISOString().split("T")[0], status: "1️⃣ Aguardando Registro RH", cienciaRH: false, aprovAlessa: false, aprovAnderson: false }]);
    setShowForm(false);
    setForm({ titulo: "", cargo: "", tipo: "Contratação", salario: "", motivo: "Aumento de Quadro", gestor: "", setor: "", prioridade: "Média" });
  };
  const grupos = {
    "1️⃣ Aguardando Registro RH": vagas.filter(v => v.status === "1️⃣ Aguardando Registro RH"),
    "2️⃣ Aguardando Aprovação — Alessandra": vagas.filter(v => v.status === "2️⃣ Aguardando Aprovação — Alessandra"),
    "3️⃣ Aguardando Aprovação — Anderson": vagas.filter(v => v.status === "3️⃣ Aguardando Aprovação — Anderson"),
    "4️⃣ Aprovada": vagas.filter(v => v.status === "4️⃣ Aprovada — Iniciar Recrutamento"),
    "5️⃣ Seletivo": vagas.filter(v => v.status === "5️⃣ Seletivo em Andamento"),
  };
  const priorColor = { Alta: theme.red, Média: theme.yellow, Baixa: theme.green };
  return (
    <div className="animate-in">
      <SectionHeader title="Vagas & Contratações" sub="Fluxo completo de aprovação de vagas" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> Nova Vaga</button>} />
      <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8 }}>
        {Object.entries(grupos).map(([col, items]) => (
          <div className="kanban-col" key={col}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: theme.textSecondary }}>{col}</span>
              <span style={{ background: theme.border, borderRadius: 99, padding: "1px 7px", fontSize: 11, color: theme.textMuted }}>{items.length}</span>
            </div>
            {items.map(v => (
              <div className="kanban-card" key={v.id} onClick={() => setSelected(v)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: theme.textPrimary }}>{v.titulo}</span>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: priorColor[v.prioridade], marginTop: 4, flexShrink: 0 }} />
                </div>
                <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 6 }}>{v.setor} • {v.tipo}</div>
                <div style={{ fontSize: 12, color: theme.green }}>{fmt(v.salario)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
              <div>
                <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>{selected.titulo}</h3>
                <p style={{ color: theme.textMuted, fontSize: 13 }}>{selected.setor} • {selected.tipo} • {fmt(selected.salario)}</p>
              </div>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <div style={{ background: theme.bg, borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: theme.textMuted, marginBottom: 8, fontWeight: 600, letterSpacing: "0.06em" }}>FLUXO DE APROVAÇÃO</div>
              {[{ label: "Ciência RH (Emily)", done: selected.cienciaRH, nivel: "rh" }, { label: "Aprovação Alessandra", done: selected.aprovAlessa, nivel: "alessa" }, { label: "Aprovação Anderson", done: selected.aprovAnderson, nivel: "anderson" }].map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${theme.border}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: step.done ? theme.greenSoft : theme.border, color: step.done ? theme.green : theme.textMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {step.done ? <Icon name="check" size={12} /> : <span style={{ fontSize: 11 }}>{i + 1}</span>}
                    </div>
                    <span style={{ fontSize: 13 }}>{step.label}</span>
                  </div>
                  {!step.done && <button className="btn btn-success" style={{ padding: "4px 12px", fontSize: 11 }} onClick={() => aprovar(selected.id, step.nivel)}><Icon name="check" size={12} /> Aprovar</button>}
                  {step.done && <span className="badge badge-green">✓ Aprovado</span>}
                </div>
              ))}
            </div>
            {selected.aprovAnderson && !selected.status.includes("Seletivo") && (
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => aprovar(selected.id, "seletivo")}>
                <Icon name="rocket" size={14} /> Iniciar Processo Seletivo
              </button>
            )}
          </div>
        </div>
      )}
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Solicitar Nova Vaga</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1/-1" }}><label className="form-label">Título *</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Analista de Marketing" /></div>
              <div className="form-group"><label className="form-label">Cargo</label><input value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>Contratação</option><option>Promoção</option><option>Substituição</option></select></div>
              <div className="form-group"><label className="form-label">Salário (R$)</label><input type="number" value={form.salario} onChange={e => setForm({ ...form, salario: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Motivo</label><select value={form.motivo} onChange={e => setForm({ ...form, motivo: e.target.value })}><option>Aumento de Quadro</option><option>Substituição</option><option>Promoção</option></select></div>
              <div className="form-group"><label className="form-label">Setor</label><input value={form.setor} onChange={e => setForm({ ...form, setor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Gestor Solicitante</label><input value={form.gestor} onChange={e => setForm({ ...form, gestor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Prioridade</label><select value={form.prioridade} onChange={e => setForm({ ...form, prioridade: e.target.value })}><option>Alta</option><option>Média</option><option>Baixa</option></select></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><Icon name="check" size={14} /> Enviar Solicitação</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Cotacoes = () => {
  const [cotacoes, setCotacoes] = useState(mockCotacoes);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", categoria: "Materiais", solicitante: "", fornecedor1: "", valor1: "", fornecedor2: "", valor2: "", fornecedor3: "", valor3: "" });
  const handleAdd = () => {
    if (!form.titulo || !form.valor1 || !form.valor2 || !form.valor3) return;
    const vals = [Number(form.valor1), Number(form.valor2), Number(form.valor3)];
    const minVal = Math.min(...vals);
    const faixa = minVal <= 500 ? "Baixo Valor" : minVal <= 5000 ? "Médio Valor" : "Alto Valor";
    setCotacoes([...cotacoes, { ...form, id: Date.now(), valor1: vals[0], valor2: vals[1], valor3: vals[2], valorAprovado: minVal, statusCompra: "Solicitada", statusPag: "Pendente", faixa }]);
    setShowForm(false);
  };
  const faixaBadge = (f) => ({ "Baixo Valor": "badge-green", "Médio Valor": "badge-yellow", "Alto Valor": "badge-red" }[f] || "badge-gray");
  const compBadge = (s) => ({ "Aprovada": "badge-green", "Recebida": "badge-green", "Em Pedido": "badge-blue", "Solicitada": "badge-yellow" }[s] || "badge-gray");
  const pagBadge = (s) => ({ "Pago": "badge-green", "Pendente": "badge-yellow", "Atrasado": "badge-red" }[s] || "badge-gray");
  return (
    <div className="animate-in">
      <SectionHeader title="Cotações & Compras" sub="Mínimo de 3 cotações por compra" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> Nova Cotação</button>} />
      <div className="card">
        <table>
          <thead><tr><th>Compra</th><th>Categoria</th><th>Cotação 1</th><th>Cotação 2</th><th>Cotação 3</th><th>Aprovado</th><th>Faixa</th><th>Status</th><th>Pagamento</th></tr></thead>
          <tbody>
            {cotacoes.map(c => (
              <tr key={c.id}>
                <td><div style={{ fontWeight: 500, color: theme.textPrimary, fontSize: 13 }}>{c.titulo}</div><div style={{ fontSize: 11, color: theme.textMuted }}>{c.solicitante}</div></td>
                <td><span className="tag" style={{ fontSize: 11 }}>{c.categoria}</span></td>
                <td style={{ fontSize: 12 }}><div>{fmt(c.valor1)}</div><div style={{ fontSize: 10, color: theme.textMuted }}>{c.fornecedor1}</div></td>
                <td style={{ fontSize: 12 }}><div>{fmt(c.valor2)}</div><div style={{ fontSize: 10, color: theme.textMuted }}>{c.fornecedor2}</div></td>
                <td style={{ fontSize: 12 }}><div>{fmt(c.valor3)}</div><div style={{ fontSize: 10, color: theme.textMuted }}>{c.fornecedor3}</div></td>
                <td style={{ color: theme.green, fontWeight: 600 }}>{fmt(c.valorAprovado)}</td>
                <td><span className={`badge ${faixaBadge(c.faixa)}`}>{c.faixa}</span></td>
                <td><span className={`badge ${compBadge(c.statusCompra)}`}>{c.statusCompra}</span></td>
                <td><span className={`badge ${pagBadge(c.statusPag)}`}>{c.statusPag}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box" style={{ maxWidth: 620 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Nova Cotação</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-group"><label className="form-label">Título *</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Cadeiras ergonômicas — 10 unidades" /></div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-group"><label className="form-label">Categoria</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{["Materiais", "Serviços", "TI", "Infraestrutura", "RH", "Marketing", "Facilities", "Outros"].map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Solicitante</label><input value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} /></div>
            </div>
            <div className="divider" />
            <div style={{ fontSize: 12, fontWeight: 600, color: theme.textMuted, marginBottom: 12, letterSpacing: "0.06em" }}>COTAÇÕES (mínimo 3 obrigatórias)</div>
            {[1, 2, 3].map(n => (
              <div className="form-grid" key={n} style={{ marginBottom: 8 }}>
                <div className="form-group"><label className="form-label">Fornecedor {n}</label><input value={form[`fornecedor${n}`]} onChange={e => setForm({ ...form, [`fornecedor${n}`]: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Valor {n} (R$)</label><input type="number" value={form[`valor${n}`]} onChange={e => setForm({ ...form, [`valor${n}`]: e.target.value })} /></div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><Icon name="check" size={14} /> Registrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Manutencoes = () => {
  const [items, setItems] = useState(mockManutencoes);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ titulo: "", tipo: "Preventiva", categoria: "Ar-Condicionado", unidade: "Matriz", fornecedor: "", valor: "", proxima: "", recorrencia: "Trimestral", garantia: "90 dias" });
  const stBadge = (s) => ({ Agendada: "badge-blue", "Em Execução": "badge-yellow", Concluída: "badge-green", Cancelada: "badge-gray", Atrasada: "badge-red" }[s] || "badge-gray");
  const handleAdd = () => {
    if (!form.titulo) return;
    setItems([...items, { ...form, id: Date.now(), valor: Number(form.valor), ultimaExec: new Date().toISOString().split("T")[0], status: "Agendada" }]);
    setShowForm(false);
  };
  return (
    <div className="animate-in">
      <SectionHeader title="Manutenções & Facilities" sub="Gestão de manutenções preventivas e corretivas" action={<button className="btn btn-primary" onClick={() => setShowForm(true)}><Icon name="plus" size={14} /> Nova Manutenção</button>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 20 }}>
        <StatCard icon="tool" label="Agendadas" value={items.filter(i => i.status === "Agendada").length} color={theme.accent} />
        <StatCard icon="check" label="Concluídas" value={items.filter(i => i.status === "Concluída").length} color={theme.green} />
        <StatCard icon="alert" label="Atrasadas" value={items.filter(i => i.status === "Atrasada").length} color={theme.red} />
        <StatCard icon="chart" label="Custo Total" value={fmt(items.reduce((a, i) => a + (Number(i.valor) || 0), 0))} color={theme.yellow} />
      </div>
      <div className="card">
        <table>
          <thead><tr><th>Manutenção</th><th>Tipo</th><th>Categoria</th><th>Unidade</th><th>Fornecedor</th><th>Próxima</th><th>Recorrência</th><th>Valor</th><th>Status</th></tr></thead>
          <tbody>
            {items.map(m => (
              <tr key={m.id}>
                <td style={{ color: theme.textPrimary, fontWeight: 500, maxWidth: 200 }}>{m.titulo}</td>
                <td><span className={`badge ${m.tipo === "Preventiva" ? "badge-blue" : "badge-orange"}`}>{m.tipo}</span></td>
                <td>{m.categoria}</td><td>{m.unidade}</td><td>{m.fornecedor}</td>
                <td>{fmtDate(m.proxima)}</td><td>{m.recorrencia}</td>
                <td style={{ color: theme.green }}>{fmt(m.valor)}</td>
                <td><span className={`badge ${stBadge(m.status)}`}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 className="syne" style={{ fontSize: 16, fontWeight: 700 }}>Nova Manutenção</h3>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setShowForm(false)}><Icon name="x" size={14} /></button>
            </div>
            <div className="form-group"><label className="form-label">Título *</label><input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} placeholder="Ex: Preventiva AC — Sala A" /></div>
            <div className="form-grid" style={{ marginTop: 10 }}>
              <div className="form-group"><label className="form-label">Tipo</label><select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}><option>Preventiva</option><option>Corretiva</option><option>Emergencial</option></select></div>
              <div className="form-group"><label className="form-label">Categoria</label><select value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })}>{["Ar-Condicionado", "Pintura", "Elétrica", "Hidráulica", "Predial", "Equipamentos", "Facilities"].map(c => <option key={c}>{c}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Unidade</label><input value={form.unidade} onChange={e => setForm({ ...form, unidade: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Fornecedor</label><input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Valor (R$)</label><input type="number" value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Próxima Manutenção</label><input type="date" value={form.proxima} onChange={e => setForm({ ...form, proxima: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">Recorrência</label><select value={form.recorrencia} onChange={e => setForm({ ...form, recorrencia: e.target.value })}>{["Mensal", "Bimestral", "Trimestral", "Semestral", "Anual", "Sob Demanda"].map(r => <option key={r}>{r}</option>)}</select></div>
              <div className="form-group"><label className="form-label">Garantia</label><select value={form.garantia} onChange={e => setForm({ ...form, garantia: e.target.value })}>{["30 dias", "60 dias", "90 dias", "6 meses", "1 ano", "Sem garantia"].map(g => <option key={g}>{g}</option>)}</select></div>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleAdd}><Icon name="check" size={14} /> Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Onboarding = () => {
  const [etapas, setEtapas] = useState(onboardingEtapas);
  const [selected, setSelected] = useState(null);
  const concluidas = etapas.filter(e => e.status === "Concluído").length;
  const progresso = Math.round((concluidas / etapas.length) * 100);
  const avancar = (id) => {
    setEtapas(etapas.map(e => {
      if (e.id !== id) return e;
      return { ...e, status: e.status === "Não Iniciado" ? "Em Andamento" : "Concluído" };
    }));
    setSelected(null);
  };
  const stIcon = (s) => s === "Concluído" ? "✅" : s === "Em Andamento" ? "🔄" : "⏳";
  const stBadge = (s) => ({ "Concluído": "badge-green", "Em Andamento": "badge-yellow", "Não Iniciado": "badge-gray" }[s]);
  return (
    <div className="animate-in">
      <SectionHeader title="Onboarding do Colaborador" sub="Jornada de integração — Ana Paula Ferreira" />
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 600, marginBottom: 2 }}>Progresso Geral</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>{concluidas} de {etapas.length} etapas concluídas</div>
          </div>
          <div className="syne" style={{ fontSize: 28, fontWeight: 800, color: theme.accent }}>{progresso}%</div>
        </div>
        <div className="progress-bar" style={{ height: 6 }}><div className="progress-fill" style={{ width: `${progresso}%` }} /></div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {etapas.map((e, i) => (
          <div key={e.id} style={{ background: theme.surface, border: `1px solid ${e.status === "Em Andamento" ? theme.accent + "66" : theme.border}`, borderRadius: 12, padding: "14px 18px", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 14 }} onClick={() => setSelected(e)}>
            <div style={{ fontSize: 20, width: 32, textAlign: "center" }}>{stIcon(e.status)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: e.status === "Concluído" ? theme.textSecondary : theme.textPrimary }}>{i + 1}. {e.titulo}</div>
                <div style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>{e.desc.substring(0, 60)}...</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: theme.textMuted }}>{e.tempo} min</span>
                <span className={`badge ${stBadge(e.status)}`}>{e.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div style={{ fontSize: 32 }}>{selected.icon}</div>
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => setSelected(null)}><Icon name="x" size={14} /></button>
            </div>
            <h3 className="syne" style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>{selected.titulo}</h3>
            <p style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 16 }}>{selected.desc}</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <span className="badge badge-blue">⏱ {selected.tempo} min</span>
              <span className={`badge ${stBadge(selected.status)}`}>{selected.status}</span>
            </div>
            {selected.status !== "Concluído" && (
              <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => avancar(selected.id)}>
                {selected.status === "Não Iniciado" ? "▶ Iniciar Etapa" : "✅ Marcar como Concluída"}
              </button>
            )}
            {selected.status === "Concluído" && (
              <div style={{ textAlign: "center", padding: 16, color: theme.green }}>
                <Icon name="check" size={24} />
                <div style={{ marginTop: 8, fontWeight: 600 }}>Etapa concluída!</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── APP PRINCIPAL ──────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [modulo, setModulo] = useState("dashboard");
  const [portal, setPortal] = useState("interno");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [checkingSession, setCheckingSession] = useState(true);

  // Verifica sessão salva ao carregar
  useEffect(() => {
    const session = supabase.getSession();
    if (session?.user) {
      supabase.getProfile(session.user.id).then(profile => {
        setUser({ ...session.user, role: profile?.role || "colaborador", nome: profile?.nome || session.user.email });
        // Colaboradores vão direto para o portal deles
        if ((profile?.role || "colaborador") !== "rh") {
          setPortal("colaborador");
          setModulo("onboarding");
        }
        setCheckingSession(false);
      });
    } else {
      setCheckingSession(false);
    }
  }, []);

  const handleLogin = (u) => {
    setUser(u);
    if (u.role !== "rh") {
      setPortal("colaborador");
      setModulo("onboarding");
    } else {
      setPortal("interno");
      setModulo("dashboard");
    }
  };

  const handleLogout = async () => {
    await supabase.signOut();
    setUser(null);
  };

  const isRH = user?.role === "rh";

  // Menus baseados em role
  const menuInterno = [
    { id: "dashboard", label: "Dashboard", icon: "chart" },
    { id: "colaboradores", label: "Colaboradores", icon: "users" },
    { id: "contratos", label: "Contratos", icon: "contract" },
    { id: "vagas", label: "Vagas", icon: "briefcase" },
    { id: "cotacoes", label: "Cotações & Compras", icon: "cart" },
    { id: "manutencoes", label: "Manutenções", icon: "tool" },
    { id: "documentos", label: "Documentos RH", icon: "docs" },
  ];

  const menuColaborador = [
    { id: "onboarding", label: "Meu Onboarding", icon: "rocket" },
    { id: "documentos", label: "Documentos", icon: "docs" },
  ];

  // RH pode acessar ambos os portais; colaborador só o próprio
  const menu = portal === "interno" ? menuInterno : menuColaborador;

  const renderContent = () => {
    const map = {
      dashboard: <Dashboard />,
      colaboradores: <Colaboradores />,
      contratos: <Contratos />,
      vagas: <Vagas />,
      cotacoes: <Cotacoes />,
      manutencoes: <Manutencoes />,
      onboarding: <Onboarding />,
      documentos: <Documentos isRH={isRH} />,
    };
    return map[modulo] || <Dashboard />;
  };

  const switchPortal = (p) => {
    // Só RH pode mudar para o portal interno
    if (p === "interno" && !isRH) return;
    setPortal(p);
    setModulo(p === "interno" ? "dashboard" : "onboarding");
  };

  // Loading
  if (checkingSession) {
    return (
      <>
        <GlobalStyles />
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: theme.bg }}>
          <div style={{ textAlign: "center", color: theme.textMuted }}>
            <div className="spin" style={{ display: "inline-block", fontSize: 32, marginBottom: 16 }}>⟳</div>
            <div style={{ fontSize: 14 }}>Carregando...</div>
          </div>
        </div>
      </>
    );
  }

  // Não logado → tela de login
  if (!user) {
    return (
      <>
        <GlobalStyles />
        <LoginScreen onLogin={handleLogin} />
      </>
    );
  }

  // App principal
  return (
    <>
      <GlobalStyles />
      <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* SIDEBAR */}
        <div style={{ width: sidebarOpen ? 220 : 56, flexShrink: 0, background: theme.surface, borderRight: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", transition: "width 0.25s ease", overflow: "hidden" }}>
          {/* Logo */}
          <div style={{ padding: "20px 14px 14px", borderBottom: `1px solid ${theme.border}` }}>
            {sidebarOpen ? (
              <div>
                <div className="syne" style={{ fontSize: 13, fontWeight: 800, color: theme.textPrimary, lineHeight: 1.2 }}>PORTAL RH</div>
                <div style={{ fontSize: 10, color: theme.textMuted, marginTop: 2 }}>& ADMINISTRAÇÃO</div>
              </div>
            ) : (
              <div style={{ width: 28, height: 28, background: theme.accent, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontWeight: 800, fontSize: 12, fontFamily: "Syne, sans-serif" }}>P</span>
              </div>
            )}
          </div>

          {/* Portal switch — só visível para RH */}
          {isRH && sidebarOpen && (
            <div style={{ padding: "10px 10px 6px" }}>
              <div style={{ display: "flex", gap: 4, background: theme.bg, borderRadius: 8, padding: 3 }}>
                {[{ id: "interno", label: "Interno" }, { id: "colaborador", label: "Colaborador" }].map(p => (
                  <button key={p.id} onClick={() => switchPortal(p.id)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", cursor: "pointer", background: portal === p.id ? theme.surface : "transparent", color: portal === p.id ? theme.textPrimary : theme.textMuted, fontSize: 11, fontWeight: 600, fontFamily: "DM Sans, sans-serif", transition: "all 0.15s" }}>{p.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Nav */}
          <nav style={{ flex: 1, padding: "6px 8px", overflowY: "auto" }}>
            {menu.map(item => (
              <div key={item.id} className={`sidebar-item ${modulo === item.id ? "active" : ""}`} onClick={() => setModulo(item.id)} title={!sidebarOpen ? item.label : ""}>
                <Icon name={item.icon} size={16} />
                {sidebarOpen && <span>{item.label}</span>}
              </div>
            ))}
          </nav>

          {/* Bottom */}
          <div style={{ padding: "10px 8px", borderTop: `1px solid ${theme.border}` }}>
            <div className="sidebar-item" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Icon name={sidebarOpen ? "logout" : "arrow"} size={16} />
              {sidebarOpen && <span style={{ fontSize: 12 }}>Recolher</span>}
            </div>
          </div>
        </div>

        {/* CONTEÚDO */}
        <main style={{ flex: 1, overflowY: "auto", padding: 28, background: theme.bg }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className={`badge ${portal === "interno" ? "badge-blue" : "badge-green"}`}>
                {portal === "interno" ? "🔒 Portal Interno" : "🌐 Portal do Colaborador"}
              </span>
              {isRH && <span className="badge badge-blue" style={{ fontSize: 10 }}>RH</span>}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: theme.accentSoft, color: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {(user.nome || user.email || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
              </div>
              {sidebarOpen && (
                <div style={{ fontSize: 13 }}>
                  <div style={{ fontWeight: 500, color: theme.textPrimary }}>{user.nome || user.email}</div>
                  <div style={{ fontSize: 11, color: theme.textMuted }}>{isRH ? "Equipe de RH" : "Colaborador"}</div>
                </div>
              )}
              <button className="btn btn-ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={handleLogout} title="Sair">
                <Icon name="logout" size={14} />
                {sidebarOpen && "Sair"}
              </button>
            </div>
          </div>

          {renderContent()}
        </main>
      </div>
    </>
  );
}
