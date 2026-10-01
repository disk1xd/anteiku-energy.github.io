---
title: "bending traffic to my will"
authors: ["kemuri"]
date: 2026-06-13
summary: "Port forwarding pra pivoting, do meu jeito."
tags: ["networking", "pivoting", "port-forwarding"]
draft: false
unlisted: true
---

<figure>
  <img
    src="/images/city-of-mine-yuumei.jpg"
    alt="A neon cityscape at night, by Yuumei."
    loading="lazy"
    width="1500"
    height="894"
  />
  <figcaption>
    &ldquo;City of Mine&rdquo; art by
    <a href="https://www.yuumeiart.com" target="_blank" rel="noopener">Yuumei</a>.
  </figcaption>
</figure>

Agora que refrescamos a mente com certos fundamentos de rede por trás do pivoting, vamos abordar uma das técnicas mais usadas na prática.

### Port Forwarding

`Port Forwarding` é uma técnica que consiste em redirecionar uma solicitação de comunicação de uma rede para outra, associando um endereço IP e número de porta a outro. Na prática, o invasor faz com que o tráfego enviado para uma porta específica na máquina atacante seja encaminhado através da máquina comprometida. É uma técnica muito usada para acessar serviços internos.

### Dynamic Port Forwarding

https://github.com/haad/proxychains

Supondo que não sabemos quais portas podemos acessar e nosso objetivo é escanear uma subnet, não será possível fazer isso diretamente do host do atacante, pois não possuímos rota para ela. Para isso, utilizamos o `Dynamic Port Forwarding`: rodamos o SSH da nossa máquina com a flag `-D` para abrir um listener SOCKS na localhost, e o tráfego sai pelo host comprometido, que tem acesso à subnet alvo.

```sh
ssh -N -f -D 9050 victim@10.129.202.64
```

Para informar ao `proxychains` que deve usar a porta `9050` (porta que definimos no listener SOCKS), editamos o arquivo `/etc/proxychains.conf` e adicionamos a seguinte linha ao final:

```
socks4 127.0.0.1 9050
```

Um proxy SOCKS é um protocolo de internet que intermedeia conexões entre um cliente (você ou uma aplicação) e um servidor.

> **OBS:** A flag `-D` faz o túnel SSH transportar apenas conexões TCP.

> **OBS 2:** SOCKS4 é limitado exclusivamente a TCP. O suporte a UDP chegou com o SOCKS5.
