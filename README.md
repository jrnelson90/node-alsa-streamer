# node-alsa-streamer
Basic ALSA to FLAC streamer for Icecast, written in Node.js

Although originally developed to stream an analog source, like a turntable or cassette player, 
via an ADC audio hat on a Raspberry Pi over a local home or office network, this can be used 
for any mono or stereo analog source on any Linux machine that supports ALSA and Icecast.

## Known Hardware Compatibility
To date, this has been tested using following Pi audio hats:
* AudioInjector Stereo (Pi 2 & 3)
* Fe-Pi Audio (Pi 2 & 3)
* PiSound (Pi 3)

It has also been tested on Ubuntu 18.04 x64 laptop using an AT-LP120-USB turntable.

As this is using Icecast, this is not real-time audio streaming, with usual 2-8 secs of latency 
depending on the settings used.

## Usage
This was written using NodeJS v10.x+, Icecast 2.4.x+, ALSA, and FFMPEG. Ensure these are installed
on your linux distro.

```
$ git clone https://github.com/jrnelson90/node-alsa-streamer.git
$ cd node-alsa-streamer
$ npm install
$ node alsa-streamer.js
```

If there is no config.json in the root project directory, a setup process will prompt you to select
stream settings based on detected hardware capabilities for audio capture and icecast settings.

To modify your stream settings, either edit config.json manually. Or delete config.json to 
re-trigger the configuration setup process on the next program launch.

## Known Issues
Currently the stream timeouts after roughly 1.5 hours when streaming 24-bit/48Khz FLAC. This time 
will be higher or lower depending on the combination of bit-depth and sampling rate that you select 
for your stream. I am as yet unsure if this a limitation in the configuration of ALSA, Icecast, or 
FFMPEG.