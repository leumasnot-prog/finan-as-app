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

## Telas

- **Visão geral**: saldo, divisão da casa, carteira, contas a pagar com filtro por dia (toque em dois dias para ver a faixa, ex.: 05 a 15).
- **Fluxo**: saldo ao longo do mês e gastos por categoria em pizza. Categorias com emoji 3D, criadas pelos dois.
- **Carteira**: seus cartões empilhados, cada um com nome, cor e fatura do mês; lance compras direto num cartão.
- **Metas**: guardar dinheiro, investimento, reserva de emergência, viagem; quanto guardar por mês até o prazo.
- **Patrimônio**: casa, carro, investimentos; patrimônio líquido descontando financiamentos.
- **Lançar em vários meses**: no formulário, "Todo mês" ou "Parcelado", começando no mês que você escolher.

## Importar fatura ou extrato

Botão **Importar** (cabeçalho, ou "Importar fatura" na Carteira). Lê CSV e OFX (`src/lib/importer.js`):

- **Layout:** os bancos não documentam o formato e mudam sem aviso, então nada depende de layout fixo. Separador,
  formato de número e de data são detectados; as colunas são achadas pelo nome (data, descrição, valor, parcela, categoria).
  Se não reconhecer, a tela pede para você apontar qual coluna é qual. OFX é padrão e é a opção mais confiável.
- **Nome limpo:** tira o prefixo de maquininha (`PAG*`, `MP *`, `SumUp *`, `EC *`, `IFD*`…), cidade, UF e códigos, e
  reconhece marcas comuns (iFood, Uber, Netflix, Mercado Livre, postos, farmácias…). Você corrige na revisão e o app
  lembra para os próximos meses (regras pessoais, em `profile.rules`).
- **Categoria:** pelas palavras do nome e pela categoria que o banco manda, com a regra que você salvou na frente.
- **Casamento:** o que você já lançou (mesmo cartão, mesmo valor; nome e dia desempatam) é **conferido** com o valor
  do banco, sem duplicar. O que você lançou e não veio no arquivo aparece num aviso. Pagamento de fatura e estorno
  são ignorados.
- **Parcelas:** "Parcela 2/5" na fatura cria as 3 que faltam nos meses seguintes.

Onde cada coisa fica salva: categorias em `duofinn:shared:settings` (os dois veem); carteira, metas e patrimônio em
`duofinn:personal:<pessoa>:profile` (só o dono). Uma conta da casa paga com cartão leva um retrato do cartão (nome, cor,
final) para o parceiro ver sem ler a sua carteira.

Design system: [`docs/design-system.md`](docs/design-system.md) e, no app, **Sistema → Design system**.

Próximos passos (grafo de tarefas para agentes): [`docs/proximos-passos.md`](docs/proximos-passos.md).

Dados de exemplo: dezembro/2026 (`src/lib/seed.js`).
