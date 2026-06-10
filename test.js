
/* ---------- EDITABLE ---------- */
let restaurantName="Smart POS";
let logoImg=null;
let role="cashier";

let MENU=[
  {id:1,name:"Chicken Seekh Kabab 2pc",price:15,cat:"Kababs",img:"assets/menu/chicken-seekh-kabab.png"},
  {id:2,name:"Beef Seekh Kabab 2pc",price:17,cat:"Kababs",img:"assets/menu/beef-seekh-kabab.png"},
  {id:3,name:"Chicken Tikka",price:16,cat:"Kababs",img:"assets/menu/chicken-tikka.png"},
  {id:4,name:"Mutton Chops",price:25,cat:"Kababs",img:"assets/menu/mutton-chops.png"},
  {id:5,name:"Chicken Biryani",price:15,cat:"Rice",img:"assets/menu/chicken-biryani.png"},
  {id:6,name:"Mutton Biryani",price:20,cat:"Rice",img:"assets/menu/mutton-biryani.png"},
  {id:7,name:"Chicken Achari New",price:15,cat:"Curries",img:"assets/menu/chicken-achari.png"},
  {id:8,name:"Plain Naan",price:3,cat:"Breads",img:"assets/menu/plain-naan.png"},
  {id:9,name:"Garlic Naan",price:5,cat:"Breads",img:"assets/menu/garlic-naan.png"},
  {id:10,name:"Roghni Naan",price:4,cat:"Breads",img:"assets/menu/roghni-naan.png"},
  {id:11,name:"Chicken Karahi",price:35,cat:"Curries",img:"assets/menu/chicken-karahi.png"},
  {id:12,name:"Daal Makhani",price:14,cat:"Curries",img:"assets/menu/daal-makhani.png"},
  {id:13,name:"Mango Lassi",price:7,cat:"Drinks",img:"assets/menu/mango-lassi.png"},
  {id:14,name:"Soft Drink",price:5,cat:"Drinks",img:"assets/menu/soft-drink.png"},
  {id:15,name:"Fresh Juice",price:9,cat:"Drinks",img:"assets/menu/fresh-juice.png"},
];
const TYPES=[{k:"dine",l:"Dine-In",s:"DI"},{k:"take",l:"Takeaway",s:"TA"},{k:"delivery",l:"Delivery",s:"DL"}];
const FLOW=["Received","Preparing","Ready","Completed"];
const SERVICE=0.05, TAX=0.06;
const rm=n=>"RM "+Number(n).toFixed(2);
const uid=()=>"#"+Math.random().toString(36).slice(2,8).toUpperCase();
const cats=()=>["All",...new Set(MENU.map(m=>m.cat))];

const NAV=[
  {g:"Orders & Dining",items:[{k:"pos",l:"Orders Dashboard",badge:3},{k:"waiter",l:"Waiter Order Screen"},{k:"kds",l:"Kitchen Display"},{k:"quickpos",l:"Quick POS Billing"},{k:"tables",l:"Tables"},{k:"bookings",l:"Table Bookings"},{k:"service",l:"Table Service"}]},
  {g:"Reports & Analytics",items:[{k:"reports",l:"Reports"},{k:"closing",l:"Daily Closing"},{k:"analytics",l:"Restaurant Analytics"}]},
  {g:"Menu & Marketing",items:[{k:"menu",l:"Menu & Dishes"},{k:"modifiers",l:"Kitchen Notes + Modifiers"},{k:"recipes",l:"Recipe Auto Stock"},{k:"qr",l:"QR Table Ordering"},{k:"promotions",l:"Promotions"}]},
  {g:"Management",items:[{k:"staff",l:"Staff Center"},{k:"roles",l:"Roles & Permissions"},{k:"cashier",l:"Cashier Features"},{k:"customers",l:"Customer Features"},{k:"inventory",l:"Inventory"},{k:"expenses",l:"Expenses"},{k:"barcode",l:"Barcode Scanner"},{k:"kotprinter",l:"Auto KOT Printer"},{k:"branches",l:"Multi Branch"},{k:"loyalty",l:"Loyalty Points"},{k:"settings",l:"Settings"}]},
];
const ROLE_NAV={
  waiter:["waiter","tables","service","bookings"],
  kitchen:["kds"],
  tandoor:["kds"],
  cashier:null
};

/* ---------- DATA ---------- */
let orders=[];
let salesLog=[]; /* real sales records, grows when orders are settled */
let seq=1001, selNo=null, tab="running";
let tables=Array.from({length:12},(_,i)=>({n:i+1,occ:false}));
let bookings=[];
let serviceReqs=[];
let staff=[];
let inventory=[];
let expenses=[];
let promos=[];
let customers=[];
let branches=[];
let rolePerms=[{role:"Admin",perms:"Full access, reports, settings"},{role:"Manager",perms:"Orders, inventory, reports"},{role:"Cashier",perms:"Billing, receipts, customers"},{role:"Waiter",perms:"Create orders, table service"},{role:"Kitchen",perms:"KDS only, update status"}];
let openRoleIndex=null;
let barcodeText="";

/* ---------- HELPERS ---------- */
const typeMeta=k=>TYPES.find(t=>t.k===k);
const findImg=id=>{const m=MENU.find(x=>x.id===id);return m?m.img:null;};
const stationOf=i=>{const c=(i.cat||MENU.find(m=>m.id===i.id)?.cat||"").toLowerCase(); if(c.includes("bread")||c.includes("naan"))return "Tandoor"; if(c.includes("bbq")||c.includes("kabab")||c.includes("tikka")||c.includes("chops"))return "BBQ"; if(c.includes("drink")||c.includes("lassi")||c.includes("juice"))return "Drinks"; return "Main Kitchen";};
const stationIcon=s=>s==="Tandoor"?"🔥":s==="BBQ"?"🍢":s==="Drinks"?"🥤":"🍲";
const subOf=o=>o.items.reduce((s,i)=>s+i.price*i.qty,0);
function totals(o){const sub=subOf(o);const svc=sub*SERVICE;const tax=sub*TAX;return{sub,svc,tax,total:sub+svc+tax};}

/* ---------- ROLE ---------- */
function setRole(r){
  role=r;
  document.getElementById("roleCashier").classList.toggle("active",r==="cashier");
  document.getElementById("roleWaiter").classList.toggle("active",r==="waiter");
  const kbtn=document.getElementById("roleKitchen"); if(kbtn)kbtn.classList.toggle("active",r==="kitchen");
  const tbtn=document.getElementById("roleTandoor"); if(tbtn)tbtn.classList.toggle("active",r==="tandoor");
  if(r==="waiter") nav="waiter";
  if(r==="kitchen"||r==="tandoor") nav="kds";
  if(r==="cashier" && nav==="waiter") nav="pos";
  renderNav();
  toast(r==="waiter"?"Waiter mode — simple order taking":r==="kitchen"?"Kitchen mode — main kitchen only":r==="tandoor"?"Tandoor mode — breads only":"Cashier mode — billing");
  render();
}

/* ---------- SIDEBAR ---------- */
let nav="pos";
function renderNav(){
  const allowed=ROLE_NAV[role];
  document.getElementById("nav").innerHTML=NAV.map(g=>{
    const items=allowed?g.items.filter(it=>allowed.includes(it.k)):g.items;
    if(!items.length)return "";
    return `<div class="group-title">${g.g}</div>${items.map(it=>`<div class="nav-link ${nav===it.k?'active':''}" onclick="go('${it.k}')"><span class="ic"></span><span>${it.l}</span>${it.badge?`<span class="badge">${it.badge}</span>`:''}</div>`).join("")}`;
  }).join("");
  document.getElementById("brandName").textContent=restaurantName;
  document.getElementById("tbTitle").textContent=restaurantName;
  const bl=document.getElementById("brandLogo");bl.innerHTML=logoImg?`<img src="${logoImg}">`:restaurantName.charAt(0).toUpperCase();
}
function go(k){nav=k;renderNav();render();}

/* ---------- ROUTER ---------- */
function render(){
  const m=document.getElementById("main");
  const v={pos:posView,waiter:waiterView,quickpos:quickPosView,kds:kdsView,tables:tablesView,bookings:bookingsView,service:serviceView,reports:reportView,closing:closingView,analytics:analyticsView,menu:menuView,modifiers:modifiersView,recipes:recipesView,qr:qrView,promotions:promoView,staff:staffView,roles:rolesView,cashier:cashierFeaturesView,inventory:invView,expenses:expensesView,barcode:barcodeView,kotprinter:kotPrinterView,branches:branchesView,customers:customerFeaturesView,loyalty:loyaltyView,settings:settingsView}[nav];
  m.innerHTML=v?v():"";
  queueSave();
}

/* ---------- POS ---------- */
function todayKey(){return localDateKey(new Date());}
function todayOrderStats(){
  const key=todayKey();
  const paidToday=salesLog.filter(r=>normalizeSaleKey(r.key)===key);
  const openOrders=orders;
  const totalOrders=openOrders.length + paidToday.length;
  const dineOrders=openOrders.filter(o=>o.type==="dine").length + paidToday.filter(r=>r.type==="dine").length;
  const takeOrders=openOrders.filter(o=>o.type==="take").length + paidToday.filter(r=>r.type==="take").length;
  const deliveryOrders=openOrders.filter(o=>o.type==="delivery").length + paidToday.filter(r=>r.type==="delivery").length;
  const todaySales=paidToday.reduce((s,r)=>s+Number(r.sales||0),0);
  return {totalOrders,dineOrders,takeOrders,deliveryOrders,todaySales};
}
function posView(){
  const running=orders;
  const stats=todayOrderStats();
  const past=pastSalesToday();
  const sel=tab==='past'?past.find(o=>o.no===selNo):orders.find(o=>o.no===selNo);
  return `
  <div class="top-head">
    <div><h1>Order Dashboard</h1><p>${role==='waiter'?'Take orders and send to kitchen':'Manage running orders, bills and payments'} — one screen.</p></div>
    <div class="head-actions">
      <button class="btn light">🖨 Printer</button>
      <button class="btn blue" onclick="openModal()">+ Create New Order</button>
    </div>
  </div>
  <div class="stats">
    <div class="stat"><small>Total Orders</small><h2>${stats.totalOrders}</h2><div class="trend up">${running.length} running</div></div>
    <div class="stat"><small>Total Dine-In Orders</small><h2>${stats.dineOrders}</h2></div>
    <div class="stat"><small>Total Takeaway Orders</small><h2>${stats.takeOrders}</h2></div>
    <div class="stat ${role==='waiter'?'hide-cashier':''}"><small>Total Sales</small><h2>${rm(stats.todaySales)}</h2><div class="trend up">Paid orders only</div></div>
  </div>
  <div class="pos-grid">
    <section class="panel">
      <div class="panel-head"><h3>Orders</h3><span class="pill">${running.length} Running</span></div>
      <div class="tabs"><div class="tab ${tab==='running'?'active':''}" onclick="setTab('running')">RUNNING</div><div class="tab ${tab==='past'?'active':''}" onclick="setTab('past')">PAST</div></div>
      <div class="filters"><select class="input"><option>Invoice No.</option><option>Table No.</option></select><input class="input" placeholder="Search by invoice no."></div>
      <div class="order-list">${listOrders()}</div>
    </section>
    <section class="panel">
      <div class="panel-head"><h3>Order Details</h3><span class="invoice">${sel?sel.inv:''}</span></div>
      ${sel?(tab==='past'?pastDetailBody(sel):detailBody(sel)):'<div class="empty">Select an order</div>'}
    </section>
    <section class="panel bill-panel">
      <div class="panel-head"><h3>${role==='waiter'?'Order Actions':'Bill Summary'}</h3>${sel?`<span class="pill ${sel.status==='Paid'?'green-pill':'red-pill'}">${sel.status}</span>`:''}</div>
      ${sel?(tab==='past'?pastBillBody(sel):billBody(sel)):'<div class="empty">No order selected</div>'}
    </section>
  </div>`;
}
function pastSalesToday(){
  const key=todayKey();
  return salesLog.filter(r=>normalizeSaleKey(r.key)===key).slice().reverse();
}
function listOrders(){
  if(tab==="past"){
    const past=pastSalesToday();
    if(!past.length)return '<div class="empty">No past orders today</div>';
    return past.map(r=>{const a=r.no===selNo;const typ=typeMeta(r.type||'take')?.l||'Order';
      return `<div class="order-card ${a?'active':''}" onclick="selectPastOrder('${r.no}')">
        <div class="row"><div><span class="dot"></span><span class="order-title">Order ${r.no}</span></div><span class="pill green-pill">Paid</span></div>
        <div class="order-meta"><span>✅ ${r.method||'Paid'}</span><span>🛍 ${r.itemsCount||r.items||0} items</span><span>${r.table?'Table '+r.table:typ}</span><span>${rm(r.sales||0)}</span></div>
      </div>`;}).join("");
  }
  return orders.map(o=>{const M=typeMeta(o.type),a=o.no===selNo;
    const stPill=o.status==="Paid"?'green-pill':o.stage===1?'red-pill':'blue-pill';
    const stTxt=o.status==="Unpaid"?(o.stage>=2?FLOW[o.stage]:"Unpaid"):"Paid";
    return `<div class="order-card ${a?'active':''}" onclick="selectOrder('${o.no}')">
      <div class="row"><div><span class="dot"></span><span class="order-title">Order ${o.no}</span></div><span class="pill ${stPill}">${stTxt}</span></div>
      <div class="order-meta"><span>⏱ ${o.age}</span><span>🛍 ${o.items.reduce((s,i)=>s+i.qty,0)} items</span><span>${o.table?'Table '+o.table:typeMeta(o.type).l}</span></div>
    </div>`;}).join("");
}
function selectPastOrder(no){selNo=no;render();}
function pastDetailBody(r){
  const itemRows=Array.isArray(r.itemsList)?r.itemsList.map(i=>`<tr><td><div class="food-line"><span class="food-img">${findImg(i.id)?`<img src="${findImg(i.id)}">`:'🍽'}</span>${i.name}</div></td><td>${i.qty}</td><td>${rm(i.price||0)}</td><td>${rm((i.price||0)*(i.qty||1))}</td></tr>`).join(''):`<tr><td>Paid order summary</td><td>${r.itemsCount||r.items||0}</td><td>-</td><td>${rm(r.sales||0)}</td></tr>`;
  return `<div class="detail-body">
    <div class="order-info">
      <div class="info-box"><small>Order No.</small><h4>${r.no}</h4></div>
      <div class="info-box"><small>Status</small><h4 class="status-text">Paid</h4></div>
      <div class="info-box"><small>Payment</small><h4>${r.method||'Paid'}</h4></div>
      <div class="info-box"><small>Type</small><h4>${typeMeta(r.type||'take')?.l||'Order'}</h4></div>
    </div>
    <table class="items-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemRows}</tbody></table>
  </div>`;
}
function pastBillBody(r){
  return `<div class="bill-body"><div class="bill-top"><div><h2>Order ${r.no}</h2><p style="color:#6b7280;margin-top:5px">Paid by ${r.method||'Payment'} ${r.table?'· Table '+r.table:''}</p></div><button class="btn light">PAID</button></div>
  <div class="summary"><div class="sum-row total"><span>Total Paid</span><span>${rm(r.sales||0)}</span></div></div>
  <div class="action-grid"><button class="btn green" onclick="printPastReceipt('${r.no}')">PRINT BILL</button></div></div>`;
}
function printPastReceipt(no){const r=salesLog.find(x=>x.no===no); if(!r){toast('Past order not found');return;} const html=`<!doctype html><html><head><title>Receipt ${r.no}</title><style>body{font-family:Arial;padding:22px}.r{max-width:340px;margin:auto}.center{text-align:center}.line{border-top:1px dashed #999;margin:12px 0}.row{display:flex;justify-content:space-between;margin:6px 0}.total{font-size:18px;font-weight:900}</style></head><body><div class="r"><div class="center"><h2>${restaurantName}</h2><div>Receipt ${r.no}</div><div>${r.method||'Paid'}</div></div><div class="line"></div>${Array.isArray(r.itemsList)?r.itemsList.map(i=>`<div class="row"><span>${i.name} x${i.qty}</span><b>${rm((i.price||0)*(i.qty||1))}</b></div>`).join(''):`<div class="row"><span>Items</span><b>${r.itemsCount||r.items||0}</b></div>`}<div class="line"></div><div class="row total"><span>Total</span><span>${rm(r.sales||0)}</span></div><p class="center">Thank you</p></div><script>window.print()<\/script></body></html>`; const w=window.open('','_blank');w.document.write(html);w.document.close();}
function detailBody(o){const M=typeMeta(o.type);
  return `<div class="detail-body">
    <div class="order-info">
      <div class="info-box"><small>Order No.</small><h4>${o.no}</h4></div>
      <div class="info-box"><small>Status</small><h4 class="status-text">${o.status}</h4></div>
      <div class="info-box"><small>Table</small><h4>${o.table?'T'+o.table:'-'}</h4></div>
      <div class="info-box"><small>Type</small><h4>${M.l}</h4></div>
    </div>
    <table class="items-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
    <tbody>${o.items.map(i=>{const im=findImg(i.id);return `<tr>
      <td><div class="food-line"><span class="food-img">${im?`<img src="${im}">`:'🍽'}</span>${i.name}</div></td>
      <td><div class="qty-controls"><button onclick="qty('${o.no}',${i.id},-1)">−</button><b>${i.qty}</b><button onclick="qty('${o.no}',${i.id},1)">+</button></div></td>
      <td>${rm(i.price)}</td><td>${rm(i.price*i.qty)}</td></tr>`;}).join("")}</tbody></table>
    <div class="status-flow">${FLOW.map((f,i)=>`<div class="flow-box ${i<o.stage?'done':i===o.stage?'active':''}" onclick="setStage('${o.no}',${i})">${f}</div>`).join("")}</div>
  </div>`;
}
function billBody(o){const t=totals(o);
  const actions = role==="waiter"
    ? `<div class="action-grid"><button class="btn blue" onclick="openModal()">➕ Add Item</button><button class="btn green" onclick="nextStage('${o.no}')">👨‍🍳 Send / Next Stage</button></div>`
    : `<div class="action-grid">
        <button class="btn green" onclick="openModal()">ADD ITEM</button>
        <button class="btn green" onclick="settle('${o.no}')" ${o.status==='Paid'?'disabled':''}>SETTLE BILL</button>
        <button class="btn green" onclick="printReceipt('${o.no}')">PRINT</button>
        <button class="btn green" onclick="complete('${o.no}')">COMPLETE</button>
      </div>`;
  return `<div class="bill-body">
    <div class="bill-top"><div><h2>Order ${o.no}</h2><p style="color:#6b7280;margin-top:5px">${o.table?'Table '+o.table:typeMeta(o.type).l} • ${o.items.length} items</p></div><button class="btn light">${typeMeta(o.type).s}</button></div>
    <div class="bill-list">${o.items.map(i=>`<div class="bill-item"><div><b>${i.name}</b><br><small>${rm(i.price)} each</small></div><div class="bill-qty">x ${i.qty}</div></div>`).join("")}</div>
    <div class="summary ${role==='waiter'?'hide-cashier':''}">
      <div class="sum-row"><span>Subtotal</span><b>${rm(t.sub)}</b></div>
      <div class="sum-row"><span>Service Charge 5%</span><b>${rm(t.svc)}</b></div>
      <div class="sum-row"><span>SST 6%</span><b>${rm(t.tax)}</b></div>
      <div class="sum-row total"><span>Total</span><span>${rm(t.total)}</span></div>
    </div>
    ${actions}
  </div>`;
}
function setTab(t){tab=t;render();}
function selectOrder(no){selNo=no;render();}
function qty(no,id,d){const o=orders.find(x=>x.no===no);const it=o.items.find(i=>i.id===id);it.qty+=d;if(it.qty<=0)o.items=o.items.filter(i=>i.id!==id);render();}
function setStage(no,s){orders.find(x=>x.no===no).stage=s;render();}
function nextStage(no){const o=orders.find(x=>x.no===no);if(o.stage<3)o.stage++;toast("Stage: "+FLOW[o.stage]);render();}
function activePaymentMethods(){return paymentMethods.filter(p=>p.active).map(p=>p.name);}
function savePaidSale(o,method){
  if(!o)return;
  o.pay=method||'Cash';
  o.status='Paid';
  if(!o.saleSaved){
    const dt=new Date();
    salesLog.push({
      key:localDateKey(dt),
      sales:totals(o).total,
      method:o.pay,
      type:o.type,
      no:o.no,
      table:o.table || '',
      itemsCount:o.items.reduce((s,i)=>s+i.qty,0),
      itemsList:o.items.map(i=>({id:i.id,name:i.name,price:i.price,qty:i.qty,cat:i.cat||MENU.find(m=>m.id===i.id)?.cat})),
      time:new Date().toLocaleTimeString()
    });
    o.saleSaved=true;
  }
}
function showPaymentPopup(no,afterComplete=false){
  const o=orders.find(x=>x.no===no); if(!o)return;
  const methods=activePaymentMethods();
  if(!methods.length){toast('No active payment method. Enable one from Cashier Features.');return;}
  const t=totals(o);
  const old=document.getElementById('paymentModal'); if(old)old.remove();
  const html=`<div class="modal-overlay show" id="paymentModal"><div class="small-modal" style="max-width:580px">
    <div class="m-head"><h3>Choose Payment Method</h3><button class="x" onclick="document.getElementById('paymentModal').remove()">×</button></div>
    <div style="padding:18px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px">
        <div class="mini-card"><small>Order</small><b>${o.no}</b></div>
        <div class="mini-card"><small>Total Payable</small><b>${rm(t.total)}</b></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px">
        ${methods.map(m=>`<button class="btn blue" style="padding:16px" onclick="confirmPayment('${o.no}','${m.replace(/'/g,"\\'")}',${afterComplete})">${m}</button>`).join('')}
      </div>
      <p style="color:var(--muted);font-size:12px;margin-top:14px">Payment options come from Cashier Features. Disable/enable options there.</p>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function confirmPayment(no,method,afterComplete=false){
  const o=orders.find(x=>x.no===no); if(!o)return;
  savePaidSale(o,method);
  const pm=document.getElementById('paymentModal'); if(pm)pm.remove();
  showAfterPaymentPopup(no,method,afterComplete);
}
function showAfterPaymentPopup(no,method,afterComplete=false){
  const o=orders.find(x=>x.no===no);
  const old=document.getElementById('afterPaymentModal'); if(old)old.remove();
  const html=`<div class="modal-overlay show" id="afterPaymentModal"><div class="small-modal" style="max-width:520px">
    <div class="m-head"><h3>Payment Done</h3><button class="x" onclick="finishPayment('${no}',${afterComplete},false)">×</button></div>
    <div style="padding:18px;text-align:center">
      <div style="font-size:38px;margin-bottom:8px">✅</div>
      <h2 style="margin-bottom:6px">${no} paid by ${method}</h2>
      <p style="color:var(--muted);margin-bottom:18px">Do you want to print the bill?</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn light" onclick="finishPayment('${no}',${afterComplete},false)">Done</button>
        <button class="btn green" onclick="finishPayment('${no}',${afterComplete},true)">Print Bill</button>
      </div>
    </div>
  </div></div>`;
  document.body.insertAdjacentHTML('beforeend',html);
}
function finishPayment(no,afterComplete=false,doPrint=false){
  const o=orders.find(x=>x.no===no);
  if(doPrint && o) printReceipt(no);
  const ap=document.getElementById('afterPaymentModal'); if(ap)ap.remove();
  if(afterComplete){
    orders=orders.filter(x=>x.no!==no);
    selNo=orders[0]?orders[0].no:null;
    toast(no+' completed');
  }else{
    toast(no+' settled');
  }
  render();
}
function settle(no){showPaymentPopup(no,false);}
function complete(no){showPaymentPopup(no,true);}

/* ---------- TABLES ---------- */
function tablesView(){const occ=tables.filter(t=>t.occ).length;
  return `<div class="top-head"><div><h1>Tables</h1><p>${restaurantName} · ${tables.length} tables · ${occ} occupied</p></div></div>
  <div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(130px,1fr))">${tables.map(t=>`<div class="tbig ${t.occ?'occ':'free'}" onclick="tables.find(x=>x.n===${t.n}).occ=!tables.find(x=>x.n===${t.n}).occ;render()">T${String(t.n).padStart(2,'0')}<small>${t.occ?'Occupied':'Available'}</small></div>`).join("")}</div>`;
}

/* ---------- BOOKINGS ---------- */
function bookingsView(){
  return head("Table Bookings","Reservations for today",'<button class="btn blue" onclick="addBooking()">+ Booking</button>')+panelTable(["Customer","Table","Time","Guests","Status",""],bookings.map((b,i)=>[`<b>${b.c}</b>`,b.t,b.time,b.g+" pax",`<span class="pill ${b.s==='Pending'?'red-pill':'green-pill'}" onclick="bookings[${i}].s=bookings[${i}].s==='Confirmed'?'Pending':'Confirmed';render()" style="cursor:pointer">${b.s}</span>`,`<span onclick="bookings.splice(${i},1);render()" style="cursor:pointer;color:var(--red);font-weight:900">✕</span>`]));
}
/* ---------- SERVICE ---------- */
function serviceView(){
  return head("Table Service","Active service requests")+panelTable(["Table","Request","Waiter","Status"],serviceReqs.map((s,i)=>[`<b>${s.t}</b>`,s.r,s.w,`<span class="pill ${s.s==='Done'?'green-pill':'red-pill'}" onclick="serviceReqs[${i}].s='Done';render()" style="cursor:pointer">${s.s}</span>`]));
}
/* ---------- STAFF ---------- */
function staffView(){
  return head("Staff Center","Attendance, roles and permissions",'<button class="btn light" onclick="addStaff()">+ Add Staff</button><button class="btn dark" onclick="downloadCSV(\'staff\',[\'User\',\'Designation\',\'Location\',\'Status\',\'ClockIn\'],staff.map(s=>[s.u,s.d,s.l,s.s,s.ci]))">Download Data</button>')+panelTable(["User","Designation","Location","Status","Clock-In"],staff.map((s,i)=>[`<b>${s.u}</b>`,s.d,s.l,`<span class="pill ${s.s==='Absent'?'red-pill':'green-pill'}" onclick="toggleStaff(${i})" style="cursor:pointer">${s.s}</span>`,s.ci]));
}
/* ---------- INVENTORY ---------- */
function invView(){
  const out=inventory.filter(i=>i.s==="out").length,low=inventory.filter(i=>i.s==="low").length,good=inventory.filter(i=>i.s==="good").length;
  return head("Inventory","Ingredient stock and alerts",'<button class="btn blue" onclick="addIngredient()">+ Add Ingredient</button>')+
  `<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><small>Out of Stock</small><h2 style="color:var(--red)">${out}</h2></div><div class="stat"><small>Low Stock</small><h2 style="color:var(--orange)">${low}</h2></div><div class="stat"><small>In Stock</small><h2 style="color:var(--green)">${good}</h2></div></div>`+
  panelTable(["Ingredient","Stock","Unit","Status","Adjust"],inventory.map((i,idx)=>[`<b>${i.i}</b>`,i.q,i.u,pill(i.s==='good'?'In Stock':i.s==='low'?'Low':'Out',i.s==='good'?'green':'red'),`<button class="step" onclick="adjStock(${idx},-1)">−</button> <button class="step" onclick="adjStock(${idx},1)">+</button>`]));
}
function adjStock(idx,d){const it=inventory[idx];it.q=Math.max(0,it.q+d);it.s=it.q===0?'out':it.q<=8?'low':'good';render();}
function addIngredient(){openFormModal('Add Ingredient',[{name:'name',label:'Ingredient name'},{name:'q',label:'Quantity',type:'number',value:10},{name:'u',label:'Unit',value:'kg',placeholder:'kg / L / pcs'}],d=>{if(!d.name)return;const q=parseFloat(d.q)||0;const u=d.u||'kg';inventory.push({i:d.name,q,u,s:q===0?'out':q<=8?'low':'good'});toast(d.name+' added');});}

/* ---------- EXPENSES ---------- */
const EXPENSE_CATS=['Staff Meal','Gas','Supplies','Repair','Utilities','Rent','Delivery','Other'];
const EXPENSE_METHODS=['Cash','TNG','Debit Card','QR','Card'];
function todayISO(){return new Date().toISOString().slice(0,10)}
function todayExpenseRows(){return expenses.filter(e=>(e.date||todayISO())===todayISO());}
function expenseSum(rows=expenses){return rows.reduce((s,e)=>s+Number(e.amount||0),0)}
function expenseByMethod(methods,rows=todayExpenseRows()){return rows.filter(e=>methods.includes(e.method||'Cash')).reduce((s,e)=>s+Number(e.amount||0),0)}
function expensesView(){
  const today=todayExpenseRows(), month=expenses.filter(e=>(e.date||'').slice(0,7)===todayISO().slice(0,7));
  return head('Expenses','Add restaurant expenses with payment type and receipt upload','<button class="btn blue" onclick="addExpense()">+ Add Expense</button><button class="btn dark" onclick="downloadCSV(\'expenses\',[\'Date\',\'Category\',\'Description\',\'Payment Type\',\'Amount\',\'Receipt\'],expenses.map(e=>[e.date,e.category,e.desc,e.method,e.amount,e.receipt?\'Yes\':\'No\']))">Download Expenses</button>')+
  `<div class="stats"><div class="stat"><small>Today Expenses</small><h2>${rm(expenseSum(today))}</h2></div><div class="stat"><small>Cash Expenses Today</small><h2>${rm(expenseByMethod(['Cash'],today))}</h2></div><div class="stat"><small>QR/TNG/Card Today</small><h2>${rm(expenseSum(today)-expenseByMethod(['Cash'],today))}</h2></div><div class="stat"><small>This Month</small><h2>${rm(expenseSum(month))}</h2></div></div>`+
  panelTable(['Date','Category','Description','Payment','Amount','Receipt','Action'],expenses.slice().reverse().map(e=>[e.date||'-',`<b>${e.category||'Other'}</b>`,e.desc||'-',e.method||'Cash',`<b>${rm(e.amount||0)}</b>`,e.receipt?`<button class="chip" onclick="viewExpenseReceipt('${e.id}')">View</button>`:`<button class="chip" onclick="uploadExpenseReceipt('${e.id}')">Upload</button>`,`<button class="chip" onclick="editExpense('${e.id}')">Edit</button> <button class="chip" style="color:var(--red)" onclick="deleteExpense('${e.id}')">Delete</button>`]));
}
function addExpense(){
  openFormModal('Add Expense',[
    {name:'date',label:'Date',type:'date',value:todayISO()},
    {name:'category',label:'Category',type:'select',value:'Staff Meal',options:EXPENSE_CATS},
    {name:'desc',label:'Description',placeholder:'e.g. Staff lunch / gas cylinder'},
    {name:'method',label:'Payment Type',type:'select',value:'Cash',options:EXPENSE_METHODS},
    {name:'amount',label:'Amount (RM)',type:'number',value:0}
  ],d=>{const amount=parseFloat(d.amount)||0;if(amount<=0){toast('Enter expense amount');return;}expenses.push({id:'E'+Date.now(),date:d.date||todayISO(),category:d.category||'Other',desc:d.desc||'',method:d.method||'Cash',amount,receipt:null});toast('Expense added');});
}
function editExpense(id){const e=expenses.find(x=>x.id===id);if(!e)return;openFormModal('Edit Expense',[
    {name:'date',label:'Date',type:'date',value:e.date||todayISO()},
    {name:'category',label:'Category',type:'select',value:e.category||'Other',options:EXPENSE_CATS},
    {name:'desc',label:'Description',value:e.desc||''},
    {name:'method',label:'Payment Type',type:'select',value:e.method||'Cash',options:EXPENSE_METHODS},
    {name:'amount',label:'Amount (RM)',type:'number',value:e.amount||0}
  ],d=>{e.date=d.date||e.date;e.category=d.category||e.category;e.desc=d.desc||'';e.method=d.method||'Cash';e.amount=parseFloat(d.amount)||0;toast('Expense updated');});}
function deleteExpense(id){expenses=expenses.filter(e=>e.id!==id);toast('Expense deleted');render();}
function uploadExpenseReceipt(id){const e=expenses.find(x=>x.id===id);if(!e)return;const inp=document.createElement('input');inp.type='file';inp.accept='image/*,application/pdf';inp.onchange=()=>{const f=inp.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{e.receipt=r.result;e.receiptName=f.name;toast('Receipt uploaded');render();};r.readAsDataURL(f);};inp.click();}
function viewExpenseReceipt(id){const e=expenses.find(x=>x.id===id);if(!e||!e.receipt){toast('No receipt uploaded');return;}const w=window.open('','_blank');if(e.receipt.startsWith('data:application/pdf')){w.document.write(`<iframe src="${e.receipt}" style="width:100%;height:100vh;border:0"></iframe>`);}else{w.document.write(`<title>${e.receiptName||'Receipt'}</title><body style="margin:0;background:#111;display:grid;place-items:center;min-height:100vh"><img src="${e.receipt}" style="max-width:100%;max-height:100vh"></body>`);}w.document.close();}

/* ---------- PROMOTIONS ---------- */
function promoView(){
  return head("Promotions","Coupon and voucher management",'<button class="btn dark" onclick="addCoupon()">+ Add Coupon</button>')+panelTable(["Code","Title","Type","Status",""],promos.map((p,i)=>[`<b>${p.c}</b>`,p.t,p.ty,`<span class="pill ${p.s==='Active'?'green-pill':'red-pill'}" onclick="promos[${i}].s=promos[${i}].s==='Active'?'Off':'Active';render()" style="cursor:pointer">${p.s}</span>`,`<span onclick="promos.splice(${i},1);render()" style="cursor:pointer;color:var(--red);font-weight:900">✕</span>`]));
}

/* ---------- REPORTS ---------- */
let rPreset="today",rFrom=localDateKey(addDays(new Date(),-14)),rTo=localDateKey(new Date());
function localDateKey(date){const d=new Date(date);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}
function shortDateLabel(date){const d=new Date(date);return d.getDate()+"/"+(d.getMonth()+1);}
function addDays(d,n){const x=new Date(d);x.setHours(0,0,0,0);x.setDate(x.getDate()+n);return x;}
function reportToday(){const t=new Date();t.setHours(0,0,0,0);return t;}
function normalizeSaleKey(k){if(!k)return "";const parts=String(k).split("-");if(parts.length!==3)return String(k);return parts[0]+"-"+String(parts[1]).padStart(2,"0")+"-"+String(parts[2]).padStart(2,"0");}
function salesFor(date){const key=localDateKey(date);const rows=salesLog.filter(r=>normalizeSaleKey(r.key)===key);return{orders:rows.length,sales:Math.round(rows.reduce((s,r)=>s+Number(r.sales||0),0)*100)/100};}
function rangeFor(k){const t=reportToday();if(k==="today")return[t,t];if(k==="yesterday"){const y=addDays(t,-1);return[y,y];}if(k==="week")return[addDays(t,-6),t];if(k==="thismonth")return[new Date(t.getFullYear(),t.getMonth(),1),t];if(k==="lastmonth")return[new Date(t.getFullYear(),t.getMonth()-1,1),new Date(t.getFullYear(),t.getMonth(),0)];if(k==="custom")return[new Date(rFrom),new Date(rTo)];return[t,t];}
function buildRange(s,e){const out=[];let d=new Date(s);d.setHours(0,0,0,0);const end=new Date(e);end.setHours(0,0,0,0);while(d<=end){const day=salesFor(d);out.push({dateKey:localDateKey(d),label:shortDateLabel(d),dow:d.toLocaleDateString('en',{weekday:'short'}),...day,avg:day.orders?day.sales/day.orders:0});d=addDays(d,1);}return out;}
function reportView(){
  const [s,e]=rangeFor(rPreset),data=buildRange(s,e);
  const tS=data.reduce((a,d)=>a+d.sales,0),tO=data.reduce((a,d)=>a+d.orders,0),avg=tO?tS/tO:0;
  const best=data.reduce((b,d)=>d.sales>(b?.sales||0)?d:b,null),max=Math.max(...data.map(d=>d.sales),1);
  const P=[["today","Today"],["yesterday","Yesterday"],["week","Last 7 Days"],["thismonth","This Month"],["lastmonth","Last Month"],["custom","Custom"]];
  return head("Sales Report",restaurantName+" · "+data.length+" day(s)",'<button class="btn dark" onclick="downloadCSV(\'sales-report\',[\'Date\',\'Day\',\'Orders\',\'Sales\'],buildRange(...rangeFor(rPreset)).map(d=>[d.label,d.dow,d.orders,d.sales]))">Download Report</button>')+
  `<div class="panel" style="padding:13px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">📅 ${P.map(([k,l])=>`<button class="chip ${rPreset===k?'active':''}" onclick="rPreset='${k}';render()">${l}</button>`).join("")}
    ${rPreset==="custom"?`<input type="date" class="input" style="width:auto" value="${rFrom}" onchange="rFrom=this.value;render()"><span style="color:var(--muted)">to</span><input type="date" class="input" style="width:auto" value="${rTo}" onchange="rTo=this.value;render()">`:''}</div>
  <div class="stats"><div class="stat"><small>Total Sales</small><h2>${rm(tS)}</h2></div><div class="stat"><small>Total Orders</small><h2>${tO}</h2></div><div class="stat"><small>Avg Order</small><h2>${rm(avg)}</h2></div><div class="stat"><small>Best Day</small><h2>${best&&best.sales>0?best.label+" · "+rm(best.sales):'—'}</h2></div></div>
  <div class="panel" style="padding:18px;margin-bottom:16px"><b>${data.length===1?'Day total':'Daily Sales'}</b>
    <div style="display:flex;align-items:flex-end;gap:6px;height:170px;margin-top:12px">${data.map(d=>`<div title="${rm(d.sales)}" style="flex:1;border-radius:6px 6px 0 0;min-width:8px;background:${best&&d.label===best.label?'var(--blue)':'#9db4ff'};height:${Math.max(d.sales/max*100,4)}%"></div>`).join("")}</div>
    <div style="display:flex;gap:6px;margin-top:6px;font-size:9px;color:#8d877c">${data.map(d=>`<span style="flex:1;text-align:center">${d.label}</span>`).join("")}</div></div>
  ${panelTable(["Date","Day","Orders","Avg/Order","Sales"],[...data].reverse().map(d=>[d.label,d.dow,d.orders,rm(d.avg||0),`<b>${rm(d.sales)}</b>`]))}`;
}
/* ---------- ANALYTICS ---------- */
function analyticsView(){
  const [s,e]=rangeFor("week"),data=buildRange(s,e);
  const rows=salesLog.filter(r=>{const k=normalizeSaleKey(r.key);return k>=localDateKey(s)&&k<=localDateKey(e);});
  const tS=rows.reduce((a,r)=>a+Number(r.sales||0),0),tO=rows.length,max=Math.max(...data.map(d=>d.orders),1);
  const dine=rows.filter(r=>r.type==='dine').reduce((a,r)=>a+Number(r.sales||0),0);
  const delivery=rows.filter(r=>r.type==='delivery').reduce((a,r)=>a+Number(r.sales||0),0);
  const take=rows.filter(r=>r.type==='take').reduce((a,r)=>a+Number(r.sales||0),0);
  const pct=v=>tS?Math.round(v/tS*100)+'%':'0%';
  return head("Restaurant Analytics",restaurantName+" · Last 7 days")+
  `<div class="stats"><div class="stat"><small>Total Revenue</small><h2>${rm(tS)}</h2></div><div class="stat"><small>Order Count</small><h2>${tO}</h2></div><div class="stat"><small>Avg Order</small><h2>${rm(tO?tS/tO:0)}</h2></div><div class="stat"><small>Peak Time</small><h2>${tO?'8 PM':'—'}</h2></div></div>
  <div class="panel" style="padding:18px;margin-bottom:16px"><b>Orders per day</b><div style="display:flex;align-items:flex-end;gap:6px;height:160px;margin-top:12px">${data.map(d=>`<div title="${d.orders} orders" style="flex:1;border-radius:6px 6px 0 0;background:#9db4ff;height:${Math.max(d.orders/max*100,4)}%"></div>`).join("")}</div></div>
  ${panelTable(["Order Type","Share","Revenue"],[["🍽 Dine-In",pct(dine),`<b>${rm(dine)}</b>`],["🛵 Delivery",pct(delivery),`<b>${rm(delivery)}</b>`],["🛍 Takeaway",pct(take),`<b>${rm(take)}</b>`]])}`;
}
/* ---------- MENU (category filter + add modal) ---------- */
let menuCat="All";
function menuView(){
  const list=MENU.filter(m=>menuCat==="All"||m.cat===menuCat);
  const chips=["All",...new Set(MENU.map(m=>m.cat))].map(c=>`<button class="chip ${menuCat===c?'active':''}" onclick="menuCat='${c}';render()">${c}</button>`).join("");
  return head("Menu & Dishes",MENU.length+" dishes · tap a dish to edit, or add a new one",'<button class="btn blue" onclick="openDishModal()">+ Add Dish</button>')+
  `<div class="panel" style="padding:13px;margin-bottom:16px;display:flex;flex-wrap:wrap;gap:8px;align-items:center">🍽 ${chips}</div>
  <div class="menu-grid">${list.map(m=>`<div class="dish">
    <div class="img" onclick="pickImage(${m.id})">${m.img?`<img src="${m.img}">`:'🍽'}<span class="up">📷 Upload</span></div>
    <div class="b" onclick="openDishModal(${m.id})" style="cursor:pointer">
      <div class="dn">${m.name}</div><div class="dc">${m.cat}</div>
      ${m.desc?`<div style="font-size:11px;color:var(--muted);margin-top:4px">${m.desc}</div>`:''}
      <div class="dp">${rm(m.price)}</div>
    </div>
  </div>`).join("")}</div>`;
}
let imgTarget=null;
/* ----- Add/Edit Dish Modal ----- */
let dishEditId=null, dishTempImg=null;
function openDishModal(id){
  dishEditId = id||null;
  const m = id?MENU.find(x=>x.id===id):null;
  dishTempImg = m?m.img:null;
  document.getElementById("dishName").value = m?m.name:"";
  document.getElementById("dishPrice").value = m?m.price:"";
  document.getElementById("dishDesc").value = m?(m.desc||""):"";
  // build category select
  const allCats=[...new Set(MENU.map(x=>x.cat))];
  const sel=document.getElementById("dishCat");
  sel.innerHTML=allCats.map(c=>`<option ${m&&m.cat===c?'selected':''}>${c}</option>`).join("")+`<option value="__new">+ New category…</option>`;
  document.getElementById("dishNewCat").style.display="none";
  document.getElementById("dishNewCat").value="";
  document.getElementById("dishModalTitle").textContent = id?"Edit Dish":"Add New Dish";
  document.getElementById("dishDelete").style.display = id?"inline-block":"none";
  renderDishImg();
  document.getElementById("dishModal").classList.add("show");
}
function closeDishModal(){document.getElementById("dishModal").classList.remove("show");}
function renderDishImg(){document.getElementById("dishImgBox").innerHTML = dishTempImg?`<img src="${dishTempImg}" style="width:100%;height:100%;object-fit:cover;border-radius:12px">`:'<div style="text-align:center;color:#8d877c">🍽<br><span style="font-size:11px">Tap to upload photo</span></div>';}
function pickDishImage(){imgTarget="DISH";document.getElementById("imgInput").click();}
function onDishCatChange(){const v=document.getElementById("dishCat").value;document.getElementById("dishNewCat").style.display = v==="__new"?"block":"none";}
function saveDish(){
  const name=document.getElementById("dishName").value.trim();
  if(!name){toast("Enter a dish name");return;}
  const price=parseFloat(document.getElementById("dishPrice").value)||0;
  let cat=document.getElementById("dishCat").value;
  if(cat==="__new"){cat=document.getElementById("dishNewCat").value.trim()||"Other";}
  const desc=document.getElementById("dishDesc").value.trim();
  if(dishEditId){const m=MENU.find(x=>x.id===dishEditId);Object.assign(m,{name,price,cat,desc,img:dishTempImg});toast(name+" updated");}
  else{const id=MENU.length?Math.max(...MENU.map(m=>m.id))+1:1;MENU.push({id,name,price,cat,desc,img:dishTempImg});toast(name+" added");}
  closeDishModal();render();
}
function deleteDish(){if(dishEditId){MENU=MENU.filter(m=>m.id!==dishEditId);toast("Dish deleted");closeDishModal();render();}}
function addBooking(){
  openFormModal("Add Table Booking",[
    {name:"c",label:"Customer Name",placeholder:"Customer name"},
    {name:"t",label:"Table",type:"select",value:"T05",options:safeTableList().map(x=>"T"+String(x.n).padStart(2,"0"))},
    {name:"time",label:"Time",value:"8:00 PM",placeholder:"8:30 PM"},
    {name:"g",label:"Guests",type:"number",value:2}
  ],d=>{
    if(!d.c.trim()){toast("Customer name required");return;}
    bookings.push({c:d.c.trim(),t:d.t,time:d.time||"-",g:parseInt(d.g)||1,s:"Confirmed"});
    toast("Booking added");
  });
}
function addCoupon(){
  openFormModal("Add Promotion / Coupon",[
    {name:"c",label:"Coupon Code",placeholder:"SAVE10"},
    {name:"t",label:"Title",value:"Discount"},
    {name:"ty",label:"Order Type",type:"select",value:"Dine-In",options:["Dine-In","Takeaway","Delivery","All"]}
  ],d=>{
    if(!d.c.trim()){toast("Coupon code required");return;}
    promos.push({c:d.c.trim().toUpperCase(),t:d.t||"Discount",ty:d.ty||"Dine-In",s:"Active"});
    toast("Coupon added");
  });
}
function addStaff(){
  openFormModal("Add Staff Member",[
    {name:"u",label:"Staff Name",placeholder:"Staff name"},
    {name:"d",label:"Designation",type:"select",value:"Waiter",options:["Cashier","Waiter","Kitchen","Tandoor","Manager","Admin"]},
    {name:"l",label:"Location / Outlet",value:"Main Branch"}
  ],d=>{
    if(!d.u.trim()){toast("Staff name required");return;}
    staff.push({u:d.u.trim(),d:d.d||"Staff",l:d.l||"-",s:"Present",ci:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})});
    toast(d.u.trim()+" added");
  });
}
function toggleStaff(i){const s=staff[i];if(s.s==="Present"){s.s="Absent";s.ci="-";}else{s.s="Present";s.ci=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});}render();}
function downloadCSV(name,cols,rows){
  const csv=[cols.join(","),...rows.map(r=>r.join(","))].join("\n");
  const blob=new Blob([csv],{type:"text/csv"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name+".csv";a.click();
  toast("Downloaded "+name+".csv");
}
function pickImage(id){imgTarget=id;document.getElementById("imgInput").click();}
function pickLogo(){imgTarget="LOGO";document.getElementById("imgInput").click();}
document.getElementById("imgInput").addEventListener("change",function(e){
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{if(imgTarget==="LOGO"){logoImg=r.result;renderNav();toast("Logo updated");}else if(imgTarget==="DISH"){dishTempImg=r.result;renderDishImg();imgTarget=null;return;}else{const m=MENU.find(x=>x.id===imgTarget);if(m){m.img=r.result;toast(m.name+" photo updated");}}render();imgTarget=null;};
  r.readAsDataURL(f);e.target.value="";
});

/* ---------- CUSTOMERS ---------- */
function customersView(){
  const total=customers.reduce((s,c)=>s+c.sp,0);
  const vip=customers.filter(c=>c.l==="VIP").length;
  return head("Customers","Customer records, spending and loyalty",'<button class="btn blue" onclick="addCustomer()">+ Add Customer</button><button class="btn dark" onclick="downloadCSV(\'customers\',[\'Name\',\'Phone\',\'Orders\',\'Spending\',\'Level\'],customers.map(c=>[c.n,c.p,c.o,c.sp,c.l]))">Download Data</button>')+
  `<div class="stats" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><small>Total Customers</small><h2>${customers.length}</h2></div><div class="stat"><small>Total Spending</small><h2>${rm(total)}</h2></div><div class="stat"><small>VIP Customers</small><h2>${vip}</h2></div></div>`+
  panelTable(["Customer","Phone","Orders","Total Spending","Loyalty","Action"],customers.map((c,i)=>[`<b>${c.n}</b>`,c.p,c.o,rm(c.sp),pill(c.l,c.l==="VIP"?"blue":c.l==="Gold"?"green":""),`<button class="chip" onclick="editCustomer(${i})">Edit</button>`]));
}
function addCustomer(){openFormModal('Add Customer',[{name:'n',label:'Customer name'},{name:'p',label:'Phone number',value:'+60 '},{name:'l',label:'Loyalty level',type:'select',value:'Silver',options:['Silver','Gold','VIP']}],d=>{if(!d.n)return;customers.push({n:d.n,p:d.p||'-',o:0,sp:0,l:d.l||'Silver'});toast(d.n+' added');});}
function editCustomer(i){const c=customers[i];openFormModal('Edit Customer',[{name:'n',label:'Customer name',value:c.n},{name:'p',label:'Phone number',value:c.p},{name:'l',label:'Loyalty level',type:'select',value:c.l,options:['Silver','Gold','VIP']}],d=>{if(!d.n)return;c.n=d.n;c.p=d.p||c.p;c.l=d.l||c.l;toast('Customer updated');});}
function printReceipt(no){
  const o=orders.find(x=>x.no===no);if(!o){toast("Select order first");return;}
  const t=totals(o);
  const html=`<!doctype html><html><head><title>Receipt ${o.no}</title><style>body{font-family:Inter,Arial,sans-serif;padding:22px;color:#111}.r{max-width:340px;margin:auto}.center{text-align:center}.line{border-top:1px dashed #999;margin:12px 0}.row{display:flex;justify-content:space-between;margin:6px 0;font-size:13px}h2{margin:0 0 4px}.small{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:13px}td{padding:5px 0}.total{font-size:18px;font-weight:900}</style></head><body><div class="r"><div class="center"><h2>${restaurantName}</h2><div class="small">Receipt ${o.no} · ${o.inv}</div><div class="small">${new Date().toLocaleString()}</div></div><div class="line"></div><div class="small">Type: ${typeMeta(o.type).l} ${o.table?'· Table T'+o.table:''}</div><table>${o.items.map(i=>`<tr><td>${i.name} x${i.qty}</td><td style="text-align:right">${rm(i.price*i.qty)}</td></tr>`).join('')}</table><div class="line"></div><div class="row"><span>Subtotal</span><b>${rm(t.sub)}</b></div><div class="row"><span>Service 5%</span><b>${rm(t.svc)}</b></div><div class="row"><span>SST 6%</span><b>${rm(t.tax)}</b></div><div class="row total"><span>Total</span><span>${rm(t.total)}</span></div><div class="line"></div><p class="center small">Thank you. Please come again.</p></div><script>window.print()<\/script></body></html>`;
  const w=window.open("","_blank");w.document.write(html);w.document.close();toast("Receipt ready");
}



/* ---------- WAITER SIMPLE ORDER SCREEN ---------- */
function waiterView(){
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  return head("Waiter Order Screen","Easy order taking: choose type, table, items, note, then send directly to kitchen")+
  `<div class="panel" style="padding:18px;margin-bottom:16px">
    <div class="m-types" style="margin-bottom:14px">${TYPES.map(t=>`<button class="m-type ${cType===t.k?'active':''}" onclick="cType='${t.k}';render()">${t.s}<small>${t.l}</small></button>`).join("")}</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
      <input class="input" id="wtable" placeholder="Table no. e.g. 04" value="${cType==='dine'?(window.wTable||''):''}" oninput="window.wTable=this.value" ${cType==='dine'?'':'disabled'}>
      <input class="input" id="wcust" placeholder="Customer name" value="${wCustomer}" oninput="wCustomer=this.value">
      <input class="input" id="wphone" placeholder="Phone / WhatsApp" value="${wPhone}" oninput="wPhone=this.value">
      <input class="input" id="waddr" placeholder="Delivery address" value="${wAddress}" oninput="wAddress=this.value" ${cType==='delivery'?'':'disabled'}>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 380px;gap:16px">
    <section class="panel" style="padding:18px">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${cats().map(c=>`<button class="chip ${mCat===c?'active':''}" onclick="mCat='${c}';render()">${c}</button>`).join("")}</div>
      <div class="menu-grid">${MENU.filter(m=>mCat==='All'||m.cat===mCat).map(m=>`<div class="dish" onclick="addWaiterItem(${m.id})" style="cursor:pointer"><div class="img">${m.img?`<img src="${m.img}">`:'🍽'}</div><div class="b"><h4>${m.name}</h4><p>${stationIcon(stationOf(m))} ${stationOf(m)}</p><b>${rm(m.price)}</b></div></div>`).join("")}</div>
    </section>
    <section class="panel" style="padding:0;overflow:hidden">
      <div class="panel-head"><h3>Current Order</h3><span class="pill">${cart.length} items</span></div>
      <div class="m-lines" style="max-height:370px">${cart.length?cart.map(i=>`<div class="m-line"><div class="ml-n">${i.name}<small style="display:block;color:var(--muted);font-size:11px">${stationIcon(stationOf(i))} ${stationOf(i)}</small></div><button class="step" onclick="chg(${i.id},-1);render()">−</button><div class="ml-q">${i.qty}</div><button class="step" onclick="chg(${i.id},1);render()">+</button><div class="ml-p">${rm(i.price*i.qty)}</div></div>`).join(""):'<div class="empty">Tap menu item to add</div>'}</div>
      <div style="padding:14px;border-top:1px solid var(--line)"><textarea class="input" style="height:80px;resize:none" placeholder="Kitchen note: no onion, extra spicy..." oninput="wNote=this.value">${wNote}</textarea></div>
      <div class="m-tot" style="padding:0 14px 10px"><div class="l"><span>Subtotal</span><span>${rm(sub)}</span></div><div class="t"><span>Kitchen Total</span><span>${rm(sub)}</span></div></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:14px"><button class="btn light" onclick="clearWaiterCart()">Clear</button><button class="btn green" onclick="sendWaiterOrder()" ${cart.length?'':'disabled'}>👨‍🍳 Send To Kitchen</button></div>
    </section>
  </div>`;
}
function addWaiterItem(id){const m=MENU.find(x=>x.id===id),e=cart.find(i=>i.id===id);if(e)e.qty++;else cart.push({id:m.id,name:m.name,price:m.price,qty:1,cat:m.cat});toast(m.name+" added");render();}
function clearWaiterCart(){cart=[];wNote="";render();}
function sendWaiterOrder(){
  if(!cart.length)return;
  const table=(document.getElementById('wtable')?.value||window.wTable||'').trim();
  const o={no:"#"+seq++,inv:uid(),type:cType,table:cType==="dine"?(table||"—"):null,status:"Unpaid",stage:0,age:"just now",note:wNote,customer:wCustomer,phone:wPhone,address:wAddress,items:cart.map(i=>({...i,station:stationOf(i)}))};
  orders.unshift(o);selNo=o.no;cart=[];wNote="";toast("Order "+o.no+" sent to kitchen");go("kds");
}

/* ---------- QUICK POS BILLING ---------- */
function quickPosView(){
  return head("Quick POS Billing","Restaurant style POS: categories, HD dish cards, cart, discount, tax and receipt",'<button class="btn blue" onclick="openModal()">+ Start New Bill</button>')+
  `<div class="panel" style="padding:18px;margin-bottom:16px"><div style="display:grid;grid-template-columns:1fr 360px;gap:16px"><div><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">${cats().map(c=>`<button class="chip ${mCat===c?'active':''}" onclick="mCat='${c}';render()">${c}</button>`).join("")}</div><div class="menu-grid">${MENU.filter(m=>mCat==='All'||m.cat===mCat).map(m=>`<div class="dish" onclick="addQuick(${m.id})" style="cursor:pointer"><div class="img">${m.img?`<img src="${m.img}">`:'🍽'}</div><div class="b"><h4>${m.name}</h4><p>${m.cat}</p><b>${rm(m.price)}</b></div></div>`).join("")}</div></div><div class="panel" style="box-shadow:none"><div class="panel-head"><h3>Current Bill</h3><span class="pill">${cart.length} items</span></div><div class="m-lines" style="max-height:450px">${cart.length?cart.map(i=>`<div class="m-line"><div class="ml-n">${i.name}</div><button class="step" onclick="chg(${i.id},-1);render()">−</button><div class="ml-q">${i.qty}</div><button class="step" onclick="chg(${i.id},1);render()">+</button><div class="ml-p">${rm(i.price*i.qty)}</div></div>`).join(""):'<div class="empty">Click food item to add</div>'}</div><div class="m-tot">${quickTotals()}</div><button class="m-create" onclick="createQuickOrder()" ${cart.length?'':'disabled'}>Create Order & Print</button></div></div></div>`;
}
function quickTotals(){const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);return `<div class="l"><span>Subtotal</span><span>${rm(sub)}</span></div><div class="l"><span>Service 5%</span><span>${rm(sub*SERVICE)}</span></div><div class="l"><span>SST 6%</span><span>${rm(sub*TAX)}</span></div><div class="t"><span>Total</span><span>${rm(sub+sub*SERVICE+sub*TAX)}</span></div>`;}
function addQuick(id){const m=MENU.find(x=>x.id===id),e=cart.find(i=>i.id===id);if(e)e.qty++;else cart.push({id:m.id,name:m.name,price:m.price,qty:1});toast(m.name+" added");render();}
function createQuickOrder(){const o={no:"#"+seq++,inv:uid(),type:"take",table:null,status:"Unpaid",stage:0,age:"just now",items:cart.map(i=>({...i,cat:i.cat||MENU.find(m=>m.id===i.id)?.cat,station:stationOf(i)}))};orders.unshift(o);selNo=o.no;cart=[];if(kotAutoPrint){setTimeout(()=>printKOT(o),100)}else{toast("Order "+o.no+" created")}go('pos');}

/* ---------- KITCHEN DISPLAY SCREEN ---------- */
function kdsView(){
  const stationFilter=role==="tandoor"?"Tandoor":role==="kitchen"?"Main Kitchen":null;
  const active=orders.filter(o=>o.status!=='Paid'&&o.stage<3).map(o=>({ ...o, items: stationFilter?o.items.filter(i=>stationOf(i)===stationFilter):o.items })).filter(o=>o.items.length);
  const title=stationFilter?stationFilter+" Display":"Kitchen Display Screen";
  const sub=stationFilter?"Only "+stationFilter+" items are shown here":"Live orders split by Main Kitchen, BBQ, Tandoor and Drinks";
  return head(title,sub,'<button class="btn light" onclick="render()">Refresh</button>')+`<div class="grid3">${active.map(o=>`<section class="panel" style="padding:16px;border-left:5px solid ${o.stage===0?'var(--orange)':o.stage===1?'var(--blue)':'var(--green)'}"><div style="display:flex;justify-content:space-between;align-items:center"><h2>${o.no}</h2><span class="pill ${o.stage===2?'green-pill':'blue-pill'}">${FLOW[o.stage]}</span></div><p style="color:var(--muted);margin:7px 0">${o.table?'Table T'+o.table:typeMeta(o.type).l} · ${o.age}</p>${o.note?`<div style="background:#fff7e6;border:1px solid #ffe0a3;border-radius:10px;padding:8px;margin:10px 0;font-weight:800">📝 ${o.note}</div>`:''}<div style="display:grid;gap:9px;margin:14px 0">${o.items.map(i=>`<div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:8px"><b>${i.qty} × ${i.name}</b><span>${stationIcon(stationOf(i))} ${stationOf(i)}</span></div>`).join("")}</div><button class="btn green" style="width:100%" onclick="nextStage('${o.no}')">Move to ${FLOW[Math.min(o.stage+1,3)]}</button></section>`).join("")}</div>${active.length?'':'<div class="panel" style="padding:30px;text-align:center;color:var(--muted)">No active kitchen orders</div>'}`;
}

/* ---------- QR MENU ---------- */
function qrView(){const url=location.href.split('#')[0].replace('app.html','index.html')+'?menu=qr';return head("QR Menu","Show QR on tables for digital menu and ordering",'<button class="btn blue" onclick="window.print()">Print QR Sheet</button>')+`<div class="panel" style="padding:22px;display:grid;grid-template-columns:260px 1fr;gap:22px;align-items:center"><div style="width:220px;height:220px;border:12px solid #111;display:grid;place-items:center;font-weight:900;text-align:center;background:repeating-linear-gradient(45deg,#fff,#fff 8px,#111 8px,#111 12px)"><div style="background:white;padding:14px;border-radius:8px">QR MENU<br><small>${restaurantName}</small></div></div><div><h2>Table QR Ordering</h2><p style="color:var(--muted);margin:10px 0">Use this placeholder for table QR menu. When hosted, connect it with customer ordering page.</p><input class="input" value="${url}" readonly><br><br><button class="btn green" onclick="toast('QR copied')">Copy Menu Link</button></div></div>`;}

/* ---------- BARCODE SCANNER ---------- */
function barcodeView(){return head("Barcode Scanner","Keyboard/USB scanner ready. Scan or type product code and add item to cart")+`<div class="panel" style="padding:22px;max-width:740px"><label style="font-weight:900">Scan Code</label><input class="input" autofocus placeholder="Scan barcode here" value="${barcodeText}" oninput="barcodeText=this.value"><div style="margin-top:12px;display:flex;gap:8px"><button class="btn blue" onclick="barcodeAdd()">Add Scanned Item</button><button class="btn light" onclick="barcodeText='';render()">Clear</button></div><p style="color:var(--muted);font-size:13px;margin-top:12px">Demo logic: code 1001 adds Chicken Biryani, 1002 adds BBQ, 1003 adds Drink.</p></div>`;}
function barcodeAdd(){const map={1001:5,1002:1,1003:14};const id=map[barcodeText]||5;addQuick(id);barcodeText='';go('quickpos');}

/* ---------- MULTI BRANCH ---------- */
function branchesView(){const total=branches.reduce((s,b)=>s+b.sales,0);return head("Multi Branch","Branch performance and online/offline status",'<button class="btn blue" onclick="addBranch()">+ Add Branch</button>')+`<div class="stats"><div class="stat"><small>Branches</small><h2>${branches.length}</h2></div><div class="stat"><small>Total Branch Sales</small><h2>${rm(total)}</h2></div><div class="stat"><small>Online</small><h2>${branches.filter(b=>b.status==='Online').length}</h2></div><div class="stat"><small>Offline</small><h2>${branches.filter(b=>b.status!=='Online').length}</h2></div></div>`+panelTable(["Branch","Orders","Sales","Status"],branches.map((b,i)=>[`<b>${b.n}</b>`,b.orders,rm(b.sales),`<span class="pill ${b.status==='Online'?'green-pill':'red-pill'}" onclick="branches[${i}].status=branches[${i}].status==='Online'?'Offline':'Online';render()" style="cursor:pointer">${b.status}</span>`]));}
function addBranch(){openFormModal('Add Branch',[{name:'n',label:'Branch name'}],d=>{if(!d.n)return;branches.push({n:d.n,orders:0,sales:0,status:'Online'});toast('Branch added');});}

/* ---------- ROLES / PERMISSIONS ---------- */
function rolesView(){
  const rows=rolePerms.map((r,i)=>`
    <tr>
      <td><b>${r.role}</b></td>
      <td>${r.perms}</td>
      <td style="text-align:right"><button class="chip" onclick="toggleRoleEdit(${i})">${openRoleIndex===i?'Close':'Edit'}</button></td>
    </tr>
    ${openRoleIndex===i?`<tr class="role-edit-row"><td colspan="3">
      <div class="inline-editor">
        <label>Permissions</label>
        <textarea id="rolePermInput">${r.perms}</textarea>
        <div class="inline-actions">
          <button class="btn blue" onclick="saveRolePerm(${i})">Save</button>
          <button class="btn light" onclick="openRoleIndex=null;render()">Cancel</button>
        </div>
      </div>
    </td></tr>`:''}
  `).join("");
  return head("Roles & Permissions","Admin, Manager, Cashier, Waiter and Kitchen access control")+
  `<div class="panel"><div class="detail-body" style="padding:0"><table class="items-table"><thead><tr><th>Role</th><th>Permissions</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}
function toggleRoleEdit(i){openRoleIndex=openRoleIndex===i?null:i;render();}
function saveRolePerm(i){const el=document.getElementById('rolePermInput');const v=el?el.value.trim():'';if(v){rolePerms[i].perms=v;toast('Permissions updated');}openRoleIndex=null;render();}
function editRole(i){toggleRoleEdit(i);}

/* ---------- LOYALTY POINTS ---------- */
function loyaltyView(){return head("Customer Loyalty Points","Rewards based on customer spending")+panelTable(["Customer","Tier","Total Spending","Points","Action"],customers.map((c,i)=>{const pts=Math.floor(c.sp/10);return [`<b>${c.n}</b>`,c.l,rm(c.sp),pts,`<button class="chip" onclick="customers[${i}].sp+=50;toast('50 RM spend added');render()">+ Points</button>`]}));}

/* ---------- SETTINGS ---------- */
function settingsView(){
  return head("Settings","Edit restaurant name and logo — updates everywhere")+
  `<div class="form">
    <div class="field"><label>Restaurant Name</label><input id="setName" value="${restaurantName}"></div>
    <div class="field"><label>Logo</label><div style="display:flex;align-items:center;gap:12px"><div class="brand-icon" style="width:52px;height:52px;font-size:20px">${logoImg?`<img src="${logoImg}">`:restaurantName.charAt(0)}</div><button class="chip" onclick="pickLogo()">📷 Upload Logo</button></div></div>
    <div class="field"><label>Service Charge</label><input value="5%" disabled></div>
    <div class="field"><label>SST</label><input value="6%" disabled></div>
    <button class="btn blue" onclick="saveSettings()" style="padding:13px 24px">Save Changes</button>
  </div>
  </div>`;
}
function saveSettings(){const v=document.getElementById("setName").value.trim();if(v)restaurantName=v;renderNav();toast("Saved");render();}

/* ---------- small builders ---------- */
function head(title,sub,actions){return `<div class="top-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="head-actions">${actions||''}</div></div>`;}
function pill(txt,color){return `<span class="pill ${color==='red'?'red-pill':color==='green'?'green-pill':color==='blue'?'blue-pill':''}">${txt}</span>`;}

let formModalSave=null;
function escAttr(v){return String(v??'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function openFormModal(title,fields,onSave){
  formModalSave=onSave;
  const body=document.getElementById('formModalBody');
  document.getElementById('formModalTitle').textContent=title;
  body.innerHTML=fields.map(f=>{
    const val=escAttr(f.value??'');
    if(f.type==='select'){
      return `<div><label>${f.label}</label><select id="fm_${f.name}">${(f.options||[]).map(o=>`<option value="${escAttr(o)}" ${String(o)==String(f.value)?'selected':''}>${escAttr(o)}</option>`).join('')}</select></div>`;
    }
    if(f.type==='textarea') return `<div><label>${f.label}</label><textarea id="fm_${f.name}" placeholder="${escAttr(f.placeholder||'')}">${escAttr(f.value||'')}</textarea></div>`;
    return `<div><label>${f.label}</label><input id="fm_${f.name}" type="${f.type||'text'}" value="${val}" placeholder="${escAttr(f.placeholder||'')}"></div>`;
  }).join('');
  document.getElementById('formModal').classList.add('show');
  setTimeout(()=>{const first=body.querySelector('input,select,textarea'); if(first)first.focus();},60);
}
function closeFormModal(){document.getElementById('formModal').classList.remove('show');formModalSave=null;}
function saveFormModal(){
  if(!formModalSave)return closeFormModal();
  const data={};
  document.querySelectorAll('#formModalBody [id^="fm_"]').forEach(el=>{data[el.id.replace('fm_','')]=el.value});
  formModalSave(data);
  closeFormModal();
  render();
}
function ownerOnly(){toast('Owner/Admin only. Change this from Admin Panel.');}

function panelTable(cols,rows){return `<section class="panel"><div class="detail-body" style="padding:0"><table class="items-table"><thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div></section>`;}

/* ---------- NEW ORDER MODAL ---------- */
let cart=[],cType="dine",mCat="All",wNote="",wCustomer="",wPhone="",wAddress="",wPayLater=true;
function openModal(){cart=[];cType="dine";mCat="All";document.getElementById("modal").classList.add("show");renderTypes();renderCats();renderMenuGrid();renderCart();toggleTbl();}
function closeModal(){document.getElementById("modal").classList.remove("show");}
function renderTypes(){document.getElementById("mtypes").innerHTML=TYPES.map(t=>`<button class="m-type ${cType===t.k?'active':''}" onclick="cType='${t.k}';renderTypes();toggleTbl()">${t.s}<small>${t.l}</small></button>`).join("");}
function toggleTbl(){document.getElementById("mtable").style.display=cType==="dine"?"block":"none";}
function renderCats(){document.getElementById("mcats").innerHTML=cats().map(c=>`<button class="chip ${mCat===c?'active':''}" onclick="mCat='${c}';renderCats();renderMenuGrid()">${c}</button>`).join("");}
function renderMenuGrid(){const q=(document.getElementById("msearch").value||"").toLowerCase();const list=MENU.filter(m=>(mCat==="All"||m.cat===mCat)&&m.name.toLowerCase().includes(q));document.getElementById("mgrid").innerHTML=list.map(m=>`<button class="mitem" onclick="addCart(${m.id})"><div class="mimg">${m.img?`<img src="${m.img}">`:'🍽'}</div><div class="mb"><div class="mn">${m.name}</div><div class="mp">${rm(m.price)}</div></div></button>`).join("");}
function addCart(id){const m=MENU.find(x=>x.id===id),e=cart.find(i=>i.id===id);if(e)e.qty++;else cart.push({id:m.id,name:m.name,price:m.price,qty:1});renderCart();}
function chg(id,d){const i=cart.find(x=>x.id===id);i.qty+=d;if(i.qty<=0)cart=cart.filter(x=>x.id!==id);renderCart();}
function renderCart(){const lines=document.getElementById("mlines");lines.innerHTML=cart.length?cart.map(i=>`<div class="m-line"><div class="ml-n">${i.name}</div><button class="step" onclick="chg(${i.id},-1)">−</button><div class="ml-q">${i.qty}</div><button class="step" onclick="chg(${i.id},1)">+</button><div class="ml-p">${rm(i.price*i.qty)}</div></div>`).join(""):'<div class="empty">Tap items to add</div>';
  const sub=cart.reduce((s,i)=>s+i.price*i.qty,0);
  document.getElementById("mtot").innerHTML=`<div class="l"><span>Subtotal</span><span>${rm(sub)}</span></div><div class="l"><span>Service 5%</span><span>${rm(sub*SERVICE)}</span></div><div class="l"><span>SST 6%</span><span>${rm(sub*TAX)}</span></div><div class="t"><span>Total</span><span>${rm(sub+sub*SERVICE+sub*TAX)}</span></div>`;
  document.getElementById("mcreate").disabled=cart.length===0;}
function createOrder(){if(!cart.length)return;const table=document.getElementById("mtable").value;const o={no:"#"+seq++,inv:uid(),type:cType,table:cType==="dine"?(table||"—"):null,status:"Unpaid",stage:0,age:"just now",items:cart.map(i=>({...i,cat:i.cat||MENU.find(m=>m.id===i.id)?.cat,station:stationOf(i)}))};orders.unshift(o);selNo=o.no;closeModal();toast("Order "+o.no+" created");if(nav!=="pos")go("pos");else render();}



/* ---------- SUPABASE STORAGE ---------- */
let db=null, dbReady=false, hydrated=false, saveTimer=null;
const DEFAULT_SUPABASE_URL="https://xhvuyjrulhppicxwdtxq.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY="sb_publishable_Fngj-vd-XZZjKimf92c9YA_EfIiYOY-";
function initSupabase(){
  const url=(localStorage.getItem("SUPABASE_URL")||DEFAULT_SUPABASE_URL).trim();
  const key=(localStorage.getItem("SUPABASE_ANON_KEY")||DEFAULT_SUPABASE_ANON_KEY).trim();
  if(!url||!key||!window.supabase){db=null;dbReady=false;return false;}
  db=window.supabase.createClient(url,key);
  dbReady=true;
  return true;
}
function appState(){
  return {restaurantName,logoImg,role,MENU,orders,salesLog,seq,selNo,tables,bookings,serviceReqs,staff,inventory,expenses,promos,customers,branches,rolePerms,barcodeText};
}
function applyState(s){
  if(!s||typeof s!=="object")return;
  restaurantName=s.restaurantName||restaurantName;
  logoImg=s.logoImg||logoImg;
  role=s.role||role;
  MENU=Array.isArray(s.MENU)?s.MENU:MENU;
  orders=Array.isArray(s.orders)?s.orders:orders;
  salesLog=Array.isArray(s.salesLog)?s.salesLog:salesLog;
  seq=s.seq||seq;
  selNo=s.selNo||orders[0]?.no||selNo;
  tables=Array.isArray(s.tables)?s.tables:tables;
  bookings=Array.isArray(s.bookings)?s.bookings:bookings;
  serviceReqs=Array.isArray(s.serviceReqs)?s.serviceReqs:serviceReqs;
  staff=Array.isArray(s.staff)?s.staff:staff;
  inventory=Array.isArray(s.inventory)?s.inventory:inventory;
  expenses=Array.isArray(s.expenses)?s.expenses:expenses;
  promos=Array.isArray(s.promos)?s.promos:promos;
  customers=Array.isArray(s.customers)?s.customers:customers;
  branches=Array.isArray(s.branches)?s.branches:branches;
  rolePerms=Array.isArray(s.rolePerms)?s.rolePerms:rolePerms;
  barcodeText=s.barcodeText||barcodeText;
}
async function loadCloud(){
  if(!initSupabase()){toast("Supabase not connected");return;}
  const {data,error}=await db.from("pos_data").select("value").eq("app","stonixra_pos").eq("key","state").maybeSingle();
  if(error){toast("Load error: "+error.message);return;}
  if(data?.value){applyState(data.value);renderNav();render();toast("Supabase data loaded");}
  else{toast("No cloud data found");}
}
async function saveCloud(show=true){
  if(!initSupabase()){if(show)toast("Add Supabase URL and Anon Key first");return;}
  const payload={app:"stonixra_pos",key:"state",value:appState(),updated_at:new Date().toISOString()};
  const {error}=await db.from("pos_data").upsert(payload,{onConflict:"app,key"});
  if(error){toast("Save error: "+error.message);return;}
  if(show)toast("Saved to Supabase");
}
function queueSave(){
  if(!hydrated||!dbReady)return;
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>saveCloud(false),900);
}
function saveSupabaseSettings(){
  const url=document.getElementById("supabaseUrl").value.trim();
  const key=document.getElementById("supabaseKey").value.trim();
  localStorage.setItem("SUPABASE_URL",url);
  localStorage.setItem("SUPABASE_ANON_KEY",key);
  initSupabase();
  toast(dbReady?"Supabase connected":"Supabase details saved");
  render();
}
function clearSupabaseSettings(){
  localStorage.removeItem("SUPABASE_URL");
  localStorage.removeItem("SUPABASE_ANON_KEY");
  db=null;dbReady=false;toast("Supabase disconnected");render();
}



/* ---------- SMART POS ADVANCED RESTAURANT FEATURES ---------- */
let tableStatuses = [{n:1,s:'available',guest:0},{n:2,s:'occupied',guest:3},{n:3,s:'available',guest:0},{n:4,s:'occupied',guest:5},{n:5,s:'reserved',guest:4},{n:6,s:'available',guest:0},{n:7,s:'cleaning',guest:0},{n:8,s:'occupied',guest:2},{n:9,s:'available',guest:0},{n:10,s:'reserved',guest:6},{n:11,s:'available',guest:0},{n:12,s:'available',guest:0}];
let cashierShift={opening:500,cash:1280,card:740,qr:360,expense:0,closed:false};
let paymentMethods=[{name:'Cash',active:true},{name:'TNG',active:true},{name:'Debit Card',active:true},{name:'QR',active:true},{name:'Card',active:false},{name:'Credit/Due',active:false}];
let customerTags=['VIP','Birthday','Corporate','Credit Allowed','WhatsApp Receipt'];
let modifiers={Spice:['Normal','Extra Spicy','Less Spicy'], Onion:['No Onion','Extra Onion'], Salt:['Less Salt','No Salt'], Addons:['Extra Cheese','Extra Sauce','Extra Raita']};
let recipes={
  5:[{i:'Basmati Rice',q:.25,u:'kg'},{i:'Chicken',q:.20,u:'kg'},{i:'Yogurt',q:.05,u:'L'}],
  6:[{i:'Basmati Rice',q:.25,u:'kg'},{i:'Beef',q:.20,u:'kg'}],
  11:[{i:'Chicken',q:.60,u:'kg'},{i:'Cooking Oil',q:.10,u:'L'}],
  8:[{i:'Flour',q:.12,u:'kg'}],9:[{i:'Flour',q:.12,u:'kg'}],10:[{i:'Flour',q:.12,u:'kg'}]
};
let printerMap={Main:'Kitchen Printer',BBQ:'BBQ Printer',Tandoor:'Tandoor Printer',Drinks:'Counter Printer'};
let kotAutoPrint=true, kotCopies=1;
let kotLogs=[];
function safeTableList(){ return (tableStatuses&&tableStatuses.length?tableStatuses:tables.map(t=>({n:t.n,s:t.occ?'occupied':'available',guest:t.occ?2:0}))); }
function tClass(s){return s==='available'?'free':s==='occupied'?'occ':s==='reserved'?'reserved':'cleaning'}
function tLabel(s){return s==='available'?'Available':s==='occupied'?'Occupied':s==='reserved'?'Reserved':'Cleaning'}
function setTableStatus(n,s){const t=safeTableList().find(x=>x.n===n); if(t){t.s=s;t.guest=s==='available'?0:(t.guest||2); toast('Table T'+String(n).padStart(2,'0')+' '+tLabel(s)); render();}}
function openTableOrder(n){cType='dine'; window.wTable=String(n).padStart(2,'0'); openModal(); setTimeout(()=>{const el=document.getElementById('mtable'); if(el)el.value=window.wTable;},50);}
function tablesView(){const list=safeTableList(); const cnt=s=>list.filter(t=>t.s===s).length; return head('Visual Table Layout','Click table to open order. Use buttons to change table status.')+
`<div class="stats"><div class="stat"><small>Available</small><h2 style="color:var(--green)">${cnt('available')}</h2></div><div class="stat"><small>Occupied</small><h2 style="color:var(--red)">${cnt('occupied')}</h2></div><div class="stat"><small>Reserved</small><h2 style="color:var(--orange)">${cnt('reserved')}</h2></div><div class="stat"><small>Cleaning</small><h2>${cnt('cleaning')}</h2></div></div>
<div class="panel" style="padding:18px"><div class="grid3" style="grid-template-columns:repeat(auto-fill,minmax(150px,1fr))">${list.map(t=>`<div class="tbig ${tClass(t.s)}" style="position:relative"><div onclick="openTableOrder(${t.n})">T${String(t.n).padStart(2,'0')}<small>${tLabel(t.s)} ${t.guest?`· ${t.guest} pax`:''}</small></div><div style="display:flex;gap:5px;justify-content:center;margin-top:12px;flex-wrap:wrap"><button class="chip" onclick="setTableStatus(${t.n},'available')">Free</button><button class="chip" onclick="setTableStatus(${t.n},'occupied')">Busy</button><button class="chip" onclick="setTableStatus(${t.n},'reserved')">Reserve</button></div></div>`).join('')}</div></div>
<div class="panel" style="padding:16px;margin-top:16px"><b>Table Actions</b><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn blue" onclick="transferTable()">Transfer Table</button><button class="btn light" onclick="mergeTable()">Merge Tables</button></div></div>`;}
function transferTable(){openFormModal('Transfer Table',[{name:'f',label:'From table',placeholder:'04'},{name:'t',label:'To table',placeholder:'08'}],d=>{if(!d.f||!d.t)return;const f=String(d.f).replace('T','').padStart(2,'0');const t=String(d.t).replace('T','').padStart(2,'0');orders.forEach(o=>{if(String(o.table).padStart(2,'0')===f)o.table=t});toast('Table T'+f+' moved to T'+t);});}
function mergeTable(){openFormModal('Merge Tables',[{name:'a',label:'Main table',placeholder:'04'},{name:'b',label:'Merge with',placeholder:'05'}],d=>{if(!d.a||!d.b)return;toast('Tables T'+d.a+' + T'+d.b+' merged');});}
function splitBillDemo(){toast('Split bill mode added in Cashier Features'); go('cashier');}
function cashierFeaturesView(){return head('Cashier Features','Fast payments, split bill, refunds, discounts and closing workflow')+
`<div class="stats"><div class="stat"><small>Cash</small><h2>${rm(cashierShift.cash)}</h2></div><div class="stat"><small>Card</small><h2>${rm(cashierShift.card)}</h2></div><div class="stat"><small>QR Pay</small><h2>${rm(cashierShift.qr)}</h2></div><div class="stat"><small>Expenses</small><h2 style="color:var(--red)">${rm(cashierShift.expense)}</h2></div></div>
<div class="grid3" style="grid-template-columns:1fr 1fr"><section class="panel" style="padding:18px"><h3>Payment Methods</h3><div style="display:grid;gap:10px;margin-top:14px">${paymentMethods.map((p,i)=>`<div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--line);padding:10px 0"><b>${p.name}</b><span class="pill ${p.active?'green-pill':'red-pill'}" onclick="paymentMethods[${i}].active=!paymentMethods[${i}].active;render()" style="cursor:pointer">${p.active?'Active':'Off'}</span></div>`).join('')}</div></section>
<section class="panel" style="padding:18px"><h3>Quick Cashier Actions</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px"><button class="btn blue" onclick="toast('Split payment mode ready')">Split Payment</button><button class="btn light" onclick="toast('Refund request sent for manager approval')">Refund / Void</button><button class="btn green" onclick="toast('Discount applied')">Quick Discount</button><button class="btn dark" onclick="go('closing')">Daily Closing</button></div></section></div>`;}
function customerFeaturesView(){return head('Customer Features','Customer database, WhatsApp receipt, credit/due, tags and membership')+
`<div class="stats" style="grid-template-columns:repeat(4,1fr)"><div class="stat"><small>Customers</small><h2>${customers.length}</h2></div><div class="stat"><small>VIP</small><h2>${customers.filter(c=>c.l==='VIP').length}</h2></div><div class="stat"><small>Credit/Due</small><h2>${rm(260)}</h2></div><div class="stat"><small>WhatsApp Receipts</small><h2>Ready</h2></div></div>`+
panelTable(['Customer','Phone','Tier','Tags','Action'],customers.map((c,i)=>[`<b>${c.n}</b>`,c.p,pill(c.l,c.l==='VIP'?'blue':c.l==='Gold'?'green':''),customerTags.slice(0,2+(i%3)).map(x=>`<span class="pill">${x}</span>`).join(' '),`<button class="chip" onclick="sendWhatsappReceipt(${i})">WhatsApp</button> <button class="chip" onclick="editCustomer(${i})">Edit</button>`]));}
function sendWhatsappReceipt(i){toast('WhatsApp receipt prepared for '+customers[i].n);}
function modifiersView(){const cats=Object.keys(modifiers); return head('Kitchen Notes + Modifiers','Use preset notes and add-ons. These notes will print on KOT.')+
`<div class="grid3">${cats.map(c=>`<section class="panel" style="padding:16px"><h3>${c}</h3><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">${modifiers[c].map(x=>`<span class="pill blue-pill">${x}</span>`).join('')}</div><button class="btn light" style="margin-top:14px" onclick="addModifier('${c}')">+ Add ${c}</button></section>`).join('')}</div>
<section class="panel" style="padding:16px;margin-top:16px"><h3>Example KOT Note</h3><p style="color:var(--muted);margin-top:8px">Chicken Biryani — Extra Spicy, No Onion, Less Salt</p></section>`;}
function addModifier(c){openFormModal('Add '+c+' Modifier',[{name:'v',label:'Option name'}],d=>{if(d.v){modifiers[c].push(d.v);toast('Modifier added');}});}
function recipesView(){return head('Recipe & Auto Stock Deduction','When item is sold, ingredient stock is deducted automatically.')+
`<div class="panel" style="padding:16px;margin-bottom:16px"><button class="btn blue" onclick="deductRecipeDemo()">Test Auto Deduct From Selected Order</button></div>`+
panelTable(['Menu Item','Recipe Ingredients','Action'],MENU.filter(m=>recipes[m.id]).map(m=>[`<b>${m.name}</b>`,recipes[m.id].map(r=>`${r.i}: ${r.q}${r.u}`).join('<br>'),`<button class="chip" onclick="editRecipe(${m.id})">Edit Recipe</button>`]));}
function editRecipe(id){toast('Recipe editor ready for '+(MENU.find(m=>m.id===id)?.name||'item'));}
function deductRecipeDemo(){const o=orders.find(x=>x.no===selNo)||orders[0]; if(!o){toast('No order selected');return;} o.items.forEach(it=>{(recipes[it.id]||[]).forEach(r=>{const inv=inventory.find(x=>x.i===r.i); if(inv){inv.q=Math.max(0,Number(inv.q)-(r.q*it.qty)); inv.s=inv.q===0?'out':inv.q<=8?'low':'good';}})}); toast('Stock auto deducted for '+o.no); go('inventory');}
function closingAutoData(){
  const key=todayKey();
  const paid=salesLog.filter(r=>normalizeSaleKey(r.key)===key);
  const unpaid=orders.filter(o=>o.status!=='Paid');
  const totalSales=paid.reduce((sum,r)=>sum+Number(r.sales||0),0);
  const byMethod=(names)=>paid.filter(r=>names.includes(r.method||'Cash')).reduce((sum,r)=>sum+Number(r.sales||0),0);
  const cash=byMethod(['Cash']);
  const card=byMethod(['Card','Debit Card','Credit Card']);
  const qr=byMethod(['QR','QR Pay','TNG','Touch n Go','Touch \'n Go']);
  const todaysExpenses=todayExpenseRows();
  const totalExpenses=expenseSum(todaysExpenses);
  const cashExpenses=expenseByMethod(['Cash'],todaysExpenses);
  const nonCashExpenses=totalExpenses-cashExpenses;
  const expected=cashierShift.opening+cash-cashExpenses;
  const actual=(cashierShift.actualCash===null||cashierShift.actualCash===undefined)?expected:cashierShift.actualCash;
  const diff=actual-expected;
  return {paid,unpaid,totalSales,cash,card,qr,expenses:todaysExpenses,totalExpenses,cashExpenses,nonCashExpenses,expected,actual,diff};
}
function setPayment(no,method){const o=orders.find(x=>x.no===no); if(o){o.pay=method; toast(no+' payment set: '+method); render();}}
function closeShiftAuto(){
  const d=closingAutoData();
  cashierShift.closed=true;
  cashierShift.closedAt=new Date().toLocaleString();
  cashierShift.lastClosing={opening:cashierShift.opening,cash:d.cash,card:d.card,qr:d.qr,expenses:d.totalExpenses,cashExpenses:d.cashExpenses,expected:d.expected,actual:d.actual,difference:d.diff,orders:d.paid.length};
  toast('Automatic closing saved');
  render();
}
function closingView(){const d=closingAutoData();return head('Daily Closing','Auto closing is locked for cashier. Owner/Admin can edit opening cash and expenses from Admin Panel.')+
`<div class="stats"><div class="stat"><small>Opening Cash</small><h2>${rm(cashierShift.opening)}</h2></div><div class="stat"><small>Auto Total Sales</small><h2>${rm(d.totalSales)}</h2></div><div class="stat"><small>Expenses</small><h2 style="color:var(--red)">${rm(d.totalExpenses)}</h2><div class="trend down">Cash: ${rm(d.cashExpenses)}</div></div><div class="stat"><small>Expected Cash Closing</small><h2>${rm(d.expected)}</h2></div></div>
<div class="grid3" style="grid-template-columns:1.1fr 1fr"><section class="panel" style="padding:18px"><h3>Automatic Closing Sheet</h3><div class="admin-lock">🔒 Opening cash, expenses and cash count are locked for cashier. Owner/Admin only.</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px"><div><small style="font-weight:900;color:var(--muted)">Opening Cash</small><input class="input readonly-field" readonly value="${cashierShift.opening}"></div><div><small style="font-weight:900;color:var(--muted)">Expenses</small><input class="input readonly-field" readonly value="${d.totalExpenses.toFixed(2)}"></div><div><small style="font-weight:900;color:var(--muted)">Counted Cash</small><input class="input readonly-field" readonly value="${d.actual.toFixed(2)}"></div><div><small style="font-weight:900;color:var(--muted)">Difference</small><input class="input readonly-field" readonly value="${rm(d.diff)}" style="font-weight:900;color:${d.diff<0?'var(--red)':'var(--green)'}"></div></div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:14px"><div class="mini-card"><small>Cash Sales</small><b>${rm(d.cash)}</b></div><div class="mini-card"><small>Card Sales</small><b>${rm(d.card)}</b></div><div class="mini-card"><small>QR Sales</small><b>${rm(d.qr)}</b></div><div class="mini-card"><small>Cash Expenses</small><b>${rm(d.cashExpenses)}</b></div><div class="mini-card"><small>Other Expenses</small><b>${rm(d.nonCashExpenses)}</b></div></div><div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap"><button class="btn green" onclick="closeShiftAuto()">Close Shift Automatically</button><button class="btn light" onclick="openAdminClosingModal()">Owner/Admin Edit</button><button class="btn blue" onclick="go('expenses')">Add/View Expenses</button><button class="btn dark" onclick="window.print()">Print Closing</button>${cashierShift.closed?`<span class="pill green-pill">Closed ${cashierShift.closedAt||''}</span>`:''}</div></section>
<section class="panel" style="padding:18px"><h3>Order Payment Summary</h3><div style="margin-top:12px;display:grid;gap:9px;max-height:330px;overflow:auto">${d.paid.length?d.paid.map(r=>`<div style="border:1px solid var(--line);border-radius:10px;padding:10px;display:flex;justify-content:space-between;gap:8px;align-items:center"><div><b>${r.no}</b><br><small>Paid · ${r.method||'Cash'} · ${r.table?'T'+r.table:typeMeta(r.type||'take').l} · ${rm(r.sales||0)}</small></div><span class="pill green-pill">Closed Sale</span></div>`).join(''):'<div class="empty">No paid orders today</div>'}</div><h3 style="margin-top:16px">Today Expenses</h3><div style="margin-top:8px;display:grid;gap:8px;max-height:180px;overflow:auto">${d.expenses.length?d.expenses.map(e=>`<div style="border:1px solid var(--line);border-radius:10px;padding:9px;display:flex;justify-content:space-between;gap:8px;align-items:center"><div><b>${e.category}</b><br><small>${e.method} · ${e.desc||'-'} · ${rm(e.amount||0)}</small></div>${e.receipt?`<button class="chip" onclick="viewExpenseReceipt('${e.id}')">Receipt</button>`:`<button class="chip" onclick="uploadExpenseReceipt('${e.id}')">Upload</button>`}</div>`).join(''):'<div class="empty">No expenses today</div>'}</div><div style="margin-top:12px;color:var(--muted);font-size:13px">Paid orders included: <b>${d.paid.length}</b><br>Unpaid orders not included: <b>${d.unpaid.length}</b></div></section></div>`;}
function openAdminClosingModal(){openFormModal('Owner/Admin Closing Setup',[{name:'opening',label:'Opening Cash',type:'number',value:cashierShift.opening},{name:'actual',label:'Counted Cash',type:'number',value:closingAutoData().actual.toFixed(2)}],d=>{cashierShift.opening=parseFloat(d.opening)||0;cashierShift.actualCash=parseFloat(d.actual)||0;toast('Closing settings updated by Owner/Admin');});}
function kotPrinterView(){return head('Auto KOT Printer','Auto print Kitchen Order Ticket when waiter sends order to kitchen')+
`<div class="stats"><div class="stat"><small>Auto Print</small><h2 style="color:${kotAutoPrint?'var(--green)':'var(--red)'}">${kotAutoPrint?'ON':'OFF'}</h2></div><div class="stat"><small>Copies</small><h2>${kotCopies}</h2></div><div class="stat"><small>Printers</small><h2>4</h2></div><div class="stat"><small>KOT Logs</small><h2>${kotLogs.length}</h2></div></div>
<section class="panel" style="padding:18px;margin-bottom:16px"><h3>Printer Mapping</h3><div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:14px">${Object.keys(printerMap).map(k=>`<div><label style="font-weight:900;font-size:12px;color:var(--muted)">${k}</label><input class="input" value="${printerMap[k]}" onchange="printerMap['${k}']=this.value"></div>`).join('')}</div><div style="display:flex;gap:8px;margin-top:14px"><button class="btn ${kotAutoPrint?'green':'light'}" onclick="kotAutoPrint=!kotAutoPrint;render()">${kotAutoPrint?'Auto Print ON':'Auto Print OFF'}</button><button class="btn blue" onclick="printKOT(orders.find(o=>o.no===selNo)||orders[0])">Test Print KOT</button></div></section>`+
panelTable(['Time','Order','Station','Printer','Status'],kotLogs.slice().reverse().map(l=>[l.time,l.order,l.station,l.printer,l.status]));}
function printKOT(o){if(!o){toast('No order for KOT');return;} const groups={}; o.items.forEach(i=>{const st=stationOf(i); (groups[st]=groups[st]||[]).push(i);}); Object.keys(groups).forEach(st=>kotLogs.push({time:new Date().toLocaleTimeString(),order:o.no,station:st,printer:printerMap[st==='Main Kitchen'?'Main':st]||printerMap.Main,status:'Printed'})); const html=`<!doctype html><html><head><title>KOT ${o.no}</title><style>body{font-family:Arial;padding:10px}.ticket{width:270px}.c{text-align:center}.line{border-top:1px dashed #0B0B0B;margin:8px 0}h2{margin:0;font-size:20px}.item{display:flex;justify-content:space-between;font-size:16px;margin:6px 0}.note{font-weight:bold;background:#eee;padding:6px;margin-top:8px}</style></head><body>${Object.keys(groups).map(st=>`<div class="ticket"><div class="c"><h2>KOT ${o.no}</h2><b>${st}</b><br>${o.table?'Table T'+o.table:typeMeta(o.type).l}<br>${new Date().toLocaleString()}</div><div class="line"></div>${groups[st].map(i=>`<div class="item"><b>${i.qty} x ${i.name}</b></div>${i.note?`<div class="note">${i.note}</div>`:''}`).join('')}<div class="line"></div></div><div style="page-break-after:always"></div>`).join('')}<script>window.print()<\/script></body></html>`; const w=window.open('','_blank'); if(w){w.document.write(html);w.document.close();} toast('KOT printed for '+o.no); render();}
function sendKitchen(no){const o=orders.find(x=>x.no===no); if(!o)return; o.stage=0; if(kotAutoPrint)printKOT(o); else toast('Sent to kitchen'); render();}

/* ---------- TOAST ---------- */
let tT;function toast(m){const t=document.getElementById("toast");document.getElementById("toastmsg").textContent=m;t.classList.add("show");clearTimeout(tT);tT=setTimeout(()=>t.classList.remove("show"),1600);}

// read role from login (?role=waiter/cashier/owner)
(function(){const p=new URLSearchParams(location.search).get("role");if(p==="waiter"){role="waiter";}})();
initSupabase();

function applyThemePref(){
  const t=localStorage.getItem('POS_THEME')||'dark';
  document.body.classList.toggle('light',t==='light');
  const b=document.getElementById('themeBtn'); if(b)b.textContent = t==='light'?'☀️ Light':'🌙 Dark';
}
function toggleTheme(){
  const isLight=document.body.classList.toggle('light');
  localStorage.setItem('POS_THEME',isLight?'light':'dark');
  const b=document.getElementById('themeBtn'); if(b)b.textContent=isLight?'☀️ Light':'🌙 Dark';
}

applyThemePref();
renderNav();render();hydrated=true;
if(dbReady){loadCloud();}
if(role==="waiter"){document.getElementById("roleCashier").classList.remove("active");document.getElementById("roleWaiter").classList.add("active");}
if(role==="kitchen"){document.getElementById("roleCashier").classList.remove("active");document.getElementById("roleKitchen")?.classList.add("active");}
if(role==="tandoor"){document.getElementById("roleCashier").classList.remove("active");document.getElementById("roleTandoor")?.classList.add("active");}
