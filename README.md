# RD Solutions - Sistema de Ordem de Serviço

Sistema de gestão de ordens de serviço para técnicos de CFTV, elétrica, segurança eletrônica e telecomunicações.

## Tecnologias

- [Next.js 14](https://nextjs.org)
- [React 18](https://react.dev)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS](https://tailwindcss.com)
- [Supabase](https://supabase.com) (banco de dados + autenticação)
- [Vercel](https://vercel.com) (hospedagem)

## Variáveis de ambiente

Copie o arquivo `.env.example` para `.env.local` e preencha com os dados do seu projeto Supabase:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUA_ANON_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_PANEL_URL=https://app.meusistema.com/painel
```

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

## Configurando o Supabase

1. Crie um novo projeto em [supabase.com](https://supabase.com).
2. No **SQL Editor**, execute o conteúdo de `supabase/migrations/20260803000001_init.sql`.
3. Vá em **Project Settings > API** e copie a **URL** e a **anon key** para o `.env.local`.
4. Crie um usuário técnico em **Authentication > Users > Add user** (ou execute o `20260803000002_seed_user.sql` ajustando a senha).

## Deploy na Vercel

1. Faça commit e push para um repositório no GitHub.
2. Acesse [vercel.com](https://vercel.com) e clique em **Add New Project**.
3. Importe o repositório do GitHub.
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_PANEL_URL` (URL do painel em produção, ex: `https://rd-solutions.vercel.app/painel`)
5. Clique em **Deploy**.

## Estrutura do projeto

- `src/app/` - páginas da aplicação
- `src/services/storage.ts` - camada de acesso ao Supabase
- `src/lib/supabase/` - clientes Supabase para browser e servidor
- `src/middleware.ts` - proteção de rotas autenticadas
- `supabase/migrations/` - scripts SQL do banco de dados

## Autenticação

O painel (`/painel/*`) é protegido pelo middleware e exige login. O login usa a autenticação nativa do Supabase Auth. A página pública `/chamado` e a página de orçamento `/orcamento/[id]` não exigem autenticação.

## Licença

MIT
