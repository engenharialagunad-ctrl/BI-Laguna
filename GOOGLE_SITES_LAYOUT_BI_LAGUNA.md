# Layout da página pública - BI Laguna

Objetivo da página:

```text
Exibir o painel BI Laguna de forma direta, pública e limpa dentro do Google Sites.
```

URL do site:

```text
https://sites.google.com/view/laguna-BI
```

## Estrutura Recomendada

### 1. Cabeçalho do Site

No Google Sites, use o cabeçalho no modo simples ou somente título.

Título:

```text
BI Laguna
```

Subtítulo curto:

```text
Painel integrado de acompanhamento operacional
```

Configuração visual sugerida:

```text
Tipo de cabeçalho: somente título ou banner pequeno
Cor de fundo: verde escuro
Texto: branco
Altura: baixa
```

Se o tema permitir cores personalizadas:

```text
Verde escuro: #10271D
Verde principal: #2D7D55
Fundo claro: #EEF3F0
Texto: #172033
```

### 2. Bloco Principal: BI Incorporado

Este deve ser o primeiro bloco de conteúdo da página.

No Google Sites:

```text
Inserir > Incorporar > Por URL
```

Use:

```text
https://SEU-DOMINIO/embed
```

Enquanto estiver testando com túnel:

```text
https://SUA-URL-DO-TUNEL/embed
```

Configuração do bloco:

```text
Largura: total
Altura: 1000px a 1200px
Alinhamento: central
Margem superior: pequena
```

Se usar código HTML em vez de URL:

```html
<iframe
  src="https://SEU-DOMINIO/embed"
  style="width:100%;height:1150px;border:0;"
  loading="lazy"
  title="BI Laguna">
</iframe>
```

### 3. Faixa de Contexto Abaixo do BI

Adicione uma seção curta abaixo do painel.

Título:

```text
Origem dos dados
```

Texto:

```text
Os indicadores são atualizados a partir das planilhas Google Sheets conectadas ao BI Laguna. Cada planilha pode ser classificada por categoria, origem e processo para consolidação automática.
```

Layout:

```text
Seção com 2 colunas
Coluna esquerda: texto acima
Coluna direita: lista curta de categorias
```

Lista da coluna direita:

```text
Cortes
Entregas
Produção
Financeiro
Qualidade
```

### 4. Rodapé

Texto:

```text
BI Laguna | Dados operacionais integrados
```

Texto auxiliar:

```text
Atualização conforme envio das planilhas conectadas.
```

## Mapa Visual

```text
┌──────────────────────────────────────────────┐
│ BI Laguna                                    │
│ Painel integrado de acompanhamento operacional│
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│                                              │
│       IFRAME /embed DO DASHBOARD PYTHON      │
│                                              │
│       KPIs, filtros, gráficos e tabelas      │
│                                              │
└──────────────────────────────────────────────┘

┌───────────────────────┬──────────────────────┐
│ Origem dos dados      │ Categorias            │
│ Texto explicativo     │ Cortes                │
│                       │ Entregas              │
│                       │ Produção              │
│                       │ Financeiro            │
│                       │ Qualidade             │
└───────────────────────┴──────────────────────┘

┌──────────────────────────────────────────────┐
│ BI Laguna | Dados operacionais integrados    │
└──────────────────────────────────────────────┘
```

## Configurações de Publicação

No Google Sites:

```text
Publicar > Endereço: laguna-BI
```

Permissões:

```text
Público, se o BI puder ser acessado externamente.
Restrito, se apenas usuários Laguna puderem visualizar.
```

## Checklist Final

Antes de publicar:

```text
[ ] URL /embed abre fora do computador local
[ ] URL /api/health retorna ok
[ ] Apps Script envia para /api/ingest
[ ] Google Sites incorpora /embed
[ ] Página publicada em /view/laguna-BI
```
