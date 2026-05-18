# Deploy na Vercel

Use esta configuracao na tela de deploy:

- Framework Preset: `FastAPI`
- Diretorio Raiz: `./`
- Comando de construcao: vazio / `Nenhum`
- Diretorio de saida: `N/D`
- Comando de instalacao: `pip install -r requirements.txt`

Variaveis de ambiente recomendadas:

```text
APP_NAME=BI Laguna
LAGUNA_ALLOWED_ORIGINS=https://sites.google.com,https://script.google.com,https://script.googleusercontent.com
```

Variavel opcional para proteger o recebimento dos dados:

```text
LAGUNA_INGEST_TOKEN=seu-token-aqui
```

Se informar `LAGUNA_INGEST_TOKEN`, use o mesmo token no menu da planilha:

```text
Analise de Cortes > Configurar API Externa
```

Depois que a Vercel gerar a URL publica, configure no Apps Script:

```text
https://SEU-PROJETO.vercel.app/api/ingest
```

Para incorporar no Google Sites, use:

```text
https://SEU-PROJETO.vercel.app/embed
```

Rotas para testar:

- `GET /api/health`
- `GET /api/data`
- `GET /embed`
- `POST /api/ingest`

Observacao: na Vercel, a gravacao em arquivo fica em armazenamento temporario de funcao serverless. Para BI de producao com historico persistente, o proximo passo recomendado e ligar uma base externa ou storage persistente.
