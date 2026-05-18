# Publicar BI Laguna no Google Sites

O Google Sites deve incorporar uma URL HTTPS publica do app Python. Localhost (`http://127.0.0.1:8000`) nao funciona para o publico.

## Opção 1: Publicação temporária com túnel

Use esta opção para testar hoje, antes do deploy definitivo.

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

ou:

```bash
ngrok http 8000
```

Você receberá uma URL pública HTTPS, por exemplo:

```text
https://abc123.trycloudflare.com
```

Use estas URLs:

- Google Sites: `https://abc123.trycloudflare.com/embed`
- Apps Script API externa: `https://abc123.trycloudflare.com/api/ingest`
- Teste de saúde: `https://abc123.trycloudflare.com/api/health`

## Opção 2: Publicação definitiva

Faça deploy em um serviço com HTTPS, por exemplo Render, Railway, VPS ou Cloud Run.

Depois do deploy, use:

- Google Sites: `https://SEU-DOMINIO/embed`
- Apps Script API externa: `https://SEU-DOMINIO/api/ingest`
- Teste de saúde: `https://SEU-DOMINIO/api/health`

## Configurar Google Sites

No site `https://sites.google.com/view/laguna-BI`:

1. Abra o editor do Google Sites.
2. Clique em `Inserir`.
3. Clique em `Incorporar`.
4. Cole a URL pública do dashboard com `/embed`.
5. Ajuste a altura do bloco incorporado.
6. Publique o site.

## Montagem sugerida da página

Estrutura simples para deixar o BI público e direto:

```text
Topo:
BI Laguna
Indicadores operacionais integrados das planilhas Laguna.

Bloco principal:
Incorporar > URL
https://SEU-DOMINIO/embed

Rodapé:
Atualização automática conforme envio das planilhas conectadas.
```

Layout detalhado:

```text
GOOGLE_SITES_LAYOUT_BI_LAGUNA.md
```

Configuração visual no Google Sites:

- Tema: simples/limpo.
- Largura do bloco incorporado: largura total.
- Altura sugerida do iframe: entre 900px e 1200px.
- Navegação: pode ficar oculta se o site tiver apenas o BI.
- Permissão de publicação: público conforme necessidade da Laguna.

## URLs corretas

Nunca use `127.0.0.1` no Google Sites.

Use assim:

```text
Dashboard publico no Google Sites:
https://SEU-DOMINIO/embed

Endpoint para receber dados do Apps Script:
https://SEU-DOMINIO/api/ingest

Teste da API:
https://SEU-DOMINIO/api/health
```

Se estiver usando túnel temporário:

```text
Dashboard publico no Google Sites:
https://SUA-URL-DO-TUNEL/embed

Endpoint para receber dados:
https://SUA-URL-DO-TUNEL/api/ingest
```

## Configurar Google Sheets

Em cada planilha integrada:

1. `Analise de Cortes > Configurar Origem/Categoria`
2. Defina a categoria, por exemplo `Cortes`, `Entregas`, `Financeiro`.
3. Defina o nome da origem.
4. `Analise de Cortes > Configurar API Externa`
5. Use a URL `https://SEU-DOMINIO/api/ingest`.
6. `Analise de Cortes > Testar API Externa`
7. `Analise de Cortes > Enviar Dados para API`

## Observação importante

Para uso permanente, prefira deploy definitivo. Túneis gratuitos podem trocar a URL quando reiniciados.
