const cardInfo = require('node-alsa-cardinfo');
const Arecord = require('node-arecord');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const fs = require('fs')

const ifaces = os.networkInterfaces();

const addresses = new Map();

try {
  if (!fs.existsSync("./config.json")) {

    Object.keys(ifaces).forEach(function (ifname) {
      let alias = 0;

      ifaces[ifname].forEach(function (iface) {
        if ('IPv4' !== iface.family || iface.internal !== false) {
          // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
          return;
        }

        if (alias >= 1) {
          // this single interface has multiple ipv4 addresses
          // console.log(ifname + ':' + alias, iface.address);
          addresses.set(alias, iface.address);
        } else {
          // this interface has only one ipv4 adress
          // console.log(ifname, iface.address);
          addresses.set(alias, iface.address);
        }
        ++alias;
      });
    });

    let obj = Object.create(null);
    obj["addresses"] = [...addresses.values()];
    console.log(JSON.stringify(obj, null, 2));
    fs.writeFileSync("./config.json", JSON.stringify(obj, null, 2));

  } else {
    addresses = require("./config.json").addresses;
  }
} catch(err) {
  console.error(err);
}

// const cardName = "hw:CARD=audioinjectorpi,DEV=0";
const cardName = "hw:CARD=Audio,DEV=0";
const playInfo = cardInfo.get(cardName, cardInfo.PLAYBACK);
const recInfo = cardInfo.get(cardName, cardInfo.CAPTURE);
console.log(JSON.stringify(recInfo));

// If an option is not given, the default value will be used.
const options = {
  device: cardName,                   // Recording device to use.
  channels: 2,                        // Channel count.
  format: recInfo.sampleFormats[2],   // Encoding type. (only for `arecord`)
  rate: recInfo.sampleRates[6],       // Sample rate.
  type: `wav`,                        // Format type.
};

// Create an instance.
let audioIn = new Arecord(options, console);

ffmpeg(audioIn.start().stream())
  .inputFormat("wav")
  .outputOptions([
    "-acodec flac",
    "-compression_level 0",
    "-frame_size 4096",
    "-sample_fmt s32",
    "-ac 2",
    "-ar 48000",
    "-f ogg",
    "-content_type audio/ogg",
  ])
  .output("icecast://source:dietpi@localhost:9240/vinyl" )
  .run();

process.on("SIGINT", () => {
  console.log("");
  audioIn.stop();
  process.exit(0);
});

console.log("Streaming live FLAC audio to icecast radio");
