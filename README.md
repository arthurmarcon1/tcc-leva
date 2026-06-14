#  Leva – Transporte Colaborativo de Encomendas

Aplicação web desenvolvida como Trabalho de Conclusão de Curso (TCC) no curso de Sistemas de Informação da Universidade Federal de Santa Maria (UFSM).

O **Leva** é uma plataforma colaborativa, sem fins lucrativos, que conecta usuários que desejam enviar encomendas com pessoas que já realizarão determinados trajetos, otimizando deslocamentos e promovendo economia e sustentabilidade.

---

##  Sobre o Projeto

Este projeto propõe uma solução baseada em economia colaborativa para o transporte de objetos entre usuários, aproveitando deslocamentos já existentes.

Diferente de plataformas tradicionais de transporte, o foco está exclusivamente no envio de **encomendas**, sem envolver o transporte de passageiros.

---

##  Contexto Acadêmico

- **Curso:** Sistemas de Informação  
- **Instituição:** Universidade Federal de Santa Maria (UFSM)  
- **Autor:** Arthur Pasquoto Marcon  
- **Orientador:** Prof. Dr. Celio Trois  

---

##  Tecnologias Utilizadas

- **React**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Componentização moderna de UI**

---

##  Como rodar o projeto

### Pré-requisitos
- Node.js
- npm

### Instalação

```bash
git clone https://github.com/arthurmarcon1/tcc-leva.git
cd tcc-leva
npm install
```

### Configuração do ambiente

Crie um arquivo `.env` na raiz a partir do modelo:

```bash
cp .env.example .env
```

e preencha com as credenciais do seu projeto Supabase
(Dashboard → Project Settings → API):

```
VITE_SUPABASE_PROJECT_ID="..."
VITE_SUPABASE_PUBLISHABLE_KEY="..."
VITE_SUPABASE_URL="https://<projeto>.supabase.co"
```

### Banco de dados

O esquema completo (tabelas, políticas de Row Level Security e
triggers) está versionado em `supabase/migrations/`. Para criar o
banco em um projeto Supabase novo, aplique os arquivos em ordem
cronológica pelo SQL Editor do Dashboard, ou use a CLI:

```bash
supabase link --project-ref <PROJECT_ID>
supabase db push
```

### Executando

```bash
npm run dev     # ambiente de desenvolvimento (http://localhost:8080)
npm test        # testes automatizados (Jest)
npm run lint    # análise estática
npm run build   # build de produção
```

