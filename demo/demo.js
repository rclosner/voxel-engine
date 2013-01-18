var createGame = require('../lib/game')
var THREE = require('three')
var voxel = require('voxel')
var toolbar = require('toolbar')
var chunkSize = 32;
var chunkDistance = 2;
var width = chunkSize * 2 * chunkDistance;
window.blockSelector = toolbar({el: '#tools'})
var skin = require('minecraft-skin')

var ORIGIN = {
  latitude:  37.77559,
  longitude: -122.41391
}

var GEO_NODES = [
  { latitude: 37.77559, longitude: -122.41391, elevation: 0.7 },
  { latitude: 37.7747870, longitude: -122.4083100, elevation: 0.1 },
  { latitude: 37.771, longitude: -122.4073, elevation: 0.1 }
]

var LATITUDE_TO_METERS  = 110992;
var LONGITUDE_TO_METERS = 88099;

function scale( x, fromLow, fromHigh, toLow, toHigh ) {
  return ( x - fromLow ) * ( toHigh - toLow ) / ( fromHigh - fromLow ) + toLow
}

var geo_to_geom = function (node) {
  var x = (ORIGIN.latitude - node.latitude) * LATITUDE_TO_METERS * 10000;
  var z = (ORIGIN.longitude - node.longitude) * LONGITUDE_TO_METERS * 10000;
  x = scale(x, -180 * LATITUDE_TO_METERS, 180 * LATITUDE_TO_METERS, 0,  width);
  z = scale(z, -180 * LONGITUDE_TO_METERS, 180 * LONGITUDE_TO_METERS, 0, width);

  return { x: Math.floor(x), y: node.elevation, z: Math.floor(z) }
}

window.NODES = new Int8Array(width * width);

for (var i = 0; i < GEO_NODES.length; i++) {
  var node  = geo_to_geom(GEO_NODES[i]);
  var index = node.x + node.z * width;
  console.log(index)
  var y = ~~scale(node.y, 0, 1, 0, width)
  console.log(y)
  window.NODES[index] = y;
}

var fromLow = chunkSize * -chunkDistance;
var toHigh  = chunkSize * chunkDistance;

var osm_generator = function (x,y,z,n) {
  x = scale(x, fromLow, toHigh, 0, width);
  z = scale(z, fromLow, toHigh, 0, width);
  y = scale(y, fromLow, toHigh, 0, width);

  var index = x + z * width

  if (NODES[index]) {
    var node = NODES[index];
    if (node == y) return 1; 
  } else {
    return 0; 
  }
}

window.game = createGame({
  generate: osm_generator,
  texturePath: '/textures/',
  materials: ['grass', 'brick', 'dirt', 'obsidian', 'crate'],
  cubeSize: 25,
  chunkSize: chunkSize,
  chunkDistance: chunkDistance,
  startingPosition: [35, 100, 35],
  worldOrigin: [0,0,0],
  controlOptions: {jump: 6}
})

window.game.on("tick", function () {
  game.controls.gravityEnabled = false;
});
window.viking = skin(game.THREE, 'viking.png').createPlayerObject()
viking.position.y = 60
game.scene.add(viking)
var currentMaterial = 1

blockSelector.on('select', function(material) {
  var idx = game.materials.indexOf(material)
  if (idx > -1) currentMaterial = idx + 1
})

game.on('collision', function (item) {
  incrementBlockTally()
  game.removeItem(item)
})

function createDebris (pos, value) {
  var mesh = new THREE.Mesh(
    new THREE.CubeGeometry(4, 4, 4),
    game.material
  )
  mesh.geometry.faces.forEach(function (face) {
    face.materialIndex = value - 1
  })
  mesh.translateX(pos.x)
  mesh.translateY(pos.y)
  mesh.translateZ(pos.z)
  
  return {
    mesh: mesh,
    size: 4,
    collisionRadius: 22,
    value: value
  }
}

function explode (pos, value) {
  if (!value) return
  var item = createDebris(pos, value)
  item.velocity = {
    x: (Math.random() * 2 - 1) * 0.05,
    y: (Math.random() * 2 - 1) * 0.05,
    z: (Math.random() * 2 - 1) * 0.05,
  }
  game.addItem(item)
  setTimeout(function (item) {
    game.removeItem(item)
  }, 15 * 1000 + Math.random() * 15 * 1000, item)
}

game.appendTo('#container')

var tally = document.querySelector('.tally .count')
function incrementBlockTally() {
  var c = +tally.innerText
  ++c
  tally.innerText = c
}

game.on('mousedown', function (pos) {
  var cid = game.voxels.chunkAtPosition(pos)
  var vid = game.voxels.voxelAtPosition(pos)
  if (erase) {
    explode(pos, game.getBlock(pos))
    game.setBlock(pos, 0)
  } else {
    game.createBlock(pos, currentMaterial)
  }
})

var erase = true
window.addEventListener('keydown', function (ev) {
  if (ev.keyCode === 'X'.charCodeAt(0)) {
    erase = !erase
  }
})

function ctrlToggle (ev) { erase = !ev.ctrlKey }
window.addEventListener('keyup', ctrlToggle)
window.addEventListener('keydown', ctrlToggle)

var container = document.querySelector('#container')
container.addEventListener('click', function() {
  game.requestPointerLock(container)
})
