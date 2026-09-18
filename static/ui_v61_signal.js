(()=>{
 if(document.getElementById('plug-ui-v61-css'))return;
 const PAGES=[
  {id:'explorer',code:'00',label:'Vue générale',short:'Accueil',icon:'◫',group:'PILOTER'},
  {id:'opencalls',code:'01',label:'Open Calls',short:'Calls',icon:'◎',group:'PILOTER'},
  {id:'workspace',code:'02',label:'Radar',short:'Radar',icon:'⌁',group:'PILOTER'},
  {id:'events',code:'03',label:'Événements',short:'Events',icon:'◇',group:'RÉSEAU'},
  {id:'artists',code:'04',label:'Artistes',short:'Artistes',icon:'◉',group:'RÉSEAU'},
  {id:'resources',code:'05',label:'Carte & lieux',short:'Carte',icon:'⌖',group:'RÉSEAU'},
  {id:'content',code:'06',label:'Studio contenu',short:'Studio',icon:'✦',group:'CRÉER'},
  {id:'notes',code:'07',label:'Notes',short:'Notes',icon:'⌂',group:'ORGANISER'},
  {id:'contacts',code:'08',label:'Contacts',short:'Contacts',icon:'☷',group:'ORGANISER'}
 ];
 const META={
  explorer:['CONTROL ROOM','Vue générale','Le signal utile, sans le bruit.'],
  opencalls:['RADAR 01','Open Calls','Chercher, trier, décider.'],
  workspace:['RADAR 02','Moteur de veille','Sources, nouvelles pistes et vérifications.'],
  events:['NETWORK 03','Événements','Expositions, salons et rendez-vous.'],
  artists:['NETWORK 04','Artistes','Profils, suivi et connexions.'],
  resources:['NETWORK 05','Carte & lieux','Voir où se trouvent les opportunités.'],
  content:['STUDIO 06','Création de contenu','Concevoir, éditer, publier.'],
  notes:['DESK 07','Notes','Idées et prochaines actions.'],
  contacts:['DESK 08','Contacts','Les bons interlocuteurs, au même endroit.']
 };

 const css=document.createElement('style');
 css.id='plug-ui-v61-css';
 css.textContent=`
 :root{
  --v61-ink:#151725;--v61-muted:#74798a;--v61-line:rgba(40,44,63,.13);
  --v61-cream:#ebe9e5;--v61-ice:#dbe6e8;--v61-lilac:#dfd7e7;--v61-blue:#5268ff;
  --v61-cyan:#58dbe8;--v61-pink:#e56abc;--v61-violet:#7b5cff;
  --v61-glass:rgba(255,255,255,.34);--v61-glass-hi:rgba(255,255,255,.50);
  --v61-shadow:0 24px 70px rgba(39,42,58,.10);--v61-blur:blur(24px) saturate(132%);
 }
 html{background:#d9dcd9!important}
 body{
  margin:0!important;color:var(--v61-ink)!important;min-height:100vh!important;overflow-x:hidden;
  background:
   radial-gradient(circle at 9% 4%,rgba(92,220,232,.34),transparent 24%),
   radial-gradient(circle at 84% 8%,rgba(133,90,255,.24),transparent 29%),
   radial-gradient(circle at 93% 78%,rgba(229,106,188,.21),transparent 26%),
   linear-gradient(140deg,#d6d9d4 0%,#e4e0dc 36%,#d5e0e2 68%,#ddd5e3 100%)!important;
  background-attachment:fixed!important;
 }
 body:before{
  content:'';position:fixed;inset:0;pointer-events:none;z-index:-1;opacity:.46;
  background-image:linear-gradient(rgba(255,255,255,.09) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.09) 1px,transparent 1px);
  background-size:44px 44px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.55),transparent 76%);
 }
 body:after{
  content:'';position:fixed;right:-120px;top:28vh;width:420px;height:420px;border-radius:50%;pointer-events:none;z-index:-1;
  background:conic-gradient(from 190deg,rgba(82,104,255,.0),rgba(82,104,255,.16),rgba(88,219,232,.14),rgba(229,106,188,.14),rgba(82,104,255,0));
  filter:blur(56px);
 }
 *{scrollbar-width:thin;scrollbar-color:rgba(48,54,76,.20) transparent}
 button,input,select,textarea{font:inherit}
 .shell{max-width:none!important;margin:0!important;padding:18px 24px 60px 126px!important;transition:padding .25s ease!important}
 .header{
  height:66px!important;position:sticky!important;top:14px!important;z-index:160!important;
  display:flex!important;align-items:center!important;gap:14px!important;padding:0 14px 0 18px!important;margin:0 0 18px!important;
  border:1px solid rgba(42,46,65,.12)!important;border-radius:18px!important;
  background:rgba(248,248,246,.44)!important;box-shadow:0 12px 36px rgba(43,46,63,.07)!important;
  backdrop-filter:blur(26px) saturate(135%)!important;-webkit-backdrop-filter:blur(26px) saturate(135%)!important;
 }
 .header .brand,.header .nav,.header .head-actions{display:none!important}
 .v61-topmeta{min-width:0;display:flex;align-items:center;gap:15px}
 .v61-signal{font-size:8px;letter-spacing:2.3px;color:#8e92a0;font-weight:800;white-space:nowrap}
 .v61-title{font-size:17px;font-weight:870;letter-spacing:-.55px;color:#1b1e2d;white-space:nowrap}
 .v61-sub{font-size:10px;color:#808594;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:460px}
 .v61-top-actions{margin-left:auto;display:flex;gap:8px}
 .v61-command,.v61-plugy-btn{
  border:1px solid rgba(50,55,77,.12);background:rgba(255,255,255,.33);color:#33384b;border-radius:12px;
  height:38px;padding:0 12px;display:flex;align-items:center;gap:8px;font-size:10px;font-weight:750;
  backdrop-filter:blur(16px);box-shadow:0 8px 22px rgba(47,51,71,.05)
 }
 .v61-command kbd{font-size:8px;padding:3px 5px;border-radius:6px;background:rgba(27,30,45,.06);color:#777c8d}

 .v61-rail{
  position:fixed;left:14px;top:14px;bottom:14px;width:92px;z-index:220;border-radius:24px;
  background:linear-gradient(180deg,rgba(20,21,31,.90),rgba(27,29,42,.80));
  border:1px solid rgba(255,255,255,.10);box-shadow:0 26px 70px rgba(22,24,34,.23);
  backdrop-filter:blur(30px) saturate(125%);-webkit-backdrop-filter:blur(30px) saturate(125%);
  padding:13px 9px 10px;display:flex;flex-direction:column;
 }
 .v61-logo{height:62px;display:grid;place-items:center;border-bottom:1px solid rgba(255,255,255,.09);margin-bottom:10px}
 .v61-logo strong{font-size:17px;letter-spacing:-1px;color:#fff;line-height:.88}.v61-logo strong span{font-weight:260;color:#c7cad3}
 .v61-logo i{display:block;width:8px;height:8px;border-radius:50%;margin:7px auto 0;background:linear-gradient(135deg,#5ddce8,#7d5dff,#eb6ebe);box-shadow:0 0 18px rgba(127,91,255,.65)}
 .v61-rail-scroll{overflow:auto;min-height:0;scrollbar-width:none}.v61-rail-scroll::-webkit-scrollbar{display:none}
 .v61-nav{
  width:100%;min-height:55px;border:0;background:transparent;color:#9297a6;border-radius:15px;margin:3px 0;padding:6px 4px;
  display:grid;place-items:center;align-content:center;gap:2px;position:relative;transition:.17s ease;
 }
 .v61-nav b{font-size:15px;line-height:1;font-weight:540}.v61-nav small{font-size:7px;line-height:1.05;font-weight:700;max-width:72px;text-align:center;letter-spacing:.15px}
 .v61-nav em{position:absolute;left:4px;top:50%;width:2px;height:0;border-radius:4px;background:linear-gradient(#5ddce8,#8060ff,#e86bbb);transition:.18s;transform:translateY(-50%)}
 .v61-nav:hover{background:rgba(255,255,255,.06);color:#fff}
 .v61-nav.active{background:rgba(255,255,255,.10);color:#fff}.v61-nav.active em{height:28px}
 .v61-rail-foot{margin-top:auto;color:#6f7483;text-align:center;font-size:7px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08);line-height:1.45}
 .v61-rail-foot span{color:#67dbe8}

 .view{animation:v61Fade .24s ease!important}
 @keyframes v61Fade{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:none}}
 .page-hero{
  min-height:116px!important;margin:0 0 14px!important;padding:20px 22px!important;border-radius:20px!important;
  background:rgba(255,255,255,.27)!important;border:1px solid rgba(44,49,70,.12)!important;box-shadow:none!important;
  backdrop-filter:var(--v61-blur)!important;-webkit-backdrop-filter:var(--v61-blur)!important;overflow:hidden!important;position:relative!important;
 }
 .page-hero:before{content:attr(data-v61-code);position:absolute;right:20px;top:8px;font-size:72px;font-weight:950;letter-spacing:-5px;color:rgba(25,28,42,.045);line-height:1}
 .page-hero:after{width:170px!important;height:170px!important;right:-45px!important;top:-75px!important;opacity:.18!important;filter:blur(28px)!important}
 .page-hero small{font-size:8px!important;letter-spacing:2.3px!important;color:#8a8e9d!important}
 .page-hero h1{font-size:31px!important;letter-spacing:-1.7px!important;line-height:1!important;margin:8px 0 6px!important}
 .page-hero p{font-size:11.5px!important;color:#747a8b!important;line-height:1.45!important;max-width:760px!important}
 .card,.studio-panel,.studio-preview,.plugy-panel,.map,.radar-dark,.caption-box,.draft,.intro{
  background:rgba(255,255,255,.30)!important;border:1px solid rgba(44,49,70,.12)!important;
  box-shadow:0 12px 38px rgba(44,48,66,.055)!important;backdrop-filter:var(--v61-blur)!important;-webkit-backdrop-filter:var(--v61-blur)!important;
 }
 .card{border-radius:18px!important;padding:15px!important}
 .grid{gap:11px!important}.opp h3,.event h3,.artist h3{font-size:16px!important;letter-spacing:-.25px!important}
 .opp p,.event p,.artist p,.resource p{font-size:10.5px!important;color:#747a8a!important;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
 .opp:before{height:2px!important;opacity:.62}.thumb{height:124px!important;border-radius:13px!important;opacity:.92}
 .reason{font-size:9px!important;background:rgba(255,255,255,.24)!important;border:1px solid rgba(43,48,67,.08)!important;color:#717689!important}
 .score{background:rgba(113,87,237,.11)!important;color:#5749cc!important}.fav{background:rgba(255,255,255,.54)!important;backdrop-filter:blur(14px)!important}
 .filters{
  display:flex!important;gap:7px!important;padding:8px!important;margin-bottom:12px!important;border-radius:14px!important;
  background:rgba(255,255,255,.22)!important;border:1px solid rgba(45,50,70,.10)!important;backdrop-filter:blur(18px)!important
 }
 input,select,textarea,.chat-form{
  border:1px solid rgba(43,48,68,.12)!important;background:rgba(255,255,255,.28)!important;color:#2b3043!important;
  box-shadow:none!important;backdrop-filter:blur(13px)!important;-webkit-backdrop-filter:blur(13px)!important;
 }
 input:focus,select:focus,textarea:focus{outline:none!important;background:rgba(255,255,255,.48)!important;border-color:rgba(90,87,202,.28)!important}
 .space-btn,.primary,.soft,.ghost,.micro,.chip,.segment button,.format-row button,.dot,.editor-actions button,.content-mode-tabs button,.preset,.float-btn{
  border:1px solid rgba(44,49,69,.12)!important;background:rgba(255,255,255,.28)!important;color:#34394d!important;
  box-shadow:none!important;backdrop-filter:blur(13px)!important;-webkit-backdrop-filter:blur(13px)!important;transition:.16s ease!important;
 }
 .primary{
  background:linear-gradient(135deg,rgba(36,40,58,.90),rgba(68,62,111,.82))!important;color:#fff!important;border-color:rgba(255,255,255,.18)!important
 }
 .space-btn:hover,.primary:hover,.soft:hover,.ghost:hover,.micro:hover,.chip:hover,.segment button:hover,.format-row button:hover,.dot:hover,.editor-actions button:hover,.content-mode-tabs button:hover,.preset:hover{
  transform:translateY(-1px)!important;background-color:rgba(255,255,255,.47)!important
 }
 .segment button.on,.format-row button.on,.content-mode-tabs button.on,.dot.on{background:rgba(100,79,220,.13)!important;color:#5547c6!important;border-color:rgba(96,77,210,.22)!important}
 .float-btn{right:18px!important;bottom:18px!important}
 .float-chat{background:rgba(239,240,243,.78)!important;border:1px solid rgba(45,49,67,.15)!important;backdrop-filter:blur(30px)!important}

 /* Home = command center, not a marketing landing page */
 #explorer{display:none}
 #explorer.active{display:block}
 #explorer .v61-home{display:grid;gap:12px}
 #explorer .hero.v61-command-hero{
  min-height:390px!important;display:grid!important;grid-template-columns:minmax(360px,.95fr) minmax(360px,1.05fr)!important;gap:18px!important;align-items:stretch!important;
  padding:0!important;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;overflow:visible!important
 }
 .v61-home-copy{
  position:relative;padding:30px 30px 28px;border-radius:24px;background:linear-gradient(145deg,rgba(28,30,44,.90),rgba(47,43,68,.80));
  border:1px solid rgba(255,255,255,.10);box-shadow:0 24px 60px rgba(31,33,46,.16);overflow:hidden;color:#fff;
 }
 .v61-home-copy:before{content:'PLUG';position:absolute;right:-16px;bottom:-24px;font-size:150px;font-weight:950;letter-spacing:-10px;color:rgba(255,255,255,.035)}
 .v61-home-copy:after{content:'';position:absolute;width:240px;height:240px;border-radius:50%;right:-110px;top:-100px;background:conic-gradient(rgba(89,219,232,.20),rgba(128,92,255,.27),rgba(229,106,188,.20),rgba(89,219,232,.05));filter:blur(24px)}
 .v61-home-kicker{font-size:8px;letter-spacing:2.6px;color:#9fa5b9;font-weight:800;margin-bottom:48px}
 .v61-home-copy h1{font-size:54px;line-height:.90;letter-spacing:-3.7px;margin:0;position:relative;z-index:1}.v61-home-copy h1 span{font-weight:260;color:#cdd0d9}
 .v61-home-copy p{font-size:13px;line-height:1.55;color:#b8bdcb;max-width:470px;margin:20px 0 24px;position:relative;z-index:1}
 .v61-home-actions{display:flex;gap:8px;flex-wrap:wrap;position:relative;z-index:1}
 .v61-home-actions button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.08);color:#fff;border-radius:12px;padding:11px 13px;font-size:10px;font-weight:760;backdrop-filter:blur(12px)}
 .v61-home-actions button:first-child{background:rgba(255,255,255,.90);color:#202332}
 .v61-plug-cell{
  position:relative;min-height:390px;border-radius:24px;overflow:hidden;background:
   radial-gradient(circle at 26% 25%,rgba(84,220,232,.21),transparent 34%),
   radial-gradient(circle at 80% 20%,rgba(121,88,255,.18),transparent 31%),
   radial-gradient(circle at 76% 80%,rgba(229,106,188,.17),transparent 30%),
   rgba(255,255,255,.29);
  border:1px solid rgba(43,48,67,.12);backdrop-filter:var(--v61-blur);box-shadow:var(--v61-shadow)
 }
 .v61-plug-cell:before{content:'PLUGY / ONLINE';position:absolute;left:18px;top:16px;font-size:8px;letter-spacing:2px;color:#72788a;font-weight:800;z-index:8}
 #plugyStageV59{min-height:390px!important;height:390px!important}
 #plugyStageV59 .v59-visual{height:390px!important;width:min(100%,480px)!important}
 .v61-bento{display:grid;grid-template-columns:1.35fr .8fr .8fr 1fr;grid-auto-rows:142px;gap:10px}
 .v61-tile{
  position:relative;overflow:hidden;border-radius:19px;padding:16px;background:rgba(255,255,255,.28);border:1px solid rgba(43,48,67,.11);
  backdrop-filter:blur(20px) saturate(128%);box-shadow:0 12px 34px rgba(44,47,65,.05);cursor:pointer;text-align:left;color:#252a3c;transition:.17s
 }
 .v61-tile:hover{transform:translateY(-2px);background:rgba(255,255,255,.42)}
 .v61-tile .n{font-size:8px;letter-spacing:1.7px;color:#8c90a0;font-weight:800}.v61-tile strong{display:block;font-size:18px;letter-spacing:-.5px;margin:17px 0 3px}.v61-tile span{font-size:9px;color:#808596}
 .v61-tile .metric-big{font-size:42px;line-height:1;font-weight:920;letter-spacing:-2px;margin-top:10px}
 .v61-tile.radar{grid-row:span 2;background:linear-gradient(155deg,rgba(92,219,231,.17),rgba(255,255,255,.25) 50%,rgba(129,92,255,.14))}
 .v61-tile.radar:after{content:'';position:absolute;width:180px;height:180px;border-radius:50%;right:-90px;bottom:-90px;border:1px solid rgba(96,87,204,.20);box-shadow:0 0 0 24px rgba(96,87,204,.04),0 0 0 48px rgba(96,87,204,.025)}
 .v61-tile.studio{grid-column:span 2;background:linear-gradient(145deg,rgba(229,106,188,.11),rgba(255,255,255,.27))}
 .v61-tile.map{height:auto!important;background:rgba(255,255,255,.28)!important}

 /* Studio progressive disclosure */
 #content .quick-ideas{grid-template-columns:repeat(4,1fr)!important;gap:8px!important;margin:10px 0!important}
 #content .idea{background:rgba(255,255,255,.22)!important;border:1px solid rgba(44,49,69,.10)!important;border-radius:14px!important;padding:11px!important}
 #content .studio-shell{grid-template-columns:265px minmax(420px,1fr)!important;gap:10px!important}
 #content .studio-shell>.studio-panel:nth-child(3){display:none!important}
 #content .studio-shell.v61-editor-open{grid-template-columns:255px minmax(390px,1fr) 300px!important}
 #content .studio-shell.v61-editor-open>.studio-panel:nth-child(3){display:block!important}
 .v61-edit-toggle{border:1px solid rgba(44,49,69,.12);background:rgba(255,255,255,.28);border-radius:10px;padding:8px 10px;font-size:9px;font-weight:780;color:#42475a;margin-left:auto}
 #content .studio-preview{min-height:620px!important;border-radius:20px!important;background:rgba(255,255,255,.23)!important}
 #content .carousel-slide{box-shadow:0 24px 50px rgba(35,39,58,.13)!important}
 #content .content-mode-tabs{display:flex!important;gap:6px!important;padding:5px!important;border-radius:13px;background:rgba(255,255,255,.18);border:1px solid rgba(44,49,69,.08);width:max-content;max-width:100%;overflow:auto}
 #content .content-mode-tabs button{white-space:nowrap!important}

 .v61-command-palette{
  position:fixed;inset:0;z-index:600;display:none;place-items:start center;padding-top:min(16vh,150px);
  background:rgba(25,27,38,.30);backdrop-filter:blur(12px)
 }
 .v61-command-palette.open{display:grid}
 .v61-palette-box{width:min(620px,calc(100vw - 28px));border-radius:22px;padding:10px;background:rgba(243,243,241,.82);border:1px solid rgba(255,255,255,.45);box-shadow:0 40px 110px rgba(27,29,41,.28);backdrop-filter:blur(34px)}
 .v61-palette-box input{width:100%;height:50px;border-radius:14px!important;padding:0 15px!important;font-size:14px!important;background:rgba(255,255,255,.48)!important}
 .v61-palette-results{display:grid;gap:5px;padding:8px 2px 2px;max-height:380px;overflow:auto}
 .v61-palette-results button{display:flex;align-items:center;gap:12px;border:0;background:transparent;border-radius:13px;padding:11px 12px;text-align:left;color:#2f3447}
 .v61-palette-results button:hover{background:rgba(255,255,255,.56)}
 .v61-palette-results b{width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:rgba(55,61,87,.06)}
 .v61-palette-results span{font-size:11px;font-weight:730}.v61-palette-results small{margin-left:auto;color:#9296a3;font-size:8px}

 .v61-mobile-dock,.v61-more{display:none}

 @media(max-width:1180px){
  .shell{padding-left:24px!important}.v61-rail{display:none!important}
  .header .brand{display:flex!important}.header .brand-main{font-size:20px!important}.header .brand-sub{display:none!important}.header .brand-orb{width:18px!important;height:18px!important}
  .v61-signal{display:none}.v61-title{font-size:14px}.v61-sub{max-width:320px}
  #explorer .hero.v61-command-hero{grid-template-columns:1fr 1fr!important}
  .v61-bento{grid-template-columns:1fr 1fr 1fr!important}.v61-tile.studio{grid-column:span 2}
  #content .studio-shell,#content .studio-shell.v61-editor-open{grid-template-columns:240px minmax(380px,1fr)!important}
  #content .studio-shell.v61-editor-open>.studio-panel:nth-child(3){grid-column:1/-1!important}
 }
 @media(max-width:760px){
  body{padding-bottom:82px!important}.shell{padding:8px 9px 26px!important}
  .header{height:56px!important;top:7px!important;margin-bottom:10px!important;border-radius:17px!important;padding:0 11px!important}
  .header .brand{display:flex!important}.header .brand-main{font-size:19px!important}.header .brand-orb{width:17px!important;height:17px!important}
  .v61-topmeta{display:none!important}.v61-top-actions{margin-left:auto}.v61-plugy-btn{display:none}.v61-command{height:36px;padding:0 10px}.v61-command kbd{display:none}
  .page-hero{min-height:96px!important;padding:16px!important;border-radius:17px!important}.page-hero:before{font-size:55px!important}.page-hero h1{font-size:26px!important}.page-hero p{font-size:10.5px!important}
  .grid{grid-template-columns:1fr!important}.filters{display:grid!important;grid-template-columns:1fr 1fr!important}.filters input{grid-column:1/-1!important;min-width:0!important;width:100%!important}
  #explorer .hero.v61-command-hero{grid-template-columns:1fr!important;gap:9px!important}
  .v61-home-copy{padding:22px 19px 20px!important;min-height:270px}.v61-home-kicker{margin-bottom:32px!important}.v61-home-copy h1{font-size:42px!important;letter-spacing:-2.8px!important}.v61-home-copy p{font-size:12px!important;margin:15px 0 18px!important}
  .v61-home-actions button{padding:10px 11px!important}
  .v61-plug-cell{min-height:260px!important}.v61-plug-cell:before{left:14px;top:12px}
  #plugyStageV59,#plugyStageV59 .v59-visual{min-height:260px!important;height:260px!important}
  .v61-bento{grid-template-columns:1fr 1fr!important;grid-auto-rows:128px!important}.v61-tile.radar{grid-row:span 1!important;grid-column:span 2!important}.v61-tile.studio{grid-column:span 2!important}.v61-tile strong{font-size:16px!important;margin-top:12px!important}.v61-tile .metric-big{font-size:34px!important}
  .stats{grid-template-columns:1fr 1fr!important}
  #content .quick-ideas{grid-template-columns:1fr 1fr!important}
  #content .studio-shell,#content .studio-shell.v61-editor-open{grid-template-columns:1fr!important}
  #content .studio-shell>.studio-panel:nth-child(3){display:none!important}
  #content .studio-shell.v61-editor-open>.studio-panel:nth-child(3){display:block!important;grid-column:auto!important}
  #content .studio-preview{grid-row:auto!important;min-height:auto!important}
  .radar-layout{grid-template-columns:1fr!important}
  .v61-mobile-dock{
   display:grid;grid-template-columns:repeat(5,1fr);position:fixed;left:8px;right:8px;bottom:8px;height:65px;z-index:300;
   background:rgba(34,36,49,.82);border:1px solid rgba(255,255,255,.10);border-radius:21px;padding:6px;box-shadow:0 20px 50px rgba(25,27,39,.25);
   backdrop-filter:blur(28px) saturate(130%);-webkit-backdrop-filter:blur(28px) saturate(130%)
  }
  .v61-mobile-dock button{border:0;background:transparent;color:#9297a6;border-radius:14px;display:grid;place-items:center;align-content:center;gap:2px;font-size:7.5px;font-weight:700}
  .v61-mobile-dock button b{font-size:15px;font-weight:500}.v61-mobile-dock button.active{background:rgba(255,255,255,.10);color:#fff}
  .v61-more{
   position:fixed;left:10px;right:10px;bottom:80px;z-index:299;padding:10px;border-radius:19px;background:rgba(239,239,238,.88);border:1px solid rgba(255,255,255,.4);box-shadow:0 24px 70px rgba(31,33,45,.25);backdrop-filter:blur(28px)
  }
  .v61-more.open{display:grid!important;grid-template-columns:1fr 1fr;gap:7px}
  .v61-more button{border:1px solid rgba(44,49,69,.10);background:rgba(255,255,255,.35);border-radius:13px;padding:12px;text-align:left;color:#383d50;font-size:10px}
  .float-btn{bottom:84px!important;right:12px!important}.float-chat{bottom:132px!important;right:9px!important;width:calc(100vw - 18px)!important;height:min(470px,64vh)!important}
 }
 `;
 document.head.appendChild(css);

 function clickPage(id){
  const old=[...document.querySelectorAll('[data-page]')].find(x=>x.dataset.page===id);
  if(old){old.click()}else{location.hash='#'+id}
  sync(id);
 }
 function sync(id){
  const p=PAGES.find(x=>x.id===id)||PAGES[0],m=META[p.id]||META.explorer;
  document.querySelectorAll('[data-v61-page]').forEach(b=>b.classList.toggle('active',b.dataset.v61Page===p.id));
  document.querySelector('.v61-signal')?.replaceChildren(document.createTextNode(m[0]));
  document.querySelector('.v61-title')?.replaceChildren(document.createTextNode(m[1]));
  document.querySelector('.v61-sub')?.replaceChildren(document.createTextNode(m[2]));
  document.querySelector('.v61-more')?.classList.remove('open');
 }
 function rail(){
  if(document.getElementById('v61Rail'))return;
  const el=document.createElement('aside');el.id='v61Rail';el.className='v61-rail';
  el.innerHTML='<div class="v61-logo"><strong>PLUG<br><span>ART</span><i></i></strong></div><div class="v61-rail-scroll"></div><div class="v61-rail-foot"><span>●</span> LIVE<br>V61</div>';
  const sc=el.querySelector('.v61-rail-scroll');
  PAGES.forEach(p=>{const b=document.createElement('button');b.className='v61-nav';b.dataset.v61Page=p.id;b.title=p.label;b.innerHTML='<em></em><b>'+p.icon+'</b><small>'+p.label+'</small>';b.onclick=()=>clickPage(p.id);sc.appendChild(b)});
  document.body.appendChild(el)
 }
 function topbar(){
  const h=document.querySelector('.header');if(!h||h.querySelector('.v61-topmeta'))return;
  const m=document.createElement('div');m.className='v61-topmeta';m.innerHTML='<div class="v61-signal">CONTROL ROOM</div><div><div class="v61-title">Vue générale</div><div class="v61-sub">Le signal utile, sans le bruit.</div></div>';
  h.insertBefore(m,h.firstChild);
  const actions=document.createElement('div');actions.className='v61-top-actions';actions.innerHTML='<button class="v61-plugy-btn">PLUGY <span style="color:#38b783">●</span></button><button class="v61-command">Naviguer <kbd>⌘ K</kbd></button>';
  h.appendChild(actions);
  actions.querySelector('.v61-command').onclick=openPalette;
  actions.querySelector('.v61-plugy-btn').onclick=()=>document.querySelector('.float-chat')?.classList.add('open')
 }
 function palette(){
  if(document.getElementById('v61Palette'))return;
  const p=document.createElement('div');p.id='v61Palette';p.className='v61-command-palette';
  p.innerHTML='<div class="v61-palette-box"><input placeholder="Aller vers une rubrique…"><div class="v61-palette-results"></div></div>';document.body.appendChild(p);
  const input=p.querySelector('input'),res=p.querySelector('.v61-palette-results');
  const draw=q=>{const term=(q||'').toLowerCase();res.innerHTML='';PAGES.filter(x=>!term||x.label.toLowerCase().includes(term)||x.group.toLowerCase().includes(term)).forEach(x=>{const b=document.createElement('button');b.innerHTML='<b>'+x.icon+'</b><span>'+x.label+'</span><small>'+x.group+' · '+x.code+'</small>';b.onclick=()=>{clickPage(x.id);closePalette()};res.appendChild(b)})};
  input.oninput=()=>draw(input.value);p.addEventListener('click',e=>{if(e.target===p)closePalette()});draw('');
 }
 function openPalette(){palette();const p=document.getElementById('v61Palette');p.classList.add('open');setTimeout(()=>p.querySelector('input')?.focus(),30)}
 function closePalette(){document.getElementById('v61Palette')?.classList.remove('open')}
 function mobile(){
  if(document.getElementById('v61Mobile'))return;
  const nav=document.createElement('nav');nav.id='v61Mobile';nav.className='v61-mobile-dock';
  ['explorer','opencalls','workspace','content'].forEach(id=>{const p=PAGES.find(x=>x.id===id);const b=document.createElement('button');b.dataset.v61Page=id;b.innerHTML='<b>'+p.icon+'</b><span>'+p.short+'</span>';b.onclick=()=>clickPage(id);nav.appendChild(b)});
  const more=document.createElement('button');more.innerHTML='<b>•••</b><span>Plus</span>';more.onclick=()=>document.querySelector('.v61-more')?.classList.toggle('open');nav.appendChild(more);document.body.appendChild(nav);
  const sheet=document.createElement('div');sheet.className='v61-more';
  ['events','artists','resources','notes','contacts'].forEach(id=>{const p=PAGES.find(x=>x.id===id);const b=document.createElement('button');b.textContent=p.code+'  '+p.label;b.onclick=()=>clickPage(id);sheet.appendChild(b)});document.body.appendChild(sheet)
 }
 async function loadHomeNumbers(){
  try{
   const [s,r]=await Promise.all([fetch('/api/stats',{cache:'no-store'}).then(x=>x.json()),fetch('/api/radar/status',{cache:'no-store'}).then(x=>x.json())]);
   const put=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val??'—'};
   put('v61Opp',s.opportunities);put('v61Artists',s.artists);put('v61Events',s.exhibitions);
   const run=r?.last_run;put('v61Radar',run?.online??run?.checked??'LIVE');
   const sub=document.getElementById('v61RadarSub');if(sub&&run?.finished_at){try{sub.textContent='Dernier cycle · '+new Date(run.finished_at).toLocaleDateString('fr-FR')}catch{}}
  }catch{}
 }
 function rebuildHome(){
  const root=document.getElementById('explorer');if(!root||root.dataset.v61==='1')return;
  const existing=document.getElementById('plugyStageV59');if(existing)existing.remove();
  root.dataset.v61='1';
  root.innerHTML=`<div class="v61-home">
   <div class="hero v61-command-hero">
    <section class="v61-home-copy">
     <div class="v61-home-kicker">PLUG ART / CONTROL ROOM / 00</div>
     <h1>Le signal<br><span>avant le bruit.</span></h1>
     <p>Un poste de pilotage pour trouver les opportunités, suivre les artistes, préparer les contenus et garder les prochaines actions visibles.</p>
     <div class="v61-home-actions"><button data-v61-go="opencalls">Voir les Open Calls</button><button data-v61-go="workspace">Lancer le Radar</button><button data-v61-go="content">Créer un contenu</button></div>
    </section>
    <section class="v61-plug-cell" id="v61PlugCell"></section>
   </div>
   <div class="v61-bento">
    <button class="v61-tile radar" data-v61-go="workspace"><div class="n">02 / RADAR</div><div class="metric-big" id="v61Radar">LIVE</div><strong>Le moteur de veille</strong><span id="v61RadarSub">Sources, vérification et nouvelles pistes.</span></button>
    <button class="v61-tile" data-v61-go="opencalls"><div class="n">01 / OPEN CALLS</div><div class="metric-big" id="v61Opp">—</div><span>Opportunités actives</span></button>
    <button class="v61-tile" data-v61-go="artists"><div class="n">04 / ARTISTES</div><div class="metric-big" id="v61Artists">—</div><span>Profils suivis</span></button>
    <button class="v61-tile studio" data-v61-go="content"><div class="n">06 / STUDIO</div><strong>Créer sans changer d’outil.</strong><span>Carrousels, posts, stories et textes.</span></button>
    <button class="v61-tile" data-v61-go="resources"><div class="n">05 / CARTE</div><strong>Voir les lieux.</strong><span>Opportunités et structures sur la carte.</span></button>
    <button class="v61-tile" data-v61-go="events"><div class="n">03 / ÉVÉNEMENTS</div><div class="metric-big" id="v61Events">—</div><span>Rendez-vous enregistrés</span></button>
    <button class="v61-tile" data-v61-go="notes"><div class="n">07 / NOTES</div><strong>Garder le fil.</strong><span>Idées et prochaines actions.</span></button>
   </div>
   <div id="homeStats" hidden></div>
  </div>`;
  if(existing)document.getElementById('v61PlugCell')?.appendChild(existing);
  root.querySelectorAll('[data-v61-go]').forEach(b=>b.onclick=()=>clickPage(b.dataset.v61Go));
  loadHomeNumbers()
 }
 function decoratePages(){
  PAGES.filter(p=>p.id!=='explorer').forEach(p=>{const hero=document.querySelector('#'+p.id+' .page-hero');if(hero){hero.dataset.v61Code=p.code;const small=hero.querySelector('small');if(small)small.textContent=(META[p.id]?.[0]||p.group)+' / '+p.code}})
 }
 function simplifyStudio(){
  const shell=document.querySelector('#content .studio-shell');if(!shell||shell.dataset.v61==='1')return;shell.dataset.v61='1';
  const preview=shell.querySelector('.studio-preview .preview-top');if(preview){
   const b=document.createElement('button');b.className='v61-edit-toggle';b.textContent='Éditer la slide';b.onclick=()=>{shell.classList.toggle('v61-editor-open');b.textContent=shell.classList.contains('v61-editor-open')?'Fermer l’éditeur':'Éditer la slide'};preview.appendChild(b)
  }
 }
 function boot(){
  rail();topbar();palette();mobile();rebuildHome();decoratePages();simplifyStudio();
  sync((location.hash||'#explorer').slice(1));
  window.addEventListener('hashchange',()=>sync((location.hash||'#explorer').slice(1)));
  document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openPalette()}else if(e.key==='Escape')closePalette()});
  document.addEventListener('click',e=>{const b=e.target.closest('[data-page]');if(b)setTimeout(()=>sync(b.dataset.page),0)},{passive:true})
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();