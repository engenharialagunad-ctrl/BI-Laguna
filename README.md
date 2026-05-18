# BI Laguna Python

Dashboard e API em Python para publicar o BI Laguna e incorporar no Google Sites.

## Como rodar no PyCharm

1. Abra a pasta `python_bi_laguna` no PyCharm.
2. Crie um ambiente virtual Python 3.11+.
3. Instale dependencias:

```bash
pip install -r requirements.txt
```

4. Rode o servidor:

```bash
uvicorn app.main:app --reload
```

5. Opcionalmente, carregue dados de exemplo:

```bash
python tools_seed_sample.py
```

6. Acesse:

- Dashboard: `http://127.0.0.1:8000`
- JSON: `http://127.0.0.1:8000/api/data`
- Health: `http://127.0.0.1:8000/api/health`

## Fluxo recomendado

1. Cada Google Sheets recebe o mesmo Apps Script.
2. Em cada planilha, configure uma categoria e um nome de origem.
3. O Apps Script extrai os dados da planilha e envia para `POST https://SEU_DEPLOY/api/ingest`.
4. O Python salva cada origem em `data/sources/*.json`.
5. O Python gera o consolidado geral em `data/latest_payload.json`.
6. O dashboard em `/` le `GET /api/data`, monta os graficos e permite filtrar por categoria/origem.
7. O Google Sites incorpora a URL publica do dashboard.

## Multiplas planilhas e categorias

O BI foi preparado para receber varias origens. Exemplos:

- Categoria `Cortes`: planilhas CRT PER, produção de perfis e corte.
- Categoria `Entregas`: planilhas de expedição ou status de entrega.
- Categoria `Financeiro`: custos, faturamento ou previsões.
- Categoria `Qualidade`: retrabalho, perdas e ocorrências.

Cada origem enviada precisa ter estes metadados:

```json
{
  "source": {
    "id": "id-unico-da-planilha",
    "name": "Nome amigavel",
    "category": "Cortes",
    "type": "google_sheets"
  }
}
```

O Apps Script já envia esses campos automaticamente. Em uma planilha nova, use o menu:

```text
Analise de Cortes > Configurar Origem/Categoria
```

Depois envie para a mesma API:

```text
Analise de Cortes > Enviar Dados para API
```

Endpoints úteis:

- `GET /api/sources`: lista origens e categorias recebidas.
- `GET /api/data`: consolidado geral.
- `GET /api/data?category=Cortes`: apenas uma categoria.
- `GET /api/data?source=chave-da-origem`: apenas uma origem.

## Configurar o Apps Script

O Apps Script roda nos servidores do Google. Por isso, ele nao consegue enviar dados para `http://127.0.0.1:8000` da sua maquina.

Para testar antes do deploy, use uma URL HTTPS publica apontando para seu localhost. Exemplos:

```bash
ngrok http 8000
```

ou:

```bash
cloudflared tunnel --url http://127.0.0.1:8000
```

Esses comandos geram uma URL parecida com:

```text
https://abc123.ngrok-free.app
```

No menu da planilha:

1. `Analise de Cortes > Configurar API Externa`
2. URL local via tunel: `https://SUA_URL_PUBLICA/api/ingest`
3. Depois do deploy, troque para: `https://SEU_DEPLOY/api/ingest`
4. Token: deixe em branco, ou informe o mesmo valor de `LAGUNA_INGEST_TOKEN`.
5. Use `Analise de Cortes > Configurar Origem/Categoria`.
6. Use `Analise de Cortes > Testar API Externa`.
7. Use `Analise de Cortes > Enviar Dados para API`.

Para abrir localmente no navegador:

```text
http://127.0.0.1:8000
```

Para testar o recebimento local sem Google Sheets:

```bash
curl -X POST http://127.0.0.1:8000/api/ingest -H "Content-Type: application/json" --data-binary @sample_payload.json
```

Para o Google Sites, use a URL publica do tunel ou deploy, sem `/api/ingest`:

```text
https://SUA_URL_PUBLICA/embed
```

Veja também `PUBLICAR_GOOGLE_SITES.md`.

## Incorporar no Google Sites

No site `https://sites.google.com/view/laguna-BI`:

1. Abra o editor do Google Sites.
2. Clique em `Inserir > Incorporar`.
3. Cole a URL publica do deploy Python ou do tunel local com `/embed`, por exemplo `https://bi-laguna.onrender.com/embed`.
4. Ajuste a altura do bloco para mostrar o dashboard inteiro.
5. Publique o site.

Google Sites nao executa Python diretamente. Ele apenas incorpora uma pagina publicada em outro servidor.

## Variaveis de ambiente

Copie `.env.example` como referencia:

- `APP_NAME`: nome exibido no app.
- `LAGUNA_INGEST_TOKEN`: token opcional para proteger `POST /api/ingest`.
- `LAGUNA_SOURCE_URL`: URL opcional do Web App Apps Script `?route=data`, caso prefira sincronizar puxando os dados.
- `LAGUNA_ALLOWED_ORIGINS`: origens liberadas para CORS.

## Endpoints

- `GET /`: dashboard visual.
- `GET /embed`: dashboard ajustado para incorporar no Google Sites.
- `GET /api/health`: status.
- `GET /api/data`: consolidado geral ou filtrado por query string.
- `GET /api/sources`: origens e categorias recebidas.
- `POST /api/ingest`: recebe payload do Apps Script.
- `POST /api/sync`: puxa dados de `LAGUNA_SOURCE_URL` e salva localmente.

## Deploy

### Render

O arquivo `render.yaml` ja esta pronto. No Render:

1. Suba este projeto para um repositorio Git.
2. Crie um novo Blueprint ou Web Service.
3. Use `pip install -r requirements.txt` como build command.
4. Use `uvicorn app.main:app --host 0.0.0.0 --port $PORT` como start command.

### Docker

```bash
docker build -t bi-laguna .
docker run -p 8000:8000 bi-laguna
```
