const cardInfo = require('node-alsa-cardinfo');
const Arecord = require('./lib/arecord');
const ffmpeg = require('fluent-ffmpeg');
const os = require('os');
const fs = require('fs');
const cp = require("child_process");

const ifaces = os.networkInterfaces();
let config;

try {
  if (!fs.existsSync("./config.json")) {
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

    let hwInfo = Object.create(null);

    let soundCards;
    soundCards = cp.execSync("arecord -L | grep :CARD")
        .toString('utf8').trim().split("\n");

    hwInfo["addresses"] = [...addrMap.values()];
    hwInfo["soundCards"] = soundCards;
    hwInfo["capture"] = cardInfo.get(hwInfo.soundCards[soundCards.length - 2], cardInfo.CAPTURE);

    fs.writeFileSync("./hwInfo.json", JSON.stringify(hwInfo, null, 2));

    config = Object.create(null);
    console.info("No previous configuration detected, initiating setup");

    // TODO: Implement preference input logic

    // Write configs to JSON
    config["soundCard"] = hwInfo.soundCards[soundCards.length - 2];
    config["sampleRate"] = '48000';
    config["sampleArecordFmt"] = 'S32_LE';
    config["sampleFfmpegFmt"] = 's32';
    config["channels"] = '2';
    config["pipeAudioCodec"] = 'wav';
    config["streamAudioCodec"] = 'flac';
    config["streamContainer"] = 'ogg';
    config["networkAddress"] = hwInfo.addresses[0];
    config["icecastMnt"] = '/vinyl';
    config["icecastPswd"] = 'dietpi';
    config["icecastPort"] = '9240';

    // Write config JSON to file
    fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
  } else {
    config = require("./config.json");
  }
} catch (err) {
  console.error(err);
  process.exit(1);
}

// If an option is not given, the default value will be used.
const arecordOptions = {
  device: config.soundCard,           // Recording device to use.
  channels: config.channels,          // Channel count.
  format: config.sampleArecordFmt,    // Encoding type. (only for `arecord`)
  rate: config.sampleRate,            // Sample rate.
  type: config.pipeAudioCodec,        // Format type.
};

// Create an instance.
let audioIn = new Arecord(arecordOptions, console);

ffmpeg(audioIn.start().stream())
    .inputFormat(config.pipeAudioCodec)
    .outputOptions([
      "-acodec " + config.streamAudioCodec,
      "-compression_level 0",
      "-frame_size 4096",
      "-sample_fmt " + config.sampleFfmpegFmt,
      "-ac " + config.channels,
      "-ar " + config.sampleRate,
      "-f " + config.streamContainer,
      "-content_type audio/" + config.streamContainer,
    ])
    .output(`icecast://source:${config.icecastPswd}@localhost:${config.icecastPort}${config.icecastMnt}`)
    .run();

process.on("SIGINT", () => {
  console.log("");
  audioIn.stop();
  process.exit(0);
});

console.log(`Streaming live FLAC audio to icecast radio at ` +
    `http://${config.networkAddress}:${config.icecastPort}${config.icecastMnt}`);
