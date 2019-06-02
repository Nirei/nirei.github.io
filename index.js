(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/**
 * This generates a closed space-filling curve.
 * It works by having a grid with random weighted connections between adjacent squares.
 * Then a minimum spaning tree is calculated over the grid.
 * Afterwards we subdivide every square on four smaller ones and consider that we have
 * a new closed square joining the centers of those smaller squares.
 * Following the connections established by our minimum spanning tree, we join these new
 * squares together until every node has been visited, forming a closed space filling curve
 * over the subdivided grid.
 * @author Nirei
 */
const FibonacciHeap = require("@tyriar/fibonacci-heap").FibonacciHeap;

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  // The maximum is exclusive and the minimum is inclusive
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * This representes the edges connecting
 * every square in a grid of any dimensions
 * with an associated value
 */
function Lattice(H, V) {
  /*
   * It took a bit of drawing to figure out that
   * all the edges connecting a grid are actually
   * two grids of H-1 * V and H * V-1 sizes.
   */
  const horizontal = [];
  const vertical = [];

  /**
   * Fill the lattice's edges with values provided by a generator function.
   * @param {*} generator a function taking no parameters and returning a value
   */
  const fill = function (generator) {
    for (let y = 0; y < V; y++) {
      horizontal[y] = [];
      for (let x = 0; x < H - 1; x++) {
        horizontal[y][x] = generator();
      }
    }

    for (let y = 0; y < V - 1; y++) {
      vertical[y] = [];
      for (let x = 0; x < H; x++) {
        vertical[y][x] = generator();
      }
    }
  };

  const getValue = function ([axis, x, y]) {
    if (axis === "h") {
      return horizontal[y][x];
    } else if (axis === "v") {
      return vertical[y][x];
    } else {
      throw "Invalid axis value: " + dir;
    }
  };

  /**
   * Get edge values for the edges connected to a vertex
   * @param {[int, int]} coords x and y coords of the vertex
   * @returns {{n: *, s: *, e: *, w: *}} object with the edges' values
   */
  function getEdgeValues([x, y]) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw "Coordinates must be integers";
    }
    if (x > H - 1 || x < 0) {
      throw `Coordinate out of range: x = ${x}`;
    }
    if (y > V - 1 || y < 0) {
      throw `Coordinate out of range: y = ${y}`;
    }
    const edges = {};
    if (x !== 0) {
      edges.w = horizontal[y][x - 1];
    }
    if (x < H - 1) {
      edges.e = horizontal[y][x];
    }
    if (y !== 0) {
      edges.n = vertical[y - 1][x];
    }
    if (y < V - 1) {
      edges.s = vertical[y][x];
    }
    return edges;
  }

  /**
   * Make a list of the edges connected to a vertex
   * @param {[int, int]} coords x and y coords of the vertex
   */
  function getEdgeList([x, y]) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw "Coordinates must be integers";
    }
    if (x > H - 1 || x < 0) {
      throw `Coordinate out of range: x = ${x}`;
    }
    if (y > V - 1 || y < 0) {
      throw `Coordinate out of range: y = ${y}`;
    }
    const edges = [];
    if (x !== 0) {
      edges.push(["h", x - 1, y]);
    }
    if (x < H - 1) {
      edges.push(["h", x, y]);
    }
    if (y !== 0) {
      edges.push(["v", x, y - 1]);
    }
    if (y < V - 1) {
      edges.push(["v", x, y]);
    }
    return edges;
  }

  /**
   * Given an edge, return vertices connected by it
   * @param {*} edge - in [axis, x, y] format for which to return the vertices
   * @returns array containing both vertices in [x,y] format
   */
  function connectedVertices([axis, x, y]) {
    if (axis === "h") {
      return [[x, y], [x + 1, y]];
    } else if (axis === "v") {
      return [[x, y], [x, y + 1]];
    } else {
      throw "Invalid axis value: " + dir;
    }
  }

  const getDimensions = function () {
    return [H, V];
  };

  const setValue = function ([axis, x, y], value) {
    if (axis === "h") {
      horizontal[y][x] = value;
    } else if (axis === "v") {
      vertical[y][x] = value;
    } else {
      throw "Invalid axis value: " + dir;
    }
  };

  return {
    fill: fill,
    getDimensions: getDimensions,
    getValue: getValue,
    getEdgeValues: getEdgeValues,
    getEdgeList: getEdgeList,
    setValue: setValue,
    connectedVertices: connectedVertices
  };
}

/**
 * Executes Prim's minimum spanning tree algorithm over
 * a Lattice with integer values for the edges
 * @param {*} lattice the lattice to calculate the MST
 */
function prim(lattice) {
  const open = new FibonacciHeap(); // edges still open
  const visited = {}; // visited vertices
  let nvisited = 0; // number of visited vertices

  // minimum spanning tree represented as a binary lattice
  const [H, V] = lattice.getDimensions();
  const tree = Lattice(H, V);
  tree.fill(function () {
    return false;
  });

  // pick a random vertex to start
  let vertex = [getRandomInt(0, H), getRandomInt(0, V)];
  // add it to visited
  visited[`${vertex[0]} ${vertex[1]}`] = true;
  nvisited += 1;
  // add its edges to the heap
  lattice.getEdgeList(vertex).forEach(edge => {
    open.insert(lattice.getValue(edge), edge);
  });

  while (nvisited < H * V) {
    const { value } = open.extractMinimum();
    const [v1, v2] = lattice.connectedVertices(value);
    if (!(`${v1[0]} ${v1[1]}` in visited && `${v2[0]} ${v2[1]}` in visited)) {
      // is a new vertex, add edge to the tree
      tree.setValue(value, true);

      // find out which was the new vertex and add it to visited
      if (!(`${v1[0]} ${v1[1]}` in visited)) {
        visited[`${v1[0]} ${v1[1]}`] = true;
        nvisited += 1;
        vertex = v1;
      } else {
        visited[`${v2[0]} ${v2[1]}`] = true;
        nvisited += 1;
        vertex = v2;
      }

      // put edges in the heap
      lattice.getEdgeList(vertex).forEach(edge => {
        open.insert(lattice.getValue(edge), edge);
      });
    }
  }

  return tree;
}

function opposite(dir) {
  return dir === "n" && "s" || dir === "s" && "n" || dir === "w" && "e" || dir === "e" && "w";
}

/**
 * This is a big messy function that using mostly
 * convoluted boolean logic determines the outgoing
 * direction for a step in a space filling curve
 * drawing step
 * @param x the x coordinate
 * @param y the y coordinate
 * @param from the inward direction
 * @param is_open_edge object containing edge (n, s, e, w)
 * status (open: true, closed: false) for the supersquare
 */
function outgoing_direction(x, y, from, is_open_edge) {
  // determine relative position of subgrid square on grid square
  const is_top = y % 2 === 0;
  const is_left = x % 2 === 0;
  // also express this as cardinals
  const vertical = is_top ? "n" : "s";
  const horizontal = is_left ? "w" : "e";

  // determine if it's coming from outside this supersquare
  const is_incoming = is_left && from === "w" || is_top && from === "n" || !is_left && from === "e" || !is_top && from === "s";
  // determine if its headed outside this supersquare
  // this gave me a big headache
  const is_outgoing = !!is_open_edge[vertical] && (from === opposite(vertical) || from === horizontal) || !!is_open_edge[horizontal] && (from === opposite(horizontal) || from === vertical);

  if (is_incoming !== is_outgoing) {
    // it's a straight line
    return opposite(from);
  } else {
    // it's a gay line
    const direction = ["n", "s"].includes(from) ? horizontal : vertical;
    return is_outgoing ? direction : opposite(direction);
  }
}

/**
 * Adapter to draw turtle graphics on a canvas
 * @param {CanvasRenderingContext2D} ctx the context of the canvas on which we'll be drawing
 */
function Turtle(ctx) {
  let cursorx = 0; // canvas coordinates
  let cursory = 0; // canvas coordinates
  let direction = 0; // degrees

  const begin = function (x, y) {
    // begin a path and place turtle cursor at its start
    cursorx = x;
    cursory = y;
    ctx.beginPath();
  };

  const step = function (size) {
    cursorx += size * Math.cos(direction * Math.PI / 180);
    cursory += size * Math.sin(direction * Math.PI / 180);
    ctx.lineTo(cursorx, cursory);
  };

  const lookAt = function (newdir) {
    direction = newdir;
  };

  const turn = function (amount) {
    direction += amount;
    direction %= 360;
  };

  const turnLeft = function () {
    turn(90);
  };

  const turnRight = function () {
    turn(-90);
  };

  const end = function () {
    ctx.closePath();
    ctx.stroke();
  };

  return {
    begin: begin,
    step: step,
    lookAt: lookAt,
    turn: turn,
    turnLeft: turnLeft,
    turnRight: turnRight,
    end: end
  };
}

function mapDirection(cardinal) {
  let newdir = 0;
  switch (cardinal) {
    case "n":
      newdir += 90;
    case "w":
      newdir += 90;
    case "s":
      newdir += 90;
    case "e":
      break;
    default:
      throw "Invalid direction value " + cardinal;
  } // riding with no breaks
  return newdir;
}

function drawDebuggingGrid(ctx) {
  // draw debugging grid
  ctx.lineWidth = 3;
  ctx.strokeStyle = "black";
  ctx.fillStyle = "black";
  ctx.font = "48px sans";
  for (let i = 0; i <= SIZE * 2; i += 1) {
    ctx.beginPath();
    ctx.fillText(`${i}`, -70, i);
    ctx.moveTo(0, i);
    ctx.lineTo(SIZE * 2, i);
    ctx.fillText(`${i}`, i, -70);
    ctx.moveTo(i, 0);
    ctx.lineTo(i, SIZE * 2);
    ctx.stroke();
  }
}

const MADOX = "#FF197F";
const params = new URLSearchParams(new URL(window.location).search);

const SIZE = parseInt(params.get("size")) || 15;
const COLOR = params.get("color") || MADOX;
const BGCOLOR = params.get("bgcolor") || "#fff";

function setupCanvas() {
  const canvas = document.getElementById("canvas");
  canvas.style.backgroundColor = BGCOLOR;
  const ctx = canvas.getContext("2d");
  const width = document.documentElement.clientWidth;
  const height = document.documentElement.clientHeight;
  ctx.canvas.width = width;
  ctx.canvas.height = height;
  ctx.resetTransform();
  ctx.translate(width / 2, height / 2);
  ctx.scale(0.25, 0.25);
}

function renderCurve(mst) {
  const ctx = document.getElementById("canvas").getContext("2d");
  ctx.lineWidth = 60;
  ctx.strokeStyle = COLOR;
  ctx.lineJoin = "round";

  const turtle = Turtle(ctx);

  const [startx, starty] = [SIZE, SIZE];
  let [x, y] = [startx, starty];
  let edges = mst.getEdgeValues([x, y].map(function (number) {
    return Math.floor(number / 2);
  }));

  // set starting incoming direction to a plausible one
  // if unable to pick an outer edge, we use an inner one
  let from = edges.n && "n" || edges.s && "s" || edges.e && "e" || edges.w && "w" || y % 2 === 0 ? "s" : "n";

  // initialize turtle graphics
  turtle.begin(x, y);
  turtle.lookAt(mapDirection(opposite(from)));

  // draw
  do {
    const to = outgoing_direction(x, y, from, edges);
    turtle.lookAt(mapDirection(to));
    turtle.step(80);

    switch (to) {
      case "n":
        y -= 1;
        break;
      case "s":
        y += 1;
        break;
      case "w":
        x -= 1;
        break;
      case "e":
        x += 1;
        break;
      default:
        throw "Invalid direction value";
    }

    from = opposite(to);
    edges = mst.getEdgeValues([x, y].map(function (number) {
      return Math.floor(number / 2);
    }));
  } while (startx !== x || starty !== y);

  turtle.end();
}

function generateCurve(h, v) {
  const lattice = Lattice(h, v);
  // fill the lattice with random integers
  lattice.fill(function () {
    return getRandomInt(0, Number.MAX_SAFE_INTEGER);
  });
  return prim(lattice);
}

const CURVE = generateCurve(SIZE, SIZE);

window.onresize = function () {
  setupCanvas();
  renderCurve(CURVE);
};

window.onload = function () {
  setupCanvas();
  renderCurve(CURVE);
};

},{"@tyriar/fibonacci-heap":2}],2:[function(require,module,exports){
"use strict";
/**
 * @license
 * Copyright Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var node_1 = require("./node");
var nodeListIterator_1 = require("./nodeListIterator");
var FibonacciHeap = /** @class */ (function () {
    function FibonacciHeap(compare) {
        this._minNode = null;
        this._nodeCount = 0;
        this._compare = compare ? compare : this._defaultCompare;
    }
    /**
     * Clears the heap's data, making it an empty heap.
     */
    FibonacciHeap.prototype.clear = function () {
        this._minNode = null;
        this._nodeCount = 0;
    };
    /**
     * Decreases a key of a node.
     * @param node The node to decrease the key of.
     * @param newKey The new key to assign to the node.
     */
    FibonacciHeap.prototype.decreaseKey = function (node, newKey) {
        if (!node) {
            throw new Error('Cannot decrease key of non-existent node');
        }
        if (this._compare({ key: newKey }, { key: node.key }) > 0) {
            throw new Error('New key is larger than old key');
        }
        node.key = newKey;
        var parent = node.parent;
        if (parent && this._compare(node, parent) < 0) {
            this._cut(node, parent, this._minNode);
            this._cascadingCut(parent, this._minNode);
        }
        if (this._compare(node, this._minNode) < 0) {
            this._minNode = node;
        }
    };
    /**
     * Deletes a node.
     * @param node The node to delete.
     */
    FibonacciHeap.prototype.delete = function (node) {
        // This is a special implementation of decreaseKey that sets the argument to
        // the minimum value. This is necessary to make generic keys work, since there
        // is no MIN_VALUE constant for generic types.
        var parent = node.parent;
        if (parent) {
            this._cut(node, parent, this._minNode);
            this._cascadingCut(parent, this._minNode);
        }
        this._minNode = node;
        this.extractMinimum();
    };
    /**
     * Extracts and returns the minimum node from the heap.
     * @return The heap's minimum node or null if the heap is empty.
     */
    FibonacciHeap.prototype.extractMinimum = function () {
        var extractedMin = this._minNode;
        if (extractedMin) {
            // Set parent to null for the minimum's children
            if (extractedMin.child) {
                var child = extractedMin.child;
                do {
                    child.parent = null;
                    child = child.next;
                } while (child !== extractedMin.child);
            }
            var nextInRootList = null;
            if (extractedMin.next !== extractedMin) {
                nextInRootList = extractedMin.next;
            }
            // Remove min from root list
            this._removeNodeFromList(extractedMin);
            this._nodeCount--;
            // Merge the children of the minimum node with the root list
            this._minNode = this._mergeLists(nextInRootList, extractedMin.child);
            if (this._minNode) {
                this._minNode = this._consolidate(this._minNode);
            }
        }
        return extractedMin;
    };
    /**
     * Returns the minimum node from the heap.
     * @return The heap's minimum node or null if the heap is empty.
     */
    FibonacciHeap.prototype.findMinimum = function () {
        return this._minNode;
    };
    /**
     * Inserts a new key-value pair into the heap.
     * @param key The key to insert.
     * @param value The value to insert.
     * @return node The inserted node.
     */
    FibonacciHeap.prototype.insert = function (key, value) {
        var node = new node_1.Node(key, value);
        this._minNode = this._mergeLists(this._minNode, node);
        this._nodeCount++;
        return node;
    };
    /**
     * @return Whether the heap is empty.
     */
    FibonacciHeap.prototype.isEmpty = function () {
        return this._minNode === null;
    };
    /**
     * @return The size of the heap.
     */
    FibonacciHeap.prototype.size = function () {
        if (this._minNode === null) {
            return 0;
        }
        return this._getNodeListSize(this._minNode);
    };
    /**
     * Joins another heap to this heap.
     * @param other The other heap.
     */
    FibonacciHeap.prototype.union = function (other) {
        this._minNode = this._mergeLists(this._minNode, other._minNode);
        this._nodeCount += other._nodeCount;
    };
    /**
     * Compares two nodes with each other.
     * @param a The first key to compare.
     * @param b The second key to compare.
     * @return -1, 0 or 1 if a < b, a == b or a > b respectively.
     */
    FibonacciHeap.prototype._defaultCompare = function (a, b) {
        if (a.key > b.key) {
            return 1;
        }
        if (a.key < b.key) {
            return -1;
        }
        return 0;
    };
    /**
     * Cut the link between a node and its parent, moving the node to the root list.
     * @param node The node being cut.
     * @param parent The parent of the node being cut.
     * @param minNode The minimum node in the root list.
     * @return The heap's new minimum node.
     */
    FibonacciHeap.prototype._cut = function (node, parent, minNode) {
        node.parent = null;
        parent.degree--;
        if (node.next === node) {
            parent.child = null;
        }
        else {
            parent.child = node.next;
        }
        this._removeNodeFromList(node);
        var newMinNode = this._mergeLists(minNode, node);
        node.isMarked = false;
        return newMinNode;
    };
    /**
     * Perform a cascading cut on a node; mark the node if it is not marked,
     * otherwise cut the node and perform a cascading cut on its parent.
     * @param node The node being considered to be cut.
     * @param minNode The minimum node in the root list.
     * @return The heap's new minimum node.
     */
    FibonacciHeap.prototype._cascadingCut = function (node, minNode) {
        var parent = node.parent;
        if (parent) {
            if (node.isMarked) {
                minNode = this._cut(node, parent, minNode);
                minNode = this._cascadingCut(parent, minNode);
            }
            else {
                node.isMarked = true;
            }
        }
        return minNode;
    };
    /**
     * Merge all trees of the same order together until there are no two trees of
     * the same order.
     * @param minNode The current minimum node.
     * @return The new minimum node.
     */
    FibonacciHeap.prototype._consolidate = function (minNode) {
        var aux = [];
        var it = new nodeListIterator_1.NodeListIterator(minNode);
        while (it.hasNext()) {
            var current = it.next();
            // If there exists another node with the same degree, merge them
            var auxCurrent = aux[current.degree];
            while (auxCurrent) {
                if (this._compare(current, auxCurrent) > 0) {
                    var temp = current;
                    current = auxCurrent;
                    auxCurrent = temp;
                }
                this._linkHeaps(auxCurrent, current);
                aux[current.degree] = null;
                current.degree++;
                auxCurrent = aux[current.degree];
            }
            aux[current.degree] = current;
        }
        var newMinNode = null;
        for (var i = 0; i < aux.length; i++) {
            var node = aux[i];
            if (node) {
                // Remove siblings before merging
                node.next = node;
                node.prev = node;
                newMinNode = this._mergeLists(newMinNode, node);
            }
        }
        return newMinNode;
    };
    /**
     * Removes a node from a node list.
     * @param node The node to remove.
     */
    FibonacciHeap.prototype._removeNodeFromList = function (node) {
        var prev = node.prev;
        var next = node.next;
        prev.next = next;
        next.prev = prev;
        node.next = node;
        node.prev = node;
    };
    /**
     * Links two heaps of the same order together.
     *
     * @private
     * @param max The heap with the larger root.
     * @param min The heap with the smaller root.
     */
    FibonacciHeap.prototype._linkHeaps = function (max, min) {
        this._removeNodeFromList(max);
        min.child = this._mergeLists(max, min.child);
        max.parent = min;
        max.isMarked = false;
    };
    /**
     * Merge two lists of nodes together.
     *
     * @private
     * @param a The first list to merge.
     * @param b The second list to merge.
     * @return The new minimum node from the two lists.
     */
    FibonacciHeap.prototype._mergeLists = function (a, b) {
        if (!a) {
            if (!b) {
                return null;
            }
            return b;
        }
        if (!b) {
            return a;
        }
        var temp = a.next;
        a.next = b.next;
        a.next.prev = a;
        b.next = temp;
        b.next.prev = b;
        return this._compare(a, b) < 0 ? a : b;
    };
    /**
     * Gets the size of a node list.
     * @param node A node within the node list.
     * @return The size of the node list.
     */
    FibonacciHeap.prototype._getNodeListSize = function (node) {
        var count = 0;
        var current = node;
        do {
            count++;
            if (current.child) {
                count += this._getNodeListSize(current.child);
            }
            current = current.next;
        } while (current !== node);
        return count;
    };
    return FibonacciHeap;
}());
exports.FibonacciHeap = FibonacciHeap;

},{"./node":3,"./nodeListIterator":4}],3:[function(require,module,exports){
"use strict";
/**
 * @license
 * Copyright Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var Node = /** @class */ (function () {
    function Node(key, value) {
        this.parent = null;
        this.child = null;
        this.degree = 0;
        this.isMarked = false;
        this.key = key;
        this.value = value;
        this.prev = this;
        this.next = this;
    }
    return Node;
}());
exports.Node = Node;

},{}],4:[function(require,module,exports){
"use strict";
/**
 * @license
 * Copyright Daniel Imms <http://www.growingwiththeweb.com>
 * Released under MIT license. See LICENSE in the project root for details.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var NodeListIterator = /** @class */ (function () {
    /**
     * Creates an Iterator used to simplify the consolidate() method. It works by
     * making a shallow copy of the nodes in the root list and iterating over the
     * shallow copy instead of the source as the source will be modified.
     * @param start A node from the root list.
     */
    function NodeListIterator(start) {
        this._index = -1;
        this._items = [];
        var current = start;
        do {
            this._items.push(current);
            current = current.next;
        } while (start !== current);
    }
    /**
     * @return Whether there is a next node in the iterator.
     */
    NodeListIterator.prototype.hasNext = function () {
        return this._index < this._items.length - 1;
    };
    /**
     * @return The next node.
     */
    NodeListIterator.prototype.next = function () {
        return this._items[++this._index];
    };
    return NodeListIterator;
}());
exports.NodeListIterator = NodeListIterator;

},{}]},{},[1]);
