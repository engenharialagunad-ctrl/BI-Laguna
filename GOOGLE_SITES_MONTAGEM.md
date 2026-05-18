# Montagem do Google Sites - BI Laguna

Site alvo:

```text
https://sites.google.com/view/laguna-BI
```

## Página principal

Use uma página única, focada no BI.

### Cabeçalho

Título:

```text
BI Laguna
```

Subtítulo:

```text
Painel integrado de indicadores operacionais da Laguna.
```

### Bloco do BI

No editor do Google Sites:

1. Clique em `Inserir`.
2. Clique em `Incorporar`.
3. Escolha `Por URL`.
4. Cole:

```text
https://SEU-DOMINIO/embed
```

Para teste temporário:

```text
https://SUA-URL-DO-TUNEL/embed
```

5. Ajuste o bloco para largura total.
6. Aumente a altura até o painel aparecer confortável.

### Rodapé

Texto sugerido:

```text
Dados atualizados pelas planilhas conectadas ao BI Laguna.
```

## API usada pelas planilhas

Em cada planilha Google Sheets conectada:

```text
Analise de Cortes > Configurar API Externa
```

Use:

```text
https://SEU-DOMINIO/api/ingest
```

Depois:

```text
Analise de Cortes > Configurar Origem/Categoria
Analise de Cortes > Testar API Externa
Analise de Cortes > Enviar Dados para API
```

## Publicação

No Google Sites:

1. Clique em `Publicar`.
2. Confirme o endereço `laguna-BI`.
3. Em permissões, deixe público conforme necessidade da Laguna.
4. Publique.

## Observação

O Google Sites não hospeda Python. Ele apenas incorpora o dashboard Python publicado em HTTPS.
