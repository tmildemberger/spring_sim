// let the fun begin

// const canvas = document.querySelector('canvas');
// const ctx = canvas.getContext('2d');

// let width = canvas.width = window.innerWidth;
// let height = canvas.height = window.innerHeight;

// function random(min, max) {
//   let num = Math.floor(Math.random() * (max - min + 1)) + min;
//   return num;
// }

// let objs = [];

// class Vector2 {
//   constructor(x, y) {
//     this.x = x;
//     this.y = y;
//   }

//   add(other) {
//     this.x += other.x;
//     this.y += other.y;
//   }

//   subtract(other) {
//     this.x -= other.x;
//     this.y -= other.y;
//   }

//   scale(alpha) {
//     this.x *= alpha;
//     this.y *= alpha;
//   }

//   length() {
//     return Math.sqrt(this.x * this.x + this.y * this.y);
//   }

//   rotate(angle) {
//     let temp = vec2(this.x, this.y);
//     this.x = temp.x * Math.cos(angle) - temp.y * Math.sin(angle);
//     this.y = temp.x * Math.sin(angle) + temp.y * Math.cos(angle);
//   }

//   reverse_y() {
//     this.y = -this.y;
//   }

//   static add(v1, v2) {
//     return vec2(v1.x + v2.x, v1.y + v2.y);
//   }

//   static subtract(v1, v2) {
//     return vec2(v1.x - v2.x, v1.y - v2.y);
//   }

//   static scale(alpha, v) {
//     return vec2(alpha * v.x, alpha * v.y);
//   }

//   static rotate(v, angle) {
//     let temp = vec2(v.x, v.y);
//     v.x = temp.x * Math.cos(angle) - temp.y * Math.sin(angle);
//     v.y = temp.x * Math.sin(angle) + temp.y * Math.cos(angle);
//     return v;
//   }
// }

// function vec2(x, y) {
//   return new Vector2(x, y);
// }

// let triste;
// let imprimi = 20;

// class Box {
//   constructor(pos, size, vel, mass, color) {
//     this.pos = pos;
//     this.size = size;
//     this.color = color;

//     this.forces = [];
//     this.constraints = [];
//     this.mass = mass;
//     this.vel = vel;
//     this.acc = vec2(0, 0);
//   }

//   get left() {
//     return vec2(this.pos.x - this.size.x / 2, this.pos.y);
//   }

//   get right() {
//     return vec2(this.pos.x + this.size.x / 2, this.pos.y);
//   }

//   draw() {
//     ctx.fillStyle = this.color;
//     ctx.fillRect(this.pos.x - this.size.x / 2, this.pos.y - this.size.y / 2,
//       this.size.x, this.size.y);
//   }

//   calculate(dt) {
//     let net_force = vec2(0, 0);
//     for (let f of this.forces) {
//       net_force.add(f.force(this));
//     }
//     this.acc = Vector2.scale(1 / this.mass, net_force);
//     this.vel.add(Vector2.scale(dt, this.acc));
//     for (let c of this.constraints) {
//       this.pos = c.constrain_pos(this.pos);
//       this.vel = c.constrain_vel(this.vel);
//       this.acc = c.constrain_acc(this.acc);
//     }
//   }

//   update(dt) {
//     this.pos.add(Vector2.scale(dt, this.vel));
//   }
// }

// class Spring {
//   constructor(left, right, k, color, len) {
//     this.left = left;
//     this.right = right;
//     this.k = k;
//     this.color = color;
//     this.len = (len ? len : this.distance);
//   }

//   get distance() {
//     return Vector2.subtract(this.left.right, this.right.left).length();
//   }

//   get angle() {
//     let v = Vector2.subtract(this.right.left, this.left.right);
//     v.reverse_y();
//     return Math.atan2(v.y, v.x);
//   }

//   force(obj) {
//     if (obj !== this.left && obj !== this.right) {
//       console.log('this is not right (nor left haha)');
//       return vec2(0, 0);
//     }
//     let f_ = vec2(this.k * (this.distance - this.len), 0);
//     // console.log(this.left.right.y);
//     // console.log(this.right.left.y);
//     // console.log(this.left.right.x - this.right.left.x);
//     if (obj == this.right) {
//       // console.log('the thing im printing is:');
//       // console.log(f_);

//     }
//     let f = Vector2.rotate(f_, -this.angle + (obj === this.right ? Math.PI : 0));
//     // f.reverse_y();
//     if (obj === triste && imprimi-->0) console.log(f);
//     return f;
//   }

//   calculate(dt) {
//     // do nothing
//   }

//   update(dt) {
//     // do nothing
//   }

//   draw() {
//     ctx.strokeStyle = this.color;
//     ctx.beginPath();
//     ctx.moveTo(this.left.right.x, this.left.right.y);
//     ctx.lineTo(this.right.left.x, this.right.left.y);
//     ctx.stroke();
//   }
// }

// // while (balls.length < 25) {
// //   let size = random(10, 20);
// //   let ball = new Ball(
// //     random(0 + size, width - size),
// //     random(0 + size, height - size),
// //     random(-7, 7),
// //     random(-7, 7),
// //     `rgb(${random(0, 255)},${random(0, 255)},${random(0, 255)})`,
// //     size
// //   );

// //   balls.push(ball);
// // }

// let gravityField = {
//   g: 9.8,
//   force: function (obj) {
//     return vec2(0, obj.mass * this.g);
//   }
// }
// let windyField = {
//   f: 15,
//   force: function (obj) {
//     return vec2(obj.mass * this.f, 0);
//   }
// }
// let horizontalConstraint = {
//   constrain_pos: function (pos) {
//     return pos;
//   },
//   constrain_vel: function (vel) {
//     return vec2(vel.x, 0);
//   },
//   constrain_acc: function (acc) {
//     return vec2(acc.x, 0);
//   }
// }
// let verticalConstraint = {
//   constrain_pos: function (pos) {
//     return pos;
//   },
//   constrain_vel: function (vel) {
//     return vec2(0, vel.y);
//   },
//   constrain_acc: function (acc) {
//     return vec2(0, acc.y);
//   }
// }
// let insideBox = {
//   constrain_pos: function (pos) {
//     if (pos.x < 0) pos.x = 0;
//     if (pos.x > width) pos.x = width;
//     if (pos.y < 0) pos.y = 0;
//     if (pos.y > height) pos.y = height;
//     return pos;
//   },
//   constrain_vel: function (vel) {
//     return vel;
//   },
//   constrain_acc: function (acc) {
//     return acc;
//   }
// }

// function connectWithSpring(obj1, obj2, k, color, len) {
//   let s = new Spring(obj1, obj2, k, color, len);
//   obj1.forces.push(s);
//   obj2.forces.push(s);
//   return s;
// }

// // let left_border = new Box(vec2(0, 100), vec2(20, 100), vec2(0, 0), 1000, 'white');
// // left_border.constraints.push(verticalConstraint);
// // left_border.constraints.push(horizontalConstraint);

// // let right_border = new Box(vec2(width, 100), vec2(20, 100), vec2(0, 0), 1000, 'white');
// // right_border.constraints.push(verticalConstraint);
// // right_border.constraints.push(horizontalConstraint);

// // let testBox = new Box(vec2((width - 40) / 3, 100), vec2(50, 50), vec2(0, 0), 20, 'blue');
// // testBox.forces.push(gravityField);
// // // testBox.forces.push(windyField);
// // // testBox.constraints.push(verticalConstraint);
// // testBox.constraints.push(horizontalConstraint);
// // testBox.constraints.push(insideBox);
// // let testBox2 = new Box(vec2((width - 40) / 3 * 2, 100), vec2(50, 50), vec2(0, 0), 20, 'green');
// // testBox2.forces.push(gravityField);
// // // testBox2.forces.push(windyField);
// // // testBox2.constraints.push(verticalConstraint);
// // testBox2.constraints.push(horizontalConstraint);
// // testBox2.constraints.push(insideBox);

// // // let s1 = new Spring(testBox, testBox2, 300, 'yellow', 100);
// // // testBox.forces.push(s1);
// // // testBox2.forces.push(s1);
// // let s1 = connectWithSpring(testBox, testBox2, 300, 'yellow');

// // let s2 = connectWithSpring(left_border, testBox, 300, 'yellow');
// // let s3 = connectWithSpring(testBox2, right_border, 300, 'yellow');

// let running = true;
// let again = true;

// // objs.push(left_border);
// // objs.push(right_border);
// // objs.push(testBox);
// // objs.push(testBox2);
// // objs.push(s1);
// // objs.push(s2);
// // objs.push(s3);

// // let left_border2 = new Box(vec2(0, 300), vec2(20, 100), vec2(0, 0), 1000, 'white');
// // left_border2.constraints.push(verticalConstraint);
// // left_border2.constraints.push(horizontalConstraint);

// // let right_border2 = new Box(vec2(width, 300), vec2(20, 100), vec2(0, 0), 1000, 'white');
// // right_border2.constraints.push(verticalConstraint);
// // right_border2.constraints.push(horizontalConstraint);

// // let testBox3 = new Box(vec2((width - 40) / 3, 300), vec2(50, 50), vec2(0, 0), 20, 'blue');
// // testBox3.forces.push(gravityField);
// // // testBox2.forces.push(windyField);
// // // testBox2.constraints.push(verticalConstraint);
// // testBox3.constraints.push(horizontalConstraint);
// // testBox3.constraints.push(insideBox);
// // let testBox22 = new Box(vec2((width - 40) / 3 * 2, 300), vec2(50, 50), vec2(0, 0), 20, 'green');
// // testBox22.forces.push(gravityField);
// // // testBox22.forces.push(windyField);
// // // testBox22.constraints.push(verticalConstraint);
// // testBox22.constraints.push(horizontalConstraint);
// // testBox22.constraints.push(insideBox);

// // // let s1 = new Spring(testBox2, testBox22, 300, 'yellow', 100);
// // // testBox2.forces.push(s1);
// // // testBox22.forces.push(s1);
// // let s12 = connectWithSpring(testBox3, testBox22, 300, 'yellow');

// // let s22 = connectWithSpring(left_border2, testBox3, 300, 'yellow');
// // let s32 = connectWithSpring(testBox22, right_border2, 300, 'yellow');

// // objs.push(left_border2);
// // objs.push(right_border2);
// // objs.push(testBox3);
// // objs.push(testBox22);
// // objs.push(s12);
// // objs.push(s22);
// // objs.push(s32);

// class Simulation {
//   constructor(n_masses, y) {
//     this.n_masses = n_masses;
//     this.y = y;
//     this.objs = [];
//     this.k = 800;

//     let space = width - 40;
//     let boxes = [];
//     for (let i = 0; i < n_masses; ++i) {
//       boxes[i] = new Box(vec2((i + 1) * space / (n_masses + 1), this.y),
//         vec2(50, 50), vec2(0, 0), 20, 'blue');
//       // boxes[i].forces.push(gravityField);
//       boxes[i].constraints.push(verticalConstraint);
//       boxes[i].constraints.push(insideBox);
//       this.objs.push(boxes[i]);
//     }
//     let left_border = new Box(vec2(0, this.y), vec2(20, 100), vec2(0, 0), 1000, 'white');
//     left_border.constraints.push(verticalConstraint);
//     left_border.constraints.push(horizontalConstraint);
//     this.objs.push(left_border);

//     let right_border = new Box(vec2(width, this.y), vec2(20, 100), vec2(0, 0), 1000, 'white');
//     right_border.constraints.push(verticalConstraint);
//     right_border.constraints.push(horizontalConstraint);
//     this.objs.push(right_border);

//     let s0 = connectWithSpring(left_border, boxes[0], this.k, 'red', 150);
//     let sN = connectWithSpring(boxes[boxes.length - 1], right_border, this.k, 'red', 150);
//     this.objs.push(s0);
//     this.objs.push(sN);

//     let springs = [];
//     for (let i = 0; i < n_masses - 1; ++i) {
//       springs[i] = connectWithSpring(boxes[i], boxes[i + 1], this.k, 'red', 150);
//       this.objs.push(springs[i]);
//     }
//   }

//   update(dt) {
//     for (const o of this.objs) {
//       o.calculate(dt);
//     }
//     for (const o of this.objs) {
//       o.update(dt);
//     }
//   }

//   draw() {
//     for (const o of this.objs) {
//       o.draw();
//     }
//   }
// }

// // testBox2.pos.x = 450;

// let timePerFrame = 1 / 60 * 1000;
// let timeSinceLastUpdate = 0;
// let elapsedTime = performance.now();
// let lastTime = performance.now();

// let sim3 = new Simulation(2, 500);

// triste = sim3.objs[1];

// function loop() {
//   elapsedTime = performance.now() - lastTime;
//   lastTime = performance.now();
//   if (running) {
//     timeSinceLastUpdate += elapsedTime;
//     while (timeSinceLastUpdate >= timePerFrame) {
//       timeSinceLastUpdate -= timePerFrame;
//       // for (const o of objs) {
//       //   o.calculate(timePerFrame / 1000);
//       // }
//       // for (const o of objs) {
//       //   o.update(timePerFrame / 1000);
//       // }
//       sim3.update(timePerFrame / 1000);
//     }

//     ctx.fillStyle = 'rgb(0, 0, 0, 0.35)';
//     ctx.fillRect(0, 0, width, height);

//     // for (const o of objs) {
//     //   o.draw();
//     // }
//     sim3.draw();
//   }
//   if (again) {
//     requestAnimationFrame(loop);
//   }
// }

// loop();
const svg = document.getElementById('graphics');

let width = window.innerWidth;
let height = window.innerHeight;

svg.setAttribute('viewBox', `0 0 10 ${10 * height / width}`);

height = 10 * height / width;
width = 10;

// svg.setAttribute('width', width);
// svg.setAttribute('height', height);
// svg.setAttribute('preserveAspectRatio', height);

let selectedElement = null;
let offset;
let transform;

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

    let transforms = selectedElement.transform.baseVal;

    if (transforms.length === 0 ||
      transforms.getItem(0).type !== SVGTransform.SVG_TRANSFORM_TRANSLATE) {
      let translate = svg.createSVGTransform();
      translate.setTranslate(0, 0);

      selectedElement.transform.baseVal.insertItemBefore(translate, 0);
    }

    transform = transforms.getItem(0);

    offset.x -= transform.matrix.e;
    offset.y -= transform.matrix.f;
  }
}

function drag(event) {
  if (selectedElement) {
    event.preventDefault();
    // let x = parseFloat(selectedElement.getAttribute('x'));
    // selectedElement.setAttribute('x', x + 0.1);
    let coord = getMousePosition(event);
    transform.setTranslate(coord.x - offset.x, coord.y - offset.y);
  }
}

function endDrag(event) {
  selectedElement = null;
}

svg.addEventListener('mousedown', startDrag, false);
svg.addEventListener('mousemove', drag, false);
svg.addEventListener('mouseup', endDrag, false);
svg.addEventListener('mouseleave', endDrag, false);

let nssvg = 'http://www.w3.org/2000/svg'

// let box2 = document.createElementNS(nssvg, 'rect');
// box2.setAttribute('width', '3');
// box2.setAttribute('height', '4');
// box2.setAttribute('x', '6');
// box2.setAttribute('y', '2');
// box2.setAttribute('fill', '#888');
// box2.classList.add('draggable')
// svg.appendChild(box2);

class Box {
  constructor(pos, size) {
    this.pos = pos;
    this.size = size;

    this.el = document.createElementNS(nssvg, 'rect');
    this.el.setAttribute('x', this.pos.x - this.size.x / 2);
    this.el.setAttribute('y', height - this.pos.y - this.size.y / 2);
    this.el.setAttribute('width', this.size.x);
    this.el.setAttribute('height', this.size.y);
    this.el.setAttribute('fill', '#888')

    this.el.classList.add('draggable');

    svg.appendChild(this.el);
  }
}

let box2 = new Box({x:7.5, y:.4 * height}, {x:3, y:4});