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

- Ser capaz de compreender o conceito de `Pivoting` requer uma solida compreensao de alguns conceitos de rede.

### IP Addresing & NICs

- Todo computador que interage com uma rede precisa de um endereco IP, se ele nao tiver um, ele nunca vai interagir com uma rede. O endereco IP eh normalmente atribuido automaticamente pelo `DHCP (Dynamic Host Configuration Protocol)` - Protocolo responsavel por automatizar essa tarefa, apesar disso tambem eh comum encontrar computadores com IP's atribuidos estaticamente, uma explicacao abaixo sobre a configuracao manual.
    - Voce define o IP diretamente no OS, o que garante que o aparelho SEMPRE usara aquele endereco, mesmo fora da rede original. Eh fundamental para regras de firewall, redirecionamento de portas e etc.

        OBS: Isso pode dar (e vai dar) conflito se o IP ja estiver em uso por outra coisa na rede (tendo em vista que voce configura ele manualmente)
- Dinamicamente ou estaticamente, um endereco IP sempre vai ser atribuido a um `NIC (Network Interface Controller)`. Abstraindo bastante, esse processo designa um IP a um adaptor de rede (fisico ou virtual), enquanto o IP identifica o dispositivo para o roteamento de dados, o `NIC` conecta o hardware a rede (cabos ou Wi-Fi). O reconhecimento de oportunidades de `pivoting` depende frequentemente dos enderecos IP's atribuidos aos hosts que comprometemos, pois eles podem indicar as redes que nossa vitima pode alcancar.

### Routing

- Routing eh o processo de decidir por qual caminho um pacote vai trafegar ate chegar no destino. Quando voce compromete um host e quer alcancar outra rede, eh necessario que o trafego passe pelo host comprometido, pra isso funcionar tem que manipular as rotas, ou adicionar uma rota estatica na sua maquina apontando pro host comprometido, ou usando ele como gateway. Voce dita aonde os pacotes passam, eh a logica do `pivoting`.

```sh
  ┌──(kemuri㉿evil)-[~]
└─$ route         
Kernel IP routing table
Destination     Gateway         Genmask         Flags Metric Ref    Use Iface
default         192.168.25.2    0.0.0.0         UG    100    0        0 eth0
192.168.25.0    0.0.0.0         255.255.255.0   U     100    0        0 eth0
```

qualquer trafego sem destino especifico (default) passa pela gateway (podemos chamar de "carteiro") `192.168.25.2` antes de sair da interface de rede `eth0`.

trafego destinado a subnet inteira de `192.168.25.0/24` vai para a `eth0` sem precisar de gateway.

OBS: NAO confunda o `0.0.0.0` da `Gateway` com o bind de outros servicos, nao eh a mesma coisa, ela significa que NAO TEM GATEWAY!!
