---
title: "Ghosts in the Wire"
authors: ["kemuri"]
date: 2026-06-13
summary: "Pivoting pra iniciantes (assim como eu)"
tags: ["redteam", "networking", "pivoting"]
draft: false
---

<figure>
  <img
    src="/images/above-the-lights-yuumei.jpg"
    alt="A lone figure on a rooftop overlooking a vast neon city at night, from Fisheye Placebo."
    loading="lazy"
    width="1500"
    height="762"
  />
  <figcaption>
    &ldquo;Above the Lights&rdquo; art by
    <a href="https://www.yuumeiart.com" target="_blank" rel="noopener">Yuumei</a>.
  </figcaption>
</figure>

- Antes de chegar em `Pivoting` precisamos entender o que eh uma segmentacao de rede.
    - A segmentacao de rede eh a pratica de dividir uma rede em secoes isoladas ou menores, essa tecnica alem de melhorar o desempenho no geral, ela eh fundamental para a seguranca da rede, pois dificulta ameacas se espalharem lateralmente por toda a infra da empresa. Os principais metodos para implementar essa divisao incluem:
        - `VLANs (Virtual Local Area Network)`: Permite dividir logicamente uma rede fisica em varias redes menores, limitando dominios de broadcast e isolando o trafego.
        - `Subnetting`: Divisao de uma faixa de enderecos IP em redes menores.

### Pivoting
- `Pivoting` eh a tecnica de usar um host comprometido como um "entrypoint" para ir mais a fundo no ambiente. Imagine que voce conseguiu invadir uma casa, apos a invasao inicial voce usa "portas secretadas" da casa para acessar comodos que nao seriam possiveis acessar so pela invasao inicial `(entrypoint)`. 
    - Em termos "ciberneticos": assim que voce consegue um `entrypoint`, voce `"pivota"` pelos sistemas internos que normalmente estariam inacessiveis.
