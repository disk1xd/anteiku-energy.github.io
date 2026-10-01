---
title: "the boring but necessary network stuff"
authors: ["kemuri"]
date: 2026-06-13
summary: "A base de redes que pivoting pede, relembrada."
tags: ["networking", "pivoting"]
draft: false
unlisted: true
---

<figure>
  <img
    src="/images/the-sound-and-fury-yuumei.jpg"
    alt="A figure amid swirling wind and light, by Yuumei."
    loading="lazy"
    width="1500"
    height="731"
  />
  <figcaption>
    &ldquo;The Sound and Fury&rdquo; art by
    <a href="https://www.yuumeiart.com" target="_blank" rel="noopener">Yuumei</a>.
  </figcaption>
</figure>

Compreender o conceito de `Pivoting` exige uma base sólida em alguns conceitos de rede.

### IP Addressing & NICs

Todo computador que interage com uma rede precisa de um endereço IP. Sem ele, a comunicação simplesmente não acontece. Esse endereço normalmente é atribuído automaticamente pelo `DHCP (Dynamic Host Configuration Protocol)`, protocolo responsável por automatizar essa tarefa. Ainda assim, é comum encontrar máquinas com IPs atribuídos estaticamente. Uma explicação sobre essa configuração manual:

Você define o IP diretamente no sistema operacional, o que garante que o dispositivo sempre utilizará aquele endereço, independentemente da rede em que estiver. Isso é fundamental para regras de firewall, redirecionamento de portas, entre outros.

> **OBS:** Isso pode gerar (e vai gerar) conflito caso o IP já esteja em uso por outro dispositivo na rede, já que você o configurou manualmente.

Seja de forma dinâmica ou estática, um endereço IP sempre será atribuído a um `NIC (Network Interface Controller)`. Abstraindo bastante: esse processo designa um IP a um adaptador de rede, seja ele físico ou virtual. Enquanto o IP identifica o dispositivo para o roteamento de dados, o `NIC` conecta o hardware à rede, seja por cabo ou Wi-Fi. O reconhecimento de oportunidades de `pivoting` depende frequentemente dos endereços IP atribuídos aos hosts que comprometemos, pois eles podem indicar quais redes nossa vítima consegue alcançar.

### Routing

Routing é o processo de decidir por qual caminho um pacote vai trafegar até chegar ao destino. Quando você compromete um host e quer alcançar outra rede, é necessário que o tráfego passe por ele. Para isso funcionar, você precisa manipular as rotas: adicionar uma rota estática na sua máquina apontando para o host comprometido, ou utilizá-lo como gateway. Você dita por onde os pacotes passam. Essa é a lógica do `pivoting`.

```sh
┌──(kemuri㉿evil)-[~]
└─$ route         
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
default         192.168.25.2    0.0.0.0         UG    100    0        0 eth0
192.168.25.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
```

Qualquer tráfego sem destino específico (`default`) passa pela gateway `192.168.25.2` antes de sair pela interface de rede `eth0`. Podemos chamar essa gateway de "carteiro".

Tráfego destinado à subnet `192.168.25.0/24` vai direto para a `eth0`, sem precisar de gateway.

> **OBS:** Não confunda o `0.0.0.0` da coluna `Gateway` com o bind de outros serviços. Não é a mesma coisa. Aqui ele significa que NÃO HÁ GATEWAY.
