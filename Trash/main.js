class En {
  constructor(el) {
    this._el = el;
    this._fieldElSet = this._makeFieldElSet();;
    this._boundingClientRect = this._el.getBoundingClientRect();
    this._matterRect = this._makeMatterRect();
  }
  
  get htmlEl() {return this._el; }
  get fieldElSet() {return this._fieldElSet;}
  get matterRect() {return this._matterRect;}
  get cssPosition() { 
    return {
      x: this._matterRect.position.x - this._boundingClientRect.width/2 - this._boundingClientRect.left,
      y: this._matterRect.position.y - this._boundingClientRect.height/2 - this._boundingClientRect.top
    };
  }
  get cssRotation() {
    return this._matterRect.angle;
  }
  
  _makeFieldElSet() {
    const els = Array.from(this._el.querySelectorAll("input, select, button"));
    const wset = new WeakSet(els);
    return wset;
  }
  _makeMatterRect() {
    const rect = this._el.getBoundingClientRect();
    const x = rect.left + rect.width/2;
    const y = rect.top + rect.height/2;
    let body;
    if(this._el.nodeName == "FIELDSET") {
      body = Matter.Bodies.rectangle(x, y, rect.width, rect.height);
      body.friction = 0.1;
      body.frictionAir = 0.2;
      body.restitution = 0.25;
    }
    else if (this._el.classList.contains("signup__button")) {
      body = Matter.Bodies.circle(x, y, rect.width/2);
      body.friction = 0.1;
      body.restitution = 0.7;
    }
    else {
      body = Matter.Bodies.rectangle(x, y, rect.width, rect.height);
      body.friction = 0.01;
      body.restitution = 0.5;
    }
    return body;
  }
}

const MSG_DID_SUBMIT = "Form has been submitted. Thank you.";
const BTN_ANG_VEL = -10; // deg
const BTN_FORCE = {x:-0.1, y:-0.1};
const INPUT_VALID_FORCE = {x:0.2, y:-0.3};
const INPUT_INVALID_FORCE = {x:-0.2, y:0.3};


const query = ":not(fieldset)>.signup__field, fieldset, .signup__button";
const els = Array.from(document.querySelectorAll(query));
const ens = [];
const walls = buildWalls(document.querySelector(".form"));
const engine = Matter.Engine.create();
const runner = Matter.Runner.run(engine);


//
// Create entities for field containers 
//
for (const el of els) {
  const en = new En(el);
  ens.push(en);
  Matter.World.add(engine.world, en.matterRect);
}
// Create walls
Matter.World.add(engine.world, [walls.B, walls.L, walls.R, walls.T]);


//
// Tick
//
Matter.Events.on(engine, "tick", e => {
  let isAllOOB = true; // exclude walls, just entities
  for (const en of ens) {
    const {x, y} = en.cssPosition;
    en.htmlEl.style.transform = `translate(${x}px, ${y}px)rotate(${en.cssRotation}rad)`;
    isAllOOB &= (en.matterRect.position.y > walls.B.position.y);
  }
  if (isAllOOB)
    submitForm();
});

function submitForm() {
  Matter.Engine.clear(engine);
  elTitle.innerHTML += `<br>${MSG_DID_SUBMIT}`;
  Matter.Runner.stop(runner);
}


// 
// DOM
//
const fieldEls = Array.from(document.querySelectorAll("input, select"));

for (const fieldEl of fieldEls)
  fieldEl.addEventListener("change", onFieldUpdate);

function onFieldUpdate(e) {
  const en = findEnByEl(e.target, ens);
  if (e.target.checkValidity()) 
    onInputValid({en, e});
  else 
    onInputInvalid({en, e});  
}

function onInputValid({e, en}){
  Matter.Body.applyForce(en.matterRect, en.matterRect.position, INPUT_VALID_FORCE);
}

function onInputInvalid({e, en}){
  Matter.Body.applyForce(en.matterRect, en.matterRect.position, INPUT_INVALID_FORCE);
}


//
// <select>
//
const selectEl = document.querySelector("#fav_color");
function onSelectUpdate(e) {
  const i = e.target.selectedIndex;
  elSubmitBtn.style.backgroundImage = i ? `linear-gradient(${e.target.children[i].value}, transparent 50%)` : `none`;
  const en = findEnByEl(elSubmitBtn, ens);
  Matter.Body.setAngularVelocity(en.matterRect, Math.PI/180 * BTN_ANG_VEL);
  Matter.Body.applyForce(en.matterRect, en.matterRect.position, BTN_FORCE);
}

let timer = null;
selectEl.addEventListener("change", e => {
  clearTimeout(timer);
  timer = setTimeout(()=>onSelectUpdate(e), 100);
});


//
// Form submit
//
elForm.addEventListener("submit", e => {
  e.preventDefault();
  disableAllFields(e.target);
  Matter.World.remove(engine.world, [walls.R]);
  engine.world.gravity.x = 1;
  const radioEls = Array.from(elRadioGrp.querySelectorAll(`[type="radio"]`));
  let i = 0;
  (function f(){
    radioEls[i].checked = true;
    i = i + 1 == radioEls.length ? 0 : i + 1;
    if (runner.enabled)
      setTimeout(f, 1000/24);
  }());
});


//
// helpers 
//
function findEnByEl(fieldEl, ens) {
  for (const en of ens) 
    if (en.fieldElSet.has(fieldEl))
      return en;
  return null;
}

function disableAllFields(formEl) {
  const fieldEls = Array.from(formEl.querySelectorAll("input, select, button"));
  for (const fieldEl of fieldEls) 
    fieldEl.disabled = true;
}

function buildWalls(container) {
  const bbox = container.getBoundingClientRect();
  const thickness = 100;
  const width = bbox.width;
  const height = bbox.height;
  const hw = width/2;
  const hh = height/2;
  const ht = thickness/2;
  const T = Matter.Bodies.rectangle(bbox.left+hw,bbox.top-ht,width,thickness, {isStatic:true});
  const B = Matter.Bodies.rectangle(bbox.left+hw,bbox.bottom+ht,width,thickness, {isStatic:true});
  const L = Matter.Bodies.rectangle(bbox.left-ht,bbox.top+height/2,thickness,height, {isStatic:true});
  const R = Matter.Bodies.rectangle(bbox.right+ht,bbox.top+height/2,thickness,height, {isStatic:true});
  return {T, B, L, R};
}