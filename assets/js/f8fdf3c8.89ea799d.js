"use strict";(self.webpackChunkkeuss_server_docusaurus=self.webpackChunkkeuss_server_docusaurus||[]).push([[1632],{3905:(e,t,r)=>{r.d(t,{Zo:()=>u,kt:()=>k});var n=r(7294);function a(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function s(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function o(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?s(Object(r),!0).forEach((function(t){a(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):s(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function i(e,t){if(null==e)return{};var r,n,a=function(e,t){if(null==e)return{};var r,n,a={},s=Object.keys(e);for(n=0;n<s.length;n++)r=s[n],t.indexOf(r)>=0||(a[r]=e[r]);return a}(e,t);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);for(n=0;n<s.length;n++)r=s[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(a[r]=e[r])}return a}var c=n.createContext({}),l=function(e){var t=n.useContext(c),r=t;return e&&(r="function"==typeof e?e(t):o(o({},t),e)),r},u=function(e){var t=l(e.components);return n.createElement(c.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},d=n.forwardRef((function(e,t){var r=e.components,a=e.mdxType,s=e.originalType,c=e.parentName,u=i(e,["components","mdxType","originalType","parentName"]),d=l(r),k=a,m=d["".concat(c,".").concat(k)]||d[k]||p[k]||s;return r?n.createElement(m,o(o({ref:t},u),{},{components:r})):n.createElement(m,o({ref:t},u))}));function k(e,t){var r=arguments,a=t&&t.mdxType;if("string"==typeof e||a){var s=r.length,o=new Array(s);o[0]=d;var i={};for(var c in t)hasOwnProperty.call(t,c)&&(i[c]=t[c]);i.originalType=e,i.mdxType="string"==typeof e?e:a,o[1]=i;for(var l=2;l<s;l++)o[l]=r[l];return n.createElement.apply(null,o)}return n.createElement.apply(null,r)}d.displayName="MDXCreateElement"},1794:(e,t,r)=>{r.r(t),r.d(t,{assets:()=>c,contentTitle:()=>o,default:()=>p,frontMatter:()=>s,metadata:()=>i,toc:()=>l});var n=r(7462),a=(r(7294),r(3905));const s={id:"quickstart",title:"Quickstart",sidebar_label:"Quickstart"},o=void 0,i={unversionedId:"quickstart",id:"quickstart",title:"Quickstart",description:"Install & run",source:"@site/docs/02-quickstart.md",sourceDirName:".",slug:"/quickstart",permalink:"/keuss-server/docs/quickstart",draft:!1,editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/02-quickstart.md",tags:[],version:"current",sidebarPosition:2,frontMatter:{id:"quickstart",title:"Quickstart",sidebar_label:"Quickstart"},sidebar:"tutorialSidebar",previous:{title:"About",permalink:"/keuss-server/docs/"},next:{title:"Concepts",permalink:"/keuss-server/docs/concepts"}},c={},l=[{value:"Install &amp; run",id:"install--run",level:2},{value:"As Docker Container",id:"as-docker-container",level:3},{value:"As node.js package",id:"as-nodejs-package",level:3}],u={toc:l};function p(e){let{components:t,...r}=e;return(0,a.kt)("wrapper",(0,n.Z)({},u,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("h2",{id:"install--run"},"Install & run"),(0,a.kt)("h3",{id:"as-docker-container"},"As Docker Container"),(0,a.kt)("p",null,"Easiest way is to use the docker image available at ",(0,a.kt)("a",{parentName:"p",href:"https://hub.docker.com/repository/docker/pepmartinez/keuss-server"},"docker hub"),":"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-sh"},"docker run --rm -d --net host --name keuss-server pepmartinez/keuss-server:1.6.8\n")),(0,a.kt)("p",null,"The docker image comes with a default (suitable for test & demo) configuration which requires both a redis server and a mongodb server running in localhost (hence the ",(0,a.kt)("inlineCode",{parentName:"p"},"--net host"),")."),(0,a.kt)("p",null,"You can access the web gui at ",(0,a.kt)("inlineCode",{parentName:"p"},"https://localhost:3444")," (user ",(0,a.kt)("inlineCode",{parentName:"p"},"test1"),", pass ",(0,a.kt)("inlineCode",{parentName:"p"},"test1"),"). You will see no queues upon start, since queues are created on demand when they're accessed"),(0,a.kt)("p",null,"You can provide your own config by mounting the directory containing it as ",(0,a.kt)("inlineCode",{parentName:"p"},"/usr/src/app/etc"),"; if you use a non-local redis/mongodb server you might prefer to loose the ",(0,a.kt)("inlineCode",{parentName:"p"},"--net host")," and publish the REST, AMQP and STOMP ports instead:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-sh"},"docker run --rm -d -p 3444:3444 -p 5672:5672 -p 61613:61613 -v /opt/ks/etc:/usr/src/app/etc --name keuss-server pepmartinez/keuss-server:2.0.0\n")),(0,a.kt)("h3",{id:"as-nodejs-package"},"As node.js package"),(0,a.kt)("p",null,"As an alternative it is also possible to install the node.js package directly:"),(0,a.kt)("pre",null,(0,a.kt)("code",{parentName:"pre",className:"language-sh"},"npm install keuss-server\n")),(0,a.kt)("p",null,"then, edit the config.js file at will and run ",(0,a.kt)("inlineCode",{parentName:"p"},"node index.js"),"."))}p.isMDXComponent=!0}}]);