const { SerialPort } = require('serialport')
const WebSocket = require("ws");

let socket = null

const wss = new WebSocket.Server({
  port: 8082,
});//open the connection

class SocketHandler {
  constructor() { }
}
class JoystickHandler {
  constructor(socket) {
    this.socket = socket
    this.initialize()
    this.port = null
  }
  connectSocket(_socket){
    this.socket = _socket 
  }
  closePort() {}
  initialize() {
    const DEFAULT_BAUD_RATE = 9600
    const DEFAULT_PORT = '/dev/ttyACM0'

    SerialPort.list().then(function (listing) {
      console.log("Available ports:")
      listing
        .filter(port => port.productId !== undefined)
        .forEach( listing => console.log(`\t${listing.path} : ${ listing.pnpId }\n`) )
    })

    const port = new SerialPort({
      path: DEFAULT_PORT,
      baudRate: DEFAULT_BAUD_RATE,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
      autoOpen: false,
    })
    port.open(function (err) {
      if (err) {
        console.log("Couldn't open the port!", err.message)
      }
    })

    port.on('data', (data) => {
      let jsoned = data.toString()
      // data: '"\\r\\n$p1_newPos:66"'
      jsoned = jsoned
        .replace('/"', "")
        .replace('\\r\\n', "")
      console.log("Result: ", jsoned);
      if(this.socket){
        this.socket.send(jsoned);
      }
    })

  }
}

const joystick = new JoystickHandler(socket)

wss.on("connection", _socket => {
  console.log("Opened connection to frontend!")
  joystick.connectSocket(_socket)
});

