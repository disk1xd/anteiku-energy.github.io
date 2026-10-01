---
title: "Ghosts in the Wire"
authors: ["kemuri"]
date: 2026-06-13
summary: "Pivoting pra iniciantes (assim como eu)"
tags: ["redteam", "networking", "pivoting"]
draft: false
---

Antes de chegar em `Pivoting`, precisamos entender o que é uma segmentação de rede.

A segmentação de rede é a prática de dividir uma rede em seções isoladas ou menores. Essa técnica, além de melhorar o desempenho geral, é fundamental para a segurança da rede, pois dificulta que ameaças se espalhem lateralmente por toda a infraestrutura da empresa. Os principais métodos para implementar essa divisão incluem:

- `VLANs (Virtual Local Area Network)`: Permite dividir logicamente uma rede física em várias redes menores, limitando domínios de broadcast e isolando o tráfego.
- `Subnetting`: Divisão de uma faixa de endereços IP em redes menores.

### Pivoting

`Pivoting` é a técnica de usar um host comprometido como um entrypoint para avançar mais fundo no ambiente. Imagine que você conseguiu invadir uma casa e, após a invasão inicial, utiliza passagens internas para acessar cômodos que não seriam acessíveis apenas pela entrada principal `(entrypoint)`.

Em termos práticos: assim que você obtém um `entrypoint`, você `"pivota"` pelos sistemas internos que normalmente estariam inacessíveis.
