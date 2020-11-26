(window.webpackJsonp=window.webpackJsonp||[]).push([[13],{68:function(e,n,t){"use strict";t.r(n),t.d(n,"frontMatter",(function(){return r})),t.d(n,"metadata",(function(){return c})),t.d(n,"rightToc",(function(){return i})),t.d(n,"default",(function(){return u}));var o=t(2),a=t(6),s=(t(0),t(87)),r={id:"concepts",title:"Concepts",sidebar_label:"Concepts"},c={unversionedId:"concepts",id:"concepts",isDocsHomePage:!1,title:"Concepts",description:"Keuss-Server is a rather shallow layer on top of keuss just to provide client-server",source:"@site/docs/concepts.md",slug:"/concepts",permalink:"/keuss-server/docs/concepts",editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/concepts.md",version:"current",sidebar_label:"Concepts",sidebar:"someSidebar",previous:{title:"Quickstart",permalink:"/keuss-server/docs/quickstart"},next:{title:"REST API",permalink:"/keuss-server/docs/usage/rest"}},i=[{value:"Queue",id:"queue",children:[{value:"Deadletter support",id:"deadletter-support",children:[]}]},{value:"Storage",id:"storage",children:[]},{value:"Signaller",id:"signaller",children:[]},{value:"Stats",id:"stats",children:[]},{value:"How all fits together",id:"how-all-fits-together",children:[]},{value:"Configuration",id:"configuration",children:[]}],l={rightToc:i};function u(e){var n=e.components,t=Object(a.a)(e,["components"]);return Object(s.b)("wrapper",Object(o.a)({},l,t,{components:n,mdxType:"MDXLayout"}),Object(s.b)("p",null,"Keuss-Server is a rather shallow layer on top of ",Object(s.b)("a",Object(o.a)({parentName:"p"},{href:"https://pepmartinez.github.io/keuss/"}),"keuss")," just to provide client-server\ncapabilities; all of Keuss concepts except Processors and Pipelines are used on keuss-server"),Object(s.b)("h2",{id:"queue"},"Queue"),Object(s.b)("p",null,"Keuss-Server provides the same queue concepts Keuss provides; queues are then grouped in namespaces. See ",Object(s.b)("a",Object(o.a)({parentName:"p"},{href:"https://pepmartinez.github.io/keuss/docs/concepts#queue"}),"here")),Object(s.b)("h3",{id:"deadletter-support"},"Deadletter support"),Object(s.b)("p",null,"Only STOMP interfaces support deadletters (that is, move to a parking queue all elements that are rolled back too many times).\nFor that to work, the Namespace config has to be configured to support deadletter"),Object(s.b)("h2",{id:"storage"},"Storage"),Object(s.b)("p",null,"Queues are just simple, shallow concepts modeled on top of Storages or Backends. Keuss-Server can use any storage provided by\nKeuss; see ",Object(s.b)("a",Object(o.a)({parentName:"p"},{href:"https://pepmartinez.github.io/keuss/docs/concepts#storage"}),"here")),Object(s.b)("h2",{id:"signaller"},"Signaller"),Object(s.b)("p",null,"Signallers provide the needed clustering node intercommunication; all of Keuss' signallers can be used, although for true clustering the use of ",Object(s.b)("inlineCode",{parentName:"p"},"local")," signaller is not recommended. See ",Object(s.b)("a",Object(o.a)({parentName:"p"},{href:"https://pepmartinez.github.io/keuss/docs/concepts#signaller"}),"here")," for more info"),Object(s.b)("h2",{id:"stats"},"Stats"),Object(s.b)("p",null,"Per-cluster Stats are also provided by Keuss; any of Keuss Stats providers can be used, but use of ",Object(s.b)("inlineCode",{parentName:"p"},"mem")," provider would not provide actual per-cluster stats in a multi-node cluster"),Object(s.b)("h2",{id:"how-all-fits-together"},"How all fits together"),Object(s.b)("ol",null,Object(s.b)("li",{parentName:"ol"},"One or more Stats objects are defined, each one with its own configuration"),Object(s.b)("li",{parentName:"ol"},"One or more Signaller are defined, each one with its own configuration"),Object(s.b)("li",{parentName:"ol"},"One or more queue namespaces are created, each one using:")),Object(s.b)("ul",null,Object(s.b)("li",{parentName:"ul"},"A specific Storage and config"),Object(s.b)("li",{parentName:"ul"},"One of the Stats objects defined above"),Object(s.b)("li",{parentName:"ul"},"One of the Signallers defined above")),Object(s.b)("ol",{start:4},Object(s.b)("li",{parentName:"ol"},"One REST server is created on top of the set of queue namespaces"),Object(s.b)("li",{parentName:"ol"},"One STOMP server is created on top of the set of queue namespaces")),Object(s.b)("h2",{id:"configuration"},"Configuration"),Object(s.b)("p",null,"Keuss-Server gets its configuration from a combination of js config files, environment variables and cli flags. It uses ",Object(s.b)("a",Object(o.a)({parentName:"p"},{href:"https://www.npmjs.com/package/cascade-config"}),"cascade-config")," and this is the exact sources of config:"),Object(s.b)("ul",null,Object(s.b)("li",{parentName:"ul"},"environment vars prefixed by ",Object(s.b)("inlineCode",{parentName:"li"},"KS_")),Object(s.b)("li",{parentName:"ul"},"cli flags"),Object(s.b)("li",{parentName:"ul"},"js file ",Object(s.b)("inlineCode",{parentName:"li"},"etc/config.js")),Object(s.b)("li",{parentName:"ul"},"js file ",Object(s.b)("inlineCode",{parentName:"li"},"etc/config-${NODE_ENV}.js"))),Object(s.b)("p",null,"Args and environment vars can be referenced in any of the js files"),Object(s.b)("p",null,"Here's a working example:"),Object(s.b)("pre",null,Object(s.b)("code",Object(o.a)({parentName:"pre"},{className:"language-js"}),"// etc/config.js, default values\n\nvar config = {\n  // no default users for REST\n  http: {\n    users: {\n    }\n  },\n\n  stats: {\n    // add a basic stats object, just for testing\n    memory: {\n      factory: 'mem',\n      config : {}\n    }\n  },\n\n  signallers: {\n    // add a basic signaller, just for testing\n    local: {\n      factory: 'local',\n      config : {}\n    }\n  },\n\n  // no default namespaces\n  namespaces: {\n  }\n};\n\nmodule.exports = config;\n")),Object(s.b)("pre",null,Object(s.b)("code",Object(o.a)({parentName:"pre"},{className:"language-js"}),"// etc/config-production.js, loaded when NODE_ENV=production\n\nvar config = {\n  http: {\n    // add 2 users for REST (basic auth)\n    users: {\n      'test1': 'test1',\n      'usr1': 'pass1'\n    }\n  },\n\n  stats: {\n    // add one mongo-based stats object\n    mongo: {\n      factory: 'mongo',\n      config: {\n        url:  '{stats.mongo.url:mongodb://localhost/keuss_stats}',\n        coll: '{stats.mongo.coll:keuss_stats}'\n      }\n    }\n  },\n\n  signallers: {\n    // add one mongo-capped-coll based signaller\n    mongo: {\n      factory: 'mongo-capped',\n      config: {\n        mongo_url: '{signal.mongo.url:mongodb://localhost/keuss_signal}',\n        mongo_opts: {},\n        channel: '{signal.mongo.channel:default}',\n      }\n    }\n  },\n\n  // Queue namespaces...\n  namespaces: {\n    // defautl namespace. In keuss, the default namespace is 'N'\n    // uses simple mongo storage\n    N: {\n      factory: 'mongo',\n      disable: false,\n      config: {\n        url: '{data.mongo.url:mongodb://localhost/keuss}',\n        stats: 'mongo',    // uses 'mongo' stats object, defined above\n        signaller: 'mongo' // uses 'mongo' signaller, defined above\n      }\n    },\n    // another namespace with simple mongo, but on a different database\n    ns1: {\n      factory: 'mongo',\n      disable: false,\n      config: {\n        url: '{data.mongo.url:mongodb://localhost/ns1_data}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // this namespace uses queues backed by redis-list storage.\n    // Still, they use the same stats and signaller based on mongo we defined above\n    ns2: {\n      factory: 'redis-list',\n      disable: false,\n      config: {\n        redis: {\n          Redis: {\n            host: '{data.redis.host:localhost}',\n          }\n        },\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // a namespace of queues backed by redis-oq (ordered queues on redis)\n    ns3: {\n      factory: 'redis-oq',\n      disable: false,\n      config: {\n        redis: {\n          Redis: {\n            host: '{data.redis.host:localhost}',\n          }\n        },\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // queues backed by bucket-mongo storage. This storage is deprecated in favor of bucket-mongo-safe\n    fastbuckets: {\n      factory: 'bucket-mongo',\n      disable: false,\n      config: {\n        url: '{data.bucket-mongo.url:mongodb://localhost/bucket_mongo_data}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n    // queues on bucket-mongo-safe. High throughput, low latency, all features kept, still strong durability guarantees\n    safebuckets: {\n      factory: 'bucket-mongo-safe',\n      disable: false,\n      config: {\n        url: '{data.bucket-mongo-safe.url:mongodb://localhost/bucket_mongo_data_safe}',\n        stats: 'mongo',\n        signaller: 'mongo'\n      }\n    },\n  }\n};\n\nmodule.exports = config;\n\n")))}u.isMDXComponent=!0},87:function(e,n,t){"use strict";t.d(n,"a",(function(){return d})),t.d(n,"b",(function(){return g}));var o=t(0),a=t.n(o);function s(e,n,t){return n in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function r(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);n&&(o=o.filter((function(n){return Object.getOwnPropertyDescriptor(e,n).enumerable}))),t.push.apply(t,o)}return t}function c(e){for(var n=1;n<arguments.length;n++){var t=null!=arguments[n]?arguments[n]:{};n%2?r(Object(t),!0).forEach((function(n){s(e,n,t[n])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):r(Object(t)).forEach((function(n){Object.defineProperty(e,n,Object.getOwnPropertyDescriptor(t,n))}))}return e}function i(e,n){if(null==e)return{};var t,o,a=function(e,n){if(null==e)return{};var t,o,a={},s=Object.keys(e);for(o=0;o<s.length;o++)t=s[o],n.indexOf(t)>=0||(a[t]=e[t]);return a}(e,n);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(o=0;o<s.length;o++)t=s[o],n.indexOf(t)>=0||Object.prototype.propertyIsEnumerable.call(e,t)&&(a[t]=e[t])}return a}var l=a.a.createContext({}),u=function(e){var n=a.a.useContext(l),t=n;return e&&(t="function"==typeof e?e(n):c(c({},n),e)),t},d=function(e){var n=u(e.components);return a.a.createElement(l.Provider,{value:n},e.children)},p={inlineCode:"code",wrapper:function(e){var n=e.children;return a.a.createElement(a.a.Fragment,{},n)}},b=a.a.forwardRef((function(e,n){var t=e.components,o=e.mdxType,s=e.originalType,r=e.parentName,l=i(e,["components","mdxType","originalType","parentName"]),d=u(t),b=o,g=d["".concat(r,".").concat(b)]||d[b]||p[b]||s;return t?a.a.createElement(g,c(c({ref:n},l),{},{components:t})):a.a.createElement(g,c({ref:n},l))}));function g(e,n){var t=arguments,o=n&&n.mdxType;if("string"==typeof e||o){var s=t.length,r=new Array(s);r[0]=b;var c={};for(var i in n)hasOwnProperty.call(n,i)&&(c[i]=n[i]);c.originalType=e,c.mdxType="string"==typeof e?e:o,r[1]=c;for(var l=2;l<s;l++)r[l]=t[l];return a.a.createElement.apply(null,r)}return a.a.createElement.apply(null,t)}b.displayName="MDXCreateElement"}}]);