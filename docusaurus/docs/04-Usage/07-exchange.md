---
id: exchanges
title: Exchanges
sidebar_label: Exchanges
---

`keuss-server` provides the ability to define a graph interconnecting queues with consumer loops, where:

* each consumer loop read from exactly one `src` queue
* each consumer loop pushes in sequence to zero or more `dst` queues
* each push into a `dst` queue is controlled by a selector function: it controls whether the push is to be done or not, and also can modify the message

Therefore, an exchange is comprised of a `src` queue, a consumer loop, and  set of `dst` queues with their selectors. 

Zero or more exchanges can be defined either by configuration ro by REST API (although in the latter case they are not persisted yet); 
exchanges can use any queue in any namespace defined to `keuss-server`; so, exchanges can create a mesh or graph interconnecting queues on various locations, using different backend, stats and signal technologies

## Exchange spec
A more formal js-like spec would be:

```
{
  consumer: {
    parallel: <int, optional, defaults to 1>
    wsize:    <int, optional, defaults to 1>
    reserve:  <bool, optional, defaults to false>
  },
  src: {
    ns: <string>
    queue: <string>
  },
  dst: [
    {
      ns: <string>
      queue: <string>
      selector: <optional, string|function, no default>
    }[0..n]
  ]
}
```

* `consumer`
  * `parallel`: how many loops in parallel an exchange runs, one by default
  * `wsize`: maximum number of in-flight elements (ie, popped but not yet pushed/committed) allowed among all loops
  * `reserve`: if true, uses `reserve` to get elements from `src` and then `commit` after all pushes have been done (or `rollback` if an error arose); 
    if false, uses `pop` to get elements
* `src`
  * `ns`: namespace of the source queue
  * `queue`: name of the source queue; if non-existent it will be created
* `dst`: array of zero or more destination queues, each of them with the following values:
  * `ns`: namespace of the destination queue
  * `queue`: name of the destination queue; if non-existent it will be created
  * `selector`: function to define whether a popped element is pushed in to this destination queue (more information below)


## Loop execution
Here is a pseudocode (simplified) definition of the exchange loop:
```
forever 
  if reserve
    elem = reserve_elem_from_src_queue
  else
    elem = pop_elem_from_src_queue

  if too_many_hops(elem)
    push_elem_to_toomanyhopsqueue
    continue

  for each dst
    eval = dst.selector(elem)
    if eval
      push_elem_in_dst
      if error break
    
  if error_in_dst_loop
    if reserve
      rollback_elem_in_src_queue
  else if elem_not_pushed_anywhere
    push_elem_to_noroutequeue
```
As noted before, one instance of this loop (or more precisely, as many as `consumer.parallel`) will run per exchange, per server in the cluster

## The selector
There is an optiona selector function per destination; it can take the following values:
* null, not defined: it will take the semantics of 'pass': the message will always be pushed to the destination
* a js function with the prototype `fn(env) -> ret`
* a string parseable with node.js `vm` module into a js function with the prototype `fn(env) -> ret`

The selector gets called with one `env` object parameter that will contain 2 keys:
* `msg`: the message being looped. The selector recevies the actual message, not a copy, 
  so it *can* modify the message in mid-loop
* `state`: an object to keep state along each cycle of the loop: it is set to `{}` after each message is popped,
  and it's just kept and passed to all destinations' selectors in sequence. Selectors have no limitations about
  what can be done with the state

The selector is then expected to return a single value: 
* a *truthy* value will indicate the message gets pushed to the destination
  * if the return value is a non-empty object, 3 optional keys are taken into consideration to modify how the message is
    pushed:
    * `mature`: specifies a mature time for the push() keuss opertion 
    * `delay`:  specifies a delay for the push() keuss opertion 
    * `tries`:  specifies a number-of-tries for the push() keuss opertion 
* a *falsey* values will indicate the message does not get pushed to the destination
 
### Examples
 Defining a selector function like:
```js
  exchanges: {
    x1: {
      src: {...}
      dst: [{
        {
          ns: 'ns1',
          queue: 'one_dest',
          selector: env => {return {delay: 1}},
        },
        ...
      }]
    }
  }
```
will mean that any message arriving to the exchange's src queue will be pushed to the destination queue, and will be
done so with a delay of 1 second, as specified by the `delay` return parameter

This could be also written as a string, which would be json-compatible:

```js
  exchanges: {
    x1: {
      src: {...}
      dst: [{
        {
          ns: 'ns1',
          queue: 'one_dest',
          selector: 'env => {return {delay: 1}}',
        },
        ...
      }]
    }
  }
```

A more complete example, where the selector actually checks some of the message's headers:
```js
  exchanges: {
    x1: {
      src: {...}
      dst: [{
        {
          ns: 'ns1',
          queue: 'one_dest',
          selector: env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/)),
        },
        ...
      }]
    }
  }
```
messages into the exchange's src will be copied into queue `ns1.one_dest` if there is a header named `aaa`, whose value starts with `yes-`

## A note on loops on the exchange graph
As already mentioned, it is possible to create graphs of any shape with exchanges; this means that infinite loops may appear, if the selector functions involved do not take this into consideration

To add a safeguard against infinite loops, an additional `main.max_hops` config parameter may be set as a limit for the maximum number of hops that a message may perform to avoid saturating the queues.

For example, giving this configuration:

[![](https://mermaid.ink/img/pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg)](https://mermaid.live/edit#pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg)

Messages flowing from `QA` may return to the source due to the exchanges from `QB2` and `QF`, so processing a set of messages in `QA` may cause an exponential growth of the number of messages in the same queue.


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
