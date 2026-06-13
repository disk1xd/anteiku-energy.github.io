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

- Agora que refrescamos a mente com certos fundamentos de rede por tras do pivoting, iremos abordar uma das tecnicas mais usadas na pratica.

### Port Forwarding

- O `Port Forwarding` eh uma tecnica que consiste em redirecionar uma solicitacao de comunicacao de uma rede para a outra, associando um endereco IP e numero de porta a outro. Na pratica, o invasor faz com que o trafego enviado para uma porta especifica na maquina atacante seja encaminhado atraves da maquina comprometida, eh uma tecnica muito usada para acessar servicos internos.

### Dynamic Port Forwarding

https://github.com/rofl0r/proxychains-ng

- Supondo que nao sabemos qual porta a gente pode acessar e nosso objetivo eh fazer um scan uma subnet, nao sera possivel fazer diretamente do host do atacante, pois nao possuimos rota para a subnet. Para fazer isso teremos que realizar o `Dynamic Port Forwarding`, podemos fazer isso rodando o SSH da nossa maquina com `-D` para abrir um `listener SOCKS` na nossa localhost, e o trafego sai pelo host comprometido que tem acesso a subnet alvo.
    - `ssh -N -f -D 9050 victim@10.129.202.64`
    - Para informar o `proxychains` que precisamos usar a porta `9050` (porta que colocamos no listener SOCKS) a gente edita o arquivo `/etc/proxychains4.conf` e adiciona `socks4 127.0.0.1 9050` na ultima linha do arquivo.

```sh
      ┌──(kemuri㉿evil)-[~/Desktop/Coisas/VPN]
└─$ proxychains -f /etc/proxychains4.conf nmap -sT -p 3389 172.16.5.19
[proxychains] config file found: /etc/proxychains4.conf
[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] DLL init: proxychains-ng 4.17
Starting Nmap 7.98 ( https://nmap.org ) at 2026-06-13 15:24 -0400
Nmap scan report for 172.16.5.19 (172.16.5.19)
Host is up (0.00031s latency).

PORT     STATE    SERVICE
3389/tcp filtered ms-wbt-server
```

A porta foi filtrada, mas com uma informacao inicial que tinha uma RDP rodando nesse ip, a gente pode confirmar com o netcat.

```sh
└─$ proxychains -f /etc/proxychains4.conf nc -nv 172.16.5.19 3389
[proxychains] config file found: /etc/proxychains4.conf
[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] Strict chain  ...  127.0.0.1:9050  ...  172.16.5.19:3389  ...  OK
(UNKNOWN) [172.16.5.19] 3389 (ms-wbt-server) open : Operation now in progress
```

Apos conectar na RDP (com o proxychains) com nossas credenciais obtidas previamente durante o engagement, o resultado foi esse:

```sh
┌──(kemuri㉿evil)-[~/Desktop/Coisas/VPN]
└─$ proxychains -f /etc/proxychains4.conf xfreerdp /v:172.16.5.19 /u:joaogamer /p:P@ssw0rdl33th4x0r
```

<img
  class="shot"
  src="/images/pivoting-rdp.webp"
  alt="Sessao RDP estabelecida atraves do proxychains."
  loading="lazy"
  width="1568"
  height="752"
/>

Pivoting completo, conexao estabelecida com a RDP.
