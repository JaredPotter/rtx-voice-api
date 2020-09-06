import React from "react";
import "./App.css";
import { uploadFile, createRtxVoiceJob } from "./FirebaseService";
import { v4 as uuidv4 } from "uuid";
const maxFileSizeMegaBytes = 20000000;

function App() {
  const [stage, setStage] = React.useState(0);
  const [fileUploadProgress, setFileUploadProgress] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [optInEmail, setOptInEmail] = React.useState(false);
  const [fileUrl, setFileUrl] = React.useState("");
  const [fileId, setFileId] = React.useState("");
  React.useEffect(() => {
    async function createJob(fileUrl, email) {
      if (!fileUrl || !email || !submitted) {
        return;
      }

      await createRtxVoiceJob(fileUrl, email, fileId);

      setStage(2);
    }

    createJob(fileUrl, email);
  }, [fileUrl, submitted]);

  const inputFileElement = React.useRef(null);

  function handleFileChange(event) {
    const files = event.target.files;

    if (files && files.length > 0) {
      const file = files[0];

      if (file.size > maxFileSizeMegaBytes) {
        const mbFileSize = file.size / 1000000;
        alert(
          `Max file size is ${
            maxFileSizeMegaBytes / 1000000
          } MB. Input File: ${mbFileSize.toFixed(2)} MB`
        );
        return;
      }
      const fileExtension = file.name.split(".").slice(-1)[0];
      const fileId = `${uuidv4()}.${fileExtension}`;
      setFileId(fileId);
      uploadFile(file, fileId, setFileUploadProgress, setFileUrl);
    }

    setStage(1);
  }

  function handleSubmit(e) {
    e.preventDefault();

    setSubmitted(true);
  }

  return (
    <div className="app-container">
      <h1 className="title">RTX VOICE API</h1>
      <h2 className="subtitle">
        Elimate background noise - Fans, Kids, Dogs, Music, TVs, Keyboards, etc
      </h2>
      <button className="get-started-button">GET STARTED</button>

      <div className={stage === 0 ? "stage-0" : "stage-0 hidden"}>
        <input
          type="file"
          ref={inputFileElement}
          onChange={handleFileChange}
          accept="audio/m4a, audio/aiff, audio/wav, audio/mpeg, 	application/ogg"
        />
        <p>
          Allowed file types: <code>.m4a</code>, <code>.aiff</code>,
          <code>.wav</code>, <code>.mp3</code>,<code>.ogg</code>
        </p>
        <p>Max file size: {maxFileSizeMegaBytes / 1000000} MB</p>
      </div>
      <div className={stage === 1 ? "stage-1" : "stage-1 hidden"}>
        <div className="upload-progress-box">
          <span>{fileUploadProgress}%</span>
          <div>
            0%
            <progress id="file" value={fileUploadProgress} max="100"></progress>
            100%
          </div>
        </div>
        <form onSubmit={handleSubmit} className="email-form">
          <label>
            Email:
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="bob@google.com"
            />
          </label>
          <label>
            <input
              type="checkbox"
              value={optInEmail}
              onChange={(e) => setOptInEmail(e.target.value)}
            />
            Opt In Email to get our future RTX Voice API updates
          </label>
          <button type="submit" disabled={!email || !fileUrl}>
            SUBMIT
          </button>
        </form>
      </div>
      <div className={stage === 2 ? "stage-2" : "stage-2 hidden"}>
        <h1>
          Congratulations! Your audio file has been uploaded and queued for
          processing.
        </h1>
        <h1>
          We'll email you a download link to <code>{email}</code> once
          processing is complete.
        </h1>
      </div>
    </div>
  );
}

export default App;
