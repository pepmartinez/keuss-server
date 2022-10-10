"use strict";(self.webpackChunkkeuss_server_docusaurus=self.webpackChunkkeuss_server_docusaurus||[]).push([[4402],{3905:(e,n,t)=>{t.d(n,{Zo:()=>u,kt:()=>d});var a=t(7294);function i(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function s(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function o(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?s(Object(t),!0).forEach((function(n){i(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):s(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function r(e,n){if(null==e)return{};var t,a,i=function(e,n){if(null==e)return{};var t,a,i={},s=Object.keys(e);for(a=0;a<s.length;a++)t=s[a],n.indexOf(t)>=0||(i[t]=e[t]);return i}(e,n);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(a=0;a<s.length;a++)t=s[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(i[t]=e[t])}return i}var l=a.createContext({}),p=function(e){var n=a.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):o(o({},n),e)),t},u=function(e){var n=p(e.components);return a.createElement(l.Provider,{value:n},e.children)},m={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},c=a.forwardRef((function(e,n){var t=e.components,i=e.mdxType,s=e.originalType,l=e.parentName,u=r(e,["components","mdxType","originalType","parentName"]),c=p(t),d=i,h=c["".concat(l,".").concat(d)]||c[d]||m[d]||s;return t?a.createElement(h,o(o({ref:n},u),{},{components:t})):a.createElement(h,o({ref:n},u))}));function d(e,n){var t=arguments,i=n&&n.mdxType;if("string"==typeof e||i){var s=t.length,o=new Array(s);o[0]=c;var r={};for(var l in n)hasOwnProperty.call(n,l)&&(r[l]=n[l]);r.originalType=e,r.mdxType="string"==typeof e?e:i,o[1]=r;for(var p=2;p<s;p++)o[p]=t[p];return a.createElement.apply(null,o)}return a.createElement.apply(null,t)}c.displayName="MDXCreateElement"},1915:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>l,contentTitle:()=>o,default:()=>m,frontMatter:()=>s,metadata:()=>r,toc:()=>p});var a=t(7462),i=(t(7294),t(3905));const s={id:"exchanges",title:"Exchanges",sidebar_label:"Exchanges"},o=void 0,r={unversionedId:"Usage/exchanges",id:"Usage/exchanges",title:"Exchanges",description:"keuss-server provides the ability to define a graph interconnecting queues with consumer loops, where:",source:"@site/docs/04-Usage/07-exchange.md",sourceDirName:"04-Usage",slug:"/Usage/exchanges",permalink:"/keuss-server/docs/Usage/exchanges",draft:!1,editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/04-Usage/07-exchange.md",tags:[],version:"current",sidebarPosition:7,frontMatter:{id:"exchanges",title:"Exchanges",sidebar_label:"Exchanges"},sidebar:"tutorialSidebar",previous:{title:"Web Console",permalink:"/keuss-server/docs/Usage/gui"},next:{title:"Examples",permalink:"/keuss-server/docs/examples"}},l={},p=[{value:"Exchange spec",id:"exchange-spec",level:2},{value:"Loop execution",id:"loop-execution",level:2},{value:"The selector",id:"the-selector",level:2},{value:"Examples",id:"examples",level:3},{value:"A note on loops on the exchange graph",id:"a-note-on-loops-on-the-exchange-graph",level:2},{value:"Exchange Stats",id:"exchange-stats",level:3},{value:"Use case: Distributed Exchanges (queues on different servers)",id:"use-case-distributed-exchanges-queues-on-different-servers",level:3}],u={toc:p};function m(e){let{components:n,...t}=e;return(0,i.kt)("wrapper",(0,a.Z)({},u,t,{components:n,mdxType:"MDXLayout"}),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"keuss-server")," provides the ability to define a graph interconnecting queues with consumer loops, where:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"each consumer loop read from exactly one ",(0,i.kt)("inlineCode",{parentName:"li"},"src")," queue"),(0,i.kt)("li",{parentName:"ul"},"each consumer loop pushes in sequence to zero or more ",(0,i.kt)("inlineCode",{parentName:"li"},"dst")," queues"),(0,i.kt)("li",{parentName:"ul"},"each push into a ",(0,i.kt)("inlineCode",{parentName:"li"},"dst")," queue is controlled by a selector function: it controls whether the push is to be done or not, and also can modify the message")),(0,i.kt)("p",null,"Therefore, an exchange is comprised of a ",(0,i.kt)("inlineCode",{parentName:"p"},"src")," queue, a consumer loop, and  set of ",(0,i.kt)("inlineCode",{parentName:"p"},"dst")," queues with their selectors."),(0,i.kt)("p",null,"Zero or more exchanges can be defined either by configuration or by REST API (although in the latter case they are not persisted yet);\nexchanges can use any queue in any namespace defined to ",(0,i.kt)("inlineCode",{parentName:"p"},"keuss-server"),"; so, exchanges can create a mesh or graph interconnecting queues on various locations, using different backend, stats and signal technologies"),(0,i.kt)("h2",{id:"exchange-spec"},"Exchange spec"),(0,i.kt)("p",null,"A more formal js-like spec would be:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"{\n  consumer: {\n    parallel: <int, optional, defaults to 1>\n    wsize:    <int, optional, defaults to 1>\n    reserve:  <bool, optional, defaults to false>\n  },\n  src: {\n    ns: <string>\n    queue: <string>\n  },\n  dst: [\n    {\n      ns: <string>\n      queue: <string>\n      selector: <optional, string|function, no default>\n    }[0..n]\n  ]\n}\n")),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"consumer"),(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"parallel"),": how many loops in parallel an exchange runs, one by default"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"wsize"),": maximum number of in-flight elements (ie, popped but not yet pushed/committed) allowed among all loops"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"reserve"),": if true, uses ",(0,i.kt)("inlineCode",{parentName:"li"},"reserve")," to get elements from ",(0,i.kt)("inlineCode",{parentName:"li"},"src")," and then ",(0,i.kt)("inlineCode",{parentName:"li"},"commit")," after all pushes have been done (or ",(0,i.kt)("inlineCode",{parentName:"li"},"rollback")," if an error arose);\nif false, uses ",(0,i.kt)("inlineCode",{parentName:"li"},"pop")," to get elements"))),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"src"),(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"ns"),": namespace of the source queue"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"queue"),": name of the source queue; if non-existent it will be created"))),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"dst"),": array of zero or more destination queues, each of them with the following values:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"ns"),": namespace of the destination queue"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"queue"),": name of the destination queue; if non-existent it will be created"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"selector"),": function to define whether a popped element is pushed into this destination queue (more information below)")))),(0,i.kt)("h2",{id:"loop-execution"},"Loop execution"),(0,i.kt)("p",null,"Here is a pseudocode (simplified) definition of the exchange loop:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre"},"forever \n  if reserve\n    elem = reserve_elem_from_src_queue\n  else\n    elem = pop_elem_from_src_queue\n\n  if too_many_hops(elem)\n    push_elem_to_toomanyhopsqueue\n    continue\n\n  for each dst\n    eval = dst.selector(elem)\n    if eval\n      push_elem_in_dst\n      if error break\n    \n  if error_in_dst_loop\n    if reserve\n      rollback_elem_in_src_queue\n  else if elem_not_pushed_anywhere\n    push_elem_to_noroutequeue\n")),(0,i.kt)("p",null,"As noted before, one instance of this loop (or more precisely, as many as ",(0,i.kt)("inlineCode",{parentName:"p"},"consumer.parallel"),") will run per exchange, per server in the cluster"),(0,i.kt)("h2",{id:"the-selector"},"The selector"),(0,i.kt)("p",null,"There is an optiona selector function per destination; it can take the following values:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"null, not defined: it will take the semantics of 'pass': the message will always be pushed to the destination"),(0,i.kt)("li",{parentName:"ul"},"a js function with the prototype ",(0,i.kt)("inlineCode",{parentName:"li"},"fn(env) -> ret")),(0,i.kt)("li",{parentName:"ul"},"a string parseable with node.js ",(0,i.kt)("inlineCode",{parentName:"li"},"vm")," module into a js function with the prototype ",(0,i.kt)("inlineCode",{parentName:"li"},"fn(env) -> ret"))),(0,i.kt)("p",null,"The selector gets called with one ",(0,i.kt)("inlineCode",{parentName:"p"},"env")," object parameter that will contain 2 keys:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"msg"),": the message being looped. The selector recevies the actual message, not a copy,\nso it ",(0,i.kt)("em",{parentName:"li"},"can")," modify the message in mid-loop"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"state"),": an object to keep state along each cycle of the loop: it is set to ",(0,i.kt)("inlineCode",{parentName:"li"},"{}")," after each message is popped,\nand it's just kept and passed to all destinations' selectors in sequence. Selectors have no limitations about\nwhat can be done with the state")),(0,i.kt)("p",null,"The selector is then expected to return a single value:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"a ",(0,i.kt)("em",{parentName:"li"},"truthy")," value will indicate the message gets pushed to the destination",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},"if the return value is a non-empty object, 3 optional keys are taken into consideration to modify how the message is\npushed:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"mature"),": specifies a mature time for the push() keuss opertion "),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"delay"),":  specifies a delay for the push() keuss opertion "),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"tries"),":  specifies a number-of-tries for the push() keuss opertion "))))),(0,i.kt)("li",{parentName:"ul"},"a ",(0,i.kt)("em",{parentName:"li"},"falsey")," values will indicate the message does not get pushed to the destination")),(0,i.kt)("h3",{id:"examples"},"Examples"),(0,i.kt)("p",null," Defining a selector function like:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"  exchanges: {\n    x1: {\n      src: {...}\n      dst: [{\n        {\n          ns: 'ns1',\n          queue: 'one_dest',\n          selector: env => {return {delay: 1}},\n        },\n        ...\n      }]\n    }\n  }\n")),(0,i.kt)("p",null,"will mean that any message arriving to the exchange's src queue will be pushed to the destination queue, and will be\ndone so with a delay of 1 second, as specified by the ",(0,i.kt)("inlineCode",{parentName:"p"},"delay")," return parameter"),(0,i.kt)("p",null,"This could be also written as a string, which would be json-compatible:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"  exchanges: {\n    x1: {\n      src: {...}\n      dst: [{\n        {\n          ns: 'ns1',\n          queue: 'one_dest',\n          selector: 'env => {return {delay: 1}}',\n        },\n        ...\n      }]\n    }\n  }\n")),(0,i.kt)("p",null,"A more complete example, where the selector actually checks some of the message's headers:"),(0,i.kt)("pre",null,(0,i.kt)("code",{parentName:"pre",className:"language-js"},"  exchanges: {\n    x1: {\n      src: {...}\n      dst: [{\n        {\n          ns: 'ns1',\n          queue: 'one_dest',\n          selector: env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/)),\n        },\n        ...\n      }]\n    }\n  }\n")),(0,i.kt)("p",null,"messages into the exchange's src will be copied into queue ",(0,i.kt)("inlineCode",{parentName:"p"},"ns1.one_dest")," if there is a header named ",(0,i.kt)("inlineCode",{parentName:"p"},"aaa"),", whose value starts with ",(0,i.kt)("inlineCode",{parentName:"p"},"yes-")),(0,i.kt)("h2",{id:"a-note-on-loops-on-the-exchange-graph"},"A note on loops on the exchange graph"),(0,i.kt)("p",null,"As already mentioned, it is possible to create graphs of any shape with exchanges; this means that infinite loops may appear, if the selector functions involved do not take this into consideration"),(0,i.kt)("p",null,"To add a safeguard against infinite loops, an additional ",(0,i.kt)("inlineCode",{parentName:"p"},"main.max_hops")," config parameter may be set as a limit for the maximum number of hops that a message may perform to avoid saturating the queues."),(0,i.kt)("p",null,"For example, giving this configuration:"),(0,i.kt)("p",null,(0,i.kt)("a",{parentName:"p",href:"https://mermaid.live/edit#pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg"},(0,i.kt)("img",{parentName:"a",src:"https://mermaid.ink/img/pako:eNpVjj0LgzAQQP_KcZMBXRwzFPyodeiSds0STKyCJiVNKEX877XECL3p3rs33IKdkQop9pN5d4OwDq43rgGAFQkrCECWnYCVCStJ0OVucq73LogqYRX5M3XCahKrOrg2UBuoidedL5GbwEXkMj8EHIMpzsrOYpTb_8vvwtENalYc6bZK1Qs_OY5cr1vqn1I4dZajMxZpL6aXSlF4Z-4f3SF11qsY1aN4WDHv1foFe5lRpg",alt:null}))),(0,i.kt)("p",null,"Messages flowing from ",(0,i.kt)("inlineCode",{parentName:"p"},"QA")," may return to the source due to the exchanges from ",(0,i.kt)("inlineCode",{parentName:"p"},"QB2")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"QF"),", so processing a set of messages in ",(0,i.kt)("inlineCode",{parentName:"p"},"QA")," may cause an exponential growth of the number of messages in the same queue."),(0,i.kt)("h3",{id:"exchange-stats"},"Exchange Stats"),(0,i.kt)("p",null,"Exchange execution will also report statistics about the queues execution and evaluation times"),(0,i.kt)("h3",{id:"use-case-distributed-exchanges-queues-on-different-servers"},"Use case: Distributed Exchanges (queues on different servers)"),(0,i.kt)("p",null,"Source and destination queues may be on different namespaces/BBDD (which means that some destination endpoint may be unreachable due to network or temporal issues). In that case, since the exchange is synchronous and not transactional, you may end up with problems due to duplicate messages arriving to queues on the same server of the source queue, or missing messages that fails to reach remote queue servers.\nLets see an example:"),(0,i.kt)("p",null,(0,i.kt)("a",{parentName:"p",href:"https://mermaid.live/edit#pako:eNqVj7FOwzAURX_Fel0SKRlogcFISE3cjcWwenmKn4mFE1fOC6Wq-u-YNiDExnalc3Ske4IuWgIJLsRD12Ni8fRsRiGE3hZ6W4q6FvSOQTQiz0ehm0I3pRkX5Qe3V9oWui3_MnVlqtDqwiY-BsqucD4Eudqs7zu6qyZO8Y3kyjm37PrgLffydv9RdTHEdGEPvwpqKeD65j8FqGCgNKC3-ffpq2eAexrIgMzTksM5sAEznrM67y0y7aznmEA6DBNVgDPHl-PYgeQ007ekPL4mHBbr_AmfaW4O"},(0,i.kt)("img",{parentName:"a",src:"https://mermaid.ink/img/pako:eNqVj7FOwzAURX_Fel0SKRlogcFISE3cjcWwenmKn4mFE1fOC6Wq-u-YNiDExnalc3Ske4IuWgIJLsRD12Ni8fRsRiGE3hZ6W4q6FvSOQTQiz0ehm0I3pRkX5Qe3V9oWui3_MnVlqtDqwiY-BsqucD4Eudqs7zu6qyZO8Y3kyjm37PrgLffydv9RdTHEdGEPvwpqKeD65j8FqGCgNKC3-ffpq2eAexrIgMzTksM5sAEznrM67y0y7aznmEA6DBNVgDPHl-PYgeQ007ekPL4mHBbr_AmfaW4O",alt:null}))),(0,i.kt)("p",null,"In this schema, both ",(0,i.kt)("inlineCode",{parentName:"p"},"QC")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"QD")," are queues defined in different servers, so, when a message arrives to ",(0,i.kt)("inlineCode",{parentName:"p"},"QA"),", the exchange may propagate it to ",(0,i.kt)("inlineCode",{parentName:"p"},"QB")," (which is in the same server), ",(0,i.kt)("inlineCode",{parentName:"p"},"QC")," (in a remote server) and ",(0,i.kt)("inlineCode",{parentName:"p"},"QD")," (in a different remote server), depending on the result of their selector function.\nSince the exchange is synchronous, once a message is pulled from the source and committed into the first target, it will not be rolled back if the rest of the nodes fail to push it also, so, if ",(0,i.kt)("inlineCode",{parentName:"p"},"QC")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"QD")," are having temporal issues, the message may be lost for them.\nWe can try to change selector functions to take this into account and re-insert the message into the source queue, but doing so may cause the message to be duplicated for ",(0,i.kt)("inlineCode",{parentName:"p"},"QB"),", unless we start adding changes in our selector code to add meaningful state info to the message before inserting it back in the source code. This may end up adding a big over-complexity in the selector functions, which is not desirable at all. Instead, we can have a much-simpler way of dealing with this kind of configuration by adding some intermediate queues:"),(0,i.kt)("p",null,(0,i.kt)("a",{parentName:"p",href:"https://mermaid.live/edit#pako:eNqV0L1uwyAUBeBXubpZbMkemv4MVKoUm25eaFcWBJcaFZsI46ZRlHevG9OoHbsdOB9n4IQ6GEKG1oeD7lVM0L3IEQDErhC7Euoa6EN5aGCJTyCaQjSlHDNZ77p2PXbtlbdr0xaiLf9aDhnzK-ZrxQvBL3hKR0_LY7DOe7a53T5ouq-mFMM7sY21Nuf64Ezq2d3-s9LBh3jpHn8t8Lygtjf_WcAKB4qDcmb5mNP3nsTU00AS2RINWTX7JFGO54XOe6MSPRuXQkRmlZ-oQjWn8HocNbIUZ_pB3Km3qIaszl_oFHW0"},(0,i.kt)("img",{parentName:"a",src:"https://mermaid.ink/img/pako:eNqV0L1uwyAUBeBXubpZbMkemv4MVKoUm25eaFcWBJcaFZsI46ZRlHevG9OoHbsdOB9n4IQ6GEKG1oeD7lVM0L3IEQDErhC7Euoa6EN5aGCJTyCaQjSlHDNZ77p2PXbtlbdr0xaiLf9aDhnzK-ZrxQvBL3hKR0_LY7DOe7a53T5ouq-mFMM7sY21Nuf64Ezq2d3-s9LBh3jpHn8t8Lygtjf_WcAKB4qDcmb5mNP3nsTU00AS2RINWTX7JFGO54XOe6MSPRuXQkRmlZ-oQjWn8HocNbIUZ_pB3Km3qIaszl_oFHW0",alt:null}))),(0,i.kt)("p",null,(0,i.kt)("inlineCode",{parentName:"p"},"QLC")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"QLD")," here are queues in the same server as ",(0,i.kt)("inlineCode",{parentName:"p"},"QA"),", and merely act as a temporal stage before trying to exchange with the remote servers ",(0,i.kt)("inlineCode",{parentName:"p"},"QC")," and ",(0,i.kt)("inlineCode",{parentName:"p"},"QD"),". This way, the exchange is not blocked in case the remote servers presents any  temporal issue."))}m.isMDXComponent=!0}}]);