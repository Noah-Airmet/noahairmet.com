#!/bin/sh
node /Users/noahairmet/development/tools/ui-check/lib/measure.mjs "$1" "$2" "$3" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s);for(const b of (Array.isArray(a)?a:[a])){ if(b&&b.el!==undefined) console.log([b.el,JSON.stringify(b.text.slice(0,22)),"x="+b.x,"y="+b.y,"w="+b.w,"h="+b.h,"r="+b.right,"b="+b.bottom,b.font,"pad="+b.padding,"mar="+b.margin,"rad="+b.radius].join("  ")); else console.log(JSON.stringify(b));}})'
