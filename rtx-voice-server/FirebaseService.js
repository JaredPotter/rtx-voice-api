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
  const snapshot = await db.collection("queuedJobs").get();

  const queuedJobs = snapshot.docs.map((doc) => {
    return { id: doc.id, ...doc.data() };
  });

  return queuedJobs;
};

const uploadAudioOutputFile = async (fileName) => {
  const uuid = uuidv4();
  try {
    let fileExtension = fileName.split(".").slice(-1)[0];

    if (fileExtension === "mp3") {
      fileExtension = "mpeg";
    }

    const [file] = await bucket.upload(`audio_output/${fileName}`, {
      destination: `output/${fileName}`,
      public: true,
      contentType: "audio/" + fileExtension, // TODO: change to support application/ogg
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
  };
  completedJob.fileUrl = downloadUrl;
  const email = completedJob.email;
  delete completedJob.email;
  delete completedJob.fileId;
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
    //await db.collection("queuedJobs").doc(job.id).delete();
  } catch (error) {
    throw error;
  }

  return {
    email,
    fileId: job.fileId,
  };
};

const sendEmail = async (email, fileId) => {
  try {
    await firebase
      .firestore()
      .collection("mail")
      .add({
        to: email,
        message: {
          subject: "RTX VOICE API - FILE DELIVERY",
          text: "This is the plaintext section of the email body.",
          html: "This is the <code>HTML</code> section of the email body.",
        },
      });
    console.log("Queued email for delivery!");
  } catch (error) {
    throw error;
  }
};

const deleteAudioInput = async (fileName) => {
  await bucket.deleteFiles({
    prefix: `input/${fileName}`,
  });
};

(async () => {
  await getQueuedJobs();
})();

module.exports = {
  getQueuedJobs,
  uploadAudioOutputFile,
  deleteAudioInput,
  moveToCompletedJobs,
  sendEmail,
};
