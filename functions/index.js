const functions = require("firebase-functions");
const firebase = require("firebase-admin");
const firebaseConfig = require("../rtx-voice-server/rtx-voice-api-firebase-adminsdk-17abl-cdd7505a8a.json");

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
  const fileId = request.params.fileId;

  if (!fileId) {
    response.send("NO SUCH FILE EXISTS!");
    return;
  }

  const completedJob = await getCompletedJob(fileId);

  //functions.logger.info("Hello logs!", {structuredData: true});

  response.send("Hello from Firebase!");
});

async function getCompletedJob(fileId) {
  const snapshot = await db
    .collection("completedJobs")
    .where("fileId", "==", fileId)
    .get();

  if (snapshot.empty) {
    response.send("NO SUCH FILE EXISTS!");
    return;
  }

  const completedJobs = snapshot.docs.map((doc) => doc.data());

  if (completedJobs && completedJobs.length > 0) {
    const completedJob = completedJobs[0];
    const downloadUrl = completedJob.fileUrl;
    debugger;
    response.send(downloadUrl);
    return;
  }

  response.send("fail to complete request");
  return;
}

(async () => {
  await getCompletedJob("3078666b-63ec-4814-aed9-ba903d751f04.m4a");
})();
