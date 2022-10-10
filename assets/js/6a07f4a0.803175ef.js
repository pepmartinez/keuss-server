"use strict";(self.webpackChunkkeuss_server_docusaurus=self.webpackChunkkeuss_server_docusaurus||[]).push([[3558],{3905:(e,n,t)=>{t.d(n,{Zo:()=>u,kt:()=>g});var a=t(7294);function s(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function o(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,a)}return t}function r(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?o(Object(t),!0).forEach((function(n){s(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):o(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function l(e,n){if(null==e)return{};var t,a,s=function(e,n){if(null==e)return{};var t,a,s={},o=Object.keys(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||(s[t]=e[t]);return s}(e,n);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(a=0;a<o.length;a++)t=o[a],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(s[t]=e[t])}return s}var i=a.createContext({}),c=function(e){var n=a.useContext(i),t=n;return e&&(t="function"==typeof e?e(n):r(r({},n),e)),t},u=function(e){var n=c(e.components);return a.createElement(i.Provider,{value:n},e.children)},d={inlineCode:"code",wrapper:function(e){var n=e.children;return a.createElement(a.Fragment,{},n)}},p=a.forwardRef((function(e,n){var t=e.components,s=e.mdxType,o=e.originalType,i=e.parentName,u=l(e,["components","mdxType","originalType","parentName"]),p=c(t),g=s,m=p["".concat(i,".").concat(g)]||p[g]||d[g]||o;return t?a.createElement(m,r(r({ref:n},u),{},{components:t})):a.createElement(m,r({ref:n},u))}));function g(e,n){var t=arguments,s=n&&n.mdxType;if("string"==typeof e||s){var o=t.length,r=new Array(o);r[0]=p;var l={};for(var i in n)hasOwnProperty.call(n,i)&&(l[i]=n[i]);l.originalType=e,l.mdxType="string"==typeof e?e:s,r[1]=l;for(var c=2;c<o;c++)r[c]=t[c];return a.createElement.apply(null,r)}return a.createElement.apply(null,t)}p.displayName="MDXCreateElement"},8398:(e,n,t)=>{t.r(n),t.d(n,{assets:()=>i,contentTitle:()=>r,default:()=>d,frontMatter:()=>o,metadata:()=>l,toc:()=>c});var a=t(7462),s=(t(7294),t(3905));const o={id:"concepts",title:"Concepts",sidebar_label:"Concepts"},r=void 0,l={unversionedId:"concepts",id:"concepts",title:"Concepts",description:"Keuss-Server is a rather shallow layer on top of keuss just to provide client-server",source:"@site/docs/03-concepts.md",sourceDirName:".",slug:"/concepts",permalink:"/keuss-server/docs/concepts",draft:!1,editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/03-concepts.md",tags:[],version:"current",sidebarPosition:3,frontMatter:{id:"concepts",title:"Concepts",sidebar_label:"Concepts"},sidebar:"tutorialSidebar",previous:{title:"Quickstart",permalink:"/keuss-server/docs/quickstart"},next:{title:"REST API",permalink:"/keuss-server/docs/Usage/rest"}},i={},c=[{value:"Queue",id:"queue",level:2},{value:"Deadletter support",id:"deadletter-support",level:3},{value:"Storage",id:"storage",level:2},{value:"Signaller",id:"signaller",level:2},{value:"Stats",id:"stats",level:2},{value:"Exchange",id:"exchange",level:2},{value:"How all fits together",id:"how-all-fits-together",level:2},{value:"Configuration",id:"configuration",level:2}],u={toc:c};function d(e){let{components:n,...t}=e;return(0,s.kt)("wrapper",(0,a.Z)({},u,t,{components:n,mdxType:"MDXLayout"}),(0,s.kt)("p",null,"Keuss-Server is a rather shallow layer on top of ",(0,s.kt)("a",{parentName:"p",href:"https://pepmartinez.github.io/keuss/"},"keuss")," just to provide client-server\ncapabilities; all of Keuss concepts except Processors and Pipelines are used on keuss-server"),(0,s.kt)("h2",{id:"queue"},"Queue"),(0,s.kt)("p",null,"Keuss-Server provides the same queue concepts Keuss provides; queues are then grouped in namespaces. See ",(0,s.kt)("a",{parentName:"p",href:"https://pepmartinez.github.io/keuss/docs/concepts#queue"},"here")),(0,s.kt)("h3",{id:"deadletter-support"},"Deadletter support"),(0,s.kt)("p",null,"Only STOMP interfaces support deadletters (that is, move to a parking queue all elements that are rolled back too many times).\nFor that to work, the Namespace config has to be configured to support deadletter"),(0,s.kt)("h2",{id:"storage"},"Storage"),(0,s.kt)("p",null,"Queues are just simple, shallow concepts modeled on top of Storages or Backends. Keuss-Server can use any storage provided by\nKeuss; see ",(0,s.kt)("a",{parentName:"p",href:"https://pepmartinez.github.io/keuss/docs/concepts#storage"},"here")),(0,s.kt)("h2",{id:"signaller"},"Signaller"),(0,s.kt)("p",null,"Signallers provide the needed clustering node intercommunication; all of Keuss' signallers can be used, although for true clustering the use of ",(0,s.kt)("inlineCode",{parentName:"p"},"local")," signaller is not recommended. See ",(0,s.kt)("a",{parentName:"p",href:"https://pepmartinez.github.io/keuss/docs/concepts#signaller"},"here")," for more info"),(0,s.kt)("h2",{id:"stats"},"Stats"),(0,s.kt)("p",null,"Per-cluster Stats are also provided by Keuss; any of Keuss Stats providers can be used, but use of ",(0,s.kt)("inlineCode",{parentName:"p"},"mem")," provider would not provide actual per-cluster stats in a multi-node cluster"),(0,s.kt)("h2",{id:"exchange"},"Exchange"),(0,s.kt)("p",null,"A graph interconnecting queues -even on different namespaces and using different backends in different datacenters- can be defined by means of exchanges; one exchange is basically a consumer loop acting (popping) in a 'source' queue, and inserting (pushing) on zero or more queues, where the push on each queue is conditional and may modify the message in the process"),(0,s.kt)("p",null,"Exchanges can be created by config, or managed via REST; they are created in all nodes of a cluster, too, so they are fully distributed"),(0,s.kt)("h2",{id:"how-all-fits-together"},"How all fits together"),(0,s.kt)("ol",null,(0,s.kt)("li",{parentName:"ol"},"One or more Stats objects are defined, each one with its own configuration"),(0,s.kt)("li",{parentName:"ol"},"One or more Signaller are defined, each one with its own configuration"),(0,s.kt)("li",{parentName:"ol"},"One or more queue namespaces are created, each one using:")),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"A specific Storage and config"),(0,s.kt)("li",{parentName:"ul"},"One of the Stats objects defined above"),(0,s.kt)("li",{parentName:"ul"},"One of the Signallers defined above")),(0,s.kt)("ol",{start:4},(0,s.kt)("li",{parentName:"ol"},"One REST server is created on top of the set of queue namespaces"),(0,s.kt)("li",{parentName:"ol"},"One STOMP server is created on top of the set of queue namespaces"),(0,s.kt)("li",{parentName:"ol"},"One AMQP1.0 server is created on top of the set of queue namespaces"),(0,s.kt)("li",{parentName:"ol"},"zero or more exchanges can be added over the full set of queues on all namespaces")),(0,s.kt)("h2",{id:"configuration"},"Configuration"),(0,s.kt)("p",null,"Keuss-Server gets its configuration from a combination of js config files, environment variables and cli flags. It uses ",(0,s.kt)("a",{parentName:"p",href:"https://www.npmjs.com/package/cascade-config"},"cascade-config")," and this is the exact sources of config:"),(0,s.kt)("ul",null,(0,s.kt)("li",{parentName:"ul"},"environment vars prefixed by ",(0,s.kt)("inlineCode",{parentName:"li"},"KS_")),(0,s.kt)("li",{parentName:"ul"},"cli flags"),(0,s.kt)("li",{parentName:"ul"},"js file ",(0,s.kt)("inlineCode",{parentName:"li"},"etc/config.js")),(0,s.kt)("li",{parentName:"ul"},"js file ",(0,s.kt)("inlineCode",{parentName:"li"},"etc/config-${KS_NODE_ENV}.js"))),(0,s.kt)("p",null,"Args and environment vars can be referenced in any of the js files"),(0,s.kt)("p",null,"Here's a working example:"),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-js"},"// etc/config.js, default values\n\nvar config = {\n  // no default users for REST\n  http: {\n    users: {\n    }\n  },\n\n  stats: {\n    // add a basic stats object, just for testing\n    memory: {\n      factory: 'mem',\n      config : {}\n    }\n  },\n\n  signallers: {\n    // add a basic signaller, just for testing\n    local: {\n      factory: 'local',\n      config : {}\n    }\n  },\n\n  // no default namespaces\n  namespaces: {\n  }\n};\n\nmodule.exports = config;\n")),(0,s.kt)("pre",null,(0,s.kt)("code",{parentName:"pre",className:"language-js"},"// etc/config-production.js, loaded when NODE_ENV=production\n\nvar config = {\n  http: {\n    // add 2 users for REST (basic auth)\n    users: {\n      'test1': 'test1',\n      'usr1': 'pass1'\n    }\n  },\n\n  stats: {\n    // add one mongo-based stats object\n    mongo: {\n      factory: 'mongo',\n      config: {\n        url:  '{stats.mongo.url:mongodb://localhost/keuss_stats}',\n        coll: '{stats.mongo.coll:keuss_stats}'\n      }\n    }\n  },\n\n  signallers: {\n    // add one mongo-capped-coll based signaller\n    mongo: {\n      factory: 'mongo-capped',\n      config: {\n        mongo_url: '{signal.mongo.url:mongodb://localhost/keuss_signal}',\n        mongo_opts: {},\n        channel: '{signal.mongo.channel:default}',\n      }\n    }\n  },\n\n  // Queue namespaces...\n  namespaces: {\n    // defautl namespace. In keuss, the default namespace is 'N'\n    // uses simple mongo storage\n    N: {\n      factory: 'mongo',\n      disable: false,\n      config: {\n        url: '{data.mongo.url:mongodb://localhost/keuss}',\n        stats: 'mongo',    // uses 'mongo' stats object, defined above\n        signaller: 'mongo' // uses 'mongo' signaller, defined above\n      }\n    },\n    // another namespace with simple mongo, but on a different database\n    ns1: {\n      factory: 'mongo',\n      disable: false,\n      config: {\n        url: '{data.mongo.url:mongodb://localhost/ns1_data}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // this namespace uses queues backed by redis-list storage.\n    // Still, they use the same stats and signaller based on mongo we defined above\n    ns2: {\n      factory: 'redis-list',\n      disable: false,\n      config: {\n        redis: {\n          Redis: {\n            host: '{data.redis.host:localhost}',\n          }\n        },\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // a namespace of queues backed by redis-oq (ordered queues on redis)\n    ns3: {\n      factory: 'redis-oq',\n      disable: false,\n      config: {\n        redis: {\n          Redis: {\n            host: '{data.redis.host:localhost}',\n          }\n        },\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // queues backed by bucket-mongo storage. This storage is deprecated in favor of bucket-mongo-safe\n    fastbuckets: {\n      factory: 'bucket-mongo',\n      disable: false,\n      config: {\n        url: '{data.bucket-mongo.url:mongodb://localhost/bucket_mongo_data}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // queues on bucket-mongo-safe. High throughput, low latency, all features kept, still strong durability guarantees\n    safebuckets: {\n      factory: 'bucket-mongo-safe',\n      disable: false,\n      config: {\n        url: '{data.bucket-mongo-safe.url:mongodb://localhost/bucket_mongo_data_safe}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n  },\n  exchanges: {\n    x1: {\n      src: {\n        ns: 'N',\n        queue: 'one_source',\n      },\n      dst: [\n        {\n          ns: 'ns1',\n          queue: 'one_dest',\n          selector: env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-/)),\n        },\n        {\n          ns: 'ns1',\n          queue: 'other_dest',\n          selector: `env => (env.msg.hdrs['aaa'] && env.msg.hdrs['aaa'].match (/^yes-already/))`\n        }\n      ],\n      consumer: {\n        parallel: 2,\n        wsize: 11,\n        reserve: true\n      }\n    },\n  }\n};\n\nmodule.exports = config;\n\n")))}d.isMDXComponent=!0}}]);