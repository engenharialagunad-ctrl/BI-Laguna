# URL desejada: lagunaportas.com.br/laguna-BI

Objetivo:

```text
https://lagunaportas.com.br/laguna-BI
```

## Ponto importante

DNS nao controla caminhos como `/laguna-BI`.

DNS controla apenas:

```text
lagunaportas.com.br
bi.lagunaportas.com.br
painel.lagunaportas.com.br
```

Por isso, para usar exatamente:

```text
https://lagunaportas.com.br/laguna-BI
```

é necessário configurar essa página ou rota dentro do servidor/site que já hospeda `lagunaportas.com.br`.

## Opção recomendada

Criar uma página no site atual da Laguna com o caminho:

```text
/laguna-BI
```

Dentro dessa página, incorporar o app Python publicado:

```html
<iframe
  src="https://painel.lagunaportas.com.br/embed"
  style="width:100%;height:1150px;border:0;"
  loading="lazy"
  title="BI Laguna">
</iframe>
```

Resultado:

```text
Visitante acessa:
https://lagunaportas.com.br/laguna-BI

A página mostra:
https://painel.lagunaportas.com.br/embed
```

## URLs finais sugeridas

Página pública:

```text
https://lagunaportas.com.br/laguna-BI
```

Dashboard Python:

```text
https://painel.lagunaportas.com.br/embed
```

API para Apps Script:

```text
https://painel.lagunaportas.com.br/api/ingest
```

## Se o site atual for WordPress ou construtor visual

1. Acesse o painel do site.
2. Crie uma nova página.
3. Título: `BI Laguna`.
4. Slug/URL: `laguna-BI`.
5. Adicione um bloco HTML/incorporar.
6. Cole o iframe:

```html
<iframe
  src="https://painel.lagunaportas.com.br/embed"
  style="width:100%;height:1150px;border:0;"
  loading="lazy"
  title="BI Laguna">
</iframe>
```

7. Publique a página.

## Se o site atual usar Nginx

Use uma página HTML simples no site atual ou configure proxy.

Proxy exemplo:

```nginx
location /laguna-BI/ {
    proxy_pass https://painel.lagunaportas.com.br/;
    proxy_set_header Host painel.lagunaportas.com.br;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Mais simples e mais seguro: criar uma página `/laguna-BI` com iframe.

## Se o site atual usar Apache

Redirecionamento simples:

```apache
Redirect 302 /laguna-BI https://painel.lagunaportas.com.br/embed
```

Ou criar uma página HTML em:

```text
/laguna-BI/index.html
```

com o iframe.

## Por que nao usar apenas Google Sites nesse caminho?

Google Sites com domínio personalizado trabalha melhor com subdomínios, por exemplo:

```text
bi.lagunaportas.com.br
```

Para usar `lagunaportas.com.br/laguna-BI`, o controle precisa estar no site principal `lagunaportas.com.br`.

## Plano ideal

1. Publicar o Python em HTTPS fixo.
2. Apontar:

```text
painel.lagunaportas.com.br -> deploy Python
```

3. Criar página no site atual:

```text
https://lagunaportas.com.br/laguna-BI
```

4. Incorporar:

```text
https://painel.lagunaportas.com.br/embed
```

5. Configurar Apps Script:

```text
https://painel.lagunaportas.com.br/api/ingest
```
