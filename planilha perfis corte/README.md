# Planilha Perfis Corte

Pasta dedicada a planilha de perfis/corte.

Use esta pasta para os arquivos do Apps Script ligados a planilha que trabalha com abas `CRT PER`.

## Regra de extracao

- Categoria do BI: `Cortes`
- Abas lidas: somente abas com nome contendo `CRT PER`
- Abas `USI PER` nao entram nesta origem

Colunas usadas:

```text
CORTE | PERFIL 2 | COMP | QTD | CLIENTE | USINAGEM | BIPADO
```

Campos principais:

- `CORTE`: tipo de corte, exemplo `90/90`, `45/90`, `90/45`, `45/45`.
- `PERFIL 2`: tipo de perfil.
- `COMP`: comprimento em mm.
- `QTD`: quantidade.
- `CLIENTE`: cliente para agrupamento no BI.
- `USINAGEM`: processo/operacao quando existir.
- `BIPADO`: data e hora usada para tempo de corte.

Nos relatorios, o comprimento e exibido em metros e o tempo total e exibido em horas.

## Configuracao recomendada

Na planilha de corte, use o menu:

```text
BI Laguna - Perfis Corte > Configurar Origem/Categoria
```

Preencha:

```text
Categoria: Cortes
Origem: Perfis Corte
```

API externa:

```text
https://bi-lagunaportas.vercel.app/api/ingest
```

Essa URL ja fica como padrao nos arquivos `.gs` desta pasta. O envio individual e o envio em lote usam o mesmo contrato JSON do app BI Laguna.

Para planilhas em lote, cadastre esta origem na aba `LagunaBI_Origens_Pendentes` com categoria `Cortes`.
