const { spawn, spawnSync } = require("child_process");
const mediainfo = require("node-mediainfo");
//const mediainfo = require("mediainfo.js");

const axios = require("axios");
const fs = require("fs-extra");
const {
  getQueuedJobs,
  uploadAudioOutputFile,
  deleteAudioInput,
  moveToCompletedJobs,
  sendErrorEmail,
  sendSuccessEmail,
  deleteQueuedJob,
} = require("./FirebaseService");

const INPUT_PATH = "./audio_input";
const OUTPUT_PATH = "./audio_output";

const MAX_FILE_SIZE = 20000000;

fs.ensureDir(INPUT_PATH);
fs.ensureDir(OUTPUT_PATH);

const processFile = async (fileName, originalFileName) => {
  const inputFilePath = `${INPUT_PATH}/${fileName}`;
  const outputFilePath = `${OUTPUT_PATH}/${originalFileName}`;

  let result;
  debugger;
  try {
    result = await mediainfo(inputFilePath);
  } catch (error) {
    throw "Failed to read file media info";
  }

  const stats = fs.statSync(inputFilePath);
  const fileSizeInBytes = stats["size"];
  const fileDetails = {
    size: fileSizeInBytes,
  };

  if (fileSizeInBytes > MAX_FILE_SIZE) {
    throw `FILE SIZE TOO LARGE. Max is ${(MAX_FILE_SIZE / 1000000).toFixed(
      2
    )} MB. Submitted file was ${(fileSizeInBytes / 1000000).toFixed(2)} MB.`;
  }

  debugger;

  const audioTrack = result.media.track.find((track) => {
    if (
      track["@type"] === "Audio" &&
      track.Duration &&
      track.Channels &&
      track.SamplingRate &&
      track.BitRate
    ) {
      return true;
    }
  });
  const generalTrack = result.media.track.find((track) => {
    if (track["@type"] === "General" && track.Format) {
      return true;
    }
  });

  console.log(audioTrack);
  console.log(generalTrack);

  if (audioTrack && generalTrack) {
    const duration = audioTrack.Duration;
    const channels = Number(audioTrack.Channels);
    const samplingRate = Number(audioTrack.SamplingRate);
    const bitRate = `${Number(audioTrack.BitRate) / 1000}k`;
    const bitDepth = Number(audioTrack.BitDepth);

    fileDetails.duration = duration;
    fileDetails.channels = channels;
    fileDetails.samplingRate = samplingRate;
    fileDetails.bitRate = bitRate;
    fileDetails.bitDepth = bitDepth;
    fileDetails.audioFormat = audioTrack.Format;
    fileDetails.generalFormat = generalTrack.Format;

    let ffmpegFlags = [];

    if (audioTrack.Format === "MPEG Audio") {
      // ffmpeg -f dshow -i audio="Microphone (NVIDIA RTX Voice)" -c:a libmp3lame -ar 44100 -b:a 320k -ac 1 -y -t 5 output.mp3
      ffmpegFlags = [
        "-f",
        "dshow",
        "-i",
        "audio=Microphone (NVIDIA RTX Voice)",
        "-c:a",
        "libmp3lame",
        "-ar",
        samplingRate,
        "-b:a",
        bitRate,
        "-ac",
        channels,
        "-y",
        "-t",
        duration,
        outputFilePath,
      ];
    } else if (
      audioTrack.Format === "AAC" &&
      generalTrack.Format === "MPEG-4"
    ) {
      // ffmpeg -f dshow -i audio="Microphone (NVIDIA RTX Voice)" -c:a libfdk_aac -b:a 320k output.m4a
      ffmpegFlags = [
        "-f",
        "dshow",
        "-i",
        "audio=Microphone (NVIDIA RTX Voice)",
        "-c:a",
        "libfdk_aac",
        "-ar",
        samplingRate,
        "-b:a",
        bitRate,
        "-ac",
        channels,
        "-y",
        "-t",
        duration,
        outputFilePath,
      ];
    } else if (audioTrack.Format === "PCM" && generalTrack.Format === "Wave") {
      debugger;
      const isSigned = audioTrack.Format_Settings_Sign; // signed / unsigned
      const endian = audioTrack.Format_Settings_Endianness;
      const formatProfile = audioTrack.Format_Profile; // float

      // fileDetails.signed = isSigned;
      // fileDetails.endian = endian;
      // fileDetails.formatProfile = formatProfile;
      const wavMap = {};
      debugger;
      let encoder;

      if (formatProfile === "Float") {
        encoder += "";
      }

      if (isSigned === "Signed" && endian === "Little") {
      }

      // audacity supported WAV:
      // Signed 16 bit PCM
      // Signed 24 bit PCM
      // Signed 36 bit PCM
      // Unsigned 8 bit PCM
      // 32 bit float
      // 64 bit float
      // U-Law
      // A-Law
      // IMA ADPCM
      // Microsoft ADPCM
      // GSM 6.10
      // 32kbs G721 ADPCM
      // 16kbs NMS ADCPM
      // 24kbs NMS ADPCM
      // 32kbs NMS ADPCM

      /*       
            DE alaw            PCM A-law
            DE f32be           PCM 32-bit floating-point big-endian
            DE f32le           PCM 32-bit floating-point little-endian
            DE f64be           PCM 64-bit floating-point big-endian
            DE f64le           PCM 64-bit floating-point little-endian
            DE mulaw           PCM mu-law
            DE s16be           PCM signed 16-bit big-endian
            DE s16le           PCM signed 16-bit little-endian
            DE s24be           PCM signed 24-bit big-endian
            DE s24le           PCM signed 24-bit little-endian
            DE s32be           PCM signed 32-bit big-endian
            DE s32le           PCM signed 32-bit little-endian
            DE s8              PCM signed 8-bit
            DE u16be           PCM unsigned 16-bit big-endian
            DE u16le           PCM unsigned 16-bit little-endian
            DE u24be           PCM unsigned 24-bit big-endian
            DE u24le           PCM unsigned 24-bit little-endian
            DE u32be           PCM unsigned 32-bit big-endian
            DE u32le           PCM unsigned 32-bit little-endian
            DE u8              PCM unsigned 8-bit 
      */

      // todo: support more than 16 big
      // https://trac.ffmpeg.org/wiki/audio%20types
      ffmpegFlags = [
        "-f",
        "dshow",
        "-i",
        "audio=Microphone (NVIDIA RTX Voice)",
        "-c:a",
        "pcm_s16le",
        "-ar",
        samplingRate,
        "-b:a",
        bitRate,
        "-ac",
        channels,
        "-y",
        "-t",
        duration,
        outputFilePath,
      ];
    } else if (
      audioTrack.Format === "Vorbis" &&
      generalTrack.Format === "Ogg"
    ) {
      ffmpegFlags = [
        "-f",
        "dshow",
        "-i",
        "audio=Microphone (NVIDIA RTX Voice)",
        "-c:a",
        "libvorbis",
        "-ar",
        samplingRate,
        "-b:a",
        bitRate,
        "-ac",
        channels,
        "-y",
        "-t",
        duration,
        outputFilePath,
      ];
    } else {
      throw "Unsupported File Type! Supported File Types are; mp3, m4a, wav, and ogg.";
    }

    const ffplay = spawn("ffplay", ["-autoexit", inputFilePath]);
    console.log("FFPLAY - ENDED");

    console.log(ffmpegFlags);
    const ffmpeg = spawnSync("./lib/ffmpeg", ffmpegFlags);

    return fileDetails;
  }
};

const fetchQueuedJobs = async () => {
  const queuedJobs = await getQueuedJobs();

  console.log(`${queuedJobs.length} JOBS FOUND`);

  for (const job of queuedJobs) {
    const path = `${INPUT_PATH}/${job.fileId}`;

    try {
      await downloadFile(job.fileUrl, path);
      console.log("file download success");
    } catch (error) {
      console.log("file download failed");
      throw error;
    }

    let fileDetails;

    // Process job
    try {
      fileDetails = await processFile(job.fileId, job.originalFileName);
    } catch (error) {
      sendErrorEmail(job.email, job.originalFileName, error);

      fs.unlink(`${INPUT_PATH}/${job.fileId}`);

      deleteQueuedJob(job.id);
      return;
    }

    try {
      const downloadUrl = await uploadAudioOutputFile(job.originalFileName);

      const { email, fileId } = await moveToCompletedJobs(
        job,
        fileDetails,
        downloadUrl
      );

      await sendSuccessEmail(email, fileId, job.originalFileName);

      console.log("OUTPUT: " + downloadUrl);
    } catch (error) {
      throw error;
    }

    try {
      await deleteAudioInput(job.fileId);
    } catch (error) {
      throw error;
    }

    fs.unlink(`${INPUT_PATH}/${job.fileId}`);
    fs.unlink(`${OUTPUT_PATH}/${job.originalFileName}`);
  }
};

async function downloadFile(url, image_path) {
  const writer = fs.createWriteStream(image_path);
  const response = await axios({ url, responseType: "stream" });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}

const miliseconds = 10000;
//const miliseconds = 60000;

function start() {
  setTimeout(async () => {
    console.log("Fetching Jobs");

    await fetchQueuedJobs();
    start();
  }, miliseconds);
}

start();

(async () => {
  //const fileName = "3078666b-63ec-4814-aed9-ba903d751f04.m4a";
  //const fileDetails = await processFile(fileName);
  //debugger;
  // try {
  //   const downloadUrl = await uploadAudioOutputFile(fileName);
  //   console.log('OUTPUT: ' + downloadUrl)
  // } catch (error) {
  //   throw error;
  // }
  //await fetchQueuedJobs();
})();
