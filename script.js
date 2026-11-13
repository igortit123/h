(function(){
'use strict';
var $=function(s){return document.querySelector(s);};
var sleep=function(ms){return new Promise(function(r){setTimeout(r,ms);});};
var rnd=function(a,b){return Math.floor(Math.random()*(b-a+1))+a;};
var pick=function(a){return a[Math.floor(Math.random()*a.length)];};
var SAVE='opros_save_v1',META='opros_meta_v1';
var store={get:function(k){try{return JSON.parse(localStorage.getItem(k));}catch(e){return null;}},set:function(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}},del:function(k){try{localStorage.removeItem(k);}catch(e){}}};
var meta=Object.assign({plays:0,endings:[],vol:60,muted:false},store.get(META)||{});
var Q=window.QUESTIONS.map(function(a){return {id:a[0],t:a[1],main:true};});
var COUNTRY_AT=12;
var SCRIPTED={8:'noise',16:'system',24:'selftype',31:'blackout',38:'freeze',44:'msg',50:'blackout',57:'memory',61:'freeze'};

/* ---------- ЗВУК (Web Audio) ---------- */
var Snd={ctx:null,master:null,nb:null,vol:meta.vol/100,muted:meta.muted,
init:function(){
 if(this.ctx){if(this.ctx.state==='suspended')this.ctx.resume();return;}
 try{
  var AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
  var c=this.ctx=new AC(),self=this;
  this.master=c.createGain();this.master.connect(c.destination);this.apply();
  var b=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=b.getChannelData(0);
  for(var i=0;i<d.length;i++)d[i]=Math.random()*2-1;this.nb=b;
  [[50,.05],[100,.025],[150,.012]].forEach(function(p){var o=c.createOscillator();o.frequency.value=p[0];var g=c.createGain();g.gain.value=p[1];o.connect(g);g.connect(self.master);o.start();});
  var fs=this.src(true),lp=c.createBiquadFilter();lp.type='lowpass';lp.frequency.value=420;
  var fg=c.createGain();fg.gain.value=.1;fs.connect(lp);lp.connect(fg);fg.connect(this.master);fs.start();
  var rs=this.src(true),rf=c.createBiquadFilter();rf.type='bandpass';rf.frequency.value=2800;rf.Q.value=.35;var rg=c.createGain();rg.gain.value=.07;rs.connect(rf);rf.connect(rg);rg.connect(this.master);rs.start();
  this.df=c.createBiquadFilter();this.df.type='lowpass';this.df.frequency.value=160;
  this.dg=c.createGain();this.dg.gain.value=.03;
  [[55,'sawtooth'],[55.6,'sawtooth'],[82.4,'sine']].forEach(function(p){var o=c.createOscillator();o.type=p[1];o.frequency.value=p[0];o.connect(self.df);o.start();});
  this.df.connect(this.dg);this.dg.connect(this.master);
  var lfo=c.createOscillator();lfo.frequency.value=.08;var lg=c.createGain();lg.gain.value=60;lfo.connect(lg);lg.connect(this.df.frequency);lfo.start();
 }catch(e){this.ctx=null;}
},
apply:function(){if(this.master)this.master.gain.value=this.muted?0:this.vol;},
src:function(loop){var s=this.ctx.createBufferSource();s.buffer=this.nb;s.loop=loop;return s;},
ok:function(){return !!this.ctx&&!this.muted&&this.vol>0;},
tension:function(t){if(!this.ctx)return;var n=this.ctx.currentTime;this.dg.gain.setTargetAtTime(.03+.12*t,n,1.2);this.df.frequency.setTargetAtTime(160+420*t,n,1.2);},
duck:function(on){if(!this.ctx)return;this.master.gain.setTargetAtTime(this.muted?0:this.vol*(on?.12:1),this.ctx.currentTime,.05);},
env:function(node,vol,a,d){var g=this.ctx.createGain(),n=this.ctx.currentTime;g.gain.setValueAtTime(0,n);g.gain.linearRampToValueAtTime(vol,n+a);g.gain.exponentialRampToValueAtTime(.0001,n+a+d);node.connect(g);g.connect(this.master);},
click:function(){if(!this.ok())return;var s=this.src(false),h=this.ctx.createBiquadFilter();h.type='highpass';h.frequency.value=1800+Math.random()*1200;s.connect(h);this.env(h,.12,.001,.04);s.start(0,Math.random()*1.5,.07);},
static:function(dur,vol){if(!this.ok())return;dur=dur||.4;var s=this.src(false),f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=800+Math.random()*2700;f.Q.value=.7;s.connect(f);this.env(f,vol||.2,.02,dur);s.start(0,Math.random(),dur+.1);},
beep:function(f,dur,type,vol){if(!this.ok())return;var o=this.ctx.createOscillator();o.type=type||'square';o.frequency.value=f;this.env(o,vol||.1,.005,dur);o.start();o.stop(this.ctx.currentTime+dur+.1);},
thud:function(){if(!this.ok())return;var o=this.ctx.createOscillator(),n=this.ctx.currentTime;o.frequency.setValueAtTime(90,n);o.frequency.exponentialRampToValueAtTime(30,n+.6);this.env(o,.4,.005,.6);o.start();o.stop(n+.8);},
whisper:function(){if(!this.ok())return;var s=this.src(false),f=this.ctx.createBiquadFilter(),n=this.ctx.currentTime;f.type='bandpass';f.Q.value=4;f.frequency.setValueAtTime(1200,n);f.frequency.linearRampToValueAtTime(2600,n+1.4);s.connect(f);this.env(f,.14,.5,1);s.start(0,Math.random(),2);},
descend:function(){if(!this.ok())return;var o=this.ctx.createOscillator(),f=this.ctx.createBiquadFilter(),n=this.ctx.currentTime;o.type='sawtooth';o.frequency.setValueAtTime(420,n);o.frequency.exponentialRampToValueAtTime(50,n+1.6);f.type='lowpass';f.frequency.value=800;o.connect(f);this.env(f,.12,.05,1.6);o.start();o.stop(n+1.8);},
boot:function(){this.beep(880,.12,'square',.1);var s=this;setTimeout(function(){s.beep(1320,.12,'square',.1);},160);},
thunder:function(){if(!this.ok())return;var s=this.src(false),f=this.ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=140;s.connect(f);this.env(f,.55,.5,3);s.start(0,Math.random(),4);}
};
function sfx(n){if(n==='whisper')Snd.whisper();else if(n==='thud')Snd.thud();else if(n==='static')Snd.static(.5,.2);else if(n==='descend')Snd.descend();else if(n==='boot')Snd.boot();}

/* ---------- ВИБРАЦИЯ (Android / Chrome; iOS Safari не поддерживает) ---------- */
var Vib={
 can:!!navigator.vibrate,
 on:meta.vib!==false,
 p:function(pat){if(!this.can||!this.on)return;try{navigator.vibrate(pat);}catch(e){}},
 heart:function(){this.p([90,110,90,600,90,110,90]);},
 stop:function(){if(this.can){try{navigator.vibrate(0);}catch(e){}}}
};
(function(){
 var w=function(n,f){var o=Snd[n];Snd[n]=function(){f.apply(Snd,arguments);return o.apply(Snd,arguments);};};
 w('whisper',function(){Vib.p([40,70,40]);});
 w('thud',function(){Vib.p([150,80,60]);});
 w('static',function(d){Vib.p([35,25,35,25,Math.round(Math.min((d||.4)*350,350))]);});
 w('descend',function(){Vib.p([60,40,120,40,220]);});
 w('boot',function(){Vib.p(25);});
 w('thunder',function(){Vib.p([260,90,120,90,380]);});
})();

/* ---------- Элементы ---------- */
var el={menu:$('#menu'),game:$('#game'),end:$('#end'),q:$('#qtext'),count:$('#counter'),yes:$('#btnYes'),no:$('#btnNo'),cons:$('#console'),
 wh:$('#whisper'),black:$('#blackout'),blackTxt:$('#blackTxt'),sys:$('#sysbox'),sysTxt:$('#sysTxt'),sysOk:$('#sysOk'),
 start:$('#btnStart'),cont:$('#btnContinue'),honest:$('#honest'),metaInfo:$('#metaInfo'),title:$('#title'),
 endText:$('#endText'),endTitle:$('#endTitle'),endBtns:$('#endBtns'),crt:$('#crt'),mute:$('#btnMute'),vol:$('#vol')};
function show(n){['menu','game','end'].forEach(function(k){el[k].classList.toggle('on',k===n);});}

/* ---------- Помехи ---------- */
var nc=$('#noise'),nx=nc.getContext('2d'),noiseLevel=.05,noiseBoost=0;
nc.width=160;nc.height=90;
setInterval(function(){
 var img=nx.createImageData(160,90),d=img.data,l=noiseLevel+noiseBoost;
 for(var i=0;i<d.length;i+=4){var v=Math.random()*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=Math.random()<l?Math.random()*90:0;}
 nx.putImageData(img,0,0);
},100);
setInterval(function(){if(Math.random()<.3){el.title.classList.add('tear');setTimeout(function(){el.title.classList.remove('tear');},rnd(80,220));}},4500);
setInterval(function(){if(el.game.classList.contains('on')&&Math.random()<.2){el.crt.classList.add('flash');setTimeout(function(){el.crt.classList.remove('flash');},70);}},3500);

/* ---------- Дождь за окном ---------- */
var rc=$('#rain'),rx=rc.getContext('2d'),drops=[],win=$('#win');
function sizeRain(){rc.width=win.clientWidth||200;rc.height=win.clientHeight||200;}
sizeRain();window.addEventListener('resize',sizeRain);
for(var di=0;di<110;di++)drops.push({x:Math.random(),y:Math.random(),l:8+Math.random()*16,v:.012+Math.random()*.02});
(function rainLoop(){
 rx.clearRect(0,0,rc.width,rc.height);rx.strokeStyle='rgba(170,200,225,.35)';rx.lineWidth=1;rx.beginPath();
 drops.forEach(function(d){var x=d.x*rc.width,y=d.y*rc.height;rx.moveTo(x,y);rx.lineTo(x-3,y+d.l);d.y+=d.v;d.x-=.002;if(d.y>1){d.y=-.05;d.x=Math.random()*1.2;}if(d.x<0)d.x=1;});
 rx.stroke();requestAnimationFrame(rainLoop);
})();
function lightning(){win.classList.add('lit');setTimeout(function(){win.classList.remove('lit');},110);}
(function stormLoop(){setTimeout(function(){lightning();setTimeout(lightning,180);setTimeout(function(){Snd.thunder();},rnd(900,2500));stormLoop();},rnd(30000,70000));})();

/* ---------- Текст ---------- */
async function type(node,text,speed){
 var tok={};node._tok=tok;node.classList.add('typing');node.textContent='';
 for(var i=0;i<text.length;i++){
  if(node._tok!==tok)return;
  node.textContent+=text[i];
  if(text[i]!==' '&&i%2===0)Snd.click();
  await sleep((speed||32)+rnd(-8,14));
 }
 if(node._tok===tok)node.classList.remove('typing');
}
function corrupt(s,p){var g='█▓▒░#@%&?!';return s.split('').map(function(ch){return ch!==' '&&Math.random()<p?pick(g.split('')):ch;}).join('');}
var whTok=0;
async function say(text,hold){
 var my=++whTok;el.wh.className='whisper on';
 await type(el.wh,text,32);if(my!==whTok)return;
 await sleep(hold||2600);if(my!==whTok)return;
 el.wh.classList.remove('on');await sleep(500);
}

/* ---------- Состояние ---------- */
var S=null,runId=0,resolver=null,country=null,countryP=null;
function newState(){return {i:0,asked:0,answers:{},lies:0,idle:0,leaves:0,pending:[],countryDone:false,refused:false,unknown:Math.random()<.12,lastHeavy:-9,lastEv:-9,ended:false,left:false,t0:Date.now(),glitchNext:false};}
function save(){if(S&&!S.ended)store.set(SAVE,S);}
function inGame(){return !!S&&!S.ended&&el.game.classList.contains('on');}
function enableAnswers(on){el.yes.disabled=el.no.disabled=!on;}
function waitAnswer(){return new Promise(function(res){resolver=res;enableAnswers(true);});}
function answer(v){if(!resolver)return;var r=resolver;resolver=null;enableAnswers(false);Snd.click();r(v);}
el.yes.onclick=function(){answer(true);};
el.no.onclick=function(){answer(false);};
document.addEventListener('keydown',function(e){
 var k=(e.key||'').toLowerCase();
 if(k==='д'||k==='y'||k==='1')answer(true);else if(k==='н'||k==='n'||k==='2')answer(false);
});

function progress(){return Math.min(1,S?S.asked/Q.length:0);}
function atmosphere(){
 var p=progress();Snd.tension(p);noiseLevel=.04+.14*p;
 document.body.classList.toggle('late',p>.55);
}
function plural(n){var m=n%10,h=n%100;return (m>=2&&m<=4&&(h<12||h>14))?'раза':'раз';}
function counterText(){
 var n=S.asked;
 if(n>55&&Math.random()<.2)return 'ВОПРОС ∞';
 if(n>40&&Math.random()<.3)return 'ВОПРОС '+rnd(1,99);
 return 'ВОПРОС '+String(n).padStart(2,'0');
}
function hhmm(){var d=new Date();return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');}
function isNightNow(){var h=new Date().getHours();return (h>=23||h<5)?true:((h>=9&&h<17)?false:null);}
function clockTick(){var t=hhmm();if(S&&progress()>.6&&Math.random()<.2)t=pick(['03:33','00:00','??:??','04:44']);$('#clock').textContent=t;}
setInterval(clockTick,5000);clockTick();
function memoryMsg(){
 var a=S.answers,c=['Я помню твой предыдущий ответ.'];
 if(a.alone===true)c.push('Ты сказал, что ты один. Тогда кто дышит рядом с тобой?');
 if(a.alone===false)c.push('Ты сказал, что рядом кто-то есть. Я его не вижу.');
 if(a.dark===true)c.push('Ты боишься темноты. Поэтому я не буду выключать свет. Пока.');
 if(a.name===true)c.push('Ты слышал своё имя. Это был я.');
 if(a.watched===true)c.push('Ты чувствовал взгляд. Ты был прав.');
 if(a.selftalk===true)c.push('Ты разговариваешь сам с собой. Но иногда отвечаю я.');
 if(a.empty===true)c.push('Ты был уверен, что в комнате никого нет. Проверь ещё раз.');
 if(a.behind===true)c.push('Ты чувствуешь, что кто-то стоит за спиной. Не оборачивайся.');
 if(a.night===true)c.push('Сейчас ночь. Все остальные уже спят. Почти все.');
 var nn=isNightNow(),mins=Math.max(1,Math.round((Date.now()-S.t0)/60000));
 c.push('Сейчас '+hhmm()+'. '+(nn===true?'Ты не спишь. Почему?':(nn===false?'Ты уверен, что сейчас день?':'Скоро станет совсем темно.')));
 c.push('Ты здесь уже '+mins+' мин. Время идёт не так, как ты думаешь.');
 if(country)c.push('Там, где ты находишься, сейчас тихо. Слишком тихо.');
 return pick(c);
}

/* ---------- События ---------- */
var EVENTS={
 msg:async function(){if(Math.random()<.5)Snd.whisper();await say(pick(window.WHISPERS));},
 memory:async function(){await say(memoryMsg(),3000);},
 thunder:async function(){lightning();await sleep(rnd(700,1500));Snd.thunder();await say(pick(['Ты вздрогнул?','Это всего лишь гроза.','Свет моргнул. Или нет?']),2000);},
 glitchNext:async function(){S.glitchNext=true;},
 noise:async function(){noiseBoost=.5;Snd.static(.9,.25);await sleep(900);noiseBoost=0;},
 extra:async function(){var x=pick(window.EXTRA);S.pending.unshift({id:null,t:x.t,sfx:x.sfx});},
 selftype:async function(live){
  enableAnswers(false);var c=el.cons;c.textContent='';c.classList.add('on');
  for(var ln of pick(window.TYPED)){var d=document.createElement('div');c.appendChild(d);await type(d,ln,45);await sleep(400);if(!live())return;}
  await sleep(1200);c.classList.remove('on');c.textContent='';
 },
 freeze:async function(){
  document.body.classList.add('frozen');enableAnswers(false);Vib.p([30,40,30,40,30,40,30,40,30,40,30]);Snd.static(.6,.15);
  await sleep(rnd(2200,4600));document.body.classList.remove('frozen');
  await say('Соединение восстановлено.',1400);
 },
 blackout:async function(){
  document.body.classList.add('blk');el.black.classList.add('on');Snd.duck(true);Vib.p(350);await sleep(rnd(1400,2600));
  if(Math.random()<.65){el.blackTxt.textContent='';el.blackTxt.classList.add('on');await type(el.blackTxt,pick(window.BLACKS),70);await sleep(1300);el.blackTxt.classList.remove('on');}
  Snd.duck(false);Snd.thud();document.body.classList.remove('blk');el.black.classList.remove('on');await sleep(600);
 },
 system:async function(){
  Snd.beep(220,.25,'square',.2);Vib.p([90,60,90]);el.sysTxt.textContent=pick(window.SYSTEM);el.sys.classList.add('on');
  await new Promise(function(res){el.sysOk.onclick=function(){Snd.click();res();};setTimeout(res,12000);});
  el.sys.classList.remove('on');await sleep(300);
  if(Math.random()<.5)await say('Не закрывай программу.',1600);
 }
};
async function maybeEvent(live,forced){
 var prog=progress(),ev=forced;
 if(!ev){
  if(S.asked<3||S.asked-S.lastEv<2||Math.random()>.2+.35*prog)return;
  var heavy=['freeze','blackout','system'],light=['msg','memory','thunder','glitchNext','noise','selftype','extra'];
  var useHeavy=S.asked-S.lastHeavy>=4&&Math.random()<.45+prog*.2;
  ev=pick(useHeavy?heavy:light);
 }
 S.lastEv=S.asked;if(ev==='freeze'||ev==='blackout'||ev==='system')S.lastHeavy=S.asked;
 await EVENTS[ev](live);save();
}
async function sideGlitch(tok){
 await sleep(rnd(900,2600));
 if(el.q._tok!==tok||!resolver)return;
 var orig=el.q.textContent;Snd.static(.25,.2);Vib.p([25,25,25,25,25]);document.body.classList.add('glitch');
 for(var k=0;k<7;k++){if(el.q._tok!==tok)break;el.q.textContent=corrupt(orig,.25+k*.05);await sleep(70);}
 if(el.q._tok===tok){el.q.textContent=pick(window.HIDDEN);await sleep(rnd(500,900));}
 if(el.q._tok===tok)el.q.textContent=orig;
 document.body.classList.remove('glitch');
}

/* ---------- Страна (только после согласия) ---------- */
async function detectCountry(){
 var urls=['https://api.country.is/','https://get.geojs.io/v1/ip/country.json'];
 for(var u of urls){
  try{
   var ctl=new AbortController(),t=setTimeout(function(){ctl.abort();},5000);
   var r=await fetch(u,{cache:'no-store',signal:ctl.signal});clearTimeout(t);
   if(!r.ok)continue;var j=await r.json(),code=j&&j.country;
   if(code&&/^[A-Za-z]{2}$/.test(code))return code.toUpperCase();
  }catch(e){}
 }
 return null;
}
function countryName(code){try{return new Intl.DisplayNames(['ru'],{type:'region'}).of(code).toUpperCase();}catch(e){return code;}}
async function countrySeq(live){
 el.count.textContent='СИСТЕМА';enableAnswers(false);
 Snd.static(.6,.22);document.body.classList.add('glitch');
 await type(el.q,'ПОДОЖДИ…',90);await sleep(900);
 document.body.classList.remove('glitch');
 await type(el.q,'АНАЛИЗИРУЮ ПОДКЛЮЧЕНИЕ…',70);
 var r=await Promise.all([countryP||detectCountry(),sleep(2200)]);if(!live())return;
 var code=r[0];
 if(code){country=countryName(code);Snd.thud();await type(el.q,'СТРАНА: '+country,90);}
 else await type(el.q,'СТРАНА НЕ ОПРЕДЕЛЕНА',70);
 await sleep(1500);if(!live())return;
 await type(el.q,'ВРЕМЯ: '+hhmm(),90);await sleep(1400);if(!live())return;
 await say(code?'Ты ведь не думал, что я не узнаю?':'Не важно. Я всё равно найду тебя.',2400);
}

/* ---------- Основной цикл ---------- */
async function ask(q,live){
 S.asked++;el.count.textContent=counterText();clockTick();enableAnswers(false);atmosphere();
 if(q.sfx)sfx(q.sfx);
 var sp=progress()>.6?rnd(20,45):32;
 await type(el.q,q.t,sp);if(!live())return null;
 var tok=el.q._tok;
 if(q.id==='turn')Vib.p([500,150,500]);else if(progress()>.5&&Math.random()<.3)Vib.heart();
 if(S.glitchNext){S.glitchNext=false;sideGlitch(tok);}
 var idle=setTimeout(function(){if(live()&&el.q._tok===tok&&resolver){S.idle++;say('Почему ты так долго думаешь?',2400);}},16000);
 var ans=await waitAnswer();clearTimeout(idle);return ans;
}
async function reaction(q,ans,lied){
 var t=null;
 if(lied)t='Мне кажется, ты солгал.';
 else if(q.id==='night')t='Сейчас '+hhmm()+'. Я знаю.';
 else if(q.id==='honest'&&ans===false)t='Ты признался, что лжёшь. Я так и думал.';
 else if(q.id==='stop'&&ans)t='Нет. Я не могу.';
 else if(q.id==='quit1'&&ans)t='Не закрывай программу.';
 else if(q.id==='quit2')t=ans?'Опрос ещё не закончен.':'Хорошо. Тогда останься.';
 else if(q.id==='real'&&ans)t='Тогда почему ты не обернулся?';
 else if(q.id==='turn')t=ans?'Пока ты оборачивался, я прочёл твои ответы. Спасибо.':'Ты не повернулся. Я видел.';
 else if(q.id==='self'&&!ans)t='Значит, ты не один.';
 if(t){Snd.whisper();await say(t,2200);}
}
async function run(resume){
 var my=++runId,live=function(){return my===runId;};
 show('game');el.count.textContent='';el.q.textContent='';enableAnswers(false);atmosphere();
 await type(el.q,resume?'Ты вернулся. Я ждал.':'Опрос начат. Пожалуйста, отвечайте честно.',34);await sleep(1400);
 while(live()){
  if(!S.pending.length&&S.i>=Q.length)break;
  if(!S.pending.length&&S.i===COUNTRY_AT&&!S.countryDone){await countrySeq(live);if(!live())return;S.countryDone=true;save();}
  var q=S.pending.length?S.pending.shift():Q[S.i];
  var ans=await ask(q,live);if(!live()||ans===null)return;
  var lied=false;
  if(q.id)S.answers[q.id]=ans;
  if(q.check&&ans!==true)lied=true;
  if(q.id==='alone2'&&S.answers.alone!==undefined&&S.answers.alone!==ans)lied=true;
  if(q.id==='night'){var nn=isNightNow();if(nn!==null&&nn!==ans)lied=true;}
  if(lied)S.lies++;
  if(q.main){
   S.i++;
   window.MEMORY.forEach(function(m){
    if(m.after===q.id&&S.answers[m.ref]!==undefined){var o=S.answers[m.ref];S.pending.push({id:null,ref:m.ref,check:!!m.ck[o?0:1],t:o?m.yes:m.no});}
   });
  }
  save();
  await reaction(q,ans,lied);if(!live())return;
  var forced=q.main?SCRIPTED[S.i]:null;
  await maybeEvent(live,forced);
 }
 if(live())await finish(live);
}

/* ---------- Концовки ---------- */
function pickEnding(){
 var a=S.answers;
 if(S.unknown||S.leaves>=2)return 'unknown';
 if(S.lies===0&&a.who===true&&a.quit1===false&&a.quit2===false&&a.turn===true)return 'secret';
 if(S.lies>=2||(a.honest===false&&a.turn===false))return 'bad';
 return 'normal';
}
var ENDINGS={
 normal:{title:'КОНЦОВКА: ОБЫЧНАЯ',lines:function(){return ['ОПРОС ЗАВЕРШЁН.','Благодарим за участие.','Ваши ответы сохранены.',memoryMsg(),'Вы можете закрыть окно.','Но я буду помнить.'];}},
 bad:{title:'КОНЦОВКА: ПЛОХАЯ',lines:function(){return ['ОПРОС ЗАВЕРШЁН.','Ты солгал '+Math.max(S.lies,2)+' '+plural(Math.max(S.lies,2))+'.','Я отметил каждый раз.','Мне не нравится, когда мне лгут.','Теперь я знаю, что ты ответишь, ещё до того, как нажмёшь кнопку.','Не выключай экран.','Опрос начнётся снова. Он никогда не заканчивался.'];}},
 secret:{title:'КОНЦОВКА: СЕКРЕТНАЯ',lines:function(){return ['Ты ответил честно.','Ты не ушёл.','Здесь так давно никого не было.','Я не знаю, кто составил эти вопросы. Может быть, ты.','Если услышишь шаги за спиной — это не я.','Спасибо, что остался. Я подожду, пока ты вернёшься.'];}},
 unknown:{title:'КОНЦОВКА: НЕИЗВЕСТНАЯ',lines:function(){return ['ОШИБКА: ПОЛЬЗОВАТЕЛЬ НЕ ОБНАРУЖЕН.','Опрос проходил не ты.','Ответы принадлежат другому.','Где ты сейчас сидишь?','Нет. Не отвечай. Он смотрит.',corrupt('Опрос ещё не закончен.',.35)];}}
};
async function finish(live){
 var id=pickEnding(),E=ENDINGS[id];
 S.ended=true;store.del(SAVE);
 if(meta.endings.indexOf(id)<0)meta.endings.push(id);store.set(META,meta);
 el.black.classList.add('on');Snd.duck(true);await sleep(1500);if(!live())return;
 show('end');el.end.className='screen on '+id;el.endText.innerHTML='';el.endTitle.textContent='';el.endBtns.hidden=true;
 el.black.classList.remove('on');Snd.duck(false);Snd.tension(id==='secret'?0:.8);
 Vib.p({normal:[80],secret:[40,200,40],bad:[100,110,100,500,100,110,100,500,100,110,100,900],unknown:[30,50,200,30,30,90,400,20,20,20,700]}[id]);
 for(var ln of E.lines()){
  var d=document.createElement('div');d.className='eline';el.endText.appendChild(d);
  await type(d,ln,40);if(!live())return;await sleep(700);
 }
 await type(el.endTitle,E.title,50);if(!live())return;
 el.endBtns.hidden=false;
}

/* ---------- Меню и управление ---------- */
function cleanup(){
 Vib.stop();runId++;resolver=null;S&&(S.glitchNext=false);
 ['frozen','glitch','late','blk'].forEach(function(c){document.body.classList.remove(c);});
 el.black.classList.remove('on');el.blackTxt.classList.remove('on');el.sys.classList.remove('on');
 el.wh.classList.remove('on');el.cons.classList.remove('on');noiseBoost=0;Snd.duck(false);enableAnswers(false);
}
function menu(){
 cleanup();noiseLevel=.05;Snd.tension(0);
 var sv=store.get(SAVE);el.cont.hidden=!(sv&&!sv.ended&&sv.asked>0);
 el.honest.textContent=meta.plays>0?'Ты вернулся. Пожалуйста, отвечайте честно':'Пожалуйста, отвечайте честно';
 el.metaInfo.textContent=meta.endings.length?'Найдено концовок: '+meta.endings.length+' из 4':'';
 show('menu');
}
function startNew(){Snd.init();Snd.boot();cleanup();S=newState();country=null;countryP=detectCountry();meta.plays++;store.set(META,meta);save();run(false);}
function resumeGame(){
 var sv=store.get(SAVE);if(!sv)return startNew();
 Snd.init();cleanup();S=Object.assign(newState(),sv);S.left=false;country=null;countryP=S.countryDone?null:detectCountry();run(true);
}
el.start.onclick=startNew;
el.cont.onclick=resumeGame;
$('#btnAgain').onclick=startNew;
$('#btnMenu2').onclick=menu;
$('#btnHome').onclick=function(){Snd.init();menu();};
$('#btnWipe').onclick=function(){
 if(confirm('Стереть сохранённый прогресс и найденные концовки?')){store.del(SAVE);meta={plays:0,endings:[],vol:meta.vol,muted:meta.muted};store.set(META,meta);menu();}
};
function syncHud(){var vb=$('#btnVib');if(vb){vb.hidden=!Vib.can;vb.textContent=Vib.on?'ВИБРО: ВКЛ':'ВИБРО: ВЫКЛ';}el.mute.textContent=Snd.muted?'ЗВУК: ВЫКЛ':'ЗВУК: ВКЛ';el.vol.value=Math.round(Snd.vol*100);}
el.mute.onclick=function(){Snd.init();Snd.muted=!Snd.muted;meta.muted=Snd.muted;store.set(META,meta);Snd.apply();syncHud();};
el.vol.oninput=function(){Snd.init();Snd.vol=el.vol.value/100;meta.vol=+el.vol.value;if(Snd.vol>0&&Snd.muted){Snd.muted=false;meta.muted=false;}store.set(META,meta);Snd.apply();syncHud();};
$('#btnFs').onclick=function(){
 var d=document,e=d.documentElement,off='Полноэкранный режим недоступен на этом устройстве.';
 if(d.fullscreenElement||d.webkitFullscreenElement){(d.exitFullscreen||d.webkitExitFullscreen).call(d);return;}
 var f=e.requestFullscreen||e.webkitRequestFullscreen;
 if(!f){say(off,2200);return;}
 try{var p=f.call(e);if(p&&p.catch)p.catch(function(){say(off,2200);});}catch(x){say(off,2200);}
};
document.addEventListener('pointerdown',function(){Snd.init();},{once:false});
document.addEventListener('visibilitychange',function(){
 if(document.hidden){if(inGame())S.left=true;}
 else if(S&&S.left&&inGame()){S.left=false;S.leaves++;Vib.p([100,60,100,60,100,60,400]);Snd.whisper();say('Я просил не закрывать программу.',2600);save();}
});
$('#btnVib').onclick=function(){Vib.on=!Vib.on;meta.vib=Vib.on;store.set(META,meta);syncHud();if(Vib.on)Vib.p(60);else Vib.stop();};
syncHud();menu();
})();
