(window.webpackJsonp=window.webpackJsonp||[]).push([[27],{103:function(e,t,n){"use strict";n.d(t,"a",(function(){return p})),n.d(t,"b",(function(){return d}));var r=n(0),o=n.n(r);function a(e,t,n){return t in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}function i(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var r=Object.getOwnPropertySymbols(e);t&&(r=r.filter((function(t){return Object.getOwnPropertyDescriptor(e,t).enumerable}))),n.push.apply(n,r)}return n}function s(e){for(var t=1;t<arguments.length;t++){var n=null!=arguments[t]?arguments[t]:{};t%2?i(Object(n),!0).forEach((function(t){a(e,t,n[t])})):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):i(Object(n)).forEach((function(t){Object.defineProperty(e,t,Object.getOwnPropertyDescriptor(n,t))}))}return e}function u(e,t){if(null==e)return{};var n,r,o=function(e,t){if(null==e)return{};var n,r,o={},a=Object.keys(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||(o[n]=e[n]);return o}(e,t);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);for(r=0;r<a.length;r++)n=a[r],t.indexOf(n)>=0||Object.prototype.propertyIsEnumerable.call(e,n)&&(o[n]=e[n])}return o}var c=o.a.createContext({}),l=function(e){var t=o.a.useContext(c),n=t;return e&&(n="function"==typeof e?e(t):s(s({},t),e)),n},p=function(e){var t=l(e.components);return o.a.createElement(c.Provider,{value:t},e.children)},b={inlineCode:"code",wrapper:function(e){var t=e.children;return o.a.createElement(o.a.Fragment,{},t)}},f=o.a.forwardRef((function(e,t){var n=e.components,r=e.mdxType,a=e.originalType,i=e.parentName,c=u(e,["components","mdxType","originalType","parentName"]),p=l(n),f=r,d=p["".concat(i,".").concat(f)]||p[f]||b[f]||a;return n?o.a.createElement(d,s(s({ref:t},c),{},{components:n})):o.a.createElement(d,s({ref:t},c))}));function d(e,t){var n=arguments,r=t&&t.mdxType;if("string"==typeof e||r){var a=n.length,i=new Array(a);i[0]=f;var s={};for(var u in t)hasOwnProperty.call(t,u)&&(s[u]=t[u]);s.originalType=e,s.mdxType="string"==typeof e?e:r,i[1]=s;for(var c=2;c<a;c++)i[c]=n[c];return o.a.createElement.apply(null,i)}return o.a.createElement.apply(null,n)}f.displayName="MDXCreateElement"},96:function(e,t,n){"use strict";n.r(t),n.d(t,"frontMatter",(function(){return i})),n.d(t,"metadata",(function(){return s})),n.d(t,"toc",(function(){return u})),n.d(t,"default",(function(){return l}));var r=n(3),o=n(7),a=(n(0),n(103)),i={id:"gui",title:"Web Console",sidebar_label:"Web Console"},s={unversionedId:"usage/gui",id:"usage/gui",isDocsHomePage:!1,title:"Web Console",description:"If you're running keuss-server in localhost, and the http.port is set to 3456, open a browser at http3456 and you will get a simple web console showing a table with all the queues found and information about them",source:"@site/docs/usage/gui.md",slug:"/usage/gui",permalink:"/keuss-server/docs/usage/gui",editUrl:"https://github.com/pepmartinez/keuss-server/edit/master/website/docs/usage/gui.md",version:"current",sidebar_label:"Web Console",sidebar:"someSidebar",previous:{title:"Monitoring",permalink:"/keuss-server/docs/usage/monitoring"},next:{title:"Examples",permalink:"/keuss-server/docs/examples"}},u=[],c={toc:u};function l(e){var t=e.components,n=Object(o.a)(e,["components"]);return Object(a.b)("wrapper",Object(r.a)({},c,n,{components:t,mdxType:"MDXLayout"}),Object(a.b)("p",null,"If you're running keuss-server in localhost, and the ",Object(a.b)("inlineCode",{parentName:"p"},"http.port")," is set to 3456, open a browser at ",Object(a.b)("a",{parentName:"p",href:"http://localhost:3456"},"http://localhost:3456")," and you will get a simple web console showing a table with all the queues found and information about them"))}l.isMDXComponent=!0}}]);