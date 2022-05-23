"use strict";(self.webpackChunkkeuss_server_docusaurus=self.webpackChunkkeuss_server_docusaurus||[]).push([[867],{3905:function(e,t,n){n.d(t,{Zo:function(){return p},kt:function(){return c}});var r=n(7294);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function o(e,t){if(null==e)return{};var n,r,a=function(e,t){if(null==e)return{};var n,r,a={},i=Object.keys(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||(a[n]=e[n]);return a}(e,t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(e);for(r=0;r<i.length;r++)n=i[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(a[n]=e[n])}return a}var l=r.createContext({}),u=function(e){var t=r.useContext(l),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},p=function(e){var t=u(e.components);return r.createElement(l.Provider,{value:t},e.children)},m={inlineCode:"code",wrapper:function(e){var t=e.children;return r.createElement(r.Fragment,{},t)}},d=r.forwardRef((function(e,t){var n=e.components,a=e.mdxType,i=e.originalType,l=e.parentName,p=o(e,["components","mdxType","originalType","parentName"]),d=u(n),c=a,f=d["".concat(l,".").concat(c)]||d[c]||m[c]||i;return n?r.createElement(f,s(s({ref:t},p),{},{components:n})):r.createElement(f,s({ref:t},p))}));function c(e,t){var n=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var i=n.length,s=new Array(i);s[0]=d;var o={};for(var l in t)hasOwnProperty.call(t,l)&&(o[l]=t[l]);o.originalType=e,o.mdxType="string"==typeof e?e:a,s[1]=o;for(var u=2;u<i;u++)s[u]=n[u];return r.createElement.apply(null,s)}return r.createElement.apply(null,n)}d.displayName="MDXCreateElement"},4958:function(e,t,n){n.r(t),n.d(t,{assets:function(){return p},contentTitle:function(){return l},default:function(){return c},frontMatter:function(){return o},metadata:function(){return u},toc:function(){return m}});var r=n(3117),a=n(102),i=(n(7294),n(3905)),s=["components"],o={id:"stomp",title:"STOMP API",sidebar_label:"STOMP API"},l=void 0,u={unversionedId:"usage/stomp",id:"usage/stomp",title:"STOMP API",description:"STOMP stack",source:"@site/docs/usage/stomp.md",sourceDirName:"usage",slug:"/usage/stomp",permalink:"/keuss-server/docs/usage/stomp",draft:!1,editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/usage/stomp.md",tags:[],version:"current",frontMatter:{id:"stomp",title:"STOMP API",sidebar_label:"STOMP API"},sidebar:"someSidebar",previous:{title:"REST API",permalink:"/keuss-server/docs/usage/rest"},next:{title:"AMQP 1.0 API",permalink:"/keuss-server/docs/usage/amqp10"}},p={},m=[{value:"STOMP stack",id:"stomp-stack",level:2}],d={toc:m};function c(e){var t=e.components,n=(0,a.Z)(e,s);return(0,i.kt)("wrapper",(0,r.Z)({},d,n,{components:t,mdxType:"MDXLayout"}),(0,i.kt)("h2",{id:"stomp-stack"},"STOMP stack"),(0,i.kt)("p",null,"The included STOMP stack supports only version 1.2 of STOMP, with the following exceptions:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"There is no support for transactions, so frames BEGIN, COMMIT and ABORT are not supported"),(0,i.kt)("li",{parentName:"ul"},"On SUBSCRIBE, ack type ",(0,i.kt)("em",{parentName:"li"},"client")," is not supported; you'd need to use ",(0,i.kt)("em",{parentName:"li"},"client-individual")," and emit ack/nack for each message. Also, ",(0,i.kt)("em",{parentName:"li"},"client-individual")," is also not supported on queues lacking reserve support (type redis:list)"),(0,i.kt)("li",{parentName:"ul"},"Any type of body is allowed, not just string; for non-string bodies it is recommended to pass a ",(0,i.kt)("inlineCode",{parentName:"li"},"content-length")," header to ensire bodies are read complete; also, the header ",(0,i.kt)("inlineCode",{parentName:"li"},"content-type")," is kept and stored alongside the body (as keuss element headers)"),(0,i.kt)("li",{parentName:"ul"},"On NACK frames:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},"A NACKed message will be delayed by 5 secs; that is, a NACKed message will not be reserved again (by any keuss client) until at least 5 secs have elapsed"),(0,i.kt)("li",{parentName:"ul"},"There is no limit of retries")))),(0,i.kt)("p",null,"There are also a few additions on top of the standard STOMP:"),(0,i.kt)("ul",null,(0,i.kt)("li",{parentName:"ul"},"Support for parallel ",(0,i.kt)("em",{parentName:"li"},"consumers")," on subscriptions: more than one consumer can be used on any given subscription to pop/reserve elements from the underlying queue, just pass an extra header ",(0,i.kt)("inlineCode",{parentName:"li"},"x-parallel")," on the SUBSCRIBE frame with the desired number of parallel consumers (defaults to 1)"),(0,i.kt)("li",{parentName:"ul"},"Support for window size to limit the number of ",(0,i.kt)("em",{parentName:"li"},"in flight")," messages on subscriptions: ",(0,i.kt)("em",{parentName:"li"},"in flight")," messages are messages waiting to be acked/nacked, but also consumers waiting for a pop-from-queue. Default window size is 1000, but it can be specified by passing a header ",(0,i.kt)("inlineCode",{parentName:"li"},"x-wsize")," on the SUBSCRIBE frame"),(0,i.kt)("li",{parentName:"ul"},"Delay/Scheduling in SEND/NACK: messages can be delayed or scheduled for later on SEND frames, but also when NACKing a message. Simply use one of those headers (if none used, it will assume ",(0,i.kt)("inlineCode",{parentName:"li"},"x-delta-t: 0"),"):",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"x-next-t"),": UNIX time in milliseconds, to set an absolute time"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"x-delta-t"),": a delta in milliseconds from now, for a relative time"))),(0,i.kt)("li",{parentName:"ul"},"Extra info in MESSAGE: some extra info is included on each MESSAGE frame returned, to ease retries and/or better management:",(0,i.kt)("ul",{parentName:"li"},(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"x-mature"),": ISO timestamp when the message became eligible for ",(0,i.kt)("inlineCode",{parentName:"li"},"pop"),"/",(0,i.kt)("inlineCode",{parentName:"li"},"reserve")," (mature)"),(0,i.kt)("li",{parentName:"ul"},(0,i.kt)("inlineCode",{parentName:"li"},"x-tries"),": number of tries of this message. Each NACK increments this value, so this can be used in conjunction with ",(0,i.kt)("inlineCode",{parentName:"li"},"x-delta-t")," to implement custom delays on failing elements, or limiting the number of retries"),(0,i.kt)("li",{parentName:"ul"},"any header with name starting with ",(0,i.kt)("inlineCode",{parentName:"li"},"x-ks-hdr-")," is stored alongside the body (as keuss element headers) and therefore passed along it"))),(0,i.kt)("li",{parentName:"ul"},"There is no support for ",(0,i.kt)("inlineCode",{parentName:"li"},"auth")," yet. User and password are simply ignored")))}c.isMDXComponent=!0}}]);