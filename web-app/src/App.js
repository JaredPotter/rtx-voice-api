import React from "react";
import "./App.css";
import {
  uploadFile,
  createRtxVoiceJob,
  addEmailToList,
} from "./FirebaseService";
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
      const originalFileName = inputFileElement.current.files[0].name;

      await createRtxVoiceJob(fileUrl, email, fileId, originalFileName);

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

    if (optInEmail) {
      addEmailToList(email);
    }
  }

  function handleUploadAnotherClick() {
    setStage(0);
    setFileUploadProgress(0);
    inputFileElement.current.value = null;
  }

  return (
    <div className="app-container">
      <h1 className="title">RTX VOICE API DEMO</h1>
      <h2 className="subtitle">
        Elimate background noise - Fans, Kids, Dogs, Music, TVs, Keyboards, etc
      </h2>

      <div className="arrow_box">
        <h1 className="arrow-box-text">
          1. Upload an Audio file
          <br />
          (MP3, WAV, M4A, OGG)
        </h1>
      </div>
      <div className="arrow_box">
        <h1 className="arrow-box-text">
          2. Enter email (for delivery)
          <br /> and Click [Submit]
        </h1>
      </div>
      <div className="arrow_box">
        <h1 className="arrow-box-text">
          3. Wait for file to process <br /> through RTX Voice
        </h1>
      </div>
      <div className="arrow_box">
        <h1 className="arrow-box-text">
          4. Receive download
          <br />
          like via email
        </h1>
      </div>
      <div className="get-started-box">
        <div className="get-started">GET STARTED</div>
        <div className={stage === 0 ? "stage-0" : "stage-0 hidden"}>
          <input
            type="file"
            ref={inputFileElement}
            onChange={handleFileChange}
            accept="audio/x-m4a,audio/wav,audio/mpeg,application/ogg"
          />
          {/* audio/aiff, */}
          <p>
            Allowed file types: <code>.m4a</code>, <code>.wav</code>,{" "}
            <code>.mp3</code>, <code>.ogg</code>
          </p>
          <p>
            Coming Soon: <code>.aiff</code>
          </p>
          <p>Max file size: {maxFileSizeMegaBytes / 1000000} MB</p>
        </div>
        <div className={stage === 1 ? "stage-1" : "stage-1 hidden"}>
          <div className="upload-progress-box">
            <span>{fileUploadProgress}%</span>
            <div className="upload-progress-bar">
              0%
              <progress
                id="file"
                value={fileUploadProgress}
                max="100"
              ></progress>
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
                onChange={(e) => setOptInEmail(e.target.checked)}
              />
              Opt In Email to get our future RTX Voice API updates
              <br />
              <span>
                We respect your privacy - we will *NOT* give/sell your email to
                anyone.
              </span>
            </label>
            <button type="submit" disabled={!email || !fileUrl}>
              SUBMIT
            </button>
          </form>
        </div>
        <div className={stage === 2 ? "stage-2" : "stage-2 hidden"}>
          <h3>
            Congratulations! Your audio file has been uploaded and queued for
            processing.
          </h3>
          <h3>
            We'll email you a download link to <code>{email}</code> once
            processing is complete. The email will be delivered from{" "}
            <code>rtxvoiceapi@gmail.com</code>.
          </h3>
          <button
            onClick={handleUploadAnotherClick}
            className="add-another-button"
          >
            Upload Another
          </button>
        </div>
      </div>
      <form
        action="https://formspree.io/xpzyvooz"
        method="POST"
        className="feedback-contact-form"
      >
        <h3>
          Have Feedback?
          <br />
          Integrate with RTX Voice API?
          <br />
          Say Hello?
        </h3>
        <label>
          Your email:
          <input type="email" required name="_replyto" />
        </label>
        <label>
          Your message:
          <textarea required name="message"></textarea>
        </label>

        <button type="submit" className="add-another-button">
          Send
        </button>
      </form>
      <div className="created-by">
        Created by{" "}
        <a href="https://www.twitter.com/jaredpotter">Jared Potter</a>
      </div>
    </div>
  );
}

export default App;
