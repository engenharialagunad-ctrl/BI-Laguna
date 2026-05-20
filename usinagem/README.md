# Usinagem

Pasta dedicada a documentacao da planilha de usinagem.

Use esta origem para planilhas como a do print enviado, com varias abas iniciando por `USI PER`.

## Regra de extracao

- Categoria do BI: `Usinagem`
- Abas lidas: somente abas com nome contendo `USI PER`
- Abas `CRT PER` nao entram nesta origem

Colunas esperadas:

```text
CORTE | PERFIL 2 | COMP | QTD | COR ABE | COR BAT | USINAGEM | PEDIDO | CLIENTE | AMBIENTE | ID PECA | PORTA | PERFIL | BIPADO
```

Campos usados pelo BI:

- `CORTE`: tipo de corte.
- `PERFIL 2`: tipo de perfil.
- `COMP`: comprimento em mm.
- `QTD`: quantidade.
- `USINAGEM`: processo, exemplo `Dobradica Sobrepor RAJ`.
- `CLIENTE`: cliente.
- `AMBIENTE`: ambiente da peca.
- `BIPADO`: operador, data e hora.

Exemplo de `BIPADO` reconhecido:

```text
Por: LUCAS em 03/11/2025 10:50:04
```

O extrator usa a data/hora do `BIPADO` para calcular tempo total por cliente e processo, e separa o operador quando o texto tiver o padrao `Por: NOME em DATA HORA`.

## Configuracao recomendada

Na planilha de usinagem, use o menu:

```text
BI Laguna - Usinagem > Configurar Origem/Categoria
```

Preencha:

```text
Categoria: Usinagem
Origem: Usinagem
```

API externa:

```text
https://bi-lagunaportas.vercel.app/api/ingest
```

Essa URL ja fica como padrao nos arquivos `.gs` desta pasta. O envio individual e o envio em lote usam o mesmo contrato JSON do app BI Laguna.

Para envio em lote, cadastre esta planilha na aba `LagunaBI_Origens_Pendentes` com categoria `Usinagem`.

## Arquivos `.gs`

Cole/anexe estes arquivos no Apps Script da planilha de usinagem:

```text
Reports.gs
api.gs
main.gs
```

Estes arquivos desta pasta sao dedicados para `USI PER`. Por padrao, eles nao leem abas `CRT PER`.
