/**
 * bond_engine.js  —  Trial Release Engine (minimal)
 * Fully random bond selection. No weights, no state.
 */
'use strict';
function BE_bondsExactly(whole){const b=[];for(let a=1;a<=Math.floor(whole/2);a++)b.push([whole,a]);return b;}
function BE_bondsUpTo(max){let r=[];for(let w=2;w<=max;w++)r=r.concat(BE_bondsExactly(w));return r;}
function BE_bondsDoublesOnly(max){const r=[];for(let w=2;w<=max;w+=2)r.push([w,w/2]);return r;}
const BE_LEVEL_BONDS={to5:()=>BE_bondsUpTo(5),exact10:()=>BE_bondsExactly(10),doubles10:()=>BE_bondsDoublesOnly(10),upto10:()=>BE_bondsUpTo(10),exact20:()=>BE_bondsExactly(20),doubles20:()=>BE_bondsDoublesOnly(20),upto20:()=>BE_bondsUpTo(20)};
class BondEngine{
  constructor(c){this.level=c.level||'upto10';this.mode=c.mode||'both';const b=BE_LEVEL_BONDS[this.level]||BE_LEVEL_BONDS['upto10'];this._bonds=b();this._lastQ=null;}
  nextQuestion(){
    const idx=Math.floor(Math.random()*this._bonds.length);
    let[w,a]=this._bonds[idx];const b=w-a;
    let pa=a,pb=b;if(Math.random()<0.5)[pa,pb]=[pb,pa];
    let missing;
    if(this.mode==='add')missing='whole';
    else if(this.mode==='sub')missing=Math.random()<0.5?'partA':'partB';
    else{const r=Math.random();missing=r<0.34?'whole':r<0.67?'partA':'partB';}
    const q={whole:w,partA:pa,partB:pb,missing,correctAnswer:missing==='whole'?w:missing==='partA'?pa:pb};
    if(this._lastQ&&this._bonds.length>1&&q.whole===this._lastQ.whole&&q.partA===this._lastQ.partA&&q.partB===this._lastQ.partB&&q.missing===this._lastQ.missing)return this.nextQuestion();
    this._lastQ=q;return q;
  }
}
if(typeof module!=='undefined')module.exports={BondEngine};
