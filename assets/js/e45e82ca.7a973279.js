"use strict";(self.webpackChunkkeuss_server_docusaurus=self.webpackChunkkeuss_server_docusaurus||[]).push([[12],{3905:function(e,t,r){r.d(t,{Zo:function(){return c},kt:function(){return m}});var n=r(7294);function o(e,t,r){return t in e?Object.defineProperty(e,t,{value:r,enumerable:!0,configurable:!0,writable:!0}):e[t]=r,e}function a(e,t){var r=Object.keys(e);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(e);t&&(n=n.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),r.push.apply(r,n)}return r}function i(e){for(var t=1;t<arguments.length;t++){var r=null!=arguments[t]?arguments[t]:{};t%2?a(Object(r),!0).forEach((function(t){o(e,t,r[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(r)):a(Object(r)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(r,t))}))}return e}function u(e,t){if(null==e)return{};var r,n,o=function(e,t){if(null==e)return{};var r,n,o={},a=Object.keys(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||(o[r]=e[r]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(n=0;n<a.length;n++)r=a[n],t.indexOf(r)>=0||Object.prototype.propertyIsEnumerable.call(e,r)&&(o[r]=e[r])}return o}var s=n.createContext({}),l=function(e){var t=n.useContext(s),r=t;return e&&(r="function"==typeof e?e(t):i(i({},t),e)),r},c=function(e){var t=l(e.components);return n.createElement(s.Provider,{value:t},e.children)},p={inlineCode:"code",wrapper:function(e){var t=e.children;return n.createElement(n.Fragment,{},t)}},f=n.forwardRef((function(e,t){var r=e.components,o=e.mdxType,a=e.originalType,s=e.parentName,c=u(e,["components","mdxType","originalType","parentName"]),f=l(r),m=o,d=f["".concat(s,".").concat(m)]||f[m]||p[m]||a;return r?n.createElement(d,i(i({ref:t},c),{},{components:r})):n.createElement(d,i({ref:t},c))}));function m(e,t){var r=arguments,o=t&&t.mdxType;if("string"==typeof e||o){var a=r.length,i=new Array(a);i[0]=f;var u={};for(var s in t)hasOwnProperty.call(t,s)&&(u[s]=t[s]);u.originalType=e,u.mdxType="string"==typeof e?e:o,i[1]=u;for(var l=2;l<a;l++)i[l]=r[l];return n.createElement.apply(null,i)}return n.createElement.apply(null,r)}f.displayName="MDXCreateElement"},5366:function(e,t,r){r.r(t),r.d(t,{frontMatter:function(){return u},contentTitle:function(){return s},metadata:function(){return l},toc:function(){return c},default:function(){return f}});var n=r(3117),o=r(102),a=(r(7294),r(3905)),i=["components"],u={id:"gui",title:"Web Console",sidebar_label:"Web Console"},s=void 0,l={unversionedId:"usage/gui",id:"usage/gui",title:"Web Console",description:"If you're running keuss-server in localhost, and the http.port is set to 3456, open a browser at http3456 and you will get a simple web console showing a table with all the queues found and information about them",source:"@site/docs/usage/gui.md",sourceDirName:"usage",slug:"/usage/gui",permalink:"/keuss-server/docs/usage/gui",editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/usage/gui.md",tags:[],version:"current",frontMatter:{id:"gui",title:"Web Console",sidebar_label:"Web Console"},sidebar:"someSidebar",previous:{title:"Monitoring",permalink:"/keuss-server/docs/usage/monitoring"},next:{title:"Examples",permalink:"/keuss-server/docs/examples"}},c=[],p={toc:c};function f(e){var t=e.components,r=(0,o.Z)(e,i);return(0,a.kt)("wrapper",(0,n.Z)({},p,r,{components:t,mdxType:"MDXLayout"}),(0,a.kt)("p",null,"If you're running keuss-server in localhost, and the ",(0,a.kt)("inlineCode",{parentName:"p"},"http.port")," is set to 3456, open a browser at ",(0,a.kt)("a",{parentName:"p",href:"http://localhost:3456"},"http://localhost:3456")," and you will get a simple web console showing a table with all the queues found and information about them"))}f.isMDXComponent=!0}}]);