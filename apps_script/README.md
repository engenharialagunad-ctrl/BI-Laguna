# Apps Script do BI Laguna

Arquivos para colar no projeto do Google Apps Script conectado as planilhas.

## Abas reconhecidas

O extrator separa as abas pela categoria da origem:

- Categoria `Cortes`: le somente abas `CRT PER`.
- Categoria `Usinagem`: le somente abas `USI PER`.

Se a categoria nao estiver configurada, o script tenta detectar pelo nome das abas.

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
- `ID PECA`: identificador unico da peca, usado para validar duplicidade.
- `BIPADO`: operador e data/hora, exemplo `Por: LUCAS em 03/11/2025 10:50:04`.

O tempo e calculado somente dentro dos turnos do mesmo dia: manha `08:00-12:00` e tarde `13:00-17:48`. O intervalo de almoco e viradas de dia nao entram na soma.

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
