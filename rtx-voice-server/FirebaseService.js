const firebase = require("firebase-admin");
const firebaseConfig = require("./rtx-voice-api-firebase-adminsdk-17abl-cdd7505a8a.json");
const moment = require("moment");
const { v4: uuidv4 } = require("uuid");

firebase.initializeApp({
  credential: firebase.credential.cert(firebaseConfig),
  databaseURL: `https://rtx-voice-api.firebaseio.com`,
  storageBucket: "rtx-voice-api.appspot.com",
});

const db = firebase.firestore();
const bucket = firebase.storage().bucket();

const getQueuedJobs = async () => {
  try {
    const snapshot = await db.collection("queuedJobs").get();

    const queuedJobs = snapshot.docs.map((doc) => {
      return { id: doc.id, ...doc.data() };
    });

    return queuedJobs;
  } catch (error) {
    // keep on trucking on...
  }
};

const uploadAudioOutputFile = async (fileName) => {
  try {
    let fileExtension = fileName.split(".").slice(-1)[0];

    if (fileExtension === "mp3") {
      fileExtension = "mpeg";
    }

    let contentType = ``;

    if (
      fileExtension === "mpeg" ||
      fileExtension === "aac" ||
      fileExtension === "m4a"
    ) {
      contentType = `audio/${fileExtension}`;
    } else if (fileExtension === "ogg") {
      contentType = "application/ogg";
    }

    const [file] = await bucket.upload(`audio_output/${fileName}`, {
      destination: `output/${fileName}`,
      public: true,
      contentType,
    });

    const downloadUrl = file.metadata.mediaLink;

    return downloadUrl;
  } catch (error) {
    throw error;
  }
};

const moveToCompletedJobs = async (job, fileDetails, downloadUrl) => {
  const completedJob = {
    ...job,
    fileUrl: downloadUrl,
  };

  const email = completedJob.email;
  delete completedJob.email;
  delete completedJob.id;

  const completedMoment = moment.utc().unix();
  const completed = completedMoment.valueOf();

  completedJob.completed = completed;

  const expirationMoment = moment.utc().add(14, "days").unix();
  const expiration = expirationMoment.valueOf();

  completedJob.expiration = expiration;

  try {
    await db.collection("completedJobs").add(completedJob);
  } catch (error) {
    throw error;
  }

  const stats = {
    ...fileDetails,
  };

  try {
    await db.collection("stats").add(stats);
  } catch (error) {
    throw error;
  }

  try {
    await db.collection("queuedJobs").doc(job.id).delete();
  } catch (error) {
    throw error;
  }

  return {
    email,
    fileId: job.fileId,
  };
};

const sendErrorEmail = async (email, originalfileName, errorMessage) => {
  const subject = `RTX VOICE API - ${originalfileName} - FILE FILED`;

  const html = `
    Hello ${email},\n\n

        Your RTX Voice audio file FAILED.\n\n

        Reason: ${errorMessage}\n\n

        Please re-submit with a supported file.
  `;

  try {
    await _sendEmail(email, subject, html);
    console.log("Queued email for delivery!");
  } catch (error) {
    throw error;
  }
};

const sendSuccessEmail = async (email, fileId, originalfileName) => {
  const urlEncodedFileId = fileId.replace(/\./gi, "%2E");
  const BASE_URL = `https://us-central1-rtx-voice-api.cloudfunctions.net/downloadFile?fileId=${urlEncodedFileId}`;

  const subject = `RTX VOICE API - ${originalfileName} - FILE DELIVERY`;
  const html = `
    Hello ${email},\n\n

      Your RTX Voice audio file is complete.\n\n

      Please click the download like <a href="${BASE_URL}">HERE</a>.\n\n

      File will automatically be deleted after 14 days.\n\n
  `;

  try {
    await _sendEmail(email, subject, html);
    console.log("Queued email for delivery!");
  } catch (error) {
    throw error;
  }
};

const _sendEmail = async (
  email,
  subject,
  html,
  text = "This is the plaintext section of the email body."
) => {
  try {
    await firebase.firestore().collection("mail").add({
      to: email,
      message: {
        subject,
        text,
        html,
      },
    });
  } catch (error) {
    throw error;
  }
};

const deleteAudioInput = async (fileName) => {
  await bucket.deleteFiles({
    prefix: `input/${fileName}`,
  });
};

const deleteQueuedJob = async (id) => {
  try {
    await firebase.firestore().collection("queuedJobs").doc(id).delete();
  } catch (error) {
    throw error;
  }
};

(async () => {
  await getQueuedJobs();
})();

module.exports = {
  getQueuedJobs,
  uploadAudioOutputFile,
  deleteAudioInput,
  moveToCompletedJobs,
  sendSuccessEmail,
  sendErrorEmail,
  deleteQueuedJob,
};
