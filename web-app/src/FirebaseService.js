import firebase from "firebase";

import moment from "moment";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_APIKEY,
  authDomain: process.env.REACT_APP_AUTHDOMAIN,
  databaseURL: process.env.REACT_APP_DATABASEURL,
  projectId: process.env.REACT_APP_PROJECTID,
  storageBucket: process.env.REACT_APP_STORAGEBUCKET,
  messagingSenderId: process.env.REACT_APP_MESSAGINGSENDERID,
  appId: process.env.REACT_APP_APPID,
  measurementId: process.env.REACT_APP_MEASUREMENTID,
};

firebase.initializeApp(firebaseConfig);

const uploadFile = (file, fileId, setFileUploadProgress, setFileUrl) => {
  const storageRef = firebase.storage().ref();

  const uploadTask = storageRef.child(`input/${fileId}`).put(file);

  // Register three observers:
  // 1. 'state_changed' observer, called any time the state changes
  // 2. Error observer, called on failure
  // 3. Completion observer, called on successful completion
  uploadTask.on(
    "state_changed",
    function (snapshot) {
      // Observe state change events such as progress, pause, and resume
      // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

      const formattedProgress = Number(progress.toFixed());
      setFileUploadProgress(formattedProgress);

      switch (snapshot.state) {
        case firebase.storage.TaskState.PAUSED: // or 'paused'
          break;
        case firebase.storage.TaskState.RUNNING: // or 'running'
          break;
        default:
      }
    },
    function (error) {
      // Handle unsuccessful uploads
      throw error;
    },
    function () {
      // Handle successful uploads on complete
      // For instance, get the download URL: https://firebasestorage.googleapis.com/...
      uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
        setFileUrl(downloadURL);
      });
    }
  );
};

const createRtxVoiceJob = async (fileUrl, email, fileId, originalFileName) => {
  const db = firebase.firestore();
  const createdMoment = moment.utc().unix();
  const created = createdMoment.valueOf();

  const payload = {
    fileUrl,
    email,
    created,
    fileId,
    originalFileName,
  };

  return db.collection("queuedJobs").add(payload);
};

const addEmailToList = (email) => {
  const db = firebase.firestore();

  db.collection("emailList").doc(email).set({ email });
};

export { uploadFile, createRtxVoiceJob, addEmailToList };
