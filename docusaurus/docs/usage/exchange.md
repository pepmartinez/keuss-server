---
id: exchanges
title: Exchanges API
sidebar_label: Exchanges API
---

## Exchanges stack

The included Exchanges stack supports the definition of Exchange queues with the following configuration parameters:

* Exchanges are defined as one or several configurations specifying one source queue and one or several exchange destinations
* Each exchange source `src` is defined by a queue namespace `ns` and a queue name  `queue`
* Exchange destination `dst` is defined as an array of objects defined by a namespace `ns`, a queue name `queue` and an (optional) evaluation function `selector`, this function will indicate, with it's execution result, if a particular message should be passed to the exchange destination queue
* An additional `max_hops` safeguard parameter may be set as a limit for the maximum number of hops that a message in an exchange may perform to avoid having loops in the definition that may end saturating the queues.
For example, giving this configuration:

[![](https://mermaid.ink/img/pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg)](https://mermaid.live/edit#pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg)

Messages flowing from QA may return to the source due to the exchanges from `QB2` and `QF`, so processing a set of messages in `QA` may cause an exponential growth of the number of messages in the same queue.

### Selector Evaluation

The selector evaluation is performed over the source queue by:

* Extracting one message from the source queue
* If a selector is defined for a particular destination, the message is passed as argument to the selector defined for each destination queue.

The result of evaluating the selector function can be:

* A boolean value: The message will be pushed to the destination queue only if the result is `true`.
* An object: The message is passed to the correspondent destination queue, and the properties of the returned object may be applied to the destination queue push (this applies to the `mature`, `delay` and `tries` properties)
 For example, defining a selector function like:

 ```js
  env => {return {delay: 1}}
 ```

That will mean that any message arriving to the exchange will be pushed to the destination queue with a delay of 1 second, since the `delay` parameter is one of the keuss `push` operation.

Notice that the evaluation of the different destination queues selectors is performed in a synchronous loop, in which the evaluation order is defined by the exchange configuration definition order. Once a message is reserved from the source, it is passed to the exchange evaluation loop, and each of the selectors receives the message in its current state. That means that as the message is passed to the selectors, they can change its values (or add other properties, for the case) so the next evaluated selectors in the configuration will receive this altered copy of the original message (and may choose to pass it to their destinations, with the altered values).

### Exchange Stats

Exchange execution will also report statistics about the queues execution and evaluation times

### Use case: Distributed Exchanges (queues on different servers)

Source and destination queues may be on different namespaces/BBDD (which means that some destination endpoint may be unreachable due to network or temporal issues). In that case, since the exchange is synchronous and not transactional, you may end up with problems due to duplicate messages arriving to queues on the same server of the source queue, or missing messages that fails to reach remote queue servers.
Lets see an example:

[![](https://mermaid.ink/img/pako:eNqVj7FOwzAURX_Fel0SKRlogcFISE3cjcWwenmKn4mFE1fOC6Wq-u-YNiDExnalc3Ske4IuWgIJLsRD12Ni8fRsRiGE3hZ6W4q6FvSOQTQiz0ehm0I3pRkX5Qe3V9oWui3_MnVlqtDqwiY-BsqucD4Eudqs7zu6qyZO8Y3kyjm37PrgLffydv9RdTHEdGEPvwpqKeD65j8FqGCgNKC3-ffpq2eAexrIgMzTksM5sAEznrM67y0y7aznmEA6DBNVgDPHl-PYgeQ007ekPL4mHBbr_AmfaW4O)](https://mermaid.live/edit#pako:eNqVj7FOwzAURX_Fel0SKRlogcFISE3cjcWwenmKn4mFE1fOC6Wq-u-YNiDExnalc3Ske4IuWgIJLsRD12Ni8fRsRiGE3hZ6W4q6FvSOQTQiz0ehm0I3pRkX5Qe3V9oWui3_MnVlqtDqwiY-BsqucD4Eudqs7zu6qyZO8Y3kyjm37PrgLffydv9RdTHEdGEPvwpqKeD65j8FqGCgNKC3-ffpq2eAexrIgMzTksM5sAEznrM67y0y7aznmEA6DBNVgDPHl-PYgeQ007ekPL4mHBbr_AmfaW4O)

In this schema, both `QC` and `QD` are queues defined in different servers, so, when a message arrives to `QA`, the exchange may propagate it to `QB` (which is in the same server), `QC` (in a remote server) and `QD` (in a different remote server), depending on the result of their selector function.
Since the exchange is synchronous, once a message is pulled from the source and committed into the first target, it will not be rolled back if the rest of the nodes fail to push it also, so, if `QC` and `QD` are having temporal issues, the message may be lost for them.
We can try to change selector functions to take this into account and re-insert the message into the source queue, but doing so may cause the message to be duplicated for `QB`, unless we start adding changes in our selector code to add meaningful state info to the message before inserting it back in the source code. This may end up adding a big over-complexity in the selector functions, which is not desirable at all. Instead, we can have a much-simpler way of dealing with this kind of configuration by adding some intermediate queues:

[![](https://mermaid.ink/img/pako:eNqV0L1uwyAUBeBXubpZbMkemv4MVKoUm25eaFcWBJcaFZsI46ZRlHevG9OoHbsdOB9n4IQ6GEKG1oeD7lVM0L3IEQDErhC7Euoa6EN5aGCJTyCaQjSlHDNZ77p2PXbtlbdr0xaiLf9aDhnzK-ZrxQvBL3hKR0_LY7DOe7a53T5ouq-mFMM7sY21Nuf64Ezq2d3-s9LBh3jpHn8t8Lygtjf_WcAKB4qDcmb5mNP3nsTU00AS2RINWTX7JFGO54XOe6MSPRuXQkRmlZ-oQjWn8HocNbIUZ_pB3Km3qIaszl_oFHW0)](https://mermaid.live/edit#pako:eNqV0L1uwyAUBeBXubpZbMkemv4MVKoUm25eaFcWBJcaFZsI46ZRlHevG9OoHbsdOB9n4IQ6GEKG1oeD7lVM0L3IEQDErhC7Euoa6EN5aGCJTyCaQjSlHDNZ77p2PXbtlbdr0xaiLf9aDhnzK-ZrxQvBL3hKR0_LY7DOe7a53T5ouq-mFMM7sY21Nuf64Ezq2d3-s9LBh3jpHn8t8Lygtjf_WcAKB4qDcmb5mNP3nsTU00AS2RINWTX7JFGO54XOe6MSPRuXQkRmlZ-oQjWn8HocNbIUZ_pB3Km3qIaszl_oFHW0)

`QLC` and `QLD` here are queues in the same server as `QA`, and merely act as a temporal stage before trying to exchange with the remote servers `QC` and `QD`. This way, the exchange is not blocked in case the remote servers presents any  temporal issue.
