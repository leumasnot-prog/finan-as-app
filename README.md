# Duo Finn

Dashboard de finanças em casal: contas da casa divididas, contas pessoais privadas.

React (hooks) · Tailwind CSS · componentes no padrão shadcn/ui · lucide-react · Recharts.

```bash
npm install
npm run dev     # http://localhost:5173
npm test        # lógica de divisão/privacidade
npm run build
```

## Como a privacidade fecha a conta

Os dados ficam em dois escopos (`src/lib/storage.js`):

| Documento | Chave | Quem lê | Conteúdo |
| --- | --- | --- | --- |
| Compartilhado | `duofinn:shared:<mês>` | os dois | contas `shared` (valor, divisão, quem paga), nomes |
| Pessoal | `duofinn:personal:<pessoa>:<mês>` | só o dono | renda e contas `personal` |

O app só carrega o documento compartilhado e o pessoal de quem está olhando.
`calculateBalances(shared, mine, currentUser)` (`src/lib/finance.js`) nem recebe os
dados pessoais do outro — e não precisa: a parte de cada um na casa e o acerto por
Pix dependem só do documento compartilhado, então os dois chegam ao mesmo número.

- **Parte justa**: soma de `valor × divisão` de cada conta (`"50/50"`, `"60/40"`… o primeiro número é da pessoa1).
- **Quem paga**: `paidBy` de cada conta. Acerto = o que a pessoa paga − a parte justa dela.
- **Saldo previsto**: renda − parte da casa − contas pessoais (só do usuário atual).

## Uma pessoa só

- **Modo "Só eu"** (sidebar, ou aba Casa → Modo de uso): o app vira finanças pessoais — sem divisão, parceiro
  nem acerto. As contas da casa não entram em nenhum cálculo, mas continuam guardadas e voltam ao escolher "Casal".
  A escolha é por pessoa/navegador (fica na sessão, não no documento compartilhado).
- **Conta da casa de uma pessoa só**: no modo Casal, a divisão aceita "Só Pessoa 1" / "Só Pessoa 2" (`100/0`, `0/100`).

## Persistência

`StorageManager` usa `window.storage` quando disponível (Artifacts do Claude:
`shared = true` para a casa, `false` para o pessoal) e cai para `localStorage` fora
dele. No `localStorage` o seletor "Ver como" apenas simula as duas pessoas no mesmo
navegador — privacidade real exige um backend com contas separadas.

Design system: [`docs/design-system.md`](docs/design-system.md) e, no app, **Sistema → Design system**.

Próximos passos (grafo de tarefas para agentes): [`docs/proximos-passos.md`](docs/proximos-passos.md).

Dados de exemplo: dezembro/2026 (`src/lib/seed.js`).
