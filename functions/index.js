const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const firebaseConfig = require("./rtx-voice-api-firebase-adminsdk-17abl-cdd7505a8a.json");

firebase.initializeApp({
  credential: firebase.credential.cert(firebaseConfig),
  databaseURL: `https://rtx-voice-api.firebaseio.com`,
  storageBucket: "rtx-voice-api.appspot.com",
});

const db = firebase.firestore();

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
exports.downloadFile = functions.https.onRequest(async (request, response) => {
  const fileId = request.query.fileId;

  if (!fileId) {
    response.send("NO SUCH FILE EXISTS!");
    return;
  }

  try {
    const downloadUrl = await getCompletedJob(fileId);
  } catch (error) {
    response.send("NO SUCH FILE EXISTS!");
    return;
  }

  response.send(downloadUrl);
});

async function getCompletedJob(fileId) {
  const snapshot = await db
    .collection("completedJobs")
    .where("fileId", "==", fileId)
    .get();

  if (snapshot.empty) {
    throw "NO SUCH FILE EXISTS!";
  }

  const completedJobs = snapshot.docs.map((doc) => doc.data());

  if (completedJobs && completedJobs.length > 0) {
    const completedJob = completedJobs[0];
    const downloadUrl = completedJob.fileUrl;

    return downloadUrl;
  }

  throw "NO SUCH FILE EXISTS!";
}

// (async () => {
//   await getCompletedJob("3078666b-63ec-4814-aed9-ba903d751f04.m4a");
// })();
