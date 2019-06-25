const cardInfo = require('node-alsa-cardinfo');
const Arecord = require('node-arecord');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const fs = require('fs');

const ifaces = os.networkInterfaces();

let hwInfo;

// const cardName = "hw:CARD=audioinjectorpi,DEV=0";
const cardName = "hw:CARD=Audio,DEV=0";

try {
  if (!fs.existsSync("./hwInfo.json")) {
    const addrMap = new Map();
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
          addrMap.set(alias, iface.address);
        } else {
          // this interface has only one ipv4 adress
          // console.log(ifname, iface.address);
          addrMap.set(alias, iface.address);
        }
        ++alias;
      });
    });

    hwInfo = Object.create(null);

    hwInfo["addresses"] = [...addrMap.values()];
    hwInfo["playback"] = cardInfo.get(cardName, cardInfo.PLAYBACK);
    hwInfo["capture"] = cardInfo.get(cardName, cardInfo.CAPTURE);

    fs.writeFileSync("./hwInfo.json", JSON.stringify(hwInfo, null, 2));
  } else {
    hwInfo = require("./hwInfo.json");
  }
} catch(err) {
  console.error(err);
  process.exit(1);
}

// console.log(JSON.stringify(hwInfo, null, 2));
let config;

try {
  if (!fs.existsSync("./config.json")) {
    config = Object.create(null);
    console.info("No previous configuration detected, initiating setup");


    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  } else {
    config = require("./config.json");
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}

// If an option is not given, the default value will be used.
const options = {
  device: cardName,                   // Recording device to use.
  channels: 2,                        // Channel count.
  format: hwInfo.capture.sampleFormats[2],   // Encoding type. (only for `arecord`)
  rate: hwInfo.capture.sampleRates[6],       // Sample rate.
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
