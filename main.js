let running = true;
let again = true;

let svg = document.getElementById('graphics');

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

let nssvg = 'http://www.w3.org/2000/svg';

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

    if (sys.has_mass(elements.get(selectedElement))) {
      sys.changed_initial_positions(true);
      sys.dragging = true;
    }
  }
}

function drag(event) {
  if (selectedElement) {
    event.preventDefault();
    let coord = getMousePosition(event);

    let obj = elements.get(selectedElement);
    obj.x = coord.x - offset.x;
    obj.y = coord.y - offset.y;

    if (sys.has_mass(elements.get(selectedElement))) {
      sys.changed_initial_positions(true);
    }
  }
}

function endDrag(event) {
  if (sys.has_mass(elements.get(selectedElement))) {
    sys.changed_initial_positions(true);
    sys.dragging = false;
  }
  selectedElement = null;
}

svg.addEventListener('mousedown', startDrag, false);
document.addEventListener('mousemove', drag, false);
document.addEventListener('mouseup', endDrag, false);

class Box {
  constructor(pos, size, mass, vel, color, colorStroke, strokeWidth = .1) {
    this.initial_position = pos.copy();
    this.initial_velocity = vel.copy();

    this.pos = pos.copy();
    this.size = size.copy();
    this.color = color;
    this.colorStroke = colorStroke;
    this.strokeWidth = strokeWidth;

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
    this.el.setAttribute('fill', this.color);
    if (this.colorStroke) {
      this.el.setAttribute('stroke', this.colorStroke);
      this.el.setAttribute('stroke-width', this.strokeWidth);
    }

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

  little_update() {
    for (let c of this.constraints) {
      c.constrain(this);
    }
    this.el.setAttribute('x', this.pos.x - this.size.x / 2);
    this.el.setAttribute('y', height - this.pos.y - this.size.y / 2);
    for (let l of this.listeners) {
      l();
    }
  }
}

function spring_between(o1, o2) {
  let p1 = vec2(o1.right.x, o1.y);
  let p2 = vec2(o2.left.x, o2.y);

  let len = Vector2.subtract(p2, p1);

  let sides = Vector2.scale(0.05, len);
  let part = Vector2.scale(0.09, len);

  let amplitude = .25;

  let c1 = Vector2.rotate(vec2(.48 * part.length(), amplitude), part.angle());
  let c2 = Vector2.rotate(vec2(.52 * part.length(), amplitude), part.angle());
  let c2n = Vector2.rotate(vec2(.52 * part.length(), -amplitude), part.angle());
  let d = `M ${p1.x} ${p1.y} `;
  p1.add(sides);
  let p3 = Vector2.add(p1, part);
  d += `l ${sides.x} ${sides.y} C ${p1.x + c1.x} ${p1.y + c1.y} ${p1.x + c2.x} ${p1.y + c2.y} ${p3.x} ${p3.y}`;

  // .3642
  // .7058
  for (let i = 1; i < 10; ++i) {
    p1.add(part);
    p3.add(part);
    if (i % 2 === 0) {
      d += ` S ${p1.x + c2.x} ${p1.y + c2.y} ${p3.x} ${p3.y}`;
    } else {
      d += ` S ${p1.x + c2n.x} ${p1.y + c2n.y} ${p3.x} ${p3.y}`;
    }
  }
  d += ` l ${sides.x} ${sides.y}`;

  return d;
}

class Spring {
  constructor(left, right, k, color, len, simple = false) {
    this.left = left;
    this.left.listeners.push(this.update.bind(this));
    this.right = right;
    this.right.listeners.push(this.update.bind(this));
    this.simple = simple;

    this.k = k;
    this.color = color;
    this.len = (len ? len : this.distance);

    this.el = document.createElementNS(nssvg, 'path');
    this.el.classList.add('spring');
    if (this.simple) this.el.setAttribute('d', `M ${this.left.right.x} ${this.left.y} L ${this.right.left.x} ${this.right.y}`);
    else this.el.setAttribute('d', spring_between(this.left, this.right));
    this.el.setAttribute('fill-opacity', '0');
    this.el.setAttribute('pointer-events', 'visibleStroke');
    this.el.setAttribute('stroke-width', '0.08');
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
    if (this.simple) this.el.setAttribute('d', `M ${this.left.right.x} ${this.left.y} L ${this.right.left.x} ${this.right.y}`);
    else this.el.setAttribute('d', spring_between(this.left, this.right));
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

function connectWithSpring(obj1, obj2, k, color, len, simple) {
  let s = new Spring(obj1, obj2, k, color, len, simple);
  obj1.forces.push(s);
  obj2.forces.push(s);
  return s;
}

class Simulation {
  constructor(n_masses, x1, x2, y1, y2, options, k = 70000, masses_wid = .3, viscosity) {
    this.x1 = x1;
    this.x2 = x2;
    this.width = this.x2 - this.x1;

    this.y1 = y1;
    this.y2 = y2;
    this.height = this.y2 - this.y1;

    this.n_masses = n_masses;
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

    let space_per_spring = (this.width - .4 - this.n_masses * this.mm) / (this.n_masses + 1);

    this.boxes = [];
    for (let i = 0; i < this.n_masses; ++i) {
      // this.boxes[i] = new Box(vec2(.2 + (i + 1) * space_per_spring + this.mm * (i + 1 / 2), this.y),
      //   vec2(this.mm, this.mm), 20, vec2(0, 0), '#007bff');
      this.boxes[i] = new Box(vec2(this.x1 + .2 + (i + 1) * space_per_spring + this.mm * (i + 1 / 2), this.y1 + this.height / 2),
        vec2(this.mm, this.mm), 20, vec2(0, 0), '#007bff', '#004955', .05);

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
      this.springs[i] = connectWithSpring(this.boxes[i - 1], this.boxes[i], this.k, 'red', this.options.streched_springs ? space_per_spring / 50 : undefined);
      this.objs.push(this.springs[i]);
    }

    if (this.options.left_enabled) {
      let left_border = new Box(vec2(this.x1 + .1, this.y1 + this.height / 2), vec2(.2, 1.2), 1000, vec2(0, 0), 'black');
      left_border.constraints.push(verticalConstraint);
      if (this.options.left_static) left_border.constraints.push(horizontalConstraint);
      else left_border.constraints.push(pinnedConstraint);
      this.objs.push(left_border);

      if (this.options.left_connected) {
        let s0 = connectWithSpring(left_border, this.boxes[0], this.k, 'red', this.options.streched_springs ? space_per_spring / 50 : undefined);
        this.objs.push(s0);
        this.springs[0] = s0;
      }
      svg.appendChild(left_border.el);
    }

    if (this.options.right_enabled) {
      let right_border = new Box(vec2(this.x2 - .1, this.y1 + this.height / 2), vec2(.2, 1.2), 1000, vec2(0, 0), 'black');
      right_border.constraints.push(verticalConstraint);
      if (this.options.right_static) right_border.constraints.push(horizontalConstraint);
      else right_border.constraints.push(pinnedConstraint);
      this.objs.push(right_border);

      if (this.options.right_connected) {
        let sN = connectWithSpring(this.boxes[this.boxes.length - 1], right_border, this.k, 'red', this.options.streched_springs ? space_per_spring / 50 : undefined, false);
        this.objs.push(sN);
        this.springs[this.springs.length] = sN;
      }
      svg.appendChild(right_border.el);
    }
    for (let b of this.boxes) {
      svg.appendChild(b.el);
    }
    this.masses = this.boxes;
  }

  update(dt) {
    for (const o of this.objs) {
      o.calculate(dt);
    }
    for (const o of this.objs) {
      o.update(dt);
    }
  }

  reset() {
    for (let b of this.boxes) {
      b.pos = b.initial_position.copy();
      b.vel = b.initial_velocity.copy();
      b.update(0);
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

// simulations.push(new Simulation(2, 0, 10, 1.5, 4.5, { 'type': 'vertical', 'streched_springs': true }, 700));
// simulations.push(new Simulation(1, 3, { 'left_enabled': false, 'type': 'horizontal', 'streched_springs': false, 'air_viscosity': true }, 200, undefined, 2));
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
  constructor(pos1, len, val1, val2, horizontal = true, label = '', round = true, size = 1, invert = true, initial_value) {
    this.pos1 = pos1.copy();
    this.len = len;

    this.val = val1;

    this.val1 = val1;
    this.val2 = val2;

    this.initial_value = initial_value === undefined ? this.val1 : initial_value;

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

    this.value = this.initial_value;
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

  set value(val) {
    let displacement = (val - this.val) / (this.val2 - this.val1) * this.len;
    if (this.horizontal) {
      this.sl.x += displacement;
    } else {
      this.sl.y -= displacement;
    }
  }
}

let paused = document.createElementNS(nssvg, 'text');
paused.setAttribute('x', '5');
paused.setAttribute('y', `${height / 6}`);
paused.setAttribute('font-size', '1');
paused.setAttribute('text-anchor', 'middle');
paused.setAttribute('fill', '#888');
paused.textContent = 'PAUSED';
// paused.style.setProperty('opacity', '0');
svg.appendChild(paused);

// let s2 = new Slider(vec2(7, 1), 2, 25, 32, true, 'bom dia2', undefined, undefined, false);
// let s = new Slider(vec2(4, 1), 2, 25, 32, true, 'bom dia');
// let s1 = new Slider(vec2(6, 4), 2, 25, 32, false, 'hello');
// let s3 = new Slider(vec2(1, 1), 2, 25, 32, true, 'hello', true, 2, true);

function sine_between(a, b, n_half_T, color, width, amplitude) {
  a = vec2(a.x, height - a.y);
  b = vec2(b.x, height - b.y);
  if (a.y !== b.y || b.x < a.x) console.log('drawing weird sine wave');
  let y = a.y;
  let el = document.createElementNS(nssvg, 'path');

  el.classList.add('sine');
  el.setAttribute('stroke-width', width.value.toString());
  el.setAttribute('stroke', color);
  el.setAttribute('fill-opacity', '0');
  el.setAttribute('pointer-events', 'visibleStroke');
  let dist = (b.x - a.x) / n_half_T.value;
  let next = vec2(a.x + dist, y);
  let d = `M ${a.x} ${y} C ${a.x + .3642 * dist} ${y - amplitude.value} ${a.x + .6358 * dist} ${y - amplitude.value} ${next.x} ${y}`;
  for (let i = 1; i < n_half_T.value; ++i) {
    next.x += dist;
    if (i % 2 === 1) {
      d += `S ${next.x - dist + .6358 * dist} ${y + amplitude.value} ${next.x} ${y}`;
    } else {
      d += `S ${next.x - dist + .6358 * dist} ${y - amplitude.value} ${next.x} ${y}`;
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
      let d = `M ${a.x} ${y} C ${a.x + .3642 * dist} ${y - this.amplitude.value} ${a.x + .6358 * dist} ${y - this.amplitude.value} ${next.x} ${y}`;
      for (let i = 1; i < this.n_half_T.value; ++i) {
        next.x += dist;
        if (i % 2 === 1) {
          d += `S ${next.x - dist + .6358 * dist} ${y + this.amplitude.value} ${next.x} ${y}`;
        } else {
          d += `S ${next.x - dist + .6358 * dist} ${y - this.amplitude.value} ${next.x} ${y}`;
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

// let halves_slider = new Slider(vec2(2, 7), 2, 1, 24, true, 'n_half_T', true, 1, true);
// let amplitude_slider = new Slider(vec2(5, 7), 2, -2, 2, true, 'amplitude', false, 1, true);
// let width_slider = new Slider(vec2(8, 5), 2, 0, 2, false, 'width', false, 1, true);
let simulation_speed = new Slider(vec2(1, 6.5), 2, .1, 4, true, 'simulation speed', false, 1, false, 1);

// let sine = sine_between(vec2(2, 5), vec2(3, 5), { value: 4 }, "#888", { value: .1 }, { value: 1 });
// let sine2 = sine_between(vec2(5, 5), vec2(7, 5), halves_slider, "#888", width_slider, amplitude_slider);

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

// let radios = new RadioGroup();
// radios.addRadio(vec2(4, 5), 1.5, false, 'sim');
// radios.addRadio(vec2(4, 5.5), 1.5, true, 'não');

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

// let checkbox = new CheckBox(vec2(4, 4.5), 1.5, 'legal', true);

class Button {
  constructor(pos, size, caption_element) {
    this.pos = pos.copy();
    this.size = size.copy();

    this.caption_el = caption_element;

    this.button_el = document.createElementNS(nssvg, 'rect');
    this.button_el.setAttribute('x', this.pos.x - this.size.x / 2);
    this.button_el.setAttribute('y', height - (this.pos.y - this.size.y / 2));
    this.button_el.setAttribute('width', this.size.x);
    this.button_el.setAttribute('height', this.size.y);
    // this.button_el.setAttribute('y2', height - (this.this.pos1.y + (this.horizontal ? 0 : this.len)));
    this.button_el.setAttribute('fill-opacity', ".25");
    this.button_el.setAttribute('fill', "#888");
    this.button_el.setAttribute('stroke-width', .05);
    this.button_el.setAttribute('stroke', "#888");
    this.button_el.classList.add('button');

    this.button_el.addEventListener('mousedown', this.clicked.bind(this));

    if (this.caption_el) {
      svg.appendChild(this.caption_el);
    }

    svg.appendChild(this.button_el);
  }

  clicked() {
    console.log(this);
  }
}

// let t = document.createElementNS(nssvg, 'text');
// t.setAttribute('x', 3.9);
// t.setAttribute('y', height - 6.1);
// // t.setAttribute('x', 0);
// // t.setAttribute('y', 0);
// t.setAttribute('font-size', .18);
// t.setAttribute('text-anchor', 'start');
// t.setAttribute('alignment-baseline', 'middle');
// t.setAttribute('fill', "#888");
// t.textContent = 'hi';

// let btn = new Button(vec2(4, 6.5), vec2(.8, .4), t);

class Waves {
  constructor(pos, len, number, color, color2, size, amplitude) {
    this.pos = pos.copy();
    this.pos2 = vec2(this.pos.x + len, this.pos.y);
    this.size = size.copy();

    this.amplitude = amplitude;

    this.len = len;
    this.number = number;

    this.color = color;
    this.color2 = color2;

    this.sine = sine_between(this.pos, this.pos2, { value: this.number }, this.color, { value: 0.02 }, this.amplitude);

    this.left = new Box(this.pos, this.size, 1, vec2(0, 0), this.color2);
    this.left.constraints.push(horizontalConstraint);
    this.left.constraints.push(verticalConstraint);
    this.left.el.classList.remove('draggable');
    this.right = new Box(vec2(this.pos.x + len, this.pos.y), this.size, 1, vec2(0, 0), this.color2);
    this.right.constraints.push(horizontalConstraint);
    this.right.constraints.push(verticalConstraint);
    this.right.el.classList.remove('draggable');
  }
}

// let wav = new Waves(vec2(4, 6.5), 1.5, 3, 'blue', '#222', vec2(.05, .08), amplitude_slider);

class WaveMarker {
  constructor(center, len, number, color, color2, width) {
    this.center = center.copy();
    this.len = len;

    this.amplitude = { value: .2 };

    this.number = number;
    this.width = width;

    this.color = color;
    this.color2 = color2;

    let x1 = this.center.x - this.len / 2;
    let x2 = this.center.x + this.len / 2;

    this.line = document.createElementNS(nssvg, 'line');
    this.line.setAttribute('x1', x1);
    this.line.setAttribute('y1', height - this.center.y);
    this.line.setAttribute('x2', x2);
    this.line.setAttribute('y2', height - this.center.y);
    this.line.setAttribute('stroke', this.color2);
    this.line.setAttribute('stroke-width', this.width);

    svg.appendChild(this.line);
    this.sine = sine_between(vec2(x1, this.center.y), vec2(x2, this.center.y), { value: this.number }, this.color, { value: this.width }, this.amplitude);
  }
}

// let mark = new WaveMarker(vec2(4, 7.5), .5, 10, 'blue', '#111', .02);

class System {
  constructor(n_masses = 3) {
    this.create(n_masses);
  }

  create(n_masses) {
    // this.stop_button = new Button();
    // this.simulation_speed_slider = new Slider();
    // this.initial_positions_button = new Button();
    // this.frame_advance_button = new Button();
    // this.zero_positions = new Button();
    // this.n_masses_slider = new Slider();
    // this.show_springs_check = new CheckBox();
    // this.show_phases_check = new CheckBox();

    this.n_masses = n_masses;
    this.k = 700;
    this.m = 20;

    this.sim = new Simulation(this.n_masses, 0, 10, 4.5, 6, {}, this.k);

    this.normal_frequencies = [];
    this.eigenvectors = [];

    for (let i = 1; i <= this.n_masses; ++i) {
      this.normal_frequencies[i - 1] = Math.sqrt(2 * this.k / this.m * Math.sin(Math.PI / 2 * i / (this.n_masses + 1)));
      let ev_i = [];
      for (let j = 1; j <= this.n_masses; ++j) {
        ev_i[j - 1] = Math.sin(i * Math.PI * j / (this.n_masses + 1));
      }
      this.eigenvectors[i - 1] = ev_i;
    }
    this.factor = 0;
    for (let i = 0; i < this.n_masses; ++i) {
      this.factor += this.eigenvectors[0][i] * this.eigenvectors[0][i];
    }

    console.log(this.normal_frequencies);
    console.log(this.eigenvectors);

    running = false;

    this.normal_amplitudes = [];
    this.initial_phases = [];
    this.time = 0;

    this.dragging = false;

    this.masses_zero_positions = [];
    for (let i = 0; i < this.n_masses; ++i) {
      this.masses_zero_positions[i] = this.sim.masses[i].initial_position.y;

      this.initial_phases[i] = 0;
    }
    this.changed_initial_positions();

    this.waves = [];
    this.updates = [];

    for (let i = 0; i < this.n_masses; ++i) {

      this.waves[i] = new Waves(vec2(10 / (this.n_masses + 1) * (i + 1) - .4, 1), .8, i + 1, 'blue', '#222', vec2(.05, .08), {
        get value() { return this.val(); },
        val: function () {
          return .5 * this.normal_amplitudes[i] * Math.cos(this.normal_frequencies[i] * this.time - this.initial_phases[i])
        }.bind(this),
        listeners: [],
        addListener(func) {
          this.listeners.push(func);
        },
        update() {
          for (let f of this.listeners) {
            f();
          }
        }
      });
      this.updates.push(this.waves[i].amplitude.update.bind(this.waves[i].amplitude));
      // this.waves = new WaveMarker(vec2(10 / 11 * (i + 1), 1), .8, i + 1, 'blue', '#222', 0.05);
    }

    this.sliders = [];

    for (let i = 0; i < this.n_masses; ++i) {
      this.sliders[i] = new Slider(vec2(10 / (this.n_masses + 1) * (i + 1), 2), 1.5, 0, 2, false, '', false, .7, false, 0);
      this.sliders[i].addListener(function () {
        this.normal_amplitudes[i] = this.sliders[i].value;
        this.move_masses_to_the_correct_place();
        this.recalculate_initial_positions();
      }.bind(this));
    }

    this.phase_sliders = [];

    for (let i = 0; i < this.n_masses; ++i) {
      this.phase_sliders[i] = new Slider(vec2(10 / (this.n_masses + 1) * (i + 1), 1), .8, -Math.PI, Math.PI, false, '', false, .7, false, 0);
      this.phase_sliders[i].addListener(function () {
        this.initial_phases[i] = this.phase_sliders[i].value;
        this.move_masses_to_the_correct_place();
        this.recalculate_initial_positions();
      }.bind(this));
    }

    this.n_masses_slider = new Slider(vec2(7, 6.5), 1.5, 1, 10, true, 'Number of Masses', true, .7, true, this.n_masses);
    this.n_masses_slider.addListener(
      function () {
        if (this.n_masses_slider.value !== this.n_masses) {
          let val = this.n_masses_slider.value;
          document.body.removeChild(svg);
          svg = document.createElementNS(nssvg, 'svg');
          document.body.appendChild(svg);
          svg.setAttribute('id', 'graphics');
          svg.setAttribute('viewBox', `0 0 10 ${10 * height / width}`);
          svg.addEventListener('mousedown', startDrag, false);
          this.create(val);
        }
      }.bind(this)
    );
    // this.updates.push( function () {
    //   for (let i = 0; i < this.n_masses; ++i) {
    //     this.sliders[i].value = this.normal_amplitudes[i];
    //   }
    // }.bind(this));

  }

  update(dt) {

    if (running === false) {
      // for (let m of this.sim.masses) {
      //   m.initial_position = m.pos.copy();
      //   this.changed_initial_positions(false);
      // }
    } else {
      if (this.dragging) {
        this.sim.update(dt);
        this.changed_initial_positions(true);
        this.time = 0;
      } else {
        this.time += dt;
        this.move_masses_to_the_correct_place();
      }
    }
    for (let u of this.updates) {
      u();
    }
    // if (dt === 0) {
    //   for (let i = 0; i < this.n_masses; ++i) {
    //     if (this.sim.masses[i] !== elements.get(selectedElement)) {
    //       this.sim.masses[i].pos.y = this.masses_zero_positions[i];
    //       for (let j = 0; j < this.n_masses; ++j) {
    //         this.sim.masses[i].pos.y += this.normal_amplitudes[j] * this.eigenvectors[i][j] * Math.cos(this.normal_frequencies[j] * this.time - this.initial_phases[j]);
    //       }
    //       this.sim.masses[i].little_update();
    //     }
    //   }
    // }

  }

  move_masses_to_the_correct_place() {
    for (let i = 0; i < this.n_masses; ++i) {
      if (this.sim.masses[i] !== elements.get(selectedElement)) {
        this.sim.masses[i].pos.y = this.masses_zero_positions[i];
        for (let j = 0; j < this.n_masses; ++j) {
          this.sim.masses[i].pos.y += this.normal_amplitudes[j] * this.eigenvectors[i][j] * Math.cos(this.normal_frequencies[j] * this.time - this.initial_phases[j]);
        }
        this.sim.masses[i].little_update();
      }
    }
  }

  changed_initial_positions(copy) {
    // let positions = [];
    if (copy) {
      for (let m of this.sim.masses) {
        m.initial_position = m.pos.copy();
      }
    }
    for (let i = 0; i < this.n_masses; ++i) {
      // positions[i] = this.sim.masses[i].initial_position;
      this.normal_amplitudes[i] = 0;
      for (let j = 0; j < this.n_masses; ++j) {
        this.normal_amplitudes[i] += (this.sim.masses[j].pos.y - this.masses_zero_positions[j]) * this.eigenvectors[i][j] / this.factor;
      }
      if (this.normal_amplitudes[i] < 0) {
        this.initial_phases[i] = Math.PI;
        this.normal_amplitudes[i] = -this.normal_amplitudes[i];
      } else {
        this.initial_phases[i] = 0;
      }
    }
    for (let i = 0; i < this.n_masses; ++i) {
      if (this.sliders && this.sliders[i]) {
        this.sliders[i].value = this.normal_amplitudes[i];
      }
    }
    for (let i = 0; i < this.n_masses; ++i) {
      if (this.phase_sliders && this.phase_sliders[i]) {
        this.phase_sliders[i].value = this.initial_phases[i];
      }
    }
    // this.time = 0;
    // this.update(0);
  }

  changed_normal_amplitudes() {
    // for (let i = 0; i < this.n_masses; ++i) {
    //   this.sim.masses[i].initial_position.y = this.masses_zero_positions[i];
    //   for (let j = 0; j < this.n_masses; ++j) {
    //     this.sim.masses[i].initial_position.y += this.normal_amplitudes[j] * this.eigenvectors[i][j] * Math.cos(- this.initial_phases[j]);
    //   }
    //   this.update(0);
    // }
  }

  has_mass(box) {
    if (this.sim.masses.find(x => x === box)) {
      return true;
    } else {
      return false;
    }
  }

  recalculate_initial_positions() {
    for (let i = 0; i < this.n_masses; ++i) {
      if (this.sim.masses[i] !== elements.get(selectedElement)) {
        this.sim.masses[i].initial_position.y = this.masses_zero_positions[i];
        for (let j = 0; j < this.n_masses; ++j) {
          this.sim.masses[i].initial_position.y += this.normal_amplitudes[j] * this.eigenvectors[i][j] * Math.cos(this.normal_frequencies[j] * this.time - this.initial_phases[j]);
        }
      }
    }
  }

  reset_to_initial_positions() {
    this.sim.reset();
    running = false;
    this.time = 0;
  }
}

let sys = new System();

function loop() {
  let timenow = performance.now();
  elapsedTime = timenow - lastTime;
  lastTime = timenow;
  if (running) {
    paused.style.setProperty('opacity', '0');
    timeSinceLastUpdate += elapsedTime * simulation_speed.value;
    // let t3 = performance.now();
    while (timeSinceLastUpdate >= timePerFrame * simulation_speed.value) {
      timeSinceLastUpdate -= timePerFrame * simulation_speed.value;
      for (let s of simulations) {
        s.update(timePerFrame * simulation_speed.value / 1000);
      }
    }
  } else {
    paused.style.setProperty('opacity', '1');
  }
  sys.update(timePerFrame * simulation_speed.value / 1000);
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