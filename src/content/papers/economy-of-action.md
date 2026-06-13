---
title: "The Economy of Action: Network Reconnaissance for Red Teams"
authors: ["Sp1d3rM"]
date: 2026-06-13
summary: "Collect, process, then act: passive and active network recon for red teams, told through a real engagement."
tags: ["redteam", "reconnaissance", "active-directory"]
draft: false
---

# INTRODUCTION

Everywhere you go, every offensive security certification course you take, you will hear about reconnaissance. Fingerprinting and footprinting. Passive and Active. If you open that famous blog posting app, you will see not dozens, not hundreds, but thousands of blog posts speaking about reconnaissance for red teamers, bug bounty hunters and penetration testers. Realistically, most (not all, mind you) only list or describe tools that automate some procedures. That is **not** what we are going to do today.

In today's article, we will see how to approach and apply passive and active reconnaissance techniques and procedures to acquire relevant network and technology intelligence to conduct further actions in an engagement and, most  importantly, how to actually **use** such intelligence.

Last but not least, we will be covering _mostly_ network passive/active reconnaissance and mostly Active Directory active reconnaissance. 

# OUR PROBLEM

When I was younger and started hacking, I felt like my recon was unorganized. With the years I noticed many beginners and some medium-level pentesters and bug hunters felt the same way I felt.

I found out later in life that my tools were not the problem. That the procedures were right. What was wrong was how I **processed** the acquired intelligence. We tend to move from recon to exploitation **as soon as we find out a possible path**. I advocate for mostly a different approach: first collect intelligence, process it and only then act.

In penetration testing and even bug hunting I would say that this approach should be ignored in many situations, but following it is useful in many other scenarios (specially when first approaching the target).

For red teams I would say the extreme opposite. This, for me and my team, is the default approach. You shouldn't be **doing two stages of a kill chain at the same time** (sort of, there are exceptions but bear with me).

# WHAT IS PASSIVE RECONNAISSANCE

Reconnaissance (or just recon) is a fundamental stage of the kill chain. It is during this stage attackers get to know their target and, for the duration of an engagement, an attacker will go back and forth with this stage for further data collection.

There are two types of recon: **passive** and **active**. Passive recon is accomplished by collecting data **without directly interacting with the target**. In our case, from an insider perspective (someone already in the network), this can be summarized as **collecting data while trying not to initiate interactions with other network assets**. You will have to interact with network assets eventually, complete silence is **pretty much impossible** so don't take this so literally, but we will mostly **not initiate** exchanges. A concrete example of a passive recon technique is **network traffic sniffing**.

Active recon, obviously, is accomplished by collecting data while directly interacting with a target. A concrete example of an active recon technique is **port scanning**.

# WHY SO PASSIVE

First, let's understand **why** you might want to conduct passive intelligence collection instead of active reconnaissance. The quick answer is simply **efficiency**.

As a red team operator (or a penetration tester in a evasive test scenario) you must act as if you are being watched at all times. Every action, every command, every network packet you send is being logged. This means you want to minimize the amount of plays you will need to achieve your objective (think about it like chess or any other turned based game). In other words, efficiency in this scenario is **optimizing the amount of actions done for the execution of a tactic**.

Secondly, you must understand that a network is a **live environment**. It works like a digital community, with machines constantly talking to each other to maintain vital functions and keep a seamless experience most of the time. This means that **there is information constantly floating on the wires which requires no or minimal plays to collect and/or trigger**.

Data collection (reconnaissance) **would be an action**. Every packet sent for active reconnaissance is an action. If we want to be efficient, we need to make the least amount of actions possible to understand and map the target environment. **Passive recon allows us to bypass some data collection actions**, which in turn makes our active recon more **efficient**.

>**\[ + \] Take this example:** You want to interact with services running on the network but you don't know their FQDNs or IP addresses. You could very easily utilize LDAP queries or quick, 1 port, port scans to identify targets. Both of those things are actions and they might trigger sensors around the network. Alternatively, you can spin up Tshark and capture some traffic and inside those communications, even though the **data** carried by the packet might be encrypted, by the protocols used, MAC Addresses (which in many cases spill out what type of asset that particular device is), domain names, ARP traffic and much more, you might be able to find out exactly what viable targets there are inside this particular network. All that without querying anything, without using any credentials. This is one example, network traffic is one way of conducting such operations. 
>
>So, now, in our example, you might know there is a MSSQL server running as `mssqlsvc.example.local`.
# SET DRESSING

To illustrate this article, I will use a real engagement conducted with my team. This was an engagement in which our initial access to the network was done through a **physical implant** plugged right into a conference room with an Ethernet cable. We used a Raspberry Pi 4 running Kali Linux and have set up a SSH server running on `localhost:some-port`. We exposed this SSH server through Cloudflare Tunnels, allowing operators to remote access the implant through the internet.

![](https://i.imgur.com/VkbW95u.png)

This could've gone wrong for a myriad of reasons mind you (802.1x with TLS, for instance, is one) but we had conducted some previous wireless reconnaissance and we understood that the network inside the conference rooms were configured for normal password authentication instead of TLS authentication. This meant that there was a chance we could connect directly to the network through an Ethernet cable and we *should* have no/little surprises.

I am set dressing because passive reconnaissance was conducted here too. We were able to identify a potential attack vector inside the conference rooms simply by analyzing wireless networks configurations. No interactions, no packets sent. We didn't brute-forced a way in, we analyzed, we saw an opportunity and **we took it**. Threat actors act exactly like that, you need to act like it too.

![](https://i.imgur.com/xS1hAA0.png)

# HOW TO DO IT
## Stop, Breath Deeply And Listen
First thing done after successfully acquiring a foothold was getting some basic network information automatically setup in the OS when plugging into the network and setting up tshark to capture traffic and responder to analyzer mode to also listen in. Before acting upon anything, **sit down and watch or listen**.

This philosophy can be transported to other scenarios too. When your beacon checks-in for the first time after a target has been successfully phished, you start situation awareness by listening and watching the host, privileges, hostname, network interfaces, etc. You do not start by running assemblies or randomly trying privilege escalation paths. A real threat is not anxious, it is **patient**. Got SMB share access? What's inside of it? Are you allowed to read? Read it then, understand the environment.

>**\[ + \] One must see to replicate.

Going back to our scenario, after 30 minutes or so of data collection, we've figured out a couple of things about the network, including firewall's brand, what switch we were connected to, it's model and software versions, workstations hostnames, IoT devices addresses and more.

## Think, Prepare, Proceed
Let's take a look in what we've found and add some active reconnaissance too. It is not presented in **order of execution**. It has been organized to tell a coherent story since everyone might reach the same conclusions in different orders of operation.

![](https://i.imgur.com/zz6ohcu.png)

 Reviewing later AD findings revealed that the network was using two load balancers for the two domain controllers reachable in that network, below is an image of the first time we've encountered them:

![](https://i.imgur.com/maQKwcb.png)
![](https://i.imgur.com/I0OQ9CE.png)

This finding illustrates the necessity of processing acquired intelligence. The string "VIP" in the hostname is **not a random identifier**; it designates a Virtual IP. Recognizing this allowed us to deduce the presence of a load-balanced infrastructure masking the actual Domain Controllers, mapping a layer of the network that automated tools often overlook. 

Responder didn't give us much, but gave us *something*. A couple of IP addresses. Some, later, were identified as workstations through network traffic analysis and DNS enumeration.

![](https://i.imgur.com/Kl9LP7R.png)

Above is an early screenshot, taken in the moment the first MDNS request was sniffed by responder. Later on, it revealed a couple more IP addresses.

The packet sniffing proved very fruitful since it revealed addresses and information related to a Cisco Switch and a Fortinet firewall. This could be used to move laterally in a case where one of those devices were accessible using an n-day exploit, a zero-day exploit (depending on the situation) or simply by the use of default/guessable credentials.

![](https://i.imgur.com/nQZikxt.png)

![](https://i.imgur.com/piTTUWQ.png)

It also revealed a couple of workstations. We know they are workstations because: 

1. Their hostname are part of the machine's serial number;
2. The MAC address are Dell addresses (and we know the target heavily rely on Dell laptops).

# FROM LISTENING TO ASKING

After collecting relevant addresses, hostnames, name conventions, etc, we decided to start enumerating other information through DNS because it fills in the gap we couldn't fill with passive reconnaissance (addresses and names of domain controllers)

```Shell
dig +short [Redacted] NS && sleep 30; dig +short _ldap._tcp.[Redacted] SRV && sleep 40; dig +short _kerberos._tcp.[Redacted] SRV && sleep 32; dig +short _gc._tcp.[Redacted] SRV && sleep 26; dig +short _ldap._tcp.dc._msdcs.[Redacted] SRV && sleep 60

# Copy results to a file

for i in $(cat host); do host $i; done
```

![](https://i.imgur.com/aiyLn4M.png)

![](https://i.imgur.com/jVBjAA4.png)

The "**paw**" here, referring to **Privilege Access Workstation**, is critical because it tells this most likely than not is not a common domain controller. More on that later

We were also able to LDAP query the domain for general information that allowed us to better understand the environment. The following query **does not require authentication** and returns a bunch of general information about the environment, which is why we picked it.

```Shell
ldapsearch -x -H ldap://10.160.2.11 -s base -b "" "(objectClass=*)"
```

Summarized results:

```LDAP
serverName: CN=SRVPAWCVADDS-01,CN=Servers,CN=Azure-BR,CN=Sites,CN=Configuration,DC=REDACTED,DC=local
schemaNamingContext: CN=Schema,CN=Configuration,DC=REDACTED,DC=local
namingContexts: DC=REDACTED,DC=LOCAL
namingContexts: CN=Configuration,DC=REDACTED,DC=local
namingContexts: CN=Schema,CN=Configuration,DC=REDACTED,DC=local
namingContexts: DC=ForestDnsZones,DC=REDACTED,DC=local
namingContexts: DC=DomainDnsZones,DC=REDACTED,DC=local
namingContexts: DC=DomainControllers-AzureBR
namingContexts: DC=DomainControllers-Azure
```

Very, very useful results. This allowed us to confirm that the target Domain was a **hybrid** environment (on-premise + Azure).
## Creating The Map
Now that we've collected sufficient information, we were capable of having a pretty decent idea of **how the network we were inserted in looks like**. It inhabited mainly IoT devices and **Privilege Access Workstations**, which can be summarized as specialized workstations for high privileges tasks execution, used to avoid executing highly sensitive tasks from common workstations that might be phished or exploited in an easier fashion. It usually is a device with the highest level of hardening. That shows that at least the technical security posture of the company was decent. Common workstations happen to come and go when employees access the conference room network.

This completely changed our approach to the network. If we hadn't conducted thorough reconnaissance, we would be completely blind. For instance, there is no reason to attempt a password spray against the Active Directory (as an example) because the **probability** of any **average user** account presence, based on this intelligence, is very low. In this instance we were only able to identify one admin account with the very original "admin" `samAccountName`. There were no servers since this was a segregated network for those conference rooms only (expected, to be fair). The approach **had to be different** from a common Active Directory engagement because the foothold was not *immediately* favorable for the Red Team. We could've lost hours, maybe days, trying attack paths that wouldn't ever work if we hadn't conducted such simple intelligence collection.

**Below, a representation of what the environment looked like from the red team's perspective at that point in time:**

![](https://i.imgur.com/DVur2e3.png)

# CONCLUSION

Intelligence gathering is an incredibly important stage of an engagement and one often underappreciated by newcomers and even more experienced professionals. If you do not conduct it properly, you will burn your access before the operation even begins. There is no **one size fits all** reconnaissance, one golden recipe. Everyone has their own flavor that intersects with others that must be adapted to your specific scenario. There surely are procedures for reconnaissance and enumeration, but more often than not professionals let that become a cake recipe. **Do not let this happen**. Do not recon on auto mode.

You can (and should) standardize a _portion_ of your reconnaissance pipeline but you **must adapt it on the fly**.

To conclude, your objective in this stage is to have a **clear picture of what the environment looks like**. What are the possible attack paths, what is the current detection landscape, what are the risk the team is taking currently and might take when moving to lateral movement or to further exploitation and separate high-value information from low-value information.

When analyzing some data, think **how it fits** into the puzzle. Do not think an IP address is "just" an IP address. It might lead you into a rabbit hole that will give you good information about how things are setup. If you can answer **where** you are and where you want to go, **what** you need to do to get there (with the greatest amount of certainty possible) and **who** might be in your way, you probably are good to move on.

Keep Hacking,  
Sp1d3rM_*^!
