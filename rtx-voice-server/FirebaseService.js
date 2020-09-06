const firebase = require('firebase-admin');
const firebaseConfig = require('./rtx-voice-api-firebase-adminsdk-17abl-cdd7505a8a.json');
const moment = require('moment');
const { v4: uuidv4 } = require('uuid');

firebase.initializeApp({
    credential: firebase.credential.cert(firebaseConfig),
    databaseURL: `https://rtx-voice-api.firebaseio.com`,
    storageBucket: 'rtx-voice-api.appspot.com'
});

const db = firebase.firestore();
const bucket = firebase.storage().bucket();

const getQueuedJobs = async () => {
    const snapshot = await db.collection('queuedJobs').get();

    const queuedJobs = snapshot.docs.map(doc => doc.data());

    return queuedJobs;
};

const uploadAudioOutputFile = async (fileName) => {
    
    const uuid = uuidv4();
    try {
        // const file = await bucket.upload(`audio_output/${fileName}`, {
        //     destination: `output/${fileName}`,
        //     metadata: {
        //         metadata: {
        //             firebaseStorageDownloadTokens: uuid, // Can technically be anything you want
        //         },
        //     }
        // });
 
        // const now =  moment.utc();
        // now.add(7, 'days');
        // const expires = now.format('MM-DD-yyyy');
        // console.log(expires);
        

        //const getDownloadUrl = "https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encodeURIComponent(fileName) + "?alt=media&token=" + uuid
        // const urlOptions = {
        //     version: "v4",
        //     action: "read",
        //     expires: expires, // 2 minutes
        // };
        let fileExtension = fileName.split(".").slice(-1)[0];

        if(fileExtension === 'mp3') {
            fileExtension = 'mpeg';
        }

        const [file] = await bucket.upload(`audio_output/${fileName}`, {
            destination: `output/${fileName}`,
            public: true,
            contentType: 'audio/' + fileExtension, // TODO: change to support application/ogg
        });
        
        const downloadUrl = file.metadata.mediaLink;

        return downloadUrl;
    }
     catch(error) {
         throw error;
     }
};

const deleteAudioInput = (fileName) => {
    // const storageRef = storage.ref();
    // const filePath = `input/${fileName}`;
    // var fileRef = storageRef.child(filePath);

    // fileRef.delete().then(() => {
    //     // File deleted successfully
    //   }).catch((error) => {
    //       console.log('error: failed to delete input file: ' + fileName)
    //     // Uh-oh, an error occurred!
    //   });
};

module.exports = { getQueuedJobs, uploadAudioOutputFile, deleteAudioInput }