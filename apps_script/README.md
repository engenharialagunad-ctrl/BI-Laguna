# Apps Script do BI Laguna

Arquivos para colar no projeto do Google Apps Script conectado as planilhas.

## Abas reconhecidas

O extrator le automaticamente abas cujo nome contenha:

- `CRT PER`
- `USI PER`

Para usinagem, o padrao esperado e o mesmo do print enviado:

```text
CORTE | PERFIL 2 | COMP | QTD | COR ABE | COR BAT | USINAGEM | PEDIDO | CLIENTE | AMBIENTE | ID PECA | PORTA | PERFIL | BIPADO
```

Campos principais usados pelo BI:

- `CORTE`: tipo de corte, exemplo `45/90`, `90/45`, `45/45`, `90/90`.
- `PERFIL 2`: tipo do perfil, exemplo `FLP-021`.
- `COMP`: comprimento em mm.
- `QTD`: quantidade.
- `USINAGEM`: processo, exemplo `Dobradica Sobrepor RAJ`.
- `CLIENTE`: cliente.
- `BIPADO`: operador e data/hora, exemplo `Por: LUCAS em 03/11/2025 10:50:04`.

## Planilhas pendentes

No menu `Analise de Cortes`:

1. `Preparar Lista de Planilhas Pendentes`
2. Preencha a aba `LagunaBI_Origens_Pendentes` com uma planilha por linha.
3. Use `Extrair Planilhas Pendentes` para conferir status, cortes, clientes e processos.
4. Use `Enviar Pendentes em Lote para API` para enviar todas as origens validas juntas.

URL da API de producao:

```text
https://bi-lagunaportas.vercel.app/api/ingest
```

O envio em lote troca automaticamente `/api/ingest` por `/api/ingest-batch`.
