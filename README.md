# 📅 Agendamento Online

> Sistema completo de agendamento para pequenos negócios — desenvolvido por [Ricardo Souza](https://github.com/Ricardo404S)

---

## 💡 O que é esse projeto?

Imagina que você é dono de um salão de beleza, uma barbearia ou uma clínica. Seus clientes precisam ligar pra marcar horário, você esquece de anotar, e no fim do dia vira uma bagunça.

Esse sistema resolve exatamente isso.

O cliente entra no site, escolhe o serviço, o profissional, a data e o horário — e confirma. Na mesma hora, o agendamento aparece no **painel do dono em tempo real**, sem precisar recarregar a página. Tudo automático, tudo organizado.

---

## ✨ Funcionalidades

- **Página do cliente** — formulário simples e bonito para marcar horário
- **Painel admin** — visualização de todos os agendamentos em tempo real
- **Filtros** — filtra por pendente, confirmado ou cancelado
- **Busca** — encontra qualquer agendamento pelo nome ou serviço
- **Ações rápidas** — confirmar ou cancelar agendamento com um clique
- **Estatísticas** — cards com total, pendentes, confirmados e agendamentos de hoje
- **100% responsivo** — funciona no celular e no computador

---

## 🛠️ Tecnologias usadas

| Tecnologia | Para quê |
|---|---|
| **HTML & CSS** | Estrutura e visual do site |
| **JavaScript** | Toda a lógica e interações |
| **Firebase Firestore** | Banco de dados em tempo real |
| **Firebase Hosting** | Hospedagem gratuita |

---

## 🚀 Como rodar o projeto

### 1. Clone o repositório
```bash
git clone https://github.com/Ricardo404S/agendamento-online.git
cd agendamento-online
```

### 2. Configure o Firebase
- Acesse [console.firebase.google.com](https://console.firebase.google.com)
- Crie um projeto e ative o **Firestore Database**
- Copie as credenciais do seu projeto
- Substitua no arquivo `index.html`:

```javascript
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "SEU_PROJETO.firebaseapp.com",
  projectId: "SEU_PROJETO",
  // ...
};
```

### 3. Abra no navegador
Abra o `index.html` direto no navegador ou use o Firebase Hosting para publicar online.

---

## 📁 Estrutura do banco (Firestore)

```
agendamentos/
  └── {id_gerado_automaticamente}/
        ├── nome        → "Maria Silva"
        ├── telefone    → "(11) 98765-4321"
        ├── servico     → "Coloração"
        ├── profissional → "Ana"
        ├── data        → "2026-05-24"
        ├── horario     → "10:00"
        ├── status      → "pendente" | "confirmado" | "cancelado"
        ├── obs         → "Alergia a acetona"
        └── criadoEm    → timestamp
```

---

## 📸 Preview

> Acesse a demo: [test-site383.web.app](https://test-site383.web.app)

---

## 👨‍💻 Desenvolvedor

**Ricardo Souza** — Desenvolvedor Web · Mauá, SP

- GitHub: [@Ricardo404S](https://github.com/Ricardo404S)
- WhatsApp: [+55 11 97952-3456](https://wa.me/5511979523456)

---

*Feito com 💚 e Firebase*
