(window.webpackJsonp=window.webpackJsonp||[]).push([[11],{66:function(e,t,r){"use strict";r.r(t),r.d(t,"frontMatter",(function(){return i})),r.d(t,"metadata",(function(){return s})),r.d(t,"rightToc",(function(){return u})),r.d(t,"default",(function(){return l}));var n=r(2),a=r(6),o=(r(0),r(87)),i={id:"about",title:"About",sidebar_label:"About"},s={unversionedId:"about",id:"about",isDocsHomePage:!0,title:"About",description:"Job Queues' server accesible via STOMP and REST, built with keuss",source:"@site/docs/about.md",slug:"/",permalink:"/keuss-server/docs/",editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/about.md",version:"current",sidebar_label:"About",sidebar:"someSidebar",next:{title:"Quickstart",permalink:"/keuss-server/docs/quickstart"}},u=[],c={rightToc:u};function l(e){var t=e.components,r=Object(a.a)(e,["components"]);return Object(o.b)("wrapper",Object(n.a)({},c,r,{components:t,mdxType:"MDXLayout"}),Object(o.b)("p",null,"Job Queues' server accesible via STOMP and REST, built with keuss"),Object(o.b)("p",null,"Keuss-server provides STOMP and REST-like interfaces atop ",Object(o.b)("a",Object(n.a)({parentName:"p"},{href:"https://pepmartinez.github.io/keuss/"}),"keuss"),", plus a simple web console to check queues' statuses. This adds an inherently distributed (with no single point fo failure) job-queue service on top of Keuss functionalities"),Object(o.b)("p",null,"In brief, those are the features fully inherited from Keuss:"),Object(o.b)("ul",null,Object(o.b)("li",{parentName:"ul"},"Ability to use mongodb or redis as backend for queues, events and metadata. Durability and persistence guarantees vary depending on the backend chosen (see ",Object(o.b)("a",Object(n.a)({parentName:"li"},{href:"https://pepmartinez.github.io/keuss/docs/concepts#storage"}),"keuss Storage")," for more information)"),Object(o.b)("li",{parentName:"ul"},"delayed/scheduled elements"),Object(o.b)("li",{parentName:"ul"},"deadletter queues"),Object(o.b)("li",{parentName:"ul"},"at-least-once and at-most-once delivery guarantees"),Object(o.b)("li",{parentName:"ul"},"centralized metadata"),Object(o.b)("li",{parentName:"ul"},Object(o.b)("a",Object(n.a)({parentName:"li"},{href:"https://pepmartinez.github.io/keuss/docs/usage/buckets"}),"bucket based queues")," for higher throughput and performance without relinquishing durability")),Object(o.b)("p",null,"On top of that keuss-server offers some insight (global and per node) through prometheus metrics"))}l.isMDXComponent=!0},87:function(e,t,r){"use strict";r.d(t,"a",(function(){return b})),r.d(t,"b",(function(){return f}));var n=r(0),a=r.n(n);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function i(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function s(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?i(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):i(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function u(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},o=Object.keys(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(e);for(n=0;n<o.length;n++)r=o[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var c=a.a.createContext({}),l=function(e){var t=a.a.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):s(s({},t),e)),r},b=function(e){var t=l(e.components);return a.a.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return a.a.createElement(a.a.Fragment,{},t)}},d=a.a.forwardRef((function(e,t){var r=e.components,n=e.mdxType,o=e.originalType,i=e.parentName,c=u(e,["components","mdxType","originalType","parentName"]),b=l(r),d=n,f=b["".concat(i,".").concat(d)]||b[d]||p[d]||o;return r?a.a.createElement(f,s(s({ref:t},c),{},{components:r})):a.a.createElement(f,s({ref:t},c))}));function f(e,t){var r=arguments,n=t&&t.mdxType;if("string"==typeof e||n){var o=r.length,i=new Array(o);i[0]=d;var s={};for(var u in t)hasOwnProperty.call(t,u)&&(s[u]=t[u]);s.originalType=e,s.mdxType="string"==typeof e?e:n,i[1]=s;for(var c=2;c<o;c++)i[c]=r[c];return a.a.createElement.apply(null,i)}return a.a.createElement.apply(null,r)}d.displayName="MDXCreateElement"}}]);