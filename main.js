let running = true;
let again = true;

const svg = document.getElementById('graphics');

let width;
let height;

function resize_things() {
  width = window.innerWidth;
  height = window.innerHeight;

  svg.setAttribute('viewBox', `0 0 10 ${10 * height / width}`);

  height = 10 * height / width;
  width = 10;
}

resize_things();
document.defaultView.addEventListener('resize', resize_things);

let nssvg = 'http://www.w3.org/2000/svg'

class Vector2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  add(other) {
    this.x += other.x;
    this.y += other.y;
  }

  subtract(other) {
    this.x -= other.x;
    this.y -= other.y;
  }

  scale(alpha) {
    this.x *= alpha;
    this.y *= alpha;
  }

  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  angle() {
    return Math.atan2(this.y, this.x);
  }

  rotate(angle) {
    let temp = vec2(this.x, this.y);
    this.x = temp.x * Math.cos(angle) - temp.y * Math.sin(angle);
    this.y = temp.x * Math.sin(angle) + temp.y * Math.cos(angle);
  }

  copy() {
    return new Vector2(this.x, this.y);
  }

  static add(v1, v2) {
    return vec2(v1.x + v2.x, v1.y + v2.y);
  }

  static subtract(v1, v2) {
    return vec2(v1.x - v2.x, v1.y - v2.y);
  }

  static scale(alpha, v) {
    return vec2(alpha * v.x, alpha * v.y);
  }

  static rotate(v, angle) {
    let temp = vec2(v.x, v.y);
    temp.x = v.x * Math.cos(angle) - v.y * Math.sin(angle);
    temp.y = v.x * Math.sin(angle) + v.y * Math.cos(angle);
    return temp;
  }
}

function vec2(x, y) {
  return new Vector2(x, y);
}

let elements = new Map();

let selectedElement = null;
let offset;

function getMousePosition(event) {
  let ctm = svg.getScreenCTM();
  return {
    x: (event.clientX - ctm.e) / ctm.a,
    y: (event.clientY - ctm.f) / ctm.d,
  };
}

function startDrag(event) {
  if (event.target.classList.contains('draggable')) {
    selectedElement = event.target;
    offset = getMousePosition(event);

    let obj = elements.get(selectedElement);
    offset.x -= obj.x;
    offset.y -= obj.y;
  }
}

function drag(event) {
  if (selectedElement) {
    event.preventDefault();
    let coord = getMousePosition(event);

    let obj = elements.get(selectedElement);
    obj.x = coord.x - offset.x;
    obj.y = coord.y - offset.y;
  }
}

function endDrag(event) {
  selectedElement = null;
}

svg.addEventListener('mousedown', startDrag, false);
document.addEventListener('mousemove', drag, false);
document.addEventListener('mouseup', endDrag, false);

class Box {
  constructor(pos, size, mass, vel, color) {
    this.initial_position = pos.copy();
    this.initial_velocity = vel.copy();

    this.pos = pos.copy();
    this.size = size.copy();
    this.color = color;

    this.forces = [];
    this.constraints = [];
    this.mass = mass;
    this.vel = vel.copy();
    this.acc = vec2(0, 0);

    this.listeners = []; this.lastPos = vec2(0, 0);

    this.el = document.createElementNS(nssvg, 'rect');
    this.el.setAttribute('x', this.pos.x - this.size.x / 2);
    this.el.setAttribute('y', height - this.pos.y - this.size.y / 2);
    this.el.setAttribute('z', '2');
    this.el.setAttribute('width', this.size.x);
    this.el.setAttribute('height', this.size.y);
    this.el.setAttribute('fill', this.color)

    this.el.classList.add('draggable');

    elements.set(this.el, this);

    svg.appendChild(this.el);
  }

  get x() {
    return this.pos.x;
  }

  get y() {
    return height - this.pos.y;
  }

  get init_x() {
    return this.initial_position.x;
  }

  get init_y() {
    return height - this.initial_position.y;
  }

  set x(x) {
    this.pos.x = x;
    for (let c of this.constraints) {
      c.constrain(this);
    }
    this.el.setAttribute('x', this.pos.x - this.size.x / 2);
    for (let l of this.listeners) {
      l();
    }
  }

  set y(y) {
    this.pos.y = height - y;
    for (let c of this.constraints) {
      c.constrain(this);
    }
    this.el.setAttribute('y', height - this.pos.y - this.size.y / 2);
    for (let l of this.listeners) {
      l();
    }
  }

  get left() {
    return vec2(this.pos.x - this.size.x / 2, this.pos.y);
  }

  get right() {
    return vec2(this.pos.x + this.size.x / 2, this.pos.y);
  }

  calculate(dt) {
    if (selectedElement === this.el) {
      this.vel = vec2(0, 0);
      this.acc = vec2(0, 0);
      return;
    }
    let net_force = vec2(0, 0);
    for (let f of this.forces) {
      net_force.add(f.force(this));
    }
    this.acc = Vector2.scale(1 / this.mass, net_force);
    this.vel.add(Vector2.scale(dt, this.acc));
    for (let c of this.constraints) {
      c.constrain(this);
    }
  }

  update(dt) {
    this.x += dt * this.vel.x;
    this.y += -dt * this.vel.y;
    this.realVel = Vector2.scale(1 / dt, vec2(this.pos.x - this.lastPos.x, this.pos.y - this.lastPos.y));
    this.lastPos = vec2(this.pos.x, this.pos.y);
  }
}

class Spring {
  constructor(left, right, k, color, len) {
    this.left = left;
    this.left.listeners.push(this.update.bind(this));
    this.right = right;
    this.right.listeners.push(this.update.bind(this));

    this.k = k;
    this.color = color;
    this.len = (len ? len : this.distance);

    this.el = document.createElementNS(nssvg, 'path');
    this.el.classList.add('spring');
    this.el.setAttribute('d', `M ${this.left.right.x} ${this.left.y} L ${this.right.left.x} ${this.right.y}`);
    this.el.setAttribute('stroke-width', '0.1');
    this.el.setAttribute('stroke', this.color);
    svg.appendChild(this.el);
  }

  get distance() {
    return Vector2.subtract(this.left.right, this.right.left).length();
  }

  get angle() {
    let v = Vector2.subtract(this.right.left, this.left.right);
    // v.reverse_y();
    return Math.atan2(v.y, v.x);
  }

  force(obj) {
    if (obj !== this.left && obj !== this.right) {
      console.log('this is not right (nor left haha)');
      return vec2(0, 0);
    }
    let f_ = vec2(this.k * (this.distance - this.len), 0);
    let f = Vector2.rotate(f_, this.angle + (obj === this.right ? Math.PI : 0));
    return f;
  }

  calculate(dt) {
    // do nothing
  }

  update(dt) {
    this.el.setAttribute('d', `M ${this.left.right.x} ${this.left.y} L ${this.right.left.x} ${this.right.y}`);
  }
}

let gravityField = {
  g: 9.8,
  force: function (obj) {
    return vec2(0, -obj.mass * this.g);
  }
}
let windyField = {
  f: 15,
  force: function (obj) {
    return vec2(obj.mass * this.f, 0);
  }
}
let fluidViscosity = function (visc) {
  return {
    gamma: visc,
    force: function (obj) {
      return Vector2.scale(-this.gamma, obj.vel);
    }
  }
}
let horizontalConstraint = {
  constrain: function (obj) {
    if (obj.y !== obj.init_y) {
      obj.y = obj.init_y;
    }
    obj.vel.y = 0;
    obj.acc.y = 0;
  }
}
let verticalConstraint = {
  constrain: function (obj) {
    if (obj.x !== obj.init_x) {
      obj.x = obj.init_x;
    }
    obj.vel.x = 0;
    obj.acc.x = 0;
  }
}
let insideBox = {
  constrain: function (obj) {
    if (obj.pos.x - obj.size.x / 2 < 0) obj.pos.x = obj.size.x / 2;
    if (obj.pos.x + obj.size.x / 2 > width) obj.pos.x = width - obj.size.x / 2;
    if (obj.pos.y - obj.size.y / 2 < 0) obj.pos.y = obj.size.y / 2;
    if (obj.pos.y + obj.size.y / 2 > height) obj.pos.y = height - obj.size.y / 2;
  }
}
let pinnedConstraint = {
  constrain: function (obj) {
    obj.vel.x = 0;
    obj.vel.y = 0;
    obj.acc.x = 0;
    obj.acc.y = 0;
  }
}

function connectWithSpring(obj1, obj2, k, color, len) {
  let s = new Spring(obj1, obj2, k, color, len);
  obj1.forces.push(s);
  obj2.forces.push(s);
  return s;
}

class Simulation {
  constructor(n_masses, y, options, k = 70000, masses_wid = .3, viscosity) {
    this.n_masses = n_masses;
    this.y = y;
    this.k = k;
    this.mm = masses_wid;
    this.viscosity = viscosity === undefined ? Math.sqrt(12 * this.k * 20 / 5) : viscosity;

    this.options = options || {};
    {
      let defaults = {
        'type': 'vertical',
        'gravity': false,
        'left_enabled': true,
        'left_connected': true,
        'left_static': true,
        'right_enabled': true,
        'right_connected': true,
        'right_static': true,
        'streched_springs': true,
        'air_viscosity': false,
      }
      for (let opt in defaults) {
        if (this.options[opt] === undefined) this.options[opt] = defaults[opt];
      }
    }

    this.objs = [];

    let space_per_spring = (width - .4 - n_masses * this.mm) / (n_masses + 1);

    this.boxes = [];
    for (let i = 0; i < n_masses; ++i) {
      this.boxes[i] = new Box(vec2(.2 + (i + 1) * space_per_spring + this.mm * (i + 1 / 2), this.y),
        vec2(this.mm, this.mm), 20, vec2(0, 0), '#007bff');

      if (this.options.gravity) this.boxes[i].forces.push(gravityField);
      if (this.options.air_viscosity) this.boxes[i].forces.push(fluidViscosity(this.viscosity));
      if (this.options.type.includes('vertical')) this.boxes[i].constraints.push(verticalConstraint);
      if (this.options.type.includes('horizontal')) this.boxes[i].constraints.push(horizontalConstraint);
      if (this.options.type.includes('pinned')) this.boxes[i].constraints.push(pinnedConstraint);
      if (this.options.type.includes('inside')) this.boxes[i].constraints.push(insideBox);
      this.objs.push(this.boxes[i]);
    }
    this.springs = [];

    for (let i = 1; i < n_masses; ++i) {
      this.springs[i] = connectWithSpring(this.boxes[i - 1], this.boxes[i], this.k, 'yellow', this.options.streched_springs ? space_per_spring / 50 : undefined);
      this.objs.push(this.springs[i]);
      for (let b of this.boxes) {
        svg.appendChild(b.el);
      }
    }

    if (this.options.left_enabled) {
      let left_border = new Box(vec2(0, this.y), vec2(.4, 2), 1000, vec2(0, 0), 'black');
      left_border.constraints.push(verticalConstraint);
      if (this.options.left_static) left_border.constraints.push(horizontalConstraint);
      else left_border.constraints.push(pinnedConstraint);
      this.objs.push(left_border);

      if (this.options.left_connected) {
        let s0 = connectWithSpring(left_border, this.boxes[0], this.k, 'yellow', this.options.streched_springs ? space_per_spring / 50 : undefined);
        this.objs.push(s0);
        this.springs[0] = s0;
      }
      svg.appendChild(left_border.el);
    }

    if (this.options.right_enabled) {
      let right_border = new Box(vec2(width, this.y), vec2(.4, 2), 1000, vec2(0, 0), 'black');
      right_border.constraints.push(verticalConstraint);
      if (this.options.right_static) right_border.constraints.push(horizontalConstraint);
      else right_border.constraints.push(pinnedConstraint);
      this.objs.push(right_border);

      if (this.options.right_connected) {
        let sN = connectWithSpring(this.boxes[this.boxes.length - 1], right_border, this.k, 'yellow', this.options.streched_springs ? space_per_spring / 50 : undefined);
        this.objs.push(sN);
        this.springs[this.springs.length] = sN;
      }
      svg.appendChild(right_border.el);
    }
  }

  update(dt) {
    for (const o of this.objs) {
      o.calculate(dt);
    }
    for (const o of this.objs) {
      o.update(dt);
    }
  }
}

let timePerFrame = 1 / 60 * 1000;
let timeSinceLastUpdate = 0;
let elapsedTime = performance.now();
let lastTime = performance.now();

let simulations = [];

// let sim3 = new Simulation(16, 15);
// let sim4 = new Simulation(6, 18);
// let sim5 = new Simulation(4, 9);

// simulations.push(sim3);
// simulations.push(sim4);
// simulations.push(sim5);
// simulations.push(new Simulation(12, 12));
// simulations.push(new Simulation(55, 3, { 'left_static': false, 'right_connected': false }));
// simulations.push(new Simulation(55, 6, { 'left_static': false, 'right_connected': false }));
// simulations.push(new Simulation(55, 9, { 'left_static': false, 'right_connected': false }));
// simulations.push(new Simulation(1, 3, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': false }, 20));
// simulations.push(new Simulation(1, 6, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20, undefined, 10));
// simulations.push(new Simulation(1, 9, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20, undefined, 20));
// simulations.push(new Simulation(1, 12, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20, undefined, 30));
// simulations.push(new Simulation(1, 15, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20, undefined, 40));

// simulations.push(new Simulation(1, 3, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': false }, 200));
// simulations.push(new Simulation(1, 6, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 20));
// simulations.push(new Simulation(1, 9, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 50));
// simulations.push(new Simulation(1, 12, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 97));
// simulations.push(new Simulation(1, 15, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 126));
// simulations.push(new Simulation(1, 18, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 1260));
// simulations.push(new Simulation(1, 21, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 10260));

// simulations.push(new Simulation(1, 3, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20, undefined, 0));
// simulations.push(new Simulation(1, 6, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 20));

function between(num, a, b) {
  if (a >= b) {
    return num >= b && num <= a;
  } else {
    return num >= a && num <= b;
  }
}

class Slider {
  constructor(pos1, len, val1, val2, horizontal = true, label = '', round = true, size = 1, invert = true) {
    this.pos1 = pos1.copy();
    this.len = len;

    this.val = val1;

    this.val1 = val1;
    this.val2 = val2;

    this.size = size;
    this.labeltxt = label;
    this.round = round;
    this.invert = invert;

    this.listeners = [];

    if (this.round) { this.val = Math.round(this.val); }

    this.horizontal = horizontal;

    this.guide = document.createElementNS(nssvg, 'line');
    this.guide.setAttribute('x1', this.pos1.x);
    this.guide.setAttribute('y1', height - this.pos1.y);
    this.guide.setAttribute('x2', this.pos1.x + (this.horizontal ? this.len : 0));
    this.guide.setAttribute('y2', height - (this.pos1.y + (this.horizontal ? 0 : this.len)));
    this.guide.setAttribute('stroke-width', (.05 * this.size).toString());
    this.guide.setAttribute('stroke', "#888");

    svg.appendChild(this.guide);

    this.sl = new Box(pos1, Vector2.scale(this.size, vec2(.2, .2)), 1, vec2(0, 0), 'black');
    // this.sl.el.classList.add('draggable');
    this.sl.el.classList.add('slider');

    this.sl.constraints.push(pinnedConstraint);
    this.sl.constraints.push(this.horizontal ? horizontalConstraint : verticalConstraint);

    let sliderConstraint = {
      constrain: function (obj) {
        if (this.horizontal) {
          if (!between(obj.pos.x, this.pos1.x, this.pos1.x + this.len)) {
            let d1 = this.pos1.x - obj.pos.x;
            let d2 = this.pos1.x + this.len - obj.pos.x;
            if (Math.abs(d1) < Math.abs(d2)) {
              this.sl.pos.x += d1;
            } else {
              this.sl.pos.x += d2;
            }
          }
        } else {
          if (!between(obj.pos.y, this.pos1.y, this.pos1.y + this.len)) {
            let d1 = this.pos1.y - obj.pos.y;
            let d2 = this.pos1.y + this.len - obj.pos.y;
            if (Math.abs(d1) < Math.abs(d2)) {
              this.sl.pos.y += d1;
            } else {
              this.sl.pos.y += d2;
            }
          }
        }
      }.bind(this)
    }
    this.sl.constraints.push(sliderConstraint);

    this.sl.listeners.push(this.new_val.bind(this));

    this.txt = document.createElementNS(nssvg, 'text');
    this.txt.setAttribute('x', this.pos1.x + (this.horizontal ? this.len / 2 : (this.invert ? -1 : 1) * this.size * -.2));
    this.txt.setAttribute('y', height - this.pos1.y - (this.horizontal ? (this.invert ? -.3 : .35) * this.size : this.len / 2));
    this.txt.setAttribute('font-size', (.3 * this.size).toString());
    this.txt.setAttribute('text-anchor', (this.horizontal ? 'middle' : (this.invert ? 'start' : 'end')));
    this.txt.setAttribute('alignment-baseline', 'middle');
    this.txt.setAttribute('fill', "#888");
    if (this.round) {
      this.txt.textContent = this.val.toString();
    } else {
      this.txt.textContent = this.val.toFixed(3);
    }
    svg.appendChild(this.txt);

    this.label = document.createElementNS(nssvg, 'text');
    this.label.setAttribute('x', this.pos1.x + (this.horizontal ? this.len / 2 : (this.invert ? -1 : 1) * this.size * .2));
    this.label.setAttribute('y', height - this.pos1.y - (this.horizontal ? (this.invert ? .35 : -.25) * this.size : this.len / 2));
    this.label.setAttribute('font-size', (.3 * this.size).toString());
    this.label.setAttribute('text-anchor', (this.horizontal ? 'middle' : (this.invert ? 'end' : 'start')));
    this.label.setAttribute('alignment-baseline', 'middle');
    this.label.setAttribute('fill', "#888");
    this.label.textContent = this.labeltxt;
    svg.appendChild(this.label);

    // this.label.classList.add('draggable');


    // this.el = document.createElementNS(nssvg, 'rect');
    // this.el.setAttribute('x', this.pos.x - this.size.x / 2);
    // this.el.setAttribute('y', height - this.pos.y - this.size.y / 2);
    // this.el.setAttribute('z', '2');
    // this.el.setAttribute('width', this.size.x);
    // this.el.setAttribute('height', this.size.y);
    // this.el.setAttribute('fill', this.color)

    // this.el.classList.add('draggable');

    // elements.set(this.el, this);

    // svg.appendChild(this.el);
  }

  new_val() {
    if (this.horizontal) {
      this.val = (this.sl.pos.x - this.pos1.x) / (this.len) * (this.val2 - this.val1) + this.val1;
    } else {
      this.val = (this.sl.pos.y - this.pos1.y) / (this.len) * (this.val2 - this.val1) + this.val1;
    }
    if (this.round) {
      this.val = Math.round(this.val);
      this.txt.textContent = this.val.toString();
    } else {
      this.txt.textContent = this.val.toFixed(3);
    }
    for (let f of this.listeners) {
      f();
    }
  }

  addListener(func) {
    this.listeners.push(func);
  }

  get value() {
    return this.val;
  }
}

let simulation_speed = 1;
let paused = document.createElementNS(nssvg, 'text');
paused.setAttribute('x', '5');
paused.setAttribute('y', `${height / 6}`);
paused.setAttribute('font-size', '1');
paused.setAttribute('text-anchor', 'middle');
paused.setAttribute('fill', '#888');
paused.textContent = 'PAUSED';
// paused.style.setProperty('opacity', '0');
svg.appendChild(paused);

let s2 = new Slider(vec2(7, 1), 2, 25, 32, true, 'bom dia2', undefined, undefined, false);
let s = new Slider(vec2(4, 1), 2, 25, 32, true, 'bom dia');
let s1 = new Slider(vec2(6, 4), 2, 25, 32, false, 'hello');
let s3 = new Slider(vec2(1, 1), 2, 25, 32, true, 'hello', true, 2, true);

function sine_between(a, b, n_half_T, color, width, amplitude) {
  if (a.y !== b.y || b.x < a.x) console.log('drawing weird sine wave');
  let y = a.y;
  let el = document.createElementNS(nssvg, 'path');

  el.classList.add('sine');
  el.setAttribute('stroke-width', width.value.toString());
  el.setAttribute('stroke', color);
  el.setAttribute('fill-opacity', '0');
  let dist = (b.x - a.x) / n_half_T.value;
  let next = vec2(a.x + dist, y);
  let d = `M ${a.x} ${y} C ${a.x + .3642 * dist} ${y - amplitude.value} ${a.x + .7058 * dist} ${y - amplitude.value} ${next.x} ${y}`;
  for (let i = 1; i < n_half_T.value; ++i) {
    next.x += dist;
    if (i % 2 === 1) {
      d += `S ${next.x - dist + .7058 * dist} ${y + amplitude.value} ${next.x} ${y}`;
    } else {
      d += `S ${next.x - dist + .7058 * dist} ${y - amplitude.value} ${next.x} ${y}`;
    }
  }
  el.setAttribute('d', d);

  let sine = {
    el,
    width,
    amplitude,
    n_half_T,
    update: function () {
      this.el.setAttribute('stroke-width', this.width.value.toString());
      let dist = (b.x - a.x) / n_half_T.value;
      let next = vec2(a.x + dist, y);
      let d = `M ${a.x} ${y} C ${a.x + .3642 * dist} ${y - this.amplitude.value} ${a.x + .7058 * dist} ${y - this.amplitude.value} ${next.x} ${y}`;
      for (let i = 1; i < this.n_half_T.value; ++i) {
        next.x += dist;
        if (i % 2 === 1) {
          d += `S ${next.x - dist + .7058 * dist} ${y + this.amplitude.value} ${next.x} ${y}`;
        } else {
          d += `S ${next.x - dist + .7058 * dist} ${y - this.amplitude.value} ${next.x} ${y}`;
        }
      }
      // let d = `M ${a.x} ${y} c ${.3642 * (mid.x - a.x)} ${-amplitude} ${(1-.7058) * (mid.x - a.x)} ${- amplitude} ${mid.x} ${y}`;
      // d += `S ${a.x + } ${1} ${b.x} ${y}`
      el.setAttribute('d', d);
    }
  };

  sine.update = sine.update.bind(sine);

  if (n_half_T.addListener) {
    n_half_T.addListener(sine.update);
  }

  if (amplitude.addListener) {
    amplitude.addListener(sine.update);
  }

  if (width.addListener) {
    width.addListener(sine.update);
  }

  svg.appendChild(el);
  return sine;
}

let halves_slider = new Slider(vec2(2, 7), 2, 1, 24, true, 'n_half_T', true, 1, true);
let amplitude_slider = new Slider(vec2(5, 7), 2, -5, 5, true, 'amplitude', false, 1, true);
let width_slider = new Slider(vec2(8, 5), 2, .05, 2, false, 'width', false, 1, true);

let sine = sine_between(vec2(2, 5), vec2(3, 5), { value: 4 }, "#888", { value: .1 }, { value: 1 });
let sine2 = sine_between(vec2(5, 5), vec2(7, 5), halves_slider, "#888", width_slider, amplitude_slider);

class RadioGroup {
  constructor() {
    this.radios = [];
    this.selected_;
  }

  set selected(sel) {
    if (this.radios[this.selected_]) {
      this.radios[this.selected_].unselect();
    }
    if (this.radios[sel]) {
      this.radios[sel].select();
    }
    this.selected_ = sel;
  }

  get value() {
    if (this.radios[this.selected_]) {
      return this.radios[this.selected_].value;
    }
  }

  addRadio(pos, size = 1, value, label) {
    let radio = {
      value
    };

    let radio_el = document.createElementNS(nssvg, 'circle');
    radio_el.setAttribute('cx', pos.x);
    radio_el.setAttribute('cy', height - pos.y);
    radio_el.setAttribute('r', size * .07);
    // radio_el.setAttribute('y2', height - (this.pos1.y + (this.horizontal ? 0 : this.len)));
    radio_el.setAttribute('fill-opacity', "0");
    radio_el.setAttribute('fill', "#888");
    radio_el.setAttribute('stroke-width', size * .03);
    radio_el.setAttribute('stroke', "#888");
    radio_el.classList.add('radio');

    radio_el.addEventListener('mousedown', (function () { this.selected = this.radios.findIndex(x => x === radio); }).bind(this));

    let radio_mark = document.createElementNS(nssvg, 'circle');
    radio_mark.setAttribute('cx', pos.x);
    radio_mark.setAttribute('cy', height - pos.y);
    radio_mark.setAttribute('r', size * .035);
    // radio_mark.setAttribute('y2', height - (this.pos1.y + (this.horizontal ? 0 : this.len)));
    radio_mark.setAttribute('fill-opacity', "1");
    radio_mark.setAttribute('fill', "#555");
    radio_mark.setAttribute('visibility', "hidden");
    // radio_mark.setAttribute('stroke-width', ".03");
    // radio_mark.setAttribute('stroke', "#888");

    let label_el = document.createElementNS(nssvg, 'text');
    label_el.setAttribute('x', pos.x + size * .14);
    label_el.setAttribute('y', height - pos.y - size * .04);
    label_el.setAttribute('font-size', .18 * size);
    label_el.setAttribute('text-anchor', 'start');
    label_el.setAttribute('alignment-baseline', 'middle');
    label_el.setAttribute('fill', "#888");
    label_el.textContent = label;

    svg.appendChild(label_el);

    svg.appendChild(radio_mark);
    svg.appendChild(radio_el);
    radio.el = radio_el;
    radio.mark = radio_mark;
    radio.label = label_el;
    radio.select = function () {
      this.mark.setAttribute('visibility', 'visible');
    };
    radio.unselect = function () {
      this.mark.setAttribute('visibility', 'hidden');
    };

    this.radios.push(radio);
    if (this.radios.length === 1) this.selected = this.radios.findIndex(x => x === radio);
  }
}

let radios = new RadioGroup();
radios.addRadio(vec2(4, 5), 1.5, false, 'sim');
radios.addRadio(vec2(4, 5.5), 1.5, true, 'não');

class CheckBox {
  constructor(pos, size = 1, label, def = false) {
    this.checked = def;

    this.check_el = document.createElementNS(nssvg, 'rect');
    this.check_el.setAttribute('x', pos.x - .12 * size / 2);
    this.check_el.setAttribute('y', height - pos.y + .12 * size / 2);
    this.check_el.setAttribute('width', size * .12);
    this.check_el.setAttribute('height', size * .12);
    // this.check_el.setAttribute('y2', height - (this.pos1.y + (this.horizontal ? 0 : this.len)));
    this.check_el.setAttribute('fill-opacity', "0");
    this.check_el.setAttribute('fill', "#888");
    this.check_el.setAttribute('stroke-width', size * .03);
    this.check_el.setAttribute('stroke', "#888");
    this.check_el.classList.add('check');

    this.check_el.addEventListener('mousedown', this.check.bind(this));

    this.mark = document.createElementNS(nssvg, 'rect');
    this.mark.setAttribute('x', pos.x - .05 * size / 2);
    this.mark.setAttribute('y', height - pos.y + .19 * size / 2);
    this.mark.setAttribute('width', size * .05);
    this.mark.setAttribute('height', size * .05);
    // this.mark.setAttribute('y2', height - (this.pos1.y + (this.horizontal ? 0 : this.len)));
    this.mark.setAttribute('fill-opacity', "1");
    this.mark.setAttribute('fill', "#555");
    this.mark.setAttribute('visibility', this.checked ? 'visible' : "hidden");
    // this.mark.setAttribute('stroke-width', ".03");
    // this.mark.setAttribute('stroke', "#888");

    this.label = document.createElementNS(nssvg, 'text');
    this.label.setAttribute('x', pos.x + size * .14);
    this.label.setAttribute('y', height - pos.y + size * .1);
    this.label.setAttribute('font-size', .18 * size);
    this.label.setAttribute('text-anchor', 'start');
    this.label.setAttribute('alignment-baseline', 'middle');
    this.label.setAttribute('fill', "#888");
    this.label.textContent = label;

    svg.appendChild(this.label);

    svg.appendChild(this.mark);
    svg.appendChild(this.check_el);
  }

  get value() {
    return this.checked;
  }

  check() {
    if (this.checked) {
      this.mark.setAttribute('visibility', 'hidden');
    } else {
      this.mark.setAttribute('visibility', 'visible');
    }
    this.checked = !this.checked;
  }
}

let checkbox = new CheckBox(vec2(4, 4.5), 1.5, 'legal', true);

function loop() {
  let timenow = performance.now();
  elapsedTime = timenow - lastTime;
  lastTime = timenow;
  if (running) {
    paused.style.setProperty('opacity', '0');
    timeSinceLastUpdate += elapsedTime * simulation_speed;
    // let t3 = performance.now();
    while (timeSinceLastUpdate >= timePerFrame) {
      timeSinceLastUpdate -= timePerFrame;
      for (let s of simulations) {
        s.update(timePerFrame / 1000);
      }
    }
  } else {
    paused.style.setProperty('opacity', '1');
  }
  if (again) {
    requestAnimationFrame(loop);
  }
}

function keyboard_pressed(event) {
  if (event.key === " ") {
    running = !running;
  }
}

document.addEventListener('keydown', keyboard_pressed);

loop();