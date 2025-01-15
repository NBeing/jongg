// Dependencies
var log = require('loglevel');
const { vec2 } =  require("gl-matrix")
// Make sure the css is loaded onto the page! (See webpack config)
require("./styles/style.css")

//Shaders and Assets
const fragmentShaderText = require("./shaders/fragment.glsl").default
const vertexShaderText = require("./shaders/vertex.glsl").default
const colorFragmentShaderText = require("./shaders/color_fragment.glsl").default
const colorVertexShaderText = require("./shaders/color_vertex.glsl").default

// Random VSAV Sprite for testing textures
// const spriteImg = require("./img/sprite.png")
const spriteImg = require("./img/buttjeans.png")
const thinstitch = require("./img/thinstitch_2.png")

// Audio 
const revhis_frozen_area = require("./sound/REVHIS_Frozen_Area.mp3").default
const nbeing_virus = require("./sound/nbeing-love_my_virus.mp3").default
const conway_jeans = require("./sound/conway_twitty-jeans.mp3").default

// Globals

let gl = null 
let global_image = null;
let playing = null
let isPaused = false
let reinitialize = false
let _APP
log.setLevel("info")
function sleep(ms) {
 return new Promise(resolve => setTimeout(resolve, ms));
}
async function tempAlert(msg,duration){
 var el = document.createElement("div");
 el.setAttribute("style","position:absolute;top:40%;left:20%;background-color:white;");
 el.innerHTML = msg;
 document.body.appendChild(el);
 sleep(duration)
 el.parentNode.removeChild(el);

}
/*
What are the steps!?
1) Create a shader, compile, link, etc
2) useProgram (make the shader active)
3) get locations of all the uniforms and attributes
4) set all of the values for uniforms
5) set the position data for our position attribute 
6) draw

Goals for Thursday
- Make sure we are passing uniforms correctly
- Learn how to pass different attributes to different objects i.e. change positch
- Start building an abstraction to game elements
*/

// We will need this once we start trying to test texture mapping
const loadImage = () => new Promise(resolve => {
  const image = new Image()
  image.addEventListener('load', () => resolve(image))
  image.src = spriteImg
  // console.log("Loaded Image", image)
  global_image = image
})


class BaseShader {
  commonAttributeNames = ["a_position", "a_texCoord"]
  commonUniformNames = [
    // {name: "u_color"        , type: "uniform4fv" },
    {name: "u_resolution"   , type: "vec2" },
    {name : "diffuseTexture", type: 'texture'},
    // {name: "u_translation"  , type: "uniform2fv" }, 
    // {name: "u_rotation"     , type: "uniform2fv" },
    // {name: "u_scale"        , type: "uniform2fv" },
    // {name: "u_time"         , type: "uniform1f"  }
  ]

  constructor(vertexShaderSource, fragmentShaderSource) {
    this.initialize(vertexShaderSource, fragmentShaderSource)
  }

  initialize(vertexShaderSource, fragmentShaderSource) {
    try {
      const vertexShader    = this.createShader(gl.VERTEX_SHADER,   vertexShaderSource   )
      const fragmentShader  = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource )

      this._shaderProgram = this.createProgramAttachShadersAndLink(vertexShader, fragmentShader)
      this.uniformLocations = this.retrieveUniformLocationsFromGL(this.commonUniformNames)
      this.attributeLocations = this.retrieveAttributeLocationsFromGL(this.commonAttributeNames)

    } catch(e){
      console.log("Error initializing shader", e)
    }
  }
  createShader(type, source) {
    let shader = gl.createShader(type)
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS)
    if (success) {
      return shader
    }
    console.log("Create shader error! ", gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
  }
  createProgramAttachShadersAndLink(vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    
    let success = gl.getProgramParameter(program, gl.LINK_STATUS)
    if (success) {
      return program
    }
    console.log("Create program error! ", gl.getProgramInfoLog(program))
    gl.deleteProgram(program)
  }
  // right here we just want to set the locations for the uniform
  // the particular shader class will set the values
  retrieveUniformLocationsFromGL(_uniforms) {
    return _uniforms.reduce((acc, cur) => {
      console.log("Retrieving uniform!", acc, cur)
      const location =  gl.getUniformLocation(this._shaderProgram, cur.name)
      if(location < 0){
        console.log(`ERROR: No location for uniform ${cur.name}`)
      }
      acc[cur.name] = {
        name: cur.name,
        type: cur.type,
        location,
      }
      return acc
    }, {})
  }
  // maybe move this outta here into the particular shader
  setBuffers(_attributes) {
    return _attributes.reduce((acc, cur) => {
      acc[cur] = {
        name: cur,
        location: gl.createBuffer()
      }
      return acc
    }, {})
  }
  retrieveAttributeLocationsFromGL(_attributes) {
    return _attributes.reduce((acc, cur) => {
      const location =  gl.getAttribLocation(this._shaderProgram, cur)
      if(location < 0){
        console.log(`ERROR: No location for uniform ${cur}`)
      }

      acc[cur] = {
        name: cur,
        location,
      }
      return acc
    }, {})

  }
  bind() {
    gl.useProgram(this._shaderProgram);
  }
}
class Texture {
  constructor() {
  }

  Load(src) {
    this._name = src;
    this._Load(src);
    return this;
  }

  _Load(src) {
    this._texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
                  1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                  new Uint8Array([0, 0, 255, 255]));

    const img = new Image();
    img.src = src;
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this._texture);
      gl.texImage2D(gl.TEXTURE_2D, 0 , gl.RGB, img.width,img.height,0, gl.RGB, gl.UNSIGNED_BYTE, img)
      // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);  
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.bindTexture(gl.TEXTURE_2D, null);
    };
  }

  Bind(index) {
    if (!this._texture) {
      return;
    }
    gl.activeTexture(gl.TEXTURE0 + index);
    gl.bindTexture(gl.TEXTURE_2D, this._texture);
  }

  Unbind() {
    gl.bindTexture(gl.TEXTURE_2D, null);
  }
}


class ShaderInstance {
  constructor(baseShader){
    // our job in this class is to set up the shader values
    // we should already have gotten the locations where webgl expects the data
    // from the base shader class
    this._baseShader = baseShader
    this._uniforms = {}
    for (let uniformName in baseShader.uniformLocations) {
      this._uniforms[uniformName] = {
        location: baseShader.uniformLocations[uniformName].location,
        type: baseShader.uniformLocations[uniformName].type,
        value: null
      };
    }
    this._attributes = {...baseShader.attributeLocations};
  }
  setUniformValueByName( _name, value){
    try {
      let { type , location} = this._baseShader.uniformLocations[_name]
      gl[type](location, value)
    } catch (e){
      console.log(`Unable to set uniform value: ${_name} ${value}`)
    }
  }
  // setMat4(name, m) {
  //   this._uniforms[name].value = m;
  // }

  // setMat3(name, m) {
  //   this._uniforms[name].value = m;
  // }

  // setVec4(name, v) {
  //   this._uniforms[name].value = v;
  // }

  // setVec3(name, v) {
  //   this._uniforms[name].value = v;
  // }

  setVec2(name, v) {
    this._uniforms[name].value = v;
  }

  setTexture(name, t) {
    this._uniforms[name].value = t;
  }
  bind(constants) {
    this._baseShader.bind();

    let textureIndex = 0;
    // basically here we are setting the uniforms from a list of constants
    for (let nameOfUniform in this._uniforms) {
      log.debug("Trying to set uniform", nameOfUniform)
      const uniform_local_to_this_shader_instance = this._uniforms[nameOfUniform];

      let value = constants[nameOfUniform];
      if (uniform_local_to_this_shader_instance.value) {
        log.debug("Got value for uniform", uniform_local_to_this_shader_instance.value)
        value = uniform_local_to_this_shader_instance.value;
      }

      if (value && uniform_local_to_this_shader_instance.location) {
        const t = uniform_local_to_this_shader_instance.type;

        if (t == 'mat4') {
          gl.uniformMatrix4fv(uniform_local_to_this_shader_instance.location, false, value);
        } else if (t == 'mat3') {
          gl.uniformMatrix3fv(uniform_local_to_this_shader_instance.location, false, value);
        } else if (t == 'vec4') {
          gl.uniform4fv(uniform_local_to_this_shader_instance.location, value);
        } else if (t == 'vec3') {
          gl.uniform3fv(uniform_local_to_this_shader_instance.location, value);
        } else if (t == 'vec2') {
          gl.uniform2fv(uniform_local_to_this_shader_instance.location, value);
        } else if (t == 'texture') {
          value.Bind(textureIndex);
          gl.uniform1i(uniform_local_to_this_shader_instance.location, textureIndex);
          textureIndex++;
        }
      }
    }
  }
}


class BasePoly {
  constructor(){
    this._buffers = {}
    this._onInit();
  }

  setBufferData(sizeandData, name){
    if (name == 'index') {
        sizeandData.buffer = gl.createBuffer();
        log.trace("Index buffer bound!")
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sizeandData.buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sizeandData.data), gl.STATIC_DRAW);
    } else {
      // Called like: this.setBufferData({size: 3, data: positions}, 'positions');
      log.trace("Buffer bound!", name, sizeandData)
      sizeandData.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeandData.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizeandData.data), gl.STATIC_DRAW);
    }

    this._buffers[name] = sizeandData;
  }
  performBindingForShader(shader) {
    // we look through all of the buffers (i.e. data we have set for this poly)
    // and we want to see if the particular shader needs some of this data
    // so we search for it
    // Some of the pieces of data will be irrelevant to this (fragment?) shader 
    for (let nameOfAttribute in this._buffers) {
      if (shader._attributes[nameOfAttribute] == -1) {
        continue;
      }
      const bufferObject = this._buffers[nameOfAttribute];
      if (nameOfAttribute == 'index') {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bufferObject.buffer);
      } else {
        log.trace("Binding for shader!", shader, bufferObject)
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferObject.buffer);
        gl.vertexAttribPointer(
          shader._attributes[nameOfAttribute].location, 
          bufferObject.size, 
          gl.FLOAT, 
          false, 0, 0);
        log.trace("enable attrib arr!", nameOfAttribute, shader._attributes[nameOfAttribute])
        gl.enableVertexAttribArray(shader._attributes[nameOfAttribute].location);
      }
    }  
  }
  drawElements(){
      log.trace("drawing elements!", this._buffers)
      const vertexCount = this._buffers.index.data.length;
      gl.drawElements(gl.TRIANGLES, vertexCount, gl.UNSIGNED_SHORT, 0);

  }
}
// The poly instance class will call the draw elements of basepoly under the hood
// individual shapes will extend this class and those extended classes will mostly
// just set buffer data, so binding and drawing can be done by the base class
// this._quadPoint = new MeshInstance(
//   new Quad(),
//   {light: new ShaderInstance(this._shaders['post-quad-point'])});
class PolyInstance {
  constructor(basePoly, shaders, shaderParams){
    this._basePoly = basePoly
    this._shaders = shaders

    shaderParams = shaderParams || {};
    for (let sk in shaders) {
      const s = shaders[sk];
      for (let k in shaderParams) {
        s.setTexture(k, shaderParams[k]);
      }  
    }

    this._position = vec2.create();
    this._scale = vec2.fromValues(1, 1, 1);
  }
  SetPosition(x, y) {
    vec2.set(this._position, x, y);
  }
  SetScale(x, y) {
    vec2.set(this._scale, x, y);
  }

  // this is where we should be setting the uniforms we need
  bind(constants, shaderName){
    // we're actually choosing which shader here in case w want to multipass
    // we don't actually multipass in this engine rn since 2d
    // to be clear this is a shader instance
    const shader  = this._shaders[shaderName]
    // console.log("Polyinstance", 
    //   this._basePoly.setBufferData({size: 2, data: positions}, 'a_position')
    // )
    // shader.setVec2('a_position', this._position)
    // // These setters methods here are uniforms
    // s.SetMat4('modelViewMatrix', modelViewMatrix);
    // s.SetMat4('modelMatrix', modelMatrix);
    // s.SetMat3('normalMatrix', normalMatrix);

    // bind the shader! i.e. set the uniforms for that shader
    shader.bind(constants);
    // bind the mesh!         
    // in other words fill the data here!
    // GL.vertexAttribPointer(shader._attribs[k], b.size, GL.FLOAT, false, 0, 0);
    this._basePoly.performBindingForShader(shader)
  }
  draw(){
    this._basePoly.drawElements()
  }
}

class Rect extends BasePoly {
  constructor() {
    super();
    this.isColliding = false
  }
  getBoundingBoxTopLeftAndBottomRight(){
    return this.bounds
  }
  update(x, y, width, height){
    this.bounds = {
      topLeft     : [x,y],
      bottomRight : [x+width, y+height]
    }    
    // The getrectpositions function below should be refactored
    // To take advantage of TL + BR data
    const _positions = this.getRectanglePositionsElementArr(
      x, y,width, height
    )
    const positions =  new Float32Array(_positions);
    
    const indices = new Uint8Array([
      0,1,2,
      3,1,2,
    ])
    const uvs = new Float32Array([
      0,0,
      1,0,
      0,1,
      1,1,
      1,0,
      0,1,
    ]);
    
    this.setBufferData({size: 2, data: uvs}, 'a_texCoord');
    this.setBufferData({size: 2, data: positions}, 'a_position');
    this.setBufferData({data: indices}, 'index');
  }

  getRectanglePositionsElementArr(x, y, width, height) {
    let x1 = x; // 0
    let x2 = x + width; // canvas width

    let y1 = y; // 0
    let y2 = y + height; // canvas height
    return [
      x1, y1, // 0,0
      x2, y1, // width, 0
      x1, y2, // 0, height    
      x2, y2 // width height
    ]
  }
  _onInit() {
    this.update(0,0,0,0);
  }
  boundsToRange() {
    const { topLeft: tl, bottomRight: br} = this.bounds;
    return {
      x: {
        min: tl[0],
        max: br[0]
      },
      y: {
        min: tl[1],
        max: br[1]
      }
    }
  }
  // rangeWouldIntersect(anotherPoly, delta){
  //   const x = delta[0]
  //   const y = delta[1]
  // }
  intersects( anotherPoly ){
    const selfRange = this.boundsToRange();
    const anotherRange = anotherPoly.boundsToRange();
    const yIntersect = 
    (
      selfRange.y.max >= anotherRange.y.min &&
      selfRange.y.min <= anotherRange.y.min 
    ) || 
    (
      selfRange.y.min <= anotherRange.y.max && 
      selfRange.y.max >= anotherRange.y.max
    ) ||
    (
      selfRange.y.min >= anotherRange.y.min &&
      selfRange.y.max <= anotherRange.y.max
    );  
    const xIntersect = 
    (
      selfRange.x.min <= anotherRange.x.min && 
      selfRange.x.max >= anotherRange.x.min
    )
    ||
    (
      selfRange.x.min <= anotherRange.x.max && 
      selfRange.x.max >= anotherRange.x.max
    )
    ||
    (
      selfRange.x.min >= anotherRange.x.min &&
      selfRange.x.max <= anotherRange.x.max
    );

    return {
      intersects: xIntersect && yIntersect,
      xIntersect , 
      yIntersect 
    }
  }
}

class Circle extends BasePoly {
  constructor() {
    super();
  }
  update(x, y, width, height){
    const positions =  new Float32Array(
      this.getRectanglePositionsElementArr(
        x, y,width, height
      )
    );
    const indices = new Uint8Array([
      0,1,2,
      3,1,2,
    ])
    this.setBufferData({size: 2, data: positions}, 'a_position');
    this.setBufferData({data: indices}, 'index');
  }

  getRectanglePositionsElementArr(x, y, width, height) {


    let x1 = x; // 0
    let x2 = x + width; // canvas width

    let y1 = y; // 0
    let y2 = y + height; // canvas height
    return [
      x1, y1, // 0,0
      x2, y1, // width, 0
      x1, y2, // 0, height    
      x2, y2 // width height
    ]
  }
  _onInit() {
    const positions =  new Float32Array(
      this.getRectanglePositionsElementArr(
        0,0,0,0 
      )
    );
    const indices = new Uint8Array([
      0,1,2,
      3,1,2,
    ])
    this.setBufferData({size: 2, data: positions}, 'a_position');
    this.setBufferData({data: indices}, 'index');
  }
}

class Renderer {
  constructor() {
    this.init()
    this.frameCount = 0
    this.last_id = 0
  }
  init() {
    this._canvas = document.createElement('canvas');
    
    document.body.appendChild(this._canvas);
    
    gl = this._canvas.getContext('webgl2', { preserveDrawingBuffer: true });
    this._canvas.style.width = "100%"
    this._canvas.style.height = "100%"
    
    if (gl === null) {
      alert("Unable to initialize WebGL. Your browser or machine may not support it.");
      return;
    }
    
    this._constants = {};
    this._shaders = {};
    this._textures = {};
    this._textures['test-diffuse'] = new Texture().Load(spriteImg);
    this._textures['stitch'] = new Texture().Load(thinstitch);
    
    // what do we expect to be done at this point?
    // We expect above that the canvas has been created
    // We expect that base shader has created a program! (linked and compiled the shaders)
    // We should now have to populate it with data
    this._shaders['simple_shader'] = new BaseShader(vertexShaderText, fragmentShaderText);
    this._shaders['color_shader'] = new BaseShader(colorVertexShaderText, colorFragmentShaderText);

    // this._quadDirectional = new PolyInstance(
    //   new Rect(),
    //   {a_position: new ShaderInstance(this._shaders['simple_shader'])});
      
      this._polys = {};
      this.resize(gl.canvas)
    }
    clearAndSetViewport() {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.enable(gl.BLEND)
      gl.enable(gl.DEPTH_TEST);
      gl.depthMask(true);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth = canvas.clientWidth
    const displayHeight = canvas.clientHeight

    // Check if the canvas is not the same size.
    const needResize = canvas.width !== displayWidth ||
      canvas.height !== displayHeight;

    if (needResize) {
      // Make the canvas the same size
      canvas.width = displayWidth
      canvas.height = displayHeight
    }
    gl.viewport(0, 0, canvas.width, canvas.height);

    return needResize;
  }
  createPolyInstance(_poly, shaderParams, shaderInstance, name = this.last_id) {
    console.log("Creating", name)
    const params = {};
    for (let k in shaderParams.params) {
      params[k] = this._textures[shaderParams.params[k]];
    }
    // Params will end up looking like.....
    //   {
    //     "diffuseTexture": {
    //         "_name": "./resources/worn-bumpy-rock-albedo-1024.png",
    //         "_texture": {} // WebGLTexture
    //     },
    //     ...
    // }

    const poly = new PolyInstance(
        _poly,
        {
          simple_shader: shaderInstance,
          // We may have multiple shaders here for eventual multipass
          // colour: new ShaderInstance(this._shaders[shaderParams.shader])
        }, 
        // shader params
        params
      );
      this._polys[name] = poly
      this.last_id++
  
    return poly;
  }

  render(timeElapsed, frameCount) {
    if(frameCount % 2 == 0){
      this.clearAndSetViewport()
    }
    this._constants['u_resolution'] = vec2.fromValues(
        window.innerWidth, window.innerHeight);
    // this._polys is a PolyInstance
    // console.log("Polys?", this._polys)
    Object.keys(this._polys).forEach((polyName, i) => {
      let poly = this._polys[polyName] 
      poly.bind(this._constants, 'simple_shader');
      poly.draw();

    })
    // reset program and texture
    // gl.useProgram(null);
    // gl.bindTexture(gl.TEXTURE_2D, null);
  }
}

class TheScene {
  constructor( config){
    this._prepareDomEventsRenderLoopAndInitialize()
  }
  setState(config){
    this.paused = false
    this.canPlayAudio = false
    this.frameCount = 0
    this.winCondition = config.winCondition || true
    this.devMode = config.devMode || false
    this.defaultBallSpeed = config.defaultBallSpeed || 7
    this.defaultBallSize = config.defaultBallSize || 12
    this.defaultPaddleSpeed = config.defaultPaddleSpeed || 20
    this.defaultPaddleOffset = config.defaultPaddleOffset || 30
    this.defaultPaddleWidth = config.defaultPaddleWidth || 8
    this.defaultPaddleHeight = config.defaultPaddleHeight || (gl.canvas.height / 5)
    this.defaultBallPosition = config.defaultBallPosition || vec2.fromValues(gl.canvas.width/2, gl.canvas.height/2)
    this.state = {
      p1 : {
        xPos: this.defaultPaddleOffset, 
        yPos: (gl.canvas.height / 2) - (this.defaultPaddleHeight / 2), 
        height: this.defaultPaddleHeight,
        width: this.defaultPaddleWidth,
        joystickPosition: null,
        acceleration: 0,
        velocity: 0,
        paddleSpeed: this.defaultPaddleSpeed,
        moving: 'none',
        lives: 3
      },
      p2 : {
        xPos: gl.canvas.width - this.defaultPaddleOffset - this.defaultPaddleWidth, 
        yPos: (gl.canvas.height / 2) - (this.defaultPaddleHeight / 2), 
        height: this.defaultPaddleHeight,
        width: this.defaultPaddleWidth,
        joystickPosition: null,
        acceleration: 0,
        velocity: 0,
        paddleSpeed: this.defaultPaddleSpeed,
        moving: 'none',
        lives: 3
      },
      ball: {
        size: this.defaultBallSize,
        position: this.defaultBallPosition,
        // position: vec2.fromValues(20,20),
        velocity: this.setDefaultBallDirectionVector(),
        acceleration: vec2.fromValues(0, 0),
        direction: vec2.fromValues(0, 1) ,
        lastBounced: 0
      },
      game: {
        offset: 30,
        resetCounter: 0,
      }
    }
  }
  setDefaultBallDirectionVector = () => {
    const negativeOneOrOne = () => Math.random() >= 0.5 ? 1 : -1
    let dir = vec2.fromValues(negativeOneOrOne(), negativeOneOrOne())

    const speed = vec2.fromValues(
      Math.random() * this.defaultBallSpeed + 2, 
      Math.random() * this.defaultBallSpeed + 2
    )
    vec2.multiply(dir, dir, speed)
    return dir
  }

  _reinit(config){
    this.setState(config)
    this.createPolys();
    // this.registerKeyHandler()
    // this.handleAudioInit()
    
  }
  _init(config) {
    this.setState(config)
    this.createPolys();
    this.registerKeyHandler()
    this.handleAudioInit()

  }
  parsePositionFromInput(position){
    console.log("position", position)
    let player;
    if(position.includes("$p1_newPos:")){
      player = 1;
    } else if(position.includes("$p2_newPos:")){
      player = 2
    } else {
      console.log("ERROR: invalid command:", position)
      return;
    }
    let pos = position.replace(`$p${player}_newPos:`, "")

    pos = parseInt(pos)
    let playerState = this.state[`p${player}`] 
    if(pos == null){
      playerState.joystickPosition = pos
    } else if( pos > playerState.joystickPosition ){
      playerState.joystickPosition = pos
      playerState.moving = "up"
    } else if ( pos < playerState.joystickPosition ){
      playerState.joystickPosition = pos
      playerState.moving = "down"
    } else {
      playerState.moving = "none"
    }
  }
  // setLastJoystickPos(player, position){
  //   if(position.includes("$p1_newPos:")){
  //     let pos = position.replace("$p1_newPos:", "")
  //     pos = parseInt(pos)
  //     if(pos == null){
  //       this.state.p1.joystickPosition = pos
  //     } else if( pos > this.state.p1.joystickPosition ){
  //       this.state.p1.joystickPosition = pos
  //       // this.state.p1.yPos = this.state.p1.yPos + 10;
  //       this.state.p1.moving = "up"
  //     } else if ( pos < this.state.p1.joystickPosition ){
  //       this.state.p1.joystickPosition = pos
  //       this.state.p1.moving = "down"
  //       // this.state.p1.yPos = this.state.p1.yPos - 10;        
  //     } else {
  //       this.state.p1.moving = "none"
  //     }
  //   }
  // }
  playBGM(){
    const bgm = new Audio(conway_jeans);
    this.audio = bgm
    bgm.play()
        .then(() => {
            clearInterval(tryToPlay);
        })
        .catch(error => {
            console.info('User has not interacted with document yet.');
        });

  }
  async handleAudioInit(){
    try{
      const canWePlayAudio = setInterval(() => {
        if (navigator.userActivation.isActive) {
          // proceed to request playing media, for example
          clearInterval(canWePlayAudio)
          this.playBGM()
        }
    }, 200);
} catch (e){
  console.log("Error loading audio", e)
}
    // bgm.onplay()
  }
  registerKeyHandler(){
    window.addEventListener("keydown", (event) => {
      // event.preventDefault()
      if (event.defaultPrevented) {
        return; // Do nothing if the event was already processed
      }
    
      switch (event.key) {
        case "ArrowDown":
          console.log("ArrowDown")
          // this.state.p1.yPos = this.state.p1.yPos + 5;
          this.state.ball.position[1] = this.state.ball.position[1] + 5
          // this.state.ball.velocity = vec2.fromValues(0,0)          
          break;
        case "ArrowUp":
          console.log("ArrowUp")
          // this.state.p1.yPos = this.state.p1.yPos - 5;
          this.state.ball.position[1] = this.state.ball.position[1] - 5
          // this.state.ball.velocity = vec2.fromValues(0,0)          

          break;
        case "ArrowLeft":
          console.log("ArrowUp")
          // this.state.p2.yPos = this.state.p2.yPos - 5
          this.state.ball.position[0] = this.state.ball.position[0] - 5
          // this.state.ball.velocity = vec2.fromValues(0,0)          

          break;
        case "ArrowRight":
          // this.state.p2.yPos = this.state.p2.yPos + 5
          this.state.ball.position[0] = this.state.ball.position[0] + 5
          // this.state.ball.velocity = vec2.fromValues(0,0)          
          break;
        case "p":
          this.paused = !this.paused
          break;
        case "r":
          reinitialize = true
          console.log("Reinitialize!")
          this._reinit({    
            winCondition: false,
            devMode: true
          })
          reinitialize = false      
          break;

        default:
          console.log("Pressed: ", event.key)
          return; // Quit when this doesn't handle the key event.
      }
      this._polys["ball"]._basePoly.update(this.state.ball.position[0], this.state.ball.position[1], this.state.ball.size, this.state.ball.size)

      // Cancel the default action to avoid it being handled twice
      event.preventDefault();
    }, true);
    
  }
  bounceBallVelocity(x_or_y){
      if(x_or_y == 'x'){
      vec2.multiply(
        this.state.ball.velocity,
        this.state.ball.velocity, 
        vec2.fromValues(-1,1)
      )  
    } else {
      vec2.multiply(
        this.state.ball.velocity,
        this.state.ball.velocity, 
        vec2.fromValues(1,-1)
      )
    }
    this.lastBounced = this.frameCount;
  }
  handlePaddleUpdate(player, paddle){
    if(this.state[`p${player}`].moving !== "none"){

      this.state[`p${player}`].velocity = this.state[`p${player}`].moving == "up" 
        ? (-1 * this.state[`p${player}`].paddleSpeed) 
        :  this.state[`p${player}`].paddleSpeed

      } else {

        this.state[`p${player}`].velocity = 0

      }

      if(

        paddle.boundsToRange().y.max >= gl.canvas.height && 
        this.state[`p${player}`].moving == "down"

      ){
      this.state[`p${player}`].velocity = 0
    } else if(
      paddle.boundsToRange().y.min <= 0 && 
      this.state[`p${player}`].moving == "up"){
      this.state[`p${player}`].velocity = 0
    }

    this.state[`p${player}`].moving = "none"
    this.state[`p${player}`].yPos = this.state[`p${player}`].yPos + this.state[`p${player}`].velocity
    
    paddle.update(
      this.state[`p${player}`].xPos,
      this.state[`p${player}`].yPos,
      this.state[`p${player}`].width, 
      this.state[`p${player}`].height
    )
  }
  async update(){
    if(this.paused){
      return
    }
    const background = this._polys["background"]._basePoly
    const p1_paddle = this._polys["p1_paddle"]._basePoly
    const p2_paddle = this._polys["p2_paddle"]._basePoly
    const ball = this._polys["ball"]._basePoly
    background.update(0,0, gl.canvas.width, gl.canvas.height)

    this.handlePaddleUpdate(1, p1_paddle)
    this.handlePaddleUpdate(2, p2_paddle)

    
    // function range(size, startAt = 0) {
    //   if(startAt < 0 ){
    //     let arr = [];
    //     let counter = -1
    //     //ok so we get size it could be a negative number
    //     // we wanna 
    //     while( counter >= startAt){
    //       arr.push(counter)
    //       counter--
    //     }

    //     return arr
    //   } else {
    //     return [...Array(size).keys()].map(i => i + 1);

    //   }
    // }
    // const getDeltasToCheck = () => {
    //   const getSign = x => x > 0 ? 1 : -1
      
    //   const xSteps = range(
    //     Math.abs(Math.ceil(this.state.ball.velocity[0])),
    //     Math.round(this.state.ball.velocity[0])
    //   )
    //   const ySteps = range(
    //     Math.abs(Math.ceil(this.state.ball.velocity[1])),
    //     Math.round(this.state.ball.velocity[1])
    //   )

    //   return [xSteps, ySteps]
    
    // }
    if(this.state.ball.position[0] >= gl.canvas.width){
      this.state.p2.lives--;
      // this.bounceBallVelocity('x', true)
      // await tempAlert("Player 1 wins!", 3000)
      // this._reinit({
      //   winCondition: false,
      //   devMode: true
      // })
      // isPaused = true
      // sleep(1000)
      // isPaused = false
      // cancelAnimationFrame(playing);
      console.log("positch", this.state.ball.position, "default", this.defaultBallPosition)

      this.state.ball.position = vec2.fromValues(gl.canvas.width/2, gl.canvas.height/2)
      this.state.ball.velocity = this.setDefaultBallDirectionVector()
      ball.update(this.state.ball.position[0], this.state.ball.position[1], this.state.ball.size, this.state.ball.size )
      return;

    } else if(this.state.ball.position[0] <= 0){
      // cancelAnimationFrame(playing);
      // this.state.p1.lives--;
      // this.bounceBallVelocity('x', true)
      // await tempAlert("Player 1 wins!", 3000)
      // this._reinit({
      //   winCondition: false,
      //   devMode: true
      // })
      // isPaused = true
      // sleep(1000)
      // isPaused = false
      console.log("positch", this.state.ball.position, "default", this.defaultBallPosition)
      this.state.ball.position = vec2.fromValues(gl.canvas.width/2, gl.canvas.height/2)
      this.state.ball.velocity = this.setDefaultBallDirectionVector()

      ball.update(this.state.ball.position[0], this.state.ball.position[1], this.state.ball.size, this.state.ball.size )
      return;
    }
    
    if (
      this.state.ball.position[1] >= gl.canvas.height || 
      this.state.ball.position[1] <= 0
    ){

      this.bounceBallVelocity('y', true)
    }
    // const [xSteps, ySteps] = getDeltasToCheck()
    // const deltas = []
    // let found = false
    // xSteps.forEach( x => {
    //   if(found){
    //     return;
    //   }
    //   // collision check given x
    //   console.log("Updating", x)
    //   vec2.add(this.state.ball.position, this.state.ball.position, vec2.fromValues(x < 0 ? -1 : 1,0))
    //   ball.update(this.state.ball.position[0], this.state.ball.position[1], 20, 20 )
    //   if(
    //     ball.intersects(p1_paddle).intersects || 
    //     ball.intersects(p2_paddle).intersects
    //   ){
    //     found = true
    //     this.bounceBallVelocity('x')
    //     vec2.add(this.state.ball.position, this.state.ball.position, this.state.ball.velocity)
    //     ball.update(this.state.ball.position[0], this.state.ball.position[1], 20, 20 )

    //     console.log("intersect!", x)
    //     return
    //   }

    //   ySteps.forEach( y => {
    //     if(found){
    //       return
    //     }
    //     vec2.add(this.state.ball.position, this.state.ball.position, vec2.fromValues(0,y < 0 ? -1 : 1))
    //     ball.update(this.state.ball.position[0], this.state.ball.position[1], 20, 20 )
  
    //     if(
    //       ball.intersects(p1_paddle).intersects || 
    //       ball.intersects(p2_paddle).intersects
    //     ){
    //       found = true
    //       this.bounceBallVelocity('x')
    //       vec2.add(this.state.ball.position, this.state.ball.position, this.state.ball.velocity)
    //       ball.update(this.state.ball.position[0], this.state.ball.position[1], 20, 20 )
  
    //       console.log("intersect!")
    //     }
  
    //   })
    // })
    // for(let i = deltas.length; i >= 0; i--){
    //   if(
    //     ball.intersects(p1_paddle).intersects || f
    //     ball.intersects(p2_paddle).intersects
    //   ){
    //     this.bounceBallVelocity('x')
    //     break;
    //   }
  
    //   vec2.add(this.state.ball.position, this.state.ball.position, vec2.fromValues())
    //   ball.update(this.state.ball.position[0], this.state.ball.position[1], 20, 20 )
    //   debugger;
    // }
      if(
        ball.intersects(p1_paddle).intersects || 
        ball.intersects(p2_paddle).intersects
      ){
        this.bounceBallVelocity('x')
        vec2.multiply(this.state.ball.velocity, this.state.ball.velocity, vec2.fromValues(1.1,1.1))
      }
    vec2.add(this.state.ball.position, this.state.ball.position, this.state.ball.velocity)    
    ball.update(this.state.ball.position[0], this.state.ball.position[1], this.state.ball.size, this.state.ball.size )


  }

  getDeflectionAngle(paddle, ball){
    const ballHeight = (ball.boundsToRange().y.max - ball.boundsToRange().y.min)
    const ballPosition =  ball.boundsToRange().y.min + (ballHeight /2 )

    const paddleHeight = (paddle.boundsToRange().y.max - paddle.boundsToRange().y.min)
    const paddlePosition =  paddle.boundsToRange().y.min + (paddleHeight /2 )

    const distanceBetweenCenters = Math.abs(ballPosition - paddlePosition)
    const scaled = Math.min(1, distanceBetweenCenters / (paddleHeight / 2)) * -1
    return vec2.fromValues(-1, scaled)
  }
  createPolys() {
    this._polys = {};
    const simpleShaderInstance = new ShaderInstance(this._renderer._shaders['simple_shader'])
    const colorShaderInstance = new ShaderInstance(this._renderer._shaders['color_shader'])

    let background = this._renderer.createPolyInstance(
      new Rect(),
      { shader: 'simple_shader',
        params: { diffuseTexture: 'test-diffuse'}
      }, 
      simpleShaderInstance,
      "background"
    )
    this._polys.background = background

    // for(let i = 1; i < 4; i++){
    //   let life  = this._renderer.createPolyInstance(
    //     new Rect(),
    //     { shader: 'color_shader',
    //       params: { diffuseTexture: 'test-diffuse'}
    //     }, 
    //     colorShaderInstance,
    //     `p1_life_${i}`
    //   )
    //   this._polys[`p1_lives_${i}`] = life;
    // }
    // for(let i = 1; i < 4; i++){
    //   let life  = this._renderer.createPolyInstance(
    //     new Rect(),
    //     { shader: 'color_shader',
    //       params: { diffuseTexture: 'test-diffuse'}
    //     }, 
    //     colorShaderInstance,
    //     `p2_life_${i}`
    //   )
    //   this._polys[`p2_lives_${i}`] = life;
    // }

    // this._polys.background = background
    let p1_paddle = this._renderer.createPolyInstance(
      new Rect(),
      { shader: 'simple_shader',
        params: { diffuseTexture: 'test-diffuse'}
      }, 
      colorShaderInstance,
      "p1_paddle"
    )
    this._polys.p1_paddle = p1_paddle;

    let p2_paddle = this._renderer.createPolyInstance(
      new Rect(),
      { shader: 'color_shader',
        params: { diffuseTexture: 'test-diffuse'}
      }, 
      colorShaderInstance,
      "p2_paddle"
    )
    this._polys.p2_paddle = p2_paddle;

    let ball = this._renderer.createPolyInstance(
      new Rect(),
      { shader: 'color_shader',
        params: { diffuseTexture: 'test-diffuse'}
      }, 
      colorShaderInstance,
      "ball"
    )
    this._polys.ball = ball;
  }
  _prepareDomEventsRenderLoopAndInitialize() {
    this._renderer = new Renderer();

    window.addEventListener('resize', () => {
      this._onWindowResize();
    }, false);

    this._init({
      winCondition: false,
      devMode: true
    });

    this._previousRAF = null;
    this._RAF();
  }

  _onWindowResize() {
    this._renderer.resize(window.innerWidth, window.innerHeight);
  }

  _RAF() {
    // Right now we're just rendering once
    // this._step()
    if(isPaused){
      return;
    }
    playing = requestAnimationFrame((t) => {
      if (this._previousRAF === null) {
        this._previousRAF = t;
      }

      this._RAF();
      this._step(t - this._previousRAF);
      this._previousRAF = t;
      this.frameCount++ 
    });
  }

  _step(timeElapsed) {
    const timeElapsedS = timeElapsed * 0.001;
    this.update(this.frameCount)
    this._renderer.render(timeElapsedS, this.frameCount);
  }

}


window.addEventListener('DOMContentLoaded', () => {

  _APP = new TheScene({
    winCondition: false,
    devMode: true
  });
  const socket = new WebSocket("ws://localhost:8081/");

  // Connection opened
  socket.addEventListener("open", (event) => {
    console.log("Opened connection to joystick backend")
  });
  socket.addEventListener("close", (event) => {
    console.log("Socket closed!!!")
  });

  // Listen for messages
  socket.addEventListener("message", (event) => {
    console.log("Message from server :", event.data);
    _APP.parsePositionFromInput(event.data)
  });

});

