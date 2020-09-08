const { spawn, spawnSync } = require("child_process");
const mediainfo = require("node-mediainfo");

const axios = require("axios");
const fs = require("fs-extra");
const {
  getQueuedJobs,
  uploadAudioOutputFile,
  deleteAudioInput,
  moveToCompletedJobs,
  sendEmail,
} = require("./FirebaseService");

const INPUT_PATH = "./audio_input";
const OUTPUT_PATH = "./audio_output";

fs.ensureDir(INPUT_PATH);
fs.ensureDir(OUTPUT_PATH);

const processFile = async (fileName) => {
  const inputFilePath = `${INPUT_PATH}/${fileName}`;
  const outputFilePath = `${OUTPUT_PATH}/${fileName}`;

  const result = await mediainfo(inputFilePath);
  const stats = fs.statSync(inputFilePath);
  const fileSizeInBytes = stats["size"];
  const fileDetails = {
    size: fileSizeInBytes,
  };

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

  //console.log(audioTrack);
  //console.log(generalTrack);

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
    }

    const ffplay = spawn("ffplay", ["-autoexit", inputFilePath]);
    console.log("FFPLAY - ENDED");

    console.log(ffmpegFlags);
    const ffmpeg = spawnSync("./lib/ffmpeg", ffmpegFlags);

    return fileDetails;
  }
};

const miliseconds = 10000;

function start() {
  setTimeout(async () => {
    console.log("Fetching Jobs");

    await fetchQueuedJobs();
    start();
  }, miliseconds);
}

start();

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
      fileDetails = await processFile(job.fileId);
    } catch (error) {
      throw error;
    }

    try {
      const downloadUrl = await uploadAudioOutputFile(job.fileId);

      const { email, fileId } = await moveToCompletedJobs(
        job,
        fileDetails,
        downloadUrl
      );

      await sendEmail(email, fileId);

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
    fs.unlink(`${OUTPUT_PATH}/${job.fileId}`);
  }
};

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
})();

//sendEmail();

//fetchQueuedJobs();

async function downloadFile(url, image_path) {
  const writer = fs.createWriteStream(image_path);
  const response = await axios({ url, responseType: "stream" });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
}
